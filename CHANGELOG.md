# Changelog
All notable changes to this project are documented here. This project adheres to [Semantic Versioning](https://semver.org).

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
