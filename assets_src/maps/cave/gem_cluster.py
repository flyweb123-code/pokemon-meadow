# 보석 무리 = PixelLab 보석 여러 장 겹쳐 놓기 (경완 '모인 보석 같은건 지금 여러개 만들었으니까 겹쳐가면서 만들면')
# 작은 결정은 nearest 로 줄이고 바깥 테두리 #1c1426 한 줄 다시
from PIL import Image, ImageOps
G='pixellab/props/raw/grid_'
OUT=(0x1c,0x14,0x26,255)
def cell(kind,i):
  im=Image.open(G+kind+'.png').convert('RGBA').crop((i%8*32,i//8*32,i%8*32+32,i//8*32+32))
  a=im.split()[3].point(lambda v:255 if v>100 else 0); im.putalpha(a); return im.crop(a.getbbox())
def shrink(im,f):
  w,h=max(1,round(im.width*f)),max(1,round(im.height*f))
  s=im.resize((w,h),Image.NEAREST); s.putalpha(s.split()[3].point(lambda v:255 if v>100 else 0))
  o=Image.new('RGBA',(w+2,h+2)); o.alpha_composite(s,(1,1)); p=o.load(); q=o.copy().load()
  for y in range(h+2):
    for x in range(w+2):
      if q[x,y][3]==0 and any(0<=x+dx<w+2 and 0<=y+dy<h+2 and q[x+dx,y+dy][3] and q[x+dx,y+dy][:3]!=OUT[:3] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): p[x,y]=OUT
  return o.crop(o.getbbox())
# (칸 번호, 크기, 좌우뒤집기, dx, 바닥 dy) — 바닥 y 가 작을수록 뒤라 먼저 그림
LAY=[(0,.6,1,-15,-4),(1,.68,0,14,-5),(2,1,0,0,0),(3,.5,1,-12,4),(4,.45,0,13,4),(3,.32,0,-24,1),(4,.3,1,25,0)]
PICK={'gem_water':[4,36,9,5,25],'gem_moon':[0,21,1,2,8],'gem_thunder':[19,44,34,50,21]}
SC=.8
def cluster(kind):
  parts=[]
  for k,f,fl,dx,dy in LAY:
    f,dx,dy=f*SC,round(dx*SC),round(dy*SC)
    im=cell(kind,PICK[kind][k]); im=ImageOps.mirror(im) if fl else im; im=shrink(im,f) if f<1 else im
    parts.append((dy,dx,im))
  C=Image.new('RGBA',(80,48)); bx,by=40,44
  for dy,dx,im in sorted(parts,key=lambda t:t[0]): C.alpha_composite(im,(bx+dx-im.width//2,by+dy-im.height+1))
  return C.crop(C.getbbox())
if __name__=='__main__':
  for k in PICK: cluster(k).save('gemc_'+k.split('_')[1]+'.png')
