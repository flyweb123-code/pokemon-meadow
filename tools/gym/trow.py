# 트레이너 스프라이트(TR_OW)를 파이어레드·리프그린 그림으로 바꾼다 (2026-10-27 경완).
# 칸: 32x32 여섯 칸(정면, 뒤, 왼쪽, 정면 걸음, 뒤 걸음, 왼쪽 걸음). 사람 그림 16x20 이 칸 가운데.
import base64, re, sys, os
D = os.path.dirname(__file__)
uri = lambda f: 'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, f), 'rb').read()).decode()
REP = [
  ('.tr-ow{width:64px;height:64px;background-repeat:no-repeat;background-size:64px 384px;', '.tr-ow{width:96px;height:96px;margin:-16px;flex:none;background-repeat:no-repeat;background-size:96px 576px;'),
  ('25%{background-position:0 -192px;transform:none}50%{background-position:0 0;transform:none}75%{background-position:0 -192px;', '25%{background-position:0 -288px;transform:none}50%{background-position:0 0;transform:none}75%{background-position:0 -288px;'),
  ('#intro .in-tr{width:128px;height:128px;background-repeat:no-repeat;background-size:128px 768px;', '#intro .in-tr{width:192px;height:192px;background-repeat:no-repeat;background-size:192px 1152px;'),
  ('#intro .in-two i{width:96px;height:96px;background-repeat:no-repeat;background-size:96px 576px;', '#intro .in-two i{width:128px;height:128px;background-repeat:no-repeat;background-size:128px 768px;'),
  ('.gl-ow{position:absolute;bottom:0;left:0;width:64px;height:64px;background:0 -128px/64px 384px no-repeat;', '.gl-ow{position:absolute;bottom:-18px;left:0;width:96px;height:96px;background:0 -192px/96px 576px no-repeat;'),
  ('@keyframes glStep{50%{background-position:0 -320px}}', '@keyframes glStep{50%{background-position:0 -480px}}'),
]
for fn in sys.argv[1:]:
    s = open(fn, encoding='utf-8').read()
    if '/*trow-frlg*/' in s: print(fn, 'already'); continue
    for a, b in REP:
        n = s.count(a)
        if n < 1: sys.exit(f'{fn}: not found: {a[:60]}')
        s = s.replace(a, b)
    s, n = re.subn(r"const TR_OW = \{ m: 'data:[^']*', f: 'data:[^']*' \};", lambda m: f"const TR_OW = {{ m: '{uri('tr_m.png')}', f: '{uri('tr_f.png')}' }}; /*trow-frlg*/", s)
    if n != 1: sys.exit(fn + ': TR_OW')
    open(fn, 'w', encoding='utf-8').write(s); print(fn, 'ok')
