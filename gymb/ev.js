/* 체육관 이벤트 스토리 엔진 (2026-11-07 경완 '체육관에 가끔씩 이벤트 스토리, 본가처럼 밖으로 나가 모험, 이벤트별 모듈·보상')
   이벤트 하나 = gymb/ev/<id>.js 하나. 파일은 GymEv.def({...}) 로 자기를 등록한다.
   def: { id, nm(이름), sub(한 줄 설명), songs[미리 받을 곡], imgs[미리 받을 그림], ch[장 함수들], reward{g, rep, fit, …} }
   장 함수 ch[i](A) 는 장면 도구 A 로 연출하고, 끝나면 다음 장으로 넘어간다. 진행은 S.gym.ev = { cur, ch, t0 } (장 단위 저장, 앱이 꺼지면 그 장 처음부터).
   체육관 안쪽(gymb/gym.js)은 GymEv.run(api) 에 장면에 필요한 함수를 넘겨준다. */
(function () {
'use strict';
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const LIST = ['rocket'];   // 이벤트 순서 (새 이벤트는 여기에 id 를 더하고 gymb/ev/<id>.js 를 만든다)
const DEF = {};
const loaded = {};
const load = id => loaded[id] || (loaded[id] = new Promise(ok => { const x = document.createElement('script'); x.src = `gymb/ev/${id}.js?v=${VER}`; x.onload = x.onerror = () => ok(); document.head.appendChild(x); }));
const wait = ms => new Promise(r => setTimeout(r, ms));
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const anim = (ms, f) => new Promise(ok => { const t0 = performance.now(); const s = now => { const q = Math.min(1, (now - t0) / ms); f(ease(q), q); q < 1 ? requestAnimationFrame(s) : ok(); }; requestAnimationFrame(s); });

// 이벤트 화면 모양 (gym.css 를 건드리지 않게 여기서 한 번 넣는다)
const CSS = `
#gym .ev-tint{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,rgba(60,0,10,0) 30%,rgba(40,0,12,.55) 100%);mix-blend-mode:multiply;opacity:0;transition:opacity 1.2s}
#gym .ev-tint.on{opacity:1}
#gym .ev-black{position:absolute;inset:0;z-index:11;background:#000;opacity:0;pointer-events:none;transition:opacity .8s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center;padding:0 24px}
#gym .ev-black.on{opacity:1;pointer-events:auto}
#gym .ev-black b{font-size:20px;letter-spacing:.02em;line-height:1.45;white-space:pre-line;opacity:0;transform:translateY(6px);transition:opacity .6s,transform .6s}
#gym .ev-black span{font-size:14px;color:#c8c8d8;line-height:1.5;white-space:pre-line;opacity:0;transition:opacity .6s .5s}
#gym .ev-black.txt b,#gym .ev-black.txt span{opacity:1;transform:none}
#gym .ev-ttl{position:absolute;left:0;right:0;top:34%;z-index:13;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;color:#fff;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.6)}
#gym .ev-ttl i{font-style:normal;font-size:12px;font-weight:700;letter-spacing:.3em;color:#ffd84a;background:rgba(0,0,0,.55);padding:3px 12px;border-radius:3px}
#gym .ev-ttl b{font-size:26px;letter-spacing:.04em}
#gym .ev-ttl em{font-style:normal;font-size:13px;color:#e8e8f0}
#gym .ev-ttl::before{content:'';position:absolute;left:0;right:0;top:-14px;bottom:-14px;z-index:-1;background:linear-gradient(90deg,transparent,rgba(120,0,16,.82) 18%,rgba(120,0,16,.82) 82%,transparent)}
#gym .ev-ttl{animation:evTtl 3.2s ease both}
@keyframes evTtl{0%{opacity:0;transform:scaleY(.2)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0}}
#gym .ev-r{position:absolute;pointer-events:none;image-rendering:pixelated;background:linear-gradient(#b8b8c4,#9898a8);border:2px solid #303040;border-radius:2px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
#gym .ev-r::after{content:'';position:absolute;inset:14%;background:url("gym/img/ev/rocket/r_emb.png?v=2") center/contain no-repeat;image-rendering:pixelated}   /* R 마크 = 해결 창과 같은 도트 로고 (경완 2026-11-07) */
#gym .ev-r.flag{background:none;border:0;box-shadow:none}
#gym .ev-r.flag::before{content:'';position:absolute;left:12%;top:4%;bottom:0;width:8%;background:#585868;border:1px solid #303040}
#gym .ev-r.flag::after{inset:6% 4% auto 20%;height:46%;background:url("gym/img/ev/rocket/r_emb.png?v=2") center/auto 76% no-repeat,#1c1c24;border:2px solid #303040}
/* 필드 모험 (방향 패드) */
#gym .ev-fld .tw-sp{z-index:2}
#gym .ev-fld .tw-sp.gone{opacity:0;transition:opacity .35s}
#gym .ev-fld .ev-ov{position:absolute;inset:0;z-index:5000;pointer-events:none;background-size:100% 100%;image-rendering:pixelated}#gym .ev-fld .ev-ovr{position:absolute;left:0;pointer-events:none;background-repeat:no-repeat;image-rendering:pixelated}
#gym .ev-fld :is(.ev-door,.ev-pic){position:absolute;pointer-events:none;background-repeat:no-repeat;background-size:100% 100%;image-rendering:pixelated}#gym .ev-fld .ev-door{z-index:5001}
#gym .ev-fld .tw-bub{z-index:6000}
#gym .ev-fade{position:absolute;inset:0;z-index:950;background:#000;opacity:0;pointer-events:none;transition:opacity .38s}#gym .ev-fade.on{opacity:1}
#gym .ev-loc{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:960;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:5px 12px;border-radius:6px;border:2px solid rgba(255,255,255,.22);pointer-events:none;transition:opacity .3s}
#gym .ev-loc{display:none!important}   /* 경완 2026-11-07 '좌상단 마을 이름 없애줘' */
#gym .ev-pad{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:156px;height:156px;z-index:960;touch-action:none;-webkit-user-select:none;user-select:none;transition:opacity .25s}
#gym .ev-pad::before{content:'';position:absolute;left:52px;top:52px;width:52px;height:52px;background:rgba(20,20,30,.5);border-radius:4px}
#gym .ev-pad button{position:absolute;width:52px;height:52px;border:0;border-radius:10px;padding:0;background:rgba(24,24,36,.62);box-shadow:0 4px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.24);touch-action:none;-webkit-tap-highlight-color:transparent;transition:transform .05s,box-shadow .05s}
#gym .ev-pad button::after{content:'';position:absolute;left:50%;top:50%;margin:-7px 0 0 -8px;border:8px solid transparent;border-bottom:11px solid #f0f0f8;border-top:0}
#gym .ev-pad button.on{transform:translateY(4px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.45);background:rgba(50,50,72,.8)}
#gym .ev-pad [data-d=u]{left:52px;top:0}#gym .ev-pad [data-d=d]{left:52px;bottom:0}#gym .ev-pad [data-d=l]{left:0;top:52px}#gym .ev-pad [data-d=r]{right:0;top:52px}
#gym .ev-pad [data-d=d]::after{transform:rotate(180deg)}#gym .ev-pad [data-d=l]::after{transform:rotate(-90deg)}#gym .ev-pad [data-d=r]::after{transform:rotate(90deg)}
#gym .ev-a{position:absolute;right:max(22px,env(safe-area-inset-right,0px));bottom:calc(58px + env(safe-area-inset-bottom,0px));z-index:960;width:70px;height:70px;border-radius:50%;border:0;background:#d8343c;color:#fff;font:900 24px/1 sans-serif;box-shadow:0 5px 0 #7a1018,inset 0 0 0 3px rgba(255,255,255,.3);touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-b{position:absolute;right:max(106px,calc(env(safe-area-inset-right,0px) + 84px));bottom:calc(65px + env(safe-area-inset-bottom,0px));z-index:960;width:56px;height:56px;border-radius:50%;border:0;padding:0;background:#3c3c4c;color:#fff;font:800 12px/1 sans-serif;box-shadow:0 4px 0 #18181f,inset 0 0 0 3px rgba(255,255,255,.22);touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-b.on{transform:translateY(4px);box-shadow:0 0 0 #18181f,inset 0 0 0 3px rgba(255,255,255,.45);background:#50506a}
#gym .ev-a:active,#gym .ev-a.on{transform:translateY(5px);box-shadow:0 0 0 #7a1018,inset 0 0 0 3px rgba(255,255,255,.45)}
#gym .ev-quit{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:960;border:0;border-radius:8px;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:7px 12px;box-shadow:0 3px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22);transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-pk{position:absolute;right:12px;top:calc(52px + env(safe-area-inset-top,0px));z-index:960;border:0;border-radius:8px;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:7px 12px;box-shadow:0 3px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22);transition:opacity .25s,transform .05s,box-shadow .05s;-webkit-tap-highlight-color:transparent}
#gym .ev-fld~.gy-kang.tw-talk .gy-k-box{width:auto;margin:0 calc(var(--si-right,env(safe-area-inset-right,0px)) + 8px) var(--evmb,77px) calc(var(--si-left,env(safe-area-inset-left,0px)) + 8px)}   /* 대사창 자리 = 체육관 아래 메뉴가 있을 때 대사창 자리 (경완 2026-11-08) */
#gym .ev-pk:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22)}
/* v19.29 경완 2026-11-08: 같이 다니는 포켓몬 고르기 창(넣어 두기), 주운 것 가운데 창(상점 그림 + 효과) */
#gym .ev-pkw .win{max-width:340px}#gym .ev-pkw h4{margin:0;font-size:16px}
#gym .ev-pkw .lu-pick{margin:0}#gym .ev-pkw .lu-pick button{padding:6px 2px 7px;font-size:12px;font-weight:700;background:#fff;box-shadow:0 3px 0 #c8c8d4,inset 0 0 0 2px rgba(0,0,0,.1)}
#gym .ev-pkw .lu-pick button.on{box-shadow:0 3px 0 #c8a830,inset 0 0 0 3px #ffd84a}#gym .ev-pkw .lu-pick button:active{transform:translateY(3px);box-shadow:0 0 0 transparent,inset 0 0 0 2px rgba(0,0,0,.1)}
#gym .ev-pkw .pk-tabs{display:flex;gap:6px}#gym .ev-pkw .pk-tabs button{flex:1;padding:8px 4px;font-size:13px;background:#e4e4ec;box-shadow:0 3px 0 #a8a8b8}#gym .ev-pkw .pk-tabs button.on{background:#3c3c4c;color:#fff;box-shadow:0 3px 0 #18181f}
#gym .ev-pkw .lu-pick b{font-size:12px}#gym .ev-pkw .lu-pick span{font-size:11px;color:#808090}
#gym .ev-itb .win{animation:awNpop .32s steps(4,end) both;gap:8px}
#gym .ev-itb h4{margin:0;font-size:17px;color:#303040}#gym .ev-itb h4 small{display:block;font-size:12px;color:#8a6a30;font-weight:700;margin-bottom:3px}
#gym .ev-itb .ib-pic{width:100px;height:100px;margin:0 auto;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#fff8d8 0,#ffe8a0 52%,rgba(255,232,160,0) 71%)}
#gym .ev-itb .ib-pic img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated;animation:evIbB 1.6s ease-in-out infinite}
#gym .ev-itb .ib-pic .egg{width:34px;height:42px;transform:scale(1.5)}
@keyframes evIbB{0%,100%{translate:0 0}50%{translate:0 -4px}}
#gym .ev-itb .ib-d{margin:0;font-size:13px;line-height:1.5;color:#505060;white-space:pre-line}#gym .ev-itb .ib-t{margin:0;font-size:11px;color:#a0a0b0}
#gym .ev-quit:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22)}
#gym .ev-fld.lock :is(.ev-pad,.ev-a,.ev-b,.ev-quit,.ev-pk){opacity:0;pointer-events:none}
#gym .ev-ask{position:absolute;inset:0;z-index:990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:0 24px}
#gym .ev-ask .win{max-width:320px;width:100%;padding:18px 16px 14px;text-align:center;display:flex;flex-direction:column;gap:12px}
#gym .ev-ask p{margin:0;font-size:15px;line-height:1.55;white-space:pre-line}#gym .ev-ask small{display:block;color:#707080;font-size:12px;margin-top:4px}
#gym .ev-ask .bt2{display:flex;gap:8px}#gym .ev-ask .bt2 button{flex:1}
#gym .ev-ask .gy-btns.one{display:flex}#gym .ev-ask .gy-btns.one button{flex:1}
#gym :is(.ev-ask,.ev-rw) button{font:inherit;font-size:15px;font-weight:700;padding:11px 8px;border:0;border-radius:10px;background:#e4e4ec;color:#303040;box-shadow:0 4px 0 #a8a8b8;transition:transform .05s,box-shadow .05s;-webkit-tap-highlight-color:transparent}
#gym :is(.ev-ask,.ev-rw) button.main{background:#3f8ee8;color:#fff;box-shadow:0 4px 0 #22589a}
#gym :is(.ev-ask,.ev-rw) button:active{transform:translateY(4px);box-shadow:0 0 0 transparent}
/* 보상 창 (v18.54 경완 '이벤트 해결 창 디자인 좀 더'): 승급 보상창처럼 빛 무대 + 이벤트 문장 + 되찾은 동료들 + 보상 줄 */
#gym .ev-rw{position:absolute;inset:0;z-index:990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:0 18px}
#gym .ev-rw>.win{max-width:340px;width:100%;padding:12px 12px 14px;text-align:center;animation:evRw .45s cubic-bezier(.2,1.4,.4,1) both}
@keyframes evRw{0%{opacity:0;transform:scale(.7)}100%{opacity:1;transform:none}}
#gym .ev-rw .rw-hd{position:relative;height:176px;margin:-6px -6px 4px;border-radius:6px;overflow:hidden;background:radial-gradient(circle at 50% 38%,var(--c1,#7a1c28) 0,var(--c2,#26070c) 62%,#0c0204 100%)}
#gym .ev-rw .rw-hd .bsa-ray{top:38%;width:320px;height:320px;margin:-160px 0 0 -160px}
#gym .ev-rw .rw-halo{position:absolute;left:50%;top:38%;width:130px;height:130px;margin:-65px;border-radius:50%;background:radial-gradient(circle,rgba(255,236,170,.6),transparent 70%);animation:bswPulse 2s ease-in-out infinite}
#gym .ev-rw .rw-emb{position:absolute;left:50%;top:38%;width:62px;height:62px;margin:-31px;border-radius:50%;display:grid;place-items:center;background:#f4f0f0;box-shadow:0 0 0 4px #c01828,0 4px 0 4px #6a0a12;font:900 40px/1 Arial,sans-serif;color:#c01828;animation:rwEmb .5s .1s ease-out both}
#gym .ev-rw .rw-emb img{width:44px;height:42px;image-rendering:pixelated}
#gym .ev-rw .rw-emb::after{content:'';position:absolute;left:50%;top:50%;width:84px;height:7px;margin:-3.5px 0 0 -42px;border-radius:4px;background:#222;box-shadow:0 0 0 2px #fff;transform:rotate(-40deg) scaleX(0);transform-origin:50% 50%;animation:rwCut .25s .75s ease-out forwards}   /* 취소선은 마크 한가운데를 지나게 (경완 2026-11-07) */
@keyframes rwEmb{0%{transform:scale(0) rotate(-30deg)}70%{transform:scale(1.15)}100%{transform:none}}
@keyframes rwCut{to{transform:rotate(-40deg) scaleX(1)}}
#gym .ev-rw .rw-stamp{position:absolute;left:50%;top:38%;margin:0 0 0 32px;padding:2px 9px 3px;border:3px solid #ffd84a;border-radius:6px;background:rgba(40,10,10,.55);color:#ffd84a;font-size:17px;font-weight:900;letter-spacing:2px;transform:rotate(-12deg);opacity:0;animation:rwStamp .35s 1.05s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes rwStamp{0%{opacity:0;transform:rotate(-12deg) scale(2.4)}100%{opacity:1;transform:rotate(-12deg) scale(1)}}
#gym .ev-rw .rw-crew{position:absolute;left:0;right:0;bottom:6px;display:flex;justify-content:center;align-items:flex-end;gap:2px}
#gym .ev-rw .rw-crew i{display:block;height:64px;background-repeat:no-repeat;image-rendering:pixelated;opacity:0;animation:rwIn .3s var(--d) ease-out forwards,rwHop .5s calc(var(--d) + 1.2s) ease-in-out 2}
#gym .ev-rw .rw-crew i.me{filter:drop-shadow(0 0 4px rgba(255,230,140,.9))}
@keyframes rwIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}
@keyframes rwHop{50%{transform:translateY(-8px)}}
#gym .ev-rw h4.pp-t{margin:6px 0 4px}
#gym .ev-rw .rw-msg{margin:0 0 10px;font-size:13px;line-height:1.5;color:#5a5060}
#gym .ev-rw .pk-ben{margin-bottom:12px}
#gym .ev-rw .pk-ben li{animation:rwIn .3s var(--d) ease-out both}
#gym .ev-rw .pk-ben .gold .pk-ic,#gym .ev-rw .pk-ben .fit .pk-ic{background:none;box-shadow:none}#gym .ev-rw .pk-ben .gold .pk-ic::before,#gym .ev-rw .pk-ben .fit .pk-ic::before{display:none}
#gym .ev-rw .pk-ben .gold .coin{position:static;display:block;width:18px;height:18px;margin:0;image-rendering:pixelated}
#gym .ev-rw .pk-ben .fit .pk-ic img{width:30px;height:30px;object-fit:contain;image-rendering:pixelated}
#gym .ev-rw .pk-ben .rep .pk-ic{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 13'%3E%3Cpath d='M6 0h1v2H6zM5 2h3v2H5zM0 4h13v1H0zM1 5h11v1H1zM2 6h9v1H2zM3 7h7v2H3zM2 9h9v1H2zM2 10h4v1H2zM7 10h4v1H7zM1 11h4v1H1zM8 11h4v1H8zM1 12h2v1H1zM10 12h2v1H10z'/%3E%3C/svg%3E")}#gym .ev-rw .pk-ben .rep .pk-ic::before{width:13px;height:13px}   /* 평판 별: 13칸 대칭 도트 별을 13px 그대로 (찌그러짐 고침) */
#gym .ev-rw .pk-ben small{display:block;font-size:11px;font-weight:400;color:#8a7a50}
#gym .ev-rw .rw-gn{font-variant-numeric:tabular-nums}
/* 새 의상 창 (v18.55 경완 '로켓단 제복은 옷 잘 보이게 새로운 창으로'): 빛 무대 위에 옷 입은 모습을 크게 */
#gym .ev-rw .fw-hd{height:210px;display:grid;place-items:center}
#gym .ev-rw .fw-hd .bsa-ray,#gym .ev-rw .fw-hd .rw-halo{top:50%}
#gym .ev-rw .fw-pic{position:relative;width:160px;height:160px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 6px 0 rgba(0,0,0,.35));animation:fwIn .55s .1s cubic-bezier(.2,1.5,.4,1) both}
@keyframes fwIn{0%{opacity:0;transform:translateY(24px) scale(.6)}100%{opacity:1;transform:none}}
#gym .ev-rw .fw-new{position:absolute;right:14px;top:12px;padding:2px 8px 3px;border-radius:6px;background:#ffd84a;color:#5a3a00;font-size:12px;font-weight:900;letter-spacing:1px;animation:rwStamp .35s .6s cubic-bezier(.3,1.6,.5,1) both}
/* v19.18 찾는 재미 (경완 2026-11-08): 따라다니는 관장 옆 포켓몬, 장애물, 손에 넣은 것 카드, 해결 창의 찾은 것 칸 */
#gym .ev-pal{position:absolute;pointer-events:auto;overflow:visible;cursor:pointer}
#gym .ev-pal .gp-sp{position:absolute;display:block;background-repeat:no-repeat;image-rendering:pixelated}
#gym .ev-pal .gp-sp.one{left:-25%;bottom:0;width:150%;height:150%;background-size:contain;background-position:50% 100%}
#gym .ev-pal .gp-sh{position:absolute;left:18%;right:18%;bottom:-4%;height:26%;border-radius:50%;background:rgba(20,40,10,.24)}
#gym .ev-ob{position:absolute;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none}
#gym .ev-ob.shk{animation:evShk .32s linear}
@keyframes evShk{0%,100%{translate:0 0}20%{translate:-3px 0}40%{translate:3px 0}60%{translate:-2px 0}80%{translate:2px 0}}
#gym .ev-ob.out{transition:opacity .35s,transform .35s;opacity:0;transform:scale(.6)}
#gym .ev-hit{position:absolute;width:24px;height:24px;margin:-12px;border-radius:50%;pointer-events:none;z-index:6000;background:radial-gradient(circle,#fff 0 30%,var(--hc,#ffe070) 31% 55%,transparent 56%);animation:evHit .38s ease-out forwards}
@keyframes evHit{0%{transform:scale(.3);opacity:1}100%{transform:scale(2.2);opacity:0}}
#gym .ev-got{position:absolute;left:50%;top:30%;z-index:12;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 18px 10px;pointer-events:none;animation:evGot .42s cubic-bezier(.2,1.5,.4,1) both}
#gym .ev-got .gt-ic{position:relative;width:56px;height:56px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#fff8d8 0,#ffe8a0 55%,rgba(255,232,160,0) 72%)}
#gym .ev-got .gt-ic img{width:40px;height:40px;object-fit:contain;image-rendering:pixelated}
#gym .ev-got .gt-ic .egg{width:34px;height:42px}
#gym .ev-got b{font-size:13px;color:#3a3040}
@keyframes evGot{0%{opacity:0;transform:translateX(-50%) translateY(14px) scale(.6)}100%{opacity:1;transform:translateX(-50%)}}
#gym .ev-rw .rw-fnd{margin:-4px 0 12px;padding:8px 6px 6px;border-radius:8px;background:rgba(120,90,40,.08);animation:rwIn .3s var(--d) ease-out both}
#gym .ev-rw .rw-fnd p{margin:0 0 6px;font-size:12px;font-weight:700;color:#6a5a40}
#gym .ev-rw .rw-fnd div{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
#gym .ev-rw .rw-fnd>div>i{position:relative;width:34px;height:34px;display:grid;place-items:center;border-radius:6px;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.12)}
#gym .ev-rw .rw-fnd>div>i>img{width:26px;height:26px;object-fit:contain;image-rendering:pixelated}
#gym .ev-rw .rw-fnd>div>i>.egg{width:22px;height:27px}   /* v19.52 경완: 타입 알 안쪽 lfx <i> 가 칸 모양(흰 네모)으로 커지던 것 */
#gym .ev-pw .ev-in{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #4a4a5a;border-radius:10px;font-family:inherit;font-size:20px;font-weight:700;text-align:center;background:#fff;color:#222;outline:none}#gym .ev-pw .ev-in:focus{border-color:#3a7ae0}
#gym .ev-fld .ev-rope{position:absolute;left:22%;right:22%;top:56%;height:20%;pointer-events:none;background:repeating-linear-gradient(170deg,#c89850 0 2px,#7a5428 2px 3px,transparent 3px 6px);border-top:1px solid #5a3a18;border-bottom:1px solid #5a3a18;opacity:.95}
#gym .ev-fld .ev-tv{position:absolute;pointer-events:none;background:linear-gradient(180deg,#d8f4ff,#78c8ff 60%,#4898e8);box-shadow:0 0 8px 3px rgba(140,210,255,.75);animation:evTv .22s steps(2) infinite}
@keyframes evTv{50%{filter:brightness(1.25)}}
#gym .ev-crt{position:absolute;left:50%;top:30%;z-index:995;width:216px;height:176px;margin-left:-108px;padding:10px;border-radius:14px;background:#2c2c34;box-shadow:0 0 0 3px #101014,0 6px 0 3px #08080a,0 0 30px rgba(80,160,255,.35);pointer-events:none}
#gym .ev-crt>div{position:relative;width:100%;height:100%;border-radius:10px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#2a4a6a,#0a1420 75%);transform-origin:50% 50%}
#gym .ev-crt img{position:absolute;left:50%;top:50%;width:160px;height:160px;margin:-84px 0 0 -80px;image-rendering:pixelated;filter:brightness(0) drop-shadow(0 0 2px rgba(120,190,255,.9)) drop-shadow(0 0 6px rgba(80,150,255,.6));opacity:.92}   /* v19.52 경완: 정체를 감춘 실루엣 */
#gym .ev-crt>div::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 4px);animation:evTv .18s steps(2) infinite}
#gym .ev-crt b{position:absolute;right:8px;top:6px;font:900 11px/1 Arial,sans-serif;color:#ff5060;letter-spacing:.5px}
`;
let cssOn = false;
const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };

// 장면 도구: 체육관 안(gymb/gym.js)에서 받은 함수로 만든다
function tools(I, def) {
  const root = I.root, $g = s => root.querySelector(s), g = I.st(), D = I.dz(), T = () => 16 * I.sc();
  const rOcc = [], rO = () => rOcc.filter(q => q[2].isConnected).map(q => [q[0], q[1]]);
  const A = {
    I, g, D, def, wait, anim,
    // 맵 위 사람 (본가 걸음 그림)
    npc: (ow, x, y, f = 'd') => I.ent({ ow, x, y, f, n3: I.N3.has(ow) }),
    // 칸 길찾기로 걸어가기 (길이 없으면 곧장)
    // 길이 없으면 움직이지 않는다 (가구·사람을 밟고 지나가던 것, 경완 2026-11-07). 닿으면 true
    walkTo: async (e, to, spd = 260, occ = []) => { const fx = Math.round(e.x), fy = Math.round(e.y); if (fx === to[0] && fy === to[1]) return true; const p = I.route(D, [fx, fy], to, [...I.occOf([e]), ...occ, ...rO()]); if (!p?.length) return false; await I.walk(e, p, spd); return true; },
    // 후보 칸 중 걸어서 갈 수 있는 첫 칸 (빈 바닥·소품·사람·석상 피해서)
    reach: (e, cands, occ = []) => { const O = [...I.occOf([e]), ...occ, ...rO()], K = q => q[0] + ',' + q[1], bad = new Set(O.map(K)); for (const c of cands) { if (D.free?.[c[1]]?.[c[0]] !== '1' || bad.has(K(c)) || (D.stat || []).some(q => q[0] === c[0] && q[1] === c[1])) continue; if (Math.round(e.x) === c[0] && Math.round(e.y) === c[1]) return c; const p = I.route(D, [Math.round(e.x), Math.round(e.y)], c, O); if (p?.length) return c; } return null; },   // 후보는 앞에 둔 칸이 먼저 (내 바로 앞 등). 고른 칸까지는 walkTo 가 최단 길로 (경완 2026-11-07 '최단 거리로 가니까 멀찍이 떨어져서 얘기')
    turn: (e, f) => { e.f = f; e.st = 0; I.place(e); },
    slide: (e, tx, ty, ms) => { const x0 = e.x, y0 = e.y; return anim(ms, q => { e.x = x0 + (tx - x0) * q; e.y = y0 + (ty - y0) * q; I.place(e); }); },
    // 머리 위 말풍선 ('!', '...')
    bub: (e, t, ms = 900, blink) => { const b = document.createElement('b'); b.className = 'tw-bub' + (blink ? ' blink' : ''); b.textContent = t;
      Object.assign(b.style, { left: (e.x * 16 + 8) * I.sc() + 'px', top: (e.y * 16 - 17) * I.sc() + 'px' }); $g('.gy-ents').appendChild(b); if (ms) setTimeout(() => b.remove(), ms); return b; },
    // 바닥에 놓는 로켓단 소품 (R 상자·깃발)
    rProp: (x, y, kind = 'box') => { const el = document.createElement('i'), s = I.sc(); el.className = 'ev-r' + (kind === 'flag' ? ' flag' : '');
      Object.assign(el.style, kind === 'flag' ? { left: x * 16 * s + 'px', top: (y * 16 - 14) * s + 'px', width: 16 * s + 'px', height: 30 * s + 'px', zIndex: y * 10 + 9 } : { left: (x * 16 + 1) * s + 'px', top: (y * 16 + 1) * s + 'px', width: 14 * s + 'px', height: 14 * s + 'px', zIndex: y * 10 + 8 });
      el.style.setProperty('--rf', 9 * s + 'px'); $g('.gy-ents').appendChild(el); rOcc.push([x, y, el]); return el; },   // R 상자·깃발 칸은 사람이 피해 감: 밟고 지나가며 R 글자 밑으로 걸어오던 것 (경완 2026-11-08)
    // 소품 그림 (gym/img/ev/<이벤트>/<k>.png): x,y = 왼쪽 아래 칸. 칸 폭만큼 사람이 못 지나감
    prop: (k, x, y) => new Promise(ok => { const src = `gym/img/ev/${def.id}/${k}.png?v=${VER}`, im = new Image(); im.onload = () => ok(I.addProp(src, x, y, im.width, im.height)); im.onerror = () => ok(null); im.src = src; }),
    size: k => new Promise(ok => { const im = new Image(); im.onload = () => ok([Math.ceil(im.width / 16), im.height]); im.onerror = () => ok([1, 16]); im.src = `gym/img/ev/${def.id}/${k}.png?v=${VER}`; }),
    // 빈 바닥 칸 (사람·소품·석상 빼고)
    freeTiles: (skip = []) => { const F = D.free || [], occ = new Set([...I.occOf(), ...(D.stat || []), ...skip].map(q => q[0] + ',' + q[1])), out = [];
      F.forEach((row, y) => [...row].forEach((c, x) => { if (c === '1' && !occ.has(x + ',' + y)) out.push([x, y]); })); return out; },
    // 카메라: 체육관 맵을 위에서 아래로 훑는다 (맵이 화면보다 크면 스크롤, 작으면 확대해서 훑기)
    pan: async (ms = 5200) => { const stg = $g('.gy-stage'), map = $g('.gy-map'), max = stg.scrollHeight - stg.clientHeight;
      if (max > 40) { stg.scrollTop = 0; await wait(400); await anim(ms, q => { stg.scrollTop = max * q; }); return; }
      const z = 1.6; map.style.transformOrigin = '50% 0%'; map.style.transform = `scale(${z})`; await wait(500);
      const a = map.animate([{ transformOrigin: '50% 0%', transform: `scale(${z})` }, { transformOrigin: '50% 100%', transform: `scale(${z})` }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }); await a.finished;
      await wait(250); const b = map.animate([{ transformOrigin: '50% 100%', transform: `scale(${z})` }, { transformOrigin: '50% 100%', transform: 'scale(1)' }], { duration: 900, easing: 'ease-in-out', fill: 'forwards' }); await b.finished;
      a.cancel(); b.cancel(); map.style.transform = ''; map.style.transformOrigin = ''; },
    // 그 칸이 화면 가운데쯤 오게 부드럽게 넘기기
    look: async (y, ms = 700) => { const stg = $g('.gy-stage'), max = stg.scrollHeight - stg.clientHeight; if (max <= 4) return; const map = $g('.gy-map');
      const to = Math.max(0, Math.min(max, map.offsetTop + (y + .5) * T() - stg.clientHeight * .42)), s0 = stg.scrollTop; if (Math.abs(to - s0) < 4) return; await anim(ms, q => { stg.scrollTop = s0 + (to - s0) * q; }); },
    shake: () => $g('.gy-map').animate([{ translate: '0 0' }, { translate: '-6px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }], { duration: 300 }),
    tint: on => { let t = $g('.ev-tint'); if (!t) { t = document.createElement('i'); t.className = 'ev-tint'; root.appendChild(t); void t.offsetWidth; } t.classList.toggle('on', on); },
    // 검은 화면 (글 두 줄을 띄울 수 있음): black(true, '큰 글', '작은 글') → 누르면 다음으로
    black: async (on, big, small, tap) => { let b = $g('.ev-black'); if (!b) { b = document.createElement('div'); b.className = 'ev-black'; b.innerHTML = '<b></b><span></span>'; root.appendChild(b); void b.offsetWidth; }
      if (!on) { b.classList.remove('txt'); b.classList.remove('on'); await wait(800); b.remove(); return; }
      b.classList.add('on'); await wait(850); if (big) { b.querySelector('b').textContent = big; b.querySelector('span').textContent = small || ''; b.classList.add('txt'); await wait(1300);
        if (tap) await new Promise(ok => { b.onclick = e => { e.stopPropagation(); I.sfx?.('tap'); b.onclick = null; ok(); }; }); b.classList.remove('txt'); await wait(600); } },
    // 이벤트 제목 띠
    title: async (big, sub, tag = 'EVENT') => { const t = document.createElement('div'); t.className = 'ev-ttl'; t.innerHTML = `<i>${I.esc(tag)}</i><b>${I.esc(big)}</b>${sub ? `<em>${I.esc(sub)}</em>` : ''}`; root.appendChild(t); await wait(3200); t.remove(); },
    music: (n, o) => { try { n ? window.GymBGM?.play(n, o) : window.GymBGM?.stop(.8); } catch (e) {} },
    se: (n, gn = 1) => I.gse(n, gn),
    fan: n => window.GymBGM?.fan?.(n),   // 팡파르: 배경 곡을 잠깐 줄이고 끝까지 (회복 소리 등)
    talk: () => I.storyTalk(),
    me: () => I.trName() || '관장',
    test: !!window.gymEvTest, retry: (g.ev?.try | 0) > 0 || !!g.ev?.seen?.[g.ev?.ch],   // 한 번 본 장(센터로 돌아갔다 다시 온 것 포함)은 장 제목·처음 대사 건너뜀
    lv: () => I.lv(),
    // 필드 맵 열기 (검은 화면 뒤에서 만들고 F.show 로 밝힌다)
    field: o => { const F = field(I, o); return F; },
    // 이벤트 배틀: o = { tr 그림, cls, nm, team [[종, 레벨]], tier, say {win,lose}, g 골드, music }. 이기면 true
    battle: async o => { const r = await I.battle(o); return !!(r?.won || r?.cut); },
    // 곧바로 까만 화면 (장을 이어서 시작할 때 체육관이 비치지 않게)
    blackNow: () => { let b = $g('.ev-black'); if (!b) { b = document.createElement('div'); b.className = 'ev-black'; b.innerHTML = '<b></b><span></span>'; root.appendChild(b); } b.style.transition = 'none'; b.classList.add('on'); void b.offsetWidth; b.style.transition = ''; },
    // 이벤트 보상 창: def.reward { g 골드, rep 평판, fit 의상 } 를 주고 보여 준다
    reward: () => new Promise(ok => { const R = def.reward || {}, f = I.myOw() === 'pt_f' ? 'f' : 'm', L = []; let d = 1.5; const dd = () => (d += .15).toFixed(2) + 's';
      if (R.g) { I.addG(R.g); L.push(`<li class="gold" style="--d:${dd()}"><i class="pk-ic"><i class="coin"></i></i><span>골드</span><em><b class="rw-gn">+0G</b></em></li>`); }
      if (R.rep) { I.addRep(R.rep); L.push(`<li class="rep" style="--d:${dd()}"><i class="pk-ic"></i><span>체육관 평판</span><em><b>+${R.rep}</b></em></li>`); }
      if (R.fit) I.giveFit(R.fit);   // 의상은 줄에 안 넣고 다음 새 의상 창에서만 보여 준다 (경완 2026-11-07)
      I.save(); I.renderTop?.(); I.glog?.('in', `이벤트 <b>${I.esc(def.nm)}</b>${'을'} 해결했다!`);
      // 무대 아래 줄: 나 + 되찾은 트레이너·안내원 (R.crew) 앞모습, 한 명씩 나타나 콩콩
      const crew = [], fw = k => I.owW?.(k) || 32; if (R.crew) { crew.push(['me', I.myOw()]); for (const s of (I.st().sf || []).slice(0, 6)) if (s.ow) crew.push(['', s.ow]); if (I.GUY_OW) crew.push(['', I.GUY_OW]); }
      const cH = crew.map(([c, k], n) => `<i class="${c}" data-ow="${I.esc(k)}" style="--d:${(.3 + n * .12).toFixed(2)}s;width:${fw(k) * 2}px;background-image:url(${I.owSrc(k)});background-size:auto 64px;background-position:0 0"></i>`).join('');
      const FD = (I.st().ev?.found || []), fnd = FD.length ? `<div class="rw-fnd" style="--d:${dd()}"><p>습득한 아이템 ${FD.length}개</p><div>${FD.map(f => `<i title="${I.esc(f.nm)}">${f.k === 'egg' ? I.eggIco?.(f.g) || '' : `<img alt="" src="${f.img}">`}</i>`).join('')}</div></div>` : '';   // v19.18: 알·상점 물건·선물 (이미 받아 둔 것)
      const w = document.createElement('div'); w.className = 'ev-rw gy-pop pp-pop rw-pop'; w.innerHTML = `<div class="win"><div class="rw-hd" style="${R.hd ? `--c1:${R.hd[0]};--c2:${R.hd[1]}` : ''}"><i class="bsa-ray"></i><i class="rw-halo"></i>${R.embImg ? `<b class="rw-emb"><img alt="" src="${R.embImg}"></b>` : R.emb ? `<b class="rw-emb">${I.esc(R.emb)}</b>` : ''}<b class="rw-stamp">해결!</b><div class="rw-crew">${cH}</div></div>
        <h4 class="pp-t"><small>이벤트 해결</small>${I.esc(def.nm)}</h4>${R.msg ? `<p class="rw-msg">${I.esc(R.msg).replace(/\n/g, '<br>')}</p>` : ''}<ul class="pk-ben">${L.join('')}</ul>${fnd}<div class="gy-btns one"><button type="button" class="main">좋아!</button></div></div>`;
      root.appendChild(w); I.haptic?.(1);
      I.fitSrc?.('ow').then(u => { const m = w.querySelector('.rw-crew .me'); if (u && m) m.style.backgroundImage = `url(${u})`; }).catch(() => {});
      setTimeout(() => { try { window.GymBGM?.se?.('DP_KON', { gain: 1.3 }); } catch (e) {} I.haptic?.(0); }, 1050);   // 해결! 도장 쾅
      setTimeout(() => { try { window.GymBGM?.fan ? window.GymBGM.fan('ME_FANFA5') : window.GymBGM?.se?.('ME_FANFA5'); } catch (e) {} I.confetti?.(); }, 1300);
      const gn = w.querySelector('.rw-gn'); if (gn) { const t0 = performance.now() + 1700, T = 900, f2 = now => { const q = Math.max(0, Math.min(1, (now - t0) / T)); gn.textContent = `+${Math.round(R.g * (1 - (1 - q) ** 3)).toLocaleString()}G`; if (q < 1 && gn.isConnected) requestAnimationFrame(f2); }; requestAnimationFrame(f2); }
      // 의상 보상은 해결 창을 닫으면 따로 크게 보여 준다 (경완 2026-11-07 '로켓단 제복은 옷 잘 보이게 새로운 창으로')
      const fitWin = () => new Promise(ok2 => { if (!R.fit) return ok2(); const v = document.createElement('div'); v.className = 'ev-rw gy-pop pp-pop rw-pop';
        v.innerHTML = `<div class="win"><div class="rw-hd fw-hd" style="${R.hd ? `--c1:${R.hd[0]};--c2:${R.hd[1]}` : ''}"><i class="rw-halo"></i><img class="fw-pic" alt="" src="gym/img/fit/${R.fit}_${f}.png?v=${VER}" onerror="this.onerror=null;this.src='${R.fitAlt ? R.fitAlt.replace('$', f) : ''}'"><b class="fw-new">NEW</b></div>
          <h4 class="pp-t"><small>새 의상을 받았다!</small>${I.esc(R.fitNm || '새 의상')}</h4><p class="rw-msg">상점 › 의상에서 언제든 갈아입을 수 있어요</p><div class="gy-btns one"><button type="button" class="main">좋아!</button></div></div>`;
        root.appendChild(v); try { window.GymBGM?.se?.('DP_KIRAKIRA2'); } catch (e) {} I.haptic?.(0);
        v.querySelector('button').onclick = e => { e.stopPropagation(); I.sfx?.('tap'); v.remove(); ok2(); }; });
      w.querySelector('button').onclick = e => { e.stopPropagation(); I.sfx?.('tap'); w.remove(); fitWin().then(ok); }; }),
    // ---- 손에 넣기 (v19.18 경완 2026-11-08 '알을 줍는 즐거움·상점 아이템 발견·NPC 선물'): 알 또는 상점 물건 하나 ----
    // it = { k:'egg', g 등급 } 또는 { kinds:['it','mint','deco'], cap 골드 } (안 가진 것 중 하나를 그 자리에서 고름). key 를 주면 이 이벤트에서 한 번만
    // 받은 건 g.ev.found 에 모아 두었다가 해결 창에 한꺼번에 보여 준다. 운영자 시험이면 실제로는 아무것도 안 줌
    has: key => !!(g.ev?.got || {})[key],
    mark: key => { const ev = g.ev || (g.ev = {}); ev.got = ev.got || {}; ev.got[key] = 1; I.save(); },
    got: async (S, it, o = {}) => { const ev = g.ev || (g.ev = {}); ev.got = ev.got || {}; ev.found = ev.found || []; if (o.key && ev.got[o.key]) return null;
      let L; if (it.k === 'x') L = { k: 'x', nm: it.nm, img: it.img, d: it.d };
      else if (it.k === 'egg') { L = { k: 'egg', g: it.g || 1, nm: `${I.tyNm?.() || ''} 타입 ${I.eggGn?.(it.g || 1) || ''} 알`.trim() }; I.giveEgg?.(L.g, o.from || def.nm); }
      else { L = await I.loot?.(it.kinds, it.cap, ev.found.map(f => f.id)); if (!L) L = await I.loot?.(['mint'], 0, ev.found.map(f => f.id)); if (!L) return null; I.giveLoot?.(L); }
      if (o.key) ev.got[o.key] = 1; if (L.k !== 'x') ev.found.push({ k: L.k, g: L.g, id: L.id, nm: L.nm, img: L.img }); I.save();
      // 가운데 창: 체육관 상점 그림 + 효과 (경완 2026-11-08 '아이템 주웠을 때는 상점 스프라이트, 중앙 박스에 효과랑 같이'). 저절로 뜨는 창이라 버튼으로만 닫힘 + 팝업 모션 + 팡파르
      const d = L.k === 'x' ? L.d || '' : L.k === 'egg' ? `부화하면 ${I.tyNm?.() || ''} 타입 포켓몬이 태어나요.` : `${L.d || ''}${L.d && !A.test ? '\n체육관 창고에 넣었어요.' : ''}`;
      try { window.GymBGM?.fan ? window.GymBGM.fan(L.k === 'egg' ? 'ME_FANFA3' : 'ME_FANFA4') : window.GymBGM?.se?.('ME_FANFA4'); } catch (e) {} I.haptic?.(1);
      await new Promise(ok => { const w = document.createElement('div'); w.className = 'ev-ask ev-itb';
        w.innerHTML = `<div class="win"><h4><small>${o.giver ? `${I.esc(o.giver)}에게서 받았다!` : '손에 넣었다!'}</small>${I.esc(L.nm)}</h4><i class="ib-pic">${L.k === 'egg' ? I.eggIco?.(L.g) || '' : `<img alt="" src="${L.img}">`}</i><p class="ib-d">${I.esc(d)}</p>${A.test && L.k !== 'x' ? '<p class="ib-t">운영자 시험이라 실제로는 안 받아요</p>' : ''}<div class="gy-btns one"><button type="button" class="main" data-a="1">좋아!</button></div></div>`;
        root.appendChild(w); const t0 = performance.now(); w.onclick = e => { const b = e.target.closest('button'); if (!b || performance.now() - t0 < 500) return; e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(); }; });
      return L; },
    // 같이 다니는 포켓몬: 고른 것(넣어 두면 없음)을 이 이벤트 동안 기억 (운영자 시험이면 체육관 관장 옆 포켓몬은 안 바뀜)
    pal: () => { const ev = g.ev || {}; if (ev.palOff) return null; const L = I.luAll?.() || []; return (ev.pal && L.find(P => P.id === ev.pal)) || I.pal(); },
    setPal: P => { const ev = g.ev || (g.ev = {}); ev.palOff = P ? 0 : 1; if (P) { ev.pal = P.id; I.setPal?.(P.id); } I.save(); },
    // 지면 이 장 처음부터 (벌 없음, 경완 2026-11-07)
    whiteout: async () => { A.music(null); await A.black(true, '눈앞이 캄캄해졌다...!', '서둘러 돌담시티 포켓몬 센터로\n돌아갔다...', true); return 'wo'; },
    woTake: () => { const v = g.ev?.wo; if (g.ev) delete g.ev.wo; return !!v; },
    lose: async () => { A.music(null); await A.black(true, '눈앞이 캄캄해졌다...!', '이 장의 처음부터 다시 도전해요.\n(잃는 것은 없어요)', true); return 'again'; },
  };
  return A;
}

// ---------- 필드 모험 (경완 2026-11-07 '본가처럼 밖으로 나가 캐릭터 이동', 화면 방향 패드) ----------
// 이동·문·턱·지붕 덮기는 본가(FRLG pret 디컴파일) 규칙대로 (경완 2026-11-07 '본가 에뮬에서 뜯어올 순 없어?'):
//   한 칸 16프레임(≈267ms) 걷기, 멈춰 있을 때 다른 방향을 누르면 제자리에서 돌고(8프레임) 계속 누르면 걷기,
//   턱(v^<>)은 그 방향으로만 두 칸 뛰어내림, 문 칸으로 걸어 들어가면 문 열림 3장(4프레임씩) → 들어가서 닫힘 → 암전,
//   건물 안 매트는 그 위에서 아래를 누르면 밖으로, 카운터(c) 너머 사람에게 말 걸기, 지붕·벽 윗부분(본가 NORMAL 위층)은 사람 위에 덮기
// o = { nm, img 바닥 그림, over 덮는 층 그림, w·h, col 칸 줄들, door {"x,y": 문 종류}, doorImg 종류→그림 주소, warps [{x,y,d,id | to,at:[x,y,f],pre}], rooms { id: 같은 모양 } }
//   col 글자: . 걸음  # 막힘  c 카운터  v ^ < > 턱. 그 밖의 글자도 막힘
// 걸음 그림 칸: 0 아래 1 위 2 왼쪽 3·4 아래 걷기 5·6 위 걷기 7·8 왼쪽 걷기 (오른쪽은 뒤집기)
const FR = { d: [0, 3, 4], u: [1, 5, 6], l: [2, 7, 8], r: [2, 7, 8] }, DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }, OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
const LEDGE = { d: 'v', u: '^', l: '<', r: '>' }, WALK = 267, RUN = 133, TURN = 133, JUMP = 533, DOORF = 67;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function field(I, o) {
  const root = I.root, W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight, k = Math.max(2, Math.round(W / (12 * 16) * 4) / 4);
  const el = document.createElement('div'); el.className = 'gy-town ev-fld lock';
  el.innerHTML = `<div class="tw-map"><i class="ev-ov"></i></div><b class="ev-loc">${I.esc(o.nm || '')}</b><i class="ev-fade"></i>
    <div class="ev-pad">${['u', 'l', 'r', 'd'].map(d => `<button type="button" data-d="${d}" aria-label="${({ u: '위', d: '아래', l: '왼쪽', r: '오른쪽' })[d]}"></button>`).join('')}</div><button type="button" class="ev-a" aria-label="말 걸기">A</button><button type="button" class="ev-b" aria-label="달리기">달리기</button><button type="button" class="ev-quit">나가기</button><button type="button" class="ev-pk" aria-label="같이 다니는 포켓몬">포켓몬</button>`;
  try { const gm = root.querySelector('.gy-main')?.getBoundingClientRect(), rb = root.getBoundingClientRect(); if (gm && gm.height) root.style.setProperty('--evmb', Math.round(rb.bottom - gm.bottom + 8) + 'px'); } catch (e) {}
  root.appendChild(el); const map = el.firstElementChild, ov = map.firstElementChild, fade = el.querySelector('.ev-fade'), pad = el.querySelector('.ev-pad'), aB = el.querySelector('.ev-a');
  const F = { el, map, k, sps: [], obs: [], hid: [], pl: null, hold: null, aQ: false, quitQ: false, me: null, follow: true, warps: [], block: new Set(), cur: 'main', rooms: Object.assign({}, o.rooms || {}) };
  F.rooms.main = { nm: o.nm, img: o.img, over: o.over, w: o.w, h: o.h, col: o.col, cov: o.cov, door: o.door, warps: o.warps || [] };
  // 덮는 층(지붕·나무 윗부분)이 있는 칸: cov 줄('1' 덮임). 발 칸과 그 위 칸이 안 덮였으면 덮는 층 위에 그린다 — 키 큰 관장 옆 포켓몬 머리가 지붕 밑으로 잘리던 것 (경완 2026-11-08)
  // 덮는 층은 칸 줄마다 따로 (줄 r 의 지붕·나무 윗부분 = z r*10+9): 그 줄이나 위에 발이 있으면 덮이고, 아래 줄 사람·포켓몬은 그 위에 그려짐. 키 큰 포켓몬 머리가 지붕 밑으로 잘리던 것, 사람끼리 앞뒤가 뒤바뀌던 것 (경완 2026-11-08)
  const zOf = (x, y, off) => Math.round(y * 10) + off;
  const ovRows = m => { map.querySelectorAll('.ev-ovr').forEach(e => e.remove()); if (!m.over || !m.cov) { ov.style.backgroundImage = m.over ? `url(${m.over})` : 'none'; return; } ov.style.backgroundImage = 'none';
    m.cov.forEach((r, y) => { if (!r.includes('1')) return; const e = document.createElement('i'); e.className = 'ev-ovr'; Object.assign(e.style, { top: y * 16 * k + 'px', height: 16 * k + 'px', width: m.w * 16 * k + 'px', backgroundImage: `url(${m.over})`, backgroundSize: `${m.w * 16 * k}px ${m.h * 16 * k}px`, backgroundPosition: `0 ${-y * 16 * k}px`, zIndex: y * 10 + 9 }); map.appendChild(e); }); };
  let cx = 0, cy = 0, col = o.col, doors = {};
  // 방(맵) 바꾸기: 그림·충돌·문·출입구를 그 방 것으로, 다른 방 사람은 숨김
  F.setMap = id => { const m = F.rooms[id]; F.cur = id; o.w = m.w; o.h = m.h; col = m.col; F.warps = m.warps || []; F.doorAt = m.door || {}; F.block = m.block || (m.block = new Set());
    Object.assign(map.style, { width: m.w * 16 * k + 'px', height: m.h * 16 * k + 'px', backgroundImage: `url(${m.img})` }); ovRows(m);
    Object.values(doors).forEach(d => d.remove()); doors = {}; map.querySelectorAll('.tw-bub').forEach(b => b.remove());
    F.sps.forEach(s => { if (s !== F.me) s.el.style.display = (s.room || 'main') === id ? '' : 'none'; }); if (F.me) F.cam(F.me.x, F.me.y); F.obs.forEach(b => { b.el.style.display = b.room === id ? '' : 'none'; b.put?.(); }); map.querySelectorAll('.ev-pic').forEach(e => { e.style.display = (e.dataset.room || 'main') === id ? '' : 'none'; }); F.sps.forEach(s => s.put?.()); };   // 방마다 그림(계단·발자국·모자): 다른 방에 비치던 것
  F.cam = (x, y) => { cx = x; cy = y; const mw = o.w * 16 * k, mh = o.h * 16 * k, X = mw <= W ? (mw - W) / 2 : clamp((x * 16 + 8) * k - W / 2, 0, mw - W), Y = mh <= H ? (mh - H) / 2 : clamp((y * 16 + 8) * k - H * .42, 0, mh - H); map.style.transform = `translate(${-Math.round(X)}px,${-Math.round(Y)}px)`; };
  F.camTo = (x, y, ms = 700) => { const x0 = cx, y0 = cy; return anim(ms, q => F.cam(x0 + (x - x0) * q, y0 + (y - y0) * q)); };
  F.camMe = (ms = 500) => F.camTo(F.me.x, F.me.y, ms).then(() => { F.follow = true; });
  F.warpAt = (x, y) => F.warps.find(w => w.x === x && w.y === y && !w.off);
  const here = s => s === F.me || (s.room || 'main') === F.cur;
  const at = (s, x, y) => s.on && !s.el.hidden && here(s) && Math.round(s.x) === x && Math.round(s.y) === y;
  const cAt = (x, y) => x < 0 || y < 0 || x >= o.w || y >= o.h ? '#' : col[y][x];
  F.who = (x, y) => F.sps.find(s => s !== F.me && at(s, x, y));
  F.solid = (x, y, who) => cAt(x, y) !== '.' || F.block.has(x + ',' + y) || F.sps.some(s => s !== who && (at(s, x, y) || (s.res && s.on && here(s) && s.res[0] === x && s.res[1] === y)));
  // 마을 사람이 제자리 근처(r 칸)를 어슬렁거린다 (경완 2026-11-07 '마을 사람들 좀 움직이고 있게'). 자유롭게 걷는 동안만
  F.wander = (s, r = 2) => { s.home = [s.x, s.y]; s.wr = r; s.wt = performance.now() + 800 + Math.random() * 2500; return s; };
  const wanderTick = now => { for (const s of F.sps) { if (!s.wr || s.wb || now < s.wt || !s.on || s.el.hidden || !here(s)) continue; s.wt = now + 1600 + Math.random() * 3200;
    const d = 'udlr'[Math.random() * 4 | 0], [dx, dy] = DIR[d], nx = Math.round(s.x) + dx, ny = Math.round(s.y) + dy, m = F.me;
    if (Math.random() < .35 || Math.abs(nx - s.home[0]) > s.wr || Math.abs(ny - s.home[1]) > s.wr || F.solid(nx, ny, s) || F.warpAt(nx, ny) || Math.abs(nx - Math.round(m.x)) + Math.abs(ny - Math.round(m.y)) < 2) { s.turn(d); continue; }
    s.wb = true; s.go([[nx, ny]], WALK).then(() => { s.wb = false; }); } };
  // 맵 위 사람: ow 키(본가 걸음 그림) 또는 그림 주소. o2.room = 어느 방에 있는지 (기본 지금 방)
  F.npc = (ow, x, y, f = 'd', o2 = {}) => { const src = /[/.]/.test(ow) ? ow : I.owSrc(ow), fw = o2.fw || (/[/.]/.test(ow) ? 32 : I.owW(ow)); const s = Object.assign({ x, y, f, st: 0, on: true, fw, hop: 0, room: F.cur, el: document.createElement('i') }, o2); s.fw = fw; s.el.className = 'tw-sp'; map.appendChild(s.el);   // o2.fw 가 0 이면 폭 0 으로 덮여 건물 안 사람들이 안 보이던 것 (v19.29)
    s.put = () => { const fr = FR[s.f][s.st]; Object.assign(s.el.style, { width: s.fw * k + 'px', height: 32 * k + 'px', left: (s.x * 16 - (s.fw - 16) / 2) * k + 'px', top: (s.y * 16 - 16 - s.hop) * k + 'px', zIndex: s.top ? 5900 : zOf(s.x, s.y, 2), backgroundImage: `url(${s.src || src})`, backgroundSize: `auto ${32 * k}px`, backgroundPosition: `${-fr * s.fw * k}px 0` }); s.el.classList.toggle('flip', s.f === 'r'); if (s === F.me && F.follow) F.cam(s.x, s.y); };
    s.go = async (pts, ms = 210) => { let n = s.n || 0; for (const [tx, ty] of pts) while (s.x !== tx || s.y !== ty) {
      const dx = Math.sign(tx - s.x), dy = dx ? 0 : Math.sign(ty - s.y), x0 = s.x, y0 = s.y; s.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u'; n++; s.res = [x0 + dx, y0 + dy]; if (s === F.me) F.trail(x0, y0, ms);   // 가는 칸은 미리 잡아 둔다 (둘이 한 칸에 겹치지 않게). 관장 옆 포켓몬은 내가 있던 칸으로
      await anim(ms, (e, q) => { s.x = x0 + dx * q; s.y = y0 + dy * q; s.st = q < .5 ? (n % 2 ? 1 : 2) : 0; s.put(); });
      s.x = x0 + dx; s.y = y0 + dy; s.res = null; } s.n = n; s.st = 0; s.put(); };
    // 본가 턱 뛰어내리기: 두 칸을 32프레임에 포물선으로
    s.jump = async d => { const [dx, dy] = DIR[d], x0 = s.x, y0 = s.y; s.f = d; I.gse?.('se_ledge'); if (s === F.me) F.trail(x0 + dx, y0 + dy, JUMP, 1);
      await anim(JUMP, (e, q) => { s.x = x0 + dx * 2 * q; s.y = y0 + dy * 2 * q; s.hop = Math.sin(q * Math.PI) * 10; s.st = q < .5 ? 1 : 2; s.put(); }); s.x = x0 + dx * 2; s.y = y0 + dy * 2; s.hop = 0; s.st = 0; s.put(); };
    s.turn = f => { s.f = f; s.st = 0; s.put(); };
    s.face = t => { const dx = t.x - s.x, dy = t.y - s.y; s.turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); };
    s.slide = (tx, ty, ms) => { const x0 = s.x, y0 = s.y; return anim(ms, q => { s.x = x0 + (tx - x0) * q; s.y = y0 + (ty - y0) * q; s.put(); }); };
    s.gone = async () => { s.el.classList.add('gone'); await wait(380); s.on = false; s.el.hidden = true; };
    if (!here(s)) s.el.style.display = 'none';
    F.sps.push(s); s.put(); return s; };
  F.bub = (s, t, ms = 900) => { const b = document.createElement('b'); b.className = 'tw-bub'; b.textContent = t; Object.assign(b.style, { left: (s.x * 16 + 8) * k + 'px', top: (s.y * 16 - 17) * k + 'px' }); map.appendChild(b); if (ms) setTimeout(() => b.remove(), ms); return b; };
  // 그림 한 장을 맵 칸에 (비밀 계단 등). z: 'floor' 바닥(사람 밑) / 'top' 사람 위
  F.pic = (src, x, y, w = 16, h = 16, z = 'floor', room = F.cur) => { const e = document.createElement('i'); e.className = 'ev-pic'; e.dataset.room = room; if (room !== F.cur) e.style.display = 'none'; Object.assign(e.style, { left: x * 16 * k + 'px', top: y * 16 * k + 'px', width: w * k + 'px', height: h * k + 'px', backgroundImage: `url(${src})`, zIndex: z === 'top' ? 5001 : 1 }); map.appendChild(e); return e; };
  // ---- 관장 옆 포켓몬이 따라 걷는다 (v19.18 경완 2026-11-08 '따라다니는 관장 옆 포켓몬의 능력을 활용하는 즐거움') ----
  // 내 걸음마다 내가 있던 칸으로, 방이 바뀌면 내 칸에 숨어 있다가 다음 걸음에 나온다. 사람처럼 막지는 않는다 (본가 따라다니기처럼 지나갈 수 있음)
  const PAN = { d: ['WalkD', 'Walk'], u: ['WalkN', 'WalkUp', 'Walk'], l: ['WalkS', 'Walk'], r: ['WalkS', 'Walk'] }, PID = { d: ['Idle'], u: ['IdleU', 'Idle'], l: ['IdleS', 'Idle'], r: ['IdleS', 'Idle'] };
  F.palOff = () => { if (F.pl) { F.pl.el.remove(); F.pl = null; } };
  F.palOn = async (P, side) => { F.palOff(); if (!P || !F.me) return null; const e = document.createElement('i'); e.className = 'ev-pal'; e.innerHTML = '<i class="gp-sh"></i><i class="gp-sp"></i>'; map.appendChild(e);
    const m = F.me, mx = Math.round(m.x), my = Math.round(m.y), [bx, by] = DIR[m.f] || [0, 1], free = q => !F.solid(q[0], q[1], m) && !F.warpAt(q[0], q[1]);
    // side: 내 옆 칸(왼쪽·오른쪽 먼저)에 나와서 나를 본다 (처음 나올 때·바꿀 때). 아니면 내 뒤 칸
    const C = side ? [[mx + 1, my], [mx - 1, my], [mx, my + 1], [mx, my - 1]] : [[mx - bx, my - by]], at = C.find(free) || [m.x, m.y];
    const p = F.pl = { P, el: e, sp: e.lastChild, x: at[0], y: at[1], f: side ? (at[0] < mx ? 'r' : at[0] > mx ? 'l' : at[1] > my ? 'u' : 'd') : m.f, mv: 0, hop: 0, dx: 0, dy: 0, an: null, t0: 0, one: null, nm: I.monNm?.(P) || '포켓몬' };
    p.put = () => { const mm = F.me; Object.assign(e.style, { left: (p.x + p.dx) * 16 * k + 'px', top: ((p.y + p.dy) * 16 - p.hop) * k + 'px', width: 16 * k + 'px', height: 16 * k + 'px', zIndex: p.top ? 5950 : zOf(p.x + p.dx, p.y + p.dy, 1) });
      e.hidden = !p.mv && !p.act && Math.round(p.x) === Math.round(mm.x) && Math.round(p.y) === Math.round(mm.y); };
    e.style.visibility = 'hidden';   // 그림을 다 불러오기 전엔 숨김: 그림자만 먼저 나오던 것 (경완 2026-11-08)
    e.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (el.classList.contains('lock') || p.act) return; I.sfx?.('tap'); F.pkQ = true; });   // 포켓몬을 눌러도 바꾸기 (경완 2026-11-08)
    p.put(); let M = null; try { M = await I.pmd(P.sp, P.sex); } catch (x) {} e.style.visibility = ''; if (F.pl !== p || !M) return p;
    if (P.shiny) p.sp.style.filter = `hue-rotate(${I.shinyHue?.(P.sp) || 0}deg)`;
    if (!M.P) { p.sp.classList.add('one'); p.sp.style.backgroundImage = `url("${M.img}")`; const lp = () => { if (F.pl !== p || !e.isConnected) return; p.put(); p.sp.style.transform = p.f === 'r' ? 'scaleX(-1)' : ''; requestAnimationFrame(lp); }; requestAnimationFrame(lp); return p; }
    const kk = k / 2, s = M.s * kk, lift = (I.lift?.(P.sp) || 0) * kk, A = M.P.a, pick = L => L.find(n => A[n]) || 'Idle';
    const loop = now => { if (F.pl !== p || !e.isConnected) return; p.put();
      let nm = p.one && A[p.one] ? p.one : pick((p.mv ? PAN : PID)[p.f] || ['Idle']);
      if (nm !== p.an) { p.an = nm; p.t0 = now; const a = A[nm] || A.Idle;
        Object.assign(p.sp.style, { backgroundImage: `url("${M.P.i}")`, backgroundSize: `${M.wh[0] * s}px ${M.wh[1] * s}px`, width: a[1] * s + 'px', height: a[2] * s + 'px', left: (8 * k - a[4] * s) + 'px', top: (16 * k - (a[5] + (M.P.fy || 0)) * s - lift) + 'px', transformOrigin: `${a[4] * s}px 50%` }); I.shBg?.(p.sp, P, M.P.i); }
      const a = A[p.an] || A.Idle, du = a[6], tot = du.reduce((x, d) => x + d, 0) / 60; let t = (now - p.t0) / 1000;
      if (p.one && t >= tot) { p.one = null; const f = p.oneDone; p.oneDone = null; f?.(); requestAnimationFrame(loop); return; }
      t %= tot; let f = du.length - 1; for (let i = 0, c = 0; i < du.length; i++) { c += du[i] / 60; if (t < c) { f = i; break; } }
      p.sp.style.backgroundPosition = `${-f * (a[1] + (M.P.G || 0)) * s}px ${-a[0] * s}px`; p.sp.style.transform = p.f === 'r' ? 'scaleX(-1)' : '';
      p.sp.style.translate = lift > 2 * kk ? `0 ${(Math.sin(now / 260) * 4 * kk).toFixed(1)}px` : ''; requestAnimationFrame(loop); };
    requestAnimationFrame(loop); return p; };
  F.palSet = P => F.palOn(P);
  // 야생 포켓몬이 톡 튀어나와 길을 따라 달아난다 (v19.52 경완 '상자에서 꼬렛이 나와서 도망치게'). path = [[x,y],...], ms = 한 칸
  F.monRun = async (sp, x, y, path, ms = 140) => { const e = document.createElement('i'); e.className = 'ev-pal'; e.innerHTML = '<i class="gp-sh"></i><i class="gp-sp"></i>'; map.appendChild(e); const sq = e.lastChild;
    let M = null; try { M = await I.pmd(sp, 'M'); } catch (x2) {} if (!M?.P) { e.remove(); return; }
    const o = { x, y, f: 'd' }, kk = k / 2, sc = M.s * kk, A2 = M.P.a, pick = L => L.find(n => A2[n]) || 'Idle'; let an = null, t0 = 0, mv = 0, live = true;
    const put = () => Object.assign(e.style, { left: o.x * 16 * k + 'px', top: o.y * 16 * k + 'px', width: 16 * k + 'px', height: 16 * k + 'px', zIndex: zOf(o.x, o.y, 1) });
    const loop = now => { if (!live || !e.isConnected) return; put(); const nm = pick((mv ? PAN : PID)[o.f] || ['Idle']);
      if (nm !== an) { an = nm; t0 = now; const a = A2[nm]; Object.assign(sq.style, { backgroundImage: `url("${M.P.i}")`, backgroundSize: `${M.wh[0] * sc}px ${M.wh[1] * sc}px`, width: a[1] * sc + 'px', height: a[2] * sc + 'px', left: (8 * k - a[4] * sc) + 'px', top: (16 * k - (a[5] + (M.P.fy || 0)) * sc) + 'px', transformOrigin: `${a[4] * sc}px 50%` }); }
      const a = A2[an], du = a[6], tot = du.reduce((q, d) => q + d, 0) / 60, t = ((now - t0) / 1000) % tot; let f = du.length - 1; for (let i = 0, c = 0; i < du.length; i++) { c += du[i] / 60; if (t < c) { f = i; break; } }
      sq.style.backgroundPosition = `${-f * (a[1] + (M.P.G || 0)) * sc}px ${-a[0] * sc}px`; sq.style.transform = o.f === 'r' ? 'scaleX(-1)' : ''; requestAnimationFrame(loop); };
    put(); requestAnimationFrame(loop); I.cry?.(sp);
    await anim(260, (e2, q) => { e.style.translate = `0 ${-Math.sin(q * Math.PI) * 10 * k}px`; }); e.style.translate = ''; await wait(250);
    for (const [nx, ny, j] of path) { const x0 = o.x, y0 = o.y; o.f = nx > x0 ? 'r' : nx < x0 ? 'l' : ny > y0 ? 'd' : 'u'; mv = 1; const n = Math.max(Math.abs(nx - x0), Math.abs(ny - y0)) || 1;   // j: 뛰어넘기 (사람 머리 위로)
      if (j) I.gse?.('se_ledge', .7);
      await anim(ms * n * (j ? 2 : 1), (e2, q) => { o.x = x0 + (nx - x0) * q; o.y = y0 + (ny - y0) * q; if (j) e.style.translate = `0 ${-Math.sin(q * Math.PI) * 18 * k}px`; }); e.style.translate = ''; o.x = nx; o.y = ny; }
    await e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.catch(() => {}); live = false; e.remove(); };
  // 몬스터볼에서 나오듯 옆에 톡 나와서 나를 보며 울음소리 + 동작 (경완 2026-11-08 '관장 옆으로 나와서 관장 보면서 울음소리랑 같이 동작')
  F.palOut = async P => { const p = await F.palOn(P, true); if (!p) return null; const m = F.me; m.face?.(p);
    p.el.animate([{ opacity: 0, transform: 'scale(.2)', filter: 'brightness(3)' }, { opacity: 1, transform: 'scale(1.1)', filter: 'brightness(1.6)', offset: .6 }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 420, easing: 'ease-out' });
    I.gse?.('DP_BOWA2', .8); await wait(380); I.cry?.(P.sp); F.palFace(m); p.one = 'Hop'; I.haptic?.(0); await wait(1000); return p; };
  // 기뻐하기: 말풍선 + 두 번 콩콩 (경완 2026-11-08 '포켓몬 말풍선 및 기뻐하는 동작')
  F.palJoy = async (t = '♪') => { const p = F.pl; if (!p) return; F.bub(p, t, 1300); I.cry?.(p.P.sp); I.haptic?.(0);
    for (let i = 0; i < 2; i++) { p.one = 'Hop'; await anim(300, (e2, q) => { p.hop = Math.sin(q * Math.PI) * 7; p.put(); }); p.hop = 0; await wait(80); } await wait(300); };
  // 넣어 두기: 빛나며 작아져 사라짐
  F.palIn = async () => { const p = F.pl; if (!p) return; I.gse?.('DP_SUIKOMU', .8); await p.el.animate([{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'scale(.2)', filter: 'brightness(3)' }], { duration: 320, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}); F.palOff(); };
  // 같이 다니는 포켓몬 고르기 (라인업에서, 넣어 두기도 됨). 고르면 F.onPal(P 또는 null)
  F.palPick = async () => { await I.ldB?.(); const L = I.luAll?.() || [], cur = F.pl?.P;
    if (!L.length) { await F.ask('같이 다닐 수 있는 포켓몬이 없어요.', '체육관 라인업에 포켓몬을 넣어 주세요.', '확인', ''); return; }
    // 라인업 1·2·3 탭 (경완 2026-11-08). 지금 포켓몬이 든 라인업이 먼저
    const T = (I.lus?.() || []).map((q, i) => ({ i, L: q })).filter(t => t.L.length); if (!T.length) T.push({ i: 0, L });
    let ti = Math.max(0, T.findIndex(t => cur && t.L.some(P => P.id === cur.id)));
    const a = await new Promise(ok => { const w = document.createElement('div'); w.className = 'ev-ask ev-pkw';
      const grid = t => `<div class="lu-pick">${t.L.map(P => `<button type="button" data-a="${P.id}" class="${cur && cur.id === P.id ? 'on' : ''}">${I.thumb?.(P) || ''}<b>${I.esc(I.monNm?.(P) || '')}</b><span>Lv.${I.lvOf?.(P) || ''}</span></button>`).join('')}</div>`;
      const draw = () => { w.innerHTML = `<div class="win"><h4>같이 다니는 포켓몬</h4>${T.length > 1 ? `<div class="pk-tabs">${T.map((t, j) => `<button type="button" data-t="${j}" class="${j === ti ? 'on' : ''}">라인업 ${t.i + 1}</button>`).join('')}</div>` : ''}${grid(T[ti])}<div class="bt2 gy-btns"><button type="button" data-a="off"${cur ? '' : ' disabled'}>넣어 두기</button><button type="button" data-a="x">닫기</button></div></div>`; I.fillTh?.(w); };
      draw(); root.appendChild(w); I.gse?.('DP_WIN_OPEN', .8);
      w.onclick = e => { if (e.target === w) { I.sfx?.('tap'); w.remove(); ok('x'); return; } const tb = e.target.closest('button[data-t]'); if (tb) { e.stopPropagation(); I.sfx?.('tap'); ti = +tb.dataset.t; draw(); return; }
        const b = e.target.closest('button[data-a]'); if (!b) return; e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(b.dataset.a); }; });   // 직접 연 창이라 바깥 눌러도 닫힘
    if (a === 'x') return;
    if (a === 'off') { if (!F.pl) return; await F.palIn(); F.onPal?.(null); return; }
    const Q = L.find(P => String(P.id) === a); if (!Q || (cur && cur.id === Q.id)) return;
    if (F.pl) await F.palIn(); await F.palOut(Q); F.onPal?.(Q); };
  F.trail = (tx, ty, ms, hop) => { const p = F.pl; if (!p || p.act) return; const x0 = p.x, y0 = p.y, dx = tx - x0, dy = ty - y0; if (!dx && !dy) return;
    if (Math.abs(dx) + Math.abs(dy) > 2.01) { p.x = tx; p.y = ty; p.put(); return; }   // 방이 바뀌었거나 멀리 떨어졌으면 곧장
    p.f = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); p.mv++;
    anim(ms, (e2, q) => { p.x = x0 + dx * q; p.y = y0 + dy * q; p.hop = hop ? Math.sin(q * Math.PI) * 10 : 0; }).then(() => { p.x = tx; p.y = ty; p.hop = 0; p.mv--; }); };
  F.palFace = t => { const p = F.pl; if (!p) return; const dx = t.x - p.x, dy = t.y - p.y; p.f = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); };
  F.palHi = () => F.palJoy();   // 말 걸면 울음소리
  F.palBub = (t, ms = 900) => F.pl ? F.bub(F.pl, t, ms) : null;
  // 관장 옆 포켓몬 기술 (체육관 타입 = 라인업 타입이라 타입 하나에 기술 하나, 경완 2026-11-08 '어떤 타입이든 되게')
  F.MOVE = { 1: ['몸통박치기', 'DP_W036'], 2: ['바위깨기', 'DP_W025'], 3: ['바람일으키기', 'DP_W016'], 4: ['용해액', 'DP_W092'], 5: ['구멍파기', 'DP_W091'], 6: ['바위떨구기', 'DP_W088'], 7: ['연속자르기', 'DP_W015'], 8: ['나이트헤드', 'DP_W109'], 9: ['아이언테일', 'DP_W231'],
    10: ['불꽃세례', 'DP_W052'], 11: ['물대포', 'DP_W055'], 12: ['풀베기', 'DP_W015'], 13: ['전기쇼크', 'DP_W085'], 14: ['염동력', 'DP_W060'], 15: ['얼음뭉치', 'DP_W059'], 16: ['용의숨결', 'DP_W082'], 17: ['깨물어부수기', 'DP_W044'], 18: ['요정의바람', 'DP_W236'] };
  const HC = { 1: '#e8e0c8', 2: '#e07040', 3: '#c8e8ff', 4: '#c070e0', 5: '#d8b060', 6: '#c0a060', 7: '#a8d040', 8: '#8060c0', 9: '#d0d8e8', 10: '#ff8030', 11: '#60b0ff', 12: '#70d050', 13: '#ffe040', 14: '#ff70b0', 15: '#a0f0ff', 16: '#8060ff', 17: '#605060', 18: '#ffb0e0' };
  F.move = () => F.MOVE[I.ty?.()] || F.MOVE[1];
  // 기술 효과 (타입별 도트 조각이 튀거나 피어오름, 경완 2026-11-08 '기술 효과 넣어주고')
  const FXT = { 10: ['#ff5020', '#ffd040', 'up'], 16: ['#7050ff', '#c0a0ff', 'up'], 11: ['#3090ff', '#c0e8ff', 'drop'], 15: ['#a0f0ff', '#ffffff', 'shard'], 13: ['#ffe020', '#fff8a0', 'zap'], 12: ['#40b040', '#a0e070', 'leaf'], 7: ['#90c020', '#d0f080', 'leaf'],
    14: ['#ff60b0', '#ffc0e0', 'ring'], 18: ['#ff90d0', '#ffffff', 'spark'], 8: ['#6040a0', '#b090e0', 'smoke'], 17: ['#403040', '#806878', 'smoke'], 4: ['#a040c0', '#e0a0f0', 'bub'],
    5: ['#c09050', '#e8c890', 'rock'], 6: ['#a08050', '#d0b080', 'rock'], 9: ['#c0c8d8', '#ffffff', 'spark'], 3: ['#e0f0ff', '#ffffff', 'ring'], 2: ['#ff8040', '#ffe0b0', 'star'], 1: ['#f0e8d0', '#ffffff', 'star'] };
  F.fx = (ty, tx, tY) => { const [c1, c2, kind] = FXT[ty] || FXT[1], cx = (tx * 16 + 8) * k, cy = (tY * 16 + 8) * k, n = kind === 'ring' ? 3 : 12;
    for (let i = 0; i < n; i++) { const d = document.createElement('i'), a = (i / n) * Math.PI * 2 + Math.random() * .5, r = (14 + Math.random() * 14) * k / 2, sz = (kind === 'ring' ? 10 : 2 + Math.random() * 3) * k / 2;
      Object.assign(d.style, { position: 'absolute', left: cx + 'px', top: cy + 'px', width: sz * 2 + 'px', height: sz * 2 + 'px', margin: -sz + 'px', zIndex: 6001, pointerEvents: 'none', background: i % 2 ? c1 : c2, borderRadius: kind === 'leaf' ? '0 70% 0 70%' : kind === 'shard' || kind === 'rock' || kind === 'zap' ? '1px' : '50%', boxShadow: `0 0 ${k}px ${c1}` });
      if (kind === 'ring') Object.assign(d.style, { background: 'none', border: `${k}px solid ${i % 2 ? c1 : c2}`, boxShadow: 'none' });
      map.appendChild(d); const dx = Math.cos(a) * r, dy = Math.sin(a) * r, dl = i * (kind === 'ring' ? 90 : 12);
      const K = kind === 'up' || kind === 'smoke' ? [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * .6}px,${-r * 1.6}px) scale(.3)`, opacity: 0 }]
        : kind === 'drop' || kind === 'rock' ? [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,${dy - r * .6}px)`, opacity: 1, offset: .5 }, { transform: `translate(${dx * 1.3}px,${r}px)`, opacity: 0 }]
        : kind === 'ring' ? [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(3.2)', opacity: 0 }]
        : kind === 'zap' ? [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy * .5}px) rotate(90deg)`, opacity: 0, offset: .3 }, { transform: `translate(${dx}px,${dy}px) rotate(180deg)`, opacity: 1, offset: .6 }, { transform: `translate(${dx * 1.2}px,${dy * 1.2}px)`, opacity: 0 }]
        : kind === 'leaf' ? [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx * 1.4}px,${dy * 1.4}px) rotate(540deg)`, opacity: 0 }]
        : [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: 0 }];
      d.animate(K, { duration: kind === 'ring' ? 520 : 560, delay: dl, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' }).finished.then(() => d.remove(), () => d.remove()); } };
  // 내 앞 칸(tx,ty)에 기술: 내 옆 빈칸으로 나와서 그쪽으로 달려들며 기술 → hit() (부딪히는 순간) → 제자리
  // 칸(tx,ty)에 기술: 그 칸 옆 빈칸 중 가장 가까운 데로 걸어가서 달려들며 기술 → hit() (부딪히는 순간) → 그 자리에서 기다림 (내가 걸으면 다시 따라옴)
  F.palWalk = async pts => { const p = F.pl; for (const [nx, ny] of pts) { const x0 = p.x, y0 = p.y, dx = nx - x0, dy = ny - y0; p.f = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); p.mv++; await anim(170, (e2, q) => { p.x = x0 + dx * q; p.y = y0 + dy * q; }); p.x = nx; p.y = ny; p.mv--; } };
  F.palAct = async (tx, ty, hit) => { const p = F.pl, m = F.me; if (!p) { await hit?.(); return; } p.act = true;
    let best = null; for (const [dx, dy] of Object.values(DIR)) { const q = [tx + dx, ty + dy]; if (F.solid(q[0], q[1])) continue; const here = Math.round(p.x) === q[0] && Math.round(p.y) === q[1], pt = here ? [] : F.path(p, q); if (pt && (!best || pt.length < best.length)) best = pt; }
    // 옆 빈칸이 없으면(좁은 통로) 내가 한 칸 물러서고 포켓몬이 내 자리로: 관장과 겹치던 것 (경완 2026-11-08)
    if (!best) { const mx = Math.round(m.x), my = Math.round(m.y), bx = mx - Math.sign(tx - mx), by = my - Math.sign(ty - my), adj = Math.abs(tx - mx) + Math.abs(ty - my) === 1;
      if (adj && !F.solid(bx, by, m)) { const f0 = m.f; await m.go([[bx, by]], WALK); m.turn(f0); const pt = F.path(p, [mx, my]); if (pt) best = pt; } }
    if (best) await F.palWalk(best); else p.top = true;
    F.palFace({ x: tx, y: ty }); F.bub(p, '!', 500); I.cry?.(p.P.sp); await wait(650);
    const [nm, se] = F.move(), lx = (tx - p.x) * .45, ly = (ty - p.y) * .45;
    p.one = 'Attack'; I.gse?.(se, .9);
    await anim(160, (e2, q) => { p.dx = lx * q; p.dy = ly * q; });
    const fx = document.createElement('i'); fx.className = 'ev-hit'; fx.style.setProperty('--hc', HC[I.ty?.()] || '#ffe070'); Object.assign(fx.style, { left: (tx * 16 + 8) * k + 'px', top: (ty * 16 + 8) * k + 'px' }); map.appendChild(fx); setTimeout(() => fx.remove(), 420); F.fx(I.ty?.() || 1, tx, ty);
    I.haptic?.(1); const hp = hit?.(); await anim(200, (e2, q) => { p.dx = lx * (1 - q); p.dy = ly * (1 - q); }); p.dx = p.dy = 0; await hp; await wait(200); p.top = false; p.one = null;
    const bk = F.path(p, [Math.round(m.x), Math.round(m.y)]); if (bk && bk.length > 1) await F.palWalk(bk.slice(0, -1)); p.act = false; F.palFace(m); };   // 다 하면 내 옆으로 돌아온다
  // 장애물: 그림(여러 칸 가로로 이어 붙인 깨지는 그림이면 fr 장수) 한 칸을 막는다. clear() 로 치운다
  F.obst = (src, x, y, o2 = {}) => { const w = o2.w || 16, h = o2.h || 16, fr = o2.fr || 1, sp = o2.span || 1, e = document.createElement('i'); e.className = 'ev-ob'; Object.assign(e.style, { left: (sp > 1 ? x * 16 : x * 16 + (16 - w) / 2) * k + 'px', top: ((y + 1) * 16 - h) * k + 'px', width: w * k + 'px', height: h * k + 'px', backgroundImage: `url(${src})`, backgroundSize: `${w * fr * k}px ${h * k}px`, backgroundPosition: '0 0' });
    map.appendChild(e); const b = { x, y, el: e, room: o2.room || F.cur, on: true, kind: o2.kind, fr, w, h }; b.span = sp; const rm = F.rooms[b.room];
    // 키 큰 것(상자 등 2칸)은 윗칸도 막는다: 상자 밑으로 들어가던 것 (경완 2026-11-08). 칸 목록 b.cells
    b.cells = () => { const L = []; for (let i = 0; i < sp; i++) { L.push([b.x + i, b.y]); if (h > 20 && !o2.low) L.push([b.x + i, b.y - 1]); } return L; };
    const blk = on => { const B = rm.block || (rm.block = new Set()); b.cells().forEach(([cx, cy]) => on ? B.add(cx + ',' + cy) : B.delete(cx + ',' + cy)); }; blk(true); if (b.room !== F.cur) e.style.display = 'none';
    // 다른 칸으로 옮기기 (화분 등)
    b.moveTo = async (nx, ny, ms = 420) => { blk(false); const dx = nx - b.x, dy = ny - b.y; await anim(ms, q => { e.style.translate = `${dx * 16 * k * q}px ${dy * 16 * k * q - Math.sin(q * Math.PI) * 6 * k}px`; }); e.style.translate = ''; b.x = nx; b.y = ny; Object.assign(e.style, { left: (sp > 1 ? nx * 16 : nx * 16 + (16 - w) / 2) * k + 'px', top: ((ny + 1) * 16 - h) * k + 'px' }); b.put(); blk(true); };
    b.put = () => { e.style.zIndex = zOf(b.y, b.y, 3); }; b.put();
    b.shake = () => { e.classList.remove('shk'); void e.offsetWidth; e.classList.add('shk'); };
    b.img = u => { e.style.backgroundImage = `url(${u})`; };
    b.clear = async (how = 'break', dir) => { b.on = false; blk(false);
      if (how === 'break' && fr > 1) { for (let i = 1; i < fr; i++) { e.style.backgroundPosition = `${-i * w * k}px 0`; await wait(90); } await wait(120); e.remove(); return; }
      if (how === 'push' && dir) { const [dx, dy] = DIR[dir]; await anim(260, q => { e.style.translate = `${dx * 16 * k * q}px ${dy * 16 * k * q}px`; }); }
      e.classList.add('out'); await wait(380); e.remove(); };
    F.obs.push(b); return b; };
  F.obAt = (x, y) => F.obs.find(b => b.on && b.room === F.cur && b.cells().some(([cx, cy]) => cx === x && cy === y));
  // 숨은 것: 그 칸에 A 를 누르면 찾음 (킁킁 힌트는 없앰, 경완 2026-11-08)
  F.hide = (x, y, o2 = {}) => { const h = Object.assign({ x, y, room: F.cur, got: false, sn: false }, o2); F.hid.push(h); return h; };
  F.hidAt = (x, y) => F.hid.find(h => !h.got && h.room === F.cur && h.x === x && h.y === y);
  // 본가 문 애니메이션 (field_door.c): 열기 = 원래 → 1·2·3장, 닫기 = 3·2·1장 → 원래. 열린 문은 사람 위에 그려져 사람이 문 안으로 사라진다
  F.door = async (x, y, open) => { const kd = F.doorAt?.[x + ',' + y], src = kd && o.doorImg?.[kd]; if (!src) return; const key = x + ',' + y; let d = doors[key];
    if (!d) { d = doors[key] = document.createElement('i'); d.className = 'ev-door'; Object.assign(d.style, { left: x * 16 * k + 'px', top: y * 16 * k + 'px', width: 16 * k + 'px', height: 16 * k + 'px', backgroundImage: `url(${src})`, backgroundSize: `${16 * k}px ${48 * k}px`, zIndex: y * 10 + 8 }); d.hidden = true; map.appendChild(d); }
    if (open) I.gse?.(/sliding/.test(kd) ? 'se_sliding_door' : 'se_door');   // 본가 GBA 효과음 (field_door.c: 여닫이 SE_DOOR, 미닫이 SE_SLIDING_DOOR, 닫힐 땐 소리 없음)
    for (const f of open ? [0, 1, 2] : [1, 0, -1]) { if (f < 0) d.hidden = true; else { d.hidden = false; d.style.backgroundPosition = `0 ${-f * 16 * k}px`; } await wait(DOORF); }
  };
  F.fade = async on => { fade.classList.toggle('on', on); await wait(on ? 420 : 380); };
  // 문·매트로 다른 방에 들어가기: w = { to, at:[x,y,f] }
  F.enter = async w => { const me = F.me, isDoor = F.doorAt?.[w.x + ',' + w.y];
    if (isDoor) { await F.door(w.x, w.y, true); me.top = true; await me.go([[w.x, w.y]], WALK); me.el.style.visibility = 'hidden'; me.top = false; await F.door(w.x, w.y, false); }   // 본가처럼 열린 문 위로 보이며 들어가고 다 들어가면 사라짐 (경완 2026-11-07)
    else I.gse?.('se_exit');   // 매트로 나가기 (본가 SE_EXIT)
    await F.fade(true); const [tx, ty, tf] = w.at; F.setMap(w.to); me.x = tx; me.y = ty; if (F.pl) { F.pl.x = tx; F.pl.y = ty; } me.turn(tf || 'u'); me.el.style.visibility = '';
    const outDoor = F.doorAt?.[tx + ',' + ty]; if (outDoor) me.el.style.visibility = 'hidden';
    F.follow = true; F.cam(me.x, me.y); await F.fade(false);
    if (outDoor) { await F.door(tx, ty, true); me.top = true; me.el.style.visibility = ''; const [dx, dy] = DIR[tf || 'd']; await me.go([[tx + dx, ty + dy]], WALK); me.top = false; me.put(); await F.door(tx, ty, false); } };
  // 본가 트레이너 시야: 보는 방향으로 sight 칸 안에 내가 있으면 그 거리 (벽·사람에 막힘)
  F.sees = s => { if (!s.on || !s.sight || s.done || s.lost || !here(s)) return 0; const [dx, dy] = DIR[s.f]; for (let i = 1; i <= s.sight; i++) { const x = Math.round(s.x) + dx * i, y = Math.round(s.y) + dy * i;
    if (Math.round(F.me.x) === x && Math.round(F.me.y) === y) return i; if (cAt(x, y) !== '.' || F.who(x, y)) return 0; } return 0; };
  // 나를 본 사람이 내 앞까지 걸어온다
  F.come = async s => { const n = F.sees(s) || 1, [dx, dy] = DIR[s.f], pts = []; for (let i = 1; i < n; i++) pts.push([Math.round(s.x) + dx * i, Math.round(s.y) + dy * i]); if (pts.length) await s.go(pts, 200); F.me.turn(OPP[s.f]); };
  // 칸 길찾기 (막힌 칸·사람 피해서). 길이 없으면 null
  F.path = (s, to) => { const sx = Math.round(s.x), sy = Math.round(s.y), key = (x, y) => y * o.w + x, prev = new Map([[key(sx, sy), -1]]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) { const out = []; let c = key(x, y); while (c !== key(sx, sy)) { out.unshift([c % o.w, Math.floor(c / o.w)]); c = prev.get(c); } return out; }
      for (const [dx, dy] of Object.values(DIR)) { const nx = x + dx, ny = y + dy, kk = key(nx, ny); if (prev.has(kk) || (F.solid(nx, ny, s) && !(nx === to[0] && ny === to[1]))) continue; if (nx < 0 || ny < 0 || nx >= o.w || ny >= o.h) continue; prev.set(kk, key(x, y)); q.push([nx, ny]); } }
    return null; };
  F.goTo = async (s, to, ms = 200) => { const p = F.path(s, to); if (p?.length) await s.go(p, ms); };
  // 사람이 나(또는 t)에게 다가온다: 내 옆 네 칸 중 가장 짧은 길로 가서 나를 본다 (경완 2026-11-07 '최단 거리로')
  F.approach = async (s, t = F.me, ms = 200) => { const tx = Math.round(t.x), ty = Math.round(t.y), [fx, fy] = DIR[t.f] || [0, 0], C = [];
    for (const [dx, dy] of Object.values(DIR)) { const q = [tx + dx, ty + dy], here0 = Math.round(s.x) === q[0] && Math.round(s.y) === q[1]; const p = here0 ? [] : F.solid(q[0], q[1], s) ? null : F.path(s, q); if (p) C.push({ q, p, front: dx === fx && dy === fy }); }
    // 내가 보는 쪽 바로 앞칸이 먼저 (경완 2026-11-07 '앞에서 얘기해야 할 것도 멀찍이'), 앞칸이 너무 돌아가야 하면(3칸 넘게 더) 가장 가까운 옆칸
    const min = Math.min(...C.map(c => c.p.length)), f = C.find(c => c.front && c.p.length <= min + 3), best = f || C.find(c => c.p.length === min);
    if (best?.p.length) await s.go(best.p, ms); s.face(t); t.face?.(s); return !!best; };
  // 여러 사람을 자리들에 나눠 보낼 때: 사람마다 가장 가까운 빈 자리
  F.nearest = (s, spots) => { let best = null; for (const q of spots) { const p = F.path(s, q); if (p && (!best || p.length < best[1].length)) best = [q, p]; } return best?.[0] || null; };
  F.lock = on => { const was = el.classList.contains('lock'); el.classList.toggle('lock', on); if (on) { press(null); F.run = false; el.querySelector('.ev-b')?.classList.remove('on'); } else if (was) { F.unT = performance.now(); F.aQ = false; } };   // 풀린 직후 0.4초는 A 무시: 대화를 넘기던 탭이 A 로 또 눌려 대화가 다시 열리던 것 (경완 2026-11-07)
  F.show = () => new Promise(ok => { requestAnimationFrame(() => { el.classList.add('on'); setTimeout(ok, 650); }); });
  F.close = async () => { el.classList.add('out'); await wait(800); el.remove(); off(); };
  // 걷기: 누르고 있는 동안 계속 (손가락을 다른 화살표로 밀면 방향만 바뀜)
  const press = d => { if (d && d !== F.hold) F.holdT = performance.now(); F.hold = d; pad.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.d === d)); };
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (x) {} I.haptic?.(0); press(b.dataset.d); });   // 방향키 누를 때 살짝 진동 (경완 2026-11-07 '조작감')
  pad.addEventListener('pointermove', e => { if (!F.hold) return; const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.ev-pad button'); if (b && b.dataset.d !== F.hold) { I.haptic?.(0); press(b.dataset.d); } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => pad.addEventListener(n, () => press(null)));
  pad.addEventListener('contextmenu', e => e.preventDefault());
  // 달리기 (본가 달리기 신발: 누른 채로 걸으면 한 칸 8프레임, 경완 2026-11-07 'A 버튼 위에 달리기 버튼')
  const bB = el.querySelector('.ev-b'), runOn = on => { F.run = on; bB.classList.toggle('on', on); };
  bB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bB.setPointerCapture(e.pointerId); } catch (x) {} I.haptic?.(0); runOn(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => bB.addEventListener(n, () => runOn(false))); bB.addEventListener('contextmenu', e => e.preventDefault());
  aB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (performance.now() - (F.unT || 0) < 400) return; aB.classList.add('on'); I.haptic?.(0); F.aQ = true; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => aB.addEventListener(n, () => aB.classList.remove('on')));
  // 아이폰 꾹 누르기 돋보기(글자 선택)가 뜨지 않게: 필드 위 터치는 기본 동작을 막고 버튼은 pointer 로만 (경완 2026-11-07)
  el.addEventListener('touchstart', e => { if (e.target.closest('.ev-pad,.ev-a,.ev-b,.tw-map')) e.preventDefault(); }, { passive: false });
  el.querySelector('.ev-pk').onclick = e => { e.stopPropagation(); if (el.classList.contains('lock')) return; I.sfx?.('tap'); F.pkQ = true; };   // 같이 다니는 포켓몬 바꾸기·넣어 두기 (경완 2026-11-08)
  el.querySelector('.ev-quit').onclick = async e => { e.stopPropagation(); I.sfx?.('tap'); F.lock(true); const y = await F.ask('이벤트를 멈추고 체육관에서 나갈까요?', '다음에 들어오면 이 장 처음부터 이어서 해요.', '나가기', '계속하기'); if (y) F.quitQ = true; else F.lock(false); };
  const KEY = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
  const kd = e => { if (e.key === 'Shift' || e.key === 'x') F.run = true; if (KEY[e.key]) { e.preventDefault(); if (!el.classList.contains('lock') && !e.repeat) press(KEY[e.key]); } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { if (!el.classList.contains('lock') && !e.repeat && performance.now() - (F.unT || 0) > 400) F.aQ = true; } };
  const ku = e => { if (KEY[e.key] === F.hold) press(null); if (e.key === 'Shift' || e.key === 'x') F.run = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const off = () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  F.ask = (t, sm, yes = '네', no = '아니요') => new Promise(ok => { const w = document.createElement('div'); w.className = 'ev-ask'; w.innerHTML = `<div class="win"><p>${I.esc(t)}${sm ? `<small>${I.esc(sm)}</small>` : ''}</p>${no ? `<div class="bt2 gy-btns"><button type="button" data-a="0">${I.esc(no)}</button><button type="button" class="main" data-a="1">${I.esc(yes)}</button></div>` : `<div class="gy-btns one"><button type="button" class="main" data-a="1">${I.esc(yes)}</button></div>`}</div>`;
    root.appendChild(w); I.gse?.('DP_WIN_OPEN', .8); w.onclick = e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(b.dataset.a === '1'); }; });
  // 자유롭게 걷기: h.step(칸) 걸은 뒤 · h.talk(사람) A 로 말 걸기 · h.look(칸) 앞에 아무도 없을 때 A 로 살펴보기 · h.warp(문) 문으로 들어가기 · h.room(방) 방을 옮긴 뒤.
  //   무엇이든 값을 돌려주면 끝. 출입구 w.to 는 알아서 들어간다 (w.pre() 가 false 면 못 들어감)
  F.play = (h = {}) => new Promise(done => {
    let busy = false, end = false, lastMv = 0; F.follow = true; F.lock(false); F.aQ = false; F.quitQ = false; F.pkQ = false;
    const fin = v => { end = true; F.lock(true); done(v); };
    const run = async f => { busy = true; F.lock(true); let r; try { r = await f(); } catch (e) { console.error(e); } busy = false; if (end) return; if (r !== undefined) fin(r); else F.lock(false); };
    const goW = w => run(async () => { if (w.pre && (await w.pre()) === false) return; if (w.to) { await F.enter(w); return h.room ? h.room(F.cur) : undefined; } return h.warp?.(w); });
    const after = async () => { lastMv = performance.now(); if (end) return; if (h.step) { const r = await Promise.resolve(h.step([me().x, me().y])).catch(e => console.error(e)); if (end) return; if (r !== undefined) { busy = false; return fin(r); } if (el.classList.contains('lock')) F.lock(false); } busy = false; };
    const me = () => F.me;
    const tick = () => { if (end) return; if (!I.isOpen() || !el.isConnected) return fin('quit');
      if (!busy) {
        wanderTick(performance.now());
        if (F.quitQ) return fin('quit');
        if (h.tick) { const f = h.tick(); if (f) { run(f); requestAnimationFrame(tick); return; } }   // 장면 쪽에서 매 프레임 살피기 (도는 조무래기 시야 등): 할 일이 있으면 함수를 돌려준다
        const m = F.me;
        if (F.aQ) { F.aQ = false; const [dx, dy] = DIR[m.f], tx = m.x + dx, ty = m.y + dy; let s = F.who(tx, ty); if (!s && cAt(tx, ty) === 'c') s = F.who(tx + dx, ty + dy);   // 카운터 너머
          const w = F.warpAt(tx, ty);
          const pl = F.pl && !F.pl.el.hidden && Math.round(F.pl.x) === tx && Math.round(F.pl.y) === ty;
          // 말 걸기·살펴보기는 버튼 누르는 소리와 같게 (경완 2026-11-08). 앞에 아무것도 없으면 아무 일 없이 계속 걷는다 (경완 2026-11-08 'A 눌러도 이동 끊기지 않게')
          if (s && h.talk) { I.sfx?.('tap'); run(async () => { s.face?.(m); return h.talk(s); }); } else if (pl) run(async () => { F.palFace(m); return h.pal ? h.pal() : F.palHi(); }); else if (w && !w.to && h.warp) { I.sfx?.('tap'); run(() => h.warp(w)); } else if (h.look && (!h.can || h.can([tx, ty]))) { I.sfx?.('tap'); run(() => h.look([tx, ty], m.f)); } }
        else if (F.pkQ) { F.pkQ = false; run(() => F.palPick()); }
        else if (F.hold) { const d = F.hold, [dx, dy] = DIR[d], tx = m.x + dx, ty = m.y + dy, w = F.warpAt(tx, ty), mat = F.warpAt(m.x, m.y), moving = performance.now() - lastMv < 60;
          if (m.f !== d && !moving) { m.turn(d); busy = true; setTimeout(() => { busy = false; }, TURN); }   // 제자리 돌기 (짧게 누르면 방향만)
          else if (mat && mat.mat && mat.d === d) goW(mat);   // 매트 위에서 그 방향 = 밖으로
          else if (w && !w.mat && (!w.d || w.d === d)) { m.turn(d); goW(w); }
          else if (cAt(tx, ty) === LEDGE[d] && !F.solid(tx + dx, ty + dy, m)) { busy = true; m.jump(d).then(after); }
          else if (F.solid(tx, ty, m)) { if (m.f !== d) m.turn(d); const t = performance.now(); if (F.run && !(t - (F.bumpT || 0) < 300)) { F.bumpT = t; I.gse?.('se_wall_hit'); } }   // 벽에 부딪히는 소리는 달리다 부딪혔을 때만 (경완 2026-11-07 '본가처럼 달리다 부딪혔을 때만')
          else { busy = true; m.go([[tx, ty]], F.run ? RUN : WALK).then(after); }   // 걷는 동안엔 잠그지 않아 꾹 누르면 계속 걷는다 (경완 2026-11-07)
        }
      }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  F.setMap('main');
  try { window.GymBGM?.sePrep?.(['se_door', 'se_sliding_door', 'se_exit', 'se_select', 'se_pin', 'se_wall_hit', 'se_unlock']); } catch (e) {}   // 본가 문·매트 소리를 미리 만들어 둠: 처음 들어갈 때 늦게(또는 안) 나던 것 (경완 2026-11-08 '마트 들어갈 때·나갈 때 효과음')
  if (/[?&]debug/.test(location.search)) window.__evF = F;   // 시험용 (주소에 ?debug 일 때만)
  return F;
}

window.GymEv = {
  LIST, DEF,
  tools: (I, def) => { css(); return tools(I, def); },   // v19.18 체육관 연출(전설 전당)에서 이벤트 도구만 빌려 씀
  def(o) { DEF[o.id] = o; },
  load,
  name: id => DEF[id]?.nm || id,
  // 이벤트 하나를 지금 장부터 끝까지 (또는 아직 없는 장까지) 진행한다. 끝나면 true
  async run(I, id, ch0) {
    css(); await load(id); const def = DEF[id]; if (!def) return false;
    const g = I.st(); g.ev = g.ev || {}; if (g.ev.cur !== id) { g.ev.cur = id; g.ev.ch = 0; g.ev.seen = {}; g.ev.t0 = Date.now(); } if (ch0 != null) { g.ev.ch = ch0; g.ev.seen = {}; } I.save();
    try { (def.songs || []).forEach(n => window.GymBGM?.prep(n)); } catch (e) {}
    while (g.ev.ch < def.ch.length) {
      const A = tools(I, def); (g.ev.seen = g.ev.seen || {})[g.ev.ch] = 1; let r; try { r = await def.ch[g.ev.ch](A); } catch (e) { console.error(e); r = 'stop'; }
      I.root.querySelectorAll('.ev-fld,.ev-ask,.gy-kang.tw-talk').forEach(x => x.remove());
      if (!I.isOpen()) return false;
      if (r === 'stop' || r === 'quit') return 'quit';
      if (r === 'again') { g.ev.try = (g.ev.try | 0) + 1; I.save(); continue; }
      if (r === 'wo') { g.ev.ch = def.woCh ?? 1; g.ev.wo = 1; g.ev.try = 1; I.save(); continue; }   // 졌다(아지트): 돌담시티 포켓몬 센터에서 다시   // 졌다: 같은 장을 처음부터
      g.ev.ch++; g.ev.try = 0; I.save();
    }
    if (!def.ready) return 'wip';   // 아직 다 만들지 않은 이벤트: 있는 장까지만
    I.evDone?.(id);
    return true;
  },
};
})();
