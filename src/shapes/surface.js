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

// Top sampler for the flattened-capsule bar: scatter over the actual domed top
// of a capsule (cylinder of half-length `a`, radius `R`, squashed vertically by
// `hs`), out to the rounded ends. `clipY` keeps points on the glazed crown only.
export function capsuleTopSampler(THREE, { a, R, hs, clipY }) {
  const xMax = a + R * 0.8; // reach onto the rounded end caps
  return {
    sample(count, rng) {
      const out = [];
      let guard = 0;
      while (out.length < count && guard < count * 60) {
        guard++;
        const x = (rng() * 2 - 1) * xMax;
        const z = (rng() * 2 - 1) * R;
        const ax = Math.abs(x);
        let dy, nx;
        if (ax <= a) {                          // cylindrical middle
          const rem = R * R - z * z;
          if (rem <= 0) continue;
          dy = Math.sqrt(rem); nx = 0;
        } else {                                // spherical end cap
          const dx = ax - a;
          const rem = R * R - dx * dx - z * z;
          if (rem <= 0) continue;
          dy = Math.sqrt(rem); nx = x < 0 ? -dx : dx;
        }
        const y = hs * dy;
        if (y < clipY) continue;                // only where the glaze survives
        out.push({
          position: new THREE.Vector3(x, y, z),
          // un-squash the surface normal (scale (1,hs,1) → normal scale (1,1/hs,1))
          normal: new THREE.Vector3(nx, dy / hs, z).normalize(),
          tangent: new THREE.Vector3(1, 0, 0),
        });
      }
      return out;
    },
  };
}
