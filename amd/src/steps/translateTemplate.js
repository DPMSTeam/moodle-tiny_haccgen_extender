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
 * Translate dialog config.
 *
 * @module tiny_haccgen_extender/steps/translateTemplate
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
export const buildTranslateTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeTranslateLabel = await getString('purpose_translate_label', component);
  const purposeTranslateDesc = await getString('purpose_translate_desc', component);
  const fieldTargetLanguage = await getString('field_target_language', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderTranslatePrompt = await getString('placeholder_translate_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeTranslateLabel,
      subtitle: purposeTranslateDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  const languages = [
    'English',
    'Albanian',
    'Arabic',
    'Bosnian',
    'Bulgarian',
    'Chinese',
    'Croatian',
    'Czech',
    'French',
    'German',
    'Greek',
    'Hausa',
    'Hindi',
    'Hungarian',
    'Igbo',
    'Italian',
    'Kannada',
    'Kurdish',
    'Latin',
    'Nigerian Pidgin',
    'Pashto',
    'Persian',
    'Polish',
    'Romanian',
    'Russian',
    'Serbian',
    'Slovak',
    'Spanish',
    'Tamil',
    'Telugu',
    'Turkish',
    'Ukrainian',
    'Yorùbá',
  ];

  const languageItems = languages.map((l) => ({ value: l, text: l }));

  return {
    title: `${title}: ${purposeTranslateLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'translateHead',
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
          name: 'targetLanguage',
          label: fieldTargetLanguage,
          items: languageItems,
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderTranslatePrompt,
        },
      ],
    },

    initialData: {
      targetLanguage: 'English',
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
          { targetLanguage: data.targetLanguage },
          null,
          2
        );

        const resp = await makeRequest('translate', inputText, optionsjson);

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
          purpose: 'translate',
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
