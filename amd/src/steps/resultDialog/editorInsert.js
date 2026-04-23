import { escapeHtml } from './utils';

const normalizeMediaUrl = (url) => String(url || '').replace(/&amp;/gi, '&');

/**
 * Move the editor selection to the end of the body so "Insert below" places content at the bottom.
 *
 * @param {Object} editor TinyMCE editor instance.
 * @returns {void}
 */
export const moveSelectionToEnd = (editor) => {
  try {
    const body = editor.getBody && editor.getBody();
    if (!body || !editor.dom || !editor.selection) { return; }
    const rng = editor.dom.createRng && editor.dom.createRng();
    if (!rng) { return; }
    const last = body.childNodes.length;
    rng.setStart(body, last);
    rng.setEnd(body, last);
    editor.selection.setRng(rng);
  } catch (e) {
    // If moving fails, insert will still use current selection
  }
};

export const insertAudioHtml = (editor, url, mime = 'audio/mpeg') => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const safeMime = escapeHtml(String(mime || 'audio/mpeg'));
  editor.focus();
  moveSelectionToEnd(editor);
  editor.insertContent(
    `<p><audio controls preload="metadata" style="width:100%;max-width:100%;" src="${safe}">` +
    `<source src="${safe}" type="${safeMime}" />` +
    `</audio></p>`
  );
};

export const replaceWithAudioHtml = (editor, url, mime = 'audio/mpeg') => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const safeMime = escapeHtml(String(mime || 'audio/mpeg'));
  editor.selection.setContent(
    `<audio controls preload="metadata" style="width:100%;max-width:100%;" src="${safe}">` +
    `<source src="${safe}" type="${safeMime}" />` +
    `</audio>`
  );
};

export const insertImageHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.focus();
  moveSelectionToEnd(editor);
  editor.insertContent(`<p><img src="${safe}" style="width:100%;max-width:100%;height:auto;object-fit:contain;" /></p>`);
};

export const replaceWithImageHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.selection.setContent(`<img src="${safe}" style="width:100%;max-width:100%;height:auto;object-fit:contain;" />`);
};

export const insertVideoHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.focus();
  moveSelectionToEnd(editor);
  editor.insertContent(
    `<p><video controls preload="metadata" style="width:100%;max-width:100%;
    height:auto;object-fit:contain;background:#000;" src="${safe}"></video></p>`
  );
};

export const replaceWithVideoHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.selection.setContent(
    `<p><video controls preload="metadata" style="width:100%;max-width:100%;
    height:auto;object-fit:contain;background:#000;" src="${safe}"></video></p>`
  );
};
