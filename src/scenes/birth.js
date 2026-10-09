// Chapter 1 — Birth of the Greek World.
// One coherent illustrated environment plate (the bay, Crete, the terraced hill and Mycenae) with every
// moving thing as a separate transparent sprite on top: the merchant ship, small boats, the villagers
// (hybrid cutout rig), props, clouds, gulls, smoke and foreground framing foliage. Code adds only light and
// atmosphere: dawn grading, sun glow and rays, horizon haze, water shimmer (masked to the painted sea),
// contact shadows, and the map labels.
import gsap from 'gsap';
import * as S from '../art/scenery.js';
import { sprite, asset, preloadImages } from '../art/sprite.js';
import { Cutout } from '../art/cutout.js';
import { setAttr } from '../art/util.js';
import { plate, ship, skyLife, swayAll } from '../art/stage.js';

const USES = [
  'ch01_env', 'ch01_sea_mask', 'ship_merchant', 'ship_merchant_sail', 'ship_fishing_boat', 'ship_small_sail',
  'env_cloud_b', 'env_cloud_c', 'fx_gull_up', 'fx_gull_down', 'fx_smoke_a', 'fx_smoke_b',
  'env_rock_a', 'env_agave_a', 'env_shrub_a', 'env_fg_olive_branch', 'env_fg_grass_clump', 'env_olive_sapling_1', 'env_olive_sapling_2',
  'prop_amphora_a', 'prop_pithos', 'prop_crate', 'prop_basket_produce', 'prop_staff', 'prop_fishing_net',
  'char_hand_open', 'char_hand_grip', 'char_foot_sandal',
  'costume_himation_elder', 'costume_tunic_child', 'costume_peplos', 'costume_chiton_farmer', 'costume_himation_trader', 'costume_exomis_worker',
  'head_elder_beard', 'head_child_curls', 'head_bun_headband', 'head_petasos', 'head_trader_curls_beard', 'head_worker_headband',
];
let ready = null;
export function preload() { return (ready ||= preloadImages(USES)); }

const HORIZON = 382;
const GROUND = 892;   // the foreground path the villagers walk on

