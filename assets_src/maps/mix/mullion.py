# 항구 도시: 가운데 창틀(창살)이 유리 위·아래 끝까지 닿게 (경완 '밤 창문에 가운데 창틀이 아래에 안 닿는 창문들이 있네')
# 쓰는 법: python3 mullion.py maps/harbor.png  (그 자리에 덮어씀)
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
# (x, 위 y, 아래 y, 칠할 색) — 유리 칸만 칠함 (창틀·잎은 그대로)
FIX=[(108,43,50,(144,169,121)),   # 등대 쪽 둘째 집 위층 창: 맨 위 한 칸
     (99,56,62,(123,128,128)),    # 둘째 집 아래층 창: 아래 두 칸
     (48,55,62,(123,128,128))]    # 첫 집 아래층 창(덩굴): 맨 아래 한 칸
glass=lambda c:c[3]>=200 and sum(c[:3])<330 and c[1]<=c[2]+30
n=0
for x,y0,y1,c in FIX:
  for y in range(y0,y1+1):
    if glass(p[x,y]): p[x,y]=c+(255,); n+=1
im.save(sys.argv[1]); print('칠한 칸', n)
