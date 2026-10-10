"""Process the generated environment plates into runtime layers.

  python3 tools/assets/plates.py

Inputs are the generated masters, as delivered:
  assets/chapter-01/ch01_environment_master.png   3840x1648
  assets/intro/intro_environment_master.png       3840x1648
Outputs per plate:
  <name>_env.webp       runtime plate = sky extension (SKY_EXT px) + foliage-cleaned master
  <name>_sea_mask.webp  white = open water (drives the code water shimmer), same canvas as the runtime plate

Foliage clean-up: the generator rendered foreground foliage as hard square dabs (visible as a blocky
mosaic at 1x). Only the foliage (yellow-green / olive hues below the horizon, feathered mask) is smoothed
with an edge-preserving filter and given back a fine grain; sky, sea, rock and buildings keep full detail.

Sky extension: the plates end just above the clouds, so camera framings at 4:3 / 16:10 / ultrawide would
run off the painting. SKY_EXT px of sky is added on top, continuing each column's sky colour from the
plate's top rows upward with the same vertical gradient and grain. It is pure sky (no objects); drifting
cloud sprites pass through it at runtime. The camera is also clamped to the plate (src/engine/scene.js).

A sky/land split for parallax was tried (GrabCut + in-painting) and rejected: the in-painted sky behind
the land smeared visibly. Depth comes from separate sprite layers instead (clouds, gulls, ship, cast, framing).
"""
import os, json
import numpy as np, cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = {'ch01': os.path.join(ROOT, 'assets', 'chapter-01'), 'intro': os.path.join(ROOT, 'assets', 'intro')}
DBG = os.environ.get('PLATE_DEBUG')
SKY_EXT = 640  # px of extended sky (= 388 scene units at the 1.648 px/unit plate scale)


def rgb(path):
    return cv2.imread(path)[:, :, ::-1].copy()


def save_webp(path, arr, q=84, alpha_q=92):
    mode = 'RGBA' if arr.ndim == 3 and arr.shape[2] == 4 else ('L' if arr.ndim == 2 else 'RGB')
    Image.fromarray(arr, mode).save(path, quality=q, method=6, alpha_quality=alpha_q)


def grain(shape, amp, seed, sigma=0.8):
    rs = np.random.default_rng(seed)
    g = rs.normal(0, 1, shape[:2]).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), sigma)
    return (g / (g.std() + 1e-6) * amp)[..., None]


def soften_foliage(img, horizon):
    """Round off the blocky dabs in foreground foliage only (feathered hue mask), then restore grain."""
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(np.int16)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    foliage = (h >= 17) & (h <= 48) & (s > 55) & (v > 40)
    foliage[:int(horizon * 0.55)] = False          # the sky's warm haze is not foliage
    m = foliage.astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    mask = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 6)[..., None]
    f = img.astype(np.float32)
    sm = cv2.GaussianBlur(cv2.medianBlur(img, 5).astype(np.float32), (0, 0), 2.2)
    # keep a little of the original structure (gentle unsharp of the smoothed result) + painterly grain
    sm = sm + 0.35 * (sm - cv2.GaussianBlur(sm, (0, 0), 6))
    sm += grain(img.shape, 3.5, 3)
    out = f * (1 - mask * 0.9) + sm * (mask * 0.9)
    return np.clip(out, 0, 255).astype(np.uint8), mask[..., 0]


