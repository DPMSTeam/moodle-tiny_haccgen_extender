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
 * Video-generation dialog config (native platform API + legacy VideoGen).
 *
 * @module tiny_haccgen_extender/steps/videoGenerationTemplate
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { get_string as getString } from 'core/str';
import { alert as moodleAlert } from 'core/notification';
import Templates from 'core/templates';
import { component } from '../common';
import { makeRequest } from '../repository';
import { showLoadingOverlay } from '../loadingOverlay';
import { openResultDialog } from './resultDialog/resultDialog';
import { resolveDraftItemId } from '../draftItemid';

const OPT_CACHE_KEY = 'dp_ai_videogen_opts_v8';
const OPT_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

const DEFAULT_LEGACY_OPTIONS = {
  language: [{ id: 'en', name: 'English' }],
  voice_id: [{ id: '', name: 'Default (auto)' }],
  fonts: [{ id: '', name: 'Default' }],
  aspect_ratios: [
    { id: '16:9', name: '16:9 (Landscape)' },
    { id: '9:16', name: '9:16 (Portrait)' },
    { id: '1:1', name: '1:1 (Square)' },
  ],
  output_format: [
    { id: 'mp4', name: 'MP4' },
    { id: 'webm', name: 'WebM' },
  ],
};

const DEFAULT_NATIVE_LANGUAGES = [
  { id: '', name: 'Default (English, India)' },
  { id: 'english', name: 'English' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'bengali', name: 'Bengali / Bangla' },
  { id: 'marathi', name: 'Marathi' },
  { id: 'tamil', name: 'Tamil' },
  { id: 'telugu', name: 'Telugu' },
  { id: 'gujarati', name: 'Gujarati' },
  { id: 'kannada', name: 'Kannada' },
  { id: 'malayalam', name: 'Malayalam' },
  { id: 'punjabi', name: 'Punjabi' },
  { id: 'urdu', name: 'Urdu' },
  { id: 'odia', name: 'Odia / Oriya' },
  { id: 'assamese', name: 'Assamese' },
  { id: 'konkani', name: 'Konkani' },
  { id: 'nepali', name: 'Nepali' },
];

const DEFAULT_NATIVE_LANGUAGE_CODES = [
  { id: 'en-IN', name: 'English (India)' },
  { id: 'en-US', name: 'English (US)' },
  { id: 'en-GB', name: 'English (UK)' },
  { id: 'en-AU', name: 'English (Australia)' },
  { id: 'hi-IN', name: 'Hindi (India)' },
  { id: 'mr-IN', name: 'Marathi (India)' },
  { id: 'ta-IN', name: 'Tamil (India)' },
  { id: 'te-IN', name: 'Telugu (India)' },
  { id: 'bn-BD', name: 'Bangla (Bangladesh)' },
  { id: 'ar-EG', name: 'Arabic (Egypt)' },
  { id: 'nl-NL', name: 'Dutch (Netherlands)' },
  { id: 'fr-FR', name: 'French (France)' },
  { id: 'de-DE', name: 'German (Germany)' },
  { id: 'id-ID', name: 'Indonesian (Indonesia)' },
  { id: 'it-IT', name: 'Italian (Italy)' },
  { id: 'ja-JP', name: 'Japanese (Japan)' },
  { id: 'ko-KR', name: 'Korean (South Korea)' },
  { id: 'pl-PL', name: 'Polish (Poland)' },
  { id: 'pt-BR', name: 'Portuguese (Brazil)' },
  { id: 'ro-RO', name: 'Romanian (Romania)' },
  { id: 'ru-RU', name: 'Russian (Russia)' },
  { id: 'es-ES', name: 'Spanish (Spain)' },
  { id: 'th-TH', name: 'Thai (Thailand)' },
  { id: 'tr-TR', name: 'Turkish (Turkey)' },
  { id: 'uk-UA', name: 'Ukrainian (Ukraine)' },
  { id: 'vi-VN', name: 'Vietnamese (Vietnam)' },
];

