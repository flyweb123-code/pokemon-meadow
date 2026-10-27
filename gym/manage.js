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
function drawTrain() {
  const g = st(); g.tr = g.tr || []; tickTrain(Date.now()); K.save();
  const n = trMax(), now = Date.now();
  const cells = Array.from({ length: n }, (_, i) => {
    const e = g.tr[i], P = e && boxOf(e.id);
    if (!P) return `<button class="tr-cell empty" data-add="1"><span>+</span><small>포켓몬 보내기</small></button>`;
    const m = GB().gm(P), gr = GB().growth(P.sp), a = GB().xpAt(gr, m.lv), b = GB().xpAt(gr, m.lv + 1), k = stOf(P, i), left = e.d === K.dayStart(now) ? Math.max(0, 8 - e.h) : 8;
    return `<button class="tr-cell ${k}${left <= 0 ? ' done' : ''}" data-p="${P.id}" style="--d:${(i * .37) % 1.2}s"><span class="tr-yd"><img class="tr-eq" alt="" src="${IMG}deco/tr_${k}.png">${monImg(P.sp, { s: P.shiny, f: P.sex === 'f' })}<i class="tr-hit">!</i></span>
      <b>${esc(nmOf(P))} <em>Lv.${m.lv}</em></b><i class="tr-xp"><i style="width:${m.lv >= GB().LV_MAX ? 100 : clampN((m.xp - a) / (b - a), 0, 1) * 100}%"></i></i><small>${left > 0 ? `${TR_ST[k]} · 오늘 ${Math.ceil(left)}시간 남음` : '오늘 훈련 끝 (내일 다시)'}</small></button>`;
  }).join('');
  sh.innerHTML = `<h3>훈련장</h3><p class="gy-lead">포켓몬을 보내 두면 앱을 꺼 둬도 경험치가 쌓여요(하루 8시간까지). 가끔 특별한 기술을 익혀요. 훈련장에 보낸 포켓몬은 필드에서 빠져요.</p>
    <div class="tr-grid">${cells}</div><p class="tr-cap">훈련장 ${g.tr.length}/${n}칸${n < 6 ? ' · 상점의 <b>체육관 넓히기</b>에서 칸을 늘릴 수 있어요' : ''}</p>`;
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.add) return pickTrain();
    if (b.dataset.p) return trPop(+b.dataset.p || b.dataset.p);
  };
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
