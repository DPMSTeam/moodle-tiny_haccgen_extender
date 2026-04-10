import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import { makeRequest } from './repository';
import { getAllowedPurposes } from './options';
import { component } from './common';
import { buildSummarizeTemplateConfig } from './steps/summarizeTemplate';
import { buildTranslateTemplateConfig } from './steps/translateTemplate';
import { buildDetailedDescriptionTemplateConfig } from './steps/detailedDescriptionTemplate';
import { buildCreateAudioTemplateConfig } from './steps/createAudioTemplate';
import { buildImageGenerationTemplateConfig } from './steps/imageGenerationTemplate';
import {buildInfographImageGenerationTemplateConfig} from './steps/infographImageTemplate';
import { buildAvatarGenerationTemplateConfig } from './steps/avatarGenerationTemplate';
import { toAlertText } from './utils';
import { buildVideoGenerationTemplateConfig } from './steps/videoGenerationTemplate';
import {buildImageDescriptionTemplateConfig} from './steps/imageDescriptionTemplate';
import {buildTextRecognitionTemplateConfig} from './steps/textRecognitionTemplate';
import { showLoadingOverlay, showGlobalLoadingOverlay } from './loadingOverlay';
const DEFAULT_PURPOSE_KEYS = [
  'summarize',
  'translate',
  'detailed_description',
  'create_audio',
  'image_generation',
  'infograph_image_generation',
  'avatar_generation',
  'video_generation',
  'image_description',
  'text_recognition',
  /* 'optimize', */
];

const PURPOSE_DEFS = [
  {
    key: 'summarize',
    label: 'Summarize',
    description: 'Reduce content into key points.',
    templates: [
      { id: 'bullets_short', name: 'Short bullets', options: { length: 'short', format: 'bullets' } },
      { id: 'exec_summary', name: 'Executive summary', options: { tone: 'formal', length: 'medium' } },
    ],
  },
  {
    key: 'translate',
    label: 'Translate',
    description: 'Convert content into another language.',
    templates: [
      { id: 'en_us', name: 'English (US)', options: { target: 'en-US', preserveFormatting: true } },
      { id: 'hi_in', name: 'Hindi (India)', options: { target: 'hi-IN', preserveFormatting: true } },
    ],
  },
  {
    key: 'detailed_description',
    label: 'Detailed description',
    description: 'Expand into a clearer, richer explanation.',
    templates: [
      { id: 'detailed', name: 'Detailed', options: { depth: 'high', structure: 'sections' } },
      { id: 'step_by_step', name: 'Step-by-step', options: { format: 'steps', clarity: 'high' } },
    ],
  },
  {
    key: 'create_audio',
    label: 'Create audio',
    description: 'Turn selected text into spoken audio.',
    templates: [
      { id: 'narration', name: 'Narration', options: { voice: 'default', speed: 1.0 } },
      { id: 'slow_clear', name: 'Slow & clear', options: { voice: 'default', speed: 0.9 } },
    ],
  },
  {
    key: 'image_generation',
    label: 'Image generation',
    description: 'Generate an image from your text prompt.',
    templates: [
      { id: 'realistic', name: 'Realistic', options: { style: 'realistic' } },
      { id: 'illustration', name: 'Illustration', options: { style: 'illustration' } },
    ],
  },
  {
    key: 'infograph_image_generation',
    label: 'Infographic image generation',
    description: 'Create an infographic-style visual.',
    templates: [
      { id: 'clean', name: 'Clean infographic', options: { style: 'infographic', density: 'medium' } },
      { id: 'dense', name: 'Data-heavy', options: { style: 'infographic', density: 'high' } },
    ],
  },
  {
    key: 'avatar_generation',
    label: 'Avatar generation',
    description: 'Generate an avatar from a short description.',
    templates: [
      { id: 'flat', name: 'Flat style', options: { style: 'flat' } },
      { id: '3d', name: '3D style', options: { style: '3d' } },
    ],
  },
  {
    key: 'video_generation',
    label: 'Video generation',
    description: 'Generate a short video from text.',
    templates: [
      { id: 'story', name: 'Story style', options: { style: 'story', duration: 'short' } },
      { id: 'product', name: 'Product demo', options: { style: 'product', duration: 'short' } },
    ],
  },
  {
    key: 'image_description',
    label: 'Image description',
    description: 'Describe what is happening in an image.',
    templates: [
      { id: 'short', name: 'Short', options: { length: 'short' } },
      { id: 'detailed', name: 'Detailed', options: { length: 'long' } },
    ],
  },
  {
    key: 'text_recognition',
    label: 'Text recognition',
    description: 'Extract readable text from content.',
    templates: [
      { id: 'plain', name: 'Plain text', options: { format: 'text' } },
      { id: 'structured', name: 'Structured', options: { format: 'structured' } },
    ],
  },
];

