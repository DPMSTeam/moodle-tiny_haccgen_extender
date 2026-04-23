import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import { component } from '../common';
import { makeRequest } from '../repository';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';
import { resolveDraftItemId } from '../draftItemid';

const OPT_CACHE_KEY = 'dp_ai_heygen_opts_v1';
const OPT_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

const readOptCache = () => {
  try {
    const raw = sessionStorage.getItem(OPT_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      return null;
    }

    return parsed.data || null;
  } catch (e) {
    return null;
  }
};

const writeOptCache = (data) => {
  try {
    sessionStorage.setItem(
      OPT_CACHE_KEY,
      JSON.stringify({ data, expiresAt: Date.now() + OPT_CACHE_TTL_MS })
    );
  } catch (e) {
    // ignore
  }
};

const safeParse = (x) => {
  if (!x) {
    return null;
  }
  if (typeof x === 'object') {
    return x;
  }
  try {
    return JSON.parse(x);
  } catch (e) {
    return null;
  }
};

const toSelectItems = (arr) => (arr || []).map((o) => ({ value: o.id, text: o.name }));

/**
 * Build modal config for talking avatar generation.
 *
 * @param {Object} root0
 * @param {Object} root0.editor TinyMCE editor instance.
 * @param {string} root0.selectionText Selected text (used as initial script).
 * @param {Function} root0.goBack Back handler.
 * @returns {Promise<Object>} TinyMCE windowManager config.
 */
export const buildAvatarGenerationTemplateConfig = async ({ editor, selectionText, goBack }) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);

  // 1) Load available options from backend (avatar_id, voice_id, video_style_id, output_format).
  let opts = readOptCache();

  if (!opts) {
    const resp = await makeRequest('avatar_generation_options', '', '{}');

    if (resp?.code !== 200) {
      let msg = 'Failed to load avatar options.';
      if (typeof resp?.result === 'string') {
        msg = resp.result;
      } else if (resp?.result) {
        msg = JSON.stringify(resp.result);
      }
      await moodleAlert(title, msg);
      opts = {};
    } else {
      // Backend may return { outputText: "<json>", ... } or { result: "<json>", ... } or the options object directly.
      const parsed = safeParse(resp.result);
      if (parsed && typeof parsed.outputText === 'string') {
        opts = safeParse(parsed.outputText) || {};
      } else if (parsed && typeof parsed.result === 'string') {
        opts = safeParse(parsed.result) || {};
      } else if (parsed && (Array.isArray(parsed.avatar_id) || Array.isArray(parsed.voice_id))) {
        opts = parsed;
      } else {
        opts = {};
      }
      writeOptCache(opts);
    }
  }

  const avatarItems = toSelectItems(opts.avatar_id);
  const voiceItems = toSelectItems(opts.voice_id);
  const styleItems = toSelectItems(opts.video_style_id);
  const formatItems = toSelectItems(opts.output_format);
  const resolutionItems = toSelectItems(opts.resolution);

  const defaultAvatar = avatarItems[0]?.value || '';
  const defaultVoice = voiceItems[0]?.value || '';
  const defaultStyle = styleItems[0]?.value || 'normal';
  const defaultFormat = formatItems[0]?.value || 'mp4';
  const defaultResolution = resolutionItems[0]?.value || '1280x720';

  return {
    title: `${title}: Generate talking avatar`,
    size: 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'avatarHead',
          html: [
            '<style>',
            '.dp-ai-x-head{background: linear-gradient(135deg, rgba(15,108,191,.10), rgba(15,108,191,.03));',
            'border:1px solid rgba(15,108,191,.18);border-radius:12px;padding:12px 12px;margin-bottom:10px;',
            'box-shadow: 0 8px 22px rgba(15,108,191,.10);}',
            '.dp-ai-x-head__t{ font-weight:800; margin:0 0 4px; color:#102a43; font-size:14px; }',
            '.dp-ai-x-head__s{ margin:0; font-size:12.5px; line-height:1.4; color:rgba(16,42,67,.78); }',
            '.tox .tox-textarea, .tox .tox-textfield{ border-radius:10px !important; }',
            '.tox .tox-textarea{ min-height: 260px !important; font-size:12.5px !important; line-height:1.45 !important; }',
            '</style>',
            '<div class="dp-ai-x-head">',
            '<p class="dp-ai-x-head__t">Generate talking avatar</p>',
            '<p class="dp-ai-x-head__s">Enter text, select avatar/voice/style/format, then generate.</p>',
            '</div>'
          ].join('\n            '),
        },

        {
          type: 'bar',
          items: [{ type: 'button', name: 'back', text: 'Back', buttonType: 'secondary' }],
        },

        {
          type: 'textarea',
          name: 'prompt',
          label: 'Script',
          placeholder:
            'Example: Welcome! In this lesson we will cover Agile basics. ' +
            'We will start with Scrum roles, then events, then artifacts.',
        },

        {
          type: 'grid',
          columns: 2,
          items: [
            { type: 'selectbox', name: 'avatar_id', label: 'Avatar Id', items: avatarItems },
            { type: 'selectbox', name: 'voice_id', label: 'Voice Id', items: voiceItems },
            { type: 'selectbox', name: 'video_style_id', label: 'Video Style Id', items: styleItems },
            { type: 'selectbox', name: 'output_format', label: 'Output Format', items: formatItems },
            { type: 'selectbox', name: 'resolution', label: 'Resolution', items: resolutionItems },
          ],
        },
      ],
    },

    initialData: {
      prompt: (selectionText || '').trim(),
      avatar_id: defaultAvatar,
      voice_id: defaultVoice,
      video_style_id: defaultStyle,
      output_format: defaultFormat,
      resolution: defaultResolution,
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
        await moodleAlert(title, 'Please enter text in the Script box.');
        return;
      }

      const removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);
      const draftItemId = resolveDraftItemId(editor);

      // Connector expects arrays: $o['avatar_id'][0], etc.
      const optionsjson = JSON.stringify(
        {
          avatar_id: [data.avatar_id],
          voice_id: [data.voice_id],
          video_style_id: [data.video_style_id],
          output_format: [data.output_format],
          resolution: [data.resolution],
          itemid: draftItemId,
        },
        null,
        2
      );

      try {
        const resp = await makeRequest('avatar_generation', inputText, optionsjson);

        if (resp.code !== 200) {
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
          let msg = resp.result;
          try {
            const parsed = JSON.parse(resp.result);
            msg = parsed.message || resp.result;
          } catch (e) {
            // ignore
          }
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
          purpose: 'avatar_generation',
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
