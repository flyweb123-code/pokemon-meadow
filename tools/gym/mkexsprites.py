# 배틀용 포켓몬 움직이는 그림
#   1~649: smogon/sprites src/sprites/gen5 블랙·화이트 원본 움직이는 gif 이름 목록만 (게임이 고정 커밋에서 받아 쓰고, 못 받으면 저장소 png)
#   650~   : 팬게임 엔진 rh-hideout/pokeemerald-expansion 의 2장 그림(64x64) → 플래티넘과 같은 160x80 2장 판 png + anim.json 움직임
# python3 tools/gym/mkexsprites.py <smogon/sprites 폴더> <pokeemerald-expansion 폴더> <PokeAPI csv 폴더>
#   pokeemerald-expansion 에선 src/data/graphics/pokemon.h, src/data/pokemon/species_info/gen_*_families.h, graphics/pokemon/* 를 쓴다.
# anim.json 에 'g' = gif 목록을 넣는다. mkplsprites.py 다음에 돌린다.
import sys, os, re, csv, json, shutil
from PIL import Image
SM, PX, PA = sys.argv[1:4]; OUT = 'gym/img/pk/'
ident = {int(r['id']): r['identifier'].replace('-', '_') for r in csv.DictReader(open(PA + '/pokemon_species.csv')) if int(r['id']) <= 1025}
anim = json.load(open(OUT + 'anim.json')); fem = set(json.load(open(OUT + 'fem.json')))

# ---------- 1~649: 블랙·화이트 gif 목록 (그림은 게임이 smogon/sprites 에서 바로 받는다) ----------
# g: { 번호: [파일 이름, 있는 칸 비트] }  비트: 1 뒤, 2 이로치, 4 암컷, 8 뒤+이로치, 16 암컷 뒤, 32 암컷 이로치, 64 암컷 뒤+이로치
gif = {}; G5 = SM + '/src/sprites/gen5/'
have = set(os.listdir(G5)) if os.path.isdir(G5) else set()
import subprocess
try: have |= {x.split('/')[-1] for x in subprocess.run(['git', '-C', SM, 'ls-tree', '--name-only', 'HEAD', 'src/sprites/gen5/'], capture_output=True, text=True).stdout.split()}
except Exception: pass
for n in range(1, 650):
    nm = next((c for c in (ident[n], ident[n].replace('_', '')) if 's' + c + '.gif' in have), None)
    if not nm: print('no gif', n); continue
    bits = 0
    for i, k in enumerate(('-b', '-s', '-f', '-b-s', '-b-f', '-f-s', '-b-f-s')):
        if f's{nm}{k}.gif' in have: bits |= 1 << i
    gif[n] = [nm, bits]

# ---------- 650~: pokeemerald-expansion ----------
sym = dict(re.findall(r'(gMon\w+)\[\]\s*=\s*INCGFX_U\d+\("([^"]+)"', open(PX + '/src/data/graphics/pokemon.h').read()))
blocks = {}
for g in range(1, 10):
    t = open(f'{PX}/src/data/pokemon/species_info/gen_{g}_families.h').read()
    for m in re.finditer(r'\[SPECIES_(\w+)\]\s*=\s*\{(.*?)\n    \},', t, re.S):
        b = m.group(2); d = re.search(r'\.natDexNum\s*=\s*NATIONAL_DEX_(\w+)', b)
        if not d: continue
        blocks.setdefault(d.group(1), []).append((m.group(1), b))
def get(b, k):
    m = re.search(r'\.' + k + r'\s*=\s*([^,\n]+)', b); return m.group(1).strip() if m else None
def pal(p):
    L = [l for l in open(p).read().split('\n')[3:] if l.strip()]; return [tuple(int(v) for v in l.split()[:3]) for l in L]
def sheet(png, P, two):
    im = Image.open(png); idx = im.load(); W, H = im.size; out = Image.new('RGBA', (160, 80)); o = out.load()
    if P is None: P = [tuple(im.getpalette()[3 * i:3 * i + 3]) for i in range(16)]
    for k in range(2 if two and H >= 128 else 1):
        for y in range(64):
            for x in range(64):
                i = idx[x, y + 64 * k]
                if i: o[80 * k + 8 + x, 16 + y] = P[i] + (255,)
    if not two or H < 128:   # 한 장뿐이면 두 칸 다 같은 그림
        out.paste(out.crop((0, 0, 80, 80)), (80, 0))
    return out
miss = []
for n in range(650, 1026):
    key = ident[n].upper()
    L = blocks.get(key) or blocks.get(key.replace('_', ''))
    if not L: miss.append(n); continue
    nm, b = next(((x, y) for x, y in L if x == key), L[0])
    fp, bp, pp, sp = (sym.get(get(b, k) or '') for k in ('frontPic', 'backPic', 'palette', 'shinyPalette'))
    if not fp or not os.path.exists(PX + '/' + fp): miss.append(n); continue
    pn = PX + '/' + pp if pp else None; ps = PX + '/' + sp if sp else None
    Pn = pal(pn) if pn and os.path.exists(pn) else None; Ps = pal(ps) if ps and os.path.exists(ps) else Pn
    ffp, fbp = sym.get(get(b, 'frontPicFemale') or ''), sym.get(get(b, 'backPicFemale') or '')
    hasf = bool(ffp and os.path.exists(PX + '/' + ffp))
    for side, p0, pf in (('', fp, ffp), ('b', bp, fbp)):
        for s, P in (('', Pn), ('s', Ps)):
            sheet(PX + '/' + p0, P, side == '').save(f'{OUT}{n}{side}{s}.png', optimize=True)
            if hasf: sheet(PX + '/' + (pf if pf and os.path.exists(PX + '/' + pf) else p0), P, side == '').save(f'{OUT}{n}{side}{s}f.png', optimize=True)
    if hasf: fem.add(n)
    else:
        fem.discard(n)
        for k in ('f', 'bf', 'sf', 'bsf'):
            if os.path.exists(f'{OUT}{n}{k}.png'): os.remove(f'{OUT}{n}{k}.png')
    fa = re.search(r'\.frontAnimFrames\s*=\s*ANIM_FRAMES\((.*?)\),\s*\n', b, re.S)
    fr = [[int(i), max(1, int(d) // 2), 0, 0] for i, d in re.findall(r'ANIMCMD_FRAME\((\d+),\s*(\d+)', fa.group(1) if fa else '')]   # 1/60초 → 1/30초
    anim[str(n)] = [int(get(b, 'frontPicYOffset') or 0), int(get(b, 'backPicYOffset') or 0), 0, fr, 0, []]
anim['g'] = gif
json.dump(anim, open(OUT + 'anim.json', 'w'), separators=(',', ':'))
json.dump(sorted(fem), open(OUT + 'fem.json', 'w'))
print('gif', len(gif), 'ex', 1025 - 649 - len(miss), 'missing', miss)
