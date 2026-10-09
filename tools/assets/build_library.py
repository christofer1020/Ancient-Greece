"""Build the production asset library from the generated images (assets/_generated).

  python3 tools/assets/build_library.py

Each generated image holds ONE asset or a small family of 2-4 widely spaced assets on a native
transparent background (GPT Image 2.5, background=transparent). This script:
  1. separates the family into items (alpha connected components, nearby fragments grouped),
  2. cleans every item (defringe from the nearest solid colour, drop specks, trim) - see alpha_qa.py,
  3. writes a lossless PNG master + a runtime WebP to the library path,
  4. measures anchors (neck, collar, wrist, ankle, base, sail, ...) and writes assets/library.json,
  5. generates src/art/library.gen.js (import map with sizes and anchors).
Environment plates are processed by plates.py.
"""
import os, json
import numpy as np, cv2
from PIL import Image
from alpha_qa import clean, metrics

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GEN = os.path.join(ROOT, 'assets', '_generated')
LIB = os.path.join(ROOT, 'assets')
MAN = os.path.join(LIB, 'library.json')

# canonical proportions, measured on the generated canonical cast (fractions of figure height H)
# used by the rig (src/art/cutout.js): skull 0.147H, neck/shoulder 0.168H, belt 0.38H, knee hem 0.67H
RIG_H = 150.0                       # rig units, ground to top of skull
CANON = dict(skull_d=0.147, neck_w=0.026, hem_knee_from_top=0.67, shoulder_from_top=0.168)


def load(name):
    return np.array(Image.open(os.path.join(GEN, name + '.png')).convert('RGBA'))


