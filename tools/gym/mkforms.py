# 배틀 중 모습이 바뀌는 폼 (리밋실드·꼬르륵스위치·배틀스위치·탈 등, 경완 2026-10-29 '형태 바뀌는 특성 모션')
# python3 tools/gym/mkforms.py <pokeemerald-expansion 폴더>
#   graphics/pokemon/<종>/<폼>/ 의 2장 그림 → mkexsprites.py 와 같은 160x80 판 gym/img/pk/fm/<쇼다운 id>{b}{s}.png + fm.json (y 보정, 움직임)
#   기본 폼(메테오 등)은 원래 번호 그림을 쓴다. 1~649 (캐스퐁·체리꼬·불비달마·메로엣타)는 게임이 블랙·화이트 gif 를 받는다
import sys, os, json
from PIL import Image
PX = sys.argv[1] + '/graphics/pokemon/'; OUT = 'gym/img/pk/fm/'; os.makedirs(OUT, exist_ok=True)
# 쇼다운 id: (폴더, 일반 팔레트, 이로치 팔레트)
F = {
  'minior': ('minior/core', 'minior/core/red/normal.pal', 'minior/core/shiny.pal'),
  'morpekohangry': ('morpeko/hangry',), 'aegislashblade': ('aegislash/blade',), 'wishiwashischool': ('wishiwashi/school',),
  'mimikyubusted': ('mimikyu/busted',), 'eiscuenoice': ('eiscue/noice_face',), 'cramorantgulping': ('cramorant/gulping',),
  'cramorantgorging': ('cramorant/gorging',), 'palafinhero': ('palafin/hero',), 'zygardecomplete': ('zygarde/complete',), 'greninjaash': ('greninja/ash',),
}
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
def yoff(png):   # 본가 frontPicYOffset·backPicYOffset = 그림 아래 빈 줄 수
    im = Image.open(png); bb = im.crop((0, 0, 64, 64)).point(lambda v: 255 if v else 0).getbbox(); return 64 - bb[3] if bb else 0
fm = {}
for k, v in F.items():
    d = PX + v[0] + '/'; fr = d + ('anim_front.png' if os.path.exists(d + 'anim_front.png') else 'front.png'); bk = d + 'back.png'
    Pn = pal(PX + v[1] if len(v) > 1 else d + 'normal.pal'); Ps = pal(PX + v[2] if len(v) > 2 else d + 'shiny.pal')
    for side, p in (('', fr), ('b', bk)):
        for s, P in (('', Pn), ('s', Ps)): sheet(p, P, side == '').save(f'{OUT}{k}{side}{s}.png', optimize=True)
    two = Image.open(fr).size[1] >= 128
    fm[k] = [yoff(fr), yoff(bk), 0, [[1, 15, 0, 0]] if two else [], 0, []]
json.dump(fm, open(OUT + 'fm.json', 'w'), separators=(',', ':'))
print(fm)
