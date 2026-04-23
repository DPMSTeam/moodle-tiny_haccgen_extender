import uploadToDraft from 'editor_tiny/uploader';
import { localizeMediaToDraft } from '../../repository';
import { resolveDraftItemId } from '../../draftItemid';
import { dataUrlToBlob, extFromMime } from './utils';

const DRAFT_UNAVAILABLE_MSG = 'Draft file area is not available in this editor. You can still insert the media below.';

/**
 * Determine whether a media URL is persistable.
 * Blob/data URLs are transient and must not be treated as durable.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isDurableMediaUrl(url) {
  const value = String(url || '').trim();
  if (!value) {
    return false;
  }
  return !value.startsWith('blob:') && !value.startsWith('data:');
}

/**
 * Check if the editor has a draft file area (itemid) so uploadToDraft can succeed.
 * Moodle's uploader reads itemid from the editor's form; without it we get "reading 'itemid'" error.
 * Matches standard Moodle patterns and haccgen step4 form (contenteditor_itemid).
 * @param {Object} editor - TinyMCE editor instance
 * @returns {boolean}
 */
function hasDraftContext(editor) {
  try {
    if (resolveDraftItemId(editor) > 0) {
      return true;
    }
    // 1) Fast path: on haccgen step 4 the draft field exists in the document.
    const draftInput = document.getElementById('contenteditor_itemid') ||
      document.querySelector('input[name="contenteditor_itemid"]');
    if (draftInput && String(draftInput.value || '').trim() !== '' && !Number.isNaN(Number(draftInput.value))) {
      return true;
    }
    const df = getDraftForm();
    if (df && getItemidFromForm(df) !== undefined) {
      return true;
    }

    // 1) Get form from the textarea the editor is bound to (editor.id is e.g. 'id_contenteditor').
    const editorId = typeof editor?.id === 'string' ? editor.id : '';
    const textarea = editorId ? document.getElementById(editorId) : null;
    let form = (textarea && textarea.form) ? textarea.form : null;

    // 2) Fallback: TinyMCE getElement() might not return the textarea; try it.
    if (!form) {
      const el = typeof editor?.getElement === 'function' ? editor.getElement() : null;
      form = (el && el.form) ? el.form : null;
    }

    // 3) Fallback: haccgen step4 form contains contenteditor_itemid (same form as the editor).
    if (!form) {
      form = document.getElementById('step4-form') || document.querySelector('form[id$="-form"]');
    }

    // 4) Use shared helper: form that has draft itemid (step4 or any with contenteditor_itemid).
    if (!form) {
      form = getDraftForm();
    }

    if (!form) {
      return false;
    }

    const itemidInput = form.querySelector?.(
      '[name="contenteditor_itemid"], [id="contenteditor_itemid"], ' +
      '[name$="_itemid"], [id$="_itemid"], [name*="[itemid]"]'
    );
    return Boolean(itemidInput);
  } catch (_) {
    return false;
  }
}

/**
 * Normalize unknown itemid values to a positive integer or 0.
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
function normalizeItemId(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

/**
 * Persist resolved itemid into hidden fields used by step4 editor form.
 * @param {number} itemid
 */
function updateDraftItemIdInputs(itemid) {
  const normalized = normalizeItemId(itemid);
  if (normalized <= 0) {
    return;
  }
  const selectors = [
    '#contenteditor_itemid',
    '#id_contenteditor_itemid',
    'input[name="contenteditor_itemid"]',
    'input[name="id_contenteditor_itemid"]',
    'input[name="itemid"]',
  ];
  selectors.forEach((selector) => {
    const node = document.querySelector(selector);
    if (node) {
      node.value = String(normalized);
    }
  });
}

/**
 * Pick caller-provided itemid first, then resolve from editor/form.
 * @param {Object} editor
 * @param {Object} opts
 * @returns {number}
 */
