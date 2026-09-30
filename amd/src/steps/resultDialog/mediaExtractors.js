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
 * Media extraction helpers for result payloads.
 *
 * @module tiny_haccgen_extender/steps/resultDialog/mediaExtractors
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { looksLikeBase64 } from './utils';

const tryParseJson = (v) => {
  try { return JSON.parse(v); } catch { return null; }
};

const MEDIA_EXTENSIONS = {
  audio: ['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav'],
  image: ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'],
  video: ['avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm'],
};

const SEMANTIC_KEYS = {
  audio: [
    'audio',
    'audioUrl',
    'audioURL',
    'audio_url',
    'audioData',
    'audio_data',
    'audioBase64',
    'audio_base64',
    'generated_audio',
  ],
  image: [
    'image',
    'imageUrl',
    'imageURL',
    'image_url',
    'imageData',
    'image_data',
    'imageBase64',
    'image_base64',
    'generated_image',
  ],
  video: [
    'video',
    'videoUrl',
    'videoURL',
    'video_url',
    'videoData',
    'video_data',
    'videoBase64',
    'video_base64',
    'generated_video',
    'rendered_video',
  ],
};

const GENERIC_URL_KEYS = [
  'url',
  'src',
  'href',
  'fileurl',
  'fileUrl',
  'drafturl',
  'draftUrl',
  'playableUrl',
  'outputText',
];

const WRAPPER_KEYS = ['result', 'data', 'payload', 'response', 'content', 'output'];

const normalizeDeclaredType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  for (const kind of ['audio', 'video', 'image']) {
    if (type === kind || type.includes(kind)) {
      return kind;
    }
  }
  return '';
};

const kindFromMime = (mime) => {
  const normalized = String(mime || '').trim().toLowerCase();
  if (normalized.startsWith('audio/')) {
    return 'audio';
  }
  if (normalized.startsWith('video/')) {
    return 'video';
  }
  if (normalized.startsWith('image/')) {
    return 'image';
  }
  return '';
};

const extensionFromUrl = (value) => {
  const clean = String(value || '').trim().split(/[?#]/, 1)[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
};

const kindFromValue = (value, mime = '') => {
  const mimeKind = kindFromMime(mime);
  if (mimeKind) {
    return mimeKind;
  }
  const dataMatch = String(value || '').trim().match(/^data:([^;,]+)/i);
  const dataKind = dataMatch ? kindFromMime(dataMatch[1]) : '';
  if (dataKind) {
    return dataKind;
  }
  const extension = extensionFromUrl(value);
  return Object.keys(MEDIA_EXTENSIONS).find((kind) => MEDIA_EXTENSIONS[kind].includes(extension)) || '';
};

const inferredMime = (value, kind) => {
  const dataMatch = String(value || '').trim().match(/^data:([^;,]+)/i);
  if (dataMatch) {
    return dataMatch[1];
  }
  const extension = extensionFromUrl(value);
  const map = {
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    oga: 'audio/ogg',
    ogg: kind === 'video' ? 'video/ogg' : 'audio/ogg',
    opus: 'audio/ogg',
    wav: 'audio/wav',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    mp4: 'video/mp4',
    ogv: 'video/ogg',
    webm: kind === 'audio' ? 'audio/webm' : 'video/webm',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  };
  return map[extension] || '';
};

const mediaCandidate = (value, node, kind, semantic, score) => {
  const url = String(value || '').trim();
  if (!url) {
    return null;
  }
  const mime = String(node?.mime || node?.mimetype || node?.mimeType || '').trim();
  const declared = normalizeDeclaredType(node?.type || node?.kind || node?.mediaType);
  const detected = kindFromValue(url, mime);
  if ((declared && declared !== kind) || (detected && detected !== kind)) {
    return null;
  }
  const isTransport = /^https?:\/\//i.test(url) || /^data:/i.test(url) || looksLikeBase64(url);
  const hasTypeEvidence = semantic || declared === kind || detected === kind;
  if (!isTransport || !hasTypeEvidence) {
    return null;
  }
  return {
    url,
    mime: mime || inferredMime(url, kind),
    score: score + (declared === kind ? 20 : 0) + (detected === kind ? 10 : 0),
  };
};

const deepFindMedia = (root, kind) => {
  const candidates = [];
  const visited = new WeakSet();

  const addCandidate = (value, node, semantic, score) => {
    const candidate = mediaCandidate(value, node, kind, semantic, score);
    if (candidate) {
      candidates.push(candidate);
    }
  };

  const visit = (node, depth = 0, semantic = false, score = 0) => {
    if (node === null || node === undefined || depth > 10) {
      return;
    }
    if (typeof node === 'string') {
      const parsed = tryParseJson(node);
      if (parsed !== null && parsed !== node) {
        visit(parsed, depth + 1, semantic, score);
      } else {
        addCandidate(node, {}, semantic, score);
      }
      return;
    }
    if (typeof node !== 'object') {
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1, semantic, score));
      return;
    }

    const declared = normalizeDeclaredType(node.type || node.kind || node.mediaType);
    const nodeIsSemantic = semantic || declared === kind;
    GENERIC_URL_KEYS.forEach((key) => {
      if (typeof node[key] === 'string') {
        const parsed = tryParseJson(node[key]);
        if (parsed !== null && parsed !== node[key]) {
          visit(parsed, depth + 1, false, score + 10);
        } else {
          addCandidate(node[key], node, nodeIsSemantic, score + (declared === kind ? 100 : 30));
        }
      }
    });

    SEMANTIC_KEYS[kind].forEach((key) => {
      if (node[key] === undefined) {
        return;
      }
      if (typeof node[key] === 'string') {
        const parsed = tryParseJson(node[key]);
        if (parsed !== null && parsed !== node[key]) {
          visit(parsed, depth + 1, true, score + 80);
        } else {
          addCandidate(node[key], node, true, score + 80);
        }
      } else {
        visit(node[key], depth + 1, true, score + 80);
      }
    });

    const handled = new Set([...GENERIC_URL_KEYS, ...SEMANTIC_KEYS[kind]]);
    WRAPPER_KEYS.forEach((key) => {
      if (node[key] !== undefined && !handled.has(key)) {
        handled.add(key);
        visit(node[key], depth + 1, false, score + 10);
      }
    });
    Object.entries(node).forEach(([key, value]) => {
      if (!handled.has(key) && key !== 'tracks') {
        visit(value, depth + 1, false, score);
      }
    });
  };

  visit(root);
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best ? { url: best.url, mime: best.mime } : { url: '', mime: '' };
};

