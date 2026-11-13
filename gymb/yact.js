/* 훈련장 직접 훈련 (운영자 시험, 경완 2026-11-13 '운영자 모드에서 우리 게임 엔진 써서 해볼 수 있게, 내 계정에 영향 아예 가지 않게')
   훈련 중인 포켓몬을 직접 움직여 기술로 상대를 쓰러뜨리는 미니게임. 게임 엔진을 그대로 쓴다:
   바닥 = 훈련장 그림(GymManage.yardShot), 포켓몬 = 필드 PMD 그림(GA.pmdMx), 기술 = 필드 PMD 기술 효과·효과음(GA.pfxKit),
   능력치·기술·노력치·경험치·깨달음 = 체육관 데이터(GymBattle). 보상은 계산해서 보여 주기만 하고 저장에는 아무것도 쓰지 않는다.
   부르는 곳: gym.js yaTest() (시뮬 안) → GymYA.start({ host, mons }) */
(() => {
'use strict';
const GA = window.GA, SP = GA.SPECIES, GB = () => window.GymBattle;
const TYPE_C = GA.TYPE_C || [], TYPE_KO = GA.TYPE_KO || [];
const STAT_KO = ['HP', '공격', '방어', '특공', '특방', '스피드'];
// 타입 상성 (공격 → 방어): 2배·0.5배·0배
const SE = { 2: [1, 6, 9, 15, 17], 3: [2, 7, 12], 4: [12, 18], 5: [4, 6, 9, 10, 13], 6: [3, 7, 10, 15], 7: [12, 14, 17], 8: [8, 14], 9: [6, 15, 18], 10: [7, 9, 12, 15], 11: [5, 6, 10], 12: [5, 6, 11], 13: [3, 11], 14: [2, 4], 15: [3, 5, 12, 16], 16: [16], 17: [8, 14], 18: [2, 16, 17] };
const NV = { 1: [6, 9], 2: [3, 4, 7, 14, 18], 3: [6, 9, 13], 4: [4, 5, 6, 8], 5: [7, 12], 6: [2, 5, 9], 7: [2, 3, 4, 8, 9, 10, 18], 8: [17], 9: [9, 10, 11, 13], 10: [6, 10, 11, 16], 11: [11, 12, 16], 12: [3, 4, 7, 9, 10, 12, 16], 13: [12, 13, 16], 14: [9, 14], 15: [9, 10, 11, 15], 16: [9], 17: [2, 17, 18], 18: [4, 9, 10] };
const IM = { 1: [8], 2: [8], 4: [9], 5: [3], 8: [1], 13: [5], 14: [17], 16: [18] };
const eff = (a, ds) => ds.reduce((m, d) => m * ((IM[a] || []).includes(d) ? 0 : (SE[a] || []).includes(d) ? 2 : (NV[a] || []).includes(d) ? .5 : 1), 1);
const tysOf = sp => SP[sp]?.t || [1], nmSp = sp => SP[sp]?.n || '???';
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };
const EV_CAP = 4, SHARD_CAP = 4, TIME = 90;

let R = null;   // 지금 열린 판 (화면·상태 전부)
const CSS = `
#yact{position:absolute;inset:0;z-index:5000;background:#1c1c2e;color:#fff;font-family:var(--px);overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;--ink:#20202c}
#yact *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#yact canvas{position:absolute;left:0;top:0;display:block;image-rendering:pixelated}
#yact .ya-hud{position:absolute;z-index:3;pointer-events:none}
#yact .mg-sc{display:grid;grid-template-columns:auto auto;align-items:center;column-gap:8px;row-gap:2px;padding:6px 12px 6px 8px;background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22)}
#yact .ya-ph{font-size:11px;line-height:15px;padding:0 6px;color:var(--ink);background:#ffe27a;border:2px solid var(--ink)}
#yact .ya-m{font-size:22px;line-height:1.1;color:#fff;text-shadow:0 2px 0 var(--ink)}
#yact .mg-hg{grid-column:1/-1;display:flex;align-items:center;gap:4px;font-size:13px;color:#ffe27a;text-shadow:0 1px 0 var(--ink);transform-origin:0 50%}
#yact .mg-hg b{font-size:15px}
#yact .mg-hg.up{animation:yaHg .35s ease-out}
@keyframes yaHg{40%{transform:scale(1.25);color:#fff}}
#yact .coin{display:inline-block;width:14px;height:14px;background:#ffc830;box-shadow:inset -3px -3px 0 #d08a00,inset 3px 3px 0 #fff2a0,0 0 0 2px #6a4400;flex:none;margin-right:6px}
#yact .ya-tl{left:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:6px;align-items:flex-start}
#yact .pan{background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22);padding:5px 8px}
#yact .ya-hp{width:140px;font-size:11px}
#yact .ya-hp .r1{display:flex;justify-content:space-between;gap:4px;margin-bottom:3px;white-space:nowrap}
#yact .bar{height:8px;background:#4a4a5a;border:2px solid var(--ink);position:relative;overflow:hidden}
#yact .ya-hpf{position:absolute;left:0;top:0;bottom:0;background:#58d050;transition:width .2s}
#yact .ya-hpf.y{background:#f8c030}#yact .ya-hpf.r{background:#f05038}
#yact .ya-tr{right:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:auto}
#yact .ya-tm{font-size:26px;line-height:1;min-width:52px;text-align:center;text-shadow:0 2px 0 var(--ink)}
#yact .ya-tm.low{color:#ff7a6a;animation:yaTm .5s steps(2) infinite}
@keyframes yaTm{50%{opacity:.5}}
#yact .b3{font-family:var(--px);font-weight:700;border:3px solid var(--ink);color:var(--ink);background:#fff;box-shadow:0 4px 0 var(--ink);cursor:pointer;transition:transform .06s,box-shadow .06s}
#yact .b3:active,#yact .b3.pr{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
#yact .ya-quit{font-size:11px;padding:4px 8px;background:#e9e4d8}
#yact .ya-rw{right:10px;top:calc(84px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:4px;width:140px}
#yact .ya-rw .ch{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 8px}
#yact .ya-rw .ch b{font-size:13px}
#yact .ya-rw .ex b{color:#9fd8ff}#yact .ya-rw .ev b{color:#d6b4ff}
#yact .ya-eg{padding:5px 8px 6px;transform-origin:0 50%}
#yact .ya-eg.up{animation:yaEg .5s ease-out}
@keyframes yaEg{30%{transform:scale(1.08);box-shadow:inset 0 0 0 2px #ffe27a,0 0 14px #ffe27a}}
#yact .ya-eg .r1{display:flex;align-items:center;gap:5px;font-size:11px;margin-bottom:4px}
#yact .ya-eg .r1 b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#yact .ya-egt{font-size:9px;padding:1px 4px;border:1px solid var(--ink);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.5)}
#yact .ya-egf0{position:absolute;left:0;top:0;bottom:0;background:#8a8a9c}
#yact .ya-egf{position:absolute;left:0;top:0;bottom:0;--tc:#ee99ac;background:repeating-linear-gradient(-45deg,var(--tc) 0 4px,color-mix(in srgb,var(--tc),#fff 35%) 4px 8px);transition:width .4s}
#yact .ya-eg .r2{display:flex;justify-content:space-between;font-size:10px;margin-top:3px;color:#cfd0e6}
#yact .ya-egp{color:#ffe27a}
#yact .ya-joy{position:absolute;left:0;bottom:0;width:58%;height:46%;z-index:4;display:none}
#yact .ya-joyb{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;background:rgba(28,28,46,.28);border:3px solid rgba(255,255,255,.4);z-index:5;pointer-events:none;opacity:0;transition:opacity .15s}
#yact .ya-joyb.on{opacity:1}
#yact .ya-joyk{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:rgba(255,255,255,.85);border:3px solid var(--ink)}
#yact .ya-hint{position:absolute;left:18px;bottom:calc(26px + env(safe-area-inset-bottom));z-index:3;font-size:11px;text-shadow:0 1px 0 var(--ink);opacity:.85;pointer-events:none;display:none}
#yact .ya-pad{position:absolute;right:10px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:4;display:none;align-items:flex-end;gap:8px}
#yact .ya-mvs{display:grid;grid-template-columns:repeat(2,84px);gap:7px}
#yact .mvb{position:relative;height:54px;padding:4px 4px 3px;border:3px solid var(--ink);background:var(--tc);color:#fff;font-family:var(--px);text-align:left;box-shadow:0 4px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;cursor:pointer}
#yact .mvb .tg{font-size:9px;line-height:1;align-self:flex-start;padding:1px 3px;background:rgba(0,0,0,.28)}
#yact .mvb b{font-size:12px;line-height:1.1;text-shadow:0 1px 0 var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#yact .mvb small{font-size:9px;opacity:.9;text-shadow:0 1px 0 var(--ink)}
#yact .mvb.pr,#yact .ya-dg.pr{animation:yaPr .16s}
@keyframes yaPr{40%{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}}
#yact .mvb .cdo{position:absolute;inset:0;pointer-events:none;background:conic-gradient(rgba(20,20,34,.62) var(--p,0deg),transparent 0)}
#yact .mvb.cd{filter:saturate(.6)}
#yact .ya-dg{position:relative;width:62px;height:62px;border-radius:50%;border:3px solid var(--ink);background:#f4f0e6;color:var(--ink);font-family:var(--px);font-weight:700;font-size:12px;box-shadow:0 4px 0 var(--ink);overflow:hidden;margin-bottom:2px;cursor:pointer}
#yact .ya-dg::after{content:"";position:absolute;inset:0;background:conic-gradient(rgba(20,20,34,.5) var(--p,0deg),transparent 0)}
#yact.play .ya-joy,#yact.play .ya-pad{display:flex}
#yact.play .ya-hint{display:block}
#yact:not(.play) .ya-hud{display:none}
#yact .ya-ban{position:absolute;left:0;right:0;top:34%;z-index:5;text-align:center;font-size:24px;text-shadow:0 3px 0 var(--ink),0 0 10px rgba(0,0,0,.4);pointer-events:none;opacity:0}
#yact .ya-ban.on{animation:yaBan 1.4s ease-out}
@keyframes yaBan{0%{opacity:0;transform:scale(1.6)}15%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
#yact .ya-ov{position:absolute;inset:0;z-index:8;background:rgba(14,14,28,.45)}
#yact .ya-win{position:absolute;z-index:9;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,calc(100% - 28px));max-height:calc(100% - 24px);overflow:auto;background:#fbf8f0;color:var(--ink);border:3px solid var(--ink);box-shadow:0 0 0 3px #fff,0 0 0 6px var(--ink),6px 8px 0 6px rgba(0,0,0,.25);padding:14px 14px 16px}
#yact .ya-win h2{margin:0 0 4px;font-size:18px;text-align:center}
#yact .ya-win .sub{margin:0 0 10px;font-size:11px;text-align:center;color:#5a5a6a;line-height:1.5}
#yact .ya-win h3{font-size:12px;margin:10px 0 6px;color:#5a5a6a}
#yact .ya-op{font-size:10.5px;text-align:center;color:#2f7a3a;background:#e6f4e2;border:2px solid #b8dcb0;padding:4px 6px;margin:0 0 6px}
#yact .ya-pk{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#yact .pkc{font-family:var(--px);border:3px solid var(--ink);background:#fff;padding:6px 2px 5px;display:flex;flex-direction:column;align-items:center;gap:2px;box-shadow:0 3px 0 var(--ink);cursor:pointer;color:var(--ink);min-width:0}
#yact .pkc:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
#yact .pkc img{width:40px;height:40px;image-rendering:pixelated;object-fit:contain}
#yact .pkc b{font-size:12px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#yact .pkc small{font-size:10px;color:#6a6a7a}
#yact .pkc.on{background:#fff3c4;box-shadow:0 3px 0 var(--ink),inset 0 0 0 2px #f0b020}
#yact .ya-pmv{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center}
#yact .ya-pmv span{font-size:10px;padding:2px 5px;background:var(--tc);color:#fff;border:2px solid var(--ink);text-shadow:0 1px 0 rgba(0,0,0,.4)}
#yact .ya-stt{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
#yact .stc{font-family:var(--px);font-size:11px;padding:7px 0;border:2px solid var(--ink);background:#fff;color:var(--ink);box-shadow:0 2px 0 var(--ink);cursor:pointer}
#yact .stc:active{transform:translateY(2px);box-shadow:none}
#yact .stc.on{background:#b48cf0;color:#fff;text-shadow:0 1px 0 var(--ink)}
#yact .ya-foe{font-size:11px;margin:8px 0 0;text-align:center;color:#4a4a5a}
#yact .how{font-size:10.5px;line-height:1.6;color:#4a4a5a;background:#f0ebde;border:2px solid #d8d0bc;padding:6px 8px;margin-top:10px}
#yact .how b{color:var(--ink)}
#yact .bigb{display:block;width:100%;margin-top:12px;padding:11px 0;font-size:15px;background:#ffd84a}
#yact .bigb.sec{background:#e9e4d8;font-size:13px;padding:9px 0}
#yact .ya-res.pop{animation:yaPop .32s cubic-bezier(.2,1.5,.4,1)}
@keyframes yaPop{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
#yact .ya-rl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
#yact .ya-rl li{display:grid;grid-template-columns:auto 1fr;grid-template-areas:"k b" "e e";align-items:center;padding:6px 9px;background:#fff;border:2px solid var(--ink);column-gap:6px}
#yact .ya-rl .k{grid-area:k;font-size:12px;display:flex;align-items:center}
#yact .ya-rl b{grid-area:b;text-align:right;font-size:16px}
#yact .ya-rl em{grid-area:e;font-style:normal;font-size:10px;color:#6a6a7a;margin-top:2px}
#yact .ya-rl .xb{grid-column:1/-1;height:6px;background:#dcd8ce;border:1px solid var(--ink);margin-top:4px;position:relative}
#yact .ya-rl .xb i{position:absolute;left:0;top:0;bottom:0;background:#48a8f0}
#yact .ya-rl .lvup{font-style:normal;color:#e05a20;font-weight:700}
#yact .ya-rl b.ev{color:#8a4ad8}#yact .ya-rl b.fr{color:#e0507a}#yact .ya-rl b.eg{color:#c08a00}
#yact .ya-rl li.ya-gold{background:#fff6d0}#yact .ya-rl li.ya-gold b{color:#a87800}
#yact .rs-row{display:flex;gap:8px}
#yact .ya-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;z-index:10;background:#1c1c2e}
`;
const HTML = `<canvas></canvas>
<div class="ya-hud ya-tl"><div class="mg-sc"><b class="ya-ph">웨이브 1/3</b><b class="ya-m">0마리</b><span class="mg-hg"><i class="coin" aria-hidden="true"></i><b>0</b>G</span></div>
  <div class="pan ya-hp"><div class="r1"><span class="ya-me"></span><span class="ya-hpn"></span></div><div class="bar"><i class="ya-hpf"></i></div></div></div>
<div class="ya-hud ya-rw"><div class="pan ch ex"><span>경험치</span><b class="ya-rwe">+0</b></div><div class="pan ch ev"><span><span class="ya-rwk"></span> 노력치</span><b class="ya-rwv">0/4</b></div>
  <div class="pan ya-eg"><div class="r1"><b class="ya-egn"></b><span class="ya-egt"></span></div><div class="bar"><i class="ya-egf0"></i><i class="ya-egf"></i></div><div class="r2"><span class="ya-egs"></span><span class="ya-egp"></span></div></div></div>
<div class="ya-hud ya-tr"><b class="ya-tm">90</b><button class="b3 ya-quit">그만하기</button></div>
<div class="ya-joy"></div><div class="ya-joyb"><i class="ya-joyk"></i></div>
<div class="ya-hint">왼쪽 아래를 끌어서 이동</div>
<div class="ya-pad"><button class="ya-dg">회피</button><div class="ya-mvs"></div></div>
<div class="ya-ban"></div>
<div class="ya-ov"></div>
<div class="ya-win ya-start"><h2>직접 훈련</h2><p class="ya-op">운영자 시험: 보상은 보여 주기만 하고 내 포켓몬·저장은 그대로예요.</p>
  <p class="sub">훈련 중인 포켓몬을 직접 움직여 상대를 쓰러뜨려요.<br>쓰러뜨리면 경험치·노력치·골드, 번뜩임 조각을 주우면 기술 게이지가 올라요.</p>
  <h3>훈련할 포켓몬</h3><div class="ya-pk"></div><div class="ya-pmv"></div>
  <h3>노력치 훈련 (훈련장 토글로 고른 능력치)</h3><div class="ya-stt"></div><p class="ya-foe"></p>
  <div class="how"><b>조작</b> 왼쪽 아래를 끌어 이동 · 기술 버튼은 가장 가까운 상대를 자동으로 겨눠요 · 상대 머리 위에 <b style="color:#e0402a">!</b> 가 뜨면 회피<br><b>PC</b> 방향키 이동 · Q W E R 기술 · 스페이스 회피</div>
  <div class="rs-row"><button class="b3 bigb sec ya-x">닫기</button><button class="b3 bigb ya-go">훈련 시작</button></div></div>
<div class="ya-win ya-res" hidden><h2 class="rs-h">훈련 완료!</h2><p class="sub rs-sub"></p><ul class="ya-rl"></ul><p class="ya-op" style="margin:10px 0 0">운영자 시험이라 실제로는 아무것도 받지 않아요.</p>
  <div class="rs-row"><button class="b3 bigb sec ya-back">훈련장으로</button><button class="b3 bigb ya-again">한 판 더</button></div></div>
<div class="ya-load">훈련장 준비 중…</div>`;

// ---------- 시작 ----------
async function start({ host, mons }) {
  if (R) return; if (!mons?.length) { GA.toast?.('훈련할 포켓몬이 없어요'); return; }
  if (!document.getElementById('yactCss')) { const s = document.createElement('style'); s.id = 'yactCss'; s.textContent = CSS; document.head.append(s); }
  const el = document.createElement('div'); el.id = 'yact'; el.innerHTML = HTML; (host || document.body).append(el);
  const q = s => el.querySelector(s);
  let done; const closed = new Promise(ok => { done = ok; });
  R = { el, q, host: host || document.body, mons, pick: 0, stat: 5, G: null, T: 0, last: 0, run: false, raf: 0, FX: [], POPS: [], SPR: {}, kit: null, BG: null, Y: {}, A: {}, SHAKE: 0, FLASH: 0, JOY: { id: null, dx: 0, dy: 0, ox: 0, oy: 0 }, KEY: {}, done, off: [] };
  R.stat = mons[0].evk >= 0 ? mons[0].evk : 5;
  try {
    await GB()?.evyLoad?.();
    R.kit = await GA.pfxKit?.().catch(() => null);
    await Promise.all(mons.map(o => spr(o.P.sp, o.P.sex)));
    await resize(); bind(); startUi();
  } catch (e) { console.error(e); GA.toast?.('직접 훈련을 열지 못했어요'); close(); return closed; }
  q('.ya-load').remove();
  R.raf = requestAnimationFrame(loop);
  return closed;
}
function close() { if (!R) return; const r = R; R = null; cancelAnimationFrame(r.raf); r.off.forEach(f => f()); r.el.remove(); r.done(); }

// ---------- 그림 ----------
function spr(sp, sex) { const k = sp + ':' + (sex || ''); if (R.SPR[k]) return Promise.resolve(R.SPR[k]);
  return (GA.pmdMx || GA.pmd)(sp, sex).then(D => new Promise(ok => { const im = new Image(); im.onload = im.onerror = () => ok(R.SPR[k] = { D, im }); im.src = D.P ? D.P.i : D.img; })).catch(() => (R.SPR[k] = { D: {}, im: null })); }
const sprOf = e => R.SPR[e.sp + ':' + (e.sex || '')] || R.SPR[e.sp + ':'];
async function resize() {
  const r = R, W = r.host.clientWidth || innerWidth, H = r.host.clientHeight || innerHeight, DPR = Math.min(2, window.devicePixelRatio || 1), cv = r.q('canvas');
  Object.assign(r, { W, H, DPR }); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; r.g = cv.getContext('2d');
  Object.assign(r.Y, { pond: { x0: 16, y0: H * .74, x1: W * .54, y1: H - 16 } }); Object.assign(r.A, { y0: 132, y1: H - 20, x0: 16, x1: W - 16 });
  try { const s = await window.GymManage?.yardShot?.(Math.ceil(W / 32), Math.ceil(H / 32)); if (s && R === r) { const im = new Image(); await new Promise(ok => { im.onload = im.onerror = ok; im.src = s.url; }); r.BG = im; } } catch (e) { console.error(e); }
}
const inPond = (x, y, m = 10) => { const P = R.Y.pond; return x > P.x0 - m && x < P.x1 + m && y > P.y0 - m && y < P.y1 + m; };
function keepIn(e) { const A = R.A; e.x = Math.max(A.x0, Math.min(A.x1, e.x)); e.y = Math.max(A.y0, Math.min(A.y1, e.y));
  if (inPond(e.x, e.y)) { const P = R.Y.pond, dx = [e.x - (P.x0 - 10), (P.x1 + 10) - e.x], dy = e.y - (P.y0 - 10), m = Math.min(dx[0], dx[1], dy); if (m === dy) e.y = P.y0 - 10; else if (m === dx[0]) e.x = P.x0 - 10; else e.x = P.x1 + 10; } }

// ---------- 소리·진동 (게임 효과음 길: 볼륨·음소거 설정 그대로) ----------
const snd = (n, gv = .05, at = 0) => { try { R?.kit?.snd(n, at, gv); } catch (e) {} };
const buzz = n => { try { GA.haptic?.(n); } catch (e) {} };

// ---------- 능력치·데미지 (체육관 statsOf = 본가 공식) ----------
function dmg(at, df, t, c, pw) {
  const A2 = c === 1 ? at.st[1] : at.st[3], D2 = c === 1 ? df.st[2] : df.st[4];
  const e = eff(t, tysOf(df.sp)), stab = tysOf(at.sp).includes(t) ? 1.5 : 1, bf = at.buff > 0 ? 1.3 : 1;
  const base = Math.floor(Math.floor(Math.floor(2 * at.lv / 5 + 2) * pw * A2 / D2) / 50) + 2;
  return { n: Math.max(1, Math.floor(base * stab * e * bf * (.85 + Math.random() * .15))), e };
}

// ---------- 포켓몬 그리기 (필드 PMD 그림: 칸 = a[0..6], 기준점 a[4]·a[5]+fy) ----------
function drawMon(e) {
  const g = R.g, T = R.T, S2 = sprOf(e); if (!S2?.im) return; const { D, im } = S2, lift = e.mine ? (GA.lift?.(e.sp) || 0) : (GA.lift?.(e.sp) || 0) * .6;
  const P = D.P, k = e.k || 1;
  if (!P) { const h = 52 * k, w = h * (im.width / im.height || 1); g.fillStyle = 'rgba(20,40,10,.25)'; g.beginPath(); g.ellipse(e.x, e.y, w * .32, 4 * k, 0, 0, 7); g.fill();
    g.save(); g.translate(Math.round(e.x), Math.round(e.y - lift - (e.z || 0))); if (e.face > 0) g.scale(-1, 1); if (e.fade != null) g.globalAlpha = Math.max(0, e.fade); if (e.inv > 0 && e.mine && Math.floor(T * 20) % 2) g.globalAlpha = .4; g.drawImage(im, -w / 2, -h, w, h); g.restore(); warnMark(e, h); return; }
  let an = P.a[e.anim] ? e.anim : 'Idle'; if (an === 'Walk' && e.up && P.a.WalkUp) an = 'WalkUp'; const a = P.a[an] || P.a.Idle || Object.values(P.a)[0]; if (!a) return;
  const durs = a[6], tot = durs.reduce((x, y) => x + y, 0); let t = (T - e.at) * 60; if (e.once) t = Math.min(t, tot - 1); else t %= tot;
  let f = 0; for (let acc = 0; f < durs.length; f++) { acc += durs[f]; if (t < acc) break; } f = Math.min(f, durs.length - 1);
  const s = (D.s || 2) * k, flip = e.face > 0 && an !== 'WalkUp', sx = f * (a[1] + (P.G || 0)), sy = a[0], dx = -a[4] * s, dy = (-a[5] - (P.fy || 0)) * s;
  const fw = Math.max(10, (P.fw || 14) * s * 1.05); g.fillStyle = `rgba(20,40,10,${lift > 8 ? .15 : .25})`; g.beginPath(); g.ellipse(e.x + (P.fx || 0) * s * (flip ? -1 : 1), e.y, fw / 2, Math.max(3, fw * .15), 0, 0, 7); g.fill();
  const one = (alpha, bright) => { g.save(); g.translate(Math.round(e.x), Math.round(e.y - lift - (e.z || 0))); if (flip) g.scale(-1, 1);
    let F = e.mine && e.shiny ? `hue-rotate(${GA.shinyHue?.(e.sp) || 0}deg)` : ''; if (bright) F += ' brightness(4)'; if (F) g.filter = F;
    g.globalAlpha = alpha; g.drawImage(im, sx, sy, a[1], a[2], dx, dy, a[1] * s, a[2] * s); g.restore(); };
  let al = 1; if (e.inv > 0 && e.mine && Math.floor(T * 20) % 2) al = .4; if (e.fade != null) al = Math.max(0, e.fade);
  one(al); if (e.flash > 0) one(Math.min(.7, e.flash * 4), true);
  warnMark(e, (a[5] + (P.fy || 0)) * s + lift);
}
function warnMark(e, h) { if (!(e.warn > 0)) return; const g = R.g; g.font = 'bold 18px Galmuri11'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText('!', e.x, e.y - h - 8); g.fillStyle = '#ff4a3a'; g.fillText('!', e.x, e.y - h - 8); }
const setAnim = (e, a, once = false) => { if (e.anim === a && !once) return; e.anim = a; e.at = R.T; e.once = once; };
const hasAnim = (e, a) => !!sprOf(e)?.D?.P?.a?.[a];

// ---------- 효과 (필드 pfxDraw 그대로) ----------
const PX = () => R.kit?.D;
const pfxDraw = (k, fr, x, y, f, o) => { try { R.kit.draw(R.g, k, fr, x, y, f, o || {}); } catch (e) {} };
const pLen = (k, ft) => (PX()?.s[k]?.[2] || 1) * ft / 60;
function fxOnce(k, ft, delay, x, y, f, o) { if (!PX()?.s[k]) return 0; const d = Math.max(.1, pLen(k, ft)); R.FX.push({ t0: R.T + delay, d, draw: t => pfxDraw(k, t * 60 / ft, x, y, f, o) }); return d; }
const fxAdd = (delay, d, draw) => R.FX.push({ t0: R.T + delay, d, draw });
const pop = (x, y, txt, col = '#fff', big = false) => R.POPS.push({ x, y, txt, col, t0: R.T, big });
// 원본 효과가 없는 기술: 타입 색 동그라미·별
function burst(x, y, col, r0 = 8, r1 = 34) { fxAdd(0, .3, t => { const g = R.g, p = t / .3; g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = 4 * (1 - p) + 1; g.beginPath(); g.arc(x, y, r0 + (r1 - r0) * p, 0, 7); g.stroke();
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3, r = r0 + (r1 - r0) * p * 1.2; g.fillStyle = '#fff'; g.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r * .8 - 2, 4, 4); } g.globalAlpha = 1; }); }

