// Chapter 5 — The Persian Wars: Marathon, Thermopylae, Athens burning, Salamis.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng, smoothPath } from '../art/util.js';
import { citadel } from './intro.js';

const PBLUE = '#1E3A62', PCOAT = '#2B3A5C';

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const st = [0, 1, 2, 3, 4].map(() => sc.clipbox('none'));
  const L = (i, n, d) => sc.layer(`${i}-${n}`, d, { host: st[i] });

  const persian = (layer, x, y, s, facing, o = {}) => {
    const f = sc.fig(layer, Object.assign({ x, y, s, facing, outfit: 'chiton', color: PCOAT, trim: '#C9A24A', legColor: PBLUE, hat: 'turban', hatColor: PBLUE, hem: 0.42, cloak: null }, o));
    return f;
  };
  const hoplite = (layer, x, y, s, facing, o = {}) => {
    const f = sc.fig(layer, Object.assign({ x, y, s, facing, outfit: 'chiton', color: '#C8462F', trim: C.ivory, helmet: true, crest: C.red, cloak: C.red, cloakType: 'back' }, o));
    f.set('guard'); f.hold('F', 'shield', { emblem: o.emblem || 'lambda', face: C.bronze, mode: 'world' }); f.hold('B', 'spear', { len: 170, mode: 'world', rot: 6 });
    f.p.armB = 70; f.p.elbowB = 50; f.p.lean = 3; f.p.cape = 0.12;
    return f;
  };
  const fall = (f, at, dir = 1) => {
    tl.to(f.p, { rot: 84 * dir, y: `+=${8}`, duration: 0.55, ease: 'power2.in', overwrite: false }, at);
    tl.to(f.p, { opacity: 0, duration: 0.8, ease: 'none' }, at + 1.2);
  };

  // =================================================================== STAGE 0 — the Persian fleet (490 BCE)
  {
    const sky = L(0, 'sky', 0.03), far = L(0, 'far', 0.12), sea = L(0, 'sea', 0.3), ships = L(0, 'ships', 0.6), fg = L(0, 'fg', 1.0);
    sc.add(sky, S.sky([[0, '#1F2F63'], [0.34, '#5F6CA3'], [0.58, '#D9946F'], [0.78, '#F3BB7B'], [1, '#F7D49A']], { y0: -400, h: 1100 }));
    sc.add(sky, S.sun({ x: 1170, y: 585, r: 64, glowR: 700, glow: '#FFB66B', core: '#FFF0C8', op: 1 }));
    sc.add(sky, S.rays({ x: 1170, y: 585, n: 12, spread: 120, dir: -90, len: 1400, op: 0.16, color: '#FFD08C' }));
    sc.add(sky, S.driftCloud({ x: 250, y: 160, s: 1.5, tone: 'dusk', seed: 91, w: 1.5, vx: 3, op: 0.9 }));
    sc.add(sky, S.driftCloud({ x: 900, y: 90, s: 1.2, tone: 'dusk', seed: 93, w: 1.3, vx: 2.4, op: 0.85 }));
    sc.add(far, S.mountains({ base: 632, amp: 110, lit: '#B0807E', shade: '#4E4A74', seed: 95, light: -1 }));
    sc.add(sea, S.sea({ y: 606, top: '#B8827E', bottom: '#183560', rows: 13, line: '#FFE6B8', rowOp: 0.8, seed: 7 }));
    sc.add(sea, S.glitter({ x: 1170, y: 612, h: 300, w: 380, n: 70, color: '#FFE9B8' }));
    sc.add(sea, S.island({ x: 200, y: 610, w: 300, h: 36, color: '#6D6384', light: '#AA8A8A', seed: 5 }));
    // fleet: rows, big in front
    const rows = [[638, 0.42, 6, 190], [668, 0.54, 5, 230], [704, 0.7, 5, 260], [750, 0.9, 4, 330]];
    rows.forEach(([y, s, n, gap], r) => {
      for (let i = 0; i < n; i++) {
        const x = -140 + i * gap + r * 90 + (i % 2) * 24;
        sc.add(ships, S.drifter(`<g transform="translate(${x} ${y})">${S.ship({ type: 'merchant', s, sail: '#EBDDB8', stripe: PBLUE, hull: '#2D2233' })}</g>`, { vx: 10 + r * 3, x0: 0, bob: 0 }));
      }
    });
    // Athenian lookouts on the headland
    sc.add(fg, `<path d="M1180 900 C1240 800 1320 760 1480 748 C1620 740 1760 770 1900 800 L1900 1100 L1100 1100 Z" fill="#5E4A3C"/><path d="M1240 840 C1300 790 1400 768 1500 760" fill="none" stroke="#7B6A52" stroke-width="10" opacity=".7"/>`);
    sc.add(fg, S.grass(1240, 800, 600, '#8F7B4B', 4, 0.1));
    [[1340, 790, 1.7], [1440, 780, 1.6], [1530, 772, 1.5]].forEach(([x, y, s], i) => {
      const h = hoplite(fg, x, y, s, -1, {}); h.p.cape = 0.5; h.set({ armF: 50, elbowF: 96, armB: 64, elbowB: 50 }); h.p.head = 6;
      tl.to(h.p, { head: -4, duration: 2.6, ease: 'sine.inOut' }, 2 + i * 0.4);
    });
    sc.add(fg, S.olive(1760, 800, 1.5, { leaf: '#6F7A4B' }));
  }

  // =================================================================== STAGE 1 — Marathon (490 BCE)
  const mar = { ath: [], per: [] };
  {
    const sky = L(1, 'sky', 0.03), far = L(1, 'far', 0.12), mid = L(1, 'mid', 0.5), fig = L(1, 'fig', 1.0), fg = L(1, 'fg', 1.25);
    sc.add(sky, S.daySky());
    sc.add(sky, S.sun({ x: 360, y: 170, r: 46, glowR: 460, glow: '#FFE2A8', op: 0.7 }));
    sc.add(sky, S.driftCloud({ x: 900, y: 140, s: 1.4, tone: 'white', seed: 101, w: 1.4, vx: 3, op: 0.95 }));
    sc.add(far, S.mountains({ base: 620, amp: 140, lit: '#CFC0B6', shade: '#8E96B2', seed: 103 }));
    sc.add(mid, S.hills({ base: 640, amp: 16, top: '#A9B278', bottom: '#8A9A62', seed: 8, freq: 0.01 }));
    sc.add(mid, `<rect x="1000" y="640" width="1400" height="120" fill="#8DB1C6"/>`);
    sc.add(mid, S.sea({ y: 648, top: '#9CC0D2', bottom: '#4C7DA3', rows: 4, line: '#fff', rowOp: 0.6, x0: 1000, w: 1400, bottomY: 740, seed: 3 }));
    for (const x of [1180, 1320, 1470]) sc.add(mid, `<g transform="translate(${x} 700)">${S.ship({ type: 'merchant', s: 0.4, dir: -1, sail: '#EBDDB8', stripe: PBLUE, hull: '#2D2233' })}</g>`);
    const gg = S.grad([[0, '#D8C393'], [1, '#B79C6A']]);
    sc.add(fig, `<defs>${gg.def}</defs><path d="M-1200 664 C-200 655 600 668 1100 676 C1500 684 2400 690 2800 700 L2800 1400 L-1200 1400 Z" fill="${gg.ref}"/>`);
    sc.add(fig, S.grass(-300, 740, 2200, '#9A8F55', 2, 0.04));
    // Persians (right)
    const px = [[1000, 704], [1070, 726], [1130, 700], [1090, 752], [1170, 730], [1230, 710], [1190, 764], [1270, 746], [1300, 704], [1340, 730]];
    px.forEach(([x, y], i) => {
      const p = persian(fig, x, y, 1.45 + (y - 700) * 0.0035, -1, i % 3 === 0 ? {} : {});
      p.set('guard'); if (i % 3 === 2) { p.hold('F', 'bow', { mode: 'world', rot: 0 }); p.p.armF = 80; p.p.elbowF = 20; } else { p.hold('F', 'persianShield', { mode: 'world' }); p.hold('B', 'spear', { len: 150, mode: 'world', rot: 4 }); p.p.armB = 70; p.p.elbowB = 50; }
      mar.per.push(p);
    });
    // Athenian phalanx (left)
    const ax = [[60, 706], [130, 728], [200, 702], [150, 756], [250, 730], [320, 706], [290, 764], [370, 748], [420, 710], [460, 736]];
    ax.forEach(([x, y]) => { const h = hoplite(fig, x, y, 1.5 + (y - 700) * 0.0035, 1, { emblem: 'owl', cloak: C.red }); mar.ath.push(h); });
    sc.add(fg, S.grass(-300, 905, 2400, '#9A8F55', 12, 0.05));
  }

  // =================================================================== STAGE 2 — Thermopylae (480 BCE)
  const thermo = { greeks: [], persians: [] };
  let flankU = { u: 0 };
  {
    const sky = L(2, 'sky', 0.03), far = L(2, 'far', 0.14), path = L(2, 'path', 0.5), fig = L(2, 'fig', 1.0), cliff = L(2, 'cliff', 1.25);
    sc.add(sky, S.sky([[0, '#41304A'], [0.3, '#8E5A56'], [0.55, '#D49060'], [0.8, '#EFC088'], [1, '#F2D2A0']], { y0: -400, h: 1100 }));
    sc.add(sky, S.sun({ x: 1180, y: 330, r: 70, glowR: 620, glow: '#FFC58C', core: '#FFF4D8', op: 0.8 }));
    sc.add(sky, S.driftCloud({ x: 400, y: 160, s: 1.5, tone: 'dusk', seed: 111, w: 1.5, vx: 3, op: 0.85 }));
    sc.add(far, S.mountains({ base: 640, amp: 200, lit: '#9A6660', shade: '#3C2C44', seed: 113, light: -1 }));
    sc.add(far, `<rect x="-1400" y="640" width="4400" height="220" fill="#7C99B4" opacity=".8"/>`);
    // flank path on the mid mountain
    const mg = S.grad([[0, '#6E4A48'], [1, '#33243A']]);
    sc.add(path, `<defs>${mg.def}</defs><path d="M-200 900 L-200 300 C100 240 300 200 560 220 C800 240 1000 380 1200 520 L1300 900 Z" fill="${mg.ref}"/>`);
    const fp = [[620, 250], [520, 290], [600, 340], [480, 392], [560, 440], [430, 500], [520, 560], [420, 620], [500, 690]];
    sc.add(path, `<path d="M${fp.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="#C9A66B" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>`);
    // little torch-bearers coming down
    const flankers = [];
    for (let i = 0; i < 6; i++) {
      const f = persian(path, 0, 0, 0.5, 1, { opacity: 0 }); f.p.shadow = 0; f.hold('F', 'torch', { mode: 'world', rot: 0 }); f.p.armF = 60; f.p.elbowF = 80; f.p.walkAmp = 0.8;
      flankers.push(f);
    }
    const seg = fp.slice(1).map((p, i) => ({ a: fp[i], b: p, len: Math.hypot(p[0] - fp[i][0], p[1] - fp[i][1]) }));
    const totalLen = seg.reduce((a, s) => a + s.len, 0);
    const pointAt = (u) => { let d = Math.max(0, Math.min(1, u)) * totalLen; for (const s of seg) { if (d <= s.len) { const t = d / s.len; return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]; } d -= s.len; } return fp[fp.length - 1]; };
    sc.tick(() => {
      flankers.forEach((f, i) => {
        const u = flankU.u - i * 0.05;
        const vis = u > 0.01 && u < 0.995;
        f.p.opacity = vis ? 1 : 0;
        const [x, y] = pointAt(u);
        f.p.x = x; f.p.y = y; f.p.walk = u * 24 + i; f.p.facing = 1;
      });
    });
    // the pass floor
    const gg = S.grad([[0, '#B98A62'], [1, '#6E4B3A']]);
    sc.add(fig, `<defs>${gg.def}</defs><path d="M-1200 700 C-200 690 800 704 1600 712 C2000 716 2400 720 2800 724 L2800 1400 L-1200 1400 Z" fill="${gg.ref}"/>`);
    sc.add(fig, S.rock(1400, 706, 2.2, '#7B5A4C'));
    sc.add(fig, S.grass(100, 770, 2000, '#8F6B3C', 6, 0.04));
    // wall of stones
    sc.add(fig, `<g transform="translate(985 724)"><rect x="-8" y="-34" width="16" height="34" fill="#9A8470" stroke="#4E3F38"/>${[-1, 0, 1].map((k) => `<rect x="${-34 + k * 0}" y="${-18 + k * 14}" width="68" height="14" rx="3" fill="${['#A08A74', '#8F7A66', '#9A846E'][k + 1]}" stroke="#4E3F38" stroke-width="1"/>`).join('')}</g>`);
    // Greeks
    const gp = [[640, 716, 1.62], [700, 742, 1.7], [770, 712, 1.62], [830, 744, 1.7], [900, 718, 1.62], [950, 746, 1.7]];
    gp.forEach(([x, y, s]) => thermo.greeks.push(hoplite(fig, x, y, s, 1)));
    const leo = hoplite(fig, 1000, 748, 1.95, 1, { crest: '#F0D68A', cloak: '#A8261E', color: '#8E2E27' });
    leo.p.cape = 0.2; thermo.leo = leo;
    // Persians (waves)
    for (let w = 0; w < 3; w++) {
      const wave = [];
      for (let i = 0; i < 5; i++) {
        const p = persian(fig, 1900 + i * 70 + w * 20, 706 + (i % 3) * 20, 1.5 + (i % 3) * 0.06, -1);
        p.set('guard'); p.p.opacity = 1;
        if (i === 4) { p.hold('F', 'bow', { mode: 'world', rot: 0 }); p.p.armF = 80; p.p.elbowF = 20; }
        else { p.hold('F', 'persianShield', { mode: 'world' }); p.hold('B', 'spear', { len: 150, mode: 'world', rot: 6 }); p.p.armB = 70; p.p.elbowB = 50; }
        wave.push(p);
      }
      thermo.persians.push(wave);
    }
    // big cliff on the left
    const cg = S.grad([[0, '#6B4A44'], [1, '#2B1D2A']], { x1: 0, y1: 0, x2: 1, y2: 0 });
    sc.add(cliff, `<defs>${cg.def}</defs><path d="M-900 1200 L-900 -200 L420 -200 C380 40 330 200 280 380 C240 540 180 700 120 900 L60 1200 Z" fill="${cg.ref}"/>
      <path d="M420 -200 C380 40 330 200 280 380 C240 540 180 700 120 900" fill="none" stroke="#C99B6E" stroke-width="4" opacity=".45"/>`);
  }

  // =================================================================== STAGE 3 — Athens burns
  {
    const sky = L(3, 'sky', 0.03), far = L(3, 'far', 0.14), mid = L(3, 'mid', 0.5), fig = L(3, 'fig', 1.0);
    sc.add(sky, S.sky([[0, '#0E0A16'], [0.3, '#34131A'], [0.55, '#8E2E27'], [0.75, '#E36A32'], [1, '#F2A653']], { y0: -400, h: 1100 }));
    sc.add(sky, S.sun({ x: 800, y: 600, r: 10, glowR: 800, glow: '#FF8A3A', core: '#FFD27A', op: 0.9 }));
    sc.add(far, S.mountains({ base: 640, amp: 120, lit: '#4A2326', shade: '#1B0D14', seed: 121, light: 1 }));
    sc.add(mid, `<g transform="translate(800 760)">${citadel({ w: 820, h: 300, lit: '#6B3A33', shade: '#1D0E14', seed: 9 })}</g>`);
    sc.add(mid, `<g transform="translate(800 ${760 - 300 - 8})">${S.temple({ w: 520, h: 170, steps: 3, tone: ['#5B3A38', '#3A2328', '#1E1015'], dark: '#0b0508', accent: '#E36A32' })}</g>`);
    for (let i = 0; i < 9; i++) sc.add(mid, S.fire({ x: 560 + i * 60 + (i % 2) * 8, y: 760 - 300 - 8 - 150 + (i % 3) * 8, s: 1.2 + (i % 3) * 0.3 }));
    sc.add(mid, S.fire({ x: 520, y: 760 - 300, s: 1.8 }));
    sc.add(mid, S.fire({ x: 1100, y: 760 - 300, s: 2.0 }));
    sc.add(mid, S.smoke({ x: 700, y: 330, s: 3.4, n: 9, c: '#1c1214' }));
    sc.add(mid, S.smoke({ x: 940, y: 330, s: 3.8, n: 9, c: '#1c1214' }));
    sc.add(mid, S.smoke({ x: 820, y: 360, s: 3.0, n: 8, c: '#2a1a1a' }));
    const gg = S.grad([[0, '#2F1816'], [1, '#0f0809']]);
    sc.add(fig, `<defs>${gg.def}</defs><path d="M-1200 780 C-200 770 800 790 1600 780 L2800 790 L2800 1400 L-1200 1400 Z" fill="${gg.ref}"/>`);
    // Persian silhouettes at the foot of the hill
    [[300, 800, 1.6, 1], [420, 818, 1.7, 1], [1320, 806, 1.6, -1], [1440, 820, 1.7, -1], [1230, 836, 1.5, -1]].forEach(([x, y, s, f], i) => {
      const p = persian(fig, x, y, s, f, { color: '#150C10', legColor: '#150C10', trim: '#150C10', hatColor: '#150C10', eyes: false });
      p.hold('F', 'torch', { mode: 'world', rot: 0 }); p.p.armF = 120; p.p.elbowF = 40;
    });
  }

  // =================================================================== STAGE 4 — Salamis
  const sal = { greek: [], pers: [], ships: [] };
  {
    const sky = L(4, 'sky', 0.03), far = L(4, 'far', 0.12), sea = L(4, 'sea', 0.4), ships = L(4, 'ships', 0.8), fg = L(4, 'fg', 1.2);
    sal.shipsLayer = ships;
    sc.add(sky, S.sky([[0, '#2E4A82'], [0.35, '#7C8FB8'], [0.58, '#EBB598'], [0.78, '#F6CFA0'], [1, '#F6DDB0']], { y0: -400, h: 1100 }));
    sc.add(sky, S.sun({ x: 800, y: 560, r: 52, glowR: 620, glow: '#FFC58C', core: '#FFF4D8', op: 0.9 }));
    sc.add(sky, S.driftCloud({ x: 300, y: 150, s: 1.4, tone: 'dusk', seed: 131, w: 1.5, vx: 3, op: 0.85 }));
    sc.add(sky, S.driftCloud({ x: 1200, y: 220, s: 1.1, tone: 'warm', seed: 133, w: 1.2, vx: 2.4, op: 0.85 }));
    // strait shores
    sc.add(far, S.mountains({ base: 600, amp: 130, lit: '#B4857E', shade: '#4E4A74', seed: 135, light: 1 }));
    sc.add(far, `<path d="M-1400 640 C-700 600 -200 590 300 610 L300 700 L-1400 700 Z" fill="#6E7A5C"/><path d="M1400 616 C1800 590 2200 600 2800 640 L2800 700 L1400 700 Z" fill="#6E7A5C"/>`);
    sc.add(sea, S.sea({ y: 606, top: '#B9C3C8', bottom: '#1F4B73', rows: 12, line: '#F4EEDD', rowOp: 0.75, seed: 12 }));
    sc.add(sea, S.glitter({ x: 800, y: 612, h: 260, w: 340, n: 50, color: '#FFF0CC' }));
    // Xerxes' throne on the right cliff
    sc.add(fg, `<path d="M1100 920 C1140 760 1220 650 1400 610 C1540 580 1740 600 1840 640 L1840 1100 L1040 1100 Z" fill="#6C5A4A"/><path d="M1140 800 C1200 700 1300 640 1420 618" fill="none" stroke="#8D7A62" stroke-width="12" opacity=".6"/>`);
    sc.add(fg, `<g transform="translate(1430 622)"><rect x="-34" y="-72" width="68" height="72" rx="3" fill="#C9A24A" stroke="#6E5420" stroke-width="2"/><rect x="-44" y="-84" width="88" height="14" rx="3" fill="#E0BE62" stroke="#6E5420" stroke-width="2"/><rect x="-26" y="-56" width="52" height="40" fill="#8E2E27"/></g>`);
    const xerx = sc.fig(fg, { x: 1430, y: 590, s: 1.45, outfit: 'robe', color: '#7A2D4A', trim: '#E0BE62', hat: 'turban', hatColor: '#E0BE62', cloak: '#7A2D4A', facing: -1 });
    xerx.set('sit'); xerx.p.armF = 80; xerx.p.elbowF = 100; xerx.p.legF = 70; xerx.p.kneeF = 90;
    sal.xerx = xerx;
    sc.add(fg, `<path d="M1180 560 L1680 560 L1630 500 L1230 500 Z" fill="${C.red}" stroke="${darken(C.red, .4)}" stroke-width="2" transform="translate(0 -170)"/><line x1="1220" y1="340" x2="1220" y2="612" stroke="#6E5420" stroke-width="5"/><line x1="1640" y1="340" x2="1640" y2="612" stroke="#6E5420" stroke-width="5"/>`);
    // fleets: Persians crowded on the right, Greek triremes from the left
    const persY = [[1080, 690], [1180, 706], [1000, 712], [1260, 722], [1120, 736], [1040, 756], [1210, 760]];
    persY.forEach(([x, y], i) => {
      const g = sc.add(ships, `<g class="pship"><g transform="scale(1)">${S.ship({ type: 'merchant', s: 0.62, dir: -1, sail: '#EBDDB8', stripe: PBLUE, hull: '#2D2233' })}</g></g>`);
      gsap.set(g, { x, y });
      sal.pers.push({ g, x, y });
    });
    const greekY = [[-420, 700], [-560, 730], [-300, 750], [-700, 690], [-480, 772]];
    greekY.forEach(([x, y], i) => {
      const g = sc.add(ships, `<g class="gship">${S.ship({ type: 'trireme', s: 0.64, oars: 12, sail: C.ivory, stripe: C.red, hull: '#33261F' })}</g>`);
      gsap.set(g, { x, y });
      g.querySelectorAll('.oar').forEach((o) => { o.setAttribute('data-sp', '4.6'); o.setAttribute('data-amp', '20'); });
      sal.greek.push({ g, x, y });
    });
    sc.scan(ships.g);
    sc.add(fg, S.olive(60, 930, 1.6, { leaf: '#6F7A4B' }));
  }

  // ----------------------------------------------------------- scene-wide overlays
  const ui = sc.layer('ui', 0);
  const tag = (text, sub, id) => {
    const el = sc.add(ui, `<g class="tag" opacity="0"><text x="70" y="156" font-family="Jost, sans-serif" font-weight="500" font-size="15" letter-spacing="7" fill="${C.ivory}" opacity=".85">${sub}</text>
      <text x="70" y="108" font-family="Cinzel, serif" font-weight="700" font-size="44" letter-spacing="6" fill="${C.ivory}" stroke="rgba(20,10,10,.55)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${text}</text><path d="M70 126 h96" stroke="${C.terracotta}" stroke-width="3"/></g>`);
    return el;
  };
  const tags = [tag('490 BCE', 'THE PERSIAN FLEET SAILS'), tag('MARATHON', '490 BCE'), tag('THERMOPYLAE', '480 BCE'), tag('ATHENS BURNS', '480 BCE'), tag('SALAMIS', '480 BCE')];
  const tint = sc.tint('#0b070e');
  sc.particle('motes', { n: 26, color: ['#FFE2A0', '#FFC88A'], op: 0.45, size: 2, vx: 0.006, vy: -0.002 });
  sc.particle('arrows', { n: 0, color: '#3a2a1a', vx: -0.9, vy: 0.14, op: 0.9, y0: 0.0, yr: 0.3 });

  // ================================================================== STORY
  const stageAt = (i, at) => {
    st.forEach((s, k) => gsap.set(s, { autoAlpha: k === i ? 1 : 0 }));
  };
  stageAt(0);
  const cut = (from, to, at) => {
    tl.to(tint, { opacity: 1, duration: 0.5, ease: 'power2.in' }, at - 0.5);
    tl.set(st[from], { autoAlpha: 0 }, at);
    tl.set(st[to], { autoAlpha: 1 }, at);
    tl.to(tint, { opacity: 0, duration: 0.7, ease: 'power2.out' }, at + 0.02);
    tl.to(tags[from], { opacity: 0, duration: 0.3 }, at - 0.6);
  };
  const showTag = (i, at, hold = 3.8) => { tl.to(tags[i], { opacity: 1, duration: 0.8, ease: 'power2.out' }, at); tl.to(tags[i], { opacity: 0, duration: 0.6 }, at + hold); };

  // --- Stage 0 : 0 – 9.4
  cam.x = 760; cam.y = 470; cam.z = 1.0;
  sc.pan(0, 9.4, { x: 880, y: 450, z: 1.12 }, 'sine.inOut');
  showTag(0, 0.6, 5.2);
  cut(0, 1, 9.4);
  // --- Stage 1 : 9.4 – 16.2 (Marathon)
  tl.set(cam, { x: 600, y: 520, z: 1.0 }, 9.4);
  sc.pan(9.4, 6.4, { x: 980, y: 520, z: 1.08 }, 'sine.inOut');
  showTag(1, 10.2, 3.6);
  mar.ath.forEach((h, i) => {
    const at = 10.4 + (i % 5) * 0.05;
    h.p.swing = 0.2;
    h.walk(tl, at, 680 + (i % 5) * 36 + (i >= 5 ? -40 : 0), 2.7, { run: 1, ease: 'power1.in', face: false });
    h.go(tl, at + 2.5, 0.3, { armB: 92, elbowB: 12, lean: 14 }, 'power3.out');
    h.go(tl, at + 3.2, 0.6, { armB: 70, elbowB: 50, lean: 3 }, 'sine.inOut');
  });
  mar.per.forEach((p, i) => {
    tl.to(p.p, { lean: -4, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 10.2);
    const at = 13.2 + (i % 4) * 0.12;
    p.walk(tl, at, 1480 + i * 20, 2.3, { run: 1, ease: 'power1.in', face: true });
    tl.set(p.p, { facing: 1 }, at);
  });
  sc.shake(13.1, 7, 0.5);
  sc.cue('clash', 13.1);
  mar.ath.forEach((h, i) => { h.go(tl, 15.0 + i * 0.04, 0.8, { armB: 160, elbowB: 10, lean: -3 }, 'back.out(1.6)'); });
  cut(1, 2, 16.2);

  // --- Stage 2 : 16.2 – 25.6 (Thermopylae)
  tl.set(cam, { x: 880, y: 500, z: 1.0 }, 16.2);
  sc.pan(16.2, 7.0, { x: 940, y: 500, z: 1.1 }, 'sine.inOut');
  sc.pan(23.0, 2.6, { y: 380, x: 780, z: 1.0 }, 'power2.inOut');
  showTag(2, 16.9, 3.8);
  thermo.greeks.concat([thermo.leo]).forEach((g, i) => { tl.to(g.p, { lean: 6, duration: 0.6, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 17 + i * 0.08); });
  thermo.persians.forEach((wave, w) => {
    const t0 = 17.2 + w * 2.6;
    wave.forEach((p, i) => {
      p.walk(tl, t0 + i * 0.08, 1140 + i * 36, 2.2, { ease: 'sine.out', face: false });
      if (w < 2) {
        if (i % 2 === 0) fall(p, t0 + 2.6, 1);
        else p.walk(tl, t0 + 2.4, 2100, 1.4, { ease: 'sine.in', face: true });
      }
    });
    thermo.greeks.forEach((g, i) => {
      g.go(tl, t0 + 2.3 + (i % 3) * 0.05, 0.25, { armB: 92, elbowB: 12, lean: 12 }, 'power3.out');
      g.go(tl, t0 + 2.9, 0.5, { armB: 70, elbowB: 50, lean: 3 }, 'sine.inOut');
    });
    sc.cue('clash', t0 + 2.35);
  });
  tl.fromTo(flankU, { u: 0 }, { u: 1.3, duration: 7.5, ease: 'none' }, 18.0);
  sc.cue('horn', 22.8);
  cut(2, 3, 25.6);

  // --- Stage 3 : 25.6 – 30
  cam.x = 800;
  tl.set(cam, { x: 800, y: 470, z: 1.0 }, 25.6);
  sc.pan(25.6, 4.6, { z: 1.12, y: 440 }, 'sine.inOut');
  showTag(3, 26.4, 3.0);
  sc.cue('fire', 26);
  sc.particle('embers', { n: 40, color: ['#FFB067', '#FF8A4A', '#FFD27A'], op: 0.9, size: 2.4, vy: 0.08, vx: 0.015 });
  cut(3, 4, 30.0);

  // --- Stage 4 : 30 – 38 (Salamis)
  tl.set(cam, { x: 780, y: 470, z: 1.0 }, 30.0);
  sc.pan(30.0, 8.0, { x: 880, y: 470, z: 1.1 }, 'sine.inOut');
  showTag(4, 30.8, 3.4);
  const ripples = [];
  sal.greek.forEach((s, i) => {
    const target = sal.pers[i];
    const hitX = target.x - 150;
    tl.to(s.g, { x: hitX, duration: 3.0 + i * 0.1, ease: 'power2.inOut' }, 30.5 + i * 0.1);
    tl.to(s.g, { x: hitX + 50, duration: 1.4, ease: 'power1.out' }, 33.6 + i * 0.35);
    const rp = sc.add(sal.shipsLayer, `<g transform="translate(${target.x - 56} ${target.y + 6})"><ellipse class="rp" rx="46" ry="9" fill="none" stroke="#fff" stroke-width="3" opacity="0"/></g>`);
    ripples.push(rp.querySelector('.rp'));
    tl.fromTo(rp.querySelector('.rp'), { scale: 0.3, opacity: 0.9, transformOrigin: '50% 50%' }, { scale: 2.4, opacity: 0, duration: 1.6, ease: 'power2.out' }, 33.5 + i * 0.35);
  });
  sal.pers.forEach((p, i) => {
    const at = 33.5 + i * 0.35;
    tl.to(p.g, { rotation: (i % 2 ? -1 : 1) * (18 + i * 3), y: p.y + 90, duration: 2.4, ease: 'power2.in', transformOrigin: '50% 100%' }, at);
    tl.to(p.g, { opacity: 0, duration: 1.0, ease: 'none' }, at + 1.8);
  });
  [33.4, 34.4, 35.2].forEach((t0) => sc.shake(t0, 5, 0.4));
  sc.cue('ram', 33.4);
  sal.xerx.go(tl, 34.6, 1.0, { head: 14, armF: 150, elbowF: 140 });
}
