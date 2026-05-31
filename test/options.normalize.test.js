import { describe, it, expect } from 'vitest';
import { normalizeOptions, DEFAULTS } from '../src/options.js';

describe('normalizeOptions', () => {
  it('fills defaults', () => {
    const o = normalizeOptions({});
    expect(o.shape).toBe('ring');
    expect(o.dough).toBe(DEFAULTS.dough);
    expect(o.topping).toBe('sprinkles');
    expect(o.motion.spin.enabled).toBe(true);
  });
  it('parses colors and clamps counts', () => {
    const o = normalizeOptions({ frost: '#3a73cf', toppingCount: 99999 });
    expect(o.frost).toBe(0x3a73cf);
    expect(o.toppingCount).toBe(2000);
  });
  it('falls back unknown enums to defaults', () => {
    const o = normalizeOptions({ shape: 'banana', topping: 'gravel', frostFinish: 'matte' });
    expect(o.shape).toBe('ring');
    expect(o.topping).toBe('sprinkles');
    expect(o.frostFinish).toBe('glaze');
  });
  it('threads flat motion aliases into motion', () => {
    const o = normalizeOptions({ spinSpeed: 0.02, wobble: false });
    expect(o.motion.spin.speed).toBe(0.02);
    expect(o.motion.wobble.enabled).toBe(false);
  });
});
