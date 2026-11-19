# 항구 도시: 바다 왼쪽 아래 작은 돌(파도가 부딪히던 것) 지움 + 해변 모래 질감·작은 불가사리·조개
# (경완 '바다 좌 하단에 작은 돌에 파도 부딪히는 효과 없애주고, 해변에 모래 질감하고 작은 불가사리 같은거 추가해줘')
import sys, random, math
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load(); W,H=im.size
Z=Image.open(sys.argv[2]).convert('RGBA').load()     # harbor_zones.png (해변 = 255,220,0)
hx=lambda s:tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
# 1) 작은 돌 (33~34, 288) → 같은 줄 8칸 옆 바다 무늬
for x in (33,34): p[x,288]=p[x-8,288]
# 2) 모래 질감: 마른 모래 eecfa5 · 젖은 모래 dfb672 위에 낟알(밝은 점·어두운 점, 가끔 2칸)을 뭉쳐 듬성듬성
DRY,WET=hx('eecfa5'),hx('dfb672')
SH={DRY:(hx('f6e0bc'),hx('e2bd8c')),WET:(hx('e8c488'),hx('cfa060'))}
rnd=random.Random(5)
def noise(x,y): return math.sin(x*.31+y*.17)+math.sin(x*.07-y*.23+1.3)*.8+math.sin((x+y)*.13)*.5
beach=lambda x,y: 0<=x<W and 0<=y<H and Z[x,y][:3]==(255,220,0)
for y in range(H):
  for x in range(W):
    c=p[x,y]
    if not beach(x,y) or c not in SH: continue
    n=noise(x,y); r=rnd.random()
    if r < .035+.05*max(0,n): p[x,y]=SH[c][1]                       # 어두운 낟알 (뭉친 곳에 더)
    elif r > .975-.03*max(0,-n):                                       # 밝은 낟알
      p[x,y]=SH[c][0]
      if rnd.random()<.3 and beach(x+1,y) and p[x+1,y]==c: p[x+1,y]=SH[c][0]
# 물결 자국(바람 무늬): 마른 모래에 짧은 가로 줄 몇 개
for _ in range(16):
  x=rnd.randint(95,170); y=rnd.randint(132,168); L=rnd.randint(3,6)
  if all(beach(x+i,y) and p[x+i,y] in (DRY,SH[DRY][0]) for i in range(L)):
    for i in range(L): p[x+i,y]=SH[DRY][1] if i not in (0,L-1) else p[x+i,y]
# 3) 작은 불가사리 3마리·조개 2개 (마른 모래, 물거품에서 멂)
STAR=['..o..','ooooo','.ooo.','.o.o.']
def star(cx,cy,base,hi,dk):
  for j,row in enumerate(STAR):
    for i,ch in enumerate(row):
      if ch=='o': p[cx+i-2,cy+j-1]=hx(dk if (j==3 or i in (0,4)) else hi if (i==2 and j<=1) else base)
  p[cx,cy+1]=hx(hi)
  for i in (-2,-1,0,1,2): 
    if beach(cx+i,cy+3) and p[cx+i,cy+3]==DRY: p[cx+i,cy+3]=SH[DRY][1]   # 밑 그늘
star(108,142,'e8704c','f4a070','b84a36')
star(156,152,'f08aa0','f8b8c4','c05c74')
star(130,166,'e8704c','f4a070','b84a36')
def shell(cx,cy):
  for (dx,dy,c) in [(0,0,'f4ece0'),(1,0,'f4ece0'),(-1,1,'e8dccc'),(0,1,'fffaf2'),(1,1,'f4ece0'),(2,1,'d8c8b4'),(0,2,'d8c8b4'),(1,2,'d8c8b4')]:
    p[cx+dx,cy+dy]=hx(c)
shell(122,136); shell(167,141)
im.save(sys.argv[3])
