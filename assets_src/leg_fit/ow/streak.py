"""streak.py IN OUT x0 y0 x1 y1 w [x0 y0 x1 y1 w ...]
Kabu's white hair streak: recolours the gray hair pixels lying on each line segment (x0,y0)-(x1,y1)
(width w px) to whites, darker grays -> light gray, light grays -> near white. Outline pixels stay."""
import sys, colorsys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA'); p = im.load(); W, H = im.size
a = sys.argv[3:]
segs = [tuple(float(v) for v in a[i:i + 5]) for i in range(0, len(a), 5)]
lum = lambda c: c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
def hairy(c):
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[:3]))
    return c[3] and s < 0.22 and 55 < lum(c) < 215
def dist(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - x0) * dx + (py - y0) * dy) / L))
    qx, qy = x0 + t * dx, y0 + t * dy
    return ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5
n = 0
for y in range(H):
    for x in range(W):
        c = p[x, y]
        if not hairy(c): continue
        if any(dist(x, y, *s[:4]) <= s[4] / 2 for s in segs):
            l = lum(c)
            p[x, y] = (236, 238, 244, 255) if l > 120 else (198, 200, 210, 255) if l > 85 else (160, 162, 174, 255)
            n += 1
im.save(sys.argv[2]); print('streak px', n)
