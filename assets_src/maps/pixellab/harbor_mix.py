# 항구 도시 합성: 도시·해변 = 250, 등대 포함 바닷가(왼쪽 아래) = 350, 250 의 모래 위 등대는 지움
# python3 harbor_mix.py beach_250.png beach_350.png out.png   (하늘 지운 것 기준)
import sys
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGBA'); b=Image.open(sys.argv[2]).convert('RGBA')
out=a.copy(); o=out.load(); A=a.load(); B=b.load()
# 1) 250 모래 위 등대(x142~162) 지우기: 계선주 간격(24px)만큼 왼쪽 칸으로 덮기
for y in range(96,158):
    for x in range(138,172):
        sx=x-24 if x-24<139 else x-48
        o[x,y]=A[sx,y]
# 2) 350 바다(물 시작 y162)를 250 축대 끝(y141)에 맞춰 21px 올림.
#    경계: 250 의 얕은 물·거품이 시작되는 곳까지 (깊은 물끼리는 색이 거의 같아 이음매가 안 보임)
SH=21
def shallow(c):
    r,g,bb,_=c
    return g>165 or r>110
for yd in range(141,300):
    ys=yd+SH if yd+SH<300 else yd
    if yd<196: s=90
    else:
        s=90
        while s<179 and not shallow(A[s,yd]): s+=1
        if 196<=yd<=224: s=max(s,116)   # 350 의 옆 선착장
    for x in range(s):
        o[x,yd]=B[x,ys]
# 3) 350 등대 윗부분(축대 위로 솟은 곳)만 등대 색으로 골라 붙임 (울타리 갈색·돌 회색 제외)
def lamp(c):
    r,g,bb,_=c
    return min(r,g,bb)>200 or (r>190 and 100<g<190 and bb<110) or (bb>r+40 and bb>90 and r<80)
for ys in range(138,162):
    for x in range(12,46):
        c=B[x,ys]
        if lamp(c): o[x,ys-SH]=c
out.save(sys.argv[3])
