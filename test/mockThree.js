// test/mockThree.js
// A minimal THREE stand-in: real enough to build the scene graph,
// fake enough to run in jsdom. Geometries/materials/textures track dispose().
import { vi } from 'vitest';

const disposed = [];
export const disposedRegistry = disposed;
class Disposable { constructor() { this.dispose = vi.fn(() => disposed.push(this)); } }

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { return this.set(s, s, s); }
  copy(v) { return this.set(v.x, v.y, v.z); }
  normalize() { return this; }
  crossVectors() { return this; }
  addScaledVector() { return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
}
class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
}
class Color { constructor(c) { this.value = c; } setHex(c) { this.value = c; return this; } }
class Quaternion { setFromUnitVectors() { return this; } }
class Object3D {
  constructor() { this.position = new Vector3(); this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1); this.quaternion = new Quaternion();
    this.children = []; this.matrix = {}; }
  add(c) { this.children.push(c); return this; }
  remove(c) { this.children = this.children.filter((x) => x !== c); }
  updateMatrix() {} lookAt() {} traverse(fn) { fn(this); this.children.forEach((c) => c.traverse && c.traverse(fn)); }
}
class Group extends Object3D {}
class Scene extends Object3D {}
class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class InstancedMesh extends Mesh {
  constructor(g, m, count) { super(g, m); this.count = count; this.instanceMatrix = { needsUpdate: false };
    this.instanceColor = null; }
  setMatrixAt() {} setColorAt() {}
}
class Geometry extends Disposable {}
class CanvasTexture extends Disposable { constructor() { super(); this.repeat = { set() {} }; } }

// jsdom has no 2D canvas backend (the optional `canvas` npm pkg is not installed),
// so HTMLCanvasElement.prototype.getContext('2d') returns null. The texture
// generators in src/materials/textures.js draw to a real <canvas>; this minimal
// stub gives them a working 2D context (backed by a real ImageData buffer) so the
// texture math runs faithfully under jsdom instead of crashing on a null context.
function installCanvas2dStub() {
  if (typeof HTMLCanvasElement === 'undefined') return;
  if (HTMLCanvasElement.prototype.__stub2d) return;
  HTMLCanvasElement.prototype.__stub2d = true;
  HTMLCanvasElement.prototype.getContext = function getContext(type) {
    if (type !== '2d') return null;
    const canvas = this;
    const makeImage = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    // Gradients: src/scene/environment.js builds a procedural studio backdrop via
    // createLinearGradient/createRadialGradient and assigns the result to fillStyle.
    // jsdom's null context lacks these, so provide no-op gradients whose addColorStop
    // does nothing and that are safe to assign to fillStyle.
    const makeGradient = () => ({ addColorStop() {} });
    return {
      canvas,
      fillStyle: '#000', globalAlpha: 1,
      fillRect() {}, beginPath() {}, arc() {}, fill() {},
      createLinearGradient() { return makeGradient(); },
      createRadialGradient() { return makeGradient(); },
      getImageData(_x, _y, w, h) { return makeImage(w, h); },
      createImageData(w, h) { return makeImage(w, h); },
      putImageData() {},
    };
  };
  // DonutRenderer.screenshot() reads the renderer's domElement (a real <canvas>)
  // via canvas.toDataURL('image/png'). jsdom has no raster backend, so its
  // toDataURL returns 'data:,'. Provide a PNG data URL so the screenshot path
  // exercises faithfully under jsdom.
  HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
    return 'data:image/png;base64,MOCK';
  };
}

export function makeMockThree() {
  disposed.length = 0;
  installCanvas2dStub();
  return {
    REVISION: '160', SRGBColorSpace: 'srgb', NoColorSpace: '', LinearSRGBColorSpace: 'srgb-linear',
    RepeatWrapping: 1000, DoubleSide: 2, EquirectangularReflectionMapping: 303, PCFSoftShadowMap: 1,
    Scene, Group, Object3D, Mesh, InstancedMesh, Vector2, Vector3, Color, Quaternion, CanvasTexture,
    PerspectiveCamera: class { constructor() { this.position = new Vector3(); this.aspect = 1; } updateProjectionMatrix() {} lookAt() {} },
    AmbientLight: class extends Object3D {}, DirectionalLight: class extends Object3D {
      constructor() { super(); this.shadow = { mapSize: { set() {} }, camera: {}, bias: 0, radius: 0 }; } },
    TorusGeometry: Geometry, CylinderGeometry: Geometry, IcosahedronGeometry: Geometry, BoxGeometry: Geometry,
    SphereGeometry: Geometry, ExtrudeGeometry: Geometry, Shape: class { constructor() {} absarc() {} moveTo() {} lineTo() {} },
    MeshStandardMaterial: class extends Disposable { constructor(o = {}) { super(); Object.assign(this, o); } },
    MeshPhysicalMaterial: class extends Disposable { constructor(o = {}) { super(); Object.assign(this, o); } },
    InstancedBufferAttribute: class { constructor(a) { this.array = a; this.needsUpdate = false; } },
    PMREMGenerator: class { constructor() {} compileEquirectangularShader() {} fromEquirectangular() { return { texture: new Disposable() }; } dispose() {} },
    WebGLRenderer: class {
      constructor() { this.domElement = document.createElement('canvas'); this.shadowMap = {};
        this.outputColorSpace = ''; }
      setPixelRatio() {} setSize() {} render() {} dispose = vi.fn(); setClearColor() {}
      getContext() { return {}; } toDataURL() { return 'data:image/png;base64,MOCK'; }
    },
  };
}
