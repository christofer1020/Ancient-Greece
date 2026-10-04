"""Extract the Chapter 1 asset library from the approved production sheets.

  python3 tools/assets/extract_ch01.py [name-filter]

Sources: assets/_source/ch01_sheet_0{1..4}.webp (the four approved sheets, kept as masters).
Each entry crops a region, upscales it x4 with Real-ESRGAN (anime_6B), keys out the flattened
parchment/checker background, cleans the edges and writes:
  assets/<path>.png   lossless master (x4 of the sheet pixels, trimmed)
  assets/<path>.webp  runtime version (rt x master)
plus assets/manifest.ch01.json and src/scenes/ch01/assets.js (import map with sizes + anchors).
"""
import sys, json, os
import numpy as np, cv2
from keying import ROOT, trim, save, crop, up4
from cut import cutout, components, seamless_h

ONLY = os.environ.get("ONLY") or (sys.argv[1] if len(sys.argv) > 1 and __name__ == "__main__" else None)
MAN_PATH = os.path.join(ROOT, 'assets', 'manifest.ch01.json')
manifest = json.load(open(MAN_PATH)) if os.path.exists(MAN_PATH) else {}


def emit(rel, rgba, org=None, anchors=None, rt=0.5, mirror=False, q=86, note=''):
    rgba, off = trim(rgba)
    if mirror:
        rgba = rgba[:, ::-1].copy()
    (rw, rh), (mw, mh) = save(rgba, rel, rt_scale=rt, quality=q)
    an = {}
    for k, (sx, sy) in (anchors or {}).items():
        u = ((sx - org[0]) * 4 - off[0]) / mw
        v = ((sy - org[1]) * 4 - off[1]) / mh
        an[k] = [round(1 - u if mirror else u, 4), round(v, 4)]
    manifest[rel] = {'w': rw, 'h': rh, 'master': [mw, mh], 'anchors': an, 'note': note}
    print(f'{rel:58s} runtime {rw}x{rh}  master {mw}x{mh}')


def want(rel):
    return ONLY is None or ONLY in rel


def piece(rel, n, box, anchors=None, rt=0.5, mirror=False, note='', **kw):
    if not want(rel): return
    rgba, org = cutout(n, box, **kw)
    emit(rel, rgba, org, anchors, rt=rt, mirror=mirror, note=note)


