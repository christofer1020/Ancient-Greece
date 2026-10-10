// Usage: node tools/slownet.mjs <title-url> <delayMs>
// Delays Chapter 1's scene module and plate (as on a slow connection), clicks Begin on the title screen and
// samples the player state every 250 ms: the curtain must answer at once and the chapter must still start.
import { chromium } from 'playwright';
const delay = +process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
// delay Chapter 1's scene module and plate, as on a slow connection (also delays the title screen's warm-up)
await p.route(/(birth\.js|chapter-01\/)/, async (r) => { await new Promise((s) => setTimeout(s, delay)); r.continue(); });
await p.goto(process.argv[2], { waitUntil: 'load' });
await p.waitForFunction(() => window.__player?.state === 'title' && !!window.__player.master, null, { timeout: 30000, polling: 200 });
await p.waitForTimeout(300);
const t0 = Date.now();
await p.click('#btnBegin');
const log = [];
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(250);
  log.push(await p.evaluate(() => { const pl = window.__player, pn = document.getElementById('curtainPanel');
    return `${pl.state}/${pl.idx} cur=${document.getElementById('app').dataset.curtain} tf=${getComputedStyle(pn).transform.replace(/matrix\(1, 0, 0, 1, /,'').replace(/\)/,'').split(',')[0]} mt=${pl.master?.time().toFixed(2)}`; }).catch((e) => 'eval ' + e.message));
}
console.log(log.map((l, i) => `${(i + 1) * 250}ms ${l}`).join('\n'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
