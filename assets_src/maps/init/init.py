# 새 필드 4종 PixelLab 출발 그림 (180x300, 위 하늘 칸은 투명)
import random, math
from PIL import Image
W,H=180,300
BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def hexc(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
class C:
  def __init__(s): s.im=Image.new('RGBA',(W,H),(0,0,0,0)); s.p=s.im.load()
  def px(s,x,y,c):
    x,y=int(round(x)),int(round(y))
    if 0<=x<W and 0<=y<H: s.p[x,y]=hexc(c) if isinstance(c,str) else c
  def rect(s,x,y,w,h,c):
    for j in range(int(h)):
      for i in range(w): s.px(x+i,y+j,c)
  def blot(s,cx,cy,rx,c,ry=None):
    ry=ry or rx*.45
    for y in range(int(-ry),int(ry)+1):
      for x in range(int(-rx),int(rx)+1):
        d=(x/rx)**2+(y/ry)**2
        if d<1 and ((x+y+99)&1 or d<.6): s.px(cx+x,cy+y,c)
def ground(c,base,blots,ticks,top,seed):
  R=random.Random(seed); c.rect(0,top,W,H-top,base)
  for i in range(30): c.blot(R.random()*W,top+6+R.random()*(H-top),10+R.random()*18,R.choice(blots))
  for i in range(900):
    x,y=R.random()*W,top+4+R.random()*(H-top); k=R.choice(ticks); c.px(x,y,k); c.px(x,y+1,k)
def edge(x,b): return b+round(math.sin(x*.37)*1.2+math.sin(x*.11+1)*1.4)
def grad(c,x,top,bot,cols):
  for y in range(top,bot):
    k=(y-top)/max(1,bot-top)*(len(cols)-1); i=int(k)
    c.px(x,y,cols[min(len(cols)-1,i+(1 if (k-i)*16>BAY[y&3][x&3]+.5 else 0))])

# ---------- 화산 ----------
def volcano():
  c=C(); R=random.Random(5)
  ground(c,'#6a5048',['#5e463f','#77594f','#54403a'],['#4a3832','#86685c','#3f302b'],56,1)
  # 뒤 현무암 능선 (봉우리 들쭉날쭉)
  ROCK=['#1a1418','#241c20','#30262a','#3d3134','#4b3d3e']
  for x in range(W):
    top=14+round(abs(math.sin(x*.09))*10+math.sin(x*.31)*3+ (6 if (x//11)%3==0 else 0)); bot=edge(x,58)
    grad(c,x,top,bot,ROCK)
    if (x%7)==0:
      for y in range(top+3,bot-1): c.px(x,y,'#120d10')   # 주상절리 세로 금
  # 용암 폭포 두 줄 + 아래 용암 해자 (움직임 자리: 한 색)
  LAVA='#ff7a1c'
  for fx in (46,128):
    for y in range(22,58):
      w=3+ (y-22)//12
      c.rect(fx-w//2,y,w,1,LAVA)
  for x in range(W):
    e=edge(x,58)
    for y in range(e-3,e+3): c.px(x,y,LAVA)
  # 땅의 식은 용암 금 (어두운 줄 + 군데군데 붉은빛)
  for i in range(9):
    x,y=R.random()*W,80+R.random()*200; a=R.random()*6.28
    for t in range(14+int(R.random()*12)):
      a+=R.uniform(-.5,.5); x+=math.cos(a); y+=math.sin(a)*.5
      c.px(x,y,'#2a1c1a'); 
      if t%5==2: c.px(x,y-1,'#c8461e')
  # 흑요석·화산석 덩이
  for i in range(14):
    cx,cy=R.random()*W,70+R.random()*225; r=2+R.random()*3
    c.blot(cx,cy,r,'#2b2328',r*.7); c.px(cx-1,cy-1,'#5b4f58')
  return c.im
# ---------- 동굴 ----------
def cave():
  c=C(); R=random.Random(7)
  ground(c,'#4a5160',['#434a58','#535b6a','#3d4350'],['#363c48','#626a7a','#2f3440'],62,2)
  WALL=['#0c0e14','#141822','#1c2230','#262d3d','#323a4c']
  for x in range(W): grad(c,x,0,edge(x,62),WALL)
  # 종유석 (위에서 내려옴)
  for i in range(22):
    x=R.random()*W; L=6+R.random()*20; w=2+R.random()*3
    for y in range(int(L)):
      ww=max(1,round(w*(1-y/L)))
      c.rect(x-ww//2,y,ww,1,'#2a3142' if y<L*.6 else '#3c4559')
  # 벽 밑 석순·돌무더기
  for i in range(16):
    x=R.random()*W; L=4+R.random()*9; b=edge(int(x)%W,62)
    for y in range(int(L)): ww=max(1,round(3*(1-y/L))); c.rect(x-ww//2,b-y,ww,1,'#3a4255')
  # 빛나는 결정 (움직임: 반짝) 자리
  for (x,y) in [(18,56),(70,50),(150,54),(166,120),(12,210),(160,268)]:
    for k in range(5): c.px(x,y-k,'#7fe0ff'); 
    c.px(x-1,y-1,'#4fb0e0'); c.px(x+1,y-2,'#4fb0e0')
  # 지하 물웅덩이 (움직임 자리: 한 색) — 오른쪽 아래 구석
  c.blot(150,215,22,'#2a5a8c',9)
  # 이끼 자리
  for i in range(10): c.blot(R.random()*W,75+R.random()*220,4+R.random()*5,'#4c6a4e')
  return c.im
# ---------- 항구 도시 (바다 아래 넓게, 등대, 부두) ----------
def beach():
  c=C(); R=random.Random(9)
  # 바닥: 돌 포장 부둣가 광장
  c.rect(0,50,W,H-50,'#b8b0a2')
  for y in range(50,160):
    for x in range(W):
      row=(y-50)//5; ox=(row%2)*4
      if (y-50)%5==0 or (x+ox)%8==0: c.px(x,y,'#9a9284')
      elif (x*7+y*13)%41==0: c.px(x,y,'#cfc8ba')
  # 뒤 띠: 항구 도시 집들 (알록달록 벽·세모 지붕·창문) + 창고
  x=0; HC=[('#f2d6a0','#c0503c'),('#a8d0e8','#3c5a8c'),('#f4f0e6','#2f7a6a'),('#f0b8a8','#8a3c3c'),('#e8e0a0','#5a6a3a')]
  i=0
  while x<W:
    w=R.choice([18,22,26]); hh=R.choice([20,24,28]); wall,roof=HC[i%5]; i+=1
    top=50-hh
    c.rect(x,top,w,hh,wall); c.rect(x,top,1,hh,'#6a5a4a'); 
    for k in range(7): c.rect(x-1+k,top-k,w+2-2*k,1,roof)
    for wy in range(top+4,48,8):
      for wx in range(x+3,x+w-4,7): c.rect(wx,wy,3,4,'#4a6a8a'); c.px(wx,wy,'#cfe4f4')
    c.rect(x+w//2-2,44,4,6,'#6a4a30')
    x+=w
  for x in range(W): c.px(x,50,'#5a5248')
  # 가로등·나무 상자·통·그물
  for lx in (40,100,160):
    for y in range(64,84): c.px(lx,y,'#3a3a44')
    c.rect(lx-2,61,5,3,'#fff2a8')
  for (x,y) in [(60,110),(66,110),(63,104)]: c.rect(x,y,6,6,'#a8744a'); c.rect(x,y,6,1,'#7d5233'); c.rect(x,y+3,6,1,'#7d5233')
  for (x,y) in [(150,96),(156,98)]: c.rect(x,y,5,7,'#8a5a30'); c.rect(x,y+2,5,1,'#4a3a2a'); c.rect(x,y+5,5,1,'#4a3a2a')
  c.blot(110,130,8,'#6a8a6a',3)
  # 부둣가 돌 축대 + 계선주 (바다와 경계)
  QY=156
  for x in range(92):
    for y in range(QY-4,QY+4): c.px(x,y,'#7a7266' if ((x//6)+(y//4))%2 else '#6a6258')
    c.px(x,QY-5,'#d0c8b8')
  for bx in range(14,90,26): c.rect(bx,QY-9,4,5,'#3a3a44'); c.rect(bx-1,QY-10,6,2,'#4a4a55')
  # 바다 (아래 넓게)
  SEA=['#5cb4e2','#4aa2da','#3a90d0','#2f7fc4','#256aae']
  for x in range(W):
    for y in range(QY+4,QY+6): c.px(x,y,'#ffffff')   # 축대에 부딪는 물거품 (움직임 자리)
    grad(c,x,QY+6,H,SEA)
  # 왼쪽 방파제 + 등대
  for y in range(QY+4,214): c.rect(12,y,28,1,'#8a8478' if y%4 else '#6a6458')
  c.blot(26,214,16,'#5a5a62',7); c.blot(26,212,12,'#74747e',5)
  for y in range(150,208):
    t=(y-150)/58; w=int(8+t*6)
    for x in range(26-w//2,26+w//2+1):
      band=((y-150)//10)%2
      c.px(x,y,('#e8484a' if band else '#f4f0ea') if x<26+w//2-1 else ('#b83234' if band else '#cfc8c0'))
  c.rect(20,146,13,4,'#3a3a44'); c.rect(22,138,9,8,'#fff2a8'); c.rect(23,139,2,6,'#ffffff')
  c.rect(21,134,11,4,'#c03a3c'); c.rect(25,131,3,3,'#3a3a44')
  # 오른쪽 나무 부두 + 배 두 척
  for y in range(QY,270): c.rect(66,y,18,1,'#a8744a' if (y%4) else '#7d5233')
  for y in range(QY+6,272,10): c.rect(65,y,1,5,'#5c3b22'); c.rect(84,y,1,5,'#5c3b22')
  def boat(cx,cy,col):
    for y in range(cy-6,cy+6):
      w=16-abs(y-cy)
      c.rect(cx-w//2,y,w+10,1,col if y<cy else '#ffffff')
    c.rect(cx+3,cy-18,1,12,'#5a4030')
    for k in range(10): c.rect(cx+4,cy-17+k,max(1,int(8-k*0.7)),1,'#f4f0ea')
  boat(96,236,'#e8584a'); boat(46,262,'#3c6ab0')
  # 오른쪽 모래사장: 산책길 아래 방파제·계단으로 내려가고, 물가는 완만한 곡선
  WY=118   # 방파제 위
  def sh(x): return round(158+(x-88)*.42+math.sin(x*.06)*3)          # 물가 (왼쪽 축대 끝에서 오른쪽 아래로)
  def lx(y): return 88-round((y-WY)*.15)                                 # 모래 왼쪽 끝 (축대·바위 쪽)
  for x in range(80,W):
    for y in range(WY,WY+6): c.px(x,y,'#8a8276' if ((x//6)+(y//3))%2 else '#7a7266')   # 방파제 벽
    c.px(x,WY-1,'#d0c8b8')
  for k in range(6): c.rect(128+k*0,WY+k,10,1,'#b8b0a2' if k%2 else '#9a9284')       # 계단
  SAND=['#f2e2b0','#ead6a0','#e2ca90']
  for y in range(WY+6,H):
    for x in range(lx(y),W):
      d=sh(x)-y
      if d>0:
        k=min(2,(y-WY)//22); col=SAND[k]
        if (x*31+y*17)%29==0: col='#d4bc84'
        if d<=8: col='#d2bb84' if d>3 else '#c2a872'      # 젖은 모래
        c.px(x,y,col)
      elif d>-3: c.px(x,y,'#ffffff')                     # 파도 거품 (움직임 자리)
      elif d>-14:                                       # 얕은 물
        t=(-d-3)/11; c.px(x,y,'#7fd4e6' if t<.35 else ('#68c4e2' if t<.7 else '#5cb4e2'))
  for y in range(WY+6,H):   # 축대 끝 바위
    x=lx(y)
    if y<sh(x)+6: c.blot(x,y,2,'#6a6458',1.5)
  for i in range(10):
    x=110+R.random()*68; y=WY+12+R.random()*40
    if y<sh(int(x))-10: c.px(x,y,'#f2a07a'); c.px(x+1,y,'#f2a07a'); c.px(x,y+1,'#f5f0e8')
  c.rect(156,128,1,16,'#6a5040')
  for k in range(6): c.rect(156-8+k,122+k,17-2*k,1,'#f0b030' if k%2 else '#ffffff')
  # 바다 반짝 자리
  for i in range(30):
    x,y=R.random()*W,175+R.random()*120; c.rect(x,y,3,1,'#9ad8f4')
  return c.im
# ---------- 놀이공원 (큰 놀이기구 없음) ----------
def park():
  c=C(); R=random.Random(11)
  # 보도블록 바닥
  c.rect(0,58,W,H-58,'#c9a98e')
  for y in range(58,H):
    for x in range(W):
      row=(y-58)//6; ox=(row%2)*6
      if (y-58)%6==0 or (x+ox)%12==0: c.px(x,y,'#a8876e')
      elif (x*7+y*13)%37==0: c.px(x,y,'#d8bca2')
  # 가운데 넓은 광장 원 무늬 (분수 자리 아님, 바닥 무늬)
  for a in range(360):
    for r in (40,41):
      c.px(90+math.cos(a/57.3)*r,190+math.sin(a/57.3)*r*.5,'#b88e72')
  # 뒤 담장 + 화단 줄 + 작은 가게 지붕(차양) 실루엣
  for x in range(W):
    for y in range(36,52): c.px(x,y,'#e9e1d2' if (x//6)%2 else '#d8cfc0')   # 담 판
    c.px(x,35,'#8a7a6a'); c.px(x,52,'#6a5a4a')
    for y in range(53,58): c.px(x,y,'#3f8a34' if (x+y)%3 else '#5aa23a')      # 화단
  for (x0,col) in [(8,'#e8584a'),(64,'#4a8ae8'),(120,'#f0b030')]:   # 작은 매점 차양
    for y in range(22,36):
      for x in range(x0,x0+44):
        c.px(x,y,col if ((x-x0)//6)%2 else '#ffffff')
    for x in range(x0,x0+44,6): c.px(x+3,36,col)
  # 깃발 줄 (움직임 자리)
  for x in range(W):
    y=18+round(4*math.sin(x/180*math.pi*2)**2)
    c.px(x,y,'#5a4a3a')
    if x%8<5: 
      for k in range(1,1+ (5 - abs(x%8-2)*2) ): c.px(x,y+k,['#ff5a5a','#ffd23a','#5ac8ff','#7ae05a'][(x//8)%4])
  # 가로등 자리
  for x in (4,60,118,176):
    for y in range(8,58): c.px(x,y,'#4a4a55')
    c.rect(x-2,6,5,3,'#fff2a8')
  # 벤치 몇 개·화분
  for (x,y) in [(20,120),(150,250)]: c.rect(x,y,16,3,'#9a6a40'); c.rect(x+1,y+3,2,3,'#5a4030'); c.rect(x+13,y+3,2,3,'#5a4030')
  return c.im
out='/tmp/claude-0/maps/'
ims={'volcano':volcano(),'cave':cave(),'beach':beach(),'park':park()}
for k,im in ims.items(): im.save(out+f'init_{k}.png')
S=Image.new('RGBA',(190*4,300),(120,180,240,255))
for i,k in enumerate(ims): S.alpha_composite(ims[k],(i*190,0))
S.resize((S.width*2,600),Image.NEAREST).save(out+'init_sheet.png')
