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
export const buildSummarizeTemplateConfig = async ({
  editor,
  selectionText,
  goBack,
}) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);

  return {
    title: `${title}: Summarize`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'summarizeHead',
          html: `
            <style>
              .dp-ai-sum-head{
                background: linear-gradient(135deg, rgba(15,108,191,.10), rgba(15,108,191,.03));
                border:1px solid rgba(15,108,191,.18);
                border-radius:12px;
                padding:12px 12px;
                margin-bottom:10px;
                box-shadow: 0 8px 22px rgba(15,108,191,.10);
              }
              .dp-ai-sum-head__t{
                font-weight:800;
                margin:0 0 4px;
                color:#102a43;
                font-size:14px;
              }
              .dp-ai-sum-head__s{
                margin:0;
                font-size:12.5px;
                line-height:1.4;
                color:rgba(16,42,67,.78);
              }
              .tox .tox-textarea, .tox .tox-textfield{
                border-radius: 10px !important;
              }
              .tox .tox-textarea{
                min-height: 260px !important;
                font-size: 12.5px !important;
                line-height: 1.45 !important;
              }
            </style>

            <div class="dp-ai-sum-head">
              <p class="dp-ai-sum-head__t">Summarize text</p>
              <p class="dp-ai-sum-head__s">Paste/type text below, choose options, then generate.</p>
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
              name: 'wordCount',
              label: 'Maximum amount of words',
              items: [
                { value: 'nolimit', text: 'No limit' },
                { value: '10', text: '10' },
                { value: '20', text: '20' },
                { value: '50', text: '50' },
                { value: '100', text: '100' },
                { value: '200', text: '200' },
                { value: '300', text: '300' },
                { value: '400', text: '400' },
                { value: '500', text: '500' }
              ],
            },
            {
              type: 'selectbox',
              name: 'languageType',
              label: 'Language type',
              items: [
                { value: 'keep', text: 'Keep language type' },
                { value: 'simple', text: 'Simple language' },
                { value: 'technical', text: 'Technical language' },
              ],
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: 'Prompt',
          placeholder: 'Paste or type the text you want to summarize (or select text in the editor before opening).',
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
      const textToSummarize = (data.prompt || '').trim();

      if (!textToSummarize) {
        await moodleAlert(title, 'Please enter text in the Prompt box (or select text before opening).');
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        const optionsjson = JSON.stringify(
          {
            languageType: data.languageType,
            wordCount: data.wordCount,
          },
          null,
          2
        );

        const resp = await makeRequest('summarize', textToSummarize, optionsjson);

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
          purpose: 'summarize',
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
