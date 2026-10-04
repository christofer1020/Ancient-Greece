// Chapter 2 — Myths and Gods: from a storm-dark earth up through the clouds to sunlit Olympus.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng, smoothPath } from '../art/util.js';

function boltFx(g, pts, { w = 8, color = '#FFF1B8' } = {}) {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  el.setAttribute('opacity', '0');
  el.innerHTML = `<path d="${d}" pathLength="1" fill="none" stroke="${color}" stroke-width="${w * 3}" stroke-linecap="round" stroke-linejoin="round" opacity=".35" stroke-dasharray="1" stroke-dashoffset="1"/>
    <path d="${d}" pathLength="1" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  g.appendChild(el);
  return el;
}
function zig(x0, y0, x1, y1, n, amp, seed) {
  const r = rng(seed);
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + r.range(-amp, amp), y0 + (y1 - y0) * t + r.range(-amp * 0.3, amp * 0.3)]);
  }
  pts.push([x1, y1]);
  return pts;
}
function strike(tl, el, at) {
  const [a, b] = el.querySelectorAll('path');
  tl.set(el, { opacity: 1 }, at);
  tl.set([a, b], { strokeDashoffset: 1 }, at);
  tl.to([a, b], { strokeDashoffset: 0, duration: 0.14, ease: 'none' }, at);
  tl.to(el, { opacity: 0, duration: 0.5, ease: 'power2.out' }, at + 0.22);
}

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const sky = sc.layer('sky', 0.4);
  const glow = sc.layer('glow', 0.1);
  const farC = sc.layer('farclouds', 0.18);
  const peaks = sc.layer('peaks', 0.3);
  const midC = sc.layer('midclouds', 0.55);
  const world = sc.layer('world', 1.0);
  const peg = sc.layer('pegasus', 1.0);
  const bank = sc.layer('bank', 1.0);
  const earth = sc.layer('earth', 1.0);
  const nearC = sc.layer('nearclouds', 1.45);

  // ------------------------------------------------------------------ sky (scrolls as we climb)
  sc.add(sky, S.sky([[0, '#101c44'], [0.3, '#26478a'], [0.46, '#3f6cb0'], [0.6, '#7fa4cc'], [0.72, '#c3d0d8'], [0.82, '#f0dcb6'], [1, '#f5c690']], { y0: -1700, h: 3400 }));
  // golden light from upper left
  sc.add(glow, S.sun({ x: 120, y: 90, r: 70, glowR: 900, glow: '#FFD58E', core: '#FFF0C8', op: 1 }));
  sc.add(glow, S.rays({ x: 120, y: 90, n: 13, spread: 110, dir: 38, len: 2000, op: 0.2, color: '#FFE2A8' }));

  // ------------------------------------------------------------------ far clouds + distant peaks
  const cloudRow = (layer, list) => list.forEach(([x, y, s, tone, seed, w, vx]) => sc.add(layer, S.driftCloud({ x, y, s, tone, seed, w, vx, op: 0.95, wrap: 4200 })));
  cloudRow(farC, [[100, 140, 1.4, 'warm', 3, 1.4, 3], [900, 60, 1.6, 'warm', 7, 1.5, 2], [1600, 200, 1.2, 'white', 4, 1.2, 3.4], [400, 430, 1.8, 'warm', 9, 1.6, 2.4], [1300, 520, 2, 'white', 11, 1.6, 2.8], [-200, 700, 2.2, 'cool', 6, 1.8, 2], [1000, 800, 2.4, 'cool', 8, 1.8, 2.6]]);
  sc.add(peaks, S.mountains({ base: 700, amp: 240, lit: '#C9BAB8', shade: '#7B84A6', seed: 14, snow: '#FDF6E8', light: 1 }));
  sc.add(peaks, S.hills({ base: 1130, amp: 40, top: '#8E9B74', bottom: '#66744F', seed: 9, freq: 0.005 }));

  // ------------------------------------------------------------------ Pegasus
  const pegasus = sc.horse(peg, { x: -250, y: 44, s: 0.62, wings: true, saddle: false, coat: '#F4EBD6', coatLt: '#FFFFFF', mane: '#D8C79D', seed: 3 });
  pegasus.p.gAmp = 1; pegasus.p.facing = 1; pegasus.p.shadow = 0; pegasus.p.pitch = -4;

  // ------------------------------------------------------------------ mid cloud sea
  cloudRow(midC, [[-100, 420, 2.4, 'white', 21, 1.8, 3], [700, 560, 2.6, 'warm', 22, 1.9, 2.4], [1500, 480, 2.2, 'white', 23, 1.7, 3.2], [300, 760, 2.8, 'cool', 24, 2, 2.2], [1200, 780, 2.8, 'white', 25, 2, 2.6], [1000, 200, 2.4, 'warm', 28, 1.8, 2.6], [-200, 120, 2.6, 'white', 29, 1.8, 2.2], [1700, 700, 2.4, 'cool', 30, 1.7, 2.9]]);

  // ------------------------------------------------------------------ Olympus crag, terrace, temple
  const L = [[640, 332], [604, 404], [574, 500], [512, 620], [454, 742], [366, 866], [300, 1000]];
  const R = [[1430, 332], [1458, 430], [1516, 542], [1588, 662], [1680, 784], [1770, 906], [1860, 1000]];
  const cragD = 'M' + [...L, ...R.slice().reverse()].map((p) => p.join(' ')).join(' L') + ' Z';
  const cg = S.grad([[0, '#E5D2AE'], [0.45, '#B9A084'], [1, '#6B5C6C']], { x1: 0, y1: 0, x2: 1, y2: 0.2 });
  const cfade = S.grad([[0, '#F5DFC0', 0], [0.55, '#E9E4DD', 0], [1, '#DDE2EA', 0.95]]);
  const cragId = 'cragclip';
  let strips = '';
  const rs = rng(17);
  for (let i = 0; i < 22; i++) {
    const x0 = 300 + i * 80 + rs.range(-30, 30), w0 = rs.range(40, 110);
    const lit = i % 3 !== 2;
    let d = `M${x0} 332`;
    for (let k = 1; k <= 6; k++) d += ` L${(x0 + rs.range(-26, 26) - k * rs.range(-3, 12)).toFixed(0)} ${332 + k * 110}`;
    for (let k = 6; k >= 0; k--) d += ` L${(x0 + w0 + rs.range(-20, 20) - k * rs.range(-3, 12)).toFixed(0)} ${332 + k * 110}`;
    strips += `<path d="${d} Z" fill="${lit ? '#FFF1D2' : '#3C3042'}" opacity="${lit ? rs.range(0.1, 0.2).toFixed(2) : rs.range(0.12, 0.24).toFixed(2)}"/>`;
  }
  let striae = '';
  const rr = rng(5);
  for (let i = 0; i < 26; i++) {
    const x = rr.range(520, 1700), y = rr.range(350, 880);
    striae += `M${x.toFixed(0)} ${y.toFixed(0)} l${rr.range(-20, 20).toFixed(0)} ${rr.range(40, 120).toFixed(0)} `;
  }
  sc.add(world, `<defs>${cg.def}${cfade.def}<clipPath id="${cragId}"><path d="${cragD}"/></clipPath></defs>
    <path d="${cragD}" fill="${cg.ref}"/>
    <g clip-path="url(#${cragId})">
      ${strips}
      <rect x="200" y="640" width="1800" height="420" fill="${cfade.ref}"/>
    </g>
    <rect x="610" y="326" width="840" height="22" fill="${C.ivory}" stroke="#9C8467" stroke-width="1"/>
    <rect x="610" y="344" width="840" height="10" fill="#B9A084" opacity=".8"/>`);
  sc.add(world, `<g transform="translate(1030 330)">${S.temple({ w: 900, h: 300, cols: 10, steps: 3, tone: [C.ivory, '#E4CDA2', '#9C8467'] })}</g>`);
  // Zeus's boulder
  sc.add(world, `<g transform="translate(1010 332)"><path d="M-110 0 L-92 -70 L-50 -112 L24 -120 L84 -86 L112 0 Z" fill="#B9A084" stroke="#6B5C6C" stroke-width="1.5"/><path d="M-50 -112 L24 -120 L84 -86 L40 -90 Z" fill="#E5D2AE"/><path d="M24 -120 L84 -86 L112 0 L60 0 Z" fill="#6B5C6C" opacity=".35"/><path d="M-92 -70 L-50 -112 L-40 -60 L-70 0" fill="#fff" opacity=".12"/></g>`);
  // halo behind Zeus
  const halo = sc.add(world, (() => { const g = S.rgrad([[0, '#FFF0B8', 0.9], [0.5, '#FFD27A', 0.35], [1, '#FFD27A', 0]]); return `<defs>${g.def}</defs><circle class="pulse" data-lo=".6" data-hi="1" data-sp="1.4" cx="1010" cy="90" r="280" fill="${g.ref}"/>`; })());
  gsap.set(halo, { opacity: 0 });

  // ------------------------------------------------------------------ the gods
  const FY = 332;
  const gods = [];
  const mk = (name, x, o, hold) => {
    const f = sc.fig(world, Object.assign({ x, y: FY, s: 1.22, trim: C.sandstone }, o));
    if (hold) hold(f);
    gods.push({ name, f, x });
    return f;
  };
  mk('Hestia', 704, { outfit: 'peplos', color: '#C9D3A8', hair: 'bun', hairColor: '#6B4A2B', facing: 1 }, (f) => { f.set('relaxed'); f.hold('F', 'torch', { mode: 'world', rot: 0 }); f.p.armF = 30; f.p.elbowF = 70; });
  mk('Demeter', 766, { outfit: 'peplos', color: '#E5C98F', hair: 'bun', hairColor: '#8A5A2B', wreath: true, facing: 1 }, (f) => { f.set('offer'); f.hold('F', 'laurelBranch', { mode: 'world', rot: 0 }); });
  mk('Hermes', 828, { outfit: 'chiton', color: C.blue, hat: 'petasos', hatColor: '#D9C08C', facing: 1 }, (f) => { f.set('relaxed'); f.hold('F', 'staff', { len: 130, mode: 'world', rot: 4 }); f.p.armF = 24; f.p.elbowF = 60; });
  mk('Apollo', 890, { outfit: 'chiton', color: C.ivory, trim: '#D6A94A', hair: 'curls', hairColor: '#D6A94A', wreath: true, facing: 1 }, (f) => { f.set('offer'); f.hold('F', 'lyre', { mode: 'world', rot: 8 }); });
  mk('Poseidon', 948, { outfit: 'robe', color: '#2F6A8F', beard: '#DCE6EA', cloak: C.blue, cloakType: 'drape', facing: 1 }, (f) => { f.set('relaxed'); f.hold('F', 'trident', { len: 170, mode: 'world', rot: 2 }); f.p.armF = 30; f.p.elbowF = 66; });
  mk('Hera', 1086, { outfit: 'peplos', color: '#9AA6D0', hair: 'bun', hairColor: '#4a3320', facing: -1 }, (f) => { f.set('relaxed'); f.hold('F', 'scepter', { mode: 'world', rot: 0 }); f.p.armF = 28; f.p.elbowF = 66; });
  mk('Athena', 1150, { outfit: 'chiton', color: C.ivory, trim: C.blue, helmet: true, crest: '#B24A33', cuirass: '#B9B2A4', cloak: '#6C8FB5', facing: -1 }, (f) => { f.set('guard'); f.hold('F', 'shield', { emblem: 'owl', face: C.ivory, mode: 'world' }); f.hold('B', 'spear', { len: 150, mode: 'world', rot: -2 }); f.p.armB = 52; f.p.elbowB = 60; });
  mk('Ares', 1216, { outfit: 'chiton', color: C.red, helmet: true, crest: C.red, cuirass: C.bronze, cloak: C.red, facing: -1 }, (f) => { f.set('relaxed'); f.hold('F', 'sword', { mode: 'world', rot: 6 }); f.p.armF = 40; f.p.elbowF = 82; });
  mk('Artemis', 1278, { outfit: 'chiton', color: C.olive, hair: 'bun', hairColor: '#7B4528', hem: 0.36, facing: -1 }, (f) => { f.set('relaxed'); f.hold('F', 'bow', { mode: 'world', rot: 0 }); f.p.armF = 70; f.p.elbowF = 40; });
  mk('Aphrodite', 1340, { outfit: 'peplos', color: '#E7B8A4', hair: 'long', hairColor: '#8B4A2A', facing: -1 }, (f) => { f.set('offer'); });
  mk('Hephaestus', 1400, { outfit: 'chiton', color: '#8A5A2B', trim: C.charcoal, beard: '#3a2c20', facing: -1 }, (f) => { f.set('relaxed'); f.hold('F', 'torch', { mode: 'world', rot: 0 }); f.p.armF = 30; f.p.elbowF = 70; });
  const zeus = sc.fig(world, { x: 1010, y: 214, s: 2.1, outfit: 'robe', color: C.ivory, beard: '#EFE7D6', cloak: '#B24A33', cloakType: 'drape', trim: '#D6A94A', hair: 'curls', hairColor: '#E9E0CC', facing: 1 });
  zeus.set('stand'); zeus.hold('F', 'bolt', { mode: 'world', rot: 0 });
  zeus.p.armF = 150; zeus.p.elbowF = 24; zeus.p.lean = -4;
  const zeusBolt = zeus.holdEl.F;

  // god halos & entrance
  gods.forEach((g, i) => {
    g.f.p.opacity = 0; g.f.p.y = FY - 40;
    const at = 9.2 + i * 0.4;
    tl.to(g.f.p, { opacity: 1, duration: 0.5, ease: 'power1.out' }, at);
    tl.to(g.f.p, { y: FY, duration: 0.8, ease: 'back.out(1.6)' }, at);
  });

  // Prometheus (summit first, then the earth)

  // ------------------------------------------------------------------ cloud bank hides the crag base
  const bankClouds = [];
  for (let i = 0; i < 14; i++) bankClouds.push([-500 + i * 180 + (i % 2) * 40, 990 + (i % 3) * 16, 2.5 + (i % 4) * 0.25, i % 3 === 0 ? 'white' : 'cool', 40 + i, 1.7]);
  bankClouds.forEach(([x, y, s, tone, seed, w]) => sc.add(bank, S.cloud({ x, y, s, tone, seed, w, op: 1 })));

  // ------------------------------------------------------------------ earth
  sc.add(earth, S.hills({ base: 1180, amp: 46, top: '#7C8A63', bottom: '#5C6A45', seed: 31, freq: 0.0045, x0: -900, x1: 2600 }));
  sc.add(earth, S.hills({ base: 1214, amp: 26, top: '#6F7E52', bottom: '#4F5E3C', seed: 33, freq: 0.007, x0: -900, x1: 2600 }));
  const eg = S.grad([[0, '#8A9A5E'], [1, '#55663A']]);
  sc.add(earth, `<defs>${eg.def}</defs>
    <path d="M-900 1250 C-500 1180 -200 1200 100 1224 C500 1250 900 1236 1300 1220 C1700 1206 2200 1230 2600 1250 L2600 1700 L-900 1700 Z" fill="${eg.ref}"/>`);
  sc.add(earth, `<g transform="translate(1420 1240)">${S.village({ n: 7, seed: 17, scale: 1.1, haze: { color: '#D9CBB0', amt: 0.12 }, w: 360, rows: 2 })}</g>`);
  sc.add(earth, S.olive(1260, 1244, 1.5, { leaf: '#6F7D4C' }));
  sc.add(earth, S.cypress(1700, 1244, 140, '#3E4D2C'));
  sc.add(earth, S.grass(-400, 1250, 2200, '#7B8A52', 14, 0.1));
  // hearth ring + fire (lit later)
  sc.add(earth, `<g transform="translate(830 1250)">${[-30, -14, 4, 20, 34].map((x, i) => `<ellipse cx="${x}" cy="${[0, 4, 6, 4, 0][i]}" rx="${9 + (i % 2) * 2}" ry="7" fill="${['#8F8575', '#A29684', '#7C7264', '#9A8F7C', '#8A7F70'][i]}" stroke="#4e463c" stroke-width="1"/>`).join('')}
    <path d="M-20 -4 L18 -12 M-18 -12 L20 -3" stroke="#4B3A2A" stroke-width="5" stroke-linecap="round"/></g>`);
  const hearth = sc.add(earth, S.fire({ x: 830, y: 1244, s: 1.9 }));
  const hearthGlow = sc.add(earth, (() => { const g = S.rgrad([[0, '#FFD27A', 0.85], [1, '#FFB04A', 0]]); return `<defs>${g.def}</defs><circle class="pulse" data-lo=".7" data-hi="1" data-sp="9" cx="830" cy="1230" r="230" fill="${g.ref}"/>`; })());
  gsap.set([hearth, hearthGlow], { opacity: 0 });

  // villagers watching the sky
  const v1 = sc.fig(earth, { x: 470, y: 1252, s: 1.6, outfit: 'chiton', color: '#D8C9A3', trim: C.terracotta, beard: '#9A8F7C', cloak: C.olive, cloakType: 'drape' });
  v1.set('relaxed'); v1.hold('B', 'staff', { len: 150, mode: 'world', rot: -2 }); v1.p.armB = 8; v1.p.elbowB = 72;
  const v2 = sc.fig(earth, { x: 575, y: 1252, s: 1.55, outfit: 'peplos', color: '#C9A78A', hair: 'bun', hairColor: '#4a3320', trim: C.red });
  const v3 = sc.fig(earth, { x: 640, y: 1254, s: 1.0, outfit: 'chiton', color: C.parchment, trim: C.terracotta });
  const v4 = sc.fig(earth, { x: 720, y: 1252, s: 1.6, outfit: 'chiton', color: C.blue, trim: C.sandstone, facing: -1 });
  [v1, v2, v3, v4].forEach((v, i) => { v.p.head = -16; v.p.look = 1; });
  v1.p.facing = 1; v2.p.facing = 1; v3.p.facing = 1;
  sc.tick((t) => { v3.p.armF = 70 + Math.sin(t * 1.4) * 4; });

  // Prometheus is drawn after the hills, cloud bank and villagers so his legs and torch are never buried
  const prom = sc.fig(earth, { x: 676, y: FY, s: 1.5, outfit: 'chiton', color: '#C77B4B', trim: C.sandstone, beard: '#2b211a', facing: 1 });
  prom.set('relaxed'); prom.hold('F', 'torch', { mode: 'world', rot: 0 }); prom.p.armF = 40; prom.p.elbowF = 70; prom.p.opacity = 0;

  // ------------------------------------------------------------------ near clouds (the rush as we rise)
  const nearList = [[-300, 900, 3.4, 'cool', 61, 1.8], [1100, 820, 3.6, 'storm', 62, 1.8], [1900, 700, 3.4, 'cool', 63, 1.6], [200, 560, 3.2, 'cool', 64, 1.6], [1300, 420, 3.4, 'white', 65, 1.7], [-100, 240, 3.6, 'white', 66, 1.8], [900, 80, 3.6, 'white', 67, 1.8], [1700, -120, 3.2, 'white', 68, 1.6], [100, -300, 3.4, 'warm', 69, 1.7], [600, 1000, 3.2, 'storm', 70, 1.6]];
  nearList.forEach(([x, y, s, tone, seed, w]) => sc.add(nearC, S.cloud({ x, y, s, tone, seed, w, op: 0.92 })));

  // ------------------------------------------------------------------ lightning
  const distBolt = boltFx(peaks.g, zig(900, 300, 780, 780, 7, 40, 3), { w: 6 });
  const zBolt = boltFx(world.g, zig(1040, 70, 520, 1240, 12, 70, 8), { w: 9 });
  const zBolt2 = boltFx(world.g, zig(1060, 80, 1600, 900, 9, 60, 12), { w: 7 });

  // ------------------------------------------------------------------ light, particles
  const shaft1 = sc.add(earth, S.lightShaft({ x: 560, y: 600, w: 220, h: 700, tilt: -14, op: 0.28, color: '#FFE2A8' }));
  const shaft2 = sc.add(earth, S.lightShaft({ x: 940, y: 640, w: 150, h: 660, tilt: -14, op: 0.2, color: '#FFE2A8' }));
  gsap.set([shaft1, shaft2], { opacity: 0 });
  sc.particle('motes', { n: 40, color: ['#FFF0C8', '#FFE2A0'], op: 0.5, size: 2.2, vx: 0.003, vy: -0.004 });
  sc.particle('embers', { n: 0 });
  const tint = sc.tint('#1a2250');

  // ================================================================== STORY
  cam.x = 800; cam.y = 940; cam.z = 1.04;
  sc.pan(0, 4.6, { z: 1.0, y: 930 }, 'sine.inOut');
  sc.pan(4.6, 6, { y: 296, x: 800 }, 'power3.inOut');
  sc.pan(10.6, 9, { x: 930, z: 1.07 }, 'sine.inOut');
  sc.pan(19.4, 3.6, { y: 930, x: 800, z: 1.0 }, 'power3.inOut');
  sc.pan(23, 8, { z: 1.14, y: 920 }, 'sine.inOut');
  sc.pan(31, 3, { z: 1.0, y: 880 }, 'sine.inOut');

  // the rush of near clouds belongs to the climb and the descent; they must not bury the summit
  gsap.set(nearC.g, { opacity: 1 });
  tl.to(nearC.g, { opacity: 0, duration: 1.4, ease: 'sine.inOut' }, 9.0);
  tl.to(nearC.g, { opacity: 1, duration: 0.8, ease: 'sine.inOut' }, 19.2);

  // storm light: gloom on earth, golden at the summit
  gsap.set(tint, { opacity: 0.55 });
  tl.to(tint, { opacity: 0.0, duration: 4.8, ease: 'power2.inOut' }, 6);
  tl.to(tint, { opacity: 0.3, duration: 2.6, ease: 'power1.inOut' }, 19.6);
  tl.to(tint, { opacity: 0.0, duration: 4, ease: 'power1.inOut' }, 27);
  tl.to([shaft1, shaft2], { opacity: 1, duration: 3, ease: 'power1.inOut' }, 27.5);

  // distant thunder on the earth
  strike(tl, distBolt, 2.6);
  sc.flash(tl, 2.6, 0.55);
  sc.flash(tl, 3.9, 0.35);
  v1.go(tl, 2.2, 1.2, { head: -22, lean: -3 });
  v4.go(tl, 3.2, 1.2, { armF: 140, elbowF: 20 });
  tl.to(v4.p, { armF: 10, elbowF: 20, duration: 1.2 }, 7);

  // Zeus raises the bolt, hurls it; thunder
  tl.to(halo, { opacity: 1, duration: 2, ease: 'power1.out' }, 10.4);
  zeus.go(tl, 11.2, 1.2, { armF: 165, elbowF: 8, lean: -8, head: -6 });
  zeus.go(tl, 12.4, 0.35, { armF: 30, elbowF: 40, lean: 12, head: 4 }, 'power3.in');
  tl.to(zeusBolt, { opacity: 0, duration: 0.1 }, 12.45);
  strike(tl, zBolt, 12.5);
  sc.flash(tl, 12.5, 0.9);
  sc.shake(12.5, 12, 0.7);
  sc.cue('thunder', 12.5);
  strike(tl, zBolt2, 13.4);
  sc.flash(tl, 13.4, 0.5);
  tl.to(zeusBolt, { opacity: 1, duration: 0.6 }, 14.2);
  zeus.go(tl, 14.0, 1.6, { armF: 20, elbowF: 22, lean: 0, head: 0 });
  sc.cue('chime', 9.2);

  // gods look at one another, Athena raises her spear arm
  gods.forEach((g, i) => { tl.to(g.f.p, { head: (i % 2 ? 5 : -5), duration: 1.2, ease: 'sine.inOut' }, 12 + i * 0.1); });

  // Pegasus crosses the sky
  tl.fromTo(pegasus.p, { x: -250 }, { x: 1950, duration: 4.2, ease: 'power1.inOut' }, 15.2);
  tl.to(pegasus.p, { y: -26, duration: 2.1, ease: 'sine.out' }, 15.2); // rises over the roof ...
  tl.to(pegasus.p, { y: 52, duration: 2.1, ease: 'sine.in' }, 17.3);   // ... and settles toward the far cloud
  tl.fromTo(pegasus.p, { pitch: -6 }, { pitch: 8, duration: 4.2, ease: 'sine.inOut' }, 15.2);
  sc.cue('whinny', 16.2);

  // Prometheus: torch at the summit edge, then vanishes into light
  tl.to(prom.p, { opacity: 1, duration: 0.6 }, 16.4);
  prom.walk(tl, 16.6, 640, 2.2, { ease: 'sine.inOut', face: false });
  tl.set(prom.p, { facing: -1 }, 16.6);
  prom.go(tl, 19.0, 0.6, { armF: 150, elbowF: 20 });
  tl.to(prom.p, { opacity: 0, duration: 0.7, ease: 'power2.in' }, 19.5);
  // emerges on earth
  tl.set(prom.p, { x: 220, y: 1252, facing: 1, walkAmp: 0, armF: 40, elbowF: 70 }, 21.5);
  prom._wx = 220; prom._wy = 1252;
  tl.to(prom.p, { opacity: 1, duration: 0.8 }, 22);
  prom.walk(tl, 22.1, 790, 4.4, { ease: 'sine.inOut', face: false, y: 1252 });
  prom.go(tl, 26.4, 0.7, { armF: 60, elbowF: 40, lean: 16 });
  tl.to(hearth, { opacity: 1, duration: 0.5, ease: 'back.out(3)' }, 27.0);
  tl.to(hearthGlow, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 27.0);
  sc.cue('fire', 27.0);
  // villagers react
  [v1, v2, v4].forEach((v, i) => {
    v.go(tl, 27.2 + i * 0.15, 0.8, { head: 0, armF: 150, elbowF: 28, armB: 140, elbowB: 30 }, 'back.out(2)');
    tl.to(v.p, { armF: 40, armB: 20, elbowF: 40, elbowB: 40, head: -14, duration: 1.4, ease: 'sine.inOut' }, 30.2 + i * 0.1);
  });
  v2.go(tl, 27.3, 0.7, { armF: 150, elbowF: 28, armB: 140, elbowB: 30 });
  tl.to(prom.p, { armF: 8, elbowF: 24, lean: 0, duration: 1.2 }, 28.5);
  tl.to(prom.p, { head: -14, look: 1, duration: 1.2 }, 30.2);
}
