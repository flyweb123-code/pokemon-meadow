# 관장 카드 도트 그림 (v16.52 경완 '카드 디자인 구려, 스프라이트가 구림'): 등급별 9칸 테두리 f{i}.png, 머리띠 무늬 h{i}.png, 별 star.png, 등급 장식 c{i}.png
# python3 tools/gym/mkcard.py  → gym/img/card/
from PIL import Image
import os
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'gym', 'img', 'card')
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
# 밝은 → 진한 다섯 톤 (홈 등급 딱지 색 줄)
PAL = [
  ['#ffffff', '#d6dae4', '#a2a9bc', '#6c7489', '#2e3344'],
  ['#f2ffe8', '#b8e8a8', '#6cc45a', '#3a8a3c', '#173e1c'],
  ['#eef6ff', '#a8ccff', '#5a96ec', '#2a5ab8', '#112858'],
  ['#f8f0ff', '#d4b4ff', '#a874ee', '#6a38b8', '#2a1258'],
  ['#fff0ee', '#ffb0a8', '#ec6458', '#b02c28', '#4a0c0c'],
  ['#fffbe0', '#ffe27a', '#f0b830', '#b07810', '#4a2e00'],
  ['#fbf8ff', '#e0d4ff', '#b8a8f0', '#7a6ad0', '#241c5c'],
]
RAIN = ['#ff6a9a', '#ffb43a', '#ffe24a', '#5ad87a', '#4ab0ff', '#9a7aff']
GEM = {3: ['#ffffff', '#ffd0f0', '#e060c8', '#8a1e7a'], 4: ['#ffffff', '#ffe0a0', '#f0a020', '#8a4a00'], 5: ['#ffffff', '#c8f0ff', '#3ab0f0', '#14508a'], 6: None}

def frame(i):
  P = [H(c) for c in PAL[i]]; S = 24; im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); px = im.load()
  for y in range(S):
    for x in range(S):
      d = min(x, y, S - 1 - x, S - 1 - y)   # 바깥에서 몇 칸
      if d > 5: continue
      tl = (x < S - 1 - x and y <= S - 1 - y and min(x, y) == d) if d else False
      if d == 0 or d == 5: c = P[4]
      elif d == 1: c = P[0] if (x == 1 or y == 1) and x < S - 2 and y < S - 2 else P[3]
      elif d == 2: c = P[1] if (x == 2 or y == 2) and x < S - 3 and y < S - 3 else P[2]
      elif d == 3: c = P[2]
      else: c = P[3]   # d 4 = 안쪽 홈
      px[x, y] = c
  # 모서리 장식: 0~2 리벳, 3~5 보석, 6 무지개 보석
  for cx, cy in ((3, 3), (S - 4, 3), (3, S - 4), (S - 4, S - 4)):
    if i < 3:
      for dx, dy, c in ((-1, -1, P[4]), (0, -1, P[4]), (1, -1, P[4]), (-1, 0, P[4]), (0, 0, P[0]), (1, 0, P[1]), (-1, 1, P[4]), (0, 1, P[1]), (1, 1, P[3])):
        px[cx + dx, cy + dy] = c
    else:
      G = [H(c) for c in (GEM[i] or ['#ffffff', '#ffe24a', '#ff6a9a', '#4ab0ff'])]
      for dy in range(-2, 3):
        for dx in range(-2, 3):
          if abs(dx) + abs(dy) > 2: continue
          if abs(dx) + abs(dy) == 2: c = H('#1a1420')
          elif (dx, dy) == (-1, 0) or (dx, dy) == (0, -1): c = G[1]
          elif (dx, dy) == (0, 0): c = G[2]
          else: c = G[3]
          px[cx + dx, cy + dy] = c
      px[cx - 1, cy - 1] = H('#1a1420'); px[cx, cy - 1] = G[0] if i != 6 else H(RAIN[2])
      if i == 6: px[cx, cy] = H(RAIN[0]); px[cx + 1, cy] = H(RAIN[4]); px[cx, cy + 1] = H(RAIN[3]); px[cx - 1, cy] = H(RAIN[1])
  im.save(os.path.join(OUT, f'f{i}.png'))

