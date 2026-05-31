# glazy — design

**Status:** approved (brainstorm) · **Date:** 2026-05-30

A small, well-crafted open-source library that renders a spinning, photoreal-ish 3D
donut in a `<canvas>` using Three.js. Extracted and generalized from a working
single-file reference (`donut3d.js`) into a clean, documented, configurable,
publish-ready library.

- **Package / global / repo:** `glazy` · `window.Glazy` · `glazy`
- **Three.js:** peer dependency, **modern only (r160+ / `>=0.160.0`)**, using
  `outputColorSpace` / `SRGBColorSpace`.
- **Build:** Rollup → ESM + UMD + minified IIFE; hand-authored `.d.ts`.
- **Runtime deps:** none except the `three` peer. No framework.

---

## 1. Goals & non-goals

### Goals
- Generalize the reference's **ring donut** into a reusable, configurable library
  while preserving every behavior it already has.
- Ship **three shapes** in v1: `ring`, `bar`, `old-fashioned` — each a distinct
  body generator sharing one cap / topping / lighting / animation system.
- **Realism is a first-class, configurable layer**: dimensional glaze and frosting
  with moving specular reflections, baked-looking cake with crust tone, and
  textured toppings — all driven by options/presets so the user can generate many
  kinds of donuts by changing colors, finishes, and toppings.
- Work in a **no-bundler static site**: a plain `<script src>` global build, an ESM
  build, and `.d.ts` types.
- Production quality: full GPU/listener cleanup on `destroy()`, `ResizeObserver`
  sizing, `IntersectionObserver` pause-when-offscreen, reduced-motion support,
  option validation, and graceful no-op when WebGL/THREE is unavailable.

### Non-goals (v1)
- The full ~30-form donut glossary. The architecture is **extensible** (pluggable
  shape registry) so future forms (long john, bear claw, twist, cruller, holes,
  Boston cream) are additive, but only `ring` / `bar` / `old-fashioned` ship now.
- Bundling Three.js. It is always external/peer.
- React/Vue/framework wrappers.
- Orbit/zoom camera controls (the donut is decorative, not interactive 3D).

---

## 2. Architecture

The reference is one ~240-line IIFE. We decompose into focused units with clear
interfaces, using a **registry of pure factories orchestrated by a thin
`DonutRenderer` class**.

> **The defining seam:** Shapes don't know about toppings. Toppings don't know
> about geometry. The renderer orchestrates.

### Alternatives considered
1. **Strategy/registry of pure factories + thin orchestrator** — *chosen.* Shapes
   and toppings are factory functions registered by name. Adding a glossary shape =
   one new file + one registry line. Clean, testable, composable.
2. **Inheritance hierarchy** (`BaseDonut` → `RingDonut`, …) — rejected: shared
   mutable state tangles; topping × shape composition gets awkward.
3. **Monolith with `switch(shape)`** — rejected: it's exactly what we're refactoring
   away from and won't scale to the glossary.

### Core interfaces

**Shape factory** — owns its body and knows how to sample its own frosted top:
```
makeShape(THREE, opts, rng) -> {
  group:      THREE.Group,        // dough + frosting-cap meshes, added to the spinner
  topSurface: SurfaceSampler,     // sample({u,v}) -> { position, normal } on the frosted crown
  frame:      CameraFrame,        // recommended camera position/target/fov for this shape
  dispose():  void
}
```

**SurfaceSampler** — the abstraction that lets toppings work on any shape:
```
SurfaceSampler = {
  // returns N candidate placements on the top-facing frosted surface,
  // each { position: Vec3, normal: Vec3, tangent: Vec3 }, already filtered
  // to "top-facing" (normal.y above a threshold).
  sample(count, rng) -> Placement[]
}
```

**Topping factory** — geometry-agnostic; consumes placements:
```
makeTopping(THREE, placements, palette, rng) -> {
  mesh:      THREE.InstancedMesh,
  dispose(): void
}
```

### Frosting drip edge (generalized)
The wavy poured lip stays an `onBeforeCompile` fragment discard. The **noise-sum
waveform is shared**; each shape supplies how its edge coordinate is computed:
- `ring` / `old-fashioned`: edge varies with **ring angle** (`atan(y, x)`).
- `bar`: edge varies along the **perimeter parameter** of the stadium cap.

