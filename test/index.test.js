import { describe, it, expect } from 'vitest';
import * as glazy from '../src/index.js';

describe('public API surface', () => {
  it('exports the documented names', () => {
    expect(typeof glazy.DonutRenderer).toBe('function');
    expect(typeof glazy.autoInit).toBe('function');
    expect(typeof glazy.presets).toBe('object');
    expect(typeof glazy.version).toBe('string');
  });
});
