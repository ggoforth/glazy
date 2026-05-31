// src/scene/environment.js
// Procedural "studio" equirect → PMREM, so the glaze reflects soft light.
export function buildStudioEnvironment(THREE, renderer) {
  const ec = document.createElement('canvas'); ec.width = 512; ec.height = 256;
  const g = ec.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#fffefb'); grad.addColorStop(0.5, '#f1eadf'); grad.addColorStop(1, '#cabfb0');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  // soft highlight cards → travelling specular streaks on the glaze
  [['#ffffff', 120, 70, 70], ['#ffffff', 370, 95, 46], ['#fff2e6', 255, 40, 34], ['#ffffff', 60, 150, 40]]
    .forEach(([col, cx, cy, r]) => {
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 512, 256);
    });

  const envTex = new THREE.CanvasTexture(ec);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(envTex);
  envTex.dispose(); pmrem.dispose();
  return { texture: target.texture, dispose() { target.texture.dispose(); } };
}
