// Stylised horse rig (side view, facing right). Angles forward-positive like Figure.
import { C, darken, lighten } from './palette.js';
import { D2R, mount, setAttr, lerp } from './util.js';

const U = 36, Lw = 38;          // front upper / lower
const HU = 38, HL = 40;         // hind upper / lower
const FP = [38, -92], HP = [-40, -96]; // leg pivots
const SEAT = [-4, -135];

export class Horse {
  constructor(scene, parent, o = {}) {
    this.scene = scene;
    this.o = Object.assign({ coat: '#3A3230', coatLt: '#6B5A52', mane: '#17110F', blanket: C.red, trim: C.sandstone, wings: false, saddle: true, s: 1, x: 0, y: 0, facing: 1, seed: Math.random() * 50, shadow: true }, o);
    this.p = {
      x: this.o.x, y: this.o.y, s: this.o.s, facing: this.o.facing, pitch: 0, lift: 0,
      fa: 0, fak: 0, fb: 0, fbk: 0, ha: 0, hak: 0, hb: 0, hbk: 0,
      neck: 0, head: 0, tail: 0, gallop: 0, gAmp: 0, shadow: 1, opacity: 1, wing: 0,
    };
    this.build(parent);
    scene.horses = scene.horses || [];
    scene.horses.push(this);
    this.render(0);
  }

