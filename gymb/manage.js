/* 체육관 모드 4~6단계 (경완 기획 2026-10-27): 훈련장 · 트레이너 고용 · 상점(기술머신·꾸미기·관장 의상).
   gym.js 의 메뉴가 이 파일을 불러 GymManage.tab(t, 시트) 를 부른다. 도전자 방문 계산 중에 GymManage.tickTrain(지금) 으로 훈련 경험치를 쌓는다.
   저장(S.gym): tr 훈련 중 [{id, t 마지막 계산, d 오늘 시작 시각, h 오늘 쓴 시간, fx 남은 경험치 조각, acc 특별 기술 확률용 시간}], trN 늘린 훈련장 칸,
     sf 고용 트레이너, cand 면접 지원자, own {꾸미기: 1}, dp 놓은 꾸미기(칸 순서), decoN 늘린 꾸미기 칸, fit 입은 관장 의상, fits {의상: 1} */
(() => {
'use strict';
const GA = window.GA, { sfx, esc } = GA, S = GA.S, SPECIES = GA.SPECIES, TYPE_KO = GA.TYPE_KO;
const K = window.Gym.k, GB = () => window.GymBattle, IMG = K.IMG;
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const st = () => S.gym;
const boxOf = id => S.box.find(p => p.id === id);
const nmOf = P => SPECIES[P.sp]?.n || '???';
const onField = id => S.mons.some(m => m.pid === id);
const pop = (h, f) => { const p = K.pop(h, f); GB()?.fillTh(p); return p; };
const say = msg => K.say(msg);   // 체육관 홈과 같은 가운데 알림 (경완 2026-10-29 '팝업창 중앙 정렬')
const spend = n => { if (S.gold < n) return false; S.gold -= n; try { GA.renderGold(); } catch (e) {} K.renderGoldG(); K.save(); return true; };
const buy = n => { if (!spend(n)) return false; try { window.GymBGM?.se('DP_REGI'); } catch (e) {} return true; };   // 상점에서 살 때 본가 계산대 소리 (SEQ_SE_DP_REGI, 경완 2026-10-28)
const gold = n => `<i class="coin"></i>${n.toLocaleString()}G`;
// 포켓몬 정면 그림: 블랙·화이트 움직이는 gif (못 받으면 저장소 png 첫 칸)
const monImg = (sp, o = {}) => { const g = GB().gifUrl(sp, false, !!o.s, !!o.f), png = GB().pkSrc(sp, { s: o.s, f: o.f });
  return g ? `<img class="mi" alt="" src="${g}" onerror="this.onerror=null;this.src='${png}';this.classList.add('pn')">` : `<img class="mi pn" alt="" src="${png}">`; };
const owIc = ow => `<i class="ow-ic${K.owW(ow) > 16 ? ' w32' : ''}" style="background-image:url(${K.owSrc(ow)})"></i>`;
let sh = null, cur = null, shopT = 'tm', tmTy = 0, tmCat = -1, tmPow = 1;   // 기술머신: 타입·형태(물리 0 특수 1 변화 2) 필터, 위력순 (1 높은 순 · -1 낮은 순, 경완 2026-10-28)
function tab(t, el) { sh = el; cur = t; draw(); }
function draw() { if (!sh || !st()) return; sh.onclick = null; sh.classList.remove('ty-on'); ({ train: drawTrain, staff: drawStaff, shop: drawShop })[cur]?.(); GB()?.fillTh(sh); }
const redraw = () => { if (sh && !sh.hidden) draw(); };

// ======================= 훈련장 (4단계) =======================
const trMax = () => 6;   // 6마리 (경완 2026-10-29)
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
      if (n > 0) { e.x = (e.x || 0) + n; GB().gainXp(P, n).learned.forEach(([id]) => { got.push(GB().mvKo(id)); (e.mv = e.mv || []).push(id); }); }
      e.acc = (e.acc || 0) + step; while (e.acc >= 1) { e.acc -= 1; if (Math.random() < .05) { const x = special(P); if (x) (e.mv = e.mv || []).push(x[0]); if (x) K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '이' : '가'} 훈련장에서 특별한 기술 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 익혔다! <small>기술 바꾸기에서 쓸 수 있어요</small>`, now); } }
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
let Y = null;   // 마당: { el, W, H, L, pr: {소품}, mons, raf, last, pos: {id: [x, y]}, pond, court }
const inPond = (x, y, m = 0) => { const p = Y.pond; return x > p.x0 - m && x < p.x1 + m && y > p.y0 - m && y < p.y1 + m; };   // 수영장(네모)
const yTop = () => 138;   // 체육관 벽 아래부터 걸어 다님
function yardSpot(swim) {
  for (let i = 0; i < 60; i++) { const x = 24 + Math.random() * (Y.W - 48), y = yTop() + Math.random() * (Y.H - yTop() - 20);
    if (swim ? inPond(x, y - 10, -22) : !inPond(x, y, 16) && !Object.values(Y.pr).some(q => Math.abs(q.x - x) < q.w / 2 + 10 && y < q.y + 8 && y > q.y - 24)) return [x, y]; }
  return [Y.W * .3, Y.H * .6];
}
// 훈련장 소품 = 스칼렛 작업물 그림 (gymb/yard.json, config/staff/scarlet.json 에서 골라 옮김 + 후프링) (경완 2026-10-29 '스칼렛 작업물 수준으로, 가져와도 돼')
let YA = null, YAP = null;
const loadYA = () => YAP || (YAP = fetch(`gymb/yard.json?v=${VER}`).then(r => r.json()).then(j => (YA = j)).catch(() => (YAP = null, {})));
const pxCv = (px, pal) => { const h = px.length, w = px[0].length, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  px.forEach((r, y) => [...r].forEach((ch, x) => { const col = pal[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } })); return c.toDataURL(); };
const YS = 2;   // 소품 1칸 = 화면 2px (필드와 같은 크기)
function yProp(k, id, x, y, o = {}) {
  const A = YA?.[id]; if (!A) return null; const w = A.px[0].length * YS, h = A.px.length * YS, q = document.createElement('i'); q.className = 'ty-pr pr-' + id;
  q.style.cssText = `left:${(x - w / 2).toFixed(0)}px;top:${(y - h).toFixed(0)}px;width:${w}px;height:${h}px;z-index:${Math.round(y) + (o.z || 0)};background-image:url(${A.mv ? pxCv(A.mv.st, A.pal) : pxCv(A.px, A.pal)})`;
  if (o.flip) q.style.transform = 'scaleX(-1)';
  let mp = null; if (A.mv) { mp = document.createElement('i'); mp.className = 'ty-mp'; mp.style.backgroundImage = `url(${pxCv(A.mv.mp, A.pal)})`; mp.style.transformOrigin = `${(A.mv.o[0] / A.px[0].length * 100).toFixed(1)}% ${(A.mv.o[1] / A.px.length * 100).toFixed(1)}%`; q.append(mp); }
  Y.L.append(q); return (Y.pr[k] = { k, id, x, y, w, h, el: q, mp, ring: A.ring && [x + (A.ring[0] - .5) * w, y - h + A.ring[1] * h] });
}
// 소품이 맞거나 눌리는 흔들림
const yWob = (q, cls = 'wob') => { if (!q) return; const t = q.mp || q.el; t.classList.remove(cls); void t.offsetWidth; t.classList.add(cls); };
// 필드 도트 그림 도구로 기구 그리기 (1칸 = 화면 2px, 필드와 같은 크기)
const RD = { ol: '#3a1010', d2: '#5e1c18', d1: '#7e2a22', m: '#a03a2c', l: '#c0503a', h: '#dc7454', hh: '#f0a07c' };
const WH = { ol: '#3c3c48', d2: '#9090a0', d1: '#b0b0bc', m: '#c8c8d4', l: '#dcdce6', h: '#ececf4', hh: '#ffffff' };
let BUOY = null;
// 물 위에 뜬 튜브 (경완 2026-10-29 '선 위 말고 물 위에, 입체'): 윗면 + 두께(옆면) + 구멍 안쪽 벽, 아래쪽은 물에 잠겨 파랗게, 둘레 물결
function buoyArt() {
  if (BUOY) return BUOY; const w = 32, h = 22, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const cx = 15.5, cy = 8.5, RX = 14, RY = 7, rx = 6.4, ry = 3.3, T = 3, wl = cy + 5.5;   // 바깥·안 타원, 두께, 물 높이
  const inE = (x, y, a, b) => ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1, seg = (x, y) => (Math.atan2((y - cy) / RY, (x - cx) / RX) + Math.PI + Math.PI / 4) / (Math.PI / 2) % 2 < 1 ? RD : WH;
  const sea = (col, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(col.substr(i, 2), 16) * (1 - t) + [0x3a, 0x86, 0xc8][(i - 1) / 2] * t).toString(16).padStart(2, '0')).join('');
  const M = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x + .5, Y2 = y + .5; let col = null;
    if (inE(X, Y2, RX, RY) && !inE(X, Y2, rx, ry)) { const P = seg(X, Y2), lt = -(Y2 - cy) / RY * .7 - (X - cx) / RX * .35 + (((X - cx) / RX) ** 2 + ((Y2 - cy) / RY) ** 2 > .62 ? -.2 : .15); col = lt > .55 ? P.hh : lt > .2 ? P.h : lt > -.2 ? P.l : P.m; }
    else if (inE(X, Y2, rx, ry)) { if (!inE(X, Y2 - T, rx, ry)) col = seg(X, Y2 + 3).d1; }   // 구멍: 안쪽 벽(먼 쪽) / 물
    else { for (let k = 1; k <= T; k++) if (inE(X, Y2 - k, RX, RY)) { const P = seg(X, Y2 - k); col = k > T - 1 ? P.d2 : P.d1; break; } }   // 옆면
    if (col && Y2 > wl) col = sea(col, Math.min(.75, .35 + (Y2 - wl) * .12));   // 물에 잠긴 아래
    if (col) M.push([x, y, col]); }
  const has = new Set(M.map(([x, y]) => x + ',' + y));
  // 물결 (둘레, 물 높이 아래)
  for (let a = 0; a < 6.283; a += .05) { const x = Math.round(cx + Math.cos(a) * (RX + 2)), y = Math.round(wl + 1 + Math.sin(a) * (RY * .55)); if (Math.sin(a) > -.2 && !has.has(x + ',' + y)) { g.fillStyle = Math.sin(a) > .5 ? '#a8dcfa' : '#e4f6ff'; g.fillRect(x, y, 1, 1); } }
  // 외곽선 (물 위만 진하게)
  for (const [x, y] of M) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has.has((x + dx) + ',' + (y + dy))) { g.fillStyle = y + dy > wl + 1 ? 'rgba(20,50,90,.55)' : '#3a1418'; g.fillRect(x + dx, y + dy, 1, 1); }
  for (const [x, y, col] of M) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  g.fillStyle = '#ffffff'; g.fillRect(9, 4, 3, 1); g.fillRect(8, 5, 1, 1);   // 반짝
  return (BUOY = c.toDataURL());
}
// 후프링 (경완 2026-10-29 '몸통이 구멍을 통과하면서'): 비스듬히 본 세로 고리. 뒤 반쪽은 포켓몬 뒤, 앞 반쪽은 포켓몬 앞에 그려 통과하는 것처럼
let RING = null;
function ringArt() {
  if (RING) return RING; const w = 18, h = 44, cx = 9, cy = 12, RX = 6, RY = 11.5, T = 2.6;
  const mk = front => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    if (front === 2) { for (let y = 23; y < 41; y++) { px(8, y, '#20202c'); px(9, y, '#d0d4dc'); px(10, y, '#8a909c'); px(11, y, '#20202c'); } for (let x = 4; x < 16; x++) { px(x, 40, '#20202c'); px(x, 41, x < 6 || x > 13 ? '#20202c' : '#9aa0ac'); px(x, 42, x < 6 || x > 13 ? '#20202c' : '#6a707c'); px(x, 43, '#20202c'); } }
    for (let y = 0; y < 26; y++) for (let x = 0; x < w; x++) { const X = x + .5 - cx, Y2 = y + .5 - cy, o = (X / RX) ** 2 + (Y2 / RY) ** 2, i = (X / (RX - T)) ** 2 + (Y2 / (RY - T)) ** 2;
      if (front === 2 || o > 1.18 || i < .8) continue; if (!!front !== X > 0) continue;
      const edge = o > .92 || i < 1.02, band = Math.floor((Math.atan2(Y2, X) + Math.PI) / (Math.PI / 4)) % 2;
      px(x, y, edge ? '#20202c' : X > 0 ? (band ? '#ffd860' : '#ffffff') : (band ? '#c08a30' : '#c8ccd4')); }
    return c.toDataURL(); };
  return (RING = [mk(false), mk(true), mk(2)]);   // 뒤 반쪽 · 앞 반쪽 · 기둥 (기둥은 따로라 링만 흔들림, 경완 2026-10-29)
}
function yRing(i, x, y) {
  const [bk, ft, po] = ringArt(), w = 36, h = 88, el = (n, img, cls) => { const q = document.createElement('i'); q.className = 'ty-pr pr-hoop' + cls; q.style.cssText = `left:${(x - w / 2).toFixed(0)}px;top:${(y - h).toFixed(0)}px;width:${w}px;height:${h}px;z-index:${Math.round(y) + n};background-image:url(${img})`; Y.L.append(q); return q; };
  const p = el(-61, po, ' po'), b = el(-60, bk, ' rg'), f = el(70, ft, ' rg fr'); return (Y.pr['ring' + i] = { k: 'ring' + i, x, y, w, h, el: b, fr: f, po: p, ring: [x, y - h + 12 / 44 * h] });
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
  // 가로 코트 (경완 2026-10-29 '세로 말고 가로로'): 가운데 선이 세로, 양쪽 끝에 서는 칸
  hl(cx0, cx1, cy0); hl(cx0, cx1, cy1); vl(cx0, cy0, cy1); vl(cx1, cy0, cy1); vl(Math.round(mx), cy0, cy1);
  const bw = Math.round((cx1 - cx0) * .14); vl(cx0 + bw, cy0 + 6, cy1 - 6); vl(cx1 - bw, cy0 + 6, cy1 - 6); hl(cx0, cx0 + bw, cy0 + 6); hl(cx0, cx0 + bw, cy1 - 6); hl(cx1 - bw, cx1, cy0 + 6); hl(cx1 - bw, cx1, cy1 - 6);
  const r = Math.min(26, (cy1 - cy0) * .36);
  for (let a = 0; a < 6.283; a += .02) { const x = Math.round(mx + Math.cos(a) * r), y = Math.round(my + Math.sin(a) * r * .62); px(x, y + 1, 1, 1, LS); px(x, y, 1, 1, LN); }
  for (let y = -6; y <= 6; y++) for (let x = -9; x <= 9; x++) { const d = (x / 9) ** 2 + (y / 5.6) ** 2; if (d > 1) continue; px(mx + x, my + y, 1, 1, d > .72 ? '#3a3a48' : Math.abs(y) < 1 ? '#3a3a48' : y < 0 ? (x + y < -6 ? '#f07060' : '#d84030') : '#f4f0e8'); }
  for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if ((x / 3) ** 2 + (y / 2) ** 2 <= 1) px(mx + x, my + y, 1, 1, (x / 3) ** 2 + (y / 2) ** 2 > .5 ? '#3a3a48' : '#fff');
  // ---- 수영장: 돌 테두리 + 물 타일 (가운데 레인 줄 없음, 경완 2026-10-29) ----
  const P = { x0: Y.pond.x0 / 2, y0: Y.pond.y0 / 2, x1: Y.pond.x1 / 2, y1: Y.pond.y1 / 2 };
  for (let y = P.y0 - 4; y <= P.y1 + 4; y++) for (let x = P.x0 - 4; x <= P.x1 + 4; x++) { const inW = x >= P.x0 && x <= P.x1 && y >= P.y0 && y <= P.y1;
    if (!inW) { const bx = Math.floor((x - P.x0 + 40) / 6), by = Math.floor((y - P.y0 + 40) / 4), edge = (x - P.x0 + 40) % 6 === 0 || (y - P.y0 + 40) % 4 === 0;
      px(x, y, 1, 1, edge ? '#8a8e96' : y < P.y0 ? ((bx + by) & 1 ? '#d6d8dc' : '#c8ccd2') : ((bx + by) & 1 ? '#bcc0c8' : '#b0b4bc')); continue; }
    const t = (y - P.y0) / (P.y1 - P.y0), tile = (x - P.x0) % 7 === 0 || (y - P.y0) % 6 === 0, base = t < .18 ? '#2e6aa8' : '#3a86c8';
    px(x, y, 1, 1, tile ? (t < .18 ? '#285e98' : '#3478b8') : dith(x, y, t) && t < .5 ? '#3a86c8' : base === '#3a86c8' && dith(x, y, (t - .5) * 2) ? '#4c9ad8' : base); }
  for (let x = P.x0; x <= P.x1; x++) px(x, P.y0, 1, 1, '#1f4f80');   // 물 그늘
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
  try { seasonCv(c, 'bg', { ox: 0, oy: 0 }); } catch (e) {}
}
// 훈련장 다시 꾸미기 (경완 2026-10-29): 6마리가 서로 다른 기구에서 — 샌드백 둘·과녁(기술 쏘기)·트램펄린·허들 달리기·후프링(나는 포켓몬)·수영장(물)·가운데 코트 대련 둘·벤치 쉬기
async function drawTrain() {
  const g = st(); g.tr = g.tr || []; tickTrain(Date.now()); K.save();
  if (Y) { Y.mons.forEach(m => { Y.pos[m.id] = [m.x, m.y]; }); cancelAnimationFrame(Y.raf); }
  sh.classList.add('ty-on'); sh.scrollTop = 0;
  sh.innerHTML = `<div class="ty-yd"><canvas class="ty-bg"></canvas><div class="ty-l"></div><button class="ty-st" type="button" data-stat="1" aria-label="훈련 현황"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M1 1h1v13H1zM1 14h14v1H1z"/><path fill="#e05a4a" d="M4 9h2v5H4z"/><path fill="#f0b030" d="M8 5h2v9H8z"/><path fill="#4a9ad8" d="M12 2h2v12h-2z"/></svg></button><button class="ty-add${g.tr.length ? '' : ' pulse'}" data-add="1" aria-label="포켓몬 보내기"><b>+</b><small>${g.tr.length}/${trMax()}</small></button></div>`;
  const el = sh.querySelector('.ty-yd'); await loadYA(); if (!el.isConnected) return;
  const W = Math.max(280, el.clientWidth || 360), H = Math.max(520, el.clientHeight || 640);
  Y = { el, W, H, L: el.querySelector('.ty-l'), pr: {}, mons: [], pos: Y?.pos || {}, last: 0,
    pond: { x0: 16, y0: H * .74, x1: W * .54, y1: H - 16 }, court: { x0: 22, y0: H * .43, x1: W - 22, y1: H * .63 } };
  Y.pond.x = (Y.pond.x0 + Y.pond.x1) / 2; Y.pond.y = (Y.pond.y0 + Y.pond.y1) / 2;
  yardBg(el.querySelector('.ty-bg'));
  const r1 = H * .29, r2 = H * .39;   // 의자·아이스박스 없앰, 후프링 위로, 수영장 왼쪽 (경완 2026-10-29)
  yProp('bag1', 'punch-bag', W * .1, r2); yProp('bag2', 'punch-bag', W * .27, r2); yProp('tramp', 'spring-trampoline', W * .5, r2); yProp('tgt', 'target-easel', W * .9, r2);
  // 깃발 없애고 허들은 위아래로 (경완 2026-10-29): 오른쪽 아래 세로 트랙, 위에서 아래로 달리며 넘기
  yProp('h1', 'track-hurdle', W * .72, H * .76); yProp('h2', 'track-hurdle', W * .72, H * .88);
  [.24, .5, .76].forEach((f, i) => yRing(i, W * f, r1));
  Y.lane = { x: W * .72, y0: H * .69, y1: H * .95 };
  // 부표: 줄 위가 아니라 줄 아래 물 위에 둥둥 (입체 튜브)
  { const q = document.createElement('i'), x = Y.pond.x0 + (Y.pond.x1 - Y.pond.x0) * .66, y = Y.pond.y + (Y.pond.y1 - Y.pond.y) * .55; q.className = 'ty-eq eq-water'; q.style.cssText = `left:${x}px;top:${y}px;z-index:${Math.round(y)};background-image:url(${buoyArt()})`; Y.L.append(q); Y.pr.water = { k: 'water', x, y, w: 64, h: 44, el: q }; }
  g.tr.forEach((e, i) => { const P = boxOf(e.id); if (P) yardMon(P, e, i); });
  // 코치 (훈련장에 배치한 트레이너): 코트 가장자리에서 응원
  Y.co = g.sf.filter(x => x.yard).slice(0, YARD_SF).map((x, i) => { const q = document.createElement('i'), cx = W * (i ? .9 : .1), cy = H * .6; q.className = 'ty-co' + (K.owW(x.ow) > 16 ? ' w32' : ''); q.dataset.co = i;
    q.style.cssText = `left:${cx}px;top:${cy}px;z-index:${Math.round(cy)};background-image:url(${K.owSrc(x.ow)})`; Y.L.append(q); return { s: x, el: q, x: cx, y: cy, nx: performance.now() / 1000 + 1 + i * 1.7 }; });
  sh.onclick = ev => {
    const c = ev.target.closest('[data-co]'); if (c) { sfx('tap'); const o = Y.co[+c.dataset.co]?.s; if (o) sfDetail(o); return; }
    if (ev.target.closest('[data-stat]')) { sfx('tap'); return statPop(); }
    const t = ev.target.closest('[data-p],[data-add]'); if (!t) return; sfx('tap');
    if (t.dataset.add) return pickTrain();
    trPop(+t.dataset.p || t.dataset.p);
  };
  { const x = coachX(); if (x > 1.001) el.insertAdjacentHTML('beforeend', `<div class="ty-info">💪 코치 보너스 <b>+${Math.round((x - 1) * 100)}%</b></div>`); }
  Y.raf = requestAnimationFrame(yardLoop);
}
const TY_SHOT = new Set([8, 10, 11, 12, 13, 14, 15, 16, 18]);   // 과녁에 기술을 쏘는 타입 (고스트·불꽃·물·풀·전기·에스퍼·얼음·드래곤·페어리)
function yardMon(P, e, i) {
  const t = SPECIES[P.sp]?.t || [], o = document.createElement('div');
  o.className = 'ty-m'; o.dataset.p = P.id; o.innerHTML = '<i class="ty-sh"></i><div class="ty-fl"><i class="ty-sp"></i></div><div class="ty-tag"></div>';
  // 물고기 포켓몬은 처음부터 수영장에서, 수영장에만 있다 (경완 2026-10-27)
  const fish = !!GA.isFish?.(P.sp), p0 = Y.pos[P.id], [x, y] = p0 && (!fish || inPond(p0[0], p0[1], -14)) ? p0 : yardSpot(fish); Y.L.append(o);
  const m = { id: P.id, P, e, el: o, fl: o.querySelector('.ty-fl'), sp: o.querySelector('.ty-sp'), shd: o.querySelector('.ty-sh'), tag: o.querySelector('.ty-tag'), x, y, face: Math.random() < .5 ? 1 : -1, st: 'rest', until: performance.now() / 1000 + .5 + Math.random() * 2, at: 0,
    swimmer: t.includes(11), fish, flyer: t.includes(3) || (GA.lift?.(P.sp) || 0) > 8, fighter: t.includes(2), shooter: t.some(x => TY_SHOT.has(x)), ty: t[0], air: 0, D: null };
  Y.mons.push(m); place(m); try { yTag(m); } catch (x) {}
  GA.pmd?.(P.sp, P.sex).then(D => { if (!Y.mons.includes(m)) return; m.D = D;
    if (D.P) { const [w, h] = D.wh, s = D.s; m.s = s; Object.assign(m.sp.style, { backgroundImage: `url("${D.P.i}")`, backgroundSize: `${w * s}px ${h * s}px` }); if (P.shiny) m.sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`; m.fk = '';
      const fw = Math.max(10, (D.P.fw || 14) * s * 1.05); Object.assign(m.shd.style, { width: fw + 'px', left: ((D.P.fx || 0) * s - fw / 2) + 'px', height: Math.max(6, fw * .3) + 'px', top: -Math.max(6, fw * .3) / 2 + 'px' }); }
    else { m.sp.classList.add('one'); m.sp.style.backgroundImage = `url("${D.img}")`; }
  }).catch(() => {});
}
// 떠 있는 높이는 필드와 같게 (GA.lift) + 뛰기·날기 높이(m.air). 그림자는 땅에 그대로, 높이 뜰수록 옅게
const place = m => { m.el.style.transform = `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px)`; m.el.style.zIndex = Math.round(m.y) + 2 + (m.zb || 0);
  const L = m.fish ? 0 : GA.lift?.(m.P.sp, m.st === 'sleep') || 0, bob = m.fish ? Math.sin(performance.now() / 420 + (m.id % 97)) * 1.5 : L > 2 && !m.air ? Math.sin(performance.now() / 260 + (m.id % 97)) * 4 : 0;   // 물고기는 물에 떠서 살짝만 흔들
  m.lift = (m.lift ?? L) + (L - (m.lift ?? L)) * .08;
  m.fl.style.transform = `translateY(${(-m.lift - (m.air || 0) - bob).toFixed(1)}px) scaleX(${m.face})`;
  m.shd.style.opacity = m.air > 1 ? Math.max(.35, 1 - m.air / 90).toFixed(2) : ''; };
function yEmo(m, ch, cls = '') { const q = document.createElement('i'); q.className = 'ty-emo ' + cls; q.textContent = ch; q.style.top = ((m.top ?? -40) - 22 - (m.air || 0)) + 'px'; m.el.append(q); setTimeout(() => q.remove(), 1300); }
// 맞는 순간 반짝 + 먼지 (기구 쪽), 걸을 때 발밑 먼지
function yFx(x, y, cls) { const q = document.createElement('i'); q.className = 'ty-fx ' + cls; q.style.cssText = `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;z-index:${Math.round(y) + 3}`; Y.L.append(q); setTimeout(() => q.remove(), 700); }
// 과녁에 쏘는 기술 구슬 (타입 색)
function yShot(m, q) { const s = document.createElement('i'), c = GA.TYPE_C?.[m.ty] || '#ffd040', x0 = m.x - m.face * 14, y0 = m.y - 22 - (m.lift || 0), x1 = q.x, y1 = q.y - q.h * .62;
  s.className = 'ty-shot'; s.style.cssText = `left:${x0}px;top:${y0}px;z-index:${Math.round(Math.max(m.y, q.y)) + 4};--c:${c}`; Y.L.append(s);
  s.animate([{ transform: 'translate(0,0) scale(.6)' }, { transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(1.1)` }], { duration: 320, easing: 'ease-in' }).onfinish = () => { s.remove(); yWob(q); yFx(x1, y1, 'spk'); }; }
// 포켓몬 밑 이름표: 레벨 + 다음 레벨까지 경험치 막대
function yTag(m) { const g = GB().growth(m.P.sp), x = GB().gm(m.P), a = GB().xpAt(g, x.lv), b = GB().xpAt(g, x.lv + 1), r = x.lv >= GB().LV_MAX ? 1 : Math.max(0, Math.min(1, ((x.xp ?? a) - a) / Math.max(1, b - a)));
  m.tag.innerHTML = `<span class="tt-r"><span class="rk ${GA.rankOf(m.P)}">${GA.rankOf(m.P)}</span><b>Lv.${x.lv}</b></span><i><s style="width:${(r * 100).toFixed(0)}%"></s></i>`; }
// 기구 자리: 누가 쓰고 있나 (m.k)
const yBusy = (k, m) => Y.mons.some(o => o !== m && o.k === k && o.st !== 'rest' && o.st !== 'sleep');
function yGo(m, k, x, y, then) { m.st = 'go'; m.k = k; m.tx = x; m.ty = y; m.then = then; m.air = 0; }
// 다음 할 일 (경완 2026-10-29 '6마리가 상호작용'): 타입에 맞는 기구를 고르고, 둘이 비어 있으면 가운데 코트에서 대련
function yNext(m, now) {
  m.k = null; m.air = 0; m.one = null; m.zb = 0;
  if (leftOf(m.e) <= 0) { m.st = 'sleep'; m.until = now + 99; return; }   // 오늘 8시간 다 쓴 포켓몬은 그 자리에서 잠
  if (m.fish) { const q = Y.pr.water; if (!yBusy('water', m) && Math.random() < .6) return yGo(m, 'water', q.x - 44, q.y - 2, 'buoy'); const [sx, sy] = yardSpot(true); return yGo(m, 'swim', sx, sy, 'rest'); }
  // 대련: 아직 대련 상대가 없고 코트가 비어 있으면 30%
  const mates = Y.mons.filter(o => o !== m && !o.fish && !o.mate && leftOf(o.e) > 0 && (o.st === 'rest' || now > o.until - 1.5));
  if (!Y.mons.some(o => o.k === 'spar') && mates.length && Math.random() < .3) { const o = K.pick(mates), C = Y.court, cx = (C.x0 + C.x1) / 2 + (Math.random() - .5) * 60, cy = (C.y0 + C.y1) / 2 + (Math.random() - .5) * 20;
    o.one = null; o.air = 0; m.mate = o; o.mate = m; m.lead = true; o.lead = false; yGo(m, 'spar', cx - 30, cy, 'spw'); yGo(o, 'spar', cx + 30, cy, 'spw'); return; }
  const W8 = [];   // [기구, 무게]
  const add = (k, w) => { if (w > 0 && !yBusy(k, m)) W8.push([k, w]); };
  if (m.flyer) { add('hoop', 4); add('tgt', m.shooter ? 2 : .5); add('bag1', 1); add('bag2', 1); }
  else { add('bag1', m.fighter ? 4 : 1.4); add('bag2', m.fighter ? 4 : 1.4); add('tgt', m.shooter ? 4 : .6); add('tramp', 1.6); add('run', 1.8); if (m.swimmer) add('water', 3); }
  if (!W8.length) { m.st = 'train'; m.k = null; m.until = now + 4 + Math.random() * 3; return; }   // 다 차 있으면 그 자리에서 섀도 훈련
  let r = Math.random() * W8.reduce((a, x) => a + x[1], 0), k = W8[0][0]; for (const [kk, w] of W8) { r -= w; if (r <= 0) { k = kk; break; } }
  const q = Y.pr[k];
  if (k === 'bag1' || k === 'bag2') return yGo(m, k, q.x + 30, q.y + 2, 'bag');
  if (k === 'tgt') return yGo(m, k, q.x - Y.W * .24, q.y + 4, 'shoot');
  if (k === 'tramp') return yGo(m, k, q.x, q.y - 8, 'tramp');
  if (k === 'run') return yGo(m, k, Y.lane.x, Y.lane.y0, 'run');
  if (k === 'water') return yGo(m, k, q.x - 44, q.y - 2, 'buoy');
  if (k === 'hoop') { const R = Y.pr.ring0; return yGo(m, k, R.x - 30, R.y - 6, 'hoop'); }
}
// 도착하면 그 기구 훈련 시작
function yArrive(m, now) {
  const T = m.then; m.until = now + 6 + Math.random() * 4;
  if (T === 'bag') { m.st = 'bag'; m.face = 1; }
  else if (T === 'shoot') { m.st = 'shoot'; m.face = -1; m.n = 0; }
  else if (T === 'tramp') { m.st = 'tramp'; m.ph = 0; m.zb = 30; }
  else if (T === 'run') { m.st = 'run'; m.dir = 1; m.lap = 0; }
  else if (T === 'buoy') { m.st = 'buoy'; m.face = -1; }
  else if (T === 'hoop') { m.st = 'hoop'; m.ph = 0; m.lap = 0; }
  else if (T === 'sit') { m.st = 'sit'; m.face = Math.random() < .5 ? 1 : -1; }
  else if (T === 'sleep') { m.st = 'sleep'; m.until = now + 99; }
  else if (T === 'spw') { m.st = 'spw'; m.until = now + 6; const o = m.mate; if (o && o.st === 'spw' && o.mate === m) { m.face = o.x > m.x ? -1 : 1; o.face = -m.face; m.st = o.st = 'spar'; m.until = o.until = now + 6 + Math.random() * 4; m.turn = o.turn = 0; } }
  else { m.st = 'rest'; m.until = now + 1.5 + Math.random() * 3; }
}
// 후프링 길: 고리 셋을 차례로 지나 위로 크게 돌아온다 (나는 포켓몬)
function hoopAt(t) { const R = [0, 1, 2].map(i => Y.pr['ring' + i]), x0 = R[0].x - 30, x1 = R[2].x + 30, gy = R[0].y - 6, ah = R[0].y - R[0].ring[1];
  if (t < .55) { const u = t / .55; return { x: x0 + (x1 - x0) * u, y: gy, air: ah, f: -1 }; }
  const u = (t - .55) / .45, a = Math.PI * u; return { x: x1 - (x1 - x0) * u, y: gy - Math.sin(a) * 18, air: ah + Math.sin(a) * 46, f: 1 }; }
function yardLoop(ts) {
  if (!Y || !Y.el.isConnected || sh.hidden || cur !== 'train') { Y && (Y.raf = 0); return; }
  const now = ts / 1000, dt = Math.min(.1, Y.last ? now - Y.last : 0); Y.last = now;
  if (now - (Y.ck ?? now) > 30) { tickTrain(Date.now()); K.save(); Y.ck = now; Y.mons.forEach(m => { try { yTag(m); } catch (x) {} }); } else Y.ck ??= now;   // 30초마다 남은 시간·레벨 새로
  for (const c of Y.co || []) if (now > c.nx) { c.nx = now + 3 + Math.random() * 3; const t = Y.mons.length ? K.pick(Y.mons) : null; c.el.classList.toggle('l', !!t && t.x < c.x);
    c.el.classList.remove('cheer'); void c.el.offsetWidth; c.el.classList.add('cheer'); const q = document.createElement('i'); q.className = 'ty-emo co'; q.textContent = K.pick(['힘내!', '좋아!', '한 번 더!', '그렇지!', '!']); q.style.left = c.x + 'px'; q.style.top = (c.y - 74) + 'px'; q.style.zIndex = 9999; Y.L.append(q); setTimeout(() => q.remove(), 1300); }
  for (const m of Y.mons) {
    if (m.st === 'go') {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), v = (m.flyer ? 60 : 46) * dt;
      if (m.flyer && !m.fish) m.air = Math.min(24, (m.air || 0) + dt * 40);
      if (Math.abs(dx) > 2) m.face = dx > 0 ? -1 : 1;
      if (d <= v) { m.x = m.tx; m.y = m.ty; if (m.k !== 'hoop') m.air = 0; yArrive(m, now); }
      else { m.x += dx / d * v; m.y += dy / d * v; m.an = dy < -Math.abs(dx) ? 'WalkUp' : 'Walk'; if (now > (m.dz || 0) && !m.air && !(GA.lift?.(m.P.sp) > 2) && !m.el.classList.contains('swim')) { m.dz = now + .28; yFx(m.x + m.face * 8, m.y, 'dst'); } }
    } else if (now >= m.until && m.st !== 'run' && m.st !== 'hoop') {
      if (m.st === 'spar' || m.st === 'spw') { const o = m.mate; if (m.st === 'spar') { yEmo(m, '♪', 'mu'); if (o) yEmo(o, '♪', 'mu'); }
        m.mate = null; if (o && o.mate === m) { o.mate = null; yNext(o, now); } }
      yNext(m, now);
    }
    // 기구별 움직임
    if (m.st === 'bag' && !m.one) m.one = { n: 'Attack', t: 0, k: m.k, gap: .2 + Math.random() * .4 };
    if (m.st === 'shoot' && !m.one) m.one = { n: m.D?.P?.a.Shoot ? 'Shoot' : 'Attack', t: 0, shot: Y.pr.tgt, gap: .5 + Math.random() * .6 };
    if (m.st === 'buoy' && !m.one) m.one = { n: 'Attack', t: 0, k: 'water', gap: .3 + Math.random() * .5 };
    if (m.st === 'train' && !m.one) m.one = { n: 'Attack', t: 0, gap: .25 + Math.random() * .5 };
    if (m.st === 'tramp') { const p0 = m.ph; m.ph += dt / .62; m.air = Math.abs(Math.sin(m.ph * Math.PI)) * 30; if (Math.floor(m.ph) !== Math.floor(p0)) { yWob(Y.pr.tramp, 'sq'); if (Math.random() < .3) yEmo(m, '♪', 'mu'); } }
    if (m.st === 'run') { const L = Y.lane, v = 80 * dt; m.y += m.dir * v; m.x = L.x; m.an = 'Walk';   // 세로 트랙: 위아래로 달리며 허들 넘기
      const hd = ['h1', 'h2'].map(k => Math.abs(m.y - Y.pr[k].y)).reduce((a, b) => Math.min(a, b)), J = 16; m.air = hd < J ? Math.cos(hd / J * Math.PI / 2) * 26 : 0;
      if (m.y > L.y1 || m.y < L.y0) { m.y = clampN(m.y, L.y0, L.y1); m.dir = -m.dir; m.face = Math.random() < .5 ? 1 : -1; if (++m.lap >= 4) { yEmo(m, '!', 'hit'); yNext(m, now); } } }
    if (m.st === 'hoop') { m.ph += dt / 4.2; const p = hoopAt(m.ph % 1); m.x = p.x; m.y = p.y; m.air = p.air; m.face = p.f; m.an = 'Walk'; m.zb = 0;
      m.air = Math.max(0, p.air - (m.top != null ? -m.top * .5 : 18) - (m.lift || 0));   // 몸통 가운데가 고리 구멍 높이로
      if (m.ph % 1 < .55) { const R = [0, 1, 2].map(i => Y.pr['ring' + i]), i = R.findIndex(q => Math.abs(q.x - m.x) < 4); if (i >= 0 && i !== m.ri) { m.ri = i; yWob({ el: R[i].fr }, 'spin'); yWob(R[i], 'spin'); } } else m.ri = -1;
      if (m.ph >= 3) { m.air = 0; yNext(m, now); } }
    if (m.st === 'spar' && m.lead && !m.one && !m.mate?.one) { const a = m.turn % 2 ? m.mate : m; a.one = { n: 'Attack', t: 0, tgt: a === m ? m.mate : m }; m.turn++; }
    if ((m.st === 'sleep') && now > (m.zz || 0)) { m.zz = now + 3 + Math.random() * 2; yEmo(m, 'Zz', 'zz'); }
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
function yHit(m) {
  const o = m.one; if (o.shot) return yShot(m, o.shot);
  const q = o.k && Y.pr[o.k]; if (q) { yWob(q, o.k === 'water' ? 'wob' : 'swing'); yFx(q.x + (o.k === 'water' ? 10 : 6), q.y - (o.k === 'water' ? 10 : q.h * .55), o.k === 'water' ? 'spl' : 'spk'); }
  else if (!o.tgt) yFx(m.x - m.face * 22, m.y - 24, 'spk');
  if (o.tgt) { const t = o.tgt; if (t.D?.P?.a.Hurt && !t.one) t.one = { n: 'Hurt', t: 0 }; yFx((m.x + t.x) / 2, m.y - 22, 'spk'); yEmo(t, '!', 'hit'); t.x += (t.x > m.x ? 1 : -1) * 4; }
  if (Math.random() < .3) yEmo(m, '+EXP', 'xp');
}
function yDraw(m, dt) {
  const D = m.D; if (!D?.P) { m.el.classList.toggle('bob', m.st !== 'rest' && m.st !== 'sleep' && m.st !== 'sit'); if (m.one) { m.one.t += dt; if (m.one.t > .8) { yHit(m); m.one = null; } } return; }
  const A = D.P.a; let nm, f = null;
  if (m.one) { nm = A[m.one.n] ? m.one.n : 'Idle'; m.one.t += dt; }
  else nm = m.st === 'go' || m.st === 'run' || m.st === 'hoop' ? m.an : m.st === 'sleep' ? 'Sleep' : m.st === 'sit' ? (A.Sit ? 'Sit' : 'Idle') : m.st === 'tramp' && A.Hop ? 'Hop' : 'Idle';
  if (!A[nm]) nm = nm === 'WalkUp' && A.Walk ? 'Walk' : 'Idle';
  const a = A[nm], durs = a[6], tot = durs.reduce((s, d) => s + d, 0) / 60;
  let t;
  if (m.one) { t = m.one.t;
    const hitT = durs.slice(0, (a[7] ?? 0) + 1).reduce((s, d) => s + d, 0) / 60;
    if (!m.one.hit && t >= hitT) { m.one.hit = 1; if (m.one.n !== 'Hurt') yHit(m); }
    if (t >= tot) { if (m.one.gap && t < tot + m.one.gap) { t = tot - .001; } else { m.one = null; return yDraw(m, 0); } } }
  else { if (m.ak !== nm) { m.ak = nm; m.at = 0; } m.at += dt * (m.st === 'run' ? 1.8 : 1); t = m.at % tot; }
  let acc = 0; f = durs.length - 1; for (let i = 0; i < durs.length; i++) { acc += durs[i] / 60; if (t < acc) { f = i; break; } }
  const key = nm + ':' + f; if (m.fk === key) return; m.fk = key;
  const s = m.s, P = D.P, st2 = m.sp.style;
  if (nm === 'Idle' || m.top == null) m.top = (-a[5] - (P.fy || 0)) * s + (P.vt || 0) * s;
  st2.width = a[1] * s + 'px'; st2.height = a[2] * s + 'px'; st2.left = -a[4] * s + 'px'; st2.top = (-a[5] - (P.fy || 0)) * s + 'px';
  st2.backgroundPosition = `${-f * (a[1] + (P.G || 0)) * s}px ${-a[0] * s}px`;
}
// 훈련장에 보낼 포켓몬: 포켓몬 박스와 같은 화면 (경완 2026-10-29). 누르면 넣기·빼기, 6마리까지
function pickTrain() {
  const g = st(), ty = g.ty, inTr = id => g.tr.some(e => e.id === id);
  GB().boxWin(false, null, () => redraw(), {
    title: () => `훈련장에 보낼 포켓몬 <small>${g.tr.length}/${trMax()}</small>`, tip: `${TYPE_KO[ty]} 타입이 먼저 보여요`,
    list: () => S.box.filter(P => GB().gm(P).lv < GB().LV_MAX || inTr(P.id)), ok: () => true, first: P => (SPECIES[P.sp]?.t || []).includes(ty),
    tag: P => inTr(P.id) ? '훈련 중' : onField(P.id) ? '필드' : '',
    pick: function this_pick(P, w) { const i = g.tr.findIndex(e => e.id === P.id);
      if (i >= 0) { tickTrain(Date.now()); g.tr.splice(i, 1); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에서 데려왔다.`); }
      else { if (g.tr.length >= trMax()) return say('훈련장이 가득 찼어요. 6마리까지 보낼 수 있어요.');
        // 보내기 전에 한 번 더 묻기, 필드에 나가 있으면 빠진다고 안내 (경완 2026-10-29)
        if (!w.ok) { const n = esc(nmOf(P)); GB().gymPop(`<h4>${n}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보낼까요?</h4>${onField(P.id) ? `<p class="gy-msg">지금 필드에 나가 있어서 보내면 <b>필드에서 빠져요</b>.</p>` : ''}<div class="gy-btns"><button data-a="x">취소</button><button class="main" data-a="ok">보내기</button></div>`, (a, close) => { close(); if (a === 'ok') { w.ok = 1; try { this_pick(P, w); } finally { w.ok = 0; } } }); return; }
        const m = S.mons.find(o => o.pid === P.id); if (m) { try { GA.removeMon(m, true); } catch (e) {} }
        const now = Date.now(); g.tr.push({ id: P.id, t: now, d: K.dayStart(now), h: 0, j: now, l0: GB().gm(P).lv, x: 0, mv: [] }); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보냈다.`);
        if (g.tr.length >= trMax()) { K.save(); w.close(); return redraw(); } }
      K.save(); w.redraw(); } });
}
// 훈련 현황 (경완 2026-10-29): 나와 있던 시간, 얻은 경험치, 오른 레벨, 배운 기술
const hm = ms => { const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}일 ${h}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`; };
// 새 화면으로 (경완 2026-10-29 '훈련현황 새로운 화면에'): 포켓몬 박스처럼 전체 화면, ‹ 로 닫기
function statPop() {
  const g = st(); tickTrain(Date.now()); K.save();
  const L = g.tr.map(e => [e, boxOf(e.id)]).filter(([, P]) => P);
  document.querySelector('#gym .gy-boxw')?.remove();
  const w = document.createElement('div'); w.className = 'gy-boxw ts-win';
  w.innerHTML = `<div class="win" role="dialog" aria-label="훈련 현황"><div class="bw-hd"><button class="bw-x" data-x aria-label="뒤로">‹</button><h4>훈련 현황 <small>${L.length}/${trMax()}</small></h4></div>
    ${L.length ? `<div class="ts-list">${L.map(([e, P]) => { const m = GB().gm(P), up = m.lv - (e.l0 ?? m.lv), mv = (e.mv || []).map(id => GB().mvKo(id));
    return `<div class="ts-row">${GB().thumb(P)}<div><b>${esc(nmOf(P))} <span>Lv.${m.lv}${up > 0 ? ` <em>▲${up}</em>` : ''}</span></b>
      <dl><dt>훈련한 시간</dt><dd>${hm(e.j ? Date.now() - e.j : 0)} <small>· 오늘 ${Math.min(8, e.d === K.dayStart(Date.now()) ? e.h : 0).toFixed(1)}/8시간</small></dd><dt>얻은 경험치</dt><dd>${Math.round(e.x || 0).toLocaleString()}</dd><dt>배운 기술</dt><dd>${mv.length ? mv.map(esc).join(', ') : '아직 없어요'}</dd></dl></div></div>`; }).join('')}</div>` : '<p class="gy-msg">훈련장에 포켓몬이 없어요. + 를 눌러 보내 주세요.</p>'}</div>`;
  document.querySelector('#gym .gy-main').appendChild(w); GB().fillTh(w);
  w.onclick = e => { if (e.target.closest('[data-x]')) { sfx('tap'); w.remove(); } };
}
function trPop(id) {
  const P = boxOf(id); if (!P) return; const m = GB().gm(P), ph = perHour(P), g = GB().growth(P.sp), need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  const a0 = GB().xpAt(g, m.lv), r = m.lv >= GB().LV_MAX ? 1 : clampN(((m.xp ?? a0) - a0) / Math.max(1, need), 0, 1);
  pop(`<div class="mp-head">${GB().thumb(P)}<div><h4>${esc(nmOf(P))}</h4><i class="mp-xp"><i style="width:${(r * 100).toFixed(1)}%"></i></i><small class="tp-xp">${m.lv >= GB().LV_MAX ? '최고 레벨' : `${Math.max(0, Math.floor((m.xp ?? a0) - a0)).toLocaleString()}/${Math.ceil(need).toLocaleString()}`}</small><p>Lv.${m.lv} · 1시간에 약 ${m.lv >= GB().LV_MAX ? 0 : (ph / need).toFixed(2)}레벨<br>${(e => !e ? '' : leftOf(e) > 0 ? `오늘 ${Math.ceil(leftOf(e))}시간 더 훈련해요` : '오늘 훈련 끝 · 내일 다시')(st().tr.find(e => e.id === P.id))}</p></div></div>
    <div class="mp-moves mp-line">${m.mv.map(x => GB().mvOf(x)).filter(Boolean).map(x => GB().mvRow(x, '')).join('')}</div>
    <div class="gy-btns three"><button data-a="mv">기술 바꾸기</button><button data-a="tm">기술 가르치기</button><button data-a="out">데려오기</button><button class="main" data-a="x">닫기</button></div>`,
    (a, close) => { if (!a) return; close(); if (a === 'mv') return GB().movesPop(P, () => { redraw(); trPop(id); }); if (a === 'tm') return GB().tmPop(P, () => { redraw(); trPop(id); });
      if (a === 'out') { tickTrain(Date.now()); st().tr = st().tr.filter(e => e.id !== P.id); K.save(); redraw(); } });
}

// ======================= 트레이너 고용 (6단계) =======================
// 지원서 인사 (경완 2026-10-29 '특성에 어느 정도 맞추되 다양하게'): 여는 말 + 특성 한마디, 지원서마다 고정(c.id)
const HELLO = ['안녕하세요!', '처음 뵙겠습니다!', '반갑습니다, 관장님!', '저기… 안녕하세요.', '체육관 소문 듣고 왔어요!', '오늘 공고 보고 바로 달려왔어요!', '잘 부탁드립니다!', '관장님 배틀 보고 반해서 왔어요!'];
const LINES = {
  train: ['훈련이라면 자신 있어요! 체육관 포켓몬들도 같이 단련할게요.', '아침 달리기부터 밤 특훈까지, 훈련 계획은 제게 맡겨 주세요.', '포켓몬마다 맞는 훈련법을 찾아 주는 게 특기예요.', '훈련장 한 바퀴만 봐도 고칠 점이 보여요. 금방 강하게 만들어 드릴게요.', '땀 흘리는 포켓몬을 보면 저도 힘이 나요!'],
  star: ['제 배틀은 구경꾼이 많이 와요. 체육관 이름을 널리 알릴게요!', '사인 요청이 좀 많아도 이해해 주세요. 그만큼 손님이 늘 거예요!', '멋지게 이기는 법을 알아요. 도전자들 사이에 소문이 날걸요?', '방송에도 몇 번 나왔어요. 체육관 홍보는 걱정 마세요!', '무대 체질이에요. 관중이 많을수록 더 잘 싸워요!'],
  money: ['도전자에게서 상금을 두둑이 챙겨 올게요.', '체육관 살림, 제가 있으면 넉넉해질 거예요.', '계산은 빠르고 배틀은 더 빨라요. 수입은 확실히 늘려 드릴게요.', '이긴 배틀은 반드시 돈이 되게 만드는 게 제 방식이에요.', '상금 협상이라면 누구에게도 지지 않아요!'],
  guts: ['절대 물러서지 않아요. 끝까지 버티는 게 제 장점이에요!', '체력이 바닥나도 한 번 더 버팁니다. 그게 근성이죠!', '불리할수록 더 불타오르는 타입이에요.', '지는 건 싫어요. 마지막 한 마리까지 포기 안 해요!', '넘어져도 일어나는 건 자신 있어요. 포켓몬들도 그렇게 키웠고요.'],
  grow: ['아직 부족하지만, 배틀할수록 강해지는 타입이에요!', '하루하루 늘고 있어요. 지켜봐 주세요!', '경험이 적은 대신 배우는 속도는 누구보다 빨라요.', '이 체육관에서 크게 성장하고 싶어요!', '지금은 새싹이지만 금방 큰 나무가 될게요.'],
  thrift: ['월급은 조금만 주셔도 괜찮아요. 일하게만 해 주세요!', '돈보다 배울 수 있는 곳이 좋아요. 월급은 적당히만요.', '도시락 싸 오고 걸어서 출근해요. 큰돈은 필요 없어요!', '아껴 쓰는 건 자신 있어요. 체육관 비품도 소중히 쓸게요.', '적게 받아도 일은 성실하게! 그게 제 신조예요.'],
  lazy: ['음… 가끔 낮잠을 자지만, 월급은 아주 조금이면 돼요.', '서두르지 않는 편이에요. 대신 월급은 정말 조금만 주세요.', '하아암… 배틀할 땐 깨어 있을게요. 아마도요.', '느긋하게 일하는 대신 욕심도 없어요.', '날씨 좋은 날엔 조금 늦을 수도 있어요. 그래도 괜찮죠?'],
};
const sayOf = c => { const L = LINES[c.trait] || [''], n = Math.abs((c.id | 0) * 2654435761 | 0) || 0; return `${HELLO[n % HELLO.length]} ${L[(n >>> 3) % L.length]}`; };
// 포켓몬 그림 + 레벨: 상자 없이 그림 밑에 작은 글씨 (경완 2026-10-27 '박스 없이 좀 더 깔끔하게')
const teamIc = T => `<span class="sf-team">${T.map(([sp, lv]) => `<span><img alt="" data-sp="${sp}"><small>Lv.${lv}</small></span>`).join('')}</span>`;
// 특성은 상자로 (경완 2026-10-27 '트레이너 특성은 확실하게 박스로')
const trtBox = (k, full, bare) => { const T = K.TRAITS[k]; return T ? `<span class="trt trt-${k}">${bare ? '' : '<b>특성</b>'}<i>${T.n}</i>${full ? `<small>${T.d}</small>` : ''}</span>` : ''; };
// 트레이너: 지원서 탭 / 고용 관리 탭 (경완 2026-10-27)
let sfT = 'cand';
// 지원서 남은 시간 (경완 2026-10-28): 우상단에 시:분, 가운데 : 가 깜빡
const cvLeft = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return `${Math.floor(m / 60)}h ${m % 60}m`; };   // 경완 2026-10-28: '남은 시간' 상태박스 안에 h m
setInterval(() => document.querySelectorAll('.cv-left[data-exp]').forEach(e => { e.innerHTML = cvLeft(+e.dataset.exp - Date.now()); }), 20e3);
function drawStaff() {
  const g = st(), now = Date.now(), max = K.staffMax();
  const C = g.cands || (g.cands = []); if (C.length && !g.candSeen && sfT === 'cand') { g.candSeen = 1; K.setAt(); K.save(); K.menuDot(); }   // 지원서 탭을 보면 빨간 점이 꺼진다 (경완 2026-10-29)
  const c = C.length, yN = g.sf.filter(s => s.yard).length;
  const tabs = `<div class="sp-tabs" role="tablist"><button role="tab" data-sft="cand" aria-selected="${sfT === 'cand'}">지원서${c && !g.candSeen ? ' <i class="tdot"></i>' : ''}</button><button role="tab" data-sft="sf" aria-selected="${sfT === 'sf'}">고용 관리</button></div>`;
  // 지원서 (경완 2026-10-28): 스프라이트가 잘 보이는 세로 카드, 여러 장이면 옆으로 넘긴다. 면접 내용도 카드 안에, 바로 고용하기
  const cand = c ? `<div class="cv-deck">${C.map((x, i) => `<article class="cv-card" data-i="${i}"><header><b>트레이너 지원서</b><span class="cv-tm"><em>남은 시간</em><b class="cv-left" data-exp="${x.exp}">${cvLeft(x.exp - now)}</b></span></header>
      <div class="cv-photo"><img alt="" src="${K.trSrc(x.tr)}"><div class="cv-nm"><small>${esc(x.cls)}</small><b>${esc(x.nm)}</b></div></div>
      <p class="cv-say">“${esc(sayOf(x))}”</p>
      <dl class="cv-dl"><dt>특성</dt><dd>${trtBox(x.trait, true, true)}</dd><dt>포켓몬</dt><dd>${teamIc(x.team)}</dd><dt>평균 레벨</dt><dd>Lv.${Math.round(K.teamLv(x.team))}</dd><dt>희망 월급</dt><dd>7일에 <b>${x.wage}G</b></dd></dl>
      <div class="cv-btns"><button class="gy-key" data-no="${i}">돌려보내기</button><button class="gy-key main" data-hire="${i}">고용하기</button></div></article>`).join('')}</div>
      ${C.length > 1 ? `<div class="cv-dots">${C.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}`
      : `<p class="sf-none">지금은 지원서가 없어요. 새 지원자가 오면 트레이너 단추에 빨간 점이 떠요.</p>`;
  const gL = K.sfList ? K.sfList() : [], gNo = x => gL.findIndex(z => z[0] === x);
  const list = `<div class="sf-list">${g.sf.map((s, i) => `<button class="sf-card${s.rest ? ' rest' : ''}" data-sf="${i}"><img class="sf-pic" alt="" src="${K.trSrc(s.tr)}"><div class="sf-mid"><b>${esc(s.cls)} ${esc(s.nm)}</b>${trtBox(s.trait)}
      <span class="sf-st">${s.rest ? '<em class="r">쉬는 중</em>' : ''}${K.inGym(s) ? `<em class="g">체육관 ${gNo(s) >= 0 ? gNo(s) + 1 + '번' : ''}</em>` : ''}${s.yard ? '<em class="y">훈련장 코치</em>' : ''}${!K.inGym(s) && !s.yard && !s.rest ? '<em>대기 중</em>' : ''}<i>${s.w || 0}승 ${s.l || 0}패</i></span>${teamIc(s.team)}</div><i class="sf-go">›</i></button>`).join('') || '<p class="sf-none sf-empty">아직 고용한 트레이너가 없어요.</p>'}</div>`;
  sh.innerHTML = `<h3>트레이너</h3>${tabs}${sfT === 'cand' ? cand : list}`;
  const dk = sh.querySelector('.cv-deck'); if (dk) dk.onscroll = () => { const i = Math.round(dk.scrollLeft / (dk.firstElementChild.offsetWidth + 12)); sh.querySelectorAll('.cv-dots i').forEach((d, j) => d.classList.toggle('on', i === j)); };
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.sft) { sfT = b.dataset.sft; redraw(); return; }
    if (b.dataset.no) return reject(C[+b.dataset.no]);
    if (b.dataset.hire) return hire(C[+b.dataset.hire]);
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
// 면접 창은 지원서 카드에 합쳤다 (경완 2026-10-28 '면접 보기 버튼을 고용하기 버튼으로')
const dropCand = c => { const g = st(); g.cands = (g.cands || []).filter(x => x !== c); };
function reject(c) {
  if (!c) return; dropCand(c); K.glog('sf', `지원자 ${esc(c.cls)} ${esc(c.nm)}${K.jong(c.nm) ? '을' : '를'} 돌려보냈다.`); K.save(); redraw();
}
function hire(c) {
  const g = st(); if (!c) return;
  if (g.sf.length >= K.staffMax()) return pop(`<h4>트레이너 자리가 꽉 찼어요</h4><p class="gy-msg">지금 ${g.sf.length}/${K.staffMax()}명이에요. 체육관 등급을 올리거나 한 명을 해고하면 고용할 수 있어요.</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => close());
  if (!spend(c.wage)) return say(`골드가 모자라요. 첫 주 월급 ${c.wage}G가 필요해요.`);
  const now = Date.now(); g.sf.push(Object.assign({}, c, { hired: now, pay: now + 7 * K.DAY, w: 0, l: 0, xp: 0 })); dropCand(c);
  K.glog('sf', `${esc(c.cls)} <b>${esc(c.nm)}</b>${K.jong(c.nm) ? '을' : '를'} 고용했다! <small>월급 ${c.wage}G</small>`); K.save(); redraw(); K.renderHome();
}

// ======================= 상점 (5단계) =======================
const SHOP_T = [['tm', '기술머신'], ['deco', '꾸미기'], ['fit', '의상']];   // 넓히기는 빼고 등급 따라 저절로 (경완 2026-10-28)
const tmPrice = x => x[3] === 2 ? 500 : (x[4] || 0) <= 50 ? 300 : x[4] <= 70 ? 700 : x[4] <= 85 ? 1200 : x[4] <= 100 ? 2000 : 3000;
function drawShop() {
  if (!SHOP_T.some(([k]) => k === shopT)) shopT = 'tm';
  sh.innerHTML = `<h3>체육관 상점</h3><div class="sp-tabs" role="tablist">${SHOP_T.map(([k, n]) => `<button role="tab" data-st="${k}" aria-selected="${shopT === k}">${n}</button>`).join('')}</div><div class="sp-body"></div>`;   // 탭은 다시 위 작은 탭 (경완 2026-10-28)
  const body = sh.querySelector('.sp-body');
  ({ tm: shopTm, deco: shopDeco, fit: shopFit })[shopT](body);
  const inner = body.onclick; body.onclick = null;
  sh.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.st) { sfx('tap'); shopT = b.dataset.st; redraw(); return; } inner?.(e, b); };
}
// 기술머신: 내 체육관 타입 포켓몬이 배울 수 있는 기술. 사면 창고(g.tms {기술: 개수})에 들어가고, 가르치기는 포켓몬 정보 창의 '기술 가르치기'에서 (경완 2026-10-27)
function shopTm(body) {
  const D = GB().D, g = st(), mons = S.box.filter(P => (SPECIES[P.sp]?.t || []).includes(g.ty)); g.tms = g.tms || {};
  const can = new Map(); mons.forEach(P => (D.sp[P.sp]?.tm || []).forEach(i => { if (!can.has(i)) can.set(i, []); can.get(i).push(P); }));
  const types = [...new Set([...can.keys()].map(i => D.mv[i][2]))].sort((a, b) => a - b);
  if (tmTy !== -1 && !types.includes(tmTy)) tmTy = -1;   // -1 = 전체 (경완 2026-10-27 '에스퍼 포켓몬이라고 에스퍼 기술만 배우는 건 아닌데')
  const L = [...can.keys()].map(i => D.mv[i]).filter(x => (tmTy === -1 || x[2] === tmTy) && (tmCat === -1 || x[3] === tmCat)).sort((a, b) => ((b[4] || 0) - (a[4] || 0)) * tmPow || a[2] - b[2]);
  body.innerHTML = `
    ${types.length ? `<div class="tm-row"><button class="fsel${tmTy !== -1 ? ' on' : ''}" data-f="ty">${tmTy === -1 ? '모든 타입' : TYPE_KO[tmTy]}</button><button class="fsel${tmCat !== -1 ? ' on' : ''}" data-f="cat">${tmCat === -1 ? '모든 형태' : ['물리', '특수', '변화'][tmCat]}</button><button class="tm-sort" data-pow="1">위력순 ${tmPow > 0 ? '▼' : '▲'}</button></div>` : `<p class="sf-none">${TYPE_KO[g.ty]} 타입 포켓몬이 아직 없어요.</p>`}
    ${types.length && !L.length ? '<p class="sf-none">조건에 맞는 기술머신이 없어요.</p>' : ''}
    <div class="sp-list">${L.map(x => `<button class="sp-tm" data-tm="${x[0]}"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png"><span class="tm-nm"><b>${esc(x[1])}</b>${g.tms[x[0]] ? `<i class="tm-own">×${g.tms[x[0]]}</i>` : ''}</span><span class="tm-meta">${GB().tyTag(x[2], x[3])}<small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}</small></span><em>${gold(tmPrice(x))}</em></button>`).join('')}</div>`;
  // 필터는 눌러서 고르는 목록으로 (경완 2026-10-28 '모든 항목을 나열하지 말고')
  // 필터: 도감처럼 단추를 누르면 목록 창 (경완 2026-10-28)
  const fPick = f => { const O = f === 'ty' ? [[-1, '모든 타입'], ...types.map(t => [t, TYPE_KO[t], t])] : [[-1, '모든 형태'], [0, '물리', null, 0], [1, '특수', null, 1], [2, '변화', null, 2]], v = f === 'ty' ? tmTy : tmCat;
    pop(`<h4>${f === 'ty' ? '타입' : '형태'}</h4><div class="tm-fopts">${O.map(([k, n, t, c]) => `<button data-a="${k}" aria-selected="${k === v}">${t != null ? GA.tyIcon(t) : ''}${c != null ? `<img class="fo-cat" alt="" src="${K.IMG}bt/cat_${c}.png">` : ''}${n}</button>`).join('')}</div>`, (a, close) => { close(); if (a == null || a === '') return; if (f === 'ty') tmTy = +a; else tmCat = +a; redraw(); }); };
  body.onclick = (e, b) => { sfx('tap'); if (b.dataset.f) return fPick(b.dataset.f); if (b.dataset.pow) { tmPow = -tmPow; redraw(); return; } if (b.dataset.tm) buyTm(b.dataset.tm, can); };
}
function buyTm(id, can) {
  const D = GB().D, g = st(), x = GB().mvOf(id), i = D.mv.indexOf(x), price = tmPrice(x), L = can.get(i) || [], n = g.tms?.[id] || 0;
  pop(`<h4><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">기술머신 · ${esc(x[1])}</h4><div class="mp-moves one">${GB().mvRow(x, '')}</div><p class="gy-msg">${esc(x[8] || '')}</p>
    <p class="gy-msg tm-who">배울 수 있는 포켓몬 ${L.length}마리${n ? ` · 가진 것 ${n}개` : ''}</p><div class="tm-mons">${L.slice(0, 18).map(P => `<span>${GB().thumb(P)}<small>${GB().gm(P).mv.includes(id) ? '앎' : 'Lv.' + GB().gm(P).lv}</small></span>`).join('')}</div>
    <div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="buy">${gold(price)} 사기</button></div>`, (a, close) => {
    if (a === 'x') return close(); if (a !== 'buy') return;
    if (!buy(price)) { close(); return say(`골드가 모자라요. ${price.toLocaleString()}G가 필요해요.`); }
    close(); g.tms = g.tms || {}; g.tms[id] = (g.tms[id] || 0) + 1; K.glog('tr', `기술머신 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 샀다.`); K.save(); redraw();
    say(`기술머신 ${esc(x[1])}${K.jong(x[1]) ? '을' : '를'} 창고에 넣었어요.`);   // 경완 2026-10-29 '여기까지만'
  });
}
// 꾸미기: 사면 빈 칸에 바로 놓인다. 놓인 것을 누르면 치우기, 가진 것을 누르면 놓기
function shopDeco(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.own = g.own || {}; g.dp = (g.dp || []).filter(Boolean);   // 개수 제한 없음 (경완 2026-10-28)
  const placed = g.dp;
  body.innerHTML = `
    <div class="dc-grid">${Object.entries(K.DECO).map(([k, o]) => { const lock = G < o.lv, own = g.own[k];
      return `<button data-dc="${k}" class="${own ? 'own' : ''}${lock ? ' lock' : ''}"><span class="dc-pic"><img alt="" src="${IMG}deco/${k}.png" class="${o.w > 16 ? 'big' : ''}"></span><b>${o.n}</b><em>${own ? (placed.includes(k) ? '놓여 있음' : '가지고 있음') : lock ? `${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}부터` : gold(o.g)}</em></button>`; }).join('')}</div>`;
  body.onclick = (e, b) => {
    sfx('tap');
    const k = b.dataset.dc; if (!k) return; const o = K.DECO[k];
    if (g.own[k]) { if (placed.includes(k)) g.dp.splice(placed.indexOf(k), 1); else g.dp.push(k); K.save(); redraw(); return; }
    if (G < o.lv) return say(`${K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n}이 되면 살 수 있어요.`);
    pop(`<h4>${o.n}</h4><div class="dc-big"><img alt="" src="${IMG}deco/${k}.png"></div><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`, (a, close) => {
      close(); if (a !== 'y') return; if (!buy(o.g)) return say('골드가 모자라요.');
      g.own[k] = 1; g.dp.push(k); K.save(); redraw(); });
  };
}
// 관장 의상: 앞모습은 옷 모양까지 새로 그린 그림, 맵·배틀 뒷모습은 옷 색만. 누르면 그 옷을 입은 전신 카드 (경완 2026-10-27)
function shopFit(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.fits = g.fits || {};
  const need = o => K.gradeOf([0, 100, 250, 450, 700, 1000][o.lv]).n;
  const row = (k, o) => { const own = !k || g.fits[k], on = (g.fit || '') === k, lock = o.lv && G < o.lv;
    return `<button data-fit="${k}" class="${on ? 'on' : ''}${lock ? ' lock' : ''}"><i class="ft-pic"><img alt="" data-fk="${k}"></i><b>${o.n}</b><em>${on ? '입는 중' : own ? '입기' : lock ? `${need(o)}부터` : gold(o.g)}</em></button>`; };
  body.innerHTML = `<div class="ft-grid">${row('', { n: '기본 옷' })}${Object.entries(K.OUTFITS).map(([k, o]) => row(k, o)).join('')}</div>`;
  body.querySelectorAll('img[data-fk]').forEach(im => K.fitSrc('tr', im.dataset.fk).then(u => { im.src = u; }));
  body.onclick = async (e, b) => {
    sfx('tap'); const k = b.dataset.fit; if (k == null) return; const o = k ? K.OUTFITS[k] : { n: '기본 옷' }, own = !k || g.fits[k], on = (g.fit || '') === k, lock = o.lv && G < o.lv;
    const btn = on ? '<div class="gy-btns one"><button data-a="x">입는 중</button></div>'
      : own ? '<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="w">입기</button></div>'
      : lock ? `<div class="gy-btns one"><button data-a="x">${need(o)}이 되면 살 수 있어요</button></div>`
      : `<div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`;
    K.bodyCard(await K.fitSrc('tr', k), o.n, own ? '' : lock ? '아직 살 수 없어요' : '사면 바로 입어요', btn, (a, close) => {
      close(); if (a === 'y' && !buy(o.g)) return say('골드가 모자라요.'); if (a === 'y') g.fits[k] = 1; g.fit = k; K.save(); redraw(); K.renderHome(); });
  };
}
window.GymManage = { tab, tickTrain, redraw };
})();
