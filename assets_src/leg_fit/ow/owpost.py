"""owpost.py GEN_GRID BASE_STRIP OUT_PREFIX [fix ...]
fix: '5=m6' frame5 := mirror(gen frame6) ; '7=m' frame7 := mirror(gen frame7) ; '7=8' copy
Aligns each frame to the base frame by lower-body silhouette (y>=16), snaps alpha,
writes OUT_PREFIX_ow9.png (288x32), OUT_PREFIX_ow.png (32x192, frames 0,1,2,3,5,7), OUT_PREFIX_cmp.png
"""
import sys
from PIL import Image, ImageOps

gen = Image.open(sys.argv[1]).convert('RGBA')
base = Image.open(sys.argv[2]).convert('RGBA')
out = sys.argv[3]
fixes = sys.argv[4:]
G = [gen.crop((i % 3 * 32, i // 3 * 32, i % 3 * 32 + 32, i // 3 * 32 + 32)) for i in range(9)]
B = [base.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]

def snap(im):
    px = im.load()
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return im

G = [snap(g.copy()) for g in G]
F = list(G)
for f in fixes:
    k, v = f.split('=')
    k = int(k)
    if v == 'm':
        F[k] = ImageOps.mirror(G[k])
    elif v.startswith('m'):
        F[k] = ImageOps.mirror(G[int(v[1:])])
    else:
        F[k] = G[int(v)]

def shift(im, dx, dy):
    o = Image.new('RGBA', (32, 32))
    o.paste(im, (dx, dy), im)
    return o

def mask(im, y0=16):
    a = im.getchannel('A').load()
    return {(x, y) for x in range(32) for y in range(y0, 32) if a[x, y] > 0}

res = []
for i in range(9):
    bm = mask(B[i])
    best = None
    for dx in range(-4, 5):
        for dy in [B[i].getbbox()[3] - F[i].getbbox()[3]]:
            c = shift(F[i], dx, dy)
            # keep the whole sprite inside the cell
            if c.getchannel('A').getbbox() is None:
                continue
            s = len(mask(c) ^ bm)
            if best is None or s < best[0]:
                best = (s, dx, dy, c)
    res.append(best[3])
    print(i, 'shift', best[1], best[2], 'lower-body diff', best[0], 'bbox', B[i].getbbox(), best[3].getbbox())

strip = Image.new('RGBA', (288, 32))
for i, f in enumerate(res):
    strip.alpha_composite(f, (i * 32, 0))
strip.save(out + '_ow9.png')
vert = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]):
    vert.alpha_composite(res[i], (0, j * 32))
vert.save(out + '_ow.png')
cmp = Image.new('RGBA', (288 * 4, 32 * 4 * 2 + 8), (200, 220, 200, 255))
cmp.alpha_composite(base.resize((1152, 128), Image.NEAREST), (0, 0))
cmp.alpha_composite(strip.resize((1152, 128), Image.NEAREST), (0, 136))
cmp.save(out + '_cmp.png')
