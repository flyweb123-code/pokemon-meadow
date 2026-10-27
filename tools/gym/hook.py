# 체육관 모드 훅을 index.html / beta.html 에 넣는다 (여러 번 돌려도 한 번만 들어감).
# python3 tools/gym/hook.py index.html beta.html
import sys, re
ICON = open(__file__.rsplit('/', 1)[0] + '/icon.svg', encoding='utf-8').read().strip()
MARK = '/*gym-hook*/'

CSS = MARK + r'''#btnGym{left:74px;top:110px;position:absolute;z-index:25;padding:0;border:0;background:none;cursor:pointer;line-height:0;filter:drop-shadow(2px 2px 0 rgba(0,0,0,.35));-webkit-tap-highlight-color:transparent}#btnGym:active{transform:translate(1px,1px)}#btnGym .mdot{top:-2px;right:-2px;width:9px;height:9px;box-shadow:0 0 0 2px #20202c}
html:not(.op) #btnGym,html:not(.gym-on) #btnGym,body.mapEdit #btnGym{display:none!important}body.fview #btnGym{visibility:hidden!important}   /* 체육관 모드: 운영자 '체육관 모드 보이기'를 켠 기기만 */
#gymLoad{position:fixed;inset:0;z-index:9800;display:grid;place-items:center;background:#181a2c;color:#f8f8f8;opacity:0;transition:opacity .35s;pointer-events:none}#gymLoad.on{opacity:1;pointer-events:auto}#gymLoad[hidden]{display:none}
#gymLoad .gl-box{display:flex;flex-direction:column;align-items:center;gap:18px;width:min(300px,80vw)}
#gymLoad .gl-road{position:relative;width:100%;height:76px;border-bottom:4px solid #46508a;background:repeating-linear-gradient(90deg,transparent 0 14px,rgba(255,255,255,.08) 14px 28px) bottom/100% 8px no-repeat}
#gymLoad .gl-ow{position:absolute;bottom:-18px;left:0;width:96px;height:96px;background:0 -192px/96px 576px no-repeat;image-rendering:pixelated;transform:scaleX(-1);animation:glStep .36s steps(1,end) infinite,glWalk 3s linear infinite}
#gymLoad .gl-gym{position:absolute;right:0;bottom:0;line-height:0}#gymLoad .gl-gym svg{width:72px;height:63px}
#gymLoad.out .gl-ow{transform:none;animation:glStep .36s steps(1,end) infinite,glWalkB 3s linear infinite}
@keyframes glStep{50%{background-position:0 -480px}}@keyframes glWalk{from{left:-4px}to{left:calc(100% - 120px)}}@keyframes glWalkB{from{left:calc(100% - 120px)}to{left:-4px}}
#gymLoad .gl-t{font-size:18px;font-weight:700;letter-spacing:.5px}#gymLoad .gl-t i{display:inline-block;width:1.4em;text-align:left;font-style:normal}
#gymLoad .gl-s{font-size:13px;color:#a8acd0;min-height:1.4em;text-align:center}
@media (max-width: 760px), (max-height: 500px) and (orientation: landscape) {
  #btnGym{position:relative;left:auto;top:auto;grid-area:stage;align-self:start;justify-self:start;margin:calc(var(--si-top,env(safe-area-inset-top)) + 58px) 0 0 calc(var(--si-left,env(safe-area-inset-left)) + 62px)}
}
'''

HTML_BTN = f'''
  <!-- 체육관 모드: 운영자 '체육관 모드 보이기'를 켠 기기만 보인다. 체육관 화면은 gym/gym.js -->
  <button class="hud" id="btnGym" type="button" aria-label="체육관">{ICON.replace('aria-hidden="true"', 'width="44" height="38" aria-hidden="true"', 1)}</button>
  <div id="gymLoad" hidden aria-live="polite"><div class="gl-box"><div class="gl-road"><i class="gl-ow"></i><span class="gl-gym">{ICON}</span></div><div class="gl-t"><span class="gl-tx">체육관 출근 중</span><i class="gl-dots">…</i></div><div class="gl-s"></div></div></div>'''

HTML_SW = '''<div class="op-row"><span>체육관 모드 보이기 (이 기기만)</span><button class="op-sw" id="gymSw" role="switch" aria-checked="false"><i></i></button></div>
        '''

