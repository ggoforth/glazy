// src/options.js
import { presets } from './presets.js';

let _warned = new Set();
export function warnOnce(msg) {
  if (_warned.has(msg)) return;
  _warned.add(msg);
  console.warn(`[glazy] ${msg}`);
}
export function _resetWarned() { _warned = new Set(); }

export function parseColor(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value & 0xffffff;
  if (typeof value === 'string') {
    let s = value.trim().replace(/^#/, '').replace(/^0x/i, '');
    if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
    if (/^[0-9a-f]{6}$/i.test(s)) return parseInt(s, 16);
  }
  warnOnce(`invalid color "${value}", using fallback`);
  return fallback;
}

export function parseBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === '' || s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return fallback;
}

export function clampInt(value, min, max, fallback) {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const DEFAULT_MOTION = {
  spin: { enabled: true, speed: 0.004, direction: 1 },
  wobble: { enabled: true, amplitude: 0.05, speed: 0.9 },
  bob: { enabled: true, amplitude: 0.045, speed: 1.1 },
  lean: { enabled: true, strength: 0.16, ease: 0.045, source: 'window' },
};

function mergeBehavior(def, raw) {
  if (raw === true || raw === undefined) return { ...def };
  if (raw === false) return { ...def, enabled: false };
  return { ...def, ...raw };
}

export function normalizeMotion(motion = {}, aliases = {}) {
  // 1. start from defaults overlaid with flat aliases
  const aliased = {
    spin: aliases.spinSpeed !== undefined ? { speed: aliases.spinSpeed } : undefined,
    wobble: aliases.wobble !== undefined ? parseBool(aliases.wobble, undefined) : undefined,
    lean: aliases.mouseLean !== undefined ? parseBool(aliases.mouseLean, undefined) : undefined,
  };
  const out = {};
  for (const key of ['spin', 'wobble', 'bob', 'lean']) {
    // aliases first, then structured motion overrides
    let merged = mergeBehavior(DEFAULT_MOTION[key], aliased[key]);
    merged = mergeBehavior(merged, motion[key]);
    out[key] = merged;
  }
  if (out.lean.source !== 'element') out.lean.source = 'window';
  return out;
}

const SHAPES = ['ring', 'bar', 'old-fashioned'];
const TOPPINGS = ['sprinkles', 'nuts', 'none'];
const FINISHES = ['glaze', 'frosting'];

export const DEFAULTS = {
  shape: 'ring',
  dough: 0xdf9f48,
  frost: 0xed4359,
  frostFinish: 'glaze',
  frostRoughness: null,    // null → finish-derived (see frostMaterial)
  frostClearcoat: null,
  glazeTextureScale: 1,
  doughRoughness: 0.82,
  doughGrain: 1,
  crust: true,
  fillLight: 0xffe6ef,
  topping: 'sprinkles',
  sprinkleColors: [0xffffff, 0xed4359, 0xee921a, 0x69c27e, 0x4087de, 0xaf62c1],
  nutColors: [0xe6c89a, 0xd9b382, 0xc79a5b, 0xb07d45, 0x8a5a32],
  toppingCount: 150,
  reducedMotion: 'auto',
  pixelRatioCap: 2,
  seed: null,
  materials: {},
};

function oneOf(value, allowed, fallback, label) {
  if (allowed.includes(value)) return value;
  if (value !== undefined && label) warnOnce(`unknown ${label} "${value}", using "${fallback}"`);
  return fallback;
}

export function normalizeOptions(input = {}) {
  const o = { ...DEFAULTS, ...input };
  const out = {
    three: input.three ?? null,
    shape: oneOf(o.shape, SHAPES, 'ring', 'shape'),
    dough: parseColor(o.dough, DEFAULTS.dough),
    frost: parseColor(o.frost, DEFAULTS.frost),
    frostFinish: oneOf(o.frostFinish, FINISHES, 'glaze', 'frostFinish'),
    frostRoughness: o.frostRoughness == null ? null : Number(o.frostRoughness),
    frostClearcoat: o.frostClearcoat == null ? null : Number(o.frostClearcoat),
    glazeTextureScale: Number(o.glazeTextureScale) || 1,
    doughRoughness: Number(o.doughRoughness),
    doughGrain: Number(o.doughGrain) || 1,
    crust: (() => {
      if (typeof o.crust === 'boolean') return o.crust;
      const asBool = parseBool(o.crust, undefined);
      if (asBool !== undefined) return asBool;
      const n = Number(o.crust);
      return Number.isFinite(n) ? n : DEFAULTS.crust;
    })(),
    fillLight: parseColor(o.fillLight, DEFAULTS.fillLight),
    topping: oneOf(o.topping, TOPPINGS, 'sprinkles', 'topping'),
    sprinkleColors: (o.sprinkleColors || []).map((c) => parseColor(c, 0xffffff)),
    nutColors: (o.nutColors || []).map((c) => parseColor(c, 0xc79a5b)),
    toppingCount: clampInt(o.toppingCount, 0, 2000, DEFAULTS.toppingCount),
    reducedMotion: o.reducedMotion === true || o.reducedMotion === false ? o.reducedMotion : 'auto',
    pixelRatioCap: Number(o.pixelRatioCap) || 2,
    seed: o.seed == null ? null : (o.seed >>> 0),
    materials: o.materials || {},
  };
  out.motion = normalizeMotion(o.motion || {}, {
    spinSpeed: input.spinSpeed,
    wobble: input.wobble,
    mouseLean: input.mouseLean,
  });
  return out;
}

// defaults < preset < explicit, then normalize
export function resolveOptions(input = {}) {
  const preset = input.preset && presets[input.preset] ? presets[input.preset] : {};
  if (input.preset && !presets[input.preset]) warnOnce(`unknown preset "${input.preset}"`);
  return normalizeOptions({ ...preset, ...input });
}
