// Stylised stick-figure rig.
// All joint values live in `fig.p` as plain numbers so GSAP can tween them.
// Convention: angles are in degrees, FORWARD-positive, 0 = limb hanging straight down.
import { C, mix, lighten, darken } from './palette.js';
import { D2R, mount, setAttr, clamp, lerp } from './util.js';
import { propMarkup } from './props.js';

const SK = C.charcoal;       // "skin": heads, limbs
const L1 = 29, L2 = 29;      // thigh / shin
const A1 = 19, A2 = 19;      // upper arm / forearm
const SHOULDER_Y = -39;
const NECK_Y = -42;
const HEAD_Y = -54;
const HEAD_R = 10;

export const POSES = {
  stand:   { armF: 7, elbowF: 14, armB: -7, elbowB: 14, legF: 3, kneeF: 0, legB: -3, kneeB: 0, lean: 0, head: 0 },
  relaxed: { armF: 12, elbowF: 22, armB: -10, elbowB: 18, legF: 4, kneeF: 2, legB: -5, kneeB: 0, lean: 0, head: 0 },
  point:   { armF: 88, elbowF: 4, armB: -8, elbowB: 16, lean: 2, head: 0 },
  pointUp: { armF: 150, elbowF: 6, armB: -8, elbowB: 16, lean: -2, head: -6 },
  raise:   { armF: 165, elbowF: 8, armB: 158, elbowB: 10, lean: -3, head: -8 },
  cheer:   { armF: 150, elbowF: 30, armB: 145, elbowB: 30, lean: -4, head: -6 },
  speak:   { armF: 62, elbowF: 58, armB: 8, elbowB: 36, lean: 2, head: 2 },
  orate:   { armF: 118, elbowF: 40, armB: 24, elbowB: 52, lean: 3, head: -3 },
  offer:   { armF: 70, elbowF: 70, armB: 62, elbowB: 70, lean: 3, head: 0 },
  read:    { armF: 52, elbowF: 88, armB: 40, elbowB: 98, lean: 6, head: 14 },
  guard:   { armF: 46, elbowF: 96, armB: 58, elbowB: 70, lean: 5, head: 0 },
  thrust:  { armF: 52, elbowF: 98, armB: 84, elbowB: 18, lean: 14, head: 4 },
  ready:   { armF: 44, elbowF: 98, armB: 122, elbowB: 52, lean: 4, head: 0 },
  salute:  { armF: 168, elbowF: 6, armB: -6, elbowB: 12, lean: -2, head: -6 },
  bow:     { armF: 24, elbowF: 40, armB: 20, elbowB: 40, lean: 28, head: 18 },
  sit:     { armF: 30, elbowF: 72, armB: 24, elbowB: 74, legF: 88, kneeF: 90, legB: 84, kneeB: 92, lean: 4, head: 0 },
  sitLean: { armF: 40, elbowF: 100, armB: 10, elbowB: 30, legF: 88, kneeF: 90, legB: 84, kneeB: 92, lean: 12, head: 10 },
  hands:   { armF: 20, elbowF: 98, armB: 16, elbowB: 100, lean: 0, head: 0 },
  kneel:   { armF: 30, elbowF: 40, armB: 20, elbowB: 40, legF: 80, kneeF: 100, legB: -10, kneeB: 120, lean: 8, head: 8 },
  sword:   { armF: 150, elbowF: 18, armB: -16, elbowB: 24, lean: -6, head: -4 },
};

