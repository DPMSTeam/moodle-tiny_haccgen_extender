export const escapeHtml = (s) => {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  export const extractOutputText = (result) => {
    if (result === null || result === undefined) {return '';}
    if (typeof result === 'object') {
      if (typeof result.outputText === 'string') {return result.outputText;}
      if (typeof result.result === 'string') {return extractOutputText(result.result);}
      return JSON.stringify(result);
    }
    const s = String(result).trim();
    if (!s) {return '';}
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === 'object') {
        if (typeof obj.outputText === 'string'){ return obj.outputText;}
        if (typeof obj.result === 'string') {return extractOutputText(obj.result);}
      }
    } catch {}
    const m = s.match(/["']?outputText["']?\s*:\s*["']([\s\S]*?)["']\s*(?:,|})/);
    if (m && m[1] !== null && m[1] !== undefined) {
      return String(m[1])
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
    }
    return s;
  };
  /**
   * Strips echoed metadata lines from translate API response (e.g. 目的:, 选项:, 输入:, PURPOSE:, OPTIONS:, INPUT:).
   * @param {string} text Raw output that may include metadata lines.
   * @returns {string} Text with metadata lines removed.
   */
  export const stripTranslateMetadata = (text) => {
    if (text === null || text === undefined || typeof text !== 'string') { return ''; }
    const meta = /^\s*(目的|选项|输入|PURPOSE|OPTIONS|INPUT)\s*[:：]\s*.*$/gm;
    return String(text).replace(meta, '').replace(/\n{3,}/g, '\n\n').trim();
  };

  export const normalizeResult = (result) => {
    if (result === null || result === undefined) {return { purpose: '', outputText: '' };}
    let purpose = '';
    let outputText = '';
    if (typeof result === 'object') {
      purpose = String(result.purpose || '');
      outputText = typeof result.outputText === 'string' ? result.outputText : extractOutputText(result);
    } else {
      const s = String(result).trim();
      if (!s) {return { purpose: '', outputText: '' };}
      try {
        const obj = JSON.parse(s);
        purpose = String(obj.purpose || '');
        outputText = typeof obj.outputText === 'string' ? obj.outputText : extractOutputText(obj);
      } catch {
        return { purpose: '', outputText: extractOutputText(s) };
      }
    }
    if (purpose === 'translate' && typeof outputText === 'string' && outputText.length > 0) {
      outputText = stripTranslateMetadata(outputText);
    }
    return { purpose, outputText };
  };
  export const looksLikeBase64 = (s) => {
    const v = String(s || '').trim();
    if (!v || v.length < 32) {return false;}
    if (v.startsWith('data:')) {return false;}
    if (/^https?:\/\//i.test(v)) {return false;}
    return /^[A-Za-z0-9+/=\s]+$/.test(v);
  };
  export const ensureDataUrl = (maybeUrlOrBase64, mimeFallback) => {
    const v = String(maybeUrlOrBase64 || '').trim();
    if (!v) {return '';}
    if (/^data:/i.test(v)) {return v;}
    if (/^https?:\/\//i.test(v)) {return v;}
    if (looksLikeBase64(v)) {return `data:${mimeFallback};base64,${v.replace(/\s+/g, '')}`;}
    return v;
  };
  export const parseDataUrl = (dataUrl) => {
    const v = String(dataUrl || '').trim();
    const m = v.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!m) {return null;}
    return { mime: m[1], b64: m[2] };
  };
  export const dataUrlToBlob = (dataUrl) => {
    const p = parseDataUrl(dataUrl);
    if (!p) {return null;}
    const bin = atob(p.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {bytes[i] = bin.charCodeAt(i);}
    return new Blob([bytes], { type: p.mime });
  };
  export const extFromMime = (mime) => {
    const m = String(mime || '').toLowerCase();
    if (m.includes('ogg')) {return 'ogg';}
    if (m.includes('wav')) {return 'wav';}
    if (m.includes('m4a') || m.includes('mp4')) {return 'm4a';}
    if (m.includes('mpeg') || m.includes('mp3')) {return 'mp3';}
    if (m.includes('png')) {return 'png';}
    if (m.includes('jpeg') || m.includes('jpg')) {return 'jpg';}
    if (m.includes('webp')) {return 'webp';}
    return 'bin';
  };
  /**
   * Converts plain text (with markdown-like patterns) to safe HTML for editor insertion.
   * Handles paragraphs, bullet/numbered lists, headings, and **bold** / *italic*.
   * @param {string} text Plain text to convert.
   * @returns {string} Safe HTML string.
   */
export const textToHtml = (text) => {
  if (text === null || text === undefined || typeof text !== 'string') {
    return '';
  }
  const s = String(text).trim();
  if (!s) {
    return '';
  }
  const esc = escapeHtml;
  const blocks = s.split(/\n\n+/);
  const out = [];

  const inlineFormat = (str) => {
    let t = str
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>');
    return t;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) {
      continue;
    }
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length === 0) {
      continue;
    }

    const first = lines[0];
    const allNumbered = lines.every((line) => /^\d+\.\s+/.test(line));
    const allBullet = lines.every((line) => /^[-*•]\s*/.test(line));

    if (allNumbered) {
      const items = lines.map((line) => {
        const content = line.replace(/^\d+\.\s+/, '');
        return '<li>' + inlineFormat(esc(content)) + '</li>';
      });
      out.push('<ol>' + items.join('') + '</ol>');
      continue;
    }
    if (allBullet) {
      const items = lines.map((line) => {
        const content = line.replace(/^[-*•]\s*/, '');
        return '<li>' + inlineFormat(esc(content)) + '</li>';
      });
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }

    if (lines.length === 1) {
      const hMatch = first.match(/^(#{1,6})\s+(.+)$/);
      if (hMatch) {
        const level = Math.min(6, hMatch[1].length);
        const inner = esc(hMatch[2].trim());
        out.push('<h' + level + '>' + inner + '</h' + level + '>');
        continue;
      }
    }

    const paraContent = block.split('\n').map((line) => inlineFormat(esc(line))).join('<br>');
    out.push('<p>' + paraContent + '</p>');
  }

  return out.length ? out.join('') : '<p>' + inlineFormat(esc(s.replace(/\n/g, ' '))) + '</p>';
};

export const copyToClipboard = async (text) => {
    if (!text) {return;}
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };