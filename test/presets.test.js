import { describe, it, expect } from 'vitest';
import { presets } from '../src/presets.js';
import { resolveOptions } from '../src/options.js';

describe('presets', () => {
  it('exposes the named presets', () => {
    expect(Object.keys(presets)).toEqual(
      expect.arrayContaining(['strawberry', 'blueberry', 'matcha', 'chocolate'])
    );
  });
});

describe('resolveOptions precedence (defaults < preset < explicit)', () => {
  it('applies a preset', () => {
    const o = resolveOptions({ preset: 'blueberry' });
    expect(o.frost).toBe(0x3a73cf);
    expect(o.topping).toBe('nuts');
  });
  it('lets explicit options override the preset', () => {
    const o = resolveOptions({ preset: 'blueberry', frost: 0x112233 });
    expect(o.frost).toBe(0x112233);
    expect(o.topping).toBe('nuts'); // untouched preset field remains
  });
  it('ignores an unknown preset (falls back to defaults)', () => {
    const o = resolveOptions({ preset: 'nope' });
    expect(o.frost).toBe(0xed4359);
  });
});
