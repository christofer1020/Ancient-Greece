// Title scene: the Acropolis at first light. Loops gently under the title.
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng } from '../art/util.js';

/** Limestone citadel with a flat top and buttressed wall; anchored at ground centre. */
export function citadel({ w = 700, h = 260, lit = '#DBC59E', shade = '#8E7761', seed = 3 }) {
  const r = rng(seed);
  const jag = (x0, y0, x1, y1, n, amp) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t + (i && i < n ? r.range(-amp, amp) : 0), y0 + (y1 - y0) * t + (i && i < n ? r.range(-amp * 0.4, amp * 0.4) : 0)]);
    }
    return pts;
  };
  const left = jag(-w / 2, 6, -w * 0.355, -h, 9, w * 0.02);
  const right = jag(w * 0.34, -h, w / 2, 6, 9, w * 0.02);
  const pts = [...left, ...right];
  // bow the slopes outward a little for a more organic mass
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';
  const g = S.grad([[0, lit], [0.5, mix(lit, shade, 0.35)], [1, shade]], { x1: 0, y1: 0, x2: 1, y2: 0.15 });
  const gv = S.grad([[0, '#FFF1CF', 0.0], [0.6, '#5a4638', 0.0], [1, '#2f2220', 0.38]]);
  const cid = 'cz' + seed;
  let strata = '', cracks = '', shrubs = '';
  for (let i = 0; i < 7; i++) {
    const y = -h * (0.12 + i * 0.12);
    strata += `<path d="M${-w / 2} ${y} q${w * 0.25} ${r.range(-9, 9)} ${w * 0.5} ${r.range(-4, 4)} t${w * 0.5} ${r.range(-6, 6)}" stroke="${shade}" stroke-width="${r.range(1, 2.4).toFixed(1)}" fill="none" opacity="${r.range(0.18, 0.34).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 20; i++) {
    const x = r.range(-w * 0.4, w * 0.4), y = r.range(-h * 0.95, -h * 0.1);
    cracks += `M${x.toFixed(0)} ${y.toFixed(0)} l${r.range(-6, 6).toFixed(0)} ${r.range(14, 40).toFixed(0)} `;
  }
  for (let i = 0; i < 16; i++) {
    const t = r.range(0.02, 0.9), side = r() > 0.5 ? 1 : -1;
    const sx = side * (w * (0.5 - t * 0.14)) * r.range(0.82, 1), sy = -h * t * 0.9;
    shrubs += `<ellipse cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" rx="${r.range(8, 20).toFixed(0)}" ry="${r.range(4, 8).toFixed(0)}" fill="${C.olive}" opacity="${r.range(0.45, 0.8).toFixed(2)}"/>`;
  }
  // ashlar retaining wall along the summit
  let wall = '';
  const wh = 22;
  for (let row = 0; row < 2; row++) {
    for (let x = -w * 0.352 + (row % 2) * 16; x < w * 0.338; x += 32) wall += `<rect x="${x.toFixed(0)}" y="${-h + row * (wh / 2)}" width="31" height="${wh / 2 - 0.5}" fill="${lighten(lit, 0.18 - row * 0.05)}" stroke="${shade}" stroke-width=".5" opacity=".95"/>`;
  }
  return `<defs>${g.def}${gv.def}<clipPath id="${cid}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${g.ref}"/>
    <g clip-path="url(#${cid})">${strata}<path d="${cracks}" stroke="${shade}" stroke-width="1.6" fill="none" opacity=".38" stroke-linecap="round"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h + 8}" fill="${gv.ref}"/></g>
    ${wall}${shrubs}`;
}

