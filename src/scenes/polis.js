// Chapter 3 — The Polis: a city and its countryside, the agora, and who gets a voice.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { aegeanMap } from '../art/geo.js';
import { rng, smoothPath } from '../art/util.js';
import { citadel } from './intro.js';

const plane = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="sway" data-amp="0.7" data-spd="0.5" data-ph="${(x * 0.01) % 6}">
  <path d="M-8 0 C-6 -40 -10 -80 -4 -120 L6 -120 C10 -80 6 -40 10 0 Z" fill="#8C7A66"/><path d="M-4 -60 C-18 -80 -30 -96 -40 -110" stroke="#7A6856" stroke-width="5" fill="none"/>
  ${[[-60, -150, 62, 38], [0, -178, 70, 44], [62, -150, 60, 36], [-20, -130, 74, 30], [40, -120, 56, 26]].map(([a, b, rx, ry]) => `<ellipse cx="${a}" cy="${b + 8}" rx="${rx}" ry="${ry}" fill="#587A3D"/>`).join('')}
  ${[[-60, -150, 62, 38], [0, -178, 70, 44], [62, -150, 60, 36], [-20, -130, 74, 30], [40, -120, 56, 26]].map(([a, b, rx, ry]) => `<ellipse cx="${a}" cy="${b}" rx="${rx}" ry="${ry}" fill="#7E9E57"/>`).join('')}
  ${[[-70, -166, 30, 14], [10, -194, 34, 16], [66, -166, 28, 12]].map(([a, b, rx, ry]) => `<ellipse cx="${a}" cy="${b}" rx="${rx}" ry="${ry}" fill="#A7C07A" opacity=".75"/>`).join('')}</g></g>`;

const herm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-13" y="-78" width="26" height="78" fill="${C.sandstone}" stroke="#9C8467" stroke-width="1"/><rect x="-16" y="-84" width="32" height="8" fill="${C.ivory}" stroke="#9C8467" stroke-width="1"/>
  <circle cy="-100" r="14" fill="${C.ivory}" stroke="#9C8467" stroke-width="1"/><path d="M-9 -92 C-4 -80 4 -80 9 -92 L6 -78 L-6 -78 Z" fill="#E4D9BE"/><rect x="-1.5" y="-60" width="3" height="10" fill="#9C8467" opacity=".7"/></g>`;

const bema = (x, y) => `<g transform="translate(${x} ${y})">
  <rect x="-130" y="-22" width="260" height="22" fill="#CDB38A" stroke="#9C8467" stroke-width="1.2"/>
  <rect x="-108" y="-44" width="216" height="22" fill="#D9C39B" stroke="#9C8467" stroke-width="1.2"/>
  <rect x="-86" y="-66" width="172" height="22" fill="#E6D3AE" stroke="#9C8467" stroke-width="1.2"/>
  <path d="M-86 -66 H86" stroke="#fff" stroke-width="2" opacity=".5"/>
  <path d="M-130 -22 H130 M-108 -44 H108" stroke="#fff" stroke-width="1.5" opacity=".35"/></g>`;

