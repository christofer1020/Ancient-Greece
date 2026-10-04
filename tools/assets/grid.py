"""Dev helper: enlarge a sheet region and overlay a labelled coordinate grid (sheet pixel coords).
usage: python3 grid.py <sheet> x y w h <out.png> [scale]"""
import sys, cv2
sheet, x, y, w, h, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 3
img = cv2.imread(sheet)[y:y + h, x:x + w]
big = cv2.resize(img, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for gx in range((x // 10 + 1) * 10, x + w, 10):
    X = int((gx - x) * sc); major = gx % 50 == 0
    cv2.line(big, (X, 0), (X, big.shape[0]), (0, 0, 255) if major else (255, 120, 0), 1 if major else 1, lineType=cv2.LINE_AA)
    if major: cv2.putText(big, str(gx), (X + 2, 11), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 200), 1)
for gy in range((y // 10 + 1) * 10, y + h, 10):
    Y = int((gy - y) * sc); major = gy % 50 == 0
    if major:
        cv2.line(big, (0, Y), (big.shape[1], Y), (0, 0, 255), 1)
        cv2.putText(big, str(gy), (2, Y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 200), 1)
    else:
        for X in range(0, big.shape[1], 6): big[Y, X] = (255, 120, 0)
cv2.imwrite(out, big)
