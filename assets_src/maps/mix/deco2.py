# 항구 도시: 둘째·셋째 집 사이 뒤 나무(+갈색 간판) 지우고 화분, 뒤 건물 실루엣 위 연기 같은 찌꺼기 지움
# (경완 '여기 뒤에 있는 나무 지워주고 여기도 사이에 화분놔줘. 그리고 뒤에 건물 실루엣들 지붕 위에 연기 나는 것 처럼 보이는 찌꺼기들 지워줘')
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
O=Image.open(sys.argv[2]).convert('RGBA').load()     # 장식 전 판 (첫째·둘째 집 사이 빈 틈을 본보기로)
green=lambda c: c[3]>0 and c[1]>c[0]+8 and c[1]>=c[2]-30
# 1) 둘째 집 지붕 위로 보이던 나무 윗부분 → 하늘(투명)
for y in range(15,32):
  for x in range(60,80):
    if green(p[x,y]) or (p[x,y][3]>0 and p[x,y][:3] in [(36,64,46),(47,90,70)]): p[x,y]=(0,0,0,0)
# 2) 둘째·셋째 집 사이 틈 (x 79~91) = 첫째·둘째 집 사이 틈(x 26~38, 장식 전) 을 그대로
for y in range(15,68):
  for x in range(78,92):
    c=p[x,y]
    roof_or_wall = c[3]>0 and not green(c) and not (60<c[0]<110 and 35<c[1]<75 and 35<c[2]<75) and x<79
    if x==78 and roof_or_wall: continue
    p[x,y]=O[x-53,y]
# 3) 지붕 위 연기 찌꺼기: y<30 회색 작은 덩어리(25칸 미만) 지움
GREY={(123,128,128),(101,108,119),(154,146,138)}
seen=set()
for y0 in range(0,30):
  for x0 in range(180):
    if (x0,y0) in seen or p[x0,y0][3]==0 or p[x0,y0][:3] not in GREY: continue
    st=[(x0,y0)]; comp=[]; seen.add((x0,y0))
    while st:
      x,y=st.pop(); comp.append((x,y))
      for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        X,Y=x+dx,y+dy
        if 0<=X<180 and 0<=Y<40 and (X,Y) not in seen and p[X,Y][3]>0 and p[X,Y][:3] in GREY: seen.add((X,Y)); st.append((X,Y))
    if len(comp)<25:
      for (x,y) in comp: p[x,y]=(0,0,0,0)
im.save(sys.argv[3])
# 3b) 실루엣에 붙은 작은 혹(연기): 열마다 회색 맨 위 줄이 이웃(±4)의 가운데값보다 높으면 그 위 회색을 지움
im=Image.open(sys.argv[3]).convert('RGBA'); p=im.load()
def gtop(x):
  for y in range(0,40):
    c=p[x,y]
    if c[3]>0: return y if c[:3] in GREY else None
  return None
for _ in range(2):
  tops={x:gtop(x) for x in range(180)}
  for x in range(180):
    t=tops[x]
    if t is None: continue
    nb=sorted(v for k in range(max(0,x-4),min(180,x+5)) if (v:=tops[k]) is not None)
    med=nb[len(nb)//2]
    if t<med-1:
      for y in range(t,med):
        if p[x,y][:3] in GREY: p[x,y]=(0,0,0,0)
im.save(sys.argv[3])
# 3c) 연기 색(789093) 덩어리: 위 30줄 안에서 하늘(투명)에 닿아 있는 덩어리는 통째로 지움
im=Image.open(sys.argv[3]).convert('RGBA'); p=im.load()
SM=(0x78,0x90,0x93)
seen=set()
for y0 in range(0,30):
  for x0 in range(180):
    if (x0,y0) in seen or p[x0,y0][3]==0 or p[x0,y0][:3]!=SM: continue
    st=[(x0,y0)]; comp=[]; seen.add((x0,y0)); sky=False
    while st:
      x,y=st.pop(); comp.append((x,y))
      for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        X,Y=x+dx,y+dy
        if not (0<=X<180 and 0<=Y<45): continue
        if p[X,Y][3]==0: sky=True
        elif (X,Y) not in seen and p[X,Y][:3]==SM: seen.add((X,Y)); st.append((X,Y))
    if sky and len(comp)<60:
      for (x,y) in comp: p[x,y]=(0,0,0,0)
im.save(sys.argv[3])
