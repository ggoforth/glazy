/*! glazy | MIT License | https://github.com/ggoforth/glazy */
import * as bundledThree from 'three';

// src/three-compat.js
// `three` is a peer dependency and is marked external in the bundle, so this
// bare import is NOT bundled: in the ESM build an import map resolves it; in the
// UMD/global build it maps to the global `THREE`. It is the last-resort source
// of THREE so a consumer can `import { autoInit } from 'glazy'` and have it find
// Three via the import map without passing or globalizing it explicitly.

let _warned$1 = false;

function resolveThree(injected) {
  if (injected) return injected;
  if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
  if (bundledThree && bundledThree.WebGLRenderer) return bundledThree;
  if (!_warned$1) {
    _warned$1 = true;
    console.warn('[glazy] Three.js not found. Pass { three: THREE }, load THREE globally, or provide an import map for "three". Rendering disabled.');
  }
  return null;
}

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (_e) {
    return false;
  }
}

// Apply modern (r160+) color-space output. Kept in one place so the
// rest of the code never touches version-sensitive color APIs.
function configureColorSpace(THREE, renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

// src/presets.js
// A preset is just a bag of options merged UNDER explicit options.
// It can carry finish + texture, not only color.
const presets = {
  strawberry: {
    frost: 0xed4359, frostFinish: 'glaze', dough: 0xdf9f48,
    topping: 'sprinkles', fillLight: 0xffe6ef,
  },
  blueberry: {
    frost: 0x3a73cf, frostFinish: 'glaze', dough: 0xdf9f48,
    topping: 'nuts', fillLight: 0xe6f0ff,
  },
  matcha: {
    frost: 0x8fbf6f, frostFinish: 'glaze', dough: 0xe7c98a,
    topping: 'nuts', fillLight: 0xeef6e6,
  },
  chocolate: {
    frost: 0x4a2c1a, frostFinish: 'frosting', dough: 0x8a5a32,
    topping: 'sprinkles', crust: true, fillLight: 0xfff0e6,
  },
};

// src/options.js

let _warned = new Set();
function warnOnce(msg) {
  if (_warned.has(msg)) return;
  _warned.add(msg);
  console.warn(`[glazy] ${msg}`);
}

function parseColor(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value & 0xffffff;
  if (typeof value === 'string') {
    let s = value.trim().replace(/^#/, '').replace(/^0x/i, '');
    if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
    if (/^[0-9a-f]{6}$/i.test(s)) return parseInt(s, 16);
  }
  warnOnce(`invalid color "${value}", using fallback`);
  return fallback;
}

function parseBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === '' || s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return fallback;
}

function clampInt(value, min, max, fallback) {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

const DEFAULT_MOTION = {
  spin: { enabled: true, speed: 0.004, direction: 1 },
  wobble: { enabled: true, amplitude: 0.05, speed: 0.9 },
  bob: { enabled: true, amplitude: 0.045, speed: 1.1 },
  lean: { enabled: true, strength: 0.16, ease: 0.045, source: 'window' },
};

function mergeBehavior(def, raw) {
  if (raw === true || raw === undefined) return { ...def };
  if (raw === false) return { ...def, enabled: false };
  return { ...def, ...raw };
}

function normalizeMotion(motion = {}, aliases = {}) {
  // 1. start from defaults overlaid with flat aliases
  const aliased = {
    spin: aliases.spinSpeed !== undefined ? { speed: aliases.spinSpeed } : undefined,
    wobble: aliases.wobble !== undefined ? parseBool(aliases.wobble, undefined) : undefined,
    lean: aliases.mouseLean !== undefined ? parseBool(aliases.mouseLean, undefined) : undefined,
  };
  const out = {};
  for (const key of ['spin', 'wobble', 'bob', 'lean']) {
    // aliases first, then structured motion overrides
    let merged = mergeBehavior(DEFAULT_MOTION[key], aliased[key]);
    merged = mergeBehavior(merged, motion[key]);
    out[key] = merged;
  }
  if (out.lean.source !== 'element') out.lean.source = 'window';
  return out;
}

const SHAPES = ['ring', 'bar', 'old-fashioned', 'cruller'];
const TOPPINGS = ['sprinkles', 'nuts', 'none'];
const FINISHES = ['glaze', 'frosting'];

const DEFAULTS = {
  shape: 'ring',
  dough: 0xdf9f48,
  frost: 0xed4359,
  frostFinish: 'glaze',
  frostRoughness: null,    // null → finish-derived (see frostMaterial)
  frostClearcoat: null,
  glazeTextureScale: 1,
  doughRoughness: 0.82,
  doughGrain: 1,
  crust: true,
  fillLight: 0xffe6ef,
  topping: 'sprinkles',
  sprinkleColors: [0xffffff, 0xed4359, 0xee921a, 0x69c27e, 0x4087de, 0xaf62c1],
  nutColors: [0xe6c89a, 0xd9b382, 0xc79a5b, 0xb07d45, 0x8a5a32],
  toppingCount: 150,
  reducedMotion: 'auto',
  pixelRatioCap: 2,
  seed: null,
  materials: {},
};

function oneOf(value, allowed, fallback, label) {
  if (allowed.includes(value)) return value;
  if (value !== undefined && label) warnOnce(`unknown ${label} "${value}", using "${fallback}"`);
  return fallback;
}

function normalizeOptions(input = {}) {
  const o = { ...DEFAULTS, ...input };
  const out = {
    three: input.three ?? null,
    shape: oneOf(o.shape, SHAPES, 'ring', 'shape'),
    dough: parseColor(o.dough, DEFAULTS.dough),
    frost: parseColor(o.frost, DEFAULTS.frost),
    frostFinish: oneOf(o.frostFinish, FINISHES, 'glaze', 'frostFinish'),
    frostRoughness: o.frostRoughness == null ? null : Number(o.frostRoughness),
    frostClearcoat: o.frostClearcoat == null ? null : Number(o.frostClearcoat),
    glazeTextureScale: Number(o.glazeTextureScale) || 1,
    doughRoughness: Number(o.doughRoughness),
    doughGrain: Number(o.doughGrain) || 1,
    crust: (() => {
      if (typeof o.crust === 'boolean') return o.crust;
      const asBool = parseBool(o.crust, undefined);
      if (asBool !== undefined) return asBool;
      const n = Number(o.crust);
      return Number.isFinite(n) ? n : DEFAULTS.crust;
    })(),
    fillLight: parseColor(o.fillLight, DEFAULTS.fillLight),
    topping: oneOf(o.topping, TOPPINGS, 'sprinkles', 'topping'),
    sprinkleColors: (o.sprinkleColors || []).map((c) => parseColor(c, 0xffffff)),
    nutColors: (o.nutColors || []).map((c) => parseColor(c, 0xc79a5b)),
    toppingCount: clampInt(o.toppingCount, 0, 2000, DEFAULTS.toppingCount),
    reducedMotion: o.reducedMotion === true || o.reducedMotion === false ? o.reducedMotion : 'auto',
    pixelRatioCap: Number(o.pixelRatioCap) || 2,
    seed: o.seed == null ? null : (o.seed >>> 0),
    materials: o.materials || {},
  };
  out.motion = normalizeMotion(o.motion || {}, {
    spinSpeed: input.spinSpeed,
    wobble: input.wobble,
    mouseLean: input.mouseLean,
  });
  return out;
}

// defaults < preset < explicit, then normalize
function resolveOptions(input = {}) {
  const preset = input.preset && presets[input.preset] ? presets[input.preset] : {};
  if (input.preset && !presets[input.preset]) warnOnce(`unknown preset "${input.preset}"`);
  return normalizeOptions({ ...preset, ...input });
}

// src/seededRandom.js
// mulberry32 — a tiny, fast, well-distributed seeded PRNG.
// Returns Math.random when no seed is given, so callers can always
// treat the result as a () => number in [0, 1).
function makeRng(seed) {
  if (seed === null || seed === undefined) return Math.random;
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// src/materials/textures.js
// All textures are generated on a <canvas> — no image files.

function noiseCanvas(size, o) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, size, size); // 128 = "no bump"
  x.globalAlpha = 0.5;
  for (let i = 0; i < o.blobs; i++) {
    const g = Math.max(0, Math.min(255, 128 + (o.rng() * 2 - 1) * o.blobAmp));
    x.fillStyle = `rgb(${g},${g},${g})`;
    const r = o.blobMin + o.rng() * (o.blobMax - o.blobMin);
    x.beginPath(); x.arc(o.rng() * size, o.rng() * size, r, 0, 6.283); x.fill();
  }
  x.globalAlpha = 1;
  if (o.grain) {
    const img = x.getImageData(0, 0, size, size), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (o.rng() * 2 - 1) * o.grain; d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    x.putImageData(img, 0, 0);
  }
  return c;
}

// Derive a tangent-space normal map from a grayscale height canvas (Sobel).
function normalFromHeight(heightCanvas, strength) {
  const size = heightCanvas.width;
  const sctx = heightCanvas.getContext('2d');
  const h = sctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas'); out.width = out.height = size;
  const octx = out.getContext('2d');
  const nimg = octx.createImageData(size, size), nd = nimg.data;
  const at = (xx, yy) => h[((yy & (size - 1)) * size + (xx & (size - 1))) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nd[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      nd[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      nd[i + 2] = (1 / len) * 0.5 * 255 + 127;
      nd[i + 3] = 255;
    }
  }
  octx.putImageData(nimg, 0, 0);
  return out;
}

function tex(THREE, canvas, rx, ry, colorSpace) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// Public builders. `rng` makes texture generation deterministic under `seed`.
function doughBumpTexture(THREE, rng, grain = 1) {
  const canvas = noiseCanvas(256, { rng, blobs: 150, blobAmp: 74, blobMin: 5, blobMax: 20, grain: 26 * grain });
  return tex(THREE, canvas, 10, 3);
}

function frostBumpTexture(THREE, rng, scale = 1) {
  const canvas = noiseCanvas(256, { rng, blobs: 70, blobAmp: 34, blobMin: 9, blobMax: 26, grain: 8 });
  return tex(THREE, canvas, 9 * scale, 3 * scale);
}

function frostNormalTexture(THREE, rng, scale = 1) {
  const height = noiseCanvas(256, { rng, blobs: 70, blobAmp: 60, blobMin: 12, blobMax: 34, grain: 0 });
  const canvas = normalFromHeight(height, 2.0);
  return tex(THREE, canvas, 9 * scale, 3 * scale); // normal maps stay linear (no colorSpace)
}

// src/materials/doughMaterial.js

// Baked-dough material: grain bump + optional warmer crust tint via emissive.
function makeDoughMaterial(THREE, opts, rng) {
  const bumpMap = doughBumpTexture(THREE, rng, opts.doughGrain);
  const mat = new THREE.MeshStandardMaterial({
    color: opts.dough,
    roughness: opts.doughRoughness,
    metalness: 0.0,
    bumpMap,
    bumpScale: 0.03,
    envMapIntensity: 0.3,
  });
  if (opts.crust) {
    const strength = opts.crust === true ? 1 : Number(opts.crust);
    // a subtle darker/warmer cast on the fried exterior
    mat.emissive = new THREE.Color(0x3a1d0a);
    mat.emissiveIntensity = 0.06 * strength;
  }
  return mat;
}

// src/materials/frostMaterial.js

const FINISH = {
  glaze:    { roughness: 0.30, clearcoat: 1.0, clearcoatRoughness: 0.28, bumpScale: 0.006, normalScale: 0.35 },
  frosting: { roughness: 0.62, clearcoat: 0.0, clearcoatRoughness: 1.0,  bumpScale: 0.018, normalScale: 0.7 },
};

// dripGlsl: a snippet defining `float dripH;` and `float dripCoord;` in frosting-local space.
// Each shape supplies it (ring uses ring-angle; bar uses a perimeter param).
function makeFrostMaterial(THREE, opts, rng, dripGlsl) {
  const f = FINISH[opts.frostFinish] || FINISH.glaze;
  const bumpMap = frostBumpTexture(THREE, rng, opts.glazeTextureScale);
  const normalMap = frostNormalTexture(THREE, rng, opts.glazeTextureScale);
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.frost,
    roughness: opts.frostRoughness ?? f.roughness,
    clearcoat: opts.frostClearcoat ?? f.clearcoat,
    clearcoatRoughness: f.clearcoatRoughness,
    metalness: 0.0,
    side: THREE.DoubleSide,
    bumpMap,
    bumpScale: f.bumpScale,
    normalMap,
    normalScale: new THREE.Vector2(f.normalScale, f.normalScale),
    envMapIntensity: opts.frostFinish === 'glaze' ? 0.55 : 0.2,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
      .replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n' + dripGlsl + '\nif (dripH < dripEdge) discard;');
  };
  return mat;
}

// src/shapes/surface.js
// A SurfaceSampler yields top-facing placements {position, normal, tangent}
// on a frosted crown, so toppings stay geometry-agnostic.

// Torus crown sampler (hole axis = Y). ring/old-fashioned share this.
function torusTopSampler(THREE, { ring, tube, rise, minNormalY = 0.22 }) {
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

// Top-face sampler for the bar: scatter across the rounded top plane.
function barTopSampler(THREE, { halfLen, halfWid, topY }) {
  return {
    sample(count, rng) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const x = (rng() * 2 - 1) * halfLen;
        const z = (rng() * 2 - 1) * halfWid;
        out.push({
          position: new THREE.Vector3(x, topY, z),
          normal: new THREE.Vector3(0, 1, 0),
          tangent: new THREE.Vector3(1, 0, 0),
        });
      }
      return out;
    },
  };
}

