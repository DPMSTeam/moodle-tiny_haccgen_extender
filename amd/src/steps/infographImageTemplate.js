// steps/infographImageGenerationTemplate.js
import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
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
  const generatingMsg = await getString('generating', component);

  // Your requested sizes
  const sizeItems = [
    { value: '1:1 (1024 x 1024)', text: '1:1 (1024 x 1024)' },
    { value: '4:3 (896 x 1280)', text: '4:3 (896 x 1280)' },
    { value: '4:3 (1280 x 896)', text: '4:3 (1280 x 896)' },
    { value: '9:16 (768 x 1408)', text: '9:16 (768 x 1408)' },
    { value: '16:9 (1408 x 768)', text: '16:9 (1408 x 768)' },
  ];

  return {
    title: `${title}: Infographic image generation`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'infographHead',
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
              .tox .tox-textarea{ min-height: 300px !important; font-size: 12.5px !important; line-height: 1.45 !important; }
            </style>

            <div class="dp-ai-x-head">
              <p class="dp-ai-x-head__t">Create an infographic image</p>
              <p class="dp-ai-x-head__s">Describe the infographic content
               (title, sections, stats, style). Choose size, then generate.</p>
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
          name: 'size',
          label: 'Size',
          items: sizeItems,
        },

        // optional: “density” like your defs already mention
        {
          type: 'selectbox',
          name: 'density',
          label: 'Density',
          items: [
            { value: 'medium', text: 'Medium' },
            { value: 'high', text: 'High' },
          ],
        },
        {
            type: 'textarea',
            name: 'prompt',
            label: 'Prompt',
            placeholder:
              'Example: Create a clean infographic titled "Agile Project Overview" with 4 sections: ' +
              'Principles, Roles, Events, Artifacts. Use blue/white theme.',
          },
      ],
    },

    initialData: {
      size: '1:1 (1024 x 1024)',
      density: 'medium',
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
        await moodleAlert(title, 'Please enter a prompt for the infographic image.');
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        const optionsjson = JSON.stringify(
          {
            size: data.size,
            density: data.density,
            // keep these stable so backend can route correctly
            style: 'infographic',
          },
          null,
          2
        );

        const resp = await makeRequest('infograph_image_generation', inputText, optionsjson);

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