function resolveRequestedItemId(editor, opts = {}) {
  const provided = normalizeItemId(opts && opts.itemid);
  if (provided > 0) {
    return provided;
  }
  return normalizeItemId(resolveDraftItemId(editor));
}

/**
 * Save itemid from backend and notify caller.
 * @param {number} itemid
 * @param {Object} opts
 */
function rememberResolvedItemId(itemid, opts = {}) {
  const normalized = normalizeItemId(itemid);
  if (normalized <= 0) {
    return;
  }
  updateDraftItemIdInputs(normalized);
  if (opts && typeof opts.onItemId === 'function') {
    opts.onItemId(normalized);
  }
}

export const maybeUploadDataUrlToDraft = async (editor, dataUrl, defaultMime, kind, opts = {}) => {
  const v = String(dataUrl || '').trim().replace(/&amp;/gi, '&');
  if (!v) {return { playableUrl: '', uploadError: '' };}
  const requireLocal = Boolean(opts.requireLocal);
  let preferredItemId = resolveRequestedItemId(editor, opts);

  const uploadBlob = async (blob, mimeHint) => {
    const mime = (blob && blob.type) ? blob.type : defaultMime || mimeHint || 'application/octet-stream';
    const filename = `${kind}.${extFromMime(mime)}`;
    // Route through the hardened wrapper so itemid is resolved consistently
    // across Tiny6 / legacy TinyMCE and step4 hidden itemid fields.
    const playableUrl = await uploadBlobToDraft(editor, blob, filename);
    return String(playableUrl || '');
  };
  const tryLocalize = async (value) => {
    try {
      const localized = await localizeMediaToDraft(value, preferredItemId, kind || 'media', defaultMime || '');
      const code = Number(localized && localized.code);
      const localizedUrl = String((localized && localized.url) || '');
      if (code >= 200 && code < 300 && localizedUrl) {
        const returnedItemId = normalizeItemId(localized && localized.itemid);
        if (returnedItemId > 0) {
          preferredItemId = returnedItemId;
          rememberResolvedItemId(returnedItemId, opts);
        }
        return { playableUrl: localizedUrl, uploadError: '' };
      }
      const err = String((localized && localized.message) || 'Server could not copy media locally.');
      return { playableUrl: '', uploadError: err };
    } catch (e) {
      return {
        playableUrl: '',
        uploadError: e?.message ? e.message : 'Server could not copy media locally.',
      };
    }
  };

  // For remote media URLs, try to copy them into Moodle draft first so links do not expire.
  if (/^https?:\/\//i.test(v)) {
    const localized = await tryLocalize(v);
    if (localized.playableUrl) {
      return localized;
    }
    if (!hasDraftContext(editor)) {
      if (requireLocal) {
        return { playableUrl: '', uploadError: localized.uploadError || DRAFT_UNAVAILABLE_MSG };
      }
      return { playableUrl: v, uploadError: '' };
    }
    try {
      const resp = await fetch(v, { method: 'GET', credentials: 'omit' });
      if (!resp.ok) {
        if (requireLocal) {
          return { playableUrl: '', uploadError: 'Remote media download failed. Could not copy media locally.' };
        }
        return { playableUrl: v, uploadError: '' };
      }
      const blob = await resp.blob();
      const uploaded = await uploadBlob(blob, defaultMime);
      if (uploaded) {
        return { playableUrl: uploaded, uploadError: '' };
      }
      if (requireLocal) {
        return { playableUrl: '', uploadError: 'Remote media upload failed. Could not store media locally.' };
      }
      return { playableUrl: v, uploadError: '' };
    } catch (e) {
      // CORS/network issues are common for signed URLs; keep external URL as safe fallback.
      if (requireLocal) {
        return { playableUrl: '', uploadError: 'CORS blocked remote media download. Could not copy media locally.' };
      }
      return { playableUrl: v, uploadError: '' };
    }
  }

  if (!v.startsWith('data:')) {return { playableUrl: '', uploadError: `${kind} is not a URL or data URL.` };}
  const localized = await tryLocalize(v);
  if (localized.playableUrl) {
    return localized;
  }
  if (!hasDraftContext(editor)) {
    return { playableUrl: '', uploadError: localized.uploadError || DRAFT_UNAVAILABLE_MSG };
  }

  try {
    const blob = dataUrlToBlob(v);
    if (!blob) {throw new Error('Invalid data URL');}
    const playableUrl = await uploadBlob(blob, defaultMime);
    return { playableUrl, uploadError: '' };
  } catch (e) {
    const rawErr = e?.message ? e.message : (typeof e === 'string' ? e : String(e));
    const err = (typeof rawErr === 'string' && (rawErr.includes("'itemid'") || rawErr.includes('itemid')))
      ? DRAFT_UNAVAILABLE_MSG
      : rawErr;
    return { playableUrl: '', uploadError: err };
  }
};