def head(i):   # 머리띠 무늬 8x8: 두 톤 사선 + 디더
  P = [H(c) for c in PAL[i]]; im = Image.new('RGBA', (8, 8)); px = im.load()
  for y in range(8):
    for x in range(8):
      k = (x + y) % 8
      px[x, y] = P[3] if k < 4 else P[2]
  if i == 6:
    for y in range(8):
      for x in range(8):
        r = H(RAIN[(x + y) // 4 % 2 * 3]); b = px[x, y]
        px[x, y] = tuple((r[j] * 4 + b[j] * 6) // 10 for j in range(3)) + (255,)
  im.save(os.path.join(OUT, f'h{i}.png'))

def star():
  M = ['....o....', '...oyo...', '...oyo...', 'oooowyooo', 'oyywwyyyo', '.oyyyyyo.', '..oyyyo..', '.oyyoyyo.', '.oyo.oyo.', '.oo...oo.']
  C = {'o': H('#4a2e00'), 'y': H('#ffd84a'), 'w': H('#ffffff')}; im = Image.new('RGBA', (9, len(M))); px = im.load()
  for y, r in enumerate(M):
    for x, ch in enumerate(r):
      if ch in C: px[x, y] = C[ch]
  im.save(os.path.join(OUT, 'star.png'))

LAUREL = [   # 왼쪽 반 (가운데 → 왼쪽으로 뻗는 월계수 가지), 오른쪽은 뒤집기. o 윤곽 l 밝음 m 중간 d 진함 s 줄기
  '..oo..............',
  '.olmo.....oo......',
  '.ollmo...olmo.....',
  '..omdo..ollmo.....',
  '...odo...omdo..oo.',
  '..ooso....odo.olmo',
  '.olmoss..ooso.ollm',
  '.ollmoss.olmoss.om',
  '..ommooss.ollmossd',
  '...oddo.sssommdoos',
  '....ooo...ssoddo.s',
  '...........sssoooss',
]
def crest(i):   # 위 가운데 장식 (이름난부터): 양쪽 월계수 + 가운데 보석
  P = [H(c) for c in PAL[i]]; W, Hh = 46, 14; im = Image.new('RGBA', (W, Hh)); px = im.load()
  C = {'o': P[4], 'l': P[0], 'm': P[1], 'd': P[3], 's': P[4]}
  for y, r in enumerate(LAUREL):
    for x, ch in enumerate(r[:18]):
      if ch in C:
        px[x + 1, y + 1] = C[ch]; px[W - 2 - x, y + 1] = C[ch]
  G = [H(c) for c in (GEM[i] or ['#ffffff', '#ffe24a', '#ff6a9a', '#4ab0ff'])]
  cx, cy = W // 2, 7
  for dy in range(-5, 6):
    for dx in range(-5, 6):
      a = abs(dx) + abs(dy)
      if a > 5: continue
      c = H('#1a1420') if a == 5 else (G[0] if (dx, dy) in ((-1, -2), (-2, -1), (-1, -1), (-2, -2)) else G[1] if dy < 0 and dx <= 0 else G[2] if a < 4 else G[3])
      if i == 6 and 0 < a < 5 and (dx, dy) not in ((-1, -2), (-2, -1), (-1, -1), (-2, -2)): c = H(RAIN[(dx + dy + 9) % len(RAIN)])
      if 0 <= cx + dx < W and 0 <= cy + dy < Hh: px[cx + dx, cy + dy] = c
  im.save(os.path.join(OUT, f'c{i}.png'))

for i in range(7): frame(i)
for i in range(3, 7): crest(i)
star()
