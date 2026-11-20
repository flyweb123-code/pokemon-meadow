# 동굴 v3 소품: PixelLab Pro 보석·야광 버섯(pixellab/props, 맥 20efef5f)을 바탕에 찍음 (경완 '보석하고 버섯 퀄리티 좀 스칼렛 수준으로')
# 출력: cave3_m.png(버섯까지 = 보석 캔 뒤 바탕) · cave3.png(보석까지) · cave3.json(보석·버섯 빛 자리)
import json
from PIL import Image, ImageOps
P='pixellab/props/'
def spr(n,flip=False):
  im=Image.open(P+n+'.png').convert('RGBA'); im=im.crop(im.getbbox())
  return ImageOps.mirror(im) if flip else im
base=Image.open('cave3_base.png').convert('RGBA')
def stamp(img,im,x,y):  # 아래 가운데 = (x,y)
  img.alpha_composite(im,(x-im.width//2,y-im.height+1))
# 야광 버섯 무리 (자리 = 밑동 가운데)
SH=[('mush_big_1',30,108,0),('mush_small_1',114,124,0),('mush_big_2',98,150,1),('mush_small_2',122,270,1),('mush_small_1',80,190,1),('mush_big_1',12,150,1)]
lights=[]
for n,x,y,f in SH:
  im=spr(n,f); stamp(base,im,x,y); lights.append([x,y-im.height*2//3])
base.save('cave3_m.png')
GEMS=[('gem_water_1',85,74,'90,200,255','물의 돌'),('gem_moon_1',160,74,'255,110,210','달의 돌'),('gem_thunder_2',58,166,'255,214,70','천둥의 돌')]
full=base.copy(); gems=[]
for n,x,y,c,name in GEMS:
  im=spr(n); stamp(full,im,x,y)
  gems.append(dict(x=x,y=y,r=im.width//2+2,h=im.height+1,c=c,name=name,sx=0,sy=0))
full.save('cave3.png')
json.dump(dict(gems=gems,shrooms=lights),open('cave3.json','w'),ensure_ascii=False)
c=Image.open(P+'cart_front_1.png').convert('RGBA'); c.crop(c.getbbox()).save('cart3.png')
print(gems,lights)
