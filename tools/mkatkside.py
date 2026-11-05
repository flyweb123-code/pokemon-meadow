# 필드 공격(Attack) 그림을 옆모습 줄로 바꿔 넣기 (경완 2026-11-05 '공격 모션 대각선 말고 수평으로')
# python3 tools/mkatkside.py <SpriteCollab 폴더>   (sprite/<번호>[/0000/0000/0002] 의 AnimData.xml·Attack-Anim.png 만 있으면 됨)
#   s0~s20.json, rf.json 의 아틀라스에서 Attack 줄만 PMD 7번 줄(왼쪽 아래) → 6번 줄(왼쪽)로 바꿔 다시 묶는다.
#   다른 줄(Idle·Walk 등)·fy·th 는 그대로. 원본에 8방향 Attack 이 없는 종은 손대지 않음.
import sys, json, base64, io, os, re, glob
import xml.etree.ElementTree as ET
from PIL import Image
SC = sys.argv[1]; ROW = 6
ALIAS = {'128paldea': '128paldeacombat', '555galar': '555galarstandard'}

def side_strip(d):
    p = d + '/AnimData.xml'
    if not os.path.exists(p): return None
    A = {e.findtext('Name'): e for e in ET.parse(p).iter('Anim')}; e = A.get('Attack'); n = 0
    while e is not None and e.find('FrameWidth') is None and n < 5: e = A.get(e.findtext('CopyOf')); n += 1
    if e is None: return None
    png = f"{d}/{e.findtext('Name')}-Anim.png"
    if not os.path.exists(png): return None
    fw, fh = int(e.findtext('FrameWidth')), int(e.findtext('FrameHeight'))
    im = Image.open(png).convert('RGBA')
    if im.height // fh < 8: return None
    durs = [int(q.text) for q in e.find('Durations')][:im.width // fw]
    hit = int(e.findtext('HitFrame') or len(durs) // 2)
    fr = [im.crop((i * fw, ROW * fh, (i + 1) * fw, (ROW + 1) * fh)) for i in range(len(durs))]
    bx = [f.getbbox() for f in fr if f.getbbox()]
    if not bx: return None
    x0, y0, x1, y1 = min(b[0] for b in bx), min(b[1] for b in bx), max(b[2] for b in bx), max(b[3] for b in bx)
    st = Image.new('RGBA', ((x1 - x0) * len(fr), y1 - y0))
    for i, f in enumerate(fr): st.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
    return st, [x1 - x0, y1 - y0, len(fr), fw / 2 - x0, fh / 2 - y0, durs, min(hit, len(durs) - 1)]

def unuri(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGBA')
def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def redo(v, d):
    r = side_strip(d)
    if not isinstance(v, dict) or 'Attack' in (v.get('gen') or []): return False   # 그림을 다시 그린 종(rd)·원본에 없던 종은 Attack 을 대기 그림으로 만들어 둠(mkatk/mkmotion) → 그대로
    if not r or 'Attack' not in v['a']: return False
    st, m = r; at = unuri(v['i']); by_y = {}
    for name, a in v['a'].items(): by_y.setdefault(a[0], []).append(name)   # 같은 줄을 같이 쓰는 이름(Idle=Walk 대체 등)은 한 번만 자름
    out, meta, y = [], {}, 0
    for y0 in sorted(by_y):
        names = [x for x in by_y[y0] if x != 'Attack']
        if not names: continue
        a = v['a'][names[0]]; img = at.crop((0, y0, a[1] * a[3], y0 + a[2])); out.append(img)
        for nm in names: meta[nm] = [y] + list(a[1:])
        y += img.height
    out.append(st); meta['Attack'] = [y] + m; y += st.height
    W = max(i.width for i in out); A2 = Image.new('RGBA', (W, y)); yy = 0
    for i in out: A2.paste(i, (0, yy)); yy += i.height
    v['i'] = uri(A2); v['a'] = {k: meta[k] for k in v['a']}; return True

n = skip = 0
for f in sorted(glob.glob('s[0-9]*.json'), key=lambda x: int(re.findall(r'\d+', x)[0])):
    D = json.load(open(f))
    for k, v in D.items():
        num = int(re.match(r'\d+', k).group())
        if redo(v, f"{SC}/sprite/{num:04d}" + ('/0000/0000/0002' if k.endswith('f') else '')): n += 1
        else: skip += 1
    json.dump(D, open(f, 'w'), separators=(',', ':'))
t = json.load(open(SC + '/tracker.json')); RF = json.load(open('rf.json'))
for k, v in t.items():
    for fo, sv in (v.get('subgroups') or {}).items():
        nm = sv.get('name', '')
        if not nm.startswith(('Alola', 'Galar', 'Hisui', 'Paldea')) or 'Alternate' in nm: continue
        key = f"{int(k)}{nm.lower().replace('_', '')}"; key = ALIAS.get(key, key)
        if key in RF:
            if redo(RF[key], f'{SC}/sprite/{k}/{fo}'): n += 1
            else: skip += 1
json.dump(RF, open('rf.json', 'w'), separators=(',', ':'))
print('attack side', n, 'skip', skip)
