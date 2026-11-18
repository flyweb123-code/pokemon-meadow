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
    for j in range(h):
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
# ---------- 항구 해변 (바다 아래쪽, 넓게) ----------
def beach():
  c=C(); R=random.Random(9)
  ground(c,'#e8d39a',['#e0c88c','#efdcaa','#dcc286'],['#cbb075','#f4e6bc','#c4a66a'],50,3)
  # 뒤 띠: 낮은 방파제 돌담 + 야자수 줄
  for x in range(W):
    for y in range(38,50): c.px(x,y,'#9a8e80' if ((x//5)+(y//4))%2 else '#8a7e70')
    c.px(x,37,'#c8bca8'); c.px(x,50,'#6a6058')
  for px0 in (10,52,98,144,172):
    for y in range(16,46): c.px(px0+(46-y)//8,y,'#8a6038'); c.px(px0+1+(46-y)//8,y,'#6e4a2a')
    tx=px0+4
    for a in range(7):
      t=3.3+a*0.47
      for r in range(13): c.px(tx+math.cos(t)*r,16+math.sin(t)*r*.6+r*r*.03,'#3c9a4a' if r%3 else '#2e7a3a')
  # 바다: 아래 절반 가까이 (y 150~300)
  SEA=['#5cb4e2','#4aa2da','#3a90d0','#2f7fc4','#256aae']
  for x in range(W):
    sh=150+round(math.sin(x*.045)*6+math.sin(x*.13)*2)
    for y in range(sh-6,sh): c.px(x,y,'#c9b37a')      # 젖은 모래
    for y in range(sh,sh+4): c.px(x,y,'#ffffff')      # 파도 거품 (움직임 자리)
    grad(c,x,sh+4,H,SEA)
  # 부두: 오른쪽 모래에서 바다로
  for y in range(120,262):
    c.rect(132,y,18,1,'#a8744a' if (y%4) else '#7d5233')
  for y in range(150,264,10): c.rect(131,y,1,5,'#5c3b22'); c.rect(150,y,1,5,'#5c3b22')
  for (x,y) in [(132,122),(149,122),(132,200),(149,200),(132,258),(149,258)]: c.rect(x-1,y,3,3,'#5c3b22')
  # 작은 배 (부두 옆)
  for y in range(232,244):
    w=14-abs(y-238)
    c.rect(112-w//2,y,w+10,1,'#e8584a' if y<238 else '#ffffff')
  # 바다 반짝 자리·물속 돌
  for i in range(30):
    x,y=R.random()*W,175+R.random()*120; c.rect(x,y,3,1,'#9ad8f4')
  for (x,y,r) in [(30,230,6),(70,275,4)]: c.blot(x,y,r,'#3a7aa8',r*.6)
  # 조개·불가사리
  for i in range(16):
    x,y=R.random()*W,60+R.random()*85
    col=R.choice(['#f5f0e8','#f2a07a','#e8826a','#b9a27a'])
    c.px(x,y,col); c.px(x+1,y,col); c.px(x,y+1,col)
  # 등대: 왼쪽 바다 바위 위 (빛 도는 건 코드로)
  c.blot(26,196,16,'#5a5a62',8); c.blot(26,194,12,'#74747e',6)
  for y in range(128,192):
    t=(y-128)/64; w=int(8+t*6)
    for x in range(26-w//2,26+w//2+1):
      band=((y-128)//10)%2
      c.px(x,y,('#e8484a' if band else '#f4f0ea') if x<26+w//2-1 else ('#b83234' if band else '#cfc8c0'))
  c.rect(20,124,13,4,'#3a3a44'); c.rect(22,116,9,8,'#fff2a8'); c.rect(23,117,2,6,'#ffffff')
  c.rect(21,112,11,4,'#c03a3c'); c.rect(25,109,3,3,'#3a3a44')
  c.rect(23,170,3,5,'#3a3a44'); c.rect(28,150,3,4,'#3a3a44')
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
