"""Alpha QA + edge clean-up for generated sprites.

  python3 alpha_qa.py check <in.png> [<preview.png>]   -> halo metrics + white/black/blue composite strip
  python3 alpha_qa.py clean <in.png> <out.png>         -> defringe, drop specks, (re)trim

Halo metric: for every semi-transparent edge pixel (0.04 < a < 0.96) compare its colour with the nearest
solid pixel (a >= 0.96). A white matte shows up as edge pixels much LIGHTER than the solid colour next to them,
a black matte as edge pixels much DARKER. Reported as the share of edge pixels beyond 18 L* units.
"""
import sys
import numpy as np, cv2
from PIL import Image


def load(p):
    im = Image.open(p).convert('RGBA')
    return np.array(im)


def nearest_solid_rgb(rgba, solid_thr=0.96):
    a = rgba[..., 3].astype(np.float32) / 255
    solid = (a >= solid_thr).astype(np.uint8)
    if solid.sum() == 0:
        return rgba[..., :3].copy()
    # distance transform with labels gives the nearest solid pixel per location
    inv = (1 - solid).astype(np.uint8)
    _, lab = cv2.distanceTransformWithLabels(inv, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.where(solid == 1)
    # labels index solid pixels in raster order of the zero pixels of `inv`
    idx = np.zeros(lab.max() + 1, np.int64)
    zero_lab = lab[solid == 1]
    idx[zero_lab] = np.arange(len(ys))
    nn = idx[lab]
    out = np.empty_like(rgba[..., :3])
    out[...] = rgba[ys[nn], xs[nn], :3]
    return out


def metrics(rgba):
    a = rgba[..., 3].astype(np.float32) / 255
    edge = (a > 0.04) & (a < 0.96)
    if edge.sum() == 0:
        return dict(edge_px=0, light_halo=0.0, dark_halo=0.0, specks=0)
    ref = nearest_solid_rgb(rgba)
    L = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32) * 100 / 255
    Lr = cv2.cvtColor(ref, cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32) * 100 / 255
    d = (L - Lr)[edge]
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.04).astype(np.uint8), connectivity=8)
    specks = int(((st[1:, 4] < 40)).sum()) if n > 1 else 0
    return dict(edge_px=int(edge.sum()), light_halo=round(float((d > 18).mean()), 4), dark_halo=round(float((d < -18).mean()), 4), specks=specks,
                opaque_frac=round(float((a > 0.5).mean()), 4))


def composite_strip(rgba, h=420):
    k = h / rgba.shape[0]
    im = cv2.resize(rgba, (max(1, int(rgba.shape[1] * k)), h), interpolation=cv2.INTER_AREA)
    a = im[..., 3:4].astype(np.float32) / 255
    out = []
    for bg in ((255, 255, 255), (0, 0, 0), (40, 90, 200)):
        b = np.ones_like(im[..., :3], np.float32) * np.array(bg, np.float32)
        out.append((im[..., :3] * a + b * (1 - a)).astype(np.uint8))
    return np.hstack(out)


def clean(rgba, speck=60, pad=6):
    a = rgba[..., 3].astype(np.float32) / 255
    # drop isolated specks / dust
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.04).astype(np.uint8), connectivity=8)
    if n > 1:
        big = st[1:, 4].max()
        for i in range(1, n):
            if st[i, 4] < max(speck, big * 0.0005):
                a[lab == i] = 0
    a[a < 0.03] = 0
    # defringe: semi-transparent pixels take the colour of the nearest solid pixel (no matte can survive)
    tmp = rgba.copy(); tmp[..., 3] = (a * 255).astype(np.uint8)
    ref = nearest_solid_rgb(tmp)
    edge = (a > 0) & (a < 0.96)
    rgb = rgba[..., :3].copy()
    rgb[edge] = ref[edge]
    # fully transparent pixels: bleed neighbour colour so resampling never pulls in black/white
    rgb[a == 0] = ref[a == 0]
    out = np.dstack([rgb, (a * 255 + 0.5).astype(np.uint8)])
    ys, xs = np.where(out[..., 3] > 0)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, out.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, out.shape[1])
    return out[y0:y1, x0:x1], (x0, y0)


if __name__ == '__main__':
    cmd, src = sys.argv[1], sys.argv[2]
    rgba = load(src)
    if cmd == 'check':
        print(src, rgba.shape, metrics(rgba))
        if len(sys.argv) > 3:
            cv2.imwrite(sys.argv[3], composite_strip(rgba)[:, :, ::-1])
    elif cmd == 'clean':
        out, off = clean(rgba)
        Image.fromarray(out, 'RGBA').save(sys.argv[3], optimize=True)
        print(sys.argv[3], out.shape, 'offset', off, metrics(out))
