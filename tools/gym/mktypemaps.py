# 타입별 체육관 맵 13종 (경완 2026-10-29 '맵 디자인 타입별로 고를 수 있게 없는 타입 다 추가, 단계별 크기도'):
# pret/pokefirered 맵을 tools/gym/rendermap.py 로 그린 뒤 필요한 칸만 잘라 붙이고(줄·칸 남기기) 몇 칸은 다른 칸 그림으로 덮는다.
# python3 -I tools/gym/mktypemaps.py <pokefirered 경로>
#   → gym/img/map/<id>.png, gymb/gym.js 의 FR_FREE 에 꾸미기 놓을 칸('1' = 놓을 수 있음) 추가
import sys, os, json, struct, subprocess, tempfile, re
from PIL import Image
root = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__)); top = os.path.join(here, '..', '..')
# id: (레이아웃, 남길 줄, 남길 칸, 덮기 [[보일 x, y, 가져올 x, y, 너비, 높이], …] (잘라 붙인 뒤 좌표))
T = {
  'champion': ('PokemonLeague_ChampionsRoom_Layout', '', '', []),
  'dojo': ('SaffronCity_Dojo_Layout', '', '', []),
  'roof': ('CeladonCity_DepartmentStore_Roof_Layout', '0-9', '', []),
  'viridian': ('ViridianCity_Gym_Layout', '0-22', '', []),
  # 무늬 덤불: 양 끝 숲길만 붙이고 가운데에 곧은 길·관장 자리·입구 모래길을 깐다
  'bush': ('SixIsland_PatternBush_Layout', '0-27', '0-8,52-59', [[7, 3, 3, 10, 3, 1], [7, 4, 3, 10, 3, 1], [7, 5, 3, 10, 3, 1], [8, 6, 4, 6, 1, 19], [7, 25, 3, 25, 3, 1], [7, 26, 3, 26, 3, 2]]),
  'tower': ('PokemonTower_7F_Layout', '0-17', '2-21', []),
  'lab': ('CinnabarIsland_PokemonLab_ExperimentRoom_Layout', '0-9', '', []),
  # 홍련 체육관 오른쪽 줄만, 퀴즈 문 벽(8·9줄)은 빼고 바닥으로 덮음
  'cinnabar': ('CinnabarIsland_Gym_Layout', '0-7,10-23', '21-29', [[0, 8, 0, 10, 9, 1], [0, 9, 0, 10, 9, 1], [0, 7, 0, 6, 9, 1]]),
  # 노랑 체육관 가운데 방 + 입구 방 (사이 벽 16·17줄 뺌)
  'saffron': ('SaffronCity_Gym_Layout', '8-15,18-23', '9-19', []),
  'lorelei': ('PokemonLeague_LoreleisRoom_Layout', '', '', []),
  'lance': ('PokemonLeague_LancesRoom_Layout', '3-15', '0-12', []),
  'agatha': ('PokemonLeague_AgathasRoom_Layout', '', '', []),
  'hof': ('PokemonLeague_HallOfFame_Layout', '', '', []),
}
def keep(s, n):
    if not s: return list(range(n))
    K = []
    for p in s.split(','):
        a, _, b = p.partition('-'); a = int(a); b = int(b) if b else a; K += range(a, b + 1)
    return [k for k in K if k < n]
LY = {l['name']: l for l in json.load(open(f'{root}/data/layouts/layouts.json'))['layouts'] if 'name' in l}
free = {}
for id_, (lay, rs, cs, P) in T.items():
    tmp = os.path.join(tempfile.mkdtemp(), 'm.png')
    subprocess.run([sys.executable, '-I', os.path.join(here, 'rendermap.py'), root, lay, tmp], check=True)
    im = Image.open(tmp).convert('RGBA'); L = LY[lay]; W, H = L['width'], L['height']
    blk = struct.unpack(f'<{W*H}H', open(f"{root}/{L['blockdata_filepath']}", 'rb').read()[:W * H * 2])
    R, C = keep(rs, H), keep(cs, W)
    out = Image.new('RGBA', (len(C) * 16, len(R) * 16))
    for j, y in enumerate(R):
        for i, x in enumerate(C): out.paste(im.crop((x * 16, y * 16, x * 16 + 16, y * 16 + 16)), (i * 16, j * 16))
    F = [['0' if (blk[y * W + x] >> 10) & 3 else '1' for x in C] for y in R]
    src = out.copy()
    for vx, vy, sx, sy, w, h in P:
        for j in range(h):
            for i in range(w):
                out.paste(src.crop(((sx + i) * 16, (sy + j) * 16, (sx + i + 1) * 16, (sy + j + 1) * 16)), ((vx + i) * 16, (vy + j) * 16)); F[vy + j][vx + i] = F[sy + j][sx + i]
    out.save(os.path.join(top, 'gym', 'img', 'map', id_ + '.png'), optimize=True)
    free[id_] = [''.join(r) for r in F]; print(id_, len(C), len(R))
# gymb/gym.js FR_FREE 에 합치기
p = os.path.join(top, 'gymb', 'gym.js'); s = open(p).read()
m = re.search(r'const FR_FREE = (\{.*?\});\n', s); cur = json.loads(m.group(1)); cur.update(free)
s = s[:m.start(1)] + json.dumps(cur, separators=(',', ':')) + s[m.end(1):]; open(p, 'w').write(s)
