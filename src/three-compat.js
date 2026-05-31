// src/three-compat.js
// `three` is a peer dependency and is marked external in the bundle, so this
// bare import is NOT bundled: in the ESM build an import map resolves it; in the
// UMD/global build it maps to the global `THREE`. It is the last-resort source
// of THREE so a consumer can `import { autoInit } from 'glazy'` and have it find
// Three via the import map without passing or globalizing it explicitly.
import * as bundledThree from 'three';

let _warned = false;

export function resolveThree(injected) {
  if (injected) return injected;
  if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
  if (bundledThree && bundledThree.WebGLRenderer) return bundledThree;
  if (!_warned) {
    _warned = true;
    console.warn('[glazy] Three.js not found. Pass { three: THREE }, load THREE globally, or provide an import map for "three". Rendering disabled.');
  }
  return null;
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (_e) {
    return false;
  }
}

// Apply modern (r160+) color-space output. Kept in one place so the
// rest of the code never touches version-sensitive color APIs.
export function configureColorSpace(THREE, renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