JS = MARK + r'''
// 체육관 모드: 운영자 '체육관 모드 보이기'(이 기기만)를 켜면 필드 맵 편집 버튼 옆에 체육관 버튼. 체육관 화면·규칙은 gym/gym.js (들어갈 때 처음 불러온다)
{ const de = document.documentElement, on = () => { try { return localStorage.getItem('pk-gym') === '1'; } catch (e) { return false; } };
  const paintG = () => { de.classList.toggle('gym-on', on()); $('#gymSw').setAttribute('aria-checked', on()); menuDots(); };
  $('#gymSw').onclick = () => { sfx('tap'); try { on() ? localStorage.removeItem('pk-gym') : localStorage.setItem('pk-gym', '1'); } catch (e) {} paintG(); };
  try { paintG(); } catch (e) {} setInterval(() => { if (de.classList.contains('gym-on') && !document.hidden) menuDots(); }, 30e3);
  const L = $('#gymLoad'), dots = L.querySelector('.gl-dots'); let dT = 0;
  // 로딩 화면: 트레이너가 체육관으로 걸어간다 (out: 퇴근 = 체육관에서 걸어 나온다)
  window.gymLoad = {
    show(tx, sub = '', out = false) { L.querySelector('.gl-tx').textContent = tx; L.querySelector('.gl-s').textContent = sub; L.classList.toggle('out', out); L.querySelector('.gl-ow').style.backgroundImage = `url(${TR_OW[trOf().sex] || TR_OW.m})`;
      L.hidden = false; void L.offsetWidth; L.classList.add('on'); clearInterval(dT); let n = 0; dT = setInterval(() => { n = (n + 1) % 4; dots.textContent = '.'.repeat(n) || ' '; }, 380); },
    sub(t) { L.querySelector('.gl-s').textContent = t; },
    hide() { L.classList.remove('on'); clearInterval(dT); setTimeout(() => { if (!L.classList.contains('on')) L.hidden = true; }, 380); } };
  const loadGymJs = () => window.Gym ? Promise.resolve() : new Promise((ok, no) => { const v = encodeURIComponent(APP_VER), c = document.createElement('link'); c.rel = 'stylesheet'; c.href = `gym/gym.css?v=${v}`; document.head.appendChild(c);
    const s = document.createElement('script'); s.src = `gym/gym.js?v=${v}`; s.onload = () => window.Gym ? ok() : no(new Error('gym')); s.onerror = no; document.head.appendChild(s); });
  // 게임 본체는 함수 안에 있어서 gym.js 가 쓸 것만 꺼내 준다 (늦게 정의되는 것도 있어 getter)
  window.GA = { get S() { return S; }, get SPECIES() { return SPECIES; }, get TYPE_KO() { return TYPE_KO; }, get TYPE_C() { return TYPE_C; }, get RANKS() { return RANKS; }, get LEARN() { return LEARN; },
    tyIcon: (...a) => tyIcon(...a), sfx: (...a) => sfx(...a), save: () => save(), trOf: () => trOf(), esc: s => esc(s), menuDots: () => menuDots(), addGold: n => addGold(n), renderGold: () => renderGold(),
    boxOf: id => boxOf(id), removeMon: (m, q) => removeMon(m, q), log: (...a) => log(...a), ivSum: p => ivSum(p), rankOf: p => rankOf(p), addFr: (id, n) => addFr(id, n) };
  let busy = false;
  $('#btnGym').onclick = async () => { if (busy || window.Gym?.isOpen?.()) return; busy = true; sfx('tap'); select(null);
    gymLoad.show('체육관 출근 중'); const t0 = Date.now();
    try { await loadGymJs(); await Gym.prepare(); await new Promise(r => setTimeout(r, Math.max(0, 3000 - (Date.now() - t0)))); Gym.enter(); }
    catch (e) { gymLoad.sub('체육관 문이 잠겨 있어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'); await new Promise(r => setTimeout(r, 2200)); gymLoad.hide(); }
    busy = false; };
}
'''

