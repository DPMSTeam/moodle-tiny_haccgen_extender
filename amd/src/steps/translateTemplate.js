import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
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
  const generatingMsg = await getString('generating', component);

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
    title: `${title}: Translate`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'translateHead',
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
              <p class="dp-ai-x-head__t">Translate text</p>
              <p class="dp-ai-x-head__s">Choose a target language, edit the text, then generate.</p>
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
          type: 'selectbox',
          name: 'targetLanguage',
          label: 'Target language',
          items: languageItems,
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: 'Prompt edit mode',
          placeholder: 'Paste or type the text you want to translate (or select text before opening).',
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
        await moodleAlert(title, 'Please enter text in the Prompt box (or select text before opening).');
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
