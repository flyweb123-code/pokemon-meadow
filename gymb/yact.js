/* 2026-11-13 경완 '임팩트·진동·손맛이 아쉽다, 해금 안 된 번뜩임 기술 이름은 안 보이게': 멈칫(히트스톱)·화면 흔들림/밀림·넉백·날아가 터지는 쓰러뜨리기·
   근접 달라붙기·입력 미리 받기·저스트 회피·콤보·상대 공격 예고·대장 낙하 등장·진동 단계(GA.haptic 0/1/2)를 넣고, 번뜩임 기술은 ??? + 타입만 보여 준다. */
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
#yact .mg-hg.up{animation:yaHg .35s ease-out}
@keyframes yaHg{40%{transform:scale(1.25);color:#fff}}
#yact .coin{display:inline-block;width:14px;height:14px;background:#ffc830;box-shadow:inset -3px -3px 0 #d08a00,inset 3px 3px 0 #fff2a0,0 0 0 2px #6a4400;flex:none;margin-right:6px}
#yact .pan{background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22);padding:5px 8px}
#yact .ya-hp .r1{display:flex;justify-content:space-between;gap:4px;margin-bottom:3px;white-space:nowrap}
#yact .bar{height:8px;background:#4a4a5a;border:2px solid var(--ink);position:relative;overflow:hidden}
#yact .ya-hpf{position:absolute;left:0;top:0;bottom:0;background:#58d050;transition:width .2s}
#yact .ya-hpf.y{background:#f8c030}#yact .ya-hpf.r{background:#f05038}
#yact .ya-tm.low{color:#ff7a6a;animation:yaTm .5s steps(2) infinite}
@keyframes yaTm{50%{opacity:.5}}
#yact .b3{font-family:var(--px);font-weight:700;border:3px solid var(--ink);color:var(--ink);background:#fff;box-shadow:0 4px 0 var(--ink);cursor:pointer;transition:transform .06s,box-shadow .06s}
#yact .b3:active,#yact .b3.pr{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
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
#yact .ya-pad{position:absolute;right:10px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:4;display:none;flex-direction:column;align-items:center;gap:10px}   /* 경완 2026-11-13: 회피 버튼은 기술 버튼 위 */
#yact .mvb{position:relative;height:54px;padding:4px 4px 3px;border:3px solid var(--ink);background:var(--tc);color:#fff;font-family:var(--px);text-align:left;box-shadow:0 4px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;cursor:pointer}
#yact .mvb .tg{font-size:9px;line-height:1;align-self:flex-start;padding:1px 3px;background:rgba(0,0,0,.28)}
#yact .mvb b{font-size:12px;line-height:1.1;text-shadow:0 1px 0 var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#yact .mvb small{font-size:9px;opacity:.9;text-shadow:0 1px 0 var(--ink)}
#yact .mvb.pr,#yact .ya-dg.pr{animation:yaPr .16s}
@keyframes yaPr{40%{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}}
#yact .mvb .cdo{position:absolute;inset:0;pointer-events:none;background:conic-gradient(rgba(20,20,34,.62) var(--p,0deg),transparent 0)}
#yact .mvb.cd{filter:saturate(.6)}
#yact .mvb.ch{transform:translateY(3px);box-shadow:0 1px 0 var(--ink),0 0 0 3px #fff,0 0 14px 4px var(--tc);filter:brightness(1.25)}
#yact .mvb.ch .cdo{background:conic-gradient(rgba(255,255,255,.45) var(--p,0deg),transparent 0)}
#yact .ya-dg{position:relative;width:62px;height:62px;border-radius:50%;border:3px solid var(--ink);background:#f4f0e6;color:var(--ink);font-family:var(--px);font-weight:700;font-size:12px;box-shadow:0 4px 0 var(--ink);overflow:hidden;margin-bottom:0;cursor:pointer}
#yact .ya-dg::after{content:"";position:absolute;inset:0;background:conic-gradient(rgba(20,20,34,.5) var(--p,0deg),transparent 0)}
#yact.play .ya-joy,#yact.play .ya-pad{display:flex}
#yact.play .ya-hint{display:block}
#yact:not(.play) .ya-hud{display:none}
#yact .ya-ban{position:absolute;left:0;right:0;top:34%;z-index:5;text-align:center;font-size:24px;line-height:1.2;padding:11px 0;text-shadow:0 3px 0 var(--ink),0 0 10px rgba(0,0,0,.4);pointer-events:none;opacity:0;overflow:hidden}
#yact .ya-ban::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(20,20,40,0),rgba(20,20,40,.8) 16%,rgba(20,20,40,.8) 84%,rgba(20,20,40,0))}
#yact .ya-ban span{display:inline-block}
#yact .ya-ban.on{animation:yaBan 1.3s ease-out both}
#yact .ya-ban.on span{animation:yaBanT 1.3s cubic-bezier(.2,.9,.3,1) both}
@keyframes yaBan{0%{opacity:0;clip-path:inset(50% 0)}10%{opacity:1;clip-path:inset(0)}80%{opacity:1;clip-path:inset(0)}100%{opacity:0;clip-path:inset(50% 0)}}
@keyframes yaBanT{0%{transform:translateX(-70%) skewX(-18deg)}16%{transform:translateX(4%) skewX(-10deg)}24%{transform:none}78%{transform:none}100%{transform:translateX(50%) skewX(-18deg)}}
#yact .ya-ban.boss{font-size:26px;color:#ffe27a;padding:14px 0}
#yact .ya-ban.boss::before{background:repeating-linear-gradient(-45deg,rgba(214,40,26,.9) 0 14px,rgba(34,22,24,.9) 14px 28px);background-size:200% 100%;animation:yaHaz .7s linear infinite}
#yact .ya-ban.boss.on,#yact .ya-ban.boss.on span{animation-duration:1.7s}
@keyframes yaHaz{to{background-position:-39.6px 0}}
#yact .ya-ban.win{font-size:32px;color:#ffe27a;padding:16px 0}
#yact .ya-ban.win::before{background:linear-gradient(90deg,rgba(255,200,48,0),rgba(190,120,0,.82) 16%,rgba(190,120,0,.82) 84%,rgba(255,200,48,0))}
#yact .ya-ban.win.on,#yact .ya-ban.win.on span{animation-duration:1.6s}
#yact .ya-cb{font-size:13px;line-height:1.1;color:#fff;text-shadow:0 2px 0 var(--ink);padding-left:4px;opacity:0;transition:opacity .35s;white-space:nowrap}
#yact .ya-cb.on{opacity:1;transition:none}
#yact .ya-cb b{display:inline-block;font-size:28px;color:#ffe27a;margin-right:4px;transform-origin:0 80%}
#yact .ya-cb.up b{animation:yaCb .24s cubic-bezier(.2,1.7,.4,1)}
@keyframes yaCb{0%{transform:scale(1.8) rotate(-6deg);color:#fff}}
#yact .ya-cb small{display:block;font-size:10px;color:#bff59a;margin-top:2px}
#yact .ya-cb i{display:block;height:4px;width:76px;background:rgba(20,20,34,.55);border:1px solid var(--ink);margin-top:3px}
#yact .ya-cb u{display:block;height:100%;background:#ffe27a}
#yact .ya-hp.hit{animation:yaHit .32s}
@keyframes yaHit{0%{transform:translateX(-5px);background:rgba(220,50,40,.85)}25%{transform:translateX(5px)}50%{transform:translateX(-3px)}75%{transform:translateX(2px)}}
#yact .ya-hp.low .ya-hpf{animation:yaTm .4s steps(2) infinite}
#yact .mvb.rdy{animation:yaRdy .32s ease-out}
@keyframes yaRdy{0%{filter:brightness(2.2);transform:scale(1.08)}}
#yact .mvb.no{animation:yaNo .2s}
@keyframes yaNo{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
#yact .ya-dg.cd{color:#8a8794}
#yact .ya-ov{position:absolute;inset:0;z-index:8;background:rgba(14,14,28,.45)}
#yact .ya-pk{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#yact .pkc{font-family:var(--px);border:3px solid var(--ink);background:#fff;padding:6px 2px 5px;display:flex;flex-direction:column;align-items:center;gap:2px;box-shadow:0 3px 0 var(--ink);cursor:pointer;color:var(--ink);min-width:0}
#yact .pkc:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
#yact .pkc img{width:40px;height:40px;image-rendering:pixelated;object-fit:contain}
#yact .pkc b{font-size:12px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#yact .pkc small{font-size:10px;color:#6a6a7a}
#yact .pkc.on{background:#fff3c4;box-shadow:0 3px 0 var(--ink),inset 0 0 0 2px #f0b020}
#yact .ya-pmv span{font-size:10px;padding:2px 5px;background:var(--tc);color:#fff;border:2px solid var(--ink);text-shadow:0 1px 0 rgba(0,0,0,.4)}
#yact .ya-stt{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
#yact .stc{font-family:var(--px);font-size:11px;padding:7px 0;border:2px solid var(--ink);background:#fff;color:var(--ink);box-shadow:0 2px 0 var(--ink);cursor:pointer}
#yact .stc:active{transform:translateY(2px);box-shadow:none}
#yact .stc.on{background:#b48cf0;color:#fff;text-shadow:0 1px 0 var(--ink)}
#yact .bigb{display:block;width:100%;margin-top:14px;padding:11px 0;font-size:15px;background:#ffd84a}
#yact .bigb.sec{background:#e9e4d8;font-size:13px;padding:9px 0}
#yact .ya-res.pop{animation:yaPop .32s cubic-bezier(.2,1.5,.4,1)}
@keyframes yaPop{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes yaXb{0%{width:0}}
@keyframes yaRow{0%{opacity:0;transform:translateX(-16px) scale(.95)}}
#yact .ya-rl .egq{font-style:normal;font-size:9px;padding:1px 4px;margin-right:5px;border:1px solid var(--ink);color:#fff;background:var(--tc);text-shadow:0 1px 0 rgba(0,0,0,.5)}
#yact .ya-rl .lvup{font-style:normal;color:#e05a20;font-weight:700}
#yact .ya-rl b.ev{color:#8a4ad8}#yact .ya-rl b.fr{color:#e0507a}#yact .ya-rl b.eg{color:#c08a00}
/* 경완 2026-11-13: 화면 배치·창 다듬기 — 왼쪽 = 내 포켓몬(HP·쓰러뜨린 수·골드·콤보), 가운데 = 웨이브·남은 시간, 오른쪽 = 그만하기·이번 판 보상 */
#yact .ya-tl{left:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:5px;align-items:flex-start;width:134px}
#yact .ya-hp{width:100%;font-size:11px;padding:5px 7px 6px}
#yact .ya-hp .r2{display:flex;align-items:center;gap:6px}
#yact .ya-hp .bar{height:10px;flex:1}
#yact .ya-hpn{font-size:10px;white-space:nowrap}
#yact .ya-me{min-width:0;overflow:hidden;text-overflow:ellipsis}
#yact .ya-sc{display:flex;gap:5px;width:100%}
#yact .ya-sc .pan{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:3px 4px;font-size:11px;white-space:nowrap;min-width:0}
#yact .ya-kc small{font-size:9px;line-height:13px;padding:0 3px;background:#fff;color:var(--ink);font-weight:700}
#yact .ya-m{font-size:13px;color:#fff;text-shadow:0 1px 0 var(--ink)}
#yact .mg-hg{color:#ffe27a;text-shadow:0 1px 0 var(--ink)}
#yact .mg-hg b{font-size:13px}
#yact .mg-hg .coin{width:12px;height:12px;margin-right:4px}
#yact .ya-tc{left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
#yact .ya-ph{font-size:10px;line-height:15px;padding:0 6px;color:var(--ink);background:#ffe27a;border:2px solid var(--ink);white-space:nowrap;position:relative;z-index:1;margin-bottom:-3px}
#yact .ya-tm{font-size:26px;line-height:1;min-width:64px;padding:8px 0 5px;text-align:center;text-shadow:0 2px 0 var(--ink);background:rgba(28,28,46,.66);border:3px solid var(--ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),3px 3px 0 rgba(0,0,0,.22)}
#yact .ya-tr{right:10px;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;align-items:stretch;gap:5px;width:126px}
#yact .ya-quit{font-size:11px;padding:4px 8px;background:#e9e4d8;align-self:flex-end;pointer-events:auto}
#yact .ya-rw{display:flex;flex-direction:column;gap:4px}
#yact .ya-rw .ch{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 7px;white-space:nowrap}
#yact .ya-rw .ch b{font-size:13px}
#yact .ya-mvs{display:grid;grid-template-columns:repeat(2,88px);gap:7px}
#yact .ya-mvs .mvb{height:58px}
#yact .ya-pad .ya-dg{width:66px;height:66px;font-size:13px}
#yact .ya-win{position:absolute;z-index:9;left:50%;top:50%;transform:translate(-50%,-50%);width:min(344px,calc(100% - 28px));max-height:calc(100% - 24px);overflow:auto;background:#fbf8f0;color:var(--ink);border:3px solid var(--ink);box-shadow:0 0 0 3px #fff,0 0 0 6px var(--ink),6px 8px 0 6px rgba(0,0,0,.25);padding:0}
#yact .ya-hd{position:sticky;top:0;z-index:2;flex:none;min-height:42px;background:var(--ink);color:#fff;padding:10px 14px 9px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:3px solid #f0b020}
#yact .ya-tt{display:block;margin:0;font-size:17px;line-height:1.2;text-shadow:0 2px 0 rgba(0,0,0,.4)}
#yact .ya-tg{font-size:9.5px;line-height:1.3;padding:2px 6px;background:#bff59a;color:#1f5a2a;border:2px solid #0e0e18;white-space:nowrap}
#yact .ya-hd.rs-hd{justify-content:center;text-align:center}
#yact .ya-hd.win{background:#f0b020;border-bottom-color:var(--ink)}
#yact .ya-hd.win .ya-tt{color:var(--ink);text-shadow:0 2px 0 #ffe9a0}
#yact .ya-bd{padding:12px 14px 14px}
#yact .ya-win .sub{margin:0 0 2px;font-size:11px;text-align:center;color:#5a5a6a;line-height:1.6}
#yact .ya-win .sub b{color:var(--ink)}
#yact .ya-win h3{font-size:11.5px;margin:12px 0 6px;color:var(--ink);display:flex;align-items:center;gap:6px}
#yact .ya-win h3::before{content:"";width:4px;height:12px;background:#f0b020;flex:none}
#yact .ya-win h3 small{font-size:10px;color:#7a7a8a;font-weight:400}
#yact .ya-op{font-size:10px;text-align:center;color:#6a6a7a;margin:10px 0 0;line-height:1.4}
#yact .ya-pmv{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center;padding:6px;background:#f0ebde;border:2px solid #d8d0bc}
#yact .ya-foe{font-size:11px;margin:6px 0 0;padding:6px 8px;text-align:center;color:#4a4a5a;background:#f0ebde;border:2px solid #d8d0bc}
#yact .how{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;font-size:10.5px;line-height:1.5;color:#4a4a5a;margin:12px 0 0;padding-top:11px;border-top:2px dashed #d8d0bc;align-items:start}
#yact .how dt{font-weight:700;font-size:10px;line-height:1.5;color:#fff;background:var(--ink);padding:0 6px;text-align:center}
#yact .how dd{margin:0}
#yact .how b{color:var(--ink)}
#yact .rs-me{display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 10px;background:#fff;border:2px solid var(--ink);box-shadow:0 2px 0 rgba(32,32,44,.25)}
#yact .rs-im{width:44px;height:44px;image-rendering:pixelated;object-fit:contain;flex:none}
#yact .rs-mi{flex:1;min-width:0}
#yact .rs-mi .r1{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:13px;white-space:nowrap}
#yact .rs-mi .r1 b{min-width:0;overflow:hidden;text-overflow:ellipsis}
#yact .rs-lv{font-size:11px;color:#5a5a6a}
#yact .rs-lv .lvup{font-style:normal;color:#e05a20;font-weight:700}
#yact .rs-mi .xb{display:block;height:8px;background:#dcd8ce;border:2px solid var(--ink);margin:5px 0 3px;position:relative}
#yact .rs-mi .xb i{position:absolute;left:0;top:0;bottom:0;background:#48a8f0;width:var(--w);animation:yaXb .7s .5s ease-out both}
#yact .rs-xp{display:block;font-size:9.5px;color:#6a6a7a;text-align:right}
#yact .ya-rl{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}
#yact .ya-rl li{animation:yaRow .3s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i,0)*.15s + .25s);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1px;padding:7px 6px 6px;background:#fff;border:2px solid var(--ink);box-shadow:0 2px 0 rgba(32,32,44,.25);min-width:0}
#yact .ya-rl li.w{grid-column:1/-1}
#yact .ya-rl .k{font-size:10.5px;color:#5a5a6a;display:flex;align-items:center}
#yact .ya-rl b{font-size:20px;line-height:1.15}
#yact .ya-rl em{font-style:normal;font-size:9.5px;line-height:1.35;color:#6a6a7a}
#yact .ya-rl li.ya-gold{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"k b" "e e";text-align:left;background:#fff6d0;padding:7px 10px}
#yact .ya-rl li.ya-gold .k{grid-area:k;font-size:12px;color:var(--ink)}
#yact .ya-rl li.ya-gold b{grid-area:b;text-align:right;color:#a87800}
#yact .ya-rl li.ya-gold em{grid-area:e}
#yact .rs-row{display:flex;gap:8px}
#yact .ya-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;z-index:10;background:#1c1c2e}
`;
const HTML = `<canvas></canvas>
<div class="ya-hud ya-tl"><div class="pan ya-hp"><div class="r1"><span class="ya-me"></span></div><div class="r2"><div class="bar"><i class="ya-hpf"></i></div><span class="ya-hpn"></span></div></div>
  <div class="ya-sc"><span class="pan ya-kc"><small>KO</small><b class="ya-m">0마리</b></span><span class="pan mg-hg"><i class="coin" aria-hidden="true"></i><b>0</b>G</span></div>
  <div class="ya-cb"><b>0</b>콤보<small></small><i><u></u></i></div></div>
<div class="ya-hud ya-tc"><b class="ya-ph">웨이브 1/3</b><b class="ya-tm">90</b></div>
<div class="ya-hud ya-tr"><button class="b3 ya-quit">그만하기</button>
  <div class="ya-rw"><div class="pan ch ex"><span>경험치</span><b class="ya-rwe">+0</b></div><div class="pan ch ev"><span><span class="ya-rwk"></span> 노력치</span><b class="ya-rwv">0/4</b></div>
  <div class="pan ya-eg"><div class="r1"><b class="ya-egn"></b><span class="ya-egt"></span></div><div class="bar"><i class="ya-egf0"></i><i class="ya-egf"></i></div><div class="r2"><span class="ya-egs"></span><span class="ya-egp"></span></div></div></div></div>
<div class="ya-joy"></div><div class="ya-joyb"><i class="ya-joyk"></i></div>
<div class="ya-hint">왼쪽 아래를 끌어서 이동</div>
<div class="ya-pad"><button class="ya-dg">회피</button><div class="ya-mvs"></div></div>
<div class="ya-ban"></div>
<div class="ya-ov"></div>
<div class="ya-win ya-start"><div class="ya-hd"><b class="ya-tt">직접 훈련</b><span class="ya-tg">운영자 시험</span></div><div class="ya-bd">
  <p class="sub">포켓몬을 직접 움직여 상대를 쓰러뜨려요.<br>쓰러진 상대가 떨어뜨린 <b>골드</b>와 <b>번뜩임 조각</b>은 다가가서 주워요.</p>
  <h3>훈련할 포켓몬</h3><div class="ya-pk"></div><div class="ya-pmv"></div>
  <h3>노력치 훈련 <small>훈련장에서 고른 능력치</small></h3><div class="ya-stt"></div><p class="ya-foe"></p>
  <dl class="how"><dt>조작</dt><dd>왼쪽 아래를 끌어 이동 · 기술은 가까운 상대를 자동으로 겨누고, <b>꾹 누르는 동안</b> 쭉 이어져요</dd>
    <dt>회피</dt><dd>상대 머리 위에 <b style="color:#e0402a">!</b> 가 뜨면 회피 · 딱 맞춰 피하면 <b style="color:#2a7ad0">저스트 회피</b> (3초 동안 급소 확정)</dd>
    <dt>콤보</dt><dd>이어 맞힐수록 기술이 빨리 다시 차요</dd>
    <dt>PC</dt><dd>방향키 이동 · Q W E R 기술 · 스페이스 회피</dd></dl>
  <div class="rs-row"><button class="b3 bigb sec ya-x">닫기</button><button class="b3 bigb ya-go">훈련 시작</button></div>
  <p class="ya-op">보상은 보여 주기만 하고 내 포켓몬·저장은 그대로예요.</p></div></div>
<div class="ya-win ya-res" hidden><div class="ya-hd rs-hd"><b class="ya-tt rs-h">훈련 완료!</b></div><div class="ya-bd"><p class="sub rs-sub"></p>
  <div class="rs-me"><img class="rs-im" alt=""><div class="rs-mi"><div class="r1"><b class="rs-nm"></b><span class="rs-lv"></span></div><i class="xb"><i></i></i><small class="rs-xp"></small></div></div>
  <ul class="ya-rl"></ul>
  <div class="rs-row"><button class="b3 bigb sec ya-back">훈련장으로</button><button class="b3 bigb ya-again">한 판 더</button></div>
  <p class="ya-op">운영자 시험이라 실제로는 아무것도 받지 않아요.</p></div></div>
<div class="ya-load">훈련장 준비 중…</div>`;

// ---------- 시작 ----------
async function start({ host, mons }) {
  if (R) return; if (!mons?.length) { GA.toast?.('훈련할 포켓몬이 없어요'); return; }
  if (!document.getElementById('yactCss')) { const s = document.createElement('style'); s.id = 'yactCss'; s.textContent = CSS; document.head.append(s); }
  const el = document.createElement('div'); el.id = 'yact'; el.innerHTML = HTML; (host || document.body).append(el);
  const q = s => el.querySelector(s);
  let done; const closed = new Promise(ok => { done = ok; });
  R = { el, q, host: host || document.body, mons, pick: 0, stat: 5, G: null, T: 0, RT: 0, last: 0, run: false, raf: 0, FX: [], POPS: [], PT: [], GH: [], Q: [], SPR: {}, kit: null, BG: null, Y: {}, A: {},
    HS: 0, SLOW: 0, SLOWK: 1, TR: 0, KX: 0, KY: 0, ZM: 0, FLASH: 0, FLC: '255,255,230', VIG: 0, hapT: -1, hapN: -1, HELD: {}, BUF: null,
    JOY: { id: null, dx: 0, dy: 0, ox: 0, oy: 0 }, KEY: {}, done, off: [] };
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
function close() { if (!R) return; humOff(); const r = R; R = null; cancelAnimationFrame(r.raf); r.off.forEach(f => f()); r.el.remove(); r.done(); }

// ---------- 그림 ----------
function spr(sp, sex) { const k = sp + ':' + (sex || ''); if (R.SPR[k]) return Promise.resolve(R.SPR[k]);
  return (GA.pmdMx || GA.pmd)(sp, sex).then(D => new Promise(ok => { const im = new Image(); im.onload = im.onerror = () => ok(R.SPR[k] = { D, im }); im.src = D.P ? D.P.i : D.img; })).catch(() => (R.SPR[k] = { D: {}, im: null })); }
const sprOf = e => R.SPR[e.sp + ':' + (e.sex || '')] || R.SPR[e.sp + ':'];
// 맞는 순간 하얗게 번쩍이는 그림 (캔버스 filter 는 아이폰에서 안 먹어서, 그림을 흰색으로 칠한 사본을 한 번 만들어 둔다)
function whiteOf(S2) { if (S2.wh !== undefined) return S2.wh; S2.wh = null;
  try { const im = S2.im; if (im?.width) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); S2.wh = c; } } catch (e) {}
  return S2.wh; }
async function resize() {
  const r = R, W = r.host.clientWidth || innerWidth, H = r.host.clientHeight || innerHeight, DPR = Math.min(2, window.devicePixelRatio || 1), cv = r.q('canvas');
  Object.assign(r, { W, H, DPR }); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; r.g = cv.getContext('2d');
  Object.assign(r.Y, { pond: { x0: 16, y0: H * .74, x1: W * .54, y1: H - 16 } }); Object.assign(r.A, { y0: 132, y1: H - 20, x0: 16, x1: W - 16 });
  try { const s = await window.GymManage?.yardShot?.(Math.ceil(W / 32), Math.ceil(H / 32), 1); if (s && R === r) { const im = new Image(); await new Promise(ok => { im.onload = im.onerror = ok; im.src = s.url; }); r.BG = im; } } catch (e) { console.error(e); }
}
const inPond = (x, y, m = 10) => { const P = R.Y.pond; return x > P.x0 - m && x < P.x1 + m && y > P.y0 - m && y < P.y1 + m; };
function keepIn(e) { const A = R.A; e.x = Math.max(A.x0, Math.min(A.x1, e.x)); e.y = Math.max(A.y0, Math.min(A.y1, e.y));
  if (inPond(e.x, e.y)) { const P = R.Y.pond, dx = [e.x - (P.x0 - 10), (P.x1 + 10) - e.x], dy = e.y - (P.y0 - 10), m = Math.min(dx[0], dx[1], dy); if (m === dy) e.y = P.y0 - 10; else if (m === dx[0]) e.x = P.x0 - 10; else e.x = P.x1 + 10; } }
const hudPt = sel => { const el = R.q(sel), b = R.el.getBoundingClientRect(), r = el?.getBoundingClientRect(); return r && r.width ? { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 } : { x: 40, y: 60 }; };

// ---------- 소리·진동 (게임 효과음 길: 볼륨·음소거 설정 그대로, 진동 = 게임 공통 haptic) ----------
const snd = (n, gv = .05, at = 0) => { try { R?.kit?.snd(n, at, gv); } catch (e) {} };
// 한꺼번에 여러 번 맞히면 진동이 뭉개지니, 짧은 사이엔 더 센 것만 다시 울린다
function buzz(n) { const r = R; if (!r) return; if (r.RT - r.hapT < .06 && n <= r.hapN) return; r.hapT = r.RT; r.hapN = n; try { GA.haptic?.(n); } catch (e) {} }
const rumble = (n, gap = 70, lv = 2) => { for (let i = 0; i < n; i++) setTimeout(() => { if (R) { R.hapN = -1; buzz(lv); } }, i * gap); };

// ---------- 손맛: 멈칫(히트스톱)·느린 화면·흔들림·밀림·확대 ----------
// 멈칫은 1초에 합쳐 0.3초까지만 (연달아 맞혀도 화면이 굳지 않게)
const stop = s => { const a = Math.min(s, R.HSB ?? .3) - R.HS; if (a <= 0) return; R.HS += a; R.HSB = (R.HSB ?? .3) - a; };
const slow = (s, k) => { if (s >= R.SLOW) { R.SLOW = s; R.SLOWK = k; } };
const shake = v => { R.TR = Math.min(1, R.TR + v); };
const kick = (dx, dy, v) => { R.KX += dx * v; R.KY += dy * v; };
const zoom = v => { R.ZM = Math.max(R.ZM, v); };
const flash = (v, c = '255,255,230') => { if (v >= R.FLASH) { R.FLASH = v; R.FLC = c; } };
const after = (d, fn) => R.Q.push({ t: R.T + d, fn, G: R.G });
const squash = (e, v) => { e.sq = v; e.sqv = 0; };
function spring(e, dt) { if (!e.sq && !e.sqv) return; e.sqv = (e.sqv || 0) + (-520 * e.sq - 20 * (e.sqv || 0)) * dt; e.sq += e.sqv * dt; if (Math.abs(e.sq) < .004 && Math.abs(e.sqv) < .05) e.sq = e.sqv = 0; }

// ---------- 능력치·데미지 (체육관 statsOf = 본가 공식) ----------
// 무게 등급(위력 ≤50 가벼움, ≤80 보통, ≤110 묵직, 그 위 강타)이 멈칫·넉백·흔들림·숫자 크기를 한꺼번에 정한다
const WT = { stop: [.05, .075, .11, .15], kb: [150, 230, 320, 420], shake: [.1, .16, .26, .36], num: [16, 19, 23, 27], wind: [0, .07, .13, .2] };
const wOf = pw => pw <= 50 ? 0 : pw <= 80 ? 1 : pw <= 110 ? 2 : 3;
function dmg(at, df, t, c, pw, wpw = pw) {
  const A2 = c === 1 ? at.st[1] : at.st[3], D2 = c === 1 ? df.st[2] : df.st[4];
  const e = eff(t, tysOf(df.sp)), stab = tysOf(at.sp).includes(t) ? 1.5 : 1, bf = at.buff > 0 ? 1.3 : 1, crit = !!at.mine && e > 0 && (at.crit > 0 || Math.random() < 1 / 16);
  const base = Math.floor(Math.floor(Math.floor(2 * at.lv / 5 + 2) * pw * A2 / D2) / 50) + 2;
  return { n: Math.max(1, Math.floor(base * stab * e * bf * (crit ? 1.5 : 1) * (.85 + Math.random() * .15))), e, crit, w: wOf(wpw) };
}

// ---------- 포켓몬 그리기 (필드 PMD 그림: 칸 = a[0..6], 기준점 a[4]·a[5]+fy) ----------
function frameOf(e, T) {
  const S2 = sprOf(e); if (!S2?.im) return null; const P = S2.D.P, k = e.k || 1;
  if (!P) { const h = 52 * k; return { S2, plain: true, h, w: h * (S2.im.width / S2.im.height || 1), flip: e.face > 0, fw: 30 * k, fx: 0 }; }
  let an = P.a[e.anim] ? e.anim : 'Idle'; if (an === 'Walk' && e.up && P.a.WalkUp) an = 'WalkUp'; const a = P.a[an] || P.a.Idle || Object.values(P.a)[0]; if (!a) return null;
  const durs = a[6], tot = durs.reduce((x, y) => x + y, 0); let t = (T - e.at) * 60; if (e.once) t = Math.min(t, tot - 1); else t %= tot;
  let f = 0; for (let acc = 0; f < durs.length; f++) { acc += durs[f]; if (t < acc) break; } f = Math.min(f, durs.length - 1);
  const s = (S2.D.s || 2) * k;
  return { S2, P, a, f, s, flip: e.face > 0 && an !== 'WalkUp', h: (a[5] + (P.fy || 0)) * s, fw: Math.max(10, (P.fw || 14) * s * 1.05), fx: (P.fx || 0) * s };
}
// 한 칸 찍기. o: a 투명도, wh 흰 번쩍(0~1), sx·sy 찌그러짐, rot 돌기, hue 이로치
function blit(F, x, y, o = {}) {
  const g = R.g, { S2, flip } = F, sx = o.sx || 1, sy = o.sy || 1;
  const put = im => { if (F.plain) g.drawImage(im, -F.w / 2, -F.h, F.w, F.h); else { const { P, a, f, s } = F; g.drawImage(im, f * (a[1] + (P.G || 0)), a[0], a[1], a[2], -a[4] * s, (-a[5] - (P.fy || 0)) * s, a[1] * s, a[2] * s); } };
  g.save(); g.translate(Math.round(x), Math.round(y));
  if (o.rot) { g.translate(0, -F.h * .45); g.rotate(o.rot); g.translate(0, F.h * .45); }
  g.scale((flip ? -1 : 1) * sx, sy);
  if (o.hue) g.filter = `hue-rotate(${o.hue}deg)`;
  g.globalAlpha = o.a ?? 1; put(S2.im);
  if (o.wh > 0) { const w = whiteOf(S2); if (w) { g.filter = 'none'; g.globalAlpha = (o.a ?? 1) * Math.min(1, o.wh); put(w); } }
  g.restore();
}
function drawMon(e) {
  const g = R.g, T = R.T, F = frameOf(e, T); if (!F) return;
  const lift = (GA.lift?.(e.sp) || 0) * (e.mine ? 1 : .6), z = e.z || 0, dead = e.hp <= 0 && e.dead != null && !e.mine;
  // 그림자: 높이 뜰수록 작고 옅게
  { const k = 1 / (1 + z / 90); g.fillStyle = `rgba(20,40,10,${(lift > 8 ? .15 : .25) * (.5 + k * .5)})`; g.beginPath(); g.ellipse(e.x + F.fx * (F.flip ? -1 : 1), e.y, F.fw / 2 * k, Math.max(3, F.fw * .15) * k, 0, 0, 7); g.fill(); }
  // 발밑 기운: 변화 기술(초록), 저스트 회피 뒤 급소 확정(금빛)
  if (e.mine && e.hp > 0 && (e.buff > 0 || e.crit > 0)) { const c = e.crit > 0 ? '255,216,74' : '160,240,130', p = (R.RT * 1.6) % 1; g.strokeStyle = `rgba(${c},${.75 * (1 - p)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y, 12 + p * 16, (12 + p * 16) * .4, 0, 0, 7); g.stroke(); g.strokeStyle = `rgba(${c},.55)`; g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y, 15, 6, 0, 0, 7); g.stroke(); }
  let ox = 0, oy = 0, wh = e.flash > 0 ? Math.min(1, e.flash * 9) : 0, al = 1;
  if (e.warn > 0 && !e.shoot) { const p = 1 - e.warn / (e.warn0 || .5); ox = -Math.cos(e.wa || 0) * 7 * p + Math.sin(R.RT * 70) * 1.2 * p; oy = -Math.sin(e.wa || 0) * 5 * p; if (e.warn < .1) wh = Math.max(wh, .8); }
  if (e.enter > 0 && !e.drop) al = Math.max(.15, 1 - e.enter / .35);
  if (e.inv > 0 && e.mine && e.hp > 0 && !e.roll && Math.floor(R.RT * 20) % 2) al = .45;
  if (e.fade != null) al = Math.max(0, e.fade);
  const sq = Math.max(-.45, Math.min(.45, e.sq || 0));
  blit(F, e.x + ox, e.y - lift - z + oy, { a: al, wh, sx: 1 + sq, sy: 1 - sq, rot: dead ? e.rot : 0, hue: e.mine && e.shiny ? (GA.shinyHue?.(e.sp) || 0) : 0 });
  if (e.warn > 0) warnMark(e, F.h + lift);
}
function warnMark(e, h) { const g = R.g, p = 1 - e.warn / (e.warn0 || .5), s = 18 + Math.max(0, 1 - p * 5) * 14; g.font = `bold ${Math.round(s)}px Galmuri11`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#20202c'; g.strokeText('!', e.x, e.y - h - 8); g.fillStyle = e.warn < .15 ? '#fff' : '#ff4a3a'; g.fillText('!', e.x, e.y - h - 8); }
const setAnim = (e, a, once = false) => { if (e.anim === a && !once) return; e.anim = a; e.at = R.T; e.once = once; };
const hasAnim = (e, a) => !!sprOf(e)?.D?.P?.a?.[a];
const anyAnim = (e, ...L) => L.find(a => hasAnim(e, a)) || L[L.length - 1];
// 잔상: 지금 칸 그대로 남겼다가 옅어짐 (회피·돌진)
function ghost(e, d = .26) { const F = frameOf(e, R.T); if (F) R.GH.push({ F, x: e.x, y: e.y - (GA.lift?.(e.sp) || 0) - (e.z || 0), t0: R.T, d }); }

// ---------- 효과 (필드 pfxDraw 그대로) ----------
const PX = () => R.kit?.D;
const pfxDraw = (k, fr, x, y, f, o) => { try { R.kit.draw(R.g, k, fr, x, y, f, o || {}); } catch (e) {} };
const pLen = (k, ft) => (PX()?.s[k]?.[2] || 1) * ft / 60;
function fxOnce(k, ft, delay, x, y, f, o) { if (!PX()?.s[k]) return 0; const d = Math.max(.1, pLen(k, ft)); R.FX.push({ t0: R.T + delay, d, draw: t => pfxDraw(k, t * 60 / ft, x, y, f, o) }); return d; }
const fxAdd = (delay, d, draw) => R.FX.push({ t0: R.T + delay, d, draw });
// 숫자·글자: 튀어나왔다 가라앉고, 맞은 방향으로 조금 흘러감
const pop = (x, y, txt, col = '#fff', big = false, vx = 0, vy = 0) => { const p = { x: x + (typeof txt === 'number' ? (Math.random() - .5) * 14 : 0), y, txt, col, t0: R.RT, big, vx, vy }; R.POPS.push(p); return p; };
// 원본 효과가 없는 기술: 타입 색 동그라미·별
function burst(x, y, col, r0 = 8, r1 = 34) { fxAdd(0, .3, t => { const g = R.g, p = t / .3; g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = 4 * (1 - p) + 1; g.beginPath(); g.arc(x, y, r0 + (r1 - r0) * p, 0, 7); g.stroke();
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3, r = r0 + (r1 - r0) * p * 1.2; g.fillStyle = '#fff'; g.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r * .8 - 2, 4, 4); } g.globalAlpha = 1; }); }
// 바닥에 퍼지는 고리 (충격파)
function ring(x, y, col, r0, r1, d = .3, w = 4, flat = .5, delay = 0) { fxAdd(delay, d, t => { const g = R.g, p = t / d, e = 1 - (1 - p) * (1 - p), r = r0 + (r1 - r0) * e; g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = w * (1 - p) + 1; g.beginPath(); g.ellipse(x, y, r, r * flat, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }); }
// 베는 궤적: 초승달이 휙 그어졌다 사라짐
function slash(x, y, ang, col, r = 36) { fxAdd(0, .17, t => { const g = R.g, p = t / .17, a1 = -1.15 + 2.3 * Math.min(1, p * 3.2); g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = 1 - p * p; g.lineCap = 'round';
  g.strokeStyle = col; g.lineWidth = 11 * (1 - p) + 1; g.beginPath(); g.arc(-r * .35, 0, r, -1.15, a1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 5 * (1 - p) + 1; g.beginPath(); g.arc(-r * .35, 0, r, -1.15 + p * .6, a1); g.stroke(); g.restore(); }); }
// 알갱이: sq 네모, line 줄기(속도 방향), star 별, coin 동전, xp 경험치 구슬. home 이 있으면 잠깐 튀었다가 그 자리로 빨려 들어감
function part(o) { R.PT.push(Object.assign({ kind: 'sq', t0: R.T, life: .4, vx: 0, vy: 0, ay: 0, dr: 0, sz: 3, col: '#fff' }, o)); }
function sparks(x, y, dx, dy, col, n = 6, sp = 280) { const a0 = Math.atan2(dy, dx); for (let i = 0; i < n; i++) { const a = a0 + (Math.random() - .5) * 1.7, v = sp * (.45 + Math.random() * .85); part({ kind: 'line', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8, dr: 6, life: .14 + Math.random() * .14, col: i % 2 ? col : '#fff', sz: 2 + (i % 2) }); } }
function dust(x, y, n = 3, sp = 46, col = '#e9dcc0') { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = sp * (.4 + Math.random() * .8); part({ x: x + Math.cos(a) * 4, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .35 - 14, dr: 4, life: .3 + Math.random() * .2, col, sz: 3 + Math.floor(Math.random() * 3), grow: 1 }); } }
function stars(x, y, n, col = '#ffe27a', sp = 190) { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + Math.random() * .5, v = sp * (.6 + Math.random() * .6); part({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 60, ay: 420, dr: 2.5, life: .45 + Math.random() * .25, col, sz: 2 }); } }
function fly(kind, x, y, home, on, col) { const a = Math.random() * 6.28, v = 90 + Math.random() * 110; part({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 50, dr: 5, life: 4, home, hold: .22 + Math.random() * .16, on, col: col || '#ffc830', sz: 3 }); }

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
  // 번뜩임으로 깨닫는 중인 기술은 아직 모르는 기술이라 이름은 안 쓰고 타입만 (게임의 ??? 칸과 같게)
  return { P, lv, st: B.statsOf(P.sp, lv, P.iv || [], m.nat, m.ev || []), mv: moveList(P), eg: er ? { i: eg, t: er.x[2], p: (m.egP || [])[eg] | 0 } : null, xp: m.xp | 0, fr: P.fr | 0, evRoom: Math.max(0, Math.min(B.EV_ONE - ((B.evArr(m)[R.stat]) | 0), B.EV_MAX - B.evSumOf(m) - (m.evp | 0))) };
}
const nmOf = P => P.nm || nmSp(P.sp);
function newGame() {
  const o = R.mons[R.pick], M = mineOf(o), P = o.P, W = R.W, H = R.H;
  const me = { sp: P.sp, sex: P.sex, shiny: !!P.shiny, lv: M.lv, st: M.st, mine: true, x: W / 2, y: H * .55, face: -1, anim: 'Idle', at: 0, inv: 0, cd: {}, cdMax: {}, dcd: 0, flash: 0, buff: 0, crit: 0, roll: 0, kx: 0, ky: 0, sq: 0, sqv: 0, z: 0, busy: 0, stepT: 0 };
  me.mhp = me.hp = Math.round(me.st[0] * 2.8);
  Object.assign(R, { HS: 0, SLOW: 0, TR: 0, KX: 0, KY: 0, ZM: 0, FLASH: 0, VIG: 0, BUF: null, HELD: {} }); R.Q.length = 0; R.PT.length = 0; R.GH.length = 0; R.SH = null;
  R.G = { o, M, me, stat: R.stat, pool: R.pool || foePool(R.stat), mobs: [], shots: [], drops: [], wave: 0, ko: 0, gold: 0, goldShown: 0, exp: 0, ev: 0, evRaw: 0, shard: 0, fainted: false, time: TIME, start: R.T, over: false, egg0: M.eg?.p ?? 0, egg: M.eg?.p ?? 0, eggShown: M.eg?.p ?? 0,
    combo: 0, comboT: 0, best: 0, just: 0, pend: 0, clearT: 0, sec: TIME };
  R.G.pool.forEach(sp => spr(sp)); R.pool = null; M.mv.forEach(v => { me.cd[v.name] = 0; });
  buildButtons(); hud(); cbUi(); nextWave();
}
function spawn(sp, boss) {
  const G = R.G, A = R.A, W = R.W, H = R.H, lv = Math.max(2, boss ? G.M.lv + 2 : G.M.lv - 3 - Math.floor(Math.random() * 3)), side = Math.floor(Math.random() * 3);
  let x = side === 0 ? A.x0 + 10 : side === 1 ? A.x1 - 10 : W * (.3 + Math.random() * .5), y = side === 2 ? A.y0 + 4 : A.y0 + 20 + Math.random() * (H * .45);
  if (boss) { x = W / 2; y = Math.max(A.y0 + 60, Math.min(H * .5, G.me.y - 120 < A.y0 + 60 ? G.me.y + 120 : G.me.y - 120)); }   // 대장은 한가운데로 하늘에서 떨어진다
  const e = { sp, lv, st: GB().statsOf(sp, lv, [10, 10, 10, 10, 10, 10], '', []), x, y, face: x < W / 2 ? 1 : -1, anim: 'Idle', at: R.T, boss, k: boss ? 1.3 : 1, cd: 1 + Math.random() * 1.5, warn: 0, flash: 0, z: 0, enter: boss ? .7 : .35, drop: !!boss, sq: 0, sqv: 0, kx: 0, ky: 0, atkN: 0 };
  const b = SP[sp]?.bs || [60, 60, 60, 60, 60, 60]; e.ranged = b[3] > b[1] + 10; e.spd = 34 + b[5] * .55;
  e.mhp = e.hp = e.hpLag = Math.round(e.st[0] * (boss ? 5 : 2.8));
  keepIn(e); G.mobs.push(e);
  if (boss) e.z = 420; else { fxOnce('Wood_Hammer_Smoke', 2, 0, e.x, e.y - 10, 1, { s: .8 }); squash(e, -.35); dust(e.x, e.y, 4, 60); }
}
function bossLand(o) {   // 대장 착지: 쿵 — 화면이 크게 흔들리고 먼지·충격파
  o.z = 0; o.drop = false; squash(o, .42); stop(.07); shake(.85); zoom(.05); rumble(3, 60); snd('DUN_Stomp', .09); snd('DUN_Rock_Smash', .05, .05);
  ring(o.x, o.y, '#fff', 14, 120, .45, 7); ring(o.x, o.y, '#e9dcc0', 8, 80, .35, 5, .5, .06); dust(o.x, o.y, 16, 190); stars(o.x, o.y - 10, 6, '#fff');
  const me = R.G.me, d = Math.hypot(me.x - o.x, me.y - o.y) || 1; if (d < 90 && me.hp > 0) { me.kx += (me.x - o.x) / d * 260; me.ky += (me.y - o.y) / d * 180; }   // 착지 바람에 밀려남 (피해 없음)
}
function nextWave() {
  const G = R.G; G.wave++; const pool = G.pool;
  if (G.wave === 1) for (let i = 0; i < 4; i++) spawn(pool[i % 3]);
  else if (G.wave === 2) for (let i = 0; i < 6; i++) spawn(pool[i % 3]);
  else { G.pend = 1; spawn(pool[0]); spawn(pool[1]); after(.75, () => { G.pend = 0; spawn(pool[3], true); }); snd('DUN_Leer', .07); rumble(2, 180, 1); }
  banner(G.wave === 3 ? `대장 ${nmSp(pool[3])} 등장!` : `웨이브 ${G.wave}`, G.wave === 3 ? 'boss' : ''); if (G.wave < 3) buzz(1); hud();
}

// ---------- 내 기술 ----------
const nearest = (e, list, r = 9999) => { let b = null, bd = r; for (const o of list) { if (o.hp <= 0 || o.enter > 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } return b; };
// 방식·수치는 경완이 준 팬게임 '포켓몬 레조넌스' 배틀 코드를 읽고 구조만 참고(코드는 새로 씀): 빔 최소 .35초~위력별 최대, .2초 틱, 누른 만큼 쿨타임, 쏘는 동안 이동 0.3배, 멈칫 초당 .3초 한도, 무게 등급 표, 숫자 합치기.
// 꾹 누르기 (경완 2026-11-13 '꾹 눌러서 쭈우우욱 나가는 느낌', 장애물 넘기 화염방사·파도타기처럼 누르는 동안 이어지고 연속 진동):
// 기술은 누르는 동안 이어진다 — 줄기(화염방사·물대포)는 빔이 쭉 뻗어 계속 지지고, 탄은 연사, 번개는 연달아 떨어지고, 근접은 연타, 둘레는 파동이 이어지고, 돌진은 누르는 동안 달린다.
// 짧게 누르면 첫 한 방(위력 60%)만, 끝까지 누르면 잔타(τ 마다 위력 CH.m)가 이어진다. 쿨타임은 누른 만큼(45~100%).
const CH = { stream: { tau: .2, m: .2, max: 1.5, min: .35, mv: .3 }, proj: { tau: .17, m: .25, max: 1.4, min: .05, mv: .55 }, col: { tau: .3, m: .4, max: 1.4, min: .05, mv: .5 }, melee: { tau: .17, m: .25, max: 1.3, min: .05, mv: 0 }, area: { tau: .3, m: .4, max: 1.4, min: .05, mv: .4 } };
const BEAM = 250, chMax = c => c.kind === 'stream' ? Math.max(1.1, Math.min(1.8, 1 + c.v.pw / 150)) : c.K.max;   // 줄기: 위력이 셀수록 오래 (1.1~1.8초), 끝까지 누르면 합계 한 방의 1.45배
const cdBase = v => v.c ? .6 + v.pw / 70 : 6;
function hum(dt) { if ((R.humT = (R.humT || 0) - dt) > 0) return; let nat = false; try { nat = !!GA.hapHum?.(1); } catch (e) {} R.humT = nat ? .1 : .04; if (!nat) { try { GA.haptic?.(0); } catch (e) {} } R.humOn = 1; }
function humOff() { if (!R?.humOn) return; R.humOn = 0; R.humT = 0; try { GA.hapHum?.(0); } catch (e) {} }
function useMove(i, tap) {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || G.over) return; const v = G.M.mv[i]; if (!v) return;
  const btn = R.q('.ya-mvs').children[i];
  if (me.ch?.i === i || me.dash?.hold === i) return;
  if (me.cd[v.name] > .18) { if (tap && btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); } return; }
  if (me.cd[v.name] > 0 || me.busy > 0 || me.dash || me.ch) { R.BUF = { i, t: R.RT }; return; }   // 조금 일찍 눌러도 받아 뒀다가 풀리자마자 나감
  R.BUF = null;
  const { name, t, c, k, Rr } = v, tg = nearest(me, G.mobs), col = TYPE_C[t] || '#fff';
  const ang = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : (me.face > 0 ? 0 : Math.PI), dx = Math.cos(ang), dy = Math.sin(ang);
  me.face = dx >= 0 ? 1 : -1; me.cdMax[name] = cdBase(v); const f = me.face, E = r => (Rr?.e || []).filter(e => e[0] === r);
  for (const [ro, n, dl, gv] of Rr?.snd || []) snd(n, gv, (ro === 'pre' ? 0 : ro === 'act' ? .12 : .25) + (dl || 0) / 60);
  if (!Rr?.snd?.length) snd(c ? 'DUN_Move_Start' : 'DUN_Stat_Up', .04);
  for (const [, kk, ft] of E('pre')) fxOnce(kk, ft, 0, me.x, me.y - 22, f);
  buzz(1); squash(me, -.16); pressEl(btn);
  if (k === 'Self') {   // 변화 기술: 5초 동안 기술 위력 1.3배 + HP 조금 회복 (한 번 누르기)
    me.cd[name] = cdBase(v); setAnim(me, anyAnim(me, 'Charge', 'SpAttack', 'Attack'), true); me.busy = .3; me.buff = 5; me.hp = Math.min(me.mhp, me.hp + Math.round(me.mhp * .08));
    if (!E('pre').length) burst(me.x, me.y - 24, col, 10, 48); ring(me.x, me.y, '#bff59a', 8, 60, .4, 5); for (let j = 0; j < 10; j++) part({ x: me.x + (Math.random() - .5) * 34, y: me.y - Math.random() * 10, vy: -70 - Math.random() * 70, life: .5 + Math.random() * .3, col: j % 2 ? '#bff59a' : '#fff', sz: 3 });
    pop(me.x, me.y - 60, '힘이 솟는다!', '#bff59a', true); hud(); return;
  }
  if (k === 'Dash') {   // 누르는 동안 달린다 (스틱으로 방향을 틀 수 있음)
    setAnim(me, anyAnim(me, 'QuickStrike', 'Walk'), true); me.dash = { vx: dx * 600, vy: dy * 600, t: 9, hit: new Map(), v, gt: 0, hold: i, el: 0, max: .75, min: .2 }; me.inv = Math.max(me.inv, .3); me.cd[name] = 99;
    dust(me.x, me.y, 5, 90); sparks(me.x, me.y - 16, -dx, -dy, col, 5, 200); return;
  }
  const kind = k === 'Attack' ? 'melee' : k === 'Projectile' ? (E('col').length ? 'col' : E('stream').length ? 'stream' : 'proj') : 'area';
  me.ch = { i, v, kind, K: CH[kind], t: 0, tk: 0, n: 0, ang, sndT: .6, col, f, last: null }; me.ch.max = chMax(me.ch); me.cd[name] = 99;
  { const w = wOf(v.pw), wd = kind === 'stream' ? 0 : WT.wind[w]; if (wd) { me.ch.tk = wd; me.ch.wd = wd; squash(me, -.24); ring(me.x, me.y - 18, col, 30 + w * 8, 6, wd, 4, 1); } }   /* 묵직한 기술일수록 모으는 순간이 있다 */
  setAnim(me, anyAnim(me, ...(kind === 'melee' ? ['Strike', 'Attack'] : kind === 'area' ? ['SpAttack', 'Rotate', 'Attack'] : ['Shoot', 'SpAttack', 'Attack'])), true);
  if (kind === 'stream') { ring(me.x + dx * 18, me.y - 20 + dy * 10, col, 3, 26, .2, 5, 1); sparks(me.x + dx * 18, me.y - 20 + dy * 10, dx, dy, col, 6, 260); shake(.12); }
}
// 한 박자: 첫 박자는 한 방(60%), 뒤는 잔타
function chTick(c) {
  const G = R.G, me = G.me, { v, kind, K, col } = c, { t, c: cat, pw, Rr } = v, first = c.n === 0, m = first ? (kind === 'stream' ? .45 : .6) : kind === 'stream' ? 1 / Math.max(1, Math.ceil(c.max / K.tau) - 1) : K.m, dx = Math.cos(c.ang), dy = Math.sin(c.ang), f = me.face, E = r => (Rr?.e || []).filter(e => e[0] === r);
  c.n++; c.tk = K.tau;
  const hit = (o, kx, ky, delay = 0) => { const go = () => { if (o.hp <= 0) return; hurt(o, dmg(me, o, t, cat, pw * m, pw), kx, ky, !first); hitFx(Rr, o, 0, f, col, kx, ky, !first); }; if (delay) after(delay, go); else go(); };
  if (kind === 'stream') {   // 빔 안에 있는 상대를 모두 지진다
    const len = Math.min(BEAM, 40 + c.t * 1100), x0 = me.x + dx * 14, y0 = me.y - 20 + dy * 8;
    for (const o of G.mobs) { if (o.enter > 0 || o.hp <= 0) continue; const px = o.x - x0, py = o.y - 20 - y0, along = px * dx + py * dy, perp = Math.abs(px * dy - py * dx); if (along > -6 && along < len + 10 && perp < 24 + (o.boss ? 12 : 0)) hit(o, dx * (first ? 1 : .5), dy * (first ? 1 : .5)); }
    me.kx -= dx * 26; me.ky -= dy * 18; shake(.035);
  } else if (kind === 'proj') {   // 연사
    const a = c.ang + (first ? 0 : (Math.random() - .5) * .16), cx = Math.cos(a), cy = Math.sin(a);
    G.shots.push({ x: me.x + cx * 16, y: me.y - 20 + cy * 10, vx: cx * 470, vy: cy * 470, life: .7, t0: R.T, mine: true, pierce: false, hit: new Set(), v, f, ang: a, col, pt: 0, pm: m, light: !first });
    me.kx -= cx * (first ? 110 : 55); me.ky -= cy * (first ? 70 : 35); ring(me.x + cx * 18, me.y - 20 + cy * 10, col, 3, first ? 20 : 14, .14, 4, 1); sparks(me.x + cx * 18, me.y - 20 + cy * 10, cx, cy, col, first ? 4 : 2, 220);
    if (!first) { snd('DUN_Move_Start', .02); squash(me, .08); }
  } else if (kind === 'col') {   // 번개가 연달아 떨어진다 (같은 상대만 말고 돌아가며)
    const L = G.mobs.filter(o => o.hp > 0 && o.enter <= 0 && Math.hypot(o.x - me.x, o.y - me.y) < 280).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const tg = L.find(o => o !== c.last) || L[0]; c.last = tg; const px = tg ? tg.x : me.x + dx * 140, py = tg ? tg.y : me.y + dy * 90;
    for (const [, kk, ft] of E('col')) { const B = kk + '_B', Hd = kk + '_H', S = PX().s; if (!S[B] || !S[Hd]) continue; const bh = S[B][1] * 2;
      fxAdd(.1, first ? .55 : .3, tt => { const fr = (tt * 60 / ft) % S[B][2]; pfxDraw(Hd, fr, px, py - 16, 1); for (let y = py - 16 - S[Hd][1] - bh / 2 + 2; y > -60; y -= bh - 2) pfxDraw(B, fr, px, y, 1); }); }
    fxAdd(0, .14, tt => { const g = R.g, p = tt / .14; g.strokeStyle = `rgba(255,255,255,${.8 * (1 - p)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(px, py, 34 * (1 - p * .5), 14 * (1 - p * .5), 0, 0, 7); g.stroke(); });
    for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - px, o.y - py) < 44) { const l = Math.hypot(o.x - px, o.y - py) || 1; hit(o, l > 6 ? (o.x - px) / l * .7 : dx * .7, l > 6 ? (o.y - py) / l * .7 : dy * .7, .13); }
    after(.12, () => { flash(first ? .09 : .05); shake(first ? .3 : .16); ring(px, py, col, 10, first ? 64 : 46, .3, 6); if (first) ring(px, py, '#fff', 6, 40, .22, 4); dust(px, py, first ? 6 : 3, 110); });
    if (!first) snd(Rr?.snd?.find(x => x[0] === 'act')?.[1] || 'DUN_Shock_Wave', .05);
  } else if (kind === 'melee') {   // 연타: 가까운 상대에게 달라붙어 계속 친다
    const tg = nearest(me, G.mobs, 140), d = tg ? Math.hypot(tg.x - me.x, tg.y - me.y) : 0, go = tg ? Math.max(0, d - 30) : 0, tt = go / 640;
    if (go > 4) { me.dash = { vx: dx * 640, vy: dy * 640, t: tt, step: true, gt: 0 }; ghost(me); }
    setAnim(me, anyAnim(me, ...(c.n % 2 ? ['Strike', 'Attack'] : ['Attack'])), true); c.tk = K.tau + tt; const flip = c.n % 2 ? 1 : -1;
    after(tt + .04, () => { if (me.hp <= 0) return; const hx = me.x + dx * 30, hy = me.y + dy * 20; let n = 0;
      slash(hx, hy - 20, flip > 0 ? c.ang : c.ang + .001, col, first ? 36 : 30); if (flip < 0) fxAdd(0, .001, () => {});
      if (first) for (const [, kk, ft] of [...E('front'), ...E('tile')]) fxOnce(kk, ft, 0, hx, hy - 20, f);
      me.kx += dx * (first ? 90 : 50); me.ky += dy * (first ? 60 : 34); squash(me, first ? .14 : .1);
      for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - hx, o.y - hy) < 50 + (o.boss ? 14 : 0)) { n++; hit(o, dx * (first ? 1.5 : .6), dy * (first ? 1.5 : .6)); }
      snd(n ? 'DUN_Punch' : 'DUN_Miss', n ? .035 : .02); });
  } else {   // 둘레: 파동이 이어서 퍼진다
    const rr = 92 + Math.min(3, c.n - 1) * 8;
    if (first) { for (const [, kk, ft] of [...E('area'), ...E('tile'), ...E('stream'), ...E('proj')]) fxOnce(kk, ft, .05, me.x, me.y - 16, f); if (!E('area').length) burst(me.x, me.y - 16, col, 16, 80); }
    ring(me.x, me.y, col, 12, rr + 4, .32, first ? 7 : 5); if (first) ring(me.x, me.y, '#fff', 8, 70, .26, 4, .5, .05); dust(me.x, me.y, first ? 10 : 5, 170); shake(first ? .3 : .14); squash(me, .1);
    for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && Math.hypot(o.x - me.x, o.y - me.y) < rr) { const l = Math.hypot(o.x - me.x, o.y - me.y) || 1; hit(o, (o.x - me.x) / l * (first ? 1.3 : .6), (o.y - me.y) / l * (first ? 1.3 : .6), .08); }
  }
}
function chEnd() { const me = R?.G?.me, c = me?.ch; if (!c) return; me.ch = null; humOff(); me.cd[c.v.name] = me.cdMax[c.v.name] * (.5 + .5 * Math.min(1, c.t / c.max)); me.busy = Math.max(me.busy, .08); if (c.kind === 'stream') squash(me, .12); }
function dashEnd() { const me = R?.G?.me, d = me?.dash; if (!d) return; me.dash = null; if (d.hold != null) { humOff(); me.cd[d.v.name] = me.cdMax[d.v.name] * (.5 + .5 * Math.min(1, d.el / d.max)); squash(me, .16); dust(me.x, me.y, 4, 80); } }
function hitFx(Rr, o, delay, f, col, kx = 0, ky = 0, light) {
  if (light) { if (!o.lfx || R.T - o.lfx > .28) { o.lfx = R.T; ring(o.x, o.y - 20, col, 4, 18, .16, 3, 1); } return; }
  const H2 = (Rr?.e || []).filter(e => e[0] === 'hit'); for (const [, kk, ft] of H2) fxOnce(kk, ft, delay, o.x, o.y - 20, f);
  if (!H2.length) { if (PX()?.s.Hit_Neutral) fxOnce('Hit_Neutral', 2, delay, o.x, o.y - 20, f); else burst(o.x, o.y - 20, col, 4, 26); }
  ring(o.x, o.y - 20, col, 4, 24, .18, 4, 1, delay);
}
function hurt(o, r, kx, ky, light) {
  const G = R?.G; if (!G || o.hp <= 0) return; const me = G.me;
  { const l = Math.hypot(kx, ky); if (l < .05) { const d = Math.hypot(o.x - me.x, o.y - me.y) || 1; kx = (o.x - me.x) / d; ky = (o.y - me.y) / d; } }
  const l = Math.hypot(kx, ky) || 1, ux = kx / l, uy = ky / l, big = r.e > 1 || r.crit, lt = !!light && !r.crit, col = r.crit ? '#ff9a3a' : r.e > 1 ? '#ffd84a' : r.e < 1 ? '#c8c8d8' : '#ffffff';
  o.hp -= r.n; o.flash = lt ? .07 : big ? .16 : .11; squash(o, lt ? .14 : big ? .36 : .26);
  const w = r.w ?? 1, kb = WT.kb[w] * (o.boss ? .35 : 1) * (lt ? .5 : 1) * (r.crit ? 1.3 : 1); o.kx = kx * kb; o.ky = ky * kb * .7; if (!o.boss || Math.random() < .4) setAnim(o, 'Hurt', !lt || o.anim !== 'Hurt'); o.stun = Math.max(o.stun || 0, o.boss ? (lt ? .06 : .15) : (lt ? .22 : .35));
  if (o.boss && (o.warn > 0) && big) { o.warn = 0; o.shoot = false; o.cd = .6; }   // 대장도 급소·효과 굉장하면 준비 동작이 끊긴다
  // 손맛: 멈칫 + 흔들림 + 맞은 방향으로 화면 밀림 + 불똥 + 진동
  if (lt) { R.TR = Math.max(R.TR, .16); kick(ux, uy, 1.5); sparks(o.x, o.y - 20, ux, uy, TYPE_C[tysOf(me.sp)[0]] || '#ffe27a', 3, 240); }   /* 잔타: 멈칫 없이 약한 흔들림만 깔아 둔다 */
  else { stop(WT.stop[w] + (big ? .03 : 0)); shake(WT.shake[w] + (big ? .1 : 0)); kick(ux, uy, 3 + w * 2 + (big ? 2 : 0)); buzz(big || w >= 2 ? 1 : 0); sparks(o.x, o.y - 20, ux, uy, TYPE_C[tysOf(me.sp)[0]] || '#ffe27a', 5 + w * 2 + (big ? 4 : 0), 250 + w * 40); }
  // 0.4초 안에 또 맞으면 숫자를 따로 띄우지 않고 합쳐서 키운다
  { const q = o.pp; if (q && R.RT - q.t0 < .4 && R.POPS.includes(q)) { q.txt += r.n; q.t0 = R.RT - .06; q.sz = Math.min(34, (q.sz || 17) + 1.5); if (big) { q.col = col; q.big = true; } if (r.crit) q.crit = 1; }
    else { o.pp = pop(o.x, o.y - 50, r.n, col, big && !lt, ux * 26, uy * 12); o.pp.sz = WT.num[w] + (big ? 4 : 0) - (lt ? 3 : 0); if (r.crit) o.pp.crit = 1; } }
  if (r.crit) { pop(o.x, o.y - 74, '급소!', '#ff9a3a', true); snd('DUN_Hit_Super_Effective', .07); snd('DUN_Punch', .06); stars(o.x, o.y - 24, 5, '#ffb04a', 220); }
  else if (r.e > 1) { snd('DUN_Hit_Super_Effective', lt ? .03 : .06); if (!o.seTold) { o.seTold = 1; pop(o.x, o.y - 72, '효과가 굉장했다!', '#ffd84a'); } }
  else snd(r.e < 1 ? 'DUN_Hit_Not_Very_Effective' : 'DUN_Hit_Neutral', lt ? .025 : .05);
  // 콤보: 이어 맞힐수록 기술이 빨리 다시 찬다 (맞으면 끊김)
  G.combo++; G.comboT = 2.5; G.best = Math.max(G.best, G.combo); cbUi(true);
  if (G.combo % 10 === 0) { pop(me.x, me.y - 78, `${G.combo} 콤보!`, '#ffe27a', true); buzz(1); stars(me.x, me.y - 30, 8); }
  if (o.hp <= 0) ko(o, ux, uy);
}
function ko(o, ux, uy) {
  const G = R.G, me = G.me; o.hp = 0; o.dead = R.T; o.warn = 0; o.lunge = o.slam = null; setAnim(o, 'Hurt', true); G.ko++;
  // 날아가서 통통 튀다 펑
  o.dvx = ux * (o.boss ? 230 : 430); o.dvy = uy * (o.boss ? 150 : 280); o.zv = o.boss ? 260 : 330; o.spin = (ux >= 0 ? 1 : -1) * (o.boss ? 5 : 11); o.rot = 0; o.flash = .22;
  const last = !G.pend && G.mobs.every(m => m === o || m.hp <= 0), fin = last && G.wave >= 3;
  stop(o.boss ? .2 : .1); shake(o.boss ? .9 : .32); kick(ux, uy, o.boss ? 12 : 7); zoom(o.boss ? .1 : .035);
  if (o.boss) { rumble(4, 65); snd('DUN_Explosion', .09); flash(.3); } else buzz(1);
  if (last) { slow(fin ? .95 : .5, fin ? .22 : .35); if (!o.boss) flash(.12); }   // 마지막 한 마리는 느리게 날아간다
  const gold = o.boss ? 8 : 1;   /* 경완 2026-11-13: 골드는 바닥에 떨어지고, 주워야 내 것 */
  const ex = Math.max(1, Math.round(GB().xpFor({ sp: o.sp, lv: o.lv }, G.M.lv) * (o.boss ? 1.5 : 1))); G.exp += ex;
  const y = EVY()[o.sp] || '', evAdd = +y[G.stat] || 0, before = G.ev; G.evRaw += evAdd; G.ev = Math.min(EV_CAP, G.M.evRoom, G.evRaw);
  const evUp = G.ev - before, shard = G.M.eg && G.shard + G.drops.filter(p => !p.coin).length < SHARD_CAP && (o.boss || Math.random() < .35);
  // 펑 터지는 순간에 보상이 튀어나온다
  after(.42, () => { const x = o.x, yy = o.y;
    fxOnce(PX()?.s.Smoke_White ? 'Smoke_White' : 'Wood_Hammer_Smoke', 2, 0, x, yy - 14, 1, { s: o.boss ? 1.3 : .9 }); stars(x, yy - 16, o.boss ? 14 : 6, '#fff', o.boss ? 300 : 200); dust(x, yy, o.boss ? 12 : 5, 120); ring(x, yy, '#fff', 6, o.boss ? 90 : 44, .3, 5);
    if (o.boss) { shake(.5); rumble(2, 80, 1); } else buzz(0); snd('DUN_Rock_Smash', o.boss ? .07 : .035);
    pop(x, yy - 34, `+${ex} 경험치`, '#bfe6ff'); if (evUp > 0) pop(x, yy - 54, `${STAT_KO[G.stat]} 노력치 +${evUp}`, '#d6b4ff', true);
    for (let i = 0; i < gold; i++) { const a = Math.random() * 6.28, v = gold > 1 ? 50 + Math.random() * 80 : 15 + Math.random() * 35; G.drops.push({ coin: 1, x, y: yy - 4, t0: R.T, vy: -170 - Math.random() * 90, z: 12, vx: Math.cos(a) * v, gy: Math.sin(a) * v * .6 }); }
    for (let i = 0; i < (o.boss ? 8 : 3); i++) fly('xp', x, yy - 14, () => ({ x: me.x, y: me.y - 22 }), null, '#8fd0ff');
    if (shard) G.drops.push({ x, y: yy - 4, t0: R.T, vy: -150, z: 10, vx: (Math.random() - .5) * 60 });
    hud(); });
}

// ---------- 회피 (딱 맞춰 피하면 저스트 회피) ----------
function dodge() {
  const G = R?.G, me = G?.me; if (!R.run || !me || me.hp <= 0 || me.dcd > 0 || G.over) return; const J = R.JOY;
  let dx = J.dx, dy = J.dy; if (Math.hypot(dx, dy) < .2) { dx = me.face; dy = 0; } const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  chEnd(); dashEnd(); me.dash = { vx: dx * 560, vy: dy * 560, t: .2, roll: true, gt: 0 }; me.inv = .4; me.roll = .36; me.just = false; me.dcd = .8; me.busy = 0; R.BUF = null;
  snd('DUN_Miss', .04); buzz(0); setAnim(me, anyAnim(me, 'Hop', 'Rotate', 'Walk'), true); squash(me, -.22); dust(me.x, me.y, 7, 110); ghost(me);
  pressEl(R.q('.ya-dg'));
}
function justDodge(o) {
  const G = R.G, me = G.me; if (me.just) return; me.just = true; G.just++;
  slow(.6, .28); flash(.14, '170,220,255'); zoom(.05); buzz(1); setTimeout(() => R && buzz(0), 110); snd('DUN_Double_Team', .07);
  me.inv = Math.max(me.inv, .7); me.crit = 3; me.dcd = 0; for (const k in me.cd) me.cd[k] *= .35;
  pop(me.x, me.y - 76, '저스트 회피!', '#9fe4ff', true); ring(me.x, me.y, '#9fe4ff', 10, 90, .4, 6); stars(me.x, me.y - 24, 8, '#9fe4ff');
  for (let i = 0; i < 3; i++) after(i * .03, () => ghost(me, .5));
}

// ---------- 매 프레임 ----------
function step(dt) {
  const G = R.G, me = G.me, J = R.JOY, T = R.T, live = R.run && !G.over;
  for (let i = R.Q.length - 1; i >= 0; i--) { const q = R.Q[i]; if (q.t <= T) { R.Q.splice(i, 1); if (q.G === G) q.fn(); } }
  me.inv = Math.max(0, me.inv - dt); me.roll = Math.max(0, me.roll - dt); me.dcd = Math.max(0, me.dcd - dt); me.flash = Math.max(0, me.flash - dt); me.busy = Math.max(0, me.busy - dt); me.buff = Math.max(0, me.buff - dt); me.crit = Math.max(0, me.crit - dt);
  spring(me, dt);
  if (live) { const rate = 1 + Math.min(.45, G.combo * .015); for (const k in me.cd) if (me.cd[k] < 90) me.cd[k] = Math.max(0, me.cd[k] - dt * rate);
    if (G.combo && (G.comboT -= dt) <= 0) { G.combo = 0; cbUi(); }
    G.time = Math.max(0, TIME - (T - G.start)); const s = Math.ceil(G.time); if (s !== G.sec) { G.sec = s; if (s <= 5 && s > 0) buzz(0); } }
  if (me.kx || me.ky) { me.x += me.kx * dt; me.y += me.ky * dt; const k = Math.pow(.0006, dt); me.kx *= k; me.ky *= k; if (Math.abs(me.kx) + Math.abs(me.ky) < 4) me.kx = me.ky = 0; keepIn(me); }
  if (!(me.hp > 0 && live) && (me.ch || me.dash?.hold != null)) { chEnd(); dashEnd(); }
  if (me.hp > 0 && live) {
    if (me.dash) { const d = me.dash;
      if (d.hold != null) {   // 누르는 동안 달리는 돌진: 스틱 쪽으로 방향을 튼다
        d.el += dt; hum(dt); const m = Math.hypot(J.dx, J.dy); if (m > .3) { const a0 = Math.atan2(d.vy, d.vx), a1 = Math.atan2(J.dy, J.dx); let da = a1 - a0; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const a = a0 + Math.max(-5 * dt, Math.min(5 * dt, da)); d.vx = Math.cos(a) * 600; d.vy = Math.sin(a) * 600; me.face = d.vx >= 0 ? 1 : -1; }
        if (me.once && T - me.at > .3) setAnim(me, anyAnim(me, 'QuickStrike', 'Walk'), true); }
      me.x += d.vx * dt; me.y += d.vy * dt; d.t -= dt; keepIn(me);
      if ((d.gt -= dt) <= 0) { d.gt = .035; ghost(me, d.roll ? .3 : .22); if (!d.step) part({ kind: 'line', x: me.x + (Math.random() - .5) * 20, y: me.y - 8 - Math.random() * 26, vx: -d.vx * .5, vy: -d.vy * .5, life: .14, sz: 2, col: '#fff' }); if (d.hold != null) dust(me.x, me.y, 1, 50); }
      if (d.hit) for (const o of G.mobs) if (o.enter <= 0 && o.hp > 0 && !(T - (d.hit.get(o) ?? -9) < .32) && Math.hypot(o.x - me.x, o.y - me.y) < 32 + (o.boss ? 12 : 0)) { const again = d.hit.has(o); d.hit.set(o, T); const v = d.v, l = Math.hypot(d.vx, d.vy) || 1; hurt(o, dmg(me, o, v.t, v.c, v.pw * (again ? .4 : .8), v.pw), d.vx / l * 1.1, d.vy / l * 1.1, again); hitFx(v.Rr, o, 0, me.face, TYPE_C[v.t], d.vx / l, d.vy / l, again); }
      if (d.hold != null ? ((!R.HELD[d.hold] && d.el >= d.min) || d.el >= d.max) : d.t <= 0) { if (d.hold != null) dashEnd(); else { me.dash = null; if (d.roll) { squash(me, .16); dust(me.x, me.y, 3, 60); } } } }
    else if (me.ch) { const c = me.ch, K = c.K; c.t += dt; hum(dt);
      // 겨눔은 가까운 상대를 천천히 따라간다 (줄기는 휘두르는 맛)
      const tg = nearest(me, G.mobs, c.kind === 'melee' ? 150 : 300); if (tg) { const a1 = Math.atan2(tg.y - me.y, tg.x - me.x); let da = a1 - c.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; const w = (c.kind === 'stream' ? 2 : 9) * dt; c.ang += Math.max(-w, Math.min(w, da)); }
      me.face = Math.cos(c.ang) >= 0 ? 1 : -1;
      if (K.mv) { const sp = (120 + me.st[5] * .5) * K.mv; if (Math.hypot(J.dx, J.dy) > .15) { me.x += J.dx * sp * dt; me.y += J.dy * sp * dt; keepIn(me); } }
      if (me.once && T - me.at > .32 && c.kind !== 'melee') setAnim(me, me.anim, true);
      if ((c.sndT -= dt) <= 0 && c.kind === 'stream') { c.sndT = .6; const a = c.v.Rr?.snd?.find(x => x[0] === 'act'); if (a) snd(a[1], a[3] * .7); }
      if ((c.tk -= dt) <= 0) chTick(c);
      if (c.kind === 'stream' && Math.random() < dt * 40) { const dx = Math.cos(c.ang), dy = Math.sin(c.ang), r = 20 + Math.random() * Math.min(BEAM, 40 + c.t * 1100) * .9; part({ x: me.x + dx * r + (Math.random() - .5) * 16, y: me.y - 20 + dy * r + (Math.random() - .5) * 16, vx: dx * 120 + (Math.random() - .5) * 60, vy: dy * 120 - 30, life: .3, sz: 3, col: Math.random() < .5 ? c.col : '#fff' }); }
      if ((!R.HELD[c.i] && c.t >= K.min + (c.wd || 0)) || c.t >= c.max + (c.wd || 0)) chEnd(); }
    else if (me.busy <= 0) { const sp = 120 + me.st[5] * .5, m = Math.hypot(J.dx, J.dy);
      if (m > .15) { me.x += J.dx * sp * dt; me.y += J.dy * sp * dt; if (Math.abs(J.dx) > .2) me.face = J.dx > 0 ? 1 : -1; me.up = J.dy < -.6 && Math.abs(J.dx) < .5; setAnim(me, 'Walk'); keepIn(me);
        if ((me.stepT -= dt) <= 0) { me.stepT = .2; dust(me.x - J.dx * 6, me.y, 1, 26); } }
      else if (!me.once || T - me.at > .5) setAnim(me, 'Idle'); }
    // 미리 누른 기술·누르고 있는 기술
    if (me.busy <= 0 && !me.dash && !me.ch) { const B = R.BUF, mv = G.M.mv;
      if (B && R.RT - B.t < .35) { if (me.cd[mv[B.i]?.name] <= 0) useMove(B.i); } else { R.BUF = null; for (const i in R.HELD) if (mv[i] && me.cd[mv[i].name] <= 0) { useMove(+i); break; } } }
  }
  for (const o of G.mobs) {
    o.flash = Math.max(0, o.flash - dt); spring(o, dt);
    if (o.hpLag > o.hp) { o.lagT = (o.lagT || 0) + dt; if (o.lagT > .28) o.hpLag = Math.max(o.hp, o.hpLag - o.mhp * dt * 1.4); } else { o.hpLag = o.hp; o.lagT = 0; }
    if (o.hp <= 0) {   // 날아가서 튀다가 사라짐
      const t = T - o.dead; o.x += o.dvx * dt; o.y += o.dvy * dt; const k = Math.pow(.04, dt); o.dvx *= k; o.dvy *= k; o.x = Math.max(8, Math.min(R.W - 8, o.x)); o.y = Math.max(R.A.y0 - 20, Math.min(R.H - 8, o.y));
      o.zv -= 1100 * dt; o.z += o.zv * dt; if (o.z < 0) { o.z = 0; if (o.zv < -120) { o.zv = -o.zv * .45; dust(o.x, o.y, 3, 70); squash(o, .3); if (o.boss) shake(.3); } else o.zv = 0; }
      o.rot += o.spin * dt; o.fade = t > .34 ? Math.max(0, 1 - (t - .34) / .1) : 1; continue; }
    if (o.enter > 0) { o.enter -= dt; if (o.drop) { o.z = 420 * Math.pow(Math.max(0, o.enter) / .7, 1.6); if (o.enter <= 0) bossLand(o); } continue; }
    if (o.kx || o.ky) { o.x += o.kx * dt; o.y += o.ky * dt; const k = Math.pow(.0015, dt); o.kx *= k; o.ky *= k; if (Math.abs(o.kx) + Math.abs(o.ky) < 4) o.kx = o.ky = 0; keepIn(o); }
    if (!live) { if (!o.slam && !o.lunge) setAnim(o, 'Idle'); o.warn = 0; continue; }
    if (o.stun > 0) { o.stun -= dt; continue; }
    const dx = me.x - o.x, dy = me.y - o.y, d = Math.hypot(dx, dy) || 1; if (!o.lunge && !o.slam && !(o.warn > 0 && o.warn < .15)) o.face = dx > 0 ? 1 : -1; o.cd -= dt;
    const touch = (r, fn) => { if (me.hp <= 0) return false; if (!r) return false; if (me.inv <= 0) { fn(); return true; } if (me.roll > 0) justDodge(o); return true; };
    if (o.slam) {   // 대장 내려찍기: 뛰어올라 예고한 동그라미로 떨어진다
      const L = o.slam; L.t += dt; const p = Math.min(1, L.t / L.d), e = p * p * (3 - 2 * p); o.x = L.x0 + (L.x - L.x0) * e; o.y = L.y0 + (L.y - L.y0) * e; o.z = Math.sin(Math.PI * p) * 120;
      if (p >= 1) { o.z = 0; o.slam = null; o.cd = 1.7 + Math.random() * .6; squash(o, .4); stop(.05); shake(.7); zoom(.04); buzz(2); snd('DUN_Stomp', .09); ring(L.x, L.y, '#fff', 14, L.r + 30, .4, 7); ring(L.x, L.y, '#ff8a6a', 8, L.r, .3, 5, .5, .04); dust(L.x, L.y, 14, 180);
        touch(Math.hypot(me.x - L.x, (me.y - L.y) * 2) < L.r + 6, () => hitMe(o, tysOf(o.sp)[0], 1, 70, me.x - L.x || 1, me.y - L.y)); setAnim(o, 'Idle'); }
      continue; }
    if (o.lunge) { const L = o.lunge; L.t -= dt; o.x += L.vx * dt; o.y += L.vy * dt; keepIn(o); if ((L.gt -= dt) <= 0) { L.gt = .05; ghost(o, .18); }
      if (!L.done && touch(Math.hypot(me.x - o.x, me.y - o.y) < 26 + (o.boss ? 12 : 0), () => hitMe(o, 1, 1, 40, L.vx, L.vy))) L.done = true;
      if (L.t <= 0) { o.lunge = null; o.cd = o.boss ? 1.5 + Math.random() * .6 : 1.6 + Math.random(); setAnim(o, 'Walk'); } continue; }
    if (o.warn > 0) { if (o.warn > .15) o.wa = Math.atan2(dy, dx); o.warn -= dt; if (o.warn <= 0) { const cx = Math.cos(o.wa), cy = Math.sin(o.wa);
        if (o.shoot) { o.shoot = false; const sp = 170, t = tysOf(o.sp)[0]; G.shots.push({ x: o.x + cx * 12, y: o.y - 20, vx: cx * sp, vy: cy * sp, life: 2.2, t0: T, mine: false, from: o, t, c: 2, pw: o.boss ? 60 : 40, pt: 0 }); setAnim(o, anyAnim(o, 'Shoot', 'Attack'), true); o.cd = 2.8 + Math.random(); snd('DUN_Move_Start', .03); squash(o, .2); o.kx -= cx * 70; o.ky -= cy * 50; }
        else { const v = o.boss ? 420 : 360; o.lunge = { vx: cx * v, vy: cy * v, t: .22, gt: 0 }; setAnim(o, 'Attack', true); snd('DUN_Tackle', .035); squash(o, -.2); dust(o.x, o.y, 3, 70); } } continue; }
    if (o.cd <= 0 && me.hp > 0) {
      const begin = (w, shoot) => { o.warn = o.warn0 = w; o.shoot = !!shoot; o.wa = Math.atan2(dy, dx); o.atkN++; if (o.boss) snd('DUN_Leer', .04); };
      if (o.boss && d < 300 && (d >= 80 || o.atkN % 2) && !(o.ranged && o.atkN % 3 === 0 && d > 70)) { o.atkN++; o.slam = { x0: o.x, y0: o.y, x: me.x, y: me.y, t: 0, d: .85, r: 62 }; setAnim(o, anyAnim(o, 'Hop', 'Attack'), true); squash(o, -.3); dust(o.x, o.y, 6, 110); snd('DUN_Leer', .05); continue; }
      if (o.ranged && d > 70 && d < 260) { begin(.5, true); continue; }
      if (d < 80) { begin(o.boss ? .6 : .55); continue; } }
    const want = o.ranged ? 150 : 0, s = o.spd * (d > want ? 1 : -.6);
    let px = 0, py = 0; for (const q of G.mobs) if (q !== o && q.hp > 0) { const ex = o.x - q.x, ey = o.y - q.y, ed = Math.hypot(ex, ey); if (ed < 34 && ed > 0) { px += ex / ed * (34 - ed); py += ey / ed * (34 - ed); } }
    if (Math.abs(d - want) > 12) { o.x += (dx / d * s) * dt + px * dt * 3; o.y += (dy / d * s) * dt + py * dt * 3; setAnim(o, 'Walk'); } else setAnim(o, 'Idle'); keepIn(o);
  }
  G.mobs = G.mobs.filter(o => o.hp > 0 || T - o.dead < .44);
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt;
    if ((s.pt -= dt) <= 0) { s.pt = .03; part({ x: s.x + (Math.random() - .5) * 6, y: s.y + (Math.random() - .5) * 6, vx: -s.vx * .1, vy: -s.vy * .1, life: .22, sz: s.mine ? 3 : 2, col: s.mine ? s.col : (TYPE_C[s.t] || '#fff') }); }
    if (s.mine) { for (const o of G.mobs) if (o.hp > 0 && o.enter <= 0 && !s.hit.has(o) && Math.hypot(o.x - s.x, o.y - 20 - s.y) < 24 + (o.boss ? 12 : 0)) { s.hit.add(o); const v = s.v; hurt(o, dmg(me, o, v.t, v.c, v.pw * (s.pm || 1), v.pw), Math.cos(s.ang) * .8, Math.sin(s.ang) * .8, s.light); hitFx(v.Rr, o, 0, s.f, s.col, Math.cos(s.ang), Math.sin(s.ang), s.light); if (!s.pierce) s.life = 0; } }
    else if (live && me.hp > 0 && !s.jd && Math.hypot(me.x - s.x, me.y - 20 - s.y) < 18) { if (me.inv <= 0) { s.life = 0; hitMe(s.from, s.t, s.c, s.pw, s.vx, s.vy); } else if (me.roll > 0) { s.jd = true; justDodge(s.from); } } }
  G.shots = G.shots.filter(s => T - s.t0 < s.life && s.x > -40 && s.x < R.W + 40 && s.y > -40 && s.y < R.H + 40);
  for (const p of G.drops) { if (p.z > 0 || p.vy < 0) { p.vy += 620 * dt; p.z -= p.vy * dt; if (p.vx) p.x += p.vx * dt; if (p.gy) p.y += p.gy * dt; if (p.z < 0) { p.z = 0; if (p.vy > 90) { p.vy = -p.vy * .4; p.z = .01; } else { p.vy = 0; p.vx = 0; p.gy = 0; } }
      const A = R.A; p.x = Math.max(A.x0 + 8, Math.min(A.x1 - 8, p.x)); p.y = Math.max(A.y0 + 8, Math.min(A.y1 - 4, p.y)); if (inPond(p.x, p.y, 0)) p.y = R.Y.pond.y0 - 4; }   // 연못 안엔 안 떨어지게
    const d = Math.hypot(me.x - p.x, me.y - p.y), pull = G.clearT ? 9999 : p.coin ? 66 : 84; if (T - p.t0 > .5 && d < pull && me.hp > 0) { const v = 5 + (T - p.t0) * 3; p.x += (me.x - p.x) * Math.min(1, dt * v); p.y += (me.y - p.y) * Math.min(1, dt * v); }
    if (T - p.t0 > .5 && d < 22 && me.hp > 0) { p.got = true; if (p.coin) gotCoin(p); else gotShard(p); } }
  G.drops = G.drops.filter(p => !p.got);
  for (let i = R.PT.length - 1; i >= 0; i--) { const p = R.PT[i], t = T - p.t0;
    if (p.home && t > p.hold) { const h = typeof p.home === 'function' ? p.home() : p.home, dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy), v = 260 + (t - p.hold) * 1700; if (d < v * dt + 5) { R.PT.splice(i, 1); p.on?.(); continue; } p.x += dx / d * v * dt; p.y += dy / d * v * dt; if (t > p.life) R.PT.splice(i, 1); continue; }
    if (t > p.life) { R.PT.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.ay * dt; if (p.dr) { const k = Math.exp(-p.dr * dt); p.vx *= k; p.vy *= k; } }
  if (live) {
    if (G.mobs.every(o => o.hp <= 0) && !G.pend && !G.waiting) {
      if (G.wave < 3) { G.waiting = true; after(.9, () => { if (!G.over) { G.waiting = false; nextWave(); } }); }
      else if (!G.clearT) { G.clearT = T; banner('훈련 완료!', 'win'); setAnim(me, anyAnim(me, 'Pose', 'Hop', 'Idle'), true); me.busy = .8; rumble(3, 120, 1); for (let i = 0; i < 26; i++) part({ kind: 'star', x: R.W * Math.random(), y: R.A.y0 - 30 - Math.random() * 60, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 140, life: 1.6, sz: 2, col: ['#ffe27a', '#ff9ab0', '#9fe4ff', '#bff59a'][i % 4] }); }
      else if (T - G.clearT > 1.5 && (!G.drops.length || T - G.clearT > 3.5)) end(true); }
    if (!G.over && G.time <= 0) end(false);
    if (!G.over && me.hp <= 0 && T - me.dead > .55) end(false, true);
  }
}
function hitMe(o, t, c, pw, vx, vy) {
  const G = R.G, me = G.me, r = dmg(o, me, t, c, pw); me.hp = Math.max(0, me.hp - r.n); me.inv = .8; me.flash = .16; setAnim(me, 'Hurt', true); chEnd(); dashEnd(); me.busy = .22; me.dash = null; R.BUF = null; squash(me, .32);
  const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l; me.kx = ux * 300; me.ky = uy * 200;
  pop(me.x, me.y - 56, r.n, '#ff7a6a', true, ux * 20, uy * 10); stop(.09); shake(.55); kick(ux, uy, 10); R.VIG = 1; buzz(2); snd('DUN_Hit_Neutral', .07); snd('DUN_Tackle', .04); sparks(me.x, me.y - 20, ux, uy, '#ff7a6a', 8, 300);
  if (G.combo) { G.combo = 0; cbUi(); }
  { const b = R.q('.ya-hp'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
  hud();
  if (me.hp <= 0) { G.fainted = true; me.dead = R.T; setAnim(me, anyAnim(me, 'Faint', 'Hurt'), true); slow(.7, .3); rumble(3, 90); flash(.2, '255,120,100'); }
}
function gotCoin(p) {
  const G = R.G; G.gold++; snd('DUN_Money', .03); buzz(0); stars(p.x, p.y - 10, 3, '#ffe27a', 110);
  fly('coin', p.x, p.y - 12, hudPt('.mg-hg .coin'), () => { if (R?.G !== G) return; G.goldShown = Math.min(G.gold, G.goldShown + 1); hgUp(); });
}
// 경완 2026-11-13: 번뜩임 조각은 먹는 순간 화면이 멈칫하고 크게 번뜩인다 (멈칫 한도와 상관없이 꼭)
function gotShard(p) {
  const G = R.G, me = G.me; G.shard++; G.egg = Math.min(99, G.egg + 1);
  R.HS = Math.max(R.HS, .34); R.SH = { t0: R.RT, x: me.x, y: me.y - 22 }; flash(.3, '255,240,170'); zoom(.13); shake(.3); me.flash = .3; rumble(3, 70, 1);
  snd('DUN_Wonder_Tile', .09); snd('DUN_Stat_Up', .05, .14);
  ring(me.x, me.y - 16, '#ffe27a', 6, 70, .4, 6, 1); ring(me.x, me.y - 16, '#fff', 4, 44, .3, 4, 1, .08); stars(p.x, p.y - 16, 14); stars(me.x, me.y - 22, 10, '#fff', 260);
  // 반짝이가 번뜩임 칸으로 날아가서 게이지가 오른다
  const to = hudPt('.ya-eg .bar'); let n = 0; for (let i = 0; i < 7; i++) fly('xp', p.x, p.y - 16, to, () => { if (R?.G !== G || n++) return; G.eggShown = G.egg; const b = R.q('.ya-eg'); b.classList.remove('up'); void b.offsetWidth; b.classList.add('up'); buzz(0); hud(); }, '#ffe27a');
  hud();
}
function shardFx() {   // 먹는 순간 화면 효과 (판 시간이 멈춰 있어도 도는 실제 시간)
  const S = R.SH; if (!S) return; const g = R.g, t = R.RT - S.t0, D = .8; if (t > D) { R.SH = null; return; }
  const p = t / D, e = 1 - (1 - p) * (1 - p), a = t < .34 ? 1 : Math.max(0, 1 - (t - .34) / (D - .34)), x = S.x, y = S.y, tx = Math.max(96, Math.min(R.W - 96, x));
  g.fillStyle = `rgba(20,16,40,${.4 * a})`; g.fillRect(0, 0, R.W, R.H);
  g.save(); g.translate(x, y); g.rotate(R.RT * 1.8); const L = 70 + 300 * e; g.fillStyle = `rgba(255,236,140,${.5 * a})`;
  for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * .085, -L); g.lineTo(L * .085, -L); g.closePath(); g.fill(); } g.restore();
  g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 6 * (1 - p) + 2; g.beginPath(); g.arc(x, y, 22 + 170 * e, 0, 7); g.stroke();
  g.fillStyle = `rgba(255,252,224,${.85 * a})`; g.beginPath(); g.arc(x, y, 30 - 8 * p, 0, 7); g.fill();
  const sz = 26 * (t < .14 ? 2 - t * 7.1 : 1), ty = Math.max(150, y - 62); g.textAlign = 'center'; g.font = `bold ${Math.round(sz)}px Galmuri11`; g.globalAlpha = a; g.lineWidth = 5; g.strokeStyle = '#20202c'; g.strokeText('번뜩임 +1%', tx, ty); g.fillStyle = t < .1 ? '#fff' : '#ffe27a'; g.fillText('번뜩임 +1%', tx, ty); g.globalAlpha = 1;
}

// ---------- 그리기 ----------
function drawCoin(p) { const g = R.g, t = R.T - p.t0, x = Math.round(p.x), y = Math.round(p.y - p.z - 8 + (p.z ? 0 : Math.sin(t * 6 + p.x) * 1.5)), w = Math.max(2, Math.round(Math.abs(Math.cos(t * 7 + p.x)) * 12));
  g.fillStyle = 'rgba(20,40,10,.28)'; g.beginPath(); g.ellipse(x, p.y, 7, 3, 0, 0, 7); g.fill();
  g.fillStyle = '#6a4400'; g.fillRect(x - w / 2 - 2, y - 8, w + 4, 16); g.fillStyle = '#ffc830'; g.fillRect(x - w / 2, y - 6, w, 12); g.fillStyle = '#d08a00'; g.fillRect(x - w / 2, y + 3, w, 3); g.fillStyle = '#fff2a0'; g.fillRect(x - w / 2, y - 6, Math.max(1, Math.round(w / 3)), 5);
  if ((t * 1.3 + p.x * .37) % 1 < .16) { g.fillStyle = '#fff'; g.fillRect(x + 5, y - 13, 2, 8); g.fillRect(x + 2, y - 10, 8, 2); } }
// 번뜩임 조각: 멀리서도 보이게 크게 — 빛기둥·도는 빛살·바닥 빛 고리·이름표
function drawShard(p) { const g = R.g, T = R.T, RT = R.RT, t = T - p.t0, x = Math.round(p.x), y = Math.round(p.y - p.z - 20 + Math.sin(t * 4) * 3), pu = .5 + .5 * Math.sin(RT * 6);
  g.fillStyle = 'rgba(20,40,10,.3)'; g.beginPath(); g.ellipse(x, p.y, 13, 5, 0, 0, 7); g.fill();
  g.strokeStyle = `rgba(255,236,140,${.4 + .35 * pu})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, p.y, 18 + pu * 6, 7 + pu * 2.4, 0, 0, 7); g.stroke();
  { const gr = g.createLinearGradient(0, y - 84, 0, y); gr.addColorStop(0, 'rgba(255,236,140,0)'); gr.addColorStop(1, `rgba(255,236,140,${.34 + .16 * pu})`); g.fillStyle = gr; g.fillRect(x - 10, y - 84, 20, 84); }
  g.save(); g.translate(x, y); g.rotate(RT * 1.3); g.fillStyle = `rgba(255,252,220,${.55 + .25 * pu})`; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -40); g.lineTo(6, -40); g.closePath(); g.fill(); } g.restore();
  g.fillStyle = `rgba(255,250,205,${.45 + .22 * pu})`; g.beginPath(); g.arc(x, y, 23 + pu * 2, 0, 7); g.fill(); g.strokeStyle = `rgba(232,160,32,${.55 + .3 * pu})`; g.lineWidth = 2; g.stroke();
  g.save(); g.translate(x, y); const s = 4, P = ['...k...', '..kyk..', '.kywyk.', 'kyywyyk', '.kyyok.', '..kok..', '...k...'], C = { k: '#6a4400', y: '#ffd640', w: '#fffbe0', o: '#e8a020' };
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const ch = P[j][i]; if (ch === '.') continue; g.fillStyle = C[ch]; g.fillRect((i - 3.5) * s, (j - 3.5) * s, s, s); }
  const tw = (Math.sin(t * 8) + 1) / 2; g.fillStyle = `rgba(255,255,255,${tw})`; g.fillRect(9, -22, 3, 11); g.fillRect(5, -18, 11, 3); g.restore();
  g.textAlign = 'center'; g.font = 'bold 11px Galmuri11'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText('번뜩임', x, y - 30); g.fillStyle = '#ffe27a'; g.fillText('번뜩임', x, y - 30); }
