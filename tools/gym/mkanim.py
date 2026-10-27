# 기술 연출: 플래티넘 원본 기술 연출 대본(pret/pokeplatinum res/moves/*/anim.s)을 읽어 gym/mvfx.json 으로.
# python3 tools/gym/mkanim.py <pokeplatinum 폴더>
# 파티클(.spa)은 그대로 못 쓰므로 '어디서 언제 터지는지'만 남기고, 소리·흔들기·움직임·배경 어둡게·색 번쩍은 그대로 옮긴다.
# 결과: { 기술id: [길이, [사건...]] } 또는 내 쪽/상대 쪽이 다르면 { 기술id: [[길이, 사건], [길이, 사건]] } (공격하는 쪽: 0 내 쪽, 1 상대)
# 시간은 프레임(1/30초). 사건:
#   ['s', t, 소리, 좌우]           좌우 a=공격하는 쪽 d=맞는 쪽 c=가운데 m=공격→맞는 쪽으로 이동
#   ['k', t, 대상, x폭, y폭, 간격, 횟수]   흔들기. 대상 a d ad bg
#   ['m', t, 대상, dx, dy, 프레임]  포켓몬 움직이기 (내 쪽 기준, 상대면 좌우·위아래 뒤집기)
#   ['b', t, 시작, 끝, 색, 프레임] 배경 색 덮기 (0~16)
#   ['f', t, 대상, 색, 세기, 프레임] 포켓몬 색 번쩍
#   ['e', t, 위치, 프레임]          파티클 (위치 a d ad=공격→맞는 쪽 날아감 da c)
#   ['h', t, 대상, 1/0]             포켓몬 숨기기/보이기
#   ['z', t, 대상, x배율, y배율, 프레임]
#   ['w', t, 1/0]                   특수 배경(빠르게 흐르는 배경 등) 켜기/끄기
import sys, os, re, json
PL = sys.argv[1]; SRC = PL + '/res/moves/'
COLOR = {'BLACK': '#000', 'WHITE': '#fff', 'RED': '#f03018', 'BLUE': '#3060f0', 'PURPLE': '#a040c0', 'YELLOW': '#f8e030', 'GREEN': '#40c040', 'ORANGE': '#f88020', 'LIGHT_BLUE': '#80c8f8', 'PINK': '#f878b8', 'GRAY': '#808080', 'BROWN': '#a06030', 'DARK_BLUE': '#183080', 'CYAN': '#40e0e0'}
def col(s):
    m = re.match(r'BATTLE_COLOR_(\w+)', s)
    if m: return COLOR.get(m.group(1), '#fff')
    return '#fff'
def who(s):
    if 'ATTACKER' in s: return 'a'
    if 'DEFENDER' in s: return 'd'
    return 'ad'
def num(s):
    s = s.strip()
    m = re.match(r'^-?\d+$', s)
    return int(s) if m else 0
EMIT_T = 24   # 파티클 하나가 보통 사는 시간(어림)

def parse(path):
    L, lab = [], {}
    for ln in open(path):
        ln = ln.split('//')[0].strip()
        if not ln or ln.startswith('#') or ln.startswith('.'): continue
        if ln.endswith(':'): lab[ln[:-1]] = len(L); continue
        p = ln.split(None, 1); L.append((p[0], [a.strip() for a in p[1].split(',')] if len(p) > 1 else []))
    return L, lab

def run(L, lab, side):
    t, task, emit, ev, pc, loops, guard = 0, 0, 0, [], 0, [], 0
    lastEmit = None
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
        elif c in ('CreateEmitter', 'CreateEmitterEx'):
            cb = a[-1]; w = 'a' if 'ATTACKER' in cb else 'd' if 'DEFENDER' in cb else 'c'
            if 'GENERIC' in cb: w = 'd'
            ev.append(['e', t, w, EMIT_T]); lastEmit = ev[-1]; emit = max(emit, t + EMIT_T)
        elif c in ('Func_MoveEmitterA2BLinear', 'Func_MoveEmitterA2BParabolic', 'Func_MoveEmitterA2BXY'):
            if lastEmit: lastEmit[2] = 'ad'
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
json.dump(out, open('gym/mvfx.json', 'w'), separators=(',', ':'))
print(len(out), 'moves', os.path.getsize('gym/mvfx.json'), 'bytes')
