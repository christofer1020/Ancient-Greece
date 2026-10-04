"""Shared helpers for cutting assets out of the flattened production sheets."""
import os, hashlib
import numpy as np, cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', '_source')
CACHE = os.environ.get('ASSET_CACHE', os.path.expanduser('~/.cache/ag-assets'))
os.makedirs(CACHE, exist_ok=True)
_sheets = {}


def sheet(n):
    if n not in _sheets:
        _sheets[n] = cv2.imread(os.path.join(SRC, f'ch01_sheet_0{n}.webp'))[:, :, ::-1].copy()  # RGB
    return _sheets[n]


def crop(n, x, y, w, h, pad=4):
    s = sheet(n)
    x0, y0 = max(x - pad, 0), max(y - pad, 0)
    x1, y1 = min(x + w + pad, s.shape[1]), min(y + h + pad, s.shape[0])
    return s[y0:y1, x0:x1].copy(), (x0, y0)


def up4(rgb):
    """ESRGAN x4 with an on-disk cache keyed by pixel content."""
    key = hashlib.sha1(rgb.tobytes() + str(rgb.shape).encode()).hexdigest()[:20]
    p = os.path.join(CACHE, key + '.png')
    if os.path.exists(p):
        return cv2.imread(p)[:, :, ::-1].copy()
    import esrgan
    out = esrgan.upscale4(np.ascontiguousarray(rgb))
    cv2.imwrite(p, out[:, :, ::-1])
    return out


def lab(rgb):
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32) * np.array([100 / 255, 1, 1], np.float32) - np.array([0, 128, 128], np.float32)


def border_palette(rgb, k=4, ring=3):
    h, w = rgb.shape[:2]
    m = np.zeros((h, w), bool)
    m[:ring], m[-ring:], m[:, :ring], m[:, -ring:] = True, True, True, True
    px = lab(rgb)[m].reshape(-1, 3)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, labels, centers = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.ravel(), minlength=k)
    return centers[counts > len(px) * 0.04]


def bg_distance(rgb, pal):
    L = lab(rgb)
    d = np.full(rgb.shape[:2], 1e9, np.float32)
    for c in pal:
        dd = L - c
        d = np.minimum(d, np.sqrt(dd[..., 0] ** 2 * 0.6 + dd[..., 1] ** 2 * 1.4 + dd[..., 2] ** 2 * 1.4))
    return d


def flood_bg(bglike, seeds=None):
    """Background = bg-like pixels connected to the image border (or to given seed mask)."""
    n, lab_ = cv2.connectedComponents(bglike.astype(np.uint8), connectivity=4)
    edge = np.zeros_like(bglike)
    if seeds is None:
        edge[0, :], edge[-1, :], edge[:, 0], edge[:, -1] = True, True, True, True
    else:
        edge = seeds
    ids = np.unique(lab_[edge & bglike])
    ids = ids[ids > 0]
    return np.isin(lab_, ids)


def fill_holes(fg, max_area=None):
    inv = (~fg).astype(np.uint8)
    n, lab_, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    out = fg.copy()
    h, w = fg.shape
    for i in range(1, n):
        x, y, ww, hh, a = st[i]
        if x == 0 or y == 0 or x + ww == w or y + hh == h:
            continue
        if max_area is None or a <= max_area:
            out[lab_ == i] = True
    return out


def soften(mask, erode=2, blur=1.1):
    m = mask.astype(np.uint8) * 255
    if erode > 0:
        m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * erode + 1, 2 * erode + 1)))
    a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), blur) if blur > 0 else m.astype(np.float32) / 255
    return np.clip(a, 0, 1)


def decontaminate(rgb, alpha, bg_rgb):
    a = alpha[..., None]
    f = rgb.astype(np.float32)
    b = np.array(bg_rgb, np.float32)
    safe = np.maximum(a, 0.25)
    out = (f - (1 - a) * b) / safe
    blend = np.clip((a - 0.25) / 0.5, 0, 1)
    out = out * (1 - blend) + f * blend
    # pixels at the very edge: pull towards nearest solid colour
    return np.clip(out, 0, 255).astype(np.uint8)


def bleed(rgb, alpha, iters=6):
    """Extend solid colours outward under transparent pixels (avoids dark/light fringes when resized)."""
    rgb = rgb.astype(np.float32)
    solid = (alpha > 0.6).astype(np.float32)
    acc, wsum = rgb * solid[..., None], solid.copy()
    for _ in range(iters):
        acc = cv2.blur(acc, (3, 3))
        wsum = cv2.blur(wsum, (3, 3))
    fill = acc / np.maximum(wsum[..., None], 1e-4)
    m = (alpha < 0.6)[..., None] & (wsum[..., None] > 1e-4)
    return np.where(m, fill, rgb).clip(0, 255).astype(np.uint8)


def trim(rgba, pad=2):
    a = rgba[..., 3]
    ys, xs = np.where(a > 4)
    if not len(xs):
        return rgba, (0, 0)
    x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
    x1, y1 = min(xs.max() + pad + 1, rgba.shape[1]), min(ys.max() + pad + 1, rgba.shape[0])
    return rgba[y0:y1, x0:x1], (x0, y0)


def save(rgba, rel, rt_scale=0.5, quality=86, master=True, max_master=4096):
    """Write <rel>.png (lossless master) and <rel>.webp (runtime, rt_scale of master)."""
    path = os.path.join(ROOT, 'assets', rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.fromarray(rgba, 'RGBA' if rgba.shape[2] == 4 else 'RGB')
    if max(im.size) > max_master:
        k = max_master / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    if master:
        im.save(path + '.png', optimize=True)
    rt = im.resize((max(1, round(im.width * rt_scale)), max(1, round(im.height * rt_scale))), Image.LANCZOS) if rt_scale != 1 else im
    rt.save(path + '.webp', quality=quality, method=6, alpha_quality=92)
    return rt.size, im.size
