# 동굴 v3 소품: PixelLab Pro 보석·야광 버섯(pixellab/props, 맥 20efef5f)을 바탕에 찍음 (경완 '보석하고 버섯 퀄리티 좀 스칼렛 수준으로')
# 출력: cave3_m.png(버섯까지 = 보석 캔 뒤 바탕) · cave3.png(보석까지) · cave3.json(보석·버섯 빛 자리)
import json
from gem_cluster import shrink, cluster
from PIL import Image, ImageOps
P='pixellab/props/'
def spr(n,flip=False):
  im=Image.open(P+n+'.png').convert('RGBA'); im=im.crop(im.getbbox())
  return ImageOps.mirror(im) if flip else im
base=Image.open('cave3_base.png').convert('RGBA')
def stamp(img,im,x,y):  # 아래 가운데 = (x,y)
  img.alpha_composite(im,(x-im.width//2,y-im.height+1))
# 야광 버섯 무리 (자리 = 밑동 가운데)
# 경완 '버섯 지금 너무 크고 너무 많고' → 작은 무리 3개, .62배
SH=[('mush_small_1',24,114,0),('mush_small_2',164,152,1),('mush_small_1',128,264,1)]
lights=[]
for n,x,y,f in SH:
  im=shrink(spr(n,f),.62); stamp(base,im,x,y); lights.append([x,y-im.height*2//3])
base.save('cave3_m.png')
# 경완 '보석은 한 덩이씩 있는데 좀 모여있는 느낌으로' → gem_cluster.py 로 여러 장 겹침
GEMS=[('gem_water',60,78,'90,200,255','물의 돌'),('gem_moon',98,140,'255,110,210','달의 돌'),('gem_thunder',40,178,'255,214,70','천둥의 돌')]
full=base.copy(); gems=[]
for n,x,y,c,name in GEMS:
  im=cluster(n); stamp(full,im,x,y)
  gems.append(dict(x=x,y=y,r=im.width//2+2,h=im.height+1,c=c,name=name,sx=0,sy=0))
full.save('cave3.png')
json.dump(dict(gems=gems,shrooms=lights),open('cave3.json','w'),ensure_ascii=False)
c=Image.open(P+'cart_front_1.png').convert('RGBA'); c.crop(c.getbbox()).save('cart3.png')
print(gems,lights)
