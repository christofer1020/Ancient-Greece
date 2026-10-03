// Scenery library: every function returns SVG markup (string) anchored at its ground point (0,0)
// unless noted. Ambient behaviours are tagged with classes and driven by the scene kit (see engine/scene.js).
import { C, mix, lighten, darken, cool, warm } from './palette.js';
import { uid, rng, ridge, fbm, smoothPath } from './util.js';

// ---------------------------------------------------------------- gradients
export function grad(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const id = uid('g');
  const s = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  return { id, def: `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`, ref: `url(#${id})` };
}
export function rgrad(stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const id = uid('r');
  const s = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  return { id, def: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>`, ref: `url(#${id})` };
}

/** Wrap content placed at (x,y), uniform scale s. `cls` marks an ambient inner group. */
export const at = (x, y, s, inner, cls = '', extra = '') =>
  `<g transform="translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ''}">${cls ? `<g class="${cls}" ${extra}>${inner}</g>` : inner}</g>`;

// ---------------------------------------------------------------- sky & light
export function sky(stops, { y0 = -1400, h = 3200, x0 = -1400, w = 4400 } = {}) {
  const g = grad(stops);
  return `<defs>${g.def}</defs><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${g.ref}"/>`;
}

/** Standard daylight sky: blue overhead, cream and gold toward y≈600. */
export const daySky = () => sky([[0, '#4C7FBD'], [0.4, '#7FAAD6'], [0.64, '#BAD3E0'], [0.8, '#F0E2C2'], [0.91, '#F8D098'], [1, '#F4BE86']], { y0: -400, h: 1100 });

export function sun({ x, y, r = 60, core = '#FFF3D0', glow = '#FFD49A', glowR = 520, op = 1 }) {
  const g = rgrad([[0, glow, 0.85 * op], [0.35, glow, 0.35 * op], [1, glow, 0]]);
  return `<defs>${g.def}</defs><circle cx="${x}" cy="${y}" r="${glowR}" fill="${g.ref}"/>
    <circle cx="${x}" cy="${y}" r="${r * 1.35}" fill="${core}" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`;
}

export function rays({ x, y, len = 1600, n = 9, color = '#FFE2AE', op = 0.22, spread = 90, dir = 90, cls = 'rays' }) {
  const g = grad([[0, color, op], [1, color, 0]]);
  let tri = '';
  const r = rng(7);
  for (let i = 0; i < n; i++) {
    const a = (dir - spread / 2 + (i / (n - 1)) * spread + r.range(-3, 3)) * Math.PI / 180;
    const w = r.range(0.015, 0.05);
    const x1 = Math.cos(a - w) * len, y1 = Math.sin(a - w) * len, x2 = Math.cos(a + w) * len, y2 = Math.sin(a + w) * len;
    tri += `<path d="M0 0 L${x1.toFixed(0)} ${y1.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)} Z" fill="url(#${g.id}r${i})" opacity="${r.range(0.5, 1).toFixed(2)}"/>`;
  }
  // userSpace gradient per ray (rotates with ray)
  let defs = '';
  for (let i = 0; i < n; i++) {
    const a = (dir - spread / 2 + (i / (n - 1)) * spread) * Math.PI / 180;
    defs += `<linearGradient id="${g.id}r${i}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${(Math.cos(a) * len).toFixed(0)}" y2="${(Math.sin(a) * len).toFixed(0)}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
  }
  return `<defs>${defs}</defs><g transform="translate(${x} ${y})"><g class="${cls}">${tri}</g></g>`;
}

/** Soft billowy cloud. tone: warm | cool | storm | white | dusk | gold */
export function cloud({ x, y, s = 1, tone = 'white', seed = 1, w = 1, op = 1 }) {
  const T = {
    white: ['#FFFFFF', '#F3EAD8', '#C8CCD6'],
    warm: ['#FFF1D6', '#F2CFA6', '#C88E86'],
    cool: ['#E9E6E4', '#B9C3D3', '#6F83A6'],
    storm: ['#9AA6BE', '#5F6F92', '#334564'],
    dusk: ['#FFD9B0', '#E59A78', '#8F5A6E'],
    gold: ['#FFF3CF', '#F6D08F', '#C98F5E'],
  }[tone];
  const r = rng(seed * 13 + 5);
  const puffs = [];
  const n = Math.round(5 + w * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = (t - 0.5) * 150 * w + r.range(-8, 8);
    const pr = 24 + Math.sin(t * Math.PI) * 26 * r.range(0.8, 1.2);
    puffs.push([px, -pr * 0.62 + r.range(-6, 6), pr]);
  }
  // scalloped underside: flattened blobs along the base
  const base = [];
  const nb = Math.round(4 + w * 3);
  for (let i = 0; i < nb; i++) {
    const t = i / (nb - 1);
    base.push([(t - 0.5) * 168 * w + r.range(-6, 6), -4 + r.range(-3, 3), 15 + Math.sin(t * Math.PI) * 11 + r.range(0, 5)]);
  }
  const mk = (fill, dx, dy, k) =>
    puffs.map(([px, py, pr]) => `<circle cx="${(px + dx).toFixed(1)}" cy="${(py + dy).toFixed(1)}" r="${(pr * k).toFixed(1)}" fill="${fill}"/>`).join('') +
    base.map(([px, py, pr]) => `<ellipse cx="${(px + dx).toFixed(1)}" cy="${(py + dy).toFixed(1)}" rx="${(pr * 1.15 * k).toFixed(1)}" ry="${(pr * 0.62 * k).toFixed(1)}" fill="${fill}"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op}">${mk(T[2], 0, 5, 1.0)}${mk(T[1], -2, -1, 0.97)}${mk(T[0], -7, -9, 0.74)}</g>`;
}

/** Atmospheric ridge (hills). */
export function hills({ base, amp = 70, freq = 0.004, seed = 1, top, bottom, op = 1, x0 = -1200, x1 = 2800, oct = 3, step = 40, edge = null }) {
  const g = grad([[0, top], [1, bottom]]);
  const d = ridge({ x0, x1, base, amp, freq, seed, step, oct });
  return `<defs>${g.def}</defs><path d="${d}" fill="${g.ref}" opacity="${op}"${edge ? ` stroke="${edge}" stroke-width="1.2"` : ''}/>`;
}

/** Faceted mountains with shadow faces and optional snow. */
export function mountains({ base, amp = 220, freq = 0.0028, seed = 3, lit = C.sandstone, shade = '#8B7C86', snow = null, x0 = -1200, x1 = 2800, light = 1, bottom = 1500 }) {
  const step = 30;
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    const n = fbm(x * freq, seed, 4);
    pts.push([x, base - Math.abs(n) * amp * 1.6 + amp * 0.2]);
  }
  const d = `M${pts.map((p) => p[0] + ' ' + p[1].toFixed(1)).join(' L')} L${x1} ${bottom} L${x0} ${bottom} Z`;
  const cid = uid('mc');
  const g = grad([[0, lit], [1, mix(lit, shade, 0.7)]]);
  let facets = '', caps = '';
  const rr = rng(seed * 7 + 1);
  for (let i = 2; i < pts.length - 2; i++) {
    const [px, py] = pts[i];
    if (py < pts[i - 1][1] && py <= pts[i + 1][1] && py < pts[i - 2][1] && py <= pts[i + 2][1]) {
      const H = base + 260 - py;
      const k1 = rr.range(0.18, 0.42), k2 = rr.range(0.1, 0.3);
      // lit/shade divide runs diagonally down-left from the summit with a kink
      const mx = px - H * k1 * 0.5 * light, my = py + H * 0.45;
      facets += `<path d="M${px} ${py} L${px + H * 1.6 * light} ${base + 260} L${px - H * (k1 + k2) * light} ${base + 260} L${mx} ${my} L${px - H * 0.04 * light} ${py + H * 0.2} Z" fill="${shade}" opacity=".5"/>`;
      facets += `<path d="M${px} ${py} L${px + H * 0.5 * light} ${py + H * 0.75} L${px + H * 0.2 * light} ${py + H * 0.6} L${px + H * 0.12 * light} ${py + H * 0.1} Z" fill="${shade}" opacity=".22"/>`;
      if (snow && base - py > amp * 0.55) {
        const sh = (base - py) * 0.3;
        caps += `<path d="M${px} ${py} L${px + sh * 0.9} ${py + sh} L${px + sh * 0.5} ${py + sh * 0.74} L${px + 6} ${py + sh * 1.1} L${px - sh * 0.3} ${py + sh * 0.78} L${px - sh * 0.95} ${py + sh * 1.02} Z" fill="${snow}" opacity=".94"/>`;
      }
    }
  }
  return `<defs>${g.def}<clipPath id="${cid}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${g.ref}"/><g clip-path="url(#${cid})">${facets}${caps}</g>`;
}

// ---------------------------------------------------------------- sea
export function sea({ y, top, bottom, rows = 9, seed = 2, line = '#EAF2F7', depth = 1, bottomY = 1500, x0 = -1200, w = 4400, rowOp = 0.5 }) {
  const g = grad([[0, top], [1, bottom]]);
  const r = rng(seed);
  let out = `<defs>${g.def}</defs><rect x="${x0}" y="${y}" width="${w}" height="${bottomY - y}" fill="${g.ref}"/>`;
  for (let i = 0; i < rows; i++) {
    const t = (i + 1) / rows;
    const yy = y + Math.pow(t, 1.6) * (bottomY - y) * 0.62 * depth + 6;
    const sz = 16 + t * 46;
    let d = '';
    const startX = x0 - 60 - r.range(0, sz * 2);
    for (let x = startX; x < x0 + w + 80; x += sz * 2.6 * r.range(0.8, 1.4)) {
      d += `M${x.toFixed(0)} ${yy.toFixed(0)} q${(sz * 0.5).toFixed(0)} ${(-sz * 0.22).toFixed(0)} ${sz.toFixed(0)} 0 `;
    }
    out += `<g class="wv" data-amp="${(6 + t * 14).toFixed(1)}" data-spd="${(0.35 + r.range(0, 0.3)).toFixed(2)}" data-ph="${r.range(0, 6).toFixed(2)}" data-dy="${(1 + t * 2).toFixed(1)}"><path d="${d}" fill="none" stroke="${line}" stroke-width="${(1.2 + t * 1.8).toFixed(1)}" stroke-linecap="round" opacity="${(rowOp * (0.35 + t * 0.55)).toFixed(2)}"/></g>`;
  }
  return out;
}

/** Sun glitter column on water. */
export function glitter({ x, y, h = 300, w = 220, n = 46, color = '#FFF1CC', seed = 4 }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = r.range(0, 1);
    const yy = y + t * h;
    const spread = w * (0.2 + t * 0.8);
    const xx = x + r.range(-spread, spread) / 2;
    const len = 16 + t * 46 * r.range(0.5, 1.2);
    out += `<rect class="tw" data-sp="${r.range(0.8, 2.6).toFixed(2)}" data-ph="${r.range(0, 6).toFixed(2)}" x="${(xx - len / 2).toFixed(0)}" y="${yy.toFixed(0)}" width="${len.toFixed(0)}" height="${(2.2 + t * 2.4).toFixed(1)}" rx="1.5" fill="${color}" opacity=".9"/>`;
  }
  return out;
}

