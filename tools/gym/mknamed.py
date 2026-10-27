# 이름 있는 도전자(그린·관동 관장·사천왕·레드)의 본가 팀 단계 → gym/named.json
# python3 tools/gym/mknamed.py <pokefirered 폴더> <PokeAPI csv 폴더>
#   파이어레드 src/data/trainer_parties.h 의 팀(레벨·기술 그대로). 레드는 하트골드·소울실버 은빛산 팀(파이어레드엔 없음)을 직접 적는다.
# 결과: [{ id, nm, cls, tr(정면 그림), ow(걸음 그림), music, ln: [처음 대사, 졌을 때, 이겼을 때], st: [[[번호, 레벨, [기술...]], ...], ...] }]
import sys, re, csv, json
FR, PA = sys.argv[1:3]
dex = {r['identifier'].replace('-', '_').upper(): int(r['id']) for r in csv.DictReader(open(PA + '/pokemon_species.csv'))}
dex.update({'NIDORAN_M': 32, 'NIDORAN_F': 29, 'MR_MIME': 122, 'FARFETCHD': 83})
mv = {m[0] for m in json.load(open('gym/data.json'))['mv']}
t = open(FR + '/src/data/trainer_parties.h').read()
def party(name):
    m = re.search(r'sParty_' + name + r'\[\] = \{(.*?)\n\};', t, re.S); assert m, name
    out = []
    for b in re.findall(r'\{(.*?)\}\s*,?\s*(?=\{|$)', m.group(1) + '\n', re.S):
        lv = re.search(r'\.lvl = (\d+)', b); sp = re.search(r'\.species = SPECIES_(\w+)', b)
        if not lv or not sp: continue
        ms = re.search(r'\.moves = \{(.*?)\}', b + '}')
        mvs = [x.strip()[5:].lower().replace('_', '') for x in ms.group(1).split(',')] if ms else []
        mvs = [{'hijumpkick': 'highjumpkick', 'faintattack': 'feintattack', 'vicegrip': 'visegrip', 'smellingsalt': 'smellingsalts', 'softboiled': 'softboiled'}.get(x, x) for x in mvs if x and x != 'none']
        mvs = [x for x in mvs if x in mv]
        out.append([dex[sp.group(1)], int(lv.group(1)), mvs])
    return out
