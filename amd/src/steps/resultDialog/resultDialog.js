import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';
import Templates from 'core/templates';
import { component } from '../../common';

import { escapeHtml, normalizeResult, ensureDataUrl, copyToClipboard, textToHtml } from './utils';
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
  let requestItemId = Number(opts.requestItemId || 0);
  if (Number.isNaN(requestItemId) || requestItemId < 0) {
    requestItemId = 0;
  }
  const uploadOpts = {
    requireLocal: true,
    itemid: requestItemId,
    onItemId: (id) => {
      const parsed = Number(id);
      if (!Number.isNaN(parsed) && parsed > 0) {
        requestItemId = parsed;
      }
    },
  };

  if (isAudio) {
    const up = await maybeUploadDataUrlToDraft(editor, audioSrc, audioMime, 'audio', uploadOpts);
    playableUrl = up.playableUrl;
    uploadError = up.uploadError;
  } else if (isImage) {
    const up = await maybeUploadDataUrlToDraft(editor, imageSrc, imageMime, 'image', uploadOpts);
    playableUrl = up.playableUrl;
    uploadError = up.uploadError;
  } else if (isVideo) {
    const up = await maybeUploadDataUrlToDraft(editor, normalizedVideoUrl, 'video/mp4', 'video', uploadOpts);
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
      // Tiny dialog may strip <audio>. Render iframe document via Mustache template.
      const audioDoc = await Templates.renderForPromise(
        'tiny_haccgen_extender/components/audio-iframe-document',
        {
          audiosrc: previewSrc,
          audiomime: audioMime || 'audio/mpeg',
        }
      );
      if (audioDoc.js) {
        Templates.runTemplateJS(audioDoc.js);
      }
      cardContext.audioIframeSrc = 'data:text/html;charset=utf-8,' + encodeURIComponent(audioDoc.html);
      cardContext.audioSrc = previewSrc;
      cardContext.audioMime = audioMime || 'audio/mpeg';
    }
  } else if (isImage) {
    cardContext.isImage = true;
    cardContext.imageSrc = previewSrc;
    if (previewSrc) {
      const imageEl = document.createElement('img');
      imageEl.src = previewSrc;
      imageEl.classList.add('mw-100');
      imageEl.style.cssText = RESULT_IMG_STYLE;
      imageEl.alt = 'Generated image';
      cardContext.resultText = imageEl.outerHTML;
    }
  } else if (isImageIntentNoImage) {
    cardContext.isImageIntentNoImage = true;
    cardContext.imageErrorPreview = outputText ? escapeHtml(String(outputText).slice(0, 500)) : '(empty)';
  } else if (isVideo) {
    cardContext.isVideo = Boolean(playableUrl);
    cardContext.videoUrl = playableUrl || '';
    if (playableUrl) {
      const videoEl = document.createElement('video');
      videoEl.controls = true;
      videoEl.preload = 'metadata';
      videoEl.classList.add('mw-100');
      videoEl.style.cssText = RESULT_IMG_STYLE;
      videoEl.src = playableUrl;
      cardContext.resultText = videoEl.outerHTML;
    }
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

      // Use durable draft URLs only; do not insert blob/data URLs into editor content.
      if (details.name === 'insertBelowMedia') {
        try {
          let urlToInsert;
          if (isVideo) {
            urlToInsert = playableUrl || normalizedVideoUrl || '';
          } else if (isAudio || isImage) {
            urlToInsert = playableUrl || (isAudio ? audioSrc : imageSrc) || '';
          } else {
            urlToInsert = playableUrl || '';
          }
          Log.debug('[tiny_haccgen_extender:result_dialog] insertBelowMedia hasUrl=' + !!urlToInsert +
            ' isAudio=' + isAudio + ' isImage=' + isImage + ' isVideo=' + isVideo);
          if (!urlToInsert) {
            await moodleAlert(title, 'Media file could not be prepared. Cannot insert.');
            return;
          }
          if (isAudio) { insertAudioHtml(editor, urlToInsert, audioMime); }
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
            urlToReplace = playableUrl || normalizedVideoUrl || '';
          } else if (isAudio || isImage) {
            urlToReplace = playableUrl || (isAudio ? audioSrc : imageSrc) || '';
          } else {
            urlToReplace = playableUrl || '';
          }
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia hasUrl=' + !!urlToReplace);
          if (!urlToReplace) {
            await moodleAlert(title, 'Media file could not be prepared. Cannot replace selection.');
            return;
          }
          if (isAudio) { replaceWithAudioHtml(editor, urlToReplace, audioMime); }
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

  editor.windowManager.open(cfg);

  Log.debug('[tiny_haccgen_extender:result_dialog] openResultDialog done');
};
