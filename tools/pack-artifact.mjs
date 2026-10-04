// Packs the whole experience into ONE self-contained HTML fragment for publishing as an Artifact.
//
//   node tools/pack-artifact.mjs      →  dist-artifact/ancient-greece.html   (the fragment to publish)
//                                        dist-artifact/preview.html          (same, wrapped in a full document for local tests)
//
// Everything is inlined: JS (one IIFE, all chapters bundled), CSS, fonts and chapter posters as data: URIs.
// The artifact host allows no other external loads, and wraps the fragment in its own <html>/<head>/<body>.
import { build } from 'esbuild';
import fs from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const outDir = `${root}dist-artifact`;
fs.mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [`${root}src/main.js`],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outdir: outDir,
  write: false,
  legalComments: 'none',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl' },
  logLevel: 'warning',
});

let js = '';
let css = '';
for (const f of result.outputFiles) {
  if (f.path.endsWith('.js')) js = f.text;
  else if (f.path.endsWith('.css')) css = f.text;
}
if (!js || !css) throw new Error('expected one JS and one CSS output');

// Keep only the woff2 source of each @font-face (every browser that can run this supports it).
const before = css.length;
css = css.replace(/,\s*url\(data:font\/woff;base64,[^)]*\)\s*format\(["']woff["']\)/g, '');
console.log(`css: dropped ${((before - css.length) / 1024).toFixed(0)} KB of woff fallbacks`);

// Never let the bundle close its own <script> tag or open an HTML comment.
js = js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
css = css.replace(/<\/(style)/gi, '<\\/$1');

// Pull the page markup and the critical CSS out of index.html so there is one source of truth.
const html = fs.readFileSync(`${root}index.html`, 'utf8');
const bodyMatch = html.match(/<body>([\s\S]*?)<script type="module"[^>]*><\/script>\s*<\/body>/);
if (!bodyMatch) throw new Error('could not find <body> markup in index.html');
const markup = bodyMatch[1].trim();
const critical = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1].trim();
const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, 'Ancient Greece'])[1];

const fragment = `<title>${title}</title>
<style>
${critical}
${css}
</style>
${markup}
<script>
${js}
</script>
`;

// A local stand-in for the host's wrapper (charset, viewport, safe-area reset) so the fragment can be tested.
const preview = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${fragment}
</body></html>
`;

fs.writeFileSync(`${outDir}/ancient-greece.html`, fragment);
fs.writeFileSync(`${outDir}/preview.html`, preview);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`js ${kb(js.length)} · css ${kb(css.length)} · fragment ${kb(fragment.length)} (limit 16 MB)`);
const external = fragment.match(/(?:src|href)=["']https?:\/\/[^"']+/g) || [];
const urlRefs = (css.match(/url\((?!data:)[^)]+\)/g) || []).filter((u) => !u.startsWith('url(#'));
console.log('external src/href in markup:', external.length ? external : 'none');
console.log('non-data url() in css:', urlRefs.length ? urlRefs.slice(0, 5) : 'none');