const sanitizeText = (html) => (html || '').replace(/<[^>]*>/g, '').trim();

const tryParseJsonOrThrow = async (jsonText) => {
  try {
    return JSON.parse(jsonText || '{}');
  } catch (e) {
    const msg = await getString('err_bad_options', component);
    throw new Error(msg);
  }
};

const buildAllowedPurposeDefs = (editor) => {
  const allowed = getAllowedPurposes(editor) || [];
  const allowedKeys = allowed.length ? allowed : DEFAULT_PURPOSE_KEYS;
  return PURPOSE_DEFS.filter((p) => allowedKeys.includes(p.key));
};

const findPurpose = (defs, key) => defs.find((p) => p.key === key);
const findTemplate = (purpose, templateId) =>
  (purpose?.templates || []).find((t) => t.id === templateId) || purpose?.templates?.[0];

const getTopDialogEl = () => {
  try {
    const dialogs = document.querySelectorAll('.tox-dialog');
    if (dialogs && dialogs.length) {
      return dialogs[dialogs.length - 1];
    }
    return null;
  } catch (e) {
    return null;
  }
};

const closeTopDialog = () => {
  const dialogEl = getTopDialogEl();
  if (!dialogEl) {
    return false;
  }

  const closeBtn =
    dialogEl.querySelector('button[aria-label="Close"]') ||
    dialogEl.querySelector('button.tox-button--icon[title="Close"]') ||
    dialogEl.querySelector('.tox-dialog__header button.tox-button--icon');

  if (closeBtn && typeof closeBtn.click === 'function') {
    closeBtn.click();
    return true;
  }

  const overlayClose = document.querySelector('.tox-dialog-wrap__backdrop');
  if (overlayClose && typeof overlayClose.click === 'function') {
    overlayClose.click();
    return true;
  }

  return false;
};

const attachStep1GalleryHandlers = (editor, loadingMsg, onPurposePicked) => {
  let tries = 0;
  const maxTries = 30;

  const attempt = () => {
    tries += 1;

    const dialogEl = getTopDialogEl();
    if (!dialogEl) {
      if (tries < maxTries) {
        requestAnimationFrame(attempt);
      }
      return;
    }

    const gallery = dialogEl.querySelector('.dp-ai-wrap');
    if (!gallery) {
      if (tries < maxTries) {
        requestAnimationFrame(attempt);
      }
      return;
    }

    if (gallery.__dpAiClickHandler) {
      gallery.removeEventListener('click', gallery.__dpAiClickHandler);
    }

    gallery.__dpAiClickHandler = (e) => {
      const btn = e?.target?.closest ? e.target.closest('button.dp-ai-menuItem[data-purpose]') : null;
      if (!btn) {
        return;
      }

      const purposeKey = btn.getAttribute('data-purpose');
      if (!purposeKey) {
        return;
      }

      closeTopDialog();
      const removeGlobalLoader = showGlobalLoadingOverlay(loadingMsg);
      void (async () => {
        try {
          await onPurposePicked(purposeKey, removeGlobalLoader);
        } catch (err) {
          removeGlobalLoader();
          const title = await getString('modal_title', component);
          await moodleAlert(title, toAlertText(err));
        }
      })();
    };

    gallery.addEventListener('click', gallery.__dpAiClickHandler);
  };

  requestAnimationFrame(attempt);
};

