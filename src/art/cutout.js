// Hybrid cutout rig (v2, production assets).
// Painted parts generated per asset (head with hair/headwear, costume, hands, sandal feet, held props) on a
// code skeleton whose arms and legs are tapered ink-brush strokes in the canonical limb colour. Proportions
// are measured from the canonical cast (assets/global/characters/char_cast_canonical.png): with H = 150
// units from sole to skull top, the skull is 0.147 H, the collar 0.168 H below the top, the belt 0.38 H,
// a knee-length hem 0.67 H. Joint values live in `fig.p` as plain numbers so GSAP can tween and scrub them.
// Angles are degrees, FORWARD-positive, 0 = limb hanging straight down.
import { asset } from './sprite.js';
import { NS, D2R, setAttr, clamp, lerp } from './util.js';

const INK = '#26201b';          // limb colour sampled from the canonical cast
const INK_LIT = '#4a3d33';      // faint brush sheen along one edge
const RIG = {
  H: 150,
  collarY: -125, neckY: -122, waistY: -93, hipY: -72,
  thigh: 34, shin: 30,          // ankle joint 8 units above the sole when standing straight
  upper: 29, fore: 23,
  shF: [11, -117], shB: [-11, -117], hipF: 3.5, hipB: -3.5,
  wArm: [5.0, 4.6, 4.1], wLeg: [6.4, 5.7, 5.0],
  hand: 7.2,                    // painted hand width
  foot: 18,                     // painted sandal length (heel to toe)
  ankleH: 8,                    // ankle joint height above the sole
};

// --------------------------------------------------------------------------- walk cycle
// Eight key poses per cycle (contact, down, passing, up for each leg); leg/arm B run half a cycle later.
// [thigh, knee, foot(heel-up +)] and [arm, elbow]. BOB: extra hip drop (down +).
const LEG = [[25, 3, -16], [17, 20, 0], [2, 6, 0], [-13, 4, 8], [-20, 12, 26], [-8, 44, 22], [13, 58, 4], [27, 26, -10]];
const ARM = [[-21, 12], [-15, 14], [-2, 17], [11, 22], [19, 30], [13, 24], [0, 18], [-13, 13]];
const BOB = [0, 1.7, 0, -1.4, 0, 1.7, 0, -1.4];
const POSE_HOLD = 0.5; // 0 = continuous spline, 1 = hard ease into every key (limited-animation feel)

const smooth = (f) => f * f * (3 - 2 * f);
const cr = (a, b, c, d, f) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
function key(table, ph, j) {
  const n = table.length, k = ((ph % 1) + 1) % 1 * n;
  const i = Math.floor(k);
  let f = k - i;
  f = lerp(f, smooth(f), POSE_HOLD);
  const g = (o) => table[(i + o + n) % n][j];
  return cr(g(-1), g(0), g(1), g(2), f);
}
const keyS = (table, ph) => key(table.map((v) => [v]), ph, 0);

