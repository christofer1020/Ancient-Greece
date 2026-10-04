import { chromium } from 'playwright';
const [url, pts] = [process.argv[2], JSON.parse(process.argv[3])];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
const out = await p.evaluate((pts) => pts.map(([x, y]) => document.elementsFromPoint(x, y).filter((e) => e.tagName === 'image').slice(0, 4).map((e) => (e.getAttribute('href') || '').split('/').pop().slice(0, 40) + ' @' + (e.closest('svg.layer')?.dataset.name))), pts);
console.log(JSON.stringify(out, null, 1)); await b.close();
