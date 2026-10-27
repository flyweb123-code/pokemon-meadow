/* 체육관 배틀 (경완 2026-10-27: 4세대 DP·Pt 배틀 화면, 본가와 같은 턴제 배틀)
   - 규칙 계산은 포켓몬 쇼다운 엔진(gym/psim.js, MIT, pkmn/ps 를 묶은 것)이 하고, 이 파일은 화면·연출·AI·레벨을 맡는다
   - 화면 그림은 pret/pokeplatinum 에서 tools/gym/mkbattle.py 로 뽑은 플래티넘 원본(gym/img/bt), 포켓몬은 smogon/sprites 4·5세대(gym/img/pk)
   - 위 화면 256x192 + 아래(터치) 화면 256x192 를 DS 처럼 위아래로 놓고 화면 폭에 맞춰 키운다
   gym.js 가 이 파일을 불러 window.GymBattle 을 쓴다. 저장은 S.gym.mon(개체별 레벨·성격·특성·기술), S.gym.lu(라인업) */
(() => {
'use strict';
const GA = window.GA, { sfx, esc } = GA;
const SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO, S = GA.S;
const IMG = 'gym/img/';
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = L => L[Math.floor(Math.random() * L.length)];

// ---------- 한국어 조사 ----------
const jong = w => { const c = String(w || '').trim().slice(-1); const k = c.charCodeAt(0); if (k >= 0xac00 && k <= 0xd7a3) return (k - 0xac00) % 28; if (/[013678]/.test(c)) return 1; if (/[a-zA-Z]/.test(c)) return /[lmnr]/i.test(c) ? 1 : 0; return 0; };
const J = (w, a, b) => w + (jong(w) ? a : b);
const eun = w => J(w, '은', '는'), iga = w => J(w, '이', '가'), eul = w => J(w, '을', '를'), wa = w => J(w, '과', '와');

// ---------- 데이터 (기술·특성·성격·배울 기술: gym/data.json, tools/gym/mkdata.js) ----------
let D = null, MVI = null, FEM = new Set(), dataP = null;
function loadData() {
  return dataP || (dataP = Promise.all([
    fetch(`gym/data.json?v=${VER}`).then(r => { if (!r.ok) throw new Error('data'); return r.json(); }),
    fetch(`${IMG}pk/fem.json?v=${VER}`).then(r => r.ok ? r.json() : []).catch(() => [])
  ]).then(([d, fem]) => { D = d; MVI = new Map(d.mv.map((m, i) => [m[0], i])); FEM = new Set(fem); }).catch(e => { dataP = null; throw e; }));
}
let simP = null;
const loadSim = () => window.PSim ? Promise.resolve() : simP || (simP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = `gym/psim.js?v=${VER}`; s.onload = () => window.PSim ? ok() : no(new Error('sim')); s.onerror = () => { simP = null; no(new Error('sim')); }; document.head.appendChild(s); }));
const mvOf = id => D.mv[MVI.get(id)];   // [id, 이름, 타입, 분류(0 물리 1 특수 2 변화), 위력, 명중, PP, 우선도, 설명]
const mvKo = id => mvOf(id)?.[1] || id;
const NATS = () => Object.keys(D.nt);
const natKo = n => D.nt[n]?.[0] || n;
const abKo = a => D.ab[a] || a;
const STAT_KO = { hp: 'HP', atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', accuracy: '명중률', evasion: '회피율' };

// ---------- 레벨 ----------
// 기본 레벨은 개체 랭크로 (경완 기획: 개체값 랭크별 기본 레벨). 최대 100
const BASE_LV = { S: 30, A: 25, B: 20, C: 16, D: 12, E: 8, F: 5 };
const LV_MAX = 100;
// 성장 속도별 레벨 n 까지 필요한 경험치 (본가 공식, PokeAPI growth_rate id: 1 느림 2 보통 3 빠름 4 약간 느림 5 불규칙 6 변동)
function xpAt(g, n) {
  if (n <= 1) return 0; const c = n ** 3;
  switch (g) {
    case 1: return Math.floor(5 * c / 4);
    case 3: return Math.floor(4 * c / 5);
    case 4: return Math.max(0, Math.floor(6 / 5 * c - 15 * n * n + 100 * n - 140));
    case 5: return n <= 50 ? Math.floor(c * (100 - n) / 50) : n <= 68 ? Math.floor(c * (150 - n) / 100) : n <= 98 ? Math.floor(c * Math.floor((1911 - 10 * n) / 3) / 500) : Math.floor(c * (160 - n) / 100);
    case 6: return n <= 15 ? Math.floor(c * (Math.floor((n + 1) / 3) + 24) / 50) : n <= 36 ? Math.floor(c * (n + 14) / 50) : Math.floor(c * (Math.floor(n / 2) + 32) / 50);
    default: return c;
  }
}
const growth = sp => D.sp[sp]?.g || 2;
// 개체마다 정해지는 난수 (같은 개체는 늘 같은 성격·특성·기술)
const seeded = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; };
// 레벨 lv 까지 레벨업으로 배우는 기술 (진화 기술 0 포함, 최근 것 우선)
function lvMoves(sp, lv) { const L = D.sp[sp]?.lv || [], out = []; for (let i = 0; i < L.length; i += 2) if (L[i] <= lv) out.push([L[i], L[i + 1]]); return out; }
// 개체별 기술 4개: 본가 야생처럼 최근에 배운 기술 위주지만 개체마다 조금씩 다르게. 공격 기술이 최소 2개(있으면)
function pickMoves(sp, lv, r) {
  const L = lvMoves(sp, lv).map(([l, i]) => i).filter((v, k, a) => a.lastIndexOf(v) === k); if (!L.length) return ['tackle'];
  const w = L.map((_, k) => 1 + (k / L.length) * 4), take = [];
  while (take.length < Math.min(4, L.length)) { let t = r() * w.reduce((a, b) => a + b, 0), k = 0; while (t > w[k]) t -= w[k++]; if (!take.includes(L[k])) take.push(L[k]); w[k] = 0; if (w.every(x => !x)) break; }
  const atk = i => D.mv[i][3] !== 2;
  const pool = L.filter(i => atk(i) && !take.includes(i)).reverse();
  while (take.filter(atk).length < 2 && pool.length) { const k = take.findIndex(i => !atk(i)); if (k < 0) break; take[k] = pool.shift(); }
  if (!take.some(atk)) take[0] = MVI.get('tackle');
  return take.map(i => D.mv[i][0]);
}
// 체육관 개체 정보: 처음 볼 때 만든다
function gm(P) {
  const g = S.gym; g.mon = g.mon || {};
  let m = g.mon[P.id];
  if (!m || !D.sp[P.sp]) {
    const r = seeded('gm' + P.id), lv = BASE_LV[GA.rankOf(P)] || 5, ab = D.sp[P.sp]?.ab || ['noability'], nats = NATS();
    m = g.mon[P.id] = { lv, xp: xpAt(growth(P.sp), lv), nat: nats[Math.floor(r() * nats.length)], ab: ab[Math.floor(r() * Math.min(2, ab.length))], mv: pickMoves(P.sp, lv, r) };
  }
  if (!D.sp[P.sp]?.ab?.includes(m.ab)) m.ab = D.sp[P.sp]?.ab?.[0] || m.ab;   // 진화해서 특성이 바뀌면 새 종의 첫 특성
  return m;
}
const boxOf = id => S.box.find(p => p.id === id);
const nmOf = P => SPECIES[P.sp]?.n || '???';
const tyOk = P => (SPECIES[P.sp]?.t || []).includes(S.gym.ty);

