// Shared staging for asset-driven scenes: a painted environment plate with code water shimmer masked to its
// sea, ships seated on their waterline, drifting sky life and gentle sway for plants.
import * as S from './scenery.js';
import { sprite, asset } from './sprite.js';
import { setAttr, rng, NS } from './util.js';

// The plates span world x 0..2330, y -55..945 (1000 units tall).
export const PLATE = { x: 0, y: -55, w: 2330, h: 1000 };

/** Painted plate + water shimmer masked to the painted sea (shared with the title scene). */
export function plate(sc, L, key, maskKey, { sun, horizon, glitterW = 520, id = 'p' } = {}) {
  const P = PLATE, pl = asset(key), mk = asset(maskKey);
  sc.add(L, `<image href="${pl.src}" x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" preserveAspectRatio="none"/>`);
  const m = `${id}SeaMask`;
  sc.add(L, `<defs><mask id="${m}" maskUnits="userSpaceOnUse" x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}">
    <image href="${mk.src}" x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" preserveAspectRatio="none"/></mask></defs>`);
  const water = sc.add(L, `<g mask="url(#${m})"></g>`);
  // glints along the sun path (code light) + drifting wave highlights across the whole bay
  const gl = document.createElementNS(NS, 'g');
  gl.innerHTML = S.glitter({ x: sun[0], y: horizon + 4, h: 420, w: glitterW, n: 90, color: '#FFF4D6', seed: 6 });
  water.appendChild(gl);
  sc.scan(gl);
  const r = rng(17), hl = [];
  let s = '';
  for (let i = 0; i < 46; i++) {
    const y = horizon + 20 + r() * 420, k = 0.35 + (y - horizon) / 420;
    const w = (18 + r() * 34) * k;
    s += `<rect x="${(-w / 2).toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${(1.4 + 2.2 * k).toFixed(1)}" rx="1.4" fill="#F4F8FF"/>`;
    hl.push({ x: r() * P.w, y, vx: (3 + r() * 6) * k, ph: r() * 6.28, sp: 0.5 + r() * 0.9 });
  }
  const hg = document.createElementNS(NS, 'g');
  hg.innerHTML = s;
  water.appendChild(hg);
  const els = [...hg.children];
  sc.tick((t) => {
    for (let i = 0; i < els.length; i++) {
      const q = hl[i];
      let x = (q.x + t * q.vx) % (P.w + 200); if (x < 0) x += P.w + 200;
      setAttr(els[i], 'transform', `translate(${(x - 100).toFixed(1)} ${q.y.toFixed(1)})`);
      setAttr(els[i], 'opacity', (0.42 * Math.max(0, Math.sin(t * q.sp + q.ph))).toFixed(3));
    }
  });
  return { water };
}

/** A ship sprite whose hull is hidden below its waterline, with a soft wake; origin = waterline centre. */
export function ship(sc, L, key, { w, water = 0.885, sailKey = null, id = 'sh' } = {}) {
  const a = asset(key), h = (w * a.h) / a.w;
  const x0 = -w / 2, y0 = -water * h;
  const sail = sailKey ? `<g class="sail"><image href="${asset(sailKey).src}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" preserveAspectRatio="none"/></g>` : '';
  const el = sc.add(L, `<g><defs><clipPath id="${id}Wl"><rect x="${-w}" y="${-h * 2}" width="${w * 2}" height="${h * 2 + 1.5}"/></clipPath></defs>
    <ellipse cx="0" cy="2" rx="${(w * 0.46).toFixed(1)}" ry="${(h * 0.035 + 2).toFixed(1)}" fill="#1d3a5c" opacity=".28"/>
    <g clip-path="url(#${id}Wl)"><g class="hull"><image href="${a.src}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>${sail}</g></g>
    <path d="M${(-w * 0.44).toFixed(1)} 1 Q0 ${(4 + h * 0.01).toFixed(1)} ${(w * 0.44).toFixed(1)} 1" stroke="#F2F6FA" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/></g>`);
  return { el, hull: el.querySelector('.hull'), sail: el.querySelector('.sail'), w, h, x0, y0 };
}

/** Drifting cloud sprites + gulls with a two-frame flap (painted frames swapped, limited animation). */
export function skyLife(sc, L, { clouds = [], gulls = [] }) {
  const cs = clouds.map(([k, x, y, w, vx, op]) => ({ el: sc.add(L, sprite(k, { x, y, w, ay: 0.5, op })), x, y, vx }));
  const gs = gulls.map(([x, y, k, vx, ph]) => {
    const el = sc.add(L, `<g>${sprite('fx_gull_up', { x: 0, y: 0, w: 26 * k, ay: 0.6 })}${sprite('fx_gull_down', { x: 0, y: 0, w: 30 * k, ay: 0.4 })}</g>`);
    return { el, a: el.children[0], b: el.children[1], x, y, vx, ph };
  });
  sc.tick((t) => {
    for (const c of cs) setAttr(c.el, 'transform', `translate(${(c.x + t * c.vx).toFixed(1)} ${c.y})`);
    for (const g of gs) {
      let x = g.x + t * g.vx; if (x > 2500) x -= 2700;
      const up = Math.floor((t + g.ph) * 5) % 2 === 0;
      setAttr(g.el, 'transform', `translate(${x.toFixed(1)} ${(g.y + Math.sin(t * 0.6 + g.ph) * 10).toFixed(1)})`);
      setAttr(g.a, 'opacity', up ? 1 : 0); setAttr(g.b, 'opacity', up ? 0 : 1);
    }
  });
}

/** Rotate each element gently about its own origin (plants, branches). */
export function swayAll(sc, list) {
  sc.tick((t) => {
    for (const s_ of list) setAttr(s_.el, 'transform', `rotate(${(Math.sin(t * s_.sp + s_.ph) * s_.amp + Math.sin(t * s_.sp * 2.3 + s_.ph) * s_.amp * 0.25).toFixed(3)})`);
  });
}

