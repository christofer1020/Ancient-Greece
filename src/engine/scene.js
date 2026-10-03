// Scene kit: layered SVG compositor with a parallax camera, ambient behaviours and a particle canvas.
import gsap from 'gsap';
import { NS, mount, setAttr, svgEl, clamp, lerp, rng } from '../art/util.js';
import { Figure } from '../art/figure.js';
import { Horse } from '../art/horse.js';

const W = 1600, H = 900;

// ---------------------------------------------------------------------------------------
// Ambient behaviours. Each takes (el, t, d) where d = parsed dataset.
const AMB = {
  wv: (el, t, d) => setAttr(el, 'transform', `translate(${(Math.sin(t * d.spd + d.ph) * d.amp).toFixed(1)} ${(Math.sin(t * d.spd * 1.3 + d.ph) * d.dy * 0.5).toFixed(1)})`),
  tw: (el, t, d) => { const o = (0.15 + 0.85 * Math.max(0, Math.sin(t * d.sp + d.ph))).toFixed(2); setAttr(el, 'opacity', o); },
  sway: (el, t, d) => setAttr(el, 'transform', `rotate(${(Math.sin(t * d.spd + d.ph) * d.amp).toFixed(2)})`),
  drift: (el, t, d) => { const wrap = d.wrap || 3600; let x = (d.x0 + t * d.vx) % wrap; if (x < 0) x += wrap; setAttr(el, 'transform', `translate(${(x - wrap * 0.25).toFixed(1)} ${(Math.sin(t * 0.2 + d.x0) * (d.bob || 3)).toFixed(1)})`); },
  hullg: (el, t, d) => {
    const ph = d.ph ?? (el._ph ?? (el._ph = Math.random() * 6));
    const k = d.k ?? 1;
    setAttr(el, 'transform', `translate(0 ${(Math.sin(t * 0.9 + ph) * 3 * k).toFixed(2)}) rotate(${(Math.sin(t * 0.7 + ph) * 1.3 * k).toFixed(2)})`);
  },
  oar: (el, t, d) => { const sp = d.sp || 2.4; setAttr(el, 'transform', `rotate(${(Math.sin(t * sp + d.i * 0.5) * (d.amp ?? 16) + (d.off ?? 8)).toFixed(1)})`); },
  sail: (el, t) => setAttr(el, 'transform', `translate(0 0) scale(${(1 + Math.sin(t * 1.1) * 0.012).toFixed(4)} ${(1 + Math.sin(t * 0.8 + 1) * 0.01).toFixed(4)})`),
  bird: (el, t, d) => {
    const f = Math.sin(t * d.sp + d.ph);
    const a = (-6 * f).toFixed(1), b = (-9 - 5 * f).toFixed(1);
    const path = el.firstElementChild;
    setAttr(path, 'd', `M-14 ${a} Q-7 ${b} 0 0 Q7 ${b} 14 ${a}`);
  },
  fly: (el, t, d) => {
    const wrap = d.wrap || 2600;
    let x = (d.x0 + t * d.vx) % wrap; if (x < 0) x += wrap;
    setAttr(el, 'transform', `translate(${(x - wrap * 0.3).toFixed(1)} ${(Math.sin(t * 0.7 + d.ph) * (d.amp || 14)).toFixed(1)})`);
  },
  puff: (el, t, d) => {
    const u = (t * (d.sp || 0.22) + d.i / d.n) % 1;
    const x = Math.sin(u * 3 + d.i) * 12 + u * (d.wind ?? 34), y = -u * (d.rise ?? 150), r = 8 + u * (d.grow ?? 28);
    setAttr(el, 'cx', x.toFixed(1)); setAttr(el, 'cy', y.toFixed(1)); setAttr(el, 'r', r.toFixed(1));
    setAttr(el, 'opacity', ((1 - u) * (d.op ?? 0.5) * Math.min(1, u * 6)).toFixed(3));
  },
  fire: (el, t) => {
    const k = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.7) * 0.06;
    setAttr(el, 'transform', `skewX(${(Math.sin(t * 8.1) * 6).toFixed(1)}) scale(${(1 / k).toFixed(3)} ${k.toFixed(3)})`);
  },
  rays: (el, t) => setAttr(el, 'transform', `rotate(${(Math.sin(t * 0.12) * 2.4).toFixed(2)})`),
  pulse: (el, t, d) => setAttr(el, 'opacity', (d.lo + (d.hi - d.lo) * (0.5 + 0.5 * Math.sin(t * d.sp + (d.ph || 0)))).toFixed(3)),
  spin: (el, t, d) => setAttr(el, 'transform', `rotate(${((t * d.sp) % 360).toFixed(2)})`),
  flag: (el, t, d) => setAttr(el, 'transform', `skewY(${(Math.sin(t * 3 + (d.ph || 0)) * 3).toFixed(2)})`),
  ripple: (el, t, d) => { const u = (t * (d.sp || 0.5) + (d.ph || 0)) % 1; setAttr(el, 'transform', `scale(${(0.4 + u * 1.4).toFixed(3)} ${(0.4 + u * 1.4).toFixed(3)})`); setAttr(el, 'opacity', ((1 - u) * 0.6).toFixed(3)); },
};
const AMB_SEL = Object.keys(AMB).map((k) => '.' + k).join(',');

