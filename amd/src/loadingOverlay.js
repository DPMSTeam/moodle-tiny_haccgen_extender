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
 * Loading overlay rendering helpers.
 *
 * @module tiny_haccgen_extender/loadingOverlay
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import { component } from './common';

const parseFirstElement = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ''), 'text/html');
  return doc.body.firstElementChild;
};

const renderOverlayElement = async (overlayClass, message, detail = '') => {
  const rendered = await Templates.renderForPromise(
    `${component}/components/loading-overlay`,
    {
      overlayclass: overlayClass,
      message: String(message || ''),
      detail: String(detail || ''),
      hasdetail: Boolean(detail),
    }
  );
  if (rendered.js) {
    Templates.runTemplateJS(rendered.js);
  }
  return parseFirstElement(rendered.html);
};

const setOverlayText = (overlay, message, detail = '') => {
  if (!overlay) {
    return;
  }
  const msgEl = overlay.querySelector('.dp-ai-loading-overlay-message');
  if (msgEl) {
    msgEl.textContent = String(message || '');
  }
  let detailEl = overlay.querySelector('.dp-ai-loading-overlay-detail');
  const detailText = String(detail || '');
  if (detailText) {
    if (!detailEl) {
      detailEl = document.createElement('p');
      detailEl.className = 'dp-ai-loading-overlay-detail';
      overlay.appendChild(detailEl);
    }
    detailEl.textContent = detailText;
    detailEl.hidden = false;
  } else if (detailEl) {
    detailEl.textContent = '';
    detailEl.hidden = true;
  }
};

/**
 * Show a loading overlay (spinner + message) on the dialog when api.block is not available.
 * Use the returned helpers to update or remove the overlay.
 * @param {Object} api - TinyMCE dialog API (must have getEl if block is not used).
 * @param {string} message - Message to show (e.g. "AI is generating…").
 * @param {string} [detail] - Optional secondary guidance text.
 * @returns {{remove: function(), update: function(string, string=): void}}
 */
export const showLoadingOverlay = (api, message, detail = '') => {
  let cancelled = false;
  const usesBlock = typeof api.block === 'function';
  let overlayRoot = null;

  const remove = () => {
    cancelled = true;
    const overlay = api._dpLoadingOverlay;
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    api._dpLoadingOverlay = null;
    if (overlayRoot) {
      overlayRoot.classList.remove('dp-ai-loading-overlay-container');
    }
  };

  const update = (nextMessage, nextDetail = '') => {
    if (cancelled) {
      return;
    }
    const msg = String(nextMessage || '');
    const det = String(nextDetail || '');
    setOverlayText(api._dpLoadingOverlay, msg, det);
  };

  // Keep TinyMCE's dialog controls disabled while the request is running.
  // Its native busy layer is covered by our consistently positioned overlay.
  if (usesBlock) {
    api.block('');
  }

  const apiEl = typeof api.getEl === 'function' ? api.getEl() : null;
  const dialogs = document.querySelectorAll('.tox-dialog');
  const root = (apiEl && apiEl.classList?.contains('tox-dialog') ? apiEl : null) ||
    (apiEl && typeof apiEl.closest === 'function' ? apiEl.closest('.tox-dialog') : null) ||
    (apiEl && typeof apiEl.querySelector === 'function' ? apiEl.querySelector('.tox-dialog') : null) ||
    (dialogs.length ? dialogs[dialogs.length - 1] : null);
  if (root) {
    overlayRoot = root;
    root.classList.add('dp-ai-loading-overlay-container');
    void renderOverlayElement('dp-ai-loading-overlay', message, detail).then((overlay) => {
      if (cancelled || !overlay || !root.isConnected) {
        return;
      }
      root.appendChild(overlay);
      api._dpLoadingOverlay = overlay;
    }).catch(() => {
      // Ignore overlay rendering failures.
    });
  }
  remove.update = update;
  return remove;
};

/**
 * Full-viewport loading overlay while no TinyMCE dialog is open (e.g. step1 closed, step2 not ready).
 * @param {string} message - Short status text.
 * @returns {function()} removeGlobalLoadingOverlay
 */
export const showGlobalLoadingOverlay = (message) => {
  let overlay = null;
  let cancelled = false;
  void renderOverlayElement('dp-ai-global-loading-overlay', message).then((element) => {
    if (cancelled || !element || !document.body) {
      return;
    }
    overlay = element;
    document.body.appendChild(overlay);
  }).catch(() => {
    // Ignore overlay rendering failures.
  });

  return () => {
    cancelled = true;
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
};
