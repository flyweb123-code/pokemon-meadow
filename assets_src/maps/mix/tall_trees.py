# 항구 도시: 집 사이 틈 나무 4그루를 키 큰 나무로 새로 (잎 덩이 여러 개·빛 방향 명암·잎 결·디더, 지붕 뒤로 솟게)
# (경완 '좀 높이가 긴 나무들을 퀄 높여서 세워볼까')
# 쓰는 법: python3 tall_trees.py 꾸민판(ec9e0710) 장식전판(c6c3335d) 출력
import sys, math, random
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
O=Image.open(sys.argv[2]).convert('RGBA').load()
W,H=im.size
hx=lambda c:tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
# 1) 예전 둥근 나무 지우기 (화분 잎은 남김)
OLD={hx(c) for c in ['7cc27a','5aa86a','3f8a5a','2f6a46','24402e','6a4a30','4e3622']}
POTS=[4,24,40,52,85,104,122,157,171]
for y in range(10,69):
  for x in range(W):
    if p[x,y] in OLD and not (y>=60 and any(abs(x-q)<=3 for q in POTS)): p[x,y]=O[x,y]
# 둘째·셋째 집 틈은 장식 전에도 나무가 있어 첫째 틈 본보기로 (deco2 와 같게)
for y in range(15,60):
  for x in range(79,92):
    if p[x,y] in OLD or p[x,y][3]==0: p[x,y]=O[x-53,y]
# 2) 뒤 배경 칸 = 하늘(투명) + 뒤 건물 실루엣 색. 나무는 여기에만 그려져 집·화분 뒤로 감
BG={(101,108,119),(120,144,147),(123,128,128),(154,146,138)}
isbg=lambda x,y: y<67 and (p[x,y][3]==0 or p[x,y][:3] in BG)
# 3) 나무
OUT,D2,D1,M,L,HI='1c3426','2a5a3e','367a4c','4c9a58','6cba62','a6dc7c'
BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def tall(cx,base,top,w,seed,lean=0):
  rnd=random.Random(seed)
  L_=Image.new('RGBA',(W,H)); q=L_.load()
  # 잎 덩이: 아래에서 위로, 위로 갈수록 좁게
  hgt=base-8-top; cl=[]
  n=max(8,int(hgt/3.2))
  for i in range(n):
    t=i/(n-1)
    cy=base-10-t*(hgt-4)
    r=w*(.35+.65*math.sin(math.pi*min(1,(1-t)*.8+.2)))*.55+1.6   # 가운데 아래가 가장 넓은 물방울 꼴
    for s_ in (-1,1) if 0<i<n-1 else (0,):
      cl.append((cx+lean*t+s_*r*.5+rnd.uniform(-1,1),cy+rnd.uniform(-1,1),r*(.75 if s_ else 1)))
  def inside(x,y,grow=0):
    best=None
    for (ax,ay,r) in cl:
      e=math.hypot((x-ax),(y-ay)*1.08)-(r+grow+1.0*math.sin(math.atan2(y-ay,x-ax)*5+ax*1.7))
      if e<=0 and (best is None or ay<best[1]): best=(ax,ay,r)
    return best
  # 줄기·가지
  for y in range(base-int(hgt*.45),base+1):
    for k,c in ((0,'5a3a24'),(1,'7a5434'),(2,'3e2818')):
      if y>base-4 or k<2: q[cx+k-1,y]=hx(c)
  for (dx,y0) in ((-1,base-9),(1,base-13)):
    for i in range(4): q[cx+dx*(i//2+1)+(0 if dx<0 else 1),y0-i]=hx('5a3a24')
  for y in range(top-3,base):
    for x in range(int(cx-w-4),int(cx+w+5)):
      c=inside(x,y)
      if c:
        ax,ay,r=c
        lx,ly=(x-ax)/r,(y-ay)/r                     # 덩이 안 자리
        gx=(x-cx-lean*.5)/(w+1); gy=(y-top)/(base-8-top)*2-1   # 나무 전체 자리
        sh=gx*.7+gy*.55-.1                                # 전체: 왼쪽 위가 밝음
        sh+=(lx*.3+ly*.45)*.6                             # 덩이마다 살짝 둥글게
        if ly>.55: sh+=.35                                # 덩이 밑 그늘
        sh+=(BAYER[y%4][x%4]/16-.5)*.15
        TONES=[HI,L,M,D1,D2]
        col=TONES[0 if sh<-.95 else 1 if sh<-.4 else 2 if sh<.15 else 3 if sh<.65 else 4]
        q[x,y]=hx(col)
      elif inside(x,y,1.1): q[x,y]=hx(OUT)
  # 잎 결: 밝은 쪽에 1×2 잎 끝, 어두운 쪽에 짙은 점
  for _ in range(int(w*hgt*.06)):
    x=rnd.randint(int(cx-w),int(cx+w)); y=rnd.randint(top,base-8)
    if q[x,y][3] and q[x,y+1][3] and q[x,y]!=hx(OUT):
      if q[x,y] in (hx(L),hx(M)) and q[x,y-1][:3]!=hx(OUT)[:3]: q[x,y]=hx(HI if q[x,y]==hx(L) else L)
      elif q[x,y] in (hx(D1),hx(D2)): q[x,y]=hx(D2 if q[x,y]==hx(D1) else OUT)
  for y in range(H):
    for x in range(W):
      if q[x,y][3] and (isbg(x,y) or (abs(x-cx)<=1 and y>=base-4 and y<=base)):
        p[x,y]=q[x,y]
tall(32,66,14,8,1,-0.5)
tall(85,66,12,7,2,0.5)
tall(129,66,20,6,3,0)
tall(163,66,18,6,4,0.5)
im.save(sys.argv[3])
