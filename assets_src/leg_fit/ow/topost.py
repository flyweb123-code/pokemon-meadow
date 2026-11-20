"""topost.py GRID96 BASE_STRIP OUT_PREFIX
For PixelLab 'Transfer outfit' (Pro) results: the 9 base frames (pt_m/pt_f, 32x32 each)
were uploaded as the animation, the battle front fit as the outfit image, background
removal off. The result is a 96x96 3x3 sheet on white.
Removes the white background (flood fill from every cell edge), drops stray specks
(groups under 4 pixels), snaps alpha, and checks each frame's feet against the base frame.
Writes OUT_PREFIX_ow9.png (288x32) and OUT_PREFIX_ow.png (32x192: frames 0,1,2,3,5,7)."""
import sys
from PIL import Image
g = Image.open(sys.argv[1]).convert('RGBA'); base = Image.open(sys.argv[2]).convert('RGBA'); out = sys.argv[3]
W, H = g.size; px = g.load()
bg = lambda c: c[3] < 128 or (c[0] >= 240 and c[1] >= 240 and c[2] >= 240)
st = [(x, y) for x in range(W) for y in range(0, H, 32)] + [(x, 31 + y) for x in range(W) for y in range(0, H, 32)]
st += [(x, y) for y in range(H) for x in range(0, W, 32)] + [(31 + x, y) for y in range(H) for x in range(0, W, 32)]
seen = set()
while st:
    x, y = st.pop()
    if (x, y) in seen or not (0 <= x < W and 0 <= y < H): continue
    seen.add((x, y))
    if not bg(px[x, y]): continue
    px[x, y] = (0, 0, 0, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if nx // 32 == x // 32 and ny // 32 == y // 32: st.append((nx, ny))
F = []
for i in range(9):
    f = g.crop((i % 3 * 32, i // 3 * 32, i % 3 * 32 + 32, i // 3 * 32 + 32)); p = f.load()
    for y in range(32):
        for x in range(32):
            r, gg, b, a = p[x, y]
            p[x, y] = (r, gg, b, 255) if a >= 128 else (0, 0, 0, 0)
    # drop tiny specks (8-connected groups under 4 pixels)
    seen2 = set()
    for y in range(32):
        for x in range(32):
            if p[x, y][3] and (x, y) not in seen2:
                comp, st2 = [], [(x, y)]
                while st2:
                    cx, cy = st2.pop()
                    if (cx, cy) in seen2 or not (0 <= cx < 32 and 0 <= cy < 32) or not p[cx, cy][3]: continue
                    seen2.add((cx, cy)); comp.append((cx, cy))
                    st2 += [(cx + dx, cy + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
                if len(comp) < 4:
                    for c in comp: p[c] = (0, 0, 0, 0)
    b = base.crop((i * 32, 0, i * 32 + 32, 32))
    print(i, 'bbox', f.getbbox(), 'base', b.getbbox())
    F.append(f)
s = Image.new('RGBA', (288, 32))
for i, f in enumerate(F): s.alpha_composite(f, (i * 32, 0))
s.save(out + '_ow9.png')
v = Image.new('RGBA', (32, 192))
for j, i in enumerate([0, 1, 2, 3, 5, 7]): v.alpha_composite(F[i], (0, j * 32))
v.save(out + '_ow.png')