// ---------- 라인업 (3개 저장, 6마리) ----------
function lus() { const g = S.gym; if (!Array.isArray(g.lu)) g.lu = [[], [], []]; g.lu = g.lu.map(L => (L || []).filter(id => { const P = boxOf(id); return P && tyOk(P); }).slice(0, 6)); g.luI = clampN(g.luI | 0, 0, 2); return g.lu; }
const curLu = () => lus()[S.gym.luI | 0];

// ---------- 그림 ----------
const pkSrc = (sp, o = {}) => `${IMG}pk/${sp}${o.b ? 'b' : ''}${o.s ? 's' : ''}${o.f && FEM.has(+sp) ? 'f' : ''}.png?v=${VER}`;
const TR_KO = { youngster: '반바지 꼬마', lass: '짧은 치마', bug_catcher: '곤충채집 소년', camper: '캠프 보이', picnicker: '피크닉 걸', hiker: '등산가', fisherman: '낚시꾼', swimmer_m: '수영팬티 소년', swimmer_f: '비키니 아가씨', cool_trainer_m: '엘리트 트레이너', cool_trainer_f: '엘리트 트레이너', beauty: '아가씨', gentleman: '신사', super_nerd: '괴짜', black_belt: '태권왕', bird_keeper: '새 조련사', psychic_m: '초능력자', psychic_f: '초능력자', engineer: '기술자', sailor: '뱃사람', rocker: '로커', tamer: '조련사', school_kid_m: '학원 소년', school_kid_f: '학원 소녀', battle_girl: '배틀걸', channeler: '기도사', juggler: '마술사', aroma_lady: '아로마 아가씨', ruin_maniac: '유적 마니아', poke_maniac: '포켓몬 마니아', pokemaniac: '포켓몬 마니아' };
const NAMES_M = ['철수', '민준', '지훈', '현우', '도윤', '준서', '태양', '하준', '시우', '건우', '동현', '재민', '우진', '성민', '영호'];
const NAMES_F = ['영희', '서연', '지우', '하은', '수아', '민지', '예린', '소희', '유나', '채원', '다은', '지민', '나연', '보람', '은비'];
// 연습 상대 (도전자 방문은 3단계): 트레이너 종류별로 어울리는 포켓몬
const PRACTICE = [
  { tr: 'youngster', f: 0, sp: [19, 21, 23, 27, 56, 96, 20, 22] },
  { tr: 'lass', f: 1, sp: [16, 29, 35, 39, 43, 52, 133, 183] },
  { tr: 'bug_catcher', f: 0, sp: [10, 11, 12, 13, 14, 15, 46, 48, 123, 127] },
  { tr: 'camper', f: 0, sp: [27, 50, 56, 58, 74, 66, 111, 104] },
  { tr: 'picnicker', f: 1, sp: [43, 69, 102, 114, 16, 183, 187, 191] },
  { tr: 'hiker', f: 0, sp: [74, 75, 95, 66, 67, 104, 111, 246] },
  { tr: 'fisherman', f: 0, sp: [129, 118, 119, 60, 72, 98, 116, 222] },
  { tr: 'swimmer_f', f: 1, sp: [120, 121, 72, 86, 90, 116, 118, 183] },
  { tr: 'super_nerd', f: 0, sp: [81, 88, 100, 109, 137, 37, 58, 125] },
  { tr: 'bird_keeper', f: 0, sp: [16, 17, 21, 22, 84, 83, 163, 177] },
  { tr: 'psychic_m', f: 0, sp: [63, 64, 79, 96, 97, 122, 177, 202] },
  { tr: 'black_belt', f: 0, sp: [56, 57, 66, 67, 106, 107, 236, 296] },
  { tr: 'cool_trainer_f', f: 1, sp: [36, 31, 34, 121, 130, 26, 59, 197] },
];

// ---------- 배틀 화면 ----------
let el = null, B = null;   // 화면, 진행 중인 배틀
const $b = s => el.querySelector(s);
function buildUI() {
  el = document.createElement('div'); el.className = 'bt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '배틀');
  el.innerHTML = `<div class="bt-ds">
    <div class="bt-top">
      <div class="bt-bg"></div>
      <i class="bt-pl e"></i><i class="bt-pl p"></i>
      <i class="bt-tr e"></i><i class="bt-tr p"></i>
      <div class="bt-mon e"><img alt=""></div><div class="bt-mon p"><img alt=""></div>
      <div class="bt-hb e"><b class="nm"></b><i class="sx"></i><span class="lv"></span><i class="st"></i><i class="hp"><i></i></i></div>
      <div class="bt-hb p"><b class="nm"></b><i class="sx"></i><span class="lv"></span><i class="st"></i><i class="hp"><i></i></i><span class="hpn"><b class="c"></b><b class="m"></b></span><i class="xp"><i></i></i></div>
      <div class="bt-fx"></div>
      <div class="bt-msg"><span class="t"></span><b class="cur" hidden>▼</b></div>
      <i class="bt-flash"></i>
    </div>
    <div class="bt-hinge"></div>
    <div class="bt-bot"><div class="bt-panel"></div></div>
  </div>`;
  document.getElementById('gym').appendChild(el);
  el.addEventListener('pointerup', () => { if (B?.tapWake) { const w = B.tapWake; B.tapWake = null; w(); } else if (B) B.fast = true; });
  addEventListener('resize', fit);
}
function fit() { if (!el) return; const W = innerWidth, H = innerHeight; const k = Math.max(1, Math.floor(Math.min(W / 256, (H - 20) / 394) * 4) / 4); el.style.setProperty('--k', k); }