const parse = (el) => {
  const d = {};
  for (const k in el.dataset) d[k] = parseFloat(el.dataset[k]);
  return d;
};

export class Scene {
  constructor(host, { id, reduced = false }) {
    this.id = id;
    this.host = host;
    this.reduced = reduced;
    this.root = document.createElement('div');
    this.root.className = 'scene';
    host.appendChild(this.root);
    this.layers = [];
    this.figs = [];
    this.horses = [];
    this.amb = [];
    this.ticks = [];
    this.t = 0;
    this.cam = { x: 800, y: 450, z: 1, sx: 0, sy: 0, rot: 0 };
    this.unit = 1;
    this.tl = gsap.timeline({ paused: true });
    this.fx = null;
    this.particles = [];
    this.flashEl = null;
    this.size();
    this.dirty = true;
  }

  // ------------------------------------------------------------- layers
  /** depth: parallax factor (0 = static sky, 1 = camera plane, >1 foreground). */
  layer(name, depth = 1, { zoomK = null, host = null } = {}) {
    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', class: 'layer', 'data-name': name,
    }, host || this.root);
    const g = svgEl('g', {}, svg);
    const L = { name, depth, svg, g, zoomK: zoomK ?? depth };
    this.layers.push(L);
    return L;
  }

  /** Mount markup into a layer and register any ambient behaviours. Returns the first element. */
  add(layer, markup) {
    const first = mount(layer.g, markup);
    this.scan(layer.g);
    return first;
  }

  scan(root) {
    root.querySelectorAll(AMB_SEL).forEach((el) => {
      if (el._amb) return;
      el._amb = true;
      for (const k of Object.keys(AMB)) {
        if (el.classList.contains(k)) {
          const d = parse(el);
          this.amb.push({ el, fn: AMB[k], d });
        }
      }
    });
  }

  /** A screen-fixed clipping container that layers can be hosted in (see layer(..., {host})). */
  clipbox(clip = 'inset(0 0 0 0)') {
    const d = document.createElement('div');
    d.className = 'clipbox';
    d.style.cssText = `position:absolute;inset:0;clip-path:${clip};-webkit-clip-path:${clip}`;
    this.root.appendChild(d);
    return d;
  }

  /** Layer-space x such that an object appears at screenX when the camera is at camX (z=1). */
  px(layer, camX, screenX = 800) { return screenX + (camX - 800) * layer.depth; }
  py(layer, camY, screenY = 450) { return screenY + (camY - 450) * layer.depth; }

  /** Full-frame multiply tint (e.g. pre-dawn blue). Returns the element for GSAP. */
  tint(color = '#1c2550') {
    const d = document.createElement('div');
    d.className = 'tint';
    d.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${color};mix-blend-mode:multiply;opacity:0`;
    this.root.appendChild(d);
    return d;
  }

  fig(layer, o) { return new Figure(this, layer.g, o); }
  horse(layer, o) { return new Horse(this, layer.g, o); }
  tick(fn) { this.ticks.push(fn); return this; }

  // ------------------------------------------------------------- camera
  size() {
    const w = this.host.clientWidth || 1600, h = this.host.clientHeight || 900;
    this.unit = Math.min(w / W, h / H);
    this.dirty = true;
  }

  /** Tween camera on a timeline. */
  pan(at, dur, to, ease = 'power2.inOut') {
    this.tl.to(this.cam, Object.assign({ duration: dur, ease }, to), at);
    return this;
  }

  applyCam() {
    const c = this.cam, u = this.unit;
    const k = this.reduced ? 0.4 : 1;
    for (const L of this.layers) {
      const p = L.depth;
      const s = 1 + (c.z - 1) * L.zoomK;
      const tx = (-(c.x - 800) * p * s + c.sx * k) * u;
      const ty = (-(c.y - 450) * p * s + c.sy * k) * u;
      const r = c.rot ? c.rot * L.zoomK : 0;
      setAttr(L.svg, 'style', `transform:translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(3)}deg)` : ''}`);
    }
  }

  // ------------------------------------------------------------- fx
  attachFx(canvas, flash) { this.fx = canvas; this.flashEl = flash; this.sizeFx(); }
  sizeFx() {
    if (!this.fx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = this.fx.clientWidth, h = this.fx.clientHeight;
    this.fx.width = Math.max(2, Math.round(w * dpr)); this.fx.height = Math.max(2, Math.round(h * dpr));
    this.fxScale = dpr;
  }

  /** Register a particle system. kind: motes | embers | leaves | spray | snow */
  particle(kind, o = {}) {
    const r = rng(Math.floor(Math.random() * 1e6));
    const n = o.n ?? 40;
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({ x: r(), y: r(), z: r(), ph: r() * 6.28, sp: r.range(0.5, 1.2) });
    this.particles.push({ kind, o, arr, r });
  }

  drawFx(dt) {
    const cv = this.fx;
    if (!cv || !this.particles.length) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const t = this.t;
    for (const ps of this.particles) {
      const o = ps.o;
      const colors = Array.isArray(o.color) ? o.color : [o.color || '#FFE6B0'];
      for (const q of ps.arr) {
        const col = colors[Math.floor(q.ph * 7) % colors.length];
        if (ps.kind === 'motes') {
          q.x += (o.vx ?? 0.004) * dt * q.sp; q.y += (o.vy ?? -0.006) * dt * q.sp;
          if (q.x > 1.05) q.x = -0.05; if (q.x < -0.05) q.x = 1.05;
          if (q.y < -0.05) q.y = 1.05; if (q.y > 1.05) q.y = -0.05;
          const px = (q.x + Math.sin(t * 0.5 + q.ph) * 0.01) * w, py = (q.y + Math.cos(t * 0.4 + q.ph) * 0.01) * h;
          const a = (o.op ?? 0.55) * (0.4 + 0.6 * Math.sin(t * 0.9 + q.ph * 3) ** 2) * (0.4 + q.z * 0.6);
          const rad = (o.size ?? 2.2) * (0.5 + q.z) * this.fxScale;
          ctx.globalAlpha = a; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
        } else if (ps.kind === 'embers') {
          q.y -= (o.vy ?? 0.05) * dt * (0.5 + q.z); q.x += Math.sin(t * 1.6 + q.ph) * 0.02 * dt + (o.vx ?? 0.012) * dt;
          if (q.y < -0.05) { q.y = 1.05; q.x = ps.r(); }
          if (q.x > 1.05) q.x = -0.05;
          const life = clamp(1 - (1 - q.y) * 0.9, 0, 1);
          ctx.globalAlpha = (o.op ?? 0.9) * life * (0.5 + 0.5 * Math.sin(t * 8 + q.ph));
          ctx.fillStyle = col;
          const rad = (o.size ?? 2.4) * (0.5 + q.z) * this.fxScale;
          ctx.beginPath(); ctx.arc(q.x * w, q.y * h, rad, 0, 6.283); ctx.fill();
        } else if (ps.kind === 'leaves') {
          q.y += (o.vy ?? 0.04) * dt * (0.5 + q.z); q.x += ((o.vx ?? 0.035) + Math.sin(t * 0.8 + q.ph) * 0.02) * dt * (0.5 + q.z);
          if (q.y > 1.05) { q.y = -0.05; q.x = ps.r() * 0.8; }
          if (q.x > 1.05) q.x = -0.05;
          ctx.save(); ctx.translate(q.x * w, q.y * h); ctx.rotate(t * 0.9 * q.sp + q.ph);
          ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + q.ph)));
          ctx.globalAlpha = o.op ?? 0.85; ctx.fillStyle = col;
          const lr = (o.size ?? 5) * (0.6 + q.z * 0.8) * this.fxScale;
          ctx.beginPath(); ctx.ellipse(0, 0, lr, lr * 0.4, 0, 0, 6.283); ctx.fill(); ctx.restore();
        } else if (ps.kind === 'rain') {
          q.y += (o.vy ?? 1.4) * dt; q.x += (o.vx ?? 0.2) * dt;
          if (q.y > 1.05) { q.y = -0.05; q.x = ps.r() * 1.2 - 0.1; }
          ctx.globalAlpha = (o.op ?? 0.35) * (0.4 + q.z * 0.6); ctx.strokeStyle = col; ctx.lineWidth = this.fxScale;
          ctx.beginPath(); ctx.moveTo(q.x * w, q.y * h); ctx.lineTo((q.x - 0.008) * w, (q.y - 0.04) * h); ctx.stroke();
        } else if (ps.kind === 'arrows') {
          // streaking arrows crossing the frame
          const vx = o.vx ?? 0.5, dir = Math.sign(vx) || 1;
          q.x += vx * dt * q.sp; q.y += (o.vy ?? 0.05) * dt * q.sp;
          if ((dir > 0 && q.x > 1.1) || (dir < 0 && q.x < -0.1) || q.y > 0.95) { q.x = dir > 0 ? -0.1 : 1.1; q.y = (o.y0 ?? 0.05) + ps.r() * (o.yr ?? 0.35); }
          ctx.globalAlpha = (o.op ?? 0.8) * (0.5 + q.z * 0.5); ctx.strokeStyle = col; ctx.lineWidth = 1.4 * this.fxScale;
          ctx.beginPath(); ctx.moveTo(q.x * w, q.y * h); ctx.lineTo((q.x - dir * 0.034) * w, (q.y - 0.006) * h); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------- frame loop
  /** advance ambient clock and render everything. */
  frame(dt = 0, animate = true) {
    if (animate) this.t += dt;
    const t = this.t;
    for (const a of this.amb) a.fn(a.el, t, a.d);
    for (const f of this.ticks) f(t, dt);
    for (const f of this.figs) f.render(t);
    for (const h of this.horses) h.render(t);
    this.applyCam();
    if (animate) this.drawFx(dt);
    this.dirty = false;
  }

  /** Shared helper: lightning flash via CSS overlay. */
  flash(tl, at, strength = 0.9) {
    const el = this.flashEl;
    if (!el || this.reduced) return;
    tl.set(el, { opacity: 0 }, at - 0.001);
    tl.to(el, { opacity: strength, duration: 0.05, ease: 'none' }, at);
    tl.to(el, { opacity: 0.1, duration: 0.09, ease: 'none' }, at + 0.05);
    tl.to(el, { opacity: strength * 0.8, duration: 0.05, ease: 'none' }, at + 0.14);
    tl.to(el, { opacity: 0, duration: 0.55, ease: 'power2.out' }, at + 0.19);
  }

  /** Quick camera shake on the timeline. */
  shake(at, amp = 10, dur = 0.5) {
    if (this.reduced) return;
    const c = this.cam, tl = this.tl;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      tl.to(c, { sx: (i % 2 ? -1 : 1) * amp * k, sy: (i % 3 ? 1 : -1) * amp * 0.6 * k, duration: dur / n, ease: 'none' }, at + (i * dur) / n);
    }
    tl.to(c, { sx: 0, sy: 0, duration: 0.12 }, at + dur);
  }

  end(duration) { this.tl.set({}, {}, duration); }

  destroy() {
    this.tl.kill();
    gsap.killTweensOf(this.cam);
    this.root.remove();
    this.figs.length = this.amb.length = this.ticks.length = this.horses.length = 0;
  }
}