export function island({ x, y, w = 300, h = 60, color = '#7A7F8E', seed = 3, trees = true, houses = false, reflect = true, shore = true, light = '#B9AFA3' }) {
  const r = rng(seed);
  const pts = [[-w / 2, 0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const hh = Math.sin(t * Math.PI) * h * (0.7 + r.range(0, 0.5));
    pts.push([-w / 2 + t * w, -hh]);
  }
  pts.push([w / 2, 0]);
  const d = smoothPath(pts) + ` L${w / 2} 8 L${-w / 2} 8 Z`;
  const g = grad([[0, light], [0.5, color], [1, darken(color, 0.25)]]);
  let deco = '';
  if (trees) for (let i = 0; i < 4; i++) { const t = r.range(0.25, 0.75); const px = -w / 2 + t * w; const py = -Math.sin(t * Math.PI) * h * 0.8; deco += `<ellipse cx="${px.toFixed(0)}" cy="${(py - 4).toFixed(0)}" rx="${r.range(8, 15).toFixed(0)}" ry="${r.range(5, 8).toFixed(0)}" fill="${darken(C.olive, 0.15)}" opacity=".85"/>`; }
  if (houses) for (let i = 0; i < 4; i++) { const t = r.range(0.3, 0.7); const px = -w / 2 + t * w; const py = -Math.sin(t * Math.PI) * h * 0.55; deco += `<rect x="${(px - 5).toFixed(0)}" y="${(py - 7).toFixed(0)}" width="10" height="8" fill="${C.ivory}" opacity=".9"/><rect x="${(px - 5).toFixed(0)}" y="${(py - 7).toFixed(0)}" width="10" height="2" fill="${C.terracotta}"/>`; }
  const refl = reflect ? `<g transform="translate(0 6) scale(1 -0.35)" opacity=".18"><path d="${d}" fill="${color}"/></g>` : '';
  const foam = shore ? `<path d="M${-w / 2 - 10} 4 Q0 9 ${w / 2 + 10} 4" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>` : '';
  return `<g transform="translate(${x} ${y})"><defs>${g.def}</defs>${refl}<path d="${d}" fill="${g.ref}"/>${deco}${foam}</g>`;
}

// ---------------------------------------------------------------- vegetation
export function cypress(x, y, h = 120, c = '#3F4D2D', op = 1) {
  const w = h * 0.17;
  const g = grad([[0, lighten(c, 0.18)], [1, darken(c, 0.2)]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  return `<g transform="translate(${x} ${y})" opacity="${op}"><defs>${g.def}</defs><g class="sway" data-amp="1.2" data-spd="0.6" data-ph="${(x * 0.01) % 6}">
    <path d="M0 ${-h} C${w * 1.3} ${-h * 0.72} ${w * 1.5} ${-h * 0.25} ${w * 0.6} 0 L${-w * 0.6} 0 C${-w * 1.5} ${-h * 0.25} ${-w * 1.3} ${-h * 0.72} 0 ${-h} Z" fill="${g.ref}"/></g></g>`;
}

export function olive(x, y, s = 1, { leaf = '#7C8A55', trunk = '#4B3A2A', fruit = false } = {}) {
  const dk = darken(leaf, 0.22), lt = lighten(leaf, 0.2);
  const blobs = [[-34, -92, 34, 22], [-6, -108, 40, 26], [32, -94, 34, 22], [-2, -78, 46, 22], [-44, -74, 22, 14], [44, -72, 22, 14]];
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="sway" data-amp="0.8" data-spd="0.5" data-ph="${(x * 0.013) % 6}">
    <path d="M-5 0 C-4 -26 -14 -44 -26 -66 L-14 -62 C-8 -48 -2 -40 2 -30 C6 -42 14 -52 26 -68 L30 -62 C20 -48 14 -34 12 -22 C14 -12 14 -4 16 0 Z" fill="${trunk}"/>
    <path d="M-1 -8 C0 -30 -4 -40 -12 -54" stroke="${lighten(trunk, .25)}" stroke-width="1.4" fill="none" opacity=".6"/>
    ${blobs.map(([bx, by, rx, ry]) => `<ellipse cx="${bx}" cy="${by + 5}" rx="${rx}" ry="${ry}" fill="${dk}"/>`).join('')}
    ${blobs.map(([bx, by, rx, ry]) => `<ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="${leaf}"/>`).join('')}
    ${blobs.map(([bx, by, rx, ry]) => `<ellipse cx="${bx - 6}" cy="${by - 6}" rx="${rx * 0.55}" ry="${ry * 0.5}" fill="${lt}" opacity=".8"/>`).join('')}
  </g></g>`;
}

export function pine(x, y, s = 1, c = '#3E4B30') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="sway" data-amp="0.8" data-spd="0.45" data-ph="${(x * 0.02) % 6}">
    <rect x="-3" y="-60" width="6" height="60" fill="#4B3A2A"/><ellipse cx="0" cy="-82" rx="38" ry="14" fill="${darken(c, .15)}"/><ellipse cx="-4" cy="-88" rx="32" ry="12" fill="${c}"/><ellipse cx="-8" cy="-92" rx="18" ry="6" fill="${lighten(c, .18)}" opacity=".8"/></g></g>`;
}

export function shrub(x, y, s = 1, c = '#5E6A3A') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-8" rx="22" ry="12" fill="${darken(c, .2)}"/><ellipse cx="-4" cy="-12" rx="18" ry="10" fill="${c}"/><ellipse cx="-8" cy="-15" rx="9" ry="4" fill="${lighten(c, .25)}" opacity=".7"/></g>`;
}

export function grass(x, y, w = 200, c = '#6A7544', seed = 1, dens = 0.35) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < w * dens; i++) {
    const gx = r.range(0, w), h = r.range(6, 18), lean = r.range(-5, 5);
    d += `M${gx.toFixed(0)} 0 q${(lean * 0.4).toFixed(1)} ${(-h * 0.6).toFixed(1)} ${lean.toFixed(1)} ${-h.toFixed(1)} `;
  }
  return `<g transform="translate(${x} ${y})"><path d="${d}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/></g>`;
}