const getPurposeIconSvg = (key) => {
  // Inline SVGs (no icon font, no external assets) — reliable inside TinyMCE htmlpanel
  // All icons use `currentColor` so theme colors apply automatically.
  const icons = {
    summarize: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    translate: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 5h10M9 5s0 7-7 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19l4-10 4 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.5 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    detailed_description: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 4h7l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
         stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M8 11h8M8 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    create_audio: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M5 10v4h3l4 3V7L8 10H5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18.5 6.5a7 7 0 0 1 0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    image_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="currentColor" stroke-width="2"/>
        <path d="M8 11l2 2 3-4 5 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
    infograph_image_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 17v-5M12 17V7M16 17v-3M20 17v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    avatar_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" stroke-width="2"/>
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    video_generation: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="2"/>
        <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    image_description: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.2-1.3 2.5-2 4-2s2.8.7 4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 10h.01M15 10h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
    text_recognition: `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M7 4h10M7 8h10M7 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 20l2-6h4l2 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
  };

  return icons[key] || `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"
        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
};

const purposeGalleryHtml = (purposeDefs, toolsLabel = 'Haccgen tools') => {
  const cards = purposeDefs
    .map(
      (p) => `
    <button type="button" class="dp-ai-menuItem" data-purpose="${p.key}">
      <span class="dp-ai-icon" aria-hidden="true">
        ${getPurposeIconSvg(p.key)}
      </span>

      <span class="dp-ai-menuItem__body">
        <span class="dp-ai-menuItem__title">${p.label}</span>
        <span class="dp-ai-menuItem__desc">${p.description}</span>
      </span>

      <span class="dp-ai-chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path d="M10 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
  `
    )
    .join('');

  return `
    <style>
      /* ===== Blue/White Theme Tokens ===== */
      .tox .dp-ai-wrap{
        --dp-ai-primary: #222f3e;
        --dp-ai-primary-600: #0b5aa0;
        --dp-ai-ink: #0f1f2e;
        --dp-ai-muted: rgba(15,31,46,.70);

        --dp-ai-surface: #ffffff;
        --dp-ai-surface-2: #f6f9ff;
        --dp-ai-border: rgba(15,108,191,.18);
        --dp-ai-border-soft: rgba(15,31,46,.10);

        --dp-ai-shadow: 0 10px 26px rgba(15,108,191,.12);
        --dp-ai-shadow-soft: 0 6px 18px rgba(0,0,0,.06);

        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      /* ===== Header / Hero ===== */
      .tox .dp-ai-hero{
        border-radius: 14px;
        padding: 16px 16px;
        background: linear-gradient(145deg, rgba(15,108,191,.12) 0%, rgba(15,108,191,.04) 50%, rgba(15,108,191,.02) 100%);
        border: 1px solid var(--dp-ai-border);
        box-shadow: 0 4px 14px rgba(15,108,191,.08), inset 0 1px 0 rgba(255,255,255,.6);
      }

      .tox .dp-ai-title{
        margin: 0 0 6px 0;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: .02em;
        color: var(--dp-ai-ink);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .tox .dp-ai-sub{
        margin: 0;
        font-size: 12.5px;
        line-height: 1.5;
        color: rgba(15,31,46,.75);
      }

      /* ===== Grid ===== */
      .tox .dp-ai-grid{
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        max-height: 420px;
        overflow:auto;
        padding: 4px 6px 6px 2px;
      }

      .tox .dp-ai-grid::-webkit-scrollbar{ width: 10px; }
      .tox .dp-ai-grid::-webkit-scrollbar-thumb{
        background: rgba(15,108,191,.22);
        border-radius: 999px;
        border: 3px solid rgba(255,255,255,.9);
      }
      .tox .dp-ai-grid::-webkit-scrollbar-track{
        background: rgba(15,108,191,.06);
        border-radius: 999px;
      }

      /* ===== Cards ===== */
      .tox button.dp-ai-menuItem{
        position: relative;
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 14px;
        border-radius: 14px;
        border: 1px solid var(--dp-ai-border-soft);
        background: var(--dp-ai-surface);
        text-align: left;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,.04);
        transition: transform .12s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
      }

      .tox button.dp-ai-menuItem:hover{
        transform: translateY(-2px);
        border-color: rgba(15,108,191,.35);
        box-shadow: 0 8px 24px rgba(15,108,191,.14);
        background: linear-gradient(180deg, rgba(15,108,191,.07) 0%, #fff 100%);
      }

      .tox button.dp-ai-menuItem:active{
        transform: translateY(0);
      }

      .tox button.dp-ai-menuItem:focus-visible{
        outline: none;
        border-color: rgba(15,108,191,.55);
        box-shadow: 0 0 0 3px rgba(15,108,191,.22), var(--dp-ai-shadow);
      }

      /* ===== Icon pill ===== */
.tox .dp-ai-icon{
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;

  /* make icon strokes white */
  color: #fff;

  /* make the pill background your desired color */
  background: var(--dp-ai-primary); /* e.g. #090909 or your blue */
  border: 1px solid rgba(0,0,0,.12);
}


      /* ===== Text ===== */
      .tox .dp-ai-menuItem__body{
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width: 0;
      }

      .tox .dp-ai-menuItem__title{
        font-size: 13.5px;
        font-weight: 850;
        color: var(--dp-ai-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tox .dp-ai-menuItem__desc{
        font-size: 12.25px;
        line-height: 1.35;
        color: var(--dp-ai-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* ===== Right chevron ===== */
      .tox .dp-ai-chevron{
        margin-left: auto;
        color: rgba(15,108,191,.55);
        transition: transform .12s ease, color .12s ease;
      }
      .tox button.dp-ai-menuItem:hover .dp-ai-chevron{
        transform: translateX(2px);
        color: rgba(15,108,191,.85);
      }

      @media (max-width: 520px){
        .tox .dp-ai-grid{ grid-template-columns: 1fr; }
      }
    </style>

    <div class="dp-ai-wrap">
      <div class="dp-ai-hero">
        <div class="dp-ai-title">
          <span style="color: var(--dp-ai-primary); display:inline-grid;
           place-items:center; width:22px; height:22px; border-radius:8px; 
           background: rgba(15,108,191,.12); border:1px solid rgba(15,108,191,.18);">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M12 2l2.2 5.2L20 9l-4 3.6L17.2 18 12 15l-5.2 3 1.2-5.4L4 9l5.8-1.8L12 2z"
                stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </span>
          ${toolsLabel}
        </div>
        <p class="dp-ai-sub">Select a purpose to load templates.</p>
      </div>

      <div class="dp-ai-grid" role="list">
        ${cards}
      </div>
    </div>
  `;
};


const buildStep1Config = async (editor, purposeDefs) => {
  const title = await getString('modal_title', component);
  const btnCancel = await getString('btn_cancel', component);
  const menuTools = await getString('menu_tools', component);

  return {
    title,
    size: 'medium',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'purposegallery',
          html: purposeGalleryHtml(purposeDefs, menuTools),
        },
      ],
    },
    buttons: [{ type: 'cancel', text: btnCancel }],
    onCancel: (api) => {
      api.close();
    },
  };
};

