# 항구 도시: 둘째·셋째 집 사이 틈에도 나무 (화분은 앞에 그대로) (경완 '이 여백에도 나무 넣어봐')
import sys, math
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load(); s=im.copy().load()
hx=lambda c:tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def px(x,y,c):
  if 0<=x<180 and 0<=y<300: p[x,y]=hx(c)
def tree(cx,base,r):
  for y in range(base-3,base+1): px(cx,y,'6a4a30'); px(cx+1,y,'4e3622')
  cy=base-3-r
  for y in range(-r-1,r+2):
    for x in range(-r-1,r+2):
      e=(x*x+(y*1.1)**2)**.5/r
      lump=math.sin(math.atan2(y,x)*5)*.08
      if e<=1+lump:
        t=(x*.4+y)/(r*1.4)
        px(cx+x,cy+y,'7cc27a' if t<-.45 else '5aa86a' if t<-.1 else '3f8a5a' if t<.35 else '2f6a46')
      elif e<=1.18+lump: px(cx+x,cy+y,'24402e')
def tall(cx,base,rx=5,ry=8):     # 틈이 높아서 위로 긴 나무 (줄기 + 세로로 긴 잎)
  for y in range(base-4,base+1): px(cx,y,'6a4a30'); px(cx+1,y,'4e3622')
  cy=base-4-ry
  for y in range(-ry-2,ry+2):
    for x in range(-rx-2,rx+3):
      a=math.atan2(y/ry,x/rx); e=((x-.5)**2/rx**2+y*y/ry**2)**.5
      lump=math.sin(a*7)*.07
      if e<=1+lump:
        t=(x*.5/rx+y/ry)
        c='7cc27a' if t<-.75 else '5aa86a' if t<-.2 else '3f8a5a' if t<.45 else '2f6a46'
        if (x*3+y*5)%7==0 and e<.85: c={'7cc27a':'5aa86a','5aa86a':'7cc27a','3f8a5a':'5aa86a','2f6a46':'3f8a5a'}[c]   # 잎 결
        px(cx+x,cy+y,c)
      elif e<=1+lump+1.1/min(rx,ry): px(cx+x,cy+y,'24402e')
tall(85,66)
for y in range(60,69):           # 화분은 나무 앞으로 다시
  for x in range(81,90):
    c=s[x,y]
    if c[0]>c[1]+30 or (y<=63 and c[1]>c[0]+8 and c[1]>c[2]): p[x,y]=c
im.save(sys.argv[2])