export class Figure {
  constructor(scene, parent, o = {}) {
    this.scene = scene;
    const d = {
      outfit: 'chiton', color: C.ivory, trim: C.terracotta, hem: 0.46, flare: 6, damp: 1,
      cloak: null, cloakType: 'back', hair: null, hairColor: '#7B4528', beard: null,
      helmet: null, crest: C.red, metal: C.bronze, wreath: false, hat: null, hatColor: C.blue,
      legColor: null, legW: 4.6, cuirass: null, eyes: true, shadow: true, idle: 1, seed: Math.random() * 100,
      x: 0, y: 0, s: 1, facing: 1, opacity: 1, armW: 4.2, sleeves: null,
    };
    this.o = Object.assign(d, o);
    this.p = Object.assign({
      x: this.o.x, y: this.o.y, s: this.o.s, facing: this.o.facing,
      lean: 0, head: 0, look: 0,
      armF: 7, elbowF: 14, armB: -7, elbowB: 14,
      legF: 3, kneeF: 0, legB: -3, kneeB: 0,
      walk: 0, walkAmp: 0, run: 0, swing: 1,
      lift: 0, cape: 0, rot: 0, opacity: this.o.opacity, shadow: 1,
      holdF: 0, holdB: 0, mask: this.o.mask ? 1 : 0,
    });
    this.holds = {};
    this.build(parent);
    scene.figs.push(this);
    this.render(0);
  }

