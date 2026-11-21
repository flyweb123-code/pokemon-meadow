"""legfix.py OW9_STRIP BASE_STRIP BATTLE_FRONT OUT_PREFIX
For Flannery (lf_flannery_f) field sprites:
 1. legs: the side walk frames (7,8) and back walk frames (5,6) take their legs from the base walking
    frames (pt_f), recoloured to the outfit's jeans and shoes, so the steps read like the base and
    nothing is left over from blending; the upper body is the standing frame raised 1px (walking bob).
    side walk: rows >= 25 from pt_f 7/8 moved down 1px (her standing feet are 1px lower than pt_f's); back walk: rows >= 26.
 2. colours: hair and jeans are remapped to the battle sprite's palettes (by brightness order).
Writes OUT_PREFIX_ow9.png and OUT_PREFIX_ow.png (0,1,2,3,5,7)."""
import sys, colorsys
from PIL import Image
s = Image.open(sys.argv[1]).convert('RGBA'); base = Image.open(sys.argv[2]).convert('RGBA')
bat = Image.open(sys.argv[3]).convert('RGBA'); out = sys.argv[4]
F = [s.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]
B = [base.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]
hsv = lambda c: colorsys.rgb_to_hsv(*(v / 255 for v in c[:3]))
lum = lambda c: c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
def is_hair(c):
    h, sa, v = hsv(c); h *= 360
    return c[3] and (h >= 340 or h <= 8) and sa > 0.4 and v > 0.25
def is_jeans(c):
    h, sa, v = hsv(c); h *= 360
    return c[3] and 170 <= h <= 230 and sa > 0.25 and v > 0.2
def palette(im, test):
    cs = sorted({c for c in im.getdata() if test(c)}, key=lum)
    return cs
def mapper(src, dst):
    m = {}
    for i, c in enumerate(src):
        m[c] = dst[round(i * (len(dst) - 1) / max(1, len(src) - 1))]
    return m
# jeans/shoe colours of the outfit (from its own front standing frame)
jeans = palette(F[0], is_jeans) or palette(bat, is_jeans)
# shoe colour: most common non-outline colour on the lowest row of the front standing frame
_pp = F[0].load(); _by = F[0].getbbox()[3] - 1
_sh = [(_pp[x, _by]) for x in range(32) if _pp[x, _by][3] and lum(_pp[x, _by]) >= 40]
dark = max(set(_sh), key=_sh.count) if _sh else (32, 30, 34, 255)

def legs_from_base(bf):
    """base leg pixels -> outline stays, rest -> jeans shades by brightness, lowest 2 rows of each column -> shoe"""
    o = Image.new('RGBA', (32, 32)); p, q = bf.load(), o.load()
    cols = {}
    for y in range(32):
        for x in range(32):
            if p[x, y][3]: cols.setdefault(x, []).append(y)
    for y in range(32):
        for x in range(32):
            c = p[x, y]
            if not c[3]: continue
            if lum(c) < 40: q[x, y] = (8, 6, 8, 255); continue
            bottom = max(cols[x])
            if y >= bottom - 1: q[x, y] = dark; continue
            l = lum(c) / 255
            q[x, y] = jeans[min(len(jeans) - 1, int(l * len(jeans)))] if jeans else c
    return o

def compose(stand, basew, split, dy, ldy=0):
    o = Image.new('RGBA', (32, 32)); q = o.load(); sp = stand.load()
    lgi = legs_from_base(basew); lgs = Image.new('RGBA', (32, 32)); lgs.paste(lgi, (0, ldy), lgi); lg = lgs.load()
    for y in range(32):
        for x in range(32):
            if y < split:
                yy = y - dy
                if 0 <= yy < 32: q[x, y] = sp[x, yy]
            else:
                q[x, y] = lg[x, y]
    return o

G = list(F)
G[7] = compose(F[2], B[7], 25, -1, 1)
G[8] = compose(F[2], B[8], 25, -1, 1)
G[5] = compose(F[1], B[5], 26, -1)
G[6] = compose(F[1], B[6], 26, -1)
# recolour hair and jeans to the battle palettes
hm = mapper(sorted({c for f in G for c in f.getdata() if is_hair(c)}, key=lum), palette(bat, is_hair))
jm = mapper(sorted({c for f in G for c in f.getdata() if is_jeans(c)}, key=lum), palette(bat, is_jeans))
for f in G:
    p = f.load()
    for y in range(32):
        for x in range(32):
            c = p[x, y]
            if c in hm: p[x, y] = hm[c]
            elif c in jm: p[x, y] = jm[c]
o = Image.new('RGBA', (288, 32))
for i, f in enumerate(G): o.alpha_composite(f, (i * 32, 0))
o.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(G[i], (0, j * 32))
v.save(out + '_ow.png')
