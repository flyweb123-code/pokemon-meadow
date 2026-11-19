# 항구 도시 바탕 180x300 — 초원 drawBg 방식(큰 얼룩·1x2 잔결·Bayer 디더·외곽선 거의 없음)으로 새로 그림
# 구도 = assets_src/maps/mix/harbor.png (경완 '항구 도시 만든거 기반으로 너가 새로 다시 만들어봐 초원 필드 도트 느낌으로')
import math, sys
from PIL import Image
W,H=180,300
im=Image.new('RGBA',(W,H),(0,0,0,0)); P=im.load()
BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
def px(x,y,c):
  x,y=int(round(x)),int(round(y))
  if 0<=x<W and 0<=y<H: P[x,y]=hx(c) if isinstance(c,str) else c
def rect(x,y,w,h,c):
  for j in range(int(h)):
    for i in range(int(w)): px(x+i,y+j,c)
def dk(c,k):
  c=hx(c); return tuple(int(v*k) for v in c[:3])+(255,)
def dith(x,y,a): return a*16>BAY[y&3][x&3]+.5
seed=[11]
def R():
  seed[0]=(seed[0]*16807)%2147483647; return seed[0]/2147483647
def ramp(x,y,t,cols):   # t 0..1 → 색 단계 (디더)
  k=max(0,min(.999,t))*(len(cols)-1); i=int(k)
  return cols[min(len(cols)-1,i+(1 if dith(x,y,k-i) else 0))]
def blot(cx,cy,rx,col,test=None):
  ry=rx*.45
  for y in range(int(-ry),int(ry)+1):
    for x in range(int(-rx),int(rx)+1):
      d=(x/rx)**2+(y/ry)**2
      X,Y=int(cx+x),int(cy+y)
      if d<1 and ((x+y+99)&1 or d<.6) and (test is None or test(X,Y)): px(X,Y,col)

# ---- 구역 ----
PROM_B=lambda x: 133 if x<85 else 110          # 산책길 아래 끝
def shore(x): return 160+(x-86)*.36+math.sin(x*.09)*2.5   # 모래 물가 (오른쪽으로 갈수록 아래)
def beach(x,y): return x>=87 and 124<=y<shore(x)
def sea(x,y): return (x<86 and y>=152) or (x>=86 and y>=shore(x))

# ---- 1) 산책길: 초원처럼 밝은 바탕 + 큰 얼룩 두 색 + 판석 줄 + 잔결 ----
STONE,ST1,ST2='#d6cdbd','#cec4b2','#ddd5c7'
for y in range(62,134):
  for x in range(W):
    if y<PROM_B(x): px(x,y,STONE)
onP=lambda x,y: 62<=y<PROM_B(x)
for i in range(22): blot(R()*W,66+R()*62,8+R()*14,ST1 if R()<.5 else ST2,onP)
for y in range(62,134):        # 큰 판석: 가로 줄 13px, 세로 줄 엇갈림, 줄은 연한 회색 1px (외곽선 대신)
  for x in range(W):
    if not onP(x,y): continue
    row=(y-62)//13; ox=(row%2)*9
    if (y-62)%13==0 or (x+ox)%18==0: px(x,y,'#bfb4a2' if (x+y)%5 else '#c6bba9')
for i in range(500):           # 잔결 (초원 풀결처럼 1x2)
  x,y=R()*W,63+R()*70
  if onP(int(x),int(y)) and onP(int(x),int(y)+1):
    c='#c2b8a6' if R()<.6 else '#e4ddd0'; px(x,y,c); px(x,y+1,c)
for x in range(W):             # 산책길 끝 밝은 턱
  b=PROM_B(x); px(x,b-1,'#e8e1d4'); px(x,b-2,'#e0d8ca')

