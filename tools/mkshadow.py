# 원본 그림자 (경완 2026-11-05 '원본 저장소에 있는거 싹 다 받아. 그림자도 적용해.')
# python3 tools/mkshadow.py <SpriteCollab 폴더>
#   shd.json = {키: [크기, {동작: [dx, dy] 또는 [[dx, dy], ...프레임마다]}]}
#   [2] = 머리 자리 {동작: …} (<동작>-Offsets.png 의 검은 점, 같은 기준) — 말풍선·코 풍선 자리 (경완 '몸 부위 위치표 적용')
#   크기 = AnimData.xml 의 ShadowSize (0 작게·1 보통·2 크게), dx·dy = <동작>-Shadow.png 의 흰 점(그림자 가운데) - 그림 칸 가운데 (원본 px)
#   줄은 게임 아틀라스와 같게: 7번(왼쪽 아래), WalkUp 5번, Attack 6번(옆, mkatkside), 8줄이 없으면 0번. 대기 그림으로 만든 동작(gen)·다시 그린 종(rd)은 Idle 첫 칸 자리
import sys, json, os, re, glob
import xml.etree.ElementTree as ET
from PIL import Image
SC = sys.argv[1]
ALIAS = {'128paldea': '128paldeacombat', '555galar': '555galarstandard'}
ROW = {'WalkUp': 5, 'Attack': 6, 'WalkD': 0, 'WalkN': 4, 'WalkS': 6, 'IdleS': 6}   # 다른 방향(mkpmddir)
SRC = {'WalkUp': 'Walk', 'WalkD': 'Walk', 'WalkN': 'Walk', 'WalkS': 'Walk', 'IdleS': 'Idle'}
def anims(d):
    p = d + '/AnimData.xml'
    if not os.path.exists(p): return None, {}
    x = ET.parse(p); A = {e.findtext('Name'): e for e in x.iter('Anim')}
    return int(x.getroot().findtext('ShadowSize') or 1), A
def spots(d, A, name, kind='Shadow', hit=lambda p: p[0] > 200 and p[1] > 200 and p[2] > 200):
    src = SRC.get(name, name)
    e = A.get(src); n = 0
    while e is not None and e.find('FrameWidth') is None and n < 5: e = A.get(e.findtext('CopyOf')); n += 1
    if e is None: return None
    png = f"{d}/{e.findtext('Name')}-{kind}.png"
    if not os.path.exists(png): return None
    fw, fh = int(e.findtext('FrameWidth')), int(e.findtext('FrameHeight'))
    im = Image.open(png).convert('RGBA'); rows = im.height // fh
    row = ROW.get(name, 7) if rows >= 8 else 0
    nf = min(len(e.find('Durations')), im.width // fw); px = im.load(); out = []
    for i in range(nf):
        c = None
        for y in range(row * fh, (row + 1) * fh):
            for xx in range(i * fw, (i + 1) * fw):
                p = px[xx, y]
                if p[3] and hit(p): c = (xx - i * fw - fw // 2, y - row * fh - fh // 2); break
            if c: break
        out.append(list(c) if c else (out[-1] if out else None))
    if not out or out[0] is None: return None
    return out[0] if all(o == out[0] for o in out) else out
keys = {}
for f in glob.glob('s[0-9]*.json'):
    for k, v in json.load(open(f)).items():
        if not isinstance(v, dict): continue
        n = int(re.match(r'\d+', k).group()); keys[k] = (f'{n:04d}' + ('/0000/0000/0002' if k.endswith('f') else ''), v)
RF = json.load(open('rf.json')); t = json.load(open(SC + '/tracker.json'))
for k, v in t.items():
    for fo, sv in (v.get('subgroups') or {}).items():
        nm = sv.get('name', '')
        if not nm.startswith(('Alola', 'Galar', 'Hisui', 'Paldea')) or 'Alternate' in nm: continue
        key = ALIAS.get(f"{int(k)}{nm.lower().replace('_', '')}", f"{int(k)}{nm.lower().replace('_', '')}")
        if isinstance(RF.get(key), dict): keys[key] = (f'{k}/{fo}', RF[key])
OUT = {}; miss = 0
for key, (rp, v) in sorted(keys.items()):
    d = f'{SC}/sprite/{rp}'; sz, A = anims(d)
    if not A and '/' in rp: d = f'{SC}/sprite/{rp.split("/")[0]}'; sz, A = anims(d)   # 암컷·폼 그림이 따로 없으면 기본 모습
    if not A: miss += 1; continue
    names = list(v['a'])
    if os.path.exists(f'mx/{key}.json'): names += list(json.load(open(f'mx/{key}.json'))['a'])
    idle = spots(d, A, 'Idle'); i0 = (idle[0] if isinstance(idle[0], list) else idle) if idle else [0, 4]
    gen = set(v.get('gen') or []); M = {}
    for nm in names:
        s = None if v.get('rd') or nm in gen else spots(d, A, nm)
        s = s or i0
        if s != i0: M[nm] = s
    M['_'] = i0
    HD = lambda nm: spots(d, A, nm, 'Offsets', lambda p: p[0] < 40 and p[1] < 40 and p[2] < 40)
    h0 = HD('Idle'); h0 = (h0[0] if isinstance(h0[0], list) else h0) if h0 else None; Hd = {}
    if h0:
        for nm in names + ['WalkD', 'WalkN', 'WalkS', 'IdleS']:
            s = None if v.get('rd') or nm in gen else HD(nm)
            s = s and (s[0] if isinstance(s[0], list) else s)   # 머리는 동작마다 첫 칸 자리 하나 (칸마다 말풍선이 떨지 않게)
            if s and s != h0: Hd[nm] = s
        Hd['_'] = h0
    for nm in ['WalkD', 'WalkN', 'WalkS', 'IdleS']:
        if v.get('rd'): continue
        s = spots(d, A, nm)
        if s and s != i0: M[nm] = s
    OUT[key] = [sz, M, Hd] if Hd else [sz, M]
json.dump(OUT, open('shd.json', 'w'), separators=(',', ':'))
print('shd', len(OUT), 'miss', miss, os.path.getsize('shd.json'))
