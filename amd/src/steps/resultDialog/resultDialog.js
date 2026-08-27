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
 * Result dialog flow and actions.
 *
 * @module tiny_haccgen_extender/steps/resultDialog/resultDialog
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Log from 'core/log';
import Templates from 'core/templates';
import { component } from '../../common';

import { escapeHtml, normalizeResult, ensureDataUrl, copyToClipboard, textToHtml,
   playableAudioMime, dataUrlToBlob, pcmToWavBlob } from './utils';
import { getAudioFromResult, getImageFromResult, getVideoFromResult, getVideoTracksFromResult } from './mediaExtractors';
import { maybeUploadDataUrlToDraft } from './mediaUpload';
import {
  insertBelowSelection,
  insertAudioHtml,
  replaceWithAudioHtml,
  insertImageHtml,
  replaceWithImageHtml,
  insertVideoHtml,
  replaceWithVideoHtml,
} from './editorInsert';

/**
 * Build a local blob URL for audio preview so the player never fetches draftfile.php
 * from a data: iframe (that request fails with ERR_UNEXPECTED_PROXY_AUTH).
 *
 * @param {string} dataUrl
 * @param {string} mimeHint
 * @returns {Promise<{url: string, mime: string, revoke: function()}>}
 */
const createLocalAudioPreview = async (dataUrl, mimeHint) => {
  const fallback = {
    url: '',
    mime: playableAudioMime(dataUrl, mimeHint),
    revoke: () => {},
  };
  if (!dataUrl || !String(dataUrl).startsWith('data:')) {
    return fallback;
  }
  let blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    return fallback;
  }
  const type = blob.type || mimeHint || '';
  if (/l16|pcm|audio\/raw/i.test(type)) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const alreadyWav = bytes.length >= 4
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (!alreadyWav) {
      const rateMatch = String(type).match(/rate=(\d+)/i);
      blob = pcmToWavBlob(bytes, rateMatch ? Number(rateMatch[1]) : 24000);
    }
  }
  const url = URL.createObjectURL(blob);
  return {
    url,
    mime: blob.type || 'audio/wav',
    revoke: () => {
      URL.revokeObjectURL(url);
    },
  };
};

/**
 * Prevent Space/Enter/Escape from accidentally dismissing the result dialog.
 * TinyMCE often treats those keys as Cancel/Submit when focus is not on a footer button,
 * which discards generated media after credits were spent.
 *
 * @returns {function()} cleanup
 */
const installResultDialogKeyboardGuard = () => {
  let dialogEl = null;
  let removed = false;

  const findDialogEl = () => {
    const dialogs = document.querySelectorAll('.tox-dialog');
    return dialogs.length ? dialogs[dialogs.length - 1] : null;
  };

  const isTopResultDialog = () => {
    if (!dialogEl || !dialogEl.isConnected) {
      return false;
    }
    const dialogs = document.querySelectorAll('.tox-dialog');
    return Boolean(dialogs.length && dialogs[dialogs.length - 1] === dialogEl);
  };

  const isDialogActionControl = (target) => {
    if (!target || !dialogEl) {
      return false;
    }
    const el = target.nodeType === 1 ? target : target.parentElement;
    if (!el || typeof el.closest !== 'function' || !dialogEl.contains(el)) {
      return false;
    }
    return Boolean(el.closest('.tox-dialog__footer button, .tox-dialog__header button'));
  };

  const onKeyDown = (e) => {
    if (removed || !isTopResultDialog()) {
      return;
    }
    const key = e.key;
    const isSpace = key === ' ' || key === 'Spacebar' || e.code === 'Space';
    const isEnter = key === 'Enter';
    const isEscape = key === 'Escape' || key === 'Esc';

    // Escape must not discard generated content; user closes via Close / X.
    if (isEscape) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      return;
    }

    if (!isSpace && !isEnter) {
      return;
    }

    // Allow intentional activation of dialog buttons only.
    if (isDialogActionControl(e.target)) {
      return;
    }

    const tag = (e.target && e.target.tagName) ? String(e.target.tagName).toUpperCase() : '';
    const inMedia = Boolean(
      tag === 'VIDEO' ||
      tag === 'AUDIO' ||
      (e.target && typeof e.target.closest === 'function' && e.target.closest('video, audio'))
    );
    // Let focused media controls receive Space/Enter for play/pause.
    if (inMedia) {
      return;
    }

    // Stop TinyMCE from mapping body-level Space/Enter to dismiss/submit.
    e.preventDefault();
    e.stopPropagation();
  };

  const attach = () => {
    dialogEl = findDialogEl();
    if (!dialogEl) {
      return false;
    }
    // Capture on document so TinyMCE cannot close before our guard runs.
    document.addEventListener('keydown', onKeyDown, true);
    return true;
  };

  if (!attach()) {
    window.setTimeout(attach, 0);
  }

  return () => {
    removed = true;
    document.removeEventListener('keydown', onKeyDown, true);
  };
};

