# 필드 그림(PMDCollab 불가사의 던전 스타일)의 지역 폼 (경완 2026-11-05 '다른 폼 그림 다 받아와줘')
# python3 tools/mkpmdforms.py <SpriteCollab 폴더>   (sprite/<번호>/<폼> 만 sparse checkout 해도 됨)
#   tracker.json 에서 이름이 Alola·Galar·Hisui·Paldea 로 시작하는 폼(Alternate 빼고) → src/mkpmd.py 와 같은 아틀라스
#   → rf.json { '<번호><지역>': {i, a, fy, th} } (예: '110galar', 배틀 그림 rf.json 의 [번호, 지역] 과 같은 이름). 아직 게임에서 쓰지 않음
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
        rows = ([7, 5] if a == 'Walk' else [7]) if nrow >= 8 else [0]
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

ALIAS = {'128paldea': '128paldeacombat', '555galar': '555galarstandard'}   # 배틀 그림(gym/img/pk/rf/rf.json) 이름에 맞춤
t = json.load(open(SC + '/tracker.json')); out = {}; miss = []
for k, v in t.items():
    for f, sv in (v.get('subgroups') or {}).items():
        n = sv.get('name', '')
        if not n.startswith(('Alola', 'Galar', 'Hisui', 'Paldea')) or 'Alternate' in n: continue
        key = f"{int(k)}{n.lower().replace('_', '')}"; key = ALIAS.get(key, key)
        r = pack(f'{SC}/sprite/{k}/{f}')
        if r: out[key] = r
        else: miss.append(key)
json.dump(out, open('rf.json', 'w'), separators=(',', ':'))
print(len(out), 'forms', 'missing', miss, os.path.getsize('rf.json'))
