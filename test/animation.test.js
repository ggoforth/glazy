import { describe, it, expect } from 'vitest';
import { makeMockThree } from './mockThree.js';
import { createMotionDriver } from '../src/animation.js';
import { DEFAULT_MOTION } from '../src/options.js';

function nodes(THREE) {
  return { donut: new THREE.Group(), spinner: new THREE.Group() };
}

describe('createMotionDriver', () => {
  it('advances spin by speed*direction each step', () => {
    const THREE = makeMockThree();
    const { donut, spinner } = nodes(THREE);
    const d = createMotionDriver({ donut, spinner, motion: DEFAULT_MOTION });
    d.step(1, { x: 0, y: 0 });
    const first = spinner.rotation.y;
    d.step(1, { x: 0, y: 0 });
    expect(spinner.rotation.y).toBeGreaterThan(first);
  });
  it('does not move when all behaviors disabled', () => {
    const THREE = makeMockThree();
    const { donut, spinner } = nodes(THREE);
    const motion = { spin: { enabled: false }, wobble: { enabled: false }, bob: { enabled: false }, lean: { enabled: false } };
    const d = createMotionDriver({ donut, spinner, motion });
    d.step(5, { x: 1, y: 1 });
    expect(spinner.rotation.y).toBe(0);
    expect(donut.position.y).toBe(0);
  });
  it('renderStatic resets to a neutral frame', () => {
    const THREE = makeMockThree();
    const { donut, spinner } = nodes(THREE);
    const d = createMotionDriver({ donut, spinner, motion: DEFAULT_MOTION });
    d.step(3, { x: 0.5, y: 0.5 });
    d.renderStatic();
    expect(donut.position.y).toBe(0);
    expect(donut.rotation.x).toBe(0);
  });
});