export const openResultDialog = async (editor, resultText, opts = {}) => {
  Log.debug('[tiny_haccgen_extender:result_dialog] openResultDialog called hasSelection=' +
    Boolean(opts.hasSelection) + ' hasGoBack=' + (typeof opts.goBack === 'function'));

  const title = await getString('modal_title', component);
  const resultDialogTitle = await getString('result_dialog_title', component);
  const btnClose = await getString('btn_close', component);
  const btnInsertBelow = await getString('btn_insert_below', component);
  const btnReplaceSelection = await getString('btn_replace_selection', component);
  const btnCopy = await getString('btn_copy', component);
  const errMediaPrepareInsert = await getString('err_media_prepare_insert', component);
  const errMediaPrepareReplace = await getString('err_media_prepare_replace', component);
  const valueEmpty = await getString('value_empty', component);
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
  const videoTracksRaw = getVideoTracksFromResult(resultText);

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
  let localizedVideoTracks = [];
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
    if (videoTracksRaw.length) {
      const uploadedTracks = await Promise.all(videoTracksRaw.map(async (track) => {
        const trackMime = String(track.mime || 'text/vtt').trim() || 'text/vtt';
        const upTrack = await maybeUploadDataUrlToDraft(
          editor,
          track.url,
          trackMime,
          'captions',
          uploadOpts
        );
        if (!upTrack.playableUrl) {
          return null;
        }
        return {
          ...track,
          url: upTrack.playableUrl,
        };
      }));
      localizedVideoTracks = uploadedTracks.filter(Boolean);
    }
  }

  if (isAudio || isImage || isVideo) {
    Log.debug('[tiny_haccgen_extender:result_dialog] upload result playableUrl=' + !!playableUrl +
      ' uploadError=' + (uploadError ? uploadError : '(none)'));
  }

  const safeText = escapeHtml(outputText);
  const localAudio = isAudio ? await createLocalAudioPreview(audioSrc, audioMime) : null;
  const previewSrc = (localAudio && localAudio.url)
    || playableUrl
    || (isAudio ? audioSrc : isImage ? imageSrc : '');
  const previewAudioMime = isAudio
    ? ((localAudio && localAudio.mime) || playableAudioMime(previewSrc, audioMime))
    : audioMime;
  let audioFrameUrl = '';

  // Template context: pass type flags and primitive data so <audio>/<img>/<video> are in the template (not raw HTML).
  const cardContext = {};
  if (isAudio) {
    cardContext.isAudio = true;
    cardContext.wrapperClass = 'dp-ai-result-audio';
    if (previewSrc) {
      const audioDoc = await Templates.renderForPromise(
        'tiny_haccgen_extender/components/audio-iframe-document',
        {
          audiosrc: previewSrc,
          audiomime: previewAudioMime,
        }
      );
      if (audioDoc.js) {
        Templates.runTemplateJS(audioDoc.js);
      }
      audioFrameUrl = URL.createObjectURL(new Blob([audioDoc.html], { type: 'text/html' }));
      cardContext.audioIframeSrc = audioFrameUrl;
    }
  } else if (isImage) {
    cardContext.isImage = true;
    cardContext.imageSrc = previewSrc;
  } else if (isImageIntentNoImage) {
    cardContext.isImageIntentNoImage = true;
    cardContext.imageErrorPreview = outputText ? escapeHtml(String(outputText).slice(0, 500)) : valueEmpty;
  } else if (isVideo) {
    cardContext.isVideo = Boolean(playableUrl);
    cardContext.videoUrl = playableUrl || '';
  } else {
    cardContext.isText = true;
    cardContext.textContent = safeText;
    cardContext.beautifiedContent = textToHtml(outputText);
  }
  if (uploadError) {
    const errMsgRaw = typeof uploadError === 'string'
      ? uploadError
      : (uploadError && typeof uploadError.message === 'string' ? uploadError.message : '');
    const errMsg = typeof errMsgRaw === 'string' ? errMsgRaw.trim() : '';
    if (errMsg) {
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
  // Use custom Close (not cancel): TinyMCE cancel buttons are easily triggered by Space/Enter.
  const buttons = isMediaResult
    ? [
        { type: 'custom', name: 'close', text: btnClose },
        ...(canInsertMedia
          ? [{
              type: 'custom',
              name: 'insertBelowMedia',
              text: btnInsertBelow,
              primary: !(hasSelection && canInsertMedia),
            }]
          : []),
        ...(hasSelection && canInsertMedia
          ? [{ type: 'custom', name: 'replaceSelectionMedia', text: btnReplaceSelection, primary: true }]
          : []),
      ]
    : [
        { type: 'custom', name: 'close', text: btnClose },
        { type: 'custom', name: 'copy', text: btnCopy },
        {
          type: 'custom',
          name: 'insertBelow',
          text: btnInsertBelow,
          primary: !hasSelection,
        },
        ...(hasSelection
          ? [{ type: 'custom', name: 'replaceSelection', text: btnReplaceSelection, primary: true }]
          : []),
      ];

  Log.debug('[tiny_haccgen_extender:result_dialog] body mode media=' +
     isMediaResult + ' canInsertMedia=' + canInsertMedia + ' buttonCount=' + buttons.length);

  let removeKeyboardGuard = () => {};

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
    onCancel: () => {
      // Header X still cancels; Escape is blocked by the keyboard guard.
    },
    onClose: () => {
      removeKeyboardGuard();
      if (audioFrameUrl) {
        URL.revokeObjectURL(audioFrameUrl);
      }
      if (localAudio && typeof localAudio.revoke === 'function') {
        localAudio.revoke();
      }
    },
    onAction: async (api, details) => {
      Log.debug('[tiny_haccgen_extender:result_dialog] onAction name=' + (details?.name || ''));

      if (details.name === 'close') {
        api.close();
        return;
      }

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
            insertBelowSelection(editor, textToHtml(outputText));
            Log.debug('[tiny_haccgen_extender:result_dialog] insertBelow succeeded');
            api.close();
          } catch (e) {
            Log.debug('[tiny_haccgen_extender:result_dialog] insertBelow failed ' + (e?.message || String(e)));
            moodleAlert(title, e?.message ? e.message : String(e));
          }
          return;
        }

        if (details.name === 'replaceSelection') {
          try {
            if (isVideo && outputText.trim()) {
              replaceWithVideoHtml(editor, outputText.trim(), localizedVideoTracks);
            } else {
              editor.selection.setContent(textToHtml(outputText));
            }
            Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelection succeeded');
            api.close();
          } catch (e) {
            Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelection failed ' + (e?.message || String(e)));
            await moodleAlert(title, e?.message ? e.message : String(e));
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
            await moodleAlert(title, errMediaPrepareInsert);
            return;
          }
          if (isAudio) { insertAudioHtml(editor, urlToInsert, previewAudioMime); }
          if (isImage) { insertImageHtml(editor, urlToInsert); }
          if (isVideo) { insertVideoHtml(editor, urlToInsert, localizedVideoTracks); }
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
            await moodleAlert(title, errMediaPrepareReplace);
            return;
          }
          if (isAudio) { replaceWithAudioHtml(editor, urlToReplace, previewAudioMime); }
          if (isImage) { replaceWithImageHtml(editor, urlToReplace); }
          if (isVideo) { replaceWithVideoHtml(editor, urlToReplace, localizedVideoTracks); }
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia succeeded');
          api.close();
        } catch (e) {
          Log.debug('[tiny_haccgen_extender:result_dialog] replaceSelectionMedia failed ' + (e?.message || String(e)));
          moodleAlert(title, e?.message ? e.message : String(e));
        }
      }
    },
  };

  const dialogApi = editor.windowManager.open(cfg);
  removeKeyboardGuard = installResultDialogKeyboardGuard();
  // Prefer focusing content/actions, not Close, so the first Space key is not a dismiss.
  if (dialogApi && typeof dialogApi.focus === 'function') {
    try {
      dialogApi.focus('resultpretty');
    } catch (e) {
      // Ignore focus failures on htmlpanel.
    }
  }

  Log.debug('[tiny_haccgen_extender:result_dialog] openResultDialog done');
};
