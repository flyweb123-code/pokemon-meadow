# 특훈 마지막 대장 메가진화 그림 (경완 2026-11-16 '우리 필드용 메가 폼 그림 있는데 다 받아줘')
# python3 tools/mkpmdmega.py <SpriteCollab 폴더>   (원본 tar = project-files pokemon-meadow/spritecollab, sprite/<번호>/<폼>/ 만 풀면 됨)
#   gym/img/yact/mg/<번호>.json = fm/*.json 과 같은 {i, a, fy, th} (mkpmdfm.py 의 pack 그대로), 목록은 끝에 찍힘 → gym/yact.js MEGA_SPR
#   SpriteCollab 에 그림이 올라온 메가 폼만 (이름에 Mega, Altcolor·Skytemple·Shadow 등은 뺌). 한 종에 X·Y 가 있으면 그림 있는 첫 번째
import sys, json, os
src = open(os.path.join(os.path.dirname(__file__), 'mkpmdfm.py'), encoding='utf-8').read()
exec(src[:src.index('\nBAD = ')])
SKIP = ('Altcolor', 'Skytemple', 'Shadow', 'Baby', 'Stretchy', 'Droopy', 'Original', 'Alternate')
t = json.load(open(SC + '/tracker.json')); out = 'gym/img/yact/mg'; os.makedirs(out, exist_ok=True); done = []
def walk(k, pre, sub):
    for f, sv in (sub or {}).items():
        nm = sv.get('name', ''); p = pre + [f]
        if 'Mega' in nm and not any(b in nm for b in SKIP) and int(k) not in done:
            r = pack(f'{SC}/sprite/{k}/' + '/'.join(p))
            if r: json.dump(r, open(f'{out}/{int(k)}.json', 'w'), separators=(',', ':')); done.append(int(k))
        walk(k, p, sv.get('subgroups'))
for k, v in t.items(): walk(k, [], v.get('subgroups'))
print(len(done), sorted(done))
