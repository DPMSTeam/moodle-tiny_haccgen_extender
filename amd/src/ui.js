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
 * Main modal UI flow for tiny_haccgen_extender.
 *
 * @module tiny_haccgen_extender/ui
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString, get_strings as getStrings } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Templates from 'core/templates';
import { makeRequest } from './repository';
import { getAllowedPurposes } from './options';
import { component } from './common';
import { buildSummarizeTemplateConfig } from './steps/summarizeTemplate';
import { buildTranslateTemplateConfig } from './steps/translateTemplate';
import { buildDetailedDescriptionTemplateConfig } from './steps/detailedDescriptionTemplate';
import { buildCreateAudioTemplateConfig } from './steps/createAudioTemplate';
import { buildImageGenerationTemplateConfig } from './steps/imageGenerationTemplate';
import {buildInfographImageGenerationTemplateConfig} from './steps/infographImageTemplate';
import { buildAvatarGenerationTemplateConfig } from './steps/avatarGenerationTemplate';
import { toAlertText } from './utils';
import { buildVideoGenerationTemplateConfig } from './steps/videoGenerationTemplate';
import {buildImageDescriptionTemplateConfig} from './steps/imageDescriptionTemplate';
import {buildTextRecognitionTemplateConfig} from './steps/textRecognitionTemplate';
import { showLoadingOverlay, showGlobalLoadingOverlay } from './loadingOverlay';
const DEFAULT_PURPOSE_KEYS = [
  'summarize',
  'translate',
  'detailed_description',
  'create_audio',
  'image_generation',
  'infograph_image_generation',
  'avatar_generation',
  'video_generation',
  'image_description',
  'text_recognition',
  /* 'optimize', */
];

const PURPOSE_DEFS = [
  {
    key: 'summarize',
    labelKey: 'purpose_summarize_label',
    descriptionKey: 'purpose_summarize_desc',
    templates: [
      { id: 'bullets_short', nameKey: 'template_short_bullets', options: { length: 'short', format: 'bullets' } },
      { id: 'exec_summary', nameKey: 'template_executive_summary', options: { tone: 'formal', length: 'medium' } },
    ],
  },
  {
    key: 'translate',
    labelKey: 'purpose_translate_label',
    descriptionKey: 'purpose_translate_desc',
    templates: [
      { id: 'en_us', nameKey: 'template_english_us', options: { target: 'en-US', preserveFormatting: true } },
      { id: 'hi_in', nameKey: 'template_hindi_india', options: { target: 'hi-IN', preserveFormatting: true } },
    ],
  },
  {
    key: 'detailed_description',
    labelKey: 'purpose_detailed_description_label',
    descriptionKey: 'purpose_detailed_description_desc',
    templates: [
      { id: 'detailed', nameKey: 'template_detailed', options: { depth: 'high', structure: 'sections' } },
      { id: 'step_by_step', nameKey: 'template_step_by_step', options: { format: 'steps', clarity: 'high' } },
    ],
  },
  {
    key: 'create_audio',
    labelKey: 'purpose_create_audio_label',
    descriptionKey: 'purpose_create_audio_desc',
    templates: [
      { id: 'narration', nameKey: 'template_narration', options: { voice: 'default', speed: 1.0 } },
      { id: 'slow_clear', nameKey: 'template_slow_clear', options: { voice: 'default', speed: 0.9 } },
    ],
  },
  {
    key: 'image_generation',
    labelKey: 'purpose_image_generation_label',
    descriptionKey: 'purpose_image_generation_desc',
    templates: [
      { id: 'realistic', nameKey: 'template_realistic', options: { style: 'realistic' } },
      { id: 'illustration', nameKey: 'template_illustration', options: { style: 'illustration' } },
    ],
  },
  {
    key: 'infograph_image_generation',
    labelKey: 'purpose_infograph_image_generation_label',
    descriptionKey: 'purpose_infograph_image_generation_desc',
    templates: [
      { id: 'clean', nameKey: 'template_clean_infographic', options: { style: 'infographic', density: 'medium' } },
      { id: 'dense', nameKey: 'template_data_heavy', options: { style: 'infographic', density: 'high' } },
    ],
  },
  {
    key: 'avatar_generation',
    labelKey: 'purpose_avatar_generation_label',
    descriptionKey: 'purpose_avatar_generation_desc',
    templates: [
      { id: 'flat', nameKey: 'template_flat_style', options: { style: 'flat' } },
      { id: '3d', nameKey: 'template_3d_style', options: { style: '3d' } },
    ],
  },
  {
    key: 'video_generation',
    labelKey: 'purpose_video_generation_label',
    descriptionKey: 'purpose_video_generation_desc',
    templates: [
      { id: 'story', nameKey: 'template_story_style', options: { style: 'story', duration: 'short' } },
      { id: 'product', nameKey: 'template_product_demo', options: { style: 'product', duration: 'short' } },
    ],
  },
  {
    key: 'image_description',
    labelKey: 'purpose_image_description_label',
    descriptionKey: 'purpose_image_description_desc',
    templates: [
      { id: 'short', nameKey: 'template_short', options: { length: 'short' } },
      { id: 'detailed', nameKey: 'template_detailed', options: { length: 'long' } },
    ],
  },
  {
    key: 'text_recognition',
    labelKey: 'purpose_text_recognition_label',
    descriptionKey: 'purpose_text_recognition_desc',
    templates: [
      { id: 'plain', nameKey: 'template_plain_text', options: { format: 'text' } },
      { id: 'structured', nameKey: 'template_structured', options: { format: 'structured' } },
    ],
  },
];