// ---------- 판 만들기 ----------
const EVY = () => GB()?.EVY || {};
function foePool(stat) {   // 고른 능력치 노력치만 주는 종 (gym/evy.json): 1 = 잡몹, 2~3 = 대장
  const E = EVY(), small = [], big = [];
  for (const k in E) { const sp = +k, y = E[k], s = SP[sp]; if (!s || sp > 1025 || s.leg || s.my || !(+y[stat])) continue; const tot = [...y].reduce((a, c) => a + (+c || 0), 0); if (tot !== +y[stat]) continue; (+y[stat] >= 2 ? big : small).push(sp); }
  const pick = (L, n) => { const o = []; L = L.slice(); while (o.length < n && L.length) o.push(L.splice(Math.floor(Math.random() * L.length), 1)[0]); return o; };
  const sm = pick(small, 3); while (sm.length < 3) sm.push(sm[0] || 19);
  return [...sm, pick(big, 1)[0] || pick(small, 1)[0] || 20];
}
function moveList(P) {   // 내 포켓몬이 지금 쓰는 기술 4개 (체육관 기술 데이터)
  const B = GB(), m = B.gm(P); return (m.mv || []).map(id => B.mvOf(id)).filter(Boolean).slice(0, 4).map(d => {
    const [, name, t, cat, pw0] = d, Rr = PX()?.r[name], c = cat === 0 ? 1 : cat === 1 ? 2 : 0, pw = c ? (pw0 || 40) : 0;
    let k = Rr?.k; k = !c ? 'Self' : k === 'Offset' ? 'Attack' : k === 'Throw' || k === 'WaveMotion' ? 'Projectile' : k || (c === 1 ? 'Attack' : 'Projectile');
    return { name, t: t || 1, c, pw, k, Rr }; });
}
function mineOf(o) {   // 고른 포켓몬 → 판에서 쓸 값 (읽기만)
  const B = GB(), P = o.P, m = B.gm(P), lv = m.lv || 1, eg = B.egFocus?.(P) ?? -1, er = eg >= 0 ? B.egList(P).find(r => r.i === eg) : null;
  return { P, lv, st: B.statsOf(P.sp, lv, P.iv || [], m.nat, m.ev || []), mv: moveList(P), eg: er ? { i: eg, nm: er.x[1], t: er.x[2], p: (m.egP || [])[eg] | 0 } : null, xp: m.xp | 0, fr: P.fr | 0, evRoom: Math.max(0, Math.min(B.EV_ONE - ((B.evArr(m)[R.stat]) | 0), B.EV_MAX - B.evSumOf(m) - (m.evp | 0))) };
}
const nmOf = P => P.nm || nmSp(P.sp);
function newGame() {
  const o = R.mons[R.pick], M = mineOf(o), P = o.P, W = R.W, H = R.H;
  const me = { sp: P.sp, sex: P.sex, shiny: !!P.shiny, lv: M.lv, st: M.st, mine: true, x: W / 2, y: H * .55, face: -1, anim: 'Idle', at: 0, inv: 0, cd: {}, cdMax: {}, dcd: 0, flash: 0, buff: 0 };
  me.mhp = me.hp = Math.round(me.st[0] * 2.8);
  R.G = { o, M, me, stat: R.stat, pool: R.pool || foePool(R.stat), mobs: [], shots: [], drops: [], wave: 0, ko: 0, gold: 0, exp: 0, ev: 0, evRaw: 0, shard: 0, fainted: false, time: TIME, start: R.T, over: false, egg0: M.eg?.p ?? 0, egg: M.eg?.p ?? 0 };
  R.G.pool.forEach(sp => spr(sp)); R.pool = null; M.mv.forEach(v => { me.cd[v.name] = 0; });
  buildButtons(); hud(); nextWave();
}
function spawn(sp, boss) {
  const G = R.G, A = R.A, W = R.W, H = R.H, lv = Math.max(2, boss ? G.M.lv + 2 : G.M.lv - 3 - Math.floor(Math.random() * 3)), side = Math.floor(Math.random() * 3);
  const x = side === 0 ? A.x0 + 10 : side === 1 ? A.x1 - 10 : W * (.3 + Math.random() * .5), y = side === 2 ? A.y0 + 4 : A.y0 + 20 + Math.random() * (H * .45);
  const e = { sp, lv, st: GB().statsOf(sp, lv, [10, 10, 10, 10, 10, 10], '', []), x, y, face: x < W / 2 ? 1 : -1, anim: 'Walk', at: R.T, boss, k: boss ? 1.3 : 1, cd: 1 + Math.random() * 1.5, warn: 0, flash: 0, z: 0, enter: .4 };
  const b = SP[sp]?.bs || [60, 60, 60, 60, 60, 60]; e.ranged = b[3] > b[1] + 10; e.spd = 34 + b[5] * .55;
  e.mhp = e.hp = Math.round(e.st[0] * (boss ? 5 : 2.8));
  keepIn(e); G.mobs.push(e); fxOnce('Wood_Hammer_Smoke', 2, 0, e.x, e.y - 10, 1, { s: .8 });
}
function nextWave() {
  const G = R.G; G.wave++; const pool = G.pool;
  if (G.wave === 1) for (let i = 0; i < 4; i++) spawn(pool[i % 3]);
  else if (G.wave === 2) for (let i = 0; i < 6; i++) spawn(pool[i % 3]);
  else { spawn(pool[3], true); spawn(pool[0]); spawn(pool[1]); }
  banner(G.wave === 3 ? `대장 ${nmSp(pool[3])} 등장!` : `웨이브 ${G.wave}`); hud();
}