  // ---------------------------------------------------------------- build
  build(parent) {
    const o = this.o;
    const tunicFill = o.color, tunicLine = darken(o.color, 0.32);
    const outfit = o.outfit;
    const bare = outfit === 'bare';
    const long = outfit === 'peplos' || outfit === 'robe';
    const legStroke = o.legColor || SK;
    this.hem = long ? (o.hem > 0.46 ? o.hem : 0.97) : o.hem;
    this.damp = long ? 0.42 : o.damp;
    this.flare = long ? Math.max(o.flare, 9) : o.flare;
    const gid = 'fg' + Math.floor(Math.random() * 1e9);
    const shade = darken(tunicFill, 0.18);

    const limb = (len, w, col, inner = '') =>
      `<line x1="0" y1="0" x2="0" y2="${len}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>${inner}`;

    const leg = (id) => `
      <g class="leg${id}">
        ${limb(L1, o.legW, legStroke, `
        <g class="shin${id}" transform="translate(0 ${L1})">
          ${limb(L2, o.legW * 0.92, legStroke, `<g class="foot${id}" transform="translate(0 ${L2})"><path d="M-1.5 0 L7 0" stroke="${SK}" stroke-width="3.6" stroke-linecap="round"/></g>`)}
        </g>`)}
      </g>`;

    const arm = (id) => `
      <g class="arm${id}" transform="translate(${id === 'F' ? 1.5 : -1.5} ${SHOULDER_Y})">
        ${limb(A1, o.armW, o.sleeves || SK, `
        <g class="fore${id}" transform="translate(0 ${A1})">
          ${limb(A2, o.armW * 0.92, SK, `<g class="hand${id}" transform="translate(0 ${A2})"><circle r="2.7" fill="${SK}"/><g class="hold"></g></g>`)}
        </g>`)}
      </g>`;

    // head furniture ------------------------------------------------
    let hairBack = '', hairFront = '', hat = '';
    if (o.hair === 'long') {
      hairBack = `<path class="hairL" d="M-1 -10.5 C-13 -10 -16 6 -13 22 C-9 27 -4 26 -1 23 C-4 14 -2 4 4 -8 Z" fill="${o.hairColor}"/>`;
      hairFront = `<path d="M-9 -3 C-8 -12 3 -14 8 -8 C3 -9 -2 -6 -4 2 Z" fill="${o.hairColor}"/>`;
    } else if (o.hair === 'bun') {
      hairBack = `<circle cx="-10" cy="-5" r="5" fill="${o.hairColor}"/>`;
      hairFront = `<path d="M-10 0 C-10 -12 2 -13 8 -8 C2 -9 -3 -5 -4 1 Z" fill="${o.hairColor}"/>`;
    } else if (o.hair === 'curls') {
      hairFront = `<path d="M-11 2 C-14 -8 -6 -15 3 -13 C10 -12 12 -6 10 -2 C6 -8 0 -8 -3 -3 C-4 0 -7 3 -11 2 Z" fill="${o.hairColor}"/>
        <circle cx="-9.5" cy="3" r="3.2" fill="${o.hairColor}"/><circle cx="-6" cy="-9.5" r="3.2" fill="${o.hairColor}"/><circle cx="1" cy="-12" r="3" fill="${o.hairColor}"/>`;
    } else if (o.hair === 'short') {
      hairFront = `<path d="M-10 1 C-12 -9 -3 -14 5 -12 C10 -10 11 -5 10 -3 C5 -7 -1 -6 -4 -1 Z" fill="${o.hairColor}"/>`;
    }
    let maskM = '';
    if (o.mask) {
      const happy = o.mask === 'happy', mc = o.maskColor || C.ivory;
      maskM = `<g class="mk"><path d="M-9 -13 C-7 -19 12 -19 14 -13 C17 -2 12 12 2 16 C-8 12 -12 -2 -9 -13 Z" fill="${mc}" stroke="${darken(mc, .45)}" stroke-width="1.5"/>
        <ellipse cx="-2" cy="-5" rx="3.4" ry="${happy ? 1.9 : 3.4}" fill="${C.charcoal}" transform="rotate(${happy ? 12 : -14} -2 -5)"/>
        <ellipse cx="8" cy="-5" rx="3.4" ry="${happy ? 1.9 : 3.4}" fill="${C.charcoal}" transform="rotate(${happy ? -12 : 14} 8 -5)"/>
        <path d="${happy ? 'M-2 3 C1 12 8 12 11 3 Z' : 'M0 11 C3 5 8 5 10 11 Z'}" fill="${C.charcoal}"/></g>`;
    }
    let beard = '';
    if (o.beard) beard = `<path d="M3 4 C11 2.5 13 8 9 18 C6 15 2 12 -2 7 Z" fill="${o.beard}" stroke="${darken(o.beard, 0.25)}" stroke-width=".6"/>`;
    let helm = '';
    if (o.helmet) {
      const m = o.metal;
      helm = `
        <path class="crest" d="M-12 -4 C-23 -32 8 -44 23 -22 C11 -27 2 -20 -2 -6 Z" fill="${o.crest}" stroke="${darken(o.crest, 0.35)}" stroke-width=".8"/>
        <path d="M-12 3 C-14 -16 -2 -18 5 -16 C12 -14 13 -5 12 0 L8 -1 C4 -4 -3 -3 -5 4 L-8 12 L-13 10 Z" fill="${m}" stroke="${darken(m, 0.45)}" stroke-width="1"/>
        <path d="M-9 -6 C-6 -13 0 -14 4 -13" fill="none" stroke="${lighten(m, 0.55)}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
        <path d="M6 -2 L11 -1 L11 3 L8 5 Z" fill="${darken(m, 0.2)}"/>`;
    }
    if (o.wreath) {
      let leaves = '';
      for (let i = 0; i < 9; i++) {
        const a = (200 + i * 17) * D2R;
        leaves += `<ellipse cx="${(Math.cos(a) * 10.6).toFixed(1)}" cy="${(Math.sin(a) * 10.6).toFixed(1)}" rx="3.4" ry="1.5" transform="rotate(${(200 + i * 17 + 90).toFixed(0)} ${(Math.cos(a) * 10.6).toFixed(1)} ${(Math.sin(a) * 10.6).toFixed(1)})" fill="${i % 2 ? C.olive : lighten(C.olive, 0.25)}"/>`;
      }
      hat += leaves;
    }
    if (o.hat === 'turban') {
      hat += `<path d="M-11 -2 C-13 -15 3 -19 10 -11 C12 -6 11 -3 10 -1 C4 -5 -3 -5 -11 -2 Z" fill="${o.hatColor}" stroke="${darken(o.hatColor, .4)}" stroke-width=".8"/>
        <path d="M-9 -7 C-3 -11 3 -11 9 -8 M-10 -4 C-3 -8 3 -8 10 -5" stroke="${C.sandstone}" stroke-width="1" fill="none"/>`;
    } else if (o.hat === 'hood') {
      hat += `<path d="M-12 8 C-15 -12 0 -18 8 -11 C12 -7 11 -2 10 0 C4 -6 -2 -4 -5 6 Z" fill="${o.hatColor}" stroke="${darken(o.hatColor, .4)}" stroke-width=".8"/>`;
    } else if (o.hat === 'petasos') {
      hat += `<ellipse cx="0" cy="-8" rx="17" ry="3.6" fill="${o.hatColor}" stroke="${darken(o.hatColor, .4)}" stroke-width=".8"/><path d="M-8 -9 C-7 -17 7 -17 8 -9 Z" fill="${o.hatColor}"/>`;
    }

    // clothing -------------------------------------------------------
    let tunic = '', skirt = '', cuirass = '', belt = '', drape = '', capeP = '', trim = '';
    if (!bare) {
      tunic = `<path class="tun" d="M-8 -41.5 Q0 -44 8 -41.5 L11.5 -36.5 L9.6 -18 L8.6 4 L-8.6 4 L-9.6 -18 L-11.5 -36.5 Z" fill="${tunicFill}" stroke="${tunicLine}" stroke-width="1"/>
        <path d="M2 -41 L10 -36 L8.6 4 L3 4 Z" fill="${shade}" opacity=".35"/>`;
      skirt = `<path class="skirt" d="M-8 -4 L8 -4 L12 24 L-12 24 Z" fill="${tunicFill}" stroke="${tunicLine}" stroke-width="1"/>`;
      if (o.trim) trim = `<path class="trim" d="" fill="none" stroke="${o.trim}" stroke-width="2.2"/>`;
      if (o.belt !== false && outfit !== 'robe') belt = `<path d="M-9 -15 L9 -15 L9 -11.5 L-9 -11.5 Z" fill="${o.beltColor || o.trim || C.terracotta}" stroke="${darken(o.beltColor || o.trim || C.terracotta, 0.35)}" stroke-width=".7"/>`;
    }
    if (o.cuirass) {
      const m = o.cuirass;
      cuirass = `<path d="M-8.6 -40.5 Q0 -43.5 8.6 -40.5 L10.5 -34 L9 -14 L-9 -14 L-10.5 -34 Z" fill="${m}" stroke="${darken(m, 0.45)}" stroke-width="1"/>
        <path d="M-3 -38 L-3 -17 M3 -38 L3 -17" stroke="${lighten(m, 0.4)}" stroke-width="1" opacity=".7"/>`;
    }
    if (o.cloak) {
      const cc = o.cloak;
      if (o.cloakType === 'drape') {
        drape = `<path d="M-9.5 -40 L-1 -42 L12 -8 L15 22 L3 26 L6 -2 L-9 -22 Z" fill="${cc}" stroke="${darken(cc, 0.35)}" stroke-width="1"/>
          <path d="M-1 -42 L12 -8 L15 22" fill="none" stroke="${lighten(cc, .3)}" stroke-width="1" opacity=".6"/>`;
      } else {
        capeP = `<path class="capeP" d="" fill="${cc}" stroke="${darken(cc, 0.4)}" stroke-width="1"/>`;
      }
    }

    const html = `
    <g class="fg">
      <ellipse class="sh" cx="0" cy="0" rx="21" ry="4.6" fill="#1b120b" opacity=".22"/>
      <g class="hp">
        ${leg('B')}${leg('F')}
        ${skirt}${trim}
        <g class="to">
          ${capeP}
          <line x1="0" y1="0" x2="0" y2="${NECK_Y}" stroke="${SK}" stroke-width="4.6" stroke-linecap="round"/>
          ${arm('B')}
          ${tunic}${cuirass}${belt}${drape}
          <g class="hd" transform="translate(0 ${NECK_Y})">
            <line x1="0" y1="0" x2="0" y2="-4" stroke="${SK}" stroke-width="4.6" stroke-linecap="round"/>
            <g class="hh" transform="translate(0 ${HEAD_Y - NECK_Y})">
              ${hairBack}
              <circle r="${HEAD_R}" fill="${SK}"/>
              ${hairFront}${beard}
              ${o.eyes ? `<g class="eyes" fill="${C.ivory}"><circle class="e1" cx="3.4" cy="-2" r="1.9"/><circle class="e2" cx="7.6" cy="-2" r="1.9"/></g>` : ''}
              ${helm}${hat}${maskM}
            </g>
          </g>
          ${arm('F')}
        </g>
      </g>
    </g>`;
    this.root = mount(parent, html);
    const q = (s) => this.root.querySelector(s);
    this.r = {
      sh: q('.sh'), hp: q('.hp'), to: q('.to'), hd: q('.hd'), hh: q('.hh'),
      legF: q('.legF'), shinF: q('.shinF'), footF: q('.footF'),
      legB: q('.legB'), shinB: q('.shinB'), footB: q('.footB'),
      armF: q('.armF'), foreF: q('.foreF'), handF: q('.handF'),
      armB: q('.armB'), foreB: q('.foreB'), handB: q('.handB'),
      skirt: q('.skirt'), capeP: q('.capeP'), trim: q('.trim'), eyes: q('.eyes'), crest: q('.crest'),
      hairL: q('.hairL'), mk: q('.mk'),
    };
    this.holdEl = { F: q('.handF .hold'), B: q('.handB .hold') };
  }

