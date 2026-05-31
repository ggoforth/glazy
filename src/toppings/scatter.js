// src/toppings/scatter.js
// Build an InstancedMesh from sampler placements. `orient` decides per-instance
// rotation/scale; toppings differ only in geometry, material and orient().
export function scatterInstances(THREE, geometry, material, placements, palette, rng, orient) {
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
