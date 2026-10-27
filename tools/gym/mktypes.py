# 기술 타입 꼬리표·분류 아이콘: 플래티넘 원본(pret/pokeplatinum res/graphics/battle/type_icons)
# 꼬리표 글자는 영어판이라 지우고 빈 판만 둔다(한국어 글자는 게임이 위에 쓴다). 페어리는 4세대에 없어 노말 판을 분홍으로.
# python3 tools/gym/mktypes.py <pokeplatinum 폴더>  →  gym/img/bt/ty_{1~18}.png, cat_{0,1,2}.png
import sys
from PIL import Image
D = sys.argv[1] + '/res/graphics/battle/type_icons/'; OUT = 'gym/img/bt/'
TY = 'normal fighting flying poison ground rock bug ghost steel fire water grass electric psychic ice dragon dark'.split()
def conv(im, blank=False, recol=None):
    p = im.getpalette(); d = im.load(); W, H = im.size; o = Image.new('RGBA', (W, H)); fill = d[W // 2, 3]
    for y in range(H):
        for x in range(W):
            v = d[x, y]
            if blank and v in (14, 15): v = fill
            if v: c = tuple(p[3 * v:3 * v + 3]); o.putpixel((x, y), (recol.get(c, c) if recol else c) + (255,))
    return o
for i, n in enumerate(TY, 1): conv(Image.open(D + n + '.png'), True).save(f'{OUT}ty_{i}.png', optimize=True)
nm = Image.open(D + 'normal.png'); p = nm.getpalette(); d = nm.load()
top, mid, bot = (tuple(p[3 * d[x, y]:3 * d[x, y] + 3]) for x, y in ((16, 1), (16, 3), (16, 14)))
conv(nm, True, {top: (248, 200, 216), mid: (238, 153, 172), bot: (200, 104, 130)}).save(f'{OUT}ty_18.png', optimize=True)
for i, n in enumerate(('physical', 'special', 'status')): conv(Image.open(D + n + '.png')).save(f'{OUT}cat_{i}.png', optimize=True)
print('ok')
