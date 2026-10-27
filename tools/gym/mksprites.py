# 배틀용 포켓몬 그림: smogon/sprites 에서 4세대(1~493, 플래티넘 그림 우선)·5세대 스타일(494~) 앞·뒤·이로치·암컷을 골라 gym/img/pk/ 에 둔다.
# python3 tools/gym/mksprites.py <smogon/sprites 폴더> <PokeAPI csv 폴더>
# 이름: {번호}{b=뒤}{s=이로치}{f=암컷}.png  예) 25.png 25b.png 25s.png 25bsf.png. 뒤 그림이 없는 종은 앞 그림을 뒤집어 쓴다.
import sys, os, re, csv
from PIL import Image
SM, PA = sys.argv[1], sys.argv[2]; OUT = 'gym/img/pk/'; os.makedirs(OUT, exist_ok=True)
sp = {int(r['id']): r['identifier'].replace('-', '_') for r in csv.DictReader(open(PA + '/pokemon_species.csv')) if int(r['id']) <= 1025}
g4 = {}
rx = re.compile(r'^s([a-z0-9_]+?)(-b)?(-f)?-g([a-z]+)(-s)?\.png$')
for f in os.listdir(SM + '/src/sprites/gen4'):
    m = rx.match(f)
    if m: g4.setdefault((m[1], bool(m[2]), bool(m[3]), bool(m[5])), []).append((m[4], f))
def first(path):   # gif 는 첫 장
    im = Image.open(path); im.seek(0); return im.convert('RGBA')
def put(im, n):
    bb = im.getbbox()
    im.save(OUT + n + '.png', optimize=True)
miss = []; fem = []
for i, n in sp.items():
    got = {}
    for b in (0, 1):
        for f in (0, 1):
            for s in (0, 1):
                k = ('b' if b else '') + ('s' if s else '') + ('f' if f else '')
                if i <= 493:
                    c = g4.get((n, bool(b), bool(f), bool(s)))
                    if c: c.sort(key=lambda x: ('p' not in x[0], 'h' not in x[0])); got[k] = SM + '/src/sprites/gen4/' + c[0][1]
                else:
                    base = SM + '/src/sprites/gen5/s' + n + ('-b' if b else '') + ('-f' if f else '') + ('-s' if s else '')
                    for ext in ('.gif', '.png'):
                        if os.path.exists(base + ext): got[k] = base + ext; break
    if '' not in got:
        g9 = SM + f'/src/gen9species/s{n}.png'
        if os.path.exists(g9): got[''] = g9
        else: miss.append((i, n)); continue
    if 'f' in got: fem.append(i)
    for k, p in got.items():
        try: put(first(p), f'{i}{k}')
        except Exception as e: print('bad', p, e)
    # 없는 칸 채우기: 뒤 = 앞 뒤집기, 이로치 없음 = 보통
    for k in ['s', 'b', 'bs']:
        if k not in got:
            src = OUT + f'{i}{"s" if "s" in k and "s" in got else ""}.png'
            im = Image.open(src)
            if 'b' in k: im = im.transpose(Image.FLIP_LEFT_RIGHT)
            im.save(OUT + f'{i}{k}.png', optimize=True)
import json; json.dump(fem, open(OUT + 'fem.json', 'w'), separators=(',', ':'))   # 암컷 그림이 따로 있는 종
print('missing', miss, 'fem', len(fem))
