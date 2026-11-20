# 동굴 바탕 v2 이어서: 버섯 자리에 보석 무리 3곳, 야광 버섯 새 자리 (경완 '보석들은 … 지금 버섯 있는 위치들 … 모여 있어야')
import json
from PIL import Image
im=Image.open('cave2_base.png').convert('RGBA'); p=im.load(); W,H=im.size
def hx(s): return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
def put(x,y,c):
  if 0<=x<W and 0<=y<H: p[x,y]=c
OUT=hx('1c1426')
def prism(cx,by,h,w,L,M,D):
  for y in range(by-h-1,by+1):
    k=by-y; ww=w if k<h-1 else max(0,w-1) if k<h else 0
    for x in range(cx-ww-1,cx+ww+2): put(x,y,OUT)
  for y in range(by-h,by):
    k=by-y; ww=w if k<h-1 else max(0,w-1)
    for x in range(cx-ww,cx+ww+1): put(x,y,L if x<cx else M if x==cx else D)
def cluster(bx,by,cs,shape):
  L,M,D,S=[hx(c) for c in cs]
  # 바닥 그림자
  for y in range(by-1,by+3):
    for x in range(bx-12,bx+13):
      if ((x-bx)/12)**2+((y-by-1)/2.2)**2<1:
        c=p[x,y]; p[x,y]=(c[0]*7//10,c[1]*7//10,c[2]*7//10,255)
  for dx,dy,h,w in shape: prism(bx+dx,by+dy,h,w,L,M,D)
  for dx,dy,h,w in shape[:3]: put(bx+dx-w,by+dy-h+2,S)
SHAPE=[(-8,1,6,1),(8,1,7,1),(-4,0,10,1),(4,-1,9,1),(0,1,14,2),(-1,3,5,1),(6,3,4,1)]
GEMS=[dict(x=85,y=70,cs=['9ae8ff','3ab0f0','1a6ab0','ffffff'],c='90,200,255',name='물의 돌'),
      dict(x=160,y=70,cs=['ffb8ec','f060c0','a02c84','ffffff'],c='255,110,210',name='달의 돌'),
      dict(x=58,y=162,cs=['fff4a8','f0c030','b07a10','ffffff'],c='255,214,70',name='천둥의 돌')]
for g in GEMS: cluster(g['x'],g['y'],g['cs'],SHAPE)
# 야광 버섯
CAP,CAPL,CAPD,ST,STD=hx('c87cff'),hx('ecc0ff'),hx('8a48c8'),hx('f4ecf8'),hx('b8a8c8')
def shroom(cx,by,r):
  # 줄기
  for y in range(by-r-1,by+1):
    for x in range(cx-1,cx+1): put(x,y,ST if x<cx else STD)
    put(cx-2,y,OUT); put(cx+1,y,OUT)
  for x in range(cx-2,cx+2): put(x,by+1,OUT)
  # 갓
  top=by-r-4
  for y in range(top-1,by-r+1):
    k=y-top; hw=[r-2,r-1,r,r,r][min(4,max(0,k))] if k>=0 else r-3
    for x in range(cx-hw-1,cx+hw+1): put(x,y,OUT)
  for y in range(top,by-r):
    k=y-top; hw=[r-2,r-1,r,r][min(3,k)]
    for x in range(cx-hw,cx+hw):
      put(x,y,CAPL if (k==0 or x<cx-hw+2 and k<2) else CAPD if k==3 else CAP)
  put(cx-1,top+1,hx('ffffff'))
SH=[(30,100,3),(36,104,2),(114,118,3),(120,121,2),(176,150,3),(170,154,2),(118,262,3),(124,266,2),(10,122,2),(96,292,3)]
for x,y,r in SH: shroom(x,y,r)
im.save('cave2.png')
json.dump(dict(gems=[{k:v for k,v in g.items() if k!='cs'} for g in GEMS],shrooms=[[x,y-4] for x,y,r in SH]+[[28,150]]),open('cave2.json','w'),ensure_ascii=False)
