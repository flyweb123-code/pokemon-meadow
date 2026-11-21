# 동굴 v7 출발 그림 — 위 띠만 (경완 '이런 느낌이 아니고 벽 있던 부분에만 아래로 동굴 풍경이 쫙 펼쳐지게') 2026-11-21
# 바닥(cave4, y>=EDGE)은 그대로. 벽 자리(y<EDGE)를 '낭떠러지 끝에서 내려다본 넓은 아래층 동굴'로:
# 위쪽(멀리) 지평선 안개 → 아래로 내려올수록(가까이) 바닥 단·석순·지하 강이 커짐, 강 따라 굽은 먼 레일
# python3 init_cave7.py cave4_base.png band.png full.png path.json   (band = 180x(EDGE+8), full = 바닥까지 붙인 180x300)
import math, random, sys, json
from PIL import Image
src=Image.open(sys.argv[1]).convert('RGB'); W,H=src.size; R=random.Random(4); s=src.load()
EDGE=64; BH=EDGE+8
def hx(c): return tuple(int(c[i:i+2],16) for i in (0,2,4))
def mix(a,b,t): t=max(0,min(1,t)); return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
full=src.copy(); p=full.load()
for y in range(60,H):                           # 바닥 레일 지우기
  cx=126.6+(y-62)*.244
  for x in range(int(cx-11),int(cx+12)):
    if 0<=x<W and x-26>=0: p[x,y]=s[x-26,y]
HZ=9                                             # 지평선(가장 먼 곳)
def depth(y): return max(0,min(1,(y-HZ)/(EDGE-HZ)))   # 0 멀리 → 1 가까이(낭떠러지 바로 밑)
FAR,NEAR,FOG=hx('2a2540'),hx('544c6c'),hx('3a3458')
for y in range(EDGE):
  for x in range(W):
    if y<HZ:   # 먼 천장·벽: 어둡게, 작은 종유석 실루엣
      c=mix(hx('100c18'),hx('2c2644'),y/HZ)
      if (x*7)%23<3 and y<HZ-1-((x*13)%5): c=hx('1a1526')
    else:
      t=depth(y); z=1/(t+.25); band=(z*2.6)%1
      c=mix(FAR,NEAR,t)
      if band<.14: c=mix(c,hx('15111f'),.6*t+.2)      # 단 그늘
      elif band<.26: c=mix(c,hx('7a7298'),.3*t)        # 단 위 밝은 턱
      c=mix(c,FOG,(1-t)*.55)
      n=math.sin(x*.21+y*.13)+math.sin(x*.07-y*.3)
      if n>1.4: c=mix(c,hx('6a6288'),.2*t)
    p[x,y]=c
# 지하 강 (빛나는 청록): 가까이 왼쪽 → 멀리 가운데로 굽으며 가늘어짐
river=[]
for i in range(80):
  u=i/79; y=EDGE-1-u*(EDGE-1-HZ); t=depth(y)
  x=24+u*66+18*math.sin(u*math.pi*1.4)
  river.append((x,y,t))
for x0,y0,t in river:
  w=1+6*t
  for xx in range(round(x0-w),round(x0+w)+1):
    if 0<=xx<W: 
      e=abs(xx-x0)/max(1,w)
      p[xx,round(y0)]=mix(hx('2e8fb0') if e<.6 else hx('1d5a78'),FOG,(1-t)*.5)
      if e<.25 and R.random()<.12: p[xx,round(y0)]=mix(hx('9fe6f4'),FOG,(1-t)*.4)
# 석순: 멀수록 작고 흐림
for k in range(34):
  y=round(R.uniform(HZ+3,EDGE-2)); t=depth(y); x=R.uniform(0,W)
  if any(abs(x-rx)<8*rt+3 and abs(y-ry)<3 for rx,ry,rt in river): continue
  h=round(2+16*t**1.3); w=.6+4*t
  for yy in range(y-h,y+1):
    hw=w*(yy-(y-h))/max(1,h)
    for xx in range(round(x-hw),round(x+hw)+1):
      if 0<=xx<W and 0<=yy<EDGE: p[xx,yy]=mix(hx('8a82a8') if xx<x else hx('3e3858'),FOG,(1-t)*.6)
# 레일: 오른쪽 가까이에서 시작해 강 건너 멀리로 (나무 다리 한 칸)
path=[]
for i in range(70):
  u=i/69; y=EDGE-2-u*(EDGE-2-HZ-2); t=depth(y)
  x=150-u*55+22*math.sin(u*math.pi*1.2+.4)
  path.append((x,y,t))
for i in range(len(path)-1):
  (x0,y0,t0),(x1,y1,t1)=path[i],path[i+1]; g=.5+2.8*t0
  n=max(1,int(abs(y1-y0)*3+abs(x1-x0)*3))
  for j in range(n+1):
    a=j/n; x=x0+(x1-x0)*a; y=round(y0+(y1-y0)*a)
    if i%2==0 and j==0:
      for xx in range(round(x-g-1),round(x+g+2)):
        if 0<=xx<W and 0<=y<EDGE: p[xx,y]=mix(hx('6a4a32'),FOG,(1-t0)*.6)
    for sd in (-1,1):
      xx=round(x+sd*g)
      if 0<=xx<W and 0<=y<EDGE: p[xx,y]=mix(hx('b4b0c4'),FOG,(1-t0)*.65)
# 빛 결정 점
for k in range(16):
  y=round(R.uniform(HZ,EDGE-3)); t=depth(y); x=R.randrange(W)
  p[x,y]=mix(hx(R.choice(['6fd0e8','b58ae8','e8d06f'])),FOG,(1-t)*.35)
# 낭떠러지 끝 (우리 바닥 턱) + 바로 밑 그늘
for x in range(W):
  e=EDGE+round(math.sin(x*.5)*1.2+math.sin(x*.17+1)*1.5)
  for y in range(EDGE-5,e+3):
    if y<e-1: p[x,y]=mix(p[x,y],hx('07050d'),.75*(1-(e-1-y)/5))
    elif y<e+1: p[x,y]=hx('6a6480')
    else: p[x,y]=hx('4a4458')
  p[x,e-2]=hx('140f1c')
# 앞 천장 종유석 몇 개만 (양 끝)
for y in range(0,34):
  for x in list(range(0,30))+list(range(150,W)):
    c=s[x,y]
    if .3*c[0]+.59*c[1]+.11*c[2]>80 and c[2]>=c[0]: p[x,y]=c
for y in range(EDGE+3,EDGE+14):                  # 왼쪽 옛 바위 밑동 찌꺼기
  for x in range(14,60): p[x,y]=s[x+60,y]
full.save(sys.argv[3]); full.crop((0,0,W,BH)).save(sys.argv[2])
full.resize((W*3,H*3),Image.NEAREST).save(sys.argv[3].replace('.png','_x3.png'))
json.dump([[round(x,1),round(y,1),round(t,3)] for x,y,t in path],open(sys.argv[4],'w'))
