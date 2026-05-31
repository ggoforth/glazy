// src/toppings/coconut.js
import { scatterInstances } from './scatter.js';

// Coconut flakes: thin flat shavings tossed over the surface, mostly lying flat
// with a slight random curl. Pale white/cream with a few toasted edges.
export function makeCoconut(THREE, sampler, opts, rng, scale = 1) {
  const placements = sampler.sample(opts.toppingCount, rng);
  const geometry = new THREE.BoxGeometry(0.11, 0.012, 0.055);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
  return scatterInstances(THREE, geometry, material, placements, opts.coconutColors, rng, (dummy, p, r) => {
    // rest flat-ish on the surface: thin axis up, small random tilt + random spin
    dummy.position.copy(p.position).addScaledVector(p.normal, 0.008 * scale);
    dummy.rotation.set((r() - 0.5) * 0.7, r() * Math.PI * 2, (r() - 0.5) * 0.7);
    dummy.scale.set((0.85 + r() * 0.6) * scale, scale, (0.85 + r() * 0.7) * scale);
  });
}