// src/shapes/ring.js

const RING$2 = 1.0, DOUGH_TUBE$1 = 0.46, FROST_TUBE$1 = 0.54, FROST_RISE = 0.10, FROST_CLIP_Y = 0.06;

// drip edge waves around the ring angle; height is donut-up in frosting-local space.
function ringDripGlsl() {
  const base = (FROST_CLIP_Y - FROST_RISE).toFixed(3);
  return `
    float dripH = -vLocalPos.z;
    float dripA = atan(vLocalPos.y, vLocalPos.x);
    float dripEdge = ${base} + 0.055*sin(dripA*7.0) + 0.034*sin(dripA*13.0+1.3) + 0.02*sin(dripA*23.0+0.5);`;
}

function makeRing(THREE, opts, rng) {
  const group = new THREE.Group();

  const dough = new THREE.Mesh(new THREE.TorusGeometry(RING$2, DOUGH_TUBE$1, 48, 220), makeDoughMaterial(THREE, opts, rng));
  dough.rotation.x = Math.PI / 2;
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  const frost = new THREE.Mesh(new THREE.TorusGeometry(RING$2, FROST_TUBE$1, 48, 260),
    makeFrostMaterial(THREE, opts, rng, ringDripGlsl()));
  frost.rotation.x = Math.PI / 2;
  frost.position.y = FROST_RISE;
  frost.castShadow = true;
  group.add(frost);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING$2, tube: FROST_TUBE$1, rise: FROST_RISE }),
    frame: {},
    dispose() {},
  };
}

