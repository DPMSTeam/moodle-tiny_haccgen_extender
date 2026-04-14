import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import { makeRequest } from '../repository';
import { component } from '../common';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';
export const buildCreateAudioTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);

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
    title: `${title}: Generate audio`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'audioHead',
          html: `
            <style>
              .dp-ai-x-head{
                background: linear-gradient(135deg, rgba(15,108,191,.10), rgba(15,108,191,.03));
                border:1px solid rgba(15,108,191,.18);
                border-radius:12px;
                padding:12px 12px;
                margin-bottom:10px;
                box-shadow: 0 8px 22px rgba(15,108,191,.10);
              }
              .dp-ai-x-head__t{ font-weight:800; margin:0 0 4px; color:#102a43; font-size:14px; }
              .dp-ai-x-head__s{ margin:0; font-size:12.5px; line-height:1.4; color:rgba(16,42,67,.78); }

              .tox .tox-textarea, .tox .tox-textfield{ border-radius: 10px !important; }
              .tox .tox-textarea{ min-height: 260px !important; font-size: 12.5px !important; line-height: 1.45 !important; }
            </style>

            <div class="dp-ai-x-head">
              <p class="dp-ai-x-head__t">Generate audio from text</p>
              <p class="dp-ai-x-head__s">Choose language and voice, edit the text, then generate.</p>
            </div>
          `,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: 'Back', buttonType: 'secondary' },
          ],
        },

        {
          type: 'grid',
          columns: 2,
          items: [
            {
              type: 'selectbox',
              name: 'targetLanguage',
              label: 'Target language',
              items: languageItems,
            },
            {
              type: 'selectbox',
              name: 'gender',
              label: 'Gender',
              items: [
                { value: 'Male', text: 'Male' },
                { value: 'Female', text: 'Female' },
              ],
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: 'Prompt edit mode',
          placeholder: 'Paste or type the text you want to convert to audio (or select text before opening).',
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
        await moodleAlert(title, 'Please enter text in the Prompt box (or select text before opening).');
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        const optionsjson = JSON.stringify(
          {
            targetLanguage: data.targetLanguage,
            gender: data.gender,
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
        await openResultDialog(editor, resp.result, { hasSelection: Boolean(selectionText?.trim()),
           purpose: 'create_audio' });
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
