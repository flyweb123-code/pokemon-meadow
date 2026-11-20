# 동굴 바탕 v3 (경완 '동굴 벽면에 저 하늘색 같은건 없애봐. 호수 크기 좀 줄여봐')
# cave_v2.py 의 cave2_base 에서 시작하지 않고 200 원본부터: 버섯·광차 지우기는 v2 와 같고,
#  1) 벽 하늘색 금 = 둘레 돌 색으로 메움  2) 200 호수 = 위 바닥을 레일 기울기 (−22,−90) 로 옮겨 이어 붙임(이음선은 차이 가장 작은 길)
#  3) 350 호수를 왼쪽·아래로 (−24,+34) 밀어 놓아 보이는 크기를 줄임 (모양은 그대로)
import json, math, subprocess
from PIL import Image
exec(open('cave_v2.py').read().split('# 4) 호수')[0].replace("A.save('cave2_base.png')",''))
W,H=A.size
# 1) 벽 하늘색
def cyan(c): return c[1]>120 and c[2]>150 and c[0]<140
mask=set()
for y in range(0,70):
  for x in range(W):
    if cyan(a[x,y]): mask.add((x,y))
grow=set()
for (x,y) in mask:
  for dx in (-1,0,1):
    for dy in (-1,0,1):
      q=(x+dx,y+dy)
      if 0<=q[0]<W and 0<=q[1]<70 and q not in mask:
        c=a[q]
        if c[2]>c[0]+12 and c[2]>c[1]: grow.add(q)
