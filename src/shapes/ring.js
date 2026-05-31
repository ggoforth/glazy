// src/shapes/ring.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { torusTopSampler } from './surface.js';

const RING = 1.0, DOUGH_TUBE = 0.46, FROST_TUBE = 0.54, FROST_RISE = 0.10, FROST_CLIP_Y = 0.06;

// drip edge waves around the ring angle; height is donut-up in frosting-local space.
function ringDripGlsl() {
  const base = (FROST_CLIP_Y - FROST_RISE).toFixed(3);
  return `
    float dripH = -vLocalPos.z;
    float dripA = atan(vLocalPos.y, vLocalPos.x);
    float dripEdge = ${base} + 0.055*sin(dripA*7.0) + 0.034*sin(dripA*13.0+1.3) + 0.02*sin(dripA*23.0+0.5);`;
}

export function makeRing(THREE, opts, rng) {
  const group = new THREE.Group();

  const dough = new THREE.Mesh(new THREE.TorusGeometry(RING, DOUGH_TUBE, 48, 220), makeDoughMaterial(THREE, opts, rng));
  dough.rotation.x = Math.PI / 2;
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  if (opts.frostFinish !== 'none') {
    const frost = new THREE.Mesh(new THREE.TorusGeometry(RING, FROST_TUBE, 48, 260),
      makeFrostMaterial(THREE, opts, rng, ringDripGlsl()));
    frost.rotation.x = Math.PI / 2;
    frost.position.y = FROST_RISE;
    frost.castShadow = true;
    group.add(frost);
  }

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING, tube: FROST_TUBE, rise: FROST_RISE }),
    frame: {},
    dispose() {},
  };
}
