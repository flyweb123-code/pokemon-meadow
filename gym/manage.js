/* 체육관 모드 4~6단계 (경완 기획 2026-10-27): 훈련장 · 트레이너 고용 · 상점(기술머신·꾸미기·관장 의상·넓히기).
   gym.js 의 메뉴가 이 파일을 불러 GymManage.tab(t, 시트) 를 부른다. 도전자 방문 계산 중에 GymManage.tickTrain(지금) 으로 훈련 경험치를 쌓는다.
   저장(S.gym): tr 훈련 중 [{id, t 마지막 계산, d 오늘 시작 시각, h 오늘 쓴 시간, fx 남은 경험치 조각, acc 특별 기술 확률용 시간}], trN 늘린 훈련장 칸,
     sf 고용 트레이너, cand 면접 지원자, own {꾸미기: 1}, dp 놓은 꾸미기(칸 순서), decoN 늘린 꾸미기 칸, fit 입은 관장 의상, fits {의상: 1} */
(() => {
'use strict';
const GA = window.GA, { sfx, esc } = GA, S = GA.S, SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO;
const K = window.Gym.k, GB = () => window.GymBattle, IMG = K.IMG;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const st = () => S.gym;
const boxOf = id => S.box.find(p => p.id === id);
const nmOf = P => SPECIES[P.sp]?.n || '???';
const onField = id => S.mons.some(m => m.pid === id);
const pop = (h, f) => { const p = K.pop(h, f); GB()?.fillTh(p); return p; };
const say = msg => pop(`<p class="gy-msg" style="text-align:center">${msg}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, c) => c());
const spend = n => { if (S.gold < n) return false; S.gold -= n; try { GA.renderGold(); } catch (e) {} K.renderGoldG(); K.save(); return true; };
const gold = n => `<i class="coin"></i>${n.toLocaleString()}G`;
// 포켓몬 정면 그림: 블랙·화이트 움직이는 gif (못 받으면 저장소 png 첫 칸)
const monImg = (sp, o = {}) => { const g = GB().gifUrl(sp, false, !!o.s, !!o.f), png = GB().pkSrc(sp, { s: o.s, f: o.f });
  return g ? `<img class="mi" alt="" src="${g}" onerror="this.onerror=null;this.src='${png}';this.classList.add('pn')">` : `<img class="mi pn" alt="" src="${png}">`; };
const owIc = ow => `<i class="ow-ic" style="background-image:url(${IMG}ow/${ow}.png)"></i>`;
let sh = null, cur = null, shopT = 'tm', tmTy = 0;
function tab(t, el) { sh = el; cur = t; draw(); }
function draw() { if (!sh || !st()) return; sh.onclick = null; ({ train: drawTrain, staff: drawStaff, shop: drawShop })[cur]?.(); GB()?.fillTh(sh); }
const redraw = () => { if (sh && !sh.hidden) draw(); };

// ======================= 훈련장 (4단계) =======================
const trMax = () => Math.min(6, 2 + (st().trN || 0));
const TR_ST = { dummy: '지푸라기 타격대', sandbag: '샌드백', fly: '비행 장치', water: '물 위 장치' };
const stOf = (P, i) => { const t = SPECIES[P.sp]?.t || []; return t.includes(3) ? 'fly' : t.includes(11) ? 'water' : t.includes(2) || i % 2 ? 'sandbag' : 'dummy'; };
// 1시간 경험치: 레벨 10 은 1시간에 약 1레벨, 레벨 50 은 약 0.2레벨 (경완 기획 밸런스). 훈련광 트레이너가 있으면 +20%
function perHour(P) { const m = GB().gm(P), g = GB().growth(P.sp); if (m.lv >= GB().LV_MAX) return 0; const need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  return need * Math.min(1.5, 10 / Math.max(1, m.lv)) * (st().sf.some(s => s.trait === 'train' && !s.rest) ? 1.2 : 1); }
// 특별한 기술: 기술머신으로 배우는 기술 중 자기 타입의 공격 기술 하나 (1시간마다 5%)
function special(P) {
  const D = GB().D, m = GB().gm(P), t = SPECIES[P.sp]?.t || [], L = (D.sp[P.sp]?.tm || []).map(i => D.mv[i]).filter(x => x && x[3] !== 2 && (x[4] || 0) >= 50 && !m.mv.includes(x[0]) && !(m.kn || []).includes(x[0]));
  const pref = L.filter(x => t.includes(x[2])), pool = pref.length ? pref : L; if (!pool.length) return null;
  const x = K.pick(pool); GB().teach(m, x[0], null, false); return x;
}
function tickTrain(now) {
  const g = st(); if (!g?.tr?.length || !GB()?.D) return;
  const H = K.H;
  g.tr = g.tr.filter(e => {
    const P = boxOf(e.id); if (!P) return false;
    if (onField(e.id)) { K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '은' : '는'} 필드로 나가서 훈련장에서 빠졌다.`, now); return false; }
    let t = e.t, hrs = 0;
    while (t < now) { const d0 = K.dayStart(t), de = K.nextDay(t); if (e.d !== d0) { e.d = d0; e.h = 0; } const use = Math.min((Math.min(now, de) - t) / H, Math.max(0, 8 - e.h)); e.h += use; hrs += use; t = Math.min(now, de); }
    e.t = now; if (hrs <= 0) return true;
    const lv0 = GB().gm(P).lv, got = [];
    for (let left = hrs; left > 1e-6; left -= 1) {
      const step = Math.min(1, left), tot = perHour(P) * step + (e.fx || 0), n = Math.floor(tot); e.fx = tot - n;
      if (n > 0) GB().gainXp(P, n).learned.forEach(([id]) => got.push(GB().mvKo(id)));
      e.acc = (e.acc || 0) + step; while (e.acc >= 1) { e.acc -= 1; if (Math.random() < .05) { const x = special(P); if (x) K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '이' : '가'} 훈련장에서 특별한 기술 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 익혔다! <small>기술 바꾸기에서 쓸 수 있어요</small>`, now); } }
    }
    const lv = GB().gm(P).lv;
    if (lv > lv0) K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '이' : '가'} 훈련으로 Lv.${lv}${/[036]$/.test(String(lv)) ? '이' : '가'} 됐다!${got.length ? ` <small>새 기술: ${got.map(esc).join(', ')}</small>` : ''}`, now);
    return true;
  });
}
// 훈련장 = 필드처럼 포켓몬이 돌아다니며 기구를 치고, 서로 대련하고, 쉬는 마당 (경완 피드백 2026-10-27 '꾸미기 모드 필드처럼').
// 본게임 PMD 걸음 그림(GA.pmd)을 쓰고, 그림이 없는 종은 한 장 그림. 경험치 계산은 tickTrain 그대로(화면은 보여 주기만).
const leftOf = e => e.d === K.dayStart(Date.now()) ? Math.max(0, 8 - e.h) : 8;
let Y = null;   // 마당: { el, W, H, eq: {k: {x, y, el}}, mons: [], raf, last, pos: {id: [x, y]} }
const YH = 250;
const inPond = (x, y, m = 0) => { const p = Y.pond; return ((x - p.x) / (p.rx + m)) ** 2 + ((y - p.y) / (p.ry + m)) ** 2 < 1; };
function yardSpot(swim) {
  for (let i = 0; i < 40; i++) { const x = 20 + Math.random() * (Y.W - 40), y = YH * .34 + Math.random() * (YH * .62);
    if (swim ? inPond(x, y, -14) : !inPond(x, y, 14)) return [x, y]; }
  return [Y.W * .3, YH * .6];
}
function yardBg(c, W) {
  const w = c.width = Math.ceil(W / 2), h = c.height = YH / 2, x = c.getContext('2d'), P = Y.pond;
  const hs = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  x.fillStyle = '#78c058'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < h; j += 3) for (let i = 0; i < w; i += 3) { const v = hs(i, j); if (v < .12) { x.fillStyle = '#60a848'; x.fillRect(i, j, 1, 2); x.fillRect(i + 2, j, 1, 2); } else if (v > .985) { x.fillStyle = v > .993 ? '#f8f8f8' : '#f8d030'; x.fillRect(i, j, 2, 2); } }
  // 가운데 흙 마당
  x.fillStyle = '#d8b878'; x.beginPath(); x.ellipse(w * .42, h * .6, w * .36, h * .26, 0, 0, 7); x.fill();
  x.fillStyle = '#c8a060'; for (let j = 0; j < h; j += 4) for (let i = 0; i < w; i += 5) if (hs(i + 9, j) < .2 && ((i - w * .42) / (w * .34)) ** 2 + ((j - h * .6) / (h * .24)) ** 2 < 1) x.fillRect(i, j, 2, 1);
  // 뒤쪽 나무 울타리
  x.fillStyle = '#58a040'; x.fillRect(0, 0, w, h * .26);
  for (let i = 0; i < w; i += 14) { x.fillStyle = '#4a8a38'; x.beginPath(); x.arc(i + 7, h * .1, 9, 0, 7); x.fill(); }
  x.fillStyle = '#a87838'; x.fillRect(0, h * .2, w, 3); x.fillRect(0, h * .27, w, 3);
  for (let i = 3; i < w; i += 12) { x.fillStyle = '#a87838'; x.fillRect(i, h * .16, 4, h * .16); x.fillStyle = '#704818'; x.fillRect(i + 3, h * .16, 1, h * .16); x.fillRect(i, h * .32, 4, 1); }
  // 연못
  x.fillStyle = '#3870c8'; x.beginPath(); x.ellipse(P.x / 2, P.y / 2 + 1, P.rx / 2 + 2, P.ry / 2 + 2, 0, 0, 7); x.fill();
  x.fillStyle = '#4890e8'; x.beginPath(); x.ellipse(P.x / 2, P.y / 2, P.rx / 2, P.ry / 2, 0, 0, 7); x.fill();
  x.fillStyle = '#a8d0f8'; for (let k = 0; k < 4; k++) x.fillRect(P.x / 2 - P.rx / 3 + k * P.rx / 5, P.y / 2 - P.ry / 5 + (k % 2) * 6, 6, 1);
}
function drawTrain() {
  const g = st(); g.tr = g.tr || []; tickTrain(Date.now()); K.save();
  const n = trMax();
  if (Y) { Y.mons.forEach(m => { Y.pos[m.id] = [m.x, m.y]; }); cancelAnimationFrame(Y.raf); }
  sh.innerHTML = `<h3>훈련장</h3><p class="gy-lead">보낸 포켓몬이 기구를 치고 서로 대련하며 경험치를 쌓아요(하루 8시간, 앱을 꺼 둬도). 가끔 특별한 기술을 익혀요. 필드에 있던 포켓몬은 필드에서 빠져요.</p>
    <div class="ty"><canvas class="ty-bg"></canvas><div class="ty-l"></div>${g.tr.length ? '' : '<p class="ty-empty">아직 훈련 중인 포켓몬이 없어요</p>'}</div>
    <div class="ty-chips"></div><p class="tr-cap">훈련장 ${g.tr.length}/${n}마리${n < 6 ? ' · 상점의 <b>체육관 넓히기</b>에서 늘릴 수 있어요' : ''}</p>`;
  const el = sh.querySelector('.ty'), W = Math.max(280, el.clientWidth || 340);
  Y = { el, W, H: YH, L: el.querySelector('.ty-l'), eq: {}, mons: [], pos: Y?.pos || {}, last: 0, pond: { x: W * .8, y: YH * .8, rx: W * .17, ry: YH * .13 } };
  yardBg(el.querySelector('.ty-bg'), W);
  const EQ = { dummy: [.18, .5], sandbag: [.47, .42], fly: [.8, .47], water: [.79, .83] };
  for (const k in EQ) { const [fx, fy] = EQ[k], q = document.createElement('i'); q.className = 'ty-eq eq-' + k; q.style.cssText = `left:${fx * W}px;top:${fy * YH}px;z-index:${Math.round(fy * YH)};background-image:url(${IMG}deco/tr_${k}.png)`; Y.L.append(q); Y.eq[k] = { x: fx * W, y: fy * YH, el: q }; }
  g.tr.forEach((e, i) => { const P = boxOf(e.id); if (P) yardMon(P, e, i); });
  yardChips();
  sh.onclick = ev => {
    const t = ev.target.closest('[data-p],[data-add]'); if (!t) return; sfx('tap');
    if (t.dataset.add) return pickTrain();
    trPop(+t.dataset.p || t.dataset.p);
  };
  Y.raf = requestAnimationFrame(yardLoop);
}
function yardChips() {
  const g = st(), box = sh?.querySelector('.ty-chips'); if (!box) return;
  box.innerHTML = g.tr.map(e => { const P = boxOf(e.id); if (!P) return ''; const m = GB().gm(P), gr = GB().growth(P.sp), a = GB().xpAt(gr, m.lv), b = GB().xpAt(gr, m.lv + 1), left = leftOf(e);
    return `<button class="ty-chip${left <= 0 ? ' done' : ''}" data-p="${P.id}">${GB().thumb(P)}<b>${esc(nmOf(P))} <em>Lv.${m.lv}</em></b><i class="tr-xp"><i style="width:${m.lv >= GB().LV_MAX ? 100 : clampN((m.xp - a) / (b - a), 0, 1) * 100}%"></i></i><small>${left > 0 ? `오늘 ${Math.ceil(left)}시간 남음` : '오늘 훈련 끝 · 쿨쿨'}</small></button>`; }).join('')
    + (g.tr.length < trMax() ? '<button class="ty-chip add" data-add="1"><span>+</span><small>포켓몬 보내기</small></button>' : '');
  GB()?.fillTh(box);
}
function yardMon(P, e, i) {
  const t = SPECIES[P.sp]?.t || [], o = document.createElement('div');
  o.className = 'ty-m'; o.dataset.p = P.id; o.innerHTML = '<i class="ty-sh"></i><div class="ty-fl"><i class="ty-sp"></i></div>';
  const [x, y] = Y.pos[P.id] || yardSpot(); Y.L.append(o);
  const m = { id: P.id, P, e, el: o, fl: o.querySelector('.ty-fl'), sp: o.querySelector('.ty-sp'), x, y, face: Math.random() < .5 ? 1 : -1, st: 'rest', until: performance.now() / 1000 + Math.random() * 2, at: 0, home: stOf(P, i), swimmer: t.includes(11), flyer: t.includes(3), D: null };
  Y.mons.push(m); place(m);
  GA.pmd?.(P.sp, P.sex).then(D => { if (!Y.mons.includes(m)) return; m.D = D;
    if (D.P) { const [w, h] = D.wh, s = D.s * .78; m.s = s; Object.assign(m.sp.style, { backgroundImage: `url("${D.P.i}")`, backgroundSize: `${w * s}px ${h * s}px` }); if (P.shiny) m.sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`; m.fk = ''; }
    else { m.sp.classList.add('one'); m.sp.style.backgroundImage = `url("${D.img}")`; }
  }).catch(() => {});
}
const place = m => { m.el.style.transform = `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px)`; m.el.style.zIndex = Math.round(m.y) + 2; m.fl.style.transform = `scaleX(${m.face})`; };
function yEmo(m, ch, cls = '') { const q = document.createElement('i'); q.className = 'ty-emo ' + cls; q.textContent = ch; m.el.append(q); setTimeout(() => q.remove(), 1300); }
function yHit(m, k) {
  const q = Y.eq[k]; if (q) { q.el.classList.remove('wob'); void q.el.offsetWidth; q.el.classList.add('wob'); }
  if (Math.random() < .35) yEmo(m, '+EXP', 'xp'); else if (Math.random() < .5) yEmo(m, '!', 'hit');
}
// 다음 할 일: 기구 훈련 · 대련 · 쉬기 · 돌아다니기 (오늘 8시간 다 쓴 포켓몬은 잠)
function yNext(m, now) {
  if (leftOf(m.e) <= 0) { m.st = 'sleep'; m.until = now + 99; m.one = null; return; }
  const r = Math.random(), free = Y.mons.filter(o => o !== m && (o.st === 'rest' || o.st === 'wander') && leftOf(o.e) > 0);
  if (r < .5) { const k = r < .35 ? m.home : K.pick(m.swimmer ? ['water', 'dummy', 'sandbag'] : m.flyer ? ['fly', 'dummy', 'sandbag'] : ['dummy', 'sandbag']);
    const q = Y.eq[k], side = k === 'water' ? -1 : Math.random() < .5 ? -1 : 1, busy = Y.mons.some(o => o !== m && o.k === k && o.side === side && (o.st === 'go' || o.st === 'train'));
    if (!busy) { m.st = 'go'; m.k = k; m.side = side; m.tx = q.x + side * (k === 'water' ? 44 : 34); m.ty = q.y + (k === 'water' ? -2 : 3); m.then = 'train'; return; } }
  if (r < .72 && free.length) { const o = K.pick(free), [cx, cy] = yardSpot();
    m.st = o.st = 'go'; m.then = o.then = 'spw'; m.k = o.k = null; m.mate = o; o.mate = m; m.tx = cx - 26; o.tx = cx + 26; m.ty = o.ty = cy; m.lead = true; o.lead = false; return; }
  if (r < .86) { m.st = 'rest'; m.one = null; m.nap = Math.random() < .3; m.until = now + 3 + Math.random() * 4; return; }
  const [x, y] = yardSpot(m.swimmer && Math.random() < .5); m.st = 'go'; m.tx = x; m.ty = y; m.then = 'rest'; m.k = null;
}
function yardLoop(ts) {
  if (!Y || !Y.el.isConnected || sh.hidden || cur !== 'train') { Y && (Y.raf = 0); return; }
  const now = ts / 1000, dt = Math.min(.1, Y.last ? now - Y.last : 0); Y.last = now;
  if (now - (Y.ck ?? now) > 30) { tickTrain(Date.now()); K.save(); yardChips(); Y.ck = now; } else Y.ck ??= now;   // 30초마다 남은 시간·레벨 새로
  for (const m of Y.mons) {
    if (m.st === 'go') {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), v = 42 * dt;
      if (Math.abs(dx) > 2) m.face = dx > 0 ? -1 : 1;
      if (d <= v) { m.x = m.tx; m.y = m.ty;
        if (m.then === 'train') { m.st = 'train'; m.until = now + 5 + Math.random() * 4; m.face = Y.eq[m.k].x > m.x ? -1 : 1; }
        else if (m.then === 'spw') { m.st = 'spw'; m.until = now + 6; const o = m.mate; if (o && o.st === 'spw' && o.mate === m) { m.face = o.x > m.x ? -1 : 1; o.face = -m.face; m.st = o.st = 'spar'; m.until = o.until = now + 4 + Math.random() * 3; m.turn = o.turn = 0; } }
        else { m.st = 'rest'; m.nap = false; m.until = now + 1.5 + Math.random() * 3; } }
      else { m.x += dx / d * v; m.y += dy / d * v; m.an = dy < -Math.abs(dx) ? 'WalkUp' : 'Walk'; }
    } else if (now >= m.until) {
      if (m.st === 'spar' || m.st === 'spw') { const o = m.mate; if (m.st === 'spar') { yEmo(m, '♪', 'mu'); if (o) yEmo(o, '♪', 'mu'); }
        m.mate = null; if (o && o.mate === m) { o.mate = null; yNext(o, now); } }
      yNext(m, now);
    }
    if (m.st === 'spar' && m.lead && !m.one && !m.mate?.one) { const a = m.turn % 2 ? m.mate : m; a.one = { n: 'Attack', t: 0, tgt: a === m ? m.mate : m }; m.turn++; }
    if (m.st === 'train' && !m.one) m.one = { n: 'Attack', t: 0, k: m.k, gap: .25 + Math.random() * .5 };
    m.el.classList.toggle('swim', inPond(m.x, m.y, -6));
    place(m); yDraw(m, dt);
  }
  Y.raf = requestAnimationFrame(yardLoop);
}
function yDraw(m, dt) {
  const D = m.D; if (!D?.P) { m.el.classList.toggle('bob', m.st === 'go' || m.st === 'train' || m.st === 'spar'); if (m.one) { m.one.t += dt; if (m.one.t > .8) { if (m.one.k) yHit(m, m.one.k); m.one = null; } } return; }
  const A = D.P.a; let nm, f = null;
  if (m.one) { nm = A[m.one.n] ? m.one.n : 'Idle'; m.one.t += dt; }
  else nm = m.st === 'go' ? m.an : m.st === 'sleep' || (m.st === 'rest' && m.nap) ? 'Sleep' : 'Idle';
  if (!A[nm]) nm = nm === 'WalkUp' && A.Walk ? 'Walk' : 'Idle';
  const a = A[nm], durs = a[6], tot = durs.reduce((s, d) => s + d, 0) / 60;
  let t;
  if (m.one) { t = m.one.t;
    const hitT = durs.slice(0, (a[7] ?? 0) + 1).reduce((s, d) => s + d, 0) / 60;
    if (!m.one.hit && t >= hitT) { m.one.hit = 1; if (m.one.k) yHit(m, m.one.k); if (m.one.tgt) { const o = m.one.tgt; if (D && o.D?.P?.a.Hurt && !o.one) o.one = { n: 'Hurt', t: 0 }; yEmo(o, '!', 'hit'); } }
    if (t >= tot) { if (m.one.gap && t < tot + m.one.gap) { t = tot - .001; } else { m.one = null; return yDraw(m, 0); } } }
  else { if (m.ak !== nm) { m.ak = nm; m.at = 0; } m.at += dt; t = m.at % tot; }
  let acc = 0; f = durs.length - 1; for (let i = 0; i < durs.length; i++) { acc += durs[i] / 60; if (t < acc) { f = i; break; } }
  const key = nm + ':' + f; if (m.fk === key) return; m.fk = key;
  const s = m.s, P = D.P, st2 = m.sp.style;
  st2.width = a[1] * s + 'px'; st2.height = a[2] * s + 'px'; st2.left = -a[4] * s + 'px'; st2.top = (-a[5] - (P.fy || 0)) * s + 'px';
  st2.backgroundPosition = `${-f * (a[1] + (P.G || 0)) * s}px ${-a[0] * s}px`;
}
function pickTrain() {
  const g = st(), ids = new Set(g.tr.map(e => e.id)), ty = g.ty;
  const L = S.box.filter(P => !ids.has(P.id)).map(P => ({ P, m: GB().gm(P), ok: (SPECIES[P.sp]?.t || []).includes(ty) })).filter(o => o.m.lv < GB().LV_MAX).sort((a, b) => b.ok - a.ok || b.m.lv - a.m.lv || GA.ivSum(b.P) - GA.ivSum(a.P)).slice(0, 120);
  if (!L.length) return say('보낼 수 있는 포켓몬이 없어요.');
  pop(`<h4>훈련장에 보낼 포켓몬</h4><p class="gy-msg">${TYPE_KO[ty]} 타입이 위에 있어요. 필드에 나가 있는 포켓몬은 필드에서 빠져요.</p><div class="lu-pick">${L.map(({ P, m, ok }) => `<button data-a="${P.id}" class="${ok ? '' : 'dim'}">${GB().thumb(P)}<b>${esc(nmOf(P))}</b><span>Lv.${m.lv}</span><em>${onField(P.id) ? '필드' : GA.rankOf(P)}</em></button>`).join('')}</div><div class="gy-btns one"><button data-a="x">닫기</button></div>`,
    (a, close) => { close(); if (a === 'x') return; const id = +a || a, P = boxOf(id); if (!P || g.tr.length >= trMax()) return;
      const m = S.mons.find(o => o.pid === id); if (m) { try { GA.removeMon(m, true); } catch (e) {} }
      g.tr.push({ id, t: Date.now(), d: K.dayStart(Date.now()), h: 0 }); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보냈다.`); K.save(); redraw(); });
}
function trPop(id) {
  const P = boxOf(id); if (!P) return; const m = GB().gm(P), ph = perHour(P), g = GB().growth(P.sp), need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  pop(`<div class="mp-head">${GB().thumb(P)}<div><h4>${esc(nmOf(P))}</h4><p>Lv.${m.lv} · 1시간에 약 ${m.lv >= GB().LV_MAX ? 0 : (ph / need).toFixed(2)}레벨</p></div></div>
    <div class="mp-moves">${m.mv.map(x => GB().mvOf(x)).filter(Boolean).map(x => GB().mvRow(x, '')).join('')}</div>
    <div class="gy-btns"><button data-a="mv">기술 바꾸기</button><button data-a="out">데려오기</button><button class="main" data-a="x" style="grid-column:1/-1">닫기</button></div>`,
    (a, close) => { if (!a) return; close(); if (a === 'mv') return GB().movesPop(P, () => { redraw(); trPop(id); });
      if (a === 'out') { tickTrain(Date.now()); st().tr = st().tr.filter(e => e.id !== P.id); K.save(); redraw(); } });
}

