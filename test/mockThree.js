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
  copy(v) { return this.set(v.x, v.y, v.z); }
  normalize() { return this; }
  crossVectors() { return this; }
  addScaledVector() { return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
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

export function makeMockThree() {
  disposed.length = 0;
  return {
    REVISION: '160', SRGBColorSpace: 'srgb', NoColorSpace: '', LinearSRGBColorSpace: 'srgb-linear',
    RepeatWrapping: 1000, DoubleSide: 2, EquirectangularReflectionMapping: 303, PCFSoftShadowMap: 1,
    Scene, Group, Object3D, Mesh, InstancedMesh, Vector3, Color, Quaternion, CanvasTexture,
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
