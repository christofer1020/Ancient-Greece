// Palette extracted from the reference sheet.
export const C = {
  ivory: '#F2E9D4',
  parchment: '#E8D9BC',
  sandstone: '#CFAF84',
  terracotta: '#C96B4C',
  red: '#8E2E27',
  bronze: '#8A5A2B',
  olive: '#5E6A3A',
  blue: '#1E3A62',
  charcoal: '#2A2623',
};

const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Linear mix of two hex colours. t=0 → a, t=1 → b */
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const lighten = (c, t) => mix(c, '#FFF3D6', t);
export const darken = (c, t) => mix(c, '#1B1511', t);
export const cool = (c, t) => mix(c, '#2D4A78', t);
export const warm = (c, t) => mix(c, '#E9A25F', t);
