# 항구 도시 다니는 구역 지도 (같은 180×300): 도시 길·돌계단·해변·바다, 나머지(집·축대·울타리·바위)는 못 감
# (경완 '도시에서 해변으로는 계단 통해서만 내려갈 수 있음. 모래성이당, 바다그다 처럼 해변에만 있는 포켓몬들은 해변에만 있을 수 있음. 물 포켓몬들은 전부 바다에 호수처럼 빠져있는 형태로.')
# 색: 도시 (90,90,90) · 계단 (255,140,0) · 해변 (255,220,0) · 바다 (0,120,255) · 못 감 투명
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load(); W,H=im.size
Z=Image.new('RGBA',(W,H)); z=Z.load()
def flood(seed,ok):
  st=[seed]; seen={seed}
  while st:
    x,y=st.pop(); yield (x,y)
    for X,Y in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
      if 0<=X<W and 0<=Y<H and (X,Y) not in seen and ok(X,Y): seen.add((X,Y)); st.append((X,Y))
ST=(136,110,149,126)                       # stairs.py 의 X0·X1, 4칸 × 4줄
inst=lambda x,y: ST[0]<=x<=ST[2] and ST[1]<=y<=ST[3]
def pave(x,y):
  r,g,b,a=p[x,y]; return a and y>=69 and not inst(x,y) and r>150 and abs(r-g)<22 and -10<r-b<50
def sand(x,y):
  r,g,b,a=p[x,y]; return a and y>=ST[3] and not inst(x,y) and r>185 and g>140 and r-b>35
def sea(x,y):
  r,g,b,a=p[x,y]; return a and y>120 and (b>r+40 or (r>225 and g>235 and b>235))   # 물·물거품
for q in flood((40,90),pave): z[q]=(90,90,90,255)
for q in flood((150,150),sand): z[q]=(255,220,0,255)
for q in flood((60,250),sea): z[q]=(0,120,255,255)
for y in range(ST[1],ST[3]+1):
  for x in range(ST[0],ST[2]+1): z[x,y]=(255,140,0,255)
# 작은 구멍(소품 한 칸·글자 점) 메우기: 같은 구역에 둘러싸인 1~2칸
for _ in range(2):
  for y in range(1,H-1):
    for x in range(1,W-1):
      if z[x,y][3]: continue
      n=[z[x+1,y],z[x-1,y],z[x,y+1],z[x,y-1]]
      for c in set(n):
        if c[3] and n.count(c)>=3: z[x,y]=c; break
Z.save(sys.argv[2])
