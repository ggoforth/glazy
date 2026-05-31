// src/toppings/index.js
import { makeSprinkles } from './sprinkles.js';
import { makeNuts } from './nuts.js';

export const toppings = {
  sprinkles: makeSprinkles,
  nuts: makeNuts,
  none: () => null,
};

export function makeTopping(name, THREE, sampler, opts, rng) {
  const factory = toppings[name] || toppings.sprinkles;
  return factory(THREE, sampler, opts, rng);
}
