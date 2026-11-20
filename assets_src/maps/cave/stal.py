# 종유석 다시 칠하기 (경완 '종유석 퀄리티 좀 높여줘봐') — 모양(실루엣·끝 자리)은 그대로, 명암 5단계·고리 무늬·젖은 끝 반짝임
import sys, random
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGBA'); p=im.load(); W,H=im.size
lum=lambda c: c[0]*.3+c[1]*.59+c[2]*.11
hx=lambda s: tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
Y1=42
M={(x,y) for y in range(Y1) for x in range(W) if lum(p[x,y])>88}
# 덩어리 나누기
seen=set(); comps=[]
for q in sorted(M,key=lambda t:(t[1],t[0])):
  if q in seen: continue
  st=[q]; seen.add(q); c=[]
  while st:
    x,y=st.pop(); c.append((x,y))
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      n=(x+dx,y+dy)
      if n in M and n not in seen: seen.add(n); st.append(n)
  if len(c)>6: comps.append(c)
PAL=[hx(s) for s in ('c2bccc','a59eb4','887f9a','6a627e','4f4864','3a3350')]
OUTC=hx('241c30')
random.seed(7)
for c in comps:
  rows={}
  for x,y in c: rows.setdefault(y,[]).append(x)
  ys=sorted(rows); top,tip=ys[0],ys[-1]; ph=random.randint(0,5)
  for y in ys:
    l,r=min(rows[y]),max(rows[y]); w=max(1,r-l)
    for x in rows[y]:
      u=(x-l)/w; v=(y-top)/max(1,tip-top)
      k=0 if u<.16 else 1 if u<.42 else 2 if u<.7 else 3 if u<.9 else 4
      if r-l<=2: k=1 if x==l else 3
      if (y+ph)%6==0 and .2<u<.85 and y<tip-2: k=min(5,k+1)   # 고리 무늬
      if y-top<2: k=min(5,k+1)                               # 천장 붙은 곳 그늘
      p[x,y]=PAL[k]
  # 젖은 끝: 끝 한두 칸 물빛 + 반짝 한 칸
  tl=rows[tip]; tx=sorted(tl)[len(tl)//2]
  p[tx,tip]=hx('9fd4ec')
  if tip-1 in rows and len(rows[tip-1])>1: p[min(rows[tip-1]),tip-1]=hx('f4fbff')
  # 왼쪽 물기 줄 (한 칸 안쪽, 군데군데)
  for y in ys[2:-2]:
    l,r=min(rows[y]),max(rows[y])
    if r-l>=4 and (y+ph)%3: p[l+1,y]=PAL[0]
  # 바깥 테두리를 진한 보라로 통일
  for x,y in c:
    for dx,dy in ((1,0),(-1,0),(0,1)):
      n=(x+dx,y+dy)
      if 0<=n[0]<W and n[1]<H and n not in M and lum(p[n])<40: p[n]=OUTC
im.save(dst); print(len(comps),'개')
