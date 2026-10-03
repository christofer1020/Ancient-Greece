// Chapter 1 — Birth of the Greek World: dawn over the Aegean, ships, a first settlement.
import gsap from 'gsap';
import { C, mix, lighten, darken } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng, smoothPath } from '../art/util.js';

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const sky = sc.layer('sky', 0.03);
  const sunL = sc.layer('sun', 0.05);
  const far = sc.layer('far', 0.12);
  const sea = sc.layer('sea', 0.25);
  const mist = sc.layer('mist', 0.3);
  const ships = sc.layer('ships', 0.5);
  const land = sc.layer('land', 0.8);
  const people = sc.layer('people', 1.0);
  const fg = sc.layer('fg', 1.3);

  // ------------------------------------------------------------------ sky & sun
  sc.add(sky, S.daySky());
  const dawn = sc.add(sky, (() => {
    const g = S.grad([[0, '#232C5E'], [0.45, '#6B5B8C'], [0.8, '#E0907A'], [1, '#F2B07A']]);
    return `<defs>${g.def}</defs><rect x="-1400" y="-400" width="4400" height="1100" fill="${g.ref}"/>`;
  })().replace('<rect ', '<rect class="dawn" '));
  const dawnRect = sky.g.querySelector('.dawn');
  sc.add(sky, S.driftCloud({ x: 300, y: 200, s: 1.5, tone: 'warm', seed: 2, w: 1.4, vx: 3, op: 0.95 }));
  sc.add(sky, S.driftCloud({ x: 1100, y: 140, s: 1.2, tone: 'dusk', seed: 5, w: 1.2, vx: 2.4, op: 0.9 }));
  sc.add(sky, S.driftCloud({ x: 1600, y: 300, s: 1, tone: 'warm', seed: 9, w: 1, vx: 3.6, op: 0.9 }));

  const sunG = sc.add(sunL, `<g class="sunrise">${S.sun({ x: 760, y: 596, r: 54, glowR: 720 })}${S.rays({ x: 760, y: 596, n: 13, spread: 130, dir: -90, len: 1500, op: 0.2 })}</g>`);

  // ------------------------------------------------------------------ far mountains / islands
  sc.add(far, S.mountains({ base: 648, amp: 170, lit: '#CDBDB6', shade: '#8A92B0', seed: 21, light: 1 }));
  sc.add(far, S.hills({ base: 632, amp: 22, top: '#B0B0BC', bottom: '#9AA1B6', seed: 4, freq: 0.006 }));

  // ------------------------------------------------------------------ sea + islands
  sc.add(sea, S.sea({ y: 628, top: '#86AECB', bottom: '#2B5A8C', rows: 11, line: '#F4EEDD', rowOp: 0.75, seed: 6 }));
  const glit = sc.add(sea, `<g class="glit">${S.glitter({ x: 760, y: 634, h: 280, w: 380, n: 70, color: '#FFF3D2' })}</g>`);
  sc.add(sea, S.island({ x: 560, y: 632, w: 260, h: 34, color: '#7B88A6', light: '#BDB6BA', seed: 3 }));
  sc.add(sea, S.island({ x: 1040, y: 634, w: 190, h: 24, color: '#7C88A5', light: '#BDB6BA', seed: 7 }));
  // Crete: island with a Minoan palace
  const crete = S.px ? '' : '';
  sc.add(sea, `<g transform="translate(350 640)">${S.island({ x: 0, y: 0, w: 330, h: 54, color: '#8C93A6', light: '#CBC1B6', seed: 12, trees: true })}<g transform="translate(-4 -28)">${S.minoanPalace({ s: 0.34 })}</g></g>`);
  sc.add(sea, S.drifter(`<g transform="translate(650 640)">${S.ship({ type: 'merchant', s: 0.22, hull: '#3A2D29' })}</g>`, { vx: 3, bob: 0 }));

  // ------------------------------------------------------------------ mist
  const mistG = S.grad([[0, '#F6E6D0', 0], [0.55, '#F6E6D0', 0.85], [1, '#F6E6D0', 0]]);
  const mistEl = sc.add(mist, `<defs>${mistG.def}</defs><rect x="-1400" y="520" width="4400" height="200" fill="${mistG.ref}"/>`);

  // ------------------------------------------------------------------ ships (parallax 0.5)
  const sailer = sc.add(ships, `<g class="sailer">${S.ship({ type: 'merchant', s: 0.78, hull: '#33261F' })}</g>`);
  gsap.set(sailer, { x: -240, y: 806 });
  const boat1 = S.drifter(`<g transform="translate(700 742)">${S.ship({ type: 'boat', s: 0.62, hull: '#33261F' })}</g>`, { vx: 2.5, bob: 0 });
  sc.add(ships, boat1);
  sc.add(ships, S.drifter(`<g transform="translate(1180 724)">${S.ship({ type: 'boat', s: 0.5, dir: -1, hull: '#33261F' })}</g>`, { vx: -2, bob: 0 }));

  // ------------------------------------------------------------------ land: hill with village (parallax 0.8)
  const hillPts = [[880, 900], [980, 800], [1100, 770], [1240, 735], [1360, 700], [1460, 652], [1560, 592], [1660, 548], [1760, 524], [1860, 528], [1980, 552], [2140, 602], [2400, 652], [2700, 700]];
  const hillD = smoothPath(hillPts) + ' L2800 1500 L880 1500 Z';
  const hg = S.grad([[0, '#97A06C'], [1, '#6C7B4C']]);
  sc.add(land, `<defs>${hg.def}</defs><path d="${hillD}" fill="${hg.ref}"/>`);
  sc.add(land, `<path d="${smoothPath(hillPts.map(([x, y]) => [x + 40, y + 40]))} L2800 1500 L920 1500 Z" fill="#7C8956" opacity=".55"/>`);
  // terraces
  let terr = '';
  for (let i = 0; i < 6; i++) terr += `<path d="${smoothPath(hillPts.slice(2, 11).map(([x, y]) => [x + 70 + i * 20, y + 48 + i * 26]))}" fill="none" stroke="${i % 2 ? '#5E6A3A' : '#B9B07E'}" stroke-width="3" opacity=".45"/>`;
  sc.add(land, terr);
  sc.add(land, `<g transform="translate(1180 790)">${S.village({ n: 15, seed: 31, scale: 1.08, haze: { color: '#EAD5B4', amt: 0.1 }, w: 520, rows: 4 })}</g>`);
  // olive groves
  for (const [x, y, s] of [[1000, 820, 0.8], [1080, 800, 0.7], [1800, 600, 0.55], [2000, 560, 0.5], [2200, 600, 0.6], [2330, 640, 0.7], [1700, 640, 0.7]]) sc.add(land, S.olive(x, y, s, { leaf: '#7C8A55' }));
  sc.add(land, S.cypress(1450, 700, 90, '#43522F')); sc.add(land, S.cypress(1480, 704, 70, '#43522F'));
  // Mycenae on the summit
  sc.add(land, `<g transform="translate(1810 522)">${S.mycenae({ s: 0.62 })}</g>`);
  sc.add(land, S.smoke({ x: 1300, y: 720, s: 1, n: 6, c: '#6a6060' }));
  sc.add(land, S.smoke({ x: 1560, y: 650, s: 0.9, n: 6, c: '#6a6060' }));

  // ------------------------------------------------------------------ people-level ground
  // foreground outcrop on the left (watchers)
  const og = S.grad([[0, '#B8A98D'], [1, '#7C6E5A']]);
  sc.add(people, `<defs>${og.def}</defs><path d="M-700 1000 L-700 780 C-400 770 -100 800 120 812 C300 822 460 818 560 842 C620 858 640 900 650 960 L650 1100 Z" fill="${og.ref}"/>
    <path d="M-700 790 C-400 770 -100 800 120 812 C300 822 460 818 560 842" fill="none" stroke="#6E7C48" stroke-width="14" opacity=".9"/>`);
  sc.add(people, S.grass(-300, 800, 900, '#7B8A52', 8, 0.1));
  // beach on the right
  const bg = S.grad([[0, '#E9D3A6'], [1, '#CDB07F']]);
  sc.add(people, `<defs>${bg.def}</defs><path d="M940 1100 L960 890 C1040 860 1200 852 1400 850 C1700 846 2100 842 2500 850 L2600 1100 Z" fill="${bg.ref}"/>
    <path d="M940 890 C1040 860 1200 852 1400 850 C1700 846 2100 842 2500 850" fill="none" stroke="#FFF" stroke-width="3" opacity=".5"/>
    <path d="M944 898 C1040 872 1200 864 1400 862 C1700 858 2100 854 2500 862" fill="none" stroke="#9AB6C8" stroke-width="10" opacity=".35"/>`);
  sc.add(people, S.olive(2080, 842, 1.15, { leaf: '#7E8D58' }));
  sc.add(people, S.olive(1180, 846, 0.9, { leaf: '#7E8D58' }));
  sc.add(people, S.pithos(1750, 850, 0.9));
  sc.add(people, S.amphora(1790, 852, 0.9, C.terracotta));

  // ------------------------------------------------------------------ watchers (left)
  const elder = sc.fig(people, { x: 218, y: 818, s: 1.7, outfit: 'chiton', color: C.ivory, trim: C.terracotta, cloak: C.olive, cloakType: 'drape' });
  elder.set('relaxed'); elder.hold('B', 'staff', { len: 160, mode: 'world', rot: -3 }); elder.p.armB = 8; elder.p.elbowB = 72;
  sc.add(people, S.rock(380, 826, 1.7, '#B6A78E'));
  const child = sc.fig(people, { x: 384, y: 826, s: 1.4, outfit: 'chiton', color: C.parchment, trim: C.terracotta });
  child.set('sit'); child.p.head = 6;
  sc.add(people, S.amphora(70, 812, 1.7, C.terracotta));
  sc.add(people, S.shrub(520, 822, 1.4, '#6E7C48'));

  // ------------------------------------------------------------------ villagers (right)
  const farmer = sc.fig(people, { x: 2020, y: 858, s: 1.55, outfit: 'chiton', color: C.olive, trim: C.sandstone, facing: -1 });
  farmer.hold('B', 'basket', { mode: 'world', rot: 0, y: 4 }); farmer.p.armB = 70; farmer.p.elbowB = 60;
  const carrier = sc.fig(people, { x: 1260, y: 862, s: 1.55, outfit: 'peplos', color: '#C9A78A', hair: 'bun', hairColor: '#5b3a24', facing: 1, trim: C.red });
  carrier.hold('F', 'amphora', { mode: 'world', rot: 0, y: -6, color: C.terracotta });
  carrier.p.armF = 152; carrier.p.elbowF = 110; carrier.p.swing = 0.2; carrier.p.legB = -3;
  const trader = sc.fig(people, { x: 930, y: 866, s: 1.55, outfit: 'chiton', color: C.blue, trim: C.sandstone, hat: 'petasos', hatColor: '#B79C6A' });
  trader.p.facing = 1; trader.set('relaxed');
  const planter = sc.fig(people, { x: 1670, y: 862, s: 1.5, outfit: 'chiton', color: C.terracotta, trim: C.ivory, facing: -1 });
  sc.add(people, S.shrub(1610, 862, 0.5, '#7B8A52'));
  const sapling = sc.add(people, `<g transform="translate(1618 862)"><path d="M0 0 C0 -10 1 -16 0 -22" stroke="#4B3A2A" stroke-width="2.5" fill="none"/><ellipse cx="-5" cy="-24" rx="7" ry="3" fill="#7C8A55" transform="rotate(-30 -5 -24)"/><ellipse cx="5" cy="-27" rx="7" ry="3" fill="#8FA066" transform="rotate(30 5 -27)"/></g>`);

  // ------------------------------------------------------------------ foreground
  sc.add(fg, S.grass(-500, 905, 1500, '#6A7B44', 3, 0.12));
  sc.add(fg, S.rock(-60, 930, 2.4, '#9A8D78'));
  sc.add(fg, S.grass(900, 905, 1800, '#B4A06A', 9, 0.06));

  // ------------------------------------------------------------------ atmosphere
  sc.add(sky, S.flock({ n: 7, x: 100, y: 330, s: 0.8, vx: 20, spread: 90 }));
  sc.add(sea, S.flock({ n: 4, x: 800, y: 560, s: 0.55, vx: 16, spread: 60, seed: 8 }));
  sc.particle('motes', { n: 38, color: ['#FFF0C8', '#FFE2A0'], op: 0.5, size: 2.2, vx: 0.004, vy: -0.003 });
  const tint = sc.tint('#27306a');

  // ================================================================== STORY
  // camera
  cam.x = 880; cam.y = 520; cam.z = 1.32;
  sc.pan(0, 8, { x: 850, y: 462, z: 1.1 }, 'power2.out');
  sc.pan(8, 8, { x: 900 }, 'sine.inOut');
  sc.pan(16, 8.5, { x: 1380, y: 470, z: 1.06 }, 'power2.inOut');
  sc.pan(24.5, 9.5, { x: 1230, y: 440, z: 0.92 }, 'power2.inOut');

  // dawn: tint lifts, sky warms, sun rises, mist burns off
  gsap.set(tint, { opacity: 0.62 });
  tl.to(tint, { opacity: 0, duration: 9, ease: 'power1.inOut' }, 0);
  tl.fromTo(dawnRect, { opacity: 1 }, { opacity: 0, duration: 9, ease: 'power1.inOut' }, 0);
  gsap.set(sunG, { y: 150 });
  tl.fromTo(sunG, { y: 150 }, { y: 0, duration: 9, ease: 'power2.out' }, 0.2);
  tl.fromTo(glit, { opacity: 0 }, { opacity: 1, duration: 5, ease: 'power1.in' }, 4);
  tl.fromTo(mistEl, { opacity: 1 }, { opacity: 0.12, duration: 14, ease: 'power1.inOut' }, 1);

  // the merchant ship crosses the bay and beaches by the village
  tl.to(sailer, { x: 610, duration: 16, ease: 'sine.inOut' }, 5.5);

  // watchers breathe, child looks around, elder points out to sea then toward the ship
  elder.go(tl, 3.5, 1.4, { armF: 86, elbowF: 6, lean: 3, head: 3 });
  elder.go(tl, 8.5, 1.6, { armF: 20, elbowF: 24, lean: 0, head: 0 });
  elder.go(tl, 17.5, 1.4, { armF: 80, elbowF: 8, lean: 2, head: 2 });
  tl.to(elder.p, { look: 1, duration: 1, ease: 'sine.inOut' }, 4);
  tl.to(child.p, { head: -4, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(child.p, { head: 8, duration: 1.6, ease: 'sine.inOut' }, 14);

  // villagers
  // farmer carries a basket down the beach, pausing to look at the ship
  farmer.walk(tl, 14.5, 1530, 6.5, { ease: 'sine.inOut' });
  tl.to(farmer.p, { facing: 1, duration: 0.01 }, 21.2);
  farmer.go(tl, 21.4, 1.0, { armF: 84, elbowF: 8 });
  // water-carrier crosses
  carrier.walk(tl, 12.5, 1390, 8.5, { ease: 'sine.inOut' });
  // trader steps off the ship
  tl.set(trader.p, { opacity: 0 }, 0);
  tl.set(trader.p, { opacity: 1 }, 20.2);
  trader.walk(tl, 20.3, 1230, 4.2, { ease: 'sine.out' });
  trader.go(tl, 24.6, 1.2, { armF: 120, elbowF: 30, lean: -2 });
  tl.to(trader.p, { armF: 40, elbowF: 40, duration: 1.0, ease: 'sine.inOut' }, 27.5);
  // planter tends a sapling then straightens up and waves
  planter.set({ armF: 30, elbowF: 20, armB: 20, elbowB: 20 });
  planter.go(tl, 16, 1.8, { lean: 46, armF: 62, elbowF: 6, armB: 52, elbowB: 10, head: 14, legF: 18, kneeF: 24, legB: -12, kneeB: 34 });
  planter.go(tl, 21.4, 1.6, { lean: 0, armF: 6, elbowF: 18, armB: -6, elbowB: 14, head: 0, legF: 3, kneeF: 0, legB: -3, kneeB: 0 });
  planter.go(tl, 22.6, 0.8, { armF: 150, elbowF: 20, head: -6 });
  tl.to(planter.p, { elbowF: 55, duration: 0.45, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 23.4);
  tl.fromTo(sapling, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 1.4, ease: 'back.out(2)' }, 18.5);

  // labels on the closing wide shot
  const lblC = sc.add(sea, S.mapLabel({ x: 350, y: 608, dx: 0, dy: -116, title: 'CRETE', note: 'The Minoans', size: 22 }));
  const lblM = sc.add(land, S.mapLabel({ x: 1810, y: 440, dx: 0, dy: -86, title: 'MYCENAE', note: 'The Mycenaeans', size: 24 }));
  gsap.set([lblC, lblM], { opacity: 0 });
  tl.to(lblC, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 27.0);
  tl.to(lblM, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 29.2);

  // ambient: fisherman's rhythm and idle village
  sc.cue('birds', 1.5);
  sc.cue('gull', 12);
}
