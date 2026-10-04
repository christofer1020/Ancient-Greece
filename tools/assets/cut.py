"""Generic cut-out: crop a sheet region, upscale x4, key out the flattened background, export."""
import numpy as np, cv2
from keying import *


def _poly_mask(shape, polys, origin, k=4):
    m = np.zeros(shape, np.uint8)
    for p in polys:
        pts = np.array([[(x - origin[0]) * k, (y - origin[1]) * k] for x, y in p], np.int32)
        cv2.fillPoly(m, [pts], 1)
    return m.astype(bool)


def _rect_polys(rects):
    return [[(x, y), (x + w, y), (x + w, y + h), (x, y + h)] for x, y, w, h in rects]


def cutout(n, box, *, thr=10, holes=None, erode=2, blur=1.1, add=None, erase=None, keep=None, pad=4,
           mode='key', pal_k=4, min_comp=30, extra_pal=None, soft=None, pal_box=None, flood=True, largest=None):
    """Returns (rgba_hi, origin_sheet, scale=4)."""
    lo, org = crop(n, *box, pad=pad)
    hi = up4(lo)
    H, W = hi.shape[:2]
    if pal_box is not None:
        from keying import sheet, lab as _lab
        s = sheet(n)
        px = np.vstack([_lab(s[y:y + h, x:x + w]).reshape(-1, 3) for x, y, w, h in pal_box])
        crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
        _, lb, cen = cv2.kmeans(px.astype(np.float32), pal_k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
        pal = cen
    else:
        pal = border_palette(lo, k=pal_k)
        # sheet backgrounds are always light, low-chroma parchment/checker: drop object colours that touch the crop edge
        ok = [c for c in pal if c[0] > 72 and np.hypot(c[1], c[2]) < 26]
        pal = np.array(ok if ok else [[90.5, 1.5, 12.0]], np.float32)
    if extra_pal is not None:
        pal = np.vstack([pal, lab(np.array([extra_pal], np.uint8).reshape(-1, 1, 3)).reshape(-1, 3)])
    if mode == 'opaque':
        alpha = np.ones((H, W), np.float32)
    else:
        d = bg_distance(hi, pal)
        if mode == 'key':
            bglike = d < thr
            bg = flood_bg(bglike) if flood else bglike
            if holes is not None:
                # enclosed background-coloured gaps (between branches, inside handles) larger than `holes` px
                nn, lab_, st, _ = cv2.connectedComponentsWithStats((bglike & ~bg).astype(np.uint8), connectivity=4)
                for i in range(1, nn):
                    if st[i, 4] > holes * 16:
                        bg |= lab_ == i
            fg = ~bg
            fg = fill_holes(fg, 24)
        elif mode == 'soft':  # soft alpha from colour distance (smoke, highlights, clouds)
            t0, t1 = soft
            alpha_soft = np.clip((d - t0) / (t1 - t0), 0, 1)
            fg = alpha_soft > 0.02
        if add:
            fg |= _poly_mask(fg.shape, add, org)
        if erase:
            fg &= ~_poly_mask(fg.shape, _rect_polys(erase) if isinstance(erase[0][0], (int, float)) else erase, org)
        if keep:
            fg &= _poly_mask(fg.shape, keep, org)
        if min_comp:
            nn, lab_, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), connectivity=8)
            for i in range(1, nn):
                if st[i, 4] < min_comp * 16:
                    fg[lab_ == i] = False
        if largest is None:
            largest = mode == 'key'
        if largest:
            nn, lab_, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), connectivity=8)
            if nn > 2:
                big = st[1:, 4].max()
                for i in range(1, nn):
                    if st[i, 4] < big * (largest if isinstance(largest, float) else 0.06):
                        fg[lab_ == i] = False
        if mode == 'soft':
            alpha = alpha_soft * soften(fg, erode=0, blur=0.8)
        else:
            alpha = soften(fg, erode=erode, blur=blur)
    bgc = cv2.cvtColor(np.array([[[(pal[0][0] + 0) * 255 / 100, pal[0][1] + 128, pal[0][2] + 128]]], np.uint8), cv2.COLOR_LAB2RGB)[0, 0]
    rgb = decontaminate(hi, alpha, bgc) if mode != 'opaque' else hi
    rgb = bleed(rgb, alpha) if mode != 'opaque' else rgb
    rgba = np.dstack([rgb, (alpha * 255 + 0.5).astype(np.uint8)])
    return rgba, org


def components(rgba, min_area=400):
    a = rgba[..., 3] > 20
    a = cv2.dilate(a.astype(np.uint8), np.ones((9, 9), np.uint8))
    nn, lab_, st, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
    out = []
    for i in range(1, nn):
        x, y, w, h, ar = st[i]
        if ar < min_area: continue
        piece = rgba.copy()
        piece[..., 3] = np.where(lab_ == i, piece[..., 3], 0)
        out.append((x, piece))
    out.sort(key=lambda t: t[0])
    return [p for _, p in out]


def seamless_h(rgb, overlap):
    """Cross-fade the ends of a horizontal strip so it tiles."""
    w = rgb.shape[1]
    a = rgb[:, :overlap].astype(np.float32)
    b = rgb[:, w - overlap:].astype(np.float32)
    t = np.linspace(0, 1, overlap, dtype=np.float32)[None, :, None]
    blend = b * (1 - t) + a * t
    out = rgb[:, :w - overlap].copy().astype(np.float32)
    out[:, :overlap] = blend
    return out.clip(0, 255).astype(np.uint8)
