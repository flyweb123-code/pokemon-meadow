# 유저 지표판 데이터 만들기 (경완 2026-11-28 '1 반영' · '둘 다 해 줘')
# 입력: tools/metrics/extract.mjs 가 만든 metrics.json (metrics-report.yml 산출물). 출력: 지표판 Artifact 에 올릴 daily·heat·users·funnel·ret.json
# 쓰는 법: python3 tools/metrics/build.py metrics.json 출력폴더
# 이름: 경완 '유저 알파벳으로 표시하지말고 그냥 이름으로 해' → NAME(친구 코드 해시 → 이름), 없으면 트레이너 카드 닉네임
import json, sys, os, datetime as dt
from collections import Counter

NAME = {'d6e02698': '동혁', 'f377c987': '미니뿡', '41f8aca7': '유찬', 'b50517ec': '똥빵귀', '7f4bfef8': 'centerr'}
GR = ['새내기', '동네', '떠오르는', '이름난', '인기', '명문', '전설']
SC = {'f': '필드', 'gym': '체육관', 'mg': '미니게임', 'bt': '배틀', 'ya': '특훈', 'fr': '친구 필드'}
KST = dt.timedelta(hours=9)
src_path, out = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '.'
d = json.load(open(src_path))
code = open(__file__).read()
K = lambda t: (dt.datetime.fromtimestamp(t / 1000, dt.UTC) + KST).date()
today = K(d['now'])
D1 = today - dt.timedelta(1); D0 = D1 - dt.timedelta(13)   # 하루가 다 찬 최근 14일 (서버 저장 백업은 14일만 남음)
days = [D0 + dt.timedelta(i) for i in range(14)]
iso = lambda x: x.isoformat()
def dk(s):   # 게임 dayKey '2026-11-3' → date
    try: y, m, dd = map(int, s.split('-')); return dt.date(y, m, dd)
    except Exception: return None

real = [u for u in d['users'] if not u.get('dev') and not u.get('bk') and (u.get('acctAt') or u.get('saveAt'))]
nm = lambda u: NAME.get(u['h']) or u.get('nick') or ('유저 ' + u['h'][:4])
def act(u):
    s = {dt.date.fromisoformat(x) for x in u.get('bal', {})} | {dt.date.fromisoformat(b[0]) for b in u.get('bak', [])}
    s |= {x for x in (dk(k) for k in u.get('day', {})) if x}
    return s
def kinds(u, day):
    b = u.get('bal', {}).get(iso(day), {})
    return b.get('egg', 0), b.get('gym', 0), b.get('sf', 0), sum(v for k, v in b.items() if k.startswith('mg:'))
def dayMin(u, day):   # 하루 접속 기록이 있으면 실제 분
    for k, o in u.get('day', {}).items():
        if dk(k) == day: return sum((o.get('m') or {}).values())
    return None

daily, heat = [], []
for day in days:
    on = [u for u in real if day in act(u)]; tot = [0, 0, 0, 0]
    for u in real:
        for i, v in enumerate(kinds(u, day)): tot[i] += v
    mins = [m for m in (dayMin(u, day) for u in real) if m is not None]
    daily.append({'date': iso(day), 'active': len(on), 'egg': tot[0], 'gym': tot[1], 'sf': tot[2], 'mg': tot[3],
                  'mgMin': round(sum(u.get('mgSec', {}).get(iso(day), 0) for u in real) / 60, 1), 'playMin': sum(mins) if mins else None})
    for u in real:
        e, g, s, m = kinds(u, day)
        heat.append({'player': nm(u), 'date': iso(day), 'on': 1 if day in act(u) else 0, 'egg': e, 'gym': g, 'mg': m})

def stop(u, A):
    if u.get('nosave') or not u.get('saveAt'): return '계정만 만들고 게임 저장이 한 번도 없음 (첫 화면에서 멈춤)'
    p = []; last = max(A) if A else None
    if last and (D1 - last).days >= 3: p.append(f'마지막 접속 {last:%m-%d} ({(D1 - last).days}일 전)')
    g = u.get('gym')
    if not g: p.append('체육관 아직 못 엶')
    else:
        sh = max(g.get('shelf') or [], key=lambda x: x.get('rep', 0), default=None)
        if sh and sh.get('rep', 0) > g.get('rep', 0): p.append(f"휴업한 {GR[sh.get('gmax') or 0]} 체육관(평판 {sh['rep']})을 두고 새 체육관을 엶, 지금 평판 {g.get('rep', 0)}")
        gd = sorted(k for k, b in u.get('bal', {}).items() if b.get('gym'))
        if gd and (D1 - dt.date.fromisoformat(gd[-1])).days >= 4: p.append(f'관장 배틀 {gd[-1][5:]} 뒤 없음')
    q = Counter()
    for o in u.get('day', {}).values(): q.update(o.get('q') or {})
    if q: p.append('앱을 주로 ' + SC.get(q.most_common(1)[0][0], q.most_common(1)[0][0]) + ' 화면에서 끔')
    if (u.get('gold') or 0) >= 30000: p.append(f"골드 {u['gold'] / 1e4:.1f}만 쌓임")
    return ' · '.join(p) or '멈춘 곳 없음'

