# 기술 연출: 플래티넘 원본 기술 연출 대본(pret/pokeplatinum res/moves/*/anim.s)을 읽어 gym/mvfx.json 으로.
# python3 tools/gym/mkanim.py <pokeplatinum 폴더>   (먼저 tools/gym/mkspl.py 로 gym/img/spl 을 만들어 둔다. 결과는 베타용 gymb/mvfx.json)
# 파티클은 원본 방출기 그대로(gymb/spl.js), 소리·흔들기·움직임·배경 어둡게·색 번쩍도 그대로 옮긴다.
# 결과: { 기술id: [길이, [사건...]] } 또는 내 쪽/상대 쪽이 다르면 { 기술id: [[길이, 사건], [길이, 사건]] } (공격하는 쪽: 0 내 쪽, 1 상대)
# 시간은 프레임(1/30초). 사건:
#   ['s', t, 소리, 좌우]           좌우 a=공격하는 쪽 d=맞는 쪽 c=가운데 m=공격→맞는 쪽으로 이동
#   ['k', t, 대상, x폭, y폭, 간격, 횟수]   흔들기. 대상 a d ad bg
#   ['m', t, 대상, dx, dy, 프레임]  포켓몬 움직이기 (내 쪽 기준, 상대면 좌우·위아래 뒤집기)
#   ['b', t, 시작, 끝, 색, 프레임] 배경 색 덮기 (0~16)
#   ['f', t, 대상, 색, 세기, 프레임] 포켓몬 색 번쩍
#   ['p', t, ps, 파일, 번호, 콜백, [추가값...], 방출기칸]   원본 파티클 방출기 만들기 (gymb/spl.js 가 원본 SPL 대로 돌린다)
#                                   파일은 gym/img/spl/<파일>.json·png, 콜백·추가값은 원본 EMITTER_CB_* 와 SetExtraParams 그대로
#   ['pl'|'pq', t, 방출기칸, x, y, 늦춤, 프레임, 반지름, 방향, 건너뛰기, 곡선]  방출기를 공격→맞는 쪽으로 직선/포물선 이동
#   ['pr', t, 방출기칸, 시작x, 끝x, 시작y, 끝y, 반지름x, 반지름y, 프레임, 대상]  방출기 공전
#   ['pu', t, ps]                    파티클 묶음 내리기 (남은 방출기 지움)
#   ['h', t, 대상, 1/0]             포켓몬 숨기기/보이기
#   ['z', t, 대상, x배율, y배율, 프레임]
#   ['w', t, 1/0]                   특수 배경(빠르게 흐르는 배경 등) 켜기/끄기
import sys, os, re, json
PL = sys.argv[1]; SRC = PL + '/res/moves/'
SPL = 'gym/img/spl/'
COLOR = {'BLACK': '#000', 'WHITE': '#fff', 'RED': '#f03018', 'BLUE': '#3060f0', 'PURPLE': '#a040c0', 'YELLOW': '#f8e030', 'GREEN': '#40c040', 'ORANGE': '#f88020', 'LIGHT_BLUE': '#80c8f8', 'PINK': '#f878b8', 'GRAY': '#808080', 'BROWN': '#a06030', 'DARK_BLUE': '#183080', 'CYAN': '#40e0e0'}
def col(s):
    m = re.match(r'BATTLE_COLOR_(\w+)', s)
    if m: return COLOR.get(m.group(1), '#fff')
    return '#fff'
def who(s):
    if 'ATTACKER' in s: return 'a'
    if 'DEFENDER' in s: return 'd'
    return 'ad'
CONST = {'EMITTER_ANIMATION_MODE_ATK_TO_DEF': 0, 'EMITTER_ANIMATION_MODE_DEF_TO_ATK': 1, 'EMITTER_REVOLUTION_MODE_ATTACKER': 0,
         'EMITTER_REVOLUTION_MODE_DEFENDER': 1, 'EMITTER_ANIMATION_FROM_TOP': 0, 'EMITTER_ANIMATION_TO_TOP': 1, 'TRUE': 1, 'FALSE': 0}
CB = ['NONE', 'SET_POS_TO_ENEMY_1', 'SET_POS_TO_PLAYER_1', 'SET_POS_TO_ATTACKER', 'SET_POS_TO_DEFENDER', 'SET_AXIS_POS', 'SET_AXIS_POS_REVERSED',
      'SET_AXIS_POS_CONVERGE_DEFAULT', 'SET_AXIS_POS_CONVERGE_CENTER', 'SET_AXIS_POS_CONVERGE_ATTACKER', 'SET_AXIS_POS_CONVERGE_DEFENDER',
      'SET_AXIS_POS_CONVERGE_EXPLICIT', 'SET_AXIS_POS_MAGNET_DEFAULT', 'SET_AXIS_POS_MAGNET_CENTER', 'SET_AXIS_POS_MAGNET_ATTACKER',
      'SET_AXIS_POS_MAGNET_DEFENDER', 'SET_AXIS_POS_MAGNET_EXPLICIT', 'GENERIC', 'SET_POS_BASED_ON_BATTLERS', 'SET_POS_TO_ATTACKER_SIDE',
      'SET_POS_TO_DEFENDER_SIDE', 'SET_POS_TO_ATTACKER_2', 'NONE_2']
