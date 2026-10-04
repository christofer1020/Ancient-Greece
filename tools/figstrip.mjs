// Usage: node tools/figstrip.mjs <url> <figIndex> <from> <to> <step> <out.png>
// Steps the paused timeline and crops around one rig figure each frame (walk-cycle QA).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, idx, from, to, step, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await p.goto(url + '&t=' + from, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const dir = mkdtempSync(join(tmpdir(), 'fg-'));
const files = [];
for (let t = +from; t <= +to + 1e-6; t += +step) {
  const r = await p.evaluate(([t, i]) => {
    const pl = window.__player; pl.seek(t); pl.scene.frame(0, false);
    const g = pl.scene.figs[i].root.getBoundingClientRect();
    return { x: g.x, y: g.y, w: g.width, h: g.height };
  }, [t, +idx]);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, W = 260, H = 330;
  const f = join(dir, `f${String(files.length).padStart(3, '0')}.png`);
  await p.screenshot({ path: f, clip: { x: Math.max(0, Math.min(1600 - W, cx - W / 2)), y: Math.max(0, Math.min(900 - H, cy - H / 2)), width: W, height: H } });
  execFileSync('convert', [f, '-gravity', 'NorthWest', '-pointsize', '14', '-fill', 'white', '-undercolor', '#0008', '-annotate', '+4+3', t.toFixed(2), f]);
  files.push(f);
}
execFileSync('montage', [...files, '-tile', '8x', '-geometry', '+2+2', '-background', '#222', out]);
console.log(out, files.length);
await b.close();
