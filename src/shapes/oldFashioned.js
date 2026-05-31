// src/shapes/oldFashioned.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { applyGrain, grainField } from '../materials/textures.js';
import { torusTopSampler } from './surface.js';

// An old-fashioned (sour-cream cake) doughnut: a chunky ring broken into big
// irregular lobes with deep craggy crevices, then dipped in glaze that pools and
// follows the lumps. Lumpy and irregular (not the cruller's even twist).
const RING = 0.9, DOUGH_TUBE = 0.5, FROST_TUBE = 0.53;

// Displace a torus into a craggy lobed old-fashioned, in the hole-axis-Y frame.
// `seeds` are shared between dough and glaze so their lumps line up.
function craggy(THREE, geo, ring, seeds) {
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  const [sA, sB, sC] = seeds;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = Math.atan2(z, x);
    const lr = Math.hypot(x, z) - ring;
    const v = Math.atan2(y, lr);
    const cv = Math.cos(v), sv = Math.sin(v);
    const nx = cv * Math.cos(u), ny = sv, nz = cv * Math.sin(u);
    const outMask = 0.5 + 0.5 * cv; // 1 outer rim, 0 hole
    const topMask = 0.5 + 0.5 * sv; // 1 top, 0 underside

    // big irregular lobes around the ring (mixed frequencies → uneven blossom)
    const lobes = 0.07 * Math.cos(u * 5 + sA) + 0.04 * Math.cos(u * 3 + sB) + 0.025 * Math.cos(u * 8 + sC);
    // deep craggy crevices splitting the lobes, mostly on the top/outer crust
    const crevice = -0.07 * Math.pow(Math.max(0, Math.sin(u * 6 + 1.6 * Math.sin(u * 3 + sA))), 4) * (0.4 + 0.6 * topMask);
    // rough 3D crag so it never looks lathe-smooth
    const crag = 0.03 * (Math.sin(u * 7 + v * 4 + sB) + Math.sin(u * 12 - v * 5 + sC));

    const disp = lobes * (0.55 + 0.45 * outMask) + crevice + crag;
    pos.setXYZ(i, x + nx * disp, y + ny * disp, z + nz * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Glaze dipped over most of the top, following the lumps; wavy lower edge.
function ofDripGlsl() {
  return `
    float dripH = vLocalPos.y;
    float dripEdge = -0.14 + 0.06*sin(atan(vLocalPos.z, vLocalPos.x)*5.0) + 0.04*sin(atan(vLocalPos.z, vLocalPos.x)*9.0 + 0.7);`;
}

export function makeOldFashioned(THREE, opts, rng) {
  const group = new THREE.Group();
  const seeds = [rng() * 6.283, rng() * 6.283, rng() * 6.283];
  const gf = grainField(rng);

  const doughGeo = applyGrain(craggy(THREE, new THREE.TorusGeometry(RING, DOUGH_TUBE, 32, 260), RING, seeds), opts.doughGrain, gf);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  // glaze: same craggy + grain field, just outside the dough ('plain' hugs tighter)
  if (opts.frostFinish !== 'none') {
    const fTube = opts.frostFinish === 'plain' ? DOUGH_TUBE + 0.02 : FROST_TUBE;
    const frostGeo = applyGrain(craggy(THREE, new THREE.TorusGeometry(RING, fTube, 32, 260), RING, seeds), opts.doughGrain, gf);
    const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, ofDripGlsl()));
    frost.castShadow = true;
    group.add(frost);
  }

  return {
    group,
    topSurface: torusTopSampler(THREE, {
      ring: RING,
      tube: opts.frostFinish === 'none' ? DOUGH_TUBE : FROST_TUBE,
      rise: 0, minNormalY: 0.3,
    }),
    frame: {},
    dispose() {},
  };
}
