"""backfix.py OW9_STRIP OUT_PREFIX [split=27]
Back-walk frames 5 and 6 reuse frame 1's upper body (head, guitar) raised 1px like the base
walking bob, and keep only their own legs below row `split`, so nothing jumps sideways.
Writes OUT_PREFIX_ow9.png and OUT_PREFIX_ow.png (frames 0,1,2,3,5,7)."""
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA'); out = sys.argv[2]
split = int(sys.argv[3]) if len(sys.argv) > 3 else 27
F = [im.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]
def compose(up, low):
    u = Image.new('RGBA', (32, 32)); u.paste(up, (0, -1), up)
    o = Image.new('RGBA', (32, 32))
    o.paste(u.crop((0, 0, 32, split)), (0, 0))
    o.paste(low.crop((0, split, 32, 32)), (0, split))
    return o
F[5] = compose(F[1], F[5]); F[6] = compose(F[1], F[6])
s = Image.new('RGBA', (288, 32))
for i, f in enumerate(F): s.alpha_composite(f, (i * 32, 0))
s.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(F[i], (0, j * 32))
v.save(out + '_ow.png')
