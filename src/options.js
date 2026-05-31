// src/options.js
let _warned = new Set();
export function warnOnce(msg) {
  if (_warned.has(msg)) return;
  _warned.add(msg);
  console.warn(`[glazy] ${msg}`);
}

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
    wobble: aliases.wobble !== undefined ? (aliases.wobble ? true : false) : undefined,
    lean: aliases.mouseLean !== undefined ? (aliases.mouseLean ? true : false) : undefined,
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
