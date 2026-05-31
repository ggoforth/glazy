// src/index.js
import { DonutRenderer } from './DonutRenderer.js';
import { autoInit as _autoInit } from './autoInit.js';
import { presets } from './presets.js';

export const version = '0.1.1';
export { DonutRenderer, presets };

// Bind the default factory so callers just pass a selector.
// NOTE: importing this module has no side effects (see package.json
// "sideEffects": false). The UMD/global build adds DOMContentLoaded auto-init
// via the separate `src/umd.js` entry; ESM consumers call autoInit() themselves.
export function autoInit(selector = '[data-donut]', options = {}) {
  return _autoInit(selector, (el, dataOpts) => new DonutRenderer(el, { ...options, ...dataOpts }));
}
