// Chapter 6 — Philosophy and Drama: the grove of questions, then the theatre.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng } from '../art/util.js';
import { citadel } from './intro.js';

const GY = 740;

const bubble = (x, y, text, w = 250) => `<g class="bubble" transform="translate(${x} ${y})" opacity="0"><path d="M0 0 H${w} A12 12 0 0 1 ${w + 12} 12 V52 A12 12 0 0 1 ${w} 64 H44 L26 84 L26 64 H0 A12 12 0 0 1 -12 52 V12 A12 12 0 0 1 0 0 Z" fill="${C.ivory}" stroke="${C.bronze}" stroke-width="2"/>
  <text x="${w / 2}" y="42" text-anchor="middle" font-family="'EB Garamond', serif" font-style="italic" font-size="29" fill="${C.blue}">${text}</text></g>`;
const nameTag = (x, y, text) => `<g class="ntag" transform="translate(${x} ${y})" opacity="0"><text text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="22" letter-spacing="5" fill="${C.ivory}" stroke="rgba(30,20,10,.6)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${text}</text><path d="M-26 10 h52" stroke="${C.terracotta}" stroke-width="3"/></g>`;

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const sky = sc.layer('sky', 0.03), far = sc.layer('far', 0.1), acro = sc.layer('acro', 0.3), mid = sc.layer('mid', 0.55), ppl = sc.layer('people', 1.0), fg = sc.layer('fg', 1.3), ui = sc.layer('ui', 0);
  const P = (L, sx, camX) => sc.px(L, camX, sx);

  // ------------------------------------------------------------------ sky & distance
  sc.add(sky, S.daySky());
  sc.add(sky, S.sun({ x: 520, y: 150, r: 44, glowR: 520, glow: '#FFE2A8', op: 0.75 }));
  sc.add(sky, S.driftCloud({ x: 300, y: 130, s: 1.4, tone: 'white', seed: 201, w: 1.4, vx: 2.4, op: 0.95 }));
  sc.add(sky, S.driftCloud({ x: 1200, y: 200, s: 1.1, tone: 'warm', seed: 203, w: 1.2, vx: 3, op: 0.9 }));
  sc.add(sky, S.driftCloud({ x: 1900, y: 110, s: 1.5, tone: 'white', seed: 205, w: 1.5, vx: 2.2, op: 0.95 }));
  sc.add(far, S.mountains({ base: 640, amp: 140, lit: '#D0C2B8', shade: '#8E96B2', seed: 211 }));
  sc.add(far, S.hills({ base: 650, amp: 14, top: '#AEB4A0', bottom: '#9AA68A', seed: 12, freq: 0.006 }));
  // Acropolis, visible behind the theatre (stop B) and arriving into view while panning
  const AX = P(acro, 800, 2500);
  sc.add(acro, `<g transform="translate(${AX} 700)">${citadel({ w: 900, h: 330, seed: 12 })}</g>`);
  sc.add(acro, `<g transform="translate(${AX} ${700 - 330 - 8})">${S.temple({ w: 520, h: 150, steps: 3, tone: [C.ivory, '#DDC49A', '#9C8467'] })}</g>`);
  // gymnasium porch for the grove
  sc.add(mid, S.hills({ base: 676, amp: 12, top: '#A6B27A', bottom: '#8A9A62', seed: 9, freq: 0.01, x0: -1500, x1: 4200 }));
  sc.add(mid, `<g transform="translate(${P(mid, 1180, 1000)} 760)">${S.stoa({ w: 820, h: 170, cols: 12 })}</g>`);
  for (const sx of [180, 520, 860, 1500]) sc.add(mid, S.olive(P(mid, sx, 900), 748, 1.0 + (sx % 3) * 0.1, { leaf: '#7A8C55' }));

  // ------------------------------------------------------------------ ground (one long plane)
  const gg = S.grad([[0, '#D9C9A4'], [0.3, '#CBB68C'], [1, '#A68C66']]);
  sc.add(ppl, `<defs>${gg.def}</defs><path d="M-1500 ${GY - 8} L4300 ${GY - 8} L4300 1400 L-1500 1400 Z" fill="${gg.ref}"/>`);
  let pav = '';
  for (let i = 0; i < 10; i++) pav += `<path d="M-1500 ${GY + 8 + i * i * 2.4 + i * 12} H4300" stroke="#fff" stroke-width="${0.8 + i * 0.12}" opacity="${0.1 + i * 0.012}"/>`;
  sc.add(ppl, pav);
  sc.add(ppl, S.grass(-300, GY + 4, 1700, '#8E9E62', 31, 0.05));

  // big shade olives in the grove
  sc.add(ppl, S.olive(180, GY + 4, 2.2, { leaf: '#7C8E56' }));
  sc.add(ppl, S.olive(1180, GY + 6, 2.6, { leaf: '#7C8E56' }));
  sc.add(ppl, S.olive(1760, GY + 6, 2.0, { leaf: '#7C8E56' }));

  // ------------------------------------------------------------------ the grove: Socrates and friends
  const stone = (x, s = 1.2) => sc.add(ppl, S.rock(x, GY + 28, s, '#CDBFA4'));
  const socrates = sc.fig(ppl, { x: 560, y: GY + 20, s: 1.95, outfit: 'robe', color: '#E8DEC4', beard: '#DAD0B8', cloak: '#8A8F7A', cloakType: 'drape', trim: C.sandstone, facing: -1 });
  socrates.set('stand'); socrates.p.armF = 78; socrates.p.elbowF = 54;
  const studentsX = [[330, 1, 1.5, true], [405, 1, 1.5, false], [760, -1, 1.5, true], [850, -1, 1.55, false]];
  const students = studentsX.map(([x, f, s, sit], i) => {
    if (sit) stone(x - f * 8, 1.15);
    const st = sc.fig(ppl, { x, y: GY + 28 + (i % 2) * 6, s, outfit: 'chiton', color: ['#D8C9A3', C.terracotta, '#C9D0A8', C.blue][i], trim: C.sandstone, facing: f, hair: i % 2 ? 'curls' : null, hairColor: '#5b3a24', cloak: i === 3 ? C.olive : null, cloakType: 'drape' });
    if (sit) { st.set('sit'); st.p.armF = 40; st.p.elbowF = 90; st.p.head = 8; } else { st.set('relaxed'); }
    return st;
  });
  students[1].set({ armF: 70, elbowF: 130, armB: 10, elbowB: 70, head: 6 }); // hand to chin
  students[3].set({ armF: 70, elbowF: 130, armB: 10, elbowB: 70, head: 4 });

  // Plato at his table
  sc.add(ppl, `<g transform="translate(1300 ${GY + 30})"><rect x="-70" y="-62" width="150" height="14" rx="3" fill="#CDB78F" stroke="#9C8467" stroke-width="1.2"/><rect x="-60" y="-48" width="14" height="48" fill="#BFA77E"/><rect x="58" y="-48" width="14" height="48" fill="#BFA77E"/></g>`);
  sc.add(ppl, S.rock(1196, GY + 30, 1.3, '#CDBFA4'));
  const plato = sc.fig(ppl, { x: 1198, y: GY + 32, s: 1.8, outfit: 'chiton', color: '#D8C9A3', cloak: C.blue, cloakType: 'drape', trim: C.sandstone, beard: '#CFC5AE', facing: 1 });
  plato.set('sit'); plato.p.armF = 62; plato.p.elbowF = 82; plato.p.armB = 30; plato.p.elbowB = 80; plato.p.head = 14; plato.p.lean = 8;
  sc.add(ppl, `<g transform="translate(1322 ${GY - 33})"><path d="M-30 0 H30 L28 -8 H-28 Z" fill="${C.parchment}" stroke="#9C8467" stroke-width="1"/><path d="M-22 -4 H20" stroke="${C.bronze}" stroke-width="1.2"/></g>`);
  sc.tick((t) => { plato.p.armF = 62 + Math.sin(t * 3) * 6; plato.p.elbowF = 82 + Math.sin(t * 3.1 + 1) * 8; });

  // Aristotle with specimens
  sc.add(ppl, `<g transform="translate(1590 ${GY + 30})"><rect x="-56" y="-70" width="112" height="12" rx="3" fill="#CDB78F" stroke="#9C8467" stroke-width="1.2"/><rect x="-46" y="-58" width="12" height="58" fill="#BFA77E"/><rect x="34" y="-58" width="12" height="58" fill="#BFA77E"/>
    <path d="M-30 -70 C-34 -88 -24 -96 -20 -108 M-30 -70 C-24 -84 -12 -90 -6 -100" stroke="${C.olive}" stroke-width="3" fill="none"/><ellipse cx="-20" cy="-110" rx="9" ry="4" fill="#8FA066" transform="rotate(-30 -20 -110)"/><ellipse cx="-4" cy="-102" rx="9" ry="4" fill="#7C8A55" transform="rotate(25 -4 -102)"/>
    <path d="M4 -70 C10 -90 28 -92 34 -78 L30 -70 Z" fill="#E4D5B6" stroke="#9C8467" stroke-width="1.2"/><circle cx="44" cy="-76" r="8" fill="${C.sandstone}" stroke="${C.bronze}" stroke-width="1.4"/></g>`);
  const aristotle = sc.fig(ppl, { x: 1680, y: GY + 34, s: 1.85, outfit: 'chiton', color: '#E8DEC4', cloak: C.terracotta, cloakType: 'drape', trim: C.sandstone, beard: '#3a2c20', hair: 'short', hairColor: '#3a2c20', facing: -1 });
  aristotle.set('stand'); aristotle.hold('B', 'tablet', { rot: 0 }); aristotle.p.armB = 50; aristotle.p.elbowB = 90; aristotle.p.armF = 80; aristotle.p.elbowF = 20;

  // speech bubbles + names (in people space)
  const b1 = sc.add(ppl, bubble(400, 400, 'τί ἐστι δικαιοσύνη;', 270));
  const b2 = sc.add(ppl, bubble(770, 360, 'τίς ὁ ἄριστος βίος;', 270));
  const n1 = sc.add(ppl, nameTag(560, 468, 'SOCRATES'));
  const n2 = sc.add(ppl, nameTag(1230, 520, 'PLATO'));
  const n3 = sc.add(ppl, nameTag(1680, 520, 'ARISTOTLE'));

  // ------------------------------------------------------------------ the theatre
  const CX = 2540, CY = 790;
  {
    let bands = '', lines = '';
    const nT = 7;
    const ring = (i) => ({ rx: 330 + i * 52, ry: 46 + i * 26, cy: CY - 6 - i * 36 });
    for (let i = nT; i >= 1; i--) {
      const o = ring(i), n = ring(i - 1);
      const col = i % 2 ? mix(C.ivory, C.sandstone, .25) : mix(C.ivory, C.sandstone, .5);
      bands += `<path d="M${CX - o.rx} ${o.cy} A${o.rx} ${o.ry} 0 0 1 ${CX + o.rx} ${o.cy} L${CX + n.rx} ${n.cy} A${n.rx} ${n.ry} 0 0 0 ${CX - n.rx} ${n.cy} Z" fill="${col}" stroke="#9C8467" stroke-width="1.2"/>`;
      bands += `<path d="M${CX - n.rx} ${n.cy} A${n.rx} ${n.ry} 0 0 1 ${CX + n.rx} ${n.cy}" fill="none" stroke="#fff" stroke-width="2" opacity=".35" transform="translate(0 -3)"/>`;
    }
    // aisles
    for (let k = -4; k <= 4; k++) {
      const a = k * 0.38 + (k === 0 ? 0 : 0);
      const o = ring(nT), n = ring(0);
      const ox = CX + Math.sin(a) * o.rx, oy = o.cy - Math.cos(a) * o.ry, nx = CX + Math.sin(a) * n.rx, ny = n.cy - Math.cos(a) * n.ry;
      lines += `<path d="M${nx.toFixed(0)} ${ny.toFixed(0)} L${ox.toFixed(0)} ${oy.toFixed(0)}" stroke="#7B654A" stroke-width="2.2" opacity=".55"/>`;
    }
    sc.add(ppl, `<g>${bands}${lines}</g>`);
    sc.add(ppl, `<ellipse cx="${CX}" cy="${CY + 22}" rx="352" ry="64" fill="#D8BE8E" stroke="#9C8467" stroke-width="1.5"/><ellipse cx="${CX}" cy="${CY + 22}" rx="330" ry="56" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>`);
    // spectators
    const rs = rng(77);
    let specs = '';
    const cols = [C.ivory, '#D8C9A3', C.terracotta, C.blue, C.olive, '#C9A78A', C.sandstone, '#B7C2A2'];
    for (let i = 1; i <= nT; i++) {
      const mid = ring(i - 0.45);
      const count = 9 + i * 4;
      for (let k = 0; k < count; k++) {
        const a = -1.35 + (2.7 * (k + rs.range(-0.15, 0.15) + 0.5)) / count;
        if (Math.abs(a) < 0.06) continue;
        const x = CX + Math.sin(a) * mid.rx, y = mid.cy - Math.cos(a) * mid.ry;
        const s = 0.46 + i * 0.012;
        specs += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})"><g class="spec" data-b="${rs.range(0, 6).toFixed(2)}"><path d="M-7 0 L7 0 L5 -17 L-5 -17 Z" fill="${cols[Math.floor(rs() * cols.length)]}" stroke="${C.charcoal}" stroke-opacity=".3" stroke-width=".8"/><circle cy="-23" r="6" fill="${C.charcoal}"/><circle cx="2.2" cy="-24" r="1.2" fill="${C.ivory}"/></g></g>`;
      }
    }
    sc.add(ppl, specs);
    // thymele altar
    sc.add(ppl, `<g transform="translate(${CX} ${CY + 10})"><rect x="-26" y="-34" width="52" height="34" fill="#E4D5B6" stroke="#9C8467" stroke-width="1.5"/><rect x="-32" y="-40" width="64" height="9" fill="${C.ivory}" stroke="#9C8467" stroke-width="1.2"/></g>`);
    // giant masks on poles flanking the orchestra
    sc.add(ppl, `<g><line x1="${CX - 420}" y1="${CY + 50}" x2="${CX - 420}" y2="${CY - 190}" stroke="#6B4A2B" stroke-width="7"/>${S.maskProp(CX - 420, CY - 220, 1.35, 'happy', C.ivory)}<line x1="${CX + 420}" y1="${CY + 50}" x2="${CX + 420}" y2="${CY - 190}" stroke="#6B4A2B" stroke-width="7"/>${S.maskProp(CX + 420, CY - 220, 1.35, 'sad', C.ivory)}</g>`);
  }
  // chorus + actors
  const chorus = [0, 1, 2, 3, 4].map((i) => sc.fig(ppl, { x: CX - 270 + i * 120, y: CY + 52 + (i % 2) * 8, s: 1.5, outfit: 'robe', color: ['#D8C9A3', C.parchment, '#C6D0DD', '#E4C9A3', '#C9D0A8'][i], mask: i % 2 ? 'sad' : 'happy', trim: C.sandstone, facing: 1 }));
  chorus.forEach((c) => { c.set({ armF: 100, elbowF: 30, armB: 96, elbowB: 30 }); });
  const actorA = sc.fig(ppl, { x: CX - 90, y: CY + 104, s: 2.05, outfit: 'robe', color: '#7A2D4A', cloak: '#E0BE62', cloakType: 'drape', trim: '#E0BE62', mask: 'sad', facing: 1 });
  actorA.set({ armF: 148, elbowF: 22, armB: 36, elbowB: 60, head: -4 });
  const actorB = sc.fig(ppl, { x: CX + 150, y: CY + 100, s: 2.0, outfit: 'chiton', color: '#C8A04A', trim: C.terracotta, mask: 'happy', facing: -1, hem: 0.4 });
  actorB.set({ armF: 100, elbowF: 40, armB: 70, elbowB: 50 });
  sc.tick((t) => { chorus.forEach((c, i) => { c.p.armF = 104 + Math.sin(t * 1.6 + i * 0.4) * 30; c.p.armB = 98 + Math.sin(t * 1.6 + i * 0.4 + 0.4) * 28; }); });

  // playwright names across the sky
  const names = ['AESCHYLUS', 'SOPHOCLES', 'EURIPIDES', 'ARISTOPHANES'].map((n, i) =>
    sc.add(ui, `<g class="pw" opacity="0" transform="translate(${340 + i * 300} 150)"><text text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="${i === 3 ? 21 : 25}" letter-spacing="5" fill="${C.ivory}" stroke="rgba(30,20,10,.6)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${n}</text><path d="M-30 14 h60" stroke="${C.terracotta}" stroke-width="3"/></g>`));

  sc.add(fg, S.grass(-400, 960, 2200, '#8E9E62', 17, 0.05));
  sc.add(fg, S.amphora(120, 980, 1.5, C.terracotta));
  sc.add(sky, S.flock({ n: 5, x: 600, y: 230, s: 0.7, vx: 14, spread: 70, seed: 21 }));
  sc.particle('motes', { n: 30, color: ['#FFF0C8', '#FFE2A0'], op: 0.45, size: 2, vx: 0.004, vy: -0.002 });
  sc.particle('leaves', { n: 10, color: ['#8FA066', '#A7B67A'], op: 0.8, size: 6, vx: 0.03, vy: 0.04 });
  const tint = sc.tint('#1c2550');

  // spectator applause
  const applause = { v: 0 };
  const specEls = [...ppl.g.querySelectorAll('.spec')];
  sc.tick((t) => { if (applause.v > 0.01) specEls.forEach((e, i) => setT(e, `translate(0 ${(-Math.abs(Math.sin(t * 7 + +e.dataset.b + i * 0.3)) * 6 * applause.v).toFixed(1)})`)); else if (applause._on) specEls.forEach((e) => setT(e, '')); applause._on = applause.v > 0.01; });
  function setT(e, v) { if (e._t !== v) { e.setAttribute('transform', v); e._t = v; } }

  // ================================================================== STORY
  cam.x = 560; cam.y = 560; cam.z = 1.08;
  sc.pan(0, 8.5, { x: 640, y: 540, z: 1.12 }, 'sine.inOut');
  sc.pan(8.5, 6.4, { x: 1210, y: 560, z: 1.04 }, 'power2.inOut');
  sc.pan(15, 5.4, { x: 2420, y: 560, z: 1.0 }, 'power3.inOut');
  sc.pan(20.4, 6, { x: 2440, y: 540, z: 1.04 }, 'sine.inOut');
  sc.pan(26.4, 8.4, { x: 2500, y: 540, z: 1.2 }, 'sine.inOut');

  // Socrates asks
  gsap.set([b1, b2], { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' });
  tl.to(b1, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 3.4);
  tl.to(b1, { opacity: 0, y: '-=20', duration: 0.6 }, 6.4);
  tl.to(b2, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 6.0);
  tl.to(b2, { opacity: 0, y: '-=20', duration: 0.6 }, 9.0);
  socrates.go(tl, 2.6, 1.0, { armF: 96, elbowF: 30, armB: 40, elbowB: 60, head: -4 });
  socrates.go(tl, 5.6, 1.0, { armF: 140, elbowF: 40, armB: 20, elbowB: 50, lean: 4 });
  socrates.go(tl, 8.0, 1.0, { armF: 78, elbowF: 54, lean: 0 });
  students.forEach((st, i) => { tl.to(st.p, { head: (i % 2 ? -6 : 6), duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 3 + i * 0.3); });
  students[2].go(tl, 7.4, 0.8, { armF: 160, elbowF: 10 });
  students[2].go(tl, 9.8, 0.8, { armF: 40, elbowF: 90 });
  // names appear as the camera meets each thinker
  gsap.set([n1, n2, n3], { opacity: 0, y: '+=0' });
  tl.to(n1, { opacity: 1, duration: 0.8 }, 10.0); tl.to(n1, { opacity: 0, duration: 0.6 }, 13.0);
  tl.to(n2, { opacity: 1, duration: 0.8 }, 11.6); tl.to(n2, { opacity: 0, duration: 0.6 }, 15.0);
  tl.to(n3, { opacity: 1, duration: 0.8 }, 13.0); tl.to(n3, { opacity: 0, duration: 0.6 }, 16.0);
  aristotle.go(tl, 12.4, 1.0, { armF: 96, elbowF: 30 });
  aristotle.go(tl, 14.8, 1.0, { armF: 80, elbowF: 20 });
  plato.go(tl, 10.8, 0.8, { head: 20 });

  // theatre: chorus steps left and right; actors declaim
  // each step is relative to where the chorus member will actually be when it starts (Figure tracks that in _wx)
  chorus.forEach((c) => { c._wx = c.p.x; });
  const shift = (f, dx, at) => f.walk(tl, at, f._wx + dx, 2.0, { ease: 'sine.inOut', face: false });
  chorus.forEach((c, i) => { shift(c, -50, 18.0); });
  chorus.forEach((c, i) => { shift(c, 100, 20.6); });
  chorus.forEach((c, i) => { shift(c, -50, 23.2); });
  tl.to(actorA.p, { armF: 70, elbowF: 60, duration: 1.2, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 18.4);
  tl.to(actorB.p, { armF: 140, elbowF: 30, duration: 1.0, yoyo: true, repeat: 6, ease: 'sine.inOut' }, 19.0);
  names.forEach((n, i) => { tl.fromTo(n, { opacity: 0, y: 164 }, { opacity: 1, y: 150, duration: 0.9, ease: 'power2.out' }, 27.2 + i * 1.5); });
  // applause, then the mask comes off
  tl.to(applause, { v: 1, duration: 0.8 }, 29.6);
  tl.to(applause, { v: 0.4, duration: 3 }, 33);
  chorus.forEach((c, i) => { c.go(tl, 29.6 + i * 0.08, 0.5, { armF: 160, elbowF: 20, armB: 160, elbowB: 20 }); });
  tl.add(() => {}, 29.5);
  chorus.forEach((c) => { tl.to(c.p, { mask: 0, duration: 0.01 }, 32.4); });
  tl.to(actorA.p, { armF: 40, elbowF: 100, duration: 0.8 }, 31.0);
  actorA.go(tl, 31.0, 0.9, { armF: 110, elbowF: 130, armB: 20, elbowB: 60, head: 8 });
  tl.to(actorA.p, { mask: 0, duration: 0.01 }, 32.6);
  tl.to(actorB.p, { mask: 0, duration: 0.01 }, 32.9);
  tl.to(actorA.p, { look: 1, duration: 0.5 }, 32.6);
  sc.cue('applause', 29.6);
  sc.cue('chime', 33.0);
}