  /** Put a prop into a hand. mode 'world' keeps its orientation independent of the arm. */
  hold(hand, name, opts = {}) {
    const pm = propMarkup(name, opts);
    const host = this.holdEl[hand];
    host.innerHTML = pm.markup;
    this.holds[hand] = { el: host, tick: pm.tick, mode: opts.mode || 'rel', ox: opts.x || 0, oy: opts.y || 0, node: host.firstElementChild };
    if (opts.rot != null) this.p['hold' + hand] = opts.rot;
    return this;
  }
  drop(hand) {
    this.holdEl[hand].innerHTML = '';
    delete this.holds[hand];
    return this;
  }

  // ---------------------------------------------------------------- pose helpers
  set(pose, extra) {
    Object.assign(this.p, typeof pose === 'string' ? POSES[pose] : pose, extra);
    return this;
  }
  /** Tween joints to a pose (name or object). */
  go(tl, at, dur, pose, ease = 'power2.inOut', extra) {
    const target = Object.assign({}, typeof pose === 'string' ? POSES[pose] : pose, extra);
    tl.to(this.p, Object.assign({ duration: dur, ease }, target), at);
    return this;
  }
  /** Walk (or run) in x for `dur` seconds. */
  walk(tl, at, toX, dur, { y, run = 0, ease = 'none', face = true, settle = 0.35 } = {}) {
    const p = this.p;
    const dx = toX - (this._wx ?? p.x);
    const dy = y != null ? y - (this._wy ?? p.y) : 0;
    const stride = lerp(96, 150, run) * p.s;
    const cycles = Math.hypot(dx, dy) / stride;
    const f = dx >= 0 ? 1 : -1;
    if (face && Math.sign(f) !== Math.sign(p.facing)) tl.set(p, { facing: f }, at);
    tl.to(p, { x: toX, duration: dur, ease }, at);
    if (y != null) tl.to(p, { y, duration: dur, ease }, at);
    tl.to(p, { walk: `+=${cycles}`, duration: dur, ease: 'none' }, at);
    tl.to(p, { walkAmp: 1, run, duration: Math.min(0.35, dur / 3), ease: 'sine.out' }, at);
    tl.to(p, { walkAmp: 0, duration: settle, ease: 'sine.inOut' }, at + dur - settle * 0.6);
    this._wx = toX;
    if (y != null) this._wy = y;
    return this;
  }