export const getAudioFromResult = (result) => deepFindMedia(result, 'audio');
export const getImageFromResult = (result) => deepFindMedia(result, 'image');
export const getVideoFromResult = (result) => deepFindMedia(result, 'video');

const normalizeTrackNode = (node, semantic = false) => {
  const value = typeof node === 'string' ? {url: node} : node;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const url = String(value.url || value.src || value.href || '').trim();
  const type = String(value.type || value.kind || '').toLowerCase();
  const mime = String(value.mime || value.mimetype || value.mimeType || '').trim();
  const extension = extensionFromUrl(url);
  const isTrackType = /caption|subtitle|track/.test(type);
  const isTrackMime = /vtt|subrip|\bsrt\b/i.test(mime);
  const isTrackExtension = extension === 'vtt' || extension === 'srt';
  const isUrl = /^https?:\/\//i.test(url) || /^data:text\//i.test(url);
  if (!url || !isUrl || (!semantic && !isTrackType && !isTrackMime && !isTrackExtension)) {
    return null;
  }
  return {
    kind: /subtitle/.test(type) ? 'subtitles' : 'captions',
    url,
    mime: mime || (extension === 'srt' ? 'application/x-subrip' : 'text/vtt'),
    srclang: String(value.srclang || value.lang || 'en'),
    label: String(value.label || 'Captions'),
    default: Boolean(value.default),
  };
};

/**
 * Extract caption/subtitle tracks bundled with a native video result.
 *
 * @param {*} result API response payload.
 * @returns {Array<{kind:string,url:string,mime:string,srclang:string,label:string,default:boolean}>}
 */
export const getVideoTracksFromResult = (result) => {
  const tracks = [];
  const visited = new WeakSet();
  const trackKeys = ['tracks', 'captionTracks', 'caption_tracks', 'subtitles', 'subtitleTracks'];

  const addTrack = (node, semantic = false) => {
    const normalized = normalizeTrackNode(node, semantic);
    if (normalized && !tracks.some((track) => track.url === normalized.url)) {
      tracks.push(normalized);
    }
  };

  const visit = (node, depth = 0, semantic = false) => {
    if (node === null || node === undefined || depth > 10) {
      return;
    }
    if (typeof node === 'string') {
      const parsed = tryParseJson(node);
      if (parsed !== null && parsed !== node) {
        visit(parsed, depth + 1, semantic);
      }
      return;
    }
    if (typeof node !== 'object') {
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1, semantic));
      return;
    }

    const type = String(node.type || node.kind || '').toLowerCase();
    if (semantic || /caption|subtitle|track/.test(type)) {
      addTrack(node, semantic);
    }
    const handled = new Set();
    trackKeys.forEach((key) => {
      if (node[key] !== undefined) {
        handled.add(key);
        const values = Array.isArray(node[key]) ? node[key] : [node[key]];
        values.forEach((item) => {
          addTrack(item, true);
          visit(item, depth + 1, true);
        });
      }
    });
    Object.entries(node).forEach(([key, value]) => {
      if (!handled.has(key)) {
        visit(value, depth + 1, false);
      }
    });
  };

  visit(result);
  return tracks;
};
