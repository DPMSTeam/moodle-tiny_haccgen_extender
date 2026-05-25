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
 * Shared file dropzone controller for image-based tools.
 *
 * @module tiny_haccgen_extender/steps/fileDropzoneController
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';

const MAX_DEBUG_EVENTS = 300;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|jfif|tiff?|ico|heic|heif|avif)$/i;
const describeFile = (file) => ({
  hasFile: !!file,
  name: file ? String(file.name || '') : '',
  type: file ? String(file.type || '') : '',
  size: file ? Number(file.size || 0) : 0,
  lastModified: file ? Number(file.lastModified || 0) : 0,
});

const pushUiDebugEvent = (scope, event, payload = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    scope: `dropzone:${scope || 'unknown'}`,
    event,
    payload,
  };
  try {
    const root = window;
    root.__haccgenExtenderDebugEvents = Array.isArray(root.__haccgenExtenderDebugEvents)
      ? root.__haccgenExtenderDebugEvents
      : [];
    root.__haccgenExtenderDebugEvents.push(entry);
    if (root.__haccgenExtenderDebugEvents.length > MAX_DEBUG_EVENTS) {
      root.__haccgenExtenderDebugEvents.splice(0, root.__haccgenExtenderDebugEvents.length - MAX_DEBUG_EVENTS);
    }
  } catch (e) {
    // Never allow debug telemetry failures to break UX.
  }
};

export class FileDropzoneController {
  constructor({
    root,
    title,
    errInvalidImageFile,
    errDropImageFile,
    errUploadImageFirst,
    logPrefix,
    onFileChanged,
  }) {
    this.root = root;
    this.title = title;
    this.errInvalidImageFile = errInvalidImageFile;
    this.errDropImageFile = errDropImageFile;
    this.errUploadImageFirst = errUploadImageFirst;
    this.logPrefix = logPrefix;
    this.onFileChanged = onFileChanged;

    this.selectedFile = null;
    this.drop = null;
    this.dropzoneWrap = null;
    this.chooseBtn = null;
    this.fileInput = null;
    this.fileRow = null;
    this.fileName = null;
    this.btnChange = null;
    this.btnClear = null;
    this.dialogEl = null;
    this.defaultDropNodes = [];
  }

  getSelectedFile() {
    return this.selectedFile;
  }

  isImage(file) {
    if (!file) {
      this.log('isImage => false (missing file)');
      return false;
    }
    const type = typeof file.type === 'string' ? file.type : '';
    const hasImageMime = type.startsWith('image/');
    const name = typeof file.name === 'string' ? file.name : '';
    const hasImageExt = IMAGE_EXT_RE.test(name);

    if (hasImageMime) {
      this.log('isImage => true (mime)', { type, name });
      return true;
    }
    if (hasImageExt) {
      this.log('isImage => true (extension fallback)', { type, name });
      return true;
    }

    this.log('isImage => false (rejected)', { type, name });
    return false;
  }

  log(msg, extra) {
    const prefix = `[tiny_haccgen_extender:${this.logPrefix}] ${msg}`;
    if (extra !== undefined) {
      Log.debug(prefix, extra);
    } else {
      Log.debug(prefix);
    }
  }

  uiDebug(event, payload = {}) {
    pushUiDebugEvent(this.logPrefix, event, payload);
  }

  async safeAlert(message, reason = 'unknown') {
    this.log('safeAlert:attempt', { reason, message });
    this.uiDebug('safe_alert_attempt', { reason, message: String(message || '') });
    try {
      await moodleAlert(this.title, message);
      this.log('safeAlert:shown', { reason });
    } catch (error) {
      const errMessage = error && error.message ? error.message : String(error);
      this.log('safeAlert:context_failed', { reason, errMessage });
      this.uiDebug('safe_alert_context_failed', { reason, errMessage });
      if (typeof window.alert === 'function') {
        window.alert(`${this.title}\n\n${message}`);
      }
    }
  }

  notifyChanged() {
    if (typeof this.onFileChanged === 'function') {
      this.onFileChanged(this.selectedFile);
    }
  }

  renderDropDefault() {
    const clones = this.defaultDropNodes.map((node) => node.cloneNode(true));
    this.drop.replaceChildren(...clones);
    this.drop.classList.remove('dp-ai-drop--filled');
  }

