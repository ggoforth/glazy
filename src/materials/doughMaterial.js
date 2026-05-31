// src/materials/doughMaterial.js
import { doughBumpTexture } from './textures.js';

// Baked-dough material: grain bump + optional warmer crust tint via emissive.
export function makeDoughMaterial(THREE, opts, rng) {
  const bumpMap = doughBumpTexture(THREE, rng, opts.doughGrain);
  const mat = new THREE.MeshStandardMaterial({
    color: opts.dough,
    roughness: opts.doughRoughness,
    metalness: 0.0,
    bumpMap,
    bumpScale: 0.03,
    envMapIntensity: 0.3,
  });
  if (opts.crust) {
    const strength = opts.crust === true ? 1 : Number(opts.crust);
    // a subtle darker/warmer cast on the fried exterior
    mat.emissive = new THREE.Color(0x3a1d0a);
    mat.emissiveIntensity = 0.06 * strength;
  }
  return mat;
}
