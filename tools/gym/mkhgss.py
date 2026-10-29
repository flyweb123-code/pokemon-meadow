# 다른 세대(성도·관동, 하트골드·소울실버) 이름 있는 트레이너를 gymb/named.json 에 더한다 (경완 2026-10-29 '레드나 그린 같은')
# python3 tools/gym/mkhgss.py <pokeheartgold trainers.json> <smogon/sprites gen4/heartgold-soulsilver 폴더> <PokeAPI csv 폴더>
#   팀: pret/pokeheartgold files/poketool/trainer/trainers.json (레벨·기술 그대로, 기술이 없는 팀은 게임이 레벨에 맞게 고른다)
#   그림: smogon/sprites 하트골드·소울실버 트레이너 정면 그림 → 80x80 (가운데, 발 아래 맞춤) gym/img/pt/tr/hg_<id>.png
# 이미 있는 id 는 바꿔 쓴다 (다시 돌려도 된다)
import sys, csv, json
from PIL import Image
TJ, SPR, PA = sys.argv[1:4]
L = json.load(open(TJ))['trainers']
dex = {r['identifier'].replace('-', '_').upper(): int(r['id']) for r in csv.DictReader(open(PA + '/pokemon_species.csv'))}
dex.update({'NIDORAN_M': 32, 'NIDORAN_F': 29, 'MR_MIME': 122, 'FARFETCHD': 83, 'HO_OH': 250, 'PORYGON_Z': 474, 'MIME_JR': 439})
mv = {m[0] for m in json.load(open('gym/data.json'))['mv']}
FIX = {'faintattack': 'feintattack', 'hijumpkick': 'highjumpkick', 'vicegrip': 'visegrip', 'smellingsalt': 'smellingsalts'}
def party(i):
    out = []
    for p in L[i]['party']:
        ms = [FIX.get(x, x) for x in (m[5:].lower().replace('_', '') for m in p.get('moves', []) if m != 'MOVE_NONE')]
        out.append([dex[p['species'][8:]], p['level'], [x for x in ms if x in mv]])
    return out
