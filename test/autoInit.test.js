import { describe, it, expect, vi } from 'vitest';
import { readDataset, autoInit } from '../src/autoInit.js';

describe('readDataset', () => {
  it('maps data-* attributes to option keys', () => {
    const el = document.createElement('div');
    el.dataset.shape = 'bar';
    el.dataset.frost = '#3a73cf';
    el.dataset.topping = 'nuts';
    el.dataset.count = '80';
    el.dataset.spinSpeed = '0.01';
    el.dataset.leanSource = 'element';
    const opts = readDataset(el);
    expect(opts).toMatchObject({
      shape: 'bar', frost: '#3a73cf', topping: 'nuts',
      toppingCount: '80', spinSpeed: '0.01',
      motion: { lean: { source: 'element' } },
    });
  });
});

describe('autoInit', () => {
  it('instantiates one renderer per matching element', () => {
    document.body.innerHTML = `
      <div data-donut data-preset="strawberry"></div>
      <div data-donut data-shape="bar"></div>
      <div></div>`;
    const factory = vi.fn((el, opts) => ({ el, opts, destroy() {} }));
    const instances = autoInit('[data-donut]', factory);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(instances).toHaveLength(2);
    expect(instances[1].opts.shape).toBe('bar');
  });
});
