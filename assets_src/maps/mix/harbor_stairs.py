# 항구 도시: 돌 산책길에서 모래 해변으로 내려가는 돌계단 하나 (계선주 사이 x113~126)
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); p=im.load()
H=lambda s:tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
OUT=H('432f37'); CHEEK=H('656c77'); CHEEK_HI=H('789093')
steps=[  # (윗면 밝은 줄, 윗면, 챌판)  아래로 갈수록 조금 어둡게
 ('dbd2c4','d0c5b8','9a928a'),
 ('d6ccbe','cbc0b3','948b82'),
 ('d0c5b8','c5baad','8e857c'),
 ('cbc0b3','bfb4a7','878076'),
]
X0,X1=113,126; Y0=110
y=Y0
for hi,top,ris in steps:
    for x in range(X0+2,X1-1):
        p[x,y]=H(hi); p[x,y+1]=H(top); p[x,y+2]=H(top); p[x,y+3]=H(ris)
    y+=4
yb=y  # 126
for yy in range(Y0,yb+1):
    p[X0,yy]=OUT; p[X1,yy]=OUT
    p[X0+1,yy]=CHEEK_HI if yy<yb else OUT; p[X1-1,yy]=CHEEK if yy<yb else OUT
for x in range(X0,X1+1):  # 맨 아래 그림자, 계단 앞 모래
    p[x,yb]=OUT if x in (X0,X1) else H('c98f5e')
    p[x,yb+1]=H('dfb98a')
for x in range(X0+1,X1):
    if x not in (X0+1,X1-1): p[x,yb]=H('b07e55')
im.save(sys.argv[2])
