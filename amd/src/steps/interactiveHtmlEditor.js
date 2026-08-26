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
 * Modal to edit generated interactive HTML section by section.
 *
 * @module tiny_haccgen_extender/steps/interactiveHtmlEditor
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {get_string as getString} from 'core/str';
import {alert as moodleAlert} from 'core/notification';
import Templates from 'core/templates';
import {component} from '../common';
import {
  parseInteractiveHtml,
  serializeInteractiveHtml,
  buildInteractivePreviewSrc,
  usesBodyField,
} from './interactiveHtmlModel';
import {escapeHtml} from './resultDialog/utils';
import {
  insertInteractiveHtml,
  replaceWithInteractiveHtml,
  replaceInteractiveNode,
} from './resultDialog/editorInsert';

const getTopDialogEl = () => {
  try {
    const dialogs = document.querySelectorAll('.tox-dialog');
    return dialogs.length ? dialogs[dialogs.length - 1] : null;
  } catch (e) {
    return null;
  }
};

const isEditableTarget = (target) => {
  const el = target && target.nodeType === 1 ? target : (target && target.parentElement);
  if (!el || typeof el.closest !== 'function') {
    return false;
  }
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return Boolean(el.isContentEditable || el.closest('[contenteditable="true"]'));
};

const installEditorKeyboardGuard = (dialogEl) => {
  const onKeyDown = (e) => {
    if (!dialogEl || !dialogEl.isConnected) {
      return;
    }
    const dialogs = document.querySelectorAll('.tox-dialog');
    if (!dialogs.length || dialogs[dialogs.length - 1] !== dialogEl) {
      return;
    }
    const key = e.key;
    const isEnter = key === 'Enter';
    const isSpace = key === ' ' || key === 'Spacebar' || e.code === 'Space';
    if (!isEnter && !isSpace) {
      return;
    }
    if (!isEditableTarget(e.target)) {
      return;
    }
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  return () => document.removeEventListener('keydown', onKeyDown, true);
};

const readModelFromDom = (root, model) => {
  const rawToggle = root.querySelector('[data-role="rawtoggle"]');
  const rawArea = root.querySelector('[data-role="raw"]');
  const rawMode = Boolean(rawToggle && rawToggle.checked);
  const cards = [...root.querySelectorAll('[data-role="section"]')];
  const sections = cards.length
    ? cards.map((card) => {
      const titleInput = card.querySelector('[data-role="title"]');
      const body = card.querySelector('[data-role="body"]');
      return {
        title: titleInput ? titleInput.value : '',
        body: body
          ? (body.getAttribute('contenteditable') === 'true' ? body.innerHTML : body.value)
          : '',
      };
    })
    : (model.sections || []);
  if (rawMode) {
    return {
      ...model,
      mode: 'raw',
      rawHtml: rawArea ? rawArea.value : model.rawHtml,
      sections,
    };
  }
  return {
    ...model,
    mode: 'sections',
    sections,
  };
};

const refreshPreview = (root, model) => {
  const iframe = root.querySelector('[data-role="preview"]');
  if (!iframe) {
    return;
  }
  iframe.src = buildInteractivePreviewSrc(serializeInteractiveHtml(model));
};

const renderSections = (root, model, labels) => {
  const list = root.querySelector('[data-role="list"]');
  if (!list) {
    return;
  }
  list.innerHTML = '';
  const showBody = usesBodyField(model.type);
  (model.sections || []).forEach((section, index) => {
    const card = document.createElement('div');
    card.className = 'dp-ai-ie-section';
    card.setAttribute('data-role', 'section');
    card.setAttribute('data-index', String(index));
    const bodyHtml = showBody
      ? `<label class="dp-ai-ie-field-label">${escapeHtml(labels.body)}</label>` +
        `<div class="dp-ai-ie-body" data-role="body" contenteditable="true">${section.body || ''}</div>`
      : '';
    card.innerHTML =
      `<div class="dp-ai-ie-section-head">` +
        `<span class="dp-ai-ie-section-index">${index + 1}</span>` +
        `<div class="dp-ai-ie-section-move">` +
          `<button type="button" class="dp-ai-ie-btn dp-ai-ie-btn--icon" data-role="up" aria-label="${escapeHtml(labels.up)}">↑</button>` +
          `<button type="button" class="dp-ai-ie-btn dp-ai-ie-btn--icon" data-role="down" aria-label="${escapeHtml(labels.down)}">↓</button>` +
          `<button type="button" class="dp-ai-ie-btn dp-ai-ie-btn--danger" data-role="remove">${escapeHtml(labels.remove)}</button>` +
        `</div>` +
      `</div>` +
      `<label class="dp-ai-ie-field-label">${escapeHtml(labels.title)}</label>` +
      `<input type="text" class="dp-ai-ie-title" data-role="title" value="${escapeHtml(section.title || '')}" />` +
      bodyHtml;
    list.appendChild(card);
  });
};

const bindEditor = (root, state, labels, onChange) => {
  if (!root || root.__dpIeBound) {
    return;
  }
  root.__dpIeBound = true;

  const apply = (next) => {
    Object.assign(state.model, next);
    const rawToggle = root.querySelector('[data-role="rawtoggle"]');
    const rawArea = root.querySelector('[data-role="raw"]');
    const list = root.querySelector('[data-role="list"]');
    const addBtn = root.querySelector('[data-role="add"]');
    const rawMode = state.model.mode === 'raw';
    if (rawToggle) {
      rawToggle.checked = rawMode;
    }
    if (rawArea) {
      rawArea.hidden = !rawMode;
      if (rawMode) {
        rawArea.value = state.model.rawHtml || '';
      }
    }
    if (list) {
      list.hidden = rawMode;
    }
    if (addBtn) {
      addBtn.hidden = rawMode;
    }
    if (!rawMode) {
      renderSections(root, state.model, labels);
    }
    refreshPreview(root, state.model);
    if (typeof onChange === 'function') {
      onChange(state.model);
    }
  };

  root.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('button[data-role]') : null;
    if (!btn || !root.contains(btn)) {
      return;
    }
    const role = btn.getAttribute('data-role');
    if (role === 'add') {
      e.preventDefault();
      const current = readModelFromDom(root, state.model);
      current.sections = current.sections.concat([{title: '', body: '<p></p>'}]);
      apply(current);
      return;
    }
    const card = btn.closest('[data-role="section"]');
    if (!card) {
      return;
    }
    e.preventDefault();
    const current = readModelFromDom(root, state.model);
    const index = Number(card.getAttribute('data-index'));
    if (Number.isNaN(index) || index < 0) {
      return;
    }
    if (role === 'remove') {
      if (current.sections.length <= 1) {
        current.sections = [{title: '', body: ''}];
      } else {
        current.sections.splice(index, 1);
      }
      apply(current);
      return;
    }
    if (role === 'up' && index > 0) {
      const tmp = current.sections[index - 1];
      current.sections[index - 1] = current.sections[index];
      current.sections[index] = tmp;
      apply(current);
      return;
    }
    if (role === 'down' && index < current.sections.length - 1) {
      const tmp = current.sections[index + 1];
      current.sections[index + 1] = current.sections[index];
      current.sections[index] = tmp;
      apply(current);
    }
  });

  root.addEventListener('input', () => {
    const next = readModelFromDom(root, state.model);
    Object.assign(state.model, next);
    refreshPreview(root, state.model);
  });

  root.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.getAttribute && target.getAttribute('data-role') === 'rawtoggle') {
      const current = readModelFromDom(root, state.model);
      if (target.checked) {
        current.mode = 'raw';
        current.rawHtml = serializeInteractiveHtml({...current, mode: 'sections'});
      } else {
        const reparsed = parseInteractiveHtml(current.rawHtml || serializeInteractiveHtml(current), current.type);
        current.mode = reparsed.mode === 'raw' ? 'raw' : 'sections';
        current.sections = reparsed.sections.length ? reparsed.sections : current.sections;
        current.styleHtml = reparsed.styleHtml || current.styleHtml;
      }
      apply(current);
    }
  });

  apply(state.model);
};

