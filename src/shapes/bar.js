// src/shapes/bar.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { applyGrain, grainField } from '../materials/textures.js';
import { capsuleTopSampler } from './surface.js';

// A flat, fully-rounded bar (long john). Built from a CapsuleGeometry so the ends
// are rounded hemispheres and the sides slope gently, with no extrude seam to
// tear. The capsule is laid along X and squashed in Y into a flat bar.
const LEN = 2.6;    // total length (X)
const WID = 1.15;   // width (Z) = capsule diameter
const HEIGHT = 0.64; // total height (Y) after flattening

// radius r, cylinder length l, vertical squash so total height becomes `height`.
function flatCapsule(THREE, r, l, height) {
  const g = new THREE.CapsuleGeometry(r, l, 16, 48);
  g.rotateZ(Math.PI / 2);          // capsule axis Y -> X (the long axis)
  g.scale(1, height / (2 * r), 1); // flatten vertically into a bar
  return g;
}

// Concentric glaze cap: discard everything below a wavy height so the glaze
// drapes the top and ends in an uneven drip lip. vLocalPos is post-scale.
function barDripGlsl() {
  return `
    float dripH = vLocalPos.y;
    float dripEdge = 0.07 + 0.05*sin(vLocalPos.x*6.5) + 0.03*sin(vLocalPos.z*9.0 + 1.0) + 0.02*sin(vLocalPos.x*14.0);`;
}

export function makeBar(THREE, opts, rng) {
  const group = new THREE.Group();
  const r = WID / 2;

  const gf = grainField(rng);
  const bodyGeo = applyGrain(flatCapsule(THREE, r, LEN - WID, HEIGHT), opts.doughGrain, gf);
  const dough = new THREE.Mesh(bodyGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  // glaze: a concentric shell clipped to a top cap. 'plain' hugs tight (a thin
  // skin); the poured finishes sit a touch proud. The shell gets the same grain
  // so it follows the dough bumps instead of letting them poke through.
  const thin = opts.frostFinish === 'plain';
  const rf = r + (thin ? 0.01 : 0.02), hf = HEIGHT + (thin ? 0.014 : 0.028);
  if (opts.frostFinish !== 'none') {
    const frostGeo = applyGrain(flatCapsule(THREE, rf, LEN - WID, hf), opts.doughGrain, gf);
    const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, barDripGlsl()));
    frost.castShadow = true;
    group.add(frost);
  }

  return {
    group,
    toppingScale: 0.6, // the bar is smaller than the ring, so shrink its toppings
    // scatter over the glazed crown along the whole length, out to the rounded ends
    topSurface: capsuleTopSampler(THREE, { a: (LEN - WID) / 2, R: rf, hs: hf / (2 * rf), clipY: 0.18 }),
    frame: { fov: 32, position: [0, 2.7, 5.6], target: [0, -0.05, 0] },
    dispose() {},
  };
}
