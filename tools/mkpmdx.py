# 필드 그림 추가 동작 + 얼굴 표정 (경완 2026-11-05 '얼굴 표정, 필드 동작 다 받아주고 상호작용 별로 알맞게')
# python3 tools/mkpmdx.py <SpriteCollab 폴더>   (sprite/<번호>/*.xml·필요한 -Anim.png, portrait/<번호>/*.png 만 있으면 됨)
#   mx/<키>.json = {i: 아틀라스, a: {동작: [y, w, h, n, cx, cy, durs, hit]}}  — s*.json 에 없는 동작(끄덕이기·앉기 등), 필요할 때만 받음
#   face/<키>.png = 40x40 표정을 가로로 이어 붙인 것, face.json = {키: [표정 이름, ...]}
#   키는 s*.json 과 같음 (번호, 'Nf' 암컷, rf.json 의 지역 폼 이름)
import sys, json, base64, io, os, re, glob
import xml.etree.ElementTree as ET
from PIL import Image
SC = sys.argv[1]
BASE = {'Idle', 'Walk', 'Sleep', 'Attack', 'Hurt', 'Hop', 'Eat', 'Shoot', 'Charge', 'SpAttack'}
SKIP = {'EventSleep', 'Fainted', 'Special0', 'Special1', 'Special2', 'StandingUp', 'DigIn', 'DigOut'}
ALIAS = {'128paldea': '128paldeacombat', '555galar': '555galarstandard'}
def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
def pack(d):
    p = d + '/AnimData.xml'
    if not os.path.exists(p): return None
    A = {e.findtext('Name'): e for e in ET.parse(p).iter('Anim')}; strips = []
    for name in A:
        if name in BASE or name in SKIP: continue
        e = A[name]; n = 0
        while e is not None and e.find('FrameWidth') is None and n < 5: e = A.get(e.findtext('CopyOf')); n += 1
        if e is None: continue
        png = f"{d}/{e.findtext('Name')}-Anim.png"
        if not os.path.exists(png): continue
        fw, fh = int(e.findtext('FrameWidth')), int(e.findtext('FrameHeight'))
        im = Image.open(png).convert('RGBA'); row = 7 if im.height // fh >= 8 else 0
        durs = [int(q.text) for q in e.find('Durations')][:im.width // fw]
        if not durs: continue
        hit = int(e.findtext('HitFrame') or len(durs) // 2)
        fr = [im.crop((i * fw, row * fh, (i + 1) * fw, (row + 1) * fh)) for i in range(len(durs))]
        bx = [f.getbbox() for f in fr if f.getbbox()]
        if not bx: continue
        x0, y0, x1, y1 = min(b[0] for b in bx), min(b[1] for b in bx), max(b[2] for b in bx), max(b[3] for b in bx)
        st = Image.new('RGBA', ((x1 - x0) * len(fr), y1 - y0))
        for i, f in enumerate(fr): st.paste(f.crop((x0, y0, x1, y1)), (i * (x1 - x0), 0))
        strips.append((name, st, [x1 - x0, y1 - y0, len(fr), fw / 2 - x0, fh / 2 - y0, durs, max(0, min(hit, len(durs) - 1))]))
    if not strips: return None
    W = max(s[1].width for s in strips); H = sum(s[1].height for s in strips); at = Image.new('RGBA', (W, H)); meta = {}; y = 0
    for name, st, m in strips: at.paste(st, (0, y)); meta[name] = [y] + m; y += st.height
    return {'i': uri(at), 'a': meta}
EMO = ['Normal', 'Happy', 'Joyous', 'Inspired', 'Surprised', 'Determined', 'Angry', 'Shouting', 'Sad', 'Crying', 'Teary-Eyed', 'Worried', 'Pain', 'Dizzy', 'Sigh', 'Stunned']
def face(d, key):
    have = [e for e in EMO if os.path.exists(f'{d}/{e}.png')]
    if not have: return None
    st = Image.new('RGBA', (40 * len(have), 40))
    for i, e in enumerate(have): st.paste(Image.open(f'{d}/{e}.png').convert('RGBA').resize((40, 40)), (i * 40, 0))
    st.save(f'face/{key}.png', optimize=True); return have
keys = {}
for f in glob.glob('s[0-9]*.json'):
    for k in json.load(open(f)):
        n = int(re.match(r'\d+', k).group()); keys[k] = f'{n:04d}' + ('/0000/0000/0002' if k.endswith('f') else '')
RF = json.load(open('rf.json')); t = json.load(open(SC + '/tracker.json'))
for k, v in t.items():
    for fo, sv in (v.get('subgroups') or {}).items():
        nm = sv.get('name', '')
        if not nm.startswith(('Alola', 'Galar', 'Hisui', 'Paldea')) or 'Alternate' in nm: continue
        key = ALIAS.get(f"{int(k)}{nm.lower().replace('_', '')}", f"{int(k)}{nm.lower().replace('_', '')}")
        if key in RF: keys[key] = f'{k}/{fo}'
os.makedirs('mx', exist_ok=True); os.makedirs('face', exist_ok=True); FI = {}; nx = 0
for key, rp in sorted(keys.items()):
    r = pack(f'{SC}/sprite/{rp}')
    if r: json.dump(r, open(f'mx/{key}.json', 'w'), separators=(',', ':')); nx += 1
    fc = face(f'{SC}/portrait/{rp}', key) or (face(f'{SC}/portrait/{rp.split("/")[0]}', key) if '/' in rp else None)   # 암컷·폼 얼굴이 없으면 기본 얼굴
    if fc: FI[key] = [EMO.index(e) for e in fc]
json.dump({'emo': EMO, 'k': FI}, open('face.json', 'w'), separators=(',', ':'))
print('mx', nx, 'face', len(FI), 'of', len(keys))
