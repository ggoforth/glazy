import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/seededRandom.js';

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(42), b = makeRng(42);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it('differs for different seeds', () => {
    const a = makeRng(1), b = makeRng(2);
    expect(a()).not.toEqual(b());
  });
  it('returns values in [0, 1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('falls back to Math.random when seed is null/undefined', () => {
    expect(makeRng(null)).toBe(Math.random);
    expect(makeRng(undefined)).toBe(Math.random);
  });
});
