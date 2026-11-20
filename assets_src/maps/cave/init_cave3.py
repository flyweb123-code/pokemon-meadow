# 동굴 필드 출발 그림 v3 (경완 '지금 있는 필드 테마들 수준으로 동굴 맵 … 종유석 물방울·고인 호수·캘 수 있는 보석, 나머지는 추천') 2026-11-21
# 180x300 = 필드 반 해상도. 뒤 벽 띠(y0~72) = 종유석 천장·보석 맥·광산 굴, 바닥 = 돌, 왼쪽 아래 = 호수(물 포켓몬 자리), 오른쪽 = 광차 레일
import math, random, sys
from PIL import Image
W,H=180,300; R=random.Random(7)
im=Image.new('RGBA',(W,H)); p=im.load()
def hx(s): return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
def px(x,y,c):
  if 0<=x<W and 0<=y<H: p[x,y]=hx(c) if isinstance(c,str) else c
def mix(a,b,t): return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)
def n2(x,y,s=.13): return math.sin(x*s+y*.07)*.5+math.sin(y*s*1.3-x*.05+2)*.5
WB=72
# 바닥 돌 (밝은 회청색, 큰 판돌 무늬)
F0,F1,F2=hx('6f7488'),hx('5d6276'),hx('81879c')
for y in range(H):
  for x in range(W):
    v=n2(x,y)+R.random()*.25
    c=F1 if v<-.35 else F2 if v>.55 else F0
    px(x,y,c)
# 판돌 금
for k in range(70):
  x,y=R.randrange(W),R.randrange(WB,H); a=R.random()*6.28
  for t in range(R.randrange(4,11)):
    px(round(x+math.cos(a)*t),round(y+math.sin(a)*t*.6),'4c5064'); a+=R.uniform(-.5,.5)
# 뒤 벽 띠
for y in range(WB+6):
  for x in range(W):
    b=WB+round(math.sin(x*.21)*2+math.sin(x*.07+1)*2)
    if y>b: continue
    t=y/WB; c=mix(hx('2a2638'),hx('4a4560'),t)
    if (y+round(math.sin(x*.3)*2))%11==0: c=mix(c,hx('5a5470'),.6)   # 바위 결
    if y>=b-1: c=hx('34304a')
    px(x,y,c)
# 종유석 (꼭대기에서 아래로) — 끝 자리 = 물방울 떨어지는 곳
TIPS=[]
for cx,ln,w in [(8,26,5),(22,44,7),(37,30,5),(55,52,8),(71,34,6),(86,22,4),(101,46,7),(118,28,5),(133,40,6),(149,54,8),(165,32,6),(176,20,4)]:
  for y in range(ln):
    hw=w*(1-y/ln)**1.2
    for x in range(round(cx-hw),round(cx+hw)+1):
      sh=(x-cx)/max(1,hw)
      px(x,y,mix(hx('5c5676'),hx('9a94b4'),max(0,-sh)*.8) if sh<.4 else hx('3c3852'))
  TIPS.append((cx,ln))
# 천장 구멍 빛 (왼쪽 위) — 빛줄기가 내려올 곳
for y in range(0,8):
  for x in range(42,58):
    if abs(x-50)<8-y*.6: px(x,y,'d8e4f0')
# 바닥의 빛 웅덩이 (빛줄기 닿는 곳)
for y in range(110,150):
  for x in range(20,90):
    e=((x-52)/32)**2+((y-130)/16)**2
    if e<1: px(x,y,mix(p[x,y],hx('a8b2c8'),.45*(1-e)))
# 보석 맥 (벽 아래 박힌 결정) — 캘 수 있는 보석 자리
GEMS=[(28,64,'5ad0ff','c8f4ff'),(92,66,'ff6ad0','ffd0f4'),(160,62,'7aff8a','d8ffd8'),(64,70,'ffd04a','fff4c0')]
def crystal(cx,cy,h,c,hi):
  for k,(dx,hh) in enumerate([(-3,h-3),(0,h),(3,h-2)]):
    for y in range(hh):
      w=max(0,round(1.6*(1-y/hh)+.4))
      for x in range(-w,w+1):
        px(cx+dx+x,cy-y,hi if x<0 else c)
