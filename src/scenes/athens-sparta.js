// Chapter 4 — Athens and Sparta: one screen, two worlds, a divider that opens like a curtain.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng } from '../art/util.js';
import { citadel } from './intro.js';

const GY = 600; // horizon

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const clipA = sc.clipbox('inset(0 50% 0 50%)');
  const clipS = sc.clipbox('inset(0 50% 0 50%)');
  const L = (host, n, d) => sc.layer(n, d, { host });

  // =================================================================== ATHENS
  const aSky = L(clipA, 'a-sky', 0.03), aFar = L(clipA, 'a-far', 0.1), aAcro = L(clipA, 'a-acro', 0.2), aMid = L(clipA, 'a-mid', 0.5), aFig = L(clipA, 'a-fig', 1.0);
  sc.add(aSky, S.daySky());
  sc.add(aSky, S.sun({ x: 260, y: 130, r: 46, glowR: 480, glow: '#FFE2A8', op: 0.75 }));
  sc.add(aSky, S.driftCloud({ x: 700, y: 120, s: 1.3, tone: 'white', seed: 51, w: 1.3, vx: 3, op: 0.95 }));
  sc.add(aSky, S.driftCloud({ x: 1250, y: 200, s: 1.1, tone: 'warm', seed: 53, w: 1.1, vx: 3.6, op: 0.9 }));
  sc.add(aFar, S.mountains({ base: 600, amp: 130, lit: '#D0C2B8', shade: '#8E96B2', seed: 61 }));
  sc.add(aFar, `<rect x="-1400" y="606" width="4400" height="40" fill="#9DB6CC" opacity=".6"/>`);
  sc.add(aAcro, `<g transform="translate(300 ${GY + 14})">${citadel({ w: 640, h: 270, seed: 4 })}</g>`);
  sc.add(aAcro, `<g transform="translate(300 ${GY + 14 - 270 - 8})">${S.temple({ w: 430, h: 140, steps: 3, tone: [C.ivory, '#DDC49A', '#9C8467'] })}</g>`);
  sc.add(aMid, S.hills({ base: 640, amp: 14, top: '#A9B278', bottom: '#8A9A62', seed: 8, freq: 0.01 }));
  sc.add(aMid, `<g transform="translate(1180 ${GY + 112})">${S.stoa({ w: 560, h: 150, cols: 9 })}</g>`);
  for (const [x, y, s] of [[660, 650, 0.8], [780, 640, 0.6], [880, 660, 0.9], [1520, 650, 0.8]]) sc.add(aMid, S.olive(x, y, s, { leaf: '#7C8A55' }));
  const ag = S.grad([[0, '#DCC9A5'], [1, '#B79C76']]);
  sc.add(aFig, `<defs>${ag.def}</defs><path d="M-1200 ${GY + 70} L2800 ${GY + 70} L2800 1400 L-1200 1400 Z" fill="${ag.ref}"/>`);
  sc.add(aFig, `<path d="M-1200 ${GY + 70} H2800" stroke="#fff" stroke-width="3" opacity=".4"/>`);
  let pav = '';
  for (let i = 0; i < 9; i++) pav += `<path d="M-1200 ${GY + 90 + i * i * 3 + i * 14} H2800" stroke="#fff" stroke-width="${1 + i * 0.14}" opacity="${0.1 + i * 0.012}"/>`;
  sc.add(aFig, pav);

  // teacher & students
  sc.add(aFig, `<g transform="translate(380 752)"><rect x="-62" y="-52" width="124" height="52" fill="#E9DDC0" stroke="#9C8467" stroke-width="1.2"/><rect x="-70" y="-60" width="140" height="10" fill="${C.ivory}" stroke="#9C8467" stroke-width="1.2"/></g>`);
  const teacher = sc.fig(aFig, { x: 380, y: 752, s: 1.75, outfit: 'robe', color: C.ivory, beard: '#E5DCC6', cloak: C.blue, cloakType: 'drape', trim: C.sandstone, facing: 1 });
  teacher.set('sit'); teacher.p.armF = 70; teacher.p.elbowF = 60; teacher.hold('B', 'scrollOpen', { rot: 0 }); teacher.p.armB = 40; teacher.p.elbowB = 92;
  const stoneAt = (x, y, s) => sc.add(aFig, S.rock(x, y, s, '#CBBFA6'));
  const studs = [];
  [[225, 778, 1], [545, 782, -1], [622, 776, -1], [150, 784, 1]].forEach(([x, y, f], i) => {
    stoneAt(x + f * -6, y, 1.15);
    const st = sc.fig(aFig, { x, y, s: 1.4, outfit: 'chiton', color: ['#D8C9A3', C.terracotta, '#C9D0A8', C.blue][i], trim: C.sandstone, facing: f, hair: i % 2 ? 'curls' : null, hairColor: '#5b3a24' });
    st.set('sit'); st.p.armF = 55; st.p.elbowF = 90; st.p.armB = 40; st.p.elbowB = 96; st.p.lean = 8; st.p.head = 10;
    if (i % 2 === 0) st.hold('F', 'tablet', { rot: 0 }); else st.hold('F', 'scroll', { rot: 0 });
    studs.push(st);
  });
  // sculptor
  const bustEl = sc.add(aFig, S.bust(1060, 740, 1.4));
  const sculptor = sc.fig(aFig, { x: 985, y: 744, s: 1.7, outfit: 'chiton', color: '#D8B88A', trim: C.terracotta, facing: 1 });
  sculptor.set({ armF: 96, elbowF: 30, armB: 70, elbowB: 40, lean: 6 }); sculptor.hold('F', 'mallet', { mode: 'world', rot: 0 }); sculptor.hold('B', 'chisel', { mode: 'world', rot: -20 });
  sc.tick((t) => { sculptor.p.armF = 100 + Math.max(0, Math.sin(t * 5.2)) * 44; sculptor.p.elbowF = 40 + Math.max(0, Math.sin(t * 5.2)) * 40; });
  // voters
  sc.add(aFig, `<g transform="translate(1390 744)"><rect x="-26" y="-56" width="52" height="56" fill="#CDB38A" stroke="#9C8467" stroke-width="1.2"/><path d="M-14 -56 C-24 -72 -22 -92 -10 -98 L10 -98 C22 -92 24 -72 14 -56 Z" fill="${C.terracotta}" stroke="${darken(C.terracotta, .4)}" stroke-width="1.2"/><ellipse cx="0" cy="-98" rx="10" ry="3.5" fill="${darken(C.terracotta, .4)}"/></g>`);
  const voters = [0, 1, 2, 3].map((i) => sc.fig(aFig, { x: 1180 - i * 74, y: 742 + (i % 2) * 8, s: 1.45, outfit: 'chiton', color: [C.ivory, '#D8C9A3', C.parchment, '#C6D0DD'][i], cloak: i % 2 ? C.olive : C.blue, cloakType: 'drape', trim: C.sandstone, facing: 1 }));
  voters.forEach((v) => v.set('relaxed'));
  // label
  const lblA = sc.add(aFig, `<g class="lbl" opacity="0">${S.laurel({ x: 96, y: 150, s: 0.56, flip: 1, c: C.olive })}${S.laurel({ x: 504, y: 150, s: 0.56, flip: -1, c: C.olive })}
    <text x="300" y="112" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="48" letter-spacing="9" fill="${C.blue}" stroke="${C.ivory}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">ATHENS</text></g>`);

  // =================================================================== SPARTA
  const sSky = L(clipS, 's-sky', 0.03), sFar = L(clipS, 's-far', 0.1), sMid = L(clipS, 's-mid', 0.5), sFig = L(clipS, 's-fig', 1.0);
  sc.add(sSky, S.sky([[0, '#2E1626'], [0.3, '#7C2B30'], [0.55, '#C15A3B'], [0.76, '#E89A5E'], [0.9, '#F3C184'], [1, '#F3C98E']], { y0: -300, h: 960 }));
  sc.add(sSky, S.sun({ x: 1330, y: 560, r: 74, glowR: 620, glow: '#FFB067', core: '#FFF0C8', op: 0.95 }));
  sc.add(sSky, S.rays({ x: 1330, y: 560, n: 11, spread: 120, dir: -90, len: 1100, op: 0.14, color: '#FFC88A' }));
  sc.add(sSky, S.driftCloud({ x: 1000, y: 150, s: 1.4, tone: 'dusk', seed: 71, w: 1.4, vx: 3.2, op: 0.85 }));
  sc.add(sSky, S.driftCloud({ x: 1500, y: 260, s: 1.0, tone: 'dusk', seed: 73, w: 1.0, vx: 2.6, op: 0.8 }));
  sc.add(sFar, S.mountains({ base: 604, amp: 190, lit: '#8E4A4A', shade: '#321C2C', seed: 81, light: -1, snow: null }));
  sc.add(sFar, S.hills({ base: 612, amp: 16, top: '#5A2F37', bottom: '#43242E', seed: 12, freq: 0.01 }));
  // barracks
  let barr = '';
  for (const [x, w, h] of [[850, 140, 54], [1010, 120, 64], [1150, 130, 50]]) barr += `<g transform="translate(${x} ${GY + 22})"><rect width="${w}" height="${h}" y="${-h}" x="0" fill="#9A5A45" stroke="#4E2A24" stroke-width="1.4"/><rect x="-4" y="${-h - 6}" width="${w + 8}" height="8" fill="#B26E54" stroke="#4E2A24" stroke-width="1"/><rect x="${w * 0.4}" y="${-h * 0.55}" width="${w * 0.2}" height="${h * 0.55}" fill="#2B1A1C"/></g>`;
  sc.add(sMid, barr);
  sc.add(sMid, S.rock(930, GY + 40, 1.4, '#7B4A3C')); sc.add(sMid, S.rock(1300, GY + 36, 1.8, '#6D4034'));
  sc.add(sMid, S.cypress(780, GY + 22, 80, '#3C3D26'));
  const sg = S.grad([[0, '#C98B5C'], [1, '#7C4B38']]);
  sc.add(sFig, `<defs>${sg.def}</defs><path d="M-1200 ${GY + 70} L2800 ${GY + 70} L2800 1400 L-1200 1400 Z" fill="${sg.ref}"/>`);
  sc.add(sFig, S.grass(500, GY + 76, 1100, '#8F6B3C', 5, 0.05));
  sc.add(sSky, S.smoke({ x: 960, y: GY - 40, s: 1, n: 6, c: '#4a3030' }));

  // phalanx
  const phalanx = [];
  const cols = [1205, 1285, 1365, 1445];
  [[690, 1.38], [722, 1.5], [756, 1.62]].forEach(([y, s], r) => {
    cols.forEach((x, c) => {
      const f = sc.fig(sFig, { x: x + (r % 2) * 18, y, s, outfit: 'chiton', color: '#B9402F', trim: C.ivory, helmet: true, crest: C.red, cuirass: null, cloak: C.red, cloakType: 'back', facing: -1, idle: 1 });
      f.set('guard'); f.hold('F', 'shield', { emblem: 'lambda', face: C.bronze, mode: 'world' }); f.hold('B', 'spear', { len: 170, mode: 'world', rot: 4 });
      f.p.armB = 70; f.p.elbowB = 50; f.p.lean = 3; f.p.cape = 0.15;
      phalanx.push(f);
    });
  });
  const officer = sc.fig(sFig, { x: 975, y: 748, s: 1.78, outfit: 'chiton', color: '#8E2E27', trim: C.ivory, helmet: true, crest: '#D9C08C', cloak: C.red, cloakType: 'back', facing: -1 });
  officer.set('stand'); officer.hold('B', 'staff', { len: 150, mode: 'world', rot: 0 }); officer.p.armB = 30; officer.p.elbowB = 60;
  // boys of the agoge
  const boys = [];
  [[520, 744, 1], [590, 750, -1], [690, 742, 1], [760, 750, -1]].forEach(([x, y, f], i) => {
    const b = sc.fig(sFig, { x, y, s: 1.2, outfit: 'chiton', color: '#A5503A', trim: C.sandstone, facing: f, hem: 0.4 });
    b.set('guard'); b.hold('F', 'staff', { len: 78, mode: 'world', rot: -30 }); b.p.armF = 70; b.p.elbowF = 60;
    boys.push(b);
  });
  sc.tick((t) => {
    boys.forEach((b, i) => { const k = Math.sin(t * 3.4 + (i % 2) * Math.PI); b.p.armF = 80 + k * 34; b.p.elbowF = 50 + k * 26; b.p.lean = 6 + k * 6; });
    officer.p.armF = 70 + Math.sin(t * 1.3) * 26; officer.p.elbowF = 50;
  });
  sc.add(sFig, S.fire({ x: 1130, y: GY + 96, s: 0.9 }));
  sc.add(sFig, `<g transform="translate(1560 ${GY + 120})"><line x1="0" y1="0" x2="0" y2="-190" stroke="#4B3A2A" stroke-width="4"/><path d="M0 -188 L62 -182 L56 -138 L62 -94 L0 -100 Z" fill="${C.red}" stroke="${darken(C.red, .4)}" stroke-width="1"/><path d="M18 -112 L31 -160 L44 -112 M22 -126 H40" fill="none" stroke="${C.ivory}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></g>`);
  const lblS = sc.add(sFig, `<g class="lbl" opacity="0">
    <text x="1318" y="112" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="48" letter-spacing="9" fill="${C.ivory}" stroke="${C.red}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">SPARTA</text>
    <path d="M1090 126 L1118 66 L1146 126" fill="none" stroke="${C.ivory}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M1090 126 L1118 66 L1146 126" fill="none" stroke="${C.red}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".0"/></g>`);

  // runners meeting at the divider (end)
  const runA = sc.fig(aFig, { x: -90, y: 812, s: 1.6, outfit: 'chiton', color: C.blue, trim: C.ivory, wreath: true, facing: 1 });
  runA.hold('B', 'laurelBranch', { mode: 'world', rot: 0 });
  const runS = sc.fig(sFig, { x: 1700, y: 812, s: 1.6, outfit: 'chiton', color: C.red, trim: C.ivory, helmet: false, wreath: true, facing: -1 });
  runS.hold('B', 'laurelBranch', { mode: 'world', rot: 0 });

  // divider (screen-fixed) + medallion
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:6px;margin-left:-3px;background:linear-gradient(to bottom,#F8EBCB,#E7C78F 60%,#F8EBCB);box-shadow:0 0 22px rgba(255,226,160,.8),0 0 2px rgba(255,255,255,.9);opacity:0';
  const med = document.createElement('div');
  med.style.cssText = 'position:absolute;left:50%;top:32%;width:78px;height:78px;margin:-39px 0 0 -39px;border-radius:50%;background:#F2E9D4;border:2px solid #8A5A2B;display:grid;place-items:center;opacity:0;box-shadow:0 8px 24px rgba(0,0,0,.35)';
  med.innerHTML = `<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="#5E6A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21C9 15 14 10 21 3"/><path d="M10 15c-2-1-4-1-5-3 2-1 4 0 5 3zM14.5 10.5c-2-2-2-4-2-6 2 1 3.5 3 2 6zM17.5 7c0-2 1.5-3.5 3.5-4"/></svg>`;
  div.appendChild(med);
  sc.tick(() => {
    const px = Math.round(Math.max(40, Math.min(78, 95 * sc.unit)));
    if (med._px !== px) {
      med._px = px; med.style.width = med.style.height = px + 'px'; med.style.margin = `${-px / 2}px 0 0 ${-px / 2}px`;
      const g = med.firstElementChild; g.setAttribute('width', px * 0.59); g.setAttribute('height', px * 0.59);
    }
  });
  sc.root.appendChild(div);
  const tint = sc.tint('#1c2550');
  sc.particle('motes', { n: 30, color: ['#FFF0C8', '#FFD9A0'], op: 0.4, size: 2, vx: 0.004, vy: -0.002 });
  sc.particle('embers', { n: 14, color: ['#FFB067', '#FF8A4A'], op: 0.6, size: 2, vy: 0.03 });

  // ================================================================== STORY
  cam.z = 1.0;
  sc.pan(0, 26, { z: 1.045 }, 'sine.inOut');
  sc.pan(26, 10, { z: 1.0 }, 'sine.inOut');
  const win = (at, dur, d, ease = 'power3.inOut') => {
    tl.to(clipA, { clipPath: `inset(0 ${100 - d}% 0 0)`, webkitClipPath: `inset(0 ${100 - d}% 0 0)`, duration: dur, ease }, at);
    tl.to(clipS, { clipPath: `inset(0 0 0 ${d}%)`, webkitClipPath: `inset(0 0 0 ${d}%)`, duration: dur, ease }, at);
    tl.to(div, { left: `${d}%`, duration: dur, ease }, at);
  };
  tl.to(div, { opacity: 1, duration: 0.8 }, 0.2);
  tl.fromTo(clipA, { clipPath: 'inset(0 50% 0 50%)', webkitClipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 50% 0 0%)', webkitClipPath: 'inset(0 50% 0 0%)', duration: 2.4, ease: 'power3.out' }, 0.4);
  tl.fromTo(clipS, { clipPath: 'inset(0 50% 0 50%)', webkitClipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 50%)', webkitClipPath: 'inset(0 0% 0 50%)', duration: 2.4, ease: 'power3.out' }, 0.4);
  tl.to([lblA, lblS], { opacity: 1, duration: 1.2, ease: 'power2.out' }, 2.4);
  win(8.0, 2.0, 92);
  win(16.6, 2.2, 20);
  win(25.4, 2.4, 50);

  // Athens beats
  teacher.go(tl, 8.6, 1.0, { armF: 100, elbowF: 40, lean: 4 });
  tl.to(teacher.p, { armF: 70, elbowF: 70, duration: 1.2, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 10);
  studs[1].go(tl, 12.5, 0.8, { armF: 160, elbowF: 10 });
  studs[1].go(tl, 15.2, 0.8, { armF: 55, elbowF: 90 });
  // voters file past the urn
  voters.forEach((v, i) => {
    const at = 10 + i * 1.6;
    v.walk(tl, at, 1332, 2.0, { ease: 'sine.inOut' });
    v.go(tl, at + 2.05, 0.4, { armF: 118, elbowF: 40 });
    v.go(tl, at + 2.6, 0.4, { armF: 8, elbowF: 18 });
    v.walk(tl, at + 3.0, 1480, 1.6, { ease: 'sine.in' });
  });
  // Sparta beats: drill — the whole phalanx thrusts in unison
  [19.0, 21.0, 23.0].forEach((t0) => {
    phalanx.forEach((f, i) => {
      f.go(tl, t0 + (i % 4) * 0.03, 0.18, { armB: 92, elbowB: 12, lean: 14 }, 'power3.out');
      f.go(tl, t0 + 0.55, 0.45, { armB: 70, elbowB: 50, lean: 3 }, 'sine.inOut');
      tl.to(f.p, { holdB: -38, duration: 0.2, ease: 'power3.out' }, t0 + (i % 4) * 0.03);   // spear levelled forward
      tl.to(f.p, { holdB: 4, duration: 0.5, ease: 'sine.inOut' }, t0 + 0.6);
    });
    sc.shake(t0, 3, 0.25);
    sc.cue('thump', t0);
  });
  officer.go(tl, 17.4, 0.8, { head: -4 });
  tl.set(officer.p, { facing: 1 }, 17.2);

  // the meeting at the games
  // the runners come in from outside the frame, in front of the crowds, and rise to the meeting line
  runA.walk(tl, 27.3, 748, 4.2, { y: 738, run: 0.6, ease: 'sine.out', face: false });
  runS.walk(tl, 27.3, 852, 4.2, { y: 738, run: 0.6, ease: 'sine.out', face: false });
  runA.go(tl, 31.7, 0.8, { armB: 168, elbowB: 8 });
  runS.go(tl, 31.7, 0.8, { armB: 168, elbowB: 8 });
  tl.to(med, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(2.2)' }, 32.0);
  gsap.set(med, { scale: 0.4 });
  tl.to(div, { boxShadow: '0 0 38px rgba(255,226,160,1), 0 0 3px rgba(255,255,255,1)', duration: 1.2 }, 32.0);
  sc.cue('chime', 32.0);
}
