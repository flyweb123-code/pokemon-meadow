# 체육관 그림 만들기: pret/pokefirered(본가 파이어레드 디스어셈블리)에서 체육관 맵·필드 걸음 그림·트레이너 그림을 뽑아 gym/img/ 에 저장
# python3 -I tools/gym/mkassets.py <pokefirered 경로>   (맵은 tools/gym/rendermap.py 로 그린다)
import sys, os, subprocess
from PIL import Image
root = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, '..', '..', 'gym', 'img')
def rgba(src):
    im = Image.open(src)
    if im.mode == 'P':
        im = im.convert('RGBA'); px = im.load(); src0 = Image.open(src).load()
        for y in range(im.height):
            for x in range(im.width):
                if src0[x, y] == 0: px[x, y] = (0, 0, 0, 0)
    return im
def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path, optimize=True)
# 체육관 맵 (이름: 고르는 화면에 보이는 디자인 id)
MAPS = {'pewter': 'PewterCity_Gym_Layout', 'cerulean': 'CeruleanCity_Gym_Layout', 'vermilion': 'VermilionCity_Gym_Layout', 'celadon': 'CeladonCity_Gym_Layout', 'fuchsia': 'FuchsiaCity_Gym_Layout'}
for k, lay in MAPS.items():
    subprocess.run([sys.executable, '-I', os.path.join(here, 'rendermap.py'), root, lay, os.path.join(out, 'map', k + '.png')], check=True)
# 넓은 무대(연분홍 체육관)는 빈 바닥이 길어서 위 벽 3줄 + 아래 13줄(10~22)만 이어 붙인다
f = os.path.join(out, 'map', 'fuchsia.png'); im = Image.open(f); top = im.crop((0, 0, im.width, 48)); bot = im.crop((0, 160, im.width, 368))
c = Image.new(im.mode, (im.width, 48 + 208)); c.paste(top, (0, 0)); c.paste(bot, (0, 48)); save(c, f)
# 필드 걸음 그림 (16x32 프레임: 아래·위·왼쪽·아래걸음2·위걸음2·왼쪽걸음2)
for f in sorted(os.listdir(f'{root}/graphics/object_events/pics/people')):
    if f.endswith('.png'): save(rgba(f'{root}/graphics/object_events/pics/people/{f}'), os.path.join(out, 'ow', f))
# 배틀 트레이너 그림 (64x64)
for f in sorted(os.listdir(f'{root}/graphics/trainers/front_pics')):
    if f.endswith('.png'): save(rgba(f'{root}/graphics/trainers/front_pics/{f}'), os.path.join(out, 'tr', f.replace('_front_pic', '')))
for f in sorted(os.listdir(f'{root}/graphics/trainers/back_pics')):
    if f.endswith('.png'): save(rgba(f'{root}/graphics/trainers/back_pics/{f}'), os.path.join(out, 'trb', f.replace('_back_pic', '')))
print('ok')