export function build(sc) {
  const tl = sc.tl, cam = sc.cam;
  const add = (L, m) => sc.add(L, m);

  // ================================================================ planes (back to front)
  const world = sc.layer('plate', 1.0);        // the painted environment
  const sky = sc.layer('sky-life', 0.85);      // drifting clouds and gulls, a little further away
  const sea = sc.layer('sea-life', 1.0);       // ship and boats, on the painted water
  const ground = sc.layer('ground', 1.0);      // villagers and props on the foreground path
  const front = sc.layer('front', 1.25);       // framing foliage close to the lens

  // ================================================================ plate + water
  const { water } = plate(sc, world, 'ch01_env', 'ch01_sea_mask', { sun: [757, 312], horizon: HORIZON, id: 'c1' });

  // dawn light (code): cool violet sky wash that lifts, sun glow and rays, haze on the horizon
  const dawnG = S.grad([[0, '#2c2f63', 0.85], [0.55, '#7a5d8c', 0.55], [0.9, '#e39a7c', 0.2], [1, '#f2b07e', 0]]);
  const dawn = add(world, `<g><defs>${dawnG.def}</defs><rect x="-200" y="-200" width="2730" height="${HORIZON + 220}" fill="${dawnG.ref}"/></g>`);
  const glowG = S.rgrad([[0, '#FFE6B0', 0.9], [0.3, '#FFD38A', 0.35], [1, '#FFD38A', 0]]);
  const glow = add(world, `<g style="mix-blend-mode:screen"><defs>${glowG.def}</defs><circle cx="757" cy="312" r="420" fill="${glowG.ref}"/></g>`);
  const rays = add(world, `<g style="mix-blend-mode:screen">${S.rays({ x: 757, y: 312, n: 13, spread: 150, dir: -90, len: 1400, op: 0.14 })}</g>`);
  const hzG = S.grad([[0, '#F7E4CC', 0], [0.5, '#F7E4CC', 0.85], [1, '#F7E4CC', 0]]);
  const mist = add(world, `<g><defs>${hzG.def}</defs><rect x="-200" y="${HORIZON - 70}" width="2730" height="150" fill="${hzG.ref}"/></g>`);

  // ================================================================ clouds and gulls (sky plane)
  skyLife(sc, sky, {
    clouds: [['env_cloud_b', 520, 70, 300, 2.6, 0.9], ['env_cloud_c', 1150, 40, 360, 1.8, 0.85]],
    gulls: [[380, 230, 1, 30, 0], [470, 205, 0.8, 27, 1.3], [1150, 160, 0.7, 22, 2.1]],
  });

  // ================================================================ chimney smoke on the village (plate houses)
  const smokes = [[2158, 398, 1], [1985, 455, 0.8]].map(([x, y, k], i) =>
    [0, 1].map((j) => ({ el: add(world, sprite(j ? 'fx_smoke_b' : 'fx_smoke_a', { x, y, w: 16 * k, op: 0 })), x, y, k, ph: j / 2 + i * 0.23 })));
  sc.tick((t) => {
    for (const set of smokes) for (const q of set) {
      const u = (t * 0.07 + q.ph) % 1;
      setAttr(q.el, 'transform', `translate(${(q.x + u * 10 * q.k).toFixed(1)} ${(q.y - u * 26 * q.k).toFixed(1)}) scale(${(0.7 + u * 0.5).toFixed(3)})`);
      setAttr(q.el, 'opacity', (Math.sin(u * Math.PI) * 0.55).toFixed(3));
    }
  });

  // ================================================================ boats and the merchant ship (on the water)
  const fish = ship(sc, sea, 'ship_fishing_boat', { w: 64, water: 0.86, id: 'fb' });
  setAttr(fish.el, 'transform', 'translate(1530 640)');
  const sail2 = ship(sc, sea, 'ship_small_sail', { w: 36, water: 0.86, id: 'ss' });
  const merchant = ship(sc, sea, 'ship_merchant', { w: 300, water: 0.885, sailKey: 'ship_merchant_sail', id: 'ms' });
  const sm = asset('ship_merchant');
  const yard = [merchant.x0 + sm.an.yard[0] * merchant.w, merchant.y0 + sm.an.yard[1] * merchant.h];
  const shipP = { x: 760, y: 448, s: 0.34 };
  sc.tick((t) => {
    setAttr(merchant.el, 'transform', `translate(${shipP.x.toFixed(1)} ${shipP.y.toFixed(1)}) scale(${shipP.s.toFixed(4)})`);
    setAttr(merchant.hull, 'transform', `translate(0 ${(Math.sin(t * 0.95) * 1.6).toFixed(2)}) rotate(${(Math.sin(t * 0.75 + 0.6) * 1.1).toFixed(2)})`);
    const k = 1 + 0.016 * (0.5 + 0.5 * Math.sin(t * 1.15)) + 0.005 * Math.sin(t * 2.7);
    setAttr(merchant.sail, 'transform', `translate(${yard[0].toFixed(1)} ${yard[1].toFixed(1)}) scale(${k.toFixed(4)} ${(1 + (k - 1) * 0.4).toFixed(4)}) translate(${(-yard[0]).toFixed(1)} ${(-yard[1]).toFixed(1)})`);
    setAttr(fish.hull, 'transform', `translate(0 ${(Math.sin(t * 1.3 + 1) * 1.1).toFixed(2)}) rotate(${(Math.sin(t * 1.1 + 2) * 2.2).toFixed(2)})`);
    setAttr(sail2.hull, 'transform', `translate(0 ${(Math.sin(t * 1.2 + 3) * 0.7).toFixed(2)}) rotate(${(Math.sin(t * 0.9 + 1) * 1.6).toFixed(2)})`);
    setAttr(sail2.el, 'transform', `translate(${(1160 + t * 2.2).toFixed(1)} 420)`);
  });

  // ================================================================ ground: rock seat, plants, props
  add(ground, sprite('env_rock_a', { x: 556, y: GROUND + 6, w: 92 }));
  const sway = [];
  for (const [k, x, y, w, flip] of [['env_agave_a', 700, GROUND + 18, 70], ['env_shrub_a', 1040, GROUND + 14, 84, true], ['env_agave_a', 2180, GROUND + 20, 76, true]]) {
    const el = add(ground, sprite(k, { x, y, w, flip }));
    sway.push({ el: el.firstElementChild, amp: 1.1, ph: x * 0.02, sp: 0.9 });
  }
  add(ground, sprite('prop_fishing_net', { x: 1120, y: GROUND + 10, w: 66 }));
  add(ground, sprite('prop_pithos', { x: 2010, y: GROUND + 4, w: 54 }));
  add(ground, sprite('prop_amphora_a', { x: 2054, y: GROUND + 6, w: 26 }));
  add(ground, sprite('prop_crate', { x: 1970, y: GROUND + 8, w: 36 }));
  add(ground, sprite('prop_basket_produce', { x: 2084, y: GROUND + 8, w: 30 }));
  add(ground, sprite('prop_amphora_a', { x: 372, y: GROUND - 2, w: 24 }));
  const sap1 = add(ground, sprite('env_olive_sapling_1', { x: 1880, y: GROUND + 6, w: 22 }));
  const sap2 = add(ground, sprite('env_olive_sapling_2', { x: 1880, y: GROUND + 6, w: 24 }));

  // ================================================================ villagers (hybrid cutout rig)
  const S1 = 1.28;
  const elder = new Cutout(sc, ground.g, { x: 440, y: GROUND, s: S1, costume: 'costume_himation_elder', head: 'head_elder_beard', seed: 1 });
  elder.set('relaxed');
  elder.hold('B', 'prop_staff', { w: 11, grip: [0.5, 0.22], rot: 2, mode: 'world', behind: true });
  elder.set({ armB: 22, elbowB: 52 });
  const child = new Cutout(sc, ground.g, { x: 548, y: GROUND - 8, s: 1.0, costume: 'costume_tunic_child', head: 'head_child_curls', seed: 2 });
  child.set('sit');
  const carrier = new Cutout(sc, ground.g, { x: 700, y: GROUND + 4, s: S1, costume: 'costume_peplos', head: 'head_bun_headband', seed: 3 });
  carrier.set('carryHead'); carrier.p.swingF = 0;
  carrier.hold('head', 'prop_amphora_a', { w: 15, grip: [0.5, 0.97], dx: 1, dy: 1 });
  carrier.setHand('F', 'char_hand_grip');
  const farmer = new Cutout(sc, ground.g, { x: 2240, y: GROUND + 2, s: S1, costume: 'costume_chiton_farmer', head: 'head_petasos', facing: -1, seed: 4 });
  farmer.set({ armB: 28, elbowB: 66 }); farmer.p.swingB = 0.15;
  farmer.hold('B', 'prop_basket_produce', { w: 24, grip: [0.46, 0.06], mode: 'world' });
  const trader = new Cutout(sc, ground.g, { x: 1600, y: GROUND + 6, s: S1, costume: 'costume_himation_trader', head: 'head_trader_curls_beard', facing: -1, seed: 5 });
  trader.set('relaxed');
  const planter = new Cutout(sc, ground.g, { x: 1915, y: GROUND + 4, s: S1, costume: 'costume_exomis_worker', head: 'head_worker_headband', facing: -1, seed: 6 });

  // ================================================================ front framing (closest to the lens)
  const branch = add(front, `<g transform="translate(-150 -120)"><g>${sprite('env_fg_olive_branch', { x: 0, y: 0, w: 300, an: 'top' })}</g></g>`);
  sway.push({ el: branch.firstElementChild, amp: 1.6, ph: 0.4, sp: 0.55 });
  const grass = add(front, sprite('env_fg_grass_clump', { x: 2420, y: 1010, w: 190, flip: true }));
  sway.push({ el: grass.firstElementChild, amp: 1.4, ph: 1.7, sp: 0.8 });
  add(front, sprite('env_agave_a', { x: -40, y: 1030, w: 200 }));
  swayAll(sc, sway);

  sc.particle('motes', { n: 26, color: ['#FFF0C8', '#FFE2A0'], op: 0.4, size: 2, vx: 0.004, vy: -0.003 });
  const tint = sc.tint('#2a3270');

  // ================================================================ STORY (34 s, same beats as before)
  // camera bounds: the frame must stay on the plate (x 0..2330, y -55..945)
  cam.x = 700; cam.y = 585; cam.z = 1.25;
  sc.pan(0, 8, { x: 770, y: 562, z: 1.18 }, 'power2.out');
  sc.pan(8, 8, { x: 960, y: 560, z: 1.16 }, 'sine.inOut');
  sc.pan(16, 8.5, { x: 1440, y: 552, z: 1.16 }, 'power2.inOut');
  sc.pan(24.5, 9.5, { x: 1222, y: 445, z: 0.9 }, 'power2.inOut');

  // dawn -> morning: the violet wash and the tint lift, the sun blooms, haze burns off
  gsap.set(tint, { opacity: 0.32 });
  tl.to(tint, { opacity: 0, duration: 8, ease: 'power1.inOut' }, 0);
  tl.fromTo(dawn, { opacity: 1 }, { opacity: 0, duration: 10, ease: 'power1.inOut' }, 0);
  tl.fromTo(glow, { opacity: 0.35 }, { opacity: 1, duration: 9, ease: 'sine.inOut' }, 0);
  tl.fromTo(rays, { opacity: 0 }, { opacity: 1, duration: 7, ease: 'sine.inOut' }, 1);
  tl.fromTo(water, { opacity: 0.5 }, { opacity: 1, duration: 6, ease: 'sine.in' }, 1);
  tl.fromTo(mist, { opacity: 1 }, { opacity: 0.12, duration: 14, ease: 'power1.inOut' }, 1);

  // the merchant ship sails in from the far side of the bay and grows as it approaches the beach
  tl.fromTo(shipP, { x: 760, y: 448, s: 0.34 }, { x: 1210, y: 640, s: 0.88, duration: 19, ease: 'sine.inOut' }, 2.5);

  // watchers: the elder points out to sea, the child looks up and around
  elder.go(tl, 3.4, 1.3, { armF: 82, elbowF: 6, lean: 3, head: -3 });
  elder.go(tl, 8.4, 1.5, { armF: 10, elbowF: 16, lean: 1, head: 0 });
  elder.go(tl, 15.6, 1.3, { armF: 72, elbowF: 8, lean: 2, head: -2 });
  elder.go(tl, 20.0, 1.4, { armF: 9, elbowF: 16, lean: 0, head: 0 });
  tl.to(child.p, { head: -12, duration: 1.4, ease: 'sine.inOut' }, 4.2);
  tl.to(child.p, { head: 6, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(child.p, { head: -6, armF: 70, elbowF: 30, duration: 1.2, ease: 'power2.inOut' }, 13.6);
  tl.to(child.p, { armF: 34, elbowF: 62, duration: 1.2, ease: 'power2.inOut' }, 16.2);

  // the water-carrier crosses the path with an amphora on her head
  carrier.walk(tl, 9.6, 1170, 10.4, { ease: 'sine.inOut' });
  // the farmer brings a basket down from the terraces, stops and points at the ship
  farmer.walk(tl, 14.4, 1490, 6.6, { ease: 'sine.inOut' });
  farmer.go(tl, 21.3, 1.0, { armF: 80, elbowF: 8, head: -3 });
  farmer.go(tl, 25.2, 1.0, { armF: 8, elbowF: 14, head: 0 });
  // the trader comes up from the landing and gestures as he talks
  trader.p.opacity = 0;
  tl.fromTo(trader.p, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none', immediateRender: false }, 20.0);
  trader.walk(tl, 20.1, 1335, 4.2, { ease: 'sine.out' });
  tl.set(trader.p, { facing: 1 }, 24.4);
  trader.go(tl, 24.6, 0.9, 'talk');
  tl.to(trader.p, { elbowF: 92, duration: 0.42, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 25.5);
  trader.go(tl, 28.4, 1.0, { armF: 10, elbowF: 18, lean: 1 });
  // the planter kneels to set a sapling, stands and waves to the ship
  planter.set({ armF: 18, elbowF: 16, armB: 12, elbowB: 16 });
  planter.go(tl, 18.6, 1.4, 'crouch');
  tl.to(planter.p, { armF: 70, elbowF: 40, duration: 0.45, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 20.0);
  planter.go(tl, 22.2, 1.2, { legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0, armF: 8, elbowF: 16, armB: -6, elbowB: 12 });
  planter.go(tl, 23.4, 0.7, 'wave');
  tl.to(planter.p, { elbowF: 58, duration: 0.4, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 24.1);
  planter.go(tl, 26.6, 0.9, { armF: 8, elbowF: 16, lean: 0, head: 0 });
  gsap.set([sap1, sap2], { opacity: 0 });
  tl.fromTo(sap1.firstElementChild, { scale: 0.3, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.8, ease: 'back.out(2)', immediateRender: false }, 20.4);
  tl.to(sap1, { opacity: 1, duration: 0.3 }, 20.4);
  tl.to(sap2, { opacity: 1, duration: 0.6 }, 21.6);
  tl.to(sap1, { opacity: 0, duration: 0.6 }, 21.8);
  tl.fromTo(sap2.firstElementChild, { scale: 0.75, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.9, ease: 'back.out(1.6)', immediateRender: false }, 21.6);

  // closing wide: the first palace worlds
  const lblC = add(world, S.mapLabel({ x: 501, y: 338, dx: 0, dy: -90, title: 'CRETE', note: 'The Minoans', size: 26 }));
  const lblM = add(world, S.mapLabel({ x: 1985, y: 150, dx: 0, dy: -86, title: 'MYCENAE', note: 'The Mycenaeans', size: 28 }));
  gsap.set([lblC, lblM], { opacity: 0 });
  tl.to(lblC, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 27.0);
  tl.to(lblM, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 29.2);

  sc.cue('birds', 1.5);
  sc.cue('gull', 12);
}
