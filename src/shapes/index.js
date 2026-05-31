// src/shapes/index.js
import { makeRing } from './ring.js';
import { makeBar } from './bar.js';
import { makeOldFashioned } from './oldFashioned.js';

export const shapes = {
  ring: makeRing,
  bar: makeBar,
  'old-fashioned': makeOldFashioned,
};

export function makeShape(name, THREE, opts, rng) {
  const factory = shapes[name] || shapes.ring;
  return factory(THREE, opts, rng);
}