// 대화창: 글자를 하나씩. wait=true 면 다 쓰고 잠깐 멈춤(누르면 바로 다음)
async function msg(t, hold = 650) {
  if (!B) return; const box = $b('.bt-msg .t'), cur = $b('.bt-msg .cur'); B.fast = false; cur.hidden = true; box.textContent = '';
  for (const ch of [...t]) { if (!B) return; if (B.fast) { box.textContent = t; break; } box.textContent += ch; await wait(ch === ' ' ? 12 : 26); }
  if (hold) { cur.hidden = false; await Promise.race([wait(hold + (B.fast ? 0 : 150)), new Promise(r => { if (B) B.tapWake = r; })]); if (B) B.tapWake = null; cur.hidden = true; }
}
// 누를 때까지 기다리는 대화 (승부 끝 등)
async function msgTap(t) { await msg(t, 0); if (!B) return; $b('.bt-msg .cur').hidden = false; await new Promise(r => { B.tapWake = r; }); $b('.bt-msg .cur').hidden = true; }

// 체력 막대 (본가: 초록 > 1/2, 노랑 > 1/5, 빨강)
function hpCol(r) { return r > .5 ? 'g' : r > .2 ? 'y' : 'r'; }
function paintHb(side, A) {
  const hb = $b(`.bt-hb.${side}`); if (!A) { hb.classList.remove('on'); return; }
  hb.querySelector('.nm').textContent = A.nm; hb.querySelector('.lv').textContent = A.lv;
  const sx = hb.querySelector('.sx'); sx.className = 'sx ' + (A.g || ''); sx.textContent = A.g === 'M' ? '♂' : A.g === 'F' ? '♀' : '';
  setHp(side, A.hp, A.mhp); setSt(side, A.st);
  if (side === 'p') { const g = A.xpg; hb.querySelector('.xp>i').style.width = (g ? clampN(g, 0, 1) * 100 : 0) + '%'; }
}
function setHp(side, hp, mhp) {
  const hb = $b(`.bt-hb.${side}`), r = mhp ? hp / mhp : 0, f = hb.querySelector('.hp>i');
  f.style.width = Math.ceil(r * 48) + 'px'; f.className = hpCol(r);
  if (side === 'p') { hb.querySelector('.hpn .c').textContent = Math.max(0, Math.round(hp)); hb.querySelector('.hpn .m').textContent = mhp; }
}
async function drainHp(side, A, to) {
  const from = A.hp, steps = Math.min(48, Math.max(6, Math.abs(Math.round((to - from) / A.mhp * 48))));
  for (let i = 1; i <= steps; i++) { if (!B) return; setHp(side, from + (to - from) * i / steps, A.mhp); await wait(B.fast ? 6 : 18); }
  A.hp = to; setHp(side, to, A.mhp);
}
const ST_X = { par: 0, frz: 1, slp: 2, psn: 3, tox: 3, brn: 4 };
function setSt(side, st) { const i = $b(`.bt-hb.${side} .st`); i.className = 'st' + (st in ST_X ? ' s' + ST_X[st] : ''); }

// 포켓몬 그림
function monEl(side) { return $b(`.bt-mon.${side}`); }
function showMon(side, A, on = true) {
  const m = monEl(side), img = m.querySelector('img');
  if (A) { img.src = pkSrc(A.sp, { b: side === 'p', s: A.shiny, f: A.g === 'F' }); img.alt = A.nm; }
  m.classList.toggle('on', on);
}
// 몬스터볼에서 나오기: 하얗게 커지며 나타남 (4세대처럼)
async function sendOut(side, A) {
  const m = monEl(side); m.classList.remove('faint', 'on'); m.classList.add('ball'); showMon(side, A, false);
  ballPoof(side); await wait(260); m.classList.add('on'); try { GA.cry?.(A.sp); } catch (e) {}
  await wait(380); m.classList.remove('ball');
  paintHb(side, A); $b(`.bt-hb.${side}`).classList.add('on'); await wait(250);
}
function ballPoof(side) {
  const fx = $b('.bt-fx'), x = side === 'e' ? 176 : 64, y = side === 'e' ? 70 : 118;
  for (let k = 0; k < 8; k++) { const i = document.createElement('i'); i.className = 'poof'; const a = k / 8 * Math.PI * 2; i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.setProperty('--dx', Math.cos(a) * 26 + 'px'); i.style.setProperty('--dy', Math.sin(a) * 18 + 'px'); fx.appendChild(i); setTimeout(() => i.remove(), 600); }
  try { sfx('pop'); } catch (e) {}
}
async function flash(n = 1) { const f = $b('.bt-flash'); for (let i = 0; i < n; i++) { f.classList.add('on'); await wait(70); f.classList.remove('on'); await wait(70); } }