// ---------- 내 기술 ----------
const nearest = (e, list, r = 9999) => { let b = null, bd = r; for (const o of list) { if (o.hp <= 0 || o.enter > 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } return b; };
function useMove(i) {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || G.over) return; const v = G.M.mv[i]; if (!v || me.cd[v.name] > 0 || me.busy > 0) return;
  const { name, t, c, pw, k, Rr } = v, tg = nearest(me, G.mobs), col = TYPE_C[t] || '#fff';
  const ang = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : (me.face > 0 ? 0 : Math.PI), dx = Math.cos(ang), dy = Math.sin(ang);
  me.face = dx >= 0 ? 1 : -1; me.cd[name] = me.cdMax[name] = c ? .6 + pw / 70 : 6; const f = me.face, E = r => (Rr?.e || []).filter(e => e[0] === r);
  for (const [ro, n, dl, gv] of Rr?.snd || []) snd(n, gv, (ro === 'pre' ? 0 : ro === 'act' ? .12 : .25) + (dl || 0) / 60);
  if (!Rr?.snd?.length) snd(c ? 'DUN_Move_Start' : 'DUN_Stat_Up', .04);
  for (const [, kk, ft] of E('pre')) fxOnce(kk, ft, 0, me.x, me.y - 22, f);
  const hitOne = (o, delay = 0, kb = 1) => { if (o.hp <= 0) return; const r = dmg(me, o, t, c, pw); setTimeout(() => R?.G === G && hurt(o, r, dx * kb, dy * kb), delay * 1000); hitFx(Rr, o, delay, f, col); };
  if (k === 'Self') {   // 변화 기술: 5초 동안 기술 위력 1.3배 + HP 조금 회복
    setAnim(me, hasAnim(me, 'Charge') ? 'Charge' : hasAnim(me, 'SpAttack') ? 'SpAttack' : 'Attack', true); me.busy = .35; me.buff = 5; me.hp = Math.min(me.mhp, me.hp + Math.round(me.mhp * .08));
    if (!E('pre').length) burst(me.x, me.y - 24, col, 10, 48); pop(me.x, me.y - 60, '힘이 솟는다!', '#bff59a'); hud();
  } else if (k === 'Attack') {
    setAnim(me, 'Attack', true); me.busy = .3; const hx = me.x + dx * 34, hy = me.y + dy * 22;
    for (const [, kk, ft] of [...E('front'), ...E('tile')]) fxOnce(kk, ft, .08, hx, hy - 20, f);
    if (!Rr) burst(hx, hy - 20, col);
    for (const o of G.mobs) if (o.enter <= 0 && Math.hypot(o.x - hx, o.y - hy) < 46 + (o.boss ? 14 : 0)) hitOne(o, .12, 1.4);
  } else if (k === 'Dash') {
    setAnim(me, 'Walk'); me.busy = .24; me.dash = { vx: dx * 560, vy: dy * 560, t: .2, hit: new Set(), v }; me.inv = Math.max(me.inv, .3);
    for (const [, kk, ft] of [...E('proj'), ...E('stream')]) fxAdd(0, .22, tt => pfxDraw(kk, (tt * 60 / ft) % (PX().s[kk]?.[2] || 1), me.x, me.y - 20, f));
  } else if (k === 'Projectile') {
    setAnim(me, hasAnim(me, 'Shoot') ? 'Shoot' : hasAnim(me, 'SpAttack') ? 'SpAttack' : 'Attack', true); me.busy = .25;
    if (E('col').length) {   // 번개처럼 겨눈 자리에 떨어지는 기술
      const px = tg ? tg.x : me.x + dx * 140, py = tg ? tg.y : me.y + dy * 90;
      for (const [, kk, ft] of E('col')) { const B = kk + '_B', Hd = kk + '_H', S = PX().s; if (!S[B] || !S[Hd]) continue; const bh = S[B][1] * 2;
        fxAdd(.12, .6, tt => { const fr = (tt * 60 / ft) % S[B][2]; pfxDraw(Hd, fr, px, py - 16, 1); for (let y = py - 16 - S[Hd][1] - bh / 2 + 2; y > -60; y -= bh - 2) pfxDraw(B, fr, px, y, 1); }); }
      for (const o of G.mobs) if (o.enter <= 0 && Math.hypot(o.x - px, o.y - py) < 40) hitOne(o, .18, .6);
      R.FLASH = Math.max(R.FLASH, .12);
    } else { const stream = E('stream').length > 0, sp = stream ? 300 : 320, life = stream ? .5 : .8;
      G.shots.push({ x: me.x + dx * 16, y: me.y - 20 + dy * 10, vx: dx * sp, vy: dy * sp, life, t0: R.T, mine: true, pierce: stream, hit: new Set(), v, f, ang, col }); }
  } else {   // Area: 내 둘레
    setAnim(me, hasAnim(me, 'SpAttack') ? 'SpAttack' : 'Attack', true); me.busy = .3;
    for (const [, kk, ft] of [...E('area'), ...E('tile'), ...E('stream'), ...E('proj')]) fxOnce(kk, ft, .05, me.x, me.y - 16, f);
    if (!E('area').length) burst(me.x, me.y - 16, col, 16, 80);
    for (const o of G.mobs) if (o.enter <= 0 && Math.hypot(o.x - me.x, o.y - me.y) < 84) hitOne(o, .1);
  }
  pressEl(R.q('.ya-mvs').children[i]);
}
function hitFx(Rr, o, delay, f, col) { const H2 = (Rr?.e || []).filter(e => e[0] === 'hit'); for (const [, kk, ft] of H2) fxOnce(kk, ft, delay, o.x, o.y - 20, f); if (!H2.length) setTimeout(() => R && burst(o.x, o.y - 20, col, 4, 26), delay * 1000); }
function hurt(o, r, kx, ky) {
  const G = R?.G; if (!G || o.hp <= 0) return; o.hp -= r.n; o.flash = .14; o.kx = kx * (o.boss ? 60 : 160); o.ky = ky * (o.boss ? 40 : 110); if (!o.boss || Math.random() < .4) setAnim(o, 'Hurt', true); o.stun = o.boss ? .15 : .35;
  pop(o.x, o.y - 50, r.n, r.e > 1 ? '#ffd84a' : r.e < 1 ? '#c8c8d8' : '#ffffff', r.e > 1);
  if (r.e > 1) { snd('DUN_Hit_Super_Effective', .06); pop(o.x, o.y - 70, '효과가 굉장했다!', '#ffd84a'); } else snd(r.e < 1 ? 'DUN_Hit_Not_Very_Effective' : 'DUN_Hit_Neutral', .05);
  if (o.hp <= 0) ko(o);
}
function ko(o) {
  const G = R.G; o.hp = 0; o.dead = R.T; setAnim(o, 'Hurt', true); G.ko++; buzz(0);
  const gold = o.boss ? 8 : 1; G.gold += gold; hgUp();
  const ex = Math.max(1, Math.round(GB().xpFor({ sp: o.sp, lv: o.lv }, G.M.lv) * (o.boss ? 1.5 : 1))); G.exp += ex;
  const y = EVY()[o.sp] || '', evAdd = +y[G.stat] || 0, before = G.ev; G.evRaw += evAdd; G.ev = Math.min(EV_CAP, G.M.evRoom, G.evRaw);
  pop(o.x, o.y - 30, `+${ex} 경험치`, '#bfe6ff'); if (G.ev > before) setTimeout(() => R && pop(o.x, o.y - 48, `${STAT_KO[G.stat]} 노력치 +${G.ev - before}`, '#d6b4ff'), 200);
  setTimeout(() => R && pop(o.x + 18, o.y - 66, `+${gold}G`, '#ffe27a'), 380); snd('DUN_Money', .04, .2);
  if (G.M.eg && G.shard + G.drops.length < SHARD_CAP && (o.boss || Math.random() < .35)) G.drops.push({ x: o.x, y: o.y - 4, t0: R.T, vy: -120, z: 10 });
  hud();
}