for cx,cy,c,hi in GEMS:
  for y in range(cy-12,cy+4):
    for x in range(cx-9,cx+10):
      if ((x-cx)/9)**2+((y-cy+4)/8)**2<1: px(x,y,mix(p[x,y],hx(c),.25))
  crystal(cx,cy,10,c,hi)
# 광산 굴 입구 (오른쪽 벽) + 레일
for y in range(40,WB+3):
  for x in range(122,146):
    if ((x-134)/12)**2+((y-WB-2)/30)**2<1: px(x,y,'16131f')
for x in (121,146):
  for y in range(44,WB+2): px(x,y,'7a5a3a')
for x in range(120,148): px(x,44,'8a6a44'); px(x,45,'6a4a2c')
def rail(x0,y0,x1,y1):
  n=max(abs(x1-x0),abs(y1-y0))
  for i in range(n+1):
    t=i/n; x=round(x0+(x1-x0)*t); y=round(y0+(y1-y0)*t)
    if i%4==0:
      for d in range(-4,5): px(x+d,y,'6a4a30')
    px(x-3,y,'9aa0b0'); px(x+3,y,'9aa0b0')
rail(134,WB+2,150,150); rail(150,150,158,250)
# 광차 (레일 끝)
for y in range(236,252):
  for x in range(148,169):
    if y<240: px(x,y,'8a8f9e')
    else: px(x,y,'5a5f70' if (x+y)%5 else '4a4f60')
for x in range(150,167,3): px(x,237,'ffd04a'); px(x+1,236,'5ad0ff')
# 호수 (왼쪽 아래) — 물 포켓몬 자리
def lake_r(a): return 1+.12*math.sin(a*3+.5)+.07*math.sin(a*7)
LC=(58,238); LRX,LRY=70,58
for y in range(150,H):
  for x in range(W):
    dx,dy=(x-LC[0])/LRX,(y-LC[1])/LRY; d=math.hypot(dx,dy); a=math.atan2(dy,dx)
    r=lake_r(a)
    if d<r: px(x,y,mix(hx('2a5a8a'),hx('123050'),min(1,(r-d)*2.2)))
    elif d<r+.07: px(x,y,'4a4e60')   # 물가 바위 띠
    elif d<r+.11: px(x,y,'8a8fa2')
# 징검돌
for cx,cy in [(104,196),(96,210),(86,222)]:
  for y in range(cy-3,cy+4):
    for x in range(cx-5,cx+6):
      if ((x-cx)/5)**2+((y-cy)/3)**2<1: px(x,y,'9aa0b4' if y<cy else '6a7084')
# 석순·바위
for cx,cy,h in [(12,110,14),(170,120,12),(120,170,9),(10,160,10),(176,200,16)]:
  for y in range(h):
    w=round(4*(1-y/h))+1
    for x in range(-w,w+1): px(cx+x,cy-y,'8a8fa2' if x<0 else '5e6378')
# 빛나는 버섯·이끼
for cx,cy in [(16,176),(112,186),(132,120),(30,96),(170,280),(124,260)]:
  for k in range(R.randrange(2,4)):
    x=cx+R.randrange(-5,6); y=cy+R.randrange(-3,4)
    for d in range(3): px(x,y+d,'c8c0e0')
    for d in range(-2,3): px(x+d,y-1,'b07aff'); px(x+d//2,y-2,'d8b0ff')
  for k in range(12):
    px(cx+R.randrange(-8,9),cy+R.randrange(2,6),'4a8a6a')
out=sys.argv[1] if len(sys.argv)>1 else 'init_cave3.png'
im.save(out); print('tips',TIPS)
