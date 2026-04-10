import uploadToDraft from 'editor_tiny/uploader';
import {getDraftItemId} from 'editor_tiny/options';
import { localizeMediaToDraft } from '../../repository';
import { dataUrlToBlob, extFromMime } from './utils';

const DRAFT_UNAVAILABLE_MSG = 'Draft file area is not available in this editor. You can still insert the media below.';

/**
 * Check if the editor has a draft file area (itemid) so uploadToDraft can succeed.
 * Moodle's uploader reads itemid from the editor's form; without it we get "reading 'itemid'" error.
 * Matches standard Moodle patterns and haccgen step4 form (contenteditor_itemid).
 * @param {Object} editor - TinyMCE editor instance
 * @returns {boolean}
 */
function hasDraftContext(editor) {
  try {
    // 0) Same as tiny_ai: use Moodle's getDraftItemId when the editor has draft options (e.g. standard form).
    if (editor) {
      const id = getDraftItemId(editor);
      if (id !== undefined && id !== null && Number(id) > 0) {
        return true;
      }
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
 * Resolve a numeric draft itemid from editor options or form fields.
 * @param {Object} editor
 * @returns {number|undefined}
 */
function resolveDraftItemId(editor) {
  try {
    if (editor) {
      const editorItemId = getDraftItemId(editor);
      if (editorItemId !== undefined && editorItemId !== null) {
        const n = Number(editorItemId);
        if (!Number.isNaN(n) && n > 0) {
          return n;
        }
      }
    }
    const draftInput = document.getElementById('contenteditor_itemid') ||
      document.querySelector('input[name="contenteditor_itemid"]');
    if (draftInput && String(draftInput.value || '').trim() !== '') {
      const n = Number(draftInput.value);
      if (!Number.isNaN(n) && n > 0) {
        return n;
      }
    }
    const form = getDraftForm();
    const formItemId = getItemidFromForm(form);
    if (formItemId !== undefined && formItemId > 0) {
      return formItemId;
    }
    return undefined;
  } catch (_) {
    return undefined;
  }
}

export const maybeUploadDataUrlToDraft = async (editor, dataUrl, defaultMime, kind, opts = {}) => {
  const v = String(dataUrl || '').trim().replace(/&amp;/gi, '&');
  if (!v) {return { playableUrl: '', uploadError: '' };}
  const requireLocal = Boolean(opts.requireLocal);

  const uploadBlob = async (blob, mimeHint) => {
    const mime = (blob && blob.type) ? blob.type : defaultMime || mimeHint || 'application/octet-stream';
    const filename = `${kind}.${extFromMime(mime)}`;
    const progressNoop = () => {};
    const raw = await uploadToDraft(editor, 'media', blob, filename, progressNoop);
    const playableUrl = typeof raw === 'string'
      ? raw
      : (raw && typeof raw === 'object' && (raw.url || raw.filepath || raw.href)
        ? (raw.url || raw.filepath || raw.href)
        : '');
    return String(playableUrl || '');
  };

  // For remote media URLs, try to copy them into Moodle draft first so links do not expire.
  if (/^https?:\/\//i.test(v)) {
    if (!hasDraftContext(editor)) {
      if (requireLocal) {
        return {
          playableUrl: '',
          uploadError: 'Draft file area is not available, so remote media cannot be copied locally.',
        };
      }
      return { playableUrl: v, uploadError: '' };
    }
    const itemid = resolveDraftItemId(editor);
    if (itemid && itemid > 0) {
      try {
        const localized = await localizeMediaToDraft(v, itemid, kind || 'media', defaultMime || '');
        const code = Number(localized && localized.code);
        const localizedUrl = String((localized && localized.url) || '');
        if (code >= 200 && code < 300 && localizedUrl) {
          return { playableUrl: localizedUrl, uploadError: '' };
        }
        if (requireLocal) {
          const err = String((localized && localized.message) || 'Server could not copy remote media locally.');
          return { playableUrl: '', uploadError: err };
        }
      } catch (e) {
        if (requireLocal) {
          const err = e?.message ? e.message : 'Server could not copy remote media locally.';
          return { playableUrl: '', uploadError: err };
        }
      }
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

  if (!hasDraftContext(editor)) {
    return { playableUrl: '', uploadError: DRAFT_UNAVAILABLE_MSG };
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
    const progressNoop = () => {};
    const draftForm = getDraftForm();
    const formItemid = draftForm ? getItemidFromForm(draftForm) : undefined;
    if (formItemid !== undefined && editor && (typeof editor.settings === 'object' && editor.settings !== null)) {
      editor.settings.itemid = formItemid;
      if (!editor.settings.filepicker || typeof editor.settings.filepicker !== 'object') {
        editor.settings.filepicker = {};
      }
      editor.settings.filepicker.itemid = formItemid;
    }
    const el = typeof editor?.getElement === 'function' ? editor.getElement() : null;
    const editorId = typeof editor?.id === 'string' ? editor.id : 'id_contenteditor';
    let textarea = el && el.form ? el : (typeof document !== 'undefined' ? document.getElementById(editorId) : null);
    if (!textarea && draftForm) {
      textarea = { form: draftForm };
    } else if (textarea && !textarea.form && draftForm) {
      textarea = { ...(typeof textarea === 'object' && textarea !== null ? textarea : {}), form: draftForm };
    }
    const editorToUse = (textarea && textarea.form)
      ? new Proxy(editor, {
          get(target, prop) {
            if (prop === 'getElement') {
              return () => textarea;
            }
            if (prop === 'form') {
              return textarea.form || undefined;
            }
            if (prop === 'settings') {
              const s = target.settings || {};
              const form = textarea.form;
              const itemid = getItemidFromForm(form);
              if (itemid !== undefined) {
                const filepicker = (s.filepicker && typeof s.filepicker === 'object')
                  ? { ...s.filepicker, itemid }
                  : { itemid };
                return { ...s, itemid, filepicker };
              }
              return s;
            }
            if (prop === 'options') {
              const opts = target.options;
              const form = textarea.form;
              const fid = getItemidFromForm(form);
              if (fid === undefined) {
                return opts;
              }
              return new Proxy(opts, {
                get(optTarget, optProp) {
                  if (optProp === 'get') {
                    return (key) => {
                      if (key === 'itemid') {
                        return fid;
                      }
                      const val = optTarget.get(key);
                      if (key === 'filepicker') {
                        return Object.assign({}, val || {}, {itemid: fid});
                      }
                      if (val && typeof val === 'object' && fid !== undefined) {
                        return Object.assign({}, val, {itemid: fid});
                      }
                      return val;
                    };
                  }
                  const v = optTarget[optProp];
                  return typeof v === 'function' ? v.bind(optTarget) : v;
                },
              });
            }
            const v = target[prop];
            return typeof v === 'function' ? v.bind(target) : v;
          },
        })
      : editor;
    const raw = await uploadToDraft(editorToUse, 'media', blob, filename, progressNoop);
    const url = typeof raw === 'string'
      ? raw
      : (raw && typeof raw === 'object' && (raw.url || raw.filepath || raw.href)
        ? (raw.url || raw.filepath || raw.href)
        : '');
    const result = String(url || '');
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