const localizePurposeDefs = async () => {
  const keySet = new Set();
  PURPOSE_DEFS.forEach((purpose) => {
    keySet.add(purpose.labelKey);
    keySet.add(purpose.descriptionKey);
    (purpose.templates || []).forEach((template) => keySet.add(template.nameKey));
  });

  const keys = Array.from(keySet);
  const requests = keys.map((key) => ({ key, component }));
  const values = await getStrings(requests);
  const byKey = new Map(keys.map((key, idx) => [key, values[idx]]));

  return PURPOSE_DEFS.map((purpose) => ({
    ...purpose,
    label: byKey.get(purpose.labelKey) || '',
    description: byKey.get(purpose.descriptionKey) || '',
    templates: (purpose.templates || []).map((template) => ({
      ...template,
      name: byKey.get(template.nameKey) || '',
    })),
  }));
};

const sanitizeText = (html) => (html || '').replace(/<[^>]*>/g, '').trim();

const tryParseJsonOrThrow = async (jsonText) => {
  try {
    return JSON.parse(jsonText || '{}');
  } catch (e) {
    const msg = await getString('err_bad_options', component);
    throw new Error(msg);
  }
};

const buildAllowedPurposeDefs = (editor, purposeDefs) => {
  const allowed = getAllowedPurposes(editor) || [];
  const allowedKeys = allowed.length ? allowed : DEFAULT_PURPOSE_KEYS;
  return purposeDefs.filter((p) => allowedKeys.includes(p.key));
};

const findPurpose = (defs, key) => defs.find((p) => p.key === key);
const findTemplate = (purpose, templateId) =>
  (purpose?.templates || []).find((t) => t.id === templateId) || purpose?.templates?.[0];

const renderTemplateHtml = async (templatename, context) => {
  const rendered = await Templates.renderForPromise(`tiny_haccgen_extender/components/${templatename}`, context);
  if (rendered.js) {
    Templates.runTemplateJS(rendered.js);
  }
  return rendered.html;
};

const getTopDialogEl = () => {
  try {
    const dialogs = document.querySelectorAll('.tox-dialog');
    if (dialogs && dialogs.length) {
      return dialogs[dialogs.length - 1];
    }
    return null;
  } catch (e) {
    return null;
  }
};

const closeTopDialog = () => {
  const dialogEl = getTopDialogEl();
  if (!dialogEl) {
    return false;
  }

  const closeBtn =
    dialogEl.querySelector('button[aria-label="Close"]') ||
    dialogEl.querySelector('button.tox-button--icon[title="Close"]') ||
    dialogEl.querySelector('.tox-dialog__header button.tox-button--icon');

  if (closeBtn && typeof closeBtn.click === 'function') {
    closeBtn.click();
    return true;
  }

  const overlayClose = document.querySelector('.tox-dialog-wrap__backdrop');
  if (overlayClose && typeof overlayClose.click === 'function') {
    overlayClose.click();
    return true;
  }

  return false;
};

