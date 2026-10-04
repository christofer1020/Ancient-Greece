// Chapter 8 — Legacy: ruins at sunset, ideas that travel forward in time, and a question left open.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng } from '../art/util.js';

const GY = 740;
const lbl = (x, y, t, col = C.ivory) => `<g class="vl" transform="translate(${x} ${y})" opacity="0"><text text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="22" letter-spacing="5" fill="${col}" stroke="rgba(30,16,10,.65)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${t}</text><path d="M-24 10 h48" stroke="${C.terracotta}" stroke-width="3"/></g>`;

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const sky = sc.layer('sky', 0.04), stars = sc.layer('stars', 0.04), glowL = sc.layer('glow', 0.06), far = sc.layer('far', 0.12), sea = sc.layer('sea', 0.2), mid = sc.layer('mid', 0.5), ppl = sc.layer('people', 1.0), fg = sc.layer('fg', 1.35), ui = sc.layer('ui', 0);

  // ------------------------------------------------------------------ sunset sky
  sc.add(sky, S.sky([[0, '#26305F'], [0.3, '#6A4F86'], [0.5, '#C4607A'], [0.68, '#EE8A5A'], [0.84, '#F7B66C'], [1, '#F9D58E']], { y0: -400, h: 1100 }));
  const dusk = sc.add(sky, (() => { const g = S.grad([[0, '#0C1230'], [0.55, '#2A2A5C'], [1, '#6B3F6E']]); return `<defs>${g.def}</defs><rect class="dusk" x="-1400" y="-400" width="4400" height="1100" fill="${g.ref}" opacity="0"/>`; })());
  // stars
  const rs = rng(3);
  let st = '';
  for (let i = 0; i < 90; i++) st += `<circle class="pulse" data-lo=".25" data-hi="1" data-sp="${rs.range(0.8, 2.4).toFixed(2)}" data-ph="${rs.range(0, 6).toFixed(2)}" cx="${rs.range(-300, 1900).toFixed(0)}" cy="${rs.range(-20, 420).toFixed(0)}" r="${rs.range(0.8, 2.2).toFixed(1)}" fill="#FFF3D6"/>`;
  const starsG = sc.add(stars, `<g class="starsg" opacity="0">${st}</g>`);
  sc.add(glowL, S.sun({ x: 330, y: 575, r: 70, glowR: 820, glow: '#FFAD60', core: '#FFF0C8', op: 1 }));
  const rays = sc.add(glowL, S.rays({ x: 330, y: 575, n: 13, spread: 130, dir: -40, len: 1800, op: 0.16, color: '#FFD08A' }));
  sc.add(sky, S.driftCloud({ x: 800, y: 170, s: 1.5, tone: 'dusk', seed: 401, w: 1.6, vx: 2.4, op: 0.9 }));
  sc.add(sky, S.driftCloud({ x: 1500, y: 90, s: 1.2, tone: 'gold', seed: 403, w: 1.3, vx: 2, op: 0.85 }));
  sc.add(sky, S.driftCloud({ x: 200, y: 260, s: 1.0, tone: 'dusk', seed: 405, w: 1.2, vx: 3, op: 0.8 }));

  // ------------------------------------------------------------------ distance: sea, headland temple
  sc.add(far, S.mountains({ base: 630, amp: 120, lit: '#B9807F', shade: '#4F4577', seed: 411, light: 1 }));
  sc.add(sea, S.sea({ y: 626, top: '#E9A076', bottom: '#27386A', rows: 12, line: '#FFD8A2', rowOp: 0.7, seed: 21 }));
  sc.add(sea, S.glitter({ x: 330, y: 632, h: 280, w: 340, n: 60, color: '#FFE6B0' }));
  sc.add(sea, `<g transform="translate(1340 628)"><path d="M-260 4 C-200 -20 -120 -50 -60 -56 L120 -56 C180 -48 230 -20 280 4 Z" fill="#5D4264"/>${S.temple({ w: 230, h: 84, steps: 2, tone: ['#E9B58D', '#C48A74', '#7B5368'], dark: '#2d1a2a', accent: '#E36A32' }).replace('<g class="temple">', '<g class="temple" transform="translate(0 -56)">')}</g>`);
  sc.add(mid, S.hills({ base: 700, amp: 22, top: '#8A5A5E', bottom: '#4C3A58', seed: 7, freq: 0.006, x0: -1500, x1: 6500 }));

  // ------------------------------------------------------------------ ground
  const gg = S.grad([[0, '#B98C62'], [0.4, '#8F6648'], [1, '#4A3446']]);
  sc.add(ppl, `<defs>${gg.def}</defs><path d="M-1500 ${GY} L6500 ${GY} L6500 1400 L-1500 1400 Z" fill="${gg.ref}"/>`);
  sc.add(ppl, S.grass(-300, GY + 6, 4200, '#9AA25C', 41, 0.035));
  // poppies
  let pop = '';
  const rp = rng(13);
  for (let i = 0; i < 46; i++) { const x = rp.range(-200, 2300), y = GY + rp.range(14, 140); pop += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path d="M0 0 C0 -6 1 -10 0 -14" stroke="#5E6A3A" stroke-width="1.4" fill="none"/><circle cy="-15" r="3" fill="${rp() > 0.3 ? C.terracotta : C.red}"/></g>`; }
  sc.add(ppl, pop);

  // ------------------------------------------------------------------ ruins (stop 1)
  const T = [C.ivory, '#E4C9A0', '#9C8467'];
  const shadow = (x, y, w, len) => `<path d="M${x - w / 2} ${y} L${x + w / 2} ${y} L${x + w / 2 + len} ${y + 24} L${x - w / 2 + len} ${y + 24} Z" fill="#2a1630" opacity=".22"/>`;
  sc.add(ppl, shadow(380, GY + 6, 46, 420) + shadow(560, GY + 8, 46, 300) + shadow(980, GY + 8, 46, 260));
  const rc = (x, h, broken) => `<g transform="translate(${x} ${GY + 6})">${S.column({ h, w: 46, tone: T, broken })}</g>`;
  sc.add(ppl, `<g transform="translate(470 ${GY + 8})"><rect x="-190" y="-14" width="380" height="14" fill="#D9C39B" stroke="#9C8467"/><rect x="-170" y="-28" width="340" height="14" fill="#E4D0AA" stroke="#9C8467"/></g>`);
  sc.add(ppl, rc(380, 330, 0)); sc.add(ppl, rc(560, 330, 0)); sc.add(ppl, rc(740, 330, 0.55)); sc.add(ppl, rc(980, 330, 0.7));
  sc.add(ppl, `<g transform="translate(470 ${GY - 316})"><rect x="-140" y="0" width="320" height="26" fill="${C.ivory}" stroke="#9C8467" stroke-width="1.2"/><rect x="-140" y="26" width="320" height="30" fill="#E7C9A4" stroke="#9C8467" stroke-width="1.2"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${-120 + i * 44}" y="30" width="14" height="22" fill="#7B5368" opacity=".5"/>`).join('')}</g>`);
  sc.add(ppl, S.blocks(840, GY + 22, 1.4, T)); sc.add(ppl, S.blocks(1120, GY + 26, 1.1, T));
  sc.add(ppl, S.olive(1240, GY + 10, 2.3, { leaf: '#6F7D4D', trunk: '#3E2F2A' }));
  // ghost columns (memory) — rebuild over the broken ones
  const ghost = sc.add(ppl, `<g class="ghost" opacity="0"><g transform="translate(740 ${GY + 6})">${S.column({ h: 330, w: 46, tone: ['#FFE9B8', '#FFD592', '#E1A86C'], broken: 0 })}</g><g transform="translate(980 ${GY + 6})">${S.column({ h: 330, w: 46, tone: ['#FFE9B8', '#FFD592', '#E1A86C'], broken: 0 })}</g></g>`);

  // armillary sphere + books + scrolls
  const sphere = `<g transform="translate(700 ${GY + 10})"><rect x="-36" y="-34" width="72" height="34" fill="#D9C39B" stroke="#9C8467"/><rect x="-44" y="-42" width="88" height="10" fill="${C.ivory}" stroke="#9C8467"/>
    <g transform="translate(0 -102)"><g class="spinr"><ellipse rx="52" ry="52" fill="none" stroke="${C.bronze}" stroke-width="3.2"/><ellipse rx="52" ry="19" fill="none" stroke="${C.bronze}" stroke-width="2.4" transform="rotate(-24)"/><ellipse rx="19" ry="52" fill="none" stroke="${C.bronze}" stroke-width="2.4" transform="rotate(-24)"/><ellipse rx="52" ry="34" fill="none" stroke="#C9A24A" stroke-width="1.8" transform="rotate(30)"/></g><circle r="9" fill="${C.sandstone}" stroke="${C.bronze}" stroke-width="2"/><line x1="-6" y1="-60" x2="6" y2="60" stroke="${C.bronze}" stroke-width="2.4" transform="rotate(-24)"/></g></g>`;
  sc.add(ppl, sphere);
  sc.add(ppl, `<g transform="translate(880 ${GY + 16})">${[[0, 0, 80, 16, '#8E2E27'], [4, -16, 74, 15, '#1E3A62'], [-2, -31, 68, 14, '#5E6A3A'], [6, -45, 60, 14, '#8A5A2B']].map(([x, y, w, h, c]) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="${c}" stroke="${darken(c, .4)}" stroke-width="1"/><path d="M${x - w / 2 + 6} ${y - h + 3} h${w - 12}" stroke="#E0BE62" stroke-width="1.4"/>`).join('')}</g>`);
  sc.add(ppl, `<g transform="translate(980 ${GY + 22})"><ellipse cx="0" cy="-6" rx="36" ry="9" fill="${C.parchment}" stroke="#9C8467"/><path d="M-30 -8 q30 -22 60 0" fill="none" stroke="${C.bronze}"/></g>`);
  // the scholar
  sc.add(ppl, S.rock(600, GY + 26, 1.35, '#CDBFA4'));
  const scholar = sc.fig(ppl, { x: 600, y: GY + 28, s: 1.95, outfit: 'robe', color: '#EADFC6', beard: '#DDD2BA', cloak: '#6A5A82', cloakType: 'drape', trim: C.sandstone, facing: -1 });
  scholar.set('sit'); scholar.p.armF = 62; scholar.p.elbowF = 82; scholar.p.armB = 40; scholar.p.elbowB = 94; scholar.p.head = 10; scholar.hold('B', 'scrollOpen', { rot: 0 });
  sc.tick((t) => { scholar.p.armF = 62 + Math.sin(t * 2.4) * 5; });

  // floating words (ui layer)
  const words = [['δημοκρατία', 'democracy'], ['θέατρον', 'theatre'], ['φιλοσοφία', 'philosophy'], ['ἱστορία', 'history'], ['γεωμετρία', 'geometry']];
  const wEls = words.map(([g, e], i) => sc.add(ui, `<g class="word" transform="translate(${260 + i * 270} ${210 + (i % 2) * 70})" opacity="0"><text text-anchor="middle" font-family="'GFS Didot', serif" font-size="46" fill="#FFE8B2" stroke="rgba(60,24,40,.55)" stroke-width="6" paint-order="stroke" stroke-linejoin="round">${g}</text><text y="30" text-anchor="middle" font-family="'EB Garamond', serif" font-style="italic" font-size="26" fill="#FFF3D6" stroke="rgba(60,24,40,.55)" stroke-width="5" paint-order="stroke">${e}</text></g>`));

  // ------------------------------------------------------------------ vignettes (stop 2)
  const V0 = 1700;
  // Hippocrates
  sc.add(ppl, S.rock(V0 + 120, GY + 28, 1.3, '#CDBFA4'));
  const patient = sc.fig(ppl, { x: V0 + 122, y: GY + 30, s: 1.6, outfit: 'chiton', color: '#C8A582', trim: C.sandstone, facing: -1 });
  patient.set('sit'); patient.p.armF = 70; patient.p.elbowF = 40; patient.p.head = 10;
  const hippo = sc.fig(ppl, { x: V0 + 30, y: GY + 30, s: 1.85, outfit: 'robe', color: '#F0E6CC', beard: '#E0D6BE', cloak: '#6B8CA8', cloakType: 'drape', trim: C.sandstone, facing: 1 });
  hippo.set('stand'); hippo.p.lean = 14; hippo.p.armF = 82; hippo.p.elbowF = 20; hippo.p.armB = 50; hippo.p.elbowB = 60; hippo.p.head = 10;
  sc.add(ppl, `<g transform="translate(${V0 - 70} ${GY + 30})"><line x1="0" y1="0" x2="0" y2="-180" stroke="#6B4A2B" stroke-width="5"/><path d="M0 -20 C-18 -34 18 -46 0 -60 C-18 -74 18 -86 0 -100 C-14 -112 10 -122 2 -134" fill="none" stroke="${C.olive}" stroke-width="4.2" stroke-linecap="round"/><circle cx="3" cy="-138" r="5" fill="${C.olive}"/></g>`);
  const lHip = sc.add(ppl, lbl(V0 + 60, GY - 230, 'HIPPOCRATES'));
  // Euclid
  const E0 = 2260;
  sc.add(ppl, `<ellipse cx="${E0 + 40}" cy="${GY + 70}" rx="190" ry="34" fill="#D9BE8E" opacity=".9"/>`);
  const drawn = sc.add(ppl, `<g class="drawn" transform="translate(${E0 + 40} ${GY + 70})"><path d="M-110 8 L10 -20 L90 14 Z" pathLength="1" stroke="${C.bronze}" stroke-width="3.2" fill="none" stroke-dasharray="1" stroke-dashoffset="1" stroke-linejoin="round" class="g1"/><circle cx="10" cy="-4" r="38" pathLength="1" stroke="${C.bronze}" stroke-width="3" fill="none" stroke-dasharray="1" stroke-dashoffset="1" class="g2" transform="scale(1 .35) translate(0 -2)"/><path d="M10 -20 L10 14 M-110 8 L90 14" pathLength="1" stroke="${C.terracotta}" stroke-width="2.4" fill="none" stroke-dasharray="1" stroke-dashoffset="1" class="g3"/></g>`);
  const euclid = sc.fig(ppl, { x: E0 - 40, y: GY + 44, s: 1.85, outfit: 'robe', color: '#E8DCBF', beard: '#D0C6AE', cloak: '#8A6A4A', cloakType: 'drape', trim: C.sandstone, facing: 1 });
  euclid.set({ armF: 70, elbowF: 30, armB: 30, elbowB: 70, lean: 34, head: 14, legF: 8, kneeF: 18, legB: -8, kneeB: 14 }); euclid.hold('F', 'staff', { len: 110, mode: 'world', rot: 30 });
  const stud = sc.fig(ppl, { x: E0 + 230, y: GY + 52, s: 1.45, outfit: 'chiton', color: C.terracotta, trim: C.ivory, facing: -1 });
  stud.set('relaxed'); stud.p.head = 12;
  const lEuc = sc.add(ppl, lbl(E0 + 40, GY - 230, 'EUCLID'));
  // Herodotus
  const H0 = 2820;
  sc.add(ppl, `<g transform="translate(${H0} ${GY + 34})"><rect x="-80" y="-66" width="160" height="12" rx="3" fill="#CDB78F" stroke="#9C8467"/><rect x="-68" y="-54" width="12" height="54" fill="#BFA77E"/><rect x="56" y="-54" width="12" height="54" fill="#BFA77E"/>
    <path d="M-62 -66 L58 -66 L66 -76 L-52 -76 Z" fill="${C.parchment}" stroke="#9C8467"/><path d="M-40 -71 C-20 -78 4 -66 30 -72" stroke="${C.red}" stroke-width="2" fill="none"/><circle cx="-40" cy="-71" r="2.4" fill="${C.terracotta}"/></g>`);
  sc.add(ppl, S.rock(H0 - 120, GY + 36, 1.25, '#CDBFA4'));
  const hero = sc.fig(ppl, { x: H0 - 118, y: GY + 38, s: 1.8, outfit: 'chiton', color: '#C7B38C', hat: 'petasos', hatColor: '#B79C6A', trim: C.sandstone, facing: 1 });
  hero.set('sit'); hero.p.armF = 60; hero.p.elbowF = 84; hero.p.head = 14; hero.p.lean = 8;
  sc.tick((t) => { hero.p.armF = 60 + Math.sin(t * 2.8) * 6; hero.p.elbowF = 84 + Math.sin(t * 2.9 + 1) * 8; });
  const lHer = sc.add(ppl, lbl(H0 - 30, GY - 230, 'HERODOTUS'));

  // ------------------------------------------------------------------ the modern: courthouse/library (stop 3)
  const B0 = 3600;
  const mgrad = S.grad([[0, '#F7E6C6'], [1, '#C9A483']], { x1: 0, y1: 0, x2: 1, y2: 0.3 });
  sc.add(ppl, `<g transform="translate(${B0} ${GY + 6})">${S.temple({ w: 1000, h: 420, cols: 10, steps: 7, tone: ['#F6E7CB', '#DDBE98', '#9A7862'], dark: '#2b1a2a', accent: '#C96B4C' })}</g>`);
  sc.add(ppl, `<g transform="translate(${B0} ${GY - 360})"><circle r="26" fill="none" stroke="#9A7862" stroke-width="3"/><path d="M0 -20 V20 M-18 -8 H18 M-18 -8 L-24 8 H-12 Z M18 -8 L12 8 H24 Z" stroke="#9A7862" stroke-width="2.6" fill="none" stroke-linejoin="round"/></g>`);
  sc.add(ppl, `<g transform="translate(${B0 - 560} ${GY + 6})"><line y2="-300" stroke="#7a6a5a" stroke-width="5"/><path d="M0 -296 L90 -284 L84 -250 L90 -216 L0 -226 Z" fill="${C.blue}"/><path d="M14 -250 l16 -22 l16 22 M18 -258 h24" stroke="${C.ivory}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`);
  sc.add(ppl, `<g transform="translate(${B0 + 560} ${GY + 6})"><line y2="-300" stroke="#7a6a5a" stroke-width="5"/><path d="M0 -296 L-90 -284 L-84 -250 L-90 -216 L0 -226 Z" fill="${C.terracotta}"/></g>`);
  sc.add(ppl, `<g transform="translate(${B0 + 360} ${GY - 150})"><rect x="-80" y="-18" width="160" height="34" rx="3" fill="${C.ivory}" stroke="#9A7862" stroke-width="1.5"/><text y="7" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="20" letter-spacing="6" fill="${C.blue}">LIBRARY</text></g>`);
  sc.add(ppl, `<g transform="translate(${B0 - 360} ${GY - 150})"><rect x="-80" y="-18" width="160" height="34" rx="3" fill="${C.ivory}" stroke="#9A7862" stroke-width="1.5"/><text y="7" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="20" letter-spacing="6" fill="${C.blue}">COURT</text></g>`);
  const people = [];
  [[B0 - 220, 0, -1], [B0 - 120, 1, -1], [B0 + 140, 2, 1], [B0 + 260, 3, 1], [B0 - 20, 4, 1]].forEach(([x, k, f]) => {
    const p = sc.fig(ppl, { x, y: GY + 68 + (k % 2) * 14, s: 1.45, outfit: 'chiton', color: ['#3C4A6A', '#8E4A44', '#4E5C48', '#5C4A6A', '#6A5A44'][k], trim: C.sandstone, facing: f, hem: 0.5 });
    people.push(p);
  });
  const lCourt = sc.add(ppl, lbl(B0, GY - 450, 'COURTS · LIBRARIES · BANKS'));

  // stadium (stop 4)
  const D0 = 4900;
  {
    // five filled terraces, highest first, so each lower row overlaps the one behind it
    const TIERS = 5, tier = (i) => ({ rx: 520 - 36 * i, ry: 150 - 6 * i, y: -30 * i });
    const tone = ['#E8D0B0', '#DDBF9C', '#E4C8A6', '#D6B792', '#DEC09C'];
    let arcs = '';
    for (let i = TIERS - 1; i >= 0; i--) {
      const { rx, ry, y } = tier(i);
      arcs += `<path d="M${-rx} 6 L${-rx} ${y} A${rx} ${ry} 0 0 1 ${rx} ${y} L${rx} 6 Z" fill="${tone[i]}" stroke="#8C6C5A" stroke-width="1.4"/>`;
    }
    // a ground-floor arcade gives the lower face some architecture
    let arches = '';
    for (let k = -8; k <= 8; k++) { const x = k * 54; arches += `<path d="M${x - 16} 6 V-44 A16 16 0 0 1 ${x + 16} -44 V6 Z" fill="#6B4E57" opacity=".78"/>`; }
    arches += '<path d="M-505 -66 H505" stroke="#8C6C5A" stroke-width="2.4" opacity=".7"/>';
    sc.add(ppl, `<g transform="translate(${D0} ${GY - 10})">${arcs}${arches}<path d="M-540 6 H540" stroke="#8C6C5A" stroke-width="2"/></g>`);
    const rs2 = rng(31);
    let sp = '';
    for (let i = 0; i < TIERS; i++) {
      const { rx, ry, y } = tier(i);
      for (let k = 0; k < 28; k++) {
        const a = -1.3 + (2.6 * k) / 28 + rs2.range(-.02, .02);
        const x = D0 + Math.sin(a) * rx, yy = GY - 10 + y - Math.cos(a) * ry + 1;
        sp += `<g transform="translate(${x.toFixed(0)} ${yy.toFixed(0)}) scale(.5)"><path d="M-7 0 L7 0 L5 -17 L-5 -17 Z" fill="${['#C96B4C', '#1E3A62', '#F2E9D4', '#5E6A3A', '#CFAF84'][Math.floor(rs2() * 5)]}"/><circle cy="-23" r="6" fill="#2A2623"/></g>`;
      }
    }
    sc.add(ppl, sp);
    sc.add(ppl, `<g transform="translate(${D0} ${GY + 6})"><rect x="-26" y="-190" width="52" height="190" fill="#D9C39B" stroke="#9C8467" stroke-width="1.5"/><path d="M-60 -190 H60 L44 -214 H-44 Z" fill="${C.bronze}" stroke="${darken(C.bronze, .4)}" stroke-width="1.5"/></g>`);
    sc.add(ppl, `<g transform="translate(${D0} ${GY - 188})"><circle class="pulse" data-lo=".5" data-hi="1" data-sp="6" r="150" fill="url(#cauldronGlow)"/></g>`);
  }
  const cauldronGlow = S.rgrad([[0, '#FFD27A', 0.7], [1, '#FFB04A', 0]]);
  sc.add(ppl, `<defs>${cauldronGlow.def.replace(cauldronGlow.id, 'cauldronGlow')}</defs>`);
  const cFire = sc.add(ppl, S.fire({ x: D0, y: GY - 214, s: 3.4 }));
  gsap.set(cFire, { opacity: 0 });
  const runner = sc.fig(ppl, { x: D0 - 700, y: GY + 70, s: 1.65, outfit: 'chiton', color: '#F2E9D4', trim: C.terracotta, facing: 1, hem: 0.36, wreath: true });
  runner.hold('F', 'torch', { mode: 'world', rot: 0 }); runner.p.armF = 150; runner.p.elbowF = 20; runner.p.swing = 0.2;
  const lOly = sc.add(ppl, lbl(D0, GY - 330, '1896 · ATHENS'));

  // ------------------------------------------------------------------ closing: the Greek question mark
  const q = sc.add(ui, `<g class="qm" opacity="0" transform="translate(800 250)"><text text-anchor="middle" font-family="'GFS Didot', serif" font-size="240" fill="#FFE8B2" stroke="rgba(60,24,40,.5)" stroke-width="8" paint-order="stroke">;</text></g>`);

  sc.add(fg, S.grass(-300, 980, 2600, '#9AA25C', 51, 0.04));
  sc.add(fg, S.amphora(1560, 990, 1.6, C.terracotta, -6));
  sc.particle('motes', { n: 40, color: ['#FFD9A0', '#FFC27A', '#FFF0C8'], op: 0.5, size: 2.4, vx: 0.004, vy: -0.004 });
  sc.particle('leaves', { n: 8, color: ['#9AA25C', '#C77B4B'], op: 0.8, size: 5, vx: 0.03, vy: 0.04 });
  const tint = sc.tint('#2a2060');

  // spin the sphere
  const spinr = ppl.g.querySelector('.spinr');
  sc.tick((t) => spinr.setAttribute('transform', `rotate(${(t * 18) % 360}) scale(1 1)`));

  // ================================================================== STORY
  cam.x = 640; cam.y = 480; cam.z = 1.15;
  sc.pan(0, 9, { x: 800, y: 470, z: 1.05 }, 'sine.inOut');
  sc.pan(9.2, 7.0, { x: V0 + 560, y: 480, z: 1.0 }, 'power2.inOut');
  sc.pan(16.4, 3.4, { x: B0 + 20, y: 470, z: 0.95 }, 'power2.inOut');
  sc.pan(21.4, 3.2, { x: D0 - 120, y: 470, z: 1.0 }, 'power2.inOut');
  sc.pan(26.2, 4.4, { x: 880, y: 470, z: 1.1 }, 'power3.inOut');
  sc.pan(30.6, 7.4, { x: 820, y: 400, z: 1.2 }, 'sine.inOut');

  // words rise out of the scroll
  wEls.forEach((w, i) => {
    gsap.set(w, { opacity: 0 });
    tl.fromTo(w, { opacity: 0, y: '+=24' }, { opacity: 1, y: '-=24', duration: 1.1, ease: 'power3.out' }, 2.3 + i * 1.25);
    tl.to(w, { opacity: 0, y: '-=14', duration: 1.2, ease: 'power1.in' }, 7.9 + i * 0.35);
  });
  scholar.go(tl, 2.0, 1.2, { head: 2, armF: 120, elbowF: 40 });
  scholar.go(tl, 8.4, 1.2, { head: 10, armF: 62, elbowF: 82 });
  tl.to(ghost, { opacity: 0.85, duration: 2.2, ease: 'power1.inOut' }, 5.2);
  tl.to(ghost, { opacity: 0, duration: 2.0, ease: 'power1.inOut' }, 9.4);

  // dusk deepens as the time-line moves forward
  const duskRect = ((d) => d)(sky.g.querySelector('.dusk'));
  tl.to(duskRect, { opacity: 0.0, duration: 0.01 }, 0);
  tl.to(duskRect, { opacity: 0.55, duration: 14, ease: 'sine.inOut' }, 12);
  tl.to(tint, { opacity: 0.18, duration: 12, ease: 'sine.inOut' }, 12);
  tl.to(starsG, { opacity: 0.8, duration: 6 }, 20);
  tl.to(duskRect, { opacity: 0.82, duration: 6, ease: 'sine.inOut' }, 26);
  tl.to(tint, { opacity: 0.38, duration: 6, ease: 'sine.inOut' }, 26);
  tl.to(starsG, { opacity: 1, duration: 5 }, 27);
  tl.to(rays, { opacity: 0.2, duration: 6 }, 27);

  // vignettes
  const showL = (el, at, out) => { tl.to(el, { opacity: 1, duration: 0.8 }, at); tl.to(el, { opacity: 0, duration: 0.7 }, out); };
  showL(lHip, 10.4, 13.8); showL(lEuc, 12.6, 16.0); showL(lHer, 14.6, 17.4);
  hippo.go(tl, 11.0, 1.0, { armF: 92, elbowF: 14 });
  tl.to(hippo.p, { head: 4, duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 12);
  const [g1, g2, g3] = [drawn.querySelector('.g1'), drawn.querySelector('.g2'), drawn.querySelector('.g3')];
  tl.fromTo(g1, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power1.inOut' }, 12.6);
  tl.fromTo(g2, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power1.inOut' }, 13.8);
  tl.fromTo(g3, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, 15.0);
  euclid.go(tl, 12.8, 1.6, { armF: 90 }); euclid.go(tl, 14.4, 1.6, { armF: 60 });

  // the modern world
  showL(lCourt, 19.2, 23.0);
  people.forEach((p, i) => { p.walk(tl, 18.6 + i * 0.3, p.p.x + p.p.facing * 140, 5.2, { ease: 'sine.inOut', face: false }); });
  showL(lOly, 23.8, 27.6);
  runner.walk(tl, 22.0, D0 - 70, 3.8, { run: 0.5, ease: 'sine.inOut', face: false });
  runner.go(tl, 26.2, 0.5, { armF: 160, elbowF: 10 });
  tl.to(cFire, { opacity: 1, duration: 0.6, ease: 'back.out(3)' }, 26.4);
  sc.cue('chime', 26.4);

  // the question
  tl.fromTo(q, { opacity: 0, scale: 0.8, transformOrigin: '800px 250px' }, { opacity: 0.95, scale: 1, duration: 2.4, ease: 'power2.out' }, 31.0);
  scholar.go(tl, 31.0, 1.6, { head: -16, armF: 40, elbowF: 70, look: 1 });
}
