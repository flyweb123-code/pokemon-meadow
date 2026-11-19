# 항구 도시 합친 판: 축대·해변 모서리 직선 잘림선을 바위 무더기로 정리 + 집 사이 나무·작은 화분
# (경완 '여전히 이 부분 직선 잘림선 어색. 그리고 건물 사이사이 여백에 작은 화분이랑, 일반 나무들 놔서 좀 꾸며줘봐')
import sys, math
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load(); s=im.copy().load()
hx=lambda c:tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
def px(x,y,c):
  if 0<=x<180 and 0<=y<300: p[x,y]=hx(c) if isinstance(c,str) else c
# 1) 모서리 체크 무늬·세로 줄 → 모래로 (x 85~89, y 110~165), 벽 옆 그늘 1줄
for y in range(110,170):
  for x in range(85,90):
    c=s[x,y]
    if y<150 or not (c[2]>c[0]+40):
      p[x,y]=s[93,y] if not (s[93,y][2]>s[93,y][0]+40) else s[x,y]
  if y<150: px(85,y,'b98a5e')
# 2) 바위 무더기 (모서리에서 바다 쪽으로)
ROCK=[('4a4650','6e6a72','98949a','c4c0c4')]
def rock(cx,cy,rx,ry):
  d,m,l,h=ROCK[0]
  for y in range(-ry-1,ry+2):
    for x in range(-rx-1,rx+2):
      e=(x/rx)**2+(y/ry)**2
      if e<=1.0:
        t=(x*.5+y)/(rx+ry)   # 왼쪽 위가 밝음
        c=h if t<-.45 else l if t<-.1 else m if t<.35 else d
        px(cx+x,cy+y,c)
      elif e<=1.35 and y>=0: px(cx+x,cy+y,'3a3640')    # 아래 테두리
# 바위 아래 물거품 먼저
for (cx,cy,r) in [(84,166,10),(95,170,7)]:
  for a in range(0,360,6):
    x=cx+math.cos(a/57.3)*r; y=cy+math.sin(a/57.3)*r*.45
    if math.sin(a/57.3)>-.2 and s[int(x),int(y)][2]>s[int(x),int(y)][0]+40: px(int(x),int(y),'f4f6f6'); px(int(x)+1,int(y),'dff0f4')
for (cx,cy,rx,ry) in [(83,152,6,5),(90,158,5,4),(79,161,5,4),(87,165,4,3),(96,166,3,2),(74,156,3,3),(92,149,3,3)]:
  rock(cx,cy,rx,ry)
# 3) 집 사이 나무 (둥근 잎, 테두리, 밑동)
def tree(cx,base,r):
  for y in range(base-3,base+1): px(cx,y,'6a4a30'); px(cx+1,y,'4e3622')
  cy=base-3-r
  for y in range(-r-1,r+2):
    for x in range(-r-1,r+2):
      e=(x*x+(y*1.1)**2)**.5/r
      lump=math.sin(math.atan2(y,x)*5)*.08
      if e<=1+lump:
        t=(x*.4+y)/(r*1.4)
        c='7cc27a' if t<-.45 else '5aa86a' if t<-.1 else '3f8a5a' if t<.35 else '2f6a46'
        px(cx+x,cy+y,c)
      elif e<=1.18+lump: px(cx+x,cy+y,'24402e')
tree(32,66,6); tree(129,66,4); tree(164,66,3)
# 4) 작은 화분 (테라코타 + 초록/꽃)
def pot(cx,base,flower=None):
  for y in range(base-3,base+1):
    w=2 if y>base-3 else 3
    for x in range(cx-w,cx+w+1): px(x,y,'c0683e' if x<cx+w else '8a4428')
  for x in range(cx-3,cx+4): px(x,base-3,'d8845a')
  for y in range(base-7,base-3):
    for x in range(cx-3,cx+4):
      if (x-cx)**2+((y-(base-5))*1.4)**2<=10: px(x,y,'5aa86a' if (x+y)%3 else '3f8a5a')
  if flower:
    for (fx,fy) in [(-1,-7),(2,-6),(-2,-5)]: px(cx+fx,base+fy,flower)
for (x,f) in [(4,'f05a6a'),(24,None),(40,'f8d040'),(52,None),(104,'f05a6a'),(122,None),(157,'f8d040'),(171,'f05a6a')]:
  pot(x,68,f)
im.save(sys.argv[2])
