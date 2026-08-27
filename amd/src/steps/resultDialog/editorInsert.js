// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Editor insertion helpers for result dialog.
 *
 * @module tiny_haccgen_extender/steps/resultDialog/editorInsert
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { escapeHtml } from './utils';

const normalizeMediaUrl = (url) => String(url || '').replace(/&amp;/gi, '&');

const BOOKMARK_KEY = '__dpAiSelectionBookmark';

/**
 * Remember the current editor selection so it can be restored before insert.
 *
 * Call when opening the extender modal, before focus leaves the editor.
 *
 * @param {Object} editor TinyMCE editor instance.
 * @returns {void}
 */
export const saveSelectionBookmark = (editor) => {
  if (!editor?.selection?.getBookmark) {
    return;
  }
  try {
    editor[BOOKMARK_KEY] = editor.selection.getBookmark(2, true);
  } catch (e) {
    editor[BOOKMARK_KEY] = null;
  }
};

const restoreSelectionBookmark = (editor) => {
  const bookmark = editor?.[BOOKMARK_KEY];
  if (!bookmark || !editor.selection?.moveToBookmark) {
    return false;
  }
  try {
    editor.selection.moveToBookmark(bookmark);
    return true;
  } catch (e) {
    return false;
  } finally {
    editor[BOOKMARK_KEY] = null;
  }
};

const getSelectionEndBlock = (editor) => {
  const dom = editor.dom;
  const body = editor.getBody?.();
  if (!dom || !body || !editor.selection) {
    return null;
  }

  const rng = editor.selection.getRng?.();
  if (!rng) {
    return null;
  }

  let node = rng.endContainer;
  if (node.nodeType === 3) {
    node = node.parentNode;
  }
  if (!node || !body.contains(node)) {
    return null;
  }

  return dom.getParent(node, dom.isBlock, body) || null;
};

const transactInsert = (editor, apply) => {
  if (editor.focus) {
    editor.focus();
  }
  if (editor.undoManager && typeof editor.undoManager.transact === 'function') {
    editor.undoManager.transact(apply);
  } else {
    apply();
    if (editor.undoManager && typeof editor.undoManager.add === 'function') {
      editor.undoManager.add();
    }
  }
  if (typeof editor.nodeChanged === 'function') {
    editor.nodeChanged();
  }
};

const placeCaretAfter = (editor, node) => {
  if (!node || !editor.selection) {
    return;
  }
  try {
    const rng = editor.dom.createRng && editor.dom.createRng();
    if (!rng) {
      return;
    }
    rng.setStartAfter(node);
    rng.setEndAfter(node);
    editor.selection.setRng(rng);
  } catch (e) {
    // Content is already inserted; caret placement is optional.
  }
};

/**
 * Insert HTML immediately below the block containing the current selection.
 *
 * Restores a bookmark saved via saveSelectionBookmark when the modal had focus.
 * Falls back to appending at the end of the body when no anchor is available.
 *
 * @param {Object} editor TinyMCE editor instance.
 * @param {string} html HTML fragment to insert.
 * @returns {void}
 */
export const insertBelowSelection = (editor, html) => {
  const fragment = String(html || '');
  if (!fragment) {
    return;
  }
  const body = editor.getBody && editor.getBody();
  if (!body || !editor.dom) {
    return;
  }

  const apply = () => {
    restoreSelectionBookmark(editor);
    const refBlock = getSelectionEndBlock(editor);

    const wrap = editor.dom.create('div');
    wrap.innerHTML = fragment;
    const inserted = [];

    if (refBlock && refBlock.parentNode) {
      let anchor = refBlock;
      while (wrap.firstChild) {
        const newNode = wrap.firstChild;
        anchor.parentNode.insertBefore(newNode, anchor.nextSibling);
        inserted.push(newNode);
        anchor = newNode;
      }
    } else {
      while (wrap.firstChild) {
        inserted.push(body.appendChild(wrap.firstChild));
      }
    }

    placeCaretAfter(editor, inserted[inserted.length - 1]);
  };

  transactInsert(editor, apply);
};

export const insertAudioHtml = (editor, url, mime = 'audio/mpeg') => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const safeMime = escapeHtml(String(mime || 'audio/mpeg'));
  insertBelowSelection(
    editor,
    `<p><audio class="dp-ai-inserted-audio" controls preload="metadata" src="${safe}">` +
    `<source src="${safe}" type="${safeMime}" />` +
    `</audio></p>`
  );
};

export const replaceWithAudioHtml = (editor, url, mime = 'audio/mpeg') => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const safeMime = escapeHtml(String(mime || 'audio/mpeg'));
  editor.selection.setContent(
    `<audio class="dp-ai-inserted-audio" controls preload="metadata" src="${safe}">` +
    `<source src="${safe}" type="${safeMime}" />` +
    `</audio>`
  );
};

export const insertImageHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  insertBelowSelection(editor, `<p><img class="dp-ai-inserted-image" src="${safe}" /></p>`);
};

export const replaceWithImageHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.selection.setContent(`<img class="dp-ai-inserted-image" src="${safe}" />`);
};

const buildVideoTracksHtml = (tracks = []) => {
  if (!Array.isArray(tracks) || !tracks.length) {
    return '';
  }
  return tracks.map((track) => {
    const safeUrl = escapeHtml(normalizeMediaUrl(track.url));
    const kind = escapeHtml(String(track.kind || 'captions'));
    const srclang = escapeHtml(String(track.srclang || 'en'));
    const label = escapeHtml(String(track.label || 'Captions'));
    const defaultAttr = track.default ? ' default' : '';
    return `<track kind="${kind}" src="${safeUrl}" srclang="${srclang}" label="${label}"${defaultAttr}>`;
  }).join('');
};

export const insertVideoHtml = (editor, url, tracks = []) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const tracksHtml = buildVideoTracksHtml(tracks);
  insertBelowSelection(
    editor,
    `<p><video class="dp-ai-inserted-video" controls preload="metadata" src="${safe}">${tracksHtml}</video></p>`
  );
};

export const replaceWithVideoHtml = (editor, url, tracks = []) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  const tracksHtml = buildVideoTracksHtml(tracks);
  editor.selection.setContent(
    `<p><video class="dp-ai-inserted-video" controls preload="metadata" src="${safe}">${tracksHtml}</video></p>`
  );
};
