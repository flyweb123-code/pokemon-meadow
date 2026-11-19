# 항구 도시 바닥 돌 타일을 반듯한 격자로 다시 깔기 (어긋난 줄눈 정리)
# (경완 '그 다음 이제 도시바닥 타일 경계선 정렬 틀어진 것들 좀 정리 한번 해줘봐')
# 타일 15×10, 줄마다 반 칸(7) 어긋나게 쌓기. 색은 원래 바닥 색 그대로: 면 d0c5b8/c8beb2, 줄눈 가로 ada396·세로 b9ada1, 윗 모서리 빛 dbd2c4
# 바닥 색인 칸만 다시 칠함 → 집 계단·화분·연석(턱)·모서리 벽은 그대로
import sys, random
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
H=lambda s:tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
FACE,FACE2,JH,JV,HI,WORN=H('d0c5b8'),H('c8beb2'),H('ada396'),H('b9ada1'),H('dbd2c4'),H('b9ada1')
PAVE={H(c) for c in ['d0c5b8','c8beb2','ada396','b9ada1','dbd2c4','9a928a']}
TW,TH,Y0=15,10,69
def region(x,y):
  if x<=81: return Y0<=y<=128
  if x>=82: return Y0<=y<=108      # 모서리 벽(x 82~85)은 해변 높이(109~)부터만
  return False
rnd=random.Random(7)
tex={}
for y in range(Y0,129):
  for x in range(180):
    if not region(x,y) or p[x,y] not in PAVE: continue
    r=(y-Y0)//TH; ty=(y-Y0)%TH; off=7 if r%2 else 0; c=(x+off)//TW; tx=(x+off)%TW
    k=(r,c)
    if k not in tex: tex[k]=rnd.choice([0,0,1,1,2])     # 0 매끈 · 1 체크 결 · 2 성긴 결
    last = (x<=81 and r==5) or (x>=86 and r==3)       # 맨 아랫줄은 연석 빛줄이 줄눈 대신
    if ty==TH-1 and not last: col=JH
    elif tx==TW-1: col=JV
    elif ty==0: col=HI if tx<TW-3 else FACE
    else:
      t=tex[k]
      col=FACE if t==0 else (FACE2 if (x+y)%2 else FACE) if t==1 else (FACE2 if (x%3==0 and y%2==0) else FACE)
      if tx==0 and t!=0: col=FACE
    p[x,y]=col
im.save(sys.argv[2])
