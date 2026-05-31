import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeOptions, DEFAULTS, _resetWarned } from '../src/options.js';

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

describe('normalizeOptions – crust string coercion (Issue 2)', () => {
  it('crust "true" string becomes true', () => {
    expect(normalizeOptions({ crust: 'true' }).crust).toBe(true);
  });
  it('crust "false" string becomes false', () => {
    expect(normalizeOptions({ crust: 'false' }).crust).toBe(false);
  });
  it('crust 0.5 (number) stays 0.5', () => {
    expect(normalizeOptions({ crust: 0.5 }).crust).toBe(0.5);
  });
  it('crust "0.5" (string) becomes 0.5', () => {
    expect(normalizeOptions({ crust: '0.5' }).crust).toBe(0.5);
  });
  it('crust true (boolean) stays true', () => {
    expect(normalizeOptions({ crust: true }).crust).toBe(true);
  });
  it('crust garbage falls back to default true', () => {
    expect(normalizeOptions({ crust: 'banana' }).crust).toBe(true);
  });
});

describe('normalizeOptions – unknown enum warn (Issue 3)', () => {
  let warnSpy;
  beforeEach(() => {
    _resetWarned();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns once for an unknown shape and falls back to "ring"', () => {
    const o = normalizeOptions({ shape: 'banana' });
    expect(o.shape).toBe('ring');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown shape'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"banana"'));
  });
  it('warns once for an unknown topping and falls back to "sprinkles"', () => {
    const o = normalizeOptions({ topping: 'gravel' });
    expect(o.topping).toBe('sprinkles');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown topping'));
  });
  it('warns once for an unknown frostFinish and falls back to "glaze"', () => {
    const o = normalizeOptions({ frostFinish: 'matte' });
    expect(o.frostFinish).toBe('glaze');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown frostFinish'));
  });
  it('does NOT warn when shape is absent (default is used)', () => {
    normalizeOptions({});
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('unknown shape'));
  });
});