// src/shapes/bar.js

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

function makeBar(THREE, opts, rng) {
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

// src/shapes/oldFashioned.js

// A cake / old-fashioned doughnut: a fat rounded ring with a gently domed crown,
// a faint bloom ridge near the outer top, and a few shallow cracks. Smooth and
// matte (a fried cake crust), not scalloped or glazed (that is the cruller).
const RING$1 = 0.9, TUBE = 0.56;

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

function makeOldFashioned(THREE, opts, rng) {
  const group = new THREE.Group();
  const seeds = [rng() * 6.283, rng() * 6.283];

  const doughGeo = cake(THREE, new THREE.TorusGeometry(RING$1, TUBE, 28, 200), RING$1, seeds);
  const dough = new THREE.Mesh(doughGeo, makeDoughMaterial(THREE, opts, rng));
  dough.castShadow = true; dough.receiveShadow = true;
  group.add(dough);

  return {
    group,
    topSurface: torusTopSampler(THREE, { ring: RING$1, tube: TUBE, rise: 0, minNormalY: 0.3 }),
    frame: {},
    dispose() {},
  };
}

// src/shapes/cruller.js

// A French / old-fashioned cruller: a ring whose cross-section is fluted into a
// star and twisted around the ring, giving deep spiralling rope ridges, then
// dipped in glaze that follows the ridges.
const RING = 0.95, DOUGH_TUBE = 0.44, FROST_TUBE = 0.47;
const LOBES = 5;   // ridges around the tube cross-section
const TWIST = 3;   // full rotations of the star as you travel around the ring

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

function makeCruller(THREE, opts, rng) {
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

// src/shapes/index.js

const shapes = {
  ring: makeRing,
  bar: makeBar,
  'old-fashioned': makeOldFashioned,
  cruller: makeCruller,
};

function makeShape(name, THREE, opts, rng) {
  const factory = shapes[name] || shapes.ring;
  return factory(THREE, opts, rng);
}

// src/toppings/scatter.js
// Build an InstancedMesh from sampler placements. `orient` decides per-instance
// rotation/scale; toppings differ only in geometry, material and orient().
function scatterInstances(THREE, geometry, material, placements, palette, rng, orient) {
  const count = placements.length;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    orient(dummy, placements[i], rng);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(palette[(rng() * palette.length) | 0]);
    mesh.setColorAt(i, color);
  }
  mesh.count = count;
  mesh.castShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, dispose() { geometry.dispose(); material.dispose(); } };
}

