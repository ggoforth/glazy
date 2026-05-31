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
export function disposeObject(root) {
  if (!root || !root.traverse) return;
  root.traverse((node) => {
    if (node.geometry && node.geometry.dispose) node.geometry.dispose();
    if (node.material) disposeMaterial(node.material);
  });
}