So the drip lip generalizes per shape instead of being hardcoded to the torus.

---

## 3. Module structure

```
src/
  index.js            public exports: DonutRenderer, autoInit, presets, version
  DonutRenderer.js    orchestrator: lifecycle, scene, render loop, setOptions, screenshot, destroy
  options.js          schema, normalize/validate, hex parsing, option precedence
  presets.js          strawberry · blueberry · matcha · chocolate (data-driven bags of options)
  autoInit.js         DOM scan + data-* parsing -> one renderer per element
  three-compat.js     resolve THREE (injected | global), color-space setup, WebGL feature check
  seededRandom.js     mulberry32 PRNG for deterministic `seed`
  dispose.js          recursive GPU resource disposal helper
  animation.js        turntable spin + wobble + eased mouse-lean, reduced-motion aware
  lifecycle.js        ResizeObserver (size) + IntersectionObserver (pause off-screen)
  scene/
    lighting.js       ambient + key(shadow) + fill(tinted) + rim -> { group, dispose }
    environment.js    procedural studio canvas -> equirect -> PMREM env texture
    camera.js         PerspectiveCamera setup, applies a shape's CameraFrame
  materials/
    textures.js       procedural noise canvas -> CanvasTexture (bump) + derived normal map
    doughMaterial.js  MeshStandardMaterial: grain bump, crust tone, configurable roughness
    frostMaterial.js  MeshPhysicalMaterial: glaze|frosting finish, normal map, drip-edge patch
  shapes/
    index.js          registry: name -> factory
    Shape.js          interface contract (JSDoc typedefs)
    ring.js           torus dough + torus frosting cap
    bar.js            stadium-prism dough + matching frosting cap
    oldFashioned.js   fluted/craggy ring generator (radial flutes + surface displacement)
  toppings/
    index.js          registry: name -> factory
    scatter.js        shared placement helper over a SurfaceSampler (jitter, count clamp)
    sprinkles.js      cylinder pills, laid flat, per-instance color/scale jitter
    nuts.js           faceted icosahedra, flat-shaded, irregular "chopped" scale
types/
  glazy.d.ts          hand-authored public types (src is plain JS)
```

Each file has one clear purpose, a documented interface, and is testable in
isolation against a mocked THREE.

---

## 4. Materials & realism (core craft)

Realism is promoted from fixed constants to a configurable first-class layer.

### Glaze / frosting (the top) — two finishes, both dimensional
`frostFinish: 'glaze' | 'frosting'` — the real-world split in the glossary:
- **`glaze`** (default): wet, poured, glossy. `MeshPhysicalMaterial`,
  `clearcoat:1`, low `clearcoatRoughness`, reflecting the PMREM studio env so
  specular highlights **travel across the surface as it spins**. This sells "3D."
- **`frosting`**: thick, matte, chocolate-frosted. Higher roughness, low/no
  clearcoat, stronger surface relief.

Beyond bump, generate a **procedural normal map** from the noise field so the glaze
shows real poured-surface undulation and the drip lip catches light — more
convincing than `bumpScale` alone.

Knobs: `frost`, `frostFinish`, `frostRoughness`, `frostClearcoat`, `glazeTextureScale`.

### Cake / dough — baked, not plastic
Procedural grain bump (kept), plus a **subtle crust tone**: the cooked outer band
reads slightly darker/warmer than the interior near the glaze line. Optional, on by
default. Knobs: `dough`, `doughRoughness`, `doughGrain`, `crust`.

### Toppings
Sprinkles keep a slight gloss; nuts stay flat-shaded faceted. Add small
**per-instance color + scale jitter** so instances don't look stamped.

### Environment & light
Ambient + key (casts shadow) + fill (tinted, `fillLight`) + rim. The procedural
studio env gets a couple of soft highlight cards so the glaze gets believable
moving specular streaks. Transparent canvas (`alpha:true`),
`preserveDrawingBuffer:true`, pixel ratio capped, soft (PCF) shadow maps.

Because materials are data-driven, a **preset is a bag of these values** — carrying
finish + texture, not just color.

---

## 5. Options schema (normalized)