# ---- 2) 집 줄 (위 띠, 초원 숲 줄 자리) ----
HOUSES=[(0,26,'#f4d48e','#d8603e','#a84230'),(26,30,'#f6f0e4','#e07a44','#b0522c'),(56,24,'#f0b8a8','#4f86c6','#365e96'),(80,28,'#bcdcec','#d8603e','#a84230'),(108,24,'#f6f0e4','#5e9a74','#3e6e52'),(132,26,'#f4d48e','#e07a44','#b0522c'),(158,22,'#f0c4c8','#4f86c6','#365e96')]
for i,(x0,w,wall,roof,roofD) in enumerate(HOUSES):
  top=12+(i*5)%7; eave=top+16; base=63
  for y in range(eave,base):                  # 벽: 아래로 살짝 어둡게 (디더)
    for x in range(x0,x0+w):
      t=(y-eave)/(base-eave)*.6+(0.35 if x<x0+2 else 0)
      px(x,y,ramp(x,y,t,[wall,dk(wall,.92),dk(wall,.82)]))
  for y in range(eave,base): px(x0+w-1,y,dk(wall,.74))   # 집 사이 그늘 1줄
  RH=15
  for k in range(RH):                          # 지붕: 사다리꼴(유럽 항구 집), 기와 줄 3칸마다, 오른쪽 디더 그늘
    y=eave-1-k; inset=int(k*.62)
    for x in range(x0-2+inset, x0+w+2-inset):
      t=(x-(x0-2+inset))/max(1,(w+4-2*inset))
      c=ramp(x,y,t*.95,[roof,roof,roofD])
      if k%3==0 and k>0: c=roofD if (x+k)%2 else c
      px(x,y,c)
  for x in range(x0-2+int((RH-1)*.62), x0+w+2-int((RH-1)*.62)): px(x,eave-RH,roofD)
  for x in range(x0-1,x0+w+1): px(x,eave,roofD)   # 처마 그늘 1줄
  for wy in ((eave+4,eave+13) if base-eave>24 else (eave+5,)):                         # 창문 (하늘빛, 밝은 칸 하나)
    for wx in range(x0+4,x0+w-5,8):
      rect(wx,wy,4,5,'#5d84a8'); px(wx,wy,'#bfe0f4'); px(wx+1,wy,'#bfe0f4'); rect(wx,wy+5,4,1,'#a99c8a')
  dx=x0+w//2-2; rect(dx,base-8,5,8,['#7a5236','#4f7a62','#8a4a3a'][i%3]); px(dx+3,base-4,'#e8c860')
  if i%3==1: rect(x0+w-8,top-2,3,7,'#9a6a52'); rect(x0+w-9,top-3,5,1,'#7a5040')   # 굴뚝
for x in range(W):                            # 집 밑 그늘 (숲 줄 경계처럼 서서히)
  for y in range(63,68):
    if R()<(1-(y-63)/5)**1.6*.8: px(x,y,'#b8ad9c')
# 집 사이 나무 하나 (초원 나무 느낌의 둥근 잎)
def bush(cx,cy,r):
  for y in range(-r,r+1):
    for x in range(-r,r+1):
      d=(x*x+y*y)**.5/r
      if d<1: px(cx+x,cy+y,ramp(cx+x,cy+y,(y/r+1)/2*.8+(x/r)*.15,['#7cc254','#5aa23a','#3f8a34','#2c5e26']))
bush(106,38,7)