// ======================= 트레이너 고용 (6단계) =======================
const LINES = { train: '훈련이라면 자신 있어요! 체육관 포켓몬들도 같이 단련할게요.', star: '제 배틀은 구경꾼이 많이 와요. 체육관 이름을 널리 알릴게요!', money: '도전자에게서 상금을 두둑이 챙겨 올게요.', guts: '절대 물러서지 않아요. 끝까지 버티는 게 제 장점이에요!', grow: '아직 부족하지만, 배틀할수록 강해지는 타입이에요!', thrift: '월급은 조금만 주셔도 괜찮아요. 일하게만 해 주세요!', lazy: '음… 가끔 낮잠을 자지만, 월급은 아주 조금이면 돼요.' };
const teamIc = T => `<span class="sf-team">${T.map(([sp, lv]) => `<span style="background-image:url(${GB().pkSrc(sp)})"><small>${lv}</small></span>`).join('')}</span>`;
function drawStaff() {
  const g = st(), now = Date.now(), max = K.staffMax();
  if (g.cand && !g.candSeen) { g.candSeen = 1; K.setAt(); K.save(); K.menuDot(); }
  const c = g.cand;
  sh.innerHTML = `<h3>트레이너</h3><p class="gy-lead">고용한 트레이너가 순서대로 도전자를 먼저 상대해요. 월급은 7일마다 나가고, 골드가 모자라면 쉬어요. 체육관 등급이 오르면 더 고용할 수 있어요.</p>
    ${c ? `<div class="sf-cand"><img alt="" src="${IMG}tr/${c.tr}.png"><div><b>면접 지원자가 왔어요!</b><span>${esc(c.cls)} ${esc(c.nm)} · ${K.TRAITS[c.trait].n}</span><small>${Math.max(1, Math.round((c.exp - now) / K.H))}시간 뒤에 떠나요</small></div><button class="gy-key main" data-iv="1">면접 보기</button></div>`
      : `<p class="sf-none">다음 면접 지원자는 ${g.candN ? `${Math.max(1, Math.round((g.candN - now) / K.H))}시간쯤 뒤에` : '곧'} 와요.</p>`}
    <h4 class="sf-h">고용한 트레이너 <small>${g.sf.length}/${max}</small></h4>
    <div class="sf-list">${g.sf.map((s, i) => `<div class="sf-card${s.rest ? ' rest' : ''}"><i class="sf-n">${i + 1}</i>${owIc(s.ow)}<div class="sf-mid"><b>${esc(s.cls)} ${esc(s.nm)}</b><span>${K.TRAITS[s.trait]?.n || ''} · ${s.w || 0}승 ${s.l || 0}패${s.rest ? ' · <em>쉬는 중</em>' : ''}</span>${teamIc(s.team)}<small>월급 ${s.wage}G · ${s.rest ? '밀린 월급을 주면 다시 일해요' : `다음 월급 ${Math.max(0, Math.ceil((s.pay - now) / K.DAY))}일 뒤`}</small></div>
      <div class="sf-btn">${i ? `<button data-up="${i}" aria-label="앞으로">▲</button>` : ''}<button data-fire="${i}">해고</button></div></div>`).join('') || '<p class="sf-none">아직 고용한 트레이너가 없어요.</p>'}</div>`;
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.iv) return interview();
    if (b.dataset.up) { const i = +b.dataset.up; [g.sf[i - 1], g.sf[i]] = [g.sf[i], g.sf[i - 1]]; K.save(); redraw(); return; }
    if (b.dataset.fire) { const s = g.sf[+b.dataset.fire]; pop(`<h4>해고할까요?</h4><p class="gy-msg">${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} 해고해요. 이미 준 월급은 돌려받지 못해요.</p><div class="gy-btns"><button data-a="x">아니요</button><button class="main" data-a="y">해고</button></div>`,
      (a, close) => { close(); if (a !== 'y') return; g.sf = g.sf.filter(x => x !== s); K.glog('sf', `${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} 해고했다.`); K.save(); redraw(); }); }
  };
}
function interview() {
  const g = st(), c = g.cand; if (!c) return;
  const full = g.sf.length >= K.staffMax(), lv = Math.round(K.teamLv(c.team));
  pop(`<h4>면접</h4><div class="iv-head"><img alt="" src="${IMG}tr/${c.tr}.png"><div><b>${esc(c.cls)} ${esc(c.nm)}</b><span class="iv-tr">${K.TRAITS[c.trait].n}<small>${K.TRAITS[c.trait].d}</small></span></div></div>
    <p class="iv-say">“안녕하세요! ${esc(LINES[c.trait])}”</p>
    <dl class="gy-info iv-dl"><dt>포켓몬</dt><dd>${teamIc(c.team)}</dd><i></i><dt>평균 레벨</dt><dd><span>Lv.${lv}</span></dd><i></i><dt>월급</dt><dd><span>7일에 ${c.wage}G</span></dd><i></i></dl>
    ${full ? `<p class="gy-msg iv-warn">트레이너 자리가 꽉 찼어요 (${g.sf.length}/${K.staffMax()}). 체육관 등급을 올리거나 한 명을 해고해야 해요.</p>` : `<p class="gy-msg">고용하면 첫 주 월급 ${c.wage}G를 바로 줘요.</p>`}
    <div class="gy-btns"><button data-a="no">돌려보내기</button><button class="main" data-a="ok" ${full ? 'disabled' : ''}>고용하기</button></div>`,
    (a, close) => {
      if (a === 'no') { close(); g.cand = null; K.glog('sf', `면접 지원자 ${esc(c.cls)} ${esc(c.nm)}${K.jong(c.nm) ? '을' : '를'} 돌려보냈다.`); K.save(); redraw(); return; }
      if (a !== 'ok' || full) return; if (!spend(c.wage)) { close(); return say(`골드가 모자라요. 첫 주 월급 ${c.wage}G가 필요해요.`); }
      close(); const now = Date.now(); g.sf.push(Object.assign({}, c, { hired: now, pay: now + 7 * K.DAY, w: 0, l: 0, xp: 0 })); g.cand = null;
      K.glog('sf', `${esc(c.cls)} <b>${esc(c.nm)}</b>${K.jong(c.nm) ? '을' : '를'} 고용했다! <small>월급 ${c.wage}G</small>`); K.save(); redraw(); K.renderHome();
    });
}

