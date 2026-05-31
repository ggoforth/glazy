import { describe, it, expect, vi } from 'vitest';
import { parseColor, parseBool, clampInt } from '../src/options.js';

describe('parseColor', () => {
  it('passes through valid numbers', () => {
    expect(parseColor(0xed4359, 0)).toBe(0xed4359);
  });
  it('parses #rrggbb, rrggbb, 0xRRGGBB strings', () => {
    expect(parseColor('#ed4359', 0)).toBe(0xed4359);
    expect(parseColor('ed4359', 0)).toBe(0xed4359);
    expect(parseColor('0xED4359', 0)).toBe(0xed4359);
  });
  it('expands #rgb shorthand', () => {
    expect(parseColor('#f00', 0)).toBe(0xff0000);
  });
  it('falls back (with one warn) on garbage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseColor('not-a-color', 0x123456)).toBe(0x123456);
    expect(parseColor(NaN, 0x123456)).toBe(0x123456);
    warn.mockRestore();
  });
});

describe('parseBool', () => {
  it('coerces strings and presence', () => {
    expect(parseBool('true', false)).toBe(true);
    expect(parseBool('', false)).toBe(true);     // bare attribute
    expect(parseBool('false', true)).toBe(false);
    expect(parseBool('0', true)).toBe(false);
    expect(parseBool(true, false)).toBe(true);
  });
  it('falls back on unknown', () => {
    expect(parseBool('maybe', true)).toBe(true);
  });
});

describe('clampInt', () => {
  it('coerces, rounds and clamps', () => {
    expect(clampInt('150', 0, 2000, 0)).toBe(150);
    expect(clampInt(9999, 0, 2000, 0)).toBe(2000);
    expect(clampInt(-5, 0, 2000, 0)).toBe(0);
    expect(clampInt(12.7, 0, 2000, 0)).toBe(13);
    expect(clampInt('nope', 0, 2000, 42)).toBe(42);
  });
});