const attachStep1GalleryHandlers = (editor, loadingMsg, onPurposePicked) => {
  let tries = 0;
  const maxTries = 30;

  const attempt = () => {
    tries += 1;

    const dialogEl = getTopDialogEl();
    if (!dialogEl) {
      if (tries < maxTries) {
        requestAnimationFrame(attempt);
      }
      return;
    }

    const gallery = dialogEl.querySelector('.dp-ai-wrap');
    if (!gallery) {
      if (tries < maxTries) {
        requestAnimationFrame(attempt);
      }
      return;
    }

    if (gallery.__dpAiClickHandler) {
      gallery.removeEventListener('click', gallery.__dpAiClickHandler);
    }

    gallery.__dpAiClickHandler = (e) => {
      const btn = e?.target?.closest ? e.target.closest('button.dp-ai-menuItem[data-purpose]') : null;
      if (!btn) {
        return;
      }

      const purposeKey = btn.getAttribute('data-purpose');
      if (!purposeKey) {
        return;
      }

      closeTopDialog();
      const removeGlobalLoader = showGlobalLoadingOverlay(loadingMsg);
      void (async () => {
        try {
          await onPurposePicked(purposeKey, removeGlobalLoader);
        } catch (err) {
          removeGlobalLoader();
          const title = await getString('modal_title', component);
          await moodleAlert(title, toAlertText(err));
        }
      })();
    };

    gallery.addEventListener('click', gallery.__dpAiClickHandler);
  };

  requestAnimationFrame(attempt);
};