def mvfix(L): return [x for x in L if x in mv]
N = [
  {'id': 'green', 'nm': '그린', 'cls': '라이벌', 'tr': 'rival_early', 'ow': 'blue', 'music': 'rival',
   'ln': ['어이, {me}! 네가 체육관 관장이 됐다며? 어디 실력 좀 볼까!', '쳇… 이번엔 운이 좋았던 거야. 다음엔 더 강해져서 온다!', '하하! 역시 내가 세계에서 제일 강하다니까!'],
   'p': ['RivalRoute22EarlySquirtle', 'RivalCeruleanSquirtle', 'RivalSsAnneSquirtle', 'RivalPokemonTowerSquirtle', 'RivalSilphSquirtle', 'RivalRoute22LateSquirtle', 'ChampionFirstSquirtle', 'ChampionRematchSquirtle']},
  {'id': 'brock', 'nm': '웅', 'cls': '회색시티 관장', 'tr': 'leader_brock', 'ow': 'brock', 'music': 'gymBattle',
   'ln': ['나는 회색시티 관장 웅! 단단한 바위 같은 의지로 네 체육관에 도전하겠다!', '네 실력은 진짜구나. 바위처럼 단단한 체육관이다!', '아직 단단함이 부족하군. 더 단련해라!'], 'p': ['LeaderBrock']},
  {'id': 'misty', 'nm': '이슬', 'cls': '블루시티 관장', 'tr': 'leader_misty', 'ow': 'misty', 'music': 'gymBattle',
   'ln': ['내 물 포켓몬들의 실력, 똑똑히 보여 줄게!', '으으… 제법이잖아! 인정할게.', '후훗, 물 포켓몬 앞에선 어림없지!'], 'p': ['LeaderMisty']},
  {'id': 'surge', 'nm': '마티스', 'cls': '갈색시티 관장', 'tr': 'leader_lt_surge', 'ow': 'lt_surge', 'music': 'gymBattle',
   'ln': ['헤이, 키드! 전쟁에서 나를 지켜 준 전기 포켓몬의 힘을 보여 주지!', '와우! 진짜 전기가 통하는 배틀이었다!', '역시 키드는 키드였어!'], 'p': ['LeaderLtSurge']},
  {'id': 'erika', 'nm': '민화', 'cls': '무지개시티 관장', 'tr': 'leader_erika', 'ow': 'erika', 'music': 'gymBattle',
   'ln': ['어머, 좋은 날씨네요… 꽃꽂이를 하다 왔어요. 한 수 부탁드릴게요.', '어머나… 제가 졌네요. 정말 훌륭해요.', '풀 포켓몬들도 기뻐하고 있어요.'], 'p': ['LeaderErika']},
  {'id': 'koga', 'nm': '독수', 'cls': '연분홍시티 관장', 'tr': 'leader_koga', 'ow': 'koga', 'music': 'gymBattle',
   'ln': ['파하하! 닌자의 독 기술, 피할 수 있겠느냐!', '음… 네 실력, 진짜로구나!', '닌자의 기술을 얕보지 마라!'], 'p': ['LeaderKoga']},
  {'id': 'sabrina', 'nm': '초련', 'cls': '노랑시티 관장', 'tr': 'leader_sabrina', 'ow': 'sabrina', 'music': 'gymBattle',
   'ln': ['네가 올 줄 알고 있었어. 이 배틀의 결과도…', '…내 예지가 빗나가다니.', '예지한 그대로야.'], 'p': ['LeaderSabrina']},
  {'id': 'blaine', 'nm': '강연', 'cls': '홍련마을 관장', 'tr': 'leader_blaine', 'ow': 'blaine', 'music': 'gymBattle',
   'ln': ['우오오! 화상 치료제는 준비했느냐!', '나 완전히 불타 버렸다…!', '불꽃의 열정이 부족하구나!'], 'p': ['LeaderBlaine']},
  {'id': 'giovanni', 'nm': '비주기', 'cls': '상록시티 관장', 'tr': 'leader_giovanni', 'ow': 'giovanni', 'music': 'gymBattle',
   'ln': ['후후… 네 체육관이 소문이 자자하더군. 직접 확인하러 왔다.', '…훌륭하다. 오늘은 이만 물러나지.', '이것이 진정한 강자의 힘이다.'], 'p': ['LeaderGiovanni']},
  {'id': 'lorelei', 'nm': '칸나', 'cls': '사천왕', 'tr': 'elite_four_lorelei', 'ow': 'lorelei', 'music': 'champ',
   'ln': ['사천왕 칸나야. 얼음 포켓몬으로 꽁꽁 얼려 줄게.', '어머… 제법이네.', '얼음은 쉽게 녹지 않아.'], 'p': ['EliteFourLorelei', 'EliteFourLorelei2']},
  {'id': 'bruno', 'nm': '시바', 'cls': '사천왕', 'tr': 'elite_four_bruno', 'ow': 'bruno', 'music': 'champ',
   'ln': ['나는 사천왕 시바! 단련된 근육으로 상대해 주마! 후!', '이럴 수가… 내가 지다니!', '단련이 부족하다!'], 'p': ['EliteFourBruno', 'EliteFourBruno2']},
  {'id': 'agatha', 'nm': '국화', 'cls': '사천왕', 'tr': 'elite_four_agatha', 'ow': 'agatha', 'music': 'champ',
   'ln': ['호호… 오박사가 아끼는 아이들 같은 녀석이 관장이라고?', '오호… 너 꽤 하는구나.', '아직 젊구먼.'], 'p': ['EliteFourAgatha', 'EliteFourAgatha2']},
  {'id': 'lance', 'nm': '목호', 'cls': '사천왕', 'tr': 'elite_four_lance', 'ow': 'lance', 'music': 'champ',
   'ln': ['나는 목호. 드래곤 포켓몬의 힘을 보여 주겠다.', '…너는 진정한 포켓몬 마스터의 그릇이다.', '드래곤은 전설의 생물이다!'], 'p': ['EliteFourLance', 'EliteFourLance2']},
]
for n in N:
    n['st'] = [party(p) for p in n.pop('p')]
# 레드: 하트골드·소울실버 은빛산 (Lv.88 피카츄 …)
N.append({'id': 'red', 'nm': '레드', 'cls': '포켓몬 트레이너', 'tr': 'red', 'ow': 'red_normal', 'music': 'champ', 'ln': ['……', '……!', '……'],
  'st': [[[25, 88, mvfix(['volttackle', 'thunderbolt', 'irontail', 'quickattack'])], [196, 84, mvfix(['psychic', 'shadowball', 'reflect', 'recover'])], [143, 82, mvfix(['blizzard', 'crunch', 'rest', 'sleeptalk'])],
          [3, 84, mvfix(['gigadrain', 'leechseed', 'sleeppowder', 'synthesis'])], [6, 84, mvfix(['flareblitz', 'blastburn', 'airslash', 'dragonpulse'])], [9, 84, mvfix(['hydrocannon', 'blizzard', 'flashcannon', 'focusblast'])]]]})
json.dump(N, open('gym/named.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for n in N: print(n['id'], [[sum(x[1] for x in s) // len(s), len(s)] for s in n['st']])
