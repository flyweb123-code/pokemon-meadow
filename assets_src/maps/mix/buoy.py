# 항구 도시: 깊은 바다 위 부표(흰·하늘·갈색 덩이 둘) 지우고 둘레 바다 디더 무늬로 메움 (경완 '바다 위에 부표 같은거 빼주고')
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
DEEP={(0x24,0x6e,0xae),(0x25,0x79,0xb3),(0x25,0x6e,0xa9)}
for (x0,y0,x1,y1) in [(12,255,40,268),(34,247,66,259)]:
  for y in range(y0,y1):
    for x in range(x0,x1):
      if p[x,y][:3] in DEEP: continue
      for dx in (-8,8,-16,16,-24,24,-32,32):   # 바다 무늬는 4칸 주기 → 8칸 옆 같은 줄을 빌림
        X=x+dx
        if 0<=X<180 and not (x0<=X<x1) and p[X,y][:3] in DEEP: p[x,y]=p[X,y]; break
      else:
        for dx in (-8,8,-16,16,-24,24,-32,32):
          X=x+dx
          if 0<=X<180 and p[X,y][:3] in DEEP: p[x,y]=p[X,y]; break
im.save(sys.argv[2])
