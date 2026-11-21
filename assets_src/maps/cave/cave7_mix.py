# 동굴 v7 합친 판: 위 띠(y<64) = PixelLab cave7band_200 (사람 형체 지움), 낭떠러지 턱·바닥·호수 = init_cave7 (cave4) 2026-11-21
# python3 cave7_mix.py out.png
import sys, json
from PIL import Image
b=Image.open('pixellab/cave7band_200.png').convert('RGB'); f=Image.open('init_cave7.png').convert('RGB'); q=b.load(); o=f.load(); W,H=f.size
for y in range(56,72):                     # 가운데 아래 작은 사람 형체(x84~93) → 왼쪽 10칸 풍경으로
  for x in range(82,96): q[x,y]=q[x-12,y]
EDGE=64
for y in range(EDGE-1):
  for x in range(W):
    c=q[x,y]
    if y>=EDGE-6: k=(y-(EDGE-6))/6; c=tuple(round(c[i]*(1-.6*k)) for i in range(3))   # 낭떠러지 바로 밑은 어둡게
    o[x,y]=c
f.save(sys.argv[1]); f.resize((W*3,H*3),Image.NEAREST).save(sys.argv[1].replace('.png','_x3.png'))
