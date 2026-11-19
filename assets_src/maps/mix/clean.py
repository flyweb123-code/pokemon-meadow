# 항구 도시: 바다 위 등대·부두·선착장 빼기, 바다로 내려가는 계단 없애고 울타리·축대 이어 붙이기, 도시 쪽 화분 빼기
# (경완 '바다 위에 있는 등대랑 다리 다 빼줘봐 바다로 내려가는 계단 없애고 울타리 연장. 도시 쪽에 있는 화분 다 빼줘')
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load(); src=im.copy(); s=src.load()
# 1) 화분 5개: 산책길 타일 한 칸(13px) 왼쪽을 복사
for x0 in (76,101,126,150,172):
  for y in range(92,109):
    for x in range(x0,min(180,x0+11)): p[x,y]=p[x-13,y]   # 이미 지운 칸을 원본 삼아 (옆 화분이 따라오지 않게)
# 2) 울타리·축대 (등대 머리·계단 자리): x 42~65 칸을 왼쪽 끝부터 84 까지 되풀이
for y in range(131,153):
  for x in range(0,84):
    if 42<=x<66: continue
    p[x,y]=s[42+((x-42)%24),y]
# 3) 바다: 등대·부두·선착장 자리를 같은 줄의 깨끗한 바다로 (40px 간격으로 찾음)
sea=lambda c: c[2]>c[0]+60 and (c[0]*3+c[1]*6+c[2])/10<150
def inmask(x,y):
  return (4<=x<=47 and 150<=y<=214) or (61<=x<=88 and 150<=y<=264) or (80<=x<=117 and 198<=y<=238)
for y in range(151,300):
  for x in range(0,118):
    if inmask(x,y):
      c=s[48+(x%12),y]; k=6
      while not sea(c) and k<60: c=s[48+(x%12),min(299,y+k)]; k+=6   # 물거품·갈색 물결은 건너뜀
      p[x,y]=c   # 등대·부두 사이 깨끗한 깊은 바다 띠(x 48~59)
# 3b) 축대 밑 갈색 물결 줄 지우기
q0=im.copy().load()
for y in range(151,178):
  for x in range(0,89):
    if not sea(q0[x,y]) and q0[x,y][2]<=q0[x,y][0]+40:
      for k in range(4,40,4):
        c=q0[x,min(299,y+k)]
        if sea(c): p[x,y]=c; break
# 4) 왼쪽 깊은 바다와 오른쪽 얕은 물(250) 사이 세로 경계를 디더로 섞음
BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
q=im.copy().load()
for y in range(150,214):
  for x in range(60,89):
    t=(x-60)/29*(1-(y-150)/64)
    c=q[89+((x-60)%8),y]
    if t*16>BAY[y&3][x&3]+.5 and c[2]>c[0]+40: p[x,y]=c
im.save(sys.argv[2])