# ---- 3) 해변 쪽 축대 (y 110~123) + 계단 ----
for y in range(110,124):
  for x in range(86,W):
    t=(y-110)/13
    c=ramp(x,y,t,['#9aa0a6','#868c94','#737a84'])
    if (y-110)%5==0 or (x+((y-110)//5)*6)%12==0: c='#6a7079'
    px(x,y,c)
for x in range(86,W): px(x,110,'#b4b8bc')
X0,X1=136,149
for i in range(4):
  y=110+i*4
  for x in range(X0,X1+1):
    px(x,y,'#e8e1d4'); px(x,y+1,'#d6cdbd'); px(x,y+2,'#cec4b2'); px(x,y+3,'#a99e8c')
  for yy in range(y,y+4): px(X0-1,yy,'#868c94'); px(X1+1,yy,'#868c94')
# ---- 4) 왼쪽 울타리 + 축대 (y 133~152) ----
for y in range(136,152):
  for x in range(0,86):
    t=(y-136)/16
    c=ramp(x,y,t,['#9aa0a6','#868c94','#737a84'])
    if (y-136)%5==0 or (x+((y-136)//5)*6)%12==0: c='#6a7079'
    px(x,y,c)
for x in range(0,86): px(x,136,'#b4b8bc')
for x in range(0,86):                       # 나무 난간 (가로 두 줄 + 기둥)
  px(x,129,'#a8744a'); px(x,130,'#8a5a36'); px(x,126,'#b8845a')
for x in range(4,86,14): rect(x,124,3,12,'#b8463a'); rect(x,124,1,12,'#d86a5a'); rect(x,135,3,1,'#7a2e26')
for y in range(110,152): px(85,y,'#737a84'); px(86,y,'#868c94')   # 모서리 벽

# ---- 5) 모래사장: 초원처럼 큰 얼룩 + 잔결 ----
for y in range(124,H):
  for x in range(87,W):
    if beach(x,y): px(x,y,'#efd8a6')
for i in range(14): blot(90+R()*90,128+R()*60,8+R()*12,'#e8cf98' if R()<.5 else '#f4e2b8',beach)
for i in range(260):
  x,y=87+R()*93,125+R()*80
  if beach(int(x),int(y)) and beach(int(x),int(y)+1):
    c='#d8bc84' if R()<.6 else '#faeccc'; px(x,y,c); px(x,y+1,c)
for x in range(87,W):            # 축대 밑 그늘 띠
  for y in range(124,130):
    if R()<(1-(y-124)/6)**1.5*.8: px(x,y,'#d6b984')
for (x,y,c) in [(118,140,'#f2a07a'),(160,150,'#f5f0e8'),(104,152,'#e8826a'),(172,170,'#f2a07a')]:
  px(x,y,c); px(x+1,y,c); px(x,y+1,c)

# ---- 6) 바다: 얕은 물(물가 따라)→깊은 물 디더, 젖은 모래·거품 ----
SH=['#a6e2ec','#86d2e6','#6cc0e0','#56acd8']
DEEP=['#4a9ad0','#3e88c4','#3476b4','#2c66a4','#245892']
for y in range(124,H):
  for x in range(W):
    if not sea(x,y): continue
    dist=y-(shore(x) if x>=86 else shore(86)-(86-x)*1.25)   # 물가에서 거리 (왼쪽은 축대 밑으로 얕은 물이 가늘어짐)
    if x>=86 and dist<3: px(x,y,'#ffffff' if dist<1.6 or (x+y)&1 else SH[0]); continue
    if dist<26: px(x,y,ramp(x,y,dist/26,SH)); continue
    t=(dist-26)/110
    px(x,y,ramp(x,y,t,DEEP))
for x in range(87,W):            # 젖은 모래 (물가 바로 위 4줄 진한 모래)
  s=int(shore(x))
  for y in range(s-5,s):
    if beach(x,y): px(x,y,'#dcc08a' if y>s-3 or (x+y)&1 else '#e6cc96')
for x in range(0,86):            # 축대 밑 물 그늘
  for y in range(152,156):
    if R()<(1-(y-152)/4)*.8: px(x,y,'#245892')
seed[0]=77
onS=lambda x,y: sea(x,y) and (y-(shore(x) if x>=86 else shore(86)-(86-x)*1.25))>34
for i in range(18): blot(R()*W,190+R()*105,10+R()*16,'#3a82be' if R()<.5 else '#2e70ae',onS)   # 깊은 물 얼룩 (초원 풀 얼룩처럼)
for i in range(40):              # 물결 반짝 (초원 연못처럼 짧은 가로 줄)
  x,y=R()*W,165+R()*130
  if sea(int(x),int(y)) and sea(int(x)+3,int(y)):
    rect(x,y,3,1,'#9ad8f4' if y<230 else '#7ec0e8')
im.save(sys.argv[1])
