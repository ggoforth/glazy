// src/shapes/surface.js
// A SurfaceSampler yields top-facing placements {position, normal, tangent}
// on a frosted crown, so toppings stay geometry-agnostic.

// Torus crown sampler (hole axis = Y). ring/old-fashioned share this.
export function torusTopSampler(THREE, { ring, tube, rise, minNormalY = 0.22 }) {
  return {
    sample(count, rng) {
      const out = [];
      let guard = 0;
      while (out.length < count && guard < count * 40) {
        guard++;
        const u = rng() * Math.PI * 2;
        const v = rng() * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
        const nx = cv * cu, ny = sv, nz = cv * su; // surface normal
        if (ny < minNormalY) continue;             // top-facing only
        const px = (ring + tube * cv) * cu;
        const py = tube * sv + rise;
        const pz = (ring + tube * cv) * su;
        const normal = new THREE.Vector3(nx, ny, nz).normalize();
        const tangent = new THREE.Vector3(-su, 0, cu).normalize();
        out.push({ position: new THREE.Vector3(px, py, pz), normal, tangent });
      }
      return out;
    },
  };
}
