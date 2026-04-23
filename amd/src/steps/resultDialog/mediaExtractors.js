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

const isAudioString = (s) => {
  const v = String(s || '').trim();
  if (!v) {return false;}
  if (v.startsWith('data:audio/')) {return true;}
  if (/^https?:\/\//i.test(v)) {return true;}
  return looksLikeBase64(v);
};

const isImageString = (s) => {
  const v = String(s || '').trim();
  if (!v) {return false;}
  if (v.startsWith('data:image/')) {return true;}
  if (/^https?:\/\//i.test(v)) {return true;}
  return looksLikeBase64(v);
};

const isVideoString = (s) => {
  const v = String(s || '').trim();
  if (!v) {return false;}
  if (v.startsWith('data:video/')) {return true;}
  if (/^https?:\/\//i.test(v)) {return true;}
  return looksLikeBase64(v);
};

const deepFindMedia = (node, kind, depth = 0) => {
  if (!node || depth > 8) {return { url: '', mime: '' };}

  if (typeof node === 'string') {
    const ok = kind === 'audio'
      ? isAudioString(node)
      : (kind === 'video' ? isVideoString(node) : isImageString(node));
    if (ok) {return { url: node, mime: '' };}
    const parsed = tryParseJson(node);
    if (parsed) {return deepFindMedia(parsed, kind, depth + 1);}
    return { url: '', mime: '' };
  }

  if (typeof node !== 'object') {return { url: '', mime: '' };}

  if (typeof node.url === 'string') {
    const ok = kind === 'audio'
      ? isAudioString(node.url)
      : (kind === 'video' ? isVideoString(node.url) : isImageString(node.url));
    if (ok) {return { url: node.url, mime: String(node.mime || node.mimetype || '') };}
  }

  const directKeys = kind === 'audio'
    ? ['audio', 'audioUrl', 'audioURL', 'audio_url', 'fileurl', 'fileUrl', 'drafturl',
      'draftUrl', 'playableUrl', 'outputText']
    : (kind === 'video'
      ? ['video', 'videoUrl', 'videoURL', 'video_url', 'generated_video', 'video_data',
         'videoData', 'data', 'src', 'video_base64', 'videoBase64', 'base64', 'fileurl',
         'fileUrl', 'drafturl', 'draftUrl', 'playableUrl', 'outputText']
      : ['image', 'imageUrl', 'imageURL', 'image_url', 'generated_image', 'image_data',
         'imageData', 'data', 'src', 'image_base64', 'imageBase64', 'base64', 'fileurl',
         'fileUrl', 'drafturl', 'draftUrl', 'playableUrl', 'outputText']);

  for (const k of directKeys) {
    if (typeof node[k] === 'string') {
      const ok = kind === 'audio'
        ? isAudioString(node[k])
        : (kind === 'video' ? isVideoString(node[k]) : isImageString(node[k]));
      if (ok) {return { url: node[k], mime: String(node.mime || node.mimetype || '') };}
    }
  }

  const media = Array.isArray(node.media) ? node.media : [];
  for (const m of media) {
    const t = String(m?.type || m?.kind || '').toLowerCase();
    const u = m?.url || m?.src || m?.href;
    if (!u || typeof u !== 'string') {continue;}
    if (kind === 'audio' && (t === 'audio' || t.includes('audio')) && isAudioString(u)) {
      return { url: u, mime: String(m?.mime || m?.mimetype || '') };
    }
    if (kind === 'video' && (t === 'video' || t.includes('video')) && isVideoString(u)) {
      return { url: u, mime: String(m?.mime || m?.mimetype || '') };
    }
    if (kind === 'image' && (t === 'image' || t.includes('image')) && isImageString(u)) {
      return { url: u, mime: String(m?.mime || m?.mimetype || '') };
    }
  }

  const childKeys = ['result', 'data', 'payload', 'response', 'content', 'output'];
  for (const k of childKeys) {
    if (node[k] !== undefined) {
      const found = deepFindMedia(node[k], kind, depth + 1);
      if (found.url) {return found;}
    }
  }

  for (const v of Object.values(node)) {
    const found = deepFindMedia(v, kind, depth + 1);
    if (found.url) {return found;}
  }

  return { url: '', mime: '' };
};

export const getAudioFromResult = (result) => deepFindMedia(result, 'audio');
export const getImageFromResult = (result) => deepFindMedia(result, 'image');
export const getVideoFromResult = (result) => deepFindMedia(result, 'video');
