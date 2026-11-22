"""make_altar.py BASE_RAW OUTDIR
Altar of Creation (창조의 제단) for the Arceus plates.
BASE_RAW: PixelLab Pro 160x160 round marble altar with an Arceus-like gold wheel (raw/altar_pixellab.png).
Carves 17 plate holes into the flat band of the altar (radius 50, between the pedestal and the inner
gold ring), clockwise from the top in the order below, and draws one plate per hole in its type colour.
Writes base.png (empty holes), plates/<type>.png (hole-sized), holes.json, full.png (all plates in)."""
import sys, json, math, os
from PIL import Image
base = Image.open(sys.argv[1]).convert('RGBA'); out = sys.argv[2]
os.makedirs(out + '/plates', exist_ok=True)
TY = ['fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water',
      'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy']
COL = {'fighting': 'C22E28', 'flying': 'A98FF3', 'poison': 'A33EA1', 'ground': 'E2BF65', 'rock': 'B6A136',
       'bug': 'A6B91A', 'ghost': '735797', 'steel': 'B7B7CE', 'fire': 'EE8130', 'water': '6390F0',
       'grass': '7AC74C', 'electric': 'F7D02C', 'psychic': 'F95587', 'ice': '96D9D6', 'dragon': '6F35FC',
       'dark': '705746', 'fairy': 'D685AD'}
CX, CY, R, W, H = 80.0, 79.5, 50.5, 9, 11
hx = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c) + (255,)
def mix(c, d, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c, d)) + (255,)
holes = []
p = base.load()
OUT = (58, 40, 22, 255); DEEP = (120, 100, 78, 255); MID = (150, 132, 110, 255); LIP = (252, 246, 228, 255)
for i, t in enumerate(TY):
    a = -math.pi / 2 + i * 2 * math.pi / len(TY)
    x = int(round(CX + R * math.cos(a) - W / 2)); y = int(round(CY + R * math.sin(a) - H / 2))
    holes.append({'ty': t, 'x': x, 'y': y, 'w': W, 'h': H})
    for yy in range(H):
        for xx in range(W):
            edge = xx in (0, W - 1) or yy in (0, H - 1)
            p[x + xx, y + yy] = OUT if edge else (DEEP if yy <= 2 else MID)
    # light lip under the hole (carved look)
    for xx in range(W):
        if p[x + xx, y + H][3]: p[x + xx, y + H] = LIP
def plate(t):
    c = hx(COL[t]); im = Image.new('RGBA', (W, H)); q = im.load()
    for yy in range(H):
        for xx in range(W):
            if xx in (0, W - 1) or yy in (0, H - 1):
                q[xx, yy] = shade(c, 0.45)
            else:
                f = 1.0
                if xx == 1 or yy == 1: f = 1.25
                if xx == W - 2 or yy == H - 2: f = 0.78
                q[xx, yy] = shade(c, f) if f != 1.25 else mix(c, (255, 255, 255), 0.45)
    # little shine and centre mark
    q[2, 2] = (255, 255, 255, 255)
    q[W // 2, H // 2] = mix(c, (255, 255, 255), 0.7); q[W // 2, H // 2 - 1] = shade(c, 0.7); q[W // 2, H // 2 + 1] = shade(c, 0.7)
    return im
full = base.copy()
for h in holes:
    pl = plate(h['ty']); pl.save(f"{out}/plates/{h['ty']}.png"); full.alpha_composite(pl, (h['x'], h['y']))
base.save(out + '/base.png'); full.save(out + '/full.png')
json.dump(holes, open(out + '/holes.json', 'w'), indent=1)
print('holes', len(holes))
