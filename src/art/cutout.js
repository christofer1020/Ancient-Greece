// Hybrid cutout rig.
// Illustrated parts from the asset library (head + hair/headwear, costume torso, swinging skirt,
// optional cloak, held props) on a code-driven skeleton whose limbs are tapered brush strokes in the
// sheets' warm charcoal. Joint values live in `fig.p` as plain numbers so GSAP can tween and scrub them.
// Angles are degrees, FORWARD-positive, 0 = limb hanging straight down.
import { asset } from './sprite.js';
import { NS, D2R, setAttr, clamp, lerp } from './util.js';

const INK = '#22170f';          // limb colour sampled from the sheets (26,18,9), lifted a touch for screen
const INK_LIT = '#7a5c43';      // brush sheen along one edge
const RIG = {
  hipY: -66, thigh: 33, shin: 31, ankle: 3.2, heel: 3.2, toe: 10.5,
  neckY: -123, hemY: -31,
  upper: 27, fore: 23, fist: 3.9,
  headD: 23,
  wArm: [6.0, 4.8, 4.2], wLeg: [7.6, 6.0, 4.9],
};

// --------------------------------------------------------------------------- walk cycle
// Eight key poses per cycle (contact, down, passing, up for each leg). Leg/arm B use the same table
// half a cycle later. [thigh, knee, foot(heel-up +)] and [arm, elbow]. bob: extra hip drop (down +).
const LEG = [[25, 3, -18], [17, 20, 0], [2, 6, 0], [-13, 4, 9], [-20, 12, 30], [-8, 46, 26], [13, 62, 4], [27, 28, -12]];
const ARM = [[-21, 12], [-15, 14], [-2, 17], [11, 22], [19, 30], [13, 24], [0, 18], [-13, 13]];
const BOB = [0, 1.6, 0, -1.4, 0, 1.6, 0, -1.4];
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

// ankle travel over a stance phase -> distance covered per full cycle (keeps the planted foot planted)
function fk2(a, k, l1, l2) {
  const kx = Math.sin(a * D2R) * l1, ky = Math.cos(a * D2R) * l1;
  const b = a - k;
  return [kx + Math.sin(b * D2R) * l2, ky + Math.cos(b * D2R) * l2];
}
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
    let mid = from + d1 / 2;
    // take the long way round when the short way misses `via`
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
  stand:   { armF: 6, elbowF: 10, armB: -6, elbowB: 10, legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0, lean: 0, head: 0 },
  relaxed: { armF: 10, elbowF: 18, armB: -9, elbowB: 16, legF: 5, kneeF: 3, footF: 0, legB: -5, kneeB: 0, footB: 0, lean: 1, head: 0 },
  point:   { armF: 84, elbowF: 4, armB: -8, elbowB: 14, lean: 3, head: -2 },
  wave:    { armF: 150, elbowF: 24, armB: -6, elbowB: 12, lean: -2, head: -6 },
  talk:    { armF: 46, elbowF: 64, armB: 10, elbowB: 34, lean: 2, head: 1 },
  offer:   { armF: 62, elbowF: 58, armB: 52, elbowB: 62, lean: 4, head: 4 },
  carryHead: { armF: 168, elbowF: 132, armB: -6, elbowB: 14, lean: -1, head: 0 },
  carryHip:  { armB: 36, elbowB: 62 },
  sit:     { legF: 86, kneeF: 84, footF: 0, legB: 80, kneeB: 88, footB: 0, armF: 34, elbowF: 66, armB: 26, elbowB: 70, lean: 4, head: 2, drop: 31, plant: 0 },
  crouch:  { legF: 62, kneeF: 104, footF: -6, legB: -2, kneeB: 96, footB: 34, lean: 34, head: 16, armF: 48, elbowF: 18, armB: 30, elbowB: 26, drop: 0, plant: 1 },
};

let _id = 0;

export class Cutout {
  /**
   * o: { x, y, s, facing, costume, head, cloak, opacity, seed, shadow, swingF, swingB }
   */
  constructor(scene, parent, o = {}) {
    this.scene = scene;
    this.o = Object.assign({ costume: 'chiton_villager', head: 'head_neutral', cloak: null, s: 1, facing: 1, x: 0, y: 0, opacity: 1, seed: Math.random() * 10, shadow: 0.32 }, o);
    this.p = Object.assign({
      x: this.o.x, y: this.o.y, s: this.o.s, facing: this.o.facing, opacity: this.o.opacity,
      lean: 0, head: 0, look: 0,
      armF: 6, elbowF: 10, armB: -6, elbowB: 10,
      legF: 3, kneeF: 0, footF: 0, legB: -3, kneeB: 0, footB: 0,
      walk: 0, swingF: 1, swingB: 1, drop: 0, plant: 1, breath: 1, skirt: 0, run: 0,
    }, CPOSES.stand);
    this.props = [];
    this._wx = this.p.x;
    this.build(parent);
    scene.figs.push(this);
    this.render(0);
  }

