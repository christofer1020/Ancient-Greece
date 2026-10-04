"""Dev helper: contact sheet of runtime assets over a mid-tone background (reveals halos).
usage: python3 contact.py <out.png> <glob> [cell] [bg]"""
import sys, glob, os
from PIL import Image, ImageDraw
out, pat = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 260
bg = sys.argv[4] if len(sys.argv) > 4 else '#5f7d96'
files = sorted(glob.glob(pat, recursive=True))
cols = max(1, min(6, len(files)))
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * (cell + 16)), bg)
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGBA')
    k = min((cell - 8) / im.width, (cell - 8) / im.height, 2.5)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    x, y = (i % cols) * cell, (i // cols) * (cell + 16)
    sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
    d.text((x + 4, y + cell + 2), os.path.basename(f)[:40], fill='white')
sheet.save(out)
print(out, sheet.size, len(files))
