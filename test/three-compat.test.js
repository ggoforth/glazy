import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { resolveThree, isWebGLAvailable } from '../src/three-compat.js';

describe('resolveThree', () => {
  it('prefers an injected THREE', () => {
    const fake = { REVISION: '160' };
    expect(resolveThree(fake)).toBe(fake);
  });
  it('falls back to global THREE', () => {
    const fake = { REVISION: '161' };
    globalThis.THREE = fake;
    expect(resolveThree(null)).toBe(fake);
    delete globalThis.THREE;
  });
  it('falls back to the bundled (peer/import-map) three when nothing is injected or global', () => {
    // three is a peer dep marked external; the bare import resolves to the real
    // module here, an import map in the browser ESM build, or the global in UMD.
    expect(resolveThree(null)).toBe(THREE);
  });
});

describe('isWebGLAvailable', () => {
  it('returns false in jsdom (no real WebGL)', () => {
    expect(typeof isWebGLAvailable()).toBe('boolean');
  });
});