const getPurposeIconSvg = (key) => {
  // Inline SVGs (no icon font, no external assets) — reliable inside TinyMCE htmlpanel
  // All icons use `currentColor` so theme colors apply automatically.
  const icons = {
    summarize: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    translate: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 5h10M9 5s0 7-7 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19l4-10 4 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.5 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    detailed_description: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 4h7l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
         stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M8 11h8M8 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    create_audio: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M5 10v4h3l4 3V7L8 10H5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18.5 6.5a7 7 0 0 1 0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    image_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="currentColor" stroke-width="2"/>
        <path d="M8 11l2 2 3-4 5 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
    infograph_image_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 17v-5M12 17V7M16 17v-3M20 17v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    avatar_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" stroke-width="2"/>
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    video_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="2"/>
        <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    image_description: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.2-1.3 2.5-2 4-2s2.8.7 4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 10h.01M15 10h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
    text_recognition: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 4h10M7 8h10M7 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 20l2-6h4l2 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
  };

  return icons[key] || `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"
        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
};

const buildStep1Config = async (editor, purposeDefs) => {
  const title = await getString('modal_title', component);
  const btnCancel = await getString('btn_cancel', component);
  const menuTools = await getString('menu_tools', component);
  const selectPurposeHelp = await getString('select_purpose_to_load_templates', component);
  const purposeGallery = await renderTemplateHtml('purpose-gallery', {
    toolslabel: menuTools,
    selectpurposehelp: selectPurposeHelp,
    cards: purposeDefs.map((p) => ({
      key: p.key,
      label: p.label,
      description: p.description,
      iconsvg: getPurposeIconSvg(p.key),
    })),
  });

  return {
    title,
    size: 'medium',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'purposegallery',
          html: purposeGallery,
        },
      ],
    },
    buttons: [{ type: 'cancel', text: btnCancel }],
    onCancel: (api) => {
      api.close();
    },
  };
};

const buildStep2Config = async (editor, purposeDefs, selectionText, purposeKey, templateId, goBack) => {
  const title = await getString('modal_title', component);
  const fieldOptions = await getString('field_options', component);
  const fieldPreview = await getString('field_preview', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);
  const btnBack = await getString('btn_back', component);
  const fieldTemplate = await getString('field_template', component);
  const step2SelectTemplateHelp = await getString('step2_select_template_help', component);
  const placeholderOptionsJson = await getString('placeholder_options_json', component);

  const purpose = findPurpose(purposeDefs, purposeKey) || purposeDefs[0];
  const template = findTemplate(purpose, templateId);
  const templateItems = (purpose.templates || []).map((t) => ({ value: t.id, text: t.name }));
  const templatesFor = await getString('templates_for', component, purpose.label);
  const step2HeadHtml = await renderTemplateHtml('dialog-head', {
    title: purpose.label,
    subtitle: step2SelectTemplateHelp,
  });

  return {
    title: `${title}: ${purpose.label}`,
    size: 'medium',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'step2head',
          html: step2HeadHtml,
        },
        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
            { type: 'label', label: templatesFor },
          ],
        },
        {
          type: 'selectbox',
          name: 'templateId',
          label: fieldTemplate,
          items: templateItems,
        },
        {
          type: 'textarea',
          name: 'optionsjson',
          label: fieldOptions,
          placeholder: placeholderOptionsJson,
        },
        {
          type: 'textarea',
          name: 'preview',
          label: fieldPreview,
          disabled: true,
        },
      ],
    },
    initialData: {
      templateId: template?.id ?? '',
      optionsjson: JSON.stringify(template?.options ?? {}, null, 2),
      preview: selectionText,
    },
    buttons: [
      { type: 'cancel', text: btnCancel },
      { type: 'submit', text: btnRun, primary: true },
    ],

    onAction: (api, details) => {
      if (details.name === 'back') {
        goBack(api);
      }
    },

    onChange: (api, details) => {
      if (details.name !== 'templateId') {
        return;
      }
      const data = api.getData();
      const newTemplate = findTemplate(purpose, data.templateId);
      api.setData({ ...data, optionsjson: JSON.stringify(newTemplate?.options ?? {}, null, 2) });
    },

    onSubmit: async (api) => {
      const data = api.getData();
      let removeLoadingOverlay = () => {};
      try {
        await tryParseJsonOrThrow(data.optionsjson);

        removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

        const resp = await makeRequest(purpose.key, selectionText, data.optionsjson);

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
        editor.selection.setContent(resp.result);
        api.close();
      } catch (e) {
        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        await moodleAlert(title, e.message || String(e));
      }
    },
  };
};

export const openModal = async (editor) => {
 /* const title = await getString('modal_title', component);
  const errNoSelection = await getString('err_no_selection', component);
*/
  const selectionHtml = editor.selection.getContent({ format: 'html' }) || '';
  const selectionText = sanitizeText(selectionHtml);
/*
  if (!selectionText) {
    await moodleAlert(title, errNoSelection);
    return;
  }
*/
  const localizedPurposeDefs = await localizePurposeDefs();
  const purposeDefs = buildAllowedPurposeDefs(editor, localizedPurposeDefs);
  const loadingOpeningMsg = await getString('loading_opening_tool', component);

  const openStep1 = async () => {
    const cfg1 = await buildStep1Config(editor, purposeDefs);
    editor.windowManager.open(cfg1);

    attachStep1GalleryHandlers(editor, loadingOpeningMsg, async (purposeKey, removeGlobalLoader) => {
      await openStep2(purposeKey, removeGlobalLoader);
    });
  };

  const openStep2 = async (purposeKey, removeGlobalLoader) => {
    const openCfg = (cfg) => {
      if (typeof removeGlobalLoader === 'function') {
        removeGlobalLoader();
      }
      editor.windowManager.open(cfg);
    };

    try {
      const goBack = async (api2) => {
        try {
          api2.close();
        } catch (e) {}
        await openStep1();
      };

      if (purposeKey === 'summarize') {
        const cfg = await buildSummarizeTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }

      else if (purposeKey === 'translate') {
        const cfg = await buildTranslateTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'detailed_description') {
        const cfg = await buildDetailedDescriptionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'create_audio') {
        const cfg = await buildCreateAudioTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'image_generation') {
        const cfg = await buildImageGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'infograph_image_generation') {
        const cfg = await buildInfographImageGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'avatar_generation') {
        const cfg = await buildAvatarGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'video_generation') {
        const cfg = await buildVideoGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'image_description') {
        const cfg = await buildImageDescriptionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if(purposeKey === 'text_recognition'){
        const cfg = await buildTextRecognitionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      const cfg = await buildStep2Config(editor, purposeDefs, selectionText, purposeKey, null, goBack);
      openCfg(cfg);
    } catch (e) {
      if (typeof removeGlobalLoader === 'function') {
        removeGlobalLoader();
      }
      const title = await getString('modal_title', component);
      await moodleAlert(title, toAlertText(e));
    }
  };

  await openStep1();
};
