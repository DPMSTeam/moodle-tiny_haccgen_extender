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
 * Detailed-description dialog config.
 *
 * @module tiny_haccgen_extender/steps/detailedDescriptionTemplate
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


/**
 * @param {Object} params
 * @param {Object} params.editor
 * @param {string} params.selectionText
 * @param {Function} params.goBack
 * @returns {Promise<Object>}
 */
export const buildDetailedDescriptionTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeDetailedLabel = await getString('purpose_detailed_description_label', component);
  const purposeDetailedDesc = await getString('purpose_detailed_description_desc', component);
  const fieldMaxWords = await getString('field_max_words', component);
  const optionNoLimit = await getString('option_no_limit', component);
  const fieldLanguageType = await getString('field_language_type', component);
  const optionKeepLanguageType = await getString('option_keep_language_type', component);
  const optionSimpleLanguage = await getString('option_simple_language', component);
  const optionTechnicalLanguage = await getString('option_technical_language', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderDetailedPrompt = await getString('placeholder_detailed_description_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeDetailedLabel,
      subtitle: purposeDetailedDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  return {
    title: `${title}: ${purposeDetailedLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'ddHead',
          html: headerHtml,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
          ],
        },

        {
          type: 'grid',
          columns: 2,
          items: [
            {
              type: 'selectbox',
              name: 'wordCount',
              label: fieldMaxWords,
              items: [
                { value: 'nolimit', text: optionNoLimit },
                { value: '10', text: '10' },
                { value: '20', text: '20' },
                { value: '50', text: '50' },
              ],
            },
            {
              type: 'selectbox',
              name: 'languageType',
              label: fieldLanguageType,
              items: [
                { value: 'keep', text: optionKeepLanguageType },
                { value: 'simple', text: optionSimpleLanguage },
                { value: 'technical', text: optionTechnicalLanguage },
              ],
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderDetailedPrompt,
        },
      ],
    },

    initialData: {
      wordCount: 'nolimit',
      languageType: 'keep',
      prompt: selectionText || '',
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

    onSubmit: async (api) => {
      const data = api.getData();
      const inputText = (data.prompt || '').trim();

      if (!inputText) {
        await moodleAlert(title, errPromptRequired);
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        const optionsjson = JSON.stringify(
          {
            wordCount: data.wordCount,
            languageType: data.languageType,
          },
          null,
          2
        );

        const resp = await makeRequest('detailed_description', inputText, optionsjson);

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
          purpose: 'detailed_description',
          hasSelection: Boolean(selectionText && selectionText.trim().length),
          goBack,
        });
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
