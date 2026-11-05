# 지역 폼(알로라·가라르·히스이·팔데아) 배틀 그림 (경완 2026-11-05 '다른 폼 그림 다 받아와줘')
# python3 tools/gym/mkregional.py <pokeemerald-expansion 폴더> <PokeAPI pokemon_species.csv>
#   graphics/pokemon/<종>/<galar|alola|hisui|paldea_*>/ 의 앞·뒤 그림 → mkforms.py 와 같은 160x80 판
#   gym/img/pk/rf/<쇼다운 id>{b}{s}.png + rf.json { id: [번호, 지역, 앞 y 보정, 뒤 y 보정, 2장 움직임] }
import sys, os, json, re
from PIL import Image
PX = sys.argv[1] + '/graphics/pokemon/'; OUT = 'gym/img/pk/rf/'; os.makedirs(OUT, exist_ok=True)
import csv
# 번호: PokeAPI pokemon_species.csv (3번째 인자) 이름 → 번호 (mr-mime → mrmime 처럼 - _ 없앰)
NUM = {r['identifier'].replace('-', '').replace('_', ''): int(r['id']) for r in csv.DictReader(open(sys.argv[2]))} if len(sys.argv) > 2 else {}
def pal(p):
    L = [l for l in open(p).read().split('\n')[3:] if l.strip()]; return [tuple(int(v) for v in l.split()[:3]) for l in L]
def sheet(png, P, two):
    im = Image.open(png); idx = im.load(); H = im.size[1]; out = Image.new('RGBA', (160, 80)); o = out.load()
    for k in range(2 if two and H >= 128 else 1):
        for y in range(64):
            for x in range(64):
                i = idx[x, y + 64 * k]
                if i: o[80 * k + 8 + x, 16 + y] = P[i] + (255,)
    if not two or H < 128: out.paste(out.crop((0, 0, 80, 80)), (80, 0))
    return out
def yoff(png):
    im = Image.open(png); bb = im.crop((0, 0, 64, 64)).point(lambda v: 255 if v else 0).getbbox(); return 64 - bb[3] if bb else 0
rf = {}
for sp in sorted(os.listdir(PX)):
    d0 = PX + sp
    if not os.path.isdir(d0): continue
    for fo in sorted(os.listdir(d0)):
        if not re.match(r'^(alola|galar|hisui|paldea)', fo): continue
        d = f'{d0}/{fo}/'
        fr = d + ('anim_front.png' if os.path.exists(d + 'anim_front.png') else 'front.png'); bk = d + 'back.png'
        if not os.path.exists(fr): continue
        pn = d + 'normal.pal' if os.path.exists(d + 'normal.pal') else d0 + '/normal.pal'
        ps = d + 'shiny.pal' if os.path.exists(d + 'shiny.pal') else d0 + '/shiny.pal'
        if not os.path.exists(bk): bk = fr
        k = (sp + fo).replace('_', '').replace('darmanitangalarstandard', 'darmanitangalar'); Pn, Ps = pal(pn), pal(ps)   # 쇼다운 id
        for side, p in (('', fr), ('b', bk)):
            for s, P in (('', Pn), ('s', Ps)): sheet(p, P, side == '').save(f'{OUT}{k}{side}{s}.png', optimize=True)
        two = Image.open(fr).size[1] >= 128
        rf[k] = [NUM.get(sp.replace('_', ''), 0), fo, yoff(fr), yoff(bk), 1 if two else 0]
json.dump(rf, open(OUT + 'rf.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(rf), 'forms')