def items(rgba, n_expect, group=40, min_area=1500, order='x'):
    """Split a family image into n items; fragments within `group` px join their neighbour."""
    a = rgba[..., 3] > 10
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * group + 1, 2 * group + 1))
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(a.astype(np.uint8), k), 8)
    comps = [(i, st[i]) for i in range(1, n) if st[i, 4] >= min_area]
    comps.sort(key=lambda c: c[1][4], reverse=True)
    comps = comps[:n_expect]
    if order == 'x':
        comps.sort(key=lambda c: c[1][0])
    elif order == 'rowx':
        comps.sort(key=lambda c: (c[1][1] // 300, c[1][0]))
    out = []
    for i, (x, y, w, h, ar) in comps:
        m = (lab == i) & a
        piece = rgba.copy()
        piece[..., 3] = np.where(lab == i, rgba[..., 3], 0)
        out.append(piece)
    if len(out) != n_expect:
        raise SystemExit(f'expected {n_expect} items, found {len(out)}')
    return out


# Runtime size: the largest on-screen size (scene units x max camera zoom 1.3 x devicePixelRatio 2), so the
# WebP stays crisp on retina screens without shipping the multi-megapixel masters. Masters keep full size.
RUNTIME_MAX = {
    'global/heads/': 220, 'global/costumes/': 460, 'global/characters/char_hand': 64, 'global/characters/char_foot': 120,
    'global/characters/char_': 600, 'global/ships/ship_merchant': 900, 'global/ships/': 360, 'global/props/prop_staff': 360,
    'global/props/': 300, 'global/environment/env_cloud': 1000, 'global/environment/env_fg_': 900,
    'global/environment/env_olive_sapling': 160, 'global/environment/': 560, 'global/fx/fx_gull': 120, 'global/fx/': 260,
}


def runtime_scale(rel, w, h):
    for prefix, mx in RUNTIME_MAX.items():
        if rel.startswith(prefix):
            return min(1.0, mx / max(w, h))
    return 1.0


def save(rel, rgba, rt=None, q=88):
    path = os.path.join(LIB, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.fromarray(rgba, 'RGBA')
    im.save(path + '.png', optimize=True)
    if rt is None:
        rt = runtime_scale(rel, im.width, im.height)
    rtim = im if rt == 1 else im.resize((max(1, round(im.width * rt)), max(1, round(im.height * rt))), Image.LANCZOS)
    rtim.save(path + '.webp', quality=q, method=6, alpha_quality=95)
    return rtim.size


manifest = {}


def emit(rel, rgba, anchors=None, extra=None, rt=None, do_clean=True):
    if do_clean:
        rgba, off = clean(rgba)
    else:
        off = (0, 0)
    H, W = rgba.shape[:2]
    (rw, rh) = save(rel, rgba, rt=rt)
    an = {}
    for k, v in (anchors or {}).items():
        if callable(v):
            v = v(rgba)
        an[k] = [round(v[0] / W, 4), round(v[1] / H, 4)]
    m = metrics(rgba)
    manifest[rel] = dict(w=rw, h=rh, master=[W, H], anchors=an, qa=m, **(extra or {}))
    print(f'{rel:52s} {W}x{H}  halo L{m["light_halo"]:.3f} D{m["dark_halo"]:.3f}  {an}')
    return rgba


# ---------------------------------------------------------------- anchor helpers (on cleaned, trimmed rgba)
def alpha(rgba, t=128):
    return rgba[..., 3] > t


def bottom_center(rgba):
    a = alpha(rgba)
    ys, xs = np.where(a)
    yb = ys.max()
    band = xs[ys > yb - max(4, (ys.max() - ys.min()) * 0.03)]
    return (float(np.median(band)), float(yb))


def top_center(rgba):
    a = alpha(rgba)
    ys, xs = np.where(a)
    yt = ys.min()
    band = xs[ys < yt + max(4, (ys.max() - ys.min()) * 0.03)]
    return (float(np.median(band)), float(yt))


def neck_bottom(rgba):
    """Bottom centre of a head piece's neck stub: the dark limb-coloured pixels in the lowest rows
    (a hanging beard or hair beside the neck must not pull the anchor sideways)."""
    a = alpha(rgba)
    dark = a & (rgba[..., :3].max(2) < 75)
    ys, xs = np.where(dark)
    yb = ys.max()
    band = xs[ys > yb - 14]
    return (float(np.median(band)), float(yb))


def neck_width(rgba):
    a = alpha(rgba) & (rgba[..., :3].max(2) < 75)
    ys, xs = np.where(a)
    yb = ys.max()
    rows = [a[y].sum() for y in range(yb - 30, yb - 5)]
    return float(np.median(rows))


def collar(rgba):
    """Top centre of a garment: middle of the alpha a little below its highest point."""
    a = alpha(rgba)
    ys, xs = np.where(a)
    y = ys.min() + int((ys.max() - ys.min()) * 0.035)
    row = np.where(a[y])[0]
    return (float((row.min() + row.max()) / 2), float(ys.min()))


# ---------------------------------------------------------------- canonical cast: full figures + heads cut at the neck
def cut_head(fig):
    a = alpha(fig, 40)
    ys, xs = np.where(a)
    y0, y1 = ys.min(), ys.max()
    h = y1 - y0
    widths = np.array([a[y].sum() for y in range(y0, y0 + int(h * 0.35))])
    head_row = int(np.argmax(widths[: int(h * 0.2)]))
    span = widths[head_row: int(h * 0.3)]
    wmin = span.min()
    run = np.where(span <= wmin * 1.3)[0]
    # the neck run: contiguous rows near the minimum, take its lower end
    last = run[0]
    for r in run[1:]:
        if r - last > 3:
            break
        last = r
    cut = y0 + head_row + int(last) - 2
    head = fig.copy()
    head[cut:, :, 3] = 0
    return head, cut


def build_cast():
    src = load('g01_cast_canonical')
    figs = items(src, 3, group=30)
    names = ['char_elder_full', 'char_water_carrier_full', 'char_farmer_full']
    heads = ['head_elder_beard', 'head_bun_headband', 'head_petasos']
    neck_ws = []
    for fig, nm, hn in zip(figs, names, heads):
        f = emit(f'global/characters/{nm}', fig, anchors={'base': bottom_center})
        head, cut = cut_head(fig)
        hh = emit(f'global/heads/{hn}', head, anchors={'neck': neck_bottom})
        if hn != 'head_elder_beard':
            neck_ws.append(neck_width(hh))
    # rig units per px for this group (canonical neck width = 0.026 H)
    upx = (CANON['neck_w'] * RIG_H) / float(np.median(neck_ws))
    for hn in heads:
        manifest[f'global/heads/{hn}']['upx'] = round(upx, 5)
    Image.fromarray(src, 'RGBA').save(os.path.join(LIB, 'global/characters/char_cast_canonical.png'), optimize=True)


def build_heads_b():
    src = load('g04_heads_b')
    hs = items(src, 3, group=20)
    names = ['head_child_curls', 'head_trader_curls_beard', 'head_worker_headband']
    nws = []
    for h, nm in zip(hs, names):
        hh = emit(f'global/heads/{nm}', h, anchors={'neck': neck_bottom})
        nws.append(neck_width(hh))
    upx = (CANON['neck_w'] * RIG_H) / float(np.median(nws))
    for nm in names:
        manifest[f'global/heads/{nm}']['upx'] = round(upx, 5)


def build_costumes(src_name, names, knee_idx):
    src = load(src_name)
    gs = items(src, 3, group=20)
    cleaned = []
    for g, nm in zip(gs, names):
        c = emit(f'global/costumes/{nm}', g, anchors={'collar': collar, 'hem': bottom_center})
        cleaned.append(c)
    # scale: knee-length garments span shoulder (0.168H) to knee hem (0.67H)
    hs = [cleaned[i].shape[0] for i in knee_idx]
    upx = ((CANON['hem_knee_from_top'] - CANON['shoulder_from_top']) * RIG_H) / float(np.median(hs))
    for nm in names:
        manifest[f'global/costumes/{nm}']['upx'] = round(upx, 5)


def build_rig_parts():
    src = load('g07_rig_feet_hands')
    foot, hopen, hgrip = items(src, 3, group=10)
    emit('global/characters/char_foot_sandal', foot, anchors={'ankle': top_center, 'sole': bottom_center})
    emit('global/characters/char_hand_open', hopen, anchors={'wrist': top_center})
    emit('global/characters/char_hand_grip', hgrip, anchors={'wrist': top_center})


def build_family(src_name, rels, group=30, order='x', anchors=None, rt=None, n=None):
    src = load(src_name)
    parts = items(src, n or len(rels), group=group, order=order)
    for p, rel in zip(parts, rels):
        emit(rel, p, anchors=(anchors or {}).get(rel.split('/')[-1], {'base': bottom_center}), rt=rt)


def build_ship():
    src = load('g02_ship_merchant')
    rgba, off = clean(src)
    a = rgba[..., 3] > 128
    # sail: the large cream region (light, low saturation) -> its own aligned overlay
    hsv = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2HSV)
    cream = a & (hsv[..., 2] > 170) & (hsv[..., 1] < 80)
    cream = cv2.morphologyEx(cream.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(cream, 8)
    big = 1 + int(np.argmax(st[1:, 4]))
    sail = (lab == big)
    sail = cv2.morphologyEx(sail.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)).astype(bool)
    # fill holes (seam lines) inside the sail
    inv = (~sail).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n2):
        x, y, w, h, ar = st2[i]
        if x > 0 and y > 0 and x + w < sail.shape[1] and y + h < sail.shape[0]:
            sail[lab2 == i] = True
    ys, xs = np.where(sail)
    yard = (float(np.median(xs[ys < ys.min() + 12])), float(ys.min()))
    hull_rows = np.where(a.sum(1) > 0)[0]
    bottom = float(hull_rows.max())
    H, W = rgba.shape[:2]
    rt = runtime_scale('global/ships/ship_merchant', W, H)
    rw, rh = save('global/ships/ship_merchant', rgba, rt=rt)
    sail_rgba = rgba.copy()
    sail_rgba[..., 3] = np.where(sail, rgba[..., 3], 0)
    save('global/ships/ship_merchant_sail', sail_rgba, rt=rt)  # same canvas and scale as the ship: registers exactly
    m = metrics(rgba)
    for rel in ('global/ships/ship_merchant', 'global/ships/ship_merchant_sail'):
        manifest[rel] = dict(w=rw, h=rh, master=[W, H], qa=m, anchors={'yard': [round(yard[0] / W, 4), round(yard[1] / H, 4)],
                                                                         'keel': [0.5, round(bottom / H, 4)]})
    print('ship', W, H, 'yard', yard, 'keel', bottom, m)


def main():
    build_cast()
    build_heads_b()
    build_costumes('g05_costumes_a', ['costume_himation_elder', 'costume_peplos', 'costume_chiton_farmer'], knee_idx=[2])
    build_costumes('g06_costumes_b', ['costume_tunic_child', 'costume_himation_trader', 'costume_exomis_worker'], knee_idx=[1, 2])
    build_rig_parts()
    build_ship()
    build_family('g08_boats', ['global/ships/ship_fishing_boat', 'global/ships/ship_small_sail'])
    build_family('g09_props_a', ['global/props/prop_amphora_a', 'global/props/prop_pithos', 'global/props/prop_crate'])
    build_family('g10_props_b', ['global/props/prop_basket_produce', 'global/props/prop_staff', 'global/props/prop_fishing_net'],
                 anchors={'prop_staff': {'top': top_center, 'base': bottom_center}, 'prop_basket_produce': {'handle': top_center, 'base': bottom_center}})
    build_family('g11_trees', ['global/environment/env_olive_tree_a', 'global/environment/env_cypress_a'], group=40)
    build_family('g12_shrub_agave_rock', ['global/environment/env_shrub_a', 'global/environment/env_agave_a', 'global/environment/env_rock_a'], group=6)
    build_family('g13_clouds', ['global/environment/env_cloud_a', 'global/environment/env_cloud_b', 'global/environment/env_cloud_c'], group=70, order='rowx')
    build_family('g14_smoke_gulls', ['global/fx/fx_smoke_a', 'global/fx/fx_smoke_b', 'global/fx/fx_gull_up', 'global/fx/fx_gull_down'], group=40)
    if os.path.exists(os.path.join(GEN, 'g16_olive_saplings.png')):
        build_family('g16_olive_saplings', ['global/environment/env_olive_sapling_1', 'global/environment/env_olive_sapling_2', 'global/environment/env_olive_sapling_3'], group=25)
    if os.path.exists(os.path.join(GEN, 'g17_foreground_foliage.png')):
        build_family('g17_foreground_foliage', ['global/environment/env_fg_olive_branch', 'global/environment/env_fg_grass_clump'], group=40,
                     anchors={'env_fg_olive_branch': {'top': top_center}, 'env_fg_grass_clump': {'base': bottom_center}})
    json.dump(manifest, open(MAN, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
