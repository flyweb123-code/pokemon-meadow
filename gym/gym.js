/* 체육관 모드 (경완 기획 2026-10-27): 내 포켓몬으로 나만의 체육관을 운영한다.
   index.html·beta.html 의 체육관 훅이 필드의 체육관 버튼을 누를 때 이 파일을 불러 Gym.prepare() → Gym.enter() 를 부른다.
   저장은 S.gym (본 게임 저장에 같이 들어감). 그림은 본가 파이어레드(pret/pokefirered)에서 tools/gym/mkassets.py 로 뽑은 gym/img/ */
(() => {
'use strict';
// 게임 본체가 꺼내 준 것 (index.html·beta.html 의 체육관 훅 window.GA)
const GA = window.GA, { tyIcon, sfx, save, trOf, esc, menuDots } = GA;
const SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO;
const S = GA.S;
const IMG = 'gym/img/';
const $g = s => root.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 체육관 디자인 (본가 관동 체육관 맵) ----------
// 좌표는 16px 칸. leader: 관장(나) 자리, door: 문, path: 문 → 관장 앞까지 도전자가 걷는 길(꺾이는 점들),
// slots: 고용 트레이너 자리 [x, y, 보는 방향] (도전자는 그 트레이너가 보는 칸에 멈춰서 배틀), guy: 체육관 안내원
const DESIGNS = [
  { id: 'pewter', n: '바위 계단', sub: '회색시티 체육관', w: 13, h: 16, leader: [6, 5], door: [6, 14], guy: [8, 13],
    path: [[6, 14], [6, 6]], slots: [[7, 13, 'l'], [5, 11, 'r'], [7, 10, 'l'], [5, 9, 'r'], [7, 8, 'l']] },
  { id: 'cerulean', n: '물 위 다리', sub: '블루시티 체육관', w: 17, h: 20, leader: [8, 6], door: [8, 18], guy: [7, 18],
    path: [[8, 18], [8, 16], [9, 16], [9, 10], [8, 10], [8, 7]], slots: [[7, 16, 'r'], [8, 13, 'r'], [10, 10, 'l'], [7, 9, 'r'], [9, 8, 'l']] },
  { id: 'vermilion', n: '번개 관문', sub: '갈색시티 체육관', w: 11, h: 21, leader: [5, 2], door: [5, 19], guy: [4, 18],
    path: [[5, 19], [5, 16], [4, 16], [4, 9], [5, 9], [5, 3]], slots: [[6, 17, 'l'], [3, 15, 'r'], [5, 13, 'l'], [3, 11, 'r'], [6, 8, 'l']] },
  { id: 'celadon', n: '꽃 정원', sub: '무지개시티 체육관', w: 13, h: 20, leader: [6, 4], door: [6, 18], guy: [5, 17],
    path: [[6, 18], [6, 5]], slots: [[7, 17, 'l'], [5, 13, 'r'], [7, 11, 'l'], [5, 9, 'r'], [7, 7, 'l']] },
  { id: 'fuchsia', n: '넓은 무대', sub: '연분홍시티 체육관', w: 15, h: 16, leader: [7, 6], door: [7, 14], guy: [11, 13],
    path: [[7, 14], [7, 8]], slots: [[8, 13, 'l'], [6, 12, 'r'], [8, 11, 'l'], [6, 10, 'r'], [8, 9, 'l']] },
];
const dzOf = id => DESIGNS.find(d => d.id === id) || DESIGNS[0];

// ---------- 평판·등급 ----------
const REP_MAX = 1000;
const GRADES = [[0, '새내기 체육관'], [100, '동네 체육관'], [250, '이름난 체육관'], [450, '인기 체육관'], [700, '명문 체육관'], [1000, '전설의 체육관']];
const gradeOf = rep => { let i = 0; GRADES.forEach(([v], k) => { if (rep >= v) i = k; }); return { i, n: GRADES[i][1], lo: GRADES[i][0], hi: GRADES[i + 1]?.[0] ?? REP_MAX }; };

// ---------- 저장 ----------
const st = () => S.gym;
const myTypes = () => { const c = Array(19).fill(0); S.box.forEach(p => (SPECIES[p.sp]?.t || []).forEach(t => c[t]++)); return c; };
const trName = () => (trOf().n || '').trim();
const defName = ty => `${trName() || '나'}의 ${TYPE_KO[ty]} 체육관`;

// ---------- 화면 ----------
let root = null, open = false, tab = null, ents = [], sc = 2;
function build() {
  root = document.createElement('div'); root.id = 'gym'; root.hidden = true; root.setAttribute('role', 'application'); root.setAttribute('aria-label', '체육관');
  root.innerHTML = `
    <div class="gy-main">
      <div class="gy-stage"><div class="gy-map"><img alt=""><div class="gy-ents"></div></div></div>
      <div class="gy-top">
        <button class="win gy-plate" type="button" aria-label="체육관 정보"><span class="gy-nm"></span><span class="gy-rep"><span class="gy-grade"></span><i class="gy-bar"><i></i></i><b class="gy-repn"></b></span></button>
        <div class="gy-gold" aria-label="골드"><i class="coin" aria-hidden="true"></i><b class="gy-goldn"></b><span>G</span></div>
      </div>
      <div class="win blue gy-dlg" aria-live="polite"></div>
      <section class="gy-sheet" hidden></section>
    </div>
    <nav class="gy-menu" aria-label="체육관 메뉴">
      <button type="button" data-t="battle">배틀</button><button type="button" data-t="train">훈련장</button><button type="button" data-t="staff">트레이너</button><button type="button" data-t="shop">상점</button><button type="button" class="gy-out" data-t="out">퇴근</button>
    </nav>`;
  document.body.appendChild(root);
  $g('.gy-plate').onclick = () => { sfx('tap'); infoPop(); };
  $g('.gy-menu').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); const t = b.dataset.t; if (t === 'out') return exit(); openTab(tab === t ? null : t); };
  addEventListener('resize', () => { if (open) layout(st()?.d ? undefined : DESIGNS[0]); });
}

