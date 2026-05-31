# Contributing to glazy

Thanks for your interest in improving glazy! This guide covers local development,
the test/lint/build workflow, and how to extend the library.

## Development setup

```sh
git clone https://github.com/greggoforth/glazy
cd glazy
npm install
```

Three.js is a peer dependency and is installed as a dev dependency for the test and
example workflows.

## Workflow

| Command | What it does |
|---|---|
| `npm test` | Run the Vitest suite once (jsdom + mocked THREE). |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run lint` | Lint `src` and `test` with ESLint. |
| `npm run build` | Produce the ESM, UMD, and min IIFE bundles plus `dist/glazy.d.ts`. |

Before opening a PR, make sure `npm run lint`, `npm test`, and `npm run build` all
pass. `prepublishOnly` runs all three.

### Testing policy: no real WebGL in CI

The test suite never creates a real WebGL context. Rendering code is exercised
against a **mock THREE** (`test/mockThree.js`) that builds the scene graph and
records `dispose()` calls in jsdom. Pure logic (options, presets, motion, autoInit,
RNG, disposal) is tested with real assertions. Visual realism is verified manually
by opening the pages in [`examples/`](examples/) in a browser — not in CI.

When adding rendering code, keep it provable by the mock: avoid touching globals or
APIs the mock can't stand in for, and route any version-sensitive Three.js color API
through `src/three-compat.js`.

## Adding a shape

1. Create a new file in `src/shapes/` (e.g. `src/shapes/twist.js`) that exports a
   factory returning `{ group, topSurface, frame }`:
   - `group` — the `THREE.Group` holding the dough + frosting meshes.
   - `topSurface` — a sampler with a `sample(count, rng)` method returning placements
     (`{ position, normal }`) so toppings stay geometry-agnostic.
   - `frame` — optional per-shape camera framing (`{ fov, position, target }`).
2. Register it in `src/shapes/index.js` (add it to the `shapes` map keyed by its
   string name).
3. Add the new name to the `Shape` union in `types/glazy.d.ts` and to the `SHAPES`
   enum guard in `src/options.js`.
4. Extend `test/shapes.test.js` to cover the new shape (registry + sampler builds
   without throwing under mock THREE).

## Adding a preset

1. Add an entry to the `presets` object in `src/presets.js` — a bag of options
   merged **under** explicit options (it can carry finish, dough, topping, fill, and
   color, not just `frost`).
2. Optionally add it to the presets table/gallery in `README.md`.

Presets are validated by `test/presets.test.js` (precedence: `defaults < preset <
explicit`).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`,
`docs:`, `test:`, `chore:`, `ci:`, etc. Keep the subject imperative and concise.

## Pull requests

- One focused change per PR.
- Include or update tests for any behavior change.
- Make sure lint, tests, and build are green before requesting review.