function fk2(a, k, l1, l2) {
  const kx = Math.sin(a * D2R) * l1, ky = Math.cos(a * D2R) * l1;
  const b = a - k;
  return [kx + Math.sin(b * D2R) * l2, ky + Math.cos(b * D2R) * l2];
}
// ankle travel over a stance phase -> distance per full cycle (keeps the planted foot planted)
const CYCLE = 2 * (fk2(LEG[0][0], LEG[0][1], RIG.thigh, RIG.shin)[0] - fk2(LEG[4][0], LEG[4][1], RIG.thigh, RIG.shin)[0]);

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
  stand:   { armF: 5, elbowF: 8, armB: -5, elbowB: 8, legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0 },
  relaxed: { armF: 9, elbowF: 16, armB: -8, elbowB: 14, legF: 5, kneeF: 3, footF: 0, legB: -5, kneeB: 0, footB: 0, lean: 1, head: 0 },
  point:   { armF: 84, elbowF: 4, armB: -8, elbowB: 14, lean: 3, head: -2 },
  wave:    { armF: 150, elbowF: 24, armB: -6, elbowB: 12, lean: -2, head: -6 },
  talk:    { armF: 46, elbowF: 64, armB: 10, elbowB: 34, lean: 2, head: 1 },
  offer:   { armF: 62, elbowF: 58, armB: 52, elbowB: 62, lean: 4, head: 4 },
  carryHead: { armF: 160, elbowF: 70, armB: -6, elbowB: 14, lean: -1, head: 0 },
  sit:     { legF: 86, kneeF: 84, footF: 0, legB: 80, kneeB: 88, footB: 0, armF: 34, elbowF: 62, armB: 26, elbowB: 66, lean: 4, head: 2, drop: 30, plant: 0 },
  crouch:  { legF: 62, kneeF: 104, footF: -6, legB: -2, kneeB: 96, footB: 30, lean: 34, head: 16, armF: 48, elbowF: 18, armB: 30, elbowB: 26, drop: 0, plant: 1 },
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
      walk: 0, swingF: 1, swingB: 1, drop: 0, plant: 1, breath: 1, skirt: 0, gripF: 0, gripB: 0,
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
      <clipPath id="ck${id}"><rect x="-80" y="${W - 6}" width="160" height="140"/></clipPath>`;
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
    const h = asset(o.head);
    place(this.headImg, o.head, h.an.neck, 0, 0, h.upx);
    // skull top relative to the neck point (for things carried on the head)
    this.headTop = -h.an.neck[1] * h.h * h.upx + 0.02 * h.h * h.upx;
    this.handScale = RIG.hand / asset('char_hand_open').w;
    const f = asset('char_foot_sandal');
    this.footScale = RIG.foot / (f.w * (f.an.sole[0] + 0.36));
    // anchor point inside the foot image that sits on the ankle joint: above the sole by ankleH
    this.footAn = [f.an.ankle[0], f.an.sole[1] - RIG.ankleH / (f.h * this.footScale)];
    for (const e of [this.footF, this.footB]) place(e, 'char_foot_sandal', this.footAn, 0, 0, this.footScale);
    for (const e of [this.handF, this.handB]) place(e, 'char_hand_open', asset('char_hand_open').an.wrist, 0, 0, this.handScale);
    // sole extent relative to the ankle joint (for ground contact)
    this.heel = [(0.03 - f.an.ankle[0]) * f.w * this.footScale, RIG.ankleH];
    this.toe = [(0.97 - f.an.ankle[0]) * f.w * this.footScale, RIG.ankleH];
  }

  /** Attach a painted prop. where: 'F' | 'B' (hands) | 'head'. grip = [u,v] in prop image space. */
  hold(where, key, { w = 30, grip = [0.5, 0.5], rot = 0, mode = 'hand', dx = 0, dy = 0, behind = false } = {}) {
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
    const pr = { where, g, rot, mode, dx, dy, key };
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

  /** Walk to x over dur. The stride is derived from distance, so scrubbing is exact and feet stay planted. */
  walk(tl, at, toX, dur, { ease = 'sine.inOut', face = true, blend = 0.32 } = {}) {
    const from = this._wx;
    const dir = Math.sign(toX - from) || this.p.facing;
    if (face) tl.set(this.p, { facing: dir }, at);
    tl.to(this.p, { x: toX, duration: dur, ease }, at);
    tl.to(this.p, { walk: 1, duration: blend, ease: 'sine.out' }, at);
    tl.to(this.p, { walk: 0, duration: blend + 0.15, ease: 'sine.inOut' }, at + dur - blend * 0.7);
    this._wx = toX;
    return this;
  }

  // ------------------------------------------------------------------------- render
  render(t) {
    const p = this.p, o = this.o;
    const s = p.s;
    const W = clamp(p.walk, 0, 1);
    const ph = W > 0.001 ? (((p.x * p.facing) / (CYCLE * s)) % 1 + 1) % 1 : 0;
    const ph2 = ph + 0.5;
    const mix = (a, b, w = W) => a + (b - a) * w;

    const legF = mix(p.legF, key(LEG, ph, 0)), kneeF = mix(p.kneeF, key(LEG, ph, 1)), footF = mix(p.footF, key(LEG, ph, 2));
    const legB = mix(p.legB, key(LEG, ph2, 0)), kneeB = mix(p.kneeB, key(LEG, ph2, 1)), footB = mix(p.footB, key(LEG, ph2, 2));
    const armF = mix(p.armF, key(ARM, ph2, 0), W * p.swingF), elbowF = mix(p.elbowF, key(ARM, ph2, 1), W * p.swingF);
    const armB = mix(p.armB, key(ARM, ph, 0), W * p.swingB), elbowB = mix(p.elbowB, key(ARM, ph, 1), W * p.swingB);
    const bob = W * keyS(BOB, ph);
    const breathe = Math.sin(t * 1.6 + o.seed) * 0.55 * p.breath * (1 - W);
    const lean = p.lean + W * 4;

    // ---- legs (hip row at RIG.hipY); feet are painted sandals rotated about the ankle joint
    const hipY = RIG.hipY + p.drop;
    const rot = (v, a) => { const c = Math.cos(a * D2R), si = Math.sin(a * D2R); return [v[0] * c - v[1] * si, v[0] * si + v[1] * c]; };
    const leg = (a, k, f, hx) => {
      const kx = hx + Math.sin(a * D2R) * RIG.thigh, ky = hipY + Math.cos(a * D2R) * RIG.thigh;
      const b = a - k;
      const ax = kx + Math.sin(b * D2R) * RIG.shin, ay = ky + Math.cos(b * D2R) * RIG.shin;
      const fa = -f; // heel-up (f > 0) tips the toe down: rotate the foot counter-clockwise about the ankle
      const hl = rot(this.heel, fa), tl = rot(this.toe, fa);
      return { hx, kx, ky, ax, ay, fa, heel: [ax + hl[0], ay + hl[1]], toe: [ax + tl[0], ay + tl[1]] };
    };
    const LF = leg(legF, kneeF, footF, RIG.hipF), LB = leg(legB, kneeB, footB, RIG.hipB);
    const low = Math.max(LF.heel[1], LF.toe[1], LB.heel[1], LB.toe[1]);
    const dy = p.plant * -low + bob;

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

    // ---- upper body: lean about the hip, breathing, shoulder counter-swing
    const tilt = W * Math.sin(ph * 4 * Math.PI) * 0.8;
    const upT = `rotate(${(lean + tilt).toFixed(2)} 0 ${hipY.toFixed(2)}) translate(0 ${(p.drop + breathe * 0.4).toFixed(2)})`;
    setAttr(this.upper, 'transform', upT);
    setAttr(this.upperB, 'transform', upT);
    const counter = W * Math.sin(ph * 2 * Math.PI) * 1.6;
    const arm = (el, hi, hand, sh, a, e, cx) => {
      const sx = sh[0] + cx, sy = sh[1];
      const ex = sx + Math.sin(a * D2R) * RIG.upper, ey = sy + Math.cos(a * D2R) * RIG.upper;
      const b = a + e;
      const wx = ex + Math.sin(b * D2R) * RIG.fore, wy = ey + Math.cos(b * D2R) * RIG.fore;
      limb(el, hi, [[sx, sy], [ex, ey], [wx, wy]], RIG.wArm);
      setAttr(hand, 'transform', `translate(${wx.toFixed(2)} ${wy.toFixed(2)}) rotate(${(-b).toFixed(2)})`);
      // grip point a little inside the painted fist
      return { x: wx + Math.sin(b * D2R) * RIG.hand * 0.55, y: wy + Math.cos(b * D2R) * RIG.hand * 0.55, ang: b };
    };
    const hF = arm(this.armF, this.armFhi, this.handF, RIG.shF, armF, elbowF, counter);
    const hB = arm(this.armB, null, this.handB, RIG.shB, armB, elbowB, -counter);

    // ---- head: stabilised against the torso lean/tilt
    const headA = p.head - (lean + tilt) * 0.75 + Math.sin(t * 0.7 + o.seed) * 0.8 * (1 - W);
    setAttr(this.headG, 'transform', `translate(0 ${(RIG.neckY + breathe * 0.5).toFixed(2)}) rotate(${headA.toFixed(2)})`);

    // ---- skirt: follows the legs with a little lag (secondary motion)
    const legSum = (legF + legB) * 0.5;
    const sk = clamp(-legSum * 0.2 - W * Math.sin((ph - 0.08) * 4 * Math.PI) * 2.2 + p.skirt, -16, 16);
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
