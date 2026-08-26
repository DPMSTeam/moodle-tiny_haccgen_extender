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
 * Interactive HTML elements dialog config (12 CSS-only layouts).
 *
 * @module tiny_haccgen_extender/steps/interactiveHtmlTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {get_string as getString} from 'core/str';
import {alert as moodleAlert} from 'core/notification';
import Templates from 'core/templates';
import {makeRequest} from '../repository';
import {component} from '../common';
import {showLoadingOverlay} from '../loadingOverlay';
import {openResultDialog} from './resultDialog/resultDialog';

const PURPOSE_KEY = 'interactive_html_generation';
const DEFAULT_LAYOUT = 'accordion';
const LAYOUT_IDS = [
  'accordion', 'tabs', 'faq', 'steps',
  'glossary', 'timeline', 'comparison', 'callouts',
  'cards', 'checklist', 'quiz', 'spoiler',
];

const LAYOUT_SKETCHES = {
  accordion: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="44" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 7.5h22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M38 6l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="2" y="14" width="44" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="2" y="24" width="44" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/>
    </svg>
  `,
  tabs: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <path d="M4 12h12V6h12v6h16v18H4V12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M10 20h28M10 25h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  faq: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M10 8.2v.4M10 12.2h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M18 10h24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="10" cy="26" r="5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M18 26h24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  steps: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="10" cy="26" r="4" stroke="currentColor" stroke-width="1.6"/>
      <path d="M10 14v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M18 10h22M18 26h22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  glossary: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <path d="M10 6h8v24h-8a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M18 6h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H18" stroke="currentColor" stroke-width="1.6"/>
      <path d="M24 12h10M24 18h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  timeline: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <path d="M10 6v24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="10" cy="26" r="3" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 10h22M16 26h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  comparison: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="27" y="6" width="18" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 12h8M8 18h8M32 12h8M32 18h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  callouts: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="40" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="4" y="20" width="40" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M10 10.5h22M10 25.5h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  cards: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="13" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="18" y="6" width="12" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <rect x="32" y="6" width="13" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M6 12h7M21 12h6M35 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  checklist: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="6" y="7" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 11l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 11h24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="6" y="21" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M18 25h24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  quiz: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="10" cy="26" r="4" stroke="currentColor" stroke-width="1.6"/>
      <path d="M18 10h24M18 26h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M10 10h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  spoiler: `
    <svg viewBox="0 0 48 36" width="48" height="36" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="36" height="20" rx="3" stroke="currentColor" stroke-width="1.6"/>
      <path d="M18 18h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M24 14v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
};

const getTopDialogEl = () => {
  try {
    const dialogs = document.querySelectorAll('.tox-dialog');
    return dialogs.length ? dialogs[dialogs.length - 1] : null;
  } catch (e) {
    return null;
  }
};

