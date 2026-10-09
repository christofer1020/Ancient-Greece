"""Process the generated environment plates into runtime layers.

  python3 tools/assets/plates.py

Chapter 1 plate (assets/chapter-01/ch01_environment_master.png, 3840x1648, the generated master as delivered):
  - ch01_env_world.webp                   the full plate (land + sea + sky), one coherent layer
  - ch01_sea_mask.webp                    white = open water (drives the code water shimmer)
Intro plate (assets/intro/intro_environment_master.png): runtime + sea mask.
A sky/land split for parallax was tried (GrabCut + in-painting) and rejected: the in-painted sky behind
the land smeared visibly. Depth comes from separate sprite layers instead (clouds, gulls, ship, cast, framing).
"""
import os, json
import numpy as np, cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GEN = os.path.join(ROOT, 'assets', '_generated')
OUT = {'ch01': os.path.join(ROOT, 'assets', 'chapter-01'), 'intro': os.path.join(ROOT, 'assets', 'intro')}
DBG = os.environ.get('PLATE_DEBUG')


def rgb(path):
    return cv2.imread(path)[:, :, ::-1].copy()


def save_webp(path, arr, q=84, alpha_q=92):
    mode = 'RGBA' if arr.ndim == 3 and arr.shape[2] == 4 else ('L' if arr.ndim == 2 else 'RGB')
    Image.fromarray(arr, mode).save(path, quality=q, method=6, alpha_quality=alpha_q)


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


def build_ch01():
    img = rgb(os.path.join(OUT['ch01'], 'ch01_environment_master.png'))
    H, W = img.shape[:2]
    horizon = 716
    out = OUT['ch01']; os.makedirs(out, exist_ok=True)
    save_webp(os.path.join(out, 'ch01_env_world.webp'), img, q=84)
    sm = sea_mask(img, horizon)
    save_webp(os.path.join(out, 'ch01_sea_mask.webp'), (sm * 255).astype(np.uint8), q=70)
    meta = dict(w=W, h=H, horizon=horizon)
    if DBG:
        cv2.imwrite(DBG + '/ch01_sea.png', (sm * 255).astype(np.uint8))
    return meta


def build_intro():
    img = rgb(os.path.join(OUT['intro'], 'intro_environment_master.png'))
    H, W = img.shape[:2]
    horizon = 797
    out = OUT['intro']; os.makedirs(out, exist_ok=True)
    save_webp(os.path.join(out, 'intro_env.webp'), img, q=84)
    sm = sea_mask(img, horizon)
    save_webp(os.path.join(out, 'intro_sea_mask.webp'), (sm * 255).astype(np.uint8), q=70)
    if DBG:
        cv2.imwrite(DBG + '/intro_sea.png', (sm * 255).astype(np.uint8))
    return dict(w=W, h=H, horizon=horizon)


if __name__ == '__main__':
    meta = {'ch01': build_ch01(), 'intro': build_intro()}
    json.dump(meta, open(os.path.join(ROOT, 'assets', 'plates.json'), 'w'), indent=1)
    print(json.dumps(meta, indent=1))
