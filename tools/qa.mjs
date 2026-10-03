// End-to-end smoke test + screenshots. Usage: node tools/qa.mjs [baseUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:5173/';
const out = process.env.OUT || '/tmp/claude-0/shots/qa';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
const log = (...a) => console.log(...a);
const state = () => page.evaluate(() => ({ s: __player.state, idx: __player.idx, t: __player.master ? +__player.master.time().toFixed(2) : null, ui: document.getElementById('app').dataset.ui, cur: document.getElementById('app').dataset.curtain || '' }));

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.getElementById('app').dataset.ready === '1');
log('title', await state());
await page.screenshot({ path: `${out}/01-title.png` });

// begin
await page.click('#btnBegin');
await page.waitForTimeout(1800);
log('curtain-in', await state());
await page.screenshot({ path: `${out}/02-curtain.png` });
await page.waitForTimeout(3600);
log('after-curtain', await state());
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/03-playing.png` });
log('playing', await state());

// fps probe
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 3000) res(n / 3); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
log('fps (software GL, headless):', fps.toFixed(1));

// pause / resume
await page.keyboard.press('Space'); await page.waitForTimeout(300); log('paused', await state());
const t1 = await page.evaluate(() => __player.master.time()); await page.waitForTimeout(800); const t2 = await page.evaluate(() => __player.master.time());
log('time frozen while paused:', t1 === t2);
await page.keyboard.press('Space'); await page.waitForTimeout(300); log('resumed', await state());

// captions + sound toggles
await page.keyboard.press('c'); log('captions', await page.evaluate(() => document.getElementById('app').dataset.captions));
await page.keyboard.press('c');
await page.keyboard.press('m'); log('sound pressed', await page.evaluate(() => document.getElementById('btnSound').getAttribute('aria-pressed')));
await page.keyboard.press('m');

// scrub on timeline
const seg = await page.$('.seg.current .seg-track');
const box = await seg.boundingBox();
await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
await page.waitForTimeout(500);
log('scrubbed', await state());
await page.screenshot({ path: `${out}/04-scrubbed.png` });

// menu
await page.click('#btnMenuTop'); await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/05-menu.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
log('menu closed', await page.evaluate(() => document.getElementById('app').dataset.menu || 'closed'));

// next chapter
await page.click('#btnNext'); await page.waitForTimeout(1500); log('next -> curtain', await state());
await page.waitForFunction(() => __player.state === 'playing', null, { timeout: 30000 }); await page.waitForTimeout(2500); log('next -> playing', await state());
await page.screenshot({ path: `${out}/06-chapter2.png` });

// previous
await page.click('#btnPrev'); await page.waitForFunction(() => __player.state === 'playing' && __player.idx === 0, null, { timeout: 30000 }); log('prev', await state());

// jump via number key to the last chapter, let it run to the end card (fast-forward by seeking)
await page.keyboard.press('8'); await page.waitForFunction(() => __player.state === 'playing' && __player.idx === 7, null, { timeout: 30000 });
log('ch8', await state());
await page.evaluate(() => __player.seek(34));
await page.waitForTimeout(5500);
log('end?', await state(), await page.evaluate(() => document.getElementById('app').dataset.end));
await page.screenshot({ path: `${out}/07-end.png` });

console.log('\nconsole errors/warnings:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
