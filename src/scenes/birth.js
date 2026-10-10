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
import { plate, ship, skyLife, swayAll, screenToLayer, contactShadow } from '../art/stage.js';

const USES = [
  'ch01_env', 'ch01_sea_mask', 'ship_merchant', 'ship_merchant_sail', 'ship_fishing_boat', 'ship_small_sail',
  'env_cloud_a', 'env_cloud_b', 'env_cloud_c', 'fx_gull_up', 'fx_gull_down', 'fx_smoke_a', 'fx_smoke_b',
  'env_rock_a', 'env_agave_a', 'env_shrub_a', 'env_fg_olive_branch', 'env_fg_grass_clump', 'env_olive_sapling_1', 'env_olive_sapling_2',
  'prop_amphora_a', 'prop_pithos', 'prop_crate', 'prop_basket_produce', 'prop_staff', 'prop_fishing_net',
  'char_hand_open', 'char_hand_grip', 'char_foot_sandal',
  'costume_himation_elder', 'costume_tunic_child', 'costume_peplos', 'costume_chiton_farmer', 'costume_himation_trader', 'costume_exomis_worker',
  'head_elder_beard', 'head_child_curls', 'head_bun_headband', 'head_petasos', 'head_trader_curls_beard', 'head_worker_headband',
];
let ready = null;
export function preload() { return (ready ||= preloadImages(USES)); }

const HORIZON = 382;
const GROUND = 848;   // the painted foreground path the villagers walk on (kept clear of the caption band)

