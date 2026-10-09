// Title scene: the Acropolis at first light, under the title UI. One painted environment plate (generated
// per asset, the same illustrated world as Chapter 1) with sprite life on top: drifting clouds, gulls,
// water shimmer masked to the painted sea, the elder and the child from Chapter 1 on the rig, and framing
// foliage. The camera drifts in a slow loop.
// `citadel()` below is the code-drawn citadel still used by chapters 3-6 (unchanged in this pass).
import { C, mix, lighten } from '../art/palette.js';
import * as S from '../art/scenery.js';
import { rng } from '../art/util.js';
import { sprite, preloadImages } from '../art/sprite.js';
import { Cutout } from '../art/cutout.js';
import { plate, skyLife, swayAll } from '../art/stage.js';

const USES = [
  'intro_env', 'intro_sea_mask', 'env_cloud_a', 'env_cloud_c', 'fx_gull_up', 'fx_gull_down', 'fx_smoke_a',
  'env_rock_a', 'env_fg_olive_branch', 'env_fg_grass_clump', 'prop_staff',
  'char_hand_open', 'char_hand_grip', 'char_foot_sandal', 'costume_himation_elder', 'costume_tunic_child', 'head_elder_beard', 'head_child_curls',
];
let ready = null;
export function preload() { return (ready ||= preloadImages(USES)); }

/** Limestone citadel with a flat top and buttressed wall; anchored at ground centre. */
export function citadel({ w = 700, h = 260, lit = '#DBC59E', shade = '#8E7761', seed = 3 }) {
  const r = rng(seed);
  const jag = (x0, y0, x1, y1, n, amp) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t + (i && i < n ? r.range(-amp, amp) : 0), y0 + (y1 - y0) * t + (i && i < n ? r.range(-amp * 0.4, amp * 0.4) : 0)]);
    }
    return pts;
  };
  const left = jag(-w / 2, 6, -w * 0.355, -h, 9, w * 0.02);
  const right = jag(w * 0.34, -h, w / 2, 6, 9, w * 0.02);
  const pts = [...left, ...right];
  // bow the slopes outward a little for a more organic mass
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';
  const g = S.grad([[0, lit], [0.5, mix(lit, shade, 0.35)], [1, shade]], { x1: 0, y1: 0, x2: 1, y2: 0.15 });
  const gv = S.grad([[0, '#FFF1CF', 0.0], [0.6, '#5a4638', 0.0], [1, '#2f2220', 0.38]]);
  const cid = 'cz' + seed;
  let strata = '', cracks = '', shrubs = '';
  for (let i = 0; i < 7; i++) {
    const y = -h * (0.12 + i * 0.12);
    strata += `<path d="M${-w / 2} ${y} q${w * 0.25} ${r.range(-9, 9)} ${w * 0.5} ${r.range(-4, 4)} t${w * 0.5} ${r.range(-6, 6)}" stroke="${shade}" stroke-width="${r.range(1, 2.4).toFixed(1)}" fill="none" opacity="${r.range(0.18, 0.34).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 20; i++) {
    const x = r.range(-w * 0.4, w * 0.4), y = r.range(-h * 0.95, -h * 0.1);
    cracks += `M${x.toFixed(0)} ${y.toFixed(0)} l${r.range(-6, 6).toFixed(0)} ${r.range(14, 40).toFixed(0)} `;
  }
  for (let i = 0; i < 16; i++) {
    const t = r.range(0.02, 0.9), side = r() > 0.5 ? 1 : -1;
    const sx = side * (w * (0.5 - t * 0.14)) * r.range(0.82, 1), sy = -h * t * 0.9;
    shrubs += `<ellipse cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" rx="${r.range(8, 20).toFixed(0)}" ry="${r.range(4, 8).toFixed(0)}" fill="${C.olive}" opacity="${r.range(0.45, 0.8).toFixed(2)}"/>`;
  }
  // ashlar retaining wall along the summit
  let wall = '';
  const wh = 22;
  for (let row = 0; row < 2; row++) {
    for (let x = -w * 0.352 + (row % 2) * 16; x < w * 0.338; x += 32) wall += `<rect x="${x.toFixed(0)}" y="${-h + row * (wh / 2)}" width="31" height="${wh / 2 - 0.5}" fill="${lighten(lit, 0.18 - row * 0.05)}" stroke="${shade}" stroke-width=".5" opacity=".95"/>`;
  }
  return `<defs>${g.def}${gv.def}<clipPath id="${cid}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${g.ref}"/>
    <g clip-path="url(#${cid})">${strata}<path d="${cracks}" stroke="${shade}" stroke-width="1.6" fill="none" opacity=".38" stroke-linecap="round"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h + 8}" fill="${gv.ref}"/></g>
    ${wall}${shrubs}`;
}