// src/toppings/sprinkles.js

function makeSprinkles(THREE, sampler, opts, rng) {
  const placements = sampler.sample(opts.toppingCount, rng);
  const geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.02 });
  const up = new THREE.Vector3(0, 1, 0);
  return scatterInstances(THREE, geometry, material, placements, opts.sprinkleColors, rng, (dummy, p, r) => {
    // lay flat on the surface, random in-plane angle
    const t1 = p.tangent;
    const t2 = new THREE.Vector3().crossVectors(p.normal, t1).normalize();
    const ang = r() * Math.PI * 2;
    const dir = new THREE.Vector3().addScaledVector(t1, Math.cos(ang)).addScaledVector(t2, Math.sin(ang)).normalize();
    dummy.position.copy(p.position).addScaledVector(p.normal, 0.012);
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.setScalar(0.8 + r() * 0.55);
  });
}

// src/toppings/nuts.js

function makeNuts(THREE, sampler, opts, rng) {
  const placements = sampler.sample(opts.toppingCount, rng);
  const geometry = new THREE.IcosahedronGeometry(0.055, 0);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.0, flatShading: true });
  return scatterInstances(THREE, geometry, material, placements, opts.nutColors, rng, (dummy, p, r) => {
    // rest on the surface with a random tumble + irregular "chopped" scale
    dummy.position.copy(p.position).addScaledVector(p.normal, 0.01);
    dummy.rotation.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
    dummy.scale.set(0.7 + r() * 0.85, 0.5 + r() * 0.45, 0.7 + r() * 0.85);
  });
}