/** Map label that stays readable on small screens: scaled up about its anchor when the frame is tiny. */
function label(sc, L, o) {
  const el = sc.add(L, `<g>${S.mapLabel(o)}</g>`);
  let k0 = 0;
  sc.tick(() => {
    const k = Math.max(1, Math.min(2.4, 0.55 / sc.unit));
    if (k === k0) return;
    k0 = k;
    setAttr(el.firstElementChild, 'transform', `translate(${o.x} ${o.y}) scale(${k.toFixed(3)}) translate(${-o.x} ${-o.y})`);
  });
  return el;
}

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
  const dawn = add(world, `<g><defs>${dawnG.def}</defs><rect x="-200" y="-420" width="2730" height="${HORIZON + 440}" fill="${dawnG.ref}"/></g>`);
  const glowG = S.rgrad([[0, '#FFE6B0', 0.9], [0.3, '#FFD38A', 0.35], [1, '#FFD38A', 0]]);
  const glow = add(world, `<g style="mix-blend-mode:screen"><defs>${glowG.def}</defs><circle cx="757" cy="312" r="420" fill="${glowG.ref}"/></g>`);
  const rays = add(world, `<g style="mix-blend-mode:screen" opacity=".85">${S.rays({ x: 757, y: 312, n: 13, spread: 150, dir: -90, len: 1400, op: 0.11 })}</g>`);
  // horizon haze, faded out towards the painted olive tree at the left edge
  const hzG = S.grad([[0, '#F7E4CC', 0], [0.5, '#F7E4CC', 0.85], [1, '#F7E4CC', 0]]);
  const hzX = S.grad([[0, '#fff', 0], [1, '#fff', 1]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const mist = add(world, `<g><defs>${hzG.def}${hzX.def}<mask id="c1MistMask" maskUnits="userSpaceOnUse" x="-200" y="${HORIZON - 70}" width="2730" height="150"><rect x="-200" y="${HORIZON - 70}" width="2730" height="150" fill="#fff"/><rect x="-200" y="${HORIZON - 70}" width="700" height="150" fill="#000"/><rect x="250" y="${HORIZON - 70}" width="260" height="150" fill="${hzX.ref}"/></mask></defs>
    <rect x="-200" y="${HORIZON - 70}" width="2730" height="150" fill="${hzG.ref}" mask="url(#c1MistMask)"/></g>`);

  // ================================================================ clouds and gulls (sky plane)
  skyLife(sc, sky, {
    clouds: [['env_cloud_b', 520, 60, 300, 2.6, 0.9], ['env_cloud_c', 1150, 30, 360, 1.8, 0.85], ['env_cloud_a', 1700, -150, 420, 1.4, 0.75]],
    gulls: [[380, 120, 1, 30, 0], [470, 96, 0.8, 27, 1.3], [1150, 60, 0.7, 22, 2.1]],
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
  const fish = ship(sc, sea, 'ship_fishing_boat', { w: 56, water: 0.86, id: 'fb', wake: 0 });
  setAttr(fish.el, 'transform', 'translate(1660 560)');
  const sail2 = ship(sc, sea, 'ship_small_sail', { w: 36, water: 0.86, id: 'ss', wake: 0.5 });
  const merchant = ship(sc, sea, 'ship_merchant', { w: 300, water: 0.885, sailKey: 'ship_merchant_sail', id: 'ms' });
  const sm = asset('ship_merchant');
  const yard = [merchant.x0 + sm.an.yard[0] * merchant.w, merchant.y0 + sm.an.yard[1] * merchant.h];
  const shipP = { x: 760, y: 448, s: 0.34 };
  sc.tick((t) => {
    setAttr(merchant.el, 'transform', `translate(${shipP.x.toFixed(1)} ${shipP.y.toFixed(1)}) scale(${shipP.s.toFixed(4)})`);
    merchant.pose(Math.sin(t * 0.95) * 1.6, Math.sin(t * 0.75 + 0.6) * 1.1);
    // the sail fills a little with each gust (never smaller than painted, so it always covers the hull's sail)
    const k = 1 + 0.009 * (0.5 + 0.5 * Math.sin(t * 1.15)) + 0.003 * (0.5 + 0.5 * Math.sin(t * 2.7));
    setAttr(merchant.sail, 'transform', `translate(${yard[0].toFixed(1)} ${yard[1].toFixed(1)}) scale(${k.toFixed(4)} ${(1 + (k - 1) * 0.4).toFixed(4)}) translate(${(-yard[0]).toFixed(1)} ${(-yard[1]).toFixed(1)})`);
    fish.pose(Math.sin(t * 1.3 + 1) * 1.1, Math.sin(t * 1.1 + 2) * 2.2);
    sail2.pose(Math.sin(t * 1.2 + 3) * 0.7, Math.sin(t * 0.9 + 1) * 1.6);
    setAttr(sail2.el, 'transform', `translate(${(1160 + t * 2.2).toFixed(1)} 420)`);
  });

  // ================================================================ ground: rock seat, plants, props (with contact shadows)
  const sway = [];
  const prop = (k, x, dy, w, o = {}) => {
    contactShadow(sc, ground, x, GROUND + dy - 1, w, o.sh ?? 0.3);
    const el = add(ground, sprite(k, { x, y: GROUND + dy, w, flip: o.flip }));
    el.setAttribute('data-z', o.z ?? GROUND + dy);
    if (o.sway) sway.push({ el: el.firstElementChild, amp: o.sway, ph: x * 0.02, sp: 0.9 });
    return el;
  };
  prop('env_rock_a', 556, 6, 92, { z: GROUND - 10 }); // the child's seat: always behind her
  prop('env_agave_a', 330, 16, 64, { sway: 1.1 });
  prop('env_shrub_a', 900, 12, 84, { flip: true, sway: 1.1 });
  prop('env_agave_a', 2200, 18, 76, { flip: true, sway: 1.1 });
  prop('prop_fishing_net', 960, 8, 66);
  prop('prop_crate', 2010, 6, 36);
  prop('prop_pithos', 2052, 4, 54);
  prop('prop_amphora_a', 2096, 6, 26);
  prop('prop_basket_produce', 2126, 6, 30);
  prop('prop_amphora_a', 382, -2, 24);
  const SAP_X = 1858;
  const sap1 = add(ground, sprite('env_olive_sapling_1', { x: SAP_X, y: GROUND + 4, w: 30 }));
  const sap2 = add(ground, sprite('env_olive_sapling_2', { x: SAP_X, y: GROUND + 4, w: 34 }));
  for (const e of [sap1, sap2]) e.setAttribute('data-z', GROUND + 4);

  // ================================================================ villagers (hybrid cutout rig)
  const S1 = 1.28;
  const elder = new Cutout(sc, ground.g, { x: 440, y: GROUND, s: S1, costume: 'costume_himation_elder', head: 'head_elder_beard', seed: 1 });
  elder.set('relaxed');
  elder.hold('B', 'prop_staff', { w: 11, grip: [0.5, 0.41], rot: 2, dx: -1.5, mode: 'world', behind: true });
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
  const planter = new Cutout(sc, ground.g, { x: 1915, y: GROUND, s: S1, costume: 'costume_exomis_worker', head: 'head_worker_headband', facing: -1, seed: 6 });
  // the trader walks in from beyond the right edge of the frame, nearer the viewer than the planter
  const trader = new Cutout(sc, ground.g, { x: 2260, y: GROUND + 8, s: S1, costume: 'costume_himation_trader', head: 'head_trader_curls_beard', facing: -1, seed: 5 });
  trader.set('relaxed');
  // depth: villagers and ground props are drawn back to front by the line they stand on (props nearer the
  // viewer cover a passing walker's feet); contact shadows stay underneath everything
  for (const f of [elder, child, carrier, farmer, planter, trader]) f.root.setAttribute('data-z', f.o.y);
  [...ground.g.children].filter((e) => e.hasAttribute('data-z')).sort((a, b) => a.getAttribute('data-z') - b.getAttribute('data-z')).forEach((e) => ground.g.appendChild(e));

  // ================================================================ front framing (closest to the lens), placed for the shots it frames
  const c0 = { x: 700, y: 585, z: 1.25 }, cEnd = { x: 1222, y: 445, z: 0.9 };
  const [bx, by] = screenToLayer(front, c0, 70, -30);
  const branch = add(front, `<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><g>${sprite('env_fg_olive_branch', { x: 0, y: 0, w: 300, an: 'top' })}</g></g>`);
  sway.push({ el: branch.firstElementChild, amp: 1.6, ph: 0.4, sp: 0.55 });
  const [gx, gy] = screenToLayer(front, cEnd, 1590, 930);
  const grass = add(front, sprite('env_fg_grass_clump', { x: gx, y: gy, w: 190 }));
  sway.push({ el: grass.firstElementChild, amp: 1.4, ph: 1.7, sp: 0.8 });
  const [ax, ay] = screenToLayer(front, c0, 30, 950);
  add(front, sprite('env_agave_a', { x: ax, y: ay, w: 200 }));
  swayAll(sc, sway);

  sc.particle('motes', { n: 26, color: ['#FFF0C8', '#FFE2A0'], op: 0.4, size: 2, vx: 0.004, vy: -0.003 });
  const tint = sc.tint('#2a3270');

  // ================================================================ STORY (34 s, same beats as before)
  // the scene clamps the camera to the plate at every aspect ratio (sc.bounds set by plate()); wider
  // screens keep the bottom of each authored frame, where the villagers are
  sc.anchorY = 1;
  cam.x = c0.x; cam.y = c0.y; cam.z = c0.z;
  sc.pan(0, 8, { x: 770, y: 562, z: 1.18 }, 'power2.out');
  sc.pan(8, 8, { x: 960, y: 556, z: 1.16 }, 'sine.inOut');
  sc.pan(16, 7.4, { x: 1440, y: 556, z: 1.16 }, 'power2.inOut');
  sc.pan(23.4, 7.6, { x: cEnd.x, y: cEnd.y, z: cEnd.z }, 'power2.inOut');

  // dawn -> morning: the violet wash and the tint lift, the sun blooms, haze burns off
  gsap.set(tint, { opacity: 0.32 });
  tl.to(tint, { opacity: 0, duration: 8, ease: 'power1.inOut' }, 0);
  tl.fromTo(dawn, { opacity: 1 }, { opacity: 0, duration: 10, ease: 'power1.inOut' }, 0);
  tl.fromTo(glow, { opacity: 0.35 }, { opacity: 1, duration: 9, ease: 'sine.inOut' }, 0);
  tl.fromTo(rays, { opacity: 0 }, { opacity: 0.85, duration: 7, ease: 'sine.inOut' }, 1);
  tl.fromTo(water, { opacity: 0.5 }, { opacity: 1, duration: 6, ease: 'sine.in' }, 1);
  tl.fromTo(mist, { opacity: 1 }, { opacity: 0.12, duration: 14, ease: 'power1.inOut' }, 1);

  // the merchant ship sails in from the far side of the bay and grows as it approaches
  tl.fromTo(shipP, { x: 760, y: 448, s: 0.34 }, { x: 1190, y: 600, s: 0.8, duration: 19, ease: 'sine.inOut' }, 2.5);

  // watchers: the elder points out to sea, the child looks up and around
  elder.go(tl, 3.4, 1.3, { armF: 100, elbowF: 4, lean: 2, head: -6 });
  elder.go(tl, 8.4, 1.5, { armF: 10, elbowF: 16, lean: 1, head: 0 });
  elder.go(tl, 15.6, 1.3, { armF: 92, elbowF: 6, lean: 2, head: -4 });
  elder.go(tl, 20.0, 1.4, { armF: 9, elbowF: 16, lean: 0, head: 0 });
  tl.to(child.p, { head: -12, duration: 1.4, ease: 'sine.inOut' }, 4.2);
  tl.to(child.p, { head: 6, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(child.p, { head: -8, armF: 96, elbowF: 10, duration: 1.2, ease: 'power2.inOut' }, 13.6);
  tl.to(child.p, { armF: 30, elbowF: 6, head: 2, duration: 1.2, ease: 'power2.inOut' }, 16.2);

  // the water-carrier crosses the path with an amphora on her head
  carrier.walk(tl, 10.5, 1040, 4.6, { ease: 'sine.inOut' });
  // the farmer brings a basket down from the terraces, stops and points at the ship
  farmer.walk(tl, 13.8, 1350, 7.4, { ease: 'sine.inOut' });
  farmer.go(tl, 21.4, 1.0, { armF: 104, elbowF: 6, head: -6 });
  farmer.go(tl, 23.3, 0.9, { armF: 8, elbowF: 14, head: 0 });
  tl.set(farmer.p, { facing: 1 }, 24.4);
  // the trader comes up from the landing, stops facing the farmer and talks
  trader.walk(tl, 18.0, 1490, 6.2, { ease: 'sine.inOut' });
  trader.go(tl, 24.6, 0.9, 'talk');
  tl.to(trader.p, { elbowF: 92, duration: 0.42, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 25.5);
  trader.go(tl, 28.4, 1.0, { armF: 10, elbowF: 18, lean: 1 });
  // the planter kneels to set a sapling, stands and waves to the ship
  planter.set({ armF: 18, elbowF: 16, armB: 12, elbowB: 16 });
  planter.go(tl, 20.6, 1.2, 'crouch');
  tl.to(planter.p, { armF: 30, elbowF: 18, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 21.8);
  planter.go(tl, 23.6, 1.1, { legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0, armF: 8, elbowF: 16, armB: -6, elbowB: 12, skirt: 0 });
  planter.go(tl, 24.7, 0.7, 'wave');
  tl.to(planter.p, { elbowF: 58, duration: 0.4, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 25.4);
  planter.go(tl, 27.9, 0.9, { armF: 8, elbowF: 16, lean: 0, head: 0 });
  gsap.set([sap1, sap2], { opacity: 0 });
  tl.fromTo(sap1.firstElementChild, { scale: 0.3, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.8, ease: 'back.out(2)', immediateRender: false }, 22.0);
  tl.to(sap1, { opacity: 1, duration: 0.3 }, 22.0);
  tl.to(sap2, { opacity: 1, duration: 0.6 }, 23.0);
  tl.to(sap1, { opacity: 0, duration: 0.6 }, 23.2);
  tl.fromTo(sap2.firstElementChild, { scale: 0.75, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.9, ease: 'back.out(1.6)', immediateRender: false }, 23.0);

  // closing wide: the first palace worlds (labels fade in once they are inside the frame)
  const lblC = label(sc, world, { x: 501, y: 338, dx: 0, dy: -90, title: 'CRETE', note: 'The Minoans', size: 26 });
  const lblM = label(sc, world, { x: 1985, y: 168, dx: 0, dy: -70, title: 'MYCENAE', note: 'The Mycenaeans', size: 28 });
  gsap.set([lblC, lblM], { opacity: 0 });
  tl.to(lblC, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 28.4);
  tl.to(lblM, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 29.4);

  sc.cue('birds', 1.5);
  sc.cue('gull', 12);
}
