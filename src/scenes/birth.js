// Chapter 1 — Birth of the Greek World.
// Asset-driven vertical slice: every visible object is an illustrated cut-out from the approved
// production sheets (assets/), layered in depth and animated with code. Code draws only light and
// atmosphere (sky gradient, sun, rays, haze, glints, shadows, grading) and the map labels.
import gsap from 'gsap';
import * as S from '../art/scenery.js';
import { sprite, strip, asset, hFor, preloadImages } from '../art/sprite.js';
import { Cutout } from '../art/cutout.js';
import { NS, setAttr, rng } from '../art/util.js';

// Everything this chapter shows; decoded before the chapter mounts (see Player.loadModule).
const USES = [
  'mountains_far_soft', 'ch01_bg_islands_blue', 'island_a', 'island_b', 'island_c', 'island_d', 'island_e', 'island_f', 'island_g', 'island_h',
  'sea_band_far', 'sea_tile_base', 'water_highlights', 'wave_overlay',
  'cloud_cumulus_01', 'cloud_cumulus_02', 'cloud_cumulus_03', 'cloud_cumulus_04', 'cloud_cumulus_06', 'cloud_cumulus_07', 'cloud_cumulus_08',
  'gull_01', 'gull_02', 'gull_03',
  'ch01_prop_crete_island_palace', 'ship_boat_small', 'ship_merchant',
  'ch01_prop_mycenae_citadel', 'ch01_bg_hillside_terraces', 'ch01_bg_hillside_terraces_b', 'ch01_bg_settlement', 'village_cluster_a',
  'house_white_a', 'house_white_b', 'smoke_puff_01', 'smoke_puff_02',
  'tree_olive_large', 'tree_olive_medium', 'tree_olive_small', 'tree_olive_b_small', 'tree_cypress_tall', 'tree_cypress_small',
  'ch01_bg_shore_olive_tree', 'ch01_bg_beach_right', 'ch01_bg_rock_in_water', 'rock_a', 'rock_b', 'rock_c',
  'shrub_a', 'shrub_b', 'shrub_c', 'agave', 'grass_tufts_a', 'foliage_overlay',
  'pithos', 'amphora_a', 'amphora_b', 'basket_produce', 'crate', 'fishing_net', 'olive_branch', 'staff',
  'chiton_villager_torso', 'chiton_villager_skirt', 'peplos_villager_torso', 'peplos_villager_skirt',
  'chiton_sailor_torso', 'chiton_sailor_skirt', 'himation_merchant_torso', 'himation_merchant_skirt',
  'himation_elite_torso', 'himation_elite_skirt', 'chiton_youth_torso', 'chiton_youth_skirt',
  'beard_long', 'hair_short', 'headband', 'hat_petasos', 'hair_curls', 'head_neutral',
];
let ready = null;
export function preload() { return (ready ||= preloadImages(USES)); }