// src/toppings/index.js

const toppings = {
  sprinkles: makeSprinkles,
  nuts: makeNuts,
  none: () => null,
};

function makeTopping(name, THREE, sampler, opts, rng) {
  const factory = toppings[name] || toppings.sprinkles;
  return factory(THREE, sampler, opts, rng);
}

// src/scene/lighting.js
function buildLighting(THREE, opts) {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xfff3ea, 0.40));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(-2.5, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 22;
  key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
  key.shadow.camera.top = 2.4; key.shadow.camera.bottom = -2.4;
  key.shadow.bias = -4e-4; key.shadow.radius = 4;
  group.add(key);

  const fill = new THREE.DirectionalLight(opts.fillLight, 0.30);
  fill.position.set(3.5, 0.5, 3);
  group.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.40);
  rim.position.set(1, 3, -4);
  group.add(rim);

  return { group, dispose() { /* lights hold no GPU buffers */ } };
}

// src/scene/environment.js
// Procedural "studio" equirect → PMREM, so the glaze reflects soft light.
function buildStudioEnvironment(THREE, renderer) {
  const ec = document.createElement('canvas'); ec.width = 512; ec.height = 256;
  const g = ec.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#fffefb'); grad.addColorStop(0.5, '#f1eadf'); grad.addColorStop(1, '#cabfb0');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  // soft highlight cards → travelling specular streaks on the glaze
  [['#ffffff', 120, 70, 70], ['#ffffff', 370, 95, 46], ['#fff2e6', 255, 40, 34], ['#ffffff', 60, 150, 40]]
    .forEach(([col, cx, cy, r]) => {
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 512, 256);
    });

  const envTex = new THREE.CanvasTexture(ec);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(envTex);
  envTex.dispose(); pmrem.dispose();
  // Disposing the render target releases its framebuffer AND its texture.
  return { texture: target.texture, dispose() { target.dispose(); } };
}

