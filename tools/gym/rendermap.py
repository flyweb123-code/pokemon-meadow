# Render a pret (FRLG) map layout to PNG: python3 -I rendermap.py <frlg root> <layout name> <out.png>
import sys, json, struct
from PIL import Image
root, name, out = sys.argv[1:4]
L = next(l for l in json.load(open(f'{root}/data/layouts/layouts.json'))['layouts'] if l.get('name') == name or l.get('id') == name)
def tsdir(n):  # gTileset_Building -> primary/building, gTileset_PewterGym -> secondary/pewter_gym
    import re
    s = re.sub(r'(?<!^)([A-Z])', r'_\1', n.replace('gTileset_', '')).lower()
    for k in ('primary', 'secondary'):
        import os
        if os.path.isdir(f'{root}/data/tilesets/{k}/{s}'): return f'{root}/data/tilesets/{k}/{s}'
    raise SystemExit('no tileset ' + n)
P, Sd = tsdir(L['primary_tileset']), tsdir(L['secondary_tileset'])
def pal(path):
    ln = open(path).read().split('\n')[3:19]
    return [tuple(int(v) for v in l.split()[:3]) for l in ln if l.strip()]
pals = [pal(f'{P}/palettes/{i:02d}.pal') if i < 7 else pal(f'{Sd}/palettes/{i:02d}.pal') for i in range(13)]
def tiles(path):
    im = Image.open(path); w, h = im.size; px = im.load(); T = []
    for ty in range(h // 8):
        for tx in range(w // 8):
            T.append([[px[tx * 8 + x, ty * 8 + y] % 16 for x in range(8)] for y in range(8)])
    return T
TP, TS = tiles(f'{P}/tiles.png'), tiles(f'{Sd}/tiles.png')
NP_T, NP_M = 640, 640
def mt(path):
    b = open(path, 'rb').read(); return [struct.unpack_from('<8H', b, i) for i in range(0, len(b), 16)]
MP, MS = mt(f'{P}/metatiles.bin'), mt(f'{Sd}/metatiles.bin')
W, H = L['width'], L['height']
blk = struct.unpack(f'<{W*H}H', open(f"{root}/{L['blockdata_filepath']}", 'rb').read()[:W * H * 2])
img = Image.new('RGBA', (W * 16, H * 16), (0, 0, 0, 255)); px = img.load()
def tile(i): return TP[i] if i < NP_T else (TS[i - NP_T] if i - NP_T < len(TS) else None)
for by in range(H):
    for bx in range(W):
        m = blk[by * W + bx] & 0x3ff
        e = MP[m] if m < NP_M else MS[m - NP_M]
        for layer in range(2):
            for q in range(4):
                v = e[layer * 4 + q]; ti, hf, vf, pl = v & 0x3ff, v >> 10 & 1, v >> 11 & 1, v >> 12
                t = tile(ti)
                if not t: continue
                ox, oy = bx * 16 + (q % 2) * 8, by * 16 + (q // 2) * 8
                for y in range(8):
                    for x in range(8):
                        c = t[7 - y if vf else y][7 - x if hf else x]
                        if c == 0 and (layer or True) and not (layer == 0 and q >= 0 and False): 
                            if layer == 0: px[ox + x, oy + y] = pals[pl][0] + (255,) if pl < len(pals) else (0,0,0,255)
                            continue
                        if pl < len(pals): px[ox + x, oy + y] = pals[pl][c] + (255,)
img.save(out); print(out, W, H)
