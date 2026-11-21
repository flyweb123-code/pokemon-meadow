"""backmirror.py OW9_STRIP OUT_PREFIX
Roxie: the guitar neck in the back frames has to stick out on the other side (from behind
his left shoulder shows on the left). Back frames are mirrored and moved 1px back so the body
stays where it was: new 1 = mirror(1), new 5 = mirror(6), new 6 = mirror(5) (mirroring swaps
which foot steps, so 5 and 6 swap to keep the base step order).
Writes OUT_PREFIX_ow9.png and OUT_PREFIX_ow.png (0,1,2,3,5,7)."""
import sys
from PIL import Image, ImageOps
s = Image.open(sys.argv[1]).convert('RGBA'); out = sys.argv[2]
F = [s.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]
def mir(im):
    m = ImageOps.mirror(im); o = Image.new('RGBA', (32, 32)); o.paste(m, (-1, 0), m); return o
F[1], F[5], F[6] = mir(F[1]), mir(F[6]), mir(F[5])
o = Image.new('RGBA', (288, 32))
for i, f in enumerate(F): o.alpha_composite(f, (i * 32, 0))
o.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(F[i], (0, j * 32))
v.save(out + '_ow.png')