mask|=grow
wallpal=sorted({a[x,y][:3] for x in range(W) for y in range(0,62) if (x,y) not in mask and not cyan(a[x,y]) and not (a[x,y][2]>a[x,y][0]+12)},key=lum)
left=set(mask)
while left:
  nxt=set()
  for (x,y) in left:
    nb=[a[x+dx,y+dy] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)) if 0<=x+dx<W and 0<=y+dy<70 and (x+dx,y+dy) not in left]
    if len(nb)>=2:
      nb.sort(key=lum); c=nb[len(nb)//2]; nxt.add(((x,y),c))
  if not nxt: break
  for (q,c) in nxt: a[q]=c; left.discard(q)
# 2) 200 호수 지우기
DX,DY=-22,-90
O=A.copy(); o=O.load()
def src(x,y,F):
  sx=x+DX if x+DX>=0 else x
  return F[sx,y+DY]
def diff(c,d): return sum(abs(c[i]-d[i]) for i in range(3))
# 위 이음선: y 168~184 사이 가로 길
Y0,Y1=168,184
cost=[[diff(o[x,y],src(x,y,o)) for y in range(Y0,Y1+1)] for x in range(W)]
N=Y1-Y0+1; acc=[cost[0][:]]; back=[]
for x in range(1,W):
  row=[];bk=[]
  for j in range(N):
    best=min((acc[-1][k],k) for k in (j-1,j,j+1) if 0<=k<N); row.append(best[0]+cost[x][j]); bk.append(best[1])
  acc.append(row); back.append(bk)
j=min(range(N),key=lambda k:acc[-1][k]); seam=[0]*W; seam[W-1]=j
for x in range(W-1,0,-1): j=back[x-1][j]; seam[x-1]=j
seam=[Y0+s for s in seam]
# 왼쪽 세로 이음선 (x<22 는 위 그대로 옮김): x 6~40 사이 세로 길 — 블록마다
for y in range(Y0,H):
  for x in range(W):
    if y>seam[x]:
      a[x,y]=src(x,y,a) if x+DX>=0 else a[x,y+DY]
# x=22 근처 세로 이음 고르기: 두 후보(왼쪽은 dx 0, 오른쪽 dx −22) 중 더 비슷한 열에서 갈아탐
for y in range(Y0,H):
  if y<=min(seam): continue
  best=min(range(22,40),key=lambda x: diff(a[x,y+DY],a[x+DX,y+DY]) if y+DY>=0 else 0)
  for x in range(22,best): a[x,y]=a[x,y+DY] if y+DY>=0 else a[x,y]
A.save('/tmp/claude-0/th/cave/v3_floor.png')
# 3) 350 호수 밀어 놓기
OX,OY=-24,34
def isw(c): return c[2]>c[0]+25
# 물 = 큰 덩어리만 (물가 풀 포기는 뺌)
from collections import deque
seen=set(); comps=[]
for y in range(146,H):
  for x in range(W):
    if (x,y) in seen or not isw(b[x,y]): continue
    q=deque([(x,y)]); seen.add((x,y)); comp=[]
    while q:
      p=q.popleft(); comp.append(p)
      for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        n=(p[0]+dx,p[1]+dy)
        if 0<=n[0]<W and 146<=n[1]<H and n not in seen and isw(b[n]): seen.add(n); q.append(n)
    comps.append(comp)
water=set(max(comps,key=len))
fl200=sorted({a[x,y][:3] for x in range(0,120) for y in range(80,170)},key=lum)
fl350=sorted({b[x,y][:3] for x in range(0,130) for y in range(146,300) if not isw(b[x,y])},key=lum)
q=lambda lst,f: lst[min(len(lst)-1,max(0,int(f*(len(lst)-1)+.5)))]
rank={c:i/(max(1,len(fl350)-1)) for i,c in enumerate(fl350)}
R=7
for y in range(0,H):
  for x in range(W):
    bx,by=x-OX,y-OY
    if not (0<=bx<W and 146<=by<H): continue
    c=b[bx,by]
    if (bx,by) in water: a[x,y]=c; continue
    d=min((math.hypot(dx,dy) for dx in range(-R,R+1) for dy in range(-R,R+1) if (bx+dx,by+dy) in water),default=99)
    if d<=R:
      # 물가 돌: 350 밝기 순위를 200 바닥 색으로. 바깥쪽 2칸은 어두운 칸만 (금 이어짐)
      nc=q(fl200,rank.get(c[:3],.5))+(255,)
      if d<=R-2 or lum(nc)<lum(a[x,y])-8: a[x,y]=nc
# 4) 남은 하늘·빛 찌꺼기: 벽의 푸른 빛줄기 흔적·흰 점, 바닥 파란 점, 지운 버섯 밑동
lake=set()
for y in range(H):
  for x in range(W):
    bx,by=x-OX,y-OY
    if 0<=bx<W and 146<=by<H and min((abs(dx)+abs(dy) for dx in range(-R-1,R+2) for dy in range(-R-1,R+2) if (bx+dx,by+dy) in water),default=99)<=R+2: lake.add((x,y))
def bad(x,y):
  c=a[x,y]
  if (x,y) in lake: return False
  if y>=60 and abs(x-(126.6+(y-62)*.244))<=10: return False
  if y<64 and (c[2]>c[0]+8 or lum(c)>200): return True
  if c[2]>c[0]+20: return True
  if 44<=x<=68 and 158<=y<=178 and (lum(c)>170 or lum(c)<75 or (c[0]>c[1]+25)): return True
  return False
left={(x,y) for y in range(H) for x in range(W) if bad(x,y)}
print('clean',len(left))
while left:
  nxt=[]
  for (x,y) in left:
    nb=[a[x+dx,y+dy] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)) if 0<=x+dx<W and 0<=y+dy<H and (x+dx,y+dy) not in left]
    if len(nb)>=3: nb.sort(key=lum); nxt.append(((x,y),nb[len(nb)//2]))
  if not nxt: break
  for (p,c) in nxt: a[p]=c; left.discard(p)
A.save('cave3_base.png')
json.dump(dict(off=[OX,OY],seam=seam),open('/tmp/claude-0/th/cave/v3.json','w'))
print('ok', min(seam), max(seam))