// ---------- 회피 ----------
function dodge() {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || me.dcd > 0 || G.over) return; const J = R.JOY;
  let dx = J.dx, dy = J.dy; if (Math.hypot(dx, dy) < .2) { dx = me.face; dy = 0; } const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  me.dash = { vx: dx * 520, vy: dy * 520, t: .2, roll: true }; me.inv = .38; me.dcd = 1; snd('DUN_Miss', .04); setAnim(me, hasAnim(me, 'Hop') ? 'Hop' : 'Walk', true);
  for (let i = 0; i < 4; i++) fxAdd(i * .04, .35, tt => { const g = R.g; g.fillStyle = `rgba(240,228,200,${Math.max(0, .7 - tt * 2)})`; g.beginPath(); g.arc(me.x - dx * 20 * i, me.y - 2, 6 + tt * 20, 0, 7); g.fill(); });
  pressEl(R.q('.ya-dg'));
}

// ---------- 매 프레임 ----------
function step(dt) {
  const G = R.G, me = G.me, J = R.JOY, T = R.T;
  me.inv = Math.max(0, me.inv - dt); me.dcd = Math.max(0, me.dcd - dt); me.flash = Math.max(0, me.flash - dt); me.busy = Math.max(0, (me.busy || 0) - dt); me.buff = Math.max(0, me.buff - dt);
  for (const k in me.cd) me.cd[k] = Math.max(0, me.cd[k] - dt);
  if (!G.over) G.time = Math.max(0, TIME - (T - G.start));
  if (me.hp > 0) {
    if (me.dash) { const d = me.dash; me.x += d.vx * dt; me.y += d.vy * dt; d.t -= dt; keepIn(me);
      if (!d.roll) for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && !d.hit.has(o) && Math.hypot(o.x - me.x, o.y - me.y) < 30 + (o.boss ? 12 : 0)) { d.hit.add(o); const v = d.v, r = dmg(me, o, v.t, v.c, v.pw); hurt(o, r, Math.sign(d.vx) * .8, Math.sign(d.vy) * .5); hitFx(v.Rr, o, 0, me.face, TYPE_C[v.t]); }
      if (d.t <= 0) me.dash = null; }
    else if (me.busy <= 0) { const sp = 120 + me.st[5] * .5, m = Math.hypot(J.dx, J.dy);
      if (m > .15) { me.x += J.dx * sp * dt; me.y += J.dy * sp * dt; if (Math.abs(J.dx) > .2) me.face = J.dx > 0 ? 1 : -1; me.up = J.dy < -.6 && Math.abs(J.dx) < .5; setAnim(me, 'Walk'); keepIn(me); } else if (!me.once || T - me.at > .5) setAnim(me, 'Idle'); }
  }
  for (const o of G.mobs) {
    o.flash = Math.max(0, o.flash - dt);
    if (o.hp <= 0) { o.fade = 1 - (T - o.dead) / .6; continue; }
    if (o.enter > 0) { o.enter -= dt; continue; }
    if (o.kx) { o.x += o.kx * dt; o.y += o.ky * dt; o.kx *= Math.pow(.002, dt); o.ky *= Math.pow(.002, dt); if (Math.abs(o.kx) < 3) o.kx = o.ky = 0; keepIn(o); }
    if (o.stun > 0) { o.stun -= dt; continue; }
    const dx = me.x - o.x, dy = me.y - o.y, d = Math.hypot(dx, dy) || 1; o.face = dx > 0 ? 1 : -1; o.cd -= dt;
    if (o.lunge) { const L = o.lunge; L.t -= dt; o.x += L.vx * dt; o.y += L.vy * dt; keepIn(o);
      if (!L.done && me.hp > 0 && me.inv <= 0 && Math.hypot(me.x - o.x, me.y - o.y) < 26 + (o.boss ? 12 : 0)) { L.done = true; hitMe(o, 1, 1, 40, L.vx, L.vy); }
      if (L.t <= 0) { o.lunge = null; o.cd = o.boss ? 1.8 + Math.random() * .6 : 1.6 + Math.random(); setAnim(o, 'Walk'); } continue; }
    if (o.warn > 0) { o.warn -= dt; if (o.warn <= 0) {
        if (o.shoot) { o.shoot = false; const a = Math.atan2(dy, dx), sp = 150, t = tysOf(o.sp)[0]; G.shots.push({ x: o.x, y: o.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2.2, t0: T, mine: false, from: o, t, c: 2, pw: o.boss ? 60 : 40 }); setAnim(o, hasAnim(o, 'Shoot') ? 'Shoot' : 'Attack', true); o.cd = 2.8 + Math.random(); snd('DUN_Move_Start', .03); }
        else { o.lunge = { vx: dx / d * 330, vy: dy / d * 330, t: .22 }; setAnim(o, 'Attack', true); snd('DUN_Tackle', .035); } } continue; }
    if (o.cd <= 0 && me.hp > 0) { if (o.ranged && d > 70 && d < 260) { o.warn = .5; o.shoot = true; continue; } if (d < 80) { o.warn = o.boss ? .6 : .55; continue; } }
    const want = o.ranged ? 150 : 0, s = o.spd * (d > want ? 1 : -.6);
    let px = 0, py = 0; for (const q of G.mobs) if (q !== o && q.hp > 0) { const ex = o.x - q.x, ey = o.y - q.y, ed = Math.hypot(ex, ey); if (ed < 34 && ed > 0) { px += ex / ed * (34 - ed); py += ey / ed * (34 - ed); } }
    if (Math.abs(d - want) > 12) { o.x += (dx / d * s) * dt + px * dt * 3; o.y += (dy / d * s) * dt + py * dt * 3; setAnim(o, 'Walk'); } else setAnim(o, 'Idle'); keepIn(o);
  }
  G.mobs = G.mobs.filter(o => o.hp > 0 || T - o.dead < .6);
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.mine) { for (const o of G.mobs) if (o.hp > 0 && o.enter <= 0 && !s.hit.has(o) && Math.hypot(o.x - s.x, o.y - 20 - s.y) < 24 + (o.boss ? 12 : 0)) { s.hit.add(o); const v = s.v, r = dmg(me, o, v.t, v.c, v.pw); hurt(o, r, Math.cos(s.ang) * .7, Math.sin(s.ang) * .5); hitFx(v.Rr, o, 0, s.f, s.col); if (!s.pierce) s.life = 0; } }
    else if (me.hp > 0 && me.inv <= 0 && Math.hypot(me.x - s.x, me.y - 20 - s.y) < 18) { s.life = 0; hitMe(s.from, s.t, s.c, s.pw, s.vx, s.vy); } }
  G.shots = G.shots.filter(s => T - s.t0 < s.life && s.x > -40 && s.x < R.W + 40 && s.y > -40 && s.y < R.H + 40);
  for (const p of G.drops) { if (p.z > 0 || p.vy < 0) { p.vy += 500 * dt; p.z -= p.vy * dt; if (p.z < 0) { p.z = 0; p.vy = 0; } }
    const d = Math.hypot(me.x - p.x, me.y - p.y); if (T - p.t0 > .5 && d < 70) { p.x += (me.x - p.x) * dt * 6; p.y += (me.y - p.y) * dt * 6; }
    if (T - p.t0 > .5 && d < 20 && me.hp > 0) { p.got = true; gotShard(p); } }
  G.drops = G.drops.filter(p => !p.got);
  if (!G.over && G.mobs.every(o => o.hp <= 0) && !G.waiting) { if (G.wave < 3) { G.waiting = true; setTimeout(() => { if (R?.G === G && !G.over) { G.waiting = false; nextWave(); } }, 900); } else if (!G.drops.length) end(true); else if (!G.dropT) G.dropT = T; else if (T - G.dropT > 3) end(true); }
  if (!G.over && G.time <= 0) end(false);
  if (!G.over && me.hp <= 0) end(false, true);
  R.SHAKE = Math.max(0, R.SHAKE - dt * 30); R.FLASH = Math.max(0, R.FLASH - dt);
}
function hitMe(o, t, c, pw, vx, vy) {
  const G = R.G, me = G.me, r = dmg(o, me, t, c, pw); me.hp = Math.max(0, me.hp - r.n); me.inv = .7; me.flash = .12; setAnim(me, 'Hurt', true); me.busy = .2;
  const l = Math.hypot(vx, vy) || 1; me.x += vx / l * 18; me.y += vy / l * 12; keepIn(me);
  pop(me.x, me.y - 56, r.n, '#ff7a6a', r.e > 1); R.SHAKE = 6; buzz(1); snd('DUN_Hit_Neutral', .05); hud();
  if (me.hp <= 0) { G.fainted = true; me.dead = R.T; }
}
function gotShard(p) {
  const G = R.G; G.shard++; G.egg = Math.min(99, G.egg + 1); snd('DUN_Wonder_Tile', .07); buzz(0);
  pop(p.x, p.y - 40, '번뜩임 +1%', '#ffe27a', true);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; fxAdd(0, .45, tt => { const g = R.g; g.fillStyle = `rgba(255,236,140,${Math.max(0, 1 - tt * 2.2)})`; const r = 6 + tt * 70; g.fillRect(p.x + Math.cos(a) * r - 2, p.y - 20 + Math.sin(a) * r * .7 - 2, 4, 4); }); }
  const b = R.q('.ya-eg'); b.classList.remove('up'); void b.offsetWidth; b.classList.add('up'); hud();
}