users = []
for u in real:
    A = act(u); a14 = sorted(x for x in A if D0 <= x <= D1); last = max(A) if A else None
    ms = [m for m in (dayMin(u, x) for x in a14) if m is not None]
    g = u.get('gym'); gl = '없음'
    if g:
        gl = GR[g.get('gmax') or 0]
        sh = max(g.get('shelf') or [], key=lambda x: x.get('rep', 0), default=None)
        if sh and sh.get('rep', 0) > g.get('rep', 0): gl += f" (휴업한 {GR[sh.get('gmax') or 0]} 체육관 평판 {sh['rep']} 있음)"
    users.append({'player': nm(u), 'joined': iso(K(u['acctAt'])) if u.get('acctAt') else '', 'days14': len(a14), 'last': iso(last) if last else '',
                  'minDay': round(sum(ms) / len(ms)) if ms else (round(u['useH'] / 10) if u.get('useH') else 0), 'minReal': 1 if ms else 0,
                  'mgMin14': round(sum(v for k, v in u.get('mgSec', {}).items() if iso(D0) <= k <= iso(D1)) / 60),
                  'dex': u.get('dex', 0), 'gold': u.get('gold', 0), 'gym': gl,
                  'status': '떠남' if not a14 else ('매일' if len(a14) >= 12 else '띄엄띄엄'), 'stop': stop(u, A)})

gymDays = lambda u: sum(1 for b in u.get('bal', {}).values() if b.get('gym', 0) > 0)
funnel = [
    {'step': '계정 만듦', 'n': len(real)},
    {'step': '게임 시작 (저장 있음)', 'n': sum(1 for u in real if u.get('saveAt'))},
    {'step': '알 10마리 넘게 부화', 'n': sum(1 for u in real if (u.get('hatchN') or 0) >= 10)},
    {'step': '미니게임 해 봄', 'n': sum(1 for u in real if any(k.startswith('mg:') for b in u.get('bal', {}).values() for k in b) or (u.get('ms') or {}).get('mg1'))},
    {'step': '체육관 엶', 'n': sum(1 for u in real if u.get('gym'))},
    {'step': '관장 배틀 7일 넘게', 'n': sum(1 for u in real if gymDays(u) > 7)},
]
# 첫날·7일 잔존율: 새 기록(ms start, old 0)이 있는 새 유저만. 가입 다음 날 / 7일째에 들어왔나
ret = []
for u in real:
    st = (u.get('ms') or {}).get('start')
    if not st or st.get('old'): continue
    s0 = K(st.get('since') or st['t']); A = act(u)
    ret.append({'player': nm(u), 'start': iso(s0), 'd1': (1 if s0 + dt.timedelta(1) in A else 0) if s0 + dt.timedelta(1) <= D1 else None,
                'd7': (1 if s0 + dt.timedelta(7) in A else 0) if s0 + dt.timedelta(7) <= D1 else None})

IN = f"D1 bal(판 기록 120일)·bak(하루 첫 저장 14일)·save(지금 저장) 표, {(dt.datetime.fromtimestamp(d['now'] / 1000, dt.UTC) + KST):%Y-%m-%d %H:%M} KST에 읽음. 경완 계정·백업 칸 뺌"
meta = [{'label': 'build.py', 'value': code, 'type': 'code', 'lang': 'python'}, {'label': 'Input', 'value': IN}]
os.makedirs(out, exist_ok=True)
for n, r in [('daily', daily), ('heat', heat), ('users', users), ('funnel', funnel), ('ret', ret)]:
    json.dump({'rows': r, 'meta': meta}, open(os.path.join(out, n + '.json'), 'w'), ensure_ascii=False)
print('기간', D0, '~', D1, '유저', len(real), '새 유저(잔존 셈)', len(ret))
