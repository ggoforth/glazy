import { describe, it, expect, vi } from 'vitest';
import { observeSize, observeVisibility } from '../src/lifecycle.js';

describe('lifecycle observers', () => {
  it('observeSize returns a disconnect fn and tolerates missing ResizeObserver', () => {
    const stop = observeSize(document.createElement('div'), () => {});
    expect(typeof stop).toBe('function');
    stop();
  });
  it('observeVisibility calls back via injected observer', () => {
    const cb = vi.fn();
    let trigger;
    const FakeIO = class { constructor(fn) { trigger = fn; } observe() {} disconnect() {} };
    const stop = observeVisibility(document.createElement('div'), cb, FakeIO);
    trigger([{ isIntersecting: true }]);
    expect(cb).toHaveBeenCalledWith(true);
    stop();
  });
});
