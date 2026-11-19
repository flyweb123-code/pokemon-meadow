# 항구 도시 합치기: 도시 쪽 250, 등대 포함 바닷가(왼쪽) 350, 해변(오른쪽) 250, 해변 위 등대 지움 (경완 11-19)
import sys
from PIL import Image
d=sys.argv[1]
A=Image.open(d+'/beach_250.png').convert('RGBA'); B=Image.open(d+'/beach_350.png').convert('RGBA')
out=A.copy(); pa=A.load(); pb=B.load(); po=out.load()
# 1) 250 해변 위 등대 지우기: 25px(계선주 간격) 왼쪽 칸을 복사
for y in range(100,158):
  for x in range(141,173):
    sx=x-25 if x<167 else x-50
    po[x,y]=pa[sx,y]
# 2) 왼쪽 바닷가: 350 의 축대(y 147~) 를 250 축대 자리(y 135)로 12px 올려 붙임
DY=12
def seam(y): return 86 if y<200 else 116
for y in range(135,300):
  sy=min(299,y+DY)
  if y+DY>299: sy=276+((y+DY-300)%12)
  for x in range(0,seam(y)):
    po[x,y]=pb[x,sy]
  # 이음매 바다는 3px 디더로 섞기
  for k in range(1,4):
    x=seam(y)-1+k
    if x<180 and (x+y)%(k+1)==0: po[x,y]=pb[x,sy]
out.save(sys.argv[2])
# 3) 250 옛 부두 그늘(이음매 오른쪽 짙은 파란 줄) 지우기: 어두운 칸은 오른쪽 바다 칸으로
out=Image.open(sys.argv[2]); po=out.load()
lum=lambda c:(c[0]*3+c[1]*6+c[2])/10
for y in range(140,215):
  for x in range(84,100):
    if x>=seam(y) and lum(po[x,y])<120 and po[x,y][2]>po[x,y][0]+30:
      for dx in range(6,30,2):
        c=pa[min(179,x+dx),y]
        if lum(c)<120: continue
        po[x,y]=c; break
out.save(sys.argv[2])
# 4) 오른쪽 아래 바다: 250 얕은 물이 끝나는 곳부터는 350 깊은 바다로 (밝기 차 이음매 없앰)
out=Image.open(sys.argv[2]); po=out.load()
for x in range(116,180):
  y0=None
  for y in range(170,296):
    if all(lum(pa[x,y+k])<118 and pa[x,y+k][2]>pa[x,y+k][0]+40 for k in range(4)): y0=y; break
  if y0 is None: continue
  for y in range(y0,300):
    sy=min(299,y+DY)
    if y+DY>299: sy=276+((y+DY-300)%12)
    if y==y0 and x%2: continue
    po[x,y]=pb[x,sy]
out.save(sys.argv[2])
