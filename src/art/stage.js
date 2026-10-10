// Shared staging for asset-driven scenes: a painted environment plate with code water shimmer masked to its
// sea, ships seated on their waterline, drifting sky life and gentle sway for plants.
import { sprite, asset } from './sprite.js';
import { setAttr, rng, NS } from './util.js';

// World frame of the generated plate masters: x 0..2330, y -55..945 (1000 units for 1648 px). The runtime
// plates add an extended sky above the master (see tools/assets/plates.py), so their full extent is taller.
const MASTER = { x: 0, y: -55, w: 2330, h: 1000 };

/** Full world rectangle covered by a runtime plate (master frame + sky extension). */
export function plateRect(key) {
  const pl = asset(key), k = MASTER.h / pl.masterH;
  const ext = (pl.skyExt || 0) * k;
  return { x: MASTER.x, y: MASTER.y - ext, w: MASTER.w, h: MASTER.h + ext };
}

/** Painted plate + water shimmer masked to the painted sea. Sets the scene's camera bounds to the plate. */
export function plate(sc, L, key, maskKey, { sun, horizon, glitterW = 520, id = 'p' } = {}) {
  const P = plateRect(key), pl = asset(key), mk = asset(maskKey);
  sc.bounds = P;
  sc.add(L, `<image href="${pl.src}" x="${P.x}" y="${P.y.toFixed(2)}" width="${P.w}" height="${P.h.toFixed(2)}" preserveAspectRatio="none"/>`);
  const m = `${id}SeaMask`;
  sc.add(L, `<defs><mask id="${m}" maskUnits="userSpaceOnUse" x="${P.x}" y="${P.y.toFixed(2)}" width="${P.w}" height="${P.h.toFixed(2)}">
    <image href="${mk.src}" x="${P.x}" y="${P.y.toFixed(2)}" width="${P.w}" height="${P.h.toFixed(2)}" preserveAspectRatio="none"/></mask>
    <radialGradient id="${id}Hl"><stop offset="0" stop-color="#F6FAFF" stop-opacity=".95"/><stop offset=".55" stop-color="#F6FAFF" stop-opacity=".45"/><stop offset="1" stop-color="#F6FAFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}Gl"><stop offset="0" stop-color="#FFF8E4" stop-opacity="1"/><stop offset=".45" stop-color="#FFF1CC" stop-opacity=".6"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></radialGradient></defs>`);
  const water = sc.add(L, `<g mask="url(#${m})"></g>`);
  // glints along the sun path (code light) + soft drifting wave highlights across the bay
  const gl = document.createElementNS(NS, 'g');
  gl.innerHTML = sunGlints({ x: sun[0], y: horizon + 4, h: 420, w: glitterW, n: 110, fill: `url(#${id}Gl)`, seed: 6 });
  water.appendChild(gl);
  sc.scan(gl);
  const r = rng(17), hl = [];
  let s = '';
  for (let i = 0; i < 46; i++) {
    const y = horizon + 20 + r() * 420, k = 0.35 + (y - horizon) / 420;
    const w = (16 + r() * 30) * k;
    // tapered, feathered glint (an ellipse with a radial falloff), not a hard bar
    s += `<ellipse cx="0" cy="0" rx="${(w / 2).toFixed(1)}" ry="${(0.7 + 1.0 * k).toFixed(2)}" fill="url(#${id}Hl)"/>`;
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
      setAttr(els[i], 'opacity', (0.34 * Math.max(0, Math.sin(t * q.sp + q.ph))).toFixed(3));
    }
  });
  return { water, rect: P };
}

/** Twinkling sun glints over a painted sun path: small feathered sparkles (not hard bars), denser and
 *  shorter near the horizon, wider apart and longer towards the viewer. */
function sunGlints({ x, y, h, w, n, fill, seed }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 1.3);
    const spread = w * (0.15 + t * 0.85);
    const cx = x + (r() - 0.5) * spread, cy = y + t * h;
    const rx = (3 + t * 11) * (0.6 + r() * 0.7), ry = 0.6 + t * 1.1;
    out += `<ellipse class="tw" data-sp="${(0.8 + r() * 1.8).toFixed(2)}" data-ph="${(r() * 6).toFixed(2)}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(2)}" fill="${fill}" opacity=".85"/>`;
  }
  return out;
}

/** A ship sprite whose hull is hidden below its waterline, seated by a faint mirrored reflection, a dark
 *  waterline and bow foam with a trailing stern wake (bow = +x); origin = waterline centre.
 *  pose(dy, rot) bobs the hull and keeps the reflection mirrored to it. */
