// Props held by figures. Each returns { markup, tick? } drawn around the hand origin; "up" is -y.
import { C, mix, lighten, darken } from './palette.js';
import { uid } from './util.js';

const wood = '#6B4A2B';

function shield({ r = 27, face = C.bronze, rim = null, emblem = 'lambda', emblemColor = C.ivory } = {}) {
  const rimC = rim || darken(face, 0.35);
  const g = uid('sg');
  let em = '';
  if (emblem === 'lambda') {
    em = `<path d="M-8 10 L0 -10 L8 10" fill="none" stroke="${emblemColor}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (emblem === 'rings') {
    em = `<circle r="${r * 0.62}" fill="none" stroke="${emblemColor}" stroke-width="1.6" opacity=".8"/><circle r="${r * 0.34}" fill="none" stroke="${emblemColor}" stroke-width="1.6" opacity=".8"/>
      <circle r="${r * 0.12}" fill="${emblemColor}" opacity=".85"/>`;
  } else if (emblem === 'star') {
    let pts = '';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.2 : r * 0.58; pts += `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `; }
    em = `<polygon points="${pts}" fill="${emblemColor}" opacity=".9"/>`;
  } else if (emblem === 'owl') {
    em = `<circle cx="-5" cy="-2" r="4" fill="none" stroke="${emblemColor}" stroke-width="1.8"/><circle cx="5" cy="-2" r="4" fill="none" stroke="${emblemColor}" stroke-width="1.8"/><path d="M-2 4 L0 9 L2 4" fill="none" stroke="${emblemColor}" stroke-width="1.8"/>`;
  }
  return `<g class="shield">
    <defs><radialGradient id="${g}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="${lighten(face, 0.35)}"/><stop offset=".55" stop-color="${face}"/><stop offset="1" stop-color="${darken(face, 0.3)}"/></radialGradient></defs>
    <circle r="${r}" fill="url(#${g})" stroke="${rimC}" stroke-width="2.6"/>
    <circle r="${r - 4}" fill="none" stroke="${lighten(face, 0.4)}" stroke-width="1" opacity=".55"/>
    ${em}
  </g>`;
}

function flame(scale = 1) {
  return `<g class="fl" transform="scale(${scale})">
    <path class="fl1" d="M0 0 C-9 -8 -7 -22 0 -32 C8 -22 9 -8 0 0 Z" fill="${C.terracotta}"/>
    <path class="fl2" d="M0 -1 C-5 -7 -4 -16 0 -23 C5 -16 5 -7 0 -1 Z" fill="#F0B24A"/>
    <path class="fl3" d="M0 -2 C-2.5 -5 -2 -10 0 -14 C2.5 -10 2.5 -5 0 -2 Z" fill="${C.ivory}"/>
  </g>`;
}
function flameTick(t, node, fig) {
  const f = node && node.querySelector ? node.querySelector('.fl') : null;
  if (!f) return;
  const k = 1 + Math.sin(t * 17 + (fig?.o.seed || 0)) * 0.08 + Math.sin(t * 7.3) * 0.06;
  const sk = Math.sin(t * 9.1) * 7;
  const tr = `skewX(${sk.toFixed(1)}) scale(${(1 / k).toFixed(3)} ${k.toFixed(3)})`;
  if (f._tr !== tr) { f.setAttribute('transform', tr); f._tr = tr; }
}

export const PROPS = {
  spear: ({ len = 150, tip = C.bronze } = {}) => ({
    markup: `<g><line x1="0" y1="${len * 0.32}" x2="0" y2="${-len * 0.68}" stroke="${wood}" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 ${-len * 0.68 - 22} C5 ${-len * 0.68 - 10} 4.5 ${-len * 0.68 - 2} 0 ${-len * 0.68 + 3} C-4.5 ${-len * 0.68 - 2} -5 ${-len * 0.68 - 10} 0 ${-len * 0.68 - 22} Z" fill="${tip}" stroke="${darken(tip, 0.4)}" stroke-width=".8"/>
      <path d="M0 ${len * 0.32} l0 6" stroke="${darken(tip, .2)}" stroke-width="3" stroke-linecap="round"/></g>`,
  }),
  sarissa: ({ len = 270 } = {}) => PROPS.spear({ len, tip: C.sandstone }),
  shield: (o = {}) => ({ markup: shield(o) }),
  persianShield: () => ({
    markup: shield({ r: 25, face: C.blue, rim: C.sandstone, emblem: 'rings', emblemColor: C.sandstone }),
  }),
  sword: ({ len = 62 } = {}) => ({
    markup: `<g><path d="M-2.4 6 L-2 ${-len} L0 ${-len - 8} L2 ${-len} L2.4 6 Z" fill="#D9D4C8" stroke="#6E675C" stroke-width=".9"/>
      <path d="M0 -4 L0 ${-len + 6}" stroke="#fff" stroke-width=".8" opacity=".6"/>
      <rect x="-8" y="3" width="16" height="3.4" rx="1.4" fill="${C.bronze}" stroke="${darken(C.bronze, .4)}" stroke-width=".7"/>
      <rect x="-2" y="6" width="4" height="9" rx="1.4" fill="${wood}"/><circle cy="17" r="2.6" fill="${C.bronze}"/></g>`,
  }),
  torch: () => ({
    markup: `<g><line x1="0" y1="14" x2="0" y2="-24" stroke="${wood}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M-4 -22 L4 -22 L3 -29 L-3 -29 Z" fill="${C.bronze}"/>
      <g transform="translate(0 -28)">${flame(1.15)}</g></g>`,
    tick: (t, node, fig) => flameTick(t, node, fig),
  }),
  scroll: () => ({
    markup: `<g transform="rotate(90)"><rect x="-11" y="-5" width="22" height="10" rx="3" fill="${C.parchment}" stroke="${darken(C.parchment, .4)}" stroke-width="1"/>
      <ellipse cx="-11" cy="0" rx="2.6" ry="5" fill="${C.sandstone}" stroke="${darken(C.parchment, .4)}" stroke-width=".8"/><ellipse cx="11" cy="0" rx="2.6" ry="5" fill="${C.sandstone}" stroke="${darken(C.parchment, .4)}" stroke-width=".8"/>
      <path d="M-6 -2 H6 M-6 1 H5" stroke="${C.bronze}" stroke-width=".8" opacity=".7"/></g>`,
  }),
  scrollOpen: () => ({
    markup: `<g><path d="M-13 -26 L13 -26 L13 8 Q0 12 -13 8 Z" fill="${C.parchment}" stroke="${darken(C.parchment, .4)}" stroke-width="1"/>
      <rect x="-15" y="-29" width="30" height="5" rx="2.5" fill="${C.sandstone}" stroke="${darken(C.parchment, .4)}" stroke-width=".8"/>
      <path d="M-9 -19 H9 M-9 -14 H8 M-9 -9 H9 M-9 -4 H6" stroke="${C.bronze}" stroke-width="1.2" opacity=".65"/></g>`,
  }),
  tablet: () => ({
    markup: `<g><rect x="-10" y="-22" width="20" height="26" rx="2" fill="${C.sandstone}" stroke="${wood}" stroke-width="2.4"/><path d="M-6 -16 H6 M-6 -11 H5 M-6 -6 H6" stroke="${wood}" stroke-width="1" opacity=".7"/></g>`,
  }),
  lyre: () => ({
    markup: `<g transform="translate(0 -14)">
      <path d="M-13 -22 C-18 -6 -15 8 -7 14 L7 14 C15 8 18 -6 13 -22" fill="none" stroke="${C.bronze}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M-13 -22 Q0 -17 13 -22" fill="none" stroke="${C.bronze}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M-4 14 L4 14 L3 20 L-3 20 Z" fill="${C.bronze}"/>
      <path d="M-8 -19 V14 M-3 -19 V14 M2 -19 V14 M7 -19 V14" stroke="${C.ivory}" stroke-width=".9" opacity=".9"/></g>`,
  }),
  bolt: () => ({
    markup: `<g class="bolt"><path d="M6 -48 L-8 -14 L1 -14 L-8 18 L12 -20 L2 -20 L12 -48 Z" fill="#F7D774" stroke="#C99B2F" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M6 -48 L-8 -14 L1 -14 L-8 18" fill="none" stroke="#fff" stroke-width="1.4" opacity=".8"/></g>`,
    tick: (t, node) => {
      if (!node) return;
      const o = (0.85 + Math.sin(t * 23) * 0.15).toFixed(2);
      if (node._o !== o) { node.style.opacity = o; node._o = o; }
    },
  }),
  mallet: () => ({
    markup: `<g><line x1="0" y1="16" x2="0" y2="-20" stroke="${wood}" stroke-width="3.4" stroke-linecap="round"/><rect x="-8" y="-30" width="16" height="12" rx="2" fill="#8B6A45" stroke="${darken('#8B6A45', .4)}" stroke-width="1"/></g>`,
  }),
  chisel: () => ({
    markup: `<g><line x1="0" y1="10" x2="0" y2="-16" stroke="#9FA4AB" stroke-width="3" stroke-linecap="round"/><path d="M-2 -16 L2 -16 L0 -24 Z" fill="#D5D9DE"/></g>`,
  }),
  trident: ({ len = 150 } = {}) => ({
    markup: `<g><line x1="0" y1="${len * 0.32}" x2="0" y2="${-len * 0.68}" stroke="${C.bronze}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M-11 ${-len * 0.68 - 16} C-11 ${-len * 0.68 + 4} -6 ${-len * 0.68 + 6} 0 ${-len * 0.68 + 6} C6 ${-len * 0.68 + 6} 11 ${-len * 0.68 + 4} 11 ${-len * 0.68 - 16}" fill="none" stroke="#C9A24A" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 ${-len * 0.68 - 26} L0 ${-len * 0.68 + 6}" stroke="#C9A24A" stroke-width="3" stroke-linecap="round"/>
      <path d="M-11 ${-len * 0.68 - 16} l-3 -5 M11 ${-len * 0.68 - 16} l3 -5 M0 ${-len * 0.68 - 26} l0 -5" stroke="#C9A24A" stroke-width="3" stroke-linecap="round"/></g>`,
  }),
  staff: ({ len = 120 } = {}) => ({
    markup: `<line x1="0" y1="${len * 0.3}" x2="0" y2="${-len * 0.7}" stroke="${wood}" stroke-width="3.4" stroke-linecap="round"/>`,
  }),
  scepter: () => ({
    markup: `<g><line x1="0" y1="30" x2="0" y2="-50" stroke="${C.bronze}" stroke-width="3.4" stroke-linecap="round"/><circle cy="-54" r="5" fill="${C.sandstone}" stroke="${C.bronze}" stroke-width="1.4"/></g>`,
  }),
  mask: ({ kind = 'happy', color = C.ivory } = {}) => {
    const happy = kind === 'happy';
    return {
      markup: `<g transform="translate(0 -22)"><path d="M-14 -16 C-14 -26 14 -26 14 -16 C14 4 6 18 0 18 C-6 18 -14 4 -14 -16 Z" fill="${color}" stroke="${darken(color, .45)}" stroke-width="1.6"/>
        <ellipse cx="-6" cy="-9" rx="3.4" ry="${happy ? 2.2 : 3.4}" fill="${C.charcoal}" transform="rotate(${happy ? 12 : -14} -6 -9)"/>
        <ellipse cx="6" cy="-9" rx="3.4" ry="${happy ? 2.2 : 3.4}" fill="${C.charcoal}" transform="rotate(${happy ? -12 : 14} 6 -9)"/>
        <path d="${happy ? 'M-8 3 C-4 12 4 12 8 3 Z' : 'M-7 10 C-3 4 3 4 7 10 Z'}" fill="${C.charcoal}"/></g>`,
    };
  },
  amphora: ({ color = C.terracotta, s = 1 } = {}) => ({
    markup: `<g transform="scale(${s}) translate(0 -26)"><path d="M-6 -22 L6 -22 C6 -17 12 -13 12 -3 C12 10 6 22 0 26 C-6 22 -12 10 -12 -3 C-12 -13 -6 -17 -6 -22 Z" fill="${color}" stroke="${darken(color, .4)}" stroke-width="1.3"/>
      <path d="M-11.5 -3 H11.5 M-10 8 H10" stroke="${C.charcoal}" stroke-width="1.6" opacity=".8"/>
      <path d="M-6 -20 C-17 -18 -16 -4 -11 -2 M6 -20 C17 -18 16 -4 11 -2" fill="none" stroke="${darken(color, .35)}" stroke-width="2.6"/></g>`,
  }),
  cup: () => ({
    markup: `<g><path d="M-6 -7 H6 C6 -1 3 2 0 2 C-3 2 -6 -1 -6 -7 Z" fill="${C.terracotta}" stroke="${darken(C.terracotta, .4)}" stroke-width="1"/><path d="M0 2 V6 M-3 6 H3" stroke="${darken(C.terracotta, .4)}" stroke-width="1.4"/></g>`,
  }),
  oar: ({ len = 120 } = {}) => ({
    markup: `<g><line x1="0" y1="${len * 0.1}" x2="0" y2="${-len * 0.55}" stroke="${wood}" stroke-width="3" stroke-linecap="round"/>
      <path d="M-4 ${len * 0.1} L4 ${len * 0.1} L3 ${len * 0.5} L-3 ${len * 0.5} Z" fill="${darken(wood, -0.1)}" stroke="${darken(wood, .4)}" stroke-width=".8"/></g>`,
  }),
  bow: () => ({
    markup: `<g><path d="M-3 -32 C-18 -14 -18 14 -3 32" fill="none" stroke="${wood}" stroke-width="3" stroke-linecap="round"/><line x1="-3" y1="-32" x2="-3" y2="32" stroke="${C.parchment}" stroke-width=".9"/></g>`,
  }),
  banner: ({ color = C.red, emblem = 'lambda' } = {}) => ({
    markup: `<g><line x1="0" y1="30" x2="0" y2="-95" stroke="${wood}" stroke-width="3" stroke-linecap="round"/>
      <path class="bn" d="M0 -92 L40 -90 L36 -62 L40 -34 L0 -36 Z" fill="${color}" stroke="${darken(color, .4)}" stroke-width="1"/>
      <path d="M12 -48 L20 -76 L28 -48 M15 -57 H25" fill="none" stroke="${C.ivory}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  }),
  basket: () => ({
    markup: `<g transform="translate(0 -4)"><path d="M-12 -6 H12 L9 10 H-9 Z" fill="${C.sandstone}" stroke="${darken(C.sandstone, .4)}" stroke-width="1.2"/><path d="M-10 -1 H10 M-9 4 H9" stroke="${darken(C.sandstone, .35)}" stroke-width="1"/>
      <circle cx="-5" cy="-8" r="4" fill="${C.olive}"/><circle cx="2" cy="-9" r="4" fill="${C.terracotta}"/><circle cx="7" cy="-7" r="3.5" fill="${C.olive}"/></g>`,
  }),
  laurelBranch: () => ({
    markup: `<g><path d="M0 14 C-6 0 -4 -16 4 -30" fill="none" stroke="${C.olive}" stroke-width="2"/>${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${(-4 + i * 1.5).toFixed(1)}" cy="${(8 - i * 7).toFixed(1)}" rx="5" ry="2.1" transform="rotate(${i % 2 ? -35 : 35} ${(-4 + i * 1.5).toFixed(1)} ${(8 - i * 7).toFixed(1)})" fill="${i % 2 ? C.olive : lighten(C.olive, .25)}"/>`).join('')}</g>`,
  }),
  globe: () => ({
    markup: `<g transform="translate(0 -14)"><circle r="12" fill="${C.sandstone}" stroke="${C.bronze}" stroke-width="1.5"/><path d="M-12 0 H12 M0 -12 V12 M-9 -8 Q0 -2 9 -8 M-9 8 Q0 2 9 8" fill="none" stroke="${C.bronze}" stroke-width=".9"/></g>`,
  }),
  wreath: () => ({ markup: `<g></g>` }),
};

export function propMarkup(name, opts = {}) {
  const f = PROPS[name];
  if (!f) return { markup: '' };
  const r = f(opts);
  return { markup: r.markup, tick: r.tick };
}
