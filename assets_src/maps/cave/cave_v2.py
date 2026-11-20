# 동굴 바탕 v2 (경완 '호수 형태는 350이 마음에 듬. 보석들은 벽이 아니라 지금 버섯 있는 위치들 … 모여 있어야 하고. 광차는 레일만 남기고 주기적으로 지나가게 … 야광 버섯들을 빛 엔진 … 천장 빛줄기는 없애줘')
# 쓰는 법: python3 cave_v2.py  →  cave2_base.png(보석 없는 바탕) · cave2.png(보석 넣은 바탕) · cart.png(광차) · shroom.png(버섯) · cave2.json(자리 값)
import json, math
from PIL import Image
A=Image.open('pixellab/cave3_200.png').convert('RGBA'); a=A.load()
B=Image.open('pixellab/cave3_350.png').convert('RGBA'); b=B.load()
W,H=A.size
lum=lambda c: c[0]*.3+c[1]*.59+c[2]*.11
def purple(c): r,g,bb=c[:3]; return bb>g+14 and r>g+14
def capstem(c): r,g,bb=c[:3]; return (r+bb>330 and bb>g+40) or (r>235 and g>235 and bb>235) or (r>100 and r>g+50 and r>bb+30) or (r<70 and g<30 and bb<40)
# 1) 광차·버섯 그림 떼어 두기
cart=A.crop((156,232,182,290)); cart.save('cart.png')
sh=Image.new('RGBA',(34,30)); s=sh.load()
for y in range(30):
  for x in range(34):
    c=a[68+x,46+y]
    if capstem(c): s[x,y]=c
sh=sh.crop(sh.getbbox()); sh.save('shroom.png')
# 2) 버섯·빛 무리 지우기 (둘레 안 물든 색 중 밝기가 가장 가까운 색으로)
def unglow(x0,y0,x1,y1):
  ring=[a[x,y] for x in range(x0-6,x1+6) for y in range(y0-6,y1+6) if 0<=x<W and 0<=y<H and not (x0<=x<x1 and y0<=y<y1) and not purple(a[x,y]) and not capstem(a[x,y])]
  pal=sorted(set(ring),key=lum)
  for y in range(y0,y1):
    for x in range(x0,x1):
      c=a[x,y]
      gray=sum(c[:3])>300 and max(c[:3])-min(c[:3])<45
      blu=c[2]>c[0]+18 and c[1]<150 and y<66
      if capstem(c) or gray or blu or (purple(c) and y<66) or (purple(c) and y>=66 and lum(c)>85):
        a[x,y]=(48,39,50,255) if y<66 else (116,109,118,255)
      elif purple(c):
        t=lum(c)*.82; a[x,y]=min(pal,key=lambda q: abs(lum(q)-t))
unglow(64,42,106,84); unglow(144,38,178,84); unglow(42,142,72,170)
# 3) 광차 지우기: 레일 따라 (−12,−48) 위 그림으로
for y in range(232,292):
  for x in range(154,W):
    a[x,y]=a[x-12,y-48]
# 4) 호수 = 350 (x<136, y>=146): 물은 그대로, 바닥·물가 돌은 200 바닥 색으로 밝기 맞춤
fl200=sorted({a[x,y][:3] for x in range(0,120) for y in range(80,170)},key=lum)
fl350=sorted({b[x,y][:3] for x in range(0,130) for y in range(146,300) if not (b[x,y][2]>b[x,y][0]+25)},key=lum)
q=lambda lst,f: lst[min(len(lst)-1,max(0,int(f*(len(lst)-1)+.5)))]
rank={c:i/(max(1,len(fl350)-1)) for i,c in enumerate(fl350)}
def isw(c): return c[2]>c[0]+25
X1,Y0=136,146
for y in range(Y0,H):
  for x in range(0,X1):
    c=b[x,y]
    if isw(c): a[x,y]=c
    else:
      # 이음매 쪽(위·오른쪽 8칸)은 원래 바닥 그대로, 물가 10칸 안만 350 돌
      near=any(isw(b[xx,yy]) for xx in range(max(0,x-9),min(W,x+10),3) for yy in range(max(0,y-9),min(H,y+10),3))
      if near: a[x,y]=q(fl200,rank.get(c[:3],.5))+(255,)
      elif y>182 or x<0: a[x,y]=a[x,y-110 if y-110>=80 else y]
A.save('cave2_base.png')
print('ok')
