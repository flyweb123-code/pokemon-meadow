# 동굴 v13 층 나누기: 뒤 풍경(band)·종유석(stal)·바닥(floor) 따로 → 시연에서 경완이 위아래로 끌어 자리 정함
# (경완 '내가 필드랑 배경 끌어가지고 위아래로 움직여서 설정할 수 있게 해줘 종유석도') 2026-11-21
# 기본 자리: band 위 = -24, stal 위 = -10, floor 위 = 0 (= v12 cave8_mix 와 같은 그림)
import json
from PIL import Image
PAL={'water':[(15,70,131),(26,107,168),(78,203,239),(190,240,255)],'moon':[(155,40,102),(167,41,115),(254,135,186),(251,228,242)],'thunder':[(150,96,20),(206,140,31),(247,208,44),(254,236,112)]}
ORD=['water','moon','thunder']
# 뒤 풍경: cave7band 63줄 + 아래로 80줄 어두운 거울 (바닥을 내려도 빈칸 안 생기게)
b=Image.open('pixellab/cave7band_200.png').convert('RGB'); q=b.load()
for y in range(56,72):
  for x in range(82,96): q[x,y]=q[x-12,y]
BH=63+80; band=Image.new('RGB',(180,BH)); o=band.load()
for y in range(BH):
  for x in range(180):
    sy=y if y<63 else 62-((y-63)%60)
    c=q[x,sy]
    if y>=57: k=min(1,(y-57)/6); c=tuple(round(c[i]*(1-.6*k)) for i in range(3))
    o[x,y]=c
for y in range(63):
  for x in range(180):
    c=o[x,y]
    if c in ((95,233,173),(64,155,127)):
      p=PAL[ORD[(x//30+(y-24)//12)%3]]; o[x,y]=p[2] if c==(95,233,173) else p[1]
SH={'big':['..L..','.LMD.','LHMMD','LMMDD','.MDD.'],'mid':['.L.','LMD','HMD','.D.'],'sm':['L.','HD']}
for key,x0,y0,sz,haze in json.load(open('cr8.json')):
  p=PAL[key]; m={'D':p[0],'M':p[1],'L':p[2],'H':p[3]}
  for dy,row in enumerate(SH[sz]):
    for dx,ch in enumerate(row):
      if ch=='.': continue
      X,Y=x0+dx,y0+dy+24; base=o[X,Y]; c=m[ch]; o[X,Y]=tuple(round(c[i]*(1-haze)+base[i]*haze) for i in range(3))
band.save('layer_band.png')
# 종유석: cave4 위쪽 밝은 돌만 (투명 판)
st=Image.open('cave4_base.png').convert('RGB').load(); stal=Image.new('RGBA',(180,42),(0,0,0,0)); so=stal.load(); tips={}
for y in range(42):
  for x in range(180):
    c=st[x,y]
    if .3*c[0]+.59*c[1]+.11*c[2]>80 and c[2]>=c[0]: so[x,y]=c+(255,); tips[x]=max(tips.get(x,0),y)
stal.save('layer_stal.png')
sp=[];cur=[]
for x in sorted(tips):
  if cur and x!=cur[-1]+1: sp.append(cur);cur=[]
  cur.append(x)
sp.append(cur)
json.dump([[max(g,key=lambda x:tips[x]),tips[max(g,key=lambda x:tips[x])]+1] for g in sp],open('layer_stal_tips.json','w'))
# 바닥: cave8 바닥(턱 39줄부터) + 아래로 60줄 거울 (바닥을 올려도 빈칸 안 생기게), 위는 투명
f=Image.open('cave8_mix.png').convert('RGB').load(); FH=300+60; fl=Image.new('RGBA',(180,FH),(0,0,0,0)); fo=fl.load()
for y in range(39,FH):
  sy=y if y<300 else 599-y
  for x in range(180): fo[x,y]=f[x,sy]+(255,)
fl.save('layer_floor.png')
print(json.load(open('layer_stal_tips.json')))