// ======================= 상점 (5단계) =======================
const SHOP_T = [['tm', '기술머신'], ['deco', '꾸미기'], ['fit', '관장 의상'], ['up', '체육관 넓히기']];
const tmPrice = x => x[3] === 2 ? 500 : (x[4] || 0) <= 50 ? 300 : x[4] <= 70 ? 700 : x[4] <= 85 ? 1200 : x[4] <= 100 ? 2000 : 3000;
function drawShop() {
  sh.innerHTML = `<h3>체육관 상점</h3><div class="sp-tabs" role="tablist">${SHOP_T.map(([k, n]) => `<button role="tab" data-st="${k}" aria-selected="${shopT === k}">${n}</button>`).join('')}</div><div class="sp-body"></div>`;
  const body = sh.querySelector('.sp-body');
  ({ tm: shopTm, deco: shopDeco, fit: shopFit, up: shopUp })[shopT](body);
  const inner = body.onclick; body.onclick = null;
  sh.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.st) { sfx('tap'); shopT = b.dataset.st; redraw(); return; } inner?.(e, b); };
}
// 기술머신: 내 체육관 타입 포켓몬이 배울 수 있는 기술. 사면 바로 한 마리에게 가르친다
function shopTm(body) {
  const D = GB().D, g = st(), mons = S.box.filter(P => (SPECIES[P.sp]?.t || []).includes(g.ty));
  const can = new Map(); mons.forEach(P => (D.sp[P.sp]?.tm || []).forEach(i => { if (!can.has(i)) can.set(i, []); can.get(i).push(P); }));
  const types = [...new Set([...can.keys()].map(i => D.mv[i][2]))].sort((a, b) => a - b);
  if (!types.includes(tmTy)) tmTy = types.includes(g.ty) ? g.ty : types[0] || 0;
  const L = [...can.keys()].map(i => D.mv[i]).filter(x => x[2] === tmTy).sort((a, b) => (b[3] !== 2) - (a[3] !== 2) || (b[4] || 0) - (a[4] || 0));
  body.innerHTML = `<p class="gy-lead">${TYPE_KO[g.ty]} 타입 포켓몬이 배울 수 있는 기술이에요. 사면 바로 한 마리에게 가르쳐요.</p>
    ${types.length ? `<div class="sp-chips">${types.map(t => `<button data-ty="${t}" aria-pressed="${t === tmTy}">${GA.tyIcon(t)}${TYPE_KO[t]}</button>`).join('')}</div>` : `<p class="sf-none">${TYPE_KO[g.ty]} 타입 포켓몬이 아직 없어요.</p>`}
    <div class="sp-list">${L.map(x => `<button class="sp-tm" data-tm="${x[0]}">${GB().tyTag(x[2], x[3])}<b>${esc(x[1])}</b><small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}</small><em>${gold(tmPrice(x))}</em></button>`).join('')}</div>`;
  body.onclick = (e, b) => { sfx('tap'); if (b.dataset.ty) { tmTy = +b.dataset.ty; redraw(); return; } if (b.dataset.tm) buyTm(b.dataset.tm, can); };
}
function buyTm(id, can) {
  const D = GB().D, x = GB().mvOf(id), i = D.mv.indexOf(x), price = tmPrice(x), L = (can.get(i) || []).filter(P => !GB().gm(P).mv.includes(id));
  pop(`<h4>기술머신 · ${esc(x[1])}</h4><div class="mp-moves one">${GB().mvRow(x, '')}</div><p class="gy-msg">${esc(x[8] || '')}</p>
    ${L.length ? `<p class="gy-msg">가르칠 포켓몬을 고르세요 (${gold(price)})</p><div class="lu-pick">${L.map(P => `<button data-a="${P.id}">${GB().thumb(P)}<b>${esc(nmOf(P))}</b><span>Lv.${GB().gm(P).lv}</span></button>`).join('')}</div>` : '<p class="gy-msg">이 기술을 배울 수 있는 포켓몬이 이미 다 알고 있어요.</p>'}
    <div class="gy-btns one"><button data-a="x">닫기</button></div>`, (a, close) => {
    if (!a) return; close(); if (a === 'x') return; const P = boxOf(+a || a); if (!P) return;
    if (S.gold < price) return say(`골드가 모자라요. ${price.toLocaleString()}G가 필요해요.`);
    const m = GB().gm(P);
    const learn = k => { if (!spend(price)) return say('골드가 모자라요.'); m.kn = (m.kn || []).filter(y => y !== id);
      if (k == null) { if (!m.kn.includes(id)) m.kn.push(id); } else if (k >= m.mv.length) m.mv.push(id); else { const old = m.mv[k]; m.mv[k] = id; if (!m.kn.includes(old)) m.kn.push(old); }
      K.glog('tr', `기술머신으로 ${esc(nmOf(P))}에게 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 가르쳤다.`); K.save(); say(`${esc(nmOf(P))}${K.jong(nmOf(P)) ? '은' : '는'} ${esc(x[1])}${K.jong(x[1]) ? '을' : '를'} ${k == null ? '익혀 두었다! (기술 바꾸기에서 쓸 수 있어요)' : '배웠다!'}`); };
    if (m.mv.length < 4) return learn(m.mv.length);
    pop(`<h4>${esc(nmOf(P))} · 잊을 기술</h4><p class="gy-msg">${esc(x[1])} 대신 잊을 기술을 고르세요. 잊은 기술은 나중에 다시 배울 수 있어요.</p><div class="mp-moves pick">${m.mv.map((y, k) => GB().mvOf(y) ? GB().mvRow(GB().mvOf(y), 's' + k) : '').join('')}</div>
      <div class="gy-btns"><button data-a="keep">익혀 두기만</button><button data-a="x">그만두기</button></div>`, (b2, c2) => { c2(); if (b2 === 'x') return; learn(b2 === 'keep' ? null : +b2.slice(1)); });
  });
}
// 꾸미기: 사면 빈 칸에 바로 놓인다. 놓인 것을 누르면 치우기, 가진 것을 누르면 놓기
function shopDeco(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i, max = K.decoMax(); g.own = g.own || {}; g.dp = (g.dp || []).slice(0, 8);
  const placed = Array.from({ length: max }, (_, i) => g.dp[i] || null);
  body.innerHTML = `<p class="gy-lead">본가 비밀기지 인형·쿠션으로 체육관을 꾸며요. 사면 빈 자리에 놓여요.</p>
    <h4 class="sf-h">놓인 꾸미기 <small>${placed.filter(Boolean).length}/${max}</small></h4>
    <div class="dc-slots">${placed.map((k, i) => `<button data-slot="${i}" class="${k ? '' : 'empty'}">${k ? `<img alt="" src="${IMG}deco/${k}.png">` : '+'}</button>`).join('')}</div>
    <h4 class="sf-h">상품</h4><div class="dc-grid">${Object.entries(K.DECO).map(([k, o]) => { const lock = G < o.lv, own = g.own[k];
      return `<button data-dc="${k}" class="${own ? 'own' : ''}${lock ? ' lock' : ''}"><span class="dc-pic"><img alt="" src="${IMG}deco/${k}.png" class="${o.w > 16 ? 'big' : ''}"></span><b>${o.n}</b><em>${own ? (placed.includes(k) ? '놓여 있음' : '가지고 있음') : lock ? `${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}부터` : gold(o.g)}</em></button>`; }).join('')}</div>`;
  body.onclick = (e, b) => {
    sfx('tap');
    if (b.dataset.slot) { const i = +b.dataset.slot; if (g.dp[i]) { g.dp[i] = null; K.save(); redraw(); } return; }
    const k = b.dataset.dc; if (!k) return; const o = K.DECO[k];
    if (g.own[k]) { if (placed.includes(k)) { g.dp[placed.indexOf(k)] = null; } else { const i = placed.indexOf(null); if (i < 0) return say('꾸미기 자리가 꽉 찼어요. 놓인 것을 눌러 치우거나, 체육관 넓히기에서 자리를 늘려 주세요.'); g.dp[i] = k; } K.save(); redraw(); return; }
    if (G < o.lv) return say(`${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}이 되면 살 수 있어요.`);
    pop(`<h4>${o.n}</h4><div class="dc-big"><img alt="" src="${IMG}deco/${k}.png"></div><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`, (a, close) => {
      close(); if (a !== 'y') return; if (!spend(o.g)) return say('골드가 모자라요.');
      g.own[k] = 1; const i = placed.indexOf(null); if (i >= 0) g.dp[i] = k; K.save(); redraw(); });
  };
}
// 관장 의상: 체육관 맵의 내 모습 (호연 옷·레드·리프는 배틀 뒷모습도)
function shopFit(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.fits = g.fits || {};
  const row = (k, o) => { const own = !k || g.fits[k], on = (g.fit || '') === k, lock = o.lv && G < o.lv;
    return `<button data-fit="${k}" class="${on ? 'on' : ''}${lock ? ' lock' : ''}">${owIc(o.ow)}<b>${o.n}</b><em>${on ? '입는 중' : own ? '입기' : lock ? `${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}부터` : gold(o.g)}</em></button>`; };
  body.innerHTML = `<p class="gy-lead">체육관에서 입는 관장 옷이에요. 맵에서 내 모습이 바뀌어요.</p><div class="ft-grid">${row('', { n: '기본 옷', ow: GA.trOf().sex === 'f' ? 'green_normal' : 'red_normal' })}${Object.entries(K.OUTFITS).map(([k, o]) => row(k, o)).join('')}</div>`;
  body.onclick = (e, b) => {
    sfx('tap'); const k = b.dataset.fit; if (k == null) return; const o = K.OUTFITS[k];
    if (!k || g.fits[k]) { g.fit = k; K.save(); redraw(); K.renderHome(); return; }
    if (o.lv && G < o.lv) return say(`${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}이 되면 살 수 있어요.`);
    pop(`<h4>${o.n}</h4><div class="dc-big">${owIc(o.ow)}</div><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`, (a, close) => {
      close(); if (a !== 'y') return; if (!spend(o.g)) return say('골드가 모자라요.'); g.fits[k] = 1; g.fit = k; K.save(); redraw(); K.renderHome(); });
  };
}
// 체육관 넓히기: 훈련장 칸, 꾸미기 자리 (등급이 오를 때마다 하나씩)
function shopUp(body) {
  const g = st(), G = K.gradeOf(g.rep || 0), trN = g.trN || 0, dN = (g.decoN || 0) / 2;
  const item = (k, n, have, max, price, need) => `<div class="up-row"><div><b>${n}</b><small>${have}/${max}${have < max && G.i < need ? ` · ${K.gradeOf([0, 100, 250, 450, 700, 1000][need]).n}부터` : ''}</small></div>${have >= max ? '<em>최대</em>' : `<button class="gy-key${G.i >= need ? ' main' : ''}" data-up="${k}" ${G.i >= need ? '' : 'disabled'}>${gold(price)}</button>`}</div>`;
  body.innerHTML = `<p class="gy-lead">평판이 올라 체육관 등급이 오르면 체육관을 넓힐 수 있어요. 지금 등급: <b>${G.n}</b></p>
    ${item('tr', '훈련장 칸 +1', 2 + trN, 6, 1500 * (trN + 1), trN + 1)}${item('dc', '꾸미기 자리 +2', 2 + dN * 2, 8, 1000 * (dN + 1), dN + 1)}
    <div class="up-row"><div><b>트레이너 자리</b><small>${K.staffMax()}/5 · 등급이 오르면 저절로 늘어요</small></div></div>
    <div class="up-row"><div><b>도전자 방문</b><small>하루 ${2 + (G.i >= 2) + (G.i >= 4)}~${3 + (G.i >= 2) + (G.i >= 4)}명 · 등급이 오르면 늘어요</small></div></div>`;
  body.onclick = (e, b) => {
    sfx('tap'); const k = b.dataset.up; if (!k) return; const price = k === 'tr' ? 1500 * (trN + 1) : 1000 * (dN + 1);
    if (!spend(price)) return say('골드가 모자라요.');
    if (k === 'tr') g.trN = trN + 1; else g.decoN = (g.decoN || 0) + 2;
    K.glog('tr', k === 'tr' ? `훈련장을 넓혔다! (${2 + g.trN}칸)` : `꾸미기 자리를 늘렸다! (${K.decoMax()}자리)`); K.save(); redraw();
  };
}

window.GymManage = { tab, tickTrain, redraw };
})();
