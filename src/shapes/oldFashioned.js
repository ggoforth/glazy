// src/shapes/oldFashioned.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { torusTopSampler } from './surface.js';

// Chunky raised ring with a scalloped "blossom" edge and deep irregular cracks —
// the signature old-fashioned look — then dipped in a glaze that follows the cracks.
const RING = 0.92, DOUGH_TUBE = 0.52, FROST_TUBE = 0.55;

// Displace a torus into a craggy old-fashioned. Works in the hole-axis-Y frame
// (ring in the X/Z plane). `seeds` are shared between dough and glaze so their
// cracks line up. Displacement is along the surface normal.
function craggy(THREE, geo, ring, seeds) {
  geo.rotateX(Math.PI / 2); // hole axis -> Y, ring lies in X/Z
  const pos = geo.attributes.position;
  const [sA, sB, sC] = seeds;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = Math.atan2(z, x);                 // angle around the ring
    const lr = Math.hypot(x, z) - ring;         // radial offset from the tube centerline
    const v = Math.atan2(y, lr);                // tube angle: 0 outer, +PI/2 top, PI inner
    const cv = Math.cos(v), sv = Math.sin(v);
    const nx = cv * Math.cos(u), ny = sv, nz = cv * Math.sin(u); // outward normal

    const scallop = 0.05 * Math.cos(u * 9 + sA) + 0.025 * Math.cos(u * 5 + sB); // irregular blossom edge
    const ridge = Math.cos(u * 13 + 1.2 * Math.sin(u * 3 + sB) + sB);     // irregular spacing
    const crack = -0.1 * Math.pow(Math.max(0, ridge), 5.0);              // sharp deep valleys
    const crag = 0.022 * (Math.sin(u * 8 + v * 5 + sC) + Math.sin(u * 15 - v * 4 + 1.0));
    const topMask = 0.5 + 0.5 * sv;             // 1 at top, 0 underneath
    const outMask = 0.5 + 0.5 * cv;             // 1 at outer rim, 0 at the hole
    const disp = scallop * (0.5 + 0.5 * outMask) + crack * (0.35 + 0.65 * topMask) + crag;

    pos.setXYZ(i, x + nx * disp, y + ny * disp, z + nz * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Glaze dipped over the top; wavy lower edge lets the craggy underside show.
function ofDripGlsl() {
  return `
    float dripH = vLocalPos.y;
    float dripEdge = -0.13 + 0.06*sin(atan(vLocalPos.z, vLocalPos.x)*6.0) + 0.04*sin(atan(vLocalPos.z, vLocalPos.x)*11.0 + 0.7);`;
}

export function makeOldFashioned(THREE, opts, rng) {
  const group = new THREE.Group();
  const seeds = [rng() * 6.283, rng() * 6.283, rng() * 6.283];

  const doughGeo = craggy(THREE, new THREE.TorusGeometry(RING, DOUGH_TUBE, 32, 260), RING, seeds);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  // glaze: same craggy field, a touch larger so it sits just outside the dough
  const frostGeo = craggy(THREE, new THREE.TorusGeometry(RING, FROST_TUBE, 32, 260), RING, seeds);
  const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, ofDripGlsl()));
  frost.castShadow = true;
  group.add(frost);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING, tube: FROST_TUBE, rise: 0, minNormalY: 0.3 }),
    frame: {},
    dispose() {},
  };
}
