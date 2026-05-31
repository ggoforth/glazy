// src/materials/frostMaterial.js
import { frostBumpTexture, frostNormalTexture } from './textures.js';

const FINISH = {
  glaze:    { roughness: 0.30, clearcoat: 1.0, clearcoatRoughness: 0.28, bumpScale: 0.006, normalScale: 0.35 },
  frosting: { roughness: 0.62, clearcoat: 0.0, clearcoatRoughness: 1.0,  bumpScale: 0.018, normalScale: 0.7 },
  // plain: a thin, mostly-opaque white frosting (color is fixed white, ignores `frost`)
  plain:    { roughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.85, bumpScale: 0.01, normalScale: 0.45, color: 0xfbf7ee },
};

// dripGlsl: a snippet defining `float dripH;` and `float dripEdge;` in frosting-local space.
// Each shape supplies it (ring uses ring-angle; bar uses a perimeter param).
export function makeFrostMaterial(THREE, opts, rng, dripGlsl) {
  const f = FINISH[opts.frostFinish] || FINISH.glaze;
  const bumpMap = frostBumpTexture(THREE, rng, opts.glazeTextureScale);
  const normalMap = frostNormalTexture(THREE, rng, opts.glazeTextureScale);
  const mat = new THREE.MeshPhysicalMaterial({
    color: f.color ?? opts.frost,
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