  build(parent) {
    const { coat, coatLt, mane, blanket, trim } = this.o;
    const dk = darken(coat, 0.35);
    const legU = (len, w0, w1, c) => `<path d="M${-w0} 0 C${-w0 - 1} ${len * 0.4} ${-w1 - 1} ${len * 0.7} ${-w1} ${len} L${w1} ${len} C${w1 + 1} ${len * 0.7} ${w0 + 1} ${len * 0.4} ${w0} 0 Z" fill="${c}"/>`;
    const fleg = (id, c) => `<g class="fl${id}">${legU(U, 8, 5, c)}<g class="fk${id}" transform="translate(0 ${U})">${legU(Lw, 4.6, 3.6, c)}<path d="M-4.6 ${Lw - 2} L4.6 ${Lw - 2} L5.4 ${Lw + 8} L-5.4 ${Lw + 8} Z" fill="${C.charcoal}"/><rect x="-4.2" y="${Lw - 3}" width="8.4" height="3.6" rx="1" fill="${C.parchment}" opacity=".85"/></g></g>`;
    const hleg = (id, c) => `<g class="hl${id}">${legU(HU, 11, 6, c)}<g class="hk${id}" transform="translate(0 ${HU})">${legU(HL, 4.6, 3.6, c)}<path d="M-4.6 ${HL - 2} L4.6 ${HL - 2} L5.4 ${HL + 8} L-5.4 ${HL + 8} Z" fill="${C.charcoal}"/><rect x="-4.2" y="${HL - 3}" width="8.4" height="3.6" rx="1" fill="${C.parchment}" opacity=".85"/></g></g>`;

    const wing = (cls, c) => `<g class="${cls}" transform="translate(18 -132)"><g class="wr">
      <path d="M0 0 C-4 -34 -30 -74 -86 -92 C-80 -84 -84 -78 -74 -72 C-80 -70 -80 -62 -70 -58 C-74 -54 -72 -46 -62 -44 C-64 -38 -56 -32 -46 -30 C-38 -18 -18 -8 0 0 Z" fill="${c}" stroke="${darken(c, .3)}" stroke-width="1"/>
      <path d="M-4 -6 C-26 -24 -48 -44 -72 -66 M-6 -4 C-24 -14 -42 -26 -56 -40" fill="none" stroke="${darken(c, .22)}" stroke-width="1" opacity=".6"/></g></g>`;
    const html = `
    <g class="hs">
      <ellipse class="sh" cx="0" cy="0" rx="74" ry="7" fill="#1b120b" opacity=".24"/>
      <g class="pv">
        <g class="farL" transform="translate(${HP[0]} ${HP[1]})">${hleg('B', dk)}</g>
        <g class="farF" transform="translate(${FP[0]} ${FP[1]})">${fleg('B', dk)}</g>
        <g class="tail"><path class="tailp" d="M-52 -112 C-70 -106 -82 -84 -86 -52 C-80 -64 -74 -62 -70 -52 C-64 -76 -62 -92 -48 -104 Z" fill="${mane}"/></g>
        <path d="M-57 -104 C-60 -124 -40 -132 -18 -129 C0 -127 14 -132 30 -138 C46 -142 54 -128 56 -108 C58 -92 52 -80 42 -74 C28 -68 0 -68 -22 -70 C-44 -72 -56 -88 -57 -104 Z" fill="${coat}"/>
        <path d="M-50 -112 C-40 -124 -20 -126 0 -123 C16 -121 30 -126 44 -130" fill="none" stroke="${coatLt}" stroke-width="5" stroke-linecap="round" opacity=".55"/>
        <path d="M-54 -96 C-50 -80 -36 -73 -22 -72" fill="none" stroke="${dk}" stroke-width="6" opacity=".55" stroke-linecap="round"/>
        ${this.o.saddle ? `<path d="M-20 -128 C-8 -126 8 -128 22 -134 L24 -96 C8 -90 -10 -90 -22 -94 Z" fill="${blanket}" stroke="${darken(blanket, .4)}" stroke-width="1"/>
        <path d="M-21 -100 C-8 -95 8 -95 23 -101" fill="none" stroke="${trim}" stroke-width="2.4"/>` : ''}
        ${this.o.wings ? wing('wingB', darken(coat, .06)) : ''}
        <g class="rider"></g>
        ${this.o.wings ? wing('wingA', coat) : ''}
        <g class="farHL2" transform="translate(${HP[0]} ${HP[1]})">${hleg('A', coat)}</g>
        <g transform="translate(${FP[0]} ${FP[1]})">${fleg('A', coat)}</g>
        <g class="nk" transform="translate(30 -126)">
          <path d="M0 4 C6 -22 18 -44 34 -62 L54 -52 C50 -40 46 -16 40 4 C30 10 14 12 0 4 Z" fill="${coat}"/>
          <path class="mane" d="M-4 4 C-2 -24 14 -50 30 -66 L40 -62 C26 -48 14 -26 8 2 Z" fill="${mane}"/>
          <g class="hd" transform="translate(40 -58)">
            <path d="M-16 -4 C-8 -16 8 -16 20 -6 C30 4 40 16 44 28 C44 34 38 34 34 32 C28 30 24 28 20 26 C12 22 4 18 -4 12 Z" fill="${coat}"/>
            <path d="M-6 -8 C0 -14 10 -12 18 -6" fill="none" stroke="${coatLt}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
            <path d="M-8 -6 L-12 -22 L-3 -10 Z" fill="${coat}"/><path d="M-3 -9 L-5 -24 L3 -10 Z" fill="${dk}"/>
            <path d="M18 24 L26 14 L36 26 L32 32 Z" fill="${C.bronze}" opacity=".85"/>
            <path d="M-6 6 C4 8 12 14 22 22" fill="none" stroke="${C.bronze}" stroke-width="2.2"/><path d="M2 -6 C6 4 8 12 8 18" fill="none" stroke="${C.bronze}" stroke-width="2"/>
            <circle cx="9" cy="3" r="2.6" fill="${C.ivory}"/><circle cx="9.6" cy="3" r="1.3" fill="${C.charcoal}"/>
            <circle cx="40" cy="30" r="1.5" fill="${C.charcoal}"/>
          </g>
        </g>
      </g>
    </g>`;
    this.root = mount(parent, html);
    const q = (s) => this.root.querySelector(s);
    this.r = {
      hs: this.root, sh: q('.sh'), pv: q('.pv'), tail: q('.tail'), tailp: q('.tailp'), nk: q('.nk'), hd: q('.hd'), mane: q('.mane'),
      flA: q('.flA'), fkA: q('.fkA'), flB: q('.flB'), fkB: q('.fkB'),
      hlA: q('.hlA'), hkA: q('.hkA'), hlB: q('.hlB'), hkB: q('.hkB'),
      rider: q('.rider'), wingA: q('.wingA .wr'), wingB: q('.wingB .wr'),
    };
  }

  get seat() { return SEAT; }

  go(tl, at, dur, props, ease = 'power2.inOut') {
    tl.to(this.p, Object.assign({ duration: dur, ease }, props), at);
    return this;
  }