const DEFAULT_NATIVE_OPTIONS = {
  provider: 'native_video',
  use_storyboard: [
    {
      id: 'true',
      name: 'AI storyboard (writes script, scenes, and image prompts from your topic)',
    },
    {
      id: 'false',
      name: 'Use my narration / Transcribe and Prompt (uses your text; one scene and image prompt per sentence)',
    },
  ],
  race: [
    { id: '', name: 'Default' },
    { id: 'Indian', name: 'Indian' },
    { id: 'any_other', name: 'Other' },
  ],
  image_source: [
    { id: '', name: 'Default' },
    { id: 'pexels', name: 'Pexels stock' },
    { id: 'llm', name: 'AI-generated only' },
  ],
  voice_gender: [
    { id: '', name: 'Default' },
    { id: 'male', name: 'Male (Puck)' },
    { id: 'female', name: 'Female (Kore)' },
  ],
  language: DEFAULT_NATIVE_LANGUAGES,
  language_code: DEFAULT_NATIVE_LANGUAGE_CODES,
};

const toArray = (v) => (Array.isArray(v) ? v : []);

const normalizeSelectItems = (raw, keyAliases = []) => {
  const normalized = [];
  toArray(raw).forEach((item) => {
    if (item === null || item === undefined) {
      return;
    }
    if (typeof item === 'string' || typeof item === 'number') {
      const value = String(item).trim();
      if (value) {
        normalized.push({ id: value, name: value });
      }
      return;
    }
    if (typeof item !== 'object') {
      return;
    }
    const keys = ['id', 'value', ...keyAliases];
    const id = keys
      .map((k) => item[k])
      .find((v) => typeof v === 'string' || typeof v === 'number');
    const name = ['name', 'text', 'label', 'displayName', ...keyAliases]
      .map((k) => item[k])
      .find((v) => typeof v === 'string' || typeof v === 'number');
    const value = (id !== undefined ? String(id) : '').trim();
    const label = (name !== undefined ? String(name) : value).trim();
    if (value || label) {
      normalized.push({ id: value, name: label || value });
    }
  });
  return normalized;
};

const isNativeProviderOptions = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  return raw.provider === 'native_video' || Array.isArray(raw.use_storyboard);
};

const sanitizeLegacyOptions = (raw) => {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const language = normalizeSelectItems(obj.language, ['code', 'languageCode', 'lang']);
  const voice = normalizeSelectItems(obj.voice_id, ['voiceId', 'voice_id']);
  const fonts = normalizeSelectItems(obj.fonts, ['fontId', 'font_id', 'fontName']);
  const aspect = normalizeSelectItems(obj.aspect_ratios, ['ratio', 'aspect']);
  const format = normalizeSelectItems(obj.output_format, ['format', 'type']);
  return {
    ...DEFAULT_LEGACY_OPTIONS,
    language: language.length ? language : DEFAULT_LEGACY_OPTIONS.language,
    voice_id: voice.length ? voice : DEFAULT_LEGACY_OPTIONS.voice_id,
    fonts: fonts.length ? fonts : DEFAULT_LEGACY_OPTIONS.fonts,
    aspect_ratios: aspect.length ? aspect : DEFAULT_LEGACY_OPTIONS.aspect_ratios,
    output_format: format.length ? format : DEFAULT_LEGACY_OPTIONS.output_format,
  };
};

const sanitizeNativeOptions = (raw) => {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const pick = (key, fallback) => {
    const items = normalizeSelectItems(obj[key]);
    return items.length ? items : fallback;
  };
  return {
    provider: 'native_video',
    use_storyboard: pick('use_storyboard', DEFAULT_NATIVE_OPTIONS.use_storyboard),
    race: pick('race', DEFAULT_NATIVE_OPTIONS.race),
    image_source: pick('image_source', DEFAULT_NATIVE_OPTIONS.image_source),
    voice_gender: pick('voice_gender', DEFAULT_NATIVE_OPTIONS.voice_gender),
    language: pick('language', DEFAULT_NATIVE_OPTIONS.language),
    language_code: pick('language_code', DEFAULT_NATIVE_OPTIONS.language_code),
  };
};

