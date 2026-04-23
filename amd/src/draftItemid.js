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
 * Draft itemid resolution helpers.
 *
 * @module tiny_haccgen_extender/draftItemid
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getDraftItemId} from 'editor_tiny/options';

/**
 * Resolve a stable draft itemid for editor/media requests.
 *
 * @param {Object} editor Tiny editor instance
 * @returns {number}
 */
export const resolveDraftItemId = (editor) => {
  try {
    if (editor) {
      const editorItemId = getDraftItemId(editor);
      if (editorItemId !== undefined && editorItemId !== null) {
        const parsed = Number(editorItemId);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    const candidates = [
      document.getElementById('contenteditor_itemid'),
      document.getElementById('id_contenteditor_itemid'),
      document.querySelector('input[name="contenteditor_itemid"]'),
      document.querySelector('input[name="id_contenteditor_itemid"]'),
      document.querySelector('input[name="itemid"]'),
    ];
    for (const node of candidates) {
      if (!node) {
        continue;
      }
      const parsed = Number(node.value);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 0;
  } catch (_) {
    return 0;
  }
};