// src/scene/camera.js
const DEFAULT_FRAME = { fov: 34, position: [0, 3.0, 5.3], target: [0, -0.05, 0] };

function buildCamera(THREE, frame = {}) {
  const f = { ...DEFAULT_FRAME, ...frame };
  const camera = new THREE.PerspectiveCamera(f.fov, 1, 0.1, 100);
  camera.position.set(f.position[0], f.position[1], f.position[2]);
  camera.lookAt(f.target[0], f.target[1], f.target[2]);
  return camera;
}

// src/animation.js
// Pure motion math, decoupled from rAF so it is unit-testable.
// `step(t, lean)` mutates the donut/spinner transforms for frame time `t`,
// where `lean` is the eased pointer position in [-1, 1].
function createMotionDriver({ donut, spinner, motion }) {
  const m = motion;
  return {
    step(t, lean) {
      // Absolute-time assignment (like wobble/bob below) → constant angular
      // velocity. Using += here would accelerate, since the loop feeds an
      // ever-growing accumulated `t`.
      if (m.spin.enabled) spinner.rotation.y = t * (m.spin.speed / 0.004) * m.spin.direction;
      const wob = m.wobble;
      const leanX = m.lean.enabled ? lean.y * m.lean.strength : 0;
      const leanZ = m.lean.enabled ? lean.x * m.lean.strength : 0;
      donut.rotation.x = (wob.enabled ? Math.sin(t * wob.speed) * wob.amplitude : 0) + leanX;
      donut.rotation.z = (wob.enabled ? Math.sin(t * (wob.speed - 0.2)) * (wob.amplitude * 0.8) : 0) - leanZ;
      donut.position.y = m.bob.enabled ? Math.sin(t * m.bob.speed) * m.bob.amplitude : 0;
    },
    renderStatic() {
      spinner.rotation.y = 0;
      donut.rotation.x = 0; donut.rotation.z = 0; donut.position.y = 0;
    },
  };
}

// src/lifecycle.js
function observeSize(el, onResize, RO = globalThis.ResizeObserver) {
  if (!RO) { return () => {}; }
  const ro = new RO(() => onResize());
  ro.observe(el);
  return () => ro.disconnect();
}

