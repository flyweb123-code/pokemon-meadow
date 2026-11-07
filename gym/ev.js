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
#gym .ev-loc{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:960;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:5px 12px;border-radius:6px;border:2px solid rgba(255,255,255,.22);pointer-events:none;transition:opacity .3s}
#gym .ev-loc:empty{display:none}
#gym .ev-pad{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:156px;height:156px;z-index:960;touch-action:none;-webkit-user-select:none;user-select:none;transition:opacity .25s}
#gym .ev-pad::before{content:'';position:absolute;left:52px;top:52px;width:52px;height:52px;background:rgba(20,20,30,.5);border-radius:4px}
#gym .ev-pad button{position:absolute;width:52px;height:52px;border:0;border-radius:10px;padding:0;background:rgba(24,24,36,.62);box-shadow:0 4px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.24);touch-action:none;-webkit-tap-highlight-color:transparent;transition:transform .05s,box-shadow .05s}
#gym .ev-pad button::after{content:'';position:absolute;left:50%;top:50%;margin:-7px 0 0 -8px;border:8px solid transparent;border-bottom:11px solid #f0f0f8;border-top:0}
#gym .ev-pad button.on{transform:translateY(4px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.45);background:rgba(50,50,72,.8)}
#gym .ev-pad [data-d=u]{left:52px;top:0}#gym .ev-pad [data-d=d]{left:52px;bottom:0}#gym .ev-pad [data-d=l]{left:0;top:52px}#gym .ev-pad [data-d=r]{right:0;top:52px}
#gym .ev-pad [data-d=d]::after{transform:rotate(180deg)}#gym .ev-pad [data-d=l]::after{transform:rotate(-90deg)}#gym .ev-pad [data-d=r]::after{transform:rotate(90deg)}
#gym .ev-a{position:absolute;right:max(22px,env(safe-area-inset-right,0px));bottom:calc(58px + env(safe-area-inset-bottom,0px));z-index:960;width:70px;height:70px;border-radius:50%;border:0;background:#d8343c;color:#fff;font:900 24px/1 sans-serif;box-shadow:0 5px 0 #7a1018,inset 0 0 0 3px rgba(255,255,255,.3);touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-a:active,#gym .ev-a.on{transform:translateY(5px);box-shadow:0 0 0 #7a1018,inset 0 0 0 3px rgba(255,255,255,.45)}
#gym .ev-quit{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:960;border:0;border-radius:8px;background:rgba(16,16,24,.72);color:#fff;font-size:13px;font-weight:700;padding:7px 12px;box-shadow:0 3px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22);transition:opacity .25s,transform .05s,box-shadow .05s}
#gym .ev-quit:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.22)}
#gym .ev-fld.lock :is(.ev-pad,.ev-a,.ev-quit){opacity:0;pointer-events:none}
#gym .ev-ask{position:absolute;inset:0;z-index:990;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:0 24px}
#gym .ev-ask .win{max-width:320px;width:100%;padding:18px 16px 14px;text-align:center;display:flex;flex-direction:column;gap:12px}
#gym .ev-ask p{margin:0;font-size:15px;line-height:1.55;white-space:pre-line}#gym .ev-ask small{display:block;color:#707080;font-size:12px;margin-top:4px}
#gym .ev-ask .bt2{display:flex;gap:8px}#gym .ev-ask .bt2 button{flex:1}
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
    walkTo: async (e, to, spd = 260) => { const p = I.route(D, [Math.round(e.x), Math.round(e.y)], to, I.occOf([e])); await I.walk(e, p?.length ? p : [[to[0], e.y], to], spd); },
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
// o = { nm 장소 이름, img 맵 그림, w·h 칸 수, col 막힌 칸 줄들('#' 막힘), warps [{x,y,d,id}] (그 칸으로 d 방향으로 걸어 들어가면) }
// 걸음 그림 칸: 0 아래 1 위 2 왼쪽 3·4 아래 걷기 5·6 위 걷기 7·8 왼쪽 걷기 (오른쪽은 뒤집기)
const FR = { d: [0, 3, 4], u: [1, 5, 6], l: [2, 7, 8], r: [2, 7, 8] }, DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }, OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function field(I, o) {
  const root = I.root, W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight, k = Math.max(2, Math.round(W / (12 * 16) * 4) / 4);
  const el = document.createElement('div'); el.className = 'gy-town ev-fld lock';
  el.innerHTML = `<div class="tw-map" style="width:${o.w * 16 * k}px;height:${o.h * 16 * k}px;background-image:url(${o.img})"></div><b class="ev-loc">${I.esc(o.nm || '')}</b>
    <div class="ev-pad">${['u', 'l', 'r', 'd'].map(d => `<button type="button" data-d="${d}" aria-label="${({ u: '위', d: '아래', l: '왼쪽', r: '오른쪽' })[d]}"></button>`).join('')}</div><button type="button" class="ev-a" aria-label="말 걸기">A</button><button type="button" class="ev-quit">나가기</button>`;
  root.appendChild(el); const map = el.firstElementChild, col = o.col, pad = el.querySelector('.ev-pad'), aB = el.querySelector('.ev-a');
  const F = { el, map, k, sps: [], hold: null, aQ: false, quitQ: false, me: null, follow: true, warps: o.warps || [], block: new Set() };
  let cx = 0, cy = 0;
  F.cam = (x, y) => { cx = x; cy = y; const mw = o.w * 16 * k, mh = o.h * 16 * k, X = mw <= W ? (mw - W) / 2 : clamp((x * 16 + 8) * k - W / 2, 0, mw - W), Y = mh <= H ? (mh - H) / 2 : clamp((y * 16 + 8) * k - H * .42, 0, mh - H); map.style.transform = `translate(${-Math.round(X)}px,${-Math.round(Y)}px)`; };
  F.camTo = (x, y, ms = 700) => { const x0 = cx, y0 = cy; return anim(ms, q => F.cam(x0 + (x - x0) * q, y0 + (y - y0) * q)); };
  F.camMe = (ms = 500) => F.camTo(F.me.x, F.me.y, ms).then(() => { F.follow = true; });
  F.warpAt = (x, y) => F.warps.find(w => w.x === x && w.y === y && !w.off);
  const at = (s, x, y) => s.on && !s.el.hidden && Math.round(s.x) === x && Math.round(s.y) === y;
  F.who = (x, y) => F.sps.find(s => s !== F.me && at(s, x, y));
  F.solid = (x, y, who) => x < 0 || y < 0 || x >= o.w || y >= o.h || col[y][x] === '#' || F.block.has(x + ',' + y) || F.sps.some(s => s !== who && at(s, x, y));
  // 맵 위 사람: ow 키(본가 걸음 그림) 또는 그림 주소
  F.npc = (ow, x, y, f = 'd', o2 = {}) => { const src = /[/.]/.test(ow) ? ow : I.owSrc(ow), fw = o2.fw || (/[/.]/.test(ow) ? 32 : I.owW(ow)); const s = Object.assign({ x, y, f, st: 0, on: true, fw, el: document.createElement('i') }, o2); s.el.className = 'tw-sp'; map.appendChild(s.el);
    s.put = () => { const fr = FR[s.f][s.st]; Object.assign(s.el.style, { width: s.fw * k + 'px', height: 32 * k + 'px', left: (s.x * 16 - (s.fw - 16) / 2) * k + 'px', top: (s.y * 16 - 16) * k + 'px', zIndex: Math.round(s.y * 10) + 2, backgroundImage: `url(${s.src || src})`, backgroundSize: `auto ${32 * k}px`, backgroundPosition: `${-fr * s.fw * k}px 0` }); s.el.classList.toggle('flip', s.f === 'r'); if (s === F.me && F.follow) F.cam(s.x, s.y); };
    s.go = async (pts, ms = 210) => { let n = s.n || 0; for (const [tx, ty] of pts) while (s.x !== tx || s.y !== ty) {
      const dx = Math.sign(tx - s.x), dy = dx ? 0 : Math.sign(ty - s.y), x0 = s.x, y0 = s.y; s.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u'; n++;
      await anim(ms, (e, q) => { s.x = x0 + dx * q; s.y = y0 + dy * q; s.st = q < .5 ? (n % 2 ? 1 : 2) : 0; s.put(); });
      s.x = x0 + dx; s.y = y0 + dy; } s.n = n; s.st = 0; s.put(); };
    s.turn = f => { s.f = f; s.st = 0; s.put(); };
    s.face = t => { const dx = t.x - s.x, dy = t.y - s.y; s.turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); };
    s.slide = (tx, ty, ms) => { const x0 = s.x, y0 = s.y; return anim(ms, q => { s.x = x0 + (tx - x0) * q; s.y = y0 + (ty - y0) * q; s.put(); }); };
    s.gone = async () => { s.el.classList.add('gone'); await wait(380); s.on = false; s.el.hidden = true; };
    F.sps.push(s); s.put(); return s; };
  F.bub = (s, t, ms = 900) => { const b = document.createElement('b'); b.className = 'tw-bub'; b.textContent = t; Object.assign(b.style, { left: (s.x * 16 + 8) * k + 'px', top: (s.y * 16 - 17) * k + 'px' }); map.appendChild(b); if (ms) setTimeout(() => b.remove(), ms); return b; };
  // 본가 트레이너 시야: 보는 방향으로 sight 칸 안에 내가 있으면 그 거리 (벽·사람에 막힘)
  F.sees = s => { if (!s.on || !s.sight || s.done) return 0; const [dx, dy] = DIR[s.f]; for (let i = 1; i <= s.sight; i++) { const x = Math.round(s.x) + dx * i, y = Math.round(s.y) + dy * i;
    if (Math.round(F.me.x) === x && Math.round(F.me.y) === y) return i; if (x < 0 || y < 0 || x >= o.w || y >= o.h || col[y][x] === '#' || F.who(x, y)) return 0; } return 0; };
  // 나를 본 사람이 내 앞까지 걸어온다
  F.come = async s => { const n = F.sees(s) || 1, [dx, dy] = DIR[s.f], pts = []; for (let i = 1; i < n; i++) pts.push([Math.round(s.x) + dx * i, Math.round(s.y) + dy * i]); if (pts.length) await s.go(pts, 200); F.me.turn(OPP[s.f]); };
  // 칸 길찾기 (막힌 칸·사람 피해서). 길이 없으면 null
  F.path = (s, to) => { const sx = Math.round(s.x), sy = Math.round(s.y), key = (x, y) => y * o.w + x, prev = new Map([[key(sx, sy), -1]]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) { const out = []; let c = key(x, y); while (c !== key(sx, sy)) { out.unshift([c % o.w, Math.floor(c / o.w)]); c = prev.get(c); } return out; }
      for (const [dx, dy] of Object.values(DIR)) { const nx = x + dx, ny = y + dy, kk = key(nx, ny); if (prev.has(kk) || (F.solid(nx, ny, s) && !(nx === to[0] && ny === to[1]))) continue; if (nx < 0 || ny < 0 || nx >= o.w || ny >= o.h) continue; prev.set(kk, key(x, y)); q.push([nx, ny]); } }
    return null; };
  F.goTo = async (s, to, ms = 200) => { const p = F.path(s, to); if (p?.length) await s.go(p, ms); };
  F.lock = on => { el.classList.toggle('lock', on); if (on) press(null); };
  F.show = () => new Promise(ok => { requestAnimationFrame(() => { el.classList.add('on'); setTimeout(ok, 650); }); });
  F.close = async () => { el.classList.add('out'); await wait(800); el.remove(); off(); };
  // 걷기: 누르고 있는 동안 계속 (손가락을 다른 화살표로 밀면 방향만 바뀜)
  const press = d => { F.hold = d; pad.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.d === d)); };
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (x) {} press(b.dataset.d); });
  pad.addEventListener('pointermove', e => { if (!F.hold) return; const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.ev-pad button'); if (b && b.dataset.d !== F.hold) press(b.dataset.d); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => pad.addEventListener(n, () => press(null)));
  pad.addEventListener('contextmenu', e => e.preventDefault());
  aB.onclick = e => { e.stopPropagation(); F.aQ = true; };
  el.querySelector('.ev-quit').onclick = async e => { e.stopPropagation(); I.sfx?.('tap'); F.lock(true); const y = await F.ask('이벤트를 멈추고 체육관에서 나갈까요?', '다음에 들어오면 이 장 처음부터 이어서 해요.', '나가기', '계속하기'); if (y) F.quitQ = true; else F.lock(false); };
  const KEY = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
  const kd = e => { if (KEY[e.key]) { e.preventDefault(); if (!el.classList.contains('lock')) press(KEY[e.key]); } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { if (!el.classList.contains('lock')) F.aQ = true; } };
  const ku = e => { if (KEY[e.key] === F.hold) press(null); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const off = () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  F.ask = (t, sm, yes = '네', no = '아니요') => new Promise(ok => { const w = document.createElement('div'); w.className = 'ev-ask'; w.innerHTML = `<div class="win"><p>${I.esc(t)}${sm ? `<small>${I.esc(sm)}</small>` : ''}</p><div class="bt2 gy-btns"><button type="button" data-a="0">${I.esc(no)}</button><button type="button" class="main" data-a="1">${I.esc(yes)}</button></div></div>`;
    root.appendChild(w); I.gse?.('DP_WIN_OPEN', .8); w.onclick = e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); I.sfx?.('tap'); w.remove(); ok(b.dataset.a === '1'); }; });
  // 자유롭게 걷기: h.step(칸) 걸은 뒤 · h.talk(사람) A 로 말 걸기 · h.warp(문) 문으로 들어가기. 무엇이든 값을 돌려주면 끝
  F.play = (h = {}) => new Promise(done => {
    let busy = false, end = false; F.follow = true; F.lock(false); F.aQ = false; F.quitQ = false;
    const fin = v => { end = true; F.lock(true); done(v); };
    const run = async f => { busy = true; F.lock(true); let r; try { r = await f(); } catch (e) { console.error(e); } busy = false; if (end) return; if (r !== undefined) fin(r); else F.lock(false); };
    const tick = () => { if (end) return; if (!I.isOpen() || !el.isConnected) return fin('quit');
      if (!busy) {
        if (F.quitQ) return fin('quit');
        const me = F.me;
        if (F.aQ) { F.aQ = false; const [dx, dy] = DIR[me.f], tx = me.x + dx, ty = me.y + dy, s = F.who(tx, ty), w = F.warpAt(tx, ty);
          if (s && h.talk) { run(async () => { s.face?.(me); return h.talk(s); }); } else if (w && h.warp) run(() => h.warp(w)); }
        else if (F.hold) { const d = F.hold, [dx, dy] = DIR[d], tx = me.x + dx, ty = me.y + dy, w = F.warpAt(tx, ty);
          if (w && (!w.d || w.d === d) && h.warp) { me.turn(d); run(() => h.warp(w)); }
          else if (F.solid(tx, ty, me)) { if (me.f !== d) me.turn(d); else if (!F.bumpT || performance.now() - F.bumpT > 420) { F.bumpT = performance.now(); I.gse?.('DP_WALL_HIT', .5); } }
          else { busy = true; me.go([[tx, ty]], 200).then(async () => { busy = false; if (end) return; if (h.step) { const r0 = h.step([me.x, me.y]); if (r0 && r0.then) { busy = true; F.lock(true); const r = await r0.catch(e => console.error(e)); busy = false; if (end) return; if (r !== undefined) return fin(r); F.lock(false); } else if (r0 !== undefined) fin(r0); } }); }
        }
      }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
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
