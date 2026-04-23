import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';
import { makeRequest } from '../repository';
import { component } from '../common';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';

const readFileAsDataUrl = (file, readFileErrorMessage) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error(readFileErrorMessage));
    r.readAsDataURL(file);
  });

const dataUrlToBase64 = (dataUrl) => {
  const idx = dataUrl.indexOf(',');
  if (idx === -1) {
    return '';
  }
  return dataUrl.slice(idx + 1);
};

/**
 * Build modal config for text recognition (OCR).
 *
 * @param {Object} root0
 * @param {Object} root0.editor TinyMCE editor instance.
 * @param {string} root0.selectionText Selected text (for Replace selection in result dialog).
 * @param {Function} root0.goBack Back handler.
 * @returns {Promise<Object>} TinyMCE windowManager config.
 */
export const buildTextRecognitionTemplateConfig = async ({ editor, selectionText, goBack }) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);
  const btnBack = await getString('btn_back', component);
  const textRecognitionTitle = await getString('purpose_text_recognition_label', component);
  const textRecognitionDropAria = await getString('text_recognition_drop_aria', component);
  const textRecognitionDropHint = await getString('text_recognition_drop_hint', component);
  const textRecognitionDropSub = await getString('text_recognition_drop_sub', component);
  const textRecognitionBtnChange = await getString('btn_change', component);
  const textRecognitionBtnClear = await getString('btn_clear', component);
  const placeholderTextRecognitionPrompt = await getString('placeholder_text_recognition_prompt', component);
  const textRecognitionDefaultPrompt = await getString('text_recognition_default_prompt', component);
  const errInvalidImageFile = await getString('err_invalid_image_file', component);
  const errDropImageFile = await getString('err_drop_image_file', component);
  const errUploadImageFirst = await getString('err_upload_image_first', component);
  const errPromptRequiredOrKeep = await getString('err_prompt_required_or_keep', component);
  const errFailedReadImageData = await getString('err_failed_read_image_data', component);
  const errFailedReadFile = await getString('err_failed_read_file', component);

  // Keep file in closure. (Not in dialog data; TinyMCE data is JSON.)
  let selectedFile = null;

  const logFile = (label, f) => {
    if (!f) {
      Log.debug(`[tiny_haccgen_extender:text_recognition] ${label}: <null>`);
      return;
    }
    Log.debug('[tiny_haccgen_extender:text_recognition] ' + label + ' name=' + (f.name || '') + ' type=' + (f.type || ''));
  };

  return {
    title: `${title}: ${textRecognitionTitle}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'imgDrop',
          html: `
            <style>
              .dp-ai-img-wrap{
                display:flex;
                flex-direction:column;
                gap:10px;
                margin-top: 2px;
              }

              .dp-ai-drop{
                border: 2px dashed rgba(15,108,191,.28);
                background: rgba(15,108,191,.045);
                border-radius: 12px;
                padding: 22px 16px;
                min-height: 140px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                text-align:center;
                color: rgba(16,42,67,.78);
                user-select:none;
                cursor:pointer;
              }

              .dp-ai-drop.is-over{
                border-color: rgba(15,108,191,.60);
                background: rgba(15,108,191,.085);
              }

              .dp-ai-drop__hint{
                font-size: 13px;
                margin: 0;
                font-weight: 650;
                color: rgba(16,42,67,.85);
              }

              .dp-ai-drop__sub{
                font-size: 12px;
                margin: 6px 0 0 0;
                color: rgba(16,42,67,.65);
              }

              .dp-ai-choose{
                margin-top: 12px;
                appearance:none;
                border: 1px solid rgba(16,42,67,.14);
                background: #fff;
                border-radius: 10px;
                padding: 8px 12px;
                cursor:pointer;
                font-size: 12.5px;
              }
              .dp-ai-choose:hover{ border-color: rgba(15,108,191,.35); }

              .dp-ai-file-row{
                display:flex;
                gap:10px;
                align-items:center;
                justify-content:space-between;
                padding: 9px 10px;
                border: 1px solid rgba(16,42,67,.10);
                border-radius: 10px;
                background: #fff;
              }

              .dp-ai-file-name{
                font-size: 12.5px;
                color: #102a43;
                overflow:hidden;
                white-space:nowrap;
                text-overflow:ellipsis;
                max-width: 420px;
              }

              .dp-ai-btn{
                appearance:none;
                border: 1px solid rgba(16,42,67,.14);
                background: #fff;
                border-radius: 10px;
                padding: 7px 10px;
                cursor:pointer;
                font-size: 12.5px;
              }
              .dp-ai-btn:hover{ border-color: rgba(15,108,191,.35); }
              .dp-ai-hidden{ display:none !important; }
            </style>

            <div class="dp-ai-img-wrap" id="dp-ai-img-wrap">
              <div class="dp-ai-drop" id="dp-ai-drop" role="button" tabindex="0" aria-label="${textRecognitionDropAria}">
                <p class="dp-ai-drop__hint">${textRecognitionDropHint}</p>
                <p class="dp-ai-drop__sub">${textRecognitionDropSub}</p>
                
                <input class="dp-ai-file-input" id="dp-ai-file" type="file" accept="image/*" />
              </div>

              <div class="dp-ai-file-row dp-ai-hidden" id="dp-ai-file-row">
                <div class="dp-ai-file-name" id="dp-ai-file-name"></div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button type="button" class="dp-ai-btn" id="dp-ai-change">${textRecognitionBtnChange}</button>
                  <button type="button" class="dp-ai-btn" id="dp-ai-clear">${textRecognitionBtnClear}</button>
                </div>
              </div>
            </div>
          `,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
            {
              type: 'htmlpanel',
              html: '<span style="margin-left:10px;font-size:12.5px;color:#5a6b7b;"></span>',
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: '',
          placeholder: placeholderTextRecognitionPrompt,
        },
      ],
    },

    initialData: {
      prompt: textRecognitionDefaultPrompt,
    },

    buttons: [
      { type: 'cancel', text: btnCancel },
      { type: 'submit', text: btnRun, primary: true },
    ],

    onAction: (api, details) => {
      Log.debug('[tiny_haccgen_extender:text_recognition] onAction ' + (details?.name || ''));

      if (details.name === 'back') {
        goBack(api);
      }
    },

    onOpen: (api) => {
      Log.debug('[tiny_haccgen_extender:text_recognition] onOpen fired');

      let root = api.getEl ? api.getEl() : null;
      Log.debug('[tiny_haccgen_extender:text_recognition] api.getEl() hasRoot=' + !!root);

      if (!root || !root.querySelector('#dp-ai-drop')) {
        Log.debug('[tiny_haccgen_extender:text_recognition] root missing drop; falling back to document');
        root = document;
      }

      const drop = root.querySelector('#dp-ai-drop');
      const chooseBtn = root.querySelector('#dp-ai-choose');
      const fileInput = root.querySelector('#dp-ai-file');
      const fileRow = root.querySelector('#dp-ai-file-row');
      const fileName = root.querySelector('#dp-ai-file-name');
      const btnChange = root.querySelector('#dp-ai-change');
      const btnClear = root.querySelector('#dp-ai-clear');

      Log.debug('[tiny_haccgen_extender:text_recognition] elements found drop=' + !!drop +
        ' fileInput=' + !!fileInput + ' fileRow=' + !!fileRow);

      if (!drop || !chooseBtn || !fileInput || !fileRow || !fileName || !btnChange || !btnClear) {
        Log.error('[tiny_haccgen_extender:text_recognition] missing required elements; aborting bindings');
        return;
      }

      const isImage = (f) => !!(f && typeof f.type === 'string' && f.type.startsWith('image/'));

      const setFile = (f) => {
        selectedFile = f || null;
        logFile('setFile selectedFile', selectedFile);

        if (!selectedFile) {
          fileRow.classList.add('dp-ai-hidden');
          fileName.textContent = '';
          return;
        }
        fileName.textContent = selectedFile.name;
        fileRow.classList.remove('dp-ai-hidden');
      };

      const pickFile = () => {
        Log.debug('[tiny_haccgen_extender:text_recognition] pickFile()');
        fileInput.value = '';
        fileInput.click();
      };

      drop.addEventListener('click', (e) => {
        const t = e.target;
        Log.debug('[tiny_haccgen_extender:text_recognition] drop click targetId=' + (t?.id || ''));

        if (t && (t.id === 'dp-ai-choose' || t.id === 'dp-ai-change' || t.id === 'dp-ai-clear')) {
          return;
        }
        pickFile();
      });

      drop.addEventListener('keydown', (e) => {
        Log.debug('[tiny_haccgen_extender:text_recognition] drop keydown key=' + (e.key || ''));

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pickFile();
        }
      });

      chooseBtn.addEventListener('click', (e) => {
        Log.debug('[tiny_haccgen_extender:text_recognition] chooseBtn click');
        e.preventDefault();
        pickFile();
      });

      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        logFile('fileInput change file', f);

        if (f && !isImage(f)) {
          moodleAlert(title, errInvalidImageFile);
          fileInput.value = '';
          setFile(null);
          return;
        }
        if (f) {
          setFile(f);
        } else {
          setFile(null);
        }
      });

      btnChange.addEventListener('click', (e) => {
        Log.debug('[tiny_haccgen_extender:text_recognition] btnChange click');
        e.preventDefault();
        pickFile();
      });

      btnClear.addEventListener('click', (e) => {
        Log.debug('[tiny_haccgen_extender:text_recognition] btnClear click');
        e.preventDefault();
        fileInput.value = '';
        setFile(null);
      });

      drop.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.classList.add('is-over');
      });

      drop.addEventListener('dragleave', () => {
        drop.classList.remove('is-over');
      });

      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('is-over');

        const f =
          e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
            ? e.dataTransfer.files[0]
            : null;

        logFile('drop event file', f);

        if (!f || !isImage(f)) {
          moodleAlert(title, errDropImageFile);
          return;
        }

        setFile(f);
      });
    },

    onSubmit: async (api) => {
      Log.debug('[tiny_haccgen_extender:text_recognition] onSubmit fired');

      const data = api.getData();
      const prompt = (data.prompt || '').trim();

      Log.debug('[tiny_haccgen_extender:text_recognition] submit data promptLen=' + prompt.length + ' hasFile=' + !!selectedFile);
      logFile('selectedFile at submit', selectedFile);

      let fileToUse = selectedFile;

      if (!fileToUse) {
        Log.debug('[tiny_haccgen_extender:text_recognition] selectedFile null, trying to locate in DOM');

        const isImage = (f) => !!(f && typeof f.type === 'string' && f.type.startsWith('image/'));

        const getFileFromInput = (input) => {
          const file = input && input.files && input.files[0] ? input.files[0] : null;
          logFile('getFileFromInput candidate', file);
          return file && isImage(file) ? file : null;
        };

        const findFileInContainer = (container, label) => {
          if (!container || typeof container.querySelector !== 'function') {
            Log.debug('[tiny_haccgen_extender:text_recognition] findFileInContainer no container label=' + (label || ''));
            return null;
          }
          const input = container.querySelector('#dp-ai-file');
          const found = input ? getFileFromInput(input) : null;

          Log.debug('[tiny_haccgen_extender:text_recognition] findFileInContainer label=' + (label || '') +
            ' hasInput=' + !!input + ' hasFound=' + !!found);
          logFile(`findFileInContainer found (${label})`, found);

          return found;
        };

        const root = api.getEl ? api.getEl() : null;
        Log.debug('[tiny_haccgen_extender:text_recognition] submit api.getEl() hasRoot=' + !!root);

        fileToUse = (root && findFileInContainer(root, 'apiRoot')) || null;

        if (!fileToUse && root) {
          const iframe = root.querySelector && root.querySelector('iframe');
          Log.debug('[tiny_haccgen_extender:text_recognition] checking iframe hasIframe=' + !!iframe +
            ' hasDoc=' + !!(iframe && iframe.contentDocument));
          if (iframe && iframe.contentDocument) {
            fileToUse = findFileInContainer(iframe.contentDocument, 'iframeDoc');
          }
        }

        if (!fileToUse && typeof document.querySelector === 'function') {
          fileToUse = findFileInContainer(document, 'document');
        }

        logFile('fileToUse after DOM search', fileToUse);
      }

      if (!fileToUse) {
        Log.error('[tiny_haccgen_extender:text_recognition] no file found; showing alert');
        await moodleAlert(title, errUploadImageFirst);
        return;
      }

      if (!prompt) {
        Log.error('[tiny_haccgen_extender:text_recognition] empty prompt; showing alert');
        await moodleAlert(title, errPromptRequiredOrKeep);
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        Log.debug('[tiny_haccgen_extender:text_recognition] reading file as data URL');
        const dataUrl = await readFileAsDataUrl(fileToUse, errFailedReadFile);
        Log.debug('[tiny_haccgen_extender:text_recognition] dataUrl length len=' + (dataUrl.length || 0));

        const b64 = dataUrlToBase64(dataUrl);
        Log.debug('[tiny_haccgen_extender:text_recognition] base64 length len=' + (b64.length || 0));

        if (!b64) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          Log.error('[tiny_haccgen_extender:text_recognition] failed to extract base64');
          await moodleAlert(title, errFailedReadImageData);
          return;
        }

        const optionsjson = JSON.stringify(
          {
            image: {
              filename: fileToUse.name,
              mimetype: fileToUse.type,
              content_base64: b64,
            },
          },
          null,
          2
        );

        Log.debug('[tiny_haccgen_extender:text_recognition] makeRequest payload promptLen=' + prompt.length +
          ' filename=' + (fileToUse.name || ''));

        const resp = await makeRequest('text_recognition', prompt, optionsjson);

        Log.debug('[tiny_haccgen_extender:text_recognition] makeRequest response code=' + (resp?.code ?? '') +
          ' resultType=' + typeof resp?.result);

        if (resp.code !== 200) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          const msg = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result || {});
          Log.error('[tiny_haccgen_extender:text_recognition] non-200 response code=' + resp.code +
            ' msg=' + (typeof msg === 'string' ? msg.slice(0, 100) : ''));
          await moodleAlert(title, msg);
          return;
        }

        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        api.close();

        Log.debug('[tiny_haccgen_extender:text_recognition] opening result dialog');
        await openResultDialog(editor, resp.result, {
          hasSelection: Boolean(selectionText?.trim()),
          purpose: 'text_recognition',
        });
      } catch (e) {
        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        Log.error('[tiny_haccgen_extender:text_recognition] exception message=' + (e?.message || String(e)));
        await moodleAlert(title, e?.message || String(e));
      }
    },
  };
};
