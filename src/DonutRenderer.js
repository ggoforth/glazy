// src/DonutRenderer.js
import { resolveThree, isWebGLAvailable, configureColorSpace } from './three-compat.js';
import { resolveOptions } from './options.js';
import { makeRng } from './seededRandom.js';
import { makeShape } from './shapes/index.js';
import { makeTopping } from './toppings/index.js';
import { buildLighting } from './scene/lighting.js';
import { buildStudioEnvironment } from './scene/environment.js';
import { buildCamera } from './scene/camera.js';
import { createMotionDriver } from './animation.js';
import { observeSize, observeVisibility } from './lifecycle.js';
import { disposeObject } from './dispose.js';

export class DonutRenderer {
  constructor(target, options = {}) {
    this.target = typeof target === 'string' ? document.querySelector(target) : target;
    this.options = resolveOptions(options);
    this.ok = false;
    this._raf = 0;
    this._t = 0;
    this._lean = { x: 0, y: 0 };
    this._leanTarget = { x: 0, y: 0 };
    this._visible = true;
    this._cleanups = [];

    const THREE = resolveThree(options.three);
    if (!THREE || !this.target) return;            // inert
    this.THREE = THREE;

    let renderer;
    try {
      if (!isWebGLAvailable() && !options.three) return; // real browser w/o WebGL → inert
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (_e) { return; }                        // inert on context failure
    this.renderer = renderer;

    this._build();
    this.ok = true;
  }

  _build() {
    const THREE = this.THREE, opts = this.options, renderer = this.renderer;
    const el = this.target;

    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, opts.pixelRatioCap));
    configureColorSpace(THREE, renderer);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(canvas);

    this.scene = new THREE.Scene();

    const env = buildStudioEnvironment(THREE, renderer);
    this.scene.environment = env.texture;
    this._env = env;

    const lighting = buildLighting(THREE, opts);
    this.scene.add(lighting.group);
    this._lighting = lighting;

    // donut(group: tilt/wobble) → spinner(group: turntable, zoom) → shape + toppings
    this.donut = new THREE.Group();
    this.spinner = new THREE.Group();
    this.spinner.scale.setScalar(opts.zoom); // zoom out (<1) / in (>1) without moving the camera
    this.donut.add(this.spinner);
    this.scene.add(this.donut);

    const rng = makeRng(opts.seed);
    const shape = makeShape(opts.shape, THREE, opts, rng);
    this.spinner.add(shape.group);
    this._shape = shape;

    const topping = makeTopping(opts.topping, THREE, shape.topSurface, opts, rng, shape.toppingScale ?? 1);
    if (topping) { this.spinner.add(topping.mesh); this._topping = topping; }

    this.camera = buildCamera(THREE, shape.frame);

    this._motion = createMotionDriver({ donut: this.donut, spinner: this.spinner, motion: opts.motion });

    this._setupReducedMotion();
    this._setupPointer();
    this._cleanups.push(observeSize(el, () => this._resize()));
    this._cleanups.push(observeVisibility(el, (vis) => { this._visible = vis; if (vis) this._start(); }));
    this._resize();

    if (this._reduced) this._renderStatic(); else this._start();
  }

  _setupReducedMotion() {
    if (this.options.reducedMotion === true) { this._reduced = true; return; }
    if (this.options.reducedMotion === false) { this._reduced = false; return; }
    const mq = globalThis.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this._reduced = mq ? mq.matches : false;
    if (mq) {
      const onChange = () => { this._reduced = mq.matches; if (this._reduced) this._renderStatic(); else this._start(); };
      mq.addEventListener('change', onChange);
      this._cleanups.push(() => mq.removeEventListener('change', onChange));
    }
  }

  _setupPointer() {
    if (!this.options.motion.lean.enabled) return;
    const src = this.options.motion.lean.source;
    const node = src === 'element' ? this.target : globalThis;
    const onMove = (e) => {
      if (src === 'element') {
        const r = this.target.getBoundingClientRect();
        this._leanTarget.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        this._leanTarget.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      } else {
        this._leanTarget.x = (e.clientX / globalThis.innerWidth) * 2 - 1;
        this._leanTarget.y = (e.clientY / globalThis.innerHeight) * 2 - 1;
      }
    };
    node.addEventListener('pointermove', onMove, { passive: true });
    this._cleanups.push(() => node.removeEventListener('pointermove', onMove));
  }

  _resize() {
    const w = this.target.clientWidth, h = this.target.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this._reduced) this._renderStatic();
  }

  _start() {
    if (this._reduced || this._raf || !this._visible || !this.ok) return;
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const ease = this.options.motion.lean.ease;
      this._lean.x += (this._leanTarget.x - this._lean.x) * ease;
      this._lean.y += (this._leanTarget.y - this._lean.y) * ease;
      this._t += 0.004;
      this._motion.step(this._t, this._lean);
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } }

  _renderStatic() { this._stop(); if (this._motion) this._motion.renderStatic(); this.renderer.render(this.scene, this.camera); }

  setOptions(patch = {}) {
    if (!this.ok) return;
    // simplest correct approach: re-resolve and rebuild the donut body/toppings.
    this.options = resolveOptions({ ...this._rawDescribe(), ...patch });
    this._teardownSceneContents();
    this._build();
  }

  _rawDescribe() { return { ...this.options, three: this.THREE }; }

  screenshot() {
    if (!this.ok) return null;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  _teardownSceneContents() {
    this._stop();
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    if (this.scene) disposeObject(this.scene);
    if (this._env) this._env.dispose();
    const canvas = this.renderer.domElement;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (!this.ok) return;
    this._teardownSceneContents();
    if (this.renderer.dispose) this.renderer.dispose();
    this.scene = this.camera = this._shape = this._topping = null;
    this.ok = false;
  }
}
