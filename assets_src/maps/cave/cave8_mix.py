# 동굴 v8: 바닥을 날짜 박스 바로 밑(y40)까지 올림 — 바닥 전체를 24줄 위로, 위 띠는 cave7band 아래 40줄만,
# 종유석(cave4) 다시, 뒤 풍경에 우리 보석(물·달·천둥) 색 결정 (경완 '날짜 박스 아래까진 움직일 수 있게 필드 바닥 영역 확대해주고 뒷 배경에도 우리 보석 색 군데군데 박아줘 종유석 살려주고') 2026-11-21
# python3 cave8_mix.py out.png [noGem]
import sys, json
from PIL import Image
S=24; EDGE=40
b=Image.open('pixellab/cave7band_200.png').convert('RGB'); q=b.load()
for y in range(56,72):
  for x in range(82,96): q[x,y]=q[x-12,y]
f=Image.open('init_cave7.png').convert('RGB'); o0=f.load(); W,H=f.size
out=Image.new('RGB',(W,H)); o=out.load()
for y in range(H):
  for x in range(W):
    sy=y+S
    if sy>=H: sy=2*H-1-sy        # 맨 아래 24줄 = 바로 위를 거울로 (이음선 안 생기게)
    if sy<EDGE+S-1:
      c=q[x,sy]
      if sy>=EDGE+S-6: k=(sy-(EDGE+S-6))/6; c=tuple(round(c[i]*(1-.6*k)) for i in range(3))
    else: c=o0[x,sy]
    o[x,y]=c
# 원래 띠에 있던 초록 결정 → 우리 보석 색 (왼쪽부터 물·달·천둥 돌아가며)
PAL={'water':[(15,70,131),(26,107,168),(78,203,239),(190,240,255)],'moon':[(155,40,102),(167,41,115),(254,135,186),(251,228,242)],'thunder':[(150,96,20),(206,140,31),(247,208,44),(254,236,112)]}
ORD=['water','moon','thunder']
seen={}
for y in range(EDGE-1):
  for x in range(W):
    c=o[x,y]
    if c in ((95,233,173),(64,155,127)):
      key=ORD[(x//30+y//12)%3]; p=PAL[key]; o[x,y]=p[2] if c==(95,233,173) else p[1]
# 종유석: cave4 위쪽 밝은 돌(파란 끝 포함)만, 위로 K줄 올려 짧게
st=Image.open('cave4_base.png').convert('RGB').load(); K=10; tips={}
for y in range(42):
  for x in range(W):
    c=st[x,y]; lum=.3*c[0]+.59*c[1]+.11*c[2]
    if lum>80 and c[2]>=c[0] and y-K>=0:
      o[x,y-K]=c; tips[x]=max(tips.get(x,0),y-K)
# 종유석 바로 밑 그늘 한 줄
if len(sys.argv)<3:
  CR=json.load(open('cr8.json'))
  SH={'big':['..L..','.LMD.','LHMMD','LMMDD','.MDD.'],'mid':['.L.','LMD','HMD','.D.'],'sm':['L.','HD']}
  for key,x0,y0,sz,haze in CR:
    p=PAL[key]; m={'D':p[0],'M':p[1],'L':p[2],'H':p[3]}
    for dy,row in enumerate(SH[sz]):
      for dx,ch in enumerate(row):
        if ch=='.': continue
        X,Y=x0+dx,y0+dy; base=o[X,Y]; c=m[ch]
        o[X,Y]=tuple(round(c[i]*(1-haze)+base[i]*haze) for i in range(3))
json.dump(sorted(tips.items()),open('/tmp/claude-0/th/cave/tips8.json','w'))
out.save(sys.argv[1]); out.resize((W*4,H*4),Image.NEAREST).save(sys.argv[1].replace('.png','_x4.png'))
