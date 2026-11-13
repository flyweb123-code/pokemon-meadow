# 5세대 이후 기술 연출: Gen 9 Move Animation Project(Pokémon Essentials, Eevee Expo 1480)의 PkmnAnimations.rxdata 를 우리 배틀용으로 뽑는다.
# python3 -I tools/gym/mkess.py <풀어 둔 팩 폴더>   → gym/img/ess/{a/<기술>.json, g/<n>.png, se/<n>.mp3, idx.json}
# 우리에게 플래티넘 원본 연출(gym/mvfx.json)이 없는 기술만. 상대용(OppMove) 연출이 있으면 같은 파일 o 에.
# 칸 값: [칸 번호, 무늬(-1 쓰는쪽 그림, -2 맞는쪽 그림), x, y, 가로%, 세로%, 각도, 뒤집기, 섞기(1 더하기 2 빼기), 불투명(0~255), 초점(1 맞는쪽 2 쓰는쪽 3 둘 다 4 화면), 앞뒤(0 뒤 1 앞 2 초점 뒤 3 초점 앞), 색 r,g,b,a]
import sys, os, json, re, subprocess, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.setrecursionlimit(100000)
import rbmarshal as rm
P = sys.argv[1]; R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'); O = R + '/gym/img/ess'
L = lambda v: v.list if hasattr(v, 'list') else v
nm = lambda v: v.decode('utf8', 'replace') if isinstance(v, bytes) else (v or '')
d = rm.load(P + '/Data/PkmnAnimations.rxdata'); arr = L(d.iv['@array'])
def cel(c):
    c = L(c); g = lambda k, dv=0: (c[k] if k < len(c) and c[k] is not None else dv)
    if g(6, 1) != 1: return None
    v = [g(7), g(0), g(1), g(2, 100), g(11, 100), g(3), g(4), g(5), g(8, 255), g(26, 4), g(25, 1), g(12), g(13), g(14), g(15)]
    while len(v) > 11 and v[-1] == 0: v.pop()
    return [int(round(x)) if isinstance(x, float) else x for x in v]
an = {}
for a in arr:
    if not a: continue
    n = nm(a.iv['@name']); n = 'Move:ZPOWER' if n == 'Common:ZPower' else n; m = re.match(r'(Opp)?Move:([A-Z0-9]+)$', n)   # Z파워 두르기 공통 연출 = 'zpower'
    if not m: continue
    k = ('O:' if m.group(1) else '') + m.group(2).lower()
    if k in an: continue
    fr = [[[i] + cel(c) for i, c in enumerate(L(f) or []) if c is not None and cel(c)] for f in L(a.iv['@array']) or []]
    tm = []
    for t in L(a.iv['@timing']) or []:
        v = {k2[1:]: (nm(x) if isinstance(x, bytes) else x) for k2, x in t.iv.items() if not isinstance(x, rm.Raw) and x is not None}
        ty = v.get('timingType', 0)
        if ty == 0: e = [ty, v.get('frame', 0), v.get('name', ''), v.get('volume', 100), v.get('pitch', 100)]
        elif ty in (1, 3): e = [ty, v.get('frame', 0), v.get('name', ''), v.get('bgX', 0) or 0, v.get('bgY', 0) or 0, v.get('opacity', 0) or 0, [v.get('colorRed', 0) or 0, v.get('colorGreen', 0) or 0, v.get('colorBlue', 0) or 0, v.get('colorAlpha', 0) or 0]]
        elif ty in (2, 4): e = [ty, v.get('frame', 0), v.get('duration', 0), v.get('bgX'), v.get('bgY'), v.get('opacity'), [v.get('colorRed'), v.get('colorGreen'), v.get('colorBlue'), v.get('colorAlpha')]]
        else: continue
        tm.append(e)
    an[k] = {'g': nm(a.iv['@graphic']), 'f': fr, 't': tm}
fx = json.load(open(R + '/gym/mvfx.json')); data = json.load(open(R + '/gym/data.json'))
want = [x[0] for x in data['mv'] if x[0] not in fx and x[0] in an]
# 2026-11-13 Z기술 연출 (경완): 위 목록 뒤에 붙여야 앞 기술들의 그림·소리 번호가 그대로
ZM = sorted(os.path.splitext(f)[0].lower() for f in os.listdir(R + '/gym/img/dbk/Z-Power/Z-Titles'))
want += [k for k in ZM + ['zpower'] if k in an and k not in want]
for sub in ('a', 'g', 'se'): os.makedirs(f'{O}/{sub}', exist_ok=True)
gi, si = {}, {}
GA, SE = P + '/Graphics/Animations/', P + '/Audio/SE/Anim/'
sef = {f.lower(): f for f in os.listdir(SE)}
def gmap(n):
    if not n: return ''
    if n not in gi:
        src = GA + n
        if not os.path.exists(src): gi[n] = ''; return ''
        gi[n] = str(len(gi)); shutil.copy(src, f'{O}/g/{gi[n]}.png')
    return gi[n]
def smap(n):
    if not n: return ''
    if n not in si:
        f = sef.get(n.lower()) or sef.get(n.lower() + '.wav') or sef.get(n.lower() + '.ogg') or sef.get(n.lower() + '.mp3')
        if not f: si[n] = ''; return ''
        si[n] = str(len(si)); subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SE + f, '-ac', '1', '-b:a', '80k', f'{O}/se/{si[n]}.mp3'], check=True)
    return si[n]
idx = {}
for k in want:
    out = {}
    for kk, slot in ((k, 'm'), ('O:' + k, 'o')):
        A = an.get(kk)
        if not A: continue
        A = json.loads(json.dumps(A)); A['g'] = gmap(A['g'])
        for t in A['t']:
            if t[0] in (1, 3): t[2] = gmap(t[2])
            elif t[0] == 0: t[2] = smap(t[2])
        out[slot] = A
    json.dump(out, open(f'{O}/a/{k}.json', 'w'), separators=(',', ':'))
    idx[k] = 1 + (2 if 'o' in out else 0)
json.dump(idx, open(f'{O}/idx.json', 'w'), separators=(',', ':'))
print(len(want), 'moves', len(gi), 'pics', len(si), 'sounds')
