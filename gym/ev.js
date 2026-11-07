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
  };
  return A;
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
      const A = tools(I, def); const r = await def.ch[g.ev.ch](A);
      if (!I.isOpen()) return false;
      if (r === 'stop') return false;
      g.ev.ch++; I.save();
    }
    if (!def.ready) return 'wip';   // 아직 다 만들지 않은 이벤트: 있는 장까지만
    return true;
  },
};
})();
