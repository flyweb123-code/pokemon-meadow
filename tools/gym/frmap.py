# 본가(FRLG pret 디컴파일) 맵 하나를 체육관 이벤트 필드용으로 뽑는다 (경완 2026-11-07 '캐릭터 이동이랑 문 들어가고 이런거 본가에서')
#   python3 -I frmap.py <frlg root> <LAYOUT_ID> <out dir> <name>
#   → <name>.png 바닥 그림, <name>_o.png 사람 위에 덮이는 층(본가 NORMAL·SPLIT 위층 = 지붕·벽 윗부분·나무 꼭대기),
#     <name>.json { w, h, col: 칸 줄들, door: {"x,y": 문 종류}, look: {"x,y": 살펴볼 것 종류} }, 문 애니메이션 door_<종류>.png (16x48, 닫힘→열림 3장)
# col 글자: . 걸을 수 있음  # 막힘  c 카운터(너머 사람에게 말 걸기)  v ^ < > 그 방향으로 뛰어내리는 턱
import sys, json, struct, os, re
from PIL import Image
root, name, outd, nm = sys.argv[1:5]
L = next(l for l in json.load(open(f'{root}/data/layouts/layouts.json'))['layouts'] if l.get('name') == name or l.get('id') == name)
def tsdir(n):
    s = re.sub(r'(?<!^)([A-Z])', r'_\1', n.replace('gTileset_', '')).lower()
    s = re.sub(r'_(\d)', r'_\1', s)
    for k in ('primary', 'secondary'):
        for c in (s, re.sub(r'(\D)(\d)', r'\1_\2', s)):
            if os.path.isdir(f'{root}/data/tilesets/{k}/{c}'): return f'{root}/data/tilesets/{k}/{c}'
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
NP = 640
def mt(path):
    b = open(path, 'rb').read(); return [struct.unpack_from('<8H', b, i) for i in range(0, len(b), 16)]
MP, MS = mt(f'{P}/metatiles.bin'), mt(f'{Sd}/metatiles.bin')
def at(path):
    b = open(path, 'rb').read(); return [struct.unpack_from('<I', b, i)[0] for i in range(0, len(b), 4)]
AP, AS = at(f'{P}/metatile_attributes.bin'), at(f'{Sd}/metatile_attributes.bin')
W, H = L['width'], L['height']
blk = struct.unpack(f'<{W*H}H', open(f"{root}/{L['blockdata_filepath']}", 'rb').read()[:W * H * 2])
img = Image.new('RGBA', (W * 16, H * 16), (0, 0, 0, 255)); px = img.load(); ov = Image.new('RGBA', (W * 16, H * 16), (0, 0, 0, 0)); po = ov.load()
def tile(i): return TP[i] if i < NP else (TS[i - NP] if i - NP < len(TS) else None)
DOOR = {0x03D: ('general', 2), 0x062: ('sliding_single', 3), 0x15B: ('sliding_double', 3), 0x2CE: ('pewter', 8)}   # field_door.c sDoorAnimGraphicsTable (쓰는 것만)
JUMP = {0x38: '>', 0x39: '<', 0x3A: '^', 0x3B: 'v'}
# A 로 살펴볼 수 있는 칸 (include/constants/metatile_behaviors.h) → look: {"x,y": 종류}
LOOKB = {0x81: 'bookshelf', 0x82: 'shelf', 0x83: 'pc', 0x84: 'sign', 0x85: 'map', 0x86: 'tv', 0x87: 'pcsign', 0x88: 'martsign', 0x89: 'cabinet', 0x8A: 'kitchen', 0x8F: 'quest',
         0x93: 'blueprint', 0x95: 'machine', 0x96: 'phone', 0x97: 'computer', 0x98: 'poster', 0x9C: 'porthole', 0x9D: 'window', 0x9E: 'lights', 0x9F: 'tools'}
col, door, used, look = [], {}, {}, {}
for by in range(H):
    row = ''
    for bx in range(W):
        v0 = blk[by * W + bx]; m = v0 & 0x3ff; c0 = (v0 >> 10) & 3
        e = MP[m] if m < NP else MS[m - NP]
        a = AP[m] if m < NP else AS[m - NP]; lt = (a >> 29) & 3; bh = a & 0x1ff
        row += JUMP.get(bh) or ('c' if bh == 0x80 else '#' if c0 else '.')
        if bh in LOOKB: look[f'{bx},{by}'] = LOOKB[bh]
        if m in DOOR: door[f'{bx},{by}'] = DOOR[m][0]; used[DOOR[m][0]] = DOOR[m][1]
        for layer in range(2):
            dst = po if (layer == 1 and lt != 1) else px
            for q in range(4):
                v = e[layer * 4 + q]; ti, hf, vf, pl = v & 0x3ff, v >> 10 & 1, v >> 11 & 1, v >> 12
                t = tile(ti)
                if not t or pl >= len(pals): continue
                ox, oy = bx * 16 + (q % 2) * 8, by * 16 + (q // 2) * 8
                for y in range(8):
                    for x in range(8):
                        c = t[7 - y if vf else y][7 - x if hf else x]
                        if c == 0:
                            if layer == 0: px[ox + x, oy + y] = pals[pl][0] + (255,)
                            continue
                        dst[ox + x, oy + y] = pals[pl][c] + (255,)
    col.append(row)
os.makedirs(outd, exist_ok=True)
img.save(f'{outd}/{nm}.png'); ov.save(f'{outd}/{nm}_o.png')
json.dump({'w': W, 'h': H, 'col': col, 'door': door, 'look': look}, open(f'{outd}/{nm}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for k, pi in used.items():   # 문 애니메이션: 4bpp 색 번호에 그 문 팔레트를 입힘
    src = Image.open(f'{root}/graphics/door_anims/{k}.png'); sp = src.load(); w, h = src.size; d = Image.new('RGBA', (w, h), (0, 0, 0, 0)); dp = d.load()
    for y in range(h):
        for x in range(w):
            c = sp[x, y] % 16
            if c: dp[x, y] = pals[pi][c] + (255,)
    d.save(f'{outd}/door_{k}.png')
print(nm, W, H, len(door), 'doors', list(used))
