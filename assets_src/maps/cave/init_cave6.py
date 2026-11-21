# 동굴 원근 출발 그림 v6 (경완 '공간감이 안 느껴지는데 좀 위에서 내려다보는 느낌으로 멀어질수록 입체적인 동굴 원근감이 느껴지게') 2026-11-21
# 뒤 띠(y<EDGE)를 위에서 내려다본 아래층 동굴로: 양옆 벽이 소실점으로 모이고, 아래층 바닥 단(테라스)이 멀수록 작고 어둡고 안개 낌,
# 레일은 낭떠러지 밑에서 S 자로 굽어 멀리 소실점 쪽으로 가늘어짐. 바닥(y>=EDGE)은 cave4 그대로(레일 지움).
# python3 init_cave6.py cave4_base.png out.png path.json
import math, random, sys, json
from PIL import Image
src=Image.open(sys.argv[1]).convert('RGB'); W,H=src.size; R=random.Random(9)
s=src.load()
EDGE=96
im=Image.new('RGB',(W,H)); p=im.load()
# 바닥: cave4 의 y>=66 줄을 그대로 아래로 (레일 띠는 왼쪽 바닥으로 덮음)
for y in range(H):
  for x in range(W): p[x,y]=s[x,y]
for y in range(60,H):
  cx=126.6+(y-62)*.244
  for x in range(int(cx-11),int(cx+12)):
    if 0<=x<W and x-26>=0: p[x,y]=s[x-26,y]
def hx(c): return tuple(int(c[i:i+2],16) for i in (0,2,4))
def mix(a,b,t): t=max(0,min(1,t)); return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
VX,VY=92,-34                      # 소실점
def d(y): return (EDGE-y)/(EDGE-VY)   # 0=가까움(낭떠러지) 1=소실점
# 아래층 바닥 폭: 가까울수록 넓음
def wall(y):
  k=1-d(y); return VX-(VX-2)*k*1.05-6*math.sin(y*.21), VX+(W-VX-2)*k*1.05+6*math.sin(y*.17+1)
NEAR,FAR,FOG=hx('4a4560'),hx('1c1830'),hx('2a2444')
WALLN,WALLF=hx('2a2236'),hx('15111f')
for y in range(EDGE):
  t=d(y); L,Rr=wall(y)
  for x in range(W):
    if L<=x<=Rr:
      # 아래층 바닥 단: 멀수록 단이 촘촘(원근)
      z=1/(t+.18); band=(z*3.2)%1
      c=mix(NEAR,FAR,t**.8)
      if band<.16: c=mix(c,hx('0f0c18'),.55)          # 단 그늘(턱)
      elif band<.3: c=mix(c,hx('6a6488'),.25*(1-t))  # 턱 위 밝은 줄
      c=mix(c,FOG,t*.5)
    else:
      # 양옆 벽: 소실점으로 모이는 결
      ang=math.atan2(y-VY,x-VX); st=(ang*40)%1
      c=mix(WALLN,WALLF,t*.9)
      if st<.18: c=mix(c,hx('3a3048'),.6*(1-t))
      e=min(abs(x-L),abs(x-Rr))
      if e<2: c=hx('5a5070') if t<.7 else hx('3a3450')
    p[x,y]=c
# 아래층 석순: 멀수록 작게
for k in range(26):
  t=R.uniform(.05,.85); y=round(EDGE-t*(EDGE-VY)); 
  if y<4: continue
  L,Rr=wall(y); x=R.uniform(L+6,Rr-6); h=round(16*(1-t)+2); w=max(1,round(5*(1-t)))
  for yy in range(y-h,y+1):
    hw=w*(yy-(y-h))/max(1,h)
    for xx in range(round(x-hw),round(x+hw)+1):
      if 0<=xx<W and 0<=yy<H: p[xx,yy]=mix(hx('6c6488') if xx<x else hx('3a3450'),FOG,t*.6)
  for xx in range(round(x-w-1),round(x+w+2)):
    if 0<=xx<W and 0<=y+1<H: p[xx,y+1]=mix(p[xx,y+1],hx('0c0a14'),.5)
# 레일 길: 낭떠러지 밑 왼쪽에서 S 자로 소실점 쪽으로
path=[]
for i in range(60):
  u=i/59; t=.03+u*.9; y=EDGE-t*(EDGE-VY)
  L,Rr=wall(y); mid=(L+Rr)/2; half=(Rr-L)/2
  x=mid+half*.55*math.sin(u*math.pi*1.6+.9)
  path.append((x,y,1-t))
for i in range(len(path)-1):
  (x0,y0,s0),(x1,y1,s1)=path[i],path[i+1]
  if y0<2: break
  g=max(.6,5*s0)                         # 궤간
  n=max(1,int(abs(y1-y0)*2+abs(x1-x0)*2))
  for j in range(n+1):
    a=j/n; x=x0+(x1-x0)*a; y=y0+(y1-y0)*a; sc=s0+(s1-s0)*a
    ty=round(y)
    if i%2==0 and j==0:                  # 침목
      for xx in range(round(x-g-1),round(x+g+2)):
        if 0<=xx<W and 0<=ty<H: p[xx,ty]=mix(hx('5a4030'),FOG,(1-sc)*.6)
    for side in (-1,1):
      xx=round(x+side*g)
      if 0<=xx<W and 0<=ty<H: p[xx,ty]=mix(hx('a8a4b8'),FOG,(1-sc)*.7)
# 빛 결정
for k in range(14):
  t=R.uniform(.1,.9); y=round(EDGE-t*(EDGE-VY))
  if y<3: continue
  L,Rr=wall(y); x=round(R.choice([L-2,Rr+2,R.uniform(L,Rr)]))
  if 0<=x<W: p[x,y]=mix(hx(R.choice(['6fd0e8','b58ae8','e8d06f'])),FOG,t*.4)
# 우리 바닥 턱 (낭떠러지 끝)
for x in range(W):
  e=EDGE+round(math.sin(x*.5)*1.2+math.sin(x*.17+1)*1.5)
  for y in range(EDGE-4,e+3):
    if y<e-1: p[x,y]=mix(p[x,y],hx('080610'),.6*(1-(e-1-y)/4))   # 낭떠러지 밑 그늘
    elif y<e+1: p[x,y]=hx('6a6480')
    elif y<e+3: p[x,y]=hx('4a4458')
  p[x,e-2]=hx('1a1424')
# 앞 종유석 몇 개 (위 테두리, 가까운 천장)
for y in range(0,30):
  for x in range(W):
    c=s[x,y]
    if .3*c[0]+.59*c[1]+.11*c[2]>80 and c[2]>=c[0] and (x<40 or x>140): p[x,y]=c
im.save(sys.argv[2]); im.resize((W*3,H*3),Image.NEAREST).save(sys.argv[2].replace('.png','_x3.png'))
json.dump([[round(x,1),round(y,1),round(sc,3)] for x,y,sc in path if y>=2],open(sys.argv[3],'w'))
