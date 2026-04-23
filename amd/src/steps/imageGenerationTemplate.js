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
 * Image-generation dialog config.
 *
 * @module tiny_haccgen_extender/steps/imageGenerationTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Templates from 'core/templates';
import { makeRequest } from '../repository';
import { component } from '../common';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';
import { resolveDraftItemId } from '../draftItemid';

/**
 * @param {Object} params
 * @param {Object} params.editor
 * @param {string} params.selectionText
 * @param {Function} params.goBack
 * @returns {Promise<Object>}
 */
export const buildImageGenerationTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeImageGenerationLabel = await getString('purpose_image_generation_label', component);
  const purposeImageGenerationDesc = await getString('purpose_image_generation_desc', component);
  const fieldPrompt = await getString('field_prompt', component);
  const fieldSize = await getString('field_size', component);
  const placeholderImageGenerationPrompt = await getString('placeholder_image_generation_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeImageGenerationLabel,
      subtitle: purposeImageGenerationDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  return {
    title: `${title}: ${purposeImageGenerationLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          html: headerHtml,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderImageGenerationPrompt,
        },

        {
          type: 'selectbox',
          name: 'size',
          label: fieldSize,
          items: [
            { value: '1:1_1024x1024', text: '1:1 (1024 x 1024)' },
            { value: '4:3_896x1280', text: '4:3 (896 x 1280)' },
            { value: '4:3_1280x896', text: '4:3 (1280 x 896)' },
            { value: '9:16_768x1408', text: '9:16 (768 x 1408)' },
            { value: '16:9_1408x768', text: '16:9 (1408 x 768)' },
          ],
        },
      ],
    },

    initialData: {
      prompt: selectionText || '',
      size: '1:1_1024x1024',
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
        const draftItemId = resolveDraftItemId(editor);
        const optionsjson = JSON.stringify(
          {
            size: data.size,
            itemid: draftItemId,
          },
          null,
          2
        );

        const resp = await makeRequest('image_generation', inputText, optionsjson);

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
          requestItemId: draftItemId,
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