  setFile(file, previewDataUrl = '') {
    this.selectedFile = file || null;
    this.log('setFile', {
      ...describeFile(this.selectedFile),
      hasPreview: !!previewDataUrl,
      previewLen: previewDataUrl ? previewDataUrl.length : 0,
    });
    this.uiDebug('set_file', { ...describeFile(this.selectedFile), hasPreview: !!previewDataUrl });
    this.notifyChanged();

    if (!this.selectedFile) {
      if (this.fileRow) {
        this.fileRow.classList.add('dp-ai-hidden');
      }
      if (this.fileName) {
        this.fileName.textContent = '';
      }
      this.renderDropDefault();
      return;
    }

    if (this.fileName) {
      this.fileName.textContent = this.selectedFile.name;
    }
    if (this.fileRow) {
      this.fileRow.classList.remove('dp-ai-hidden');
    }

    const previewRoot = document.createElement('div');
    previewRoot.className = 'dp-ai-drop-preview';

    const nameEl = document.createElement('div');
    nameEl.className = 'dp-ai-drop-preview__name';
    nameEl.textContent = this.selectedFile.name;
    previewRoot.appendChild(nameEl);

    if (previewDataUrl) {
      const imageWrap = document.createElement('div');
      imageWrap.className = 'dp-ai-drop-preview__image-wrap';
      const image = document.createElement('img');
      image.src = previewDataUrl;
      image.alt = this.selectedFile.name;
      imageWrap.appendChild(image);
      previewRoot.appendChild(imageWrap);
    }

    this.drop.replaceChildren(previewRoot);
    this.drop.classList.add('dp-ai-drop--filled');
  }