| Option | Type | Default | Notes |
|---|---|---|---|
| `three` | THREE \| null | `null` | injected; falls back to global `THREE` |
| `shape` | string | `'ring'` | `'ring'` \| `'bar'` \| `'old-fashioned'` |
| `preset` | string \| null | `null` | merged **under** explicit options |
| `dough` | color | `0xdf9f48` | accepts `0xRRGGBB`, `'#rrggbb'`, `'rrggbb'`, number |
| `frost` | color | `0xed4359` | glaze/frosting color |
| `frostFinish` | string | `'glaze'` | `'glaze'` \| `'frosting'` |
| `frostRoughness` | number | finish-dependent | clamped `[0,1]` |
| `frostClearcoat` | number | finish-dependent | clamped `[0,1]` |
| `glazeTextureScale` | number | `1` | surface-relief strength |
| `doughRoughness` | number | `0.82` | clamped `[0,1]` |
| `doughGrain` | number | `1` | grain bump intensity |
| `crust` | bool \| number | `true` | crust-tone strength (`true` = default) |
| `fillLight` | color | `0xffe6ef` | fill-light tint |
| `topping` | string | `'sprinkles'` | `'sprinkles'` \| `'nuts'` \| `'none'` |
| `sprinkleColors` | color[] | brand palette | |
| `nutColors` | color[] | tan→walnut | |
| `toppingCount` | int | `150` | clamped `[0, 2000]` |
| `spinSpeed` | number | `0.004` | |
| `wobble` | bool | `true` | undulating sway/bob |
| `mouseLean` | bool | `true` | eased lean toward cursor |
| `reducedMotion` | `'auto'` \| bool | `'auto'` | live-responsive via `matchMedia` |
| `pixelRatioCap` | number | `2` | |
| `seed` | int \| null | `null` | set → deterministic placement & colors |
| `materials` | object | `{}` | deep-override escape hatch: `{ dough:{…}, frost:{…} }` |

**Precedence:** `defaults < preset < explicit options`. For `autoInit`, the parsed
`data-*` attributes **are** the explicit options.

**Normalization rules:**
- Colors: parse `0xRRGGBB` numbers, `'#rrggbb'`, `'rrggbb'`, or names already
  numeric; invalid → fall back to default with a single `console.warn`.
- Counts: coerce to int, clamp to `[0, 2000]`.
- Booleans from `data-*`: `'true'`/`''`/present → true, `'false'`/`'0'` → false.
- Unknown `shape`/`topping`/`preset`: warn once, fall back to default.

---

## 6. Public API

```js
import { DonutRenderer, autoInit, presets } from 'glazy';

const donut = new DonutRenderer(targetEl, {
  three: THREE,            // optional if global THREE exists
  preset: 'strawberry',
  frost: 0xed4359,
  topping: 'sprinkles',
  // …any option above
});

donut.setOptions({ frost: 0x3a73cf, topping: 'nuts', shape: 'bar' }); // live update
donut.screenshot();   // -> PNG dataURL (preserveDrawingBuffer is on)
donut.destroy();      // full GPU + listener cleanup

autoInit('[data-donut]'); // scan DOM, one renderer per element (auto-runs in UMD build)
```

- **`setOptions`** diffs the incoming options and rebuilds only what changed
  (e.g. changing `frost` recolors the material; changing `shape` rebuilds the body;
  changing `spinSpeed` touches only the animation). Cheap changes never rebuild the
  scene.
- **UMD build** calls `autoInit()` automatically on `DOMContentLoaded`.
- `version` is exported.

### data-* attributes (autoInit)
`data-donut` (marker), `data-shape`, `data-preset`, `data-frost`, `data-dough`,
`data-frost-finish`, `data-topping`, `data-count`, `data-spin-speed`, `data-fill`,
`data-wobble`, `data-mouse-lean`, `data-seed`. Multiple instances per page supported.

---

## 7. Presets

Data-driven bags of options, easy to extend:

| Preset | Finish | Frost | Dough | Topping | Fill |
|---|---|---|---|---|---|
| `strawberry` | glaze | pink `0xed4359` | golden | sprinkles | warm `0xffe6ef` |
| `blueberry` | glaze | blue `0x3a73cf` | golden | nuts | cool |
| `matcha` | glaze | green | golden | nuts | neutral-cool |
| `chocolate` | frosting | dark brown | dark + crust | none/sprinkles | neutral |

Passing `preset: 'blueberry'` merges under any explicit fields, so individual
options always override the preset.

