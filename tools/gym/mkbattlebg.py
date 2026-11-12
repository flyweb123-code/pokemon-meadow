# 플래티넘 배틀 배경 23개(바깥 6개는 낮·저녁·밤) + 지형별 발판을 pret/pokeplatinum 에서 뽑아 gym/img/bt/ 에 둔다 (v23.16 경완 '배틀 배경 다 게임에 받아와줘')
# python3 tools/gym/mkbattlebg.py <pokeplatinum 폴더>
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from narc import narc
from nds import ncgr, nclr, nscr, render
from PIL import Image
PL = sys.argv[1]; OUT = 'gym/img/bt/'
F = narc(PL + '/res/prebuilt/battle/graphic/pl_batt_bg.narc'); T = PL + '/res/graphics/battle/terrain/'
BG = ['plain', 'water', 'city', 'forest', 'mountain', 'snow', 'in1', 'in2', 'in3', 'cave1', 'cave2', 'cave3', 'aaron', 'bertha', 'flint', 'lucian', 'cynthia', 'distortion', 'tower', 'factory', 'arcade', 'castle', 'hall']
scr = nscr(F[2])
for k, n in enumerate(BG):
    t, b, _ = ncgr(F[3 + k])
    for ti, suf in enumerate(['', '_e', '_n'] if k < 6 else ['']):
        if k in (6, 7, 8) and os.path.exists(OUT + f'bg_{n}.png'): continue   # 실내 1~3 은 원래 있음
        render(t, b, nclr(F[172 + k * 3 + ti]), scr).crop((0, 0, 512, 192)).convert('RGB').save(OUT + f'bg_{n}{suf}.png', optimize=True)
def jasc(p):
    L = [l for l in open(p).read().split('\n')[3:] if l.strip()]; return [tuple(int(v) for v in l.split()[:3]) for l in L]
def keyed(im, pal0):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if px[x, y][:3] == pal0: px[x, y] = (0, 0, 0, 0)
    return im
for d in sorted(os.listdir(T)):
    if not os.path.isdir(T + d) or d == 'indoors': continue
    pals = [p for p in ['day', 'evening', 'night', 'all'] if os.path.exists(T + d + f'/{p}.pal')]
    for p in pals:
        P = jasc(T + d + f'/{p}.pal'); flat = [c for rgb in P for c in rgb]
        for n in ['enemy', 'player']:
            if not os.path.exists(T + d + f'/{n}.png'): continue
            im = Image.open(T + d + f'/{n}.png'); im.putpalette(flat + [0] * (768 - len(flat)))
            keyed(im, P[0]).save(OUT + f'pl_{n[0]}_{d}{ {"day": "", "all": "", "evening": "_e", "night": "_n"}[p] }.png', optimize=True)
print('ok')
