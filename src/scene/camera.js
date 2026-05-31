// src/scene/camera.js
const DEFAULT_FRAME = { fov: 34, position: [0, 3.0, 5.3], target: [0, -0.05, 0] };

export function buildCamera(THREE, frame = {}) {
  const f = { ...DEFAULT_FRAME, ...frame };
  const camera = new THREE.PerspectiveCamera(f.fov, 1, 0.1, 100);
  camera.position.set(f.position[0], f.position[1], f.position[2]);
  camera.lookAt(f.target[0], f.target[1], f.target[2]);
  return camera;
}