const HORIZON = 440; // sea-layer y of the horizon line

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const add = (L, m) => sc.add(L, m);
  // a named depth band inside a parallax plane (keeps the stack readable without extra compositor layers)
  const band = (L, name) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-band', name);
    L.g.appendChild(g);
    return { g, depth: L.depth, name };
  };

  // ================================================================ parallax planes (back to front)
  const skyL = sc.layer('sky', 0.03);
  const cloudL = sc.layer('clouds', 0.06);
  const mtnL = sc.layer('mountains', 0.12);
  const islL = sc.layer('islands', 0.2);
  const seaL = sc.layer('sea', 0.25);
  const nearSea = sc.layer('near-sea', 0.3);
  const shipL = sc.layer('ship', 0.5);
  const mycL = sc.layer('mycenae', 0.6);
  const hillL = sc.layer('hillside', 0.74);
  const townL = sc.layer('settlement', 0.8);
  const treeL = sc.layer('trees', 0.86);
  const ground = sc.layer('ground', 1.0);
  const frontL = sc.layer('front', 1.3);

  const boats = band(nearSea, 'distant-boats');
  const haze = band(nearSea, 'haze');
  let crete;
  const outcrop = band(ground, 'left-outcrop');
  const beach = band(ground, 'right-beach');
  const veg = band(ground, 'vegetation');
  const people = band(ground, 'villagers');
  const props = band(ground, 'props');

  // ================================================================ 1 sky (code: light only)
  const skyG = S.grad([[0, '#6D9CC6'], [0.5, '#A7C6DA'], [0.86, '#EAD9C0'], [1, '#F4E2C4']]);
  add(skyL, `<defs>${skyG.def}</defs><rect x="-1600" y="-700" width="4800" height="1700" fill="${skyG.ref}"/>`);
  const dawnG = S.grad([[0, '#28305F'], [0.42, '#6E5A8A'], [0.74, '#D98E7A'], [0.9, '#F2B07E'], [1, '#F7CB8E']]);
  const dawn = add(skyL, `<g><defs>${dawnG.def}</defs><rect x="-1600" y="-700" width="4800" height="1700" fill="${dawnG.ref}"/></g>`);
  const sunG = add(skyL, `<g>${S.sun({ x: 780, y: 330, r: 46, glowR: 640, core: '#FFF2D2', glow: '#FFD8A0' })}${S.rays({ x: 780, y: 330, n: 13, spread: 140, dir: -90, len: 1500, op: 0.16 })}</g>`);

  // ================================================================ 2 clouds (painted, drifting)
  const clouds = [
    ['cloud_cumulus_04', 300, 250, 330, 3.2], ['cloud_cumulus_03', 1180, 205, 300, 2.6], ['cloud_cumulus_01', 1650, 300, 260, 3.6],
    ['cloud_cumulus_08', 620, 120, 340, 2.0], ['cloud_cumulus_06', 1500, 90, 330, 1.7], ['cloud_cumulus_07', -120, 140, 280, 2.3],
    ['cloud_cumulus_02', 950, 330, 220, 4.0],
  ].map(([k, x, y, w, vx]) => ({ el: add(cloudL, sprite(k, { x, y, w, ay: 0.5, op: 0.95 })), x, y, vx }));
  sc.tick((t) => {
    for (const c of clouds) {
      let x = c.x + t * c.vx;
      if (x > 2300) x -= 2900;
      setAttr(c.el, 'transform', `translate(${x.toFixed(1)} ${c.y})`);
    }
  });

  // ================================================================ 3 far mountains (+ atmospheric haze, code)
  add(mtnL, strip('mountains_far_soft', { x0: -700, y: HORIZON + 50 - 100, w: 2600, n: 2, h: 100, op: 0.92 }));
  add(mtnL, sprite('ch01_bg_islands_blue', { x: 1500, y: HORIZON + 58, w: 760, op: 0.7 }));
  add(mtnL, sprite('ch01_bg_islands_blue', { x: -60, y: HORIZON + 58, w: 620, op: 0.62, flip: true }));
  const mHaze = S.grad([[0, '#F3DDC2', 0], [0.6, '#F3DDC2', 0.45], [1, '#F3DDC2', 0.75]]);
  add(mtnL, `<defs>${mHaze.def}</defs><rect x="-1200" y="${HORIZON - 120}" width="4000" height="190" fill="${mHaze.ref}"/>`);

  // ================================================================ 4 distant islands (sit on the horizon)
  const IB = HORIZON + 38;
  for (const [k, x, w, op] of [['island_h', -240, 330, 0.9], ['island_c', 470, 300, 0.92], ['island_e', 860, 120, 0.8], ['island_f', 990, 96, 0.78],
    ['island_g', 1120, 130, 0.8], ['island_d', 1420, 330, 0.92], ['island_a', 1830, 300, 0.9]]) {
    add(islL, sprite(k, { x, y: IB, w, op }));
  }

  // ================================================================ 5 sea: painted bands in perspective + code glints
  const seaBase = S.grad([[0, '#9DBCCB'], [0.18, '#6E9BBE'], [0.6, '#3D6E9F'], [1, '#2A578A']]);
  add(seaL, `<defs>${seaBase.def}<linearGradient id="seaFeather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="seaRow" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#seaFeather)"/></mask></defs>
    <rect x="-1400" y="${HORIZON}" width="4400" height="900" fill="${seaBase.ref}"/>`);
  add(seaL, strip('sea_band_far', { x0: -1400, y: HORIZON - 1, w: 440, n: 11, h: 70, op: 0.9 }));
  const rows = [];
  for (const [y, h, op, dx] of [[HORIZON + 30, 44, 0.55, 0], [HORIZON + 58, 62, 0.62, -300], [HORIZON + 100, 86, 0.66, -800], [HORIZON + 160, 118, 0.7, -200], [HORIZON + 245, 160, 0.72, -1200], [HORIZON + 360, 220, 0.74, -600]]) {
    const w = h * (asset('sea_tile_base').w / asset('sea_tile_base').h);
    const n = Math.ceil(4400 / w) + 1;
    rows.push({ el: add(seaL, `<g mask="url(#seaRow)">${strip('sea_tile_base', { x0: -1400 + dx % w - w, y, w, n: n + 1, h, op })}</g>`), w, sp: 2 + h * 0.02 });
  }
  // the warm sun path on the water (code light) and twinkling glints
  const path = S.grad([[0, '#FFE7B8', 0.0], [0.15, '#FFE7B8', 0.55], [1, '#FFE7B8', 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const sunPath = add(seaL, `<g><defs>${path.def}</defs><path d="M760 ${HORIZON} L850 ${HORIZON} L1080 900 L530 900 Z" fill="${path.ref}" opacity=".55"/></g>`);
  const glit = add(seaL, `<g>${S.glitter({ x: 805, y: HORIZON + 6, h: 420, w: 520, n: 80, color: '#FFF4D6', seed: 6 })}</g>`);
  const hiL = [];
  const r = rng(11);
  for (let i = 0; i < 9; i++) {
    const y = HORIZON + 40 + r() * 380, k = 0.4 + (y - HORIZON) / 380;
    hiL.push({ el: add(seaL, sprite(i % 3 ? 'water_highlights' : 'wave_overlay', { x: 0, y, w: 150 * k, op: 0.5 })), x: -400 + r() * 2400, y, vx: 1.5 + r() * 3, ph: r() * 6 });
  }
  sc.tick((t) => {
    for (const q of rows) setAttr(q.el, 'transform', `translate(${((Math.sin(t * 0.21 + q.sp) * 10 + t * q.sp) % q.w).toFixed(1)} 0)`);
    for (const q of hiL) {
      let x = q.x + t * q.vx; if (x > 2200) x -= 2600;
      setAttr(q.el, 'transform', `translate(${x.toFixed(1)} ${q.y.toFixed(1)})`);
      setAttr(q.el, 'opacity', (0.32 + 0.22 * Math.sin(t * 0.9 + q.ph)).toFixed(2));
    }
  });

  // ================================================================ 6 distant boats
  const fboats = [[1260, HORIZON + 66, 70, 1], [1470, HORIZON + 50, 52, -1], [610, HORIZON + 58, 48, 1]].map(([x, y, w, dir], i) => {
    const el = add(boats, `<g transform="translate(${x} ${y})"><g>${sprite('ship_boat_small', { x: 0, y: 0, w, an: 'water', flip: dir < 0 })}</g></g>`);
    return { el: el.firstElementChild, ph: i * 1.7, x, y, vx: dir * (2 + i) };
  });
  sc.tick((t) => {
    for (const b of fboats) setAttr(b.el, 'transform', `translate(${(t * b.vx).toFixed(1)} ${(Math.sin(t * 1.1 + b.ph) * 1.4).toFixed(2)}) rotate(${(Math.sin(t * 0.9 + b.ph) * 2.2).toFixed(2)})`);
  });

  // ================================================================ 7 Crete with the Minoan palace (in the sea plane)
  crete = band(seaL, 'crete');
  const creteX = 300, creteY = HORIZON + 96;
  add(crete, sprite('ch01_prop_crete_island_palace', { x: creteX, y: creteY, w: 390 }));
  // the island's cut base sinks into a feathered strip of the same painted sea
  add(crete, `<g mask="url(#seaRow)">${strip('sea_tile_base', { x0: creteX - 330, y: creteY - 20, w: 1700, n: 1, h: 44, op: 1 })}</g>`);
  add(crete, sprite('wave_overlay', { x: creteX - 90, y: creteY + 10, w: 150, op: 0.55 }));
  add(crete, sprite('water_highlights', { x: creteX + 110, y: creteY + 12, w: 140, op: 0.5 }));

  // ================================================================ 8 haze (code, burns off)
  const hz = S.grad([[0, '#F7E4CC', 0], [0.45, '#F7E4CC', 0.9], [1, '#F7E4CC', 0]]);
  const mist = add(haze, `<g><defs>${hz.def}</defs><rect x="-1400" y="${HORIZON - 90}" width="4400" height="200" fill="${hz.ref}"/></g>`);

  // ================================================================ 9 the merchant ship (hull rocks, sail breathes)
  const shipW = 270;
  const shipEl = add(shipL, `<g><g class="hull">${sprite('ship_merchant', { x: 0, y: 0, w: shipW, an: 'water' })}</g>
    <g opacity=".5">${sprite('wave_overlay', { x: -shipW * 0.62, y: 6, w: 150 })}</g></g>`);
  const hull = shipEl.querySelector('.hull');
  const SHIP_Y = 610;
  gsap.set(shipEl, { x: -340, y: SHIP_Y });
  sc.tick((t) => setAttr(hull, 'transform', `translate(0 ${(Math.sin(t * 0.95) * 2.4).toFixed(2)}) rotate(${(Math.sin(t * 0.75 + 0.6) * 1.4).toFixed(2)})`));

  // ================================================================ 10 Mycenae on the mainland summit
  const MYC = { x: 1650, y: 706, w: 760 };
  add(mycL, sprite('ch01_prop_mycenae_citadel', { x: MYC.x, y: MYC.y, w: MYC.w }));

  // ================================================================ 11 terraced hillside (rises to the right, base hidden by the beach)
  add(hillL, sprite('ch01_bg_hillside_terraces_b', { x: 2380, y: 880, w: 960, flip: true }));
  add(hillL, sprite('ch01_bg_hillside_terraces', { x: 1700, y: 900, w: 1180, flip: true }));

  // ================================================================ 12 settlement + chimney smoke
  add(townL, sprite('ch01_bg_settlement', { x: 1520, y: 790, w: 400 }));
  add(townL, sprite('village_cluster_a', { x: 1930, y: 728, w: 270 }));
  add(townL, sprite('house_white_a', { x: 1270, y: 838, w: 104 }));
  const smokes = [[1488, 684, 1], [1965, 615, 0.8]].map(([x, y, k], i) =>
    [0, 1, 2].map((j) => ({ el: add(townL, sprite(j % 2 ? 'smoke_puff_02' : 'smoke_puff_01', { x, y, w: 46 * k, op: 0 })), x, y, k, ph: j / 3 + i * 0.17 })));
  sc.tick((t) => {
    for (const set of smokes) for (const q of set) {
      const u = (t * 0.09 + q.ph) % 1;
      setAttr(q.el, 'transform', `translate(${(q.x + u * 26 * q.k).toFixed(1)} ${(q.y - u * 70 * q.k).toFixed(1)}) scale(${(0.55 + u * 0.9).toFixed(3)})`);
      setAttr(q.el, 'opacity', (Math.sin(u * Math.PI) * 0.5).toFixed(3));
    }
  });

  // ================================================================ 13 cypress / olive (sway from the trunk base)
  const sway = [];
  const tree = (L, k, x, y, w, amp = 0.5, flip = false) => {
    const el = add(L, sprite(k, { x, y, w, an: asset(k).an?.base ? 'base' : undefined, flip }));
    sway.push({ el: el.firstElementChild, amp, ph: x * 0.013, sp: 0.6 + (x % 7) * 0.04 });
  };
  tree(treeL, 'tree_cypress_tall', 1236, 870, 46, 0.5);
  tree(treeL, 'tree_cypress_small', 1268, 874, 36, 0.6);
  tree(treeL, 'tree_olive_small', 1410, 872, 200, 0.35);
  tree(treeL, 'tree_olive_b_small', 2150, 846, 190, 0.35);
  tree(treeL, 'tree_cypress_tall', 2232, 838, 52, 0.5);

  // ================================================================ 14 + 15 ground: painted sand (clip shapes only), headland rocks, beach
  const sandT = asset('ground_sand_tile');
  const shade = S.grad([[0, '#FFF1D6', 0.28], [0.25, '#FFF1D6', 0], [0.7, '#5A3A1E', 0.12], [1, '#3A2412', 0.4]]);
  const wet = S.grad([[0, '#6E5638', 0.42], [1, '#6E5638', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  add(ground, `<defs><pattern id="sandP" patternUnits="userSpaceOnUse" width="640" height="160"><image href="${sandT.src}" width="640" height="160" preserveAspectRatio="none"/></pattern>${shade.def}${wet.def}</defs>`);
  const shoreL = 'M-900 1120 L-900 852 C-520 842 -120 834 240 840 C420 843 540 852 620 872 C676 888 708 912 718 960 L720 1120 Z';
  const shoreR = 'M840 1120 L852 948 C900 912 980 886 1090 872 C1300 852 1560 848 1840 846 C2140 844 2440 850 2800 856 L2800 1120 Z';
  for (const [band_, d] of [[outcrop, shoreL], [beach, shoreR]]) {
    add(band_, `<path d="${d}" fill="url(#sandP)"/><path d="${d}" fill="${shade.ref}"/>`);
  }
  add(beach, `<path d="M852 948 C900 912 980 886 1090 872 L1090 900 C990 912 920 934 880 964 Z" fill="${wet.ref}"/>`);
  // foam where sand meets water (painted wave sprites)
  for (const [x, y, w, op] of [[905, 922, 140, 0.7], [1010, 888, 130, 0.6], [690, 918, 120, 0.6], [612, 884, 100, 0.5]]) add(beach, sprite('wave_overlay', { x, y, w, op, ay: 0.5 }));
  // headland: framing olive, rocks at the water's edge
  tree(outcrop, 'tree_olive_large', 60, 864, 470, 0.35);
  add(outcrop, sprite('rock_a', { x: 640, y: 930, w: 300 }));
  add(outcrop, sprite('rock_c', { x: 760, y: 968, w: 210 }));
  add(outcrop, sprite('rock_b', { x: 544, y: 876, w: 132 }));
  // beach dressing: the painted beach piece closes the right side
  add(beach, sprite('ch01_bg_beach_right', { x: 2440, y: 940, w: 820 }));

  // ================================================================ 16 vegetation at ground level
  for (const [k, x, y, w, flip] of [['agave', 210, 862, 110], ['grass_tufts_a', 330, 858, 80], ['shrub_c', 470, 862, 70], ['grass_tufts_a', 980, 902, 96, true],
    ['shrub_a', 1180, 868, 120], ['grass_tufts_a', 1350, 862, 80, true], ['shrub_b', 1610, 860, 92], ['grass_tufts_a', 1980, 860, 90], ['agave', 2330, 878, 120, true], ['shrub_a', 2050, 862, 120, true]]) {
    const el = add(veg, sprite(k, { x, y, w, flip }));
    sway.push({ el: el.firstElementChild, amp: 1.2, ph: x * 0.02, sp: 0.9 });
  }
  sc.tick((t) => {
    for (const s_ of sway) setAttr(s_.el, 'transform', `rotate(${(Math.sin(t * s_.sp + s_.ph) * s_.amp + Math.sin(t * s_.sp * 2.3 + s_.ph) * s_.amp * 0.25).toFixed(3)})`);
  });

  // ================================================================ 17 villagers (hybrid cutout rig)
  const elder = new Cutout(sc, people.g, { x: 392, y: 848, s: 1.62, costume: 'himation_elite', head: 'beard_long', seed: 1 });
  elder.set('relaxed');
  elder.hold('B', 'staff', { w: 9, grip: [0.5, 0.22], rot: 2, mode: 'world', behind: true });
  elder.set({ armB: 24, elbowB: 54 });
  const child = new Cutout(sc, people.g, { x: 540, y: 874, s: 1.1, costume: 'chiton_youth', head: 'hair_short', seed: 2 });
  child.set('sit');

  const carrier = new Cutout(sc, people.g, { x: 1170, y: 878, s: 1.38, costume: 'peplos_villager', head: 'headband', seed: 3 });
  carrier.set('carryHead'); carrier.p.swingF = 0;
  carrier.hold('head', 'amphora_a', { w: 34, grip: [0.5, 0.96], dy: 2 });

  const farmer = new Cutout(sc, people.g, { x: 2080, y: 884, s: 1.42, costume: 'chiton_villager', head: 'hat_petasos', facing: -1, seed: 4 });
  farmer.set({ armB: 30, elbowB: 70 }); farmer.p.swingB = 0.15;
  farmer.hold('B', 'basket_produce', { w: 40, grip: [0.5, 0.18], rot: 0, mode: 'world' });

  const trader = new Cutout(sc, people.g, { x: 1000, y: 892, s: 1.4, costume: 'himation_merchant', head: 'hair_curls', seed: 5 });
  trader.set('relaxed');

  const planter = new Cutout(sc, people.g, { x: 1890, y: 872, s: 1.36, costume: 'chiton_sailor', head: 'head_neutral', facing: -1, seed: 6 });

  // ================================================================ 18 props
  add(props, sprite('pithos', { x: 1736, y: 872, w: 46 }));
  add(props, sprite('amphora_b', { x: 1776, y: 878, w: 46 }));
  add(props, sprite('crate', { x: 1700, y: 882, w: 48 }));
  add(props, sprite('basket_produce', { x: 1812, y: 880, w: 40 }));
  add(props, sprite('fishing_net', { x: 1120, y: 914, w: 96 }));
  add(props, sprite('amphora_a', { x: 268, y: 860, w: 46 }));
  const sapling = add(props, sprite('olive_branch', { x: 1846, y: 876, w: 40, ax: 0.18, ay: 0.92, attrs: 'transform="rotate(-48)"' }));

  // ================================================================ 19 very-front framing (parallax 1.3)
  const leaves = add(frontL, `<g transform="translate(-120 -40)"><g>${sprite('foliage_overlay', { x: 0, y: 0, w: 380, ax: 0.2, ay: 0.05, flip: true, attrs: 'transform="rotate(160)"' })}</g></g>`);
  sway.push({ el: leaves.firstElementChild, amp: 1.4, ph: 0.3, sp: 0.55 });
  add(frontL, sprite('agave', { x: -40, y: 1010, w: 230 }));
  add(frontL, sprite('rock_c', { x: 2120, y: 1060, w: 340 }));
  add(frontL, sprite('grass_tufts_a', { x: 2290, y: 1012, w: 170, flip: true }));
  add(frontL, sprite('shrub_c', { x: 1500, y: 1050, w: 150 }));

  // gulls (two-frame flap, painted frames swapped like limited animation)
  const gulls = [[200, 230, 0.9, 26], [330, 200, 0.7, 22], [-60, 280, 0.8, 24], [1300, 160, 0.6, 18]].map(([x, y, k, vx], i) => {
    const el = add(cloudL, `<g>${sprite('gull_01', { x: 0, y: 0, w: 38 * k, ay: 0.5 })}${sprite('gull_02', { x: 0, y: 4 * k, w: 34 * k, ay: 0.5 })}</g>`);
    return { el, a: el.children[0], b: el.children[1], x, y, vx, ph: i * 0.37 };
  });
  sc.tick((t) => {
    for (const g of gulls) {
      let x = g.x + t * g.vx; if (x > 2200) x -= 2700;
      const up = Math.floor((t + g.ph) * 6) % 3 !== 2;
      setAttr(g.el, 'transform', `translate(${x.toFixed(1)} ${(g.y + Math.sin(t * 0.6 + g.ph * 5) * 12).toFixed(1)})`);
      setAttr(g.a, 'opacity', up ? 1 : 0); setAttr(g.b, 'opacity', up ? 0 : 1);
    }
  });

  sc.particle('motes', { n: 30, color: ['#FFF0C8', '#FFE2A0'], op: 0.42, size: 2, vx: 0.004, vy: -0.003 });
  const tint = sc.tint('#2a3270');

  // ================================================================ STORY (34 s, same beats as before)
  cam.x = 720; cam.y = 560; cam.z = 1.3;
  sc.pan(0, 8, { x: 820, y: 520, z: 1.14 }, 'power2.out');
  sc.pan(8, 8, { x: 930, y: 505 }, 'sine.inOut');
  sc.pan(16, 8.5, { x: 1430, y: 500, z: 1.12 }, 'power2.inOut');
  sc.pan(24.5, 9.5, { x: 1170, y: 430, z: 0.9 }, 'power2.inOut');

  // dawn → day: tint lifts, violet sky cross-fades to day, sun climbs, haze burns off
  gsap.set(tint, { opacity: 0.55 });
  tl.to(tint, { opacity: 0, duration: 10, ease: 'power1.inOut' }, 0);
  tl.fromTo(dawn, { opacity: 1 }, { opacity: 0, duration: 11, ease: 'power1.inOut' }, 0);
  tl.fromTo(sunG, { y: 150 }, { y: 0, duration: 10, ease: 'power2.out' }, 0.2);
  tl.fromTo(sunPath, { opacity: 0.9 }, { opacity: 0.35, duration: 12, ease: 'sine.inOut' }, 0);
  tl.fromTo(glit, { opacity: 0.3 }, { opacity: 1, duration: 5, ease: 'power1.in' }, 3);
  tl.fromTo(mist, { opacity: 1 }, { opacity: 0.18, duration: 14, ease: 'power1.inOut' }, 1);

  // the merchant ship crosses the bay
  tl.to(shipEl, { x: 830, y: SHIP_Y + 22, duration: 16, ease: 'sine.inOut' }, 5.5);

  // watchers: the elder points out to sea, the child looks up and around
  elder.go(tl, 3.4, 1.3, { armF: 82, elbowF: 6, lean: 3, head: -3 });
  elder.go(tl, 8.4, 1.5, { armF: 12, elbowF: 18, lean: 1, head: 0 });
  elder.go(tl, 17.2, 1.3, { armF: 76, elbowF: 8, lean: 2, head: -2 });
  elder.go(tl, 21.5, 1.4, { armF: 10, elbowF: 18, lean: 0, head: 0 });
  tl.to(child.p, { head: -10, duration: 1.4, ease: 'sine.inOut' }, 4.2);
  tl.to(child.p, { head: 6, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(child.p, { head: -6, armF: 70, elbowF: 30, duration: 1.2, ease: 'power2.inOut' }, 13.6);
  tl.to(child.p, { armF: 34, elbowF: 66, duration: 1.2, ease: 'power2.inOut' }, 16.2);

  // the water-carrier crosses the beach with an amphora on her head
  carrier.walk(tl, 12.4, 1520, 8.6, { ease: 'sine.inOut' });
  // the farmer brings a basket down from the terraces, stops and points at the ship
  farmer.walk(tl, 14.4, 1640, 6.6, { ease: 'sine.inOut' });
  tl.set(farmer.p, { facing: -1 }, 21.1);
  farmer.go(tl, 21.3, 1.0, { armF: 80, elbowF: 8, head: -3 });
  farmer.go(tl, 25.2, 1.0, { armF: 8, elbowF: 14, head: 0 });
  // the trader comes ashore from the landing and gestures as he talks
  tl.set(trader.p, { opacity: 0 }, 0);
  tl.to(trader.p, { opacity: 1, duration: 0.5, ease: 'none' }, 20.2);
  trader.walk(tl, 20.3, 1300, 4.2, { ease: 'sine.out' });
  trader.go(tl, 24.6, 0.9, 'talk');
  tl.to(trader.p, { elbowF: 92, duration: 0.42, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 25.5);
  trader.go(tl, 28.4, 1.0, { armF: 10, elbowF: 18, lean: 1 });
  // the planter kneels to set a sapling, stands, and waves to the ship
  planter.set({ armF: 20, elbowF: 18, armB: 14, elbowB: 18 });
  planter.go(tl, 15.8, 1.6, 'crouch');
  tl.to(planter.p, { armF: 70, elbowF: 40, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 17.6);
  planter.go(tl, 21.2, 1.4, { legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0, armF: 8, elbowF: 16, armB: -6, elbowB: 12 });
  planter.go(tl, 22.5, 0.8, 'wave');
  tl.to(planter.p, { elbowF: 58, duration: 0.42, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 23.3);
  planter.go(tl, 26.0, 0.9, { armF: 8, elbowF: 16, lean: 0, head: 0 });
  tl.fromTo(sapling.firstElementChild, { scale: 0.2, opacity: 0, transformOrigin: '18% 92%' }, { scale: 1, opacity: 1, duration: 1.6, ease: 'back.out(1.8)' }, 18.4);

  // closing wide: the first palace worlds
  const lblC = add(crete, S.mapLabel({ x: creteX, y: creteY - 150, dx: 0, dy: -70, title: 'CRETE', note: 'The Minoans', size: 24 }));
  const lblM = add(mycL, S.mapLabel({ x: MYC.x - 10, y: MYC.y - 300, dx: 0, dy: -70, title: 'MYCENAE', note: 'The Mycenaeans', size: 26 }));
  gsap.set([lblC, lblM], { opacity: 0 });
  tl.to(lblC, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 27.0);
  tl.to(lblM, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 29.2);

  sc.cue('birds', 1.5);
  sc.cue('gull', 12);
}