---

## 8. Lifecycle, a11y, graceful degradation

- **`destroy()`**: cancel rAF; disconnect `ResizeObserver` + `IntersectionObserver`;
  remove the pointer listener and the `matchMedia` listener; walk the scene
  disposing every geometry / material / texture / render target; dispose the
  renderer; remove the canvas; null references. No leaks.
- **Sizing:** `ResizeObserver` on the target element (not `window.resize`).
- **Battery/GPU:** `IntersectionObserver` pauses the rAF loop when the canvas is
  off-screen and resumes on re-entry.
- **Reduced motion:** `prefers-reduced-motion: reduce` renders a single static
  frame; a `matchMedia` change listener responds live. The `reducedMotion` option
  (`true`/`false`) overrides auto-detection.
- **Decorative:** the canvas is given `aria-hidden="true"`; README documents it as
  decorative.
- **Graceful failure:** if THREE can't be resolved or a WebGL context can't be
  created, log **one** `console.warn` and return an **inert instance** whose
  methods (`setOptions`, `screenshot`, `destroy`) are safe no-ops. Never throws.
- **Determinism:** `seededRandom` (mulberry32) threads through shape + topping
  factories; with `seed` set, placement and color selection are fully reproducible.

---

## 9. Build, packaging, types

- **Rollup** emits:
  - `dist/glazy.esm.js` (ESM)
  - `dist/glazy.umd.js` (UMD, global `Glazy`, `three` external/global)
  - `dist/glazy.min.js` (minified IIFE)
  - `dist/glazy.d.ts` (copied from hand-authored `types/glazy.d.ts`)
- **package.json:** `main` (umd), `module` (esm), `types`, `exports` map,
  `files: ["dist"]`, `peerDependencies: { "three": ">=0.160.0" }`,
  `sideEffects: false`. README states the exact pinned version tested against.
- Architecture allows adding CJS/SystemJS outputs later without a rewrite.

---

## 10. Testing (vitest + jsdom, mocked THREE — no real WebGL)

A small **mock THREE** exposes the constructors used (Scene, Group,
PerspectiveCamera, a WebGLRenderer stub, lights, geometries, materials, Mesh,
InstancedMesh, Vector3, Quaternion, Color, Object3D, CanvasTexture,
PMREMGenerator) with `dispose` spies.

Test coverage:
- **options.js**: hex parsing (all accepted forms + invalid fallback), count
  clamping, boolean coercion, unknown enum fallback.
- **presets.js**: preset merge + precedence (`defaults < preset < explicit`).
- **autoInit.js**: element discovery, multiple instances, `data-*` parsing.
- **seededRandom.js**: same seed → identical sequence; different seed → different.
- **DonutRenderer smoke test**: constructs with mock THREE, builds the scene graph
  for each shape without throwing; `destroy()` calls `dispose` on created resources
  (verified via spies); double-`destroy()` is safe.
- **Graceful paths**: missing THREE and failed WebGL context both no-op without
  throwing.

CI does not attempt real WebGL.

---

## 11. CI & repo deliverables

- **CI (GitHub Actions):** install → lint (ESLint) → test (vitest) → build (Rollup).
  Separate job deploys **GitHub Pages** from `examples/` + `dist/`.
- **Repo:** MIT `LICENSE`; `README.md` (hero gif/screenshots, npm + `<script>` CDN
  install, ESM + global quick-starts, data-attribute usage, full options table,
  presets gallery, shapes gallery, Three.js compatibility note, `destroy()`/SPA
  guidance); `CHANGELOG.md`; `CONTRIBUTING.md`; semver.
- **examples/** (open with no build):
  - (a) single global-`<script>` donut
  - (b) ESM import
  - (c) `data-donut` auto-init with several presets side-by-side
  - (d) live controls (color pickers, shape + topping toggles) to tune values

---

## 12. Risks / notes

- **`old-fashioned`** is the highest-effort shape — a real fluted/craggy ring
  generator (radial flutes + surface displacement), not a torus reskin. Budget
  accordingly.
- **`screenshot()`** depends on `preserveDrawingBuffer: true` (already on); keep it.
- Procedural **normal maps** add realism but cost a little setup time per instance;
  generated once and shared across meshes, disposed on `destroy()`.
