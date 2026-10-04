"""Minimal Real-ESRGAN (RRDBNet) inference for illustration upscaling.

Model weights are not committed; fetch them once with:
  curl -L -o ~/.cache/esrgan/RealESRGAN_x4plus_anime_6B.pth \
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
"""
import os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1 = RDB(nf, gc)
        self.rdb2 = RDB(nf, gc)
        self.rdb3 = RDB(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nb=6, nf=64, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


_model = None
WEIGHTS = os.environ.get('ESRGAN_WEIGHTS', os.path.expanduser('~/.cache/esrgan/RealESRGAN_x4plus_anime_6B.pth'))


def model():
    global _model
    if _model is None:
        torch.set_num_threads(os.cpu_count() or 4)
        m = RRDBNet()
        sd = torch.load(WEIGHTS, map_location='cpu')
        sd = sd.get('params_ema', sd.get('params', sd))
        m.load_state_dict(sd, strict=True)
        m.eval()
        _model = m
    return _model


@torch.no_grad()
def upscale4(rgb, tile=192, pad=12):
    """rgb: HxWx3 uint8 -> (4H)x(4W)x3 uint8."""
    m = model()
    img = torch.from_numpy(rgb.astype(np.float32) / 255.0).permute(2, 0, 1)[None]
    _, _, h, w = img.shape
    out = torch.zeros((1, 3, h * 4, w * 4))
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            y0, x0 = max(y - pad, 0), max(x - pad, 0)
            y1, x1 = min(y + tile + pad, h), min(x + tile + pad, w)
            o = m(img[:, :, y0:y1, x0:x1])
            ty1, tx1 = min(y + tile, h), min(x + tile, w)
            out[:, :, y * 4:ty1 * 4, x * 4:tx1 * 4] = o[:, :, (y - y0) * 4:(y - y0 + ty1 - y) * 4, (x - x0) * 4:(x - x0 + tx1 - x) * 4]
    return (out[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255 + 0.5).astype(np.uint8)