const hasMeaningfulLegacyOptions = (opts) =>
  toArray(opts?.language).length > 0 ||
  toArray(opts?.voice_id).length > 0 ||
  toArray(opts?.fonts).length > 0;

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
    if (!parsed.data || typeof parsed.data !== 'object') {
      return null;
    }
    return parsed.data;
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
  if (x === null || x === undefined) {
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

const toSelectItems = (arr) =>
  toArray(arr)
    .filter((o) => o && typeof o.id === 'string')
    .map((o) => ({ value: o.id, text: o.name || o.id || 'Default' }));

const parseDurationSeconds = (text) => {
  const s = String(text || '').trim();
  if (!s) {
    return null;
  }
  const minuteMatch = s.match(/(\d+(?:\.\d+)?)\s*minutes?\b/i);
  if (minuteMatch) {
    return Math.max(1, Math.round(parseFloat(minuteMatch[1]) * 60));
  }
  const secondMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?)\b/i);
  if (secondMatch) {
    return Math.max(1, Math.round(parseFloat(secondMatch[1])));
  }
  return null;
};

const estimateDurationSeconds = (text) => {
  const parsed = parseDurationSeconds(text);
  if (parsed !== null) {
    return parsed;
  }
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 2.5));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatElapsed = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
};

const extractErrorMessage = (resp) => {
  if (typeof resp?.result === 'string') {
    const parsed = safeParse(resp.result);
    if (parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
    return resp.result;
  }
  if (resp?.result && typeof resp.result === 'object' && resp.result.message) {
    return String(resp.result.message);
  }
  return JSON.stringify(resp?.result || {});
};

const parseJobPayload = (result) => {
  const parsed = safeParse(result);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  return parsed;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fieldHelp = (text) => ({
  type: 'htmlpanel',
  html: `<p class="dp-ai-x-field-help">${escapeHtml(text)}</p>`,
});

const buildNativeFormItems = (labels, items) => [
  {
    type: 'selectbox',
    name: 'use_storyboard',
    label: labels.fieldUseStoryboard,
    items: items.useStoryboard,
  },
  fieldHelp(labels.helpUseStoryboard),
  {
    type: 'textarea',
    name: 'additional_prompt',
    label: labels.fieldAdditionalPrompt,
    placeholder: labels.placeholderAdditionalPrompt,
  },
  fieldHelp(labels.helpAdditionalPrompt),
  {
    type: 'selectbox',
    name: 'language',
    label: labels.fieldNativeLanguage,
    items: items.language,
  },
  fieldHelp(labels.helpNativeLanguage),
  {
    type: 'selectbox',
    name: 'voice_gender',
    label: labels.fieldVoiceGender,
    items: items.voiceGender,
  },
  fieldHelp(labels.helpVoiceGender),
  {
    type: 'textarea',
    name: 'style_instructions',
    label: labels.fieldStyleInstructions,
    placeholder: labels.placeholderStyleInstructions,
  },
  fieldHelp(labels.helpStyleInstructions),
  {
    type: 'selectbox',
    name: 'image_source',
    label: labels.fieldImageSource,
    items: items.imageSource,
  },
  fieldHelp(labels.helpImageSource),
  {
    type: 'selectbox',
    name: 'race',
    label: labels.fieldRace,
    items: items.race,
  },
  fieldHelp(labels.helpRace),
  {
    type: 'textarea',
    name: 'external_details_prompt',
    label: labels.fieldExternalDetailsPrompt,
    placeholder: labels.placeholderExternalDetailsPrompt,
  },
  fieldHelp(labels.helpExternalDetailsPrompt),
];

const buildLegacyFormItems = (labels, items) => [
  {
    type: 'grid',
    columns: 2,
    items: [
      { type: 'selectbox', name: 'language', label: labels.fieldLanguage, items: items.language },
      { type: 'selectbox', name: 'voice_id', label: labels.fieldVoice, items: items.voiceId },
      { type: 'selectbox', name: 'aspect_ratio', label: labels.fieldAspectRatio, items: items.aspectRatios },
      { type: 'selectbox', name: 'output_format', label: labels.fieldOutputFormat, items: items.outputFormat },
      { type: 'selectbox', name: 'font', label: labels.fieldFont, items: items.fonts },
      {
        type: 'selectbox',
        name: 'useGenerativeImage',
        label: labels.fieldUseGenerativeImage,
        items: [
          { value: 'true', text: labels.valueYes },
          { value: 'false', text: labels.valueNo },
        ],
      },
    ],
  },
];

/**
 * Build modal config for video generation.
 *
 * @param {Object} root0
 * @param {Object} root0.editor TinyMCE editor instance.
 * @param {string} root0.selectionText Selected text (used as initial prompt).
 * @param {Function} root0.goBack Back handler.
 * @returns {Promise<Object>} TinyMCE windowManager config.
 */
export const buildVideoGenerationTemplateConfig = async ({ editor, selectionText, goBack }) => {
  const title = await getString('modal_title', component);
  const btnRun = await getString('btn_run', component);
  const btnCancel = await getString('btn_cancel', component);
  const generatingMsg = await getString('generating', component);
  const loadingStart = await getString('videogen_loading_start', component);
  const loadingWait = await getString('videogen_loading_wait', component);
  const loadingScript = await getString('videogen_loading_script', component);
  const loadingImages = await getString('videogen_loading_images', component);
  const loadingVoice = await getString('videogen_loading_voice', component);
  const loadingRender = await getString('videogen_loading_render', component);
  const errJobMissing = await getString('videogen_err_job_missing', component);
  const errTimeout = await getString('videogen_err_timeout', component);
  const btnBack = await getString('btn_back', component);
  const videoGenerationTitle = await getString('video_generation_title', component);
  const videoGenerationSubtitle = await getString('video_generation_subtitle', component);
  const fieldPrompt = await getString('field_prompt', component);
  const placeholderVideoPrompt = await getString('placeholder_video_prompt', component);
  const placeholderNativePrompt = await getString('placeholder_native_video_prompt', component);
  const fieldLanguage = await getString('field_language', component);
  const fieldVoice = await getString('field_voice', component);
  const fieldAspectRatio = await getString('field_aspect_ratio', component);
  const fieldOutputFormat = await getString('field_output_format', component);
  const fieldFont = await getString('field_font', component);
  const fieldUseGenerativeImage = await getString('field_use_generative_image', component);
  const fieldUseStoryboard = await getString('field_use_storyboard', component);
  const fieldRace = await getString('field_race', component);
  const fieldImageSource = await getString('field_image_source', component);
  const fieldVoiceGender = await getString('field_voice_gender', component);
  const fieldNativeLanguage = await getString('field_native_language', component);
  const fieldAdditionalPrompt = await getString('field_additional_prompt', component);
  const placeholderAdditionalPrompt = await getString('placeholder_additional_prompt', component);
  const fieldStyleInstructions = await getString('field_style_instructions', component);
  const placeholderStyleInstructions = await getString('placeholder_style_instructions', component);
  const fieldExternalDetailsPrompt = await getString('field_external_details_prompt', component);
  const placeholderExternalDetailsPrompt = await getString('placeholder_external_details_prompt', component);
  const helpVideoPrompt = await getString('help_video_prompt', component);
  const helpUseStoryboard = await getString('help_use_storyboard', component);
  const helpAdditionalPrompt = await getString('help_additional_prompt', component);
  const helpRace = await getString('help_race', component);
  const helpImageSource = await getString('help_image_source', component);
  const helpNativeLanguage = await getString('help_native_language', component);
  const helpVoiceGender = await getString('help_voice_gender', component);
  const helpStyleInstructions = await getString('help_style_instructions', component);
  const helpExternalDetailsPrompt = await getString('help_external_details_prompt', component);
  const valueYes = await getString('yes', component);
  const valueNo = await getString('no', component);
  const errVideoOptionsLoadFailed = await getString('err_video_options_load_failed', component);
  const errPromptRequired = await getString('err_prompt_required', component);

  const headerRender = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/dialog-head',
    {
      title: videoGenerationTitle,
      subtitle: videoGenerationSubtitle,
    }
  );
  if (headerRender.js) {
    Templates.runTemplateJS(headerRender.js);
  }
  const headerHtml = headerRender.html;

  let cached = readOptCache();
  let isNative = cached ? isNativeProviderOptions(cached) : true;
  let nativeOpts = sanitizeNativeOptions(DEFAULT_NATIVE_OPTIONS);
  let legacyOpts = sanitizeLegacyOptions(DEFAULT_LEGACY_OPTIONS);

  if (!cached) {
    const resp = await makeRequest(
      'video_generation_options',
      '',
      JSON.stringify({ video_provider: 'native_video' })
    );
    if (resp?.code !== 200) {
      let msg = errVideoOptionsLoadFailed;
      if (typeof resp?.result === 'string') {
        msg = resp.result;
      } else if (resp?.result) {
        msg = JSON.stringify(resp.result);
      }
      await moodleAlert(title, msg);
    } else {
      const parsed = safeParse(resp.result);
      let candidate = {};
      if (parsed && typeof parsed.outputText === 'string') {
        candidate = safeParse(parsed.outputText) || {};
      } else if (parsed && typeof parsed.result === 'string') {
        candidate = safeParse(parsed.result) || {};
      } else if (parsed && typeof parsed === 'object') {
        candidate = parsed;
      }
      isNative = isNativeProviderOptions(candidate);
      if (isNative) {
        nativeOpts = sanitizeNativeOptions(candidate);
        writeOptCache(nativeOpts);
      } else if (hasMeaningfulLegacyOptions(sanitizeLegacyOptions(candidate))) {
        legacyOpts = sanitizeLegacyOptions(candidate);
        writeOptCache(legacyOpts);
        isNative = false;
      } else {
        nativeOpts = sanitizeNativeOptions(DEFAULT_NATIVE_OPTIONS);
        writeOptCache(nativeOpts);
      }
    }
  } else if (isNativeProviderOptions(cached)) {
    nativeOpts = sanitizeNativeOptions(cached);
  } else {
    legacyOpts = sanitizeLegacyOptions(cached);
    isNative = false;
  }

  const labels = {
    fieldLanguage,
    fieldVoice,
    fieldAspectRatio,
    fieldOutputFormat,
    fieldFont,
    fieldUseGenerativeImage,
    fieldUseStoryboard,
    fieldRace,
    fieldImageSource,
    fieldVoiceGender,
    fieldNativeLanguage,
    fieldAdditionalPrompt,
    fieldStyleInstructions,
    fieldExternalDetailsPrompt,
    placeholderStyleInstructions,
    placeholderAdditionalPrompt,
    placeholderExternalDetailsPrompt,
    helpUseStoryboard,
    helpAdditionalPrompt,
    helpRace,
    helpImageSource,
    helpNativeLanguage,
    helpVoiceGender,
    helpStyleInstructions,
    helpExternalDetailsPrompt,
    valueYes,
    valueNo,
  };

  const formItems = isNative
    ? buildNativeFormItems(labels, {
      useStoryboard: toSelectItems(nativeOpts.use_storyboard),
      race: toSelectItems(nativeOpts.race),
      imageSource: toSelectItems(nativeOpts.image_source),
      voiceGender: toSelectItems(nativeOpts.voice_gender),
      language: toSelectItems(nativeOpts.language),
    })
    : buildLegacyFormItems(labels, {
      language: toSelectItems(legacyOpts.language),
      voiceId: toSelectItems(legacyOpts.voice_id),
      aspectRatios: toSelectItems(legacyOpts.aspect_ratios),
      outputFormat: toSelectItems(legacyOpts.output_format),
      fonts: toSelectItems(legacyOpts.fonts),
    });

  const initialData = isNative
    ? {
      prompt: (selectionText || '').trim(),
      use_storyboard: nativeOpts.use_storyboard[0]?.id || 'true',
      additional_prompt: '',
      race: nativeOpts.race[0]?.id || '',
      image_source: nativeOpts.image_source[0]?.id || '',
      voice_gender: nativeOpts.voice_gender[0]?.id || '',
      language: nativeOpts.language[0]?.id || '',
      style_instructions: '',
      external_details_prompt: '',
    }
    : {
      prompt: (selectionText || '').trim(),
      language: legacyOpts.language[0]?.id || 'en',
      voice_id: legacyOpts.voice_id[0]?.id || '',
      aspect_ratio: legacyOpts.aspect_ratios[0]?.id || '16:9',
      output_format: legacyOpts.output_format[0]?.id || 'mp4',
      font: legacyOpts.fonts[0]?.id || '',
      useGenerativeImage: 'true',
    };

  return {
    title: `${title}: ${videoGenerationTitle}`,
    size: isNative ? 'large' : 'medium',

    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          name: 'videoHead',
          html: headerHtml,
        },
        {
          type: 'bar',
          items: [{ type: 'button', name: 'back', text: btnBack, buttonType: 'secondary' }],
        },
        {
          type: 'textarea',
          name: 'prompt',
          label: fieldPrompt,
          placeholder: isNative ? placeholderNativePrompt : placeholderVideoPrompt,
        },
        ...(isNative ? [fieldHelp(helpVideoPrompt)] : []),
        ...formItems,
      ],
    },

    initialData,

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
          await moodleAlert(title, errPromptRequired);
          return;
        }

        const draftItemId = resolveDraftItemId(editor);
        const rotatingMessages = [loadingScript, loadingImages, loadingVoice, loadingRender];
        const startedAt = Date.now();
        let messageIndex = 0;
        let elapsedTimerId = null;
        let currentPrimary = isNative ? loadingStart : generatingMsg;
        let currentStatus = '';

        const PLACEHOLDER = '\uE000';
        const [elapsedTpl, statusTpl] = await Promise.all([
          getString('videogen_loading_elapsed', component, PLACEHOLDER),
          getString('videogen_loading_status', component, PLACEHOLDER),
        ]);
        const formatElapsedLabel = (sec) => elapsedTpl.replace(PLACEHOLDER, formatElapsed(sec));
        const formatStatusLabel = (status) => (
          status ? statusTpl.replace(PLACEHOLDER, status) : ''
        );

        const removeLoadingOverlay = showLoadingOverlay(
          api,
          currentPrimary,
          loadingWait
        );

        const buildDetailLine = (elapsedSec) => {
          const detailParts = [formatElapsedLabel(elapsedSec)];
          const statusText = formatStatusLabel(currentStatus);
          if (statusText) {
            detailParts.push(statusText);
          }
          return `${loadingWait}\n${detailParts.join(' · ')}`;
        };

        const tickElapsed = () => {
          const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
          if (typeof removeLoadingOverlay.update === 'function') {
            removeLoadingOverlay.update(currentPrimary, buildDetailLine(elapsedSec));
          }
        };

        const refreshLoadingCopy = (statusLabel = '', rotatePrimary = false) => {
          if (rotatePrimary) {
            currentPrimary = rotatingMessages[messageIndex % rotatingMessages.length];
            messageIndex += 1;
          }
          if (statusLabel) {
            currentStatus = statusLabel;
          }
          tickElapsed();
        };

        const finishOverlay = () => {
          if (elapsedTimerId !== null) {
            window.clearInterval(elapsedTimerId);
            elapsedTimerId = null;
          }
          removeLoadingOverlay();
          if (typeof api.unblock === 'function') {
            api.unblock();
          }
        };

        elapsedTimerId = window.setInterval(tickElapsed, 1000);

        let optionsjson;
        let estimatedSeconds = null;
        if (isNative) {
          estimatedSeconds = estimateDurationSeconds(inputText);
          const useStoryboard = data.use_storyboard || 'true';
          const additionalPrompt = (data.additional_prompt || '').trim();
          const language = (data.language || '').trim();
          const styleInstructions = (data.style_instructions || '').trim();
          const externalDetailsPrompt = (data.external_details_prompt || '').trim();
          const nativePayload = {
            video_provider: 'native_video',
            use_storyboard: useStoryboard,
            race: data.race || '',
            image_source: data.image_source || '',
            voice_gender: data.voice_gender || '',
            itemid: draftItemId,
            duration_seconds: estimatedSeconds,
            usage_input: inputText,
          };
          if (language !== '') {
            nativePayload.language = language;
          }
          if (styleInstructions !== '') {
            nativePayload.style_instructions = styleInstructions;
          }
          if (externalDetailsPrompt !== '') {
            nativePayload.external_details_prompt = externalDetailsPrompt;
          }
          if (useStoryboard === 'false' && additionalPrompt !== '') {
            nativePayload.additional_prompt = additionalPrompt;
          }
          optionsjson = JSON.stringify(nativePayload, null, 2);
        } else {
          optionsjson = JSON.stringify(
            {
              script: inputText,
              language: data.language ? [data.language] : [],
              voice_id: data.voice_id ? [data.voice_id] : [],
              aspect_ratio: data.aspect_ratio || '16:9',
              output_format: data.output_format || 'mp4',
              font: data.font ? [data.font] : [],
              useGenerativeImage: data.useGenerativeImage === 'true',
              itemid: draftItemId,
            },
            null,
            2
          );
        }

        try {
          const resp = await makeRequest('videogen', inputText, optionsjson);
          const startPayload = parseJobPayload(resp.result);
          const isAsyncStart = isNative
            && (resp.code === 202 || resp.code === 200)
            && startPayload
            && startPayload.job_id
            && !(Array.isArray(startPayload.media) && startPayload.media.length);

          if (isAsyncStart) {
            const jobId = String(startPayload.job_id);
            const pollOptions = JSON.stringify({
              video_provider: 'native_video',
              job_id: jobId,
              itemid: draftItemId,
              duration_seconds: estimatedSeconds,
              usage_input: inputText,
            });
            const maxAttempts = 60; // ~12 minutes at 12s interval
            const pollIntervalMs = 12000;
            let completedResult = null;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              if (attempt > 0) {
                await sleep(pollIntervalMs);
              }
              refreshLoadingCopy(String(startPayload.status || 'PENDING'), attempt > 0);
              const statusResp = await makeRequest('videogen_status', jobId, pollOptions);
              if (statusResp.code >= 400) {
                finishOverlay();
                await moodleAlert(title, extractErrorMessage(statusResp));
                return;
              }
              const statusPayload = parseJobPayload(statusResp.result) || {};
              const status = String(statusPayload.status || '').toUpperCase();
              const media = Array.isArray(statusPayload.media) ? statusPayload.media : [];
              if (status === 'COMPLETED' || media.length > 0) {
                completedResult = statusResp.result;
                break;
              }
              await refreshLoadingCopy(status || 'PENDING', true);
            }

            if (!completedResult) {
              finishOverlay();
              await moodleAlert(title, errTimeout);
              return;
            }

            finishOverlay();
            api.close();
            await openResultDialog(editor, completedResult, {
              hasSelection: Boolean(selectionText?.trim()),
              purpose: 'videogen',
              requestItemId: draftItemId,
            });
            return;
          }

          if (isNative && (resp.code === 202 || resp.code === 200) && !startPayload?.job_id
              && !(Array.isArray(startPayload?.media) && startPayload.media.length)) {
            finishOverlay();
            await moodleAlert(title, errJobMissing);
            return;
          }

          if (resp.code !== 200) {
            finishOverlay();
            await moodleAlert(title, extractErrorMessage(resp));
            return;
          }

          finishOverlay();
          api.close();
          await openResultDialog(editor, resp.result, {
            hasSelection: Boolean(selectionText?.trim()),
            purpose: 'videogen',
            requestItemId: draftItemId,
          });
        } catch (e) {
          finishOverlay();
          await moodleAlert(title, e?.message || String(e));
        }
      })();
    },
  };
};
