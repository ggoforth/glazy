// src/scene/lighting.js
export function buildLighting(THREE, opts) {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xfff3ea, 0.40));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(-2.5, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 22;
  key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
  key.shadow.camera.top = 2.4; key.shadow.camera.bottom = -2.4;
  key.shadow.bias = -0.0004; key.shadow.radius = 4;
  group.add(key);

  const fill = new THREE.DirectionalLight(opts.fillLight, 0.30);
  fill.position.set(3.5, 0.5, 3);
  group.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.40);
  rim.position.set(1, 3, -4);
  group.add(rim);

  return { group, fill, dispose() { /* lights hold no GPU buffers */ } };
}
