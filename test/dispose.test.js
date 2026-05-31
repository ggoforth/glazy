import { describe, it, expect } from 'vitest';
import { makeMockThree, disposedRegistry } from './mockThree.js';
import { disposeObject } from '../src/dispose.js';

describe('disposeObject', () => {
  it('disposes geometries, materials and textures across the tree', () => {
    const THREE = makeMockThree();
    const root = new THREE.Group();
    const geo = new THREE.TorusGeometry();
    const mat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(), bumpMap: new THREE.CanvasTexture() });
    root.add(new THREE.Mesh(geo, mat));
    disposeObject(root);
    expect(geo.dispose).toHaveBeenCalled();
    expect(mat.dispose).toHaveBeenCalled();
    expect(mat.map.dispose).toHaveBeenCalled();
    expect(mat.bumpMap.dispose).toHaveBeenCalled();
  });
});
