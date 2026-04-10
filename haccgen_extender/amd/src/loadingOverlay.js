/**
 * Show a loading overlay (spinner + message) on the dialog when api.block is not available.
 * Use the returned function to remove the overlay when the request completes.
 * @param {Object} api - TinyMCE dialog API (must have getEl if block is not used).
 * @param {string} message - Message to show (e.g. "AI is generating…").
 * @returns {function()} removeLoadingOverlay - Call when done (success or error).
 */
export const showLoadingOverlay = (api, message) => {
  const removeLoadingOverlay = () => {
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
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.className = 'dp-ai-loading-overlay';
    overlay.style.cssText = `position:absolute;inset:0;background:rgba(255,255,255,.92);display:flex;
    flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:9999;border-radius:8px;`;
    overlay.innerHTML = `
      <div class="dp-ai-spinner" style="width:40px;
      height:40px;border:3px solid rgba(15,108,191,.2);border-top-color:#0f6cbf;border-radius:50%;
      animation:dp-ai-spin .8s linear infinite;"></div>
      <p style="margin:0;font-size:14px;font-weight:600;color:#102a43;">
      ${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes dp-ai-spin{to{transform:rotate(360deg)}}';
    overlay.appendChild(style);
    root.style.position = 'relative';
    root.appendChild(overlay);
    api._dpLoadingOverlay = overlay;
  }
  return removeLoadingOverlay;
};

/**
 * Full-viewport loading overlay while no TinyMCE dialog is open (e.g. step1 closed, step2 not ready).
 * @param {string} message - Short status text.
 * @returns {function()} removeGlobalLoadingOverlay
 */
export const showGlobalLoadingOverlay = (message) => {
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.className = 'dp-ai-global-loading-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(255,255,255,.88)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:12px',
    'z-index:200000',
  ].join(';');
  const esc = String(message || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  overlay.innerHTML = `
    <div class="dp-ai-spinner" style="width:40px;height:40px;border:3px solid rgba(15,108,191,.2);
    border-top-color:#0f6cbf;border-radius:50%;animation:dp-ai-global-spin .8s linear infinite;"></div>
    <p style="margin:0;font-size:14px;font-weight:600;color:#102a43;">${esc}</p>
  `;
  const style = document.createElement('style');
  style.textContent = '@keyframes dp-ai-global-spin{to{transform:rotate(360deg)}}';
  overlay.appendChild(style);
  document.body.appendChild(overlay);

  return () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
};
