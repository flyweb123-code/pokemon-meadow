# 배틀용 포켓몬 그림 (1~493): 플래티넘 원본(pret/pokeplatinum res/pokemon/*)의 2장짜리 그림(160x80)과 움직임 데이터.
# python3 tools/gym/mkplsprites.py <pokeplatinum 폴더> <PokeAPI csv 폴더>
# gym/img/pk/{번호}{b=뒤}{s=이로치}{f=암컷}.png 를 160x80(80x80 두 장)으로 덮어쓰고, gym/img/pk/anim.json 에 움직임을 둔다.
#   anim.json: { 번호: [앞 y보정, 뒤 y보정, 앞 시작 지연, [[장, 지연, x, y]...], 뒤 시작 지연, [[...]]] }  (지연은 30분의 1초)
import sys, os, csv, json
from PIL import Image
PL, PA = sys.argv[1], sys.argv[2]; SRC = PL + '/res/pokemon/'; OUT = 'gym/img/pk/'
num = {r['identifier'].replace('-', '_'): int(r['id']) for r in csv.DictReader(open(PA + '/pokemon_species.csv')) if int(r['id']) <= 493}

def pal(p):
    L = [l for l in open(p).read().split('\n')[3:] if l.strip()]; return [tuple(int(v) for v in l.split()) for l in L]
def sheet(png, P):
    im = Image.open(png); idx = im.load(); W, H = im.size
    out = Image.new('RGBA', (W, H)); o = out.load()
    for y in range(H):
        for x in range(W):
            i = idx[x, y]
            if i: o[x, y] = P[i] + (255,)
    return out
def frames(d):
    L = []
    for f in d.get('frames', []):
        if f['sprite_frame'] == -1: break
        L.append([f['sprite_frame'], f['frame_delay'], f['x_shift'], f['y_shift']])
    return L

anim = {}; miss = []; fem = set()
for name, n in sorted(num.items(), key=lambda x: x[1]):
    d = SRC + name + '/'
    if not os.path.isdir(d): miss.append(name); continue
    pn, ps = pal(d + 'normal.pal'), pal(d + 'shiny.pal')
    for side, b in (('front', ''), ('back', 'b')):
        for sex, f in (('male', ''), ('female', 'f')):
            p = d + f'{sex}_{side}.png'
            if not os.path.exists(p):
                if sex == 'female' and not os.path.exists(d + 'female_front.png'): continue   # 암수 같은 그림
                p = d + (f'female_{side}.png' if sex == 'male' else f'male_{side}.png')   # 암컷만 있는 종, 또는 암컷 뒷모습이 수컷과 같은 종
                if not os.path.exists(p): continue
            for P, s in ((pn, ''), (ps, 's')):
                sheet(p, P).save(f'{OUT}{n}{b}{s}{f}.png', optimize=True)
    if os.path.exists(d + 'male_front.png') and os.path.exists(d + 'female_front.png'): fem.add(n)
    sd = json.load(open(d + 'sprite_data.json'))
    fr, bk = sd['front'], sd['back']
    anim[n] = [fr['y_offset']['male'] + fr.get('addl_y_offset', 0), bk['y_offset']['male'], fr.get('start_delay', 0), frames(fr), bk.get('start_delay', 0), frames(bk)]
json.dump(anim, open(OUT + 'anim.json', 'w'), separators=(',', ':'))
old = [x for x in json.load(open(OUT + 'fem.json')) if x > 493]
json.dump(sorted(fem) + old, open(OUT + 'fem.json', 'w'))
print('species', len(anim), 'missing', miss)
