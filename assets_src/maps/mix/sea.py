# 항구 도시 합친 판: 바다를 물가 거리로 다시 칠해 잘림선 정리 (경완 'pixellab 합친 판에서 바다 잘림선 어색한 부분들 정리 좀 해줘봐')
# 물가 거품은 250 그대로, 얕은 물 색은 250 팔레트, 깊은 물 색은 350 팔레트, 띠 사이는 Bayer 디더, 띠 경계는 살짝 물결
import sys, math, random
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
A=Image.open(sys.argv[2]).convert('RGBA').load()          # beach_250
src=im.copy().load()
BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
hx=lambda s:tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
lum=lambda c:(c[0]*3+c[1]*6+c[2])/10
blue=lambda c:c[2]>c[0]+40
SH=[hx('7dcade'),hx('63b2d2'),hx('50b1cd')]
DP=[hx('2584c3'),hx('3288ba'),hx('2c81b4'),hx('2579b3'),hx('246eae'),hx('256ea9')]
# 물가 줄: 250 에서 모래 아래 처음 파란 칸
shoreY={}
for x in range(87,180):
  for y in range(124,300):
    c=A[x,y]
    if all(blue(A[x,y+k]) and lum(A[x,y+k])<215 for k in range(5)): shoreY[x]=y; break   # 해변 공 같은 파란 소품은 건너뜀
raw=dict(shoreY)
for x in raw:   # 이웃 7칸 가운데값으로 (해변 공·튀는 칸 무시)
  v=sorted(raw[k] for k in range(max(87,x-3),min(180,x+4))); shoreY[x]=v[len(v)//2]
s87=shoreY[87]
def sy(x): return shoreY[x] if x>=87 else s87-(87-x)*1.25
def band(x,y,d):
  w=math.sin(x*.21+y*.05)*1.6+math.sin(x*.07-y*.11)*2.2      # 띠 경계 물결
  d+=w
  # 얕은 띠: 0~8 SH0, 8~15 SH1, 15~21 SH2, 그 뒤 깊은 물
  edges=[(8,SH[0],SH[1]),(15,SH[1],SH[2]),(22,SH[2],DP[0])]
  for e,a,b in edges:
    if d<e-2: return a
    if d<e+2:
      t=(d-(e-2))/4; return b if t*16>BAY[y&3][x&3]+.5 else a
  # 깊은 물: 줄 높이(y)로 350 색 단계
  k=max(0,min(.999,(y-150)/150))*(len(DP)-2)+ min(1,(d-22)/14)
  k=min(len(DP)-1-.001,k); i=int(k)
  return DP[min(len(DP)-1,i+(1 if (k-i)*16>BAY[y&3][x&3]+.5 else 0))]
for y in range(151,300):
  for x in range(180):
    if x<86 and y<152: continue
    c=src[x,y]
    if not blue(c): continue                      # 모래·축대는 건드리지 않음
    d=y-sy(x)
    if x>=87 and d<0: continue
    if x>=87 and d<6 and lum(A[x,y])>200: continue   # 물가 하얀 거품은 250 그대로
    p[x,y]=band(x,y,d)
# 물결 반짝 (짧은 가로 줄) + 350 의 하얀 물살 둘은 그대로 다시 얹기
random.seed(5)
for i in range(46):
  x=random.randrange(2,176); y=random.randrange(175,296)
  d=y-sy(x)
  if d<26: continue
  for k in range(random.choice([2,3,3,4])):
    if blue(p[x+k,y]): p[x+k,y]=hx('4bb3d3') if y<240 else hx('3e96c3')
for y in range(240,268):
  for x in range(0,70):
    c=src[x,y]
    if lum(c)>150: p[x,y]=c
im.save(sys.argv[3])
