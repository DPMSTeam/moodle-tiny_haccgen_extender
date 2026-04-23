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