G = 'gymBattle'
# id, 이름, 분류, 그림, 걸음 그림, 음악, [팀 번호...], [처음, 졌을 때, 이겼을 때]
N = [
  ('red', '레드', '포켓몬 트레이너', 'Red', 'red_normal', 'champ', [260], ['……', '……!', '……']),
  ('green', '그린', '상록시티 관장', 'Blue', 'blue', 'rival', [261, 727], ['어이! 네가 요즘 소문난 관장이라며? 이 그린 님이 직접 확인하러 왔다!', '쳇… 제법인데. 다음엔 안 봐준다!', '하하! 역시 내가 최강이라니까!']),
  ('silver', '실버', '라이벌', 'Silver', 'boy', 'rival', [269, 270, 271, 272, 287, 491], ['…네가 관장이라고? 약한 녀석은 관장 자격 없어. 내가 증명해 주지.', '…쳇. 이번엔 인정해 주지.', '흥, 역시 약한 녀석이었군.']),
  ('lance', '목호', '챔피언', 'Lance', 'lance', 'champ', [244, 701], ['나는 목호. 네 체육관의 실력, 드래곤 포켓몬으로 시험해 보겠다.', '훌륭하다… 네 포켓몬들의 믿음이 느껴진다.', '드래곤의 힘을 아직 이길 수 없겠군.']),
  ('falkner', '비상', '도라지시티 관장', 'Falkner', 'bird_keeper', G, [20, 712], ['비행 포켓몬의 진짜 강함을 보여 주지! 바람을 타라!', '아버지께 물려받은 비행 포켓몬이…!', '하늘을 나는 포켓몬을 얕보지 마!']),
  ('bugsy', '호일', '고동마을 관장', 'Bugsy', 'bug_catcher', G, [21, 713], ['벌레 포켓몬 연구라면 누구에게도 지지 않아!', '와, 대단해! 연구할 게 또 생겼다!', '벌레 포켓몬은 정말 대단하지?']),
  ('whitney', '꼭두', '금빛시티 관장', 'Whitney', 'picnicker', G, [30, 714], ['다들 귀여운 포켓몬 좋아하지? 나도야! 배틀하자!', '흐아앙… 졌어…!', '헤헤, 귀엽고 강하다구!']),
  ('morty', '유빈', '인주시티 관장', 'Morty', 'channeler', G, [31, 715], ['이 체육관의 미래가… 보인다. 확인해 보자.', '너는 내가 보지 못한 것을 보고 있구나.', '고스트 포켓몬의 힘, 느꼈나?']),
  ('chuck', '사도', '진청시티 관장', 'Chuck', 'black_belt', G, [34, 718], ['우오오! 폭포 수련으로 단련한 내 주먹을 받아라!', '크윽… 내가 졌다! 훌륭하다!', '수련이 부족하다!']),
  ('jasmine', '규리', '담청시티 관장', 'Jasmine', 'beauty', G, [33, 717], ['저… 강철 포켓몬으로 상대해도 될까요…?', '어머… 정말 강하시네요.', '강철처럼 단단하답니다.']),
  ('pryce', '류옹', '황토마을 관장', 'Pryce', 'gentleman', G, [32, 716], ['나는 오랜 세월 얼음 포켓몬과 함께했다. 그 무게를 느껴 보거라.', '허허… 젊음의 힘이로구나.', '아직 겨울을 이기기엔 이르다.']),
  ('clair', '이향', '검은먹시티 관장', 'Clair', 'cooltrainer_f', G, [35, 719], ['나는 세계 최고의 드래곤 사용자 이향! 각오해!', '…인정할게. 네가 강하다는 걸.', '드래곤 사용자를 얕보면 곤란해!']),
  ('will', '일목', '사천왕', 'Will', 'man', 'champ', [245, 702], ['사천왕 일목. 에스퍼 포켓몬의 힘을 보여 주지.', '…졌군. 하지만 나는 더 강해질 거다.', '내 에스퍼 포켓몬들은 최강이다.']),
  ('koga2', '독수', '사천왕', 'Koga', 'koga', 'champ', [247, 703], ['파하하! 사천왕 독수, 닌자의 기술을 보여 주마!', '음… 훌륭한 실력이다!', '독 앞에선 누구도 무사할 수 없다!']),
  ('bruno2', '시바', '사천왕', 'Bruno', 'bruno', 'champ', [418, 704], ['사천왕 시바! 단련된 육체로 상대해 주마! 후!', '이럴 수가… 내가 지다니!', '단련이 부족하다!']),
  ('karen', '카렌', '사천왕', 'Karen', 'cooltrainer_f', 'champ', [246, 705], ['사천왕 카렌이야. 강한 포켓몬, 약한 포켓몬… 그건 사람의 마음대로지.', '…좋아하는 포켓몬으로 이기려고 노력하는 너, 멋져.', '좋아하는 포켓몬으로 싸워야 진짜 트레이너지.']),
  ('brock', '웅', '회색시티 관장', 'Brock', 'brock', G, [253, 720], ['나는 회색시티 관장 웅! 바위처럼 단단한 의지로 도전한다!', '네 실력은 진짜구나!', '아직 단단함이 부족하군!']),
  ('misty', '이슬', '블루시티 관장', 'Misty', 'misty', G, [254, 721], ['내 물 포켓몬들의 실력, 똑똑히 보여 줄게!', '으으… 인정할게!', '물 포켓몬 앞에선 어림없지!']),
  ('surge', '마티스', '갈색시티 관장', 'Lt._Surge', 'lt_surge', G, [255, 722], ['헤이, 키드! 전기 포켓몬의 힘을 보여 주지!', '와우! 짜릿한 배틀이었다!', '역시 키드는 키드였어!']),
  ('erika', '민화', '무지개시티 관장', 'Erika', 'erika', G, [256, 723], ['어머, 좋은 날씨네요… 한 수 부탁드릴게요.', '어머나… 제가 졌네요.', '풀 포켓몬들도 기뻐하고 있어요.']),
  ('janine', '도희', '연분홍시티 관장', 'Janine', 'ninja_boy', G, [257, 724], ['아버지께 배운 닌자의 기술, 받아 봐!', '아직 수련이 부족했어…!', '닌자의 기술을 얕보지 마!']),
  ('sabrina', '초련', '노랑시티 관장', 'Sabrina', 'sabrina', G, [258, 725], ['네가 올 줄 알고 있었어.', '…내 예지가 빗나가다니.', '예지한 그대로야.']),
  ('blaine', '강연', '홍련마을 관장', 'Blaine', 'blaine', G, [259, 726], ['우오오! 화상 치료제는 준비했느냐!', '나 완전히 불타 버렸다…!', '불꽃의 열정이 부족하구나!']),
]
named = json.load(open('gymb/named.json'))
ids = {n['id'] for n in named}
for id_, nm, cls, spr, ow, mus, P, ln in N:
    im = Image.open(f'{SPR}/{spr}.png').convert('RGBA'); bb = im.getbbox(); im = im.crop(bb)
    if im.width > 80 or im.height > 80: im.thumbnail((80, 80), Image.NEAREST)
    out = Image.new('RGBA', (80, 80)); out.paste(im, ((80 - im.width) // 2, 80 - im.height)); out.save(f'gym/img/pt/tr/hg_{id_}.png', optimize=True)
    e = {'id': id_, 'nm': nm, 'cls': cls, 'tr': f'hg_{id_}', 'ow': ow, 'music': mus, 'ln': ln, 'st': [party(i) for i in P]}
    named = [x for x in named if x['id'] != id_] + [e]
json.dump(named, open('gymb/named.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for n in named: print(n['id'], n['nm'], [[sum(x[1] for x in s) // len(s), len(s)] for s in n['st']])
