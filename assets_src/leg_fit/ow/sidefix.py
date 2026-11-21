"""sidefix.py MODE OW9_STRIP OUT_PREFIX [BASE_LEGS_STRIP BATTLE_FRONT]
Side walk frames (7, 8) for one outfit.
MODE upper: (Kabu) rows < 25 of 7/8 = the standing side frame 2 raised 1px, so the back line is the
            standing one (the walk frames had inherited the base bag bulge); legs (rows >= 25) stay.
MODE legs:  (Flannery) frames 2/7/8: legs drawn from small pixel templates in this file (2 = legs
            together, 7/8 = a step each, outline / battle jeans shades / shoe colour); upper body =
            standing frame 2, raised 1px in 7/8. Args: MODE OW9 OUT - BATTLE_FRONT.
Writes OUT_PREFIX_ow9.png and OUT_PREFIX_ow.png (0,1,2,3,5,7)."""
import sys, colorsys
from PIL import Image
mode, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = Image.open(src).convert('RGBA'); F = [s.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]
lum = lambda c: c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
def shifted(im, dy):
    o = Image.new('RGBA', (32, 32)); o.paste(im, (0, dy), im); return o
def merge(top, bottom, split):
    o = bottom.copy(); o.paste(Image.new('RGBA', (32, split)), (0, 0)); o.alpha_composite(top.crop((0, 0, 32, split)), (0, 0)); return o
if mode == 'upper':
    up = shifted(F[2], -1)
    for w in (7, 8):
        F[w] = merge(up, F[w], 25)
else:
    # hand-drawn side legs (facing left): 2 = legs together, 7 / 8 = one step each.
    # '#' outline, 'D' 'J' 'L' jeans dark/mid/light (battle palette), 'S' shoe; x origin 10.
    bat = Image.open(sys.argv[5]).convert('RGBA')
    def is_jeans(c):
        h, sa, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[:3])); h *= 360
        return c[3] and 170 <= h <= 230 and sa > 0.25 and v > 0.2
    jeans = sorted({c for c in bat.getdata() if is_jeans(c)}, key=lum)
    pal = {'#': (8, 6, 8, 255), 'D': jeans[0], 'J': jeans[len(jeans) // 2], 'L': jeans[-1]}
    pp = F[2].load(); bot = F[2].getbbox()[3] - 1
    sh = [pp[x, y] for y in (bot, bot - 1) for x in range(32) if pp[x, y][3] and 40 <= lum(pp[x, y]) < 160]
    pal['S'] = max(set(sh), key=sh.count) if sh else (70, 50, 40, 255)
    T = {
        2: (26, ["..#JJJJ#..",
                 "..#JLJD#..",
                 "..#JLJD#..",
                 ".#SSSSS#..",
                 ".#######.."]),
        7: (25, ["..#JJJJJ#.",
                 "..#JJJJJ#.",
                 ".#JL##DJ#.",
                 "#JL#..#DJ#",
                 "#SS#...#SS#",
                 "###.....###"]),
        8: (25, ["..#JJJJ#..",
                 "..#JJJJ#..",
                 "..#LJ#DJ#.",
                 ".#JL#.#D#.",
                 ".#SS#.#SS#",
                 ".###..###."]),
    }
    for i, dy in ((2, 0), (7, -1), (8, -1)):
        y0, rows = T[i]
        o = Image.new('RGBA', (32, 32)); up = shifted(F[2], dy)
        o.alpha_composite(up.crop((0, 0, 32, y0)), (0, 0))
        q = o.load()
        for k, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.': q[10 + x, y0 + k] = pal[ch]
        F[i] = o
st = Image.new('RGBA', (288, 32))
for i, f in enumerate(F): st.alpha_composite(f, (i * 32, 0))
st.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(F[i], (0, j * 32))
v.save(out + '_ow.png')