// 맵 크기: 화면 폭에 맞추고, 너무 길면 세로로 넘겨 본다
function layout(D = dzOf(st().d)) {
  const stg = $g('.gy-stage'), map = $g('.gy-map'), img = map.querySelector('img');
  const mw = D.w * 16, mh = D.h * 16, aw = stg.clientWidth - 16, ah = stg.clientHeight - 104 - 140;
  sc = Math.min(3.5, aw / mw, Math.max(ah / mh, aw / mw * .8)); sc = Math.max(1, Math.floor(sc * 8) / 8);
  map.style.width = mw * sc + 'px'; map.style.height = mh * sc + 'px';
  img.src = `${IMG}map/${D.id}.png`; img.style.width = mw * sc + 'px'; img.style.height = mh * sc + 'px';
  ents.forEach(place);
}

// ---------- 필드 걸음 그림 (본가 16x32 프레임: 0 아래 1 위 2 왼쪽 3·4 아래 걷기 5·6 위 걷기 7·8 왼쪽 걷기) ----------
const FR = { d: [0, 3, 4], u: [1, 5, 6], l: [2, 7, 8], r: [2, 7, 8] };
function ent(o) {
  const e = Object.assign({ x: 0, y: 0, f: 'd', st: 0, n3: false }, o); e.el = document.createElement('i'); e.el.className = 'gy-ow' + (o.onTap ? ' tap' : '');
  e.el.style.backgroundImage = `url(${IMG}ow/${o.ow}.png)`; if (o.onTap) e.el.onclick = ev => { ev.stopPropagation(); o.onTap(e); };
  $g('.gy-ents').appendChild(e.el); ents.push(e); place(e); return e;
}
function place(e) {
  const s = e.el.style, fr = e.n3 ? ({ d: 0, u: 1, l: 2, r: 2 })[e.f] : FR[e.f][e.st];
  s.width = 16 * sc + 'px'; s.height = 32 * sc + 'px'; s.left = e.x * 16 * sc + 'px'; s.top = (e.y * 16 - 16) * sc + 'px';
  s.backgroundSize = `auto ${32 * sc}px`; s.backgroundPosition = `${-fr * 16 * sc}px 0`; s.zIndex = Math.round(e.y * 10) + 10;
  e.el.classList.toggle('flip', e.f === 'r');
}
function clearEnts() { ents.forEach(e => e.el.remove()); ents = []; }
// 칸을 따라 걷기 (한 칸 0.26초, 걸음 프레임 번갈아)
async function walk(e, pts, spd = 260) {
  for (const [tx, ty] of pts) {
    while (e.x !== tx || e.y !== ty) {
      const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y); e.f = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u';
      const x0 = e.x, y0 = e.y, t0 = performance.now(); e.stepN = (e.stepN || 0) + 1;
      await new Promise(done => { const tick = now => { const k = Math.min(1, (now - t0) / spd); e.x = x0 + (dx ? dx : 0) * k; e.y = y0 + (dx ? 0 : dy) * k; e.st = k < .5 ? (e.stepN % 2 ? 1 : 2) : 0; place(e); k < 1 ? requestAnimationFrame(tick) : done(); }; requestAnimationFrame(tick); });
      e.x = Math.round(e.x); e.y = Math.round(e.y);
    }
  }
  e.st = 0; place(e);
}

