// src/toppings/sprinkles.js
import { scatterInstances } from './scatter.js';

export function makeSprinkles(THREE, sampler, opts, rng) {
  const placements = sampler.sample(opts.toppingCount, rng);
  const geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.02 });
  const up = new THREE.Vector3(0, 1, 0);
  return scatterInstances(THREE, geometry, material, placements, opts.sprinkleColors, rng, (dummy, p, r) => {
    // lay flat on the surface, random in-plane angle
    const t1 = p.tangent;
    const t2 = new THREE.Vector3().crossVectors(p.normal, t1).normalize();
    const ang = r() * Math.PI * 2;
    const dir = new THREE.Vector3().addScaledVector(t1, Math.cos(ang)).addScaledVector(t2, Math.sin(ang)).normalize();
    dummy.position.copy(p.position).addScaledVector(p.normal, 0.012);
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.setScalar(0.8 + r() * 0.55);
  });
}
