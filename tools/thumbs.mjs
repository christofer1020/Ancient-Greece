// Renders a poster frame for each chapter into src/assets/thumbs/<id>.jpg (used by the chapter menu).
// Usage: node tools/thumbs.mjs [baseUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:5173/';
fs.mkdirSync('src/assets/thumbs', { recursive: true });
const frames = [
  ['birth', 1, 24.5], ['myths', 2, 13.2], ['polis', 3, 21.5], ['athens-sparta', 4, 5.5],
  ['persian-wars', 5, 19.5], ['philosophy', 6, 21.5], ['alexander', 7, 3.2], ['legacy', 8, 3.2],
];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
// 1280x800 layout captured at 0.625x => 800x500 files (~50 KB each)
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.625 });
for (const [id, c, t] of frames) {
  await page.goto(`${base}?c=${c}&t=${t}&paused=1&ui=0&cc=0&sound=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('app').dataset.ready === '1');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `src/assets/thumbs/${id}.jpg`, type: 'jpeg', quality: 76 });
  console.log('thumb', id);
}
await browser.close();
