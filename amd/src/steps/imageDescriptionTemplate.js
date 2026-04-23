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
 * Image-description dialog config.
 *
 * @module tiny_haccgen_extender/steps/imageDescriptionTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';
import Templates from 'core/templates';
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
 * Build modal config for image description.
 *
 * @param {Object} root0
 * @param {Object} root0.editor TinyMCE editor instance.
 * @param {string} root0.selectionText Selected text (for Replace selection in result dialog).
 * @param {Function} root0.goBack Back handler.
 * @returns {Promise<Object>} TinyMCE windowManager config.
 */
export const buildImageDescriptionTemplateConfig = async ({ editor, selectionText, goBack }) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const btnBack = await getString('btn_back', component);
  const btnChoose = await getString('btn_choose', component);
  const btnChange = await getString('btn_change', component);
  const btnClear = await getString('btn_clear', component);
  const generatingMsg = await getString('generating', component);
  const purposeImageDescriptionLabel = await getString('purpose_image_description_label', component);
  const textRecognitionDropAria = await getString('text_recognition_drop_aria', component);
  const textRecognitionDropHint = await getString('text_recognition_drop_hint', component);
  const textRecognitionDropSub = await getString('text_recognition_drop_sub', component);
  const placeholderImageDescriptionPrompt = await getString('placeholder_image_description_prompt', component);
  const errInvalidImageFile = await getString('err_invalid_image_file', component);
  const errDropImageFile = await getString('err_drop_image_file', component);
  const errUploadImageFirst = await getString('err_upload_image_first', component);
  const errPromptRequiredOrKeep = await getString('err_prompt_required_or_keep', component);
  const errFailedReadImageData = await getString('err_failed_read_image_data', component);
  const errFailedReadFile = await getString('err_failed_read_file', component);
  const fileDropRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/file-dropzone',
    {
      droparia: textRecognitionDropAria,
      drophint: textRecognitionDropHint,
      dropsub: textRecognitionDropSub,
      choosefile: btnChoose,
      changefile: btnChange,
      clearfile: btnClear,
      showchoosebutton: true,
    }
  );
  const toolbarNoteRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/toolbar-note',
    {}
  );
  [fileDropRender, toolbarNoteRender].forEach((item) => {
    if (item.js) {
      Templates.runTemplateJS(item.js);
    }
  });

  // Keep file in closure. (Not in dialog data; TinyMCE data is JSON.)
  let selectedFile = null;

  const logFile = (label, f) => {
    if (!f) {
      Log.debug(`[tiny_haccgen_extender:image_description] ${label}: <null>`);
      return;
    }
    Log.debug(`[tiny_haccgen_extender:image_description] ${label}`, {
      name: f.name,
      type: f.type,
      size: f.size,
      lastModified: f.lastModified,
    });
  };

  return {
    title: `${title}: ${purposeImageDescriptionLabel}`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'imgDrop',
          html: fileDropRender.html,
        },

        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' },
            {
              type: 'htmlpanel',
              html: toolbarNoteRender.html,
            },
          ],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: '',
          placeholder: placeholderImageDescriptionPrompt,
        },
      ],
    },

    // Do NOT copy selection text into prompt.
    initialData: {
      prompt: '',
    },

    buttons: [
      { type: 'cancel', text: btnCancel },
      { type: 'submit', text: btnRun, primary: true },
    ],

    onAction: (api, details) => {
      Log.debug('[tiny_haccgen_extender:image_description] onAction', details);

      if (details.name === 'back') {
        goBack(api);
      }
    },

    onOpen: (api) => {
      Log.debug('[tiny_haccgen_extender:image_description] onOpen fired');

      let root = api.getEl ? api.getEl() : null;
      Log.debug('[tiny_haccgen_extender:image_description] api.getEl()', { hasRoot: !!root });

      if (!root || !root.querySelector('#dp-ai-drop')) {
        Log.debug('[tiny_haccgen_extender:image_description] root missing drop; falling back to document');
        root = document;
      }

      const drop = root.querySelector('#dp-ai-drop');
      const chooseBtn = root.querySelector('#dp-ai-choose');
      const fileInput = root.querySelector('#dp-ai-file');
      const fileRow = root.querySelector('#dp-ai-file-row');
      const fileName = root.querySelector('#dp-ai-file-name');
      const btnChange = root.querySelector('#dp-ai-change');
      const btnClear = root.querySelector('#dp-ai-clear');

      Log.debug('[tiny_haccgen_extender:image_description] elements found', {
        drop: !!drop,
        chooseBtn: !!chooseBtn,
        fileInput: !!fileInput,
        fileRow: !!fileRow,
        fileName: !!fileName,
        btnChange: !!btnChange,
        btnClear: !!btnClear,
      });

      if (!drop || !chooseBtn || !fileInput || !fileRow || !fileName || !btnChange || !btnClear) {
        Log.error('[tiny_haccgen_extender:image_description] missing required elements; aborting bindings');
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
        Log.debug('[tiny_haccgen_extender:image_description] pickFile()');
        fileInput.value = '';
        fileInput.click();
      };

      drop.addEventListener('click', (e) => {
        const t = e.target;
        Log.debug('[tiny_haccgen_extender:image_description] drop click', { targetId: t?.id });

        if (t && (t.id === 'dp-ai-choose' || t.id === 'dp-ai-change' || t.id === 'dp-ai-clear')) {
          return;
        }
        pickFile();
      });

      drop.addEventListener('keydown', (e) => {
        Log.debug('[tiny_haccgen_extender:image_description] drop keydown', { key: e.key });

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pickFile();
        }
      });

      chooseBtn.addEventListener('click', (e) => {
        Log.debug('[tiny_haccgen_extender:image_description] chooseBtn click');
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
        Log.debug('[tiny_haccgen_extender:image_description] btnChange click');
        e.preventDefault();
        pickFile();
      });

      btnClear.addEventListener('click', (e) => {
        Log.debug('[tiny_haccgen_extender:image_description] btnClear click');
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
      Log.debug('[tiny_haccgen_extender:image_description] onSubmit fired');

      const data = api.getData();
      const prompt = (data.prompt || '').trim();

      Log.debug('[tiny_haccgen_extender:image_description] submit data', {
        promptLen: prompt.length,
        hasSelectedFileVar: !!selectedFile,
      });
      logFile('selectedFile at submit', selectedFile);

      let fileToUse = selectedFile;

      if (!fileToUse) {
        Log.debug('[tiny_haccgen_extender:image_description] selectedFile null, trying to locate in DOM');

        const isImage = (f) => !!(f && typeof f.type === 'string' && f.type.startsWith('image/'));

        const getFileFromInput = (input) => {
          const file = input && input.files && input.files[0] ? input.files[0] : null;
          logFile('getFileFromInput candidate', file);
          return file && isImage(file) ? file : null;
        };

        const findFileInContainer = (container, label) => {
          if (!container || typeof container.querySelector !== 'function') {
            Log.debug('[tiny_haccgen_extender:image_description] findFileInContainer no container', { label });
            return null;
          }
          const input = container.querySelector('#dp-ai-file');
          const found = input ? getFileFromInput(input) : null;

          Log.debug('[tiny_haccgen_extender:image_description] findFileInContainer', {
            label,
            hasInput: !!input,
            hasFound: !!found,
          });
          logFile(`findFileInContainer found (${label})`, found);

          return found;
        };

        const root = api.getEl ? api.getEl() : null;
        Log.debug('[tiny_haccgen_extender:image_description] submit api.getEl()', { hasRoot: !!root });

        fileToUse = (root && findFileInContainer(root, 'apiRoot')) || null;

        if (!fileToUse && root) {
          const iframe = root.querySelector && root.querySelector('iframe');
          Log.debug('[tiny_haccgen_extender:image_description] checking iframe', {
            hasIframe: !!iframe,
            hasDoc: !!iframe?.contentDocument,
          });
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
        Log.error('[tiny_haccgen_extender:image_description] no file found; showing alert');
        await moodleAlert(title, errUploadImageFirst);
        return;
      }

      if (!prompt) {
        Log.error('[tiny_haccgen_extender:image_description] empty prompt; showing alert');
        await moodleAlert(title, errPromptRequiredOrKeep);
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

      try {
        Log.debug('[tiny_haccgen_extender:image_description] reading file as data URL');
        const dataUrl = await readFileAsDataUrl(fileToUse, errFailedReadFile);
        Log.debug('[tiny_haccgen_extender:image_description] dataUrl length', { len: dataUrl.length });

        const b64 = dataUrlToBase64(dataUrl);
        Log.debug('[tiny_haccgen_extender:image_description] base64 length', { len: b64.length });

        if (!b64) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          Log.error('[tiny_haccgen_extender:image_description] failed to extract base64');
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

        Log.debug('[tiny_haccgen_extender:image_description] makeRequest payload', {
          purpose: 'image_description',
          promptLen: prompt.length,
          filename: fileToUse.name,
          mimetype: fileToUse.type,
          b64Len: b64.length,
          optionsLen: optionsjson.length,
        });

        const resp = await makeRequest('image_description', prompt, optionsjson);

        Log.debug('[tiny_haccgen_extender:image_description] makeRequest response', {
          code: resp?.code,
          resultType: typeof resp?.result,
          resultLen: typeof resp?.result === 'string' ? resp.result.length : null,
        });

        if (resp.code !== 200) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          const msg = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result || {});
          Log.error('[tiny_haccgen_extender:image_description] non-200 response', { code: resp.code, msg });
          await moodleAlert(title, msg);
          return;
        }

        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        api.close();

        Log.debug('[tiny_haccgen_extender:image_description] opening result dialog');
        await openResultDialog(editor, resp.result, {
          hasSelection: Boolean(selectionText?.trim()),
          purpose: 'image_description',
        });
      } catch (e) {
        removeLoadingOverlay();
        if (typeof api.unblock === 'function') {
          api.unblock();
        }
        Log.error('[tiny_haccgen_extender:image_description] exception', {
          message: e?.message,
          stack: e?.stack,
        });
        await moodleAlert(title, e?.message || String(e));
      }
    },
  };
};
