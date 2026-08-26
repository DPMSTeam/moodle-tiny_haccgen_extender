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
 * Parse and rebuild CSS-only interactive HTML widgets.
 *
 * @module tiny_haccgen_extender/steps/interactiveHtmlModel
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {escapeHtml, wrapInteractiveHtml} from './resultDialog/utils';

export const DETAILS_TYPES = ['accordion', 'faq', 'glossary', 'spoiler'];
export const CHILD_BLOCK_TYPES = ['cards', 'comparison', 'callouts', 'timeline', 'steps'];
export const TITLE_ONLY_TYPES = ['checklist'];

const PREVIEW_CSS =
  'html,body{margin:0;padding:12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;' +
  'background:#fff;color:#102a43;}' +
  '.dp-ai-interactive{max-width:100%}' +
  'details{margin:0 0 8px;border:1px solid rgba(16,42,67,.14);border-radius:10px;overflow:hidden}' +
  'summary{cursor:pointer;padding:10px 12px;font-weight:700}' +
  'details[open] summary{border-bottom:1px solid rgba(16,42,67,.1)}' +
  'details > *:not(summary){padding:10px 12px}' +
  '.dp-ai-interactive--tabs input[type=radio]{position:absolute;width:1px;height:1px;opacity:0;clip:rect(0,0,0,0)}' +
  '.dp-ai-interactive--tabs input[type=radio]+label{display:inline-block;margin:0 6px 8px 0;padding:8px 12px;' +
  'border-radius:8px;border:1px solid rgba(16,42,67,.14);cursor:pointer}' +
  '.dp-ai-interactive--tabs input[type=radio]:checked+label{font-weight:700;border-color:rgba(15,108,191,.65);' +
  'background:rgba(15,108,191,.08)}' +
  '.dp-ai-interactive--tabs input[type=radio]+label+*{display:none;margin:0 0 12px;padding:10px 12px;' +
  'border:1px solid rgba(16,42,67,.12);border-radius:10px}' +
  '.dp-ai-interactive--tabs input[type=radio]:checked+label+*{display:block}' +
  '.dp-ai-interactive--timeline{border-left:3px solid rgba(15,108,191,.35);padding-left:16px}' +
  '.dp-ai-interactive--comparison,.dp-ai-interactive--cards{display:grid;' +
  'grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}' +
  '.dp-ai-interactive--comparison>*,.dp-ai-interactive--cards>*{border:1px solid rgba(16,42,67,.14);' +
  'border-radius:10px;padding:12px}' +
  '.dp-ai-interactive--callouts>*{margin:0 0 10px;padding:12px;border-radius:10px;' +
  'border-left:4px solid rgba(15,108,191,.65);background:rgba(15,108,191,.06)}' +
  '.dp-ai-interactive--checklist label{display:flex;align-items:flex-start;gap:8px;margin:0 0 8px}' +
  '.dp-ai-interactive--quiz>*{margin:0 0 12px;padding:12px;border:1px solid rgba(16,42,67,.14);border-radius:10px}';

const uniquePrefix = () => 'dpei-' + Math.random().toString(36).slice(2, 8);

export const detectInteractiveType = (htmlOrClass) => {
  const m = String(htmlOrClass || '').match(/dp-ai-interactive--([a-z0-9_-]+)/i);
  return (m && m[1]) ? m[1].toLowerCase() : 'accordion';
};

const parseDoc = (html) => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
};

const wrapperChildren = (root) => {
  return [...root.children].filter((el) => String(el.tagName).toLowerCase() !== 'style');
};

const splitTitleBody = (el) => {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const clone = el.cloneNode(true);
    const clonedHeading = clone.querySelector('h1, h2, h3, h4, h5, h6');
    if (clonedHeading) {
      clonedHeading.remove();
    }
    return {
      title: heading.textContent.trim(),
      body: clone.innerHTML.trim(),
    };
  }
  const strong = el.querySelector(':scope > strong, :scope > b, :scope > p > strong, :scope > p > b');
  if (strong && strong.textContent.trim()) {
    const clone = el.cloneNode(true);
    const first = clone.querySelector('strong, b');
    if (first) {
      first.remove();
    }
    return {
      title: strong.textContent.trim(),
      body: clone.innerHTML.trim(),
    };
  }
  return {title: '', body: el.innerHTML.trim()};
};

const parseDetails = (root) => {
  let items = [];
  try {
    items = [...root.querySelectorAll(':scope > details')];
  } catch (e) {
    items = [];
  }
  if (!items.length) {
    items = [...root.querySelectorAll('details')].filter((el) => !el.parentElement || !el.parentElement.closest('details'));
  }
  return items.map((el) => {
    const summary = el.querySelector('summary');
    const clone = el.cloneNode(true);
    const clonedSummary = clone.querySelector('summary');
    if (clonedSummary) {
      clonedSummary.remove();
    }
    return {
      title: summary ? summary.textContent.trim() : '',
      body: clone.innerHTML.trim(),
    };
  });
};

