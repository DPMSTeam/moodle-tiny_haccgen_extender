import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';
import Templates from 'core/templates';
import { component } from '../../common';

import { escapeHtml, normalizeResult, ensureDataUrl, copyToClipboard, textToHtml, dataUrlToBlob } from './utils';
import { getAudioFromResult, getImageFromResult, getVideoFromResult } from './mediaExtractors';
import { maybeUploadDataUrlToDraft } from './mediaUpload';
import {
  moveSelectionToEnd,
  insertAudioHtml,
  replaceWithAudioHtml,
  insertImageHtml,
  replaceWithImageHtml,
  insertVideoHtml,
  replaceWithVideoHtml,
} from './editorInsert';

// Result area styling (passed to Mustache template)
const RESULT_WRAPPER_STYLE = `display:flex;padding:14px;flex-direction:column;
align-items:flex-start;gap:6px;align-self:stretch;border-radius:12px;
border:1px solid rgba(15,108,191,.12);background:#FFF;
box-shadow:0 2px 12px rgba(15,108,191,.06);`;
const RESULT_P_STYLE = 'margin:0;';
const RESULT_IMG_STYLE = [
  'width:100%;max-width:100%;max-height:50vh;height:auto;',
  'display:block;border-radius:8px;object-fit:contain;background:#000;',
].join('');
const RESULT_TEXT_EXTRA_STYLE = 'max-height:52vh;overflow:auto;';

export const openResultDialog = async (editor, resultText, opts = {}) => {
  Log.debug('[tiny_haccgen_extender:result_dialog] openResultDialog called hasSelection=' +
    Boolean(opts.hasSelection) + ' hasGoBack=' + (typeof opts.goBack === 'function'));

  const title = await getString('modal_title', component);
  const resultDialogTitle = await getString('result_dialog_title', component);
  const hasSelection = Boolean(opts.hasSelection);
  const goBack = opts.goBack;

  const normalized = normalizeResult(resultText);
  const purpose = String(opts.purpose || normalized.purpose || '');
  const outputText = typeof normalized.outputText === 'string'
    ? normalized.outputText
    : (normalized.outputText ? JSON.stringify(normalized.outputText) : '');
  Log.debug('[tiny_haccgen_extender:result_dialog] normalized purpose=' + purpose +
    ' outputTextLen=' + (outputText ? String(outputText).length : 0));

  const audioFound = getAudioFromResult(resultText);
  const imageFound = getImageFromResult(resultText);
  const videoFound = getVideoFromResult(resultText);

  const audioMime = (audioFound.mime || 'audio/mpeg').trim() || 'audio/mpeg';
  const imageMime = (imageFound.mime || 'image/png').trim() || 'image/png';

  const audioSrc = ensureDataUrl(audioFound.url, audioMime);
  const imageSrc = ensureDataUrl(imageFound.url, imageMime);

  const isAudio = purpose === 'create_audio' && Boolean(audioSrc);
  const isImage = purpose === 'image_generation' && Boolean(imageSrc);
  const isImageIntentNoImage = purpose === 'image_generation' && !imageSrc;
  const rawVideoUrl = String(videoFound.url || outputText || '').trim();
  const isVideoPurpose = purpose === 'videogen' || purpose === 'video_generation' || purpose === 'avatar_generation';
  const isVideo = isVideoPurpose && /^https?:\/\//i.test(rawVideoUrl);
  const videoUrl = isVideo ? rawVideoUrl : '';
  const normalizedVideoUrl = videoUrl.replace(/&amp;/gi, '&');

  Log.debug('[tiny_haccgen_extender:result_dialog] media flags isAudio=' + isAudio + ' isImage=' + isImage +
    ' isImageIntentNoImage=' + isImageIntentNoImage + ' isVideo=' + isVideo);

  let playableUrl = '';
  let uploadError = '';

  if (isAudio) {
    const up = await maybeUploadDataUrlToDraft(editor, audioSrc, audioMime, 'audio');
    playableUrl = up.playableUrl;
    uploadError = up.uploadError;
  } else if (isImage) {
    const up = await maybeUploadDataUrlToDraft(editor, imageSrc, imageMime, 'image');
    playableUrl = up.playableUrl;
    uploadError = up.uploadError;
  } else if (isVideo) {
    const up = await maybeUploadDataUrlToDraft(editor, normalizedVideoUrl, 'video/mp4', 'video', { requireLocal: true });
    playableUrl = up.playableUrl;
    uploadError = up.uploadError;
  }

  if (isAudio || isImage || isVideo) {
    Log.debug('[tiny_haccgen_extender:result_dialog] upload result playableUrl=' + !!playableUrl +
      ' uploadError=' + (uploadError ? uploadError : '(none)'));
  }

  const safeText = escapeHtml(outputText);
  const previewSrc = playableUrl || (isAudio ? audioSrc : isImage ? imageSrc : '');

  // Template context: pass type flags and primitive data so <audio>/<img>/<video> are in the template (not raw HTML).
  const cardContext = {
    wrapperStyle: RESULT_WRAPPER_STYLE,
    pStyle: RESULT_P_STYLE,
    imgStyle: RESULT_IMG_STYLE,
  };
  if (isAudio) {
    cardContext.isAudio = true;
    cardContext.wrapperClass = 'dp-ai-result-audio';
    if (previewSrc) {
      // Audio in iframe so it is not stripped by dialog; blob URL for minimal HTML with <audio>.
      const attrEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const innerHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
        '<body style="margin:0;padding:0;">' +
        '<audio controls preload="metadata" src="' + attrEsc(previewSrc) + '" type="' + attrEsc(audioMime || 'audio/mpeg') +
        '" style="width:100%;max-width:400px;"></audio></body></html>';
      cardContext.audioIframeSrc = URL.createObjectURL(new Blob([innerHtml], { type: 'text/html' }));
    }
  } else if (isImage) {
    cardContext.isImage = true;
    cardContext.imageSrc = previewSrc;
  } else if (isImageIntentNoImage) {
    cardContext.isImageIntentNoImage = true;
    cardContext.imageErrorPreview = outputText ? escapeHtml(String(outputText).slice(0, 500)) : '(empty)';
  } else if (isVideo) {
    cardContext.isVideo = Boolean(playableUrl);
    cardContext.videoUrl = playableUrl || '';
  } else {
    cardContext.isText = true;
    cardContext.textContent = safeText;
    cardContext.beautifiedContent = textToHtml(outputText);
    cardContext.wrapperExtraStyle = RESULT_TEXT_EXTRA_STYLE;
  }
  if (uploadError) {
    const errMsg = typeof uploadError === 'string'
      ? uploadError
      : (uploadError && typeof uploadError.message === 'string' ? uploadError.message : '');
    if (errMsg && errMsg !== '[object Object]') {
      cardContext.errorMessage = errMsg;
    }
  }

  const [cardResult, noteResult] = await Promise.all([
    Templates.renderForPromise('tiny_haccgen_extender/components/result-dialog-card', cardContext),
    Templates.renderForPromise('tiny_haccgen_extender/components/result-dialog-note', {}),
  ]);
  [cardResult, noteResult].forEach((item) => {
    if (item.js) {
      Templates.runTemplateJS(item.js);
    }
  });

  const bodyHtmlCard = cardResult.html;
  const bodyHtmlNote = noteResult.html;

  const isMediaResult = isAudio || isImage || isVideo;
  const canInsertMedia = isAudio || isImage || (isVideo && Boolean(playableUrl));
  const buttons = isMediaResult
    ? [
        { type: 'cancel', text: 'Close' },
        ...(canInsertMedia ? [{ type: 'custom', name: 'insertBelowMedia', text: 'Insert below' }] : []),
        ...(hasSelection && canInsertMedia
          ? [{ type: 'custom', name: 'replaceSelectionMedia', text: 'Replace selection', primary: true }]
          : []),
      ]
    : [
        { type: 'cancel', text: 'Close' },
        { type: 'custom', name: 'copy', text: 'Copy' },
        { type: 'custom', name: 'insertBelow', text: 'Insert below' },
        ...(hasSelection ? [{ type: 'submit', text: 'Replace selection', primary: true }] : []),
      ];

  Log.debug('[tiny_haccgen_extender:result_dialog] body mode media=' +
     isMediaResult + ' canInsertMedia=' + canInsertMedia + ' buttonCount=' + buttons.length);

  const cfg = {
    title: resultDialogTitle,
    size: 'large',
    body: {
      type: 'panel',
      items: [
        { type: 'htmlpanel', name: 'resultpretty', html: bodyHtmlCard },
        { type: 'htmlpanel', name: 'note', html: bodyHtmlNote },
      ],
    },
    buttons,
    onAction: async (api, details) => {
      Log.debug('[tiny_haccgen_extender:result_dialog] onAction name=' + (details?.name || ''));

      if (details.name === 'back' && typeof goBack === 'function') {
        goBack(api);
        return;
      }

      if (!isAudio && !isImage && !isVideo) {
        if (details.name === 'copy') {
          try {
            await copyToClipboard(outputText);
            Log.debug('[tiny_haccgen_extender:result_dialog] copy succeeded');
          } catch (e) {
            Log.debug('[tiny_haccgen_extender:result_dialog] copy failed ' + (e?.message || String(e)));
            moodleAlert(title, e?.message ? e.message : String(e));
          }
          return;
        }

        if (details.name === 'insertBelow') {
          try {
            editor.focus();
            moveSelectionToEnd(editor);
            editor.insertContent(textToHtml(outputText));
            Log.debug('[tiny_haccgen_extender:result_dialog] insertBelow succeeded');
            api.close();
          } catch (e) {
            Log.debug('[tiny_haccgen_extender:result_dialog] insertBelow failed ' + (e?.message || String(e)));
            moodleAlert(title, e?.message ? e.message : String(e));
          }
          return;
        }

        return;
      }

      // Prefer a local blob URL when possible so we do not embed expiring remote links.
      const mediaUrlForInsert = async (url) => {
        const value = String(url || '').trim();
        if (!value) { return ''; }

        if (value.startsWith('data:')) {
          const blob = dataUrlToBlob(value);
          return blob ? URL.createObjectURL(blob) : value;
        }

        if (/^https?:\/\//i.test(value)) {
          try {
            const resp = await fetch(value, { method: 'GET', credentials: 'omit' });
            if (!resp.ok) {
              return value;
            }
            const blob = await resp.blob();
            return blob ? URL.createObjectURL(blob) : value;
          } catch (_) {
            return value;
          }
        }

        return value;
      };

      // Prefer permanent URL (playableUrl). If no draft area at insert time, insert blob so it plays;
      // step4 form will replace blob URLs with permanent URLs when user clicks Save Draft.
      if (details.name === 'insertBelowMedia') {
        try {
          let urlToInsert;
          if (isVideo) {
            urlToInsert = playableUrl || '';
          } else if (isAudio || isImage) {
            urlToInsert = playableUrl || (isAudio ? audioSrc : imageSrc) || '';
            if (urlToInsert && String(urlToInsert).startsWith('data:')) {
              urlToInsert = await mediaUrlForInsert(urlToInsert);
            }
          } else {
            urlToInsert = playableUrl || (isImage && imageSrc ? imageSrc : '') || (isAudio && audioSrc ? audioSrc : '');
            if (urlToInsert && (isAudio || isImage) && String(urlToInsert).startsWith('data:')) {
              urlToInsert = await mediaUrlForInsert(urlToInsert);
            }
          }
          if (urlToInsert && !playableUrl && /^https?:\/\//i.test(String(urlToInsert))) {
            urlToInsert = await mediaUrlForInsert(urlToInsert);
          }
          Log.debug('[tiny_haccgen_extender:result_dialog] insertBelowMedia hasUrl=' + !!urlToInsert +
            ' isAudio=' + isAudio + ' isImage=' + isImage + ' isVideo=' + isVideo);
          if (!urlToInsert) {
            await moodleAlert(title, 'Media file could not be prepared. Cannot insert.');
            return;
          }
          if (isAudio) { insertAudioHtml(editor, urlToInsert); }
          if (isImage) { insertImageHtml(editor, urlToInsert); }
          if (isVideo) { insertVideoHtml(editor, urlToInsert); }
          Log.debug('[tiny_haccgen_extender:result_dialog] insertBelowMedia succeeded');
          api.close();
        } catch (e) {
          Log.debug('[tiny_haccgen_extender:result_dialog] insertBelowMedia failed ' + (e?.message || String(e)));
          moodleAlert(title, e?.message ? e.message : String(e));
        }
        return;
      }

      if (details.name === 'replaceSelectionMedia') {
        try {
          let urlToReplace;
          if (isVideo) {
            urlToReplace = playableUrl || '';
          } else if (isAudio || isImage) {
            urlToReplace = playableUrl || (isAudio ? audioSrc : imageSrc) || '';
            if (urlToReplace && String(urlToReplace).startsWith('data:')) {
              urlToReplace = await mediaUrlForInsert(urlToReplace);
            }
          } else {
            urlToReplace = playableUrl || (isImage && imageSrc ? imageSrc : '') || (isAudio && audioSrc ? audioSrc : '');
            if (urlToReplace && (isAudio || isImage) && String(urlToReplace).startsWith('data:')) {
              urlToReplace = await mediaUrlForInsert(urlToReplace);
            }
          }
          if (urlToReplace && !playableUrl && /^https?:\/\//i.test(String(urlToReplace))) {
            urlToReplace = await mediaUrlForInsert(urlToReplace);
          }
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia hasUrl=' + !!urlToReplace);
          if (!urlToReplace) {
            await moodleAlert(title, 'Media file could not be prepared. Cannot replace selection.');
            return;
          }
          if (isAudio) { replaceWithAudioHtml(editor, urlToReplace); }
          if (isImage) { replaceWithImageHtml(editor, urlToReplace); }
          if (isVideo) { replaceWithVideoHtml(editor, urlToReplace); }
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia succeeded');
          api.close();
        } catch (e) {
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia failed ' + (e?.message || String(e)));
          moodleAlert(title, e?.message ? e.message : String(e));
        }
      }
    },
    onSubmit: async (api) => {
      Log.debug('[tiny_haccgen_extender:result_dialog] onSubmit (Replace selection)');
      try {
        if (isVideo && outputText.trim()) {
          replaceWithVideoHtml(editor, outputText.trim());
        } else {
          editor.selection.setContent(textToHtml(outputText));
        }
        Log.debug('[tiny_haccgen_extender:result_dialog] onSubmit succeeded');
        api.close();
      } catch (e) {
        Log.debug('[tiny_haccgen_extender:result_dialog] onSubmit failed ' + (e?.message || String(e)));
        await moodleAlert(title, e?.message ? e.message : String(e));
      }
    },
  };

  let audioBlobUrl = null;
  if (isAudio && cardContext.audioIframeSrc) {
    audioBlobUrl = cardContext.audioIframeSrc;
  }

  const cfgWithClose = {
    ...cfg,
    onClose: () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    },
  };
  editor.windowManager.open(cfgWithClose);

  Log.debug('[tiny_haccgen_extender:result_dialog] openResultDialog done');
};
