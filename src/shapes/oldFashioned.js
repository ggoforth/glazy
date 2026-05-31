// src/shapes/oldFashioned.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { torusTopSampler } from './surface.js';

const RING = 1.0, DOUGH_TUBE = 0.5, FROST_TUBE = 0.56, FROST_RISE = 0.08, FROST_CLIP_Y = 0.10;
const FLUTES = 6;

// Push vertices in/out by ring-angle to carve flutes + add craggy noise.
function fluteGeometry(THREE, geo, rng) {
  if (!geo.attributes || !geo.attributes.position) return geo;
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const ang = Math.atan2(v.z, v.x);               // around the ring (hole axis Y after rotation handled by caller)
    // scale radius in/out by a 6-lobe flute plus a little per-vertex crag
    const scale = (1 + 0.06 * Math.cos(ang * FLUTES)) * (1 + (rng() * 2 - 1) * 0.015);
    pos.setXYZ(i, v.x * scale, v.y, v.z * scale);
  }
  pos.needsUpdate = true;
  if (geo.computeVertexNormals) geo.computeVertexNormals();
  return geo;
}

function ofDripGlsl() {
  const base = (FROST_CLIP_Y - FROST_RISE).toFixed(3);
  return `
    float dripH = -vLocalPos.z;
    float dripA = atan(vLocalPos.y, vLocalPos.x);
    float dripEdge = ${base} + 0.07*sin(dripA*6.0) + 0.04*sin(dripA*11.0+0.7);`;
}

export function makeOldFashioned(THREE, opts, rng) {
  const group = new THREE.Group();

  const doughGeo = fluteGeometry(THREE, new THREE.TorusGeometry(RING, DOUGH_TUBE, 40, 200), rng);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.rotation.x = Math.PI / 2;
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  const frostGeo = fluteGeometry(THREE, new THREE.TorusGeometry(RING, FROST_TUBE, 40, 220), rng);
  const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, ofDripGlsl()));
  frost.rotation.x = Math.PI / 2;
  frost.position.y = FROST_RISE;
  frost.castShadow = true;
  group.add(frost);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING, tube: FROST_TUBE, rise: FROST_RISE, minNormalY: 0.25 }),
    frame: {},
    dispose() {},
  };
}
