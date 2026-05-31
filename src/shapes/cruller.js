// src/shapes/cruller.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { torusTopSampler } from './surface.js';

// A French / old-fashioned cruller: a ring whose cross-section is fluted into a
// star and twisted around the ring, giving deep spiralling rope ridges, then
// dipped in glaze that follows the ridges.
const RING = 0.95, DOUGH_TUBE = 0.44, FROST_TUBE = 0.47;
const LOBES = 5;   // ridges around the tube cross-section
const TWIST = 5;   // full rotations of the star as you travel around the ring

// Displace a torus into a twisted-rope cruller, in the hole-axis-Y frame.
// `seeds` are shared between dough and glaze so their ridges line up.
function twist(THREE, geo, ring, amp, seeds) {
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  const [sA, sB] = seeds;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = Math.atan2(z, x);
    const lr = Math.hypot(x, z) - ring;
    const v = Math.atan2(y, lr);
    const cv = Math.cos(v), sv = Math.sin(v);
    const nx = cv * Math.cos(u), ny = sv, nz = cv * Math.sin(u);

    // fluted star cross-section (LOBES) that rotates with u (TWIST) → helical ridges
    const ridge = amp * Math.cos(LOBES * v + TWIST * u + sA);
    const crag = 0.012 * Math.sin(u * 9 + v * 4 + sB);
    const disp = ridge + crag;
    pos.setXYZ(i, x + nx * disp, y + ny * disp, z + nz * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Glaze dipped over the top, following the ridges; wavy lower edge shows dough.
function crullerDripGlsl() {
  return `
    float dripH = vLocalPos.y;
    float dripEdge = -0.07 + 0.05*sin(atan(vLocalPos.z, vLocalPos.x)*6.0) + 0.035*sin(atan(vLocalPos.z, vLocalPos.x)*10.0 + 0.6);`;
}

export function makeCruller(THREE, opts, rng) {
  const group = new THREE.Group();
  const seeds = [rng() * 6.283, rng() * 6.283];

  const doughGeo = twist(THREE, new THREE.TorusGeometry(RING, DOUGH_TUBE, 36, 420), RING, 0.1, seeds);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  // glaze: same twist, a touch larger so it sits just outside the dough ridges
  const frostGeo = twist(THREE, new THREE.TorusGeometry(RING, FROST_TUBE, 36, 420), RING, 0.1, seeds);
  const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, crullerDripGlsl()));
  frost.castShadow = true;
  group.add(frost);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING, tube: FROST_TUBE, rise: 0, minNormalY: 0.35 }),
    frame: {},
    dispose() {},
  };
}
