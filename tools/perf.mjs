import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.getElementById('app').dataset.ready === '1');
await page.click('#btnBegin');
const t0 = Date.now();
await page.waitForFunction(() => __player.state === 'playing', null, { timeout: 30000 });
console.log('curtain duration (Begin → playing):', ((Date.now() - t0) / 1000).toFixed(2), 's');
for (let c = 1; c <= 8; c++) {
  const r = await page.evaluate(async (c) => {
    const p = __player;
    const t0 = performance.now();
    await p.goTo(c - 1, { play: false, curtain: false, at: 12 });
    const build = performance.now() - t0;
    const sc = p.scene;
    const nodes = sc.root.querySelectorAll('*').length;
    // JS cost of a frame
    const N = 60; const f0 = performance.now();
    for (let i = 0; i < N; i++) { sc.t += 0.016; sc.frame(0.016, true); }
    const frame = (performance.now() - f0) / N;
    return { build: build.toFixed(0), nodes, frameMs: frame.toFixed(2), figs: sc.figs.length, amb: sc.amb.length, layers: sc.layers.length };
  }, c);
  console.log(`ch${c}`, JSON.stringify(r));
}
await browser.close();
