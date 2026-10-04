// Usage: node tools/filmstrip.mjs <url-without-t> <out.png> [from] [to] [step] [w] [h]
// Renders the paused chapter at evenly spaced times and tiles the frames (dev QA aid).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, out, from = '0', to = '34', step = '2', w = '800', h = '450'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url + '&t=' + from, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const dir = mkdtempSync(join(tmpdir(), 'fs-'));
const files = [];
for (let t = +from; t <= +to + 1e-6; t += +step) {
  await p.evaluate((t) => { const pl = window.__player; pl.seek ? pl.seek(t) : pl.master.time(t, true); pl.scene.frame(0, false); }, t);
  await p.waitForTimeout(120);
  const f = join(dir, `f${String(files.length).padStart(3, '0')}.png`);
  await p.screenshot({ path: f });
  execFileSync('convert', [f, '-gravity', 'NorthWest', '-pointsize', '18', '-fill', 'white', '-undercolor', '#0008', '-annotate', '+6+4', `t=${t.toFixed(1)}`, f]);
  files.push(f);
}
execFileSync('montage', [...files, '-tile', '3x', '-geometry', '+4+4', '-background', '#222', out]);
console.log(out, files.length, errs.length ? errs : 'no errors');
await b.close();