/**
 * Get the draft form (step4 or any form with contenteditor itemid) from the document.
 * @returns {HTMLFormElement|null}
 */
function getDraftForm() {
  const byId = typeof document !== 'undefined' && document.getElementById('step4-form');
  if (byId) {
    return byId;
  }
  const withItemid = typeof document !== 'undefined' &&
    document.querySelector('form input[name="contenteditor_itemid"], form input[id="contenteditor_itemid"]');
  return withItemid && withItemid.form ? withItemid.form : null;
}

/**
 * Read itemid number from a form (itemid, contenteditor_itemid, or id_contenteditor_itemid).
 * @param {HTMLFormElement} form
 * @returns {number|undefined}
 */
function getItemidFromForm(form) {
  if (!form) {
    return undefined;
  }
  const el = form.itemid || (form.elements && form.elements.namedItem && form.elements.namedItem('itemid')) ||
    form.querySelector('[name="itemid"]') ||
    form.querySelector('input[name="contenteditor_itemid"], input[id="contenteditor_itemid"]');
  if (!el || typeof el.value === 'undefined') {
    return undefined;
  }
  const n = Number(el.value);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Upload a Blob to the editor's draft file area and return the permanent URL.
 * Used by step4 form to replace blob: URLs before save.
 * Wraps the editor so getElement() returns the form-associated textarea (Moodle uploader reads itemid from form).
 * @param {Object} editor - TinyMCE editor instance
 * @param {Blob} blob - File blob to upload
 * @param {string} filename - Filename for the upload
 * @returns {Promise<string>} Permanent draftfile URL or empty string on failure
 */
export const uploadBlobToDraft = async (editor, blob, filename) => {
  try {
    if (typeof window !== 'undefined' && window.console && window.console.log) {
      window.console.log('[haccgen-blob] uploadBlobToDraft: called filename=' + filename + ' blobSize=' + (blob && blob.size));
    }
    if (!editor || !hasDraftContext(editor)) {
      if (typeof window !== 'undefined' && window.console && window.console.log) {
        window.console.log('[haccgen-blob] uploadBlobToDraft: missing editor draft context');
      }
      return '';
    }
    const progressNoop = () => {};
    const draftForm = getDraftForm();
    const resolvedItemid = resolveDraftItemId(editor);
    if (resolvedItemid === undefined || resolvedItemid <= 0) {
      if (typeof window !== 'undefined' && window.console && window.console.log) {
        window.console.log('[haccgen-blob] uploadBlobToDraft: itemid missing');
      }
      return '';
    }
    if (editor && (typeof editor.settings === 'object' && editor.settings !== null)) {
      editor.settings.itemid = resolvedItemid;
      if (!editor.settings.filepicker || typeof editor.settings.filepicker !== 'object') {
        editor.settings.filepicker = {};
      }
      editor.settings.filepicker.itemid = resolvedItemid;
    }
    const el = typeof editor?.getElement === 'function' ? editor.getElement() : null;
    const editorId = typeof editor?.id === 'string' ? editor.id : 'id_contenteditor';
    let textarea = el && el.form ? el : (typeof document !== 'undefined' ? document.getElementById(editorId) : null);
    const syntheticForm = {
      itemid: { value: String(resolvedItemid) },
      elements: { namedItem: (name) => (name === 'itemid' ? { value: String(resolvedItemid) } : null) },
      querySelector: (selector) => (
        /itemid|contenteditor_itemid|_itemid/.test(String(selector || ''))
          ? { value: String(resolvedItemid) }
          : null
      ),
    };
    if (!textarea && draftForm) {
      textarea = { form: draftForm };
    } else if (textarea && !textarea.form && draftForm) {
      textarea = { ...(typeof textarea === 'object' && textarea !== null ? textarea : {}), form: draftForm };
    } else if (!textarea) {
      textarea = { form: syntheticForm };
    }
    const editorToUse = (textarea && textarea.form)
      ? (() => {
          const fid = getItemidFromForm(textarea.form) ?? resolvedItemid;
          const wrapped = Object.create(editor || {});
          const baseOptions = editor && editor.options ? editor.options : {};
          const baseSettings = (editor && editor.settings && typeof editor.settings === 'object')
            ? editor.settings
            : {};
          const getOptionValue = (key) => {
            if (key === 'itemid') {
              return fid;
            }
            if (key === 'filepicker' || key === 'file_picker' || key === 'picker') {
              return { itemid: fid };
            }
            const val = (baseOptions && typeof baseOptions.get === 'function')
              ? baseOptions.get(key)
              : baseOptions[key];
            if (val && typeof val === 'object') {
              return Object.assign({}, val, { itemid: fid });
            }
            if (val === undefined && /filepicker|picker|draft|upload/i.test(String(key || ''))) {
              return { itemid: fid };
            }
            return val;
          };
          wrapped.getElement = () => textarea;
          wrapped.form = textarea.form || undefined;
          wrapped.settings = Object.assign({}, baseSettings, {
            itemid: fid,
            filepicker: Object.assign({}, baseSettings.filepicker || {}, { itemid: fid }),
          });
          wrapped.options = Object.assign({}, baseOptions, {
            itemid: fid,
            filepicker: { itemid: fid },
            get: (key) => getOptionValue(key),
          });
          wrapped.getParam = (key, fallback) => {
            const val = getOptionValue(key);
            return val === undefined ? fallback : val;
          };
          return wrapped;
        })()
      : editor;
    const raw = await uploadToDraft(editorToUse, 'media', blob, filename, progressNoop);
    const url = typeof raw === 'string'
      ? raw
      : (raw && typeof raw === 'object' && (raw.url || raw.filepath || raw.href)
        ? (raw.url || raw.filepath || raw.href)
        : '');
    const result = String(url || '').trim();
    if (!isDurableMediaUrl(result)) {
      if (typeof window !== 'undefined' && window.console && window.console.log) {
        window.console.log('[haccgen-blob] uploadBlobToDraft: non-durable URL rejected');
      }
      return '';
    }
    if (typeof window !== 'undefined' && window.console && window.console.log) {
      const start = result ? result.substring(0, 80) + (result.length > 80 ? '...' : '') : '(empty)';
      window.console.log('[haccgen-blob] uploadBlobToDraft: success urlLen=' + result.length + ' urlStart=' + start);
    }
    return result;
  } catch (e) {
    if (typeof window !== 'undefined' && window.console && window.console.log) {
      window.console.log('[haccgen-blob] uploadBlobToDraft: failed', e && e.message ? e.message : String(e));
    }
    return '';
  }
};

// Expose for step4 form save-time blob replacement (avoids RequireJS from inline script).
if (typeof window !== 'undefined') {
  window.__haccgenUploadBlobToDraft = uploadBlobToDraft;
  if (window.console && window.console.log) {
    window.console.log('[haccgen-blob] window.__haccgenUploadBlobToDraft set');
  }
}