export function build(sc) {
  const sky = sc.layer('sky', 0.03);
  const far = sc.layer('far', 0.12);
  const sea = sc.layer('sea', 0.22);
  const mid = sc.layer('mid', 0.4);
  const rock = sc.layer('rock', 0.62);
  const near = sc.layer('near', 0.95);
  const fg = sc.layer('fg', 1.3);

  // ---- sky
  sc.add(sky, S.daySky());
  sc.add(sky, S.sun({ x: 300, y: 600, r: 56, glowR: 760, glow: '#FFD79A', op: 1 }));
  sc.add(sky, S.rays({ x: 300, y: 600, n: 11, spread: 110, dir: -45, len: 1700, op: 0.2 }));
  sc.add(sky, S.driftCloud({ x: 160, y: 190, s: 1.5, tone: 'warm', seed: 2, w: 1.4, vx: 3.2, op: 0.9 }));
  sc.add(sky, S.driftCloud({ x: 980, y: 120, s: 1.2, tone: 'white', seed: 5, w: 1.2, vx: 2.4, op: 0.85 }));
  sc.add(sky, S.driftCloud({ x: 1450, y: 260, s: 1.0, tone: 'warm', seed: 9, w: 1, vx: 3.8, op: 0.85 }));
  sc.add(sky, S.driftCloud({ x: 600, y: 330, s: 0.8, tone: 'gold', seed: 12, w: 1.3, vx: 2.8, op: 0.8 }));

  // ---- far: hazy mountains
  const haze = '#E9CFAE';
  sc.add(far, S.mountains({ base: 650, amp: 150, lit: '#CDBCB7', shade: '#8C93AE', seed: 5, snow: null }));
  sc.add(far, S.hills({ base: 640, amp: 28, top: '#B7B3B8', bottom: '#9CA2B5', seed: 8, freq: 0.006 }));

  // ---- sea
  sc.add(sea, S.sea({ y: 650, top: '#8DB0C8', bottom: '#2F5C8C', rows: 10, line: '#F4EEDD', rowOp: 0.7, seed: 4 }));
  sc.add(sea, S.glitter({ x: 300, y: 655, h: 260, w: 340, n: 60, color: '#FFF3D2' }));
  sc.add(sea, S.island({ x: 520, y: 654, w: 280, h: 40, color: '#8892A8', light: '#C4BDBC', seed: 4 }));
  sc.add(sea, S.island({ x: 1500, y: 655, w: 360, h: 56, color: '#7C869F', light: '#B9B3B6', seed: 8, houses: false }));
  sc.add(sea, S.drifter(`<g transform="translate(420 735)">${S.ship({ type: 'merchant', s: 0.46, hull: '#33261F' })}</g>`, { vx: 5, x0: 0, bob: 0 }));
  sc.add(sea, S.drifter(`<g transform="translate(980 700)">${S.ship({ type: 'boat', s: 0.52, dir: -1, hull: '#33261F' })}</g>`, { vx: -3, x0: 0, bob: 0 }));

  // ---- mid: coastal village + hills
  sc.add(mid, S.hills({ base: 730, amp: 36, top: '#9DA27A', bottom: '#6F7B52', seed: 6, freq: 0.005 }));
  sc.add(mid, `<g transform="translate(130 780)">${S.village({ n: 9, seed: 12, scale: 0.8, haze: { color: '#EBD7B6', amt: 0.28 } })}</g>`);
  sc.add(mid, S.cypress(80, 786, 120, '#4A5A36'));
  sc.add(mid, S.cypress(112, 790, 90, '#4A5A36'));
  sc.add(mid, S.olive(560, 800, 0.6, { leaf: '#869364' }));
  sc.add(mid, S.olive(1640, 790, 0.7, { leaf: '#869364' }));

  // ---- rock: the Acropolis
  sc.add(rock, `<g transform="translate(1230 846)">${citadel({ w: 700, h: 220 })}</g>`);
  sc.add(rock, `<g transform="translate(1230 ${846 - 220 - 8})">${S.temple({ w: 430, h: 140, steps: 3, tone: [C.ivory, '#D9BF93', '#9C8467'] })}</g>`);
  sc.add(rock, S.cypress(1002, 624, 92, '#475733'));
  sc.add(rock, S.cypress(1500, 626, 84, '#475733'));
  sc.add(rock, S.cypress(1534, 628, 62, '#475733'));
  sc.add(rock, S.lightShaft({ x: 380, y: 100, w: 90, h: 760, tilt: -22, op: 0.1 }));
  sc.add(rock, S.flock({ n: 7, x: 0, y: 380, s: 0.9, vx: 28, spread: 110 }));
  sc.add(rock, S.flock({ n: 4, x: 400, y: 270, s: 0.65, vx: 22, spread: 60, seed: 9 }));

  // ---- near: foreground ground, olive, figures
  sc.add(near, `<path d="M-900 900 L-900 835 C-400 800 200 820 520 842 C860 866 1200 850 1700 840 C2200 832 2500 840 2600 850 L2600 1500 L-900 1500 Z" fill="${darken('#6B7A48', 0.12)}"/>`);
  sc.add(near, `<path d="M-900 900 L-900 860 C-300 838 100 858 440 872 C800 888 1200 880 1700 872 L2600 870 L2600 1500 L-900 1500 Z" fill="#59663C"/>`);
  sc.add(near, S.grass(0, 868, 600, '#8C9A60', 4, 0.2));
  sc.add(near, S.olive(1480, 905, 1.4, { leaf: '#7F8F5C' }));
  sc.add(fg, S.grass(-100, 900, 1900, '#97A468', 6, 0.12));
  sc.add(near, S.rock(350, 890, 1.55, '#B1A38C'));
  sc.add(fg, S.rock(1560, 925, 1.9, '#A39684'));

  // ---- the two watchers (a nod to the reference sheet)
  const trav = sc.fig(near, { x: 218, y: 872, s: 1.55, outfit: 'chiton', color: C.ivory, trim: C.terracotta, cloak: C.olive, cloakType: 'drape', facing: 1 });
  trav.set('relaxed').hold('B', 'staff', { len: 150, mode: 'world', rot: -2 });
  trav.p.armB = 6; trav.p.elbowB = 70;
  const kid = sc.fig(near, { x: 352, y: 890, s: 1.25, outfit: 'chiton', color: C.parchment, trim: C.terracotta });
  kid.set('sit'); kid.p.lean = 10; kid.p.head = 8;

  // ---- atmosphere
  sc.particle('motes', { n: 46, color: ['#FFF0C8', '#FFE2A0'], op: 0.55, size: 2.4, vx: 0.006, vy: -0.004 });

  // ---- camera drift (looping)
  sc.cam.x = 760; sc.cam.z = 1.02;
  sc.tl.to(sc.cam, { x: 860, y: 440, z: 1.06, duration: 26, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}