  // ---------------------------------------------------------------- render
  render(t = 0) {
    const p = this.p, o = this.o, r = this.r;
    const w = p.walkAmp, run = p.run;
    const ph = p.walk * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
    const A = lerp(24, 44, run), K = lerp(46, 82, run);
    const idle = o.idle * (1 - w);
    const ip = o.seed;
    const breath = Math.sin(t * 1.7 + ip) * idle;
    const sway = Math.sin(t * 0.8 + ip * 1.7) * idle;

    const lF = p.legF + w * A * sn;
    const lB = p.legB - w * A * sn;
    const kF = p.kneeF + w * (K * Math.max(0, cs) + 6);
    const kB = p.kneeB + w * (K * Math.max(0, -cs) + 6);
    const swF = p.swing, swB = p.swing;
    const aF = p.armF - w * lerp(24, 54, run) * sn * swF + breath * 1.4;
    const aB = p.armB + w * lerp(24, 54, run) * sn * swB - breath * 1.4;
    const eF = p.elbowF + w * lerp(12, 62, run) * (0.6 + 0.4 * cs) * swF;
    const eB = p.elbowB + w * lerp(12, 62, run) * (0.6 - 0.4 * cs) * swB;
    const lean = p.lean + w * lerp(2, 13, run) + sway * 0.7;
    const headT = p.head + sway * 1.2 - w * lerp(0, 8, run);

    // planted foot decides hip height
    const yLeg = (a, k) => L1 * Math.cos(a * D2R) + L2 * Math.cos((a - k) * D2R);
    const hipH = Math.max(yLeg(lF, kF), yLeg(lB, kB)) + p.lift - breath * 0.35;

    const f = p.facing, s = p.s;
    const yOff = o.anchor === 'hip' ? hipH : 0;
    setAttr(this.root, 'transform', `translate(${p.x.toFixed(1)} ${(p.y + yOff).toFixed(1)}) rotate(${p.rot.toFixed(1)}) scale(${(f * s).toFixed(3)} ${s.toFixed(3)})`);
    if (p.opacity !== this.root._op) { this.root.style.opacity = p.opacity; this.root._op = p.opacity; }
    setAttr(r.sh, 'opacity', (0.22 * p.shadow * clamp(1 - p.lift / 90, 0, 1)).toFixed(3));
    setAttr(r.sh, 'transform', `scale(${(1 - p.lift / 160).toFixed(3)} 1)`);
    setAttr(r.hp, 'transform', `translate(0 ${(-hipH).toFixed(2)})`);
    setAttr(r.to, 'transform', `rotate(${lean.toFixed(2)})`);
    setAttr(r.hd, 'transform', `translate(0 ${NECK_Y}) rotate(${headT.toFixed(2)})`);

    // legs
    setAttr(r.legF, 'transform', `translate(1 0) rotate(${(-lF).toFixed(2)})`);
    setAttr(r.shinF, 'transform', `translate(0 ${L1}) rotate(${kF.toFixed(2)})`);
    setAttr(r.footF, 'transform', `translate(0 ${L2}) rotate(${((lF - kF) * 0.85).toFixed(1)})`);
    setAttr(r.legB, 'transform', `translate(-1 0) rotate(${(-lB).toFixed(2)})`);
    setAttr(r.shinB, 'transform', `translate(0 ${L1}) rotate(${kB.toFixed(2)})`);
    setAttr(r.footB, 'transform', `translate(0 ${L2}) rotate(${((lB - kB) * 0.85).toFixed(1)})`);

    // arms
    setAttr(r.armF, 'transform', `translate(1.5 ${SHOULDER_Y}) rotate(${(-aF).toFixed(2)})`);
    setAttr(r.foreF, 'transform', `translate(0 ${A1}) rotate(${(-eF).toFixed(2)})`);
    setAttr(r.armB, 'transform', `translate(-1.5 ${SHOULDER_Y}) rotate(${(-aB).toFixed(2)})`);
    setAttr(r.foreB, 'transform', `translate(0 ${A1}) rotate(${(-eB).toFixed(2)})`);

    // props held
    for (const h of ['F', 'B']) {
      const hd = this.holds[h];
      if (!hd) continue;
      const a = h === 'F' ? aF : aB, e = h === 'F' ? eF : eB;
      const hr = p['hold' + h];
      const rot = hd.mode === 'world' ? (a + e - lean) - hr : -hr;
      setAttr(hd.el, 'transform', `translate(${hd.ox} ${hd.oy}) rotate(${rot.toFixed(1)})`);
      if (hd.tick) hd.tick(t, hd.node, this);
    }

    if (r.mk) setAttr(r.mk, 'opacity', String(Math.round(p.mask * 100) / 100));
    // eyes: look + blink
    if (r.eyes) {
      const blink = ((t * 0.31 + ip) % 4.3) < 0.1 ? 0.12 : 1;
      setAttr(r.eyes, 'transform', `translate(${(p.look * 1.6).toFixed(2)} 0) translate(0 -2) scale(1 ${blink}) translate(0 2)`);
    }

    // skirt: hem follows the swinging legs
    if (r.skirt) {
      const dmp = Math.max(lF, lB) < 60 ? this.damp : 1; // seated: let the hem follow the folded legs
      const hemPt = (a, k) => {
        const d = this.hem * (L1 + L2);
        a *= dmp; k *= dmp;
        if (d <= L1) return [Math.sin(a * D2R) * d, Math.cos(a * D2R) * d];
        const kx = Math.sin(a * D2R) * L1, ky = Math.cos(a * D2R) * L1;
        const dd = d - L1;
        return [kx + Math.sin((a - k) * D2R) * dd, ky + Math.cos((a - k) * D2R) * dd];
      };
      const [fx, fy] = hemPt(lF, kF), [bx, by] = hemPt(lB, kB);
      const fl = this.flare;
      const x1 = bx - fl, x2 = fx + fl;
      const mx = (x1 + x2) / 2, my = Math.max(fy, by) + 2.8 + Math.abs(sn) * w * 1.5;
      const wob = Math.sin(t * 2.2 + ip) * 0.8 * (o.idle ? 1 : 0);
      setAttr(r.skirt, 'd', `M-8.5 -5 L8.5 -5 L${(x2 + wob).toFixed(1)} ${fy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x1 + wob).toFixed(1)} ${by.toFixed(1)} Z`);
      if (r.trim) {
        setAttr(r.trim, 'd', `M${(x2 + wob).toFixed(1)} ${(fy - 1).toFixed(1)} Q${mx.toFixed(1)} ${(my - 1.2).toFixed(1)} ${(x1 + wob).toFixed(1)} ${(by - 1).toFixed(1)}`);
      }
    }
    // cape
    if (r.capeP) {
      const cw = clamp(p.cape, 0, 1);
      const fl = Math.sin(t * 5.2 + ip) * 3.2 * (0.25 + cw) + Math.sin(t * 2.3 + ip) * 1.5;
      const fl2 = Math.sin(t * 4.1 + ip + 1.3) * 3.4 * (0.25 + cw);
      const Lx = 16 + 52 * cw, drop = 70 - 78 * cw;
      const x1 = -4 - Lx, y1 = -40 + drop * 0.85 + fl, x2 = -3 - Lx * 0.78, y2 = -28 + drop + fl2 * 0.7 + (cw ? 10 : 0);
      setAttr(r.capeP, 'd',
        `M-3 -41 Q${(-3 - Lx * 0.4).toFixed(1)} ${(-44 + fl * 0.3).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
        `Q${(x1 * 0.9 + x2 * 0.1 + fl).toFixed(1)} ${((y1 + y2) / 2 + 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} ` +
        `Q${(-3 - Lx * 0.3).toFixed(1)} ${(y2 * 0.7 - 6).toFixed(1)} 5 -24 Z`);
    }
    if (r.hairL) {
      setAttr(r.hairL, 'transform', `rotate(${(Math.sin(t * 2.1 + ip) * 2.5 + w * 6 + (p.cape * 14)).toFixed(1)} -2 -8)`);
    }
    if (r.crest) {
      setAttr(r.crest, 'transform', `rotate(${(Math.sin(t * 3 + ip) * 3 - w * 5 - p.cape * 10).toFixed(1)} -4 -8)`);
    }
  }
}
