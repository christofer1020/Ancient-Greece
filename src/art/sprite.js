// Image-sprite helpers for asset-driven scenes (Chapter 1 onwards).
// Every visible element is an illustrated cut-out from the asset library; code only places,
// layers and animates it. Sizes are in design units (the 1600x900 scene space).
import { LIB } from './library.gen.js';

export { LIB };

export const asset = (key) => {
  const a = LIB[key];
  if (!a) throw new Error(`missing asset ${key}`);
  return a;
};

/** Height for a given width, keeping the image's aspect ratio. */
export const hFor = (key, w) => { const a = asset(key); return (w * a.h) / a.w; };

/**
 * `<image>` placed so that its anchor lands on (x, y).
 *  w: width in design units (h follows the aspect ratio unless given)
 *  ax/ay: anchor in 0..1 image space (default bottom-centre), or `an` = a named anchor from the manifest
 *  flip: mirror horizontally around the anchor
 *  cls/data/attrs: put on the inner group, which has the anchor at its origin (ideal for sway/bob pivots)
 */
export function sprite(key, { x = 0, y = 0, w, h, ax = 0.5, ay = 1, an, flip = false, op, cls = '', data = {}, attrs = '', id = '', filter = '' } = {}) {
  const a = asset(key);
  if (an && a.an && a.an[an]) [ax, ay] = a.an[an];
  const W = w ?? a.w / 2;
  const H = h ?? (W * a.h) / a.w;
  const ds = Object.entries(data).map(([k, v]) => ` data-${k}="${v}"`).join('');
  const inner = `<image href="${a.src}" x="${(-ax * W).toFixed(2)}" y="${(-ay * H).toFixed(2)}" width="${W.toFixed(2)}" height="${H.toFixed(2)}" preserveAspectRatio="none"${filter ? ` filter="${filter}"` : ''}/>`;
  return `<g transform="translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}"${op != null ? ` opacity="${op}"` : ''}${id ? ` id="${id}"` : ''}>` +
    `<g${cls ? ` class="${cls}"` : ''}${ds}${attrs ? ' ' + attrs : ''}>${inner}</g></g>`;
}

/** A horizontally repeated strip (seamless tiles), `n` copies starting at x0. */
export function strip(key, { x0 = 0, y = 0, w, n = 3, h, op, cls = '' } = {}) {
  const a = asset(key);
  const W = w ?? a.w / 2;
  const H = h ?? (W * a.h) / a.w;
  let s = `<g${cls ? ` class="${cls}"` : ''}${op != null ? ` opacity="${op}"` : ''}>`;
  // 0.6 unit overlap hides sub-pixel seams between tiles
  for (let i = 0; i < n; i++) s += `<image href="${a.src}" x="${(x0 + i * (W - 0.6)).toFixed(2)}" y="${y.toFixed(2)}" width="${W.toFixed(2)}" height="${H.toFixed(2)}" preserveAspectRatio="none"/>`;
  return s + '</g>';
}

/** Resolve once every image URL is fetched and decoded (used to preload a chapter's art). */
export function preloadImages(keys) {
  const urls = [...new Set(keys.map((k) => asset(k).src))];
  return Promise.all(urls.map((src) => new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => (im.decode ? im.decode().catch(() => {}).then(res) : res());
    im.onerror = () => res();
    im.src = src;
  })));
}
