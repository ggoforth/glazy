// src/shapes/bar.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { barTopSampler } from './surface.js';

const LEN = 2.4, WID = 1.0, HEIGHT = 0.7, FROST_DROP = 0.18;

// A rounded "stadium" cross-section in the X/Y plane, extruded along Z.
function stadiumShape(THREE, len, height) {
  const s = new THREE.Shape();
  const r = height / 2;
  const hx = len / 2 - r;
  s.absarc(-hx, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  s.absarc(hx, 0, r, Math.PI * 1.5, Math.PI / 2, false);
  return s;
}

function barDripGlsl(halfLen, slabHalfH) {
  // The frost slab's local Y spans [-slabHalfH, +slabHalfH]. Measure dripH UP
  // from the bottom edge and discard fragments below a wavy threshold, carving
  // a wavy poured lip along the slab's lower edge (waves along length, x).
  return `
    float dripH = vLocalPos.y + ${slabHalfH.toFixed(3)};
    float dripA = vLocalPos.x / ${halfLen.toFixed(3)};
    float dripEdge = 0.05 + 0.05*sin(dripA*9.0) + 0.03*sin(dripA*17.0+1.1);`;
}

export function makeBar(THREE, opts, rng) {
  const group = new THREE.Group();
  const depth = WID;

  const doughGeo = new THREE.ExtrudeGeometry(stadiumShape(THREE, LEN, HEIGHT),
    { depth, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 24 });
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.position.z = -depth / 2;
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  const topY = HEIGHT / 2;
  const frostGeo = new THREE.ExtrudeGeometry(stadiumShape(THREE, LEN * 0.98, HEIGHT * 0.5),
    { depth: depth * 0.96, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 24 });
  // frost slab cross-section height is HEIGHT*0.5, so its local Y half-extent is HEIGHT*0.25
  const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, barDripGlsl(LEN / 2, HEIGHT * 0.25)));
  frost.position.set(0, topY - FROST_DROP, -depth * 0.96 / 2);
  frost.castShadow = true;
  group.add(frost);

  return {
    group,
    topSurface: barTopSampler(THREE, { halfLen: LEN / 2 - 0.15, halfWid: depth / 2 - 0.12, topY: topY + 0.02 }),
    frame: { fov: 32, position: [0, 2.6, 5.6], target: [0, -0.1, 0] },
    dispose() {},
  };
}
