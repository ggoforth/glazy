// src/shapes/bar.js
import { makeDoughMaterial } from '../materials/doughMaterial.js';
import { makeFrostMaterial } from '../materials/frostMaterial.js';
import { barTopSampler } from './surface.js';

// A flat, fully-rounded bar (long john): rounded-rectangle footprint lying in the
// X/Z plane, short in height, with all edges rounded over (no flat vertical walls).
const LEN = 2.6;       // long axis (X)
const WID = 1.15;      // width (Z)
// NOTE: ExtrudeGeometry's bevel adds to the depth, so total height = depth + 2*bevelT.
// Small depth + large bevel → a flat slab whose edges round fully (no flat walls).
const BODY = { depth: 0.06, bevelT: 0.21, bevelS: 0.2 };   // total height ≈ 0.48
const FROST = { depth: 0.06, bevelT: 0.24, bevelS: 0.22 }; // total height ≈ 0.54
const slabHalf = (s) => s.depth / 2 + s.bevelT;            // half the real total height

// Rounded-rectangle path centered at the origin, in the shape's local X/Y plane.
function roundedRect(THREE, w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Extrude a footprint into a flat, edge-rounded slab lying in the X/Z plane.
// The bevel rounds the top & bottom edges; the geometry is re-centered and laid
// flat so its local axes are x=length, y=height, z=width (what the drip shader
// reads via vLocalPos). Real total height is depth + 2*bevelT, centered on y=0.
function flatSlab(THREE, shape, s) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: s.depth, bevelEnabled: true, bevelThickness: s.bevelT, bevelSize: s.bevelS,
    bevelSegments: 10, curveSegments: 64, steps: 1,
  });
  geo.translate(0, 0, -s.depth / 2); // center the straight section on the extrude axis
  geo.rotateX(-Math.PI / 2);         // lay flat: extrude axis → world Y
  geo.rotateY(Math.PI);              // tuck the extrude seam to the back
  return geo;
}

// The frosting is a concentric slab a touch larger than the body; everything
// below a wavy height line is discarded, leaving a poured cap that drapes the
// whole top and ends in an uneven drip lip (same approach as the ring torus).
function barDripGlsl() {
  return `
    float dripH = vLocalPos.y;
    float dripEdge = 0.055 + 0.05*sin(vLocalPos.x*6.5) + 0.03*sin(vLocalPos.z*9.0 + 1.0) + 0.02*sin(vLocalPos.x*14.0);`;
}

export function makeBar(THREE, opts, rng) {
  const group = new THREE.Group();

  // body — generous corner radius so the ends are round and edges fully rounded
  const bodyGeo = flatSlab(THREE, roundedRect(THREE, LEN, WID, WID * 0.5), BODY);
  const dough = new THREE.Mesh(bodyGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  // frosting — concentric, slightly larger/taller than the body, clipped to a cap
  const frostGeo = flatSlab(THREE, roundedRect(THREE, LEN + 0.05, WID + 0.06, (WID + 0.06) * 0.5), FROST);
  const frost = new THREE.Mesh(frostGeo, makeFrostMaterial(THREE, opts, rng, barDripGlsl()));
  frost.castShadow = true;
  group.add(frost);

  // sit toppings on the actual frosted crown (slab half-height)
  const frostTopY = slabHalf(FROST);
  return {
    group,
    topSurface: barTopSampler(THREE, { halfLen: LEN * 0.42, halfWid: WID * 0.34, topY: frostTopY }),
    frame: { fov: 32, position: [0, 2.7, 5.6], target: [0, -0.05, 0] },
    dispose() {},
  };
}
