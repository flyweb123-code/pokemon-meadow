/* 체육관 이벤트 스토리 엔진 (2026-11-07 경완 '체육관에 가끔씩 이벤트 스토리, 본가처럼 밖으로 나가 모험, 이벤트별 모듈·보상')
   이벤트 하나 = gym/ev/<id>.js 하나. 파일은 GymEv.def({...}) 로 자기를 등록한다.
   def: { id, nm(이름), sub(한 줄 설명), songs[미리 받을 곡], imgs[미리 받을 그림], ch[장 함수들], reward{g, rep, fit, …} }
   장 함수 ch[i](A) 는 장면 도구 A 로 연출하고, 끝나면 다음 장으로 넘어간다. 진행은 S.gym.ev = { cur, ch, t0 } (장 단위 저장, 앱이 꺼지면 그 장 처음부터).
   체육관 안쪽(gym/gym.js)은 GymEv.run(api) 에 장면에 필요한 함수를 넘겨준다. */
(function () {
'use strict';
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const LIST = ['rocket'];   // 이벤트 순서 (새 이벤트는 여기에 id 를 더하고 gym/ev/<id>.js 를 만든다)
const DEF = {};
const loaded = {};
const load = id => loaded[id] || (loaded[id] = new Promise(ok => { const x = document.createElement('script'); x.src = `gym/ev/${id}.js?v=${VER}`; x.onload = x.onerror = () => ok(); document.head.appendChild(x); }));
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
#gym .ev-r::after{content:'R';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 var(--rf,12px)/1 sans-serif;color:#d01828;text-shadow:1px 1px 0 #600}
#gym .ev-r.flag{background:none;border:0;box-shadow:none}
#gym .ev-r.flag::before{content:'';position:absolute;left:12%;top:4%;bottom:0;width:8%;background:#585868;border:1px solid #303040}
#gym .ev-r.flag::after{inset:6% 4% auto 20%;height:46%;background:#1c1c24;border:2px solid #303040;color:#e02030;text-shadow:none}
/* 필드 모험 (방향 패드) */
#gym .ev-fld .tw-sp{z-index:2}
#gym .ev-fld .tw-sp.gone{opacity:0;transition:opacity .35s}
#gym .ev-fld .ev-ov{position:absolute;inset:0;z-index:5000;pointer-events:none;background-size:100% 100%;image-rendering:pixelated}
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
#gym .ev-b{position:absolute;right:max(29px,calc(env(safe-area-inset-right,0px) + 7px));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:960;width:56px;height:56px;border-radius:50%;border:0;padding:0;background:#3c3c4c;color:#fff;font:800 12px/1 sans-serif;box-shadow:0 4px 0 #18181f,inset 0 0 0 3px rgba(255,255,255,.22);touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-b.on{transform:translateY(4px);box-shadow:0 0 0 #18181f,inset 0 0 0 3px rgba(255,255,255,.45);background:#50506a}
#gym .ev-a:active,#gym .ev-a.on{transform:translateY(5px);box-shadow:0 0 0 #7a1018,inset 0 0 0 3px rgba(255,255,255,.45)}
#gym .ev-quit{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:960;border:0;border-radius:8px;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:7px 12px;box-shadow:0 3px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22);transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-quit:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22)}
#gym .ev-fld.lock :is(.ev-pad,.ev-a,.ev-b,.ev-quit){opacity:0;pointer-events:none}
#gym .ev-ask{position:absolute;inset:0;z-index:990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:0 24px}
#gym .ev-ask .win{max-width:320px;width:100%;padding:18px 16px 14px;text-align:center;display:flex;flex-direction:column;gap:12px}
#gym .ev-ask p{margin:0;font-size:15px;line-height:1.55;white-space:pre-line}#gym .ev-ask small{display:block;color:#707080;font-size:12px;margin-top:4px}
#gym .ev-ask .bt2{display:flex;gap:8px}#gym .ev-ask .bt2 button{flex:1}
#gym .ev-ask .gy-btns.one{display:flex}#gym .ev-ask .gy-btns.one button{flex:1}
#gym :is(.ev-ask,.ev-rw) button{font:inherit;font-size:15px;font-weight:700;padding:11px 8px;border:0;border-radius:10px;background:#e4e4ec;color:#303040;box-shadow:0 4px 0 #a8a8b8;transition:transform .05s,box-shadow .05s;-webkit-tap-highlight-color:transparent}
#gym :is(.ev-ask,.ev-rw) button.main{background:#3f8ee8;color:#fff;box-shadow:0 4px 0 #22589a}
#gym :is(.ev-ask,.ev-rw) button:active{transform:translateY(4px);box-shadow:0 0 0 transparent}
/* 보상 창 */
#gym .ev-rw{position:absolute;inset:0;z-index:990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:0 22px}
#gym .ev-rw .win{max-width:330px;width:100%;padding:18px 16px 14px;text-align:center;display:flex;flex-direction:column;gap:10px;animation:evRw .45s cubic-bezier(.2,1.4,.4,1) both}
@keyframes evRw{0%{opacity:0;transform:scale(.7)}100%{opacity:1;transform:none}}
#gym .ev-rw h4{margin:0;font-size:18px}#gym .ev-rw .sub{margin:-4px 0 0;font-size:12px;color:#808090}
#gym .ev-rw ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
#gym .ev-rw li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.05);text-align:left;font-size:14px}
#gym .ev-rw li img{width:44px;height:44px;object-fit:contain;image-rendering:pixelated}
#gym .ev-rw li .coin{margin-right:6px}
#gym .ev-rw li b{font-size:15px}
`;
let cssOn = false;
const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };

// 장면 도구: 체육관 안(gym/gym.js)에서 받은 함수로 만든다
function tools(I, def) {
  const root = I.root, $g = s => root.querySelector(s), g = I.st(), D = I.dz(), T = () => 16 * I.sc();
  const A = {
    I, g, D, def, wait, anim,
    // 맵 위 사람 (본가 걸음 그림)
    npc: (ow, x, y, f = 'd') => I.ent({ ow, x, y, f, n3: I.N3.has(ow) }),
    // 칸 길찾기로 걸어가기 (길이 없으면 곧장)
    // 길이 없으면 움직이지 않는다 (가구·사람을 밟고 지나가던 것, 경완 2026-11-07). 닿으면 true
    walkTo: async (e, to, spd = 260, occ = []) => { const fx = Math.round(e.x), fy = Math.round(e.y); if (fx === to[0] && fy === to[1]) return true; const p = I.route(D, [fx, fy], to, [...I.occOf([e]), ...occ]); if (!p?.length) return false; await I.walk(e, p, spd); return true; },
    // 후보 칸 중 걸어서 갈 수 있는 첫 칸 (빈 바닥·소품·사람·석상 피해서)
    reach: (e, cands, occ = []) => { const O = [...I.occOf([e]), ...occ], K = q => q[0] + ',' + q[1], bad = new Set(O.map(K)); for (const c of cands) { if (D.free?.[c[1]]?.[c[0]] !== '1' || bad.has(K(c)) || (D.stat || []).some(q => q[0] === c[0] && q[1] === c[1])) continue; if (Math.round(e.x) === c[0] && Math.round(e.y) === c[1]) return c; const p = I.route(D, [Math.round(e.x), Math.round(e.y)], c, O); if (p?.length) return c; } return null; },   // 후보는 앞에 둔 칸이 먼저 (내 바로 앞 등). 고른 칸까지는 walkTo 가 최단 길로 (경완 2026-11-07 '최단 거리로 가니까 멀찍이 떨어져서 얘기')
    turn: (e, f) => { e.f = f; e.st = 0; I.place(e); },
    slide: (e, tx, ty, ms) => { const x0 = e.x, y0 = e.y; return anim(ms, q => { e.x = x0 + (tx - x0) * q; e.y = y0 + (ty - y0) * q; I.place(e); }); },
    // 머리 위 말풍선 ('!', '...')
    bub: (e, t, ms = 900, blink) => { const b = document.createElement('b'); b.className = 'tw-bub' + (blink ? ' blink' : ''); b.textContent = t;
      Object.assign(b.style, { left: (e.x * 16 + 8) * I.sc() + 'px', top: (e.y * 16 - 17) * I.sc() + 'px' }); $g('.gy-ents').appendChild(b); if (ms) setTimeout(() => b.remove(), ms); return b; },
    // 바닥에 놓는 로켓단 소품 (R 상자·깃발)
    rProp: (x, y, kind = 'box') => { const el = document.createElement('i'), s = I.sc(); el.className = 'ev-r' + (kind === 'flag' ? ' flag' : '');
      Object.assign(el.style, kind === 'flag' ? { left: x * 16 * s + 'px', top: (y * 16 - 14) * s + 'px', width: 16 * s + 'px', height: 30 * s + 'px', zIndex: y * 10 + 9 } : { left: (x * 16 + 1) * s + 'px', top: (y * 16 + 1) * s + 'px', width: 14 * s + 'px', height: 14 * s + 'px', zIndex: y * 10 + 8 });
      el.style.setProperty('--rf', 9 * s + 'px'); $g('.gy-ents').appendChild(el); return el; },
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
    test: !!window.gymEvTest, retry: (g.ev?.try | 0) > 0,
    lv: () => I.lv(),
    // 필드 맵 열기 (검은 화면 뒤에서 만들고 F.show 로 밝힌다)
    field: o => { const F = field(I, o); return F; },
    // 이벤트 배틀: o = { tr 그림, cls, nm, team [[종, 레벨]], tier, say {win,lose}, g 골드, music }. 이기면 true
    battle: async o => { const r = await I.battle(o); return !!(r?.won || r?.cut); },
    // 곧바로 까만 화면 (장을 이어서 시작할 때 체육관이 비치지 않게)
    blackNow: () => { let b = $g('.ev-black'); if (!b) { b = document.createElement('div'); b.className = 'ev-black'; b.innerHTML = '<b></b><span></span>'; root.appendChild(b); } b.style.transition = 'none'; b.classList.add('on'); void b.offsetWidth; b.style.transition = ''; },
    // 이벤트 보상 창: def.reward { g 골드, rep 평판, fit 의상 } 를 주고 보여 준다
    reward: () => new Promise(ok => { const R = def.reward || {}, f = I.myOw() === 'pt_f' ? 'f' : 'm', L = [];
      if (R.g) { I.addG(R.g); L.push(`<li><i class="coin"></i><b>${R.g.toLocaleString()}G</b></li>`); }
      if (R.rep) { I.addRep(R.rep); L.push(`<li><b>체육관 평판 +${R.rep}</b></li>`); }
      if (R.fit) { I.giveFit(R.fit); L.push(`<li><img alt="" src="gym/img/fit/${R.fit}_${f}.png?v=${VER}" onerror="this.onerror=null;this.src='gym/img/pt/tr/hg_rocket_${f}.png'"><div><b>${I.esc(R.fitNm || '새 의상')}</b><br><small>상점 › 의상에서 입을 수 있어요</small></div></li>`); }
      I.save(); I.renderTop?.(); I.glog?.('in', `이벤트 <b>${I.esc(def.nm)}</b>${'을'} 해결했다!`);
      const w = document.createElement('div'); w.className = 'ev-rw'; w.innerHTML = `<div class="win"><h4>이벤트 해결!</h4><p class="sub">${I.esc(def.nm)}</p><ul>${L.join('')}</ul><div class="gy-btns one"><button type="button" class="main">받기</button></div></div>`;
      root.appendChild(w); try { window.GymBGM?.se?.('ME_FANFA5'); } catch (e) {} I.confetti?.(); I.haptic?.(1);
      w.querySelector('button').onclick = e => { e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(); }; }),
    // 지면 이 장 처음부터 (벌 없음, 경완 2026-11-07)
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
    <div class="ev-pad">${['u', 'l', 'r', 'd'].map(d => `<button type="button" data-d="${d}" aria-label="${({ u: '위', d: '아래', l: '왼쪽', r: '오른쪽' })[d]}"></button>`).join('')}</div><button type="button" class="ev-a" aria-label="말 걸기">A</button><button type="button" class="ev-b" aria-label="달리기">달리기</button><button type="button" class="ev-quit">나가기</button>`;
  root.appendChild(el); const map = el.firstElementChild, ov = map.firstElementChild, fade = el.querySelector('.ev-fade'), pad = el.querySelector('.ev-pad'), aB = el.querySelector('.ev-a');
  const F = { el, map, k, sps: [], hold: null, aQ: false, quitQ: false, me: null, follow: true, warps: [], block: new Set(), cur: 'main', rooms: Object.assign({}, o.rooms || {}) };
  F.rooms.main = { nm: o.nm, img: o.img, over: o.over, w: o.w, h: o.h, col: o.col, door: o.door, warps: o.warps || [] };
  let cx = 0, cy = 0, col = o.col, doors = {};
  // 방(맵) 바꾸기: 그림·충돌·문·출입구를 그 방 것으로, 다른 방 사람은 숨김
  F.setMap = id => { const m = F.rooms[id]; F.cur = id; o.w = m.w; o.h = m.h; col = m.col; F.warps = m.warps || []; F.doorAt = m.door || {}; F.block = m.block || (m.block = new Set());
    Object.assign(map.style, { width: m.w * 16 * k + 'px', height: m.h * 16 * k + 'px', backgroundImage: `url(${m.img})` }); ov.style.backgroundImage = m.over ? `url(${m.over})` : 'none';
    Object.values(doors).forEach(d => d.remove()); doors = {}; map.querySelectorAll('.tw-bub').forEach(b => b.remove());
    F.sps.forEach(s => { if (s !== F.me) s.el.style.display = (s.room || 'main') === id ? '' : 'none'; }); if (F.me) F.cam(F.me.x, F.me.y); };
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
  F.npc = (ow, x, y, f = 'd', o2 = {}) => { const src = /[/.]/.test(ow) ? ow : I.owSrc(ow), fw = o2.fw || (/[/.]/.test(ow) ? 32 : I.owW(ow)); const s = Object.assign({ x, y, f, st: 0, on: true, fw, hop: 0, room: F.cur, el: document.createElement('i') }, o2); s.el.className = 'tw-sp'; map.appendChild(s.el);
    s.put = () => { const fr = FR[s.f][s.st]; Object.assign(s.el.style, { width: s.fw * k + 'px', height: 32 * k + 'px', left: (s.x * 16 - (s.fw - 16) / 2) * k + 'px', top: (s.y * 16 - 16 - s.hop) * k + 'px', zIndex: s.top ? 5500 : Math.round(s.y * 10) + 2, backgroundImage: `url(${s.src || src})`, backgroundSize: `auto ${32 * k}px`, backgroundPosition: `${-fr * s.fw * k}px 0` }); s.el.classList.toggle('flip', s.f === 'r'); if (s === F.me && F.follow) F.cam(s.x, s.y); };
    s.go = async (pts, ms = 210) => { let n = s.n || 0; for (const [tx, ty] of pts) while (s.x !== tx || s.y !== ty) {
      const dx = Math.sign(tx - s.x), dy = dx ? 0 : Math.sign(ty - s.y), x0 = s.x, y0 = s.y; s.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u'; n++; s.res = [x0 + dx, y0 + dy];   // 가는 칸은 미리 잡아 둔다 (둘이 한 칸에 겹치지 않게)
      await anim(ms, (e, q) => { s.x = x0 + dx * q; s.y = y0 + dy * q; s.st = q < .5 ? (n % 2 ? 1 : 2) : 0; s.put(); });
      s.x = x0 + dx; s.y = y0 + dy; s.res = null; } s.n = n; s.st = 0; s.put(); };
    // 본가 턱 뛰어내리기: 두 칸을 32프레임에 포물선으로
    s.jump = async d => { const [dx, dy] = DIR[d], x0 = s.x, y0 = s.y; s.f = d; I.gse?.('se_ledge');
      await anim(JUMP, (e, q) => { s.x = x0 + dx * 2 * q; s.y = y0 + dy * 2 * q; s.hop = Math.sin(q * Math.PI) * 10; s.st = q < .5 ? 1 : 2; s.put(); }); s.x = x0 + dx * 2; s.y = y0 + dy * 2; s.hop = 0; s.st = 0; s.put(); };
    s.turn = f => { s.f = f; s.st = 0; s.put(); };
    s.face = t => { const dx = t.x - s.x, dy = t.y - s.y; s.turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); };
    s.slide = (tx, ty, ms) => { const x0 = s.x, y0 = s.y; return anim(ms, q => { s.x = x0 + (tx - x0) * q; s.y = y0 + (ty - y0) * q; s.put(); }); };
    s.gone = async () => { s.el.classList.add('gone'); await wait(380); s.on = false; s.el.hidden = true; };
    if (!here(s)) s.el.style.display = 'none';
    F.sps.push(s); s.put(); return s; };
  F.bub = (s, t, ms = 900) => { const b = document.createElement('b'); b.className = 'tw-bub'; b.textContent = t; Object.assign(b.style, { left: (s.x * 16 + 8) * k + 'px', top: (s.y * 16 - 17) * k + 'px' }); map.appendChild(b); if (ms) setTimeout(() => b.remove(), ms); return b; };
  // 그림 한 장을 맵 칸에 (비밀 계단 등). z: 'floor' 바닥(사람 밑) / 'top' 사람 위
  F.pic = (src, x, y, w = 16, h = 16, z = 'floor') => { const e = document.createElement('i'); e.className = 'ev-pic'; Object.assign(e.style, { left: x * 16 * k + 'px', top: y * 16 * k + 'px', width: w * k + 'px', height: h * k + 'px', backgroundImage: `url(${src})`, zIndex: z === 'top' ? 5001 : 1 }); map.appendChild(e); return e; };
  // 본가 문 애니메이션 (field_door.c): 열기 = 원래 → 1·2·3장, 닫기 = 3·2·1장 → 원래. 열린 문은 사람 위에 그려져 사람이 문 안으로 사라진다
  F.door = async (x, y, open) => { const kd = F.doorAt?.[x + ',' + y], src = kd && o.doorImg?.[kd]; if (!src) return; const key = x + ',' + y; let d = doors[key];
    if (!d) { d = doors[key] = document.createElement('i'); d.className = 'ev-door'; Object.assign(d.style, { left: x * 16 * k + 'px', top: y * 16 * k + 'px', width: 16 * k + 'px', height: 16 * k + 'px', backgroundImage: `url(${src})`, backgroundSize: `${16 * k}px ${48 * k}px` }); d.hidden = true; map.appendChild(d); }
    if (open) I.gse?.(/sliding/.test(kd) ? 'se_sliding_door' : 'se_door');   // 본가 GBA 효과음 (field_door.c: 여닫이 SE_DOOR, 미닫이 SE_SLIDING_DOOR, 닫힐 땐 소리 없음)
    for (const f of open ? [0, 1, 2] : [1, 0, -1]) { if (f < 0) d.hidden = true; else { d.hidden = false; d.style.backgroundPosition = `0 ${-f * 16 * k}px`; } await wait(DOORF); }
  };
  F.fade = async on => { fade.classList.toggle('on', on); await wait(on ? 420 : 380); };
  // 문·매트로 다른 방에 들어가기: w = { to, at:[x,y,f] }
  F.enter = async w => { const me = F.me, isDoor = F.doorAt?.[w.x + ',' + w.y];
    if (isDoor) { await F.door(w.x, w.y, true); me.top = true; await me.go([[w.x, w.y]], WALK); me.el.style.visibility = 'hidden'; me.top = false; await F.door(w.x, w.y, false); }   // 본가처럼 열린 문 위로 보이며 들어가고 다 들어가면 사라짐 (경완 2026-11-07)
    else I.gse?.('se_exit');   // 매트로 나가기 (본가 SE_EXIT)
    await F.fade(true); const [tx, ty, tf] = w.at; F.setMap(w.to); me.x = tx; me.y = ty; me.turn(tf || 'u'); me.el.style.visibility = '';
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
  el.querySelector('.ev-quit').onclick = async e => { e.stopPropagation(); I.sfx?.('tap'); F.lock(true); const y = await F.ask('이벤트를 멈추고 체육관에서 나갈까요?', '다음에 들어오면 이 장 처음부터 이어서 해요.', '나가기', '계속하기'); if (y) F.quitQ = true; else F.lock(false); };
  const KEY = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
  const kd = e => { if (e.key === 'Shift' || e.key === 'x') F.run = true; if (KEY[e.key]) { e.preventDefault(); if (!el.classList.contains('lock') && !e.repeat) press(KEY[e.key]); } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { if (!el.classList.contains('lock') && !e.repeat && performance.now() - (F.unT || 0) > 400) F.aQ = true; } };
  const ku = e => { if (KEY[e.key] === F.hold) press(null); if (e.key === 'Shift' || e.key === 'x') F.run = false; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const off = () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  F.ask = (t, sm, yes = '네', no = '아니요') => new Promise(ok => { const w = document.createElement('div'); w.className = 'ev-ask'; w.innerHTML = `<div class="win"><p>${I.esc(t)}${sm ? `<small>${I.esc(sm)}</small>` : ''}</p><div class="bt2 gy-btns"><button type="button" data-a="0">${I.esc(no)}</button><button type="button" class="main" data-a="1">${I.esc(yes)}</button></div></div>`;
    root.appendChild(w); I.gse?.('DP_WIN_OPEN', .8); w.onclick = e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(b.dataset.a === '1'); }; });
  // 자유롭게 걷기: h.step(칸) 걸은 뒤 · h.talk(사람) A 로 말 걸기 · h.look(칸) 앞에 아무도 없을 때 A 로 살펴보기 · h.warp(문) 문으로 들어가기 · h.room(방) 방을 옮긴 뒤.
  //   무엇이든 값을 돌려주면 끝. 출입구 w.to 는 알아서 들어간다 (w.pre() 가 false 면 못 들어감)
  F.play = (h = {}) => new Promise(done => {
    let busy = false, end = false, lastMv = 0; F.follow = true; F.lock(false); F.aQ = false; F.quitQ = false;
    const fin = v => { end = true; F.lock(true); done(v); };
    const run = async f => { busy = true; F.lock(true); let r; try { r = await f(); } catch (e) { console.error(e); } busy = false; if (end) return; if (r !== undefined) fin(r); else F.lock(false); };
    const goW = w => run(async () => { if (w.pre && (await w.pre()) === false) return; if (w.to) { await F.enter(w); return h.room ? h.room(F.cur) : undefined; } return h.warp?.(w); });
    const after = async () => { lastMv = performance.now(); if (end) return; if (h.step) { const r = await Promise.resolve(h.step([me().x, me().y])).catch(e => console.error(e)); if (end) return; if (r !== undefined) { busy = false; return fin(r); } if (el.classList.contains('lock')) F.lock(false); } busy = false; };
    const me = () => F.me;
    const tick = () => { if (end) return; if (!I.isOpen() || !el.isConnected) return fin('quit');
      if (!busy) {
        wanderTick(performance.now());
        if (F.quitQ) return fin('quit');
        const m = F.me;
        if (F.aQ) { F.aQ = false; const [dx, dy] = DIR[m.f], tx = m.x + dx, ty = m.y + dy; let s = F.who(tx, ty); if (!s && cAt(tx, ty) === 'c') s = F.who(tx + dx, ty + dy);   // 카운터 너머
          const w = F.warpAt(tx, ty);
          if (s && h.talk) run(async () => { s.face?.(m); return h.talk(s); }); else if (w && !w.to && h.warp) run(() => h.warp(w)); else if (h.look) run(() => h.look([tx, ty], m.f)); }
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
  if (/[?&]debug/.test(location.search)) window.__evF = F;   // 시험용 (주소에 ?debug 일 때만)
  return F;
}

window.GymEv = {
  LIST, DEF,
  def(o) { DEF[o.id] = o; },
  load,
  name: id => DEF[id]?.nm || id,
  // 이벤트 하나를 지금 장부터 끝까지 (또는 아직 없는 장까지) 진행한다. 끝나면 true
  async run(I, id, ch0) {
    css(); await load(id); const def = DEF[id]; if (!def) return false;
    const g = I.st(); g.ev = g.ev || {}; if (g.ev.cur !== id) { g.ev.cur = id; g.ev.ch = 0; g.ev.t0 = Date.now(); } if (ch0 != null) g.ev.ch = ch0; I.save();
    try { (def.songs || []).forEach(n => window.GymBGM?.prep(n)); } catch (e) {}
    while (g.ev.ch < def.ch.length) {
      const A = tools(I, def); let r; try { r = await def.ch[g.ev.ch](A); } catch (e) { console.error(e); r = 'stop'; }
      I.root.querySelectorAll('.ev-fld,.ev-ask,.gy-kang.tw-talk').forEach(x => x.remove());
      if (!I.isOpen()) return false;
      if (r === 'stop' || r === 'quit') return 'quit';
      if (r === 'again') { g.ev.try = (g.ev.try | 0) + 1; I.save(); continue; }   // 졌다: 같은 장을 처음부터
      g.ev.ch++; g.ev.try = 0; I.save();
    }
    if (!def.ready) return 'wip';   // 아직 다 만들지 않은 이벤트: 있는 장까지만
    I.evDone?.(id);
    return true;
  },
};
})();
