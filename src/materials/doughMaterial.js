// src/materials/doughMaterial.js
import { doughBumpTexture } from './textures.js';

// Browning: shift the dough color toward a darker, warmer fried crust. Centered
// on crust=1 (the default), so the default look is unchanged while the control
// sweeps from pale (0) to deeply browned (2).
function applyCrust(hex, c) {
  const t = c - 1;
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (cl(r * (1 - 0.11 * t)) << 16) | (cl(g * (1 - 0.15 * t)) << 8) | cl(b * (1 - 0.24 * t));
}

// Baked-dough material. `doughGrain` drives both the bump texture detail and how
// strongly it shows (bumpScale); `crust` browns the color.
export function makeDoughMaterial(THREE, opts, rng) {
  const grain = opts.doughGrain ?? 1;
  const crust = opts.crust === true ? 1 : opts.crust === false ? 0 : (Number(opts.crust) || 0);
  const bumpMap = doughBumpTexture(THREE, rng, grain);
  return new THREE.MeshStandardMaterial({
    color: applyCrust(opts.dough, crust),
    roughness: opts.doughRoughness,
    metalness: 0.0,
    bumpMap,
    bumpScale: 0.06 * grain,
    envMapIntensity: 0.3,
  });
}
