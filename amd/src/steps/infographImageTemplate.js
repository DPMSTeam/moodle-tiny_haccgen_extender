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
 * Infographic-image dialog config.
 *
 * @module tiny_haccgen_extender/steps/infographImageTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// steps/infographImageGenerationTemplate.js
import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Templates from 'core/templates';
import { makeRequest } from '../repository';
import { component } from '../common';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';

/**
 * Infographic image generation modal config
 * @param {Object} params
 * @param {Object} params.editor
 * @param {string} params.selectionText
 * @param {Function} params.goBack
 * @returns {Promise<Object>}
 */
export const buildInfographImageGenerationTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeInfographLabel = await getString('purpose_infograph_image_generation_label', component);
  const purposeInfographDesc = await getString('purpose_infograph_image_generation_desc', component);
  const fieldSize = await getString('field_size', component);
  const fieldInfographLength = await getString('field_infograph_length', component);
  const optionLong = await getString('option_long', component);
  const optionSummarize = await getString('option_summarize', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderInfographPrompt = await getString('placeholder_infograph_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeInfographLabel,
      subtitle: purposeInfographDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  const sizeItems = [
    { value: '16:9_1408x768', text: 'Landscape (16:9)' },
    { value: '9:16_768x1408', text: 'Portrait (9:16)' },
    { value: '1:1_1024x1024', text: 'Square (1:1)' },
  ];

  return {
    title: `${title}: ${purposeInfographLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'infographHead',
          html: headerHtml,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
          ],
        },

        {
          type: 'selectbox',
          name: 'size',
          label: fieldSize,
          items: sizeItems,
        },

        {
          type: 'selectbox',
          name: 'infographlength',
          label: fieldInfographLength,
          items: [
            { value: 'long', text: optionLong },
            { value: 'summarize', text: optionSummarize },
          ],
        },
        {
            type: 'textarea',
            name: 'prompt',
            label: fieldPrompt,
            placeholder: placeholderInfographPrompt,
          },
      ],
    },

    initialData: {
      size: '16:9_1408x768',
      infographlength: 'long',
      prompt: (selectionText || '').trim(),
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

      try {
        const infographMode = data.infographlength === 'summarize' ? 'summarize' : 'long';
        const promptToSend = infographMode === 'summarize'
          ? `Summarize the following content into a concise infographic with clear
           visual distinction between sections, headings,
            and key points.\n\nContent:\n${inputText}`
          : inputText;
        const optionsjson = JSON.stringify(
          {
            size: data.size,
            style: 'infographic',
            infograph_mode: infographMode,
          },
          null,
          2
        );

        const resp = await makeRequest('infograph_image_generation', promptToSend, optionsjson);

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
          hasSelection: Boolean(selectionText?.trim()),
          purpose: 'image_generation',
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