const wall = (x, y, w) => {
  let s = `<rect x="${x}" y="${y - 78}" width="${w}" height="78" fill="#CDB89A" stroke="#8C7660" stroke-width="1"/>`;
  for (let i = 0; i < w / 28; i++) s += `<rect x="${x + i * 28 + 4}" y="${y - 92}" width="16" height="16" fill="#CDB89A" stroke="#8C7660" stroke-width="1"/>`;
  for (let r = 0; r < 4; r++) for (let i = 0; i < w / 40; i++) s += `<path d="M${x + i * 40 + (r % 2) * 20} ${y - 78 + r * 19.5} h40 M${x + i * 40 + (r % 2) * 20} ${y - 78 + r * 19.5} v19.5" stroke="#8C7660" stroke-width=".8" opacity=".5" fill="none"/>`;
  return s;
};

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const sky = sc.layer('sky', 0.03);
  const far = sc.layer('far', 0.1);
  const acro = sc.layer('acro', 0.3);
  const fields = sc.layer('fields', 0.45);
  const town = sc.layer('town', 0.6);
  const stoaL = sc.layer('stoa', 0.8);
  const ppl = sc.layer('people', 1.0);
  const fg = sc.layer('fg', 1.3);
  const ui = sc.layer('ui', 0);
  const P = (L, sx) => sc.px(L, 900, sx);

  // ------------------------------------------------------------------ sky, far hills
  sc.add(sky, S.daySky());
  sc.add(sky, S.driftCloud({ x: 200, y: 160, s: 1.3, tone: 'white', seed: 31, w: 1.3, vx: 3, op: 0.95 }));
  sc.add(sky, S.driftCloud({ x: 1000, y: 100, s: 1.5, tone: 'white', seed: 33, w: 1.4, vx: 2.4, op: 0.95 }));
  sc.add(sky, S.driftCloud({ x: 1500, y: 240, s: 1.0, tone: 'warm', seed: 35, w: 1, vx: 3.4, op: 0.9 }));
  sc.add(sky, S.sun({ x: 1180, y: 150, r: 50, glowR: 520, glow: '#FFE2A8', op: 0.7 }));
  sc.add(far, S.mountains({ base: 660, amp: 150, lit: '#CFC0B6', shade: '#8C94B0', seed: 41 }));
  sc.add(far, S.hills({ base: 664, amp: 20, top: '#AEB0B8', bottom: '#9AA2B4', seed: 6, freq: 0.006 }));
  sc.add(far, `<rect x="-1400" y="676" width="4400" height="60" fill="#9DB6CC" opacity=".55"/>`);

  // ------------------------------------------------------------------ the acropolis (citadel)
  sc.add(acro, `<g transform="translate(${P(acro, 1330)} 742)">${citadel({ w: 700, h: 330, seed: 7 })}</g>`);
  sc.add(acro, `<g transform="translate(${P(acro, 1330)} ${742 - 330 - 8})">${S.temple({ w: 440, h: 150, steps: 3, tone: [C.ivory, '#DDC49A', '#9C8467'] })}</g>`);
  sc.add(acro, S.cypress(P(acro, 1040), 420, 80, '#475733'));

  // ------------------------------------------------------------------ the countryside beyond the walls
  sc.add(fields, S.hills({ base: 728, amp: 14, top: '#9DA878', bottom: '#8A9A62', seed: 12, freq: 0.01 }));
  let strips = '';
  const rf = rng(9);
  for (let i = 0; i < 14; i++) {
    const x0 = -900 + i * 120, col = i % 3 === 0 ? '#C8B068' : i % 3 === 1 ? '#8FA362' : '#A9B672';
    strips += `<path d="M${x0} 736 L${x0 + 110} 736 L${x0 + 170 + rf.range(-20, 20)} 860 L${x0 - 20} 860 Z" fill="${col}" stroke="#76865A" stroke-width="1" opacity=".95"/>`;
  }
  sc.add(fields, strips);
  for (let i = 0; i < 9; i++) sc.add(fields, S.olive(-760 + i * 150 + rf.range(-20, 20), 742 + rf.range(0, 30), 0.34, { leaf: '#7C8A55' }));
  sc.add(fields, `<g transform="translate(-300 760)">${S.house({ w: 52, h: 36, wall: C.ivory, roof: C.terracotta, door: C.blue })}</g>`);

  // ------------------------------------------------------------------ the town: wall, gate, houses
  sc.add(town, wall(P(town, -360), 776, 560));
  sc.add(town, `<g transform="translate(${P(town, -100)} 776)"><rect x="-44" y="-130" width="88" height="130" fill="#C3AC8C" stroke="#8C7660" stroke-width="1"/><path d="M-22 0 V-60 A22 22 0 0 1 22 -60 V0 Z" fill="#33262A"/>
    ${[-44, -22, 0, 22, 36].map((x) => `<rect x="${x}" y="-146" width="14" height="16" fill="#C3AC8C" stroke="#8C7660" stroke-width="1"/>`).join('')}</g>`);
  sc.add(town, `<g transform="translate(${P(town, 560)} 790)">${S.village({ n: 14, seed: 24, scale: 1.1, haze: { color: '#E9D8BC', amt: 0.12 }, w: 640, rows: 4 })}</g>`);
  sc.add(town, S.cypress(P(town, 430), 770, 130, '#43522F'));
  sc.add(town, S.cypress(P(town, 1480), 780, 110, '#43522F'));
  sc.add(town, S.smoke({ x: P(town, 760), y: 690, s: 0.9, n: 6, c: '#8b8078' }));

  // ------------------------------------------------------------------ agora backdrop: stoa, plane trees, herm
  sc.add(stoaL, `<g transform="translate(${P(stoaL, 1180)} 800)">${S.stoa({ w: 820, h: 160, cols: 13 })}</g>`);
  sc.add(stoaL, plane(P(stoaL, 640), 810, 1.15));
  sc.add(stoaL, plane(P(stoaL, 1640), 812, 1.0));
  sc.add(stoaL, herm(P(stoaL, 760), 820, 1.1));

  // ------------------------------------------------------------------ ground
  const gg = S.grad([[0, '#DAC7A3'], [0.35, '#CDB58E'], [1, '#A88D68']]);
  sc.add(ppl, `<defs>${gg.def}</defs><path d="M-1200 796 L2800 796 L2800 1400 L-1200 1400 Z" fill="${gg.ref}"/>`);
  let pav = '';
  for (let i = 0; i < 12; i++) { const y = 806 + i * i * 2.6 + i * 10; pav += `<path d="M-1200 ${y} H2800" stroke="#fff" stroke-width="${0.8 + i * 0.12}" opacity="${0.1 + i * 0.012}"/>`; }
  for (let i = -20; i < 30; i++) pav += `<path d="M${800 + i * 70} 796 L${800 + i * 190 - 0} 1100" stroke="#7B654A" stroke-width="1" opacity=".1"/>`;
  sc.add(ppl, pav);
  sc.add(ppl, `<ellipse cx="1005" cy="806" rx="360" ry="64" fill="#E9D7AE" opacity=".5"/>`);

  // ------------------------------------------------------------------ market stalls (sellers first so tables cover their legs)
  const seller = (x, col, o = {}) => sc.fig(ppl, Object.assign({ x, y: 806, s: 1.5, outfit: 'chiton', color: col, trim: C.sandstone }, o));
  const s1 = seller(300, '#D8C9A3'); s1.set('relaxed');
  sc.add(ppl, S.stall({ x: 300, y: 812, s: 1.45, awning: C.terracotta, goods: 'fruit', seed: 2 }));
  const s2 = seller(520, C.olive, { facing: 1 }); s2.set('relaxed');
  sc.add(ppl, S.stall({ x: 520, y: 812, s: 1.45, awning: C.blue, goods: 'jars', seed: 3 }));
  const s3 = seller(1565, C.terracotta, { facing: -1 }); s3.set('relaxed');
  sc.add(ppl, S.stall({ x: 1565, y: 812, s: 1.45, awning: C.olive, goods: 'cloth', seed: 4 }));
  const buyer1 = sc.fig(ppl, { x: 402, y: 826, s: 1.55, outfit: 'peplos', color: '#DDB9A0', hair: 'bun', hairColor: '#5b3a24', facing: -1, trim: C.red });
  buyer1.set('offer');
  const buyer2 = sc.fig(ppl, { x: 1470, y: 826, s: 1.5, outfit: 'chiton', color: C.parchment, trim: C.terracotta, facing: 1, cloak: C.blue, cloakType: 'drape' });
  buyer2.set('relaxed');

  // ------------------------------------------------------------------ left pair talking by the wall
  const talkA = sc.fig(ppl, { x: 130, y: 818, s: 1.6, outfit: 'robe', color: C.ivory, beard: '#DDD2BA', cloak: C.olive, cloakType: 'drape', facing: 1 });
  talkA.set('orate'); talkA.hold('B', 'staff', { len: 150, mode: 'world', rot: -2 }); talkA.p.armB = 6; talkA.p.elbowB = 70;
  const talkB = sc.fig(ppl, { x: 205, y: 822, s: 1.55, outfit: 'chiton', color: C.terracotta, trim: C.ivory, facing: -1 });
  talkB.set('speak');
  sc.tick((t) => {
    talkA.p.armF = 100 + Math.sin(t * 1.5) * 26; talkA.p.elbowF = 42 + Math.sin(t * 1.9) * 12;
    talkB.p.armF = 50 + Math.sin(t * 1.1 + 1) * 16; talkB.p.head = Math.sin(t * 1.0) * 4;
    s1.p.armF = 130 + Math.sin(t * 2.2) * 30; s1.p.elbowF = 30;
    s3.p.armF = 60 + Math.sin(t * 1.7 + 2) * 10;
  });

  // ------------------------------------------------------------------ bema + orator + citizens
  sc.add(ppl, bema(1005, 824));
  const orator = sc.fig(ppl, { x: 1005, y: 758, s: 1.9, outfit: 'robe', color: C.ivory, beard: '#E5DCC6', cloak: C.blue, cloakType: 'drape', trim: C.sandstone, wreath: true, facing: -1 });
  orator.set('orate');
  const crowd = [];
  const cc = [C.ivory, '#D8C9A3', '#BFA97C', '#C9D0A8', '#D7B79C', '#C6D0DD', '#E4C9A3', '#B7C2A2'];
  const slots = [[735, 830, 1], [795, 822, 1], [850, 836, 1], [905, 826, 1], [1105, 826, -1], [1160, 836, -1], [1220, 822, -1], [1280, 830, -1]];
  slots.forEach(([x, y, f], i) => {
    const c = sc.fig(ppl, { x, y, s: 1.5 + (y - 822) * 0.006, outfit: i % 3 === 0 ? 'robe' : 'chiton', color: cc[i], cloak: i % 2 ? C.blue : C.olive, cloakType: 'drape', facing: f, beard: i % 3 === 0 ? '#CFC5AE' : null, hair: i % 3 === 1 ? 'curls' : null, hairColor: '#5b3a24', trim: C.sandstone });
    c.set('relaxed'); c.p.head = -4; c.p.look = 1;
    crowd.push(c);
  });
  // two with staffs
  crowd[0].hold('B', 'staff', { len: 150, mode: 'world', rot: -3 }); crowd[0].p.armB = 8; crowd[0].p.elbowB = 70;
  crowd[7].hold('B', 'staff', { len: 150, mode: 'world', rot: 3 }); crowd[7].p.armB = 8; crowd[7].p.elbowB = 70;

  // children
  const kidA = sc.fig(ppl, { x: 470, y: 860, s: 1.05, outfit: 'chiton', color: C.terracotta, trim: C.ivory });
  const kidB = sc.fig(ppl, { x: 430, y: 862, s: 1.0, outfit: 'chiton', color: C.blue, trim: C.sandstone });

  // water-bearer crossing the whole square
  const water = sc.fig(ppl, { x: -160, y: 872, s: 1.6, outfit: 'peplos', color: '#C9A78A', hair: 'bun', hairColor: '#4a3320', trim: C.red });
  water.hold('F', 'amphora', { mode: 'world', rot: 0, y: -6 }); water.p.armF = 152; water.p.elbowF = 110; water.p.swing = 0.25;
  // foreigner and porter (appear late)
  const foreigner = sc.fig(ppl, { x: 1940, y: 842, s: 1.6, outfit: 'chiton', color: '#2F5D7C', trim: C.sandstone, hat: 'hood', hatColor: '#2F5D7C', cloak: '#7A5A3A', cloakType: 'drape', facing: -1, opacity: 0 });
  foreigner.hold('B', 'staff', { len: 150, mode: 'world', rot: -2 }); foreigner.p.armB = 8; foreigner.p.elbowB = 70;
  const porter = sc.fig(ppl, { x: 1960, y: 786, s: 1.45, outfit: 'chiton', color: '#B9A486', trim: C.sandstone, facing: -1, opacity: 0 });
  porter.hold('F', 'amphora', { mode: 'world', rot: 0, y: -6, color: C.sandstone }); porter.p.armF = 152; porter.p.elbowF = 110; porter.p.swing = 0.25; porter.p.lean = 10;

  // ------------------------------------------------------------------ foreground
  sc.add(fg, S.pithos(120, 930, 1.5));
  sc.add(fg, S.amphora(190, 940, 1.5, C.sandstone));
  sc.add(fg, S.amphora(1500, 950, 1.6, C.terracotta));
  sc.add(fg, S.grass(-300, 960, 700, '#9AA46A', 21, 0.06));
  sc.add(fg, S.olive(1750, 975, 1.5, { leaf: '#7C8A55' }));

  // ------------------------------------------------------------------ assembly ring (late)
  const ring = sc.add(ppl, (() => {
    const g = S.rgrad([[0, '#FFE9B0', 0.5], [0.7, '#FFD98A', 0.22], [1, '#FFD98A', 0]]);
    return `<g class="ringg" opacity="0"><defs>${g.def}</defs><ellipse cx="1005" cy="816" rx="372" ry="70" fill="${g.ref}"/>
      <ellipse class="ringline" cx="1005" cy="816" rx="352" ry="62" fill="none" stroke="${C.terracotta}" stroke-width="4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="round"/>
      <ellipse cx="1005" cy="816" rx="338" ry="56" fill="none" stroke="${C.red}" stroke-width="1.4" stroke-dasharray="3 6" opacity=".8"/></g>`;
  })());
  ppl.g.insertBefore(ring, s1.root); // the glow sits on the ground, under the people
  const ringLine = ring.querySelector('.ringline');
  const shaft = sc.add(ppl, S.lightShaft({ x: 880, y: 40, w: 250, h: 800, tilt: 0, op: 0.2, color: '#FFE9B0' }));
  gsap.set(shaft, { opacity: 0 });

  // ------------------------------------------------------------------ map inset (Aegean, poleis)
  const PW = 1100, PH = 620, PX = 250, PY = 105;
  const MW = 700, MH = 540;
  const map = aegeanMap({ w: MW, h: MH, sea: '#BFD0D2', land: '#DCC495', line: '#8A5A2B' });
  const dots = [
    ['Athens', 23.73, 37.98, 14, 22, 'start'], ['Sparta', 22.43, 37.07, -6, 34, 'middle'], ['Corinth', 22.88, 37.91, -14, -12, 'end'], ['Thebes', 23.32, 38.32, -14, -12, 'end'],
    ['Argos', 22.72, 37.63, -14, 4, 'end'], ['Miletus', 27.28, 37.53, 12, 20, 'start'], ['Ephesus', 27.34, 37.94, 12, -4, 'start'], ['Mytilene', 26.56, 39.1, 12, -6, 'start'], ['Rhodes', 28.2, 36.45, -8, 28, 'middle'], ['Knossos', 25.16, 35.3, 0, -16, 'middle'],
  ];
  let dotsM = '';
  dots.forEach(([n, lo, la, dx, dy, an], i) => {
    const [x, y] = map.project(lo, la);
    dotsM += `<g class="pdot" data-i="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="pd-in"><circle r="14" fill="${C.terracotta}" opacity=".22"/><circle r="6" fill="${C.terracotta}" stroke="${C.ivory}" stroke-width="2.2"/>
      <text x="${dx}" y="${dy}" text-anchor="${an}" font-family="Cinzel, serif" font-weight="700" font-size="17" letter-spacing="2.4" fill="${C.blue}" stroke="#F3E7C9" stroke-width="4" paint-order="stroke">${n.toUpperCase()}</text></g></g>`;
  });
  const factY = [250, 330, 410];
  const facts = [['Its own laws', '<path d="M8 8h18v26H8zM12 15h10M12 21h10M12 27h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
    ['Its own patron god', '<path d="M20 4 10 22h8l-2 14 14-20h-8l4-12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'],
    ['Its own army', '<path d="M8 34V20c0-9 5-14 12-14s12 5 12 14v14M14 34v-8h12v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>']];
  const mapEl = sc.add(ui, `<g class="polismap" opacity="0">
    <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4" fill="#F0E4C8" stroke="${C.bronze}" stroke-width="2"/>
    <rect x="${PX + 10}" y="${PY + 10}" width="${PW - 20}" height="${PH - 20}" rx="2" fill="none" stroke="${C.bronze}" stroke-width="1" opacity=".6"/>
    ${S.meander({ x: PX + 24, y: PY + PH - 36, w: PW - 48, h: 16, c: C.bronze, sw: 1.8 })}
    <g transform="translate(${PX + 36} ${PY + 36})"><clipPath id="mclip"><rect width="${MW}" height="${MH - 34}" rx="2"/></clipPath><g clip-path="url(#mclip)">${map.markup}${dotsM}</g><rect width="${MW}" height="${MH - 34}" rx="2" fill="none" stroke="${C.bronze}" stroke-width="1.5"/></g>
    <text x="${PX + 776}" y="${PY + 84}" font-family="Cinzel, serif" font-weight="700" font-size="40" letter-spacing="5" fill="${C.blue}">POLEIS</text>
    <text x="${PX + 776}" y="${PY + 118}" font-family="'EB Garamond', serif" font-style="italic" font-size="23" fill="${C.charcoal}">Independent city-states,</text>
    <text x="${PX + 776}" y="${PY + 146}" font-family="'EB Garamond', serif" font-style="italic" font-size="23" fill="${C.charcoal}">hundreds of them.</text>
    <path d="M${PX + 776} ${PY + 170} h260" stroke="${C.bronze}" stroke-width="1.4"/>
    ${facts.map(([t, ic], i) => `<g class="fact" data-i="${i}" transform="translate(${PX + 776} ${PY + 205 + i * 84})"><g color="${C.terracotta}" transform="translate(0 0)">${ic}</g><text x="54" y="26" font-family="Cinzel, serif" font-weight="600" font-size="20" letter-spacing="1.1" fill="${C.blue}">${t}</text></g>`).join('')}
  </g>`);

  // ------------------------------------------------------------------ atmosphere
  sc.add(sky, S.flock({ n: 5, x: 200, y: 240, s: 0.7, vx: 18, spread: 70 }));
  sc.particle('motes', { n: 34, color: ['#FFF0C8', '#FFE2A0'], op: 0.45, size: 2, vx: 0.004, vy: -0.002 });
  const tint = sc.tint('#1c2550');
  sc.root.insertBefore(tint, ui.svg); // dim the scene, never the map card

  // ================================================================== STORY
  cam.x = 700; cam.y = 575; cam.z = 0.86;
  sc.pan(0, 7, { x: 880, y: 560, z: 1.0 }, 'power2.inOut');
  sc.pan(7, 9, { x: 900, y: 556 }, 'sine.inOut');
  sc.pan(16, 8, { x: 1010, y: 590, z: 1.1 }, 'power2.inOut');
  sc.pan(24, 10, { x: 960, y: 570, z: 0.95 }, 'power2.inOut');

  // map in / out
  const inner = mapEl;
  gsap.set(inner, { opacity: 0, y: 40, scale: 0.94, transformOrigin: '800px 420px' });
  tl.to(tint, { opacity: 0.38, duration: 0.8 }, 8.0);
  tl.to(inner, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' }, 8.2);
  mapEl.querySelectorAll('.pdot').forEach((d, i) => {
    const pin = d.querySelector('.pd-in');
    gsap.set(pin, { opacity: 0, scale: 0, transformOrigin: '0px 0px' });
    tl.to(pin, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.4)' }, 9.2 + i * 0.5);
  });
  mapEl.querySelectorAll('.fact').forEach((f, i) => {
    // GSAP takes over the translate() attribute, so animate the absolute x (PX+790), not 0
    gsap.set(f, { opacity: 0, x: PX + 794 });
    tl.to(f, { opacity: 1, x: PX + 776, duration: 0.7, ease: 'power3.out' }, 11.8 + i * 1.0);
  });
  tl.to(inner, { opacity: 0, y: -26, duration: 0.8, ease: 'power2.in' }, 16.0);
  tl.to(tint, { opacity: 0, duration: 0.9 }, 16.0);

  // water-bearer crosses; kids run
  water.walk(tl, 0.2, 1960, 33, { ease: 'none', face: false });
  kidA.walk(tl, 1.0, 780, 3.2, { run: 0.8, ease: 'sine.inOut' });
  kidB.walk(tl, 1.5, 700, 3.0, { run: 0.8, ease: 'sine.inOut' });
  kidA.walk(tl, 4.4, 470, 3.2, { run: 0.8, ease: 'sine.inOut' });
  kidB.walk(tl, 4.7, 400, 3.2, { run: 0.8, ease: 'sine.inOut' });
  kidA.walk(tl, 8.0, 760, 3.0, { run: 0.8, ease: 'sine.inOut' });
  kidB.walk(tl, 8.2, 700, 3.0, { run: 0.8, ease: 'sine.inOut' });
  tl.set(kidA.p, { facing: -1 }, 11.2); tl.set(kidB.p, { facing: 1 }, 11.2);
  kidA.go(tl, 11.2, 0.6, { head: -10 });

  // the orator: gestures in rhythm
  let k = 0;
  for (let t = 15.5; t < 31; t += 1.55) {
    const a = k++ % 3;
    orator.go(tl, t, 0.7, a === 0 ? { armF: 122, elbowF: 36, armB: 20, elbowB: 56, lean: 5 } : a === 1 ? { armF: 70, elbowF: 60, armB: 110, elbowB: 40, lean: 2 } : { armF: 150, elbowF: 18, armB: 14, elbowB: 52, lean: 7 }, 'sine.inOut');
  }
  orator.go(tl, 31.2, 1.2, 'relaxed');
  // citizens vote by raised hand
  crowd.forEach((c, i) => {
    c.go(tl, 19.6 + i * 0.12, 0.5, { armF: 168, elbowF: 6 }, 'back.out(1.6)');
    c.go(tl, 22.2 + i * 0.05, 0.9, { armF: 8, elbowF: 18 });
  });

  // buyers & sellers
  tl.to(buyer1.p, { armF: 96, elbowF: 40, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 6);

  // the narrow circle, then those left outside
  tl.set(ring, { opacity: 1 }, 24.4);
  tl.fromTo(ringLine, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 3.2, ease: 'power2.inOut' }, 24.6);
  tl.to(shaft, { opacity: 1, duration: 2.6, ease: 'power1.inOut' }, 24.8);
  tl.to(foreigner.p, { opacity: 1, duration: 0.01 }, 24);
  foreigner.walk(tl, 24, 1690, 3.4, { ease: 'sine.out', face: false });
  foreigner.go(tl, 28.2, 1.2, { head: 8, armF: 130, elbowF: 40 });
  tl.set(porter.p, { opacity: 1 }, 25);
  porter.walk(tl, 25, 1150, 8.5, { ease: 'none', face: false });
  tl.set(water.p, { facing: 1 }, 0);
  sc.cue('murmur', 0.5);
}
