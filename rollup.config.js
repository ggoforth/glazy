import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const banner = '/*! glazy | MIT License | https://github.com/greggoforth/glazy */';
const external = ['three'];
const globals = { three: 'THREE' };

export default [
  {
    input: 'src/index.js',
    external,
    output: { file: 'dist/glazy.esm.js', format: 'es', banner },
    plugins: [resolve()],
  },
  {
    // UMD/IIFE entry includes DOMContentLoaded auto-init (src/umd.js).
    input: 'src/umd.js',
    external,
    output: { file: 'dist/glazy.umd.js', format: 'umd', name: 'Glazy', globals, banner },
    plugins: [resolve()],
  },
  {
    input: 'src/umd.js',
    external,
    output: { file: 'dist/glazy.min.js', format: 'iife', name: 'Glazy', globals, banner },
    plugins: [resolve(), terser()],
  },
];
