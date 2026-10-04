"""Dev helper: find connected art components in a sheet region and draw numbered boxes.
usage: python3 inspect_sheet.py <sheet> x y w h <out.png> [minArea] [scale]"""
import sys, cv2, numpy as np
sheet, x, y, w, h, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
min_area = int(sys.argv[7]) if len(sys.argv) > 7 else 60
scale = float(sys.argv[8]) if len(sys.argv) > 8 else 2
img = cv2.imread(sheet)[y:y + h, x:x + w]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
light = (hsv[:, :, 2] > 175) & (hsv[:, :, 1] < 70)
fg = (~light).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
big = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
k = 0
for i in range(1, n):
    bx, by, bw, bh, a = stats[i]
    if a < min_area: continue
    k += 1
    p0 = (int(bx * scale), int(by * scale)); p1 = (int((bx + bw) * scale), int((by + bh) * scale))
    cv2.rectangle(big, p0, p1, (0, 0, 255), 1)
    cv2.putText(big, str(k), (p0[0] + 2, p0[1] + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 200), 1)
    print(k, 'bbox', bx + x, by + y, bw, bh, 'area', a)
cv2.imwrite(out, big)
