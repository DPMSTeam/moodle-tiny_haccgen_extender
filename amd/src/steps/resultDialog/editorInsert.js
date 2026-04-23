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
  editor.focus();
  moveSelectionToEnd(editor);
  editor.insertContent(`<p><img class="dp-ai-inserted-image" src="${safe}" /></p>`);
};

export const replaceWithImageHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.selection.setContent(`<img class="dp-ai-inserted-image" src="${safe}" />`);
};

export const insertVideoHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.focus();
  moveSelectionToEnd(editor);
  editor.insertContent(
    `<p><video class="dp-ai-inserted-video" controls preload="metadata" src="${safe}"></video></p>`
  );
};

export const replaceWithVideoHtml = (editor, url) => {
  const safe = escapeHtml(normalizeMediaUrl(url));
  editor.selection.setContent(
    `<p><video class="dp-ai-inserted-video" controls preload="metadata" src="${safe}"></video></p>`
  );
};
