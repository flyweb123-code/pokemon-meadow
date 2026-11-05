# 다른 방향 그림 (경완 2026-11-05 '다른 방향 그림 … 게임에 적용해줘')
# python3 tools/mkpmddir.py <SpriteCollab 폴더>   (mkpmdx.py 다음에 돌림)
#   mx/<키>.json 아틀라스 아래에 원본 8방향 중 게임이 안 쓰던 줄을 붙인다 (오른쪽은 게임이 좌우 뒤집기)
#   WalkD = 걷기 0번 줄(아래), WalkN = 4번(위), WalkS = 6번(옆), IdleS = 대기 6번(옆, 마주 보고 얘기할 때)
#   다시 그린 종(rd)은 원본과 그림이 달라서 뺀다
import sys, json, base64, io, os, re, glob
import xml.etree.ElementTree as ET
from PIL import Image
SC = sys.argv[1]
DIRS = {'WalkD': ('Walk', 0), 'WalkN': ('Walk', 4), 'WalkS': ('Walk', 6), 'IdleS': ('Idle', 6)}
ALIAS = {'128paldea': '128paldeacombat', '555galar': '555galarstandard'}
def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
def unuri(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGBA')
def strips(d):
    p = d + '/AnimData.xml'
    if not os.path.exists(p): return []
    A = {e.findtext('Name'): e for e in ET.parse(p).iter('Anim')}; out = []
    for name, (src, row) in DIRS.items():
        e = A.get(src); n = 0
        while e is not None and e.find('FrameWidth') is None and n < 5: e = A.get(e.findtext('CopyOf')); n += 1
        if e is None: continue
        png = f"{d}/{e.findtext('Name')}-Anim.png"
        if not os.path.exists(png): continue
        fw, fh = int(e.findtext('FrameWidth')), int(e.findtext('FrameHeight'))
        im = Image.open(png).convert('RGBA')
        if im.height // fh < 8: continue
        durs = [int(q.text) for q in e.find('Durations')][:im.width // fw]
        if not durs: continue
        fr = [im.crop((i * fw, row * fh, (i + 1) * fw, (row + 1) * fh)) for i in range(len(durs))]
        bx = [f.getbbox() for f in fr if f.getbbox()]
        if not bx: continue
        x0, y0, x1, y1 = min(b[0] for b in bx), min(b[1] for b in bx), max(b[2] for b in bx), max(b[3] for b in bx)
        st = Image.new('RGBA', ((x1 - x0) * len(fr), y1 - y0))
        for i, f in enumerate(fr): st.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
        out.append((name, st, [x1 - x0, y1 - y0, len(fr), fw / 2 - x0, fh / 2 - y0, durs, len(durs) // 2]))
    return out
keys = {}
for f in glob.glob('s[0-9]*.json'):
    for k, v in json.load(open(f)).items():
        if not isinstance(v, dict) or v.get('rd'): continue
        n = int(re.match(r'\d+', k).group()); keys[k] = f'{n:04d}' + ('/0000/0000/0002' if k.endswith('f') else '')
RF = json.load(open('rf.json')); t = json.load(open(SC + '/tracker.json'))
for k, v in t.items():
    for fo, sv in (v.get('subgroups') or {}).items():
        nm = sv.get('name', '')
        if not nm.startswith(('Alola', 'Galar', 'Hisui', 'Paldea')) or 'Alternate' in nm: continue
        key = ALIAS.get(f"{int(k)}{nm.lower().replace('_', '')}", f"{int(k)}{nm.lower().replace('_', '')}")
        if isinstance(RF.get(key), dict): keys[key] = f'{k}/{fo}'
nd = 0
for key, rp in sorted(keys.items()):
    S = strips(f'{SC}/sprite/{rp}')
    if not S: continue
    p = f'mx/{key}.json'; X = json.load(open(p)) if os.path.exists(p) else {'i': None, 'a': {}}
    for n in DIRS: X['a'].pop(n, None)
    base = unuri(X['i']) if X['i'] else Image.new('RGBA', (1, 1)); H0 = max([a[0] + a[2] for a in X['a'].values()] or [0])
    W = max([base.width] + [s[1].width for s in S]); H = H0 + sum(s[1].height for s in S)
    at = Image.new('RGBA', (W, H)); at.paste(base.crop((0, 0, base.width, H0)) if H0 else Image.new('RGBA', (1, 1)), (0, 0)); y = H0
    for name, st, m in S: at.paste(st, (0, y)); X['a'][name] = [y] + m; y += st.height
    X['i'] = uri(at); json.dump(X, open(p, 'w'), separators=(',', ':')); nd += 1
print('dir', nd, 'of', len(keys))