function observeVisibility(el, onChange, IO = globalThis.IntersectionObserver) {
  if (!IO) { onChange(true); return () => {}; } // assume visible if unsupported
  const io = new IO((entries) => onChange(entries[entries.length - 1].isIntersecting));
  io.observe(el);
  return () => io.disconnect();
}

// src/dispose.js
const TEXTURE_SLOTS = ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'envMap', 'aoMap'];

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  for (const m of materials) {
    if (!m) continue;
    for (const slot of TEXTURE_SLOTS) if (m[slot] && m[slot].dispose) m[slot].dispose();
    if (m.dispose) m.dispose();
  }
}

// Walk an Object3D tree, releasing every GPU resource it owns.
function disposeObject(root) {
  if (!root || !root.traverse) return;
  root.traverse((node) => {
    if (node.geometry && node.geometry.dispose) node.geometry.dispose();
    if (node.material) disposeMaterial(node.material);
  });
}

// src/DonutRenderer.js

class DonutRenderer {
  constructor(target, options = {}) {
    this.target = typeof target === 'string' ? document.querySelector(target) : target;
    this.options = resolveOptions(options);
    this.ok = false;
    this._raf = 0;
    this._t = 0;
    this._lean = { x: 0, y: 0 };
    this._leanTarget = { x: 0, y: 0 };
    this._visible = true;
    this._cleanups = [];

    const THREE = resolveThree(options.three);
    if (!THREE || !this.target) return;            // inert
    this.THREE = THREE;

    let renderer;
    try {
      if (!isWebGLAvailable() && !options.three) return; // real browser w/o WebGL → inert
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (_e) { return; }                        // inert on context failure
    this.renderer = renderer;

    this._build();
    this.ok = true;
  }

  _build() {
    const THREE = this.THREE, opts = this.options, renderer = this.renderer;
    const el = this.target;

    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, opts.pixelRatioCap));
    configureColorSpace(THREE, renderer);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(canvas);

    this.scene = new THREE.Scene();

    const env = buildStudioEnvironment(THREE, renderer);
    this.scene.environment = env.texture;
    this._env = env;

    const lighting = buildLighting(THREE, opts);
    this.scene.add(lighting.group);
    this._lighting = lighting;

    // donut(group: tilt/wobble) → spinner(group: turntable) → shape + toppings
    this.donut = new THREE.Group();
    this.spinner = new THREE.Group();
    this.donut.add(this.spinner);
    this.scene.add(this.donut);

    const rng = makeRng(opts.seed);
    const shape = makeShape(opts.shape, THREE, opts, rng);
    this.spinner.add(shape.group);
    this._shape = shape;

    const topping = makeTopping(opts.topping, THREE, shape.topSurface, opts, rng);
    if (topping) { this.spinner.add(topping.mesh); this._topping = topping; }

    this.camera = buildCamera(THREE, shape.frame);

    this._motion = createMotionDriver({ donut: this.donut, spinner: this.spinner, motion: opts.motion });

    this._setupReducedMotion();
    this._setupPointer();
    this._cleanups.push(observeSize(el, () => this._resize()));
    this._cleanups.push(observeVisibility(el, (vis) => { this._visible = vis; if (vis) this._start(); }));
    this._resize();

