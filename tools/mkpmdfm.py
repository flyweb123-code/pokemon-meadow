# 모습만 다른 폼 (경완 2026-11-05 '폼 약 260개 게임에 적용해줘' → 태어날 때 무작위)
# python3 tools/mkpmdfm.py <SpriteCollab 폴더>
#   fm/<번호>~<폼>.json = s*.json 과 같은 {i, a, fy, th} (Walk 는 7·5번 줄, 공격은 6번 옆 줄), fm.json = {번호: [폼, ...]}
#   안농 글자·로토무·아르세우스·비비용·마휘핑 등 모습 폼 + 배틀·날씨·상태 폼, 합체·아이템 폼, 메가진화·거다이맥스·원시회귀. 컷신·다른색은 뺌
import sys, json, base64, io, os
import xml.etree.ElementTree as ET
from PIL import Image
SC = sys.argv[1]
ANIMS = ['Idle', 'Walk', 'Sleep', 'Attack', 'Hurt', 'Hop', 'Eat', 'Shoot', 'Charge', 'SpAttack']
def uri(im):
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
def pack(d):
    if not os.path.exists(d + '/AnimData.xml'): return None
    x = ET.parse(d + '/AnimData.xml'); anims = {e.findtext('Name'): e for e in x.iter('Anim')}
    strips = []
    for a in ANIMS:
        e = anims.get(a); seen = 0
        while e is not None and e.find('FrameWidth') is None and seen < 5: e = anims.get(e.findtext('CopyOf')); seen += 1
        if e is None: continue
        src = e.findtext('Name'); p = f'{d}/{src}-Anim.png'
        if not os.path.exists(p): continue
        fw, fh = int(e.findtext('FrameWidth')), int(e.findtext('FrameHeight'))
        im = Image.open(p).convert('RGBA'); nrow = im.height // fh; nf = im.width // fw
        durs = [int(q.text) for q in e.find('Durations')][:nf]
        hit = int(e.findtext('HitFrame') or len(durs) // 2)
        rows = ([7, 5] if a == 'Walk' else [6] if a == 'Attack' else [7]) if nrow >= 8 else [0]
        for k, r in enumerate(rows):
            frames = [im.crop((i * fw, r * fh, (i + 1) * fw, (r + 1) * fh)) for i in range(len(durs))]
            boxes = [f.getbbox() for f in frames if f.getbbox()]
            if not boxes: continue
            x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes); x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
            strip = Image.new('RGBA', ((x1 - x0) * len(frames), y1 - y0))
            for i, f in enumerate(frames): strip.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
            name = a + ('Up' if k else '')
            strips.append((name, strip, [x1 - x0, y1 - y0, len(frames), fw / 2 - x0, fh / 2 - y0, durs, min(hit, len(durs) - 1)], frames[0], (fw, fh)))
    names = [s[0] for s in strips]
    if 'Idle' not in names and 'Walk' not in names: return None
    W = max(s[1].width for s in strips); H = sum(s[1].height for s in strips)
    atlas = Image.new('RGBA', (W, H)); meta = {}; y = 0
    for name, strip, m, f0, fwh in strips:
        atlas.paste(strip, (0, y)); meta[name] = [y] + m; y += strip.height
    base = next(s for s in strips if s[0] == ('Idle' if 'Idle' in names else 'Walk'))
    if 'Idle' not in meta: meta['Idle'] = meta['Walk']
    if 'Walk' not in meta: meta['Walk'] = meta['Idle']
    f0 = base[3]; bb = f0.getbbox(); fy = bb[3] - base[4][1] / 2
    return {'i': uri(atlas), 'a': meta, 'fy': fy, 'th': uri(f0.crop(bb))}


BAD = ('Mega', 'Gigantamax', 'Primal', 'Eternamax', 'Beta', 'Cutscene', 'Altcolor', 'Skytemple', 'Alternate', 'Shiny', 'Female', 'Male', 'Alola', 'Galar', 'Hisui', 'Paldea')   # 경완 '배틀에 필요하잖아': 배틀·상태·합체·아이템 폼도 다 받음. 메가·거다이맥스·원시회귀는 '용량 커지니까 빼' (원본은 project-files spritecollab tar)
NOT_MAIN = {(k, f) for k, L in {"150": ["Shadow"], "249": ["Shadow"], "352": ["Purple"], "479": ["Drone"], "493": ["Question_Mark"], "840": ["No_Apple"], "870": ["Brass", "Trooper"], "924": ["Shirt", "Pants"], "925": ["Baby"], "999": ["Roaming"], "1003": ["Temp"]}.items() for f in L}   # 경완 '본가 폼 아닌 것들은 다 빼줘' (v16.83)
t = json.load(open(SC + '/tracker.json')); IDX = {}; os.makedirs('fm', exist_ok=True); miss = []
for k, v in t.items():
    n = int(k)
    if n == 0: continue
    for f, sv in (v.get('subgroups') or {}).items():
        nm = sv.get('name', '')
        if f == '0000' or not nm or any(b in nm for b in BAD) or (str(n), nm) in NOT_MAIN: continue
        r = pack(f'{SC}/sprite/{k}/{f}')
        if not r: miss.append(f'{n}~{nm}'); continue
        json.dump(r, open(f'fm/{n}~{nm}.json', 'w'), separators=(',', ':')); IDX.setdefault(n, []).append(nm)
json.dump(IDX, open('fm.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print(sum(len(x) for x in IDX.values()), 'forms', len(IDX), 'species', 'missing', miss)