function hpBar(e) { const g = R.g, w = e.boss ? 72 : 34, h = e.boss ? 6 : 4, jx = e.flash > 0 ? Math.sin(R.RT * 90) * 2 : 0, x = Math.round(e.x - w / 2 + jx), y = Math.round(e.y + 6);
  g.fillStyle = '#20202c'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = '#4a4a5a'; g.fillRect(x, y, w, h); const r = Math.max(0, e.hp / e.mhp), rl = Math.max(0, (e.hpLag ?? e.hp) / e.mhp);
  if (rl > r) { g.fillStyle = '#fff'; g.fillRect(x, y, Math.ceil(w * rl), h); }   // 방금 깎인 만큼은 하얗게 남았다가 줄어든다
  g.fillStyle = r > .5 ? '#58d050' : r > .2 ? '#f8c030' : '#f05038'; g.fillRect(x, y, Math.ceil(w * r), h);
  if (e.boss) { const t = `대장 Lv.${e.lv}`; g.font = 'bold 11px Galmuri11'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#20202c'; g.strokeText(t, e.x, y + 18); g.fillStyle = '#ffd84a'; g.fillText(t, e.x, y + 18); } }
// 상대 공격 예고: 바닥에 빨간 길(돌진)·점선(원거리)·동그라미(내려찍기)가 차오른다
function drawTele(o) { const g = R.g;
  if (o.slam) { const L = o.slam, p = Math.min(1, L.t / L.d); g.fillStyle = 'rgba(255,60,40,.16)'; g.beginPath(); g.ellipse(L.x, L.y, L.r, L.r * .5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,60,40,.34)'; g.beginPath(); g.ellipse(L.x, L.y, L.r * p, L.r * .5 * p, 0, 0, 7); g.fill(); g.strokeStyle = p > .8 ? '#fff' : 'rgba(255,90,70,.9)'; g.lineWidth = 2; g.beginPath(); g.ellipse(L.x, L.y, L.r, L.r * .5, 0, 0, 7); g.stroke(); return; }
  if (!(o.warn > 0)) return; const p = 1 - o.warn / (o.warn0 || .5), a = o.wa || 0;
  g.save(); g.translate(o.x, o.y); g.rotate(a);
  if (o.shoot) { g.strokeStyle = `rgba(255,90,70,${.35 + p * .5})`; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -R.RT * 60; g.beginPath(); g.moveTo(14, 0); g.lineTo(240, 0); g.stroke(); g.setLineDash([]); }
  else { const L = (o.boss ? 420 : 360) * .22 + 30, w = o.boss ? 16 : 12; g.fillStyle = 'rgba(255,60,40,.16)'; g.beginPath(); g.moveTo(8, -w); g.lineTo(L - 12, -w); g.lineTo(L, 0); g.lineTo(L - 12, w); g.lineTo(8, w); g.closePath(); g.fill();
    g.fillStyle = `rgba(255,60,40,${.3 + p * .25})`; const q = 8 + (L - 20) * p; g.beginPath(); g.moveTo(8, -w); g.lineTo(q, -w); g.lineTo(q + 12, 0); g.lineTo(q, w); g.lineTo(8, w); g.closePath(); g.fill(); }
  g.restore(); }
function drawPart(p) { const g = R.g, t = R.T - p.t0, k = p.home ? 1 : Math.max(0, 1 - t / p.life), a = p.home ? 1 : Math.min(1, k * 2.2); g.globalAlpha = a;
  if (p.kind === 'line') { g.strokeStyle = p.col; g.lineWidth = p.sz; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); g.stroke(); }
  else if (p.kind === 'star') { const s = p.sz; g.fillStyle = p.col; g.fillRect(p.x - s * 2.5, p.y - s / 2, s * 5, s); g.fillRect(p.x - s / 2, p.y - s * 2.5, s, s * 5); g.fillStyle = '#fff'; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  else if (p.kind === 'coin') { const w = Math.max(2, Math.abs(Math.sin(t * 14 + p.x)) * 8); g.fillStyle = '#6a4400'; g.fillRect(p.x - w / 2 - 1, p.y - 5, w + 2, 10); g.fillStyle = '#ffc830'; g.fillRect(p.x - w / 2, p.y - 4, w, 8); g.fillStyle = '#fff2a0'; g.fillRect(p.x - w / 2, p.y - 4, Math.max(1, w / 3), 3); }
  else if (p.kind === 'xp') { g.fillStyle = p.col; g.fillRect(p.x - 3, p.y - 1, 6, 2); g.fillRect(p.x - 1, p.y - 3, 2, 6); g.fillRect(p.x - 2, p.y - 2, 4, 4); g.fillStyle = '#fff'; g.fillRect(p.x - 1, p.y - 1, 2, 2); }
  else { const s = p.grow ? p.sz * (1 + (1 - k) * .8) : p.sz; g.fillStyle = p.col; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  g.globalAlpha = 1; }
function draw() {
  const g = R.g, G = R.G, T = R.T, RT = R.RT, W = R.W, H = R.H; g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
  // 카메라: 흔들림(세기² 로 부드럽게) + 맞은 방향 밀림 + 살짝 확대
  const tr = R.TR * R.TR, sx = Math.sin(RT * 83 + 1.7) * 9 * tr + R.KX, sy = Math.sin(RT * 67) * 9 * tr + R.KY, zm = 1 + R.ZM, fx = G ? G.me.x : W / 2, fy = G ? G.me.y - 20 : H / 2;
  if (R.BG) g.drawImage(R.BG, -20, -20, W + 40, H + 40); else { g.fillStyle = '#e4cc96'; g.fillRect(0, 0, W, H); }   // 흔들릴 때 가장자리가 비지 않게 한 겹 깔아 둠
  g.translate(fx + sx, fy + sy); g.scale(zm, zm); g.translate(-fx, -fy);
  if (R.BG) g.drawImage(R.BG, 0, 0, W, H);
  if (!G) return;
  for (const o of G.mobs) if (o.hp > 0) drawTele(o);
  for (const p of G.drops) if (p.coin) drawCoin(p); else drawShard(p);
  for (let i = R.GH.length - 1; i >= 0; i--) { const h = R.GH[i], t = T - h.t0; if (t > h.d) { R.GH.splice(i, 1); continue; } blit(h.F, h.x, h.y, { a: .5 * (1 - t / h.d) }); }
  for (const e of [...G.mobs, G.me].sort((a, b) => a.y - b.y)) { drawMon(e); if (!e.mine && e.hp > 0 && e.enter <= 0) hpBar(e); }
  for (const s of G.shots) { if (s.mine) { const E = s.v.Rr?.e || []; let n = 0; for (const [ro, kk, ft] of E) if (ro === 'proj' || ro === 'stream') { n++; pfxDraw(kk, ((T - s.t0) * 60 / ft) % (PX().s[kk]?.[2] || 1), s.x, s.y, s.f, { rot: s.f > 0 ? s.ang : s.ang - Math.PI }); } if (!n) orb(s.x, s.y, s.col, 9); }
    else orb(s.x, s.y, TYPE_C[s.t] || '#fff', 7 + Math.sin(RT * 30) * 1); }
  if (G.me.ch) drawCh(G.me);
  for (let i = R.FX.length - 1; i >= 0; i--) { const f = R.FX[i], t = T - f.t0; if (t < 0) continue; if (t > f.d) { R.FX.splice(i, 1); continue; } try { f.draw(t); } catch (e) { R.FX.splice(i, 1); } }
  for (const p of R.PT) drawPart(p);
  g.textAlign = 'center';
  for (let i = R.POPS.length - 1; i >= 0; i--) { const p = R.POPS[i], t = RT - p.t0; if (t > .95) { R.POPS.splice(i, 1); continue; }
    const num = typeof p.txt === 'number', sz = (p.sz || (num ? (p.big ? 24 : 17) : p.big ? 16 : 12)) * (t < .12 ? 1.75 - t * 6.25 : 1), e = 1 - Math.exp(-t * 5), x = p.x + p.vx * e, y = p.y - 26 * e + p.vy * e;
    g.font = `bold ${Math.round(sz)}px Galmuri11`; g.globalAlpha = t > .7 ? (1 - (t - .7) / .25) : 1; g.lineWidth = p.big ? 4 : 3; g.strokeStyle = p.crit ? '#b01810' : '#20202c'; g.strokeText(p.txt, x, y); g.fillStyle = t < .07 ? '#fff' : p.col; g.fillText(p.txt, x, y); g.globalAlpha = 1; }
  // 화면 전체 효과: 번쩍, 맞았을 때·HP 적을 때 빨간 가장자리, 느린 화면 푸른 빛
  g.setTransform(R.DPR, 0, 0, R.DPR, 0, 0);
  const low = G.me.hp > 0 && G.me.hp / G.me.mhp < .25 && R.run ? .35 + .25 * Math.sin(RT * 7) : 0, vg = Math.max(R.VIG, low);
  if (vg > .01) { const gr = g.createRadialGradient(W / 2, H / 2, Math.max(W, H) * .36, W / 2, H / 2, Math.max(W, H) * .68); gr.addColorStop(0, 'rgba(255,40,30,0)'); gr.addColorStop(1, `rgba(255,40,30,${.5 * vg})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  if (R.SLOW > 0) { g.fillStyle = `rgba(90,140,255,${.1 * Math.min(1, R.SLOW * 6)})`; g.fillRect(0, 0, W, H); }
  shardFx();
  if (R.FLASH > 0) { g.fillStyle = `rgba(${R.FLC},${Math.min(.85, R.FLASH * 3)})`; g.fillRect(0, 0, W, H); }
}
// 꾹 누르는 동안: 줄기 기술은 빔이 쭉 뻗는다 (원본 줄기 그림을 줄지어 흘려보내고, 밑에 타입 색 빛줄기), 머리 위엔 남은 지속 시간
function drawCh(me) { const g = R.g, c = me.ch, T = R.T, K = c.K, dx = Math.cos(c.ang), dy = Math.sin(c.ang);
  if (c.kind === 'stream') { const len = Math.min(BEAM, 40 + c.t * 1100), x0 = me.x + dx * 14, y0 = me.y - 20 + dy * 8, end = Math.min(1, (c.max - c.t) / .15), RT = R.RT;
    // 빔: 방향 따라 3px 칸씩 찍으며 폭이 출렁인다 (바깥 타입 색 → 밝은 색 → 흰 심), 끝은 둥글게 부풀고 원본 줄기 그림이 위로 흘러간다
    g.save(); g.translate(x0, y0); g.rotate(c.ang);
    for (let d = 0; d < len; d += 3) { const tip = Math.min(1, (len - d) / 18), root = Math.min(1, d / 12 + .4), wv = 1 + .22 * Math.sin(d * .11 - RT * 26) + .1 * Math.sin(d * .31 + RT * 17), w = Math.round(11 * wv * end * root * (.55 + .45 * tip));
      g.globalAlpha = .4; g.fillStyle = c.col; g.fillRect(d, -w - 4, 3, w * 2 + 8); g.globalAlpha = .85; g.fillRect(d, -w, 3, w * 2); g.globalAlpha = .9; g.fillStyle = '#fff'; const cw = Math.max(1, Math.round(w * .42)); g.fillRect(d, -cw, 3, cw * 2); }
    g.globalAlpha = .9 * end; g.fillStyle = '#fff'; const tr = 10 + Math.sin(RT * 40) * 3; g.fillRect(len - tr / 2, -tr, tr, tr * 2); g.fillRect(len - tr, -tr / 2, tr * 2, tr); g.fillStyle = c.col; g.globalAlpha = .6 * end; g.fillRect(-8, -12, 14, 24);
    g.restore(); g.globalAlpha = 1;
    const E = (c.v.Rr?.e || []).filter(e => e[0] === 'stream'); for (const [, kk, ft] of E) { const n = PX().s[kk]?.[2] || 1; for (let d = 26 + ((T * 300) % 34); d < len - 6; d += 34) pfxDraw(kk, ((T * 60 / ft) + d / 9) % n, x0 + dx * d, y0 + dy * d, c.f, { rot: c.f > 0 ? c.ang : c.ang - Math.PI, a: end }); } }
  const w = 30, p = Math.max(0, 1 - c.t / c.max), x = Math.round(me.x - w / 2), y = Math.round(me.y - 66); g.fillStyle = '#20202c'; g.fillRect(x - 1, y - 1, w + 2, 5); g.fillStyle = c.col; g.fillRect(x, y, Math.ceil(w * p), 3); }
function orb(x, y, c, r) { const g = R.g; g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x, y, r + 4, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 2, y - 2, r * .4, 0, 7); g.fill(); g.strokeStyle = '#20202c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 1, 0, 7); g.stroke(); }
function loop(ms) {
  if (!R) return; const now = ms / 1000, rdt = Math.min(.05, R.last ? now - R.last : 0); R.last = now; R.RT += rdt;
  // 멈칫하는 동안엔 판 시간이 서고, 느린 화면일 땐 천천히 흐른다. 흔들림·숫자는 실제 시간으로
  let dt = rdt; if (R.HS > 0) { R.HS -= rdt; dt = 0; } else if (R.SLOW > 0) { R.SLOW -= rdt; dt = rdt * R.SLOWK; }
  R.HSB = Math.min(.3, (R.HSB ?? .3) + rdt * .3); R.TR = Math.max(0, R.TR - rdt * 1.9); { const k = Math.exp(-rdt * 16); R.KX *= k; R.KY *= k; } R.ZM *= Math.exp(-rdt * 7); R.FLASH = Math.max(0, R.FLASH - rdt); R.VIG = Math.max(0, R.VIG - rdt * 2.4);
  R.T += dt; if (R.G && dt > 0) step(dt); if (R && R.run && R.G) cdUi();
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
  on(window, 'keydown', e => { if (!r.run) return; const k = e.key.toLowerCase(); const i = 'qwer'.indexOf(k); if (i >= 0 && !e.repeat) { useMove(i, true); r.HELD[i] = 1; } r.KEY[k] = 1; if (e.key === ' ') { if (!e.repeat) dodge(); e.preventDefault(); } if (k.startsWith('arrow')) e.preventDefault(); keyJoy(); });
  on(window, 'keyup', e => { const k = e.key.toLowerCase(); r.KEY[k] = 0; const i = 'qwer'.indexOf(k); if (i >= 0) delete r.HELD[i]; keyJoy(); });
  on(window, 'mouseup', () => { r.HELD = {}; }); on(window, 'blur', () => { r.HELD = {}; });
  { const go = e => { e.preventDefault(); dodge(); }, d = q('.ya-dg'); on(d, 'touchstart', go, { passive: false }); on(d, 'mousedown', go); }
  on(q('.ya-pk'), 'click', e => { const b = e.target.closest('.pkc'); if (!b) return; r.pick = +b.dataset.i; const o = r.mons[r.pick]; if (o.evk >= 0) r.stat = o.evk; r.pool = null; startUi(); });
  on(q('.ya-stt'), 'click', e => { const b = e.target.closest('.stc'); if (!b) return; r.stat = +b.dataset.s; r.pool = null; startUi(); });
  on(q('.ya-go'), 'click', () => { q('.ya-start').hidden = true; q('.ya-ov').hidden = true; r.el.classList.add('play'); r.T = 0; r.FX.length = 0; r.POPS.length = 0; newGame(); r.run = true; });
  on(q('.ya-again'), 'click', () => { q('.ya-res').hidden = true; q('.ya-ov').hidden = true; r.FX.length = 0; r.POPS.length = 0; r.el.classList.add('play'); newGame(); r.run = true; });
  on(q('.ya-back'), 'click', () => close());
  on(q('.ya-x'), 'click', () => close());
  on(q('.ya-quit'), 'click', () => { if (r.run && r.G) end(false, false, true); });
  let rz = 0; on(window, 'resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (R === r) resize(); }, 200); });
}
function buildButtons() {
  const box = R.q('.ya-mvs'); box.innerHTML = '';
  R.G.M.mv.forEach((v, i) => { const b = document.createElement('button'); b.className = 'mvb'; b.style.setProperty('--tc', TYPE_C[v.t] || '#888');
    b.innerHTML = `<i class="cdo"></i><span class="tg">${TYPE_KO[v.t] || ''}</span><b>${v.name}</b><small>${v.c === 1 ? `물리 ${v.pw}` : v.c === 2 ? `특수 ${v.pw}` : '변화'}</small>`;
    // 누르고 있으면 다시 찰 때마다 이어서 나간다
    const go = e => { e.preventDefault(); useMove(i, true); if (R) R.HELD[i] = 1; }, up = () => { if (R) delete R.HELD[i]; };
    b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('touchend', up); b.addEventListener('touchcancel', up); b.addEventListener('mousedown', go); b.addEventListener('mouseleave', up); box.append(b); });
}
function pressEl(b) { if (!b) return; b.classList.remove('pr'); void b.offsetWidth; b.classList.add('pr'); }
function cdUi() { const G = R.G, me = G.me, box = R.q('.ya-mvs'), dg = R.q('.ya-dg');
  G.M.mv.forEach((v, i) => { const b = box.children[i]; if (!b) return; const on = me.ch?.i === i ? me.ch.t / me.ch.max : me.dash?.hold === i ? me.dash.el / me.dash.max : -1, c = on >= 0 ? 0 : me.cd[v.name], m = me.cdMax[v.name] || 1, was = b._cd; b._cd = c > 0; b.classList.toggle('cd', c > 0); b.classList.toggle('ch', on >= 0); b.querySelector('.cdo').style.setProperty('--p', on >= 0 ? (on * 360) + 'deg' : c > 0 ? (c / m * 360) + 'deg' : '0deg');
    if (was && !(c > 0)) { b.classList.remove('rdy'); void b.offsetWidth; b.classList.add('rdy'); } });   // 다시 찼을 때 번쩍
  dg.style.setProperty('--p', (me.dcd / .8 * 360) + 'deg'); dg.classList.toggle('cd', me.dcd > 0);
  const tm = R.q('.ya-tm'); tm.textContent = Math.ceil(G.time); tm.classList.toggle('low', G.time <= 10);
  if (G.combo) R.q('.ya-cb u').style.width = Math.max(0, G.comboT / 2.5 * 100) + '%'; }

// ---------- HUD ----------
function hud() {
  const G = R?.G; if (!G) return; const q = R.q, me = G.me, eg = G.M.eg, r = me.hp / me.mhp;
  q('.ya-ph').textContent = `웨이브 ${G.wave}/3`; q('.ya-m').textContent = `${G.ko}마리`; q('.mg-hg b').textContent = G.goldShown;
  q('.ya-hpf').style.width = (r * 100) + '%'; q('.ya-hpf').className = 'ya-hpf' + (r > .5 ? '' : r > .2 ? ' y' : ' r'); q('.ya-hpn').textContent = me.hp; q('.ya-hp').classList.toggle('low', r > 0 && r < .25);
  q('.ya-rwe').textContent = `+${G.exp}`; q('.ya-rwv').textContent = `${G.ev}/${Math.min(EV_CAP, G.M.evRoom)}`; q('.ya-rwk').textContent = STAT_KO[G.stat];
  q('.ya-eg').hidden = !eg;
  if (eg) { q('.ya-egn').textContent = '번뜩임 ???'; q('.ya-egt').textContent = TYPE_KO[eg.t] || ''; q('.ya-egt').style.background = TYPE_C[eg.t] || '#888'; q('.ya-egf').style.setProperty('--tc', TYPE_C[eg.t] || '#ee99ac');
    q('.ya-egf').style.width = G.eggShown + '%'; q('.ya-egf0').style.width = G.egg0 + '%'; q('.ya-egp').textContent = `${G.eggShown}%`; q('.ya-egs').textContent = `조각 ${G.shard}/${SHARD_CAP}`; }
  q('.ya-me').textContent = `${nmOf(G.o.P)} Lv.${me.lv}`;
}
function hgUp() { const el = R.q('.mg-hg'); el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); hud(); }
function cbUi(up) { const G = R.G, el = R.q('.ya-cb'), n = G.combo; el.classList.toggle('on', n >= 2); if (n < 2) return;
  el.querySelector('b').textContent = n; el.querySelector('small').textContent = `기술 충전 +${Math.round(Math.min(.45, n * .015) * 100)}%`;
  if (up) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); } }
function banner(t, kind = '') { const b = R.q('.ya-ban'); b.innerHTML = `<span>${t}</span>`; b.className = 'ya-ban'; void b.offsetWidth; b.className = 'ya-ban on ' + kind; }

// ---------- 끝: 보상은 계산해서 보여 주기만 (저장 안 함) ----------
function end(clear, faint, quit) {
  const G = R.G; if (G.over) return; G.over = true; chEnd(); dashEnd(); R.run = false; R.JOY.dx = R.JOY.dy = 0; R.HELD = {}; R.BUF = null; R.el.classList.remove('play'); R.q('.ya-cb').classList.remove('on');
  const left = Math.ceil(G.time), bonus = clear ? Math.floor(left / 6) : 0; const picked = G.gold + (clear ? G.drops.filter(p => p.coin).length : 0); G.gold = picked + bonus; G.goldShown = G.gold; G.eggShown = G.egg;
  if (!clear && !faint && !quit) { banner('시간 끝!'); buzz(1); }
  const fr = (clear ? 1 : 0) + (G.fainted ? 0 : 1), B = GB(), P = G.o.P, gr = B.growth(P.sp), lv0 = G.M.lv, x1 = G.M.xp + G.exp; let lv1 = lv0;
  while (lv1 < B.LV_MAX && x1 >= B.xpAt(gr, lv1 + 1)) lv1++;
  const a = B.xpAt(gr, lv1), b = B.xpAt(gr, lv1 + 1), prog = lv1 >= B.LV_MAX ? 1 : Math.max(0, Math.min(1, (x1 - a) / (b - a || 1))), nm = nmOf(P), eg = G.M.eg;
  setTimeout(() => { if (!R || R.G !== G) return; const q = R.q, r = q('.ya-res'), N = (n, pre = '+', suf = '') => `data-n="${n}" data-pre="${pre}" data-suf="${suf}">${pre}0${suf}`;
    q('.rs-h').textContent = clear ? '훈련 완료!' : faint ? `${josa(nm, '이', '가')} 지쳐 버렸다…` : quit ? '여기까지!' : '시간 끝!';
    q('.rs-sub').textContent = (clear ? `남은 시간 ${left}초 · 대장까지 다 쓰러뜨렸어요` : `${G.ko}마리 쓰러뜨렸어요`) + (G.best >= 5 ? ` · 최고 ${G.best}콤보` : '') + (G.just ? ` · 저스트 회피 ${G.just}번` : '');
    q('.rs-hd').classList.toggle('win', !!clear); q('.rs-nm').textContent = nm; q('.rs-lv').innerHTML = lv1 > lv0 ? `Lv.${lv0} → <i class="lvup">Lv.${lv1}</i>` : `Lv.${lv1}`; q('.rs-mi .xb i').style.setProperty('--w', (prog * 100).toFixed(0) + '%');
    q('.rs-xp').textContent = lv1 >= B.LV_MAX ? '레벨 끝' : `다음 레벨까지 ${Math.max(0, b - x1)}`; { const im = q('.rs-im'); im.removeAttribute('src'); GA.thumb?.(P).then(u => { if (im.isConnected && typeof u === 'string') im.src = u; }).catch(() => {}); }
    q('.ya-rl').innerHTML = `
      <li${eg ? '' : ' class="w"'}><span class="k">경험치</span><b ${N(G.exp)}</b><em>${lv1 > lv0 ? `레벨 ${lv1 - lv0} 올랐어요` : '쓰러뜨린 포켓몬 경험치'}</em></li>
      <li><span class="k">${STAT_KO[G.stat]} 노력치</span><b class="ev" ${N(G.ev)}</b><em>${!G.M.evRoom ? '이미 꽉 찼어요' : G.evRaw > G.ev ? `한 판 최대 ${Math.min(EV_CAP, G.M.evRoom)}` : '쓰러뜨린 포켓몬 노력치'}</em></li>
      <li><span class="k">친밀도</span><b class="fr" ${N(fr)}</b><em>${clear ? '훈련 완료 +1' : ''}${clear && !G.fainted ? ' · ' : ''}${G.fainted ? (clear ? '' : '지쳐서 못 받음') : '안 지침 +1'}</em></li>
      ${eg ? `<li><span class="k">번뜩임</span><b class="eg" ${N(G.shard, '+', '%')}</b><em><i class="egq" style="--tc:${TYPE_C[eg.t] || '#888'}">${TYPE_KO[eg.t] || ''}</i>??? ${G.egg0}% → ${G.egg}%</em></li>` : ''}
      <li class="ya-gold"><span class="k"><i class="coin"></i>골드</span><b ${N(G.gold, '+', 'G')}</b><em>주운 골드 ${picked}G${bonus ? ` · 남은 시간 ${bonus}G` : ''}</em></li>`;
    q('.ya-ov').hidden = false; r.hidden = false; r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); snd('DUN_Stat_Up', .07); buzz(1);
    // 줄이 하나씩 톡톡 나오면서 숫자가 올라간다
    [...q('.ya-rl').children].forEach((li, i) => { li.style.setProperty('--i', i); const bEl = li.querySelector('b[data-n]'), n = +bEl.dataset.n, t0 = 250 + i * 150;
      setTimeout(() => { if (!R || R.G !== G) return; buzz(0); if (li.classList.contains('ya-gold')) snd('DUN_Money', .05); const s = performance.now(), tick = () => { if (!bEl.isConnected) return; const p = Math.min(1, (performance.now() - s) / 380); bEl.textContent = bEl.dataset.pre + Math.round(n * (1 - Math.pow(1 - p, 3))) + bEl.dataset.suf; if (p < 1) requestAnimationFrame(tick); }; tick(); }, t0); });
  }, faint ? 1200 : clear || quit ? 300 : 900);
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

window.GymYA = { start, close, get _R() { return R; }, _use: i => useMove(i), _dodge: () => dodge(), _hold: (i, on) => { if (!R) return; if (on) { useMove(i, true); R.HELD[i] = 1; } else delete R.HELD[i]; }, _end: c => R?.G && end(c) };
})();
