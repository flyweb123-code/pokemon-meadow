# 동굴 공간감 출발 그림 (경완 '광차 레일하고 터널 빼고 벽 쪽을 뭔가 전체적인 동굴 내부가 보이게 디자인하고, 멀리서 광차가 지나가는 레일도 디자인하는 식으로 해서 공간감 있는 버전') 2026-11-21
# cave4_base(180x300) 에서 바닥 레일·터널을 지우고, 뒤 띠(y<66)를 깊은 동굴 안(먼 기둥·안개·낭떠러지)+멀리 나무 다리 레일로 새로 그림
# python3 init_cave5.py cave4_base.png out.png
import math, random, sys
from PIL import Image
src=Image.open(sys.argv[1]).convert('RGB'); W,H=src.size; R=random.Random(5)
im=src.copy(); p=im.load(); s=src.load()
def hx(c): return tuple(int(c[i:i+2],16) for i in (0,2,4))
def mix(a,b,t): return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
lum=lambda c:.3*c[0]+.59*c[1]+.11*c[2]
# 1) 바닥 레일 지우기: 레일 띠를 왼쪽 26칸 바닥으로 덮음
for y in range(60,H):
  cx=126.6+(y-62)*.244
  for x in range(int(cx-11),int(cx+12)):
    if 0<=x<W and x-26>=0: p[x,y]=s[x-26,y]
EDGE=66   # 바닥이 끝나는 낭떠러지 줄
# 2) 뒤 띠: 깊은 동굴
TOP,HZ,BOT=hx('171322'),hx('3e3858'),hx('0e0b16')
def bg(x,y):
  if y<40: t=y/40; c=mix(TOP,HZ,t**1.6)
  else: t=(y-40)/(EDGE-40); c=mix(HZ,BOT,min(1,t*1.4))
  return c
for y in range(EDGE):
  for x in range(W): p[x,y]=bg(x,y)
# 먼 기둥 (천장~바닥, 안개 색에 가까움)
def col(cx,w,c,ce,y0=0,y1=EDGE):
  for y in range(y0,y1):
    hw=w*(1+.35*math.cos(y/(y1-y0)*math.pi*2+cx))*.5
    hw+=(.8 if y<8 or y>y1-10 else 0)*(3 if y<8 else 2)
    for x in range(round(cx-hw),round(cx+hw)+1):
      if 0<=x<W:
        e=abs(x-cx)/max(1,hw)
        p[x,y]=mix(c,ce,1) if (x>cx and e>.7) else c
for cx,w in [(20,9),(66,6),(118,11),(160,7)]: col(cx,w,hx('2c2742'),hx('3a3454'))
# 가운데 겹 바위 첨탑 (아래에서 솟음, 더 어둡고 가까움)
for cx,hgt,w in [(8,22,12),(44,30,10),(92,18,14),(138,26,10),(176,20,10)]:
  for y in range(EDGE-hgt,EDGE):
    k=(y-(EDGE-hgt))/hgt; hw=w*.5*(.25+k)
    for x in range(round(cx-hw),round(cx+hw)+1):
      if 0<=x<W: p[x,y]=hx('231e33') if x<cx+hw*.4 else hx('2d2740')
# 먼 빛 결정 몇 점
for x,y,c in [(30,30,'6fd0e8'),(84,24,'b58ae8'),(126,34,'6fd0e8'),(150,20,'e8d06f'),(58,44,'b58ae8')]:
  p[x,y]=hx(c); p[x,y+1]=mix(hx(c),bg(x,y+1),.5)
# 3) 먼 나무 다리 레일 (광차가 지나갈 길) y=DK
DK=44
for x in range(W):
  p[x,DK]=hx('5a4a46'); p[x,DK+1]=hx('3c302f')                   # 다리 판
  if x%4==0: p[x,DK-1]=hx('4a3b38')                               # 침목 끝
  p[x,DK-2]=hx('8a8498') if x%2==0 else hx('767088')               # 레일
for lx in range(4,W,14):                                           # 다리 다리(X 받침)
  for y in range(DK+2,EDGE):
    for x in (lx,lx+8):
      if 0<=x<W: p[x,y]=mix(hx('3a2e2c'),bg(x,y),min(.85,(y-DK)/30))
    t=(y-DK-2)/max(1,EDGE-DK-2); 
    for xx in (round(lx+8*t),round(lx+8-8*t)):
      if 0<=xx<W and (y-DK)%2==0: p[xx,y]=mix(hx('352a29'),bg(xx,y),min(.85,(y-DK)/30))
# 4) 천장 종유석 (cave4 의 밝은 종유석 그대로 가장 앞에)
for y in range(0,42):
  for x in range(W):
    c=s[x,y]
    if lum(c)>80 and c[2]>=c[0]: p[x,y]=c   # 종유석 색(보라·회색)만, 터널 벽돌(갈색)은 뺌
for x in range(W):                                                  # 천장 바위 띠
  for y in range(0,3+round(1.5+1.5*math.sin(x*.4))):
    if lum(s[x,y])<=80: p[x,y]=hx('241c30')
# 5) 낭떠러지 끝 (바닥 뒤 가장자리 바위 턱)
for x in range(W):
  e=EDGE-2+round(math.sin(x*.5)*1.2+math.sin(x*.17+1)*1.5)
  for y in range(e,EDGE+3):
    if y<e+2: p[x,y]=hx('5e5870')
    elif y<EDGE+3: p[x,y]=hx('4a4458') if y<EDGE+2 else mix(hx('4a4458'),s[x,y],.5)
  p[x,e-1]=hx('241c30')
# 6) 왼쪽 옛 바위 밑동 찌꺼기 (y66~76, x16~56) → 오른쪽 바닥으로 덮음
for y in range(EDGE+3,EDGE+12):
  for x in range(16,58): p[x,y]=s[x+60,y]
im.save(sys.argv[2])
im.resize((W*3,H*3),Image.NEAREST).save(sys.argv[2].replace('.png','_x3.png'))
