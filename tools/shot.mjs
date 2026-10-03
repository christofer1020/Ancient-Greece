// Usage: node tools/shot.mjs <url> <out.png> [width] [height] [waitMs] [js-to-eval-before]
// env: CLIP="x,y,w,h"  DSF=2
import { chromium } from 'playwright';
const [url, out, w = '1600', h = '900', wait = '600', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || 1) });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
if (js) await page.evaluate(js);
await page.waitForTimeout(+wait);
const opts = { path: out };
if (process.env.CLIP) { const [x, y, cw, ch] = process.env.CLIP.split(',').map(Number); opts.clip = { x, y, width: cw, height: ch }; }
await page.screenshot(opts);
console.log(logs.join('\n') || 'no console output');
await browser.close();