CONST.update({'EMITTER_CB_' + n: i for i, n in enumerate(CB)})
DEF = {}
def num(s):
    s = s.strip()
    if re.match(r'^-?\d+$', s): return int(s)
    s = re.sub(r'\b[A-Z_][A-Z0-9_]*\b', lambda m: str(DEF.get(m.group(0), CONST.get(m.group(0), m.group(0)))), s)
    s = re.sub(r'\b[A-Z_][A-Z0-9_]*\b', lambda m: str(CONST.get(m.group(0), m.group(0))), s)
    s = s.replace('SKIP_F', '(lambda f: (f & 0xFFFF) << 16)').replace('MAX_F', '(lambda f: f & 0xFFFF)')
    try: return int(eval(s, {'__builtins__': {}}))
    except Exception: return 0
SPA = {}
def spa(name):   # 파티클 파일 하나의 방출기 설정 (수명 어림용)
    if name not in SPA:
        try: SPA[name] = json.load(open(SPL + name + '.json'))['r']
        except Exception: SPA[name] = []
    return SPA[name]
def life(name, rid):   # 방출기가 시작부터 마지막 파티클이 사라질 때까지 걸리는 프레임(어림)
    R = spa(name)
    if rid >= len(R): return 0
    r = R[rid]; return r['dly'] + (r['elt'] or 60) + r['plt'] + 1 + (r['ch']['lt'] if 'ch' in r else 0)

def parse(path):
    L, lab = [], {}; DEF.clear()
    for ln in open(path):
        ln = ln.split('//')[0].strip()
        if ln.startswith('#define'): p = ln.split(None, 2); DEF[p[1]] = p[2]; continue
        if not ln or ln.startswith('#') or ln.startswith('.'): continue
        if ln.endswith(':'): lab[ln[:-1]] = len(L); continue
        p = ln.split(None, 1); L.append((p[0], [a.strip() for a in p[1].split(',')] if len(p) > 1 else []))
    return L, lab