  async handleFile(file, invalidMessage = this.errDropImageFile) {
    this.log('handleFile:start', { ...describeFile(file), invalidMessage });
    this.uiDebug('handle_file_start', { ...describeFile(file), invalidMessage });

    if (!file || !this.isImage(file)) {
      this.log('handleFile:rejected', { ...describeFile(file), invalidMessage });
      this.uiDebug('handle_file_rejected', {
        reason: !file ? 'missing_file' : 'not_image',
        invalidMessage,
      });
      await this.safeAlert(invalidMessage, 'handle_file_rejected');
      return;
    }

    this.log('handleFile:accepted', describeFile(file));
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      this.log('fileReader:onload', { ...describeFile(file), dataUrlLen: result.length });
      this.uiDebug('file_reader_loaded', {
        name: String(file.name || ''),
        dataUrlLen: result.length,
      });
      this.setFile(file, result);
    };
    reader.onerror = () => {
      this.log('fileReader:onerror', describeFile(file));
      this.uiDebug('file_reader_error', {
        name: String(file.name || ''),
      });
      this.setFile(file);
    };
    reader.readAsDataURL(file);
  }

  describeResolvedElements() {
    return {
      rootTag: this.root ? String(this.root.tagName || '').toLowerCase() : '',
      rootId: this.root ? String(this.root.id || '') : '',
      drop: !!this.drop,
      dropzoneWrap: !!this.dropzoneWrap,
      chooseBtn: !!this.chooseBtn,
      fileInput: !!this.fileInput,
      fileRow: !!this.fileRow,
      fileName: !!this.fileName,
      btnChange: !!this.btnChange,
      btnClear: !!this.btnClear,
    };
  }

  resolveElements() {
    const pick = (container, selector) => {
      if (!container) {
        return null;
      }
      if (typeof container.matches === 'function' && container.matches(selector)) {
        return container;
      }
      if (typeof container.querySelector === 'function') {
        return container.querySelector(selector);
      }
      return null;
    };

    const scope = this.root && typeof this.root.querySelector === 'function' ? this.root : document;
    this.dropzoneWrap = pick(scope, '[data-role="ai-dropzone-wrap"], #dp-ai-img-wrap');
    const searchRoot = this.dropzoneWrap || scope;

    this.drop = pick(searchRoot, '[data-role="ai-drop"], #dp-ai-drop');
    this.chooseBtn = pick(searchRoot, '[data-role="ai-choose"], #dp-ai-choose');
    this.fileInput = pick(searchRoot, '[data-role="ai-file"], #dp-ai-file');
    this.fileRow = pick(searchRoot, '[data-role="ai-file-row"], #dp-ai-file-row');
    this.fileName = pick(searchRoot, '[data-role="ai-file-name"], #dp-ai-file-name');
    this.btnChange = pick(searchRoot, '[data-role="ai-change"], #dp-ai-change');
    this.btnClear = pick(searchRoot, '[data-role="ai-clear"], #dp-ai-clear');
    this.dialogEl = (this.root && this.root.closest && this.root.closest('.tox-dialog'))
      || (this.dropzoneWrap && this.dropzoneWrap.closest && this.dropzoneWrap.closest('.tox-dialog'))
      || this.root;

    // Core UX only needs drop area + hidden file input. Other controls are optional.
    return !!(this.drop && this.fileInput);
  }

  bind() {
    this.log('bind:start');
    if (!this.resolveElements()) {
      const snapshot = this.describeResolvedElements();
      this.log('bind:failed_missing_elements', snapshot);
      this.uiDebug('bind_failed_missing_elements', snapshot);
      return false;
    }
    this.log('bind:elements_resolved', this.describeResolvedElements());
    this.uiDebug('bind_success', this.describeResolvedElements());

    this.defaultDropNodes = Array.from(this.drop.childNodes).map((node) => node.cloneNode(true));
    this.drop.tabIndex = 0;
    this.drop.setAttribute('role', 'button');
    this.drop.setAttribute('aria-label', this.title);
    this.drop.focus();

    const pickFile = (source = 'unknown') => {
      this.log('pickFile:trigger', {
        source,
        hasInput: !!this.fileInput,
        inputId: this.fileInput ? String(this.fileInput.id || '') : '',
        inputAccept: this.fileInput ? String(this.fileInput.getAttribute('accept') || '') : '',
        inputHidden: this.fileInput ? this.fileInput.hidden : null,
      });
      this.uiDebug('pick_file_triggered', {
        source,
        hasInput: !!this.fileInput,
        inputAccept: this.fileInput ? String(this.fileInput.getAttribute('accept') || '') : '',
      });
      if (!this.fileInput) {
        this.log('pickFile:aborted_no_input', { source });
        return;
      }
      this.fileInput.value = '';
      try {
        this.fileInput.click();
        this.log('pickFile:input_click_called', { source });
      } catch (error) {
        const errMessage = error && error.message ? error.message : String(error);
        this.log('pickFile:input_click_failed', { source, errMessage });
        this.uiDebug('pick_file_click_failed', { source, errMessage });
      }
    };

    this.drop.addEventListener('click', (e) => {
      const target = e.target;
      const actionSelector = [
        '[data-role="ai-choose"]',
        '[data-role="ai-change"]',
        '[data-role="ai-clear"]',
        '#dp-ai-choose',
        '#dp-ai-change',
        '#dp-ai-clear',
      ].join(', ');
      const action = target && typeof target.closest === 'function'
        ? target.closest(actionSelector)
        : null;
      if (action) {
        this.log('drop:click ignored due to action button');
        return;
      }
      this.log('drop:click opening file picker');
      pickFile('drop_area_click');
    });

    this.drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.log('drop:keydown opening file picker', { key: e.key });
        pickFile('drop_area_keydown');
      }
    });

    const onChooseFileClick = (e, source) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.target && typeof e.target.closest === 'function'
        ? e.target.closest('[data-role="ai-choose"], #dp-ai-choose')
        : null;
      this.log('chooseFile:click', {
        source,
        buttonId: btn ? String(btn.id || '') : '',
        buttonText: btn ? String(btn.textContent || '').trim() : '',
        buttonDisabled: btn ? !!btn.disabled : null,
        eventType: e.type,
        isTrusted: e.isTrusted,
      });
      this.uiDebug('choose_file_click', { source });
      pickFile(source);
    };

    if (this.chooseBtn) {
      this.chooseBtn.addEventListener('click', (e) => onChooseFileClick(e, 'choose_file_button'));
    } else {
      this.log('bind:chooseBtn_missing_using_delegate_only');
    }

    // Capture-phase delegate: still logs/clicks even if direct button binding failed.
    if (this.dialogEl) {
      if (this.dialogEl.__dpAiChooseDelegate) {
        this.dialogEl.removeEventListener('click', this.dialogEl.__dpAiChooseDelegate, true);
      }
      this.dialogEl.__dpAiChooseDelegate = (e) => {
        const btn = e.target && typeof e.target.closest === 'function'
          ? e.target.closest('[data-role="ai-choose"], #dp-ai-choose')
          : null;
        if (!btn || !this.dropzoneWrap || !this.dropzoneWrap.contains(btn)) {
          return;
        }
        this.log('chooseFile:delegate_capture', {
          buttonId: String(btn.id || ''),
          buttonText: String(btn.textContent || '').trim(),
        });
        onChooseFileClick(e, 'choose_file_delegate');
      };
      this.dialogEl.addEventListener('click', this.dialogEl.__dpAiChooseDelegate, true);
      this.log('bind:choose_delegate_attached', {
        dialogId: String(this.dialogEl.id || ''),
      });
    }

    this.fileInput.addEventListener('change', async () => {
      const file = this.fileInput.files && this.fileInput.files[0] ? this.fileInput.files[0] : null;
      this.log('fileInput:change', {
        ...describeFile(file),
        filesLen: this.fileInput.files ? this.fileInput.files.length : 0,
        accept: String(this.fileInput.getAttribute('accept') || ''),
      });
      this.uiDebug('input_change', {
        hasFile: !!file,
        name: file ? String(file.name || '') : '',
        type: file ? String(file.type || '') : '',
      });
      if (file && !this.isImage(file)) {
        this.log('fileInput:rejected_non_image', describeFile(file));
        await this.safeAlert(this.errInvalidImageFile, 'input_non_image');
        this.fileInput.value = '';
        this.setFile(null);
        return;
      }
      if (!file) {
        this.log('fileInput:empty_selection');
        this.setFile(null);
        return;
      }
      this.log('fileInput:accepted_for_handleFile', describeFile(file));
      await this.handleFile(file, this.errInvalidImageFile);
    });

    if (this.btnChange) {
      this.btnChange.addEventListener('click', (e) => {
        e.preventDefault();
        this.log('btnChange:click');
        pickFile('change_file_button');
      });
    }

    if (this.btnClear) {
      this.btnClear.addEventListener('click', (e) => {
        e.preventDefault();
        this.log('btnClear:click');
        this.fileInput.value = '';
        this.setFile(null);
      });
    }

    const stopDragEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const enterOrOverHandler = (e) => {
      stopDragEvent(e);
      this.log(`${e.type}:capture`, { hasDataTransfer: !!e.dataTransfer });
      this.drop.classList.add('is-over');
    };

    const dragTargets = [this.drop];
    if (this.dropzoneWrap && this.dropzoneWrap !== this.drop) {
      dragTargets.push(this.dropzoneWrap);
    }
    dragTargets.forEach((target) => {
      target.addEventListener('dragenter', enterOrOverHandler, true);
      target.addEventListener('dragover', enterOrOverHandler, true);
    });

    const leaveHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.log(`${e.type}:capture_leave`, { hasDataTransfer: !!e.dataTransfer });
      this.drop.classList.remove('is-over');
    };

    dragTargets.forEach((target) => {
      target.addEventListener('dragleave', leaveHandler, true);
    });

    const handleDropEvent = async (e, source) => {
      stopDragEvent(e);
      this.drop.classList.remove('is-over');

      const dt = e.dataTransfer;
      this.log(`${source}:drop_received`, {
        hasDataTransfer: !!dt,
        filesLen: dt && dt.files ? dt.files.length : 0,
        itemsLen: dt && dt.items ? dt.items.length : 0,
      });
      this.uiDebug('drop_received', {
        hasDataTransfer: !!dt,
        filesLen: dt && dt.files ? dt.files.length : 0,
        itemsLen: dt && dt.items ? dt.items.length : 0,
      });
      let file = null;
      if (dt && dt.files && dt.files.length) {
        file = dt.files[0];
      } else if (dt && dt.items && dt.items.length) {
        const item = Array.from(dt.items).find((x) => x.kind === 'file');
        file = item ? item.getAsFile() : null;
      }
      this.log(`${source}:drop_file_candidate`, describeFile(file));
      this.uiDebug('drop_file_candidate', {
        hasFile: !!file,
        name: file ? String(file.name || '') : '',
        type: file ? String(file.type || '') : '',
        size: file ? Number(file.size || 0) : 0,
      });
      await this.handleFile(file, this.errDropImageFile);
    };

    this.drop.addEventListener('drop', async (e) => {
      await handleDropEvent(e, 'drop_target');
    }, true);
    if (this.dropzoneWrap && this.dropzoneWrap !== this.drop) {
      this.dropzoneWrap.addEventListener('drop', async (e) => {
        await handleDropEvent(e, 'dropzone_wrap');
      }, true);
    }

    const pasteHandler = async (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      const files = clipboardData && clipboardData.files ? Array.from(clipboardData.files) : [];
      const file = files.find((f) => this.isImage(f));
      this.log('paste:received', {
        filesLen: files.length,
        candidate: describeFile(file),
      });
      this.uiDebug('paste_received', {
        filesLen: files.length,
        hasImage: !!file,
        name: file ? String(file.name || '') : '',
        type: file ? String(file.type || '') : '',
      });
      if (!file) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      await this.handleFile(file, this.errDropImageFile);
    };

    if (this.dialogEl) {
      if (this.dialogEl.__dpAiPasteHandler) {
        this.dialogEl.removeEventListener('paste', this.dialogEl.__dpAiPasteHandler);
      }
      this.dialogEl.__dpAiPasteHandler = pasteHandler;
      this.dialogEl.addEventListener('paste', pasteHandler);
    }

    return true;
  }
}
