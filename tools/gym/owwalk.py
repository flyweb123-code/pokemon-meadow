# 3칸(서기 아래·위·옆)뿐인 필드 걸음 그림에 걸음 6칸을 만들어 9칸 시트로 (v17.47 경완 마티스 걷는 모션). 사용: python3 owwalk.py 입력.png 출력.png
import sys
from PIL import Image
def bb(F):
    a=F.getchannel('A'); b=a.getbbox(); return b
def shift_region(src, dst, box, dx, dy):
    reg=src.crop(box); 
    # clear area in dst first handled by caller
    dst.alpha_composite(reg,(box[0]+dx,box[1]+dy))
def clear(img, box):
    img.paste((0,0,0,0), box)
def walk_vert(F, side):
    x0,y0,x1,y1=bb(F); yb=y1  # exclusive
    L=4; ly=yb-L
    out=Image.new('RGBA',F.size,(0,0,0,0))
    # body up 1
    body=F.crop((0,0,16,ly)); out.alpha_composite(body,(0,-1))
    mid=8
    lift=(0,ly,mid,yb) if side==0 else (mid,ly,16,yb)
    stay=(mid,ly,16,yb) if side==0 else (0,ly,mid,yb)
    out.alpha_composite(F.crop(lift),(lift[0],ly-1))
    out.alpha_composite(F.crop(stay),(stay[0],ly))
    # fill gap row for stay leg: copy row ly-1 of original stay half
    g=F.crop((stay[0],ly-1,stay[2],ly)); out.alpha_composite(g,(stay[0],ly-1))
    return out
def walk_side(F, k):
    x0,y0,x1,y1=bb(F); yb=y1; L=3; ly=yb-L
    out=Image.new('RGBA',F.size,(0,0,0,0))
    out.alpha_composite(F.crop((0,0,16,ly)),(0,0))
    cx=(x0+x1)//2
    if k==0:
        out.alpha_composite(F.crop((0,ly,cx,yb)),(-1,ly)); out.alpha_composite(F.crop((cx,ly,16,yb)),(cx+1,ly))
        out.alpha_composite(F.crop((cx-1,ly,cx+1,yb)),(cx-1,ly))
    else:
        out.alpha_composite(F.crop((0,ly,16,yb)),(0,ly))
        o2=Image.new('RGBA',F.size,(0,0,0,0)); o2.alpha_composite(out,(0,-1)); o2.alpha_composite(F.crop((0,yb-1,16,yb)),(0,yb-1)); out=o2
    return out
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGBA'); fr=[im.crop((i*16,0,i*16+16,32)) for i in range(3)]
fs=fr+[walk_vert(fr[0],0),walk_vert(fr[0],1),walk_vert(fr[1],0),walk_vert(fr[1],1),walk_side(fr[2],0),walk_side(fr[2],1)]
o=Image.new('RGBA',(16*9,32),(0,0,0,0))
for i,f in enumerate(fs): o.alpha_composite(f,(i*16,0))
o.save(dst)
