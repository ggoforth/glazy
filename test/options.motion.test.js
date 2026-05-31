import { describe, it, expect } from 'vitest';
import { normalizeMotion, DEFAULT_MOTION } from '../src/options.js';

describe('normalizeMotion – string aliases from data-* attributes (Issue 1)', () => {
  it('wobble="false" string disables wobble', () => {
    const m = normalizeMotion({}, { wobble: 'false' });
    expect(m.wobble.enabled).toBe(false);
  });
  it('mouseLean="false" string disables lean', () => {
    const m = normalizeMotion({}, { mouseLean: 'false' });
    expect(m.lean.enabled).toBe(false);
  });
  it('wobble="true" string enables wobble', () => {
    const m = normalizeMotion({}, { wobble: 'true' });
    expect(m.wobble.enabled).toBe(true);
  });
  it('mouseLean="true" string enables lean', () => {
    const m = normalizeMotion({}, { mouseLean: 'true' });
    expect(m.lean.enabled).toBe(true);
  });
  it('no alias yields enabled defaults for wobble and lean', () => {
    const m = normalizeMotion({}, {});
    expect(m.wobble.enabled).toBe(true);
    expect(m.lean.enabled).toBe(true);
  });
});

describe('normalizeMotion', () => {
  it('returns defaults when given nothing', () => {
    expect(normalizeMotion({}, {})).toEqual(DEFAULT_MOTION);
  });
  it('expands boolean shorthand to disabled/defaults', () => {
    const m = normalizeMotion({ spin: false, wobble: true }, {});
    expect(m.spin.enabled).toBe(false);
    expect(m.spin.speed).toBe(DEFAULT_MOTION.spin.speed); // tuning preserved
    expect(m.wobble).toEqual(DEFAULT_MOTION.wobble);
  });
  it('merges partial sub-objects over defaults', () => {
    const m = normalizeMotion({ lean: { strength: 0.4 } }, {});
    expect(m.lean.strength).toBe(0.4);
    expect(m.lean.ease).toBe(DEFAULT_MOTION.lean.ease);
    expect(m.lean.source).toBe('window');
  });
  it('applies flat aliases', () => {
    const m = normalizeMotion({}, { spinSpeed: 0.01, wobble: false, mouseLean: false });
    expect(m.spin.speed).toBe(0.01);
    expect(m.wobble.enabled).toBe(false);
    expect(m.lean.enabled).toBe(false);
  });
  it('lets structured motion win over a conflicting flat alias', () => {
    const m = normalizeMotion({ spin: { speed: 0.02 } }, { spinSpeed: 0.01 });
    expect(m.spin.speed).toBe(0.02);
  });
  it('clamps lean.source to a known value', () => {
    expect(normalizeMotion({ lean: { source: 'bogus' } }, {}).lean.source).toBe('window');
    expect(normalizeMotion({ lean: { source: 'element' } }, {}).lean.source).toBe('element');
  });
});