const buildStep2Config = async (editor, purposeDefs, selectionText, purposeKey, templateId, goBack) => {
  const title = await getString('modal_title', component);
  const fieldOptions = await getString('field_options', component);
  const fieldPreview = await getString('field_preview', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);

  const purpose = findPurpose(purposeDefs, purposeKey) || purposeDefs[0];
  const template = findTemplate(purpose, templateId);
  const templateItems = (purpose.templates || []).map((t) => ({ value: t.id, text: t.name }));

  return {
    title: `${title}: ${purpose.label}`,
    size: 'medium',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'step2head',
          html: `
          <style>
            .dp-ai-step2{
              background: linear-gradient(135deg, rgba(15,108,191,.10), rgba(15,108,191,.03));
              border:1px solid rgba(15,108,191,.18);
              border-radius:12px;
              padding:12px 12px;
              margin-bottom:10px;
              box-shadow: 0 8px 22px rgba(15,108,191,.10);
            }
            .dp-ai-step2__t{
              font-weight:800;
              margin:0 0 4px;
              color:#102a43;
              font-size:14px;
            }
            .dp-ai-step2__s{
              margin:0;
              font-size:12.5px;
              line-height:1.4;
              color:rgba(16,42,67,.78);
            }
            .tox .tox-textarea, .tox .tox-textfield{
              border-radius: 10px !important;
            }
            .tox .tox-textarea{
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
               "Liberation Mono", "Courier New", monospace !important;
              font-size: 12.5px !important;
              line-height: 1.45 !important;
            }
          </style>

          <div class="dp-ai-step2">
            <p class="dp-ai-step2__t">${purpose.label}</p>
            <p class="dp-ai-step2__s">Choose a template, adjust options, then run.</p>
          </div>`,
        },
        {
          type: 'bar',
          items: [
            { type: 'button', name: 'back', text: 'Back', buttonType: 'secondary' },
            { type: 'label', label: `Templates for ${purpose.label}` },
          ],
        },
        {
          type: 'selectbox',
          name: 'templateId',
          label: 'Template',
          items: templateItems,
        },
        {
          type: 'textarea',
          name: 'optionsjson',
          label: fieldOptions,
          placeholder: '{"tone":"formal"}',
        },
        {
          type: 'textarea',
          name: 'preview',
          label: fieldPreview,
          disabled: true,
        },
      ],
    },
    initialData: {
      templateId: template?.id ?? '',
      optionsjson: JSON.stringify(template?.options ?? {}, null, 2),
      preview: selectionText,
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

    onChange: (api, details) => {
      if (details.name !== 'templateId') {
        return;
      }
      const data = api.getData();
      const newTemplate = findTemplate(purpose, data.templateId);
      api.setData({ ...data, optionsjson: JSON.stringify(newTemplate?.options ?? {}, null, 2) });
    },

    onSubmit: async (api) => {
      const data = api.getData();
      let removeLoadingOverlay = () => {};
      try {
        await tryParseJsonOrThrow(data.optionsjson);

        removeLoadingOverlay = showLoadingOverlay(api, generatingMsg);

        const resp = await makeRequest(purpose.key, selectionText, data.optionsjson);

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
        editor.selection.setContent(resp.result);
        api.close();
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

export const openModal = async (editor) => {
 /* const title = await getString('modal_title', component);
  const errNoSelection = await getString('err_no_selection', component);
*/
  const selectionHtml = editor.selection.getContent({ format: 'html' }) || '';
  const selectionText = sanitizeText(selectionHtml);
/*
  if (!selectionText) {
    await moodleAlert(title, errNoSelection);
    return;
  }
*/
  const purposeDefs = buildAllowedPurposeDefs(editor);
  const loadingOpeningMsg = await getString('loading_opening_tool', component);

  const openStep1 = async () => {
    const cfg1 = await buildStep1Config(editor, purposeDefs);
    editor.windowManager.open(cfg1);

    attachStep1GalleryHandlers(editor, loadingOpeningMsg, async (purposeKey, removeGlobalLoader) => {
      await openStep2(purposeKey, removeGlobalLoader);
    });
  };

  const openStep2 = async (purposeKey, removeGlobalLoader) => {
    const openCfg = (cfg) => {
      if (typeof removeGlobalLoader === 'function') {
        removeGlobalLoader();
      }
      editor.windowManager.open(cfg);
    };

    try {
      const goBack = async (api2) => {
        try {
          api2.close();
        } catch (e) {}
        await openStep1();
      };

      if (purposeKey === 'summarize') {
        const cfg = await buildSummarizeTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }

      else if (purposeKey === 'translate') {
        const cfg = await buildTranslateTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'detailed_description') {
        const cfg = await buildDetailedDescriptionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'create_audio') {
        const cfg = await buildCreateAudioTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'image_generation') {
        const cfg = await buildImageGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'infograph_image_generation') {
        const cfg = await buildInfographImageGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'avatar_generation') {
        const cfg = await buildAvatarGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'video_generation') {
        const cfg = await buildVideoGenerationTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if (purposeKey === 'image_description') {
        const cfg = await buildImageDescriptionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      else if(purposeKey === 'text_recognition'){
        const cfg = await buildTextRecognitionTemplateConfig({ editor, selectionText, goBack });
        openCfg(cfg);
        return;
      }
      const cfg = await buildStep2Config(editor, purposeDefs, selectionText, purposeKey, null, goBack);
      openCfg(cfg);
    } catch (e) {
      if (typeof removeGlobalLoader === 'function') {
        removeGlobalLoader();
      }
      await moodleAlert('AI', toAlertText(e));
    }
  };

  await openStep1();
};