// ---------- 그리기 ----------
function drawShard(p) { const g = R.g, T = R.T, y = p.y - p.z - 8 + Math.sin((T - p.t0) * 5) * 2, x = p.x;
  g.fillStyle = 'rgba(20,40,10,.25)'; g.beginPath(); g.ellipse(x, p.y, 7, 3, 0, 0, 7); g.fill();
  g.save(); g.translate(Math.round(x), Math.round(y)); const s = 2, P = ['...k...', '..kyk..', '.kywyk.', 'kyywyyk', '.kyyok.', '..kok..', '...k...'], C = { k: '#6a4400', y: '#ffd640', w: '#fffbe0', o: '#e8a020' };
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const ch = P[j][i]; if (ch === '.') continue; g.fillStyle = C[ch]; g.fillRect((i - 3.5) * s, (j - 3.5) * s, s, s); }
  const tw = (Math.sin((T - p.t0) * 8) + 1) / 2; g.fillStyle = `rgba(255,255,255,${tw})`; g.fillRect(4, -10, 2, 6); g.fillRect(2, -8, 6, 2); g.restore(); }
function hpBar(e) { const g = R.g, w = e.boss ? 54 : 34, x = Math.round(e.x - w / 2), y = Math.round(e.y + 6); g.fillStyle = '#20202c'; g.fillRect(x - 1, y - 1, w + 2, 6); g.fillStyle = '#4a4a5a'; g.fillRect(x, y, w, 4); const r = e.hp / e.mhp; g.fillStyle = r > .5 ? '#58d050' : r > .2 ? '#f8c030' : '#f05038'; g.fillRect(x, y, Math.ceil(w * r), 4);
  if (e.boss) { const t = `대장 Lv.${e.lv}`; g.font = 'bold 11px Galmuri11'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(t, e.x, y + 16); g.fillStyle = '#ffd84a'; g.fillText(t, e.x, y + 16); } }
