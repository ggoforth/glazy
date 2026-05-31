// src/index.js
import { DonutRenderer } from './DonutRenderer.js';
import { autoInit as _autoInit } from './autoInit.js';
import { presets } from './presets.js';

export const version = '0.1.0';
export { DonutRenderer, presets };

// Bind the default factory so callers just pass a selector.
export function autoInit(selector = '[data-donut]', options = {}) {
  return _autoInit(selector, (el, dataOpts) => new DonutRenderer(el, { ...options, ...dataOpts }));
}

// In the bundled UMD/IIFE build, auto-init on DOMContentLoaded for no-build sites.
if (typeof document !== 'undefined') {
  const run = () => autoInit();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  // Note: in real pages THREE must be loaded first; resolveThree no-ops gracefully otherwise.
}
