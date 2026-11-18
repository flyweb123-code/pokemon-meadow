# 항구 도시: 산책길에서 해변으로 내려가는 돌계단 하나 (경완 '항구 도시 합친 판에 도시쪽에서 해변으로 내려가는 돌계단 하나만 만들어줘봐')
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
H=lambda s:tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
TOP,TREAD,EDGE,RISE,RISE2,SIDE,SH=H('dbd2c4'),H('d0c5b8'),H('c8beb2'),H('9a928a'),H('7b8080'),H('656c77'),H('dfa06b')
X0,X1=136,149   # 계선주 130·152 사이
y=110
for i in range(4):   # 계단 4칸, 폭은 그대로
  l,r=X0,X1   # 경완 '넓어지지 않게'
  for x in range(l,r+1):
    p[x,y]=TOP; p[x,y+1]=TREAD; p[x,y+2]=EDGE if (x+i)%5 else TREAD
    p[x,y+3]=RISE if (x+i)%7 else RISE2
  for yy in range(y,y+4): p[l-1,yy]=SIDE; p[r+1,yy]=SIDE   # 옆 난간 돌
  y+=4
for x in range(X0-3,X1+4):   # 맨 아래 모래에 닿는 그늘
  if p[x,y][:3]!=SIDE[:3]: p[x,y]=SH
for yy in range(110,y): p[X1+3+(yy-110)//8,yy]=SH if p[X1+3+(yy-110)//8,yy][:3] in [(0xee,0xcf,0xa5),(0xdf,0xa0,0x6b)] else p[X1+3+(yy-110)//8,yy]
im.save(sys.argv[2])
