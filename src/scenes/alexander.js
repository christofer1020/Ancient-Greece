// Chapter 7 — Alexander: a hero shot, then the campaign unfolds across an old parchment map.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { WIDE, makeProjection } from '../art/geo.js';
import { rng, smoothPath, softPath, fbm } from '../art/util.js';

const ptsPath = (pts, proj, close = true) => 'M' + pts.map(([lo, la]) => proj.project(lo, la).map((v) => v.toFixed(1)).join(' ')).join(' L') + (close ? ' Z' : '');

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const heroBox = sc.clipbox('none');
  const mapBox = sc.clipbox('circle(0% at 76% 62%)');
  const H = (n, d) => sc.layer(n, d, { host: heroBox });
  const sky = H('sky', 0.03), far = H('far', 0.1), army = H('army', 0.4), fig = H('fig', 1.0), fg = H('fg', 1.3);

  // =================================================================== HERO SHOT
  sc.add(sky, S.sky([[0, '#4A3558'], [0.28, '#A8554A'], [0.5, '#E3944F'], [0.72, '#F4C27C'], [1, '#F6DDA2']], { y0: -400, h: 1100 }));
  sc.add(sky, S.sun({ x: 520, y: 470, r: 80, glowR: 800, glow: '#FFC070', core: '#FFF2CF', op: 1 }));
  sc.add(sky, S.rays({ x: 520, y: 470, n: 13, spread: 130, dir: -90, len: 1500, op: 0.18, color: '#FFD494' }));
  sc.add(sky, S.driftCloud({ x: 980, y: 150, s: 1.6, tone: 'dusk', seed: 301, w: 1.6, vx: 4, op: 0.9 }));
  sc.add(sky, S.driftCloud({ x: 200, y: 220, s: 1.2, tone: 'gold', seed: 303, w: 1.3, vx: 3, op: 0.9 }));
  sc.add(far, S.mountains({ base: 640, amp: 180, lit: '#B7787A', shade: '#573D5E', seed: 305, light: 1 }));
  sc.add(far, S.hills({ base: 652, amp: 18, top: '#9A7068', bottom: '#7A5A60', seed: 9, freq: 0.008 }));
  const plainG = S.grad([[0, '#D8A768'], [1, '#8E5E3C']]);
  sc.add(army, `<defs>${plainG.def}</defs><path d="M-1200 668 C-200 660 800 676 1600 670 L2800 676 L2800 1400 L-1200 1400 Z" fill="${plainG.ref}"/>`);
  // distant mass of pikemen (static silhouettes)
  let mass = '';
  const rr = rng(21);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 26; i++) {
    const x = 760 + i * 36 + (r % 2) * 14 + rr.range(-5, 5), y = 684 + r * 11, s = 0.42 + r * 0.04;
    mass += `<g transform="translate(${x.toFixed(0)} ${y}) scale(${s})"><line x1="0" y1="0" x2="0" y2="-190" stroke="#5B4430" stroke-width="3"/><path d="M0 -200 L4 -184 L-4 -184 Z" fill="#C9A66B"/><path d="M-7 0 L7 0 L6 -34 L-6 -34 Z" fill="#8E2E27"/><circle cy="-42" r="6.5" fill="${C.charcoal}"/><path d="M-7 -44 C-7 -54 7 -54 7 -44 Z" fill="#B88A4A"/></g>`;
  }
  sc.add(army, mass);
  // the foreground phalanx: pike forest (rigged)
  const phalanx = [];
  [[1180, 722, 1.1], [1260, 738, 1.18], [1340, 722, 1.1], [1420, 738, 1.18], [1500, 722, 1.1], [1230, 764, 1.28], [1310, 776, 1.34], [1390, 764, 1.28], [1470, 776, 1.34]].forEach(([x, y, s], i) => {
    const f = sc.fig(army, { x, y, s, outfit: 'chiton', color: '#B9402F', trim: C.ivory, helmet: true, crest: '#E8E0C8', cuirass: '#B79556', cloak: '#9C2F22', cloakType: 'back', facing: -1 });
    f.set('guard'); f.hold('B', 'sarissa', { len: 300, mode: 'world', rot: 6 }); f.hold('F', 'shield', { r: 22, emblem: 'star', face: C.bronze, emblemColor: '#F0D68A', mode: 'world' });
    f.p.armB = 78; f.p.elbowB = 40; f.p.cape = 0.25;
    phalanx.push(f);
  });
  const gg = S.grad([[0, '#C99560'], [1, '#6E4630']]);
  sc.add(fig, `<defs>${gg.def}</defs><path d="M-1200 760 C-200 750 800 770 1600 764 L2800 770 L2800 1400 L-1200 1400 Z" fill="${gg.ref}"/>`);
  sc.add(fig, S.grass(-300, 800, 2000, '#9A6F3C', 3, 0.04));

  // Bucephalus & Alexander
  const horse = sc.horse(fig, { x: 520, y: 800, s: 1.7, coat: '#2E2624', coatLt: '#6A5850', mane: '#14100E', blanket: '#B7262E', trim: '#E0BE62', seed: 5 });
  Object.assign(horse.p, { pitch: 38, fa: 78, fak: 100, fb: 64, fbk: 112, head: 16, neck: 16, tail: 18, shadow: 0.9 });
  const alex = new (sc.figs[0].constructor)(sc, horse.r.rider, { x: -20, y: -135, s: 1.0, outfit: 'chiton', color: '#E9DDBB', trim: '#C9A24A', helmet: true, crest: '#E8E0C8', cuirass: '#C7A45A', cloak: '#B7262E', cloakType: 'back', facing: 1, anchor: 'hip', idle: 0.5, hem: 0.34 });
  alex.p.shadow = 0;
  alex.set({ legF: 64, kneeF: 70, legB: 50, kneeB: 80, armF: 150, elbowF: 18, armB: 36, elbowB: 70, lean: 8, head: -4, cape: 1 });
  alex.hold('F', 'sword', { mode: 'world', len: 70 });
  sc.tick(() => { alex.p.holdF = -(22 + horse.p.pitch); });

  sc.add(fg, S.grass(-300, 930, 2400, '#B58A4C', 8, 0.05));
  sc.add(fg, S.rock(180, 940, 2.4, '#8F6A52'));
  sc.add(sky, S.flock({ n: 5, x: 0, y: 200, s: 0.8, vx: 24, spread: 80, seed: 11 }));
  sc.particle('motes', { n: 46, color: ['#F2D2A0', '#E4B878', '#FFE2B0'], op: 0.55, size: 3.2, vx: 0.03, vy: -0.004 });

  // =================================================================== MAP
  const M = sc.layer('map', 0, { host: mapBox });
  const proj = makeProjection(WIDE.bounds, 1600, 900, 1.28);
  const P = (lo, la) => proj.project(lo, la);
  const parch = S.grad([[0, '#EFE0BC'], [1, '#DFC99A']], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const fine = [];
  // water + coast
  let water = '';
  const wcol = '#B8CBCD';
  for (const k of Object.keys(WIDE.water)) water += `<path d="${ptsPath(WIDE.water[k], proj)}" fill="${wcol}" stroke="${C.bronze}" stroke-width="1.8" stroke-linejoin="round"/>`;
  for (const isl of WIDE.islands) water += `<path d="${ptsPath(isl, proj)}" fill="#E8D5AA" stroke="${C.bronze}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // double coast line
  let coast2 = '';
  for (const k of Object.keys(WIDE.water)) coast2 += `<path d="${ptsPath(WIDE.water[k], proj)}" fill="none" stroke="${C.bronze}" stroke-width="7" stroke-linejoin="round" opacity=".13"/>`;
  // rivers
  const river = (pts, w = 3) => `<path d="${smoothPath(pts.map(([lo, la]) => P(lo, la)))}" fill="none" stroke="#9FB8BE" stroke-width="${w}" stroke-linecap="round"/>`;
  const rivers = river([[31.3, 31.4], [31.1, 28], [32.5, 25], [32.7, 21]], 4) + river([[38.5, 37], [41, 35.5], [44, 33], [44.4, 32.4], [47, 31]], 3) + river([[41, 38], [43, 36.5], [45, 33.5], [47.5, 31.2]], 3) + river([[71, 34.5], [71.5, 31.5], [69, 28], [67.5, 25]], 3.4) + river([[66, 39.5], [64.5, 37.8]], 2.6);
  // mountains (carets) along ranges
  let mtn = '';
  const range = (pts, n, sz = 9) => {
    const r = rng(pts.length * 13 + n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
      const u = t * (pts.length - 1) - a;
      const lo = pts[a][0] + (pts[a + 1][0] - pts[a][0]) * u + r.range(-0.5, 0.5), la = pts[a][1] + (pts[a + 1][1] - pts[a][1]) * u + r.range(-0.3, 0.3);
      const [x, y] = P(lo, la), z = sz * r.range(0.8, 1.3);
      mtn += `<path d="M${(x - z).toFixed(1)} ${(y + z * 0.7).toFixed(1)} L${x.toFixed(1)} ${(y - z).toFixed(1)} L${(x + z).toFixed(1)} ${(y + z * 0.7).toFixed(1)}" fill="none" stroke="#9A7B52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x.toFixed(1)} ${(y - z).toFixed(1)} L${(x + z * 0.35).toFixed(1)} ${(y + z * 0.7).toFixed(1)}" stroke="#9A7B52" stroke-width="1.4" opacity=".6"/>`;
    }
  };
  range([[30, 37.5], [34, 37.2], [38, 38.2]], 12);       // Taurus
  range([[44, 37], [47, 33.5], [50, 30.8], [54, 28.5]], 22); // Zagros
  range([[62, 38], [66, 36.2], [70, 35.5], [74, 36.5]], 18, 10); // Hindu Kush
  range([[19, 44], [22, 42], [20.5, 40]], 8, 8);         // Balkans
  range([[8, 36.5], [12, 36], [10, 34]], 6, 7);
  // stippled deserts
  let stip = '';
  const rs = rng(5);
  for (let i = 0; i < 260; i++) { const lo = rs.range(10, 38), la = rs.range(22, 30); const [x, y] = P(lo, la); stip += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="1.4" fill="#B79A62" opacity=".5"/>`; }
  for (let i = 0; i < 160; i++) { const lo = rs.range(38, 55), la = rs.range(21, 28); const [x, y] = P(lo, la); stip += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="1.4" fill="#B79A62" opacity=".5"/>`; }
  // region names
  const rname = (lo, la, t, size = 20, rot = 0) => { const [x, y] = P(lo, la); return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})" text-anchor="middle" font-family="Cinzel, serif" font-weight="600" font-size="${size}" letter-spacing="${size * 0.42}" fill="#8A5A2B" opacity=".6">${t}</text>`; };
  const sname = (lo, la, t, size = 18) => { const [x, y] = P(lo, la); return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" text-anchor="middle" font-family="'EB Garamond', serif" font-style="italic" font-size="${size}" letter-spacing="3" fill="#4A6B80" opacity=".8">${t}</text>`; };
  const names = rname(22.5, 44.5, 'MACEDON', 17) + rname(55.5, 34.6, 'PERSIA', 30, -6) + rname(30, 26, 'EGYPT', 24) + rname(67, 36.2, 'BACTRIA', 17, -4) + rname(74, 28.4, 'INDIA', 26, -80) + rname(44, 26, 'ARABIA', 24) + rname(34, 41.8, 'ASIA MINOR', 15)
    + sname(18, 34, 'Mediterranean Sea', 21) + sname(34.5, 43.7, 'Black Sea', 17) + sname(50.5, 41.6, 'Caspian', 15) + sname(52, 25, 'Persian Gulf', 15) + sname(66, 21.4, 'Arabian Sea', 18) + sname(35.4, 21.5, 'Red Sea', 14);
  // compass rose
  const [cx0, cy0] = [1500, 170];
  const compass = `<g transform="translate(${cx0} ${cy0})" opacity=".85"><circle r="46" fill="none" stroke="${C.bronze}" stroke-width="1.4"/><circle r="38" fill="none" stroke="${C.bronze}" stroke-width=".8" stroke-dasharray="2 4"/>
    <path d="M0 -58 L9 0 L0 58 L-9 0 Z" fill="${C.terracotta}" opacity=".85"/><path d="M-58 0 L0 -9 L58 0 L0 9 Z" fill="${C.bronze}" opacity=".6"/><path d="M0 -58 L9 0 L0 0 Z" fill="${darken(C.terracotta, .2)}"/>
    <text y="-66" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="17" fill="${C.blue}">N</text></g>`;

  // route
  const CITY = {
    pella: [22.55, 40.76, 'PELLA'], granicus: [27.3, 40.2, 'GRANICUS'], gordium: [31.95, 39.65, ''], issus: [36.2, 36.85, 'ISSUS'], tyre: [35.2, 33.3, 'TYRE'], alexandria: [29.9, 31.2, 'ALEXANDRIA'], memphis: [31.25, 29.85, ''],
    gaza: [34.45, 31.45, ''], pelusium: [32.6, 31.0, ''], rt1: [33.6, 31.1, ''], rt2: [36.4, 34.2, ''], thaps: [38.4, 36.0, ''], gaugamela: [43.3, 36.5, 'GAUGAMELA'], babylon: [44.4, 32.5, 'BABYLON'], susa: [48.2, 32.2, ''], persepolis: [52.9, 29.95, 'PERSEPOLIS'], ecbatana: [48.5, 34.8, ''], bactra: [66.9, 36.8, 'BACTRA'], hydaspes: [73.5, 32.6, 'HYDASPES'], alexE: [69.7, 40.3, 'ALEXANDRIA ESCHATE'], pattala: [68, 24.8, ''],
  };
  const routeKeys = ['pella', 'granicus', 'gordium', 'issus', 'tyre', 'memphis', 'alexandria'];
  const mainKeys = ['pella', 'granicus', 'gordium', 'issus', 'tyre', 'gaza', 'pelusium', 'memphis', 'rt1', 'rt2', 'thaps', 'gaugamela', 'babylon', 'susa', 'persepolis', 'ecbatana', 'bactra', 'hydaspes'];
  const routePts = mainKeys.map((k) => P(CITY[k][0], CITY[k][1]));
  const routeD = softPath(routePts);
  const returnPts = ['hydaspes', 'pattala', 'babylon'].map((k) => P(CITY[k][0], CITY[k][1]));
  const returnD = softPath([returnPts[0], [returnPts[0][0] - 70, returnPts[0][1] + 210], returnPts[1], [returnPts[1][0] - 340, returnPts[1][1] - 120], returnPts[2]]);

  let cityMarks = '';
  const cityEls = {};
  Object.entries(CITY).forEach(([k, [lo, la, label]]) => {
    if (!label) return;
    const [x, y] = P(lo, la);
    const dy = k === 'tyre' ? 24 : k === 'alexandria' ? 30 : k === 'pella' ? -14 : k === 'granicus' ? -14 : k === 'gaugamela' ? -14 : k === 'issus' ? 22 : k === 'babylon' ? 26 : k === 'persepolis' ? 26 : k === 'hydaspes' ? 26 : k === 'bactra' ? 24 : -14;
    const dx = k === 'tyre' ? 8 : k === 'issus' ? 4 : 0;
    cityMarks += `<g class="city" data-k="${k}" opacity="0" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="cm"><circle r="8" fill="${C.terracotta}" opacity=".25"/><circle r="4.2" fill="${C.terracotta}" stroke="${C.ivory}" stroke-width="1.8"/>
      <text x="${dx}" y="${dy}" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="${label.length > 12 ? 12 : 14}" letter-spacing="2" fill="${C.blue}" stroke="#F3E7C9" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${label}</text></g></g>`;
  });
  // Alexandria pins (Greek cities founded)
  const alexPins = [['alexandria', 'Αλεξάνδρεια', -1], ['alexE', 'Αλεξάνδρεια Ἐσχάτη', 1], ['pattala', '', 0]];
  // Hellenistic kingdoms
  const kingdom = (pts, fill, label, lx, ly) => `<g class="kd" opacity="0"><path d="${smoothPath(pts.map(([lo, la]) => P(lo, la)), true)}" fill="${fill}" opacity=".34" stroke="${fill}" stroke-width="3" stroke-opacity=".7" stroke-linejoin="round"/>
    <text x="${P(lx, ly)[0].toFixed(0)}" y="${P(lx, ly)[1].toFixed(0)}" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="22" letter-spacing="6" fill="${darken(fill, .35)}" stroke="#F3E7C9" stroke-width="5" paint-order="stroke">${label}</text></g>`;
  const empire = `<g class="emp" opacity="0"><path d="${smoothPath([[19.5, 41.5], [27, 41.5], [35, 40], [44, 38.5], [55, 38.5], [66, 40.5], [72, 38], [75, 33], [74, 29], [68, 25.5], [58, 25.5], [49, 28], [41, 30], [37, 29], [34, 25], [27, 28.5], [24, 31.2], [22, 34], [20.5, 38]].map(([lo, la]) => P(lo, la)), true)}" fill="${C.terracotta}" opacity=".24" stroke="${C.terracotta}" stroke-width="3.4" stroke-opacity=".75" stroke-dasharray="10 6" stroke-linejoin="round"/></g>`;
  const kingdoms = kingdom([[19.8, 41.3], [26, 41.5], [26.5, 38.8], [21, 38.2]], C.blue, 'ANTIGONIDS', 23, 43.2)
    + kingdom([[24.5, 32.4], [34.4, 32.2], [35, 23.5], [25, 23.5]], C.olive, 'PTOLEMIES', 29.5, 25.2)
    + kingdom([[28, 40.2], [44, 40.8], [60, 40.2], [66, 36], [66, 30.4], [54, 28], [44, 30.6], [36, 33], [35.2, 37], [30, 37.5]], C.red, 'SELEUCIDS', 49, 36.2);
  const routeEl = `<path class="route-back" d="${routeD}" fill="none" stroke="${C.terracotta}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".16"/>
    <path class="route" d="${routeD}" pathLength="1" fill="none" stroke="${C.red}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1"/>
    <path class="route-return" d="${returnD}" pathLength="1" fill="none" stroke="${C.bronze}" stroke-width="3.2" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="round" opacity=".9"/>`;
  const frame = `<rect x="14" y="14" width="1572" height="872" fill="none" stroke="${C.bronze}" stroke-width="2.4"/><rect x="26" y="26" width="1548" height="848" fill="none" stroke="${C.bronze}" stroke-width="1" opacity=".7"/>`;
  // Greek letter bloom
  const letters = 'ΑΒΓΔΕΖΗΘΛΩΣΦ'.split('');
  const blooms = [];
  const bloomG = [];
  ['alexandria', 'alexE', 'pattala', 'persepolis', 'bactra'].forEach((k, ki) => {
    const [x, y] = P(CITY[k][0], CITY[k][1]);
    letters.slice(ki % 4, ki % 4 + 8).forEach((l, i) => {
      const a = -Math.PI + (i / 7) * Math.PI, r = 40 + (i % 3) * 14;
      bloomG.push(`<text class="gl" x="${(x + Math.cos(a) * r * 1.3).toFixed(0)}" y="${(y + Math.sin(a) * r * 0.95 - 12).toFixed(0)}" text-anchor="middle" font-family="'GFS Didot', serif" font-size="${15 + (i % 3) * 4}" fill="${C.blue}" stroke="#F3E7C9" stroke-width="3" paint-order="stroke" opacity="0" data-k="${k}">${l}</text>`);
    });
    bloomG.push(`<circle class="rpl" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="30" fill="none" stroke="${C.blue}" stroke-width="2.4" opacity="0" data-k="${k}"/>`);
  });
  // Pharos lighthouse at Alexandria
  const [ax, ay] = P(...CITY.alexandria.slice(0, 2));
  const pharos = `<g class="pharos" opacity="0" transform="translate(${(ax - 26).toFixed(0)} ${(ay - 20).toFixed(0)}) scale(.8)"><path d="M-8 20 L-5 -4 L5 -4 L8 20 Z" fill="${C.ivory}" stroke="${C.bronze}" stroke-width="1.6"/><path d="M-5 -4 L-3 -22 L3 -22 L5 -4 Z" fill="${C.sandstone}" stroke="${C.bronze}" stroke-width="1.4"/><path d="M-4 -22 L0 -30 L4 -22 Z" fill="${C.terracotta}"/><circle cy="-34" r="3" fill="#FFD27A"/></g>`;
  // marker (Vergina sun)
  const sun16 = (() => { let r = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; r += `<path d="M${(Math.cos(a) * 7).toFixed(1)} ${(Math.sin(a) * 7).toFixed(1)} L${(Math.cos(a) * (i % 2 ? 12 : 15)).toFixed(1)} ${(Math.sin(a) * (i % 2 ? 12 : 15)).toFixed(1)}" stroke="#C9A24A" stroke-width="2.2" stroke-linecap="round"/>`; } return r; })();
  const marker = `<g class="mk"><g class="mkr" opacity="0"><circle r="18" fill="#FFE9A8" opacity=".5"/><circle r="9" fill="#C9A24A" stroke="#6E5420" stroke-width="1.5"/>${sun16}</g></g>`;
  const tags = `<g class="death" opacity="0" transform="translate(${P(44.4, 32.5)[0].toFixed(0)} ${(P(44.4, 32.5)[1] - 70).toFixed(0)})"><text text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="30" letter-spacing="6" fill="${C.red}" stroke="#F3E7C9" stroke-width="6" paint-order="stroke">323 BCE</text><text y="26" text-anchor="middle" font-family="'EB Garamond', serif" font-style="italic" font-size="19" fill="${C.charcoal}" stroke="#F3E7C9" stroke-width="4" paint-order="stroke">Alexander dies in Babylon</text><path d="M0 40 V62" stroke="${C.red}" stroke-width="2"/></g>`;
  const tagStart = `<g class="tag336" opacity="0" transform="translate(${P(22.55, 40.76)[0].toFixed(0)} ${(P(22.55, 40.76)[1] - 66).toFixed(0)})"><text text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="26" letter-spacing="6" fill="${C.blue}" stroke="#F3E7C9" stroke-width="6" paint-order="stroke">336 BCE</text><path d="M0 12 V44" stroke="${C.blue}" stroke-width="2"/></g>`;

  sc.add(M, `<defs>${parch.def}</defs><rect x="-800" y="-600" width="3200" height="2100" fill="${parch.ref}"/>`);
  const root = sc.add(M, `<g class="maproot"><rect x="-800" y="-600" width="3200" height="2100" fill="url(#${parch.id})"/>
    <g class="paper-fade"><rect x="-800" y="-600" width="3200" height="2100" fill="#E8D4A6" opacity=".25"/></g>
    ${coast2}${water}${stip}${rivers}${mtn}${names}${empire}${kingdoms}${routeEl}${cityMarks}${bloomG.join('')}${pharos}${tagStart}${tags}${marker}${compass}${frame}</g>`);
  const q = (s) => root.querySelector(s);
  const route = q('.route'), routeBack = q('.route-back'), routeRet = q('.route-return');
  const cities = [...root.querySelectorAll('.city')];
  const emp = q('.emp'), kds = [...root.querySelectorAll('.kd')], gls = [...root.querySelectorAll('.gl')], rpls = [...root.querySelectorAll('.rpl')];
  const mkr = q('.mkr'), mk = q('.mk'), death = q('.death'), pharosEl = q('.pharos'), tag336 = q('.tag336');
  // helper to get length-based position along the route
  const rlen = route.getTotalLength();
  const prog = { u: 0 };
  const ptAt = (u) => route.getPointAtLength(Math.max(0, Math.min(1, u)) * rlen);
  mk.style.visibility = 'visible';
  const upd = () => { const p = ptAt(prog.u); mk.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); route.style.strokeDashoffset = String(1 - prog.u); routeBack.style.strokeDasharray = ''; };
  sc.tick(upd);
  // initial map state
  gsap.set(root, { svgOrigin: '0 0', x: 0, y: 0, scale: 1 });
  const focus = (lo, la, k, at, dur, ease = 'power2.inOut') => {
    const [x, y] = P(lo, la);
    tl.to(root, { x: 800 - k * x, y: 450 - k * y, scale: k, duration: dur, ease }, at);
  };
  // sets initial state
  const [sx0, sy0] = P(25, 39);
  gsap.set(root, { x: 800 - 1.6 * sx0, y: 450 - 1.6 * sy0, scale: 1.6 });
  // mapBox shield for portrait: nothing

  // =================================================================== STORY
  cam.x = 800; cam.y = 480; cam.z = 1.0;
  sc.pan(0, 8.5, { x: 860, y: 450, z: 1.1 }, 'sine.inOut');

  // hero beats
  phalanx.forEach((f, i) => { tl.to(f.p, { lean: 8, duration: 0.7, yoyo: true, repeat: 6, ease: 'sine.inOut' }, 1 + i * 0.06); });
  tl.to(horse.p, { pitch: 30, fa: 60, fb: 52, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 2 }, 1.2);
  alex.go(tl, 3.6, 0.9, { armF: 166, elbowF: 6 });
  tl.to(alex.p, { elbowF: 30, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 4.6);
  sc.cue('whinny', 2.8);
  // drops to all fours, charges away
  tl.to(horse.p, { pitch: 0, fa: 0, fak: 0, fb: 0, fbk: 0, head: 0, neck: 0, duration: 0.7, ease: 'power2.in' }, 8.2);
  alex.go(tl, 8.2, 0.7, { lean: 16, armF: 130, elbowF: 20, legF: 56, kneeF: 62 });
  horse.gallopTo(tl, 8.9, 2300, 2.4, { amp: 1, ease: 'power1.in' });
  sc.cue('gallop', 8.9);
  tl.to(heroBox, { autoAlpha: 0, duration: 0.01 }, 11.4);

  // the iris onto the map
  const iris = (v) => `circle(${v}% at 76% 62%)`;
  tl.fromTo(mapBox, { clipPath: iris(0), webkitClipPath: iris(0) }, { clipPath: iris(150), webkitClipPath: iris(150), duration: 2.0, ease: 'power2.inOut' }, 9.0);

  // route draws; camera follows the head
  tl.set(tag336, { opacity: 0 }, 0);
  tl.to(tag336, { opacity: 1, duration: 0.6 }, 10.4);
  tl.to(tag336, { opacity: 0, duration: 0.6 }, 13.5);
  tl.to(mkr, { opacity: 1, duration: 0.4 }, 10.6);
  tl.fromTo(prog, { u: 0 }, { u: 1, duration: 9.2, ease: 'sine.inOut' }, 10.8);
  const at = (k) => 10.8 + 9.2 * (0.0); // placeholder
  const showCity = (k, t) => { const c = cities.find((e) => e.dataset.k === k); if (c) { gsap.set(c, { opacity: 0 }); tl.fromTo(c, { opacity: 0, scale: 0.5, transformOrigin: '0px 0px' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.2)' }, t); } };
  const u0 = 10.8, dur = 9.2;
  // cumulative fractions (approx, by segment length)
  const segLens = []; let tot = 0; for (let i = 1; i < routePts.length; i++) { const d = Math.hypot(routePts[i][0] - routePts[i - 1][0], routePts[i][1] - routePts[i - 1][1]); segLens.push(d); tot += d; }
  const frac = {}; let acc = 0; mainKeys.forEach((k, i) => { if (i) acc += segLens[i - 1]; frac[k] = acc / tot; });
  const easeS = (u) => 0.5 - Math.cos(Math.PI * u) / 2; // matches sine.inOut
  const timeFor = (u) => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (easeS(m) < u) lo = m; else hi = m; } return u0 + dur * lo; };
  ['pella', 'granicus', 'issus', 'tyre', 'gaugamela', 'babylon', 'persepolis', 'bactra', 'hydaspes'].forEach((k) => showCity(k, timeFor(frac[k]) - 0.1));
  showCity('alexandria', timeFor(frac.memphis) + 0.5);
  // camera on the map
  focus(25, 39, 1.6, 9.0, 0.01);
  focus(30, 37, 1.5, 10.8, 2.8, 'sine.inOut');
  focus(36, 34, 1.45, 13.6, 2.6, 'sine.inOut');
  focus(47, 33.5, 1.45, 16.2, 3.6, 'sine.inOut');
  focus(60, 34.5, 1.45, 19.2, 3.4, 'sine.inOut');
  tl.to(emp, { opacity: 1, duration: 2.0 }, 20.0);
  // Alexandrias and the spread of Greek
  gls.forEach((g, i) => {
    const key = g.dataset.k;
    const base = key === 'alexandria' ? 21.0 : key === 'alexE' ? 22.6 : key === 'pattala' ? 23.4 : key === 'persepolis' ? 24.0 : 24.6;
    tl.fromTo(g, { opacity: 0, y: 8 }, { opacity: 0.95, y: -6, duration: 0.8, ease: 'power2.out' }, base + (i % 8) * 0.12);
  });
  rpls.forEach((r) => {
    const key = r.dataset.k;
    const base = key === 'alexandria' ? 21.0 : key === 'alexE' ? 22.6 : key === 'pattala' ? 23.4 : key === 'persepolis' ? 24.0 : 24.6;
    tl.fromTo(r, { opacity: 0.9, scale: 0.4, transformOrigin: '50% 50%', svgOrigin: `${r.getAttribute('cx')} ${r.getAttribute('cy')}` }, { opacity: 0, scale: 3.2, duration: 2.2, ease: 'power2.out' }, base);
  });
  tl.to(pharosEl, { opacity: 1, duration: 0.8 }, 21.0);
  // camera tour of the new cities
  focus(36, 32, 1.9, 19.8, 0.01);
  focus(30.5, 31.2, 2.4, 20.2, 2.0, 'power2.inOut');
  focus(56, 34, 1.4, 22.4, 3.2, 'sine.inOut');
  focus(69, 35, 1.6, 25.4, 2.4, 'sine.inOut');
  // Babylon, 323 BCE
  focus(44.4, 32.5, 1.9, 27.4, 3.0, 'power2.inOut');
  tl.to(routeRet, { strokeDashoffset: 0, duration: 3.0, ease: 'sine.inOut' }, 26.4);
  tl.to(death, { opacity: 1, duration: 1.0 }, 29.4);
  tl.to(emp, { opacity: 0.0, duration: 1.0 }, 30.6);
  focus(40, 33, 1.12, 31.4, 3.8, 'sine.inOut');
  kds.forEach((k, i) => tl.to(k, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 31.8 + i * 1.1));
  tl.to(death, { opacity: 0, duration: 1.0 }, 33.4);
  sc.cue('chime', 31.8);
}