const bindLayoutPicker = (getLayout, setLayout) => {
  const dialogEl = getTopDialogEl();
  const wrap = dialogEl ? dialogEl.querySelector('.dp-ai-layout-wrap') : null;
  if (!wrap || wrap.__dpLayoutBound) {
    return;
  }
  wrap.__dpLayoutBound = true;

  wrap.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('button.dp-ai-layout-card[data-layout]') : null;
    if (!btn) {
      return;
    }
    const layout = String(btn.getAttribute('data-layout') || '').trim();
    if (!LAYOUT_IDS.includes(layout)) {
      return;
    }
    setLayout(layout);
    wrap.querySelectorAll('button.dp-ai-layout-card[data-layout]').forEach((card) => {
      const selected = card.getAttribute('data-layout') === layout;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  });

  const current = getLayout();
  wrap.querySelectorAll('button.dp-ai-layout-card[data-layout]').forEach((card) => {
    const selected = card.getAttribute('data-layout') === current;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
};

const reopenCompose = async ({editor, selectionText, goBack, initialLayout}) => {
  const cfg = await buildInteractiveHtmlTemplateConfig({
    editor,
    selectionText,
    goBack,
    initialLayout,
  });
  editor.windowManager.open(cfg);
  if (cfg && typeof cfg.__dpAfterOpen === 'function') {
    window.setTimeout(() => {
      try {
        cfg.__dpAfterOpen();
      } catch (err) {}
    }, 0);
  }
};

/**
 * Interactive HTML generation modal config.
 *
 * @param {Object} params
 * @param {Object} params.editor
 * @param {string} params.selectionText
 * @param {Function} params.goBack
 * @param {string} [params.initialLayout]
 * @returns {Promise<Object>}
 */
export const buildInteractiveHtmlTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
  initialLayout,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeLabel = await getString('purpose_interactive_html_generation_label', component);
  const purposeDesc = await getString('purpose_interactive_html_generation_desc', component);
  const fieldLayout = await getString('field_interactive_layout', component);
  const fieldPrompt = await getString('field_prompt', component);
  const fieldSections = await getString('field_interactive_sections', component);
  const fieldStyle = await getString('field_interactive_style', component);
  const optionAuto = await getString('option_interactive_auto', component);
  const optionClean = await getString('option_interactive_style_clean', component);
  const optionColorful = await getString('option_interactive_style_colorful', component);
  const placeholderPrompt = await getString('placeholder_interactive_html_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const errLayoutRequired = await getString('err_interactive_layout_required', component);

  const layoutLabels = {};
  const layoutHints = {};
  for (const id of LAYOUT_IDS) {
    layoutLabels[id] = await getString(`layout_${id}_label`, component);
    layoutHints[id] = await getString(`layout_${id}_hint`, component);
  }

  let selectedLayout = LAYOUT_IDS.includes(initialLayout) ? initialLayout : DEFAULT_LAYOUT;

  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeLabel,
      subtitle: purposeDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }

  const galleryRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/interactive-layout-gallery',
    {
      layoutlabel: fieldLayout,
      layouts: LAYOUT_IDS.map((id) => ({
        id,
        label: layoutLabels[id],
        hint: layoutHints[id],
        sketchsvg: LAYOUT_SKETCHES[id],
        selected: id === selectedLayout,
      })),
    }
  );
  if (galleryRender.js) {
    Templates.runTemplateJS(galleryRender.js);
  }

  const bindPicker = () => bindLayoutPicker(
    () => selectedLayout,
    (next) => {
      selectedLayout = next;
    }
  );

  return {
    title: `${title}: ${purposeLabel}`,
    size: 'large',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'interactiveHead',
          html: headerRender.html,
        },
        {
          type: 'bar',
          items: [
            {type: 'button', name: 'back', text: btnBack, buttonType: 'secondary'},
          ],
        },
        {
          type: 'htmlpanel',
          name: 'layoutgallery',
          html: galleryRender.html,
        },
        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderPrompt,
        },
        {
          type: 'grid',
          columns: 2,
          items: [
            {
              type: 'selectbox',
              name: 'sectioncount',
              label: fieldSections,
              items: [
                {value: 'auto', text: optionAuto},
                {value: '3', text: '3'},
                {value: '4', text: '4'},
                {value: '5', text: '5'},
                {value: '6', text: '6'},
              ],
            },
            {
              type: 'selectbox',
              name: 'style',
              label: fieldStyle,
              items: [
                {value: 'clean', text: optionClean},
                {value: 'colorful', text: optionColorful},
              ],
            },
          ],
        },
      ],
    },
    initialData: {
      prompt: (selectionText || '').trim(),
      sectioncount: 'auto',
      style: 'clean',
    },
    buttons: [
      {type: 'cancel', text: btnCancel},
      {type: 'custom', name: 'generate', text: btnRun, primary: true},
    ],
    onOpen: () => {
      bindPicker();
    },
    __dpAfterOpen: () => {
      bindPicker();
    },
    onAction: (api, details) => {
      if (details.name === 'back') {
        goBack(api);
        return;
      }
      if (details.name !== 'generate') {
        return;
      }
      (async () => {
        const data = api.getData();
        const inputText = (data.prompt || '').trim();
        if (!inputText) {
          await moodleAlert(title, errPromptRequired);
          return;
        }
        if (!LAYOUT_IDS.includes(selectedLayout)) {
          await moodleAlert(title, errLayoutRequired);
          return;
        }

        const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);
        try {
          const optionsjson = JSON.stringify(
            {
              element_type: selectedLayout,
              section_count: data.sectioncount || 'auto',
              style: data.style || 'clean',
            },
            null,
            2
          );
          const resp = await makeRequest(PURPOSE_KEY, inputText, optionsjson);

          if (resp.code !== 200) {
            removeLoadingOverlay();
            if (typeof api.unblock === 'function') {
              api.unblock();
            }
            let msg = resp.result;
            try {
              const parsed = JSON.parse(resp.result);
              msg = parsed.message || resp.result;
            } catch (e) {}
            await moodleAlert(title, msg);
            return;
          }

          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          api.close();
          await openResultDialog(editor, resp.result, {
            purpose: PURPOSE_KEY,
            elementType: selectedLayout,
            hasSelection: Boolean(selectionText && String(selectionText).trim().length),
            onTryAnother: async (resultApi) => {
              try {
                resultApi.close();
              } catch (e) {}
              await reopenCompose({
                editor,
                selectionText: inputText,
                goBack,
                initialLayout: selectedLayout,
              });
            },
          });
        } catch (e) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          await moodleAlert(title, e.message || String(e));
        }
      })();
    },
  };
};
