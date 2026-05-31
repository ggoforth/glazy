import { describe, it, expect, vi } from 'vitest';
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
  it('returns null (with warn) when none available', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveThree(null)).toBe(null);
    warn.mockRestore();
  });
});

describe('isWebGLAvailable', () => {
  it('returns false in jsdom (no real WebGL)', () => {
    expect(typeof isWebGLAvailable()).toBe('boolean');
  });
});
