// Hybrid cutout rig (v3, production assets).
// Painted parts generated per asset (head with hair/headwear, costume, hands, sandal feet, held props) on a
// code skeleton whose arms and legs are tapered ink-brush strokes in the canonical limb colour. Proportions
// are measured from the canonical cast (assets/global/characters/char_cast_canonical.png): with H = 150
// units from sole to skull top, the skull is 0.147 H, the collar 0.168 H below the top, the belt 0.38 H,
// a knee-length hem 0.67 H. Joint values live in `fig.p` as plain numbers so GSAP can tween and scrub them.
// Angles are degrees, FORWARD-positive, 0 = limb hanging straight down. Foot pitch: heel-up positive.
//
// Walking is procedural and foot-locked: footsteps are planted at fixed ground positions (derived from the
// distance walked, so scrubbing the timeline is exact), the swing foot follows an arc, heel strike and toe
// push-off pivot on the heel and the toe, and two-bone IK solves the legs. The hip rides on the stance leg
// (natural bob), arms swing opposite the legs, the shoulders counter-rotate and the head is stabilised.
import { asset } from './sprite.js';
import { NS, D2R, setAttr, clamp, lerp } from './util.js';

const INK = '#26201b';          // limb colour sampled from the canonical cast
const INK_LIT = '#4a3d33';      // faint brush sheen along one edge
const RIG = {
  H: 150,
  collarY: -125, neckY: -122, waistY: -93, hipY: -72,
  thigh: 34, shin: 30,          // ankle joint 8 units above the sole when standing straight
  upper: 29, fore: 23,
  hipF: 3.5, hipB: -3.5,
  wArm: [5.0, 4.6, 4.1], wLeg: [6.4, 5.7, 5.0],
  hand: 7.2,                    // painted hand width
  foot: 18,                     // painted sandal length (heel to toe)
  ankleH: 8,                    // ankle joint height above the sole
};

// --------------------------------------------------------------------------- walk
// C: stride per full cycle (two steps) in rig units; BETA: stance fraction; PHASE0: start/stop phase, where
// one foot is planted under the hip and the other is passing (so starting and stopping never slide a foot).
const WALK = { C: 88, BETA: 0.6, LIFT: 8.5, STRIKE: -14, PUSH: 30, ARM: 17, PHASE0: 0.3 };
const CYCLE = WALK.C;
const LMAX = (RIG.thigh + RIG.shin) * 0.985;

const smooth = (f) => f * f * (3 - 2 * f);
const frac = (v) => v - Math.floor(v);
const rot = (v, a) => { const c = Math.cos(a * D2R), si = Math.sin(a * D2R); return [v[0] * c - v[1] * si, v[0] * si + v[1] * c]; };

/** Two-bone IK: hip H to ankle A, knee bending forward. Returns [thigh angle, knee bend] in degrees. */
function ik(hx, hy, ax, ay) {
  const l1 = RIG.thigh, l2 = RIG.shin;
  const dx = ax - hx, dy = ay - hy;
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 1e-3);
  const th = Math.atan2(dx, dy) / D2R;
  const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / D2R;
  const ga = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)) / D2R;
  return [th + al, 180 - ga];
}

