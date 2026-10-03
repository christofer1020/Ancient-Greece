// Small helpers shared by all art modules.
export const NS = 'http://www.w3.org/2000/svg';
export const D2R = Math.PI / 180;

let _uid = 0;
export const uid = (p = 'u') => `${p}${++_uid}`;

/** Deterministic PRNG (mulberry32) */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a2, b2) => a2 + (b2 - a2) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

/** Smooth 1D value noise, returns -1..1 */
export function noise1(x, seed = 0) {
  const h = (n) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

/** fBm noise */
export function fbm(x, seed = 0, oct = 3) {
  let v = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += noise1(x * f, seed + i * 17) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}

/** Smooth closed ridge polygon: returns an SVG path 'd'. */
export function ridge({ x0 = -900, x1 = 2500, base = 600, amp = 80, freq = 0.004, seed = 1, step = 40, bottom = 1500, oct = 3, sharp = 0 }) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    let n = fbm(x * freq, seed, oct);
    if (sharp) n = Math.sign(n) * Math.pow(Math.abs(n), 1 - sharp);
    pts.push([x, base + n * amp]);
  }
  return smoothPath(pts) + ` L${x1} ${bottom} L${x0} ${bottom} Z`;
}

/** Catmull-Rom → cubic path through points */
export function smoothPath(pts, closed = false) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? d + ' Z' : d;
}

export function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/** Parse markup (SVG string) into nodes appended to parent. Returns the first element. */
export function mount(parent, markup) {
  const tpl = document.createElementNS(NS, 'g');
  tpl.innerHTML = markup;
  const kids = [...tpl.children];
  const first = kids.find((e) => e.tagName !== 'defs') || kids[0];
  while (tpl.firstChild) parent.appendChild(tpl.firstChild);
  return first;
}

/** Set an attribute only if it changed (cheap per-frame writes). */
export function setAttr(el, name, val) {
  const key = '_' + name;
  if (el[key] !== val) { el.setAttribute(name, val); el[key] = val; }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const f1 = (n) => Math.round(n * 10) / 10;

/** Rounded polyline through points (corners cut with quadratic curves; never overshoots). */
export function softPath(pts) {
  if (pts.length < 3) return 'M' + pts.map((p) => p.join(' ')).join(' L');
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
}
