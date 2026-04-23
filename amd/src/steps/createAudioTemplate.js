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
 * Create-audio dialog config.
 *
 * @module tiny_haccgen_extender/steps/createAudioTemplate
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
export const buildCreateAudioTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const generatingMsg = await getString('generating', component);
  const purposeCreateAudioLabel = await getString('purpose_create_audio_label', component);
  const purposeCreateAudioDesc = await getString('purpose_create_audio_desc', component);
  const fieldTargetLanguage = await getString('field_target_language', component);
  const fieldGender = await getString('field_gender', component);
  const optionMale = await getString('option_male', component);
  const optionFemale = await getString('option_female', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderCreateAudioPrompt = await getString('placeholder_create_audio_prompt', component);
  const errPromptRequired = await getString('err_prompt_required', component);
  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: purposeCreateAudioLabel,
      subtitle: purposeCreateAudioDesc,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  const languageItems = [
    'Afrikaans (af-ZA)',
    'Amharic (am-ET)',
    'Arabic (ar-XA)',
    'Bangla (bn-IN)',
    'Basque (eu-ES)',
    'Bulgarian (bg-BG)',
    'Cantonese (yue-HK)',
    'Catalan (ca-ES)',
    'Chinese (cmn-CN)',
    'Chinese (cmn-TW)',
    'Croatian (hr-HR)',
    'Czech (cs-CZ)',
    'Danish (da-DK)',
    'Dutch (nl-BE)',
    'Dutch (nl-NL)',
    'English (en-AU)',
    'English (en-GB)',
    'English (en-IN)',
    'English (en-US)',
    'Estonian (et-EE)',
    'Filipino (fil-PH)',
    'Finnish (fi-FI)',
    'French (fr-CA)',
    'French (fr-FR)',
    'Galician (gl-ES)',
    'German (de-DE)',
    'Greek (el-GR)',
    'Gujarati (gu-IN)',
    'Hebrew (he-IL)',
    'Hindi (hi-IN)',
    'Hungarian (hu-HU)',
    'Icelandic (is-IS)',
    'Indonesian (id-ID)',
    'Italian (it-IT)',
    'Japanese (ja-JP)',
    'Kannada (kn-IN)',
    'Korean (ko-KR)',
    'Latvian (lv-LV)',
    'Lithuanian (lt-LT)',
    'Malay (ms-MY)',
    'Malayalam (ml-IN)',
    'Marathi (mr-IN)',
    'Norwegian Bokmål (nb-NO)',
    'Polish (pl-PL)',
    'Portuguese (pt-BR)',
    'Portuguese (pt-PT)',
    'Punjabi (pa-IN)',
    'Romanian (ro-RO)',
    'Russian (ru-RU)',
    'Serbian (sr-RS)',
    'Slovak (sk-SK)',
    'Slovenian (sl-SI)',
    'Spanish (es-ES)',
    'Spanish (es-US)',
    'Swahili (sw-KE)',
    'Swedish (sv-SE)',
    'Tamil (ta-IN)',
    'Telugu (te-IN)',
    'Thai (th-TH)',
    'Turkish (tr-TR)',
    'Ukrainian (uk-UA)',
    'Urdu (ur-IN)',
    'Vietnamese (vi-VN)',
  ].map((t) => ({ value: t, text: t }));

  return {
    title: `${title}: ${purposeCreateAudioLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'audioHead',
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
              name: 'targetLanguage',
              label: fieldTargetLanguage,
              items: languageItems,
            },
            {
              type: 'selectbox',
              name: 'gender',
              label: fieldGender,
              items: [
                { value: 'Male', text: optionMale },
                { value: 'Female', text: optionFemale },
              ],
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: placeholderCreateAudioPrompt,
        },
      ],
    },

    initialData: {
      targetLanguage: 'English (en-AU)',
      gender: 'Male',
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
        const draftItemId = resolveDraftItemId(editor);
        const optionsjson = JSON.stringify(
          {
            targetLanguage: data.targetLanguage,
            gender: data.gender,
            itemid: draftItemId,
          },
          null,
          2
        );

        const resp = await makeRequest('create_audio', inputText, optionsjson);
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
          purpose: 'create_audio',
          requestItemId: draftItemId,
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