/**
 * Open the interactive HTML editor dialog.
 *
 * @param {Object} editor TinyMCE editor.
 * @param {Object} opts
 * @param {string} opts.html Widget HTML.
 * @param {string} [opts.elementType]
 * @param {boolean} [opts.hasSelection]
 * @param {Element} [opts.replaceNode] Existing .dp-ai-interactive node to overwrite.
 * @returns {Promise<void>}
 */
export const openInteractiveHtmlEditor = async (editor, opts = {}) => {
  const html = String(opts.html || '').trim();
  const fallbackType = String(opts.elementType || '').trim();
  const model = parseInteractiveHtml(html, fallbackType);
  const replaceNode = opts.replaceNode || null;
  const hasSelection = Boolean(opts.hasSelection) && !replaceNode;

  const [
    title,
    editorTitle,
    hint,
    addLabel,
    rawLabel,
    previewLabel,
    fieldTitle,
    fieldBody,
    btnUp,
    btnDown,
    btnRemove,
    btnCancel,
    btnInsert,
    btnReplace,
    btnSave,
    errEmpty,
  ] = await Promise.all([
    getString('modal_title', component),
    getString('interactive_editor_title', component),
    getString('interactive_editor_hint', component),
    getString('interactive_editor_add_section', component),
    getString('interactive_editor_raw_html', component),
    getString('interactive_editor_preview', component),
    getString('interactive_editor_section_title', component),
    getString('interactive_editor_section_body', component),
    getString('interactive_editor_move_up', component),
    getString('interactive_editor_move_down', component),
    getString('interactive_editor_remove_section', component),
    getString('btn_cancel', component),
    getString('btn_insert_into_editor', component),
    getString('btn_replace_selection', component),
    getString('interactive_editor_save', component),
    getString('err_interactive_empty', component),
  ]);

  const labels = {
    title: fieldTitle,
    body: fieldBody,
    up: btnUp,
    down: btnDown,
    remove: btnRemove,
  };

  const rendered = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/interactive-html-editor',
    {
      layout: model.type,
      hint,
      addlabel: addLabel,
      rawlabel: rawLabel,
      previewlabel: previewLabel,
      rawmode: model.mode === 'raw',
    }
  );
  if (rendered.js) {
    Templates.runTemplateJS(rendered.js);
  }

  const state = {model};

  const buttons = [{type: 'cancel', text: btnCancel}];
  if (replaceNode) {
    buttons.push({type: 'custom', name: 'save', text: btnSave, primary: true});
  } else {
    buttons.push({type: 'custom', name: 'insertBelow', text: btnInsert, primary: !hasSelection});
    if (hasSelection) {
      buttons.push({type: 'custom', name: 'replaceSelection', text: btnReplace, primary: true});
    }
  }

  const commit = async (api, action) => {
    const dialogEl = getTopDialogEl();
    const root = dialogEl ? dialogEl.querySelector('.dp-ai-ie') : null;
    const next = root ? readModelFromDom(root, state.model) : state.model;
    const hasContent = next.mode === 'raw'
      ? Boolean(String(next.rawHtml || '').trim())
      : (next.sections || []).some((section) => {
        const title = String(section.title || '').trim();
        const bodyText = String(section.body || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        return Boolean(title || bodyText);
      });
    if (!hasContent) {
      await moodleAlert(title, errEmpty);
      return;
    }
    const output = serializeInteractiveHtml(next).trim();
    if (!output) {
      await moodleAlert(title, errEmpty);
      return;
    }
    try {
      if (action === 'save' && replaceNode) {
        replaceInteractiveNode(editor, replaceNode, output);
      } else if (action === 'replaceSelection') {
        replaceWithInteractiveHtml(editor, output);
      } else {
        insertInteractiveHtml(editor, output);
      }
      api.close();
    } catch (e) {
      await moodleAlert(title, e?.message ? e.message : String(e));
    }
  };

  let removeGuard = () => {};
  const cfg = {
    title: `${title}: ${editorTitle}`,
    size: 'large',
    body: {
      type: 'panel',
      items: [
        {type: 'htmlpanel', name: 'interactiveeditor', html: rendered.html},
      ],
    },
    buttons,
    onClose: () => {
      removeGuard();
    },
    onAction: async (api, details) => {
      if (details.name === 'save' || details.name === 'insertBelow' || details.name === 'replaceSelection') {
        await commit(api, details.name);
      }
    },
  };

  editor.windowManager.open(cfg);
  window.setTimeout(() => {
    const dialogEl = getTopDialogEl();
    const root = dialogEl ? dialogEl.querySelector('.dp-ai-ie') : null;
    if (!root) {
      return;
    }
    bindEditor(root, state, labels);
    removeGuard = installEditorKeyboardGuard(dialogEl);
  }, 0);
};