function draw() {
  const g = R.g, G = R.G, T = R.T; g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, R.W, R.H);
  g.translate(R.SHAKE ? (Math.random() - .5) * R.SHAKE : 0, R.SHAKE ? (Math.random() - .5) * R.SHAKE : 0);
  if (R.BG) g.drawImage(R.BG, 0, 0, R.W, R.H); else { g.fillStyle = '#e4cc96'; g.fillRect(0, 0, R.W, R.H); }
  if (!G) return;
  for (const p of G.drops) drawShard(p);
  for (const e of [...G.mobs, G.me].sort((a, b) => a.y - b.y)) { drawMon(e); if (!e.mine && e.hp > 0 && e.enter <= 0) hpBar(e); }
  for (const s of G.shots) { if (s.mine) { const E = s.v.Rr?.e || []; let n = 0; for (const [ro, kk, ft] of E) if (ro === 'proj' || ro === 'stream') { n++; pfxDraw(kk, ((T - s.t0) * 60 / ft) % (PX().s[kk]?.[2] || 1), s.x, s.y, s.f, { rot: s.f > 0 ? s.ang : s.ang - Math.PI }); } if (!n) orb(s.x, s.y, s.col, 9); }
    else orb(s.x, s.y, TYPE_C[s.t] || '#fff', 7); }
  for (let i = R.FX.length - 1; i >= 0; i--) { const f = R.FX[i], t = T - f.t0; if (t < 0) continue; if (t > f.d) { R.FX.splice(i, 1); continue; } try { f.draw(t); } catch (e) { R.FX.splice(i, 1); } }
  g.textAlign = 'center';
  for (let i = R.POPS.length - 1; i >= 0; i--) { const p = R.POPS[i], t = T - p.t0; if (t > 1) { R.POPS.splice(i, 1); continue; }
    const sz = typeof p.txt === 'number' ? (p.big ? 22 : 17) : p.big ? 15 : 12; g.font = `bold ${sz}px Galmuri11`; const y = p.y - t * 30;
    g.globalAlpha = t > .7 ? (1 - t) / .3 : 1; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(p.txt, p.x, y); g.fillStyle = p.col; g.fillText(p.txt, p.x, y); g.globalAlpha = 1; }
  if (R.FLASH > 0) { g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0); g.fillStyle = `rgba(255,255,230,${R.FLASH * 3})`; g.fillRect(0, 0, R.W, R.H); }
}
function orb(x, y, c, r) { const g = R.g; g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 2, y - 2, r * .4, 0, 7); g.fill(); g.strokeStyle = '#20202c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.stroke(); }
function loop(ms) {
  if (!R) return; const now = ms / 1000, dt = Math.min(.05, R.last ? now - R.last : 0); R.last = now;
  R.T += dt; if (R.run && R.G) { step(dt); if (R) cdUi(); }
  if (!R) return; draw(); R.raf = requestAnimationFrame(loop);
}