def extend_sky(img, ext, feather=64):
    """Continue the sky upward. Column colour comes from SKY pixels of the top band only (trees reaching the
    top edge are skipped and bridged by interpolation), heavily smoothed sideways; one shared vertical
    gradient (flattening as it rises) avoids streaks. The texture is matched to the band's own fine mottle,
    and the seam is a long feather into a grain-free continuation of the same gradient (never a repeated row,
    which would smear the grain into vertical streaks)."""
    H, W = img.shape[:2]
    band = img[2:40]
    hsv = cv2.cvtColor(band, cv2.COLOR_RGB2HSV).astype(np.int16)
    skyish = (hsv[..., 0] >= 85) & (hsv[..., 0] <= 135) & (hsv[..., 2] > 110)
    col = np.zeros((W, 3), np.float32)
    valid = skyish.mean(0) > 0.6
    for c in range(3):
        ch = band[..., c].astype(np.float32)
        med = np.where(skyish, ch, np.nan)
        colc = np.nanmedian(np.where(valid[None, :], med, np.nan), axis=0)
        xs = np.arange(W)
        col[:, c] = np.interp(xs, xs[valid], colc[valid])
    col = cv2.GaussianBlur(col[None], (0, 0), sigmaX=120, sigmaY=0)[0]
    lower = img[60:90].astype(np.float32).mean(0)
    vslope = np.clip(np.median((col - lower)[valid], axis=0) / 50.0, -0.12, 0.12)   # per channel, shared
    # rows measured upward from the band centre (master row 21); negative = inside the master
    d = np.arange(ext + 21, 21 - feather, -1, dtype=np.float32)[:, None, None]
    fall = np.where(d > 0, 220.0 * (1 - np.exp(-np.maximum(d, 0) / 220.0)), d)
    smooth = col[None] + vslope[None, None] * fall
    # fine texture: same amplitude and scale as the band's detail (local deviation from a 6 px blur)
    bf = band.astype(np.float32)
    det = bf - cv2.GaussianBlur(bf, (0, 0), 6)
    amp = float(np.median([det[..., c][skyish].std() for c in range(3)]))
    sky = smooth + grain(smooth.shape, amp, 11, sigma=1.3)
    sky = np.clip(sky, 0, 255)
    out = np.vstack([sky[:ext].astype(np.uint8), img])
    # feather the first rows of the master towards the continuation (sky columns only)
    a = np.linspace(0, 1, feather, dtype=np.float32)[:, None, None]
    a = a * a * (3 - 2 * a)
    w = a + (1 - a) * (~valid)[None, :, None]
    seam = slice(ext, ext + feather)
    out[seam] = np.clip(img[:feather].astype(np.float32) * w + sky[ext:] * (1 - w), 0, 255).astype(np.uint8)
    return out, valid


def sea_mask(img, horizon):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(np.int16)
    H, W = img.shape[:2]
    blue = (hsv[..., 0] >= 92) & (hsv[..., 0] <= 125) & (hsv[..., 1] > 55) & (hsv[..., 2] > 70)
    # sun glitter on the water is pale yellow: accept it when surrounded by sea
    glitter = (hsv[..., 2] > 200) & (hsv[..., 1] < 120)
    m = np.zeros((H, W), np.uint8)
    m[horizon:] = blue[horizon:]
    big = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    m = np.where(glitter & (big > 0), 1, m).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    # keep only big water bodies
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 20000:
            keep[lab == i] = 1
    keep = cv2.erode(keep, np.ones((7, 7), np.uint8))
    return cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 4)


def build(name, master, horizon):
    img = rgb(master)
    H, W = img.shape[:2]
    clean, fmask = soften_foliage(img, horizon)
    sm = sea_mask(img, horizon)
    plate, skycols = extend_sky(clean, SKY_EXT)
    sm = np.vstack([np.zeros((SKY_EXT, W), np.float32), sm])
    out = OUT[name]; os.makedirs(out, exist_ok=True)
    save_webp(os.path.join(out, f'{name}_env.webp'), plate, q=86)
    save_webp(os.path.join(out, f'{name}_sea_mask.webp'), (sm * 255).astype(np.uint8), q=70)
    if DBG:
        cv2.imwrite(f'{DBG}/{name}_plate.png', plate[:, :, ::-1])
        cv2.imwrite(f'{DBG}/{name}_foliage_mask.png', (fmask * 255).astype(np.uint8))
        cv2.imwrite(f'{DBG}/{name}_sea.png', (sm * 255).astype(np.uint8))
    # columns where the master's top edge is not open sky (a tree crown cut by the frame): the camera
    # must not look above the master's top there (exported as world-unit x ranges for the scene)
    bad = np.where(~skycols)[0]
    cut = []
    if len(bad):
        runs = np.split(bad, np.where(np.diff(bad) > 1)[0] + 1)
        cut = [[int(r[0]), int(r[-1])] for r in runs if len(r) > 8]
    return dict(w=W, h=H + SKY_EXT, horizon=horizon + SKY_EXT, sky_ext=SKY_EXT, master_h=H, top_cut_px=cut)


if __name__ == '__main__':
    meta = {
        'ch01': build('ch01', os.path.join(OUT['ch01'], 'ch01_environment_master.png'), 716),
        'intro': build('intro', os.path.join(OUT['intro'], 'intro_environment_master.png'), 797),
    }
    old = os.path.join(ROOT, 'assets', 'chapter-01', 'ch01_env_world.webp')
    if os.path.exists(old):
        os.remove(old)
    json.dump(meta, open(os.path.join(ROOT, 'assets', 'plates.json'), 'w'), indent=1)
    print(json.dumps(meta, indent=1))
