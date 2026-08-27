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

const OPT_CACHE_KEY = 'dp_ai_videogen_opts_v9';
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

const DEFAULT_NATIVE_OPTIONS = {
  provider: 'native_video',
  use_storyboard: [
    {
      id: 'true',
      name: 'AI storyboard (writes script, scenes, and image prompts from your topic)',
    },
    {
      id: 'false',
      name: 'Use my narration / Transcribe and Prompt (uses your text for video generation only)',
    },
  ],
  race: [
    { id: '', name: 'Default' },
    { id: 'Indian', name: 'Indian' },
    { id: 'any_other', name: 'Other' },
  ],
  image_source: [
    { id: '', name: 'Default' },
    { id: 'pexels', name: 'Stock Library' },
    { id: 'llm', name: 'AI-generated only' },
  ],
  voice_gender: [
    { id: '', name: 'Default' },
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' },
  ],
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

const renderFieldHelpBlock = async (label, helpText, fieldName) => {
  const render = await Templates.renderForPromise(
    'tiny_haccgen_extender/components/inline-help-icon',
    {
      label,
      helptitle: label,
      helptext: helpText || '',
      hashelp: Boolean(helpText),
      fieldname: fieldName || '',
    }
  );
  if (render.js) {
    Templates.runTemplateJS(render.js);
  }
  return render.html;
};

const getLatestDialogRoot = () => {
  const dialogs = document.querySelectorAll('.tox-dialog');
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
};

const setFieldVisible = (fieldName, visible) => {
  const dialog = getLatestDialogRoot();
  if (!dialog || !fieldName) {
    return;
  }
  const escaped = (window.CSS && typeof window.CSS.escape === 'function')
    ? window.CSS.escape(fieldName)
    : fieldName;
  const block = dialog.querySelector(`.dp-ai-x-field--${escaped}`)
    || dialog.querySelector(`[data-field="${escaped}"]`);
  if (!block) {
    return;
  }
  const labelGroup = block.closest('.tox-form__group') || block.parentElement;
  const inputGroup = labelGroup?.nextElementSibling;
  [block, labelGroup, inputGroup].forEach((el) => {
    if (!el) {
      return;
    }
    el.classList.toggle('dp-ai-x-field-hidden', !visible);
  });
};

/**
 * Show or hide native-provider fields that do not apply to the current mode.
 *
 * Additional context is only used with AI storyboard. Race and image style
 * do not apply when scene images come from Pexels stock.
 *
 * @param {Object} api TinyMCE dialog API.
 * @param {Object} data Current dialog data.
 */
const applyNativeFieldConstraints = (api, data) => {
  const useMyNarration = String(data.use_storyboard) === 'false';
  setFieldVisible('additional_prompt', !useMyNarration);

  const isPexels = data.image_source === 'pexels';
  const isAiOnly = data.image_source === 'llm';
  setFieldVisible('race', !isPexels);
  setFieldVisible('external_details_prompt', !isPexels);

  const nextData = { ...data };
  let changed = false;

  if (useMyNarration && (data.additional_prompt || '').trim() !== '') {
    nextData.additional_prompt = '';
    changed = true;
  }
  if (isPexels) {
    if (nextData.race !== '') {
      nextData.race = '';
      changed = true;
    }
    if (nextData.external_details_prompt !== '') {
      nextData.external_details_prompt = '';
      changed = true;
    }
  } else if (isAiOnly && !nextData.external_details_prompt?.trim()) {
    nextData.external_details_prompt = 'Watercolor style';
    changed = true;
  }

  if (changed && typeof api.setData === 'function') {
    try {
      api.setData(nextData);
    } catch (e) {
      // Ignore until the dialog is fully mounted.
    }
  }
};

const closeDialogHelp = (dialogRoot) => {
  const root = dialogRoot || document;
  root.querySelectorAll('.dp-ai-x-help-popover').forEach((el) => {
    el.classList.remove('is-open');
    el.setAttribute('hidden', 'hidden');
  });
};

const toggleFieldHelp = (trigger) => {
  const block = trigger.closest('.dp-ai-x-field-help-block');
  const dialog = trigger.closest('.tox-dialog');
  const popover = block?.querySelector('.dp-ai-x-help-popover');
  if (!popover) {
    return;
  }
  const opening = !popover.classList.contains('is-open');
  if (dialog) {
    closeDialogHelp(dialog);
  }
  if (opening) {
    popover.classList.add('is-open');
    popover.removeAttribute('hidden');
  }
};

let helpListenerBound = false;

const ensureHelpClickListener = () => {
  if (helpListenerBound) {
    return;
  }
  helpListenerBound = true;

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('.dp-ai-x-inline-help');
    if (trigger && event.target.closest('.tox-dialog')) {
      event.preventDefault();
      event.stopPropagation();
      toggleFieldHelp(trigger);
      return;
    }
    if (!event.target.closest?.('.dp-ai-x-help-popover')) {
      closeDialogHelp();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    const trigger = event.target.closest?.('.dp-ai-x-inline-help');
    if (!trigger || !event.target.closest('.tox-dialog')) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    toggleFieldHelp(trigger);
  }, true);
};

