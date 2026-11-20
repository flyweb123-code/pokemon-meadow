# 동굴 바탕(PixelLab cave3_200) 위에 캘 수 있는 보석 결정 4곳을 도트로 그려 넣음 (경완 '캘 수 있는 보석')
# 쓰는 법: python3 gems.py pixellab/cave3_200.png cave.png
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
def hx(s): return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
OUT=hx('1c1426')
# (밑 가운데 x, 밑 y, 색 4단계: 밝은 면·가운데·어두운 면·반짝)
GEMS=[(14,56,['8ae8ff','3ab0f0','1a6ab0','ffffff']),
      (58,48,['ffb0e8','f060c0','a02c84','ffffff']),
      (95,42,['fff0a0','f0c030','b07a10','ffffff']),
      (170,46,['b8ffb0','50d860','208a40','ffffff'])]
# 결정 기둥: (가운데 x 차이, 높이, 폭 반)
SH=[(-3,7,1),(0,11,2),(3,8,1)]
def put(x,y,c):
  if 0<=x<180 and 0<=y<300: p[x,y]=c
for bx,by,cs in GEMS:
  L,M,D,S=[hx(c) for c in cs]
  # 바위 받침
  for x in range(bx-6,bx+7):
    for y in range(by-1,by+2):
      if abs(x-bx)<=6-(y-by+1)*1: put(x,y,hx('3a3046') if y==by+1 else hx('544864'))
  for dx,h,w in SH:
    cx=bx+dx
    # 테두리 먼저
    for y in range(by-h-1,by):
      ww=w if y>by-h+1 else max(0,w-1) if y>by-h else 0
      for x in range(cx-ww-1,cx+ww+2): put(x,y,OUT)
    for y in range(by-h,by):
      ww=w if y>by-h+1 else max(0,w-1) if y>by-h else 0
      for x in range(cx-ww,cx+ww+1):
        put(x,y,L if x<cx else M if x==cx else D)
    put(cx,by-h,L)
  put(bx-1,by-9,S); put(bx-3,by-5,S)
im.save(sys.argv[2])
print([(b[0],b[1]) for b in GEMS])
# 오른쪽 버섯 위 회색 막대 찌꺼기 지움 (둘레 벽 색으로)
im=Image.open(sys.argv[2]).convert('RGBA'); p=im.load()
for y in range(43,56):
  for x in range(156,170):
    r,g,b,a=p[x,y]
    if r+g+b>330 and max(r,g,b)-min(r,g,b)<40:
      q=p[x-4,y]; p[x,y]=q
im.save(sys.argv[2])