// ---------- 홈 ----------
const GUY_TIPS = [
  () => `어서 와요, 관장님! 여기는 <b>${esc(st().nm)}</b>예요.`,
  () => `도전자는 하루에 몇 번 아무 때나 찾아와요. 누가 오면 필드의 체육관 버튼에 <b>빨간 점</b>이 떠요.`,
  () => `배틀에는 체육관 타입(<b>${TYPE_KO[st().ty]}</b>) 포켓몬만 낼 수 있어요.`,
  () => `도전자를 이길수록 <b>평판</b>이 올라가고, 평판이 오르면 체육관을 넓힐 수 있어요.`,
  () => `트레이너를 고용하면 도전자를 먼저 상대해 줘요. 다 이기고 올라온 도전자만 관장님이 상대하면 돼요.`,
];
let tipI = 0;
function renderHome() {
  const g = st(), D = dzOf(g.d), G = gradeOf(g.rep || 0);
  $g('.gy-nm').innerHTML = `${tyIcon(g.ty)}<span>${esc(g.nm)}</span>`;
  $g('.gy-grade').textContent = G.n;
  $g('.gy-bar>i').style.width = (G.hi > G.lo ? clampN(((g.rep || 0) - G.lo) / (G.hi - G.lo), 0, 1) : 1) * 100 + '%';
  $g('.gy-repn').textContent = `평판 ${g.rep || 0}`;
  renderGoldG();
  clearEnts(); layout();
  ent({ ow: trOf().sex === 'f' ? 'green_normal' : 'red_normal', x: D.leader[0], y: D.leader[1], f: 'd', onTap: () => { sfx('tap'); say(`관장 <b>${esc(trName() || '나')}</b>. 오늘도 체육관을 지키고 있다.`); } });
  ent({ ow: 'gym_guy', x: D.guy[0], y: D.guy[1], f: 'd', onTap: () => { sfx('tap'); say(GUY_TIPS[tipI++ % GUY_TIPS.length](), '안내원'); } });
  say(`오늘은 조용한 체육관이에요.`, '도전자 방문은 다음 업데이트에서 열려요');
}
function renderGoldG() { if (root) $g('.gy-goldn').textContent = /[?&]studio/.test(location.search) ? '∞' : S.gold.toLocaleString(); }
function say(html, sub = '') { $g('.gy-dlg').innerHTML = html + (sub ? `<span class="gy-dsub">${sub}</span>` : ''); }