/**
 * Field label row with Moodle help icon; help text opens in-dialog on click.
 *
 * @param {Object} field TinyMCE dialog field spec (must include name and label).
 * @param {string} helpHtml Pre-rendered help icon markup.
 * @returns {Object[]} Dialog body items for the label row and field.
 */
const fieldWithHelp = (field, helpHtml) => [
  {
    type: 'htmlpanel',
    presets: 'presentation',
    html: helpHtml || [
      `<div class="dp-ai-x-field-help-block dp-ai-x-field--${escapeHtml(field.name)}">`,
      `<span class="dp-ai-x-field-label-text">${escapeHtml(field.label)}</span>`,
      '</div>',
    ].join(''),
  },
  { ...field, label: '' },
];

const buildNativeFormItems = (labels, items, helpIcons) => [
  ...fieldWithHelp(
    {
      type: 'selectbox',
      name: 'use_storyboard',
      label: labels.fieldUseStoryboard,
      items: items.useStoryboard,
    },
    helpIcons.use_storyboard
  ),
  ...fieldWithHelp(
    {
      type: 'textarea',
      name: 'additional_prompt',
      label: labels.fieldAdditionalPrompt,
      placeholder: labels.placeholderAdditionalPrompt,
    },
    helpIcons.additional_prompt
  ),
  ...fieldWithHelp(
    {
      type: 'selectbox',
      name: 'voice_gender',
      label: labels.fieldVoiceGender,
      items: items.voiceGender,
    },
    helpIcons.voice_gender
  ),
  ...fieldWithHelp(
    {
      type: 'textarea',
      name: 'style_instructions',
      label: labels.fieldStyleInstructions,
      placeholder: labels.placeholderStyleInstructions,
    },
    helpIcons.style_instructions
  ),
  ...fieldWithHelp(
    {
      type: 'selectbox',
      name: 'image_source',
      label: labels.fieldImageSource,
      items: items.imageSource,
    },
    helpIcons.image_source
  ),
  ...fieldWithHelp(
    {
      type: 'selectbox',
      name: 'race',
      label: labels.fieldRace,
      items: items.race,
    },
    helpIcons.race
  ),
  ...fieldWithHelp(
    {
      type: 'textarea',
      name: 'external_details_prompt',
      label: labels.fieldExternalDetailsPrompt,
      placeholder: labels.placeholderExternalDetailsPrompt,
    },
    helpIcons.external_details_prompt
  ),
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
    helpVoiceGender,
    helpStyleInstructions,
    helpExternalDetailsPrompt,
    valueYes,
    valueNo,
  };

  let formItems;
  let nativeHelpIcons = {};
  if (isNative) {
    const [
      promptHelp,
      useStoryboardHelp,
      additionalPromptHelp,
      voiceGenderHelp,
      styleInstructionsHelp,
      imageSourceHelp,
      raceHelp,
      externalDetailsHelp,
    ] = await Promise.all([
      renderFieldHelpBlock(fieldPrompt, helpVideoPrompt, 'prompt'),
      renderFieldHelpBlock(fieldUseStoryboard, helpUseStoryboard, 'use_storyboard'),
      renderFieldHelpBlock(fieldAdditionalPrompt, helpAdditionalPrompt, 'additional_prompt'),
      renderFieldHelpBlock(fieldVoiceGender, helpVoiceGender, 'voice_gender'),
      renderFieldHelpBlock(fieldStyleInstructions, helpStyleInstructions, 'style_instructions'),
      renderFieldHelpBlock(fieldImageSource, helpImageSource, 'image_source'),
      renderFieldHelpBlock(fieldRace, helpRace, 'race'),
      renderFieldHelpBlock(
        fieldExternalDetailsPrompt,
        helpExternalDetailsPrompt,
        'external_details_prompt'
      ),
    ]);
    nativeHelpIcons = {
      prompt: promptHelp,
      use_storyboard: useStoryboardHelp,
      additional_prompt: additionalPromptHelp,
      voice_gender: voiceGenderHelp,
      style_instructions: styleInstructionsHelp,
      image_source: imageSourceHelp,
      race: raceHelp,
      external_details_prompt: externalDetailsHelp,
    };
    ensureHelpClickListener();
    formItems = buildNativeFormItems(labels, {
      useStoryboard: toSelectItems(nativeOpts.use_storyboard),
      race: toSelectItems(nativeOpts.race),
      imageSource: toSelectItems(nativeOpts.image_source),
      voiceGender: toSelectItems(nativeOpts.voice_gender),
    }, nativeHelpIcons);
  } else {
    formItems = buildLegacyFormItems(labels, {
      language: toSelectItems(legacyOpts.language),
      voiceId: toSelectItems(legacyOpts.voice_id),
      aspectRatios: toSelectItems(legacyOpts.aspect_ratios),
      outputFormat: toSelectItems(legacyOpts.output_format),
      fonts: toSelectItems(legacyOpts.fonts),
    });
  }

  const initialData = isNative
    ? {
      prompt: (selectionText || '').trim(),
      use_storyboard: nativeOpts.use_storyboard[0]?.id || 'true',
      additional_prompt: '',
      race: nativeOpts.race[0]?.id || '',
      image_source: 'llm',
      voice_gender: nativeOpts.voice_gender[0]?.id || '',
      style_instructions: '',
      external_details_prompt: 'Watercolor style',
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
        ...(isNative
          ? fieldWithHelp(
            {
              type: 'textarea',
              name: 'prompt',
              label: fieldPrompt,
              placeholder: placeholderNativePrompt,
            },
            nativeHelpIcons.prompt
          )
          : [{
            type: 'textarea',
            name: 'prompt',
            label: fieldPrompt,
            placeholder: placeholderVideoPrompt,
          }]),
        ...formItems,
      ],
    },

    initialData,

    buttons: [
      { type: 'cancel', text: btnCancel },
      { type: 'custom', name: 'generate', text: btnRun, primary: true },
    ],

    onOpen: (api) => {
      if (!isNative || !api) {
        return;
      }
      ensureHelpClickListener();
      applyNativeFieldConstraints(api, api.getData());
    },

    __dpAfterOpen: (api) => {
      if (!isNative) {
        return;
      }
      ensureHelpClickListener();
      if (api && typeof api.getData === 'function') {
        applyNativeFieldConstraints(api, api.getData());
      }
    },

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
          if (styleInstructions !== '') {
            nativePayload.style_instructions = styleInstructions;
          }
          if (externalDetailsPrompt !== '') {
            nativePayload.external_details_prompt = externalDetailsPrompt;
          }
          if (useStoryboard !== 'false' && additionalPrompt !== '') {
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
    onChange: (api, details) => {
      if (!isNative) {
        return;
      }
      if (details.name !== 'image_source' && details.name !== 'use_storyboard') {
        return;
      }
      applyNativeFieldConstraints(api, api.getData());
    },
  };
};
