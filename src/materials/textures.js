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
  const canvas = noiseCanvas(256, { rng, blobs: 150, blobAmp: 74, blobMin: 5, blobMax: 20, grain: 26 * grain });
  return tex(THREE, canvas, 10, 3);
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