// ---------- 메뉴 창 ----------
const SOON = {
  battle: { t: '배틀', ic: 'tr/red', d: '도전자와 본가처럼 턴제 배틀을 해요.', li: ['체육관 타입 포켓몬으로 6마리까지 라인업', '라인업 저장해 두고 골라 쓰기', '이기면 골드·친밀도·경험치'] },
  train: { t: '훈련장', ic: 'tr/black_belt', d: '포켓몬을 풀어 두면 천천히 경험치가 쌓여요.', li: ['지푸라기 타격대·샌드백을 치는 모션', '새 포켓몬은 날기 장치, 물 포켓몬은 물 위 장치', '가끔 특별한 기술을 배워요'] },
  staff: { t: '트레이너', ic: 'tr/cool_trainer_f', d: '체육관에 트레이너를 5명까지 고용해요.', li: ['가끔 오는 면접 제안', '트레이너마다 특성 (예: 훈련광)', '도전자를 먼저 상대해 주고, 월급은 7일마다'] },
  shop: { t: '체육관 상점', ic: 'tr/gentleman', d: '체육관 운영에 필요한 것을 사요.', li: ['기술머신으로 포켓몬에게 기술 가르치기', '체육관 꾸미기 아이템', '평판이 오르면 체육관 넓히기'] },
};
function openTab(t) {
  tab = t; root.querySelectorAll('.gy-menu button[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t));
  const sh = $g('.gy-sheet'); if (!t) { sh.hidden = true; return; }
  const o = SOON[t];
  sh.innerHTML = `<h3>${o.t}</h3><p class="gy-lead">${o.d}</p><div class="gy-soon"><i class="gy-soon-ic" style="background-image:url(${IMG}${o.ic}.png)"></i><b>준비 중이에요</b><p>이 메뉴는 다음 단계에서 열려요.</p><ul>${o.li.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  sh.hidden = false; sh.scrollTop = 0;
}

// ---------- 팝업 ----------
function pop(html, onClick) {
  const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) { close(); return; } const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, close, p); } };
  const close = () => p.remove(); $g('.gy-main').appendChild(p); return p;
}
function infoPop() {
  const g = st(), D = dzOf(g.d), G = gradeOf(g.rep || 0), d0 = new Date(g.t0 || Date.now());
  pop(`<h4>체육관 정보</h4><dl class="gy-info">
      <dt>이름</dt><dd><span>${esc(g.nm)}</span></dd><button class="gy-chg" data-a="nm">바꾸기</button>
      <dt>타입</dt><dd>${tyIcon(g.ty)}<span>${TYPE_KO[g.ty]}</span></dd><button class="gy-chg" data-a="ty">바꾸기</button>
      <dt>디자인</dt><dd><span>${D.n}</span></dd><button class="gy-chg" data-a="d">바꾸기</button>
      <dt>등급</dt><dd><span>${G.n} · 평판 ${g.rep || 0}</span></dd><i></i>
      <dt>개장일</dt><dd><span>${d0.getFullYear()}년 ${d0.getMonth() + 1}월 ${d0.getDate()}일</span></dd><i></i>
    </dl><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close) => { close(); if (a !== 'x') setup(a); });
}

