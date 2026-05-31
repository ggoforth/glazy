// src/toppings/nuts.js
import { scatterInstances } from './scatter.js';

export function makeNuts(THREE, sampler, opts, rng) {
  const placements = sampler.sample(opts.toppingCount, rng);
  const geometry = new THREE.IcosahedronGeometry(0.055, 0);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.0, flatShading: true });
  return scatterInstances(THREE, geometry, material, placements, opts.nutColors, rng, (dummy, p, r) => {
    // rest on the surface with a random tumble + irregular "chopped" scale
    dummy.position.copy(p.position).addScaledVector(p.normal, 0.01);
    dummy.rotation.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
    dummy.scale.set(0.7 + r() * 0.85, 0.5 + r() * 0.45, 0.7 + r() * 0.85);
  });
}
