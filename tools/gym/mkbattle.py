# 4세대(플래티넘) 배틀 화면 그림을 pret/pokeplatinum 에서 뽑아 gym/img/bt/ 에 둔다.
# python3 tools/gym/mkbattle.py <pokeplatinum 폴더>
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from narc import narc
from nds import ncgr, nclr, nscr, render
from PIL import Image
PL = sys.argv[1]; OUT = 'gym/img/bt/'; os.makedirs(OUT, exist_ok=True)
F = narc(PL + '/res/prebuilt/battle/graphic/pl_batt_bg.narc')
G = PL + '/res/graphics/battle/'

def keyed(im, pal0):   # 팔레트 0번 색 = 투명
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if px[x, y][:3] == pal0: px[x, y] = (0, 0, 0, 0)
    return im
def save(im, n): im.save(OUT + n, optimize=True)

# 위 화면 배경 (512x192, 실내 1·2·3): 타일 3+배경, 팔레트 172+배경*3, 화면 2
scr = nscr(F[2])
for k, n in [(6, 'in1'), (7, 'in2'), (8, 'in3')]:
    t, b, _ = ncgr(F[3 + k]); save(render(t, b, nclr(F[172 + k * 3]), scr).crop((0, 0, 512, 192)), f'bg_{n}.png')

# 발판 (실내)
def jasc(p):
    L = [l for l in open(p).read().split('\n')[3:] if l.strip()]; return [tuple(int(v) for v in l.split()) for l in L]
P = jasc(G + 'terrain/indoors/all.pal')
for n in ['enemy', 'player']:
    im = Image.open(G + f'terrain/indoors/{n}.png'); flat = [c for rgb in P for c in rgb]; im.putpalette(flat + [0] * (768 - len(flat)))
    save(keyed(im, P[0]), f'pl_{n[0]}.png')
# 체력 상자: png 자기 팔레트, 0번 투명
for n in ['enemy', 'player_singles', 'healthbox_parts']:
    im = Image.open(G + f'healthbox/{n}.png'); pal = im.getpalette()[:3]; save(keyed(im, tuple(pal)), f'hb_{n.split("_")[0][:6]}.png')

# 아래(터치) 화면: 타일 28, 팔레트 242 (+ 0번 줄은 배경별 249=실내1)
t, b, _ = ncgr(F[28]); pal = list(nclr(F[242])); pal[0:16] = nclr(F[249])[:16]
save(render(t, b, pal, nscr(F[49])).crop((0, 0, 256, 192)), 'sub_bg.png')
for i, n in [(42, 'menu'), (43, 'sub43'), (44, 'sub44'), (45, 'sub45'), (46, 'sub46'), (48, 'sub48')]:
    save(keyed(render(t, b, pal, nscr(F[i])), pal[0]), f'sub_{n}.png' if not n.startswith('sub') else n + '.png')
# 기술 버튼: 47번 화면 왼쪽 위 버튼(팔레트 13)을 타입 팔레트로 바꿔 칠한다
src = open(PL + '/src/overlay011/move_palettes.c').read()
TP = {m[0]: [tuple(int(v) * 255 // 31 for v in c) for c in re.findall(r'RGB\((\d+), (\d+), (\d+)\)', m[1])] for m in re.findall(r'sMovePalette(\w+)\[\] = \{(.*?)\};', src, re.S)}
ORDER = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark']
fairy = list(TP['Psychic']); fairy[2:10] = [(255, 190, 230), (250, 170, 220), (245, 150, 210), (225, 110, 185), (200, 90, 165), (165, 75, 140), (130, 60, 110), (255, 215, 240)]   # 페어리: 4세대엔 없어서 분홍으로
m47 = nscr(F[47])
full = render(t, b, pal, m47); bb = keyed(full.crop((0, 0, 128, 82)), pal[0]).getbbox(); print('move button box', bb)
for ti, nm in enumerate(ORDER + ['Fairy'], 1):
    p2 = list(pal); p2[13 * 16:14 * 16] = fairy if nm == 'Fairy' else TP[nm]
    save(keyed(render(t, b, p2, m47).crop(bb), pal[0]), f'mv_{ti}.png')
print('ok')
# 대화창 틀 (기본 창 틀 0번): 9칸 잘라 쓰는 border-image 용
im = Image.open(PL + '/res/graphics/windows/message_box_00.png'); save(keyed(im, tuple(im.getpalette()[:3])).crop((0, 2, 48, 22)), 'msg.png')