// --------------------------------------------------------------------------- brush geometry
function capsulePts(out, ax, ay, ra, bx, by, rb) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1e-3;
  const ux = dx / d, uy = dy / d, px = -uy, py = ux;
  const s = clamp((ra - rb) / d, -0.95, 0.95), c = Math.sqrt(1 - s * s);
  const n1 = [s * ux + c * px, s * uy + c * py], n2 = [s * ux - c * px, s * uy - c * py];
  const a1 = Math.atan2(n1[1], n1[0]), a2 = Math.atan2(n2[1], n2[0]), au = Math.atan2(uy, ux);
  const arc = (cx, cy, r, from, to, via, steps) => {
    let d1 = to - from;
    while (d1 > Math.PI) d1 -= 2 * Math.PI;
    while (d1 < -Math.PI) d1 += 2 * Math.PI;
    const mid = from + d1 / 2;
    const dv = Math.abs(Math.atan2(Math.sin(via - mid), Math.cos(via - mid)));
    if (dv > Math.PI / 2) d1 = d1 > 0 ? d1 - 2 * Math.PI : d1 + 2 * Math.PI;
    for (let i = 0; i <= steps; i++) {
      const a = from + (d1 * i) / steps;
      out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  out.push(NaN);
  out.push(ax + n1[0] * ra, ay + n1[1] * ra);
  arc(bx, by, rb, a1, a2, au, 6);
  arc(ax, ay, ra, a2, a1, au + Math.PI, 6);
}

function toPath(pts) {
  let d = '', start = true;
  for (let i = 0; i < pts.length;) {
    if (Number.isNaN(pts[i])) { if (d) d += 'Z'; start = true; i++; continue; }
    d += (start ? 'M' : 'L') + pts[i].toFixed(1) + ' ' + pts[i + 1].toFixed(1);
    start = false; i += 2;
  }
  return d + 'Z';
}

// --------------------------------------------------------------------------- poses
export const CPOSES = {
  stand:   { armF: 5, elbowF: 8, armB: -5, elbowB: 8, legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0, drop: 0, plant: 1, skirt: 0 },
  relaxed: { armF: 9, elbowF: 16, armB: -8, elbowB: 14, legF: 5, kneeF: 3, footF: 0, legB: -5, kneeB: 0, footB: 0, lean: 1, head: 0 },
  point:   { armF: 96, elbowF: 4, armB: -8, elbowB: 14, lean: 2, head: -5 },
  wave:    { armF: 150, elbowF: 24, armB: -6, elbowB: 12, lean: -2, head: -6 },
  talk:    { armF: 46, elbowF: 64, armB: 10, elbowB: 34, lean: 2, head: 1 },
  offer:   { armF: 62, elbowF: 58, armB: 52, elbowB: 62, lean: 4, head: 4 },
  carryHead: { armF: 160, elbowF: 70, armB: -6, elbowB: 14, lean: -1, head: 0 },
  // seated: hips dropped onto a seat, hands resting on the knees
  sit:     { legF: 86, kneeF: 84, footF: 0, legB: 80, kneeB: 88, footB: 0, armF: 30, elbowF: 6, armB: 26, elbowB: 10, lean: 8, head: 2, drop: 30, plant: 0, skirt: -10 },
  // kneeling to plant: front knee up, back knee down on the toes, front hand reaching the soil
  crouch:  { legF: 64, kneeF: 108, footF: -4, legB: -4, kneeB: 100, footB: 34, lean: 40, head: 18, armF: 22, elbowF: 6, armB: 34, elbowB: 30, drop: 0, plant: 1, skirt: -6 },
};

let _id = 0;
const img = (key, par) => {
  const a = asset(key);
  const e = document.createElementNS(NS, 'image');
  e.setAttribute('href', a.src);
  e.setAttribute('preserveAspectRatio', 'none');
  par.appendChild(e);
  return e;
};
/** Place an image so that normalised anchor `an` lands on (x, y) at `scale` rig units per runtime px. */
const place = (e, key, an, x, y, scale) => {
  const a = asset(key);
  const w = a.w * scale, h = a.h * scale;
  setAttr(e, 'x', (x - an[0] * w).toFixed(2)); setAttr(e, 'y', (y - an[1] * h).toFixed(2));
  setAttr(e, 'width', w.toFixed(2)); setAttr(e, 'height', h.toFixed(2));
  return { w, h };
};

export class Cutout {
  /** o: { x, y, s, facing, costume, head, opacity, seed, shadow } */
  constructor(scene, parent, o = {}) {
    this.scene = scene;
    this.o = Object.assign({ costume: 'costume_chiton_farmer', head: 'head_worker_headband', s: 1, facing: 1, x: 0, y: 0, opacity: 1, seed: Math.random() * 10, shadow: 0.34 }, o);
    this.p = Object.assign({
      x: this.o.x, y: this.o.y, s: this.o.s, facing: this.o.facing, opacity: this.o.opacity,
      lean: 0, head: 0,
      walk: 0, walkX0: this.o.x, swingF: 1, swingB: 1, drop: 0, plant: 1, breath: 1, skirt: 0,
    }, CPOSES.stand);
    this.props = [];
    this._wx = this.p.x;
    this.build(parent);
    scene.figs.push(this);
    this.render(0);
  }

  build(parent) {
    const o = this.o, id = ++_id;
    const g = (cls, par) => { const e = document.createElementNS(NS, 'g'); if (cls) e.setAttribute('class', cls); par.appendChild(e); return e; };
    const path = (par, fill, op) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('fill', fill); if (op != null) e.setAttribute('opacity', op); par.appendChild(e); return e; };

    this.root = g('cutout', parent);
    const defs = document.createElementNS(NS, 'defs');
    const W = RIG.waistY;
    // torso keeps everything above the belt and fades out just below it; the skirt starts a little above
    // the belt (hidden under the torso), so skewing the skirt never opens a gap at the waist.
    defs.innerHTML = `<radialGradient id="cs${id}"><stop offset="0" stop-color="#2a1d14" stop-opacity=".55"/><stop offset="1" stop-color="#2a1d14" stop-opacity="0"/></radialGradient>
      <linearGradient id="tf${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${W + 3}" x2="0" y2="${W + 13}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="mt${id}" maskUnits="userSpaceOnUse" x="-80" y="-200" width="160" height="260"><rect x="-80" y="-200" width="160" height="260" fill="url(#tf${id})"/></mask>
      <clipPath id="ck${id}"><rect x="-80" y="${W - 6}" width="160" height="140"/></clipPath>
      <radialGradient id="ah${id}"><stop offset="0" stop-color="${INK}"/><stop offset=".78" stop-color="${INK}"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient>`;
    this.root.appendChild(defs);
    this.shadow = document.createElementNS(NS, 'ellipse');
    setAttr(this.shadow, 'fill', `url(#cs${id})`);
    this.root.appendChild(this.shadow);

    this.body = g('body', this.root);
    this.upperB = g('upperB', this.body);
    this.armBG = g('armB', this.upperB);
    this.armB = path(this.armBG, INK);
    this.handB = img('char_hand_open', this.armBG);
    this.legBG = g('legB', this.body);
    this.legB = path(this.legBG, INK);
    this.footB = img('char_foot_sandal', this.legBG);
    this.legFG = g('legF', this.body);
    this.legF = path(this.legFG, INK);
    this.legFhi = path(this.legFG, INK_LIT, 0.35);
    this.footF = img('char_foot_sandal', this.legFG);
    this.upper = g('upper', this.body);
    this.skirtG = g('skirt', this.upper);
    const sk = g('', this.skirtG); sk.setAttribute('clip-path', `url(#ck${id})`);
    this.skirtImg = img(o.costume, sk);
    this.headG = g('head', this.upper);
    this.headImg = img(o.head, this.headG);
    const tm = g('', this.upper); tm.setAttribute('mask', `url(#mt${id})`);
    this.torsoImg = img(o.costume, tm);
    // the back arm comes out of the painted armhole: fill the hollow opening with limb ink
    this.armhole = document.createElementNS(NS, 'ellipse');
    setAttr(this.armhole, 'fill', `url(#ah${id})`);
    this.upper.appendChild(this.armhole);
    this.armFG = g('armF', this.upper);
    this.armF = path(this.armFG, INK);
    this.armFhi = path(this.armFG, INK_LIT, 0.35);
    this.handF = img('char_hand_open', this.armFG);
    this.layout();
  }

  layout() {
    const o = this.o;
    const c = asset(o.costume);
    for (const e of [this.torsoImg, this.skirtImg]) place(e, o.costume, c.an.collar, 0, RIG.collarY, c.upx);
    const cw = c.w * c.upx, ch = c.h * c.upx;
    const at = (an) => [(an[0] - c.an.collar[0]) * cw, RIG.collarY + (an[1] - c.an.collar[1]) * ch];
    const ah = at(c.an.armhole), r = c.armholeR || [0.05, 0.08];
    setAttr(this.armhole, 'cx', ah[0].toFixed(2)); setAttr(this.armhole, 'cy', ah[1].toFixed(2));
    setAttr(this.armhole, 'rx', (r[0] * cw * 0.95).toFixed(2)); setAttr(this.armhole, 'ry', (r[1] * ch * 0.95).toFixed(2));
    // shoulders: back arm roots inside the armhole, front arm at the painted front shoulder
    this.shB = [ah[0] + r[0] * cw * 0.15, ah[1] - r[1] * ch * 0.1];
    const sf = at(c.an.shoulderF);
    this.shF = [sf[0] - 2.5, sf[1] + 3];
    const h = asset(o.head);
    place(this.headImg, o.head, h.an.neck, 0, 0, h.upx);
    this.headTop = -h.an.neck[1] * h.h * h.upx + 0.02 * h.h * h.upx;
    this.handScale = RIG.hand / asset('char_hand_open').w;
    const f = asset('char_foot_sandal');
    this.footScale = RIG.foot / (f.w * (f.an.sole[0] + 0.36));
    this.footAn = [f.an.ankle[0], f.an.sole[1] - RIG.ankleH / (f.h * this.footScale)];
    for (const e of [this.footF, this.footB]) place(e, 'char_foot_sandal', this.footAn, 0, 0, this.footScale);
    for (const e of [this.handF, this.handB]) place(e, 'char_hand_open', asset('char_hand_open').an.wrist, 0, 0, this.handScale);
    // sole extent relative to the ankle joint (for ground contact and heel/toe pivots)
    this.heel = [(0.03 - f.an.ankle[0]) * f.w * this.footScale, RIG.ankleH];
    this.toe = [(0.97 - f.an.ankle[0]) * f.w * this.footScale, RIG.ankleH];
  }

  /** Attach a painted prop. where: 'F' | 'B' (hands) | 'head'. grip = [u,v] in prop image space. */
  hold(where, key, { w = 30, grip = [0.5, 0.5], rot: r = 0, mode = 'hand', dx = 0, dy = 0, behind = false } = {}) {
    const a = asset(key);
    const host = where === 'head' ? this.headG : where === 'F' ? this.armFG : this.armBG;
    const g = document.createElementNS(NS, 'g');
    const e = document.createElementNS(NS, 'image');
    e.setAttribute('href', a.src);
    e.setAttribute('preserveAspectRatio', 'none');
    const h = (w * a.h) / a.w;
    setAttr(e, 'x', (-grip[0] * w).toFixed(2)); setAttr(e, 'y', (-grip[1] * h).toFixed(2));
    setAttr(e, 'width', w.toFixed(2)); setAttr(e, 'height', h.toFixed(2));
    g.appendChild(e);
    if (behind) host.insertBefore(g, host.firstChild); else host.appendChild(g);
    const pr = { where, g, rot: r, mode, dx, dy, key };
    this.props.push(pr);
    if (where === 'F' || where === 'B') this.setHand(where, 'char_hand_grip');
    return pr;
  }

  setHand(where, key) {
    const e = where === 'F' ? this.handF : this.handB;
    e.setAttribute('href', asset(key).src);
    place(e, key, asset(key).an.wrist, 0, 0, this.handScale);
  }

  set(pose) { Object.assign(this.p, typeof pose === 'string' ? CPOSES[pose] : pose); return this; }

  go(tl, at, dur, pose, ease = 'power2.inOut') {
    const v = typeof pose === 'string' ? CPOSES[pose] : pose;
    tl.to(this.p, Object.assign({ duration: dur, ease }, v), at);
    return this;
  }

  /** Walk towards x over dur. The distance is snapped to whole steps so the walk starts and ends in the
   *  planted-and-passing pose (feet never slide when starting or stopping); returns the actual end x. */
  walk(tl, at, toX, dur, { ease = 'sine.inOut', face = true, blend = 0.32 } = {}) {
    const from = this._wx, s = this.p.s;
    const dir = Math.sign(toX - from) || this.p.facing;
    const half = (CYCLE / 2) * s;
    const steps = Math.max(1, Math.round(Math.abs(toX - from) / half));
    const end = from + dir * steps * half;
    if (face) tl.set(this.p, { facing: dir }, at);
    tl.set(this.p, { walkX0: from }, at);
    tl.to(this.p, { x: end, duration: dur, ease }, at);
    tl.to(this.p, { walk: 1, duration: blend, ease: 'sine.out' }, at);
    tl.to(this.p, { walk: 0, duration: blend + 0.15, ease: 'sine.inOut' }, at + dur - blend * 0.7);
    this._wx = end;
    return end;
  }

  /** Procedural foot-locked leg for leg-phase u (0 = heel strike). Returns ankle (body coords, ground y=0) and pitch. */
  legAt(u) {
    const { C, BETA, LIFT, STRIKE, PUSH } = WALK;
    const half = (BETA * C) / 2;
    const heelPivot = (gx, pitch) => { const hp = [gx + this.heel[0], 0], v = rot(this.heel, pitch); return [hp[0] - v[0], hp[1] - v[1]]; };
    const toePivot = (gx, pitch) => { const tp = [gx + this.toe[0], 0], v = rot(this.toe, pitch); return [tp[0] - v[0], tp[1] - v[1]]; };
    if (u < BETA) {
      const gx = half - u * C;                       // planted: moves back relative to the body at walking speed
      const t1 = 0.1, t2 = BETA - 0.16;
      if (u < t1) { const pitch = lerp(STRIKE, 0, smooth(u / t1)); return { a: heelPivot(gx, pitch), pitch }; }
      if (u > t2) { const pitch = lerp(0, PUSH, smooth((u - t2) / (BETA - t2))); return { a: toePivot(gx, pitch), pitch }; }
      return { a: [gx, -RIG.ankleH], pitch: 0 };
    }
    const v = (u - BETA) / (1 - BETA);
    const gx = -half + smooth(v) * 2 * half;
    const pitch = lerp(PUSH, STRIKE, smooth(v));
    let a = [gx, -RIG.ankleH - LIFT * Math.pow(Math.sin(Math.PI * v), 0.85)];
    // continuity with the pivots at toe-off and heel strike
    const off0 = (() => { const p0 = toePivot(-half, PUSH); return [p0[0] + half, p0[1] + RIG.ankleH]; })();
    const off1 = (() => { const p1 = heelPivot(half, STRIKE); return [p1[0] - half, p1[1] + RIG.ankleH]; })();
    const w0 = 1 - smooth(Math.min(1, v / 0.35)), w1 = smooth(clamp((v - 0.65) / 0.35, 0, 1));
    a = [a[0] + off0[0] * w0 + off1[0] * w1, a[1] + off0[1] * w0 + off1[1] * w1];
    return { a, pitch };
  }

  // ------------------------------------------------------------------------- render
  render(t) {
    const p = this.p, o = this.o;
    const s = p.s;
    const W = clamp(p.walk, 0, 1);
    const mix = (a, b, w = W) => a + (b - a) * w;

    // ---- walk phase from distance walked (exact under scrubbing)
    const dist = ((p.x - p.walkX0) * p.facing) / s;
    const ph = WALK.PHASE0 + dist / CYCLE;
    const uF = frac(ph), uB = frac(ph + 0.5);
    let legF = p.legF, kneeF = p.kneeF, footF = p.footF, legB = p.legB, kneeB = p.kneeB, footB = p.footB;
    let armF = p.armF, elbowF = p.elbowF, armB = p.armB, elbowB = p.elbowB;
    if (W > 0.001) {
      const F = this.legAt(uF), B = this.legAt(uB);
      // the hip rides on the stance leg(s): as high as the most stretched planted leg allows
      let hh = Infinity;
      for (const [L, u, hx] of [[F, uF, RIG.hipF], [B, uB, RIG.hipB]]) {
        if (u < WALK.BETA) { const dx = L.a[0] - hx; hh = Math.min(hh, Math.sqrt(Math.max(0, LMAX * LMAX - dx * dx)) - L.a[1]); }
      }
      if (!Number.isFinite(hh)) hh = LMAX + RIG.ankleH;
      const hy = -hh;
      const ikF = ik(RIG.hipF, hy, F.a[0], F.a[1]), ikB = ik(RIG.hipB, hy, B.a[0], B.a[1]);
      legF = mix(p.legF, ikF[0]); kneeF = mix(p.kneeF, ikF[1]); footF = mix(p.footF, F.pitch);
      legB = mix(p.legB, ikB[0]); kneeB = mix(p.kneeB, ikB[1]); footB = mix(p.footB, B.pitch);
      // arms swing opposite the leg on the same side, bending a little more on the forward swing
      const swing = (u) => -Math.cos(2 * Math.PI * u);           // -1 when that leg is forward
      const fwdF = (1 + swing(uF)) / 2, fwdB = (1 + swing(uB)) / 2;
      armF = mix(p.armF, WALK.ARM * swing(uF), W * p.swingF); elbowF = mix(p.elbowF, 10 + 16 * fwdF, W * p.swingF);
      armB = mix(p.armB, WALK.ARM * swing(uB), W * p.swingB); elbowB = mix(p.elbowB, 10 + 16 * fwdB, W * p.swingB);
    }
    const breathe = Math.sin(t * 1.6 + o.seed) * 0.55 * p.breath * (1 - W);
    const lean = p.lean + W * 4;

    // ---- legs (hip row at RIG.hipY); feet are painted sandals rotated about the ankle joint
    const hipY = RIG.hipY + p.drop;
    const leg = (a, k, f, hx) => {
      const kx = hx + Math.sin(a * D2R) * RIG.thigh, ky = hipY + Math.cos(a * D2R) * RIG.thigh;
      const b = a - k;
      const ax = kx + Math.sin(b * D2R) * RIG.shin, ay = ky + Math.cos(b * D2R) * RIG.shin;
      const hl = rot(this.heel, f), tl = rot(this.toe, f);   // heel-up (f > 0) tips the toe down: clockwise
      return { hx, kx, ky, ax, ay, fa: f, heel: [ax + hl[0], ay + hl[1]], toe: [ax + tl[0], ay + tl[1]] };
    };
    const LF = leg(legF, kneeF, footF, RIG.hipF), LB = leg(legB, kneeB, footB, RIG.hipB);
    const low = Math.max(LF.heel[1], LF.toe[1], LB.heel[1], LB.toe[1]);
    const dy = p.plant * -low;

    const limb = (el, hi, P, w) => {
      const pts = [];
      capsulePts(pts, P[0][0], P[0][1], w[0] / 2, P[1][0], P[1][1], w[1] / 2);
      capsulePts(pts, P[1][0], P[1][1], w[1] / 2, P[2][0], P[2][1], w[2] / 2);
      setAttr(el, 'd', toPath(pts));
      if (hi) {
        const q = [];
        const off = (pt, k) => [pt[0] - w[k] * 0.18, pt[1] - w[k] * 0.08];
        capsulePts(q, ...off(P[0], 0), w[0] * 0.12, ...off(P[1], 1), w[1] * 0.1);
        capsulePts(q, ...off(P[1], 1), w[1] * 0.1, ...off(P[2], 2), w[2] * 0.08);
        setAttr(hi, 'd', toPath(q));
      }
    };
    limb(this.legF, this.legFhi, [[LF.hx, hipY], [LF.kx, LF.ky], [LF.ax, LF.ay]], RIG.wLeg);
    limb(this.legB, null, [[LB.hx, hipY], [LB.kx, LB.ky], [LB.ax, LB.ay]], RIG.wLeg);
    setAttr(this.footF, 'transform', `translate(${LF.ax.toFixed(2)} ${LF.ay.toFixed(2)}) rotate(${LF.fa.toFixed(2)})`);
    setAttr(this.footB, 'transform', `translate(${LB.ax.toFixed(2)} ${LB.ay.toFixed(2)}) rotate(${LB.fa.toFixed(2)})`);

    // ---- upper body: lean about the hip, breathing, shoulder counter-rotation
    const tilt = W * Math.sin(uF * 4 * Math.PI) * 0.8;
    const upT = `rotate(${(lean + tilt).toFixed(2)} 0 ${hipY.toFixed(2)}) translate(0 ${(p.drop + breathe * 0.4).toFixed(2)})`;
    setAttr(this.upper, 'transform', upT);
    setAttr(this.upperB, 'transform', upT);
    const counter = W * Math.sin(uF * 2 * Math.PI) * 1.6;
    const arm = (el, hi, hand, sh, a, e, cx) => {
      const sx = sh[0] + cx, sy = sh[1];
      const ex = sx + Math.sin(a * D2R) * RIG.upper, ey = sy + Math.cos(a * D2R) * RIG.upper;
      const b = a + e;
      const wx = ex + Math.sin(b * D2R) * RIG.fore, wy = ey + Math.cos(b * D2R) * RIG.fore;
      limb(el, hi, [[sx, sy], [ex, ey], [wx, wy]], RIG.wArm);
      setAttr(hand, 'transform', `translate(${wx.toFixed(2)} ${wy.toFixed(2)}) rotate(${(-b).toFixed(2)})`);
      return { x: wx + Math.sin(b * D2R) * RIG.hand * 0.55, y: wy + Math.cos(b * D2R) * RIG.hand * 0.55, ang: b };
    };
    const hF = arm(this.armF, this.armFhi, this.handF, this.shF, armF, elbowF, counter);
    const hB = arm(this.armB, null, this.handB, this.shB, armB, elbowB, -counter);

    // ---- head: stabilised against the torso lean/tilt
    const headA = p.head - (lean + tilt) * 0.75 + Math.sin(t * 0.7 + o.seed) * 0.8 * (1 - W);
    setAttr(this.headG, 'transform', `translate(0 ${(RIG.neckY + breathe * 0.5).toFixed(2)}) rotate(${headA.toFixed(2)})`);

    // ---- skirt: the hem follows the thighs, with a little lag while walking (secondary motion)
    const legSum = (legF + legB) * 0.5;
    const sk = clamp(legSum * 0.18 - W * Math.sin((uF - 0.08) * 4 * Math.PI) * 2.2 + p.skirt, -16, 16);
    const wy0 = RIG.waistY;
    setAttr(this.skirtG, 'transform', `translate(0 ${wy0}) skewX(${sk.toFixed(2)}) translate(0 ${-wy0})`);

    // ---- props
    for (const pr of this.props) {
      if (pr.where === 'head') {
        setAttr(pr.g, 'transform', `translate(${pr.dx} ${(this.headTop + pr.dy).toFixed(2)}) rotate(${(pr.rot - headA * 0.6).toFixed(2)})`);
      } else {
        const h = pr.where === 'F' ? hF : hB;
        const r = pr.mode === 'world' ? pr.rot - (lean + tilt) : pr.rot - h.ang;
        setAttr(pr.g, 'transform', `translate(${(h.x + pr.dx).toFixed(2)} ${(h.y + pr.dy).toFixed(2)}) rotate(${r.toFixed(2)})`);
      }
    }

    setAttr(this.body, 'transform', `translate(0 ${dy.toFixed(2)})`);
    const spread = 14 + Math.abs(LF.ax - LB.ax) * 0.5;
    setAttr(this.shadow, 'cx', ((LF.ax + LB.ax) / 2 + 3).toFixed(1)); setAttr(this.shadow, 'cy', '1');
    setAttr(this.shadow, 'rx', spread.toFixed(1)); setAttr(this.shadow, 'ry', '4.4');
    setAttr(this.shadow, 'opacity', (o.shadow * (p.plant ? 1 : 0.75)).toFixed(2));
    setAttr(this.root, 'transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(s * p.facing).toFixed(4)} ${s.toFixed(4)})`);
    setAttr(this.root, 'opacity', p.opacity.toFixed(3));
  }
}

export { RIG, CYCLE };
