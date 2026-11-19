# 항구 도시: 해변 오른쪽 끝 파란 물건(물처럼 보이던 비치볼 조각) 지우고 모래로 (경완 '해변 오른쪽에 물 같은거 보이는데 그거 없애줘')
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
SAND=[(0xee,0xcf,0xa5),(0xdf,0xb6,0x72)]
for y in range(168,181):
  for x in range(172,180):
    if p[x,y][:3] not in SAND: p[x,y]=SAND[0]+(255,)
im.save(sys.argv[2])