export function build(sc) {
  const world = sc.layer('plate', 1.0);
  const sky = sc.layer('sky-life', 0.85);
  const ground = sc.layer('ground', 1.0);
  const front = sc.layer('front', 1.25);
  const add = (L, m) => sc.add(L, m);
  const GROUND = 902;

  plate(sc, world, 'intro_env', 'intro_sea_mask', { sun: [186, 359], horizon: 429, glitterW: 300, id: 'in' });
  // warm bloom around the low sun (code light)
  const glowG = S.rgrad([[0, '#FFE6B0', 0.85], [0.3, '#FFD38A', 0.3], [1, '#FFD38A', 0]]);
  const glow = add(world, `<g style="mix-blend-mode:screen"><defs>${glowG.def}</defs><circle cx="186" cy="359" r="460" fill="${glowG.ref}"/></g>`);
  add(world, `<g style="mix-blend-mode:screen">${S.rays({ x: 186, y: 359, n: 11, spread: 120, dir: -40, len: 1600, op: 0.12 })}</g>`);
  // a thread of smoke from the lower town
  const smoke = add(world, sprite('fx_smoke_a', { x: 1640, y: 515, w: 14, op: 0.5 }));

  skyLife(sc, sky, {
    clouds: [['env_cloud_a', 640, 120, 330, 2.2, 0.85], ['env_cloud_c', 1460, 50, 300, 1.6, 0.8]],
    gulls: [[520, 70, 0.9, 24, 0], [600, 52, 0.75, 22, 1.1], [1500, 96, 0.7, 18, 2.4]],
  });

  // the elder and the child from Chapter 1 watch the city wake
  add(ground, sprite('env_rock_a', { x: 548, y: GROUND + 6, w: 92 }));
  const elder = new Cutout(sc, ground.g, { x: 430, y: GROUND, s: 1.28, costume: 'costume_himation_elder', head: 'head_elder_beard', seed: 1 });
  elder.set('relaxed');
  elder.hold('B', 'prop_staff', { w: 11, grip: [0.5, 0.22], rot: 2, mode: 'world', behind: true });
  elder.set({ armB: 22, elbowB: 52, head: -2 });
  const child = new Cutout(sc, ground.g, { x: 540, y: GROUND - 8, s: 1.0, costume: 'costume_tunic_child', head: 'head_child_curls', seed: 2 });
  child.set('sit'); child.p.lean = 8; child.p.head = 6;

  const sway = [];
  const branch = add(front, `<g transform="translate(-60 -140)"><g>${sprite('env_fg_olive_branch', { x: 0, y: 0, w: 280, an: 'top' })}</g></g>`);
  sway.push({ el: branch.firstElementChild, amp: 1.5, ph: 0.4, sp: 0.5 });
  const grass = add(front, sprite('env_fg_grass_clump', { x: 140, y: 1030, w: 170 }));
  sway.push({ el: grass.firstElementChild, amp: 1.3, ph: 1.2, sp: 0.8 });
  swayAll(sc, sway);

  sc.particle('motes', { n: 40, color: ['#FFF0C8', '#FFE2A0'], op: 0.5, size: 2.2, vx: 0.006, vy: -0.004 });

  // ---- looping drift (camera stays on the plate: z 0.95 -> frame 1684 x 947)
  const tl = sc.tl;
  sc.cam.x = 1160; sc.cam.y = 456; sc.cam.z = 0.95;
  tl.to(sc.cam, { x: 1230, y: 446, z: 0.965, duration: 26, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  tl.to(glow, { opacity: 0.7, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  tl.to(child.p, { head: -8, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 2.5 }, 2);
  tl.to(elder.p, { head: -6, lean: 2, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 3 }, 5);
  sc.tick((t) => {
    const u = (t * 0.06) % 1;
    smoke.setAttribute('transform', `translate(${(1640 + u * 8).toFixed(1)} ${(515 - u * 22).toFixed(1)}) scale(${(0.75 + u * 0.4).toFixed(3)})`);
    smoke.setAttribute('opacity', (Math.sin(u * Math.PI) * 0.5).toFixed(3));
  });
}