def run(L, lab, side):
    t, task, emit, ev, pc, loops, guard = 0, 0, 0, [], 0, [], 0
    PS, EM, lastP = {}, {}, None
    def snd(a, pan, at=0):
        m = re.match(r'SEQ_SE_DP_(\w+?)_sseq', a)
        if m: ev.append(['s', t + at, m.group(1), pan])
    P = {'L': 'a', 'R': 'd', 'C': 'c'}
    def pan(s): return 'a' if 'LEFT' in s else 'd' if 'RIGHT' in s else 'c'
    while pc < len(L) and guard < 5000:
        guard += 1; c, a = L[pc]; pc += 1
        if c == 'End': break
        elif c == 'Jump': pc = lab[a[0]]
        elif c == 'JumpIfBattlerSide': pc = lab[a[1] if side else a[2]]
        elif c == 'JumpIfEffectChanceOdd': pc = lab[a[0]]
        elif c in ('JumpIfContest', 'JumpIfFriendlyFire', 'JumpIfWeather', 'JumpIfNotContest'): pass
        elif c == 'BeginLoop': loops.append([pc, num(a[0])])
        elif c == 'EndLoop':
            if loops:
                loops[-1][1] -= 1
                if loops[-1][1] > 0: pc = loops[-1][0]
                else: loops.pop()
        elif c == 'Delay': t += num(a[0])
        elif c == 'WaitForAnimTasks': t = max(t, task)
        elif c == 'WaitForAllEmitters': t = max(t, emit)
        elif c in ('WaitForBgSwitch',): t = max(t, task, t + 8)
        elif c.startswith('PlaySoundEffect') and len(c) == 16: snd(a[0], P[c[-1]])
        elif c == 'PlayPannedSoundEffect': snd(a[0], pan(a[1]))
        elif c.startswith('PlayDelayedSoundEffect'):
            if c[-1] in P: snd(a[0], P[c[-1]], num(a[1]))
            else: snd(a[0], pan(a[1]), num(a[2]))
        elif c.startswith('PlayLoopedSoundEffect'):
            if c[-1] in P: s0, iv, n = P[c[-1]], num(a[1]), num(a[2])
            else: s0, iv, n = pan(a[1]), num(a[2]), num(a[3])
            for i in range(max(1, n)): snd(a[0], s0, i * max(1, iv))
        elif c.startswith('PlayMovingSoundEffect'): snd(a[0], 'm')
        elif c == 'Func_Shake':
            ex, ey, iv, n = num(a[0]), num(a[1]), num(a[2]), num(a[3]); tg = a[4]
            w = 'ad' if 'DEFENDER' in tg and 'ATTACKER' in tg else who(tg)
            ev.append(['k', t, w, ex, ey, iv, n]); task = max(task, t + n * 2 * (iv + 1))
        elif c == 'Func_ShakeBg':
            ex, ey, iv, n = num(a[0]), num(a[1]), num(a[2]), num(a[3])
            ev.append(['k', t, 'bg', ex, ey, iv, n]); task = max(task, t + n * 2 * (iv + 1))
        elif c == 'Func_MoveBattler':
            f = max(1, num(a[3])); ev.append(['m', t, who(a[0]), num(a[1]), num(a[2]), f]); task = max(task, t + f)
        elif c in ('Func_MoveBattlerX', 'Func_MoveBattlerX2'):
            f = max(1, num(a[0])); ev.append(['m', t, who(a[2]), num(a[1]), 0, f]); task = max(task, t + f)
        elif c == 'Func_QuickAttack':
            ev.append(['m', t, 'a', 24, -12, 3]); ev.append(['m', t + 6, 'a', -24, 12, 3]); task = max(task, t + 10)
        elif c == 'Func_FadeBg':
            dl, s0, s1 = num(a[1]), num(a[2]), num(a[3]); f = abs(s1 - s0) * (dl + 1)
            if 'BASE' in a[0]: ev.append(['b', t, s0, s1, col(a[4]), f])
            task = max(task, t + f)
        elif c == 'Func_FadeBattlerSprite':
            n = num(a[4]); f = n * 2 + 2; ev.append(['f', t, who(a[0]), col(a[3]), n, f]); task = max(task, t + f)
        elif c == 'Func_HideBattler': ev.append(['h', t, who(a[0]), 1 if a[1] == 'TRUE' else 0])
        elif c == 'Func_ScaleBattlerSprite':
            v = [num(x) for x in a[1:6]]; m = re.findall(r'(\w+)_F\((\d+)\)', ' '.join(a[6:]))
            f = sum(int(x[1]) for x in m) or 8
            ev.append(['z', t, who(a[0]), v[1] / 100, v[3] / 100, f]); task = max(task, t + f)
        elif c in ('Func_Flail', 'Func_PlayfulHops', 'Func_BlinkAttacker'):
            ev.append(['k', t, 'a', 0, 4, 1, 3]); task = max(task, t + 8)
        elif c == 'LoadParticleResource': PS[num(a[0])] = re.sub(r'_spa$', '', a[1]); t += 2
        elif c in ('CreateEmitter', 'CreateEmitterEx', 'CreateEmitterForMove'):
            if c == 'CreateEmitter': ps, ei, rid = num(a[0]), 0, num(a[1])
            elif c == 'CreateEmitterEx': ps, ei, rid = num(a[0]), num(a[1]), num(a[2])
            else: ps, ei, rid = num(a[0]), 0, num(a[1 if not side else 4])
            nm = PS.get(ps)
            if nm is None: continue
            lastP = ['p', t, ps, nm, rid, num(a[-1]), [], ei]; ev.append(lastP)
            EM[ei] = (nm, rid, t); emit = max(emit, t + life(nm, rid))
        elif c == 'SetExtraParams':
            if lastP: lastP[6] += [num(x) for x in a]
        elif c in ('Func_MoveEmitterA2BLinear', 'Func_MoveEmitterA2BParabolic'):
            v = ([num(x) for x in a] + [0] * 9)[:9]; ev.append(['pl' if c.endswith('Linear') else 'pq', t] + v)
            if v[0] in EM: nm, rid, t0 = EM[v[0]]; emit = max(emit, t + v[3] + v[4] + life(nm, rid) - (t - t0))
        elif c == 'Func_RevolveEmitter':
            v = ([num(x) for x in a] + [0] * 10)[:10]; ev.append(['pr', t] + v[:9])
            if v[0] in EM: nm, rid, t0 = EM[v[0]]; emit = max(emit, t + v[7] + spa(nm)[rid]['plt'] + 1 if rid < len(spa(nm)) else t)
        elif c == 'UnloadParticleSystem': ev.append(['pu', t, num(a[0])])
        elif c == 'SwitchBg': ev.append(['w', t, 1]); task = max(task, t + 8)
        elif c == 'RestoreBg': ev.append(['w', t, 0])
    end = max(t, task, emit)
    ev.sort(key=lambda e: e[1])
    return [end, ev]

# 플래티넘 폴더 이름 → 쇼다운 기술 id
ALIAS = {'faintattack': 'feintattack', 'hijumpkick': 'highjumpkick', 'smellingsalt': 'smellingsalts', 'vicegrip': 'visegrip'}
out = {}
for d in sorted(os.listdir(SRC)):
    p = SRC + d + '/anim.s'
    if not os.path.exists(p): continue
    L, lab = parse(p)
    a0, a1 = run(L, lab, 0), run(L, lab, 1)
    if not a0[1] and not a1[1]: continue
    k = d.replace('_', ''); out[ALIAS.get(k, k)] = a0 if a0 == a1 else [a0, a1]
json.dump(out, open('gymb/mvfx.json', 'w'), separators=(',', ':'))
print(len(out), 'moves', os.path.getsize('gymb/mvfx.json'), 'bytes')