export function rock(x, y, s = 1, c = '#A39684') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 0 L-24 -16 L-8 -26 L12 -22 L28 -10 L32 0 Z" fill="${c}" stroke="${darken(c, .35)}" stroke-width="1"/><path d="M-8 -26 L12 -22 L28 -10 L10 -12 L-4 -16 Z" fill="${lighten(c, .25)}" opacity=".8"/><path d="M-30 0 L-24 -16 L-14 -6 L-18 0 Z" fill="${darken(c, .15)}" opacity=".6"/></g>`;
}

// ---------------------------------------------------------------- architecture
function columnShape(x, y, h, w, { tone, flute = true, capH = 0.1, base = true, haze = null }) {
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  const topW = w * 0.8;
  const capy = y - h;
  const fl = flute
    ? [-0.28, 0, 0.28].map((k) => `<path d="M${x + k * w} ${y - 4} L${x + k * topW * 0.98} ${capy + h * capH}" stroke="${T(tone[2])}" stroke-width="${Math.max(0.8, w * 0.045)}" opacity=".55"/>`).join('')
    : '';
  return `<path d="M${x - w / 2} ${y} L${x - topW / 2} ${capy + h * capH} L${x + topW / 2} ${capy + h * capH} L${x + w / 2} ${y} Z" fill="url(#TCG)"/>${fl}
    <path d="M${x - topW / 2 - w * 0.05} ${capy + h * capH} Q${x} ${capy + h * (capH * 0.55)} ${x + topW / 2 + w * 0.05} ${capy + h * capH} L${x + topW / 2} ${capy + h * capH * 0.42} L${x - topW / 2} ${capy + h * capH * 0.42} Z" fill="${T(tone[0])}"/>
    <rect x="${x - w * 0.6}" y="${capy}" width="${w * 1.2}" height="${h * capH * 0.42}" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".6"/>
    ${base ? `<rect x="${x - w * 0.55}" y="${y - h * 0.018}" width="${w * 1.1}" height="${h * 0.02}" fill="${T(tone[1])}"/>` : ''}`;
}

