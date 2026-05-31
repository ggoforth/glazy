/* ============================================================
   BaggaDonuts - real-time 3D donut hero (Three.js / WebGL)
   Thick pink frosting on top, golden dough below, sprinkles.
   Spins around its vertical (hole) axis so the frosted top
   always faces the camera. Infinite, seamless. Mirrors the logo.
   ============================================================ */
(function(){
  function start(){
    const stage = document.querySelector('.donut-stage');
    if(!stage || typeof THREE === 'undefined') return;

    // Per-stage config via data-* attrs (homepage uses the defaults: pink frosting + sprinkles)
    const ds = stage.dataset;
    const toInt = (s, d)=> s ? parseInt(s, 16) : d;
    const TOPPING = ds.topping || 'sprinkles';   // 'sprinkles' | 'nuts'

    const BRAND = {
      dough:  0xdf9f48,
      frost:  toInt(ds.frost, 0xed4359),
      sprinkles: [0xffffff, 0xed4359, 0xee921a, 0x69c27e, 0x4087de, 0xaf62c1],
      nuts:      [0xe6c89a, 0xd9b382, 0xc79a5b, 0xb07d45, 0x8a5a32]   // chopped almond → walnut tones
    };
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // look DOWN onto the donut at a 3/4 angle; the donut itself stays flat
    camera.position.set(0, 3.0, 5.3);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    stage.appendChild(renderer.domElement);

    // ---- Lighting (soft studio, tuned to keep colors rich) ----
    scene.add(new THREE.AmbientLight(0xfff3ea, 0.40));
    const key  = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(-2.5, 5, 4);  scene.add(key);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 22;
    key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 2.4; key.shadow.camera.bottom = -2.4;
    key.shadow.bias = -0.0004; key.shadow.radius = 4;
    const fill = new THREE.DirectionalLight(toInt(ds.fill, 0xffe6ef), 0.30); fill.position.set(3.5, 0.5, 3); scene.add(fill);
    const rim  = new THREE.DirectionalLight(0xffffff, 0.40); rim.position.set(1, 3, -4);     scene.add(rim);

    // ---- Donut: outer group = fixed 3/4 tilt; inner spinner = vertical-axis spin ----
    const donut = new THREE.Group();
    const spinner = new THREE.Group();
    donut.add(spinner);
    scene.add(donut);

    // ---- Procedural textures (generated on canvas - no image files needed) ----
    function noiseCanvas(size, o){
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d');
      x.fillStyle = '#808080'; x.fillRect(0,0,size,size);   // 128 gray = "no bump"
      x.globalAlpha = 0.5;
      for(let i=0;i<o.blobs;i++){
        const g = Math.max(0, Math.min(255, 128 + (Math.random()*2-1)*o.blobAmp));
        x.fillStyle = 'rgb('+g+','+g+','+g+')';
        const r = o.blobMin + Math.random()*(o.blobMax - o.blobMin);
        x.beginPath(); x.arc(Math.random()*size, Math.random()*size, r, 0, 6.283); x.fill();
      }
      x.globalAlpha = 1;
      if(o.grain){
        const img = x.getImageData(0,0,size,size), d = img.data;
        for(let i=0;i<d.length;i+=4){ const n=(Math.random()*2-1)*o.grain; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
        x.putImageData(img,0,0);
      }
      return c;
    }
    function bumpTex(canvas, rx, ry){
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    }
    const doughBump = bumpTex(noiseCanvas(256,{blobs:150,blobAmp:74,blobMin:5,blobMax:20,grain:26}), 10, 3);
    const frostBump = bumpTex(noiseCanvas(256,{blobs:70,blobAmp:34,blobMin:9,blobMax:26,grain:8}), 9, 3);

    // ---- Environment map: procedural "studio" so the glaze reflects light ----
    (function(){
      const ec = document.createElement('canvas'); ec.width = 512; ec.height = 256;
      const g = ec.getContext('2d');
      const grad = g.createLinearGradient(0,0,0,256);
      grad.addColorStop(0,'#fffefb'); grad.addColorStop(0.5,'#f1eadf'); grad.addColorStop(1,'#cabfb0');
      g.fillStyle = grad; g.fillRect(0,0,512,256);
      [['#ffffff',120,70,70],['#ffffff',370,95,46],['#fff2e6',255,40,34]].forEach(function(b){
        const rg = g.createRadialGradient(b[1],b[2],0,b[1],b[2],b[3]);
        rg.addColorStop(0, b[0]); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0,0,512,256);
      });
      const envTex = new THREE.CanvasTexture(ec);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      scene.environment = pmrem.fromEquirectangular(envTex).texture;
      envTex.dispose(); pmrem.dispose();
    })();

    const RING = 1.0;
    const DOUGH_TUBE = 0.46;
    const FROST_TUBE = 0.54;     // thicker than dough → overhanging lip
    const FROST_RISE = 0.10;     // lifted so it coats the top
    const FROST_CLIP_Y = 0.06;   // frosting only above this height → cake shows below

    // dough (hole axis vertical: rotate torus 90° about X)
    const dough = new THREE.Mesh(
      new THREE.TorusGeometry(RING, DOUGH_TUBE, 48, 220),
      new THREE.MeshStandardMaterial({ color:BRAND.dough, roughness:0.82, metalness:0.0, bumpMap:doughBump, bumpScale:0.03, envMapIntensity:0.3 })
    );
    dough.rotation.x = Math.PI/2;
    dough.castShadow = true; dough.receiveShadow = true;
    spinner.add(dough);

    // frosting (thick poured cap; wavy drip edge via shader discard)
    const frostMat = new THREE.MeshPhysicalMaterial({
      color:BRAND.frost, roughness:0.30, clearcoat:1, clearcoatRoughness:0.28, metalness:0,
      side:THREE.DoubleSide, bumpMap:frostBump, bumpScale:0.006, envMapIntensity:0.4
    });
    // donut-up height in frosting-local space is (-position.z); cut everything
    // below an uneven drip edge that waves around the ring angle.
    const DRIP_BASE = (FROST_CLIP_Y - FROST_RISE).toFixed(3);
    frostMat.onBeforeCompile = (shader)=>{
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
        .replace('#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n' +
          'float dripH = -vLocalPos.z;\n' +
          'float dripA = atan(vLocalPos.y, vLocalPos.x);\n' +
          'float dripEdge = ' + DRIP_BASE + ' + 0.055*sin(dripA*7.0) + 0.034*sin(dripA*13.0+1.3) + 0.02*sin(dripA*23.0+0.5);\n' +
          'if (dripH < dripEdge) discard;');
    };
    const frost = new THREE.Mesh(new THREE.TorusGeometry(RING, FROST_TUBE, 48, 260), frostMat);
    frost.rotation.x = Math.PI/2;
    frost.position.y = FROST_RISE;
    frost.castShadow = true; frost.receiveShadow = false;
    spinner.add(frost);

    // ---- Topping on the frosting's top surface (instanced): sprinkles (default) or chopped nuts ----
    const isNuts = TOPPING === 'nuts';
    const COUNT = isNuts ? 130 : 150;
    const topGeo = isNuts
      ? new THREE.IcosahedronGeometry(0.055, 0)           // faceted chunk → reads as a chopped nut
      : new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8);  // classic sprinkle pill
    const topMat = new THREE.MeshStandardMaterial(
      isNuts ? { roughness:0.72, metalness:0.0, flatShading:true }
             : { roughness:0.5, metalness:0.02 });
    const topping = new THREE.InstancedMesh(topGeo, topMat, COUNT);
    topping.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT*3), 3);
    const palette = isNuts ? BRAND.nuts : BRAND.sprinkles;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0,1,0);
    const tmpColor = new THREE.Color();
    const ft = FROST_TUBE * 1.0;
    let placed = 0, guard = 0;
    while(placed < COUNT && guard < COUNT*40){
      guard++;
      const u = Math.random()*Math.PI*2;     // around the ring
      const v = Math.random()*Math.PI*2;     // around the tube
      const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
      // torus with hole axis = Y
      const nx = cv*cu, ny = sv, nz = cv*su; // surface normal
      if(ny < 0.22) continue;                // top-facing → frosting crown & upper sides
      const px = (RING + ft*cv)*cu;
      const py = ft*sv + FROST_RISE;
      const pz = (RING + ft*cv)*su;

      if(isNuts){
        // rest the nut on the surface with a random tumble + irregular "chopped" scale
        dummy.position.set(px + nx*0.01, py + ny*0.01, pz + nz*0.01);
        dummy.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2);
        dummy.scale.set(0.7 + Math.random()*0.85, 0.5 + Math.random()*0.45, 0.7 + Math.random()*0.85);
      } else {
        // lay the sprinkle flat on the surface, random in-plane angle
        const normal = new THREE.Vector3(nx, ny, nz).normalize();
        const t1 = new THREE.Vector3(-su, 0, cu).normalize();
        const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();
        const ang = Math.random()*Math.PI*2;
        const dir = new THREE.Vector3().addScaledVector(t1, Math.cos(ang)).addScaledVector(t2, Math.sin(ang)).normalize();
        dummy.position.set(px + nx*0.012, py + ny*0.012, pz + nz*0.012);
        dummy.quaternion.setFromUnitVectors(up, dir);
        dummy.scale.setScalar(0.8 + Math.random()*0.55);
      }
      dummy.updateMatrix();
      topping.setMatrixAt(placed, dummy.matrix);
      tmpColor.setHex(palette[(Math.random()*palette.length)|0]);
      topping.setColorAt(placed, tmpColor);
      placed++;
    }
    topping.count = placed;
    topping.castShadow = true;
    topping.instanceMatrix.needsUpdate = true;
    if(topping.instanceColor) topping.instanceColor.needsUpdate = true;
    spinner.add(topping);

    // donut stays flat (hole axis vertical); spin is a clean vertical turntable
    donut.rotation.z = 0;

    function resize(){
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ---- Animate: vertical turntable spin + undulating wobble + mouse lean ----
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    if(!reduce){
      window.addEventListener('pointermove', (e)=>{
        tmx = (e.clientX / window.innerWidth) * 2 - 1;
        tmy = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive:true });
    }

    let t = 0;
    function loop(){
      requestAnimationFrame(loop);
      if(!reduce){
        t += 0.004;
        mx += (tmx - mx) * 0.045;                          // eased mouse follow
        my += (tmy - my) * 0.045;
        spinner.rotation.y = t;                            // clean vertical turntable spin
        donut.rotation.x = Math.sin(t*0.9)*0.05 + my*0.16; // undulating sway + lean to cursor
        donut.rotation.z = Math.sin(t*0.7)*0.04 - mx*0.16;
        donut.position.y = Math.sin(t*1.1)*0.045;          // gentle up/down undulation
      }
      renderer.render(scene, camera);
    }
    loop();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
