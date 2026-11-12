# 플래티넘 일반 트레이너 40종 더 (경완 2026-11-13 '싹 다 우리 게임에 넣어줘')
# python3 tools/gym/mkpttr.py <pokeplatinum 폴더>
#   배틀 그림: res/trainers/classes/<class>/front.png (80x80, 0번 색 투명) → gym/img/pt/tr/<key>.png
#   걸음 그림: res/graphics/field_sprites/npc/<ow>.png (32x512, 16칸) → gym/img/pt/ow/<ow>.png (288x32, 9칸: 뒤·앞·옆, 앞걸음 2·뒤걸음 2·옆걸음 2 = 기존 그림과 같은 순서)
import sys, os
from PIL import Image
PL = sys.argv[1]
TR = {  # 우리 key: 플래티넘 class 폴더
  'snow_trainer_f': 'ace_trainer_snow_female', 'snow_trainer_m': 'ace_trainer_snow_male', 'aroma_lady': 'aroma_lady', 'belle_pa': 'belle_and_pa',
  'breeder_f': 'breeder_female', 'breeder_m': 'breeder_male', 'cameraman': 'cameraman', 'clown': 'clown', 'cowgirl': 'cowgirl', 'cyclist_f': 'cyclist_female',
  'double_team': 'double_team', 'idol': 'idol', 'interviewers': 'interviewers', 'lady': 'lady', 'maid': 'maid', 'parasol_lady': 'parasol_lady', 'pi': 'pi',
  'pokefan_f': 'pokefan_female', 'pokefan_m': 'pokefan_male', 'policeman': 'policeman', 'rancher': 'rancher', 'ranger_f': 'ranger_female', 'ranger_m': 'ranger_male',
  'reporter': 'reporter', 'rich_boy': 'rich_boy', 'roughneck': 'roughneck', 'school_kid_f': 'school_kid_female', 'school_kid_m': 'school_kid_male', 'skier_m': 'skier_male',
  'socialite': 'socialite', 'swimmer_m': 'swimmer_male', 'tuber_f': 'tuber_female', 'tuber_m': 'tuber_male', 'twins': 'twins', 'veteran': 'veteran', 'waiter': 'waiter',
  'waitress': 'waitress', 'worker': 'worker', 'young_couple': 'young_couple', 'sis_bro': 'sis_and_bro' }
OW = 'ace_trainer_snow_f ace_trainer_snow_m ace_trainer_f ace_trainer_m pokemon_breeder_f pokemon_breeder_m cameraman clown cowgirl cyclist_f idol lady maid parasol_lady looker pokefan_f pokefan_m policeman rancher reporter rich_boy roughneck school_kid_f school_kid_m skier_m socialite tuber_f tuber_m twin expert_m waiter waitress worker'.split()
SEQ = [4, 0, 8, 5, 7, 1, 3, 9, 11]
def rgba(f):
    im = Image.open(f); out = im.convert('RGBA'); px = out.load(); ix = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if ix[x, y] == 0: px[x, y] = (0, 0, 0, 0)
    return out
for k, c in TR.items():
    rgba(f'{PL}/res/trainers/classes/{c}/front.png').save(f'gym/img/pt/tr/{k}.png', optimize=True)
for o in OW:
    s = rgba(f'{PL}/res/graphics/field_sprites/npc/{o}.png'); out = Image.new('RGBA', (288, 32))
    for i, j in enumerate(SEQ): out.paste(s.crop((0, j * 32, 32, j * 32 + 32)), (i * 32, 0))
    out.save(f'gym/img/pt/ow/{o}.png', optimize=True)
print(len(TR), 'tr', len(OW), 'ow')
