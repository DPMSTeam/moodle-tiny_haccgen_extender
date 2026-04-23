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
 * Video-generation dialog config.
 *
 * @module tiny_haccgen_extender/steps/videoGenerationTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Templates from 'core/templates';
import { component } from '../common';
import { makeRequest } from '../repository';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';
import { resolveDraftItemId } from '../draftItemid';

const OPT_CACHE_KEY = 'dp_ai_videogen_opts_v1';
const OPT_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

const readOptCache = () => {
  try {
    const raw = sessionStorage.getItem(OPT_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      return null;
    }
    return parsed.data || null;
  } catch (e) {
    return null;
  }
};

const writeOptCache = (data) => {
  try {
    sessionStorage.setItem(
      OPT_CACHE_KEY,
      JSON.stringify({ data, expiresAt: Date.now() + OPT_CACHE_TTL_MS })
    );
  } catch (e) {
    // ignore
  }
};

const safeParse = (x) => {
  if (x === null || x === undefined) {
    return null;
  }
  if (typeof x === 'object') {
    return x;
  }
  try {
    return JSON.parse(x);
  } catch (e) {
    return null;
  }
};

const toSelectItems = (arr) => (arr || []).map((o) => ({ value: o.id, text: o.name }));

/**
 * Build modal config for video generation.
 *
 * @param {Object} root0
 * @param {Object} root0.editor TinyMCE editor instance.
 * @param {string} root0.selectionText Selected text (used as initial prompt).
 * @param {Function} root0.goBack Back handler.
 * @returns {Promise<Object>} TinyMCE windowManager config.
 */
export const buildVideoGenerationTemplateConfig = async ({ editor, selectionText, goBack }) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);
  const btnBack = await getString('btn_back', component);
  const videoGenerationTitle = await getString('video_generation_title', component);
  const videoGenerationSubtitle = await getString('video_generation_subtitle', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderVideoPrompt = await getString('placeholder_video_prompt', component);
  const fieldLanguage = await getString('field_language', component);
  const fieldVoice = await getString('field_voice', component);
  const fieldAspectRatio = await getString('field_aspect_ratio', component);
  const fieldOutputFormat = await getString('field_output_format', component);
  const fieldFont = await getString('field_font', component);
  const fieldUseGenerativeImage = await getString('field_use_generative_image', component);
  const valueYes = await getString('yes', component);
  const valueNo = await getString('no', component);
  const errVideoOptionsLoadFailed = await getString('err_video_options_load_failed', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: videoGenerationTitle,
      subtitle: videoGenerationSubtitle,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  // Load options from aigen_subscribe (same flow as HeyGen avatar options).
  let opts = readOptCache();
  if (!opts) {
    const resp = await makeRequest('video_generation_options', '', '{}');

    if (resp?.code !== 200) {
      let msg = errVideoOptionsLoadFailed;
      if (typeof resp?.result === 'string') {
        msg = resp.result;
      } else if (resp?.result) {
        msg = JSON.stringify(resp.result);
      }
      await moodleAlert(title, msg);
      opts = {};
    } else {
      const parsed = safeParse(resp.result);
      if (parsed && typeof parsed.outputText === 'string') {
        opts = safeParse(parsed.outputText) || {};
      } else if (parsed && typeof parsed.result === 'string') {
        opts = safeParse(parsed.result) || {};
      } else if (parsed && (Array.isArray(parsed.voice_id) || Array.isArray(parsed.language))) {
        opts = parsed;
      } else {
        opts = parsed || {};
      }
      writeOptCache(opts);
    }
  }

  const languageItems = toSelectItems(opts.language);
  const voiceItems = toSelectItems(opts.voice_id);
  const fontItems = toSelectItems(opts.fonts);
  const aspectItems = toSelectItems(opts.aspect_ratios);
  const formatItems = toSelectItems(opts.output_format);

  const defaultLanguage = languageItems[0]?.value || 'en';
  const defaultVoice = voiceItems[0]?.value || '';
  const defaultFont = fontItems[0]?.value || '';
  const defaultAspect = aspectItems[0]?.value || '16:9';
  const defaultFormat = formatItems[0]?.value || 'mp4';

  return {
    title: `${title}: ${videoGenerationTitle}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'videoHead',
          html: headerHtml,
        },

        {
          type: 'bar',
          items: [{ type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' }],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderVideoPrompt,
        },

        {
          type: 'grid',
          columns: 2,
          items: [
            { type: 'selectbox', name: 'language', label: fieldLanguage, items: languageItems },
            { type: 'selectbox', name: 'voice_id', label: fieldVoice, items: voiceItems },
            { type: 'selectbox', name: 'aspect_ratio', label: fieldAspectRatio, items: aspectItems },
            { type: 'selectbox', name: 'output_format', label: fieldOutputFormat, items: formatItems },
            { type: 'selectbox', name: 'font', label: fieldFont, items: fontItems },
            {
              type: 'selectbox',
              name: 'useGenerativeImage',
              label: fieldUseGenerativeImage,
              items: [
                { value: 'true', text: valueYes },
                { value: 'false', text: valueNo },
              ],
            },
          ],
        },
      ],
    },

    initialData: {
      prompt: (selectionText || '').trim(),
      language: defaultLanguage,
      voice_id: defaultVoice,
      aspect_ratio: defaultAspect,
      output_format: defaultFormat,
      font: defaultFont,
      useGenerativeImage: 'true',
    },

    buttons: [
      { type: 'cancel', text: btnCancel },
      { type: 'custom', name: 'generate', text: btnRun, primary: true },
    ],

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

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);
      const draftItemId = resolveDraftItemId(editor);

      const optionsjson = JSON.stringify(
        {
          script: inputText,
          language: data.language ? [data.language] : [],
          voice_id: data.voice_id ? [data.voice_id] : [],
          aspect_ratio: data.aspect_ratio || '16:9',
          output_format: data.output_format || 'mp4',
          font: data.font ? [data.font] : [],
          useGenerativeImage: data.useGenerativeImage === 'true',
          itemid: draftItemId,
        },
        null,
        2
      );

      try {
        const resp = await makeRequest('videogen', inputText, optionsjson);

        if (resp.code !== 200) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          const msg = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result || {});
          await moodleAlert(title, msg);
          return;
        }

        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        api.close();
        await openResultDialog(editor, resp.result, {
          hasSelection: Boolean(selectionText?.trim()),
          purpose: 'videogen',
          requestItemId: draftItemId,
        });
      } catch (e) {
        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        await moodleAlert(title, e?.message || String(e));
      }
      })();
    },
  };
};
