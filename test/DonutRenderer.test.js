import { describe, it, expect } from 'vitest';
import { makeMockThree, disposedRegistry } from './mockThree.js';
import { DonutRenderer } from '../src/DonutRenderer.js';

function makeEl() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });
  return el;
}

describe('DonutRenderer (mock THREE)', () => {
  for (const shape of ['ring', 'bar', 'old-fashioned']) {
    it(`builds the ${shape} scene graph without throwing`, () => {
      const THREE = makeMockThree();
      const el = makeEl();
      const d = new DonutRenderer(el, { three: THREE, shape, reducedMotion: true });
      expect(d.ok).toBe(true);
      expect(el.querySelector('canvas')).toBeTruthy();
      d.destroy();
    });
  }

  it('returns an inert instance (no throw) when THREE is missing', () => {
    const d = new DonutRenderer(makeEl(), { three: null });
    expect(d.ok).toBe(false);
    expect(() => { d.setOptions({ frost: 0x111111 }); d.screenshot(); d.destroy(); }).not.toThrow();
  });

  it('screenshot returns a data URL', () => {
    const THREE = makeMockThree();
    const d = new DonutRenderer(makeEl(), { three: THREE, reducedMotion: true });
    expect(d.screenshot()).toMatch(/^data:image\/png/);
    d.destroy();
  });

  it('destroy disposes GPU resources and is idempotent', () => {
    const THREE = makeMockThree();
    const d = new DonutRenderer(makeEl(), { three: THREE, reducedMotion: true });
    d.destroy();
    expect(disposedRegistry.length).toBeGreaterThan(0);
    expect(() => d.destroy()).not.toThrow();
  });

  it('sets aria-hidden on the canvas', () => {
    const THREE = makeMockThree();
    const el = makeEl();
    const d = new DonutRenderer(el, { three: THREE, reducedMotion: true });
    expect(el.querySelector('canvas').getAttribute('aria-hidden')).toBe('true');
    d.destroy();
  });

  it('setOptions rebuilds an OK instance without throwing or duplicating the canvas', () => {
    const THREE = makeMockThree();
    const el = makeEl();
    const d = new DonutRenderer(el, { three: THREE, shape: 'ring', reducedMotion: true });
    expect(d.ok).toBe(true);
    d.setOptions({ shape: 'bar', frost: 0x3a73cf, topping: 'nuts' });
    expect(d.ok).toBe(true);
    // exactly one canvas — the rebuild must not append a second one
    expect(el.querySelectorAll('canvas').length).toBe(1);
    expect(() => d.screenshot()).not.toThrow();
    d.destroy();
  });
});