// ---------- 처음 설정: 디자인 → 타입 → 이름 (바꾸기는 그 단계 하나만) ----------
function setup(only) {
  const g = st(), first = !g?.d;
  const dr = { d: g?.d || DESIGNS[0].id, ty: g?.ty || 0, nm: g?.nm || '' };
  const steps = only ? [only] : ['d', 'ty', 'nm'];
  let i = 0;
  const el = document.createElement('section'); el.className = 'gy-setup'; root.appendChild(el);
  const counts = myTypes();
  const draw = () => {
    const k = steps[i], last = i === steps.length - 1;
    const head = `<div class="gy-sh">${i === 0 && first ? '<button class="gy-back" type="button" data-x aria-label="체육관 나가기">✕</button>' : '<button class="gy-back" type="button" aria-label="뒤로">◀</button>'}${steps.length > 1 ? `<span class="gy-steps">${steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>`;
    let body = '', btn = last ? (first ? '체육관 열기' : '저장') : '다음';
    if (k === 'd') {
      const D = dzOf(dr.d), di = DESIGNS.indexOf(D);
      body = `<h3>체육관 디자인</h3><p class="gy-lead">본가 관동 지방 체육관이에요. 나중에 바꿀 수 있어요.</p>
        <div class="gy-dz"><div class="gy-dz-view"><img src="${IMG}map/${D.id}.png" alt="${D.n}"><button class="gy-dz-arw l" type="button" data-m="-1" aria-label="이전">◀</button><button class="gy-dz-arw r" type="button" data-m="1" aria-label="다음">▶</button></div>
        <div class="gy-dz-nm">${D.n}</div><div class="gy-dz-sub">${D.sub}</div><div class="gy-dots">${DESIGNS.map((_, j) => `<i class="${j === di ? 'on' : ''}"></i>`).join('')}</div></div>`;
    } else if (k === 'ty') {
      body = `<h3>체육관 타입</h3><p class="gy-lead">배틀에는 이 타입 포켓몬만 낼 수 있어요. 타입별로 체육관 운영에 성공하면 자격 배지를 받아요.</p>
        <div class="gy-types">${TYPE_KO.map((n, t) => t ? `<button type="button" class="gy-ty${counts[t] ? '' : ' none'}" data-ty="${t}" aria-pressed="${dr.ty === t}">${tyIcon(t)}<span>${n}<small>${counts[t] ? `내 포켓몬 ${counts[t]}` : '아직 없어요'}</small></span></button>` : '').join('')}</div>`;
      if (!dr.ty) btn = '타입을 골라 주세요';
    } else {
      if (!dr.nm) dr.nm = defName(dr.ty);
      body = `<h3>체육관 이름</h3><p class="gy-lead">도전자들이 보는 이름이에요.</p>
        <div class="gy-name"><input type="text" maxlength="14" value="${esc(dr.nm)}" aria-label="체육관 이름"><span class="gy-cnt"></span></div>
        ${first ? `<div class="gy-sum"><img src="${IMG}map/${dr.d}.png" alt=""><div><span>${dzOf(dr.d).n}</span><span>${tyIcon(dr.ty)} ${TYPE_KO[dr.ty]} 타입</span></div></div>` : ''}`;
    }
    el.innerHTML = `${head}<div class="gy-body">${body}</div><button class="gy-key main gy-next" type="button" ${k === 'ty' && !dr.ty ? 'disabled' : ''}>${btn}</button>`;
    const inp = el.querySelector('input');
    if (inp) { const cnt = () => { el.querySelector('.gy-cnt').textContent = `${inp.value.length}/14`; }; cnt(); inp.oninput = () => { dr.nm = inp.value; cnt(); el.querySelector('.gy-next').disabled = !inp.value.trim(); }; }
  };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.hasAttribute('data-x')) { exit(); return; }
    if (b.classList.contains('gy-back')) { if (i > 0) { i--; draw(); } else el.remove(); return; }
    if (b.dataset.m) { const n = DESIGNS.length, j = DESIGNS.findIndex(D => D.id === dr.d); dr.d = DESIGNS[(j + +b.dataset.m + n) % n].id; draw(); return; }
    if (b.dataset.ty) { const t = +b.dataset.ty, auto = !dr.nm || dr.nm === defName(dr.ty); dr.ty = t; if (auto) dr.nm = ''; draw(); return; }
    if (b.classList.contains('gy-next')) {
      if (steps[i] === 'ty' && !dr.ty) return;
      if (steps[i] === 'nm') { dr.nm = (el.querySelector('input').value || '').trim().slice(0, 14) || defName(dr.ty); }
      if (i < steps.length - 1) { i++; draw(); return; }
      finish();
    }
  };
  // 디자인 미리보기는 옆으로 밀어서도 넘긴다
  let sx = null; el.addEventListener('pointerdown', e => { if (e.target.closest('.gy-dz-view')) sx = e.clientX; });
  el.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) el.querySelector(`.gy-dz-arw.${dx < 0 ? 'r' : 'l'}`)?.click(); });
  const finish = () => {
    if (first) S.gym = { v: 1, d: dr.d, ty: dr.ty, nm: dr.nm, rep: 0, t0: Date.now() };
    else { if (only === 'ty' && dr.ty !== g.ty) { g.tyLog = g.tyLog || []; g.tyLog.push([g.ty, Date.now()]); } Object.assign(g, { d: dr.d, ty: dr.ty, nm: dr.nm }); }
    save(); el.remove(); renderHome();
    if (first) opened();
  };
  draw();
}
function opened() {
  sfx('tap'); const fx = document.createElement('div'); fx.className = 'gy-fx'; const C = ['#e04838', '#ffd84a', '#58a8e0', '#6ab84a', '#f8f8f8'];
  for (let k = 0; k < 46; k++) { const i = document.createElement('i'); i.style.left = Math.random() * 100 + '%'; i.style.background = C[k % C.length]; i.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); i.style.animationDelay = Math.random() * .6 + 's'; i.style.animationDuration = 1.6 + Math.random() * 1.2 + 's'; fx.appendChild(i); }
  root.appendChild(fx); setTimeout(() => fx.remove(), 3600);
  say(`<b>${esc(st().nm)}</b>의 문을 열었다!`, '안내원을 눌러 보세요');
  setTimeout(() => kang(KANG_OPEN(), { lit: true }), 1400);
}

// ---------- 강박사 안내 (처음 체육관에 올 때, 체육관을 연 뒤) ----------
const KANG_HI = () => [
  '오, 왔구나!\n기다리고 있었단다.',
  '여기는 오랫동안 문을 닫아 둔\n빈 체육관이란다.',
  trName() ? `${trName()}, 오늘부터 네가\n이 체육관의 관장이다!` : '오늘부터 네가\n이 체육관의 관장이다!',
  '관장은 찾아오는 도전자와\n배틀해서 실력을 보여 주는\n사람이지.',
  '먼저 체육관을 꾸며 보자.\n체육관 모양과 타입을\n고르렴.',
  '타입을 정하면 그 타입\n포켓몬만 배틀에 낼 수 있단다.\n잘 고르렴!',
];
const KANG_OPEN = () => [
  '멋진 체육관이구나!',
  '도전자는 하루에 몇 번,\n아무 때나 찾아온단다.',
  '누가 오면 필드의 체육관\n버튼에 빨간 점이 뜨지.',
  '도전자를 이기면 골드를 받고\n평판이 오른단다. 평판이 오르면\n체육관도 커지지.',
  '훈련장에서 포켓몬을 키우고,\n트레이너를 고용해 함께\n체육관을 지킬 수도 있단다.',
  '한 타입으로 도전자를\n100명 막아 내면\n자격 배지를 준단다!',
  '모르는 게 있으면 안내원에게\n물어보렴. 그럼 힘내라,\n관장님!',
];
// lines 를 강박사가 한 줄씩 말한다 (화면을 누르면 다음). lit: 처음부터 밝게 / 아니면 어두운 체육관에 불이 켜지며 시작
function kang(lines, { lit = false } = {}) {
  return new Promise(done => {
    const k = document.createElement('div'); k.className = 'gy-kang' + (lit ? ' lit' : '');
    k.innerHTML = `<i class="gy-k-veil"></i><img class="gy-k-pic" alt="강박사" src="${GA.KANG}"><button class="gy-k-skip" type="button">건너뛰기</button><div class="win gy-k-box" aria-live="polite"><span class="gy-k-nm">강박사</span><span class="gy-k-t"></span><b class="gy-k-cur" hidden>▼</b></div>`;
    root.appendChild(k);
    const talk = GA.inTyper(k, k.querySelector('.gy-k-t'), k.querySelector('.gy-k-cur'));
    let stop = false; const end = async () => { if (k.classList.contains('bye')) return; stop = true; k.classList.add('bye'); await wait(450); k.remove(); done(); };
    k.querySelector('.gy-k-skip').onclick = e => { e.stopPropagation(); sfx('tap'); end(); };
    (async () => {
      if (!lit) { await wait(500); for (const o of [.55, .9, .25, .6, 0]) { k.style.setProperty('--veil', o); await wait(o ? 110 : 0); } k.classList.add('lit'); await wait(500); }
      k.classList.add('in'); await wait(650);
      for (const t of lines) { if (stop) return; await talk(t); }
      end();
    })();
  });
}


// ---------- 들어가기·나가기 ----------
const preload = src => new Promise(ok => { const i = new Image(); i.onload = i.onerror = () => ok(); i.src = src; });
async function prepare() {
  if (!root) build();
  const g = st(); const L = [preload(`${IMG}ow/${trOf().sex === 'f' ? 'green_normal' : 'red_normal'}.png`), preload(`${IMG}ow/gym_guy.png`)];
  if (g?.d) L.push(preload(`${IMG}map/${g.d}.png`)); else DESIGNS.forEach(D => L.push(preload(`${IMG}map/${D.id}.png`)));
  await Promise.all(L);
}
// 처음: 빈 체육관(회색시티 모양)에 불이 켜지고, 내가 문으로 들어오면 강박사가 설명 → 디자인·타입·이름 정하기
async function intro() {
  const D = DESIGNS[0]; clearEnts(); layout(D); say('', ''); root.classList.add('pre');
  const me = ent({ ow: trOf().sex === 'f' ? 'green_normal' : 'red_normal', x: D.door[0], y: D.door[1], f: 'u' });
  const k = kang(KANG_HI());
  await wait(1500); await walk(me, [[D.door[0], D.door[1] - 4]]);
  await k; root.classList.remove('pre'); if (!open) return; setup();
}
function enter() {
  open = true; tab = null; root.hidden = false; GA.gymIn(); openTab(null);
  requestAnimationFrame(() => root.classList.add('on'));
  if (st()?.d) renderHome(); else intro();
  setTimeout(() => gymLoad.hide(), 120);
}
async function exit() {
  root.querySelectorAll('.gy-pop,.gy-setup,.gy-kang').forEach(x => x.remove());
  gymLoad.show('퇴근하는 중', '', true); await wait(2800);
  open = false; root.classList.remove('on'); root.hidden = true; root.querySelectorAll('.gy-kang').forEach(x => x.remove()); root.classList.remove('pre'); GA.gymOut(); clearEnts();
  try { menuDots(); } catch (e) {}
  await wait(200); gymLoad.hide();
}

window.Gym = { prepare, enter, exit, isOpen: () => open, renderGold: renderGoldG, DESIGNS, _walk: walk, _ent: ent };
window.gymDot = () => false;   // 도전자 방문(다음 단계)이 생기면 '와 있는 도전자'로
})();