export function ship(sc, L, key, { w, water = 0.885, sailKey = null, id = 'sh', wake = 1 } = {}) {
  const a = asset(key), h = (w * a.h) / a.w;
  const x0 = -w / 2, y0 = -water * h;
  const img = `<image href="${a.src}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`;
  const sail = sailKey ? `<g class="sail"><image href="${asset(sailKey).src}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" preserveAspectRatio="none"/></g>` : '';
  // wake, waterline and reflection scale with the hull, so small boats do not sit on a flat saucer
  const k = Math.min(1, w / 160), rh = h * 0.2, f = (n) => n.toFixed(2);
  const el = sc.add(L, `<g><defs>
      <clipPath id="${id}Wl"><rect x="${-w}" y="${-h * 2}" width="${w * 2}" height="${h * 2 + 1.2 * k}"/></clipPath>
      <linearGradient id="${id}Rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}Rm" maskUnits="userSpaceOnUse" x="${-w}" y="0" width="${w * 2}" height="${f(rh)}"><rect x="${-w}" y="0" width="${w * 2}" height="${f(rh)}" fill="url(#${id}Rg)"/></mask>
      <linearGradient id="${id}Wk" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#F2F6FA" stop-opacity="1"/><stop offset="1" stop-color="#F2F6FA" stop-opacity="0"/></linearGradient></defs>
    <g mask="url(#${id}Rm)" opacity="${f(0.2 + 0.12 * k)}"><g transform="scale(1 -1)"><g class="rhull">${img}</g></g></g>
    <ellipse cx="0" cy="${f(1.2 * k)}" rx="${f(w * 0.4)}" ry="${f(0.8 + 1.4 * k)}" fill="#14304e" opacity="${f(0.22 + 0.16 * k)}"/>
    <g clip-path="url(#${id}Wl)"><g class="hull">${img}${sail}</g></g>
    <g opacity="${f(wake * (0.35 + 0.3 * k))}" fill="none" stroke-linecap="round">
      <path d="M${f(w * 0.36)} ${f(0.5 * k)} Q${f(w * 0.45)} ${f(-0.6 * k)} ${f(w * 0.49)} ${f(0.4 * k)}" stroke="#F2F6FA" stroke-width="${f(0.6 + 1.1 * k)}"/>
      <path d="M${f(-w * 0.36)} ${f(0.9 * k)} L${f(-w * 0.95)} ${f(2.6 * k)}" stroke="url(#${id}Wk)" stroke-width="${f(0.5 + 0.9 * k)}"/>
      <path d="M${f(-w * 0.3)} ${f(2.2 * k)} L${f(-w * 0.8)} ${f(5.2 * k)}" stroke="url(#${id}Wk)" stroke-width="${f(0.4 + 0.6 * k)}" opacity=".6"/></g></g>`);
  const hull = el.querySelector('.hull'), rhull = el.querySelector('.rhull');
  const pose = (dy, rot) => { const tr = `translate(0 ${dy.toFixed(2)}) rotate(${rot.toFixed(2)})`; setAttr(hull, 'transform', tr); setAttr(rhull, 'transform', tr); };
  return { el, hull, sail: el.querySelector('.sail'), pose, w, h, x0, y0 };
}

/** Drifting cloud sprites + gulls with a two-frame flap (painted frames swapped, limited animation).
 *  Both wrap around forever (title screens can idle for a long time), fading near the wrap points. */
export function skyLife(sc, L, { clouds = [], gulls = [], span = [-400, 2730] }) {
  const [x0, x1] = span, W = x1 - x0;
  const fade = (x) => Math.min(1, (x - x0) / 260, (x1 - x) / 260);
  const cs = clouds.map(([k, x, y, w, vx, op]) => ({ el: sc.add(L, sprite(k, { x: 0, y: 0, w, ay: 0.5 })), x, y, vx, op }));
  const gs = gulls.map(([x, y, k, vx, ph]) => {
    const el = sc.add(L, `<g>${sprite('fx_gull_up', { x: 0, y: 0, w: 26 * k, ay: 0.6 })}${sprite('fx_gull_down', { x: 0, y: 0, w: 30 * k, ay: 0.4 })}</g>`);
    return { el, a: el.children[0], b: el.children[1], x, y, vx, ph };
  });
  const wrap = (x) => ((((x - x0) % W) + W) % W) + x0;
  sc.tick((t) => {
    for (const c of cs) {
      const x = wrap(c.x + t * c.vx);
      setAttr(c.el, 'transform', `translate(${x.toFixed(1)} ${c.y})`);
      setAttr(c.el, 'opacity', (c.op * Math.max(0, fade(x))).toFixed(3));
    }
    for (const g of gs) {
      const x = wrap(g.x + t * g.vx);
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

/** Layer-space position that shows at screen point (sx, sy) of the 1600x900 frame for a given camera
 *  (used to place foreground framing that lives on a parallax layer). */
export function screenToLayer(L, cam, sx, sy) {
  const s = 1 + (cam.z - 1) * L.zoomK;
  return [800 + (sx - 800) / s + (cam.x - 800) * L.depth, 450 + (sy - 450) / s + (cam.y - 450) * L.depth];
}

/** Soft contact shadow under a grounded prop or plant. */
export function contactShadow(sc, L, x, y, w, op = 0.3) {
  if (!sc._csGrad) {
    sc._csGrad = `cs${Math.floor(Math.random() * 1e9)}`;
    sc.add(L, `<defs><radialGradient id="${sc._csGrad}"><stop offset="0" stop-color="#2a1d14" stop-opacity=".6"/><stop offset="1" stop-color="#2a1d14" stop-opacity="0"/></radialGradient></defs>`);
  }
  return sc.add(L, `<ellipse cx="${x}" cy="${y}" rx="${(w * 0.55).toFixed(1)}" ry="${(Math.max(2.4, w * 0.08)).toFixed(1)}" fill="url(#${sc._csGrad})" opacity="${op}"/>`);
}