  /** Move with a gallop cycle. */
  gallopTo(tl, at, toX, dur, { amp = 1, ease = 'none' } = {}) {
    const p = this.p;
    const dx = Math.abs(toX - p.x);
    const cycles = dx / (150 * p.s);
    tl.to(p, { x: toX, duration: dur, ease }, at);
    tl.to(p, { gallop: `+=${cycles}`, duration: dur, ease: 'none' }, at);
    tl.to(p, { gAmp: amp, duration: 0.4, ease: 'sine.out' }, at);
    tl.to(p, { gAmp: 0, duration: 0.5, ease: 'sine.inOut' }, at + dur - 0.3);
    return this;
  }

  render(t = 0) {
    const p = this.p, r = this.r;
    const g = p.gAmp, ph = p.gallop * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
    const flA = p.fa + g * 52 * sn, flB = p.fb + g * 52 * Math.sin(ph + 0.9);
    const fkA = p.fak + g * (64 * Math.max(0, cs) + 10), fkB = p.fbk + g * (64 * Math.max(0, Math.cos(ph + 0.9)) + 10);
    const hlA = p.ha - g * 46 * Math.sin(ph + 2.7), hlB = p.hb - g * 46 * Math.sin(ph + 3.6);
    const hkA = p.hak + g * (60 * Math.max(0, -Math.cos(ph + 2.7)) + 14), hkB = p.hbk + g * (60 * Math.max(0, -Math.cos(ph + 3.6)) + 14);
    const idle = 1 - g;
    const bob = -Math.abs(sn) * 8 * g - Math.sin(t * 1.6 + this.o.seed) * 0.8 * idle + p.lift;
    const pitch = p.pitch + sn * 3 * g;

    setAttr(r.hs, 'transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${(p.facing * p.s).toFixed(3)} ${p.s.toFixed(3)})`);
    setAttr(r.sh, 'opacity', (0.24 * p.shadow * Math.max(0, 1 - p.lift / 160)).toFixed(3));
    setAttr(r.pv, 'transform', `translate(${HP[0]} 0) rotate(${(-pitch).toFixed(2)}) translate(${-HP[0]} ${bob.toFixed(2)})`);
    setAttr(r.flA, 'transform', `rotate(${(-flA).toFixed(1)})`);
    setAttr(r.fkA, 'transform', `translate(0 ${U}) rotate(${fkA.toFixed(1)})`);
    setAttr(r.flB, 'transform', `rotate(${(-flB).toFixed(1)})`);
    setAttr(r.fkB, 'transform', `translate(0 ${U}) rotate(${fkB.toFixed(1)})`);
    // hind legs: knee (hock) bends the opposite way
    setAttr(r.hlA, 'transform', `rotate(${(-hlA).toFixed(1)})`);
    setAttr(r.hkA, 'transform', `translate(0 ${HU}) rotate(${hkA.toFixed(1)})`);
    setAttr(r.hlB, 'transform', `rotate(${(-hlB).toFixed(1)})`);
    setAttr(r.hkB, 'transform', `translate(0 ${HU}) rotate(${hkB.toFixed(1)})`);
    const nk = p.neck + sn * 4 * g + Math.sin(t * 1.3 + this.o.seed) * 1.2 * idle;
    setAttr(r.nk, 'transform', `translate(30 -126) rotate(${(-nk).toFixed(1)})`);
    setAttr(r.hd, 'transform', `translate(40 -58) rotate(${(-(p.head + Math.sin(t * 0.9) * 1.5 * idle)).toFixed(1)})`);
    const tw = Math.sin(t * 4 + this.o.seed) * 4 + p.tail + g * 14;
    setAttr(r.tail, 'transform', `translate(-52 -108) rotate(${(-tw).toFixed(1)}) translate(52 108)`);
    if (r.wingA) {
      const fl = Math.sin(t * 6.2 + this.o.seed) * 38 * (0.35 + g) - 8 + p.wing;
      setAttr(r.wingA, 'transform', `rotate(${(-fl).toFixed(1)})`);
      setAttr(r.wingB, 'transform', `rotate(${(-fl * 0.82 + 8).toFixed(1)}) translate(2 2)`);
    }
    setAttr(r.mane, 'transform', `rotate(${(Math.sin(t * 6 + 1) * 2.6 * (0.4 + g)).toFixed(1)} 20 -30)`);
  }
}