// ---------- 아래 화면 ----------
function panel(html) { const p = $b('.bt-panel'); p.innerHTML = html; return p; }
function idlePanel() { panel(`<div class="bp-idle"></div>`); }
function mainPanel(A) {
  return new Promise(res => {
    const p = panel(`<div class="bp-main">
      <button class="bb fight" data-a="fight"><span>싸우다</span></button>
      <button class="bb bag" data-a="bag"><span>가방</span></button>
      <button class="bb run" data-a="run"><span>${B.practice ? '그만두기' : '기권'}</span></button>
      <button class="bb mon" data-a="mon"><span>포켓몬</span></button>
      <p class="bp-q">${esc(A.nm)}${jong(A.nm) ? '은' : '는'} 무엇을 할까?</p></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; sfx('tap'); res(b.dataset.a); };
  });
}
function movePanel(req) {
  return new Promise(res => {
    const mv = req.active[0].moves;
    const p = panel(`<div class="bp-moves">${[0, 1, 2, 3].map(i => { const m = mv[i]; if (!m) return `<i class="mvb empty"></i>`; const d = mvOf(m.id) || ['', m.move, 1]; const ty = d[2] || 1;
      return `<button class="mvb" data-i="${i}" style="background-image:url(${IMG}bt/mv_${ty}.png)" ${m.disabled || m.pp <= 0 ? 'disabled' : ''}><b>${esc(d[1])}</b><span class="pp">PP <em>${m.pp}/${m.maxpp}</em></span><span class="ty">${GA.tyIcon(ty)}</span></button>`; }).join('')}
      <button class="bb cancel" data-x><span>취소</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap'); if (b.hasAttribute('data-x')) return res(null); res(+b.dataset.i); };
  });
}
function partyPanel(req, forced) {
  return new Promise(res => {
    const L = req.side.pokemon;
    const p = panel(`<div class="bp-party">${L.map((m, i) => { const [hp, mhp] = (m.condition.split(' ')[0] || '0/0').split('/').map(Number); const fnt = /fnt/.test(m.condition), A = B.my[i], r = mhp ? hp / mhp : 0;
      return `<button class="pty${m.active ? ' act' : ''}${fnt ? ' fnt' : ''}" data-i="${i}" ${m.active || fnt ? 'disabled' : ''}><img src="${pkSrc(A.sp, { s: A.shiny, f: A.g === 'F' })}" alt=""><b>${esc(A.nm)}</b><span class="lv">Lv${A.lv}</span><i class="hp"><i class="${hpCol(r)}" style="width:${r * 100}%"></i></i><span class="hpn">${fnt ? '기절' : `${hp}/${mhp}`}</span></button>`; }).join('')}
      ${forced ? '' : '<button class="bb cancel" data-x><span>취소</span></button>'}</div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap'); if (b.hasAttribute('data-x')) return res(null); res(+b.dataset.i); };
  });
}
function yesNo(q) {
  return new Promise(res => { const p = panel(`<div class="bp-yn"><p>${q}</p><button class="bb yes" data-a="1"><span>네</span></button><button class="bb no" data-a="0"><span>아니요</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; sfx('tap'); res(b.dataset.a === '1'); }; });
}

// ---------- 쇼다운 세트 ----------
const toID = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function psSet(o) {
  const dx = PSim.Dex, sp = dx.species.get(D.sp[o.sp]?.id || String(o.sp));
  const iv = o.iv || [20, 20, 20, 20, 20, 20];
  return { name: o.nm, species: sp.name, level: o.lv, moves: o.mv, ability: o.ab, nature: dx.natures.get(o.nat || 'hardy').name, item: '',
    gender: o.g === 'M' || o.g === 'F' ? o.g : '', shiny: !!o.shiny,
    ivs: { hp: iv[0], atk: iv[1], def: iv[2], spa: iv[3], spd: iv[4], spe: iv[5] }, evs: o.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };
}
function myEntry(P) { const m = gm(P); return { pid: P.id, sp: P.sp, nm: nmOf(P), lv: m.lv, mv: m.mv, ab: m.ab, nat: m.nat, iv: P.iv, g: P.sex === 'f' ? 'F' : P.sex === 'm' ? 'M' : '', shiny: !!P.shiny }; }
// 상대 포켓몬: 그 레벨에 배우는 기술 중 무작위 4개
function foeEntry(sp, lv) {
  const r = Math.random, ab = D.sp[sp]?.ab || ['noability'], nats = NATS(), g = SPECIES[sp]?.g;
  const sex = /수컷만|♂만/.test(g || '') ? 'M' : /암컷만|♀만/.test(g || '') ? 'F' : Math.random() < .5 ? 'M' : 'F';
  return { sp, nm: SPECIES[sp]?.n || String(sp), lv, mv: pickMoves(sp, lv, r), ab: ab[Math.floor(r() * Math.min(2, ab.length))], nat: pick(nats), iv: Array.from({ length: 6 }, () => Math.floor(rnd(8, 26))), g: sex, shiny: Math.random() < 1 / 4096 };
}

// ---------- AI (난이도: 0 쉬움 1 보통 2 어려움) ----------
function aiChoice(btl, diff) {
  const side = btl.p2, req = side.activeRequest; if (!req || req.wait) return null;
  const foe = btl.p1.active[0], me = side.active[0];
  const score = (mon, mid) => { const m = btl.dex.moves.get(mid); if (!foe || foe.fainted) return 1; if (m.category === 'Status') return diff ? 18 + Math.random() * 14 : 20;
    if (!btl.dex.getImmunity(m.type, foe)) return 0; const eff = 2 ** btl.dex.getEffectiveness(m.type, foe); const stab = mon.getTypes().includes(m.type) ? 1.5 : 1;
    return (m.basePower || 40) * eff * stab * ((m.accuracy === true ? 100 : m.accuracy) / 100); };
  if (req.forceSwitch) {
    const opts = req.side.pokemon.map((p, i) => ({ p, i, mon: side.pokemon[i] })).filter(o => !o.p.active && !/fnt/.test(o.p.condition));
    if (!opts.length) return 'pass';
    if (diff === 0) return 'switch ' + (pick(opts).i + 1);
    const best = opts.map(o => ({ o, s: Math.max(...o.mon.moveSlots.map(ms => score(o.mon, ms.id))) })).sort((a, b) => b.s - a.s)[0];
    return 'switch ' + (best.o.i + 1);
  }
  const mv = req.active[0].moves.map((m, i) => ({ m, i })).filter(o => !o.m.disabled && o.m.pp > 0);
  if (!mv.length) return 'move 1';
  if (diff === 0 && Math.random() < .7) return 'move ' + (pick(mv).i + 1);
  const sc = mv.map(o => ({ o, s: score(me, o.m.id) * rnd(.85, 1.15) })).sort((a, b) => b.s - a.s);
  if (diff === 1 && Math.random() < .25) return 'move ' + (pick(mv).i + 1);
  // 어려움: 상성이 아주 나쁘면 가끔 교체
  if (diff === 2 && sc[0].s < 40 && !req.active[0].trapped && Math.random() < .35) {
    const opts = req.side.pokemon.map((p, i) => ({ p, i, mon: side.pokemon[i] })).filter(o => !o.p.active && !/fnt/.test(o.p.condition));
    const best = opts.map(o => ({ o, s: Math.max(...o.mon.moveSlots.map(ms => score(o.mon, ms.id))) })).sort((a, b) => b.s - a.s)[0];
    if (best && best.s > sc[0].s * 1.8) return 'switch ' + (best.o.i + 1);
  }
  return 'move ' + (sc[0].o.i + 1);
}

// ---------- 배틀 진행 ----------
// opts: { my: [P...], foe: { tr, cls, nm, f, team: [entry...] }, diff, practice, bg, music: 'train'|'gymBattle'|'rival'|'champ' }
const M = (f, ...a) => { try { window.GymBGM?.[f](...a); } catch (e) {} };   // 체육관 BGM (gym/bgm.js)
async function run(opts) {
  await Promise.all([loadData(), loadSim()]);
  if (!el) buildUI(); fit();
  const my = opts.my.map(myEntry), foeT = opts.foe.team;
  const btl = new PSim.Battle({ formatid: 'gen9customgame', seed: [1, 2, 3, 4].map(() => Math.floor(Math.random() * 65536)) });
  btl.setPlayer('p1', { name: '관장', team: my.map(psSet) });
  btl.setPlayer('p2', { name: opts.foe.nm, team: foeT.map(psSet) });
  B = { btl, my, foe: foeT, act: { p: null, e: null }, li: 0, practice: !!opts.practice, diff: opts.diff ?? 1, fast: false, tapWake: null, out: null };
  const meF = GA.trOf().sex === 'f';
  el.classList.remove('off'); el.hidden = false; el.className = 'bt intro';
  $b('.bt-bg').style.backgroundImage = `url(${IMG}bt/bg_${opts.bg || 'in1'}.png)`;
  $b('.bt-tr.e').style.backgroundImage = `url(${IMG}tr/${opts.foe.tr}.png)`;
  $b('.bt-tr.p').style.backgroundImage = `url(${IMG}trb/${meF ? 'leaf' : 'red'}.png)`;
  ['e', 'p'].forEach(s => { $b(`.bt-hb.${s}`).classList.remove('on'); monEl(s).className = `bt-mon ${s}`; setSt(s, ''); });
  $b('.bt-msg .t').textContent = ''; idlePanel();
  // 등장: 화면이 번쩍이며 가로줄로 열리고, 발판·트레이너가 양옆에서 미끄러져 들어온다
  const music = opts.music || 'train'; M('play', music, { fade: .2 }); M('prep', music === 'train' ? 'winTrain' : 'winGym');
  await wait(40); el.classList.add('open'); try { sfx('start'); } catch (e) {}
  await wait(900); el.classList.remove('intro');
  const foeNm = B.foeNm = `${opts.foe.cls} ${opts.foe.nm}`;
  await msg(`${iga(foeNm)} 승부를 걸어왔다!`, 900);
  btl.makeChoices('default', 'default');   // 팀 미리보기: 라인업 순서 그대로
  try { await play(); } catch (e) { console.error(e); }
  const won = btl.winner === '관장', out = B?.out;
  if (B) {
    if (out !== 'quit') {
      $b('.bt-tr.e').classList.add('back');
      if (won) { M('play', music === 'train' ? 'winTrain' : 'winGym', { fade: .05 }); await msgTap(`${wa(foeNm)}의 승부에서 이겼다!`); }
      else await msgTap('승부에서 졌다…');
    }
  }
  M('play', 'gym', { fade: 1.2 });
  el.classList.add('off'); await wait(450); el.hidden = true; const res = { won, quit: out === 'quit', turns: btl.turn, my: B?.my }; B = null; return res;
}

// 쇼다운 기록을 한 줄씩 읽어 화면에 보여 준다. 고를 차례가 오면 아래 화면 메뉴
async function play() {
  const btl = B.btl;
  for (;;) {
    await readLog();
    if (!B || btl.ended) return;
    const r1 = btl.p1.activeRequest, r2 = btl.p2.activeRequest;
    let c1 = null;
    if (r1 && !r1.wait) { c1 = await choose(r1); if (!B) return; if (c1 === 'quit') { B.out = 'quit'; btl.choose('p1', 'forfeit'); await readLog(); return; } }
    const c2 = r2 && !r2.wait ? aiChoice(btl, B.diff) : null;
    idlePanel();
    if (c1 && c2) btl.makeChoices(c1, c2); else if (c1) btl.choose('p1', c1); else if (c2) btl.choose('p2', c2); else return;
  }
}
async function choose(req) {
  const A = B.act.p;
  if (req.forceSwitch) { await msg(`다음 포켓몬을 골라 주세요.`, 0); const i = await partyPanel(req, true); return 'switch ' + (i + 1); }
  for (;;) {
    const a = await mainPanel(A);
    if (a === 'fight') { if (req.active[0].moves.every(m => m.disabled || m.pp <= 0)) return 'move 1'; const i = await movePanel(req); if (i == null) continue; return 'move ' + (i + 1); }
    if (a === 'mon') { const i = await partyPanel(req, false); if (i == null) continue; if (req.active[0].trapped) { await msg(`${eun(A.nm)} 교체할 수 없다!`); continue; } return 'switch ' + (i + 1); }
    if (a === 'bag') { await msg('체육관 배틀에서는 가방을 쓸 수 없다!'); continue; }
    if (a === 'run') { if (await yesNo(B.practice ? '연습 배틀을 그만둘까요?' : '기권할까요? 진 것으로 처리돼요.')) return 'quit'; continue; }
  }
}
// 이름표 "p1a: 피카츄" → 편
const sideOf = id => id.startsWith('p1') ? 'p' : 'e';
const nmIn = (id) => id.replace(/^p\da?: /, '');
const who = id => (sideOf(id) === 'e' ? '상대 ' : '') + nmIn(id);
function partyIdx(side, line) {
  const L = side === 'p' ? B.btl.p1.pokemon : B.btl.p2.pokemon, nm = nmIn(line[2]), spn = line[3].split(',')[0];
  const k = L.findIndex(p => p.name === nm && p.species.name === spn && !p.fainted && p !== (side === 'p' ? B.act.p?.pk : B.act.e?.pk));
  return k >= 0 ? k : L.findIndex(p => p.name === nm);
}
async function readLog() {
  const L = B.btl.log;
  while (B && B.li < L.length) {
    let line = L[B.li++];
    if (line === '|split|p1' || line === '|split|p2') { line = L[B.li]; B.li += 2; }   // 정확한 체력 줄만 쓴다
    try { await handle(line.split('|')); } catch (e) { console.error(e, line); }
  }
}
const hpOf = s => { const [a] = String(s || '').split(' '); if (a === '0') return [0, 0]; const [h, m] = a.split('/').map(Number); return [h || 0, m || 0]; };
const stOf = s => (String(s || '').split(' ')[1] || '').replace('fnt', '');
async function handle(a) {
  const k = a[1], A = s => B.act[s];
  switch (k) {
    case 'switch': case 'drag': {
      const s = sideOf(a[2]), i = partyIdx(s, a), det = a[3].split(', '), [hp, mhp] = hpOf(a[4]);
      const src = s === 'p' ? B.my[i] : B.foe[i], pk = (s === 'p' ? B.btl.p1 : B.btl.p2).pokemon[i];
      const old = A(s);
      if (old && !old.fnt) { await msg(s === 'p' ? `돌아와! ${old.nm}!` : `${eun(B.foeNm)} ${eul(old.nm)} 되돌렸다!`, 0); monEl(s).classList.add('recall'); await wait(380); monEl(s).classList.remove('on', 'recall'); $b(`.bt-hb.${s}`).classList.remove('on'); }
      const sp = PSim.Dex.species.get(det[0]).num || src.sp;
      const X = B.act[s] = { i, pk, nm: src.nm, sp, lv: +(det.find(d => /^L\d+/.test(d)) || 'L100').slice(1), g: det.includes('F') ? 'F' : det.includes('M') ? 'M' : '', shiny: det.includes('shiny'), hp, mhp, st: stOf(a[4]), fnt: false };
      if (s === 'p') X.xpg = xpGauge(src);
      if (s === 'e') { if (!B.eOut) { B.eOut = 1; $b('.bt-tr.e').classList.add('away'); } await msg(`${eun(B.foeNm)} ${eul(X.nm)} 내보냈다!`, 0); }
      else { if (!B.pOut) { B.pOut = 1; $b('.bt-tr.p').classList.add('throw'); } await msg(`가랏! ${X.nm}!`, 0); }
      await sendOut(s, X); await wait(200);
      break;
    }
    case 'move': {
      const s = sideOf(a[2]), X = A(s); const id = toID(a[3]); B.lastMove = { s, id };
      await msg(`${who(a[2])}의 ${mvKo(id)}!`, 0);
      await moveFx(s, id, a.includes('[miss]') || a.some(x => x === '[still]'));
      break;
    }
    case '-damage': {
      const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); const from = (a[4] || '').replace('[from] ', '');
      if (from) { const t = dmgFrom(from, a[2]); if (t) await msg(t, 300); }
      if (!from) await hitFx(s);
      if (mhp) X.mhp = mhp; await drainHp(s, X, hp); X.st = stOf(a[3]) || X.st; break;
    }
    case '-heal': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); if (mhp) X.mhp = mhp; await drainHp(s, X, hp); await msg(`${who(a[2])}의 체력이 회복되었다!`); break; }
    case '-sethp': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp] = hpOf(a[3]); await drainHp(s, X, hp); break; }
    case 'faint': { const s = sideOf(a[2]), X = A(s); if (!X) break; X.fnt = true; try { GA.cry?.(X.sp); } catch (e) {} await wait(250); monEl(s).classList.add('faint'); try { sfx('stomp'); } catch (e) {} await wait(500); $b(`.bt-hb.${s}`).classList.remove('on'); await msg(`${who(a[2]) === nmIn(a[2]) ? eun(X.nm) : '상대 ' + eun(X.nm)} 쓰러졌다!`); break; }
    case '-supereffective': await msg('효과가 굉장했다!'); break;
    case '-resisted': await msg('효과가 별로인 듯하다…'); break;
    case '-immune': await msg(`${who(a[2])}에게는 효과가 없는 것 같다…`); break;
    case '-crit': await msg('급소에 맞았다!'); break;
    case '-miss': await msg(a[3] ? `${who(a[3])}에게는 맞지 않았다!` : `${who(a[2])}의 공격은 빗나갔다!`); break;
    case '-fail': await msg('그러나 실패했다!'); break;
    case '-nothing': await msg('그러나 아무 일도 일어나지 않았다!'); break;
    case '-status': { const s = sideOf(a[2]), X = A(s); if (X) { X.st = a[3]; setSt(s, a[3]); } await stFx(s, a[3]); await msg(statusMsg(who(a[2]), a[3])); break; }
    case '-curestatus': { const s = sideOf(a[2]), X = A(s); if (X) { X.st = ''; setSt(s, ''); } await msg(cureMsg(who(a[2]), a[3])); break; }
    case 'cant': await msg(cantMsg(who(a[2]), a[3])); break;
    case '-boost': case '-unboost': { const n = +a[4] || 0, up = k === '-boost', s = sideOf(a[2]); await statFx(s, up); await msg(`${who(a[2])}의 ${iga(STAT_KO[a[3]] || a[3])} ${n >= 3 ? '매우 크게 ' : n === 2 ? '크게 ' : n === 0 ? '더 이상 ' : ''}${n === 0 ? (up ? '올라가지 않는다!' : '떨어지지 않는다!') : up ? '올라갔다!' : '떨어졌다!'}`); break; }
    case '-weather': { const w = a[2]; if (a.includes('[upkeep]')) break; const T = { RainDance: '비가 내리기 시작했다!', SunnyDay: '햇살이 강해졌다!', Sandstorm: '모래바람이 불기 시작했다!', Hail: '싸라기눈이 내리기 시작했다!', Snow: '눈이 내리기 시작했다!', none: '날씨가 원래대로 돌아왔다!' }; if (T[w]) await msg(T[w]); break; }
    case '-start': { const t = startMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-end': { const t = endMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-activate': { const t = actMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-ability': await msg(`${who(a[2])}의 ${abKo(toID(a[3]))}!`, 500); break;
    case '-hitcount': await msg(`${a[3]}번 맞았다!`); break;
    case '-ohko': await msg('일격필살!'); break;
    case '-prepare': await msg(`${who(a[2])}${jong(nmIn(a[2])) ? '은' : '는'} 힘을 모으고 있다!`); break;
    case '-mustrecharge': break;
    case '-sidestart': { const t = sideMsg(a[2], a[3], true); if (t) await msg(t); break; }
    case '-sideend': { const t = sideMsg(a[2], a[3], false); if (t) await msg(t); break; }
    case '-fieldstart': case '-fieldend': break;
    case 'turn': break;
    case 'win': break;
  }
}
const dmgFrom = (f, id) => { const n = who(id); f = f.replace(/^item: |^ability: /, ''); const T = { brn: `${n}${jong(nmIn(id)) ? '은' : '는'} 화상 데미지를 입었다!`, psn: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, tox: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, Recoil: `${n}${jong(nmIn(id)) ? '은' : '는'} 공격의 반동을 받았다!`, confusion: '영문도 모른 채 자신을 공격했다!', Sandstorm: `모래바람이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, Hail: `싸라기눈이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, 'Leech Seed': `씨뿌리기가 ${n}의 체력을 빼앗는다!` }; return T[f] || ''; };
function statusMsg(n, st) { const T = { brn: '화상을 입었다!', par: '마비되어 기술이 나오기 어려워졌다!', slp: '잠들어 버렸다!', frz: '얼어붙었다!', psn: '독에 걸렸다!', tox: '맹독을 입었다!' }; return `${eun(n)} ${T[st] || '상태 이상이 되었다!'}`; }
function cureMsg(n, st) { const T = { slp: '눈을 떴다!', frz: '얼음 상태가 나았다!', par: '마비가 풀렸다!', brn: '화상이 나았다!', psn: '독이 사라졌다!', tox: '독이 사라졌다!' }; return `${eun(n)} ${T[st] || '상태가 나았다!'}`; }
function cantMsg(n, r) { const T = { par: '몸이 저려서 움직일 수 없다!', slp: '쿨쿨 잠들어 있다.', frz: '얼어버려서 움직일 수 없다!', flinch: '풀이 죽어 기술을 쓸 수 없었다!', recharge: '공격의 반동으로 움직일 수 없다!', nopp: '기술의 남은 PP 가 없다!' }; return `${eun(n)} ${T[r] || '움직일 수 없다!'}`; }
function startMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠졌다!`, Substitute: `${n}의 대타가 나타났다!`, 'Leech Seed': `${n}에게 씨앗을 심었다!`, Taunt: `${eun(n)} 도발에 넘어가 버렸다!`, Encore: `${eun(n)} 앙코르를 받았다!`, Attract: `${eun(n)} 헤롱헤롱해졌다!`, typechange: '', 'Focus Energy': `${eun(n)} 의욕이 넘치고 있다!` }; return T[w] ?? ''; }
function endMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${n}의 혼란이 풀렸다!`, Substitute: `${n}의 대타는 사라져 버렸다…`, Taunt: `${n}의 도발 효과가 풀렸다!`, Encore: `${n}의 앙코르 상태가 풀렸다!` }; return T[w] ?? ''; }
function actMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠져 있다!`, Protect: `${eun(n)} 공격으로부터 몸을 지켰다!`, Substitute: '대타가 대신 공격을 받았다!', 'Destiny Bond': `${eun(n)} 상대를 길동무로 삼았다!`, Endure: `${eun(n)} 공격을 버텼다!` }; return T[w] ?? ''; }
function sideMsg(sd, w, on) { const mine = sd.startsWith('p1'), who2 = mine ? '우리 편' : '상대 편'; w = (w || '').replace('move: ', ''); const T = { Reflect: on ? `리플렉터로 ${who2}의 물리 공격에 강해졌다!` : `${who2}의 리플렉터가 사라졌다!`, 'Light Screen': on ? `빛의장막으로 ${who2}의 특수 공격에 강해졌다!` : `${who2}의 빛의장막이 사라졌다!`, Spikes: on ? `${who2} 발밑에 압정이 뿌려졌다!` : '', 'Stealth Rock': on ? `${who2} 주변에 뾰족한 바위가 떠다니기 시작했다!` : '', Tailwind: on ? `${who2}에 순풍이 불기 시작했다!` : `${who2}의 순풍이 멈췄다!`, Safeguard: on ? `${who2}는 신비의 베일에 감싸였다!` : '' }; return T[w] || ''; }

// ---------- 연출 (4세대 느낌. 기술별 본가 연출은 다음 단계에서 기술마다 붙인다) ----------
const TY_SFX = { 10: 'fire', 11: 'puddle', 13: 'bolt', 15: 'ice', 4: 'poison', 8: 'ghost', 18: 'fairy', 6: 'rock', 5: 'dig', 2: 'punch', 14: 'special', 12: 'bush', 3: 'fly', 7: 'chup', 9: 'iron', 16: 'beam', 17: 'scare', 1: 'ram' };
const TY_FX = { 10: '#ff7a30', 11: '#48a0ff', 13: '#ffe040', 15: '#a8f0ff', 4: '#c060e0', 8: '#7058a8', 18: '#ff9ed8', 6: '#b8a058', 5: '#d8b060', 2: '#e05030', 14: '#ff70b0', 12: '#68d048', 3: '#a8c8ff', 7: '#a8c020', 9: '#c8c8d8', 16: '#7050f0', 17: '#504048', 1: '#f8f8f8' };
async function moveFx(s, id, miss) {
  const m = mvOf(id); if (!m) return; const ty = m[2], cat = m[3], me = monEl(s), foe = monEl(s === 'p' ? 'e' : 'p');
  try { sfx(TY_SFX[ty] || 'ram'); } catch (e) {}
  if (cat === 2) { me.classList.add('glow'); me.style.setProperty('--fx', TY_FX[ty] || '#fff'); await wait(520); me.classList.remove('glow'); return; }
  if (cat === 0) { me.classList.add('lunge'); await wait(260); me.classList.remove('lunge'); }
  else { const fx = $b('.bt-fx'), o = document.createElement('i'); o.className = 'orb ' + s; o.style.setProperty('--fx', TY_FX[ty] || '#fff'); fx.appendChild(o); await wait(420); o.remove(); }
  if (miss) await wait(120);
}
async function hitFx(s) { const m = monEl(s); for (let i = 0; i < 3; i++) { m.classList.add('blink'); await wait(B?.fast ? 40 : 70); m.classList.remove('blink'); await wait(B?.fast ? 40 : 70); } }
async function statFx(s, up) { const m = monEl(s); m.classList.add(up ? 'up' : 'down'); try { sfx(up ? 'rise' : 'lev'); } catch (e) {} await wait(560); m.classList.remove('up', 'down'); }
async function stFx(s, st) { const m = monEl(s); m.style.setProperty('--fx', { brn: '#ff6030', par: '#ffe040', slp: '#a0a0c0', frz: '#a8f0ff', psn: '#c060e0', tox: '#a040c0' }[st] || '#fff'); m.classList.add('glow'); await wait(450); m.classList.remove('glow'); }
function xpGauge(src) { const P = boxOf(src.pid); if (!P) return 0; const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1); return b > a ? (m.xp - a) / (b - a) : 1; }

// ---------- 배틀 탭: 라인업 (gym.js 의 배틀 메뉴 창) ----------
let tabEl = null;
async function tab(sh) {
  tabEl = sh; sh.innerHTML = `<h3>배틀</h3><p class="gy-lead">불러오는 중…</p>`;
  try { await loadData(); } catch (e) { sh.innerHTML = `<h3>배틀</h3><p class="gy-lead">배틀 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>`; return; }
  drawTab();
}
function drawTab() {
  const sh = tabEl; if (!sh) return; const g = S.gym, L = lus(), cur = L[g.luI], ty = g.ty;
  const can = S.box.filter(tyOk);
  sh.innerHTML = `<h3>배틀</h3><p class="gy-lead">${GA.tyIcon(ty)} ${TYPE_KO[ty]} 타입 포켓몬으로 6마리까지 라인업을 짜요. 라인업은 3개까지 저장돼요.</p>
    <div class="lu-tabs" role="tablist">${L.map((l, i) => `<button role="tab" aria-selected="${i === g.luI}" data-lu="${i}">라인업 ${i + 1}<small>${l.length}/6</small></button>`).join('')}</div>
    <div class="lu-grid">${[0, 1, 2, 3, 4, 5].map(i => { const P = boxOf(cur[i]); if (!P) return `<button class="lu-slot empty" data-add="${i}" ${can.length ? '' : 'disabled'}><span>+</span></button>`; const m = gm(P);
      return `<button class="lu-slot" data-p="${P.id}"><i class="lu-n">${i + 1}</i><img src="${pkSrc(P.sp, { s: P.shiny, f: P.sex === 'f' })}" alt=""><b>${esc(nmOf(P))}</b><span>Lv.${m.lv} · ${GA.rankOf(P)}</span></button>`; }).join('')}</div>
    ${can.length ? '' : `<p class="lu-none">${TYPE_KO[ty]} 타입 포켓몬이 아직 없어요. 알을 부화시켜 데려와 주세요.</p>`}
    <div class="lu-act"><button class="gy-key main" data-go ${cur.length ? '' : 'disabled'}>연습 배틀</button><p>연습 배틀은 아무 트레이너와 겨뤄 보는 거예요. 보상은 없어요.</p></div>`;
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap');
    if (b.dataset.lu) { g.luI = +b.dataset.lu; GA.save(); drawTab(); return; }
    if (b.dataset.add) return pickMon();
    if (b.dataset.p) return monPop(b.dataset.p);
    if (b.hasAttribute('data-go')) return practice();
  };
}
function gymPop(html, onClick) { const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) return p.remove(); const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, () => p.remove(), b); } };
  document.querySelector('#gym .gy-main').appendChild(p); return p; }
function pickMon() {
  const cur = curLu(), L = S.box.filter(p => tyOk(p) && !cur.includes(p.id)).map(P => ({ P, m: gm(P) })).sort((a, b) => b.m.lv - a.m.lv || GA.ivSum(b.P) - GA.ivSum(a.P));
  if (!L.length) { gymPop(`<h4>라인업</h4><p class="gy-msg">더 넣을 수 있는 ${TYPE_KO[S.gym.ty]} 타입 포켓몬이 없어요.</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, c) => c()); return; }
  gymPop(`<h4>라인업에 넣을 포켓몬</h4><div class="lu-pick">${L.map(({ P, m }) => `<button data-a="${P.id}"><img src="${pkSrc(P.sp, { s: P.shiny, f: P.sex === 'f' })}" alt=""><b>${esc(nmOf(P))}</b><span>Lv.${m.lv}</span><em>${GA.rankOf(P)}</em></button>`).join('')}</div><div class="gy-btns one"><button data-a="x">닫기</button></div>`,
    (a, close) => { close(); if (a === 'x') return; const c = curLu(); if (c.length < 6) c.push(+a || a); GA.save(); drawTab(); });
}
function monPop(id) {
  const P = boxOf(+id || id); if (!P) return; const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1), nt = D.nt[m.nat] || ['', '', ''];
  const mv = m.mv.map(x => mvOf(x)).filter(Boolean);
  gymPop(`<div class="mp-head"><img src="${pkSrc(P.sp, { s: P.shiny, f: P.sex === 'f' })}" alt=""><div><h4>${esc(nmOf(P))}</h4><p>Lv.${m.lv} · 랭크 ${GA.rankOf(P)}</p><i class="mp-xp"><i style="width:${m.lv >= LV_MAX ? 100 : clampN((m.xp - a) / (b - a), 0, 1) * 100}%"></i></i><small>${m.lv >= LV_MAX ? '최고 레벨' : `다음 레벨까지 ${Math.max(0, b - m.xp).toLocaleString()}`}</small></div></div>
    <dl class="gy-info mp-info"><dt>성격</dt><dd><span>${natKo(m.nat)}${nt[1] ? ` <small>${STAT_KO[nt[1]]}↑ ${STAT_KO[nt[2]]}↓</small>` : ''}</span></dd><i></i><dt>특성</dt><dd><span>${abKo(m.ab)}</span></dd><i></i></dl>
    <div class="mp-moves">${mv.map(x => `<div class="mp-mv" style="--tc:${GA.TYPE_C?.[x[2]] || '#888'}">${GA.tyIcon(x[2])}<b>${esc(x[1])}</b><span>${['물리', '특수', '변화'][x[3]]}${x[4] ? ` · 위력 ${x[4]}` : ''}</span><p>${esc(x[8] || '')}</p></div>`).join('')}</div>
    <div class="gy-btns"><button data-a="up">앞으로</button><button data-a="rm">빼기</button><button class="main" data-a="x">닫기</button></div>`,
    (a, close) => { const c = curLu(), i = c.indexOf(P.id); if (a === 'rm' && i >= 0) c.splice(i, 1); if (a === 'up' && i > 0) { c.splice(i, 1); c.splice(i - 1, 0, P.id); } close(); GA.save(); drawTab(); });
}
// 연습 배틀: 라인업 평균 레벨 근처의 아무 트레이너
async function practice() {
  const ids = curLu(); if (!ids.length) return; const my = ids.map(boxOf).filter(Boolean);
  const avg = Math.round(my.reduce((s, P) => s + gm(P).lv, 0) / my.length);
  const T = pick(PRACTICE), n = clampN(Math.round(rnd(1, Math.min(3, my.length) + .4)), 1, 3);
  const team = Array.from({ length: n }, () => foeEntry(pick(T.sp), clampN(avg + Math.round(rnd(-3, 1)), 2, 100)));
  const foe = { tr: T.tr, cls: TR_KO[T.tr] || '트레이너', nm: pick(T.f ? NAMES_F : NAMES_M), team };
  document.body.classList.add('gymBattle');
  try { await run({ my, foe, diff: 1, practice: true, bg: pick(['in1', 'in2', 'in3']) }); }
  catch (e) { console.error(e); GA.toast?.('배틀을 시작하지 못했어요'); }
  finally { document.body.classList.remove('gymBattle'); drawTab(); }
}

window.GymBattle = { tab, run, loadData, loadSim, gm, lus, _xpAt: xpAt, _psSet: psSet, _foeEntry: foeEntry, get _B() { return B; } };
})();
