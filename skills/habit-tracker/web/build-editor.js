// build-editor.js - Bundle TipTap editor with esbuild
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/editor.js'],
  bundle: true,
  minify: true,
  outfile: 'public/js/tiptap-bundle.js',
  format: 'iife',
  globalName: 'TipTapBundle',
  target: ['es2018'],
  loader: {
    '.js': 'js'
  }
}).then(() => {
  console.log('TipTap bundle built successfully: public/js/tiptap-bundle.js');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
