# 동굴 공간감 합친 판: 뒤 띠 = PixelLab cave5_350 (먼 기둥·종유석·나무 다리), 바닥·호수 = init_cave5(=cave4 바닥, 레일 지움) 2026-11-21
# python3 cave5_mix.py out.png
import sys
from PIL import Image
top=Image.open('pixellab/cave5_350.png').convert('RGB'); flo=Image.open('init_cave5.png').convert('RGB')
W,H=flo.size; out=flo.copy(); o=out.load(); t=top.load()
# 다리 위 노란 광차 덩어리(x106~125) → 왼쪽 다리 조각으로 덮음
for y in range(30,50):
  for x in range(102,130): t[x,y]=t[x-28,y]
lum=lambda c:.3*c[0]+.59*c[1]+.11*c[2]
# 이음: y<CUT 는 350, 그 아래(낭떠러지 턱·바닥)는 init — 다리 다리는 아래로 갈수록 어둠에 녹게
CUT=60
for x in range(W):
  for y in range(CUT):
    c=t[x,y]
    if y>=50: k=(y-50)/(CUT-50); c=tuple(round(c[i]*(1-k)+o[x,y][i]*k) for i in range(3))
    o[x,y]=c
out.save(sys.argv[1]); out.resize((W*3,H*3),Image.NEAREST).save(sys.argv[1].replace('.png','_x3.png'))
