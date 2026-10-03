// Builds dist-standalone/index.html: one self-contained file that loads React
// from a CDN. Useful for hosting without a build server. Run: node build-standalone.mjs
// (Needs esbuild: npm i -D esbuild)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  write: false,
  minify: true,
  format: 'iife',
  outdir: 'out',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  alias: { react: './shim/react.cjs', 'react-dom/client': './shim/react-dom-client.cjs' },
  banner: { js: 'var React = window.React;' },
});
const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = result.outputFiles.find((f) => f.path.endsWith('.css')).text;
const head = readFileSync('index.html', 'utf8').split('</head>')[0];
const html = `${head}<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script>${js}</script>
</body>
</html>
`;
mkdirSync('dist-standalone', { recursive: true });
writeFileSync('dist-standalone/index.html', html);
console.log('Wrote dist-standalone/index.html', (html.length / 1024).toFixed(0) + ' KB');
