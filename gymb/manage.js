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
const owIc = ow => `<i class="ow-ic${K.owW(ow) > 16 ? ' w32' : ''}" style="background-image:url(${K.owSrc(ow)})"></i>`;
let sh = null, cur = null, shopT = 'tm', tmTy = 0;
function tab(t, el) { sh = el; cur = t; draw(); }
function draw() { if (!sh || !st()) return; sh.onclick = null; sh.classList.remove('ty-on'); ({ train: drawTrain, staff: drawStaff, shop: drawShop })[cur]?.(); GB()?.fillTh(sh); }
const redraw = () => { if (sh && !sh.hidden) draw(); };

// ======================= 훈련장 (4단계) =======================
const trMax = () => Math.min(6, 2 + (st().trN || 0));
const TR_ST = { dummy: '지푸라기 타격대', sandbag: '샌드백', fly: '비행 장치', water: '물 위 장치' };
const stOf = (P, i) => { const t = SPECIES[P.sp]?.t || []; return t.includes(3) ? 'fly' : t.includes(11) ? 'water' : t.includes(2) || i % 2 ? 'sandbag' : 'dummy'; };
// 1시간 경험치: 레벨 10 은 1시간에 약 1레벨, 레벨 50 은 약 0.2레벨 (경완 기획 밸런스). 훈련광 트레이너가 있으면 +20%
function perHour(P) { const m = GB().gm(P), g = GB().growth(P.sp); if (m.lv >= GB().LV_MAX) return 0; const need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  return need * Math.min(.35, 3 / Math.max(1, m.lv)) * coachX(); }
// 훈련장에 배치한 트레이너 (코치): 한 명마다 +25%, 훈련광은 +50%. 고용만 한 훈련광은 +20%
const coachX = () => { const L = st().sf.filter(s => !s.rest); return 1 + L.reduce((a, s) => a + (s.yard ? (s.trait === 'train' ? .5 : .25) : s.trait === 'train' ? .2 : 0), 0); };
const YARD_SF = 2;
// 특별한 기술: 기술머신으로 배우는 기술 중 자기 타입의 공격 기술 하나 (1시간마다 5%)
function special(P) {
  const D = GB().D, m = GB().gm(P), t = SPECIES[P.sp]?.t || [], L = (D.sp[P.sp]?.tm || []).map(i => D.mv[i]).filter(x => x && x[3] !== 2 && (x[4] || 0) >= 50 && !m.mv.includes(x[0]) && !(m.kn || []).includes(x[0]));
  const pref = L.filter(x => t.includes(x[2])), pool = pref.length && Math.random() < .5 ? pref : L; if (!pool.length) return null;   // 자기 타입이 아니어도 배운다 (반반)
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
// 훈련장 = 화면 가득한 체육관 뒤뜰 (경완 피드백 2026-10-27 '꾸미기 모드 필드처럼', '미사여구 다 빼고 전체 화면, 퀄리티 필드 수준', '필드랑 너무 비슷하다').
// 체육관 건물 벽·모래 코트(배틀 코트 선)·돌 수영장·벤치·타이어. 기구는 본게임 필드와 같은 도트 그림 도구(GA.art: ART 덩어리·외곽선)로 그린다. 포켓몬은 필드와 같은 걸음 그림(GA.pmd)·크기.
// 포켓몬이 돌아다니며 기구를 치고, 둘씩 대련하고, 쉬고, 오늘 8시간을 다 쓰면 잔다. 경험치 계산은 tickTrain 그대로(화면은 보여 주기만).
const leftOf = e => e.d === K.dayStart(Date.now()) ? Math.max(0, 8 - e.h) : 8;
let Y = null;   // 마당: { el, W, H, eq: {k: {x, y, el}}, mons: [], raf, last, pos: {id: [x, y]}, pond, ring }
const inPond = (x, y, m = 0) => { const p = Y.pond; return x > p.x0 - m && x < p.x1 + m && y > p.y0 - m && y < p.y1 + m; };   // 수영장(네모)
const yTop = () => 138;   // 체육관 벽 아래부터 걸어 다님
function yardSpot(swim) {
  for (let i = 0; i < 60; i++) { const x = 24 + Math.random() * (Y.W - 48), y = yTop() + Math.random() * (Y.H - yTop() - 20);
    if (swim ? inPond(x, y - 10, -22) : !inPond(x, y, 16) && !(Y.bench && Math.abs(x - Y.bench[0]) < 50 && Math.abs(y - Y.bench[1]) < 26) && !Object.values(Y.eq).some(q => Math.abs(q.x - x) < 26 && y < q.y + 8 && y > q.y - 20)) return [x, y]; }
  return [Y.W * .3, Y.H * .6];
}
// 필드 도트 그림 도구로 기구 그리기 (1칸 = 화면 2px, 필드와 같은 크기)
const SW = { ol: '#4a3410', d2: '#7a5a20', d1: '#9a7428', m: '#b8902e', l: '#d4ac44', h: '#e8c860', hh: '#f6e09a' };
const RD = { ol: '#3a1010', d2: '#5e1c18', d1: '#7e2a22', m: '#a03a2c', l: '#c0503a', h: '#dc7454', hh: '#f0a07c' };
const WH = { ol: '#3c3c48', d2: '#9090a0', d1: '#b0b0bc', m: '#c8c8d4', l: '#dcdce6', h: '#ececf4', hh: '#ffffff' };
let EQ_CV = null;
function eqArt() {
  if (EQ_CV) return EQ_CV; const { ART } = GA.art(), B = ART.B, ST = ART.ST;
  const dummy = () => { const S = ART.sheet(28, 44, 313);
    ART.trunk(S, 14, 14, 42, 1.3, 2.1, B, false);
    ART.limb(S, 3, 21, 25, 21, 1.3, 1.3);
    S.clump(14, 27, 6.5, SW, 0, 1.3, .14); S.clump(14, 11, 5.2, SW, .12, .95, .12); S.seams(SW);
    for (let x = 6; x <= 22; x++) { if (S.get(x, 22)) S.set(x, 22, RD.m, 0, RD.ol); if (S.get(x, 32)) S.set(x, 32, RD.d1, 0, RD.ol); }
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 3.2) continue; S.set(14 + x, 27 + y, d > 2.2 ? RD.m : d > 1.1 ? WH.h : RD.l, 0, RD.ol); }
    for (let k = 0; k < 14; k++) { const x = 9 + Math.floor(S.R() * 11), y = 7 + Math.floor(S.R() * 30); if (S.get(x, y) === SW.l || S.get(x, y) === SW.m) S.set(x, y, SW.d1, 0, SW.ol); }
    S.outline(); return S.canvas([14, 42, 8, 1.6]); };
  const sandbag = () => { const S = ART.sheet(32, 48, 727);
    ART.trunk(S, 5, 4, 46, 1.2, 1.8, B, false); ART.trunk(S, 27, 4, 46, 1.2, 1.8, B, false);
    ART.limb(S, 3, 4, 29, 4, 1.4, 1.4);
    for (let y = 6; y <= 12; y++) S.set(16, y, y % 2 ? ST.h : ST.d1, 0, ST.ol);
    S.clump(16, 26, 7, RD, .05, 1.75, .06); S.seams(RD);
    for (let x = 8; x <= 24; x++) { if (S.get(x, 17)) S.set(x, 17, '#3c2a20', 0, RD.ol); if (S.get(x, 35)) S.set(x, 35, '#3c2a20', 0, RD.ol); }
    for (let y = 19; y <= 33; y += 2) if (S.get(13, y)) S.set(13, y, RD.hh, 0, RD.ol);
    S.outline(); return S.canvas([16, 46, 13, 1.6]); };
  const target = () => { const S = ART.sheet(32, 46, 919);
    ART.limb(S, 9, 44, 14, 20, 1, 1); ART.limb(S, 23, 44, 18, 20, 1, 1); ART.limb(S, 16, 43, 16, 22, .8, .8);
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const d = Math.hypot(x, y / .95); if (d > 11.6) continue; const lt = (-x - y) / 24, ring = Math.floor(d / 2.4);
      const P = d > 10 ? B : ring % 2 ? WH : RD, c = lt > .25 ? P.h : lt > -.1 ? P.l : lt > -.35 ? P.m : P.d1; S.set(16 + x, 17 + y, c, 0, P.ol); }
    S.outline(); return S.canvas([16, 44, 11, 1.6]); };
  const buoy = () => { const S = ART.sheet(28, 18, 41);
    for (let y = -6; y <= 6; y++) for (let x = -11; x <= 11; x++) { const o = (x / 10.5) ** 2 + (y / 5.6) ** 2, i = (x / 4) ** 2 + (y / 2.2) ** 2; if (o > 1 || i < 1) continue;
      const P = (Math.atan2(y, x) + Math.PI) / (Math.PI / 2) % 2 < 1 ? RD : WH, lt = -y / 6 - x / 22; S.set(14 + x, 8 + y, lt > .35 ? P.h : lt > -.1 ? P.l : lt > -.45 ? P.m : P.d1, 0, P.ol); }
    S.outline(); return S.canvas(); };
  return (EQ_CV = { dummy: dummy().toDataURL(), sandbag: sandbag().toDataURL(), fly: target().toDataURL(), water: buoy().toDataURL() });
}
function yardBg(c) {
  const { ART, seasonCv } = GA.art(), PW = c.width = Math.ceil(Y.W / 2), PH = c.height = Math.ceil(Y.H / 2), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  let seed = 23; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const put = (cv, x, y) => g.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height));
  const tc = GA.TYPE_C[st().ty] || '#c03028', mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dith = (x, y, a) => a * 16 > BAY[y & 3][x & 3] + .5;
  const WB = 60;   // 벽 아래 끝 (반 크기 칸)
  // ---- 바닥: 다진 모래 코트 (갈퀴 자국·작은 돌) ----
  for (let y = WB; y < PH; y++) for (let x = 0; x < PW; x++) { const n = Math.sin(x * .31 + y * .07) + Math.sin(y * .23 - x * .05), d = (x + y) & 1; px(x, y, 1, 1, n > 1.2 && d ? '#d8bc84' : n < -1.3 && d ? '#ecd6a4' : '#e4cc96'); }
  for (let y = WB + 6; y < PH; y += 5) for (let x = 0; x < PW; x++) if (((x + y * 3) % 23) < 15 && Math.sin(x * .9 + y) > -.2) px(x, y, 1, 1, '#d4b67c');
  for (let i = 0; i < 160 * PW * PH / 54000; i++) { const x = R() * PW, y = WB + 4 + R() * (PH - WB), k = R(); if (k < .5) { px(x, y, 2, 1, '#c8a870'); } else if (k < .75) { px(x, y, 2, 2, '#a8a094'); px(x, y, 1, 1, '#e0d8cc'); } else px(x, y, 1, 1, '#f4e4bc'); }
  // ---- 배틀 코트 선 (흰 선, 가운데 몬스터볼 무늬) ----
  const C = Y.court, cx0 = C.x0 / 2, cy0 = C.y0 / 2, cx1 = C.x1 / 2, cy1 = C.y1 / 2, my = (cy0 + cy1) / 2, mx = (cx0 + cx1) / 2, LN = '#f8f4e8', LS = '#cdb27e';
  const hl = (x0, x1, y) => { px(x0, y + 1, x1 - x0 + 1, 1, LS); px(x0, y, x1 - x0 + 1, 1, LN); }, vl = (x, y0, y1) => { px(x + 1, y0, 1, y1 - y0 + 1, LS); px(x, y0, 1, y1 - y0 + 1, LN); };
  hl(cx0, cx1, cy0); hl(cx0, cx1, cy1); vl(cx0, cy0, cy1); vl(cx1, cy0, cy1); hl(cx0, cx1, Math.round(my));
  hl(cx0 + 12, cx1 - 12, Math.round(cy0 + 10)); hl(cx0 + 12, cx1 - 12, Math.round(cy1 - 10));
  const r = Math.min(20, (cy1 - cy0) * .28);
  for (let a = 0; a < 6.283; a += .02) { const x = Math.round(mx + Math.cos(a) * r), y = Math.round(my + Math.sin(a) * r * .62); px(x, y + 1, 1, 1, LS); px(x, y, 1, 1, LN); }
  for (let y = -6; y <= 6; y++) for (let x = -9; x <= 9; x++) { const d = (x / 9) ** 2 + (y / 5.6) ** 2; if (d > 1) continue; px(mx + x, my + y, 1, 1, d > .72 ? '#3a3a48' : Math.abs(y) < 1 ? '#3a3a48' : y < 0 ? (x + y < -6 ? '#f07060' : '#d84030') : '#f4f0e8'); }
  for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if ((x / 3) ** 2 + (y / 2) ** 2 <= 1) px(mx + x, my + y, 1, 1, (x / 3) ** 2 + (y / 2) ** 2 > .5 ? '#3a3a48' : '#fff');
  // ---- 수영장: 돌 테두리 + 물 타일 + 레인 줄 ----
  const P = { x0: Y.pond.x0 / 2, y0: Y.pond.y0 / 2, x1: Y.pond.x1 / 2, y1: Y.pond.y1 / 2 };
  for (let y = P.y0 - 4; y <= P.y1 + 4; y++) for (let x = P.x0 - 4; x <= P.x1 + 4; x++) { const inW = x >= P.x0 && x <= P.x1 && y >= P.y0 && y <= P.y1;
    if (!inW) { const bx = Math.floor((x - P.x0 + 40) / 6), by = Math.floor((y - P.y0 + 40) / 4), edge = (x - P.x0 + 40) % 6 === 0 || (y - P.y0 + 40) % 4 === 0;
      px(x, y, 1, 1, edge ? '#8a8e96' : y < P.y0 ? ((bx + by) & 1 ? '#d6d8dc' : '#c8ccd2') : ((bx + by) & 1 ? '#bcc0c8' : '#b0b4bc')); continue; }
    const t = (y - P.y0) / (P.y1 - P.y0), tile = (x - P.x0) % 7 === 0 || (y - P.y0) % 6 === 0, base = t < .18 ? '#2e6aa8' : '#3a86c8';
    px(x, y, 1, 1, tile ? (t < .18 ? '#285e98' : '#3478b8') : dith(x, y, t) && t < .5 ? '#3a86c8' : base === '#3a86c8' && dith(x, y, (t - .5) * 2) ? '#4c9ad8' : base); }
  for (let x = P.x0; x <= P.x1; x++) px(x, P.y0, 1, 1, '#1f4f80');   // 물 그늘
  { const ly = Math.round((P.y0 + P.y1) / 2) - 1; for (let x = P.x0 + 1; x < P.x1; x++) px(x, ly, 1, 2, Math.floor((x - P.x0) / 3) % 2 ? '#f4f4f8' : '#e04838'); }
  for (let i = 0; i < 10; i++) { const x = P.x0 + 3 + R() * (P.x1 - P.x0 - 10), y = P.y0 + 3 + R() * (P.y1 - P.y0 - 5); px(x, y, 5, 1, '#a8dcfa'); px(x + 1, y + 1, 3, 1, '#7cc0ec'); }
  for (const lx of [P.x1 - 6]) { for (let y = P.y0 - 6; y <= P.y0 + 4; y++) { px(lx, y, 1, 1, '#e8eaee'); px(lx + 4, y, 1, 1, '#e8eaee'); px(lx + 1, y, 1, 1, '#9aa0aa'); } for (let y = P.y0 - 2; y <= P.y0 + 4; y += 3) px(lx, y, 5, 1, '#c8ccd4'); }   // 사다리
  // ---- 체육관 건물 벽 ----
  for (let y = 0; y < 14; y++) for (let x = 0; x < PW; x++) { const row = Math.floor(y / 3), off = row % 2 ? 3 : 0, gap = (x + off) % 6 === 0;
    px(x, y, 1, 1, y % 3 === 2 ? '#262a3c' : gap ? '#2e3346' : dith(x, y, y / 14) ? '#4a5272' : '#3c4460'); }
  px(0, 14, PW, 2, mix(tc, '#000000', .25)); px(0, 14, PW, 1, mix(tc, '#ffffff', .25)); px(0, 16, PW, 1, '#20202c');
  for (let y = 17; y < WB - 6; y++) for (let x = 0; x < PW; x++) { const t = (y - 17) / (WB - 23); px(x, y, 1, 1, y % 4 === 0 ? '#cfc2a2' : dith(x, y, t * .7) ? '#ddd0b2' : '#e9dec4'); }
  const doorW = 30, dx0 = Math.round(PW / 2 - doorW / 2);
  for (let pxl = 8; pxl < PW; pxl += 46) { const x = pxl; if (Math.abs(x - PW / 2) < doorW) continue; px(x, 17, 5, WB - 23, '#b7aa8c'); px(x, 17, 1, WB - 23, '#d4c8aa'); px(x + 4, 17, 1, WB - 23, '#9a8e72');
    // 기둥 사이 창문
    const w0 = x + 11; if (w0 + 22 < PW && Math.abs(w0 + 11 - PW / 2) > doorW) { px(w0 - 1, 23, 24, 16, '#4a4c5c'); for (let yy = 0; yy < 14; yy++) for (let xx = 0; xx < 22; xx++) { const sh = (xx + yy) % 13 < 3 && xx + yy < 18; px(w0 + xx, 24 + yy, 1, 1, sh ? '#d8f0ff' : dith(xx, yy, yy / 14) ? '#6aa8d8' : '#8cc4ec'); } px(w0 + 10, 24, 2, 14, '#4a4c5c'); px(w0 - 2, 39, 26, 2, '#a89c80'); px(w0 - 2, 39, 26, 1, '#cfc4a8'); } }
  // 문 + 위 간판(타입 색 몬스터볼)
  px(dx0 - 2, 22, doorW + 4, WB - 22, '#3a3a4c');
  for (let y = 24; y < WB - 4; y++) for (let x = 0; x < doorW; x++) px(dx0 + x, y, 1, 1, x === doorW / 2 || x === doorW / 2 - 1 ? '#2a2a38' : x < 2 || x > doorW - 3 ? '#5a6478' : dith(x, y, x / doorW) ? '#7a88a2' : '#8c9ab4');
  for (let x = 2; x < doorW - 2; x += 1) if (x % 4 < 2) px(dx0 + x, 30, 1, 1, '#b0bcd2');
  px(dx0 - 6, 17, doorW + 12, 5, mix(tc, '#000000', .35)); px(dx0 - 5, 18, doorW + 10, 3, tc); px(dx0 - 5, 18, doorW + 10, 1, mix(tc, '#ffffff', .35));
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d > 4.3) continue; px(PW / 2 + x - .5, 19.5 + y, 1, 1, d > 3.4 || y === 0 ? '#20202c' : y < 0 ? '#e84838' : '#f8f8f8'); }
  // 벽 아래 돌 기초 + 그늘
  for (let y = WB - 6; y < WB; y++) for (let x = 0; x < PW; x++) px(x, y, 1, 1, (x + (y > WB - 4 ? 4 : 0)) % 9 === 0 || y === WB - 6 ? '#6e7280' : y < WB - 3 ? '#9a9eaa' : '#868a96');
  for (let y = WB; y < WB + 4; y++) for (let x = 0; x < PW; x++) if (dith(x, y, 1 - (y - WB) / 4)) px(x, y, 1, 1, 'rgba(60,40,10,.22)');
  // 문 양옆 화분 (계절 색)
  for (const sx of [-1, 1]) { const x = PW / 2 + sx * (doorW / 2 + 10); for (let y = 0; y < 6; y++) px(x - 6, WB - 1 + y, 12, 1, y === 0 ? '#c86848' : y < 4 ? '#a85030' : '#7a3820'); put(ART.bush(), x, WB + 1); }
  // ---- 벤치·타이어·고깔 ----
  if (Y.bench) { const [bx, by] = [Y.bench[0] / 2, Y.bench[1] / 2], B = ART.B;
    for (let i = 0; i < 2; i++) { px(bx - 15 + i * 26, by - 4, 3, 5, B.d1); px(bx - 15 + i * 26, by - 4, 1, 5, B.l); }
    for (let y = 0; y < 4; y++) px(bx - 18, by - 8 + y, 36, 1, y === 0 ? B.hh : y === 3 ? B.d2 : y === 1 ? B.h : B.m); px(bx - 18, by - 9, 36, 1, B.ol); px(bx - 18, by - 4, 36, 1, B.ol);
    for (let y = 0; y < 3; y++) px(bx - 18, by - 16 + y, 36, 1, y === 0 ? B.h : B.m); px(bx - 18, by - 17, 36, 1, B.ol); px(bx - 18, by - 13, 36, 1, B.ol); for (const k of [-14, 12]) px(bx + k, by - 13, 2, 5, B.d1);
    px(bx - 8, by - 12, 7, 3, '#5aa8e8'); px(bx - 8, by - 12, 7, 1, '#a8d8f8');   // 수건
    px(bx + 7, by - 14, 3, 6, '#f8f8f8'); px(bx + 7, by - 15, 3, 1, '#58a8f0'); px(bx + 8, by - 13, 1, 4, '#c8e4f8'); }   // 물병
  const tire = (x, y) => { for (let yy = -4; yy <= 4; yy++) for (let xx = -8; xx <= 8; xx++) { const o = (xx / 8) ** 2 + (yy / 4.2) ** 2, i = (xx / 3.6) ** 2 + (yy / 1.8) ** 2; if (o > 1 || i < 1) continue; px(x + xx, y + yy, 1, 1, o > .78 ? '#18181e' : yy < 0 && xx < 2 ? '#4a4a56' : '#30303a'); } };
  for (const [fx, fy] of Y.tires) tire(fx / 2, fy / 2);
  const cone = (x, y) => { for (let yy = 0; yy < 8; yy++) { const hw = 1 + yy * .5; px(x - hw, y - 8 + yy, hw * 2 + 1, 1, yy === 3 || yy === 4 ? '#f8f8f8' : yy < 2 ? '#ff9a48' : '#f07020'); } px(x - 5, y, 11, 1, '#c85810'); };
  cone(C.x0 / 2 + 2, C.y1 / 2 + 6); cone(C.x1 / 2 - 2, C.y1 / 2 + 6);
  try { seasonCv(c, 'bg', { ox: 0, oy: 0 }); } catch (e) {}
}
function drawTrain() {
  const g = st(); g.tr = g.tr || []; tickTrain(Date.now()); K.save();
  if (Y) { Y.mons.forEach(m => { Y.pos[m.id] = [m.x, m.y]; }); cancelAnimationFrame(Y.raf); }
  sh.classList.add('ty-on'); sh.scrollTop = 0;
  sh.innerHTML = `<div class="ty-yd"><canvas class="ty-bg"></canvas><div class="ty-l"></div><button class="ty-add${g.tr.length ? '' : ' pulse'}" data-add="1" aria-label="포켓몬 보내기"><b>+</b><small>${g.tr.length}/${trMax()}</small></button></div>`;
  const el = sh.querySelector('.ty-yd'), W = Math.max(280, el.clientWidth || 360), H = Math.max(420, el.clientHeight || 640);
  Y = { el, W, H, L: el.querySelector('.ty-l'), eq: {}, mons: [], pos: Y?.pos || {}, last: 0,
    pond: { x0: W * .4, y0: H * .78, x1: W - 84, y1: H - 18 }, court: { x0: 22, y0: H * .4, x1: W - 22, y1: H * .68 }, bench: [W * .2, H * .84], tires: [[W * .08, H * .94], [W * .2, H * .95], [W * .14, H * .91]] };
  Y.pond.x = (Y.pond.x0 + Y.pond.x1) / 2; Y.pond.y = (Y.pond.y0 + Y.pond.y1) / 2;
  yardBg(el.querySelector('.ty-bg'));
  const ART_ = eqArt(), EQ = { dummy: [.16, .33], sandbag: [.5, .3], fly: [.84, .33], water: [.6, .87] };
  for (const k in EQ) { const [fx, fy] = EQ[k], q = document.createElement('i'), y = k === 'water' ? Y.pond.y + 6 : fy * H; q.className = 'ty-eq eq-' + k;
    q.style.cssText = `left:${fx * W}px;top:${y}px;z-index:${Math.round(y)};background-image:url(${ART_[k]})`; Y.L.append(q); Y.eq[k] = { x: fx * W, y, el: q }; }
  g.tr.forEach((e, i) => { const P = boxOf(e.id); if (P) yardMon(P, e, i); });
  // 코치 (훈련장에 배치한 트레이너): 코트 가장자리에서 응원
  Y.co = g.sf.filter(x => x.yard).slice(0, YARD_SF).map((x, i) => { const q = document.createElement('i'), cx = W * (i ? .78 : .22), cy = H * .57; q.className = 'ty-co' + (K.owW(x.ow) > 16 ? ' w32' : ''); q.dataset.co = i;
    q.style.cssText = `left:${cx}px;top:${cy}px;z-index:${Math.round(cy)};background-image:url(${K.owSrc(x.ow)})`; Y.L.append(q); return { s: x, el: q, x: cx, y: cy, nx: performance.now() / 1000 + 1 + i * 1.7 }; });
  sh.onclick = ev => {
    const c = ev.target.closest('[data-co]'); if (c) { sfx('tap'); const o = Y.co[+c.dataset.co]?.s; if (o) sfDetail(o); return; }
    const t = ev.target.closest('[data-p],[data-add]'); if (!t) return; sfx('tap');
    if (t.dataset.add) return st().tr.length >= trMax() ? say(`훈련장이 가득 찼어요.${trMax() < 6 ? '<br><small>상점의 체육관 넓히기에서 늘릴 수 있어요.</small>' : ''}`) : pickTrain();
    trPop(+t.dataset.p || t.dataset.p);
  };
  { const x = coachX(); if (x > 1.001) el.insertAdjacentHTML('beforeend', `<div class="ty-info">💪 코치 보너스 <b>+${Math.round((x - 1) * 100)}%</b></div>`); }
  Y.raf = requestAnimationFrame(yardLoop);
}
function yardMon(P, e, i) {
  const t = SPECIES[P.sp]?.t || [], o = document.createElement('div');
  o.className = 'ty-m'; o.dataset.p = P.id; o.innerHTML = '<i class="ty-sh"></i><div class="ty-fl"><i class="ty-sp"></i></div><div class="ty-tag"></div>';
  // 물고기 포켓몬은 처음부터 수영장에서, 수영장에만 있다 (경완 2026-10-27)
  const fish = !!GA.isFish?.(P.sp), p0 = Y.pos[P.id], [x, y] = p0 && (!fish || inPond(p0[0], p0[1], -14)) ? p0 : yardSpot(fish); Y.L.append(o);
  const m = { id: P.id, P, e, el: o, fl: o.querySelector('.ty-fl'), sp: o.querySelector('.ty-sp'), shd: o.querySelector('.ty-sh'), tag: o.querySelector('.ty-tag'), x, y, face: Math.random() < .5 ? 1 : -1, st: 'rest', until: performance.now() / 1000 + Math.random() * 2, at: 0, home: stOf(P, i), swimmer: t.includes(11), fish, flyer: t.includes(3), D: null };
  Y.mons.push(m); place(m); try { yTag(m); } catch (x) {}
  GA.pmd?.(P.sp, P.sex).then(D => { if (!Y.mons.includes(m)) return; m.D = D;
    if (D.P) { const [w, h] = D.wh, s = D.s; m.s = s; Object.assign(m.sp.style, { backgroundImage: `url("${D.P.i}")`, backgroundSize: `${w * s}px ${h * s}px` }); if (P.shiny) m.sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`; m.fk = '';
      const fw = Math.max(10, (D.P.fw || 14) * s * 1.05); Object.assign(m.shd.style, { width: fw + 'px', left: ((D.P.fx || 0) * s - fw / 2) + 'px', height: Math.max(6, fw * .3) + 'px', top: -Math.max(6, fw * .3) / 2 + 'px' }); }
    else { m.sp.classList.add('one'); m.sp.style.backgroundImage = `url("${D.img}")`; }
  }).catch(() => {});
}
// 떠 있는 높이는 필드와 같게 (GA.lift: 원래 높이 + 작업실 떠 있기), 떠 있으면 필드처럼 둥둥
const place = m => { m.el.style.transform = `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px)`; m.el.style.zIndex = Math.round(m.y) + 2;
  const L = m.fish ? 0 : GA.lift?.(m.P.sp, m.st === 'sleep') || 0, bob = m.fish ? Math.sin(performance.now() / 420 + (m.id % 97)) * 1.5 : L > 2 ? Math.sin(performance.now() / 260 + (m.id % 97)) * 4 : 0;   // 물고기는 물에 떠서 살짝만 흔들 m.lift = (m.lift ?? L) + (L - (m.lift ?? L)) * .08;
  m.fl.style.transform = `translateY(${(-m.lift - bob).toFixed(1)}px) scaleX(${m.face})`; };
function yEmo(m, ch, cls = '') { const q = document.createElement('i'); q.className = 'ty-emo ' + cls; q.textContent = ch; q.style.top = ((m.top ?? -40) - 22) + 'px'; m.el.append(q); setTimeout(() => q.remove(), 1300); }
// 맞는 순간 반짝 + 먼지 (기구 쪽), 걸을 때 발밑 먼지
function yFx(x, y, cls) { const q = document.createElement('i'); q.className = 'ty-fx ' + cls; q.style.cssText = `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;z-index:${Math.round(y) + 3}`; Y.L.append(q); setTimeout(() => q.remove(), 700); }
// 포켓몬 밑 이름표: 레벨 + 다음 레벨까지 경험치 막대
function yTag(m) { const g = GB().growth(m.P.sp), x = GB().gm(m.P), a = GB().xpAt(g, x.lv), b = GB().xpAt(g, x.lv + 1), r = x.lv >= GB().LV_MAX ? 1 : Math.max(0, Math.min(1, ((x.xp ?? a) - a) / Math.max(1, b - a)));
  m.tag.innerHTML = `<span class="tt-r"><span class="rk ${GA.rankOf(m.P)}">${GA.rankOf(m.P)}</span><b>Lv.${x.lv}</b></span><i><s style="width:${(r * 100).toFixed(0)}%"></s></i>`; }
function yHit(m, k) {
  const q = Y.eq[k]; if (q) { q.el.classList.remove('wob'); void q.el.offsetWidth; q.el.classList.add('wob'); yFx(q.x + (m.x < q.x ? -10 : 10), q.y - (k === 'water' ? 10 : 46), k === 'water' ? 'spl' : 'spk'); }
  else yFx(m.x - m.face * 22, m.y - 24, 'spk');
  if (Math.random() < .35) yEmo(m, '+EXP', 'xp'); else if (Math.random() < .5) yEmo(m, '!', 'hit');
}
// 다음 할 일: 늘 훈련 (기구 훈련 · 대련). 오늘 8시간 다 쓴 포켓몬만 잠 (경완 2026-10-27 '계속 훈련 모션만')
function yNext(m, now) {
  if (leftOf(m.e) <= 0) { m.st = 'sleep'; m.until = now + 99; m.one = null; return; }
  if (m.fish) {   // 물고기: 물 위 장치 훈련 또는 수영장 안에서 헤엄
    const busy = Y.mons.some(o => o !== m && o.k === 'water' && (o.st === 'go' || o.st === 'train'));
    if (!busy && Math.random() < .6) { const q = Y.eq.water, side = Math.random() < .5 ? -1 : 1; m.st = 'go'; m.k = 'water'; m.side = side; m.tx = q.x + side * 40; m.ty = q.y - 2; m.then = 'train'; return; }
    const [sx, sy] = yardSpot(true); m.st = 'go'; m.k = null; m.tx = sx; m.ty = sy; m.then = 'rest'; return; }
  const free = Y.mons.filter(o => o !== m && !o.fish && o.st === 'train' && o.k !== 'water' && leftOf(o.e) > 0 && now > (o.until - 1));
  if (Math.random() < .3 && free.length) { const o = K.pick(free), [cx, cy] = yardSpot(); o.one = null;
    m.st = o.st = 'go'; m.then = o.then = 'spw'; m.k = o.k = null; m.mate = o; o.mate = m; m.tx = cx - 26; o.tx = cx + 26; m.ty = o.ty = cy; m.lead = true; o.lead = false; return; }
  const opts = [m.home, m.home, ...(m.swimmer ? ['water', 'dummy', 'sandbag'] : m.flyer ? ['fly', 'dummy', 'sandbag'] : ['dummy', 'sandbag'])];
  for (let n = 0; n < 6; n++) { const k = K.pick(opts), q = Y.eq[k], side = k === 'water' ? -1 : Math.random() < .5 ? -1 : 1, busy = Y.mons.some(o => o !== m && o.k === k && o.side === side && (o.st === 'go' || o.st === 'train'));
    if (busy) continue; if (m.k === k && m.side === side && m.st === 'train') { m.until = now + 5 + Math.random() * 4; return; }
    m.st = 'go'; m.k = k; m.side = side; m.tx = q.x + side * (k === 'water' ? 48 : k === 'fly' ? 48 : 40); m.ty = q.y + (k === 'water' ? -2 : 3); m.then = 'train'; return; }
  // 기구가 다 차 있으면 그 자리에서 혼자 섀도 훈련
  m.st = 'train'; m.k = null; m.until = now + 4 + Math.random() * 3; m.face = Math.random() < .5 ? 1 : -1;
}
function yardLoop(ts) {
  if (!Y || !Y.el.isConnected || sh.hidden || cur !== 'train') { Y && (Y.raf = 0); return; }
  const now = ts / 1000, dt = Math.min(.1, Y.last ? now - Y.last : 0); Y.last = now;
  if (now - (Y.ck ?? now) > 30) { tickTrain(Date.now()); K.save(); Y.ck = now; Y.mons.forEach(m => { try { yTag(m); } catch (x) {} }); } else Y.ck ??= now;   // 30초마다 남은 시간·레벨 새로
  for (const c of Y.co || []) if (now > c.nx) { c.nx = now + 3 + Math.random() * 3; const t = Y.mons.length ? K.pick(Y.mons) : null; c.el.classList.toggle('l', !!t && t.x < c.x);
    c.el.classList.remove('cheer'); void c.el.offsetWidth; c.el.classList.add('cheer'); const q = document.createElement('i'); q.className = 'ty-emo co'; q.textContent = K.pick(['힘내!', '좋아!', '한 번 더!', '그렇지!', '!']); q.style.left = c.x + 'px'; q.style.top = (c.y - 74) + 'px'; q.style.zIndex = 9999; Y.L.append(q); setTimeout(() => q.remove(), 1300); }
  for (const m of Y.mons) {
    if (m.st === 'go') {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), v = 42 * dt;
      if (Math.abs(dx) > 2) m.face = dx > 0 ? -1 : 1;
      if (d <= v) { m.x = m.tx; m.y = m.ty;
        if (m.then === 'train') { m.st = 'train'; m.until = now + 5 + Math.random() * 4; m.face = Y.eq[m.k].x > m.x ? -1 : 1; }
        else if (m.then === 'spw') { m.st = 'spw'; m.until = now + 6; const o = m.mate; if (o && o.st === 'spw' && o.mate === m) { m.face = o.x > m.x ? -1 : 1; o.face = -m.face; m.st = o.st = 'spar'; m.until = o.until = now + 4 + Math.random() * 3; m.turn = o.turn = 0; } }
        else { m.st = 'rest'; m.nap = false; m.until = now + 1.5 + Math.random() * 3; } }
      else { m.x += dx / d * v; m.y += dy / d * v; m.an = dy < -Math.abs(dx) ? 'WalkUp' : 'Walk'; if (now > (m.dz || 0) && !(GA.lift?.(m.P.sp) > 2) && !m.el.classList.contains('swim')) { m.dz = now + .28; yFx(m.x + m.face * 8, m.y, 'dst'); } }
    } else if (now >= m.until) {
      if (m.st === 'spar' || m.st === 'spw') { const o = m.mate; if (m.st === 'spar') { yEmo(m, '♪', 'mu'); if (o) yEmo(o, '♪', 'mu'); }
        m.mate = null; if (o && o.mate === m) { o.mate = null; yNext(o, now); } }
      yNext(m, now);
    }
    if (m.st === 'spar' && m.lead && !m.one && !m.mate?.one) { const a = m.turn % 2 ? m.mate : m; a.one = { n: 'Attack', t: 0, tgt: a === m ? m.mate : m }; m.turn++; }
    if (m.st === 'sleep' && now > (m.zz || 0)) { m.zz = now + 3 + Math.random() * 2; yEmo(m, 'Zz', 'zz'); }
    if (m.st === 'train' && !m.one) m.one = { n: 'Attack', t: 0, k: m.k, gap: .25 + Math.random() * .5 };
    const sw = inPond(m.x, m.y, -6); m.el.classList.toggle('swim', sw); swimMask(m, sw);
    place(m); yDraw(m, dt);
  }
  Y.raf = requestAnimationFrame(yardLoop);
}
// 물에 잠긴 부분은 반투명 (경완 2026-10-27): 발밑에서 물고기는 몸 절반쯤, 다른 포켓몬은 조금
function swimMask(m, on) {
  const st2 = m.sp.style; if (!on || !m.D?.P) { if (m.mk) { st2.maskImage = st2.webkitMaskImage = ''; m.mk = ''; } return; }
  const top = parseFloat(st2.top) || 0, feet = -top, dep = m.fish ? Math.max(10, feet * .5) : Math.min(12, feet * .3), y = Math.max(0, feet - dep).toFixed(0);
  const mk = `linear-gradient(to bottom,#000 ${y}px,rgba(0,0,0,.42) ${y}px)`; if (m.mk !== mk) { m.mk = mk; st2.maskImage = st2.webkitMaskImage = mk; } }
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
  if (nm === 'Idle' || m.top == null) m.top = (-a[5] - (P.fy || 0)) * s + (P.vt || 0) * s;
  st2.width = a[1] * s + 'px'; st2.height = a[2] * s + 'px'; st2.left = -a[4] * s + 'px'; st2.top = (-a[5] - (P.fy || 0)) * s + 'px';
  st2.backgroundPosition = `${-f * (a[1] + (P.G || 0)) * s}px ${-a[0] * s}px`;
}
function pickTrain() {
  const g = st(), ids = new Set(g.tr.map(e => e.id)), ty = g.ty;
  const L = S.box.filter(P => !ids.has(P.id)).map(P => ({ P, m: GB().gm(P), ok: (SPECIES[P.sp]?.t || []).includes(ty) })).filter(o => o.m.lv < GB().LV_MAX).sort((a, b) => b.ok - a.ok || b.m.lv - a.m.lv || GA.ivSum(b.P) - GA.ivSum(a.P)).slice(0, 120);
  if (!L.length) return say('보낼 수 있는 포켓몬이 없어요.');
  pop(`<h4>훈련장에 보낼 포켓몬</h4><p class="gy-msg">${TYPE_KO[ty]} 타입이 위에 있어요. 필드에 나가 있는 포켓몬은 필드에서 빠져요.</p><div class="lu-pick">${L.map(({ P, m, ok }) => `<button data-a="${P.id}" class="${ok ? '' : 'dim'}">${GB().thumb(P)}<b>${esc(nmOf(P))}</b><span>Lv.${m.lv}</span>${onField(P.id) ? '<em>필드</em>' : ''}</button>`).join('')}</div><div class="gy-btns one"><button data-a="x">닫기</button></div>`,
    (a, close) => { close(); if (a === 'x') return; const id = +a || a, P = boxOf(id); if (!P || g.tr.length >= trMax()) return;
      const m = S.mons.find(o => o.pid === id); if (m) { try { GA.removeMon(m, true); } catch (e) {} }
      g.tr.push({ id, t: Date.now(), d: K.dayStart(Date.now()), h: 0 }); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보냈다.`); K.save(); redraw(); });
}
function trPop(id) {
  const P = boxOf(id); if (!P) return; const m = GB().gm(P), ph = perHour(P), g = GB().growth(P.sp), need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  const a0 = GB().xpAt(g, m.lv), r = m.lv >= GB().LV_MAX ? 1 : clampN(((m.xp ?? a0) - a0) / Math.max(1, need), 0, 1);
  pop(`<div class="mp-head">${GB().thumb(P)}<div><h4>${esc(nmOf(P))}</h4><i class="mp-xp"><i style="width:${(r * 100).toFixed(1)}%"></i></i><small class="tp-xp">경험치 ${m.lv >= GB().LV_MAX ? '최고 레벨' : `${Math.floor(r * 100)}% · 다음 레벨까지 ${Math.max(0, Math.ceil(need - ((m.xp ?? a0) - a0))).toLocaleString()}`}</small><p>Lv.${m.lv} · 1시간에 약 ${m.lv >= GB().LV_MAX ? 0 : (ph / need).toFixed(2)}레벨<br>${(e => !e ? '' : leftOf(e) > 0 ? `오늘 ${Math.ceil(leftOf(e))}시간 더 훈련해요` : '오늘 훈련 끝 · 내일 다시')(st().tr.find(e => e.id === P.id))}</p></div></div>
    <div class="mp-moves">${m.mv.map(x => GB().mvOf(x)).filter(Boolean).map(x => GB().mvRow(x, '')).join('')}</div>
    <div class="gy-btns three"><button data-a="mv">기술 바꾸기</button><button data-a="tm">기술머신</button><button data-a="out">데려오기</button><button class="main" data-a="x">닫기</button></div>`,
    (a, close) => { if (!a) return; close(); if (a === 'mv') return GB().movesPop(P, () => { redraw(); trPop(id); }); if (a === 'tm') return GB().tmPop(P, () => { redraw(); trPop(id); });
      if (a === 'out') { tickTrain(Date.now()); st().tr = st().tr.filter(e => e.id !== P.id); K.save(); redraw(); } });
}

// ======================= 트레이너 고용 (6단계) =======================
const LINES = { train: '훈련이라면 자신 있어요! 체육관 포켓몬들도 같이 단련할게요.', star: '제 배틀은 구경꾼이 많이 와요. 체육관 이름을 널리 알릴게요!', money: '도전자에게서 상금을 두둑이 챙겨 올게요.', guts: '절대 물러서지 않아요. 끝까지 버티는 게 제 장점이에요!', grow: '아직 부족하지만, 배틀할수록 강해지는 타입이에요!', thrift: '월급은 조금만 주셔도 괜찮아요. 일하게만 해 주세요!', lazy: '음… 가끔 낮잠을 자지만, 월급은 아주 조금이면 돼요.' };
// 포켓몬 그림 + 레벨: 상자 없이 그림 밑에 작은 글씨 (경완 2026-10-27 '박스 없이 좀 더 깔끔하게')
const teamIc = T => `<span class="sf-team">${T.map(([sp, lv]) => `<span><img alt="" data-sp="${sp}"><small>Lv.${lv}</small></span>`).join('')}</span>`;
// 특성은 상자로 (경완 2026-10-27 '트레이너 특성은 확실하게 박스로')
const trtBox = (k, full) => { const T = K.TRAITS[k]; return T ? `<span class="trt trt-${k}"><b>특성</b><i>${T.n}</i>${full ? `<small>${T.d}</small>` : ''}</span>` : ''; };
// 트레이너: 지원서 탭 / 고용 관리 탭 (경완 2026-10-27)
let sfT = 'cand';
function drawStaff() {
  const g = st(), now = Date.now(), max = K.staffMax();
  if (g.cand && !g.candSeen) { g.candSeen = 1; K.setAt(); K.save(); K.menuDot(); }
  const c = g.cand, yN = g.sf.filter(s => s.yard).length;
  const tabs = `<div class="sp-tabs" role="tablist"><button role="tab" data-sft="cand" aria-selected="${sfT === 'cand'}">지원서${c ? ' <i class="tdot"></i>' : ''}</button><button role="tab" data-sft="sf" aria-selected="${sfT === 'sf'}">고용 관리 <small>${g.sf.length}/${max}</small></button></div>`;
  const cand = c ? `<div class="sf-cand"><img alt="" src="${K.trSrc(c.tr)}"><div><b>${esc(c.cls)} ${esc(c.nm)}</b>${trtBox(c.trait, true)}${teamIc(c.team)}<small>${Math.max(1, Math.round((c.exp - now) / K.H))}시간 뒤에 떠나요 · 월급 7일에 ${c.wage}G</small></div><button class="gy-key main" data-iv="1">면접 보기</button></div>`
      : `<p class="sf-none">지금은 지원서가 없어요. 새 지원자가 오면 트레이너 단추에 빨간 점이 떠요.</p>`;
  const gL = K.sfList ? K.sfList() : [], gNo = x => gL.findIndex(z => z[0] === x);
  const list = `<p class="gy-lead">체육관에 세운 트레이너가 순서대로 도전자를 먼저 상대해요. 훈련장 코치를 함께 맡길 수도 있어요 (코치는 최대 ${YARD_SF}명). 카드를 누르면 자세히 볼 수 있어요.</p>
    <div class="sf-list">${g.sf.map((s, i) => `<button class="sf-card${s.rest ? ' rest' : ''}" data-sf="${i}"><img class="sf-pic" alt="" src="${K.trSrc(s.tr)}"><div class="sf-mid"><b>${esc(s.cls)} ${esc(s.nm)}</b>${trtBox(s.trait)}
      <span class="sf-st">${s.rest ? '<em class="r">쉬는 중</em>' : ''}${K.inGym(s) ? `<em class="g">체육관 ${gNo(s) >= 0 ? gNo(s) + 1 + '번' : ''}</em>` : ''}${s.yard ? '<em class="y">훈련장 코치</em>' : ''}${!K.inGym(s) && !s.yard && !s.rest ? '<em>대기 중</em>' : ''}<i>${s.w || 0}승 ${s.l || 0}패</i></span>${teamIc(s.team)}</div><i class="sf-go">›</i></button>`).join('') || '<p class="sf-none">아직 고용한 트레이너가 없어요. 지원서 탭에서 면접을 볼 수 있어요.</p>'}</div>`;
  sh.innerHTML = `<h3>트레이너</h3>${tabs}${sfT === 'cand' ? cand : list}`;
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.sft) { sfT = b.dataset.sft; redraw(); return; }
    if (b.dataset.iv) return interview();
    if (b.dataset.sf) return sfDetail(g.sf[+b.dataset.sf]);
  };
}
// 고용 트레이너 자세히 (경완 2026-10-27 '고용한 트레이너 카드 누르면 상세 정보'): 전신·특성·포켓몬·전적·월급과 배치 단추
function sfDetail(s) {
  const g = st(), now = Date.now(); if (!s) return; const i = g.sf.indexOf(s), yN = g.sf.filter(x => x.yard).length, lv = Math.round(K.teamLv(s.team));
  const p = pop(`<div class="sd-head"><div class="sd-pic"><img alt="" src="${K.trSrc(s.tr)}" onload="this.style.width=this.naturalWidth*1.5+'px';this.style.height=this.naturalHeight*1.5+'px'"></div><div><h4>${esc(s.cls)} ${esc(s.nm)}</h4>${trtBox(s.trait, true)}</div></div>
    <div class="sd-team">${s.team.map(([sp, l]) => `<span><img alt="" data-sp="${sp}"><b>${esc(SPECIES[sp]?.n || '???')}</b><small>Lv.${l}</small></span>`).join('')}</div>
    <dl class="gy-info sd-dl"><dt>전적</dt><dd><span>${s.w || 0}승 ${s.l || 0}패 · 평균 Lv.${lv}</span></dd><i></i>
      <dt>자리</dt><dd><span>${[K.inGym(s) ? '체육관' : '', s.yard ? '훈련장 코치' : ''].filter(Boolean).join(' · ') || '대기 중'}${s.rest ? ' <em class="sd-r">쉬는 중</em>' : ''}</span></dd><i></i>
      <dt>월급</dt><dd><span>7일에 ${s.wage}G · ${s.rest ? '밀린 월급을 주면 다시 일해요' : `다음 ${Math.max(0, Math.ceil((s.pay - now) / K.DAY))}일 뒤`}</span></dd><i></i>
      ${s.hired ? `<dt>고용</dt><dd><span>${Math.max(0, Math.floor((now - s.hired) / K.DAY))}일째</span></dd><i></i>` : ''}</dl>
    <div class="gy-btns sd-btns"><button data-a="gym">${K.inGym(s) ? '체육관 자리 바꾸기' : '체육관에 배치'}</button><button data-a="yd" ${!s.yard && yN >= YARD_SF ? 'disabled' : ''}>${s.yard ? '훈련장 코치 그만' : '훈련장 코치 맡기기'}</button>
      ${i > 0 ? '<button data-a="up">순서 앞으로</button>' : ''}<button data-a="fire" class="danger">해고</button><button class="main" data-a="x" style="grid-column:1/-1">닫기</button></div>`,
    (a, close) => {
      if (a === 'x') return close();
      if (a === 'gym') { close(); return K.sfPlace(s, () => { K.openTab?.('staff'); }); }
      if (a === 'yd') { tickTrain(Date.now()); s.yard = s.yard ? 0 : 1; K.glog('sf', `${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} ${s.yard ? '훈련장 코치로 배치했다.' : '훈련장 코치에서 뺐다.'}`); K.save(); close(); redraw(); K.renderHome(); return sfDetail(s); }
      if (a === 'up') { const k = g.sf.indexOf(s); if (k > 0) { [g.sf[k - 1], g.sf[k]] = [g.sf[k], g.sf[k - 1]]; K.save(); } close(); redraw(); K.renderHome(); return sfDetail(s); }
      if (a === 'fire') { close(); pop(`<h4>해고할까요?</h4><p class="gy-msg">${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} 해고해요. 이미 준 월급은 돌려받지 못해요.</p><div class="gy-btns"><button data-a="x">아니요</button><button class="main" data-a="y">해고</button></div>`,
        (b2, c2) => { c2(); if (b2 !== 'y') return sfDetail(s); g.sf = g.sf.filter(x => x !== s); K.glog('sf', `${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} 해고했다.`); K.save(); redraw(); K.renderHome(); }); }
    });
  return p;
}
function interview() {
  const g = st(), c = g.cand; if (!c) return;
  const full = g.sf.length >= K.staffMax(), lv = Math.round(K.teamLv(c.team));
  pop(`<h4>면접</h4><div class="iv-head"><img alt="" src="${K.trSrc(c.tr)}"><div><b>${esc(c.cls)} ${esc(c.nm)}</b>${trtBox(c.trait, true)}</div></div>
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
// 기술머신: 내 체육관 타입 포켓몬이 배울 수 있는 기술. 사면 가방(g.tms {기술: 개수})에 들어가고, 가르치기는 포켓몬 정보 창의 '기술머신'에서 (경완 2026-10-27)
function shopTm(body) {
  const D = GB().D, g = st(), mons = S.box.filter(P => (SPECIES[P.sp]?.t || []).includes(g.ty)); g.tms = g.tms || {};
  const can = new Map(); mons.forEach(P => (D.sp[P.sp]?.tm || []).forEach(i => { if (!can.has(i)) can.set(i, []); can.get(i).push(P); }));
  const types = [...new Set([...can.keys()].map(i => D.mv[i][2]))].sort((a, b) => a - b);
  if (tmTy !== -1 && !types.includes(tmTy)) tmTy = -1;   // -1 = 전체 (경완 2026-10-27 '에스퍼 포켓몬이라고 에스퍼 기술만 배우는 건 아닌데')
  const L = [...can.keys()].map(i => D.mv[i]).filter(x => tmTy === -1 || x[2] === tmTy).sort((a, b) => (tmTy === -1 ? a[2] - b[2] : 0) || (b[3] !== 2) - (a[3] !== 2) || (b[4] || 0) - (a[4] || 0));
  const own = Object.values(g.tms).reduce((a, n) => a + (n || 0), 0);
  body.innerHTML = `<p class="gy-lead">체육관 포켓몬이 배울 수 있는 기술머신이에요. 산 기술머신은 가방에 들어가요. 가르치기는 배틀 메뉴나 훈련장에서 포켓몬을 누르고 <b>기술머신</b> 단추로 해요.${own ? ` <span class="tm-bag">가진 기술머신 ${own}개</span>` : ''}</p>
    ${types.length ? `<div class="sp-chips tm-f"><button data-ty="-1" aria-pressed="${tmTy === -1}">전체</button>${types.map(t => `<button data-ty="${t}" aria-pressed="${t === tmTy}">${GA.tyIcon(t)}${TYPE_KO[t]}</button>`).join('')}</div>` : `<p class="sf-none">${TYPE_KO[g.ty]} 타입 포켓몬이 아직 없어요.</p>`}
    <div class="sp-list">${L.map(x => `<button class="sp-tm" data-tm="${x[0]}"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png"><span class="tm-nm"><b>${esc(x[1])}</b>${g.tms[x[0]] ? `<i class="tm-own">×${g.tms[x[0]]}</i>` : ''}</span><span class="tm-meta">${GB().tyTag(x[2], x[3])}<small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}</small></span><em>${gold(tmPrice(x))}</em></button>`).join('')}</div>`;
  body.onclick = (e, b) => { sfx('tap'); if (b.dataset.ty) { tmTy = +b.dataset.ty; redraw(); return; } if (b.dataset.tm) buyTm(b.dataset.tm, can); };
}
function buyTm(id, can) {
  const D = GB().D, g = st(), x = GB().mvOf(id), i = D.mv.indexOf(x), price = tmPrice(x), L = can.get(i) || [], n = g.tms?.[id] || 0;
  pop(`<h4><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">기술머신 · ${esc(x[1])}</h4><div class="mp-moves one">${GB().mvRow(x, '')}</div><p class="gy-msg">${esc(x[8] || '')}</p>
    <p class="gy-msg tm-who">배울 수 있는 포켓몬 ${L.length}마리${n ? ` · 가진 것 ${n}개` : ''}</p><div class="tm-mons">${L.slice(0, 18).map(P => `<span>${GB().thumb(P)}<small>${GB().gm(P).mv.includes(id) ? '앎' : 'Lv.' + GB().gm(P).lv}</small></span>`).join('')}</div>
    <div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="buy">${gold(price)} 사기</button></div>`, (a, close) => {
    if (a === 'x') return close(); if (a !== 'buy') return;
    if (!spend(price)) { close(); return say(`골드가 모자라요. ${price.toLocaleString()}G가 필요해요.`); }
    close(); g.tms = g.tms || {}; g.tms[id] = (g.tms[id] || 0) + 1; K.glog('tr', `기술머신 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 샀다.`); K.save(); redraw();
    say(`기술머신 ${esc(x[1])}${K.jong(x[1]) ? '을' : '를'} 가방에 넣었어요.<br><small>배틀 메뉴나 훈련장에서 포켓몬을 누르고 '기술머신'으로 가르쳐 주세요.</small>`);
  });
}
// 꾸미기: 사면 빈 칸에 바로 놓인다. 놓인 것을 누르면 치우기, 가진 것을 누르면 놓기
function shopDeco(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i, max = K.decoMax(); g.own = g.own || {}; g.dp = (g.dp || []).slice(0, 8);
  const placed = Array.from({ length: max }, (_, i) => g.dp[i] || null);
  body.innerHTML = `<p class="gy-lead">본가 비밀기지 인형·쿠션으로 체육관을 꾸며요. 사면 빈 자리에 놓이고, 원하는 칸으로 옮길 수 있어요.</p>
    <div class="dc-place"><div><b>놓인 꾸미기 ${placed.filter(Boolean).length}/${max}</b><small>맵에서 칸을 골라 직접 놓아요</small></div><button class="gy-key main" data-place="1">직접 놓기</button></div>
    <h4 class="sf-h">상품</h4><div class="dc-grid">${Object.entries(K.DECO).map(([k, o]) => { const lock = G < o.lv, own = g.own[k];
      return `<button data-dc="${k}" class="${own ? 'own' : ''}${lock ? ' lock' : ''}"><span class="dc-pic"><img alt="" src="${IMG}deco/${k}.png" class="${o.w > 16 ? 'big' : ''}"></span><b>${o.n}</b><em>${own ? (placed.includes(k) ? '놓여 있음' : '가지고 있음') : lock ? `${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}부터` : gold(o.g)}</em></button>`; }).join('')}</div>`;
  body.onclick = (e, b) => {
    sfx('tap');
    if (b.dataset.place) return K.decoEdit();
    const k = b.dataset.dc; if (!k) return; const o = K.DECO[k];
    if (g.own[k]) { if (placed.includes(k)) { g.dp[placed.indexOf(k)] = null; } else { const i = placed.indexOf(null); if (i < 0) return say('꾸미기 자리가 꽉 찼어요. 놓인 것을 눌러 치우거나, 체육관 넓히기에서 자리를 늘려 주세요.'); g.dp[i] = k; } K.save(); redraw(); return; }
    if (G < o.lv) return say(`${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}이 되면 살 수 있어요.`);
    pop(`<h4>${o.n}</h4><div class="dc-big"><img alt="" src="${IMG}deco/${k}.png"></div><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`, (a, close) => {
      close(); if (a !== 'y') return; if (!spend(o.g)) return say('골드가 모자라요.');
      g.own[k] = 1; const i = placed.indexOf(null); if (i >= 0) g.dp[i] = k; K.save(); redraw(); });
  };
}
// 관장 의상: 앞모습은 옷 모양까지 새로 그린 그림, 맵·배틀 뒷모습은 옷 색만. 누르면 그 옷을 입은 전신 카드 (경완 2026-10-27)
function shopFit(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.fits = g.fits || {};
  const need = o => K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n;
  const row = (k, o) => { const own = !k || g.fits[k], on = (g.fit || '') === k, lock = o.lv && G < o.lv;
    return `<button data-fit="${k}" class="${on ? 'on' : ''}${lock ? ' lock' : ''}"><i class="ft-pic"><img alt="" data-fk="${k}"></i><b>${o.n}</b><em>${on ? '입는 중' : own ? '입기' : lock ? `${need(o)}부터` : gold(o.g)}</em></button>`; };
  body.innerHTML = `<p class="gy-lead">체육관에서 입는 관장 옷이에요. 옷마다 모양이 달라요. 맵과 배틀 뒷모습은 옷 색이 바뀌어요. 눌러서 입은 모습을 미리 볼 수 있어요.</p><div class="ft-grid">${row('', { n: '기본 옷' })}${Object.entries(K.OUTFITS).map(([k, o]) => row(k, o)).join('')}</div>`;
  body.querySelectorAll('img[data-fk]').forEach(im => K.fitSrc('tr', im.dataset.fk).then(u => { im.src = u; }));
  body.onclick = async (e, b) => {
    sfx('tap'); const k = b.dataset.fit; if (k == null) return; const o = k ? K.OUTFITS[k] : { n: '기본 옷' }, own = !k || g.fits[k], on = (g.fit || '') === k, lock = o.lv && G < o.lv;
    const btn = on ? '<div class="gy-btns one"><button data-a="x">입는 중</button></div>'
      : own ? '<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="w">입기</button></div>'
      : lock ? `<div class="gy-btns one"><button data-a="x">${need(o)}이 되면 살 수 있어요</button></div>`
      : `<div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`;
    K.bodyCard(await K.fitSrc('tr', k), o.n, own ? '' : lock ? '아직 살 수 없어요' : '사면 바로 입어요', btn, (a, close) => {
      close(); if (a === 'y' && !spend(o.g)) return say('골드가 모자라요.'); if (a === 'y') g.fits[k] = 1; g.fit = k; K.save(); redraw(); K.renderHome(); });
  };
}
// 체육관 넓히기 (경완 2026-10-27 '애매한 듯'): 단계 하나씩 올리고, 단계마다 무엇이 늘어나는지 보여 준다. 다음 단계는 체육관 등급이 있어야 열린다
const UPS = [[0, 0, 0], [1, 2, 1500], [2, 4, 3500], [3, 5, 6000], [4, 6, 10000]];   // [필요 등급, 이 단계까지 늘어난 (훈련장 칸, 꾸미기 자리), 값]
function upLv(g) { let n = 0; UPS.forEach((u, i) => { if ((g.trN || 0) >= u[0] && (g.decoN || 0) >= u[1]) n = i; }); return n; }
function shopUp(body) {
  const g = st(), G = K.gradeOf(g.rep || 0), lv = upLv(g), nx = UPS[lv + 1];
  const card = (i, u) => `<div class="up-lv${i <= lv ? ' done' : i === lv + 1 ? ' next' : ''}"><i>${i + 1}단계</i><div><b>${i ? `훈련장 ${2 + u[0]}칸 · 꾸미기 ${2 + u[1]}자리` : '처음 체육관 (훈련장 2칸 · 꾸미기 2자리)'}</b><small>${i <= lv ? '완료' : `${K.gradeOf([0, 100, 250, 450, 700, 1000][u[0]]).n}부터 · ${u[2].toLocaleString()}G`}</small></div></div>`;
  body.innerHTML = `<p class="gy-lead">체육관을 넓히면 훈련장 칸과 꾸미기 자리가 함께 늘어나요. 다음 단계는 체육관 등급이 올라야 열려요. 지금 등급: <b>${G.n}</b></p>
    <div class="up-list">${UPS.map((u, i) => card(i, u)).join('')}</div>
    ${nx ? `<button class="gy-key${G.i >= nx[0] ? ' main' : ''} up-go" data-up="1" ${G.i >= nx[0] ? '' : 'disabled'}>${G.i >= nx[0] ? `${gold(nx[2])} 내고 ${lv + 2}단계로 넓히기` : `${K.gradeOf([0, 100, 250, 450, 700, 1000][nx[0]]).n}이 되면 넓힐 수 있어요`}</button>` : '<p class="sf-none">체육관을 끝까지 넓혔어요!</p>'}
    <div class="up-row"><div><b>트레이너 자리</b><small>${K.staffMax()}/5 · 체육관 등급이 오르면 저절로 늘어요</small></div></div>
    <div class="up-row"><div><b>도전자 방문</b><small>하루 ${2 + (G.i >= 2) + (G.i >= 4)}~${3 + (G.i >= 2) + (G.i >= 4)}명 · 체육관 등급이 오르면 늘어요</small></div></div>`;
  body.onclick = (e, b) => {
    sfx('tap'); if (!b.dataset.up || !nx || G.i < nx[0]) return; if (!spend(nx[2])) return say('골드가 모자라요.');
    g.trN = Math.max(g.trN || 0, nx[0]); g.decoN = Math.max(g.decoN || 0, nx[1]); K.glog('tr', `체육관을 ${lv + 2}단계로 넓혔다! <small>훈련장 ${2 + g.trN}칸 · 꾸미기 ${K.decoMax()}자리</small>`); K.save(); redraw(); K.renderHome();
  };
}

window.GymManage = { tab, tickTrain, redraw };
})();