// ---------- 조작 ----------
function bind() {
  const r = R, q = r.q, J = r.JOY, jz = q('.ya-joy'), jb = q('.ya-joyb'), jk = q('.ya-joyk'), on = (t, ev, f, o) => { t.addEventListener(ev, f, o); r.off.push(() => t.removeEventListener(ev, f, o)); };
  const rect = () => r.el.getBoundingClientRect();
  const js = e => { if (!r.run) return; const t = e.changedTouches ? e.changedTouches[0] : e, b = rect(); J.id = t.identifier ?? 'm'; J.ox = t.clientX; J.oy = t.clientY; jb.style.left = (t.clientX - b.left) + 'px'; jb.style.top = (t.clientY - b.top) + 'px'; jb.classList.add('on'); jm(e); e.preventDefault(); };
  const jm = e => { if (J.id == null) return; for (const t of e.changedTouches ? [...e.changedTouches] : [e]) { if ((t.identifier ?? 'm') !== J.id) continue; let dx = t.clientX - J.ox, dy = t.clientY - J.oy; const d = Math.hypot(dx, dy), RR = 44; if (d > RR) { dx *= RR / d; dy *= RR / d; } J.dx = dx / RR; J.dy = dy / RR; jk.style.transform = `translate(${dx}px,${dy}px)`; } e.preventDefault?.(); };
  const je = e => { for (const t of e.changedTouches ? [...e.changedTouches] : [e]) if ((t.identifier ?? 'm') === J.id) { J.id = null; J.dx = J.dy = 0; jk.style.transform = ''; jb.classList.remove('on'); } };
  on(jz, 'touchstart', js, { passive: false }); on(jz, 'touchmove', jm, { passive: false }); on(jz, 'touchend', je); on(jz, 'touchcancel', je);
  on(jz, 'mousedown', e => { js(e); const mm = ev => jm(ev), mu = ev => { je(ev); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); }; addEventListener('mousemove', mm); addEventListener('mouseup', mu); });
  const keyJoy = () => { if (J.id != null) return; const K = r.KEY, x = (K.arrowright || K.d ? 1 : 0) - (K.arrowleft || K.a ? 1 : 0), y = (K.arrowdown || K.s ? 1 : 0) - (K.arrowup ? 1 : 0), l = Math.hypot(x, y) || 1; J.dx = x / l; J.dy = y / l; };
  on(window, 'keydown', e => { if (!r.run) return; const k = e.key.toLowerCase(); r.KEY[k] = 1; const i = 'qwer'.indexOf(k); if (i >= 0) useMove(i); if (e.key === ' ') { dodge(); e.preventDefault(); } if (k.startsWith('arrow')) e.preventDefault(); keyJoy(); });
  on(window, 'keyup', e => { r.KEY[e.key.toLowerCase()] = 0; keyJoy(); });
  { const go = e => { e.preventDefault(); dodge(); }, d = q('.ya-dg'); on(d, 'touchstart', go, { passive: false }); on(d, 'mousedown', go); }
  on(q('.ya-pk'), 'click', e => { const b = e.target.closest('.pkc'); if (!b) return; r.pick = +b.dataset.i; const o = r.mons[r.pick]; if (o.evk >= 0) r.stat = o.evk; r.pool = null; startUi(); });
  on(q('.ya-stt'), 'click', e => { const b = e.target.closest('.stc'); if (!b) return; r.stat = +b.dataset.s; r.pool = null; startUi(); });
  on(q('.ya-go'), 'click', () => { q('.ya-start').hidden = true; q('.ya-ov').hidden = true; r.el.classList.add('play'); r.T = 0; r.FX.length = 0; r.POPS.length = 0; newGame(); r.run = true; });
  on(q('.ya-again'), 'click', () => { q('.ya-res').hidden = true; q('.ya-ov').hidden = true; r.FX.length = 0; r.POPS.length = 0; r.el.classList.add('play'); newGame(); r.run = true; });
  on(q('.ya-back'), 'click', () => close());
  on(q('.ya-x'), 'click', () => close());
  on(q('.ya-quit'), 'click', () => { if (r.run && r.G) end(false); });
  let rz = 0; on(window, 'resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (R === r) resize(); }, 200); });
}
function buildButtons() {
  const box = R.q('.ya-mvs'); box.innerHTML = '';
  R.G.M.mv.forEach((v, i) => { const b = document.createElement('button'); b.className = 'mvb'; b.style.setProperty('--tc', TYPE_C[v.t] || '#888');
    b.innerHTML = `<i class="cdo"></i><span class="tg">${TYPE_KO[v.t] || ''}</span><b>${v.name}</b><small>${v.c === 1 ? `물리 ${v.pw}` : v.c === 2 ? `특수 ${v.pw}` : '변화'}</small>`;
    const go = e => { e.preventDefault(); useMove(i); }; b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go); box.append(b); });
}
function pressEl(b) { if (!b) return; b.classList.remove('pr'); void b.offsetWidth; b.classList.add('pr'); }
function cdUi() { const G = R.G, me = G.me, box = R.q('.ya-mvs'), dg = R.q('.ya-dg'); G.M.mv.forEach((v, i) => { const b = box.children[i]; if (!b) return; const c = me.cd[v.name], m = me.cdMax[v.name] || 1; b.classList.toggle('cd', c > 0); b.querySelector('.cdo').style.setProperty('--p', c > 0 ? (c / m * 360) + 'deg' : '0deg'); });
  dg.style.setProperty('--p', (me.dcd * 360) + 'deg'); const tm = R.q('.ya-tm'); tm.textContent = Math.ceil(G.time); tm.classList.toggle('low', G.time <= 10); }