  build(parent) {
    const o = this.o;
    const g = (cls, par) => { const e = document.createElementNS(NS, 'g'); if (cls) e.setAttribute('class', cls); par.appendChild(e); return e; };
    const img = (key, par) => {
      const a = asset(key);
      const e = document.createElementNS(NS, 'image');
      e.setAttribute('href', a.src);
      e.setAttribute('preserveAspectRatio', 'none');
      par.appendChild(e);
      return e;
    };
    const path = (par, fill, op) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('fill', fill); if (op != null) e.setAttribute('opacity', op); par.appendChild(e); return e; };

    this.root = g('cutout', parent);
    // contact shadow (code: light/shadow only)
    const gid = `cs${++_id}`;
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `<radialGradient id="${gid}"><stop offset="0" stop-color="#2a1d14" stop-opacity=".55"/><stop offset="1" stop-color="#2a1d14" stop-opacity="0"/></radialGradient>`;
    this.root.appendChild(defs);
    this.shadow = document.createElementNS(NS, 'ellipse');
    setAttr(this.shadow, 'fill', `url(#${gid})`);
    this.root.appendChild(this.shadow);

    this.body = g('body', this.root);
    this.upperB = g('upperB', this.body);
    if (o.cloak) {
      this.cloakG = g('cloak', this.upperB);
      this.cloakImg = img(o.cloak, this.cloakG);
    }
    this.armBG = g('armB', this.upperB);
    this.armB = path(this.armBG, INK);
    this.armBhi = path(this.armBG, INK_LIT, 0.32);
    this.legBG = g('legB', this.body);
    this.legB = path(this.legBG, INK);
    this.legFG = g('legF', this.body);
    this.legF = path(this.legFG, INK);
    this.legFhi = path(this.legFG, INK_LIT, 0.28);
    this.upper = g('upper', this.body);
    this.headG = g('head', this.upper);
    this.headImg = img(o.head, this.headG);
    this.skirtG = g('skirt', this.upper);
    this.skirtImg = img(o.costume + '_skirt', this.skirtG);
    this.torsoImg = img(o.costume + '_torso', this.upper);
    this.armFG = g('armF', this.upper);
    this.armF = path(this.armFG, INK);
    this.armFhi = path(this.armFG, INK_LIT, 0.32);
    this.layout();
  }

  /** Static image placement from the costume / head anchors. */
  layout() {
    const o = this.o;
    const ct = asset(o.costume + '_torso');
    const neck = ct.an.neck, hem = ct.an.hem, waist = ct.an.waist;
    const Hu = (RIG.hemY - RIG.neckY) / (hem[1] - neck[1]);
    const Wu = (Hu * ct.w) / ct.h;
    const ix = -neck[0] * Wu, iy = RIG.neckY - neck[1] * Hu;
    for (const e of [this.torsoImg, this.skirtImg]) {
      setAttr(e, 'x', ix.toFixed(2)); setAttr(e, 'y', iy.toFixed(2));
      setAttr(e, 'width', Wu.toFixed(2)); setAttr(e, 'height', Hu.toFixed(2));
    }
    this.waist = [ix + waist[0] * Wu, iy + waist[1] * Hu];
    const sh = (an) => [ix + an[0] * Wu, iy + an[1] * Hu];
    const sL = sh(ct.an.shoulderL), sR = sh(ct.an.shoulderR);
    // arms swing at the sides of the front-view torso, as in the sheets' walk poses
    this.shF = [lerp(0, sR[0], 0.62), sR[1] + 2];
    this.shB = [lerp(0, sL[0], 0.5), sL[1] + 2];
    this.torsoW = Wu;
    // head: scale so the skull matches RIG.headD, neck anchor on the collar
    const hd = asset(o.head);
    const hw = RIG.headD / hd.skull, hh = (hw * hd.h) / hd.w;
    setAttr(this.headImg, 'x', (-hd.an.neck[0] * hw).toFixed(2));
    setAttr(this.headImg, 'y', (-hd.an.neck[1] * hh).toFixed(2));
    setAttr(this.headImg, 'width', hw.toFixed(2)); setAttr(this.headImg, 'height', hh.toFixed(2));
    this.headTop = -hd.an.neck[1] * hh + hd.an.skull[1] * hh - RIG.headD / 2; // skull top relative to neck point
    this.neck = [0.5, RIG.neckY + 3];
    if (this.cloakImg) {
      const cl = asset(o.cloak);
      const cw = Wu * 1.45, ch = (cw * cl.h) / cl.w;
      const c = cl.an.collar || [0.5, 0.05];
      setAttr(this.cloakImg, 'x', (-c[0] * cw).toFixed(2)); setAttr(this.cloakImg, 'y', (-c[1] * ch).toFixed(2));
      setAttr(this.cloakImg, 'width', cw.toFixed(2)); setAttr(this.cloakImg, 'height', ch.toFixed(2));
    }
  }

  /** Attach an illustrated prop. where: 'F' | 'B' (hands) | 'head'. grip = [u,v] in prop image space. */
  hold(where, key, { w = 30, grip = [0.5, 0.5], rot = 0, mode = 'hand', dx = 0, dy = 0, behind = false } = {}) {
    const a = asset(key);
    const host = where === 'head' ? this.headG : where === 'F' ? this.armFG : this.armBG;
    const g = document.createElementNS(NS, 'g');
    const e = document.createElementNS(NS, 'image');
    const h = (w * a.h) / a.w;
    e.setAttribute('href', a.src);
    e.setAttribute('preserveAspectRatio', 'none');
    setAttr(e, 'x', (-grip[0] * w).toFixed(2)); setAttr(e, 'y', (-grip[1] * h).toFixed(2));
    setAttr(e, 'width', w.toFixed(2)); setAttr(e, 'height', h.toFixed(2));
    g.appendChild(e);
    if (behind) host.insertBefore(g, host.firstChild); else host.appendChild(g);
    const pr = { where, g, rot, mode, dx, dy, key, op: 1 };
    this.props.push(pr);
    this.holdP = this.holdP || {};
    return pr;
  }

  set(pose) { Object.assign(this.p, typeof pose === 'string' ? CPOSES[pose] : pose); return this; }

  /** Tween into a pose on a timeline. */
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

    // ---- legs (body space; hip at origin row RIG.hipY)
    const hipY = RIG.hipY + p.drop;
    const leg = (a, k, f, hx) => {
      const kx = hx + Math.sin(a * D2R) * RIG.thigh, ky = hipY + Math.cos(a * D2R) * RIG.thigh;
      const b = a - k;
      const ax = kx + Math.sin(b * D2R) * RIG.shin, ay = ky + Math.cos(b * D2R) * RIG.shin + RIG.ankle * 0.4;
      // foot: heel/toe roll. f > 0 lifts the heel (pivot near the toe), f < 0 lifts the toe (heel strike)
      const fr = f * D2R;
      const heel = [ax - Math.cos(fr) * RIG.heel, ay + RIG.ankle * 0.6 + Math.sin(fr) * RIG.heel * -1];
      const toe = [ax + Math.cos(fr) * RIG.toe, ay + RIG.ankle * 0.6 + Math.sin(fr) * RIG.toe];
      return { hx, kx, ky, ax, ay, heel, toe };
    };
    const LF = leg(legF, kneeF, footF, 1.2), LB = leg(legB, kneeB, footB, -1.2);
    const low = Math.max(LF.heel[1], LF.toe[1], LB.heel[1], LB.toe[1]) + RIG.wLeg[2] * 0.42;
    const dy = p.plant * -low + (1 - p.plant) * 0 + bob;

    const limb = (el, hi, P, w, foot) => {
      const pts = [];
      capsulePts(pts, P[0][0], P[0][1], w[0] / 2, P[1][0], P[1][1], w[1] / 2);
      capsulePts(pts, P[1][0], P[1][1], w[1] / 2, P[2][0], P[2][1], w[2] / 2);
      if (foot) capsulePts(pts, foot[0][0], foot[0][1], 2.7, foot[1][0], foot[1][1], 2.0);
      else capsulePts(pts, P[2][0], P[2][1], w[2] / 2, P[3][0], P[3][1], RIG.fist);
      setAttr(el, 'd', toPath(pts));
      if (hi) {
        const q = [];
        const off = (pt, k) => [pt[0] - w[k] * 0.16, pt[1] - w[k] * 0.1];
        capsulePts(q, ...off(P[0], 0), w[0] * 0.13, ...off(P[1], 1), w[1] * 0.11);
        capsulePts(q, ...off(P[1], 1), w[1] * 0.11, ...off(P[2], 2), w[2] * 0.09);
        setAttr(hi, 'd', toPath(q));
      }
    };
    limb(this.legF, this.legFhi, [[LF.hx, hipY], [LF.kx, LF.ky], [LF.ax, LF.ay]], RIG.wLeg, [LF.heel, LF.toe]);
    limb(this.legB, null, [[LB.hx, hipY], [LB.kx, LB.ky], [LB.ax, LB.ay]], RIG.wLeg, [LB.heel, LB.toe]);

    // ---- upper body: lean about the hip, breathing, shoulder counter-swing
    const tilt = W * Math.sin(ph * 4 * Math.PI) * 0.8;
    const upT = `rotate(${(lean + tilt).toFixed(2)} 0 ${hipY.toFixed(2)}) translate(0 ${(p.drop + breathe * 0.4).toFixed(2)})`;
    setAttr(this.upper, 'transform', upT);
    setAttr(this.upperB, 'transform', upT);
    const counter = W * Math.sin(ph * 2 * Math.PI) * 1.6;  // shoulders rotate against the hips
    const arm = (el, hi, sh, a, e, cx) => {
      const sx = sh[0] + cx, sy = sh[1];
      const ex = sx + Math.sin(a * D2R) * RIG.upper, ey = sy + Math.cos(a * D2R) * RIG.upper;
      const b = a + e;
      const wx = ex + Math.sin(b * D2R) * RIG.fore, wy = ey + Math.cos(b * D2R) * RIG.fore;
      const hx = wx + Math.sin(b * D2R) * 2.4, hy = wy + Math.cos(b * D2R) * 2.4;
      limb(el, hi, [[sx, sy], [ex, ey], [wx, wy], [hx, hy]], RIG.wArm);
      return { x: hx, y: hy, ang: b };
    };
    const hF = arm(this.armF, this.armFhi, this.shF, armF, elbowF, counter);
    const hB = arm(this.armB, this.armBhi, this.shB, armB, elbowB, -counter);

    // ---- head: stabilised against the torso lean/tilt, slight lag
    const headA = p.head - (lean + tilt) * 0.75 + Math.sin(t * 0.7 + o.seed) * 0.8 * (1 - W);
    setAttr(this.headG, 'transform', `translate(${this.neck[0]} ${(this.neck[1] + breathe * 0.5).toFixed(2)}) rotate(${headA.toFixed(2)})`);

    // ---- skirt: follows the legs with a little lag (secondary motion)
    const legSum = (legF + legB) * 0.5;
    const sk = clamp(-legSum * 0.22 - W * Math.sin((ph - 0.08) * 4 * Math.PI) * 2.2 + p.skirt, -16, 16);
    const [wx0, wy0] = this.waist;
    setAttr(this.skirtG, 'transform', `translate(${wx0.toFixed(2)} ${wy0.toFixed(2)}) skewX(${sk.toFixed(2)}) translate(${(-wx0).toFixed(2)} ${(-wy0).toFixed(2)})`);
    if (this.cloakG) {
      const fl = -4 - W * (6 + Math.sin(ph * 4 * Math.PI) * 2) + Math.sin(t * 1.3 + o.seed) * 1.2;
      setAttr(this.cloakG, 'transform', `translate(${(-this.torsoW * 0.12).toFixed(2)} ${RIG.neckY + 6}) rotate(${fl.toFixed(2)})`);
    }

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
    // shadow stays on the ground line
    const spread = 15 + Math.abs(LF.ax - LB.ax) * 0.5;
    setAttr(this.shadow, 'cx', ((LF.ax + LB.ax) / 2).toFixed(1)); setAttr(this.shadow, 'cy', '1');
    setAttr(this.shadow, 'rx', spread.toFixed(1)); setAttr(this.shadow, 'ry', '4.2');
    setAttr(this.shadow, 'opacity', (o.shadow * (p.plant ? 1 : 0.7)).toFixed(2));
    setAttr(this.root, 'transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(s * p.facing).toFixed(4)} ${s.toFixed(4)})`);
    setAttr(this.root, 'opacity', p.opacity.toFixed(3));
  }
}

export { RIG, CYCLE };
