// src/three-compat.js
let _warned = false;

export function resolveThree(injected) {
  if (injected) return injected;
  if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
  if (!_warned) {
    _warned = true;
    console.warn('[glazy] Three.js not found. Pass { three: THREE } or load THREE globally. Rendering disabled.');
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
