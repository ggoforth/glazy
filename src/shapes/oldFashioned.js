// src/shapes/oldFashioned.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { torusTopSampler } from './surface.js';

// A cake / old-fashioned doughnut: a fat rounded ring with a gently domed crown,
// a faint bloom ridge near the outer top, and a few shallow cracks. Smooth and
// matte (a fried cake crust), not scalloped or glazed (that is the cruller).
const RING = 0.9, TUBE = 0.56;

// Displace a torus into a cake doughnut, in the hole-axis-Y frame (ring in X/Z).
function cake(THREE, geo, ring, seeds) {
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  const [sA, sB] = seeds;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = Math.atan2(z, x);
    const lr = Math.hypot(x, z) - ring;
    const v = Math.atan2(y, lr);                // 0 outer, +PI/2 top, PI inner
    const cv = Math.cos(v), sv = Math.sin(v);
    const nx = cv * Math.cos(u), ny = sv, nz = cv * Math.sin(u);

    // subtle, mostly non-periodic lumps so the crust looks handmade, not faceted
    const lumps = 0.015 * (Math.sin(u * 4 + v * 2 + sA) + Math.sin(u * 7 - v * 3 + sB));
    // bloomed crown ridge around the upper-outer shoulder, gently uneven
    const ridge = 0.05 * Math.exp(-Math.pow((v - 0.72) / 0.36, 2)) * (1 + 0.12 * Math.sin(u * 5 + sA));
    // shallow irregular cracks splitting the top crust (the bloom seams)
    const crack = -0.035 * Math.pow(Math.max(0, Math.sin(u * 9 + 1.4 * Math.sin(u * 4 + sB))), 6) * Math.max(0, sv);

    const disp = lumps + ridge + crack;
    pos.setXYZ(i, x + nx * disp, y + ny * disp, z + nz * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function makeOldFashioned(THREE, opts, rng) {
  const group = new THREE.Group();
  const seeds = [rng() * 6.283, rng() * 6.283];

  const doughGeo = cake(THREE, new THREE.TorusGeometry(RING, TUBE, 28, 200), RING, seeds);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING, tube: TUBE, rise: 0, minNormalY: 0.3 }),
    frame: {},
    dispose() {},
  };
}
