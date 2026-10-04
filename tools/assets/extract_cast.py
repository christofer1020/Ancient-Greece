"""Extract the character kit (heads, costumes, rig reference parts, staff) from the sheets.

Costumes come from the 'costume variations' figures on sheet 4: the black limbs, head and neck
are removed, the garment is closed and in-painted where the arms crossed it, then split at the
waist into a rigid torso piece and a swinging skirt piece (overlapping, feathered seam).
Heads come from the 'heads & accessories' rows (head + hair/headwear baked together, neck stick
included); anchors give the neck point and the skull diameter so all heads scale consistently.
"""
import sys, json, os
import numpy as np, cv2
from keying import ROOT, trim, save, soften
from cut import cutout
from extract_ch01 import emit, manifest, MAN_PATH, want

DARK_V, DARK_S = 78, 110


def dark_mask(rgb, mx=66):
    """The figures' 'black' is a warm charcoal-brown: classify by the brightest channel."""
    return rgb.max(2) < mx


def costume(name, n, box, erase=None, waist=0.42, note=''):
    rel_t = f'global/costumes/{name}_torso'
    rel_s = f'global/costumes/{name}_skirt'
    if not (want(rel_t) or want(rel_s)): return
    rgba, org = cutout(n, box, thr=9, holes=10, erase=erase, erode=1, blur=0.9, pal_box=[(1115, 149, 370, 6)])
    rgb, a = rgba[..., :3].copy(), rgba[..., 3].astype(np.float32) / 255
    fig = a > 0.5
    dk = dark_mask(rgb) & fig
    dk = cv2.dilate(dk.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    garment = fig & ~dk
    # keep the main garment blob(s)
    nn, lab_, st, _ = cv2.connectedComponentsWithStats(garment.astype(np.uint8), connectivity=8)
    big = st[1:, 4].max()
    garment = np.isin(lab_, [i for i in range(1, nn) if st[i, 4] > big * 0.08])
    # close notches left by arms, fill interior holes
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (33, 33))
    closed = cv2.morphologyEx(garment.astype(np.uint8), cv2.MORPH_CLOSE, k).astype(bool)
    inv = (~closed).astype(np.uint8)
    nn, lab_, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    H, W = closed.shape
    for i in range(1, nn):
        x, y, w, h, ar = st[i]
        if not (x == 0 or y == 0 or x + w == W or y + h == H):
            closed[lab_ == i] = True
    # in-paint the arm / neck pixels that sit inside the garment silhouette
    hole = (closed & ~garment).astype(np.uint8) * 255
    rgb = cv2.inpaint(rgb, hole, 7, cv2.INPAINT_TELEA)
    rows = np.where(closed.sum(1) > closed.sum(1).max() * 0.25)[0]
    top, bot = rows.min(), rows.max()
    wy = int(top + (bot - top) * waist)
    alpha = soften(closed, erode=1, blur=1.0)
    # torso: fades out over 10px below the waist; skirt: hard top 10px above the waist (hidden under the torso)
    yy = np.arange(H)[:, None].astype(np.float32)
    m_t = np.clip((wy + 10 - yy) / 20, 0, 1)
    m_s = (yy >= wy - 10).astype(np.float32)
    cols = np.where(closed[top:top + max(4, (bot - top) // 8)].any(0))[0]
    # anchors in sheet coordinates (emit converts them)
    sx = lambda X: org[0] + X / 4
    sy = lambda Y: org[1] + Y / 4
    cx = (cols.min() + cols.max()) / 2
    an = {'neck': (sx(cx), sy(top)), 'shoulderL': (sx(cols.min() + 10), sy(top + 14)), 'shoulderR': (sx(cols.max() - 10), sy(top + 14)),
          'waist': (sx(cx), sy(wy)), 'hem': (sx(cx), sy(bot))}
    full = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
    # both pieces share one canvas so they register exactly
    pad_full = full.copy()
    t = pad_full.copy(); t[..., 3] = (alpha * m_t[:, :, ] * 255).astype(np.uint8) if m_t.ndim == 2 else (alpha * m_t * 255).astype(np.uint8)
    s = pad_full.copy(); s[..., 3] = (alpha * m_s * 255).astype(np.uint8)
    # trim on the union so both keep the same offset
    ys, xs = np.where(alpha > 0.02)
    x0, y0, x1, y1 = max(xs.min() - 2, 0), max(ys.min() - 2, 0), xs.max() + 3, ys.max() + 3
    t, s = t[y0:y1, x0:x1], s[y0:y1, x0:x1]
    org2 = (org[0] + x0 / 4, org[1] + y0 / 4)
    _emit_fixed(rel_t, t, org2, an, note)
    _emit_fixed(rel_s, s, org2, an, note)


def _emit_fixed(rel, rgba, org, anchors, note):
    """Like emit() but without trimming (pieces must keep a shared canvas)."""
    (rw, rh), (mw, mh) = save(rgba, rel, rt_scale=1.0)
    an = {k: [round(((x - org[0]) * 4) / mw, 4), round(((y - org[1]) * 4) / mh, 4)] for k, (x, y) in anchors.items()}
    manifest[rel] = {'w': rw, 'h': rh, 'master': [mw, mh], 'anchors': an, 'note': note}
    print(f'{rel:58s} runtime {rw}x{rh}  master {mw}x{mh}')


def head(name, n, box, skull, r=17, note=''):
    """skull = centre of the face circle in sheet px, r = its radius (all heads in a row share one size)."""
    rel = f'global/heads/{name}'
    if not want(rel): return
    rgba, org = cutout(n, box, thr=9, holes=None, erode=1, blur=0.9)
    rgb, a = rgba[..., :3], rgba[..., 3] > 128
    cx, cy = (skull[0] - org[0]) * 4, (skull[1] - org[1]) * 4
    R = r * 4
    dk = dark_mask(rgb) & a
    band = dk[int(cy + R * 1.05):int(cy + R * 1.6)]
    ys, xs = np.where(band)
    neck_x = float(np.median(xs)) if len(xs) else cx
    neck_y = cy + R * 1.3
    rgba2, off = trim(rgba)
    (rw, rh), (mw, mh) = save(rgba2, rel, rt_scale=1.0)
    u = lambda X: round((X - off[0]) / mw, 4)
    v = lambda Y: round((Y - off[1]) / mh, 4)
    manifest[rel] = {'w': rw, 'h': rh, 'master': [mw, mh], 'note': note,
                     'anchors': {'neck': [u(neck_x), v(neck_y)], 'skull': [u(cx), v(cy)]},
                     'skull_d': round(2 * R / mw, 4)}
    print(f'{rel:58s} runtime {rw}x{rh}  neck {u(neck_x)},{v(neck_y)}')


def main():
    # ------------------------------------------------------------------ costumes (sheet 4, costume variations)
    costume('chiton_villager', 4, (1122, 158, 50, 128), note='white chiton, olive sash (villager male)')
    costume('peplos_villager', 4, (1184, 158, 46, 128), note='terracotta peplos (villager female)')
    costume('chiton_sailor', 4, (1239, 158, 54, 128), note='white chiton, blue drape (sailor)')
    costume('himation_merchant', 4, (1296, 158, 52, 128), erase=[(1348, 170, 20, 120)], note='orange himation over white (merchant)')
    costume('himation_elite', 4, (1372, 158, 54, 128), note='white chiton, blue himation (elite / leader)')
    costume('chiton_youth', 4, (1441, 160, 44, 126), note='short terracotta tunic (youth)')

    # ------------------------------------------------------------------ heads
    for name, n, box, skull in [
        ('head_neutral', 4, (18, 358, 46, 72), (40.7, 380)), ('hair_short', 4, (72, 356, 54, 76), (99.3, 383)),
        ('hair_curls', 4, (130, 356, 58, 76), (159, 383)), ('headband', 4, (194, 360, 50, 72), (219, 383)),
        ('veil', 4, (246, 360, 62, 74), (289, 385.7)), ('hat_petasos', 4, (314, 360, 66, 76), (343.6, 388.6)),
        ('hat_hood', 4, (372, 360, 56, 74), (409, 385.7)), ('helmet_corinthian', 4, (436, 344, 60, 92), (470.7, 383)),
        ('beard_long', 3, (183, 722, 46, 70), (206.8, 750.7)),
    ]:
        head(name, n, box, skull, r=16 if n == 3 else 17, note=f'sheet{n} heads row')

    # ------------------------------------------------------------------ rig reference parts (sheet 4) + staff
    from extract_ch01 import piece
    piece('global/rig/body_master_neutral', 4, (12, 150, 86, 156), thr=9, holes=None, rt=0.5, note='sheet4 neutral rig figure')
    piece('global/rig/body_head', 4, (117, 156, 34, 48), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_torso', 4, (155, 156, 42, 112), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_upper_arm', 4, (195, 178, 18, 40), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_forearm', 4, (255, 178, 18, 42), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_thigh', 4, (322, 178, 16, 44), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_shin', 4, (350, 178, 16, 44), thr=9, holes=None, rt=0.5)
    piece('global/rig/body_foot_sandal', 4, (504, 247, 30, 30), thr=9, holes=None, rt=0.5)
    piece('global/costumes/himation_drape', 4, (442, 172, 56, 96), thr=9, holes=None, rt=0.5, note='red himation with strap')
    piece('global/costumes/cloak_long_rest', 4, (497, 156, 72, 84), thr=9, holes=None, rt=0.5, anchors={'collar': (533, 162)}, note='flared red cape')
    piece('global/costumes/chiton_plain', 4, (155, 156, 42, 100), thr=9, holes=None, rt=0.5, erase=[(155, 240, 42, 30)], note='plain belted chiton (rig torso without the hip stick)')
    # staff: the merchant's walking staff, below/above the hand (sheet 4 costume row)
    piece('global/props/held/staff', 4, (1346, 186, 14, 98), thr=9, holes=None, rt=1.0, keep=[[(1348, 186), (1360, 186), (1360, 284), (1348, 284)]],
          anchors={'top': (1355, 188), 'bottom': (1353, 282)}, note='merchant staff')

    json.dump(manifest, open(MAN_PATH, 'w'), indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
