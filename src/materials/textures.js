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
  if (colorSpace) t.colorSpace = colorSpace;
  return t;
}

// Public builders. `rng` makes texture generation deterministic under `seed`.
export function doughBumpTexture(THREE, rng, grain = 1) {
  const canvas = noiseCanvas(256, { rng, blobs: 120, blobAmp: 60 * grain, blobMin: 6, blobMax: 22, grain: 22 * grain });
  return tex(THREE, canvas, 8, 3);
}

// A grain field is a fixed set of noise frequencies/phases. Generate it once per
// donut and apply it to BOTH the dough and the frost so the glaze tracks the
// dough's bumps (otherwise the bumpy dough pokes through the smooth glaze).
export function grainField(rng) {
  return { s1: 8 + rng() * 4, s2: 13 + rng() * 5, s3: 19 + rng() * 6, p1: rng() * 6.28, p2: rng() * 6.28 };
}

// Real geometric grain: nudge each vertex along its normal by the smooth pseudo-
// noise field so the surface is visibly bumpy (works on any renderer, not just
// GPUs that support bump-map derivatives). Mutates and returns `geo`.
export function applyGrain(geo, grain, field) {
  if (!geo.attributes || !geo.attributes.position || !geo.attributes.normal || !grain || !field) return geo;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const amp = 0.018 * grain;
  const { s1, s2, s3, p1, p2 } = field;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // smooth-ish lumpy field from products/sums of sines of position
    const n = Math.sin(x * s1 + p1) * Math.sin(y * s2) * Math.sin(z * s1 + p2)
      + 0.5 * Math.sin(x * s3) * Math.sin(z * s2 + p1);
    const d = n * amp;
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  pos.needsUpdate = true;
  if (geo.computeVertexNormals) geo.computeVertexNormals();
  return geo;
}

export function frostBumpTexture(THREE, rng, scale = 1) {
  const canvas = noiseCanvas(256, { rng, blobs: 70, blobAmp: 34, blobMin: 9, blobMax: 26, grain: 8 });
  return tex(THREE, canvas, 9 * scale, 3 * scale);
}

export function frostNormalTexture(THREE, rng, scale = 1) {
  const height = noiseCanvas(256, { rng, blobs: 70, blobAmp: 60, blobMin: 12, blobMax: 34, grain: 0 });
  const canvas = normalFromHeight(height, 2.0);
  return tex(THREE, canvas, 9 * scale, 3 * scale); // normal maps stay linear (no colorSpace)
}
