import { describe, it, expect } from 'vitest';
import { makeMockThree } from './mockThree.js';
import { makeRng } from '../src/seededRandom.js';
import { makeTopping, toppings } from '../src/toppings/index.js';

const fakeSampler = (THREE) => ({
  sample: (n) => Array.from({ length: n }, () => ({
    position: new THREE.Vector3(1, 0.2, 0),
    normal: new THREE.Vector3(0, 1, 0),
    tangent: new THREE.Vector3(1, 0, 0),
  })),
});

describe('toppings', () => {
  it('registers sprinkles, nuts, coconut, none', () => {
    expect(Object.keys(toppings)).toEqual(expect.arrayContaining(['sprinkles', 'nuts', 'coconut', 'none']));
  });
  it('none returns null mesh', () => {
    const THREE = makeMockThree();
    expect(makeTopping('none', THREE, fakeSampler(THREE), { topping: 'none' }, makeRng(1))).toBe(null);
  });
  it('coconut builds an instanced mesh with the requested count', () => {
    const THREE = makeMockThree();
    const built = makeTopping('coconut', THREE, fakeSampler(THREE),
      { topping: 'coconut', toppingCount: 30, coconutColors: [0xfffaf0, 0xf3e7cf] }, makeRng(1));
    expect(built.mesh).toBeTruthy();
    expect(built.mesh.count).toBe(30);
  });
  it('sprinkles builds an instanced mesh with the requested count', () => {
    const THREE = makeMockThree();
    const built = makeTopping('sprinkles', THREE, fakeSampler(THREE),
      { topping: 'sprinkles', toppingCount: 40, sprinkleColors: [0xffffff, 0xed4359] }, makeRng(1));
    expect(built.mesh).toBeTruthy();
    expect(built.mesh.count).toBe(40);
  });
});
