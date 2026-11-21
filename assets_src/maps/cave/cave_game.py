# 동굴 테마 게임 그림 만들기 (경완 '항구 도시 넣었던 것처럼 베타에 넣어봐주고') 2026-11-22
# 경완이 정한 자리: 바닥 +12 · 뒤 풍경 +23 · 종유석 +10 (시연 cave9_tpl 기본 자리 OB, 그림 칸)
import json, os
from PIL import Image
F, B, S = 12, 23, 10; ORG = {'b': -24, 's': -10, 'f': 0}
OUT = '../../../maps'
band = Image.open('layer_band.png').convert('RGBA'); stal = Image.open('layer_stal.png'); fl = Image.open('layer_floor.png')
im = Image.new('RGBA', (180, 300), (0, 0, 0, 255))
im.alpha_composite(band, (0, ORG['b'] + B)); im.alpha_composite(stal, (0, ORG['s'] + S)); im.alpha_composite(fl, (0, ORG['f'] + F))
im.convert('RGB').save(f'{OUT}/cave.png', optimize=True)
im.convert('RGB').quantize(64).save(f'{OUT}/th_c.png', optimize=True)
st = Image.new('RGBA', (180, 60), (0, 0, 0, 0)); st.alpha_composite(stal, (0, ORG['s'] + S)); st.save(f'{OUT}/cave_st.png', optimize=True)
for k in ['gem_water', 'gem_moon', 'gem_thunder', 'mush_0', 'mush_1']: Image.open(f'props/{k}.png').save(f'{OUT}/cave_{k}.png', optimize=True)
Image.open('cart3.png').save(f'{OUT}/cave_cart.png', optimize=True); Image.open('cartb.png').save(f'{OUT}/cave_cartb.png', optimize=True)
z = Image.open('props/zubat_sheet.png'); z.crop((0, 28, 26 * 8, 28 + 25)).save(f'{OUT}/cave_zubat.png', optimize=True)
# 호수 = 물 칸 (floor 기준 y>156, x<120, 파랑) → 월드 좌표 타원 묶음 (항구 hbSeaPonds 와 같은 방법)
p = im.load(); W, H = 180, 300
water = [[0] * W for _ in range(H)]
for y in range(H):
  for x in range(W):
    r, g, b, a = p[x, y]
    if y - F > 156 and x < 120 and b > r + 25: water[y][x] = 1
def wz(x, y):
  X, Y = int(x // 2), int(y // 2)
  if Y >= H: Y = H - 1
  if X < 0: X = -X - 1
  if X >= W: X = 359 - X
  if Y < 0 or X < 0 or X >= W: return 0
  if Y >= H: Y = H - 1
  return water[Y][X]
import math
L = []
inE = lambda E, x, y: ((x - E[0]) / E[2]) ** 2 + ((y - E[1]) / E[3]) ** 2 < .7
def ok(E):
  if not wz(E[0], E[1]): return False
  return all(wz(E[0] + math.cos(i / 20 * 6.283) * E[2] * .92, E[1] + math.sin(i / 20 * 6.283) * E[3] * .92) for i in range(20))
for rx, ry, st_ in [[150, 90, 70], [90, 56, 40], [54, 34, 24], [30, 20, 14]]:
  for y in range(300, 761, st_):
    for x in range(-420, 781, st_):
      E = (x, y, rx, ry)
      if any(inE(o, x, y) for o in L): continue
      if ok(E): L.append(E)
L.sort(key=lambda e: -e[2])
print(len(L), L[:4])
c = json.load(open('cfg9.json'))
G = {'pond': [list(e) for e in L],
  'gems': [[k, x * 2, (y + F) * 2] for t, k, x, y in c['props'] if t == 'gem'],
  'mush': [[k, x * 2, (y + F) * 2] for t, k, x, y in c['props'] if t == 'mush'],
  'tips': [[x * 2, (y + ORG['s'] + S) * 2, (l + F) * 2] for x, y, l in c['tips'] if y + ORG['s'] + S >= 3],
  'path': [[round(x * 2, 1), round((y + B) * 2, 1), d] for x, y, d in c['path']],
  'railW': [[(r - 1 + 0) * 2, w * 2] for r, w in c['railW']],   # 월드 y(= (뒤 풍경 줄 + ORG.b + B)*2) → 폭(월드)
  'floorTop': (39 + F) * 2, 'minY': (42 + F + 2) * 2, 'coal': c['coal'], 'zubat': c['zubat']['Walk']}
# 레일 꼭대기까지 (뒤 풍경 그림 줄 20→0 의 레일 가운데) 이어 붙임 — 예전 path 는 띠 22줄에서 끝났음
for r, x in [(20, 168), (16, 170), (15, 171.5), (13, 173.5), (10, 174.5), (8, 172.5), (6, 172), (4, 169.5), (2, 171.5), (0, 173), (-2, 173)]:
  G['path'].append([x * 2, (r + ORG['b'] + B) * 2, round(.18 - (20 - r) / 22 * .12, 3)])
G['railW'] = [[(r + ORG['b'] + B) * 2, w * 2] for r, w in c['railW']]
json.dump(G, open('cave_game.json', 'w')); print(json.dumps(G)[:600])