const parseTabs = (root) => {
  const radios = [...root.querySelectorAll('input[type="radio"]')];
  return radios.map((radio) => {
    const id = String(radio.getAttribute('id') || '');
    let label = null;
    if (id) {
      try {
        label = root.querySelector('label[for="' + id.replace(/"/g, '') + '"]');
      } catch (e) {
        label = null;
      }
    }
    if (!label && radio.nextElementSibling && radio.nextElementSibling.tagName === 'LABEL') {
      label = radio.nextElementSibling;
    }
    let panel = label ? label.nextElementSibling : null;
    while (panel && (panel.tagName === 'INPUT' || panel.tagName === 'LABEL' || panel.tagName === 'STYLE')) {
      panel = panel.nextElementSibling;
    }
    return {
      title: label ? label.textContent.trim() : '',
      body: panel ? panel.innerHTML.trim() : '',
    };
  });
};

const parseChecklist = (root) => {
  return [...root.querySelectorAll(':scope > label')].map((label) => {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('input').forEach((input) => input.remove());
    return {
      title: clone.textContent.replace(/\s+/g, ' ').trim(),
      body: '',
    };
  });
};

/**
 * @param {string} html
 * @param {string} [fallbackType]
 * @returns {{type: string, styleHtml: string, sections: Array<{title: string, body: string}>, mode: string, rawHtml: string}}
 */
export const parseInteractiveHtml = (html, fallbackType = 'accordion') => {
  const raw = String(html || '').trim();
  const typeFromHtml = detectInteractiveType(raw);
  const type = typeFromHtml || fallbackType || 'accordion';
  const empty = {
    type,
    styleHtml: '',
    sections: [{title: '', body: ''}],
    mode: 'sections',
    rawHtml: raw,
  };
  const doc = parseDoc(raw);
  if (!doc) {
    empty.mode = 'raw';
    empty.sections = [];
    return empty;
  }
  const root = doc.querySelector('.dp-ai-interactive') || doc.body;
  const styleEl = root.querySelector('style');
  const styleHtml = styleEl ? styleEl.outerHTML : '';
  let sections = [];

  if (DETAILS_TYPES.includes(type) || root.querySelector(':scope > details')) {
    sections = parseDetails(root);
  } else if (type === 'tabs' || root.querySelector(':scope > input[type="radio"]')) {
    sections = parseTabs(root);
  } else if (type === 'checklist' || root.querySelector(':scope > label > input[type="checkbox"]')) {
    sections = parseChecklist(root);
  } else if (type === 'quiz') {
    sections = wrapperChildren(root).map((el, idx) => {
      const heading = el.querySelector('h1, h2, h3, h4, p');
      return {
        title: heading ? heading.textContent.trim() : ('Question ' + (idx + 1)),
        body: el.innerHTML.trim(),
      };
    });
  } else if (CHILD_BLOCK_TYPES.includes(type) || wrapperChildren(root).length) {
    sections = wrapperChildren(root).map((el) => splitTitleBody(el));
  }

  if (!sections.length) {
    return {
      type,
      styleHtml,
      sections: [],
      mode: 'raw',
      rawHtml: (root.classList && root.classList.contains('dp-ai-interactive')) ? root.outerHTML : raw,
    };
  }
  return {
    type,
    styleHtml,
    sections,
    mode: 'sections',
    rawHtml: (root.classList && root.classList.contains('dp-ai-interactive')) ? root.outerHTML : raw,
  };
};

/**
 * @param {{type: string, styleHtml: string, sections: Array<{title: string, body: string}>, mode: string, rawHtml: string}} model
 * @returns {string}
 */
export const serializeInteractiveHtml = (model) => {
  const type = String(model?.type || 'accordion').toLowerCase();
  if (model?.mode === 'raw') {
    return wrapInteractiveHtml(model.rawHtml || '', type);
  }
  const sections = Array.isArray(model.sections) ? model.sections : [];
  const filled = sections.filter((s) => String(s.title || '').trim() || String(s.body || '').trim());
  const style = model.styleHtml || '';
  const prefix = uniquePrefix();
  let inner = '';

  if (DETAILS_TYPES.includes(type)) {
    inner = filled.map((s) => {
      const title = escapeHtml(String(s.title || '').trim() || 'Section');
      return `<details><summary>${title}</summary>${s.body || ''}</details>`;
    }).join('');
  } else if (type === 'tabs') {
    inner = filled.map((s, i) => {
      const id = `${prefix}-${i}`;
      const checked = i === 0 ? ' checked="checked"' : '';
      const title = escapeHtml(String(s.title || '').trim() || ('Tab ' + (i + 1)));
      return `<input type="radio" name="${prefix}" id="${id}"${checked} />` +
        `<label for="${id}">${title}</label>` +
        `<div>${s.body || ''}</div>`;
    }).join('');
  } else if (type === 'checklist') {
    inner = filled.map((s) => {
      const title = escapeHtml(String(s.title || '').trim() || 'Item');
      return `<label><input type="checkbox" /> ${title}</label>`;
    }).join('');
  } else if (type === 'quiz') {
    inner = filled.map((s, i) => {
      if (s.body && /<[a-z][\s\S]*>/i.test(s.body)) {
        return s.body;
      }
      const title = escapeHtml(String(s.title || '').trim() || ('Question ' + (i + 1)));
      return `<div><h3>${title}</h3>${s.body || ''}</div>`;
    }).join('');
  } else {
    inner = filled.map((s, i) => {
      const title = String(s.title || '').trim();
      const heading = title ? `<h3>${escapeHtml(title)}</h3>` : '';
      return `<div>${heading}${s.body || ''}</div>`;
    }).join('');
  }

  return `<div class="dp-ai-interactive dp-ai-interactive--${type}">${style}${inner}</div>`;
};

/**
 * @param {string} html
 * @returns {string} data URL for iframe preview
 */
export const buildInteractivePreviewSrc = (html) => {
  const fragment = String(html || '').trim() || '<p></p>';
  const doc =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Interactive preview</title><style>' + PREVIEW_CSS + '</style></head><body>' +
    fragment +
    '</body></html>';
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(doc);
};

export const usesBodyField = (type) => !TITLE_ONLY_TYPES.includes(String(type || ''));
