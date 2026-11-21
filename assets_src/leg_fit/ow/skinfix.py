"""skinfix.py OW9_STRIP BATTLE_FRONT OUT_PREFIX
Recolours the field sprite's skin to the battle sprite's skin palette (shades matched by
brightness order). Skin = hue 10-40, saturation 0.15-0.65, value > 0.45.
Writes OUT_PREFIX_ow9.png and OUT_PREFIX_ow.png (0,1,2,3,5,7)."""
import sys, colorsys
from PIL import Image
s = Image.open(sys.argv[1]).convert('RGBA'); bat = Image.open(sys.argv[2]).convert('RGBA'); out = sys.argv[3]
lum = lambda c: c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11
def skin(c):
    h, sa, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[:3])); h *= 360
    return c[3] and 10 <= h <= 40 and 0.15 <= sa <= 0.65 and v > 0.45
src = sorted({c for c in s.getdata() if skin(c)}, key=lum)
cnt = {}
for c in bat.getdata():
    if skin(c): cnt[c] = cnt.get(c, 0) + 1
dst = sorted([c for c, n in cnt.items() if n >= 3], key=lum)
m = {c: dst[round(i * (len(dst) - 1) / max(1, len(src) - 1))] for i, c in enumerate(src)}
print('field skin', len(src), '-> battle skin', len(dst), ['#%02x%02x%02x' % c[:3] for c in dst])
p = s.load()
for y in range(s.height):
    for x in range(s.width):
        if p[x, y] in m: p[x, y] = m[p[x, y]]
s.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(s.crop((i * 32, 0, i * 32 + 32, 32)), (0, j * 32))
v.save(out + '_ow.png')
