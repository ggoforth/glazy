import { describe, it, expect } from 'vitest';
import { makeMockThree } from './mockThree.js';
import { makeRng } from '../src/seededRandom.js';
import { shapes, makeShape } from '../src/shapes/index.js';

describe('shape registry', () => {
  it('registers ring, bar, old-fashioned', () => {
    expect(Object.keys(shapes)).toEqual(expect.arrayContaining(['ring', 'bar', 'old-fashioned']));
  });
  it('builds a ring with a group, sampler and frame', () => {
    const THREE = makeMockThree();
    const built = makeShape('ring', THREE, { dough: 0xdf9f48, frost: 0xed4359, frostFinish: 'glaze',
      doughRoughness: 0.82, doughGrain: 1, crust: true, glazeTextureScale: 1, frostRoughness: null, frostClearcoat: null },
      makeRng(1));
    expect(built.group.children.length).toBeGreaterThan(0);
    expect(typeof built.topSurface.sample).toBe('function');
    const placements = built.topSurface.sample(50, makeRng(1));
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0]).toHaveProperty('position');
    expect(placements[0]).toHaveProperty('normal');
  });
});
