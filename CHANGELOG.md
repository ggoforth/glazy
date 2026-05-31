# Changelog
All notable changes to this project are documented here. This project adheres to [Semantic Versioning](https://semver.org).

## [0.1.3] - 2026-05-31
### Fixed
- Frosting now follows the dough's geometric grain (shared grain field), so the
  bumpy dough no longer pokes through the glaze (broke the bar on all finishes
  and the old-fashioned on `plain`).
- The thin translucent `plain` coat renders single-sided with a polygon offset
  so it no longer z-fights the dough on real GPUs.

## [0.1.2] - 2026-05-31
### Added
- Topping: coconut flakes. Frost finishes: `plain` (thin translucent white) and
  `none` (no frosting). Per-shape topping scale.
### Changed
- Bar rebuilt from a CapsuleGeometry (rounded ends, no seam tearing), taller,
  with sprinkles along the full length.
- Cruller twist tightened; old-fashioned reworked to a glazed, craggy, lobed cake.
- `crust` now visibly browns the dough; `doughGrain` is real geometric surface
  displacement (visible on any renderer).

## [0.1.1] - 2026-05-31
### Added
- Committed browser-ready `dist/` so the bundles can be loaded over jsDelivr's
  GitHub passthrough (`cdn.jsdelivr.net/gh/ggoforth/glazy@<tag>/dist/...`).
- README "No-build / static site (import map)" section with a copy-pasteable snippet.
- `examples/cdn.html` demonstrating the import-map + jsDelivr-from-GitHub pattern.
### Changed
- `resolveThree` now falls back to the bundled bare `three` import, so an ESM
  consumer can `import { autoInit } from 'glazy'` and have Three resolve from an
  import map without passing or globalizing it. Three stays external (not bundled).
- Reworked the bar (flat long-john) and old-fashioned (craggy blossom) shapes.

## [0.1.0] - 2026-05-30
### Added
- Initial release: `DonutRenderer`, `autoInit`, presets.
- Shapes: ring, bar, old-fashioned. Toppings: sprinkles, nuts, none.
- Configurable materials (glaze/frosting finishes, crust, procedural normal maps).
- Configurable motion (spin, wobble, bob, pointer-lean) with reduced-motion support.
- ESM + UMD + min builds, TypeScript types.