    if (this._reduced) this._renderStatic(); else this._start();
  }

  _setupReducedMotion() {
    if (this.options.reducedMotion === true) { this._reduced = true; return; }
    if (this.options.reducedMotion === false) { this._reduced = false; return; }
    const mq = globalThis.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this._reduced = mq ? mq.matches : false;
    if (mq) {
      const onChange = () => { this._reduced = mq.matches; if (this._reduced) this._renderStatic(); else this._start(); };
      mq.addEventListener('change', onChange);
      this._cleanups.push(() => mq.removeEventListener('change', onChange));
    }
  }

  _setupPointer() {
    if (!this.options.motion.lean.enabled) return;
    const src = this.options.motion.lean.source;
    const node = src === 'element' ? this.target : globalThis;
    const onMove = (e) => {
      if (src === 'element') {
        const r = this.target.getBoundingClientRect();
        this._leanTarget.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        this._leanTarget.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      } else {
        this._leanTarget.x = (e.clientX / globalThis.innerWidth) * 2 - 1;
        this._leanTarget.y = (e.clientY / globalThis.innerHeight) * 2 - 1;
      }
    };
    node.addEventListener('pointermove', onMove, { passive: true });
    this._cleanups.push(() => node.removeEventListener('pointermove', onMove));
  }

  _resize() {
    const w = this.target.clientWidth, h = this.target.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this._reduced) this._renderStatic();
  }

  _start() {
    if (this._reduced || this._raf || !this._visible || !this.ok) return;
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const ease = this.options.motion.lean.ease;
      this._lean.x += (this._leanTarget.x - this._lean.x) * ease;
      this._lean.y += (this._leanTarget.y - this._lean.y) * ease;
      this._t += 0.004;
      this._motion.step(this._t, this._lean);
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } }

  _renderStatic() { this._stop(); if (this._motion) this._motion.renderStatic(); this.renderer.render(this.scene, this.camera); }

  setOptions(patch = {}) {
    if (!this.ok) return;
    // simplest correct approach: re-resolve and rebuild the donut body/toppings.
    this.options = resolveOptions({ ...this._rawDescribe(), ...patch });
    this._teardownSceneContents();
    this._build();
  }

  _rawDescribe() { return { ...this.options, three: this.THREE }; }

  screenshot() {
    if (!this.ok) return null;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  _teardownSceneContents() {
    this._stop();
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    if (this.scene) disposeObject(this.scene);
    if (this._env) this._env.dispose();
    const canvas = this.renderer.domElement;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (!this.ok) return;
    this._teardownSceneContents();
    if (this.renderer.dispose) this.renderer.dispose();
    this.scene = this.camera = this._shape = this._topping = null;
    this.ok = false;
  }
}

// src/autoInit.js
// Map data-* (camelCased by the DOM) to option keys.
const FLAT_KEYS = {
  shape: 'shape', preset: 'preset', frost: 'frost', dough: 'dough',
  frostFinish: 'frostFinish', topping: 'topping', fill: 'fillLight',
  count: 'toppingCount', spinSpeed: 'spinSpeed', wobble: 'wobble',
  mouseLean: 'mouseLean', seed: 'seed',
};

function readDataset(el) {
  const d = el.dataset;
  const opts = {};
  for (const [dataKey, optKey] of Object.entries(FLAT_KEYS)) {
    if (d[dataKey] !== undefined) opts[optKey] = d[dataKey];
  }
  // nested motion knobs that have no flat option equivalent
  const motion = {};
  if (d.spinDirection !== undefined) motion.spin = { direction: Number(d.spinDirection) };
  if (d.bob !== undefined) motion.bob = d.bob === 'false' ? false : true;
  if (d.leanStrength !== undefined || d.leanSource !== undefined) {
    motion.lean = {};
    if (d.leanStrength !== undefined) motion.lean.strength = Number(d.leanStrength);
    if (d.leanSource !== undefined) motion.lean.source = d.leanSource;
  }
  if (Object.keys(motion).length) opts.motion = motion;
  return opts;
}

function autoInit$1(selector = '[data-donut]', factory) {
  const els = Array.from(document.querySelectorAll(selector));
  return els.map((el) => factory(el, readDataset(el)));
}

// src/index.js

const version = '0.1.1';

// Bind the default factory so callers just pass a selector.
// NOTE: importing this module has no side effects (see package.json
// "sideEffects": false). The UMD/global build adds DOMContentLoaded auto-init
// via the separate `src/umd.js` entry; ESM consumers call autoInit() themselves.
function autoInit(selector = '[data-donut]', options = {}) {
  return autoInit$1(selector, (el, dataOpts) => new DonutRenderer(el, { ...options, ...dataOpts }));
}

export { DonutRenderer, autoInit, presets, version };