def main():
    # ----------------------------------------------------------------------------- chapter-01 backgrounds
    piece('chapter-01/backgrounds/ch01_bg_hillside_terraces', 2, (8, 576, 246, 103), thr=9, holes=None,
          anchors={'base': (130, 677)}, rt=0.75, note='sheet2 hillside terraces (left)')
    piece('chapter-01/backgrounds/ch01_bg_hillside_terraces_b', 3, (536, 258, 224, 97), thr=9, holes=None, erase=[(700, 330, 80, 30)],
          anchors={'base': (650, 352)}, rt=0.75, note='sheet3 hillside terraces')
    piece('chapter-01/backgrounds/ch01_bg_beach_right', 2, (393, 584, 197, 96), thr=9, holes=1,
          anchors={'base': (480, 678)}, rt=0.75, note='sheet2 right beach')
    if 0: piece('chapter-01/backgrounds/ch01_bg_beach_right_b', 3, (866, 270, 156, 84), thr=9, holes=None, keep=[[(866, 354), (1022, 354), (1022, 270), (960, 280), (905, 320), (866, 340)]], rt=1.0, note='sheet3 right beach slope')
    piece('chapter-01/backgrounds/ch01_bg_outcrop_left', 2, (246, 583, 142, 92), thr=9, holes=None, rt=1.0, note='sheet2 left outcrop (rock in water)')
    piece('chapter-01/backgrounds/ch01_bg_outcrop_left_b', 3, (729, 270, 172, 66), thr=9, holes=None, rt=1.0, note='sheet3 left outcrop')
    piece('chapter-01/backgrounds/ch01_bg_shore_olive_tree', 1, (12, 940, 94, 58), thr=9, holes=1, erase=[(72, 936, 64, 14)], rt=1.0,
          note='sheet1 left outcrop: olive tree over rocks (foreground framing)')
    piece('chapter-01/backgrounds/ch01_bg_settlement', 1, (366, 939, 166, 59), thr=9, holes=None, erase=[(355, 925, 190, 17), (355, 996, 190, 10)], rt=1.0, note='sheet1 settlement')
    if 0: piece('chapter-01/backgrounds/ch01_bg_olive_mound', 1, (972, 939, 116, 61), thr=9, holes=10, rt=1.0, note='sheet1 olive trees on a sandy mound')
    piece('chapter-01/backgrounds/ch01_bg_rock_in_water', 1, (1087, 946, 128, 52), thr=9, holes=None, largest=0.02, rt=1.0, note='sheet1 rock with water')
    piece('chapter-01/backgrounds/ch01_bg_shore_far', 3, (276, 425, 251, 48), thr=8, holes=None, largest=0.02, rt=1.0, note='sheet3 far shore islands')
    piece('chapter-01/backgrounds/ch01_bg_islands_blue', 3, (274, 341, 250, 60), thr=8, holes=None, rt=1.0, note='sheet3 big blue islands / mid mountains')

    # ----------------------------------------------------------------------------- chapter-01 props (landmarks)
    piece('chapter-01/props/ch01_prop_mycenae_citadel', 2, (589, 566, 232, 113), thr=9, holes=None,
          anchors={'gate': (705, 590)}, rt=0.75, note='sheet2 mycenae citadel on its rock')
    piece('chapter-01/props/ch01_prop_crete_island_palace', 2, (821, 570, 264, 109), thr=9, holes=None,
          anchors={'palace': (950, 590)}, rt=0.75, note='sheet2 crete palace on its rock')

    # ----------------------------------------------------------------------------- strips from sheet 1
    if want('mountains_far'):
        rgba, org = cutout(1, (13, 826, 1201, 41), thr=7, holes=None, erode=1, pad=0, largest=False, erase=[(10, 822, 70, 8)], pal_box=[(150, 823, 900, 4), (300, 869, 800, 2)])
        emit('global/environment/mountains_far_soft', rgba, org, rt=0.5, note='sheet1 continuous far range')
    if want('island_'):
        rgba, org = cutout(1, (13, 870, 1201, 31), thr=8, holes=None, erode=1, pad=0, largest=False, erase=[(8, 864, 106, 18)], pal_box=[(420, 873, 110, 22), (760, 873, 60, 12)])
        for i, p in enumerate(components(rgba, min_area=3000)):
            emit(f'global/environment/island_{"abcdefghij"[i]}', p, org, rt=0.8, note='sheet1 island strip')
    if want('sea_tile'):
        lo, org = crop(1, 92, 907, 1120, 28, pad=0)
        hi = up4(lo)
        tile = seamless_h(hi, 160)
        emit('global/environment/sea_tile_base', np.dstack([tile, np.full(tile.shape[:2], 255, np.uint8)]), org, rt=0.75, q=84, note='sheet1 sea strip, seamless')
    if want('ground_sand'):
        # painted sand texture: randomised splats of a clean beach patch, wrapped so it tiles both ways
        lo, org = crop(2, 443, 652, 58, 16, pad=0)
        patch = up4(lo).astype(np.float32)
        ph, pw = patch.shape[:2]
        H, W = 320, 1280
        wsum = np.full((H, W, 1), 1e-4, np.float32); acc = np.ones((H, W, 3), np.float32) * patch.mean((0, 1)) * 1e-4
        wy = np.hanning(ph)[:, None] ** 0.8; wx = np.hanning(pw)[None, :] ** 0.8
        win = (wy * wx)[..., None].astype(np.float32)
        rs = np.random.default_rng(7)
        # jittered lattice at half-patch spacing: every pixel is covered by ~4 smooth windows
        spots = [(gy + rs.integers(-ph // 4, ph // 4), gx + rs.integers(-pw // 4, pw // 4))
                 for gy in range(0, H, ph // 2) for gx in range(0, W, pw // 2)]
        for y, x in spots:
            y, x = int(y) % H, int(x) % W
            p = patch[:, ::-1] if rs.random() < 0.5 else patch
            ys = (np.arange(ph) + y) % H; xs = (np.arange(pw) + x) % W
            acc[np.ix_(ys, xs)] += p * win; wsum[np.ix_(ys, xs)] += win
        tile = acc / wsum
        soft = cv2.GaussianBlur(np.vstack([tile] * 3), (0, 0), 7)[H:2 * H]  # wrap-aware vertical blur
        soft = cv2.GaussianBlur(np.hstack([soft] * 3), (0, 0), 7)[:, W:2 * W]
        tile = (0.62 * tile + 0.38 * soft).clip(0, 255).astype(np.uint8)
        emit('global/environment/ground_sand_tile', np.dstack([tile, np.full(tile.shape[:2], 255, np.uint8)]), org, rt=1.0, q=84, note='sheet2 beach sand, synthesised seamless tile')
    if want('sea_band'):
        lo, org = crop(3, 19, 431, 248, 36, pad=0)
        hi = up4(lo)
        tile = seamless_h(hi, 90)
        emit('global/environment/sea_band_far', np.dstack([tile, np.full(tile.shape[:2], 255, np.uint8)]), org, rt=1.0, q=84, note='sheet3 sea with horizon light, seamless')
    if want('cloud_cumulus'):
        # warm dawn cumulus from the sky strip (soft-keyed against sampled sky blues)
        rgba, org = cutout(1, (70, 787, 1143, 36), mode='soft', soft=(10, 34), pad=0, pal_k=3, min_comp=60,
                           pal_box=[(300, 789, 120, 32), (740, 789, 90, 32), (975, 789, 50, 32), (1150, 789, 40, 10)])
        k = 1
        for p in components(rgba, min_area=2500):
            ys, xs = np.where(p[..., 3] > 60)
            if ys.min() <= 3 or ys.max() >= p.shape[0] - 4:
                continue  # touches the strip edge -> clipped cloud, skip
            emit(f'global/fx/cloud_cumulus_{k:02d}', p, org, rt=0.5, note='sheet1 sky strip cloud')
            k += 1
        rgba, org = cutout(3, (274, 276, 250, 60), mode='soft', soft=(6, 16), pad=2)
        for p in components(rgba, min_area=1500):
            emit(f'global/fx/cloud_cumulus_{k:02d}', p, org, rt=0.5, note='sheet3 cloud row')
            k += 1

    # ----------------------------------------------------------------------------- environment (sheet 3 large set)
    piece('global/environment/tree_olive_large', 3, (1044, 268, 128, 114), thr=9, holes=1, anchors={'base': (1100, 377)}, rt=1.0)
    piece('global/environment/tree_olive_medium', 3, (1176, 272, 138, 110), thr=9, holes=1, anchors={'base': (1240, 377)}, rt=1.0)
    piece('global/environment/tree_cypress_tall', 3, (1336, 266, 38, 118), thr=9, holes=8, anchors={'base': (1355, 381)}, rt=1.0)
    piece('global/environment/shrub_a', 3, (1391, 281, 84, 48), thr=9, holes=8, rt=1.0)
    piece('global/environment/rock_a', 3, (1046, 400, 169, 66), thr=8, holes=None, rt=1.0)
    piece('global/environment/rock_b', 3, (1211, 416, 108, 50), thr=8, holes=None, rt=1.0)
    piece('global/environment/grass_tufts_a', 3, (1326, 410, 68, 54), thr=9, holes=8, rt=1.0)
    piece('global/environment/agave', 3, (1401, 376, 88, 98), thr=9, holes=8, rt=1.0)
    # sheet 4 variants
    piece('global/environment/tree_olive_small', 2, (6, 458, 90, 80), thr=9, holes=1, rt=1.0)
    piece('global/environment/tree_olive_b_small', 2, (97, 458, 87, 80), thr=9, holes=1, rt=1.0)
    piece('global/environment/shrub_b', 2, (230, 482, 62, 56), thr=9, holes=4, rt=1.0)
    piece('global/environment/shrub_c', 2, (285, 485, 50, 53), thr=9, holes=4, rt=1.0)
    piece('global/environment/rock_c', 2, (333, 463, 102, 75), thr=9, holes=None, rt=1.0)
    piece('global/environment/tree_cypress_small', 2, (188, 457, 28, 81), thr=9, holes=4, rt=1.0)

    # architecture (sheet 3)
    piece('global/environment/house_white_a', 3, (8, 882, 86, 72), thr=9, holes=None, rt=1.0, erase=[(0, 953, 100, 20)],
          add=[[(22, 906), (37, 890), (51, 903), (89, 903), (89, 951), (22, 951)]])
    piece('global/environment/house_white_b', 3, (102, 880, 100, 74), thr=9, holes=None, rt=1.0, erase=[(90, 953, 120, 20), (198, 870, 20, 90)],
          add=[[(108, 906), (122, 890), (137, 904), (171, 904), (171, 951), (108, 951)]])
    piece('global/environment/house_white_c', 3, (192, 878, 130, 76), thr=9, holes=None, rt=1.0, erase=[(180, 953, 150, 20)],
          add=[[(193, 904), (199, 898), (219, 898), (219, 887), (316, 887), (316, 951), (193, 951)]])
    piece('global/environment/village_cluster_a', 4, (776, 510, 124, 86), thr=9, holes=None, rt=1.0)

    # ships (sheet 1, checker background; sails forced in with polygons)
    piece('global/environment/ship_merchant', 1, (1060, 450, 176, 134), thr=9, holes=None, rt=1.0,
          add=[[(1101, 481), (1146, 470), (1205, 458), (1203, 470), (1199, 548), (1150, 552), (1104, 551)]],
          anchors={'water': (1148, 575), 'mast': (1146, 470)}, note='sheet1 merchant ship')
    piece('global/environment/ship_boat_small', 1, (1240, 468, 124, 114), thr=9, holes=None, rt=1.0,
          anchors={'water': (1303, 575)}, note='sheet1 fishing boat')

    # FX
    piece('global/fx/smoke_puff_01', 4, (322, 636, 64, 80), mode='soft', soft=(4, 22), rt=0.6, note='thin smoke')
    piece('global/fx/smoke_puff_02', 4, (387, 636, 62, 80), mode='soft', soft=(4, 22), rt=0.6, note='thick smoke')
    piece('global/fx/smoke_column_01', 3, (782, 872, 78, 95), mode='soft', soft=(4, 22), rt=0.6)
    piece('global/fx/birds_gull_sheet', 3, (680, 893, 95, 66), thr=12, largest=False, holes=None, erode=0, blur=0.8, rt=0.6, note='gull flock')
    if want('gull_'):
        rgba, org = cutout(3, (680, 893, 95, 66), thr=12, largest=False, holes=None, erode=0, blur=0.8)
        for i, p in enumerate(components(rgba, min_area=300)):
            emit(f'global/fx/gull_{i + 1:02d}', p, org, rt=0.6, note='single gull (flap frames)')
    piece('global/fx/water_highlights', 3, (886, 891, 150, 70), mode='soft', soft=(6, 18), rt=0.6)
    piece('global/fx/wave_overlay', 4, (503, 658, 54, 46), mode='soft', soft=(6, 18), rt=0.6)
    piece('global/fx/foliage_overlay', 4, (558, 636, 82, 80), thr=9, holes=8, rt=1.0)
    piece('global/fx/dust_puff_01', 3, (1066, 882, 144, 76), mode='soft', soft=(4, 16), rt=0.5)

    # props (sheet 4)
    for rel, box in [
        ('global/props/held/amphora_a', (511, 339, 50, 60)), ('global/props/held/amphora_b', (566, 341, 54, 58)),
        ('global/props/held/basket_produce', (636, 343, 56, 49)), ('global/props/set/crate', (696, 343, 66, 51)),
        ('global/props/set/fishing_net', (771, 331, 94, 64)), ('global/props/set/bench_wood', (891, 351, 94, 44)),
        ('global/props/held/olive_branch', (531, 425, 59, 45)), ('global/props/held/spear', (586, 424, 64, 46)),
        ('global/props/held/shield_round', (655, 414, 56, 59)), ('global/props/held/tools', (725, 411, 30, 59)),
        ('global/props/held/rope', (776, 426, 64, 48)), ('global/props/held/torch', (848, 416, 32, 54)),
        ('global/props/held/scroll_bundle', (886, 421, 74, 49)), ('global/props/held/lyre', (966, 414, 44, 56)),
    ]:
        piece(rel, 4, box, thr=9, holes=6 if any(k in rel for k in ('net', 'lyre', 'basket', 'rope')) else None, rt=0.6)
    piece('global/props/set/pithos', 2, (716, 316, 38, 50), thr=9, holes=None, rt=0.6, note='sheet2 jar')

    json.dump(manifest, open(MAN_PATH, 'w'), indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
