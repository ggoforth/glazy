// src/autoInit.js
// Map data-* (camelCased by the DOM) to option keys.
const FLAT_KEYS = {
  shape: 'shape', preset: 'preset', frost: 'frost', dough: 'dough',
  frostFinish: 'frostFinish', topping: 'topping', fill: 'fillLight',
  count: 'toppingCount', zoom: 'zoom', spinSpeed: 'spinSpeed', wobble: 'wobble',
  mouseLean: 'mouseLean', seed: 'seed',
};

export function readDataset(el) {
  const d = el.dataset;
  const opts = {};
  for (const [dataKey, optKey] of Object.entries(FLAT_KEYS)) {
    if (d[dataKey] !== undefined) opts[optKey] = d[dataKey];
  }
  // nested motion knobs that have no flat option equivalent
  const motion = {};
  if (d.spinDirection !== undefined) motion.spin = { direction: Number(d.spinDirection) };
  if (d.bob !== undefined) motion.bob = d.bob === 'false' ? false : true;
  if (d.leanStrength !== undefined || d.leanSource !== undefined) {
    motion.lean = {};
    if (d.leanStrength !== undefined) motion.lean.strength = Number(d.leanStrength);
    if (d.leanSource !== undefined) motion.lean.source = d.leanSource;
  }
  if (Object.keys(motion).length) opts.motion = motion;
  return opts;
}

export function autoInit(selector = '[data-donut]', factory) {
  const els = Array.from(document.querySelectorAll(selector));
  return els.map((el) => factory(el, readDataset(el)));
}