def patch(path):
    s = open(path, encoding='utf-8').read()
    if MARK in s:
        print(path, 'already'); return
    def sub1(old, new, where):
        nonlocal s
        assert s.count(old) == 1, (path, where, s.count(old))
        s = s.replace(old, new, 1)
    # CSS: 맵 편집 버튼 규칙 바로 뒤
    a = '#btnMapEdit:active{transform:translate(1px,1px)}'
    sub1(a, a + '\n' + CSS.rstrip('\n'), 'css')
    # 버튼 + 로딩 화면: 맵 편집 버튼 뒤
    i = s.index('id="btnMapEdit"'); j = s.index('</button>', i) + len('</button>')
    s = s[:j] + HTML_BTN + s[j:]
    # 운영자 칸 토글
    k = s.index('<div class="op-row"><span>베타 판 쓰기')
    s = s[:k] + HTML_SW + s[k:]
    # 저장
    sub1('gold: S.gold, box: S.box,', 'gold: S.gold, box: S.box, gym: S.gym || undefined,', 'ser')
    sub1('S.lockT = d.lockT || 0;', 'S.lockT = d.lockT || 0; S.gym = d.gym || null;', 'res')
    # 빨간 점: 도전자가 와 있으면
    sub1("set($('#openShop'), fpDot());", "set($('#openShop'), fpDot()); { const b = $('#btnGym'); if (b) set(b, !!window.gymDot?.() || (!window.Gym && !!S.gym?.at && Date.now() >= S.gym.at)); }", 'dot')
    # 체육관에 있는 동안 필드는 덮인 것으로 (프레임 낮춤)
    sub1("const fieldCovered = () => ", "const fieldCovered = () => document.body.classList.contains('gymMode') || ", 'cov')
    # 운영자 블록 뒤에 체육관 블록
    k = s.index('// 운영자 모드·테스트 버튼 (이 기기에만 저장)')
    s = s[:k] + JS.lstrip('\n') + s[k:]
    open(path, 'w', encoding='utf-8').write(s); print(path, 'ok')

MARK2 = '/*gym-hook2*/'
# 2단계 훅 (2026-10-27 경완): 체육관에 있는 동안 키우기 게임은 멈춘다(앱을 내린 것처럼), 운영자 체육관 초기화
JS2 = MARK2 + r"""
// 체육관에 들어가면 필드는 앱을 내린 것처럼 멈춘다: 포켓몬·날씨·알림창이 돌지 않고 필드 곡도 멈춤. 나오면 그동안의 친밀도·배부름을 앱이 꺼져 있던 것처럼 따라잡는다
{ let inAt = 0; Object.defineProperty(GA, 'KANG', { get: () => KANG }); GA.inTyper = (...a) => inTyper(...a);
  GA.gymIn = () => { inAt = Date.now(); document.body.classList.add('gymMode'); try { bgm.pos = bgmPos(); bgmSrcStop(); } catch (e) {} };
  GA.gymOut = () => { document.body.classList.remove('gymMode'); const sec = inAt ? (Date.now() - inAt) / 1000 : 0; inAt = 0;
    try { S.mons.forEach(m => offFr(m, sec)); } catch (e) {} save(); last = performance.now(); try { if (bgmOn && !bgmAway) bgmSrcStart(); } catch (e) {} notiSoon(1200); };
  let arm = 0; $('#gymReset').onclick = () => { const b = $('#gymReset');
    if (Date.now() - arm > 3000) { arm = Date.now(); b.textContent = '한 번 더 누르면 체육관이 지워져요'; setTimeout(() => { if (Date.now() - arm >= 3000) b.textContent = '체육관 초기화'; }, 3100); return; }
    arm = 0; S.gym = null; save(); menuDots(); b.textContent = '체육관을 지웠어요'; setTimeout(() => { b.textContent = '체육관 초기화'; }, 1800); }; }
"""

