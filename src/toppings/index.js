// src/toppings/index.js
import { makeSprinkles } from './sprinkles.js';
import { makeNuts } from './nuts.js';
import { makeCoconut } from './coconut.js';

export const toppings = {
  sprinkles: makeSprinkles,
  nuts: makeNuts,
  coconut: makeCoconut,
  none: () => null,
};

// `scale` lets a shape size its toppings to its own proportions (e.g. the bar
// uses smaller toppings than the ring).
export function makeTopping(name, THREE, sampler, opts, rng, scale = 1) {
  const factory = toppings[name] || toppings.sprinkles;
  return factory(THREE, sampler, opts, rng, scale);
}
