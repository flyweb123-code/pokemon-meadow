"""bobfix.py OW9_STRIP OUT_PREFIX [head_rows=19] [leg_row=26]
Walking bob like the base pt_m/pt_f: in every walk frame (3,4 front; 5,6 back; 7,8 side)
the body is 1px higher than the standing frame while the feet stay put.
1. Measure how far the walk frame's head (rows < head_rows) sits from the standing head.
2. Raise the whole walk frame so it sits 1px above the standing frame, then put back its
   own rows >= leg_row so the feet stay on the ground (legs get 1px longer, as in the base).
3. Rows < head_rows are the standing frame's head raised 1px, so the hair/head moves as one
   piece instead of parts of it staying still.
Writes OUT_PREFIX_ow9.png (288x32) and OUT_PREFIX_ow.png (32x192: 0,1,2,3,5,7)."""
import sys
from PIL import Image
s = Image.open(sys.argv[1]).convert('RGBA'); out = sys.argv[2]
HEAD = int(sys.argv[3]) if len(sys.argv) > 3 else 19
LEG = int(sys.argv[4]) if len(sys.argv) > 4 else 26
F = [s.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(9)]

def shift(im, dy):
    o = Image.new('RGBA', (32, 32)); o.paste(im, (0, dy), im); return o

def diff(a, b, y1):
    pa, pb = a.load(), b.load(); n = 0
    for y in range(y1):
        for x in range(32):
            if (pa[x, y][3] > 0) != (pb[x, y][3] > 0) or (pa[x, y][3] and pa[x, y][:3] != pb[x, y][:3]): n += 1
    return n

for st, ws in ((0, (3, 4)), (1, (5, 6)), (2, (7, 8))):
    S = F[st]
    for w in ws:
        W = F[w]
        dy = min((diff(shift(S, d), W, HEAD), d) for d in (-2, -1, 0, 1))[1]
        R = shift(W, -1 - dy)
        R.paste(Image.new('RGBA', (32, 32 - LEG)), (0, LEG))
        R.alpha_composite(W.crop((0, LEG, 32, 32)), (0, LEG))
        H = shift(S, -1).crop((0, 0, 32, HEAD))
        R.paste(Image.new('RGBA', (32, HEAD)), (0, 0)); R.alpha_composite(H, (0, 0))
        print(w, 'head was', dy, '-> -1')
        F[w] = R
o = Image.new('RGBA', (288, 32))
for i, f in enumerate(F): o.alpha_composite(f, (i * 32, 0))
o.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(F[i], (0, j * 32))
v.save(out + '_ow.png')