def patch2(path):
    s = open(path, encoding='utf-8').read()
    if MARK2 in s:
        print(path, 'already2'); return
    def sub1(old, new, where):
        nonlocal s
        assert s.count(old) == 1, (path, where, s.count(old))
        s = s.replace(old, new, 1)
    sub1('let bgmOn = VOL.bgm > 0;', "const inGym = () => document.body.classList.contains('gymMode');   " + MARK2 + "\nlet bgmOn = VOL.bgm > 0;", 'ingym')
    sub1('if (bgm.src || !bgm.buf) return;', 'if (bgm.src || !bgm.buf || (inGym() && !bgm.preview)) return;', 'bgm')
    sub1("const cov = fieldCovered(); if (cov !== fCov) { fCov = cov; document.body.classList.toggle('fcov', cov); }", "const cov = fieldCovered(); if (cov !== fCov) { fCov = cov; document.body.classList.toggle('fcov', cov); }\n  if (inGym()) { last = now; return; }   // 체육관에 있는 동안 필드는 멈춤", 'frame')
    sub1('hidAt = 0; S.mons.forEach(m => offFr(m, sec)); save();', 'hidAt = 0; if (!inGym()) S.mons.forEach(m => offFr(m, sec)); save();', 'vis')
    sub1('if (document.hidden || hatching || evolving) { clearTimeout(frMaxT);', 'if (document.hidden || inGym() || hatching || evolving) { clearTimeout(frMaxT);', 'frmax')
    sub1('if (document.hidden || hatching || evolving || frMaxOpen || notiOpen', 'if (document.hidden || inGym() || hatching || evolving || frMaxOpen || notiOpen', 'trup')
    sub1('if (notiOpen || document.hidden || (tutOn && !force)) return;', 'if (notiOpen || document.hidden || inGym() || (tutOn && !force)) return;', 'noti')
    sub1('if (!storming() || document.hidden ||', 'if (!storming() || document.hidden || inGym() ||', 'storm')
    a = '<div class="op-row"><span>베타 판 쓰기 (이 기기만)</span>'
    i = s.index(a); j = s.index('</div>', i) + 6
    s = s[:j] + '\n        <div class="set-btns one"><button class="lk-btn main" id="gymReset">체육관 초기화</button></div>' + s[j:]
    for a, b in [("glWalk 2.4s linear infinite}", "glWalk 3s linear infinite}"), ("glWalkB 2.4s linear infinite}", "glWalkB 3s linear infinite}"), ("Math.max(0, 1500 - (Date.now() - t0))", "Math.max(0, 3000 - (Date.now() - t0))")]:
        if a in s: sub1(a, b, a[:10])
    k = s.index('// 운영자 모드·테스트 버튼 (이 기기에만 저장)')
    s = s[:k] + JS2.lstrip('\n') + s[k:]
    open(path, 'w', encoding='utf-8').write(s); print(path, 'ok2')

MARK3 = '/*gym-hook3*/'
# 3단계 훅 (v10.25): 체육관 BGM(플래티넘 원본 소리를 받아 gym/bgm.js 가 연주)이 필드 곡과 같은 소리 통로·볼륨을 쓰게, 배틀 울음소리
JS3 = MARK3 + r"""
GA.audio = () => audio(); GA.bgmGain = () => { if (!audio()) return null; bgmRoute(); return bgm.gain; }; GA.bgmOn = () => bgmOn; GA.cry = (sp, d) => playCry(sp, d);
"""

def patch3(path):
    s = open(path, encoding='utf-8').read()
    if MARK3 in s:
        print(path, 'already3'); return
    k = s.index('// 운영자 모드·테스트 버튼 (이 기기에만 저장)')
    s = s[:k] + JS3.lstrip('\n') + s[k:]
    open(path, 'w', encoding='utf-8').write(s); print(path, 'ok3')

MARK4 = '/*gym-hook4*/'
# 4단계 훅 (v10.27): 라인업 그림을 포켓몬 상자 그림과 같게, 체육관 효과음 볼륨
JS4 = MARK4 + r"""
GA.thumb = P => ensureSprite(P.sp).then(() => thumbP(P)); GA.shinyHue = sp => shinyHue(sp); GA.sfxVol = () => volG(VOL.sfx); GA.quietTap = () => { sfxN++; };   // 이 클릭엔 기본 '톡' 소리를 내지 않는다(체육관 배틀은 본가 효과음)
"""

def patch4(path):
    s = open(path, encoding='utf-8').read()
    if MARK4 in s:
        print(path, 'already4'); return
    k = s.index('// 운영자 모드·테스트 버튼 (이 기기에만 저장)')
    s = s[:k] + JS4.lstrip('\n') + s[k:]
    open(path, 'w', encoding='utf-8').write(s); print(path, 'ok4')

for p in sys.argv[1:]: patch(p); patch2(p); patch3(p); patch4(p)
