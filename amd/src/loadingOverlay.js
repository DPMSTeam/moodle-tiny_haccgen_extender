import Templates from 'core/templates';
import { component } from './common';

const parseFirstElement = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ''), 'text/html');
  return doc.body.firstElementChild;
};

const renderOverlayElement = async (overlayClass, message) => {
  const rendered = await Templates.renderForPromise(
    `${component}/components/loading-overlay`,
    {
      overlayclass: overlayClass,
      message: String(message || ''),
    }
  );
  if (rendered.js) {
    Templates.runTemplateJS(rendered.js);
  }
  return parseFirstElement(rendered.html);
};

/**
 * Show a loading overlay (spinner + message) on the dialog when api.block is not available.
 * Use the returned function to remove the overlay when the request completes.
 * @param {Object} api - TinyMCE dialog API (must have getEl if block is not used).
 * @param {string} message - Message to show (e.g. "AI is generating…").
 * @returns {function()} removeLoadingOverlay - Call when done (success or error).
 */
export const showLoadingOverlay = (api, message) => {
  let cancelled = false;
  const removeLoadingOverlay = () => {
    cancelled = true;
    const overlay = api._dpLoadingOverlay;
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      api._dpLoadingOverlay = null;
    }
  };

  if (typeof api.block === 'function') {
    api.block(message);
    return removeLoadingOverlay;
  }

  const root = (typeof api.getEl === 'function' && api.getEl()) ||
    document.querySelector('.tox-dialog-wrap');
  if (root) {
    root.classList.add('dp-ai-loading-overlay-container');
    void renderOverlayElement('dp-ai-loading-overlay', message).then((overlay) => {
      if (cancelled || !overlay || !root.isConnected) {
        return;
      }
      root.appendChild(overlay);
      api._dpLoadingOverlay = overlay;
    }).catch(() => {
      // Ignore overlay rendering failures.
    });
  }
  return removeLoadingOverlay;
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