// ---------- HUD ----------
function hud() {
  const G = R?.G; if (!G) return; const q = R.q, me = G.me, eg = G.M.eg, r = me.hp / me.mhp;
  q('.ya-ph').textContent = `웨이브 ${G.wave}/3`; q('.ya-m').textContent = `${G.ko}마리`; q('.mg-hg b').textContent = G.gold;
  q('.ya-hpf').style.width = (r * 100) + '%'; q('.ya-hpf').className = 'ya-hpf' + (r > .5 ? '' : r > .2 ? ' y' : ' r'); q('.ya-hpn').textContent = `${me.hp}/${me.mhp}`;
  q('.ya-rwe').textContent = `+${G.exp}`; q('.ya-rwv').textContent = `${G.ev}/${Math.min(EV_CAP, G.M.evRoom)}`; q('.ya-rwk').textContent = STAT_KO[G.stat];
  q('.ya-eg').hidden = !eg;
  if (eg) { q('.ya-egn').textContent = eg.nm; q('.ya-egt').textContent = TYPE_KO[eg.t] || ''; q('.ya-egt').style.background = TYPE_C[eg.t] || '#888'; q('.ya-egf').style.setProperty('--tc', TYPE_C[eg.t] || '#ee99ac');
    q('.ya-egf').style.width = G.egg + '%'; q('.ya-egf0').style.width = G.egg0 + '%'; q('.ya-egp').textContent = `${G.egg}%`; q('.ya-egs').textContent = `조각 ${G.shard}/${SHARD_CAP}`; }
  q('.ya-me').textContent = `${nmOf(G.o.P)} Lv.${me.lv}`;
}
function hgUp() { const el = R.q('.mg-hg'); el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); hud(); }
function banner(t) { const b = R.q('.ya-ban'); b.textContent = t; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }

// ---------- 끝: 보상은 계산해서 보여 주기만 (저장 안 함) ----------
function end(clear, faint) {
  const G = R.G; if (G.over) return; G.over = true; R.run = false; R.JOY.dx = R.JOY.dy = 0; R.el.classList.remove('play');
  const left = Math.ceil(G.time), bonus = clear ? Math.floor(left / 6) : 0; G.gold += bonus;
  const fr = (clear ? 1 : 0) + (G.fainted ? 0 : 1), B = GB(), P = G.o.P, gr = B.growth(P.sp), lv0 = G.M.lv, x1 = G.M.xp + G.exp; let lv1 = lv0;
  while (lv1 < B.LV_MAX && x1 >= B.xpAt(gr, lv1 + 1)) lv1++;
  const a = B.xpAt(gr, lv1), b = B.xpAt(gr, lv1 + 1), prog = lv1 >= B.LV_MAX ? 1 : Math.max(0, Math.min(1, (x1 - a) / (b - a || 1))), nm = nmOf(P), eg = G.M.eg;
  setTimeout(() => { if (!R || R.G !== G) return; const q = R.q, r = q('.ya-res');
    q('.rs-h').textContent = clear ? '훈련 완료!' : faint ? `${josa(nm, '이', '가')} 지쳐 버렸다…` : '시간 끝!';
    q('.rs-sub').textContent = clear ? `남은 시간 ${left}초 · 대장까지 다 쓰러뜨렸어요` : `${G.ko}마리 쓰러뜨렸어요`;
    q('.ya-rl').innerHTML = `
      <li><span class="k">경험치</span><b>+${G.exp}</b><em>${lv1 > lv0 ? `<i class="lvup">Lv.${lv0} → Lv.${lv1}</i>` : `Lv.${lv1}`}</em><i class="xb"><i style="width:${(prog * 100).toFixed(0)}%"></i></i></li>
      <li><span class="k">${STAT_KO[G.stat]} 노력치</span><b class="ev">+${G.ev}</b><em>${!G.M.evRoom ? '노력치가 이미 꽉 찼어요' : G.evRaw > G.ev ? `한 판 최대 ${Math.min(EV_CAP, G.M.evRoom)}` : '쓰러뜨린 포켓몬 노력치'}</em></li>
      <li><span class="k">친밀도</span><b class="fr">+${fr}</b><em>${clear ? '훈련 완료 +1' : ''}${clear && !G.fainted ? ' · ' : ''}${G.fainted ? (clear ? '' : '지쳐서 못 받음') : '안 지침 +1'} (지금 ${G.M.fr})</em></li>
      ${eg ? `<li><span class="k">번뜩임</span><b class="eg">+${G.shard}%</b><em>${eg.nm} ${G.egg0}% → ${G.egg}%</em></li>` : ''}
      <li class="ya-gold"><span class="k"><i class="coin"></i>골드</span><b>+${G.gold}G</b><em>쓰러뜨리기 ${G.gold - bonus}G${bonus ? ` · 남은 시간 ${bonus}G` : ''}</em></li>`;
    q('.ya-ov').hidden = false; r.hidden = false; r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); snd('DUN_Stat_Up', .07); buzz(1);
  }, faint ? 900 : 600);
}

// ---------- 시작 창 ----------
function startUi() {
  const q = R.q, o = R.mons[R.pick];
  q('.ya-pk').innerHTML = R.mons.map((m, i) => `<button class="pkc${i === R.pick ? ' on' : ''}" data-i="${i}"><img alt="" data-i="${i}"><b>${nmOf(m.P)}</b><small>Lv.${GB().gm(m.P).lv}</small></button>`).join('');
  R.mons.forEach((m, i) => GA.thumb?.(m.P).then(u => { const im = R?.q(`.ya-pk img[data-i="${i}"]`); if (im && typeof u === 'string') im.src = u; }).catch(() => {}));
  q('.ya-stt').innerHTML = STAT_KO.map((s, i) => `<button class="stc${i === R.stat ? ' on' : ''}" data-s="${i}">${s}</button>`).join('');
  if (!R.pool) R.pool = foePool(R.stat); const pool = R.pool; pool.forEach(sp => spr(sp));
  q('.ya-foe').innerHTML = `상대 ${pool.slice(0, 3).map(nmSp).join('·')} → 대장 <b>${nmSp(pool[3])}</b>`;
  q('.ya-pmv').innerHTML = moveList(o.P).map(v => `<span style="--tc:${TYPE_C[v.t] || '#888'}">${v.name}</span>`).join('');
}

window.GymYA = { start, close, get _R() { return R; }, _use: i => useMove(i), _dodge: () => dodge(), _end: c => R?.G && end(c) };
})();
