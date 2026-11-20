# 동굴 v4: 소품을 바탕에 찍지 않고 따로 그림 → 시연에서 경완이 직접 배치 (경완 '보석은 벽 쪽에만 있게 해주고, 보석이랑 버섯 테두리 좀 줄여줘. 내가 배치할 수 있게 해줘')
# 출력: props/gem_*.png · props/mush_*.png (테두리 줄인 소품) + cfg4.json (기본 자리)
import json, os
from PIL import Image, ImageOps
from gem_cluster import cluster, shrink, selout, boxq
os.makedirs('props',exist_ok=True)
for k in ('water','moon','thunder'): cluster('gem_'+k).save('props/gem_%s.png'%k)
for i,(n,f) in enumerate([('mush_small_1',0),('mush_small_2',1)]):
  im=Image.open('pixellab/props/%s.png'%n).convert('RGBA'); im=im.crop(im.getbbox()); im=ImageOps.mirror(im) if f else im
  selout(boxq(im,.7)).save('props/mush_%d.png'%i)
c=json.load(open('cfg3.json'))
c.pop('gems',None); c.pop('shrooms',None)
c['sprites']={**{'gem_'+k:'props/gem_%s.png'%k for k in ('water','moon','thunder')},'mush_0':'props/mush_0.png','mush_1':'props/mush_1.png'}
c['gemInfo']={'water':['90,200,255','물의 돌'],'moon':['255,110,210','달의 돌'],'thunder':['255,214,70','천둥의 돌']}
c['gemY']=[68,84]
c['props']=[['gem','water',72,76],['gem','moon',164,77],['gem','thunder',12,78],['mush',0,24,114],['mush',1,164,152],['mush',0,128,264]]
json.dump(c,open('cfg4.json','w'),ensure_ascii=False)
print('ok')