/** Greek temple front. Origin: centre of the stylobate at ground. */
export function temple({ w = 520, h = 180, cols = 8, steps = 3, tone = [C.ivory, C.sandstone, '#9C8467'], haze = null, accent = C.terracotta, dark = '#2B2330', id = uid('t') }) {
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  const stepH = Math.max(4, h * 0.035);
  const platH = steps * stepH;
  const colH = h * 0.58;
  const archH = h * 0.075, friezeH = h * 0.1, cornH = h * 0.04;
  const pedH = h * 0.2;
  const y0 = -platH;
  const colW = Math.min(w / cols * 0.42, h * 0.1);
  const innerW = w * 0.9;
  const g = grad([[0, T(tone[0])], [0.55, T(tone[0])], [1, T(mix(tone[1], tone[2], 0.55))]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const cg = g.ref;
  const gd = grad([[0, T(mix(dark, tone[2], .25))], [1, T(dark)]]);
  let s = `<defs>${g.def}${gd.def}</defs>`;
  for (let i = 0; i < steps; i++) {
    const inset = (steps - 1 - i) * stepH * 1.6;
    s += `<rect x="${-w / 2 + inset}" y="${-(i + 1) * stepH}" width="${w - inset * 2}" height="${stepH + 0.5}" fill="${T(i % 2 ? tone[0] : mix(tone[0], tone[1], .3))}" stroke="${T(tone[2])}" stroke-width=".6"/>`;
  }
  // cella backdrop
  s += `<rect x="${-innerW / 2 + colW}" y="${y0 - colH}" width="${innerW - colW * 2}" height="${colH}" fill="${gd.ref}"/>`;
  // inner door glow
  s += `<rect x="${-w * 0.05}" y="${y0 - colH * 0.62}" width="${w * 0.1}" height="${colH * 0.62}" fill="${T(accent)}" opacity=".18"/>`;
  // columns
  let cs = '';
  for (let i = 0; i < cols; i++) {
    const cx = -innerW / 2 + (innerW * i) / (cols - 1);
    cs += columnShape(cx, y0, colH, colW, { tone, haze }).replace(/url\(#TCG\)/g, cg);
  }
  s += cs;
  const ex = -w / 2 + stepH * 0.5, ew = w - stepH;
  // architrave
  s += `<rect x="${ex}" y="${y0 - colH - archH}" width="${ew}" height="${archH}" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".6"/>`;
  // frieze with triglyphs
  s += `<rect x="${ex}" y="${y0 - colH - archH - friezeH}" width="${ew}" height="${friezeH}" fill="${T(mix(tone[0], accent, .12))}"/>`;
  const nt = Math.round(ew / (colW * 0.9));
  for (let i = 0; i < nt; i++) {
    const tx = ex + (ew * (i + 0.5)) / nt;
    s += `<rect x="${tx - colW * 0.16}" y="${y0 - colH - archH - friezeH + 1}" width="${colW * 0.32}" height="${friezeH - 2}" fill="${T(mix(tone[2], '#3a3f6b', .3))}" opacity=".55"/>`;
  }
  // cornice
  const cy = y0 - colH - archH - friezeH;
  s += `<rect x="${ex - 6}" y="${cy - cornH}" width="${ew + 12}" height="${cornH}" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".6"/>`;
  // pediment
  const py = cy - cornH;
  s += `<path d="M${ex - 6} ${py} L0 ${py - pedH} L${ex + ew + 6} ${py} Z" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".8"/>`;
  s += `<path d="M${ex + ew * 0.06} ${py - 2} L0 ${py - pedH * 0.82} L${ex + ew * 0.94} ${py - 2} Z" fill="${T(mix(tone[1], accent, .28))}"/>`;
  // pediment figures (tiny abstract shapes)
  for (let i = -3; i <= 3; i++) {
    const fx = i * ew * 0.1, fh = (pedH * 0.55) * (1 - Math.abs(i) * 0.2);
    s += `<rect x="${fx - 2.2}" y="${py - 3 - fh}" width="4.4" height="${fh}" rx="2" fill="${T(tone[0])}" opacity=".8"/>`;
  }
  // acroteria
  s += `<path d="M-8 ${py - pedH} q8 -14 16 0 Z" fill="${T(accent)}"/>`;
  return `<g class="temple">${s}</g>`;
}

/** Single column (for foreground/ruins). Anchored at base centre. */
export function column({ h = 220, w = 36, tone = [C.ivory, C.sandstone, '#9C8467'], broken = 0, haze = null, drums = true }) {
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  const g = grad([[0, T(tone[0])], [0.5, T(tone[0])], [1, T(mix(tone[1], tone[2], .6))]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const hh = broken ? h * (1 - broken) : h;
  let s = `<defs>${g.def}</defs>`;
  s += `<rect x="${-w * 0.7}" y="-10" width="${w * 1.4}" height="10" fill="${T(tone[1])}" stroke="${T(tone[2])}" stroke-width=".8"/>`;
  s += columnShape(0, -10, hh, w, { tone, haze, capH: broken ? 0 : 0.1 }).replace(/url\(#TCG\)/g, g.ref);
  if (drums) for (let i = 1; i < 5; i++) s += `<path d="M${-w / 2 + 1} ${-10 - (hh * i) / 5} q${w / 2} 3 ${w - 2} 0" fill="none" stroke="${T(tone[2])}" stroke-width=".8" opacity=".45"/>`;
  if (broken) s += `<path d="M${-w * 0.42} ${-10 - hh} l6 -7 l5 5 l6 -8 l6 6 l5 -5 l6 8 l4 -3 L${w * 0.4} ${-10 - hh} Z" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".8"/>`;
  return s;
}

/** Fallen column drum / block pile for ruins. */
export function blocks(x, y, s = 1, tone = [C.ivory, C.sandstone, '#9C8467']) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-60 0 L-56 -22 L-10 -26 L-6 0 Z" fill="${tone[1]}" stroke="${tone[2]}" stroke-width="1"/><path d="M-56 -22 L-10 -26 L-14 -30 L-52 -27 Z" fill="${tone[0]}"/>
    <ellipse cx="34" cy="-18" rx="14" ry="18" fill="${mix(tone[0], tone[1], .4)}" stroke="${tone[2]}" stroke-width="1"/><rect x="34" y="-36" width="46" height="36" fill="${tone[1]}" stroke="${tone[2]}" stroke-width="1"/>
    <path d="M40 -34 V-2 M52 -35 V-1 M64 -35 V-1" stroke="${tone[2]}" stroke-width="1" opacity=".6"/><ellipse cx="80" cy="-18" rx="10" ry="18" fill="${tone[0]}" stroke="${tone[2]}" stroke-width="1"/></g>`;
}

export function house({ w = 46, h = 36, wall = C.ivory, roof = null, door = C.blue, side = 1, seed = 1 }) {
  const r = rng(seed);
  const sw = w * 0.28;
  const sd = darken(wall, 0.2);
  let s = `<rect x="0" y="${-h}" width="${w}" height="${h}" fill="${wall}"/>`;
  s += `<path d="M${w} ${-h} l${sw * side} ${-sw * 0.3} V${-sw * 0.3} L${w} 0 Z" fill="${sd}"/>`;
  if (roof) s += `<path d="M-3 ${-h} L${w / 2} ${-h - 14} L${w + 3 + sw * side} ${-h - 4} L${w + 3} ${-h} Z" fill="${roof}" stroke="${darken(roof, .3)}" stroke-width=".8"/>`;
  else s += `<rect x="-1.5" y="${-h - 2.5}" width="${w + 3}" height="3" fill="${lighten(wall, .2)}"/>`;
  s += `<rect x="${w * 0.2}" y="${-h * 0.62}" width="${w * 0.26}" height="${h * 0.62}" rx="${w * 0.13}" fill="${door}"/>`;
  if (r() > 0.3) s += `<rect x="${w * 0.62}" y="${-h * 0.7}" width="${w * 0.16}" height="${h * 0.22}" fill="${door}" opacity=".9"/>`;
  return s;
}

/** Terraced hillside village. Anchored bottom-left. */
export function village({ n = 10, seed = 5, scale = 1, haze = null, roof = C.terracotta, w = 360, rows = 3 }) {
  const r = rng(seed);
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  let s = '';
  for (let row = 0; row < rows; row++) {
    const cnt = Math.round(n / rows) + (row === 0 ? 1 : 0);
    for (let i = 0; i < cnt; i++) {
      const hw = r.range(32, 52), hh = r.range(26, 42);
      const x = r.range(0, w) * (1 - row * 0.12) + row * 14;
      const y = -row * 34 - r.range(0, 8);
      const useRoof = r() > 0.5;
      s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${house({ w: hw, h: hh, wall: T(r() > 0.2 ? C.ivory : C.parchment), roof: useRoof ? T(roof) : null, door: T(C.blue), seed: r.range(1, 99) })}</g>`;
    }
  }
  return `<g transform="scale(${scale})">${s}</g>`;
}

/** Ancient stoa (long colonnade). Anchored at ground, centre. */
export function stoa({ w = 600, h = 140, cols = 9, tone = [C.ivory, C.sandstone, '#9C8467'], haze = null }) {
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  const g = grad([[0, T(tone[0])], [1, T(mix(tone[1], tone[2], .6))]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const gd = grad([[0, T('#4A3A38')], [1, T('#241d22')]]);
  const colH = h * 0.7, colW = 16;
  let s = `<defs>${g.def}${gd.def}</defs><rect x="${-w / 2}" y="${-colH - 6}" width="${w}" height="${colH + 6}" fill="${gd.ref}"/>`;
  for (let i = 0; i < cols; i++) {
    const cx = -w / 2 + 14 + ((w - 28) * i) / (cols - 1);
    s += columnShape(cx, 0, colH, colW, { tone, haze }).replace(/url\(#TCG\)/g, g.ref);
  }
  s += `<rect x="${-w / 2 - 6}" y="${-colH - 20}" width="${w + 12}" height="14" fill="${T(tone[0])}" stroke="${T(tone[2])}" stroke-width=".7"/>`;
  s += `<path d="M${-w / 2 - 14} ${-colH - 20} L${-w / 2 + 10} ${-colH - 42} L${w / 2 - 10} ${-colH - 42} L${w / 2 + 14} ${-colH - 20} Z" fill="${T(C.terracotta)}" stroke="${T(darken(C.terracotta, .3))}" stroke-width=".8"/>`;
  s += `<rect x="${-w / 2 - 10}" y="-8" width="${w + 20}" height="8" fill="${T(tone[1])}"/>`;
  return s;
}

export function amphora(x, y, s = 1, color = C.terracotta, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-7 -52 L7 -52 C7 -46 14 -42 14 -26 C14 -8 8 -2 0 0 C-8 -2 -14 -8 -14 -26 C-14 -42 -7 -46 -7 -52 Z" fill="${color}" stroke="${darken(color, .42)}" stroke-width="1.4"/>
    <path d="M-13.5 -30 H13.5 M-12 -14 H12" stroke="${C.charcoal}" stroke-width="2" opacity=".8"/>
    <path d="M-12 -24 h24 l-4 -6 h-16 Z" fill="${C.charcoal}" opacity=".35"/>
    <path d="M-7 -49 C-20 -47 -19 -32 -13 -30 M7 -49 C20 -47 19 -32 13 -30" fill="none" stroke="${darken(color, .35)}" stroke-width="3"/>
    <path d="M-8 -34 C-9 -20 -6 -8 -2 -4" fill="none" stroke="${lighten(color, .35)}" stroke-width="2.2" opacity=".6" stroke-linecap="round"/></g>`;
}
export function pithos(x, y, s = 1, color = C.terracotta) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 -50 H16 C16 -44 30 -38 30 -20 C30 -4 22 0 0 0 C-22 0 -30 -4 -30 -20 C-30 -38 -16 -44 -16 -50 Z" fill="${color}" stroke="${darken(color, .4)}" stroke-width="1.4"/>
    <ellipse cx="0" cy="-50" rx="16" ry="4" fill="${darken(color, .35)}"/><path d="M-29 -26 H29 M-27 -12 H27" stroke="${darken(color, .35)}" stroke-width="2"/></g>`;
}

export function stall({ x, y, s = 1, awning = C.terracotta, goods = 'fruit', seed = 1 }) {
  const stripes = 6, w = 120;
  let a = '';
  for (let i = 0; i < stripes; i++) a += `<path d="M${-w / 2 + (w * i) / stripes} -86 h${w / stripes} v${14 + (i % 2) * 0} q${-w / stripes / 2} 6 ${-w / stripes} 0 Z" fill="${i % 2 ? C.ivory : awning}"/>`;
  let gds = '';
  const r = rng(seed);
  if (goods === 'fruit') for (let i = 0; i < 9; i++) gds += `<circle cx="${-40 + (i % 5) * 20 + (Math.floor(i / 5)) * 8}" cy="${-34 - Math.floor(i / 5) * 8}" r="6.5" fill="${[C.terracotta, C.olive, '#C9A24A'][i % 3]}" stroke="${C.charcoal}" stroke-opacity=".25"/>`;
  if (goods === 'jars') gds = amphora(-30, -28, 0.55) + amphora(0, -28, 0.55, C.sandstone) + amphora(30, -28, 0.55, C.red);
  if (goods === 'cloth') for (let i = 0; i < 5; i++) gds += `<rect x="${-46 + i * 18}" y="${-52}" width="14" height="22" fill="${[C.blue, C.red, C.ivory, C.olive, C.terracotta][i]}" opacity=".95"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-56" y="-86" width="4" height="86" fill="#5B4430"/><rect x="52" y="-86" width="4" height="86" fill="#5B4430"/>
    ${a}<rect x="-58" y="-90" width="116" height="5" fill="${darken(awning, .3)}"/>
    <rect x="-52" y="-30" width="104" height="8" fill="#7A5A3A"/><rect x="-48" y="-22" width="6" height="22" fill="#5B4430"/><rect x="42" y="-22" width="6" height="22" fill="#5B4430"/>${gds}</g>`;
}

export function bust(x, y, s = 1, tone = [C.ivory, C.sandstone, '#9C8467']) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-26" y="-22" width="52" height="22" fill="${tone[1]}" stroke="${tone[2]}" stroke-width="1"/><rect x="-20" y="-72" width="40" height="52" fill="${tone[0]}" stroke="${tone[2]}" stroke-width="1"/>
    <path d="M-16 -74 C-18 -98 -14 -122 0 -126 C14 -122 18 -98 16 -74 C16 -66 8 -62 0 -62 C-8 -62 -16 -66 -16 -74 Z" fill="${tone[0]}" stroke="${tone[2]}" stroke-width="1.2"/>
    <path d="M-16 -104 C-8 -100 8 -100 16 -104" stroke="${tone[2]}" fill="none" stroke-width="1"/>
    <path d="M-9 -98 L-2 -98 M2 -98 L9 -98" stroke="${tone[2]}" stroke-width="2"/><path d="M0 -98 L-2 -88 L2 -88" fill="none" stroke="${tone[2]}" stroke-width="1.2"/>
    <path d="M-10 -80 C-2 -74 4 -74 11 -80 L8 -68 C0 -64 -4 -64 -8 -68 Z" fill="${tone[1]}" opacity=".8"/></g>`;
}

export function maskProp(x, y, s = 1, kind = 'happy', color = C.ivory, rot = 0) {
  const happy = kind === 'happy';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-30 -34 C-30 -62 30 -62 30 -34 C30 10 14 44 0 44 C-14 44 -30 10 -30 -34 Z" fill="${color}" stroke="${darken(color, .45)}" stroke-width="2.4"/>
    <ellipse cx="-13" cy="-20" rx="8" ry="${happy ? 4.5 : 8}" fill="${C.charcoal}" transform="rotate(${happy ? 14 : -16} -13 -20)"/><ellipse cx="13" cy="-20" rx="8" ry="${happy ? 4.5 : 8}" fill="${C.charcoal}" transform="rotate(${happy ? -14 : 16} 13 -20)"/>
    <path d="M-14 -34 q8 ${happy ? -8 : 6} 16 ${happy ? 0 : -2}" stroke="${darken(color, .5)}" stroke-width="2" fill="none"/>
    <path d="${happy ? 'M-17 8 C-9 32 9 32 17 8 Z' : 'M-14 28 C-8 14 8 14 14 28 Z'}" fill="${C.charcoal}"/>
    <path d="M-30 -34 C-34 -18 -32 -6 -26 4" fill="none" stroke="${C.sandstone}" stroke-width="1.6" opacity=".6"/></g>`;
}

export function theatre({ w = 900, h = 260, rows = 9, tone = [C.ivory, C.sandstone, '#9C8467'], haze = null }) {
  const T = (c) => (haze ? mix(c, haze.color, haze.amt) : c);
  let s = '';
  for (let i = rows - 1; i >= 0; i--) {
    const t = i / (rows - 1);
    const rw = w * (0.4 + t * 0.6), yy = -h * (1 - t) * 0.0 - (rows - 1 - i) * 0 ;
    const y = -(rows - 1 - i) * 0 - 0;
    const ry = (h / rows);
    const top = -(i) * ry * 0 ;
    // each tier: ellipse arc band
    const yt = -(h) + i * ry; // top of the tier
    s += `<path d="M${-rw / 2} ${yt + ry} Q0 ${yt - ry * 1.1} ${rw / 2} ${yt + ry} L${rw / 2} ${yt + ry * 2} Q0 ${yt + ry * 0.2} ${-rw / 2} ${yt + ry * 2} Z" fill="${T(i % 2 ? tone[0] : mix(tone[0], tone[1], .35))}" stroke="${T(tone[2])}" stroke-width=".8"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- ships
export function ship({ type = 'merchant', s = 1, sail = C.ivory, stripe = C.red, hull = '#3B2C24', dir = 1, oars = 12, eye = true, furled = false }) {
  let out = '';
  if (type === 'merchant') {
    out = `<g class="hullg">
      <path d="M-78 -18 C-72 12 -34 22 10 22 C46 22 72 8 90 -14 L92 -26 L80 -16 C60 -6 20 -4 -20 -6 C-44 -8 -60 -14 -66 -30 C-72 -30 -78 -26 -78 -18 Z" fill="${hull}" stroke="${darken(hull, .5)}" stroke-width="1.2"/>
      <path d="M-76 -14 C-60 -4 40 -2 88 -17 L90 -22 C44 -4 -60 -8 -73 -22 Z" fill="${C.terracotta}"/>
      <path d="M-66 -30 C-72 -36 -72 -44 -64 -48 C-64 -40 -62 -34 -58 -30 Z" fill="${hull}"/>
      ${eye ? `<circle cx="70" cy="-9" r="5" fill="${C.ivory}" stroke="${C.charcoal}" stroke-width="1"/><circle cx="71" cy="-9" r="2.2" fill="${C.charcoal}"/>` : ''}
      <line x1="4" y1="-6" x2="4" y2="-120" stroke="#5B4430" stroke-width="4"/>
      <line x1="-34" y1="-104" x2="42" y2="-104" stroke="#5B4430" stroke-width="3.4"/>
      ${furled ? `<rect x="-34" y="-108" width="76" height="9" rx="4" fill="${sail}" stroke="${darken(sail, .3)}" stroke-width="1"/>`
      : `<path class="sail" d="M-33 -103 L41 -103 L44 -36 Q4 -26 -36 -36 Z" fill="${sail}" stroke="${darken(sail, .28)}" stroke-width="1"/>
      <path d="M-34 -80 Q4 -72 43 -80 M-35 -58 Q4 -50 43 -58" fill="none" stroke="${stripe}" stroke-width="7" opacity=".92"/>`}
      <path d="M-70 -32 L4 -118 M82 -22 L4 -118" stroke="${darken(hull, .1)}" stroke-width=".9" opacity=".6"/></g>`;
  } else if (type === 'trireme') {
    let ors = '';
    for (let i = 0; i < oars; i++) {
      const x = -70 + i * (130 / (oars - 1));
      ors += `<g transform="translate(${x.toFixed(1)} -2)"><g class="oar" data-i="${i}"><line x1="0" y1="0" x2="-3" y2="40" stroke="#5B4430" stroke-width="2.4" stroke-linecap="round"/><path d="M-3 38 l-4 12 l5 1 Z" fill="#7A5A3A"/></g></g>`;
    }
    out = `<g class="hullg">
      <path d="M-108 -22 C-112 -34 -104 -50 -92 -62 C-96 -46 -92 -36 -86 -30 L98 -10 C112 -8 124 -2 132 4 L120 10 C60 24 -50 24 -102 -4 Z" fill="${hull}" stroke="${darken(hull, .5)}" stroke-width="1.2"/>
      <path d="M-92 -62 C-80 -78 -66 -76 -62 -64 C-72 -66 -80 -60 -86 -50 Z" fill="${C.terracotta}" stroke="${darken(C.terracotta, .4)}" stroke-width="1"/>
      <path d="M-100 -8 C-60 12 70 14 118 2" fill="none" stroke="${C.terracotta}" stroke-width="5" opacity=".95"/>
      <path d="M124 4 L146 8 L122 12 Z" fill="${C.bronze}" stroke="${darken(C.bronze, .4)}" stroke-width="1"/>
      <path d="M-84 -26 L96 -10 L98 -6 L-86 -20 Z" fill="${C.sandstone}" opacity=".8"/>
      ${eye ? `<circle cx="100" cy="-4" r="4.6" fill="${C.ivory}" stroke="${C.charcoal}" stroke-width="1"/><circle cx="101" cy="-4" r="2" fill="${C.charcoal}"/>` : ''}
      <line x1="10" y1="-14" x2="10" y2="-112" stroke="#5B4430" stroke-width="3.6"/>
      ${furled ? `<rect x="-26" y="-108" width="72" height="8" rx="4" fill="${sail}" stroke="${darken(sail, .3)}" stroke-width="1"/>`
      : `<path class="sail" d="M-24 -104 L44 -104 L47 -44 Q10 -36 -27 -44 Z" fill="${sail}" stroke="${darken(sail, .28)}" stroke-width="1"/><path d="M-25 -84 Q10 -78 46 -84 M-26 -64 Q10 -58 46 -64" fill="none" stroke="${stripe}" stroke-width="6" opacity=".92"/>`}
      ${ors}</g>`;
  } else {
    out = `<g class="hullg"><path d="M-44 -10 C-40 8 -10 14 20 12 C40 10 52 0 58 -14 C30 -4 -20 -4 -44 -10 Z" fill="${hull}" stroke="${darken(hull, .5)}" stroke-width="1"/>
      <path d="M-44 -10 C-30 -6 30 -8 58 -14 L58 -17 C30 -11 -30 -11 -43 -15 Z" fill="${C.terracotta}"/>
      <line x1="2" y1="-8" x2="2" y2="-70" stroke="#5B4430" stroke-width="2.6"/>
      <path class="sail" d="M4 -68 C28 -48 34 -26 34 -12 L4 -12 Z" fill="${sail}" stroke="${darken(sail, .28)}" stroke-width=".9"/>
      <path d="M-1 -66 C-14 -46 -18 -28 -20 -14 L-1 -12 Z" fill="${darken(sail, .1)}" stroke="${darken(sail, .28)}" stroke-width=".9"/></g>`;
  }
  return `<g transform="scale(${dir * s} ${s})">${out}</g>`;
}

// ---------------------------------------------------------------- misc
export function bird(x, y, s = 1, c = C.charcoal) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="bird" data-sp="${(7 + (x % 5)).toFixed(1)}" data-ph="${(x * 0.07) % 6}"><path d="M-14 -4 Q-7 -9 0 0 Q7 -9 14 -4" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
}

export function fire({ x, y, s = 1 }) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="fire">
    <path class="f1" d="M-18 0 C-30 -14 -20 -34 -8 -50 C-10 -34 0 -30 2 -44 C14 -30 22 -12 14 0 Z" fill="${C.terracotta}"/>
    <path class="f2" d="M-10 0 C-18 -10 -8 -24 0 -36 C2 -24 10 -18 8 0 Z" fill="#F0B24A"/>
    <path class="f3" d="M-4 0 C-8 -6 -2 -14 1 -20 C4 -14 6 -6 3 0 Z" fill="${C.ivory}"/></g></g>`;
}

export function smoke({ x, y, s = 1, n = 6, c = '#3d3636' }) {
  const g = rgrad([[0, c, 1], [0.55, c, 0.55], [1, c, 0]]);
  let o = '';
  for (let i = 0; i < n; i++) o += `<circle class="puff" data-i="${i}" data-n="${n}" data-op="0.55" data-rise="170" data-grow="34" cx="0" cy="0" r="10" fill="${g.ref}" opacity="0"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><defs>${g.def}</defs>${o}</g>`;
}

/** Greek-key (meander) band as a strip, anchored at left-top. */
export function meander({ x = 0, y = 0, w = 600, h = 26, c = C.charcoal, sw = 2.4 }) {
  const u = h;
  const id = uid('mk');
  return `<defs><pattern id="${id}" width="${u * 1.5}" height="${u}" patternUnits="userSpaceOnUse"><path d="M0 ${u} V${u * 0.1} H${u * 0.8} V${u * 0.8} H${u * 0.3} V${u * 0.4} H${u * 0.55}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="square"/></pattern></defs>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
}

export function laurel({ x, y, s = 1, flip = 1, c = C.olive, n = 13 }) {
  // A branch following the left half of an ellipse, leaves paired along the stem.
  const cx = 70, cy = -65, rx = 60, ry = 62;
  const pt = (a) => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  const a0 = 100 * Math.PI / 180, a1 = 262 * Math.PI / 180;
  let stem = '', leaves = '';
  for (let i = 0; i <= 24; i++) { const [px, py] = pt(a0 + (a1 - a0) * (i / 24)); stem += `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)} `; }
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, a = a0 + (a1 - a0) * t;
    const [px, py] = pt(a);
    const tx = -rx * Math.sin(a), ty = ry * Math.cos(a), tl = Math.hypot(tx, ty);
    const ang = Math.atan2(ty / tl, tx / tl) * 180 / Math.PI;
    const k = 0.72 + 0.5 * Math.sin(Math.PI * t) - 0.18 * t;
    for (const side of [-1, 1]) {
      const ra = ang + side * 36;
      const rad = ra * Math.PI / 180, len = 12 * k;
      const lx = px + Math.cos(rad) * len, ly = py + Math.sin(rad) * len;
      const col = (i + (side > 0 ? 1 : 0)) % 2 ? c : lighten(c, 0.24);
      leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${len.toFixed(1)}" ry="${(len * 0.38).toFixed(1)}" transform="rotate(${ra.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="${col}" stroke="${darken(c, .3)}" stroke-width=".5"/>`;
    }
  }
  // terminal leaf
  const [ex, ey] = pt(a1);
  leaves += `<ellipse cx="${ex + 7}" cy="${ey - 4}" rx="9" ry="3.6" transform="rotate(-18 ${ex + 7} ${ey - 4})" fill="${lighten(c, .24)}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${flip * s} ${s})"><path d="${stem}" fill="none" stroke="${darken(c, .25)}" stroke-width="2.2" stroke-linecap="round"/>${leaves}</g>`;
}

export function lightShaft({ x, y, w = 160, h = 700, tilt = 18, color = '#FFE7B8', op = 0.22 }) {
  const g = grad([[0, color, op], [1, color, 0]]);
  return `<defs>${g.def}</defs><path d="M${x} ${y} l${w} 0 l${-h * Math.tan(tilt * Math.PI / 180) + 40} ${h} l${-w - 80} 0 Z" fill="${g.ref}"/>`;
}

/** Wrap markup so the scene kit drifts it horizontally forever. */
export const drifter = (inner, { vx = 6, x0 = 0, wrap = 3600, bob = 3 } = {}) =>
  `<g class="drift" data-x0="${x0 + wrap * 0.25}" data-vx="${vx}" data-wrap="${wrap}" data-bob="${bob}">${inner}</g>`;

/** A drifting cloud. */
export const driftCloud = ({ x, y, s = 1, tone = 'white', seed = 1, w = 1, vx = 5, op = 1, wrap = 3600 }) =>
  drifter(cloud({ x: 0, y, s, tone, seed, w, op }), { vx, x0: x, wrap, bob: 4 });

/** Birds flying across (class fly + bird). */
export function flock({ n = 5, x = 0, y = 300, s = 1, vx = 24, spread = 90, seed = 3, c = C.charcoal, wrap = 2800 }) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<g class="fly" data-x0="${(x + wrap * 0.3 + i * -26 + r.range(-10, 10)).toFixed(0)}" data-vx="${vx}" data-wrap="${wrap}" data-ph="${r.range(0, 6).toFixed(2)}" data-amp="${r.range(8, 18).toFixed(0)}">
      <g transform="translate(0 ${(y + Math.abs(i - n / 2) * 10 + r.range(-spread / 4, spread / 4)).toFixed(0)}) scale(${(s * r.range(0.8, 1.15)).toFixed(2)})"><g class="bird" data-sp="${r.range(7, 10).toFixed(1)}" data-ph="${r.range(0, 6).toFixed(2)}"><path d="M-14 -4 Q-7 -9 0 0 Q7 -9 14 -4" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
  }
  return out;
}

/** Minoan palace (Knossos-like): terraced, red inverted columns, horns of consecration. */
export function minoanPalace({ s = 1 } = {}) {
  const red = '#A8432F', wall = C.ivory, sand = C.sandstone;
  let cols = '';
  for (let i = 0; i < 6; i++) {
    const x = -78 + i * 31;
    cols += `<path d="M${x - 4} -12 L${x + 4} -12 L${x + 6} -38 L${x - 6} -38 Z" fill="${red}"/><ellipse cx="${x}" cy="-39" rx="8" ry="3" fill="${C.charcoal}"/><rect x="${x - 7}" y="-43" width="14" height="4" fill="${darken(red, .2)}"/>`;
  }
  const horn = (x) => `<path d="M${x - 10} 0 C${x - 12} -12 ${x - 8} -20 ${x - 3} -24 C${x - 6} -16 ${x - 4} -8 ${x} 0 Z M${x + 10} 0 C${x + 12} -12 ${x + 8} -20 ${x + 3} -24 C${x + 6} -16 ${x + 4} -8 ${x} 0 Z" fill="${sand}" stroke="${darken(sand, .3)}" stroke-width=".8"/>`;
  return `<g transform="scale(${s})">
    <rect x="-130" y="-16" width="260" height="16" fill="${sand}" stroke="${darken(sand, .3)}" stroke-width=".8"/>
    <rect x="-112" y="-60" width="224" height="46" fill="${wall}" stroke="${darken(wall, .3)}" stroke-width=".8"/>
    <rect x="-112" y="-60" width="224" height="7" fill="${C.blue}" opacity=".85"/>
    <rect x="-112" y="-54" width="224" height="3" fill="${red}"/>
    <rect x="-80" y="-98" width="160" height="40" fill="${wall}" stroke="${darken(wall, .3)}" stroke-width=".8"/>
    <rect x="-80" y="-98" width="160" height="6" fill="${C.terracotta}"/>
    <rect x="-52" y="-128" width="104" height="32" fill="${wall}" stroke="${darken(wall, .3)}" stroke-width=".8"/>
    <rect x="-52" y="-128" width="104" height="5" fill="${red}"/>
    ${cols}
    <g transform="translate(-26 -128)">${horn(0)}</g><g transform="translate(26 -128)">${horn(0)}</g><g transform="translate(-62 -98)">${horn(0)}</g><g transform="translate(62 -98)">${horn(0)}</g>
    <rect x="-18" y="-84" width="36" height="30" fill="${C.charcoal}" opacity=".55"/>
  </g>`;
}

/** Mycenaean citadel wall with the Lion Gate. Anchored at ground centre. */
export function mycenae({ s = 1, tone = '#B7A58A' } = {}) {
  const dk = darken(tone, .3);
  let stones = '';
  const r = rng(11);
  for (let y = -70; y < -6; y += 14) for (let x = -170 + ((y / 14) % 2) * 12; x < 170; x += 26) {
    stones += `<rect x="${x + r.range(-1, 1)}" y="${y}" width="${r.range(22, 28)}" height="12" rx="2" fill="${mix(tone, '#fff', r.range(0, .12))}" stroke="${dk}" stroke-width=".8" opacity=".95"/>`;
  }
  const lion = (f) => `<g transform="scale(${f} 1)"><path d="M6 -4 C14 -10 20 -22 18 -34 C16 -40 20 -46 28 -44 C34 -42 34 -34 30 -32 C30 -22 26 -8 20 0 Z" fill="${darken(tone, .06)}" stroke="${dk}" stroke-width=".8"/><circle cx="26" cy="-40" r="4" fill="${tone}" stroke="${dk}" stroke-width=".7"/></g>`;
  return `<g transform="scale(${s})">
    <path d="M-190 0 L-190 -78 L190 -78 L190 0 Z" fill="${tone}" stroke="${dk}" stroke-width="1"/>${stones}
    <rect x="-200" y="-110" width="52" height="40" fill="${tone}" stroke="${dk}" stroke-width="1"/>
    <rect x="-6" y="-8" width="0" height="0"/>
    <path d="M-26 0 V-34 H26 V0 Z" fill="${C.charcoal}" opacity=".8"/>
    <rect x="-34" y="-42" width="68" height="9" fill="${darken(tone, .08)}" stroke="${dk}" stroke-width="1"/>
    <path d="M-26 -42 L0 -80 L26 -42 Z" fill="${lighten(tone, .15)}" stroke="${dk}" stroke-width="1"/>
    <rect x="-3" y="-66" width="6" height="22" fill="${darken(tone, .2)}"/>
    <g transform="translate(0 -4)">${lion(-1)}${lion(1)}</g>
  </g>`;
}

/** Annotation label: dot, leader and small-caps text (SVG, uses page fonts). */
export function mapLabel({ x, y, dx = 0, dy = -60, title, note = '', anchor = 'middle', color = C.blue, size = 24 }) {
  const tx = x + dx, ty = y + dy;
  return `<g class="maplabel" transform="translate(0 0)"><circle cx="${x}" cy="${y}" r="4.5" fill="${C.terracotta}" stroke="${C.ivory}" stroke-width="2"/>
    <path d="M${x} ${y - 6} L${x} ${ty + (note ? size * 0.95 : 0) + 8}" stroke="${color}" stroke-width="1.4" opacity=".8"/>
    <text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="Cinzel, serif" font-weight="700" font-size="${size}" letter-spacing="${size * 0.22}" fill="${color}" stroke="${C.ivory}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${title}</text>
    ${note ? `<text x="${tx}" y="${ty + size * 0.95}" text-anchor="${anchor}" font-family="'EB Garamond', serif" font-style="italic" font-size="${size * 0.78}" fill="${C.charcoal}" stroke="${C.ivory}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${note}</text>` : ''}</g>`;
}
