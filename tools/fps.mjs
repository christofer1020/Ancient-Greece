// Usage: node tools/fps.mjs <base-url> [chapter] [w] [h] — plays a chapter and reports rAF frame stats (software GL, pessimistic).
import { chromium } from 'playwright';
const [base, ch = '1', w = '1600', h = '900'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(`${base}?c=${ch}&t=14&ui=0&cc=0&sound=0`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const r = await p.evaluate(() => new Promise((res) => {
  const ts = []; const t0 = performance.now();
  const f = (t) => { ts.push(t); if (t - t0 < 4000) requestAnimationFrame(f); else {
    const d = ts.slice(1).map((v, i) => v - ts[i]).sort((a, c) => a - c);
    res({ fps: (d.length / ((ts.at(-1) - ts[0]) / 1000)).toFixed(1), p50: d[Math.floor(d.length * 0.5)].toFixed(1), p95: d[Math.floor(d.length * 0.95)].toFixed(1) });
  } };
  requestAnimationFrame(f);
}));
console.log(`ch${ch} ${w}x${h}`, JSON.stringify(r));
await b.close();
