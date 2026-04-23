import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
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
  const generatingMsg = await getString('generating', component);

  return {
    title: `${title}: Image generation`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          html: `
            <style>
              .dp-ai-x-head{
                background: linear-gradient(135deg, rgba(15,108,191,.10), rgba(15,108,191,.03));
                border:1px solid rgba(15,108,191,.18);
                border-radius:12px;
                padding:12px;
                margin-bottom:10px;
                box-shadow:0 8px 22px rgba(15,108,191,.10);
              }
              .dp-ai-x-head__t{font-weight:800;margin:0 0 4px;color:#102a43;font-size:14px}
              .dp-ai-x-head__s{margin:0;font-size:12.5px;color:rgba(16,42,67,.78)}
              .tox .tox-textarea{min-height:260px !important;border-radius:10px !important;}
            </style>

            <div class="dp-ai-x-head">
              <p class="dp-ai-x-head__t">Image generation</p>
              <p class="dp-ai-x-head__s">Describe the image and choose an output size.</p>
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
          type: 'textarea',
          name: 'prompt',
          label: 'Prompt',
          placeholder: 'Describe the image you want to generate…',
        },

        {
          type: 'selectbox',
          name: 'size',
          label: 'Size',
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
        await moodleAlert(title, 'Please enter an image description.');
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
