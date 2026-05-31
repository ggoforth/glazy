// src/umd.js
// Entry for the UMD / IIFE (global `Glazy`) builds only. Re-exports the full
// public API and adds the no-build convenience: auto-init every [data-donut]
// element on DOMContentLoaded. This DOM side effect lives here — NOT in
// index.js — so the ESM build stays side-effect-free and tree-shakeable.
import { autoInit } from './index.js';

export * from './index.js';

if (typeof document !== 'undefined') {
  const run = () => autoInit();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  // In real pages THREE must be loaded before this script; resolveThree() no-ops
  // gracefully (one warning, inert instances) if it isn't.
}
