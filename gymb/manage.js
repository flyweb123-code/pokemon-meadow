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
const nmOf = P => P.nm || SPECIES[P.sp]?.n || '???';   // 지어 준 이름 먼저 (경완 2026-10-31 '체육관 정보카드에서도 이름 바꾸기')
const onField = id => S.mons.some(m => m.pid === id);
const pop = (h, f) => { const p = K.pop(h, f); GB()?.fillTh(p); return p; };
const say = msg => K.say(msg);   // 체육관 홈과 같은 가운데 알림 (경완 2026-10-29 '팝업창 중앙 정렬')
const spend = n => { if (S.gold < n) return false; S.gold -= n; try { GA.renderGold(); } catch (e) {} K.renderGoldG(); K.save(); return true; };
const buy = n => { if (!spend(n)) return false; try { window.pkGold?.('gym', n); } catch (e) {} try { window.GymBGM?.se('DP_REGI'); } catch (e) {} return true; };   // 상점에서 살 때 본가 계산대 소리 (SEQ_SE_DP_REGI, 경완 2026-10-28)
const gold = n => `<i class="coin"></i>${n.toLocaleString()}G`;
// 포켓몬 정면 그림: 블랙·화이트 움직이는 gif (못 받으면 저장소 png 첫 칸)
const monImg = (sp, o = {}) => { const g = GB().gifUrl(sp, false, !!o.s, !!o.f), png = GB().pkSrc(sp, { s: o.s, f: o.f });
  return g ? `<img class="mi" alt="" src="${g}" onerror="this.onerror=null;this.src='${png}';this.classList.add('pn')">` : `<img class="mi pn" alt="" src="${png}">`; };
const owIc = ow => `<i class="ow-ic${K.owW(ow) > 16 ? ' w32' : ''}" style="background-image:url(${K.owSrc(ow)})"></i>`;
let shRec = null;   // v17.58 경완 '상점 추천받기': 고른 라인업 포켓몬 id (그 포켓몬 추천 항목만)
let sh = null, cur = null, shopT = 'tm', tmTy = 0, tmCat = -1, tmPow = 1, shopPr = 1;   // shopPr: 상점 가격순 (1 싼 순 · -1 비싼 순, 경완 2026-10-29)   // 기술머신: 타입·형태(물리 0 특수 1 변화 2) 필터, 위력순 (1 높은 순 · -1 낮은 순, 경완 2026-10-28)
function tab(t, el) { if (cur === 'shop' && t !== 'shop') shopLeave(); sh = el; cur = t; draw(); }
function draw() { if (!sh || !st()) return; sh.onclick = null; sh.classList.remove('ty-on'); ({ train: drawTrain, staff: drawStaff, shop: drawShop })[cur]?.(); GB()?.fillTh(sh); sh.classList.remove('lk'); if (K.lockedT?.(cur)) K.lockOv(sh, cur); }
const redraw = () => { if (sh && !sh.hidden) draw(); };

// ======================= 훈련장 (4단계) =======================
const TR_ALL = 6, trMax = () => Math.min(TR_ALL, K.gradeOf(st().rep || 0).i);   // 등급마다 한 칸씩: 새내기 0(잠김)·동네 1 … 전설 6 (경완 2026-10-29)
const trFull = () => trMax() < TR_ALL ? `지금 등급에선 ${trMax()}마리까지 보낼 수 있어요. 등급이 오르면 자리가 늘어요.` : '훈련장이 가득 찼어요. 6마리까지 보낼 수 있어요.';
const LOCK_SVG = '<svg viewBox="0 0 12 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="#6a6a7c" d="M3 1h6v1H3zM2 2h1v4H2zM9 2h1v4H9z"/><path fill="#20202c" d="M1 6h10v1H1zM0 7h1v6H0zM11 7h1v6h-1zM1 13h10v1H1z"/><path fill="#e8b820" d="M1 7h10v6H1z"/><path fill="#ffd640" d="M1 7h10v1H1z"/><path fill="#7a5a10" d="M5 9h2v3H5z"/></svg>';
// 1시간 경험치: 레벨 10 은 1시간에 약 1레벨, 레벨 50 은 약 0.2레벨 (경완 기획 밸런스). 훈련광 트레이너가 있으면 +20%
function perHour(P) { const m = GB().gm(P), g = GB().growth(P.sp); if (m.lv >= GB().LV_MAX) return 0; const need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  return need * Math.min(.35, 3 / Math.max(1, m.lv)) * coachX(); }
// v20.45 경완 '코치 보너스는 고용 트레이너 개체마다 다르게': 코치 실력 s.cs = 10~40% (지원할 때 정해짐, 예전 트레이너는 id 로 고정 값), 훈련광은 2배. 훈련장 코치로 있을 때만
// 예전 규칙(코치 +25%, 훈련광 코치 +50%, 고용만 한 훈련광 +20%)은 없앰. 경험치와 노력치 훈련 둘 다 이 배율
const coachSk = s => s.cs ?? (10 + (Math.abs((s.id | 0) * 2654435761 | 0) % 31));
/* v21.83 경완 '코치 특성 수치도 트레이너 개체별로': 특성 세기 s.tv 0~100 (예전 트레이너는 id 로 고정) → 훈련광·기술 선생·다정함 ×1.5~2.5, 노력파 ×1.3~1.7 */
const trV = s => (s.tv ?? ((Math.imul((s.id | 0) ^ 0x5bd1e995, 2654435761) >>> 7) % 101)) / 100;
const trM = s => { const v = trV(s), m = { train: 1.5 + v, teach: 1.5 + v, kind: 1.5 + v, effort: 1.3 + .4 * v }[s.trait]; return m ? Math.round(m * 20) / 20 : 1; };
const coachP = s => { const k = coachK(s), p = coachSk(s) * (s.trait === 'train' ? trM(s) : 1) * (k === 'mv' ? 2 : 1), m = s.trait === 'effort' && k === 'ev' || s.trait === 'teach' && k === 'mv' ? trM(s) : 1; return Math.round(m === 1 ? p : ((1 + p / 100) * m - 1) * 100); };   /* v21.82 경완 '노력치는 한번에 수치로': 노력파(노력치 코치 ×1.5)·기술 선생(기술 코치 ×2)도 코치 % 하나에 합쳐 보임 */   // v20.95 경완 OK: 기술 코치는 효과 2배 (특별한 기술이 원래 일주일에 1개라 체감되게)
const coaches = () => (st().sf || []).filter(s => s.yard && !s.rest);
// v20.92 경완 '코치 실력을 노력치 잘 올리는·경험치 잘 올리는·기술 잘 가르치는 트레이너로 나누자': 트레이너마다 코치 종류 하나, 실력 %는 그 종류에만
const CK = { xp: ['경험치', '#2a7ad0'], ev: ['노력치', '#d0601a'], mv: ['기술', '#8a46c8'] }, CK_O = ['xp', 'ev', 'mv'];
const coachK = s => s.ck || { train: 'xp', effort: 'ev', teach: 'mv' }[s.trait] || CK_O[Math.abs(Math.imul(s.id | 0, 40503)) % 3];   // 훈련광=경험치, 노력파=노력치, 기술 선생=기술, 나머지는 id 로 고정
const CK_W = [1, .6, .3];   // v20.94 경완 '코치 3명까지, % 밸런스': 같은 종류 코치는 겹칠수록 덜 (센 순서로 100%·60%·30%) — 셋 다 경험치면 최대 +76%(훈련광 둘이면 더), 종류를 나누면 각자 그대로
const coachX = (k = 'xp') => 1 + coaches().filter(s => coachK(s) === k).map(coachP).sort((a, b) => b - a).reduce((a, p, i) => a + p * (CK_W[i] ?? 0) / 100, 0);
const CK_BG = { xp: '#eaf2fc', ev: '#fdf0e6', mv: '#f4ecfb' }, CK_D = { xp: '훈련 경험치가', ev: '노력치 훈련이', mv: '특별한 기술 깨달음이' };
// v21.04 경완 '코치 실력 박스는 특성 박스처럼, 게이지 없이, 특성 대신 코치 딱지, 종류는 딱지 없이 색으로만'
const ckBox = (s, full, bare) => { const k = coachK(s), p = coachP(s); return `<span class="trt trt-ck" style="--tc:${CK[k][1]};--tb:${CK_BG[k]}">${bare ? '' : '<b>코치</b>'}<i>${CK[k][0]} +${p}%</i>${full ? `<small>${CK_D[k]} ${p}% 더 빨리</small>` : ''}</span>`; };
const ckIn = s => `<em class="ck-t ck-in" style="--ck:${CK[coachK(s)][1]}">${CK[coachK(s)][0]}</em>`;   // v21.01 경완 '훈련장 코치 딱지에도 종류'
const ckTag = s => `<em class="ck-t" style="--ck:${CK[coachK(s)][1]}">${CK[coachK(s)][0]}</em>`;
const coachSum = () => CK_O.map(k => [k, Math.round((coachX(k) - 1) * 100)]).filter(x => x[1] > 0).map(([k, p]) => `<span class="trt trt-ck" style="--tc:${CK[k][1]};--tb:${CK_BG[k]}"><b>코치</b><i>${CK[k][0]} +${p}%</i></span>`).join('');
const coachN = (t, k) => coaches().filter(s => s.trait === t && (!k || coachK(s) !== k)).reduce((a, s) => a + trM(s) - 1, 0);   /* v21.83: 사람 수 대신 각자 특성 세기 (×2 = 1) */   /* k: 그 코치 종류면 이미 coachP 에 합쳐져 빼고 셈 */   // 훈련장 특성: 기술 선생(teach) 특별한 기술 ×2, 노력파(effort) 노력치 +50%, 다정함(kind) 친밀도 ×2 — 코치로 있을 때
const EV_DAY = 8;   // 노력치 훈련: 하루 8 (3시간에 1) × 코치 실력 (경완 2026-11-09)
const YARD_SF = 3;   // v20.94 경완: 훈련장 코치 3명까지
// 특별한 기술 = 포켓로그 알 기술 (v19.50 경완 '포켓로그 알 기술 목록에 있는거 배울 수 있게, 기댓값은 일주일에 1개 정도'):
// gym/egg.json (tools/gym/mkegg.js) 의 4개 중 아직 모르는 것 하나. 4번째는 포켓로그의 레어 알 기술이라 뽑힐 몫을 ¼ 로.
const SP_P = 1 / 168;   // (v20.85 부터 안 씀) 훈련 1시간마다 (v19.57 쉬지 않고 24시간 × 7일 = 168시간에 1개쯤)
const EG_H = 300, EG_SIDE = 1 / 6;   // v20.85 집중 기술 하루 8%(코치 없을 때 약 12일), 나머지 ⅙. 배틀 번뜩임과 합쳐 일주일쯤에 하나   // v20.85 깨달음 게이지: 집중 칸은 200시간(약 8일)에 다 참, 나머지 칸은 ⅙ 속도, 기술 선생 코치마다 ×2
const TR_H = 24;   /* v19.57 경완 '체육관 훈련은 그냥 쉬는시간 없이 계속하게': 하루 8시간 상한 → 하루 내내 */
const TR_K = 8 / TR_H;   /* v19.59 경완 '시간만 그냥 늘리고 양은 원래대로': 하루에 쌓이는 경험치·친밀도는 예전 8시간 그대로 (1시간 몫 = ⅓) */
function special(P) {
  const D = GB().D, m = GB().gm(P), E = GB().EGG?.[P.sp] || [];
  const L = E.map((id, i) => [id, i === 3 ? .25 : 1]).filter(([id]) => id && GB().mvOf(id) && !m.mv.includes(id) && !(m.kn || []).includes(id));
  let r = Math.random() * L.reduce((a, x) => a + x[1], 0), pk = null; for (const x of L) { if ((r -= x[1]) <= 0) { pk = x[0]; break; } } pk = pk || L.at(-1)?.[0]; if (!pk) return null;
  const x = GB().mvOf(pk); GB().teach(m, x[0], null, false); return x;
}
const trFr = P => { try { return GA.frHr(P.sp) || .5; } catch (e) { return .5; } };   /* v16.42 경완 '친밀도 오르는건 필드 기준': 잘 돌본 필드와 같은 시간당 속도 (FR_TABLE 맨 위 × 포켓몬별 배수) */
/* 날짜별 훈련 기록: g.tlog[포켓몬 id] = {하루 시작: {h 시간, x 경험치, lv 오른 레벨, f 친밀도, mv [새 기술]}} (60일) */
const EV_SC = ['#e85a5a', '#ef8a3a', '#e0b020', '#4a7ad8', '#3e9a52', '#d8508a'];   // v20.78 슬롯 능력치 훈련 딱지 색 (HP·공격·방어·특공·특방·스피드)
const trLog = id => (st().tlog || {})[id] || {};
function trDay(id, dk) { const g = st(), L = g.tlog || (g.tlog = {}), T = L[id] || (L[id] = {}); if (!T[dk]) { T[dk] = { h: 0, x: 0, lv: 0, f: 0, mv: [] }; const ks = Object.keys(T).map(Number).sort((a, b) => b - a); ks.slice(60).forEach(k => delete T[k]); } return T[dk]; }
function tickTrain(now) {
  const g = st(); if (!g?.tr?.length || !GB()?.D) return;
  const H = K.H;
  g.tr = g.tr.filter(e => {
    const P = boxOf(e.id); if (!P) return false;
    if (onField(e.id)) { K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '은' : '는'} 필드로 나가서 훈련장에서 빠졌다.`, now); return false; }
    let t = e.t, hrs = 0; const seg = [];   /* v16.41 경완 '오늘 훈련으로 경험치·레벨·친밀도·새 기술, 날짜별 훈련 일지': 날마다 나눠서 기록 */
    while (t < now) { const d0 = K.dayStart(t), de = K.nextDay(t); if (e.d !== d0) { e.d = d0; e.h = 0; } const use = Math.min((Math.min(now, de) - t) / H, Math.max(0, TR_H - e.h)); e.h += use; hrs += use; if (use > 0) seg.push([d0, use]); t = Math.min(now, de); }
    e.t = now; if (hrs <= 0) return true;
    const lv0 = GB().gm(P).lv, got = [];
    for (const [dk, sh] of seg) { const R = trDay(P.id, dk), lvA = GB().gm(P).lv; R.h += sh;
    for (let left = sh; left > 1e-6; left -= 1) {
      const step = Math.min(1, left), tot = perHour(P) * TR_K * step + (e.fx || 0), n = Math.floor(tot); e.fx = tot - n;
      e.fa = (e.fa || 0) + step * TR_K * trFr(P) * (1 + coachN('kind')); while (e.fa >= 1) { e.fa -= 1; if ((P.fr || 0) < 255) { P.fr = Math.min(255, (P.fr || 0) + 1); R.f += 1; } }   /* 필드처럼 쌓이다 1이 차면 +1 */
      if (n > 0) { e.x = (e.x || 0) + n; R.x += n; GB().gainXp(P, n, 'keep').learned.forEach(([id]) => { got.push(GB().mvKo(id)); (e.mv = e.mv || []).push(id); R.mv.push(id); }); }
      if (e.evk >= 0 && GB().evOn?.()) { e.efx = (e.efx || 0) + step * EV_DAY / TR_H * coachX('ev') * (1 + .5 * coachN('effort', 'ev')); const n = Math.floor(e.efx); if (n > 0) { e.efx -= n; e.evg = (e.evg || 0) + GB().evAdd(GB().gm(P), e.evk, n); } }   // v20.45 노력치 훈련
      { const f = GB().egFocus(P); if (f >= 0) { const sp = step * 100 / EG_H * (1 + coachN('teach', 'mv')) * coachX('mv'); for (const r of GB().egOpen(P)) { const x = GB().egAdd(P, r.i, r.i === f ? sp : sp * EG_SIDE); if (!x) continue;   /* v20.85 깨달음 게이지 */
        (e.mv = e.mv || []).push(x[0]); R.mv.push(x[0]); if (st().sf.some(s => s.yard && !s.rest)) (R.cm = R.cm || []).push(x[0]); else (R.sm = R.sm || []).push(x[0]);
        K.awMv?.(P.id, x[0], x[1], x[2]); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '이' : '가'} 훈련장에서 특별한 기술 <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 익혔다! <small>기술 바꾸기에서 쓸 수 있어요</small>`, now); } } }
    }
    R.lv += GB().gm(P).lv - lvA; R.to = GB().gm(P).lv; }
    const lv = GB().gm(P).lv;
    if (lv > lv0) K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '이' : '가'} 훈련으로 Lv.${lv}${/[036]$/.test(String(lv)) ? '이' : '가'} 됐다!${got.length ? ` <small>새 기술: ${got.map(esc).join(', ')}</small>` : ''}`, now);
    return true;
  });
}
// 훈련장 = 화면 가득한 체육관 뒤뜰 (경완 피드백 2026-10-27 '꾸미기 모드 필드처럼', '미사여구 다 빼고 전체 화면, 퀄리티 필드 수준', '필드랑 너무 비슷하다').
// 체육관 건물 벽·모래 코트(배틀 코트 선)·돌 수영장·벤치·타이어. 기구는 본게임 필드와 같은 도트 그림 도구(GA.art: ART 덩어리·외곽선)로 그린다. 포켓몬은 필드와 같은 걸음 그림(GA.pmd)·크기.
// 포켓몬이 돌아다니며 기구를 치고, 둘씩 대련하고, 쉬고, 오늘 8시간을 다 쓰면 잔다. 경험치 계산은 tickTrain 그대로(화면은 보여 주기만).
const leftOf = e => e.d === K.dayStart(Date.now()) ? Math.max(0, TR_H - e.h) : TR_H;
let Y = null;   // 마당: { el, W, H, L, pr: {소품}, mons, raf, last, pos: {id: [x, y]}, pond, court }
const inPond = (x, y, m = 0) => { const p = Y.pond; return x > p.x0 - m && x < p.x1 + m && y > p.y0 - m && y < p.y1 + m; };   // 수영장(네모)
const yTop = () => 138;   // 체육관 벽 아래부터 걸어 다님
const nearBush = (x, y) => Math.abs(x - Y.W / 2) < 120 && y < yTop() + 56;   // v20.85 문 옆 덤불 앞은 기술·훈련 자리로 안 씀 (경완 '덤불에 공격')
function yardSpot(swim) {
  if (swim) { const p = Y.pond; return [p.x0 + 22 + Math.random() * Math.max(1, p.x1 - p.x0 - 44), p.y0 + 32 + Math.random() * Math.max(1, p.y1 - p.y0 - 44)]; }   // v21.01 경완 '가비루사 왜 육지로': 예전엔 훈련장 전체에서 60번 뽑다 다 빗나가면(약 1%) 땅 자리로 → 물 안에서만 뽑음
  for (let i = 0; i < 60; i++) { const x = 24 + Math.random() * (Y.W - 48), y = yTop() + Math.random() * (Y.H - yTop() - 20);
    if (swim ? inPond(x, y - 10, -22) : !inPond(x, y, 16) && !nearBush(x, y) && !Object.values(Y.pr).some(q => Math.abs(q.x - x) < q.w / 2 + 10 && y < q.y + 8 && y > q.y - 24)) return [x, y]; }
  return [Y.W * .3, Y.H * .6];
}
// 훈련장 소품 = 스칼렛 작업물 그림 (gymb/yard.json, config/staff/scarlet.json 에서 골라 옮김 + 후프링) (경완 2026-10-29 '스칼렛 작업물 수준으로, 가져와도 돼')
let YA = null, YAP = null;
const loadYA = () => YAP || (YAP = fetch(`gymb/yard.json?v=${VER}`).then(r => r.json()).then(j => (YA = j)).catch(() => (YAP = null, {})));
// 훈련장 그림은 한 번 만든 걸 다시 쓴다 — 메뉴를 열 때마다 새로 그려서 잠깐 비어 보이던 것 (경완 2026-10-29)
const PXC = new WeakMap(), pxCv = (px, pal) => PXC.get(px) || (PXC.set(px, pxCv0(px, pal)), PXC.get(px));
const pxCv0 = (px, pal) => { const h = px.length, w = px[0].length, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
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
// 물 위에 뜬 과녁 (경완 2026-10-29 '튜브 말고 타겟처럼'): 작은 나무 뗏목 위에 세운 동그란 과녁판 (흰·빨강 동심원 + 노란 한가운데), 뗏목 아래는 물에 잠기고 둘레 물결
function buoyArt() {
  if (BUOY) return BUOY; const w = 32, h = 34, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  // 뗏목 (비스듬히 본 타원, 아래쪽 물에 잠김)
  const cx = 15.5, ry0 = 26, RX = 13, RY = 4.5, wl = 28;
  for (let a = 0; a < 6.283; a += .05) { const x = Math.round(cx + Math.cos(a) * (RX + 2)), y = Math.round(wl + 1.5 + Math.sin(a) * 3); if (Math.sin(a) > -.3) px(x, y, Math.sin(a) > .5 ? '#a8dcfa' : '#e4f6ff'); }   // 물결
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x + .5, Y = y + .5, e = ((X - cx) / RX) ** 2 + ((Y - ry0) / RY) ** 2, e2 = ((X - cx) / RX) ** 2 + ((Y - ry0 - 2) / RY) ** 2;
    let col = null;
    if (e <= 1) col = e > .78 ? '#3a2410' : (Math.floor((X - cx + 40) / 4.5) % 2 ? '#c08a52' : '#dcae70');   // 윗면 판자
    else if (e2 <= 1 && Y > ry0) col = e2 > .8 ? '#3a2410' : '#8e5c32';   // 옆면
    if (col && Y > wl + .5) col = col === '#3a2410' ? 'rgba(20,50,90,.55)' : '#4a7aa8';
    if (col) px(x, y, col); }
  // 다리 두 개
  for (const lx of [10, 20]) for (let y = 17; y < 26; y++) { px(lx, y, '#3a2410'); px(lx + 1, y, '#8e5c32'); px(lx + 2, y, '#3a2410'); }
  // 과녁판 (정면, 동심원)
  const tx = 15.5, ty = 10.5, R = 10;
  for (let y = 0; y < 22; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + .5 - tx, y + .5 - ty); if (d > R) continue;
    const lt = (x + .5 - tx) + (y + .5 - ty) > 3;   // 오른쪽 아래 그늘
    let col = d > R - 1 ? '#20202c' : d > 8 ? (lt ? '#dcd6c6' : '#ffffff') : d > 6 ? (lt ? '#b8322a' : '#e04a3c') : d > 4 ? (lt ? '#dcd6c6' : '#ffffff') : d > 2.2 ? (lt ? '#b8322a' : '#e04a3c') : (lt ? '#e8b820' : '#ffd640');
    px(x, y, col); }
  px(10, 5, '#ffffff'); px(11, 4, '#ffffff'); px(12, 4, '#ffffff');   // 반짝
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
let YBG = null;
function yardBg(c) {
  const key = `${Y.W}x${Y.H}:${st().ty}:${new Date().getMonth()}`;
  if (YBG?.key === key) { c.width = YBG.cv.width; c.height = YBG.cv.height; c.getContext('2d').drawImage(YBG.cv, 0, 0); return; }
  yardBg0(c); const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); YBG = { key, cv };
}
function yardBg0(c) {
  const { ART, seasonCv } = GA.art(), PW = c.width = Math.ceil(Y.W / 2), PH = c.height = Math.ceil(Y.H / 2), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  let seed = 23; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 점 하나마다 fillRect 를 부르면 느린 폰에서 훈련장이 늦게 떴다 (경완 2026-10-30 '훈련장 여전히 지연'): 픽셀 배열에 직접 쓰고 한 번에 올린다
  let im = g.createImageData(PW, PH), D = im.data; const CC = {};
  const rgba = col => CC[col] || (CC[col] = col[0] === '#' ? [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16), 1] : col.match(/[\d.]+/g).map(Number));
  const px = (x, y, w, h, col) => { const [r0, g0, b0, a] = rgba(col), X0 = Math.max(0, Math.round(x)), Y0 = Math.max(0, Math.round(y)), X1 = Math.min(PW, Math.round(x) + w), Y1 = Math.min(PH, Math.round(y) + h);
    for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) { const i = (yy * PW + xx) * 4; if (a >= 1) { D[i] = r0; D[i + 1] = g0; D[i + 2] = b0; D[i + 3] = 255; } else { D[i] += (r0 - D[i]) * a; D[i + 1] += (g0 - D[i + 1]) * a; D[i + 2] += (b0 - D[i + 2]) * a; D[i + 3] = Math.max(D[i + 3], 255 * a); } } };
  const flush = () => g.putImageData(im, 0, 0);
  const put = (cv, x, y) => { flush(); g.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height)); im = g.getImageData(0, 0, PW, PH); D = im.data; };
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
  for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if ((x / 3) ** 2 + (y / 2) ** 2 <= 1) px(mx + x, my + y, 1, 1, (x / 3) ** 2 + (y / 2) ** 2 > .5 ? '#3a3a48' : '#ffffff');
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
  flush(); try { seasonCv(c, 'bg', { ox: 0, oy: 0 }); } catch (e) {}
}
// 훈련장 다시 꾸미기 (경완 2026-10-29): 6마리가 서로 다른 기구에서 — 샌드백 둘·과녁(기술 쏘기)·트램펄린·허들 달리기·후프링(나는 포켓몬)·수영장(물)·가운데 코트 대련 둘·벤치 쉬기
async function drawTrain() {
  const g = st(); g.tr = g.tr || []; tickTrain(Date.now()); K.save();
  const yk = g.tr.map(e => e.id).join() + '|' + (g.sf || []).filter(x => x.yard).map(x => x.id).join() + '|' + CK_O.map(k => coachX(k)).join();
  if (Y && !Y.el.isConnected && Y.yk === yk && !sh.classList.contains('lk')) {   // v20.91 경완 '다른 메뉴 갔다 오면 순간이동 → 꾸미기 필드처럼': 다른 메뉴에 있는 동안에도 움직임은 계속 계산했으니 그 훈련장을 그대로 다시 붙임
    cancelAnimationFrame(Y.raf); clearTimeout(Y.pz); sh.classList.add('ty-on'); sh.scrollTop = 0; Y.el.querySelectorAll('.wob,.swing').forEach(q => q.classList.remove('wob', 'swing')); sh.innerHTML = ''; sh.append(Y.el); sh.onclick = yardTap;   /* v21.03 경완 '다른 메뉴 갔다 오면 소품이 한 번 흔들림': 다시 붙이면 남아 있던 흔들림 애니메이션이 다시 돌아서 지움 */
    if (Math.abs((Y.el.clientWidth || 360) - Y.W) < 3 || Y.W === 280) { Y.last = 0; Y.mons.forEach(m => { m.fk = null; }); Y.raf = requestAnimationFrame(yardLoop); return; } }
  if (Y) { Y.mons.forEach(m => { Y.pos[m.id] = [m.x, m.y]; }); cancelAnimationFrame(Y.raf); clearTimeout(Y.pz); }
  sh.classList.add('ty-on'); sh.scrollTop = 0;
  sh.innerHTML = `<div class="ty-yd ty-wait"><canvas class="ty-bg"></canvas><div class="ty-l"></div><button class="ty-add${g.tr.length ? '' : ' pulse'}" data-add="1" aria-label="포켓몬 보내기"><b>+</b><small>${g.tr.length}/${trMax()}</small></button></div>`;
  const el = sh.querySelector('.ty-yd');   /* v21.07 경완 '훈련장 처음 들어갈 때 노랗게 보였다가': 바닥 그림·조명이 다 그려질 때까지 가려 둠 (.ty-wait) */ await loadYA(); if (!el.isConnected) return;
  const W = Math.max(280, el.clientWidth || 360), H = Math.max(520, el.clientHeight || 640);
  Y = { el, W, H, L: el.querySelector('.ty-l'), pr: {}, mons: [], pos: Y?.pos || {}, last: 0,
    pond: { x0: 16, y0: H * .74, x1: W * .54, y1: H - 16 }, court: { x0: 22, y0: H * .43, x1: W - 22, y1: H * .63 } };
  Y.pond.x = (Y.pond.x0 + Y.pond.x1) / 2; Y.pond.y = (Y.pond.y0 + Y.pond.y1) / 2;
  { const bg = el.querySelector('.ty-bg'), y0 = Y, show = () => el.classList.remove('ty-wait'); if (YBG?.key === `${W}x${H}:${st().ty}:${new Date().getMonth()}`) { yardBg(bg); requestAnimationFrame(show); } else requestAnimationFrame(() => setTimeout(() => { if (bg.isConnected && Y === y0) yardBg(bg); requestAnimationFrame(show); }, 0)); }   // 바닥 그림은 화면이 먼저 뜬 다음에 (처음 한 번만 무겁다)
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
  Y.co = g.sf.filter(x => x.yard).slice(0, YARD_SF).map((x, i) => { const q = document.createElement('i'), cx = W * [.1, .9, .5][i], cy = H * (i === 2 ? .68 : .6); q.className = 'ty-co' + (K.owW(x.ow) > 16 ? ' w32' : ''); q.dataset.co = i;
    q.style.cssText = `left:${cx}px;top:${cy}px;z-index:${Math.round(cy)};background-image:url(${K.owSrc(x.ow)})`; Y.L.append(q); return { s: x, el: q, x: cx, y: cy, nx: performance.now() / 1000 + 1 + i * 1.7, fw: K.owW(x.ow) * 2, i, tg: null, tn: 0, d: 'd', fx: 1, snap: 1, hx: cx, hy: cy }; });   // v17.69 경완 '켤 때마다 같은 자리에서 걸어감': 처음엔 고른 포켓몬 옆에 바로 서 있음
  // v17.77 경완 '훈련장에도 필드처럼 날씨·시간, 어두워지면 조명': 필드와 같은 곱하기 색(GA.light) + 가로등 3개 + 비·눈
  Y.lp = [[14, H * .42], [W - 14, H * .42], [Y.pond.x1 + 14, Y.pond.y0 - 6]].map(([x, y]) => { const q = document.createElement('i'); q.className = 'ty-lp'; q.style.cssText = `left:${x}px;top:${y}px;z-index:${Math.round(y)}`; Y.L.append(q); return { x, y, el: q, dx: x < W / 2 ? 1 : -1 }; });
  // v17.81 경완 '체육관 처마 밑에도 조명': 기둥마다·문 양옆 벽등 (처마 바로 밑), 켜지면 벽과 벽 앞 땅을 밝힘
  { const PW = Math.ceil(W / 2), xs = [PW / 2 - 19, PW / 2 + 19]; for (let x = 8; x < PW; x += 46) if (Math.abs(x - PW / 2) >= 30) xs.push(x + 2.5);
    Y.wl = xs.map(hx => { const x = Math.round(hx * 2), q = document.createElement('i'); q.className = 'ty-wl'; q.style.cssText = `left:${x}px;top:35px;z-index:40`; Y.L.append(q); return { x, y: 35, el: q }; }); }
  // v17.85 모양 그림자: 기구(.ty-pr, 움직이는 칸 포함)는 같은 그림을 검게 본떠 발밑에서 눕힘. 가로등은 막대, 코치는 지금 걸음 칸을 따라감(yardLoop)
  Y.L.querySelectorAll('.ty-pr').forEach(q => { const d = q.cloneNode(true); d.className = 'ty-cs'; d.style.zIndex = ''; d.style.transform = ''; d.querySelectorAll('*').forEach(x => { x.style.animation = 'none'; }); Y.L.append(d); });
  Y.lp.forEach(l => { const d = document.createElement('i'); d.className = 'ty-cs cs-lp'; d.style.cssText = `left:${l.x}px;top:${l.y}px`; Y.L.append(d); });
  /* v18.02 경완: 코치는 모양 그림자 없이 필드 포켓몬처럼 발밑 그림자만 */
  el.insertAdjacentHTML('beforeend', '<i class="ty-nt"></i><i class="ty-glow"></i><i class="ty-wx"></i>'); yLight();
  sh.onclick = yardTap;
  { const cs = coachSum(); if (cs) el.insertAdjacentHTML('beforeend', `<div class="ty-info ty-ck">${cs}</div>`); }   // v20.92 종류별 · v21.06 경완 '고용 관리 박스 코치 딱지처럼'
  Y.yk = yk; Y.raf = requestAnimationFrame(yardLoop);
}
// v20.99 경완 '+ 눌러도 화면 안 뜸·포켓몬 눌러도 상세카드 안 뜸': 다른 메뉴가 sh.onclick 을 바꿔 두므로 훈련장을 다시 붙일 때도 꼭 다시 단다
function yardTap(ev) {
    const c = ev.target.closest('[data-co]'); if (c) { sfx('tap'); const o = Y.co[+c.dataset.co]?.s; if (o) sfDetail(o); return; }
    const t = ev.target.closest('[data-p],[data-add]'); if (!t) return; sfx('tap');
    if (t.dataset.add) return statPop();   // + = 훈련 현황 겸 슬롯 (경완 2026-10-29)
    trPop(+t.dataset.p || t.dataset.p);
}
const TY_SHOT = new Set([8, 10, 11, 12, 13, 14, 15, 16, 18]);   // 과녁에 기술을 쏘는 타입 (고스트·불꽃·물·풀·전기·에스퍼·얼음·드래곤·페어리)
function yardMon(P, e, i) {
  const t = SPECIES[P.sp]?.t || [], o = document.createElement('div');
  o.className = 'ty-m' + ({ S: ' rkS', A: ' rkA' }[GA.rankOf?.(P)] || ''); o.dataset.p = P.id;   /* v21.09 경완 '훈련장에도 꾸미기 필드처럼 랭크 후광 (S 금빛·A 빨간빛)' */ o.innerHTML = '<i class="ty-sh"></i><div class="ty-fl"><i class="ty-sp"></i></div><div class="ty-tag"></div>';
  // 물고기 포켓몬은 처음부터 수영장에서, 수영장에만 있다 (경완 2026-10-27)
  const fish = !!GA.isFish?.(P.sp), p0 = Y.pos[P.id], [x, y] = p0 && (!fish || inPond(p0[0], p0[1], -14)) ? p0 : yardSpot(fish); Y.L.append(o);
  const m = { id: P.id, P, e, el: o, fl: o.querySelector('.ty-fl'), sp: o.querySelector('.ty-sp'), shd: o.querySelector('.ty-sh'), tag: o.querySelector('.ty-tag'), x, y, face: Math.random() < .5 ? 1 : -1, st: leftOf(e) <= 0 ? 'sleep' : 'rest', until: performance.now() / 1000 + (leftOf(e) <= 0 ? 99 : .5 + Math.random() * 2), at: 0,   /* v18.02 경완 '훈련 끝났는데 들어가면 다시 깨어 있고 코치가 갔다가 돌아감': 오늘 훈련 다 한 포켓몬은 처음부터 잠든 채 */
    swimmer: t.includes(11), fish, flyer: t.includes(3) || (GA.lift?.(P.sp) || 0) > 8, fighter: t.includes(2), shooter: t.some(x => TY_SHOT.has(x)), ty: t[0], air: 0, D: null };
  Y.mons.push(m); place(m); try { yTag(m); } catch (x) {}
  (GA.pmdMx || GA.pmd)?.(P.sp, P.sex).then(D => { if (!Y.mons.includes(m)) return; m.D = D;   /* v20.81 펀치·킥·물기 같은 기술 동작 그림까지 */
    if (D.P) { const [w, h] = D.wh, s = D.s; m.s = s; Object.assign(m.sp.style, { backgroundImage: `url("${D.P.i}")`, backgroundSize: `${w * s}px ${h * s}px` }); if (P.shiny) m.sp.style.filter = `hue-rotate(${GA.shinyHue(P.sp)}deg)`; GA.shBg?.(m.sp, P, D.P.i); m.fk = '';
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
function yEmo(m, ch, cls = '', col) { const q = document.createElement('i'); q.className = 'ty-emo ' + cls; q.textContent = ch; if (col) q.style.color = col; q.style.top = ((m.top ?? -40) - 22 - (m.air || 0)) + 'px'; m.el.append(q); setTimeout(() => q.remove(), 1300); }
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
  if (m.st === 'eat') { const b = Y.fd?.bw.find(b => b.m === m); if (b) { b.done = 1; b.el.style.backgroundImage = `url(${pxCv(BOWL0, BOWL_P)})`; } yEmo(m, '♥', 'mu'); m.st = 'rest'; }
  m.k = null; m.air = 0; m.one = null; m.zb = 0;
  if (leftOf(m.e) <= 0) { m.st = 'sleep'; m.until = now + 99; return; }   // 오늘 8시간 다 쓴 포켓몬은 그 자리에서 잠
  if (Y.fd?.st === 1) { const b = Y.fd.bw.find(b => b.m === m && !b.done); if (b) return yGo(m, 'feed' + m.id, b.x, b.y - 5, 'eat'); }   // v20.86 밥 시간
  if (m.fish) { const q = Y.pr.water; if (!yBusy('water', m) && Math.random() < .6) return yGo(m, 'water', q.x - 44, q.y - 2, 'buoy'); const [sx, sy] = yardSpot(true); return yGo(m, 'swim', sx, sy, 'rest'); }
  // 대련: 아직 대련 상대가 없고 코트가 비어 있으면 30%
  const mates = Y.mons.filter(o => o !== m && !o.fish && !o.mate && o.st !== 'eat' && !(o.st === 'go' && String(o.k).startsWith('feed')) && leftOf(o.e) > 0 && (o.st === 'rest' || now > o.until - 1.5));
  if (!Y.mons.some(o => o.k === 'spar') && mates.length && Math.random() < .3) { const o = K.pick(mates), C = Y.court, cx = (C.x0 + C.x1) / 2 + (Math.random() - .5) * 60, cy = (C.y0 + C.y1) / 2 + (Math.random() - .5) * 20;
    o.one = null; o.air = 0; m.mate = o; o.mate = m; m.lead = true; o.lead = false; yGo(m, 'spar', cx - 30, cy, 'spw'); yGo(o, 'spar', cx + 30, cy, 'spw'); return; }
  const W8 = [];   // [기구, 무게]
  const add = (k, w) => { if (w > 0 && !yBusy(k, m)) W8.push([k, w]); };
  if (m.flyer) { add('hoop', 4); add('tgt', m.shooter ? 2 : .5); add('bag1', 1); add('bag2', 1); }
  else { add('bag1', m.fighter ? 4 : 1.4); add('bag2', m.fighter ? 4 : 1.4); add('tgt', m.shooter ? 4 : .6); add('tramp', 1.6); add('run', 1.8); if (m.swimmer) add('water', 3); }
  if (Math.random() < .2 && m.D?.P) { const [sx, sy] = yardSpot(false); return yGo(m, 'drill' + m.id, sx, sy, 'drill'); }   // v20.89 몸 풀기: 빙글빙글·구르기·점프
  if (GA.mvFx && yMove(m) && Math.random() < .28) { const [sx, sy] = yardSpot(false); return yGo(m, 'tech' + m.id, sx, sy, 'tech'); }   // v20.81 기술 연습: 빈 자리로 가서 아는 기술을 차례로
  if (!W8.length) { if (nearBush(m.x, m.y)) { const [sx, sy] = yardSpot(false); return yGo(m, 'train', sx, sy, 'train'); } m.st = 'train'; m.k = null; m.face = m.x > Y.W / 2 ? 1 : -1; m.until = now + 4 + Math.random() * 3; return; }   // 다 차 있으면 그 자리에서 섀도 훈련
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
  else if (T === 'tech') { m.st = 'tech'; m.face = m.x > Y.W / 2 ? 1 : -1; m.until = now + 7 + Math.random() * 4; }
  else if (T === 'eat') { m.st = 'eat'; m.face = m.x > (Y.fd?.x ?? 0) ? 1 : -1; m.until = now + 6 + Math.random() * 3; m.nm = now + 1; }
  else if (T === 'drill') { m.st = 'drill'; m.until = now + 8 + Math.random() * 4; }
  else if (T === 'train') { m.st = 'train'; m.k = null; m.face = m.x > Y.W / 2 ? 1 : -1; m.until = now + 4 + Math.random() * 3; }
  else if (T === 'sit') { m.st = 'sit'; m.face = Math.random() < .5 ? 1 : -1; }
  else if (T === 'sleep') { m.st = 'sleep'; m.until = now + 99; }
  else if (T === 'spw') { m.st = 'spw'; m.until = now + 6; const o = m.mate; if (o && o.st === 'spw' && o.mate === m) { m.face = o.x > m.x ? -1 : 1; o.face = -m.face; m.st = o.st = 'spar'; m.until = o.until = now + 6 + Math.random() * 4; m.turn = o.turn = 0; } }
  else { m.st = 'rest'; m.until = now + 1.5 + Math.random() * 3; }
}
// 후프링 길: 고리 셋을 차례로 지나 위로 크게 돌아온다 (나는 포켓몬)
function hoopAt(t) { const R = [0, 1, 2].map(i => Y.pr['ring' + i]), x0 = R[0].x - 30, x1 = R[2].x + 30, gy = R[0].y - 6, ah = R[0].y - R[0].ring[1];
  if (t < .55) { const u = t / .55; return { x: x0 + (x1 - x0) * u, y: gy, air: ah, f: -1 }; }
  const u = (t - .55) / .45, a = Math.PI * u; return { x: x1 - (x1 - x0) * u, y: gy - Math.sin(a) * 18, air: ah + Math.sin(a) * 46, f: 1 }; }
// 코치 (v17.59 경완): 훈련 중인 포켓몬을 하나 골라 그 옆(포켓몬 앞쪽, 40~60px)으로 걸어가 바라보며 지켜보고, 가끔 응원. 6~10초마다 다른 포켓몬으로.
// 걸음 그림 = 9칸 걸음 그림(0 아래·1 위·2 왼쪽 서기, 3·4 아래 걸음, 5·6 위, 7·8 왼쪽), 오른쪽은 좌우 뒤집기. 수영장 안으로는 안 들어감
const CO_FR = { d: [0, 3, 0, 4], u: [1, 5, 1, 6], l: [2, 7, 2, 8] };
function yEmo2(c, t) { const q = document.createElement('i'); q.className = 'ty-emo co'; q.textContent = t; q.style.left = c.x + 'px'; q.style.top = (c.y - 74) + 'px'; q.style.zIndex = 9999; Y.L.append(q); setTimeout(() => q.remove(), 1300); }
/* v20.84 경완 '코치가 한 마디씩 하는 거 훨씬 다양하게': 지켜보는 포켓몬이 하는 훈련별 말 + 이름 부르기 + 아무 때나 하는 말 (바로 전 말은 안 겹침) */
const CO_L = {
  any: ['힘내!', '좋아!', '한 번 더!', '그렇지!', '바로 그거야!', '자세 좋아!', '숨 고르고!', '집중!', '할 수 있어!', '거의 다 왔어!', '오늘 컨디션 좋은데?', '어제보다 낫다!', '포기하지 마!', '멋져!', '끝까지!', '좋은 눈빛이야!', '그 기세로!', '와, 대단한데!'],
  drill: ['유연하게!', '빙글빙글 좋아!', '몸이 가벼운데?', '구르기 깔끔해!', '균형 잡고!', '몸 풀기 좋아!', '반동을 살려!'],
  bag: ['더 세게!', '허리를 써!', '주먹 끝까지!', '샌드백이 흔들린다!', '연타로!', '발 디딤 좋아!', '한 방 더!'],
  shoot: ['정중앙을 노려!', '조준 천천히!', '명중!', '아깝다, 조금만 더 왼쪽!', '과녁 한가운데!', '침착하게 쏴!'],
  tramp: ['더 높이!', '착지 조심!', '균형 잡고!', '하늘까지 닿겠다!', '리듬 좋아!'],
  run: ['속도 올려!', '허들 조심!', '발 높이!', '마지막 바퀴!', '숨 쉬는 거 잊지 마!', '빠르다 빨라!'],
  hoop: ['고리 정중앙으로!', '날갯짓 좋아!', '바람을 타!', '한 바퀴 더!', '멋진 비행이야!'],
  buoy: ['물살을 느껴!', '물속에서도 힘차게!', '헤엄 좋아!', '물보라 멋지다!'],
  spar: ['상대 움직임을 봐!', '피하고 반격!', '좋은 대련이야!', '방심하지 마!', '거리 재고!', '둘 다 잘한다!', '페어플레이!'],
  tech: ['기술 정확하게!', '그 기술 멋진데!', '타이밍 좋아!', '위력 좋아!', '한 번 더 보여 줘!', '기술 연결 좋아!'],
  train: ['기본기가 중요해!', '몸 풀고!', '자세 다시!', '천천히, 정확하게!'],
  swim: ['물이 시원하지?', '천천히 헤엄쳐!'],
};
const CO_MV = (v, nm) => { const j = K.jong(v); return [`${v} 좋았어!`, `방금 ${v} 멋졌어!`, `${v}, 위력 좋은데!`, `${v} 타이밍 딱이야!`, `한 번 더 ${v}!`, `${v} 자세 좋아!`, `${v}${j ? '은' : '는'} 완벽해!`, `${v}${j ? '을' : '를'} 더 날카롭게!`, `${v}${j ? '이' : '가'} 점점 세지네!`, `${nm}의 ${v}, 최고야!`]; };   // v20.88 경완 '코치 한마디에 쓴 기술 이름도'
function coLine(t) { const lm = t?.lmv; if (lm && performance.now() / 1000 - lm.t < 6 && Math.random() < .65) { const L = CO_MV(lm.nm, nmOf(t.P)); let x = K.pick(L); for (let i = 0; i < 4 && x === Y.coLast; i++) x = K.pick(L); Y.coLast = x; t.lmv = null; return x; }
  const L = [...(CO_L[t?.st === 'go' ? 'any' : t?.st] || []), ...CO_L.any], nm = t ? nmOf(t.P) : '';
  if (nm && Math.random() < .25) L.push(`${nm}, 좋아!`, `${nm}${K.jong(nm) ? '아' : '야'}, 힘내!`, `${nm} 최고!`, `가자, ${nm}!`);
  let x = K.pick(L); for (let i = 0; i < 4 && x === Y.coLast; i++) x = K.pick(L); Y.coLast = x; return x; }
function yCoach(c, now, dt) {
  const pool = Y.mons.filter(m => m.st !== 'sleep');   // v17.77 경완 '훈련 중인 포켓몬 없으면 코치도 쉬게': 깨어 있는 포켓몬이 없으면 제자리(양 끝)로 가서 쉼
  if (!pool.includes(c.tg) || now > c.tn) { const o = (Y.co || []).find(x => x !== c)?.tg, P2 = pool.filter(m => m !== o); c.tg = pool.length ? K.pick(P2.length ? P2 : pool) : null; c.tn = now + 6 + Math.random() * 4; c.side = Math.random() < .5 ? -1 : 1; }
  const fd = Y.fd && c === Y.co[0], t = fd ? null : c.tg; let tx = c.hx, ty = c.hy;
  if (t) {   // v17.77 경완 '코치랑 포켓몬 너무 겹치지 않게': 고른 포켓몬 양옆·조금 더 멀리 중 다른 포켓몬·다른 코치와 가장 덜 겹치는 자리
    const near = (x, y) => Math.min(99, ...Y.mons.map(m => Math.hypot((m.x - x) * 1.2, m.y - y)), ...(Y.co || []).filter(o => o !== c).map(o => Math.hypot(o.x - x, o.y - y)));
    const cl = (x, y) => { x = Math.max(18, Math.min(Y.W - 18, x)); y = Math.max(Y.H * .3, Math.min(Y.H - 10, y)); if (inPond(x, y, 12)) { const p = Y.pond; y = p.y0 - 14; if (inPond(x, y, 12)) x = p.x1 + 16; } return [x, y]; };
    const gap = 58 + (t.k === 'spar' ? 26 : 0), C2 = [];
    for (const r of [gap, gap + 26]) for (const a of [0, .45, -.45, .9, Math.PI, Math.PI - .45, Math.PI + .45, Math.PI - .9]) C2.push(cl(t.x + Math.cos(a) * r * (a < 2 ? c.side : -c.side) * (a < 2 ? 1 : -1), t.y + 10 + Math.abs(Math.sin(a)) * r * .55));
    const sc = q => Math.min(48, near(q[0], q[1])) - Math.hypot(q[0] - c.x, q[1] - c.y) * .01;
    if (!c.spot || c.spot.t !== t || now > c.spot.n) { let best = C2[0], bv = -1e9; for (const q of C2) { const v = sc(q); if (v > bv) { bv = v; best = q; } }
      const keep = c.spot && c.spot.t === t && Math.hypot(c.spot.x - t.x, c.spot.y - t.y) < gap + 40 && sc([c.spot.x, c.spot.y]) > bv - 8; c.spot = keep ? { ...c.spot, n: now + .5 } : { t, n: now + .5, x: best[0], y: best[1] }; }
    tx = c.spot.x; ty = c.spot.y; }
  if (fd) { tx = Y.fd.cx; ty = Y.fd.y + 2; }   // v20.86 밥 주는 시간: 그릇 놓을 자리로
  if (c.snap && t) { c.x = tx; c.y = ty; } c.snap = 0;
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), mv = d > 6;
  if (mv) { const v = Math.min(d, 52 * dt); let nx = c.x + dx / d * v, ny = c.y + dy / d * v; if (inPond(nx, ny, 10)) { ny = Math.min(ny, Y.pond.y0 - 12); nx = c.x + Math.sign(dx) * v; } c.x = nx; c.y = ny;
    c.d = Math.abs(dx) > Math.abs(dy) * .8 ? (dx < 0 ? 'l' : 'r') : dy < 0 ? 'u' : 'd'; }
  else if (fd) c.d = Y.fd.cs > 0 ? 'r' : 'l';
  else if (t) { const ax = t.x - c.x, ay = t.y - c.y; c.d = Math.abs(ax) > Math.abs(ay) * .6 ? (ax < 0 ? 'l' : 'r') : ay < 0 ? 'u' : 'd'; }
  const k = c.d === 'r' ? 'l' : c.d, fr = CO_FR[k][mv ? Math.floor(now / .16) % 4 : 0];
  const e = c.el; e.style.left = c.x.toFixed(1) + 'px'; e.style.top = c.y.toFixed(1) + 'px'; e.style.zIndex = Math.round(c.y); e.style.backgroundPosition = `${-fr * c.fw}px 0`; e.style.setProperty('--fx', c.d === 'r' ? -1 : 1);
  if (fd && !mv && Y.fd.st === 0) yFeedDrop(c, now);
  if (!mv && !t && !fd && !c.rs) { c.rs = 1; c.d = 'd'; yEmo2(c, '휴~'); } if (t) c.rs = 0;
  if (!mv && t && now > c.nx) { c.nx = now + 3 + Math.random() * 3; e.classList.remove('cheer'); void e.offsetWidth; e.classList.add('cheer');
    const q = document.createElement('i'); q.className = 'ty-emo co'; q.textContent = coLine(t); q.style.left = c.x + 'px'; q.style.top = (c.y - 74) + 'px'; q.style.zIndex = 9999; Y.L.append(q); setTimeout(() => q.remove(), 1300); }
}
// v20.86 경완 '가끔 코치가 포켓몬 밥 주는 시간': (v20.87 경완 '1~2분은 너무 빨라' → 들어오고 2.5~4분 뒤 첫 번, 그 뒤 7~10분마다) 첫 코치가 빈 자리로 가서 그릇을 놓으면, 하던 걸 마친 포켓몬부터 와서 냠냠
const BOWL = ['...lfFflf...', '..fFlfFlfF..', '.oooooooooo.', '.ohhrrrrrro.', '..orrrrrRo..', '..oRRRRRRo..', '...oooooo...'];
const BOWL0 = ['............', '............', '.oooooooooo.', '.oRRRRRRRRo.', '..orrrrrRo..', '..oRRRRRRo..', '...oooooo...'];
const BOWL_P = { o: '#5a2a20', r: '#d8503c', R: '#a83828', h: '#f4927a', f: '#a8683a', F: '#74401e', l: '#d09a5c' };
const FD_L = ['밥 먹자~!', '밥 시간이야!', '든든하게 먹자!', '맛있게 먹어!'], FD_E = ['잘 먹었지?', '다 먹었구나!', '배부르지?', '이제 다시 힘내자!'];
function yFeedTick(now) {
  const co = Y.co?.[0]; if (!co) return;
  if (!Y.fd) { Y.fdN ??= now + 150 + Math.random() * 90; if (now < Y.fdN) return;
    const ms = Y.mons.filter(m => !m.fish && m.st !== 'sleep' && leftOf(m.e) > 0).slice(0, 6); if (!ms.length) { Y.fdN = now + 40; return; }
    const w = (ms.length - 1) * 40 / 2 + 40; let best = null, bv = 1e9;
    for (let i = 0; i < 40; i++) { const [x, y] = yardSpot(false); if (x - w < 24 || x + w > Y.W - 24 || y > Y.H - 30 || nearBush(x, y - 18) || inPond(x, y - 18, 16) || (x + w > Y.court.x0 - 16 && x - w < Y.court.x1 + 16 && y + 12 > Y.court.y0 - 30 && y - 30 < Y.court.y1 + 16)) continue;   // 대련 코트는 피함
      const v = Math.hypot(x - Y.W * .5, y - Y.H * .68); if (v < bv) { bv = v; best = [x, y]; } }
    if (!best) { Y.fdN = now + 30; return; }
    const cs = best[0] > Y.W / 2 ? 1 : -1;   // 코치는 줄 옆 (가운데 쪽), 포켓몬 뒤에 가리지 않게
    Y.fd = { x: best[0], y: best[1], st: 0, t0: now, ms, bw: [], cx: best[0] - cs * ((ms.length - 1) * 20 + 34), cs }; return; }
  const F = Y.fd;
  if ((F.st === 0 && now - F.t0 > 25) || (F.st === 1 && (F.bw.every(b => b.done) || now - F.go > 35))) yFeedEnd(now);
}
function yFeedDrop(c, now) { const F = Y.fd, n = F.ms.length; F.st = 1; F.go = now;
  c.el.classList.remove('cheer'); void c.el.offsetWidth; c.el.classList.add('cheer'); yEmo2(c, K.pick(FD_L));
  F.bw = F.ms.map((m, i) => { const x = F.x + (i - (n - 1) / 2) * 40, y = F.y + (i % 2) * 6, q = document.createElement('i'); q.className = 'ty-bowl'; q.style.cssText = `left:${x}px;top:${y}px;z-index:${Math.round(y) + 4};background-image:url(${pxCv(BOWL, BOWL_P)});animation-delay:${i * .08}s`; Y.L.append(q); return { m, x, y, el: q }; });
  for (const m of F.ms) if ((['rest', 'sit', 'tech', 'train', 'drill', 'bag', 'shoot', 'tramp', 'buoy'].includes(m.st) || (m.st === 'go' && m.k !== 'spar')) && !m.mate) yNext(m, now); }   // 하던 게 금방 끝나는 건 바로 오고, 대련·달리기·후프는 마치고 옴
function yFeedEnd(now) { const F = Y.fd; Y.fd = null; Y.fdN = now + 420 + Math.random() * 180;
  if (F.st === 1) { F.bw.forEach(b => { b.el.classList.add('out'); setTimeout(() => b.el.remove(), 500); }); const c = Y.co?.[0]; if (c) yEmo2(c, K.pick(FD_E)); }
  for (const m of Y.mons) if (m.st === 'eat' || (m.st === 'go' && String(m.k).startsWith('feed'))) yNext(m, now); }
function yLight() {
  const F = GA.light?.(); if (!F || !Y) return; const e = Y.el, on = F.lamps;
  const nt = e.querySelector('.ty-nt'); nt.style.backgroundColor = `rgb(${F.col.join(',')})`;
  Y.lp.forEach(l => l.el.classList.toggle('on', on)); Y.wl?.forEach(l => l.el.classList.toggle('on', on));
  // v17.79 경완 '불빛 더 희고 밝게, 실제로 훈련장을 밝히게 — 빛 엔진': 필드처럼 밤 그늘(곱하기)에 가로등 밑 땅만큼 구멍(원래 땅 색) + 흰 빛 더하기(screen)
  const k0 = on ? Math.min(1, F.dark * 1.2) : 0, hole = [], gls = [];
  if (k0 > .05) Y.lp.forEach(l => { const gx = l.x + l.dx * 30, gy = l.y + 14;
    hole.push(`radial-gradient(170px 110px at ${gx}px ${gy}px,rgba(0,0,0,${(1 - .9 * k0).toFixed(2)}) 0,rgba(0,0,0,${(1 - .62 * k0).toFixed(2)}) 40%,rgba(0,0,0,${(1 - .22 * k0).toFixed(2)}) 72%,#000 100%)`,
      `radial-gradient(26px 70px at ${l.x + l.dx * 6}px ${l.y - 22}px,rgba(0,0,0,${(1 - .7 * k0).toFixed(2)}) 0,#000 100%)`);
    gls.push(`radial-gradient(14px 10px at ${l.x + l.dx * 6}px ${l.y - 55}px,rgba(255,255,250,.95),rgba(255,255,240,.35) 60%,transparent)`,
      `radial-gradient(150px 96px at ${gx}px ${gy}px,rgba(255,252,238,.42),rgba(255,248,226,.16) 50%,transparent 80%)`); });
  if (k0 > .05) Y.wl?.forEach(l => { hole.push(`radial-gradient(34px 46px at ${l.x}px ${l.y + 22}px,rgba(0,0,0,${(1 - .8 * k0).toFixed(2)}) 0,rgba(0,0,0,${(1 - .4 * k0).toFixed(2)}) 50%,#000 100%)`,
      `radial-gradient(70px 30px at ${l.x}px 128px,rgba(0,0,0,${(1 - .7 * k0).toFixed(2)}) 0,rgba(0,0,0,${(1 - .3 * k0).toFixed(2)}) 50%,#000 100%)`);
    gls.push(`radial-gradient(8px 6px at ${l.x}px ${l.y + 5}px,rgba(255,255,250,.95),rgba(255,255,240,.3) 60%,transparent)`, `radial-gradient(30px 44px at ${l.x}px ${l.y + 22}px,rgba(255,252,236,.32),transparent 80%)`, `radial-gradient(64px 26px at ${l.x}px 128px,rgba(255,250,230,.22),transparent 80%)`); });
  nt.style.webkitMaskImage = nt.style.maskImage = hole.join(',');
  nt.style.webkitMaskComposite = hole.length > 1 ? 'source-in' : ''; nt.style.maskComposite = hole.length > 1 ? 'intersect' : '';
  const gl = e.querySelector('.ty-glow'); gl.style.opacity = k0 > .05 ? Math.min(1, .35 + k0).toFixed(2) : 0; if (gls.length) gl.style.background = gls.join(',');
  // v17.81 경완 '노을일 때 그림자 더 길게 — 그림자 엔진': 해 높이(아침·저녁 낮음)만큼 그림자를 해 반대쪽으로 늘림, 해가 지면 옅어짐. 비엔 발밑 그대로, 흐림은 반
  { const ts = (F.h - 6) / 12.6, sun = ts > 0 && ts < 1 && F.wx !== 'rain' ? (F.wx === 'cloud' ? .5 : 1) : 0, el2 = Math.sin(Math.PI * clampN(ts, 0, 1)),
      L = 1 + sun * Math.min(2.6, (1 / Math.max(el2, .22) - 1) * .95), dir = ts < .5 ? 1 : -1, op = sun ? clampN(el2 * 5, .35, 1) : 1;
    const tn = (L - 1) * .62, ska = -dir * Math.atan(tn) * 180 / Math.PI;   // v17.85 경완 '노을 그림자는 소품 모양으로': 기구·가로등·코치 그림을 본뜬 그림자를 땅에 눕혀 해 반대쪽으로 늘림
    e.style.setProperty('--ska', ska.toFixed(1) + 'deg'); e.style.setProperty('--sks', (-(.4 + .15 * (L - 1) / 2.6)).toFixed(2)); e.style.setProperty('--cso', sun ? (.24 * op * (1 - .15 * (L - 1) / 2.6)).toFixed(3) : 0);   /* v18.02 경완: 예전 그림자 진하기 */
    e.style.setProperty('--shl', L.toFixed(2)); e.style.setProperty('--shd', (dir * (L - 1)).toFixed(2)); e.style.setProperty('--sho', (1 - .3 * (L - 1) / 2.6) * op); e.classList.toggle('sunSh', !!sun); }   /* v18.04 경완 '훈련장도 소품 기존 그림자 없애야': 해가 있어 모양 그림자가 생길 땐 기구 밑 예전 타원 그림자를 숨김 */
  const wx = e.querySelector('.ty-wx'); wx.className = 'ty-wx' + (F.snow ? ' snow' : F.wx === 'rain' ? ' rain' + (F.storm ? ' storm' : '') : '');
  /* v18.63 경완 '훈련장 비 효과가 왜 필드 효과랑 다르지': 줄무늬 배경 대신 필드와 같은 빗줄기 80개(#rain i) + 땅에 튀는 물방울(#rainG b, 포켓몬·기구 아래) + 뇌우 번개(GA.bolt) */
  { const on = !F.snow && F.wx === 'rain', w = e.clientWidth || 360, hh = e.clientHeight || 600;
    if (on && !wx.children.length) { let h = ''; for (let i = 0; i < Math.round(80 * w / 360); i++) h += `<i style="left:${(Math.random() * (w + 150)).toFixed(0)}px;animation-delay:${(-Math.random() * .62).toFixed(2)}s;animation-duration:${(.5 + Math.random() * .25).toFixed(2)}s"></i>`; wx.innerHTML = h; wx.style.setProperty('--rh', (hh + 40) + 'px'); }
    if (!on && wx.children.length) wx.innerHTML = '';
    let g = Y.L.querySelector(':scope > .ty-rg'); if (on && !g) { g = document.createElement('i'); g.className = 'ty-rg'; let h = ''; for (let i = 0; i < Math.round(26 * w / 360); i++) h += `<b style="left:${(Math.random() * w).toFixed(0)}px;top:${(130 + Math.random() * (hh - 150)).toFixed(0)}px;animation-delay:${(-Math.random() * 2).toFixed(2)}s;animation-duration:${(1.2 + Math.random()).toFixed(2)}s"></b>`; g.innerHTML = h; Y.L.append(g); } else if (!on && g) g.remove();
    Y.storm = on && !!F.storm; }
}
function yardLoop(ts) {
  if (!Y || !document.body.classList.contains('gymMode')) { Y && (Y.raf = 0); return; }   // 체육관을 나가면 멈춤
  const cov = Y.cov = !Y.el.isConnected || sh.hidden || cur !== 'train' || !!document.querySelector('#gym .gy-boxw');   // v20.91 꾸미기 필드처럼: 다른 메뉴·+ 화면이 덮는 동안에도 0.1초마다 움직임은 계산, 그리기만 안 함
  const now = ts / 1000, dt = Math.min(.1, Y.last ? now - Y.last : 0); Y.last = now;
  if (Y.storm && !document.hidden && !cov) { if (!Y.stT) Y.stT = now + 2.5 + Math.random() * 4; else if (now >= Y.stT) { Y.stT = now + 6 + Math.random() * 12; const wx = Y.el.querySelector('.ty-wx'), w = Y.el.clientWidth || 360; window.GA?.bolt?.(wx, w); if (Math.random() < .3) setTimeout(() => window.GA?.bolt?.(wx, w), 250 + Math.random() * 500); } } else Y.stT = 0;   // v18.63 뇌우면 필드처럼 번개·천둥
  if (now - (Y.ck ?? now) > 30) { const b0 = Y.mons.map(m => { const e = st().tr.find(x => x.id === m.id); return [e?.evg || 0, m.P.fr || 0, e?.evk, (GB().gm(m.P).egP || []).slice()]; });
    tickTrain(Date.now()); K.save(); Y.ck = now; Y.mons.forEach(m => { try { yTag(m); } catch (x) {} });
    if (st().aw?.mv?.length) setTimeout(() => Y && K.awMvNow?.(), cov ? 300 : 3200);   // v20.98 체육관 안에서 깨달은 기술은 알림창 바로 (필드엔 먼저 '✨ 이름 깨달음!')
    if (!cov) Y.mons.forEach((m, i) => { const e = st().tr.find(x => x.id === m.id), [g0, f0, k, p0] = b0[i], dg = (e?.evg || 0) - g0, df = (m.P.fr || 0) - f0, B = GB();   // v20.91 경완 '+EXP 처럼 노력치·친밀도 오를 때도'
      if (dg > 0 && k >= 0) setTimeout(() => Y && yEmo(m, `${B.EV_N?.[k] || ''} +${dg}`, 'evu', EV_SC[k]), 200 + i * 260);
      if (df > 0) setTimeout(() => Y && yEmo(m, `♥ 친밀도 +${df}`, 'fru'), 900 + i * 260);
      (B.gm(m.P).egP || []).forEach((v, j) => { const a = Math.floor(p0[j] || 0), c = Math.floor(v || 0); if (c > a) { const id = B.EGG?.[m.P.sp]?.[j]; setTimeout(() => Y && yEmo(m, c >= 100 && id ? `✨ ${B.mvKo(id)} 깨달음!` : `✨ ??? ${c}%`, 'egu'), 1600 + i * 260 + j * 500); } }); });   /* v20.96 깨달음 게이지가 1% 오를 때마다 — v20.97 깨닫기 전엔 이름 가림 ??? (레어 포함) */ } else Y.ck ??= now;   // 30초마다 남은 시간·레벨 새로
  if (!cov && now - (Y.lk ?? 0) > 10) { Y.lk = now; yLight(); }
  for (const o of Y.co || []) if (o.cs) { const st2 = o.cs.style; st2.left = o.el.style.left; st2.top = o.el.style.top; st2.backgroundPosition = o.el.style.backgroundPosition; st2.setProperty('--fx', o.el.style.getPropertyValue('--fx') || 1); o.cs.classList.toggle('w32', o.el.classList.contains('w32')); }   // 코치 그림자 따라가기   // v17.75: 10초마다 시간·날씨 다시
  yFeedTick(now);
  for (const c of Y.co || []) yCoach(c, now, dt);   // v17.59 경완 '코치가 포켓몬들 따라다니면서 지켜보게': 한 마리씩 골라 옆으로 걸어가 지켜보고 응원
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
    const mvTry = (p, want, o) => { if (!yMvOk(m, now) || Math.random() > p) return null; const mv = yMove(m, want); return mv ? yMvOne(m, mv, now, o) : null; };   // v20.81 기술 쓰기
    if (m.st === 'bag' && !m.one) m.one = mvTry(.3, 0, { k: m.k, gap: .6 + Math.random() * .4 }) || { n: 'Attack', t: 0, k: m.k, gap: .2 + Math.random() * .4 };
    if (m.st === 'shoot' && !m.one) m.one = mvTry(.6, 1, { shot: Y.pr.tgt, gap: .8 + Math.random() * .6 }) || { n: m.D?.P?.a.Shoot ? 'Shoot' : 'Attack', t: 0, shot: Y.pr.tgt, gap: .5 + Math.random() * .6 };
    if (m.st === 'buoy' && !m.one) m.one = mvTry(.3, null, { k: 'water', gap: .6 + Math.random() * .5 }) || { n: 'Attack', t: 0, k: 'water', gap: .3 + Math.random() * .5 };
    if (m.st === 'train' && !m.one) m.one = mvTry(.4, null, { gap: .6 + Math.random() * .5 }) || (Math.random() < .45 && yMot(m, now)) || { n: 'Attack', t: 0, gap: .25 + Math.random() * .5 };
    if (m.st === 'drill' && !m.one) m.one = yMot(m, now, 1) || { n: 'Idle', t: 0, nh: 1, gap: .5 };
    if (m.rl) { if (now > m.rl.e) m.rl = null; else { const nx = m.x + m.rl.v * dt; if (nx < 24 || nx > Y.W - 24 || inPond(nx, m.y, 12)) m.rl = null; else m.x = nx; } }
    if (m.st === 'tech' && !m.one) m.one = mvTry(1, null, { gap: 1 + Math.random() * .8 }) || (now > (m.tq || 0) ? (m.tq = now + 1.2, (Math.random() < .35 && yMot(m, now)) || { n: 'Attack', t: 0, gap: .4 }) : null);   // 기술 연습: 효과음 차례가 아니면 잠깐 기본 동작
    if (m.st === 'eat' && now > m.nm) { m.nm = now + 1.6 + Math.random() * 1.2; yEmo(m, Math.random() < .7 ? '냠냠' : '♪', 'mu'); }
    if (m.st === 'tramp') { const p0 = m.ph; m.ph += dt / .62; m.air = Math.abs(Math.sin(m.ph * Math.PI)) * 30; if (Math.floor(m.ph) !== Math.floor(p0)) { yWob(Y.pr.tramp, 'sq'); if (Math.random() < .3) yEmo(m, '♪', 'mu'); } }
    if (m.st === 'run') { const L = Y.lane, v = 80 * dt; m.y += m.dir * v; m.x = L.x; m.an = 'Walk';   // 세로 트랙: 위아래로 달리며 허들 넘기
      const hd = ['h1', 'h2'].map(k => Math.abs(m.y - Y.pr[k].y)).reduce((a, b) => Math.min(a, b)), J = 16; m.air = hd < J ? Math.cos(hd / J * Math.PI / 2) * 26 : 0;
      if (m.y > L.y1 || m.y < L.y0) { m.y = clampN(m.y, L.y0, L.y1); m.dir = -m.dir; m.face = Math.random() < .5 ? 1 : -1; if (++m.lap >= 4) { yEmo(m, '!', 'hit'); yNext(m, now); } } }
    if (m.st === 'hoop') { m.ph += dt / 4.2; const p = hoopAt(m.ph % 1); m.x = p.x; m.y = p.y; m.air = p.air; m.face = p.f; m.an = 'Walk'; m.zb = 0;
      m.air = Math.max(0, p.air - (m.top != null ? -m.top * .5 : 18) - (m.lift || 0));   // 몸통 가운데가 고리 구멍 높이로
      if (m.ph % 1 < .55) { const R = [0, 1, 2].map(i => Y.pr['ring' + i]), i = R.findIndex(q => Math.abs(q.x - m.x) < 4); if (i >= 0 && i !== m.ri) { m.ri = i; yWob({ el: R[i].fr }, 'spin'); yWob(R[i], 'spin'); } } else m.ri = -1;
      if (m.ph >= 3) { m.air = 0; yNext(m, now); } }
    if (m.st === 'spar' && m.lead && !m.one && !m.mate?.one) { const a = m.turn % 2 ? m.mate : m, tg = a === m ? m.mate : m, mv = yMvOk(a, now) && Math.random() < .4 && yMove(a); a.one = mv ? yMvOne(a, mv, now, { tgt: tg, gap: .5 }) : { n: 'Attack', t: 0, tgt: tg }; m.turn++; }   // v20.81 대련도 가끔 기술로
    if ((m.st === 'sleep') && now > (m.zz || 0)) { m.zz = now + 3 + Math.random() * 2; yEmo(m, 'Zz', 'zz'); }
    if (!cov) { const sw = inPond(m.x, m.y, -6); m.el.classList.toggle('swim', sw); swimMask(m, sw); place(m); } yDraw(m, dt);
  }
  if (Y.el.closest('.gy-sheet.lk')) return;   // 잠긴 훈련장은 한 장면에서 멈춘 그림 (경완 2026-10-29)
  if (cov) { const Y0 = Y; Y.raf = 0; clearTimeout(Y.pz); Y.pz = setTimeout(() => { if (Y === Y0 && !Y.raf) yardLoop(performance.now()); }, 100); return; }
  Y.raf = requestAnimationFrame(yardLoop);
}
// 물에 잠긴 부분은 반투명 (경완 2026-10-27): 발밑에서 물고기는 몸 절반쯤, 다른 포켓몬은 조금
function swimMask(m, on) {
  const st2 = m.sp.style; if (!on || !m.D?.P) { if (m.mk) { st2.maskImage = st2.webkitMaskImage = ''; m.mk = ''; } return; }
  const top = parseFloat(st2.top) || 0, feet = -top, dep = m.fish ? Math.max(10, feet * .5) : Math.min(12, feet * .3), y = Math.max(0, feet - dep).toFixed(0);
  const mk = `linear-gradient(to bottom,#000 ${y}px,rgba(0,0,0,.42) ${y}px)`; if (m.mk !== mk) { m.mk = mk; st2.maskImage = st2.webkitMaskImage = mk; } }
/* v20.81 경완 '훈련장에서 포켓몬들마다 기술 동작·효과 많이 활용': 그 포켓몬이 아는 기술(배틀 기술)로 — 기술 이름 외치기 → 이름에 맞는 동작(펀치·킥·물기·소리…) → 필드와 같은 기술 효과·효과음 → 기구가 맞음.
   샌드백·물 위 장치·대련은 가끔, 과녁은 자주(특수 기술), 새 '기술 연습'(빈 자리에서 아는 기술 차례로)은 늘. 효과음이 겹치지 않게 훈련장 전체 1.3초, 포켓몬마다 3초 간격 */
function yMove(m, want) { const B = GB(), L = (B.gm(m.P).mv || []).map(id => B.mvOf(id)).filter(x => x && x[3] !== 2);
  const W = want == null ? L : L.filter(x => x[3] === want), x = K.pick(W.length ? W : L); return x ? { name: x[1], t: x[2], dc: x[3] === 0 ? 2 : 3 } : null; }
function yMvOk(m, now) { return !!GA.mvFx && m.D?.P && now > (Y.mvT || 0) && now > (m.mvT || 0); }
function yMvOne(m, mv, now, o = {}) { const A = m.D.P.a, n = (GA.mvAnims?.(mv.name, mv.dc) || []).find(a => A[a]) || 'Attack';
  Y.mvT = now + 1.3; m.mvT = now + 3 + Math.random() * 2; m.lmv = { nm: mv.name, t: now };   /* v20.83 경완: 기술 이름은 안 외침 */ return Object.assign({ n, t: 0, mv }, o); }
function yMvFx(m, q) { const mv = m.one.mv, f = -m.face || 1, hs = document.createElement('i'); hs.className = 'ty-mvh';
  hs.style.cssText = `left:${m.x.toFixed(0)}px;top:${(m.y - 22 - (m.lift || 0) - (m.air || 0)).toFixed(0)}px;z-index:${Math.round(Math.max(m.y, q?.y || 0)) + 6}`; Y.L.append(hs); setTimeout(() => hs.remove(), 3200);
  GA.mvFx(hs, mv.name, mv.t, mv.dc, f); }
function yHit(m) {
  const o = m.one; if (o.mv) { const q = o.shot || (o.k && Y.pr[o.k]) || null; yMvFx(m, q || o.tgt);
    setTimeout(() => { if (!Y) return; if (q) { yWob(q, o.k === 'water' || !q.mp ? 'wob' : 'swing'); yFx(q.x + 6, q.y - (q.h || 20) * .55, o.k === 'water' ? 'spl' : 'spk'); }
      if (o.tgt) { const t = o.tgt; if (t.D?.P?.a.Hurt && !t.one) t.one = { n: 'Hurt', t: 0 }; yEmo(t, '!', 'hit'); t.x += (t.x > m.x ? 1 : -1) * 6; } }, o.shot ? 520 : 260);
    if (Math.random() < .5) setTimeout(() => Y && yEmo(m, '+EXP', 'xp'), 700); return; }
  if (o.shot) return yShot(m, o.shot);
  const q = o.k && Y.pr[o.k]; if (q) { yWob(q, o.k === 'water' ? 'wob' : 'swing'); yFx(q.x + (o.k === 'water' ? 10 : 6), q.y - (o.k === 'water' ? 10 : q.h * .55), o.k === 'water' ? 'spl' : 'spk'); }
  else if (!o.tgt) yFx(m.x - m.face * 22, m.y - 24, 'spk');
  if (o.tgt) { const t = o.tgt; if (t.D?.P?.a.Hurt && !t.one) t.one = { n: 'Hurt', t: 0 }; yFx((m.x + t.x) / 2, m.y - 22, 'spk'); yEmo(t, '!', 'hit'); t.x += (t.x > m.x ? 1 : -1) * 4; }
  if (Math.random() < .3) yEmo(m, '+EXP', 'xp');
}
// v20.89 경완 '빙글빙글 도는 동작이나 구르기 같은 것도 (지금은 공격 동작밖에 없음)': 그 포켓몬 그림에 있는 몸 풀기 동작, 없으면 CSS 로 빙글·데굴
const Y_MOT = [['Rotate', 3, '빙글빙글'], ['Tumble', 2.4, '데굴데굴'], ['TumbleBack', 1, ''], ['Hop', 1.4, '폴짝'], ['LeapForth', 1, '휙!'], ['Swing', 1, ''], ['Double', .8, ''], ['RearUp', .8, ''], ['Rumble', .6, ''], ['DeepBreath', .6, '후~'], ['Pose', .8, '짠!'], ['Charge', .6, ''], ['Twirl', 2, '빙그르르'], ['Dance', 1.6, '♪'], ['Shake', .8, '부르르'], ['FlapAround', 1, '퍼덕퍼덕'], ['QuickStrike', .8, '슉!'], ['Kick', .8, ''], ['Strike', .6, ''], ['Pull', .5, ''], ['Nod', .4, ''], ['LookUp', .4, ''], ['Float', .6, ''], ['Hover', .4, ''], ['Withdraw', .5, ''], ['Special0', .5, ''], ['Special1', .4, '']];
function yMot(m, now, drill) { const A = m.D?.P?.a; if (!A) return null;
  const L = Y_MOT.filter(x => A[x[0]]); L.push(['cssSpin', A.Rotate ? .3 : 1.6, '빙글빙글'], ['cssRoll', A.Tumble ? .3 : 1.6, '데굴데굴'], ['cssJump', A.Hop ? .5 : 1.2, '점프!'], ['cssStr', .6, '쭈욱~'], ['cssWig', .6, '']);
  let r = Math.random() * L.reduce((s, x) => s + x[1], 0), x = L[0]; for (const y of L) { r -= y[1]; if (r <= 0) { x = y; break; } }
  if (drill && Math.random() < .5) m.face = Math.random() < .5 ? 1 : -1;
  if (x[2] && Math.random() < .35) yEmo(m, x[2], 'mu');
  const n = x[0], gap = .3 + Math.random() * .5;
  if (n === 'cssJump' || n === 'cssStr' || n === 'cssWig') { const K2 = n === 'cssJump' ? [[{ translate: '0 0', scale: '1 1' }, { translate: '0 0', scale: '1.15 .8', offset: .15 }, { translate: '0 -34px', scale: '.9 1.12', offset: .5 }, { translate: '0 0', scale: '1.12 .85', offset: .85 }, { translate: '0 0', scale: '1 1' }], 800]
      : n === 'cssStr' ? [[{ scale: '1 1' }, { scale: '.86 1.2', offset: .4 }, { scale: '.86 1.2', offset: .6 }, { scale: '1 1' }], 1100] : [[{ rotate: '0deg' }, { rotate: '-12deg' }, { rotate: '12deg' }, { rotate: '-8deg' }, { rotate: '8deg' }, { rotate: '0deg' }], 800];
    m.sp.animate(K2[0], { duration: K2[1], easing: 'ease-in-out' }); return { n: 'Idle', t: 0, nh: 1, gap: K2[1] / 1000 + gap }; }   // 그림 없는 포켓몬도: 높이 점프·기지개·좌우 흔들기
  if (n === 'cssSpin' || n === 'cssRoll') { const roll = n === 'cssRoll', d = roll ? -m.face : (Math.random() < .5 ? 1 : -1), T = roll ? 900 : 700;
    m.sp.animate([{ rotate: '0deg' }, { rotate: `${d * (roll ? 720 : 360)}deg` }], { duration: T, easing: roll ? 'linear' : 'ease-in-out' });
    if (roll) m.rl = { v: d * 70, e: now + T / 1000 };
    return { n: 'Idle', t: 0, nh: 1, gap: T / 1000 + gap }; }
  const tot = A[n][6].reduce((s, d) => s + d, 0) / 60;
  if (n === 'Tumble' || n === 'TumbleBack') m.rl = { v: (n === 'Tumble' ? -m.face : m.face) * 60, e: now + tot };
  return { n, t: 0, nh: 1, gap }; }
function yDraw(m, dt) {
  const D = m.D; if (!D?.P) { m.el.classList.toggle('bob', m.st !== 'rest' && m.st !== 'sleep' && m.st !== 'sit'); if (m.one) { m.one.t += dt; if (m.one.t > .8) { yHit(m); m.one = null; } } return; }
  const A = D.P.a; let nm, f = null;
  if (m.one) { nm = A[m.one.n] ? m.one.n : 'Idle'; m.one.t += dt; }
  else nm = m.st === 'go' || m.st === 'run' || m.st === 'hoop' ? m.an : m.st === 'sleep' ? 'Sleep' : m.st === 'sit' ? (A.Sit ? 'Sit' : 'Idle') : m.st === 'eat' ? (A.Eat ? 'Eat' : 'Idle') : m.st === 'tramp' && A.Hop ? 'Hop' : 'Idle';
  if (!A[nm]) nm = nm === 'WalkUp' && A.Walk ? 'Walk' : 'Idle';
  const a = A[nm], durs = a[6], tot = durs.reduce((s, d) => s + d, 0) / 60;
  let t;
  if (m.one) { t = m.one.t;
    const hitT = durs.slice(0, (a[7] ?? 0) + 1).reduce((s, d) => s + d, 0) / 60;
    if (!m.one.hit && t >= hitT) { m.one.hit = 1; if (m.one.n !== 'Hurt' && !m.one.nh) yHit(m); }
    if (t >= tot) { if (m.one.gap && t < tot + m.one.gap) { t = tot - .001; } else { m.one = null; return yDraw(m, 0); } } }
  else { if (m.ak !== nm) { m.ak = nm; m.at = 0; } m.at += dt * (m.st === 'run' ? 1.8 : 1); t = m.at % tot; }
  let acc = 0; f = durs.length - 1; for (let i = 0; i < durs.length; i++) { acc += durs[i] / 60; if (t < acc) { f = i; break; } }
  const key = nm + ':' + f; if (m.fk === key) return; if (Y.cov) { m.fk = null; return; } m.fk = key;
  const s = m.s, P = D.P, st2 = m.sp.style;
  if (nm === 'Idle' || m.top == null) m.top = (-a[5] - (P.fy || 0)) * s + (P.vt || 0) * s;
  st2.width = a[1] * s + 'px'; st2.height = a[2] * s + 'px'; st2.left = -a[4] * s + 'px'; st2.top = (-a[5] - (P.fy || 0)) * s + 'px';
  st2.backgroundPosition = `${-f * (a[1] + (P.G || 0)) * s}px ${-a[0] * s}px`;
}
// 훈련장에 보낼 포켓몬: 포켓몬 박스와 같은 화면 (경완 2026-10-29). 누르면 넣기·빼기, 6마리까지
function pickTrain(after) {
  const g = st(), ty = g.ty, inTr = id => g.tr.some(e => e.id === id);
  GB().boxWin(false, null, () => { redraw(); after?.(); }, {
    title: () => `훈련장에 보낼 포켓몬 <small>${g.tr.length}/${trMax()}</small>`, tip: `${TYPE_KO[ty]} 타입이 먼저 보여요`,
    list: () => S.box,   /* v20.50 경완: 만렙도 훈련장에 (노력치·친밀도·기술) */ ok: () => true, first: P => (SPECIES[P.sp]?.t || []).includes(ty),
    tag: P => inTr(P.id) ? '훈련장' : onField(P.id) ? '필드' : '',
    pick: function this_pick(P, w) { const i = g.tr.findIndex(e => e.id === P.id);
      if (i >= 0) { tickTrain(Date.now()); g.tr.splice(i, 1); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에서 데려왔다.`); }
      else { if (g.tr.length >= trMax()) return say(trFull());
        // 보내기 전에 한 번 더 묻기, 필드에 나가 있으면 빠진다고 안내 (경완 2026-10-29)
        if (!w.ok) { const n = esc(nmOf(P)); GB().gymPop(`<h4>${n}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보낼까요?</h4>${onField(P.id) ? `<p class="gy-msg">지금 필드에 나가 있어서 보내면 <b>필드에서 빠져요</b>.</p>` : ''}<div class="gy-btns"><button data-a="x">취소</button><button class="main" data-a="ok">보내기</button></div>`, (a, close) => { close(); if (a === 'ok') { w.ok = 1; try { this_pick(P, w); } finally { w.ok = 0; } } }); return; }
        const m = S.mons.find(o => o.pid === P.id); if (m) { try { GA.removeMon(m, true); } catch (e) {} }
        const now = Date.now(); g.tr.push({ id: P.id, t: now, d: K.dayStart(now), h: 0, j: now, l0: GB().gm(P).lv, x: 0, mv: [] }); K.glog('tr', `${esc(nmOf(P))}${K.jong(nmOf(P)) ? '을' : '를'} 훈련장에 보냈다.`); setTimeout(() => K.tutEv?.('B'), 300);
        if (g.tr.length >= trMax()) { K.save(); w.close(); redraw(); return after?.(); } }
      K.save(); w.redraw(); } });
}
// 상세카드 '훈련장으로' (경완 2026-10-29 '필드로 버튼처럼 눌렀다 뺐다'): 훈련 중이면 데려오고, 아니면 한 번 물어보고 보낸다
function trSend(P, done) {
  const g = st(), i = g.tr.findIndex(e => e.id === P.id), n = esc(nmOf(P)), j = K.jong(nmOf(P)) ? '을' : '를';
  if (i >= 0) { tickTrain(Date.now()); g.tr.splice(i, 1); K.glog('tr', `${n}${j} 훈련장에서 데려왔다.`); K.save(); redraw(); slotRf?.(); return done?.(); }
  if (g.tr.length >= trMax()) return say(trFull());
  GB().gymPop(`<h4>${n}${j} 훈련장에 보낼까요?</h4>${onField(P.id) ? `<p class="gy-msg">지금 필드에 나가 있어서 보내면 <b>필드에서 빠져요</b>.</p>` : ''}<div class="gy-btns"><button data-a="x">취소</button><button class="main" data-a="ok">보내기</button></div>`, (a, close) => { close(); if (a !== 'ok') return;
    const m = S.mons.find(o => o.pid === P.id); if (m) { try { GA.removeMon(m, true); } catch (e) {} }
    const now = Date.now(); g.tr.push({ id: P.id, t: now, d: K.dayStart(now), h: 0, j: now, l0: GB().gm(P).lv, x: 0, mv: [] }); K.glog('tr', `${n}${j} 훈련장에 보냈다.`); K.save(); redraw(); slotRf?.(); done?.(); setTimeout(() => K.tutEv?.('B'), 300); });
}
// 훈련 현황 (경완 2026-10-29): 나와 있던 시간, 얻은 경험치, 오른 레벨, 배운 기술
const hm = ms => { const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}일 ${h}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`; };
// 훈련 현황 겸 슬롯 (경완 2026-10-29 '필드 슬롯처럼 3×2, + 버튼이랑 통합'): 찬 슬롯 = 상세카드, ✕ = 데려오기, 빈 슬롯 = 보내기
let slotRf = null;
function statPop() {
  const g = st(); tickTrain(Date.now()); K.save();
  let w = document.querySelector('#gym .gy-boxw.ts-win');
  if (!w) { document.querySelector('#gym .gy-boxw')?.remove(); w = document.createElement('div'); w.className = 'gy-boxw ts-win'; document.querySelector('#gym .gy-main').appendChild(w); }
  const L = g.tr.map(e => [e, boxOf(e.id)]).filter(([, P]) => P), today = K.dayStart(Date.now());
  const cx = coachX(), now = Date.now();
  /* v16.36 경완 '훈련장에 나간 포켓몬 보는 화면이랑 슬롯 디자인': 가로 카드(그림 · 이름 · 막대 둘 · 데려오기), 빈 칸은 '포켓몬 보내기'
     v19.63 경완: 찬 칸·빈 칸·잠긴 칸 크기 같게(1fr), 데려오기 → ✕ */
  w.innerHTML = `<div class="win" role="dialog" aria-label="훈련장"><div class="bw-hd"><button class="bw-x" data-x aria-label="뒤로">‹</button><h4>훈련장 <small>${L.length}/${trMax()}</small></h4>${coachSum() ? `<span class="tsc-co">${coachSum()}</span>` : ''}</div>
    <div class="ts-grid tsc-grid">${Array.from({ length: Math.max(TR_ALL, L.length) }, (_, i) => { const r = L[i]; if (!r && i >= trMax()) return `<div class="ts-slot lock tsc-lock">${LOCK_SVG}<span><b>${K.GRADES[i + 1]?.[1] || ''}</b>이 되면 열려요</span></div>`; if (!r) return `<button type="button" class="ts-slot empty tsc-new" data-new="1"><span>+</span><b>포켓몬 보내기</b></button>`;
      const [e, P] = r, m = GB().gm(P), up = Object.values(trLog(P.id)).reduce((a, d) => a + (d.lv | 0), 0), B = GB(), ek = e.evk ?? -1, eOn = !!B.evOn?.(),   /* v20.78 경완 '가비루사 일지 레벨업 수랑 슬롯 레벨업 수가 달라': ▲ = 훈련 일지 합 (훈련 현황과 같은 값, 배틀·사탕으로 오른 레벨은 안 셈) */ gr = GB().growth(P.sp), a0 = GB().xpAt(gr, m.lv), a1 = GB().xpAt(gr, m.lv + 1), mx = m.lv >= GB().LV_MAX, f = mx ? 1 : clampN(((m.xp ?? a0) - a0) / Math.max(1, a1 - a0), 0, 1), nmv = Object.values(trLog(P.id)).reduce((a, d) => a + (d.mv?.length | 0), 0);
      return `<button type="button" class="ts-slot tsc" data-id="${P.id}"><span class="tsc-th">${GB().thumb(P)}</span><span class="tsc-mid"><span class="tsc-nm"><b>${esc(nmOf(P))}</b><span class="tsc-lv">Lv.${m.lv}</span>${up > 0 ? `<em class="tsc-up">▲${up}</em>` : ''}</span>
        <span class="tsc-g"><i>경험치</i><span class="mini"><i style="width:${(f * 100).toFixed(0)}%"></i></span><small>${mx ? '최고' : `${Math.floor(f * 100)}%`}</small></span>
        <span class="tsc-tags">${eOn ? ek >= 0 ? `<em class="tsc-ev" style="--sc:${EV_SC[ek]}"><img alt="" src="${B.itImg(B.EV_PW[ek])}">${B.EV_N[ek]} 훈련<b>+${e.evg | 0}</b></em>` : '<em class="tsc-ev off">능력치 훈련 안 함</em>' : '<em class="tsc-ev off">훈련 중</em>'}${nmv ? `<em class="tsc-mv">새 기술 ${nmv}</em>` : ''}</span></span><span class="ts-x tsc-out" data-out="${P.id}" role="button" aria-label="훈련장에서 데려오기">✕</span></button>`; }).join('')}</div>
    </div>`;   // 아래 안내 문구는 뺐다 (경완 2026-10-29)
  GB().fillTh(w);
  slotRf = () => { if (w.isConnected) statPop(); };
  w.onclick = e => {
    if (e.target.closest('[data-x]')) { sfx('tap'); w.remove(); slotRf = null; return; }
    const x = e.target.closest('[data-out]'); if (x) { sfx('tap'); const P = boxOf(+x.dataset.out || x.dataset.out); if (P) trSend(P); return; }
    const b = e.target.closest('.ts-slot'); if (!b) return; sfx('tap');
    if (b.dataset.new) return pickTrain(() => statPop());
    trPop(+b.dataset.id || b.dataset.id);   /* v19.63 경완 '+ 목록에서 슬롯 눌러서 나오는 상세카드도 훈련장에서 포켓몬 직접 눌렀을 때 나오는 상세카드랑 동일하게' */
  };
}
/* v16.68 경완 '훈련 일지 넘어갈 때 포켓몬 박스 옆 글자 위치 그 전 화면이랑 맞춰': 상세카드·훈련 일지가 같은 머리 (이름 · Lv · 경험치 막대 · 다음 레벨까지) */
function trHead(P, ed, hb) {   // hb: 그림 = 지닌 도구 버튼 (v20.88 훈련장 상세카드)
  const m = GB().gm(P), g = GB().growth(P.sp), need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv), a0 = GB().xpAt(g, m.lv), mx = m.lv >= GB().LV_MAX, r = mx ? 1 : clampN(((m.xp ?? a0) - a0) / Math.max(1, need), 0, 1);
  const e = st().tr.find(x => x.id === P.id), lf = e ? Math.max(0, Math.ceil(leftOf(e))) : 0;
  return `<div class="mp-head tp2-hd">${hb ? `<button type="button" class="mp-thb" data-a="hit" aria-label="지닌 도구">${GB().thumb(P)}</button>${m.it ? '' : '<button type="button" class="th-add" data-a="hit" aria-label="도구 지니게 하기">+</button>'}` : GB().thumb(P)}<div><h4>${ed && GA.nmEdit ? GA.nmEdit(P) : esc(nmOf(P))}</h4><p class="tp2-lv"><b>Lv.${m.lv}</b>${e ? `<span class="tp2-st${lf ? '' : ' done'}">${lf ? '훈련 중' : '오늘 훈련 끝'}</span>` : ''}</p>
      <i class="mp-xp"><i style="width:${(r * 100).toFixed(1)}%"></i></i><small class="tp-xp">${mx ? '최고 레벨' : `다음 레벨까지 ${Math.max(0, Math.ceil(need - ((m.xp ?? a0) - a0))).toLocaleString()} · ${Math.max(0, Math.floor((m.xp ?? a0) - a0)).toLocaleString()}/${Math.ceil(need).toLocaleString()}`}</small></div></div>`;
}
function trPop(id, under) {   // under: 기술 창을 닫고 돌아올 때 예전 창 자리에 바로 바꿔 끼움 (v14.43)
  const P = boxOf(id); if (!P) return; const m = GB().gm(P), ph = perHour(P), g = GB().growth(P.sp), need = GB().xpAt(g, m.lv + 1) - GB().xpAt(g, m.lv);
  const a0 = GB().xpAt(g, m.lv), r = m.lv >= GB().LV_MAX ? 1 : clampN(((m.xp ?? a0) - a0) / Math.max(1, need), 0, 1);
  const e = st().tr.find(x => x.id === P.id), lf = e ? Math.max(0, Math.ceil(leftOf(e))) : 0, mx = m.lv >= GB().LV_MAX, today = K.dayStart(Date.now()), T = trLog(P.id)[today] || { h: 0, x: 0, lv: 0, f: 0, mv: [] };
  /* v16.71 경완 '훈련 일지 옆 통합 점수를 앞 화면 박스에, 오늘 훈련 → 훈련 현황': 훈련 일지 전체를 더한 값 */
  const TT = Object.values(trLog(P.id)).reduce((a, d) => { a.d++; a.x += d.x; a.lv += d.lv; a.f += d.f; a.mv.push(...d.mv); return a; }, { d: 0, x: 0, lv: 0, f: 0, mv: [] });
  /* v16.41 경완: 레벨 옆 ▲ 딱지 빼고 훈련 중 / 오늘 훈련 끝만. 숫자 칸 넷 대신 '오늘 훈련' 상자(경험치·레벨·친밀도·새 기술) → 누르면 날짜별 훈련 일지. 기술 버튼 둘은 빼고 체육관 상세카드처럼 '기술 바꾸기 ›' */
  const p = pop(`<div class="tp2">${trHead(P, true, true)}
    <div class="tp2-today" role="button" tabindex="0"><span class="tp2-th"><b>훈련 현황</b><small>${TT.d}일 · 훈련 일지 ›</small></span>
      <span class="tp2-g"><span><small>경험치</small><b>+${TT.x.toLocaleString()}</b></span><span><small>레벨</small><b class="${TT.lv ? 'up' : ''}">${TT.lv ? `▲${TT.lv}` : '-'}</b></span><span><small>친밀도</small><b class="${TT.f ? 'fr' : ''}">${TT.f ? `+${TT.f}` : '-'}</b></span><button type="button" class="tp2-mvc" data-a="mvs"><small>새 기술</small><b class="${TT.mv.length ? 'mv' : ''}">${TT.mv.length ? `${TT.mv.length}개 ›` : '- ›'}</b></button></span>
      ${TT.mv.length ? `<span class="tp2-mvs">${mvChips(TT.mv)}</span>` : ''}</div>${evTrBox(P)}
    <div class="mp-mvh"><small>기술</small><button type="button" class="mp-tx" data-a="mv">기술 바꾸기 ›</button></div>
    <div class="mp-moves mp-line">${m.mv.map(x => GB().mvOf(x)).filter(Boolean).map(x => GB().mvRow(x, 'i' + x[0])).join('')}</div>
    <div class="gy-btns tp2-btns"><button data-a="out" class="danger">빼기</button><button class="main" data-a="x">닫기</button></div></div>`,
    (a, close) => { if (!a) return; if (a[0] === 'i' && a.length > 1) return GB().mvInfo(a.slice(1));
      if (a === 'hit') return GB().hitPop(P, close, () => { redraw(); trPop(id); });   // v20.88 경완 '훈련장 상세카드에서도 지닌 도구 눌러서 바꾸게'
      if (a === 'mv') return GB().movesPop(P, () => { redraw(); trPop(id, p); });   // v14.43 경완: 기술 창이 떠 있는 동안 뒤에 창 그대로
      if (a === 'mvs') return mvListPop(TT.mv, P);
      if (a === 'evq') return evTrHint(P, () => trPop(id, p));
      if (a.startsWith('evk')) { const e2 = st().tr.find(x => x.id === P.id); if (!e2) return; tickTrain(Date.now()); const k = +a.slice(3); e2.evk = e2.evk === k ? -1 : k; K.save(); trPop(id, p); return; }   // 노력치 훈련: 같은 칸 다시 누르면 끔
      close();
      if (a === 'out') { tickTrain(Date.now()); st().tr = st().tr.filter(e => e.id !== P.id); K.save(); redraw(); slotRf?.(); } });
  p.querySelector('.tp2-today').onclick = ev => { if (ev.target.closest('button')) return; sfx('tap'); trLogPop(P, p); };   /* 상자 = 훈련 일지, 안의 새 기술 = 기술 창 */
  if (under) { const w = p.querySelector('.win'); if (w) w.style.animation = 'none'; under.remove(); }
}
/* v16.48 경완 '새 기술 박스는 따로 누르면 어떤 기술인지 팝업': 기술 이름 딱지(타입 색) → mvInfo. 여러 개면 목록 창에서 고름 */
const mvChips = L => L.map(id => { const x = GB().mvOf(id); return `<button type="button" class="mv-chip" data-a="i${id}" style="--tc:${GA.TYPE_C?.[x?.[2]] || '#2a8a3e'}">${esc(GB().mvKo(id))}</button>`; }).join('');
/* v19.55 경완 '훈련 현황 새 기술 박스 → 새 기술 창: 특별한 기술은 처음엔 실루엣 박스로 가려져 있다가 배울 때마다 하나씩 열림, 기술마다 행 하나로 길게':
   위 = 특별한 기술(알 기술 4줄, 4번째 레어), 아래 = 훈련 중 레벨업으로 배운 기술. 처음 보는 알 기술(m.egS 에 없음)은 열리는 연출 한 번 */
function mvListPop(L, P, U) {   // U = 번뜩임 { i, a, b, got } → 게이지가 a% 에서 b% 로 오름, 버튼으로만 닫힘 · U.aw = 특별한 기술 익힘 알림창 { mv, i, n, done }
  const AW = U?.aw;
  const m = P && GB().gm(P), E = (P && GB().EGG?.[P.sp] || []).filter(id => id && GB().mvOf(id)), kn = new Set([...(m?.mv || []), ...(m?.kn || [])]), seen = new Set(m?.egS || []);
  const lvL = [...new Set(L)].filter(id => !E.includes(id)).map(id => GB().mvOf(id)).filter(Boolean);   // v19.59 경완 '원래대로 같이 표시': 레벨업 기술도 아래에
  /* v20.85 경완 '특별한 기술 게이지는 따로 구역 말고 새 기술 창의 ??? 박스 전체가 게이지': 안 익힌 줄 = 깨달음 % 만큼 차오르는 박스, 누르면 그 기술 집중 훈련 */
  let nNew = 0; const G = m?.egP || [], ix = id => (GB().EGG?.[P.sp] || []).indexOf(id);
  const row = (id, k) => { const x = GB().mvOf(id), i = ix(id), rare = i === 3, on = kn.has(id), nw = on && (AW ? id === AW.mv : !seen.has(id)), f = GB().egFocus?.(P), fo = !AW && !on && i === f, pc = Math.floor(U && U.i === i && !on ? U.a : G[i] || 0); if (nw) nNew++;
    return `<div class="eg-r${rare ? ' rare' : ''}${on ? ' on' : ''}${nw ? ' new' : ''}${fo ? ' fo' : ''}" style="--d:${nw ? (nNew - 1) * .9 : 0}s">${on ? GB().mvRow(x, 'i' + id) : ''}${!on || nw ? `<button type="button" class="eg-cv" data-a="${on ? '' : rare ? 'egr' : 'egf' + i}"${on ? ' tabindex="-1"' : ''} style="--tc:${rare ? '#d8a020' : GA.TYPE_C?.[x[2]] || '#888'}">${rare && !on ? '' : `<i class="eg-fl" style="width:${on ? 100 : pc}%"></i>`}${rare ? '' : GB().tyTag(x[2], x[3])}<b>${rare ? '? ? ? ? ?' : '???'}</b>${rare && !on ? '' : `<em class="eg-pc">${on ? 100 : pc}%</em><span class="eg-fb">${fo ? '집중 중' : '집중하기'}</span>`}</button>` : ''}${rare ? '<em class="eg-rt">★ 레어 기술</em>' : ''}</div>`; };   /* v20.85 경완 '집중·레어·타입 힌트가 안 느껴짐': 타입·분류 딱지 + 타입 색 게이지 + 오른쪽 집중 버튼, 레어는 금테 리본 */
  const got = E.filter(id => kn.has(id)).length, egL = () => E.map(row).join('');
  const p = pop(`${AW ? `${AW.n > 1 ? `<i class="aw-cnt">${AW.i + 1} / ${AW.n}</i>` : ''}<h4 class="eg-ft eg-lk eg-awh"><small>훈련장</small>특별한 기술을 익혔다!</h4><p class="eg-fs"><b>${esc(nmOf(P))}</b>${K.jong(nmOf(P)) ? '은' : '는'} <b class="eg-awn">${esc(GB().mvKo(AW.mv))}</b>${K.jong(GB().mvKo(AW.mv)) ? '을' : '를'} 익혔다!</p>` : U ? `<h4 class="eg-ft eg-lk">번뜩임!</h4><p class="eg-fs">${esc(nmOf(P))}의 특별한 기술 깨달음이 올랐어요</p>` : '<h4>새로 배운 기술</h4>'}${E.length ? `<div class="mp-mvh eg-h"><small>특별한 기술</small><span>${got} / ${E.length}</span></div>${got < E.length && !U ? '<p class="eg-hint"><b>집중하기</b>를 누른 기술이 훈련에서 빨리 차올라요<br>배틀 중에 번뜩이면 한 번에 크게 올라요</p>' : ''}<div class="mp-moves mp-line eg-l">${egL()}</div>` : ''}
    ${AW ? '<p class="eg-awt">기술을 누르면 설명을 볼 수 있어요</p>' : ''}${lvL.length && !U ? `<div class="mp-mvh eg-h"><small>레벨업으로 배운 기술</small></div><div class="mp-moves mp-line">${lvL.map(x => GB().mvRow(x, 'i' + x[0])).join('')}</div>` : ''}
    ${!E.length && !lvL.length ? '<p class="gy-msg">아직 새로 배운 기술이 없어요.</p>' : ''}<div class="gy-btns one"><button class="main" data-a="x">${AW ? (AW.i + 1 < AW.n ? '다음' : '확인') : '닫기'}</button></div>`,
  (a, close) => { if (a === 'x') { close(); U?.done?.(); return; } if (a === 'egr') { pop(`<h4 class="eg-rh">★ 레어 기술</h4><p class="gy-msg eg-rm">아주 <b>특별한 방법</b>으로만 얻을 수 있는 기술이에요.</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => { if (b === 'x') c(); }).classList.add('eg-rp'); return; }   /* v21.08 경완 '레어 칸 누르면 특별한 방법으로 얻는 기술 설명창' */ if (a && a.startsWith('egf')) { if (AW) return; tickTrain(Date.now()); m.egF = +a.slice(3); sfx('tap'); K.save(); const l = p.querySelector('.eg-l'); if (l) l.innerHTML = egL(); return; } if (a && a[0] === 'i') GB().mvCard(a.slice(1)); }); p.classList.add('eg-pop'); if (AW) p.classList.add('eg-aw');   /* v21.05 경완 '기술 설명은 상점 기술머신 설명 모양으로' */ if (!U && E.length) window.Gym?.k?.tutEv?.('E');
  if (AW) { try { window.GymBGM?.se?.('ME_WAZA'); } catch (e) {} GA.haptic?.(1); }   // v20.96 특별한 기술 튜토리얼
  if (U && !U.got) { const r = [...p.querySelectorAll('.eg-l .eg-cv')].find(b => b.dataset.a === 'egf' + U.i)?.parentElement;
    const fl = r?.querySelector('.eg-fl'), pe = r?.querySelector('.eg-pc');
    if (fl && pe) setTimeout(() => { if (!p.isConnected) return; r.classList.add('egu'); try { window.GymBGM?.se?.('DP_REGI'); } catch (e) {} GA.haptic?.(1); fl.style.transition = 'width 1.1s cubic-bezier(.3,.7,.3,1)'; fl.style.width = Math.floor(U.b) + '%';
      const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / 1100), v = Math.floor(U.a + (U.b - U.a) * (1 - (1 - k) ** 3)); pe.textContent = v + '%'; if (k < 1 && p.isConnected) requestAnimationFrame(f); else r.classList.add('egd'); }; requestAnimationFrame(f); }, 650); }
  if (m && nNew) { m.egS = [...new Set([...(m.egS || []), ...E.filter(id => kn.has(id))])]; K.save();
    for (let i = 0; i < nNew; i++) setTimeout(() => { try { window.GymBGM?.se?.('DP_KIRAKIRA2'); } catch (e) {} GA.haptic?.(1); }, 1150 + i * 900); }
}

/* v16.41 경완 '해당 박스 누르면 전체 훈련 일지 날짜별로': 날마다 한 줄 (최근 날짜가 위)
   v16.48 경완: 창 크기는 상세카드와 같게, 위에 포켓몬 프로필 상자, 오늘 훈련 상자는 빼고, 새 기술·레벨업이 잘 보이게 (딱지·색 띠, 기술 누르면 기술 창) */
function trLogPop(P, from) {
  const L = trLog(P.id), ks = Object.keys(L).map(Number).sort((a, b) => b - a), WD = '일월화수목금토', today = K.dayStart(Date.now()), m = GB().gm(P), e = st().tr.find(x => x.id === P.id), lf = e ? Math.max(0, Math.ceil(leftOf(e))) : 0;
  const tot = ks.reduce((a, k) => { const d = L[k]; a.x += d.x; a.lv += d.lv; a.f += d.f; a.mv += d.mv.length; return a; }, { x: 0, lv: 0, f: 0, mv: 0 });
  /* v16.68 경완 '경험치가 얼마 올랐다! 새로운 기술 무엇을 배웠다! 이런 식으로 문장으로': 하루 = 날짜 줄 + 문장 줄들 */
  const row = k => { const d = L[k], t = new Date(k), up = d.lv > 0, mv = d.mv.length > 0, nm = esc(nmOf(P)), j = K.jong(nmOf(P));
    const ln = [`<li class="tl-s x">경험치가 <b>${d.x.toLocaleString()}</b> 올랐다!</li>`];
    if (up) ln.push(`<li class="tl-s up">레벨이 올랐다! ${d.to ? `Lv.${d.to - d.lv} → <b>Lv.${d.to}</b>` : `<b>▲${d.lv}</b>`}</li>`);
    if (d.f) ln.push(`<li class="tl-s fr">친밀도가 <b>${d.f}</b> 올랐다!</li>`);
    d.mv.forEach(id => { const j = K.jong(GB().mvKo(id)) ? '을' : '를'; ln.push((d.cm || []).includes(id) ? `<li class="tl-s mv cm">코치가 새로운 기술 ${mvChips([id])}${j} 가르쳤다!</li>` : (d.sm || []).includes(id) ? `<li class="tl-s mv">훈련장에서 특별한 기술 ${mvChips([id])}${j} 익혔다!</li>` : `<li class="tl-s mv">새로운 기술 ${mvChips([id])}${j} 배웠다!</li>`); });
    return `<li class="${up ? 'lvup' : ''}${mv ? ' newmv' : ''}"><ul class="tl-ss">${ln.join('')}</ul></li>`; };
  /* v16.71 경완 '훈련 일지는 날짜별로 좌우 화살표로 넘겨서': 하루 한 장, ◀ 전날 · ▶ 다음날, 옆으로 밀어도 넘어감 */
  let i = 0;
  const page = () => { const k = ks[i], t = new Date(k);
    return ks.length ? `<div class="jn-nav tl-nav"><button type="button" data-mv="1" ${i >= ks.length - 1 ? 'disabled' : ''} aria-label="전날">◀</button><b>${t.getMonth() + 1}월 ${t.getDate()}일 <small>(${WD[t.getDay()]})</small>${k === today ? '<i class="jn-today">오늘</i>' : ''}</b><button type="button" data-mv="-1" ${i <= 0 ? 'disabled' : ''} aria-label="다음날">▶</button></div>
      <ul class="tl-list">${row(k)}</ul><p class="tl-pg">${ks.length - i} / ${ks.length}일</p>` : '<p class="gy-msg tl-none">아직 훈련 기록이 없어요.<br>훈련한 만큼 날마다 여기에 쌓여요.</p>'; };
  const p = pop(`<div class="tl-pop">${trHead(P, true)}
    <div class="mp-mvh tl-h"><small>훈련 일지</small></div><div class="tl-body">${page()}</div>
    <div class="gy-btns one"><button class="main" data-a="x">닫기</button></div></div>`, (a, close) => { if (a === 'x') return close(); if (a && a[0] === 'i') GB().mvInfo(a.slice(1)); });
  const bd = p.querySelector('.tl-body');
  bd.addEventListener('click', ev => { const b = ev.target.closest('[data-mv]'); if (!b || b.disabled) return; ev.stopPropagation(); sfx('tap'); i = Math.max(0, Math.min(ks.length - 1, i + +b.dataset.mv)); bd.innerHTML = page(); });
  let sx = null; bd.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  bd.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) < 50) return; bd.querySelector(`[data-mv="${dx > 0 ? 1 : -1}"]`)?.click(); });
  GB().fillTh?.(p); if (from) p.classList.add('tl-wrap');   /* 뒤 상세카드 위에 겹쳐 떠서 배경이 두 번 어두워지던 것 → 겹친 창은 배경을 안 깔고 그대로 */
  const fw = from?.querySelector('.win'), w = p.querySelector('.win'); if (fw && w) { const r = fw.getBoundingClientRect(); w.style.width = r.width + 'px'; w.style.height = r.height + 'px'; w.style.maxWidth = 'none'; }   /* 상세카드와 같은 크기 */
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
  thrift: ['주급은 조금만 주셔도 괜찮아요. 일하게만 해 주세요!', '돈보다 배울 수 있는 곳이 좋아요. 주급은 적당히만요.', '도시락 싸 오고 걸어서 출근해요. 큰돈은 필요 없어요!', '아껴 쓰는 건 자신 있어요. 체육관 비품도 소중히 쓸게요.', '적게 받아도 일은 성실하게! 그게 제 신조예요.'],
  lazy: ['음… 가끔 낮잠을 자지만, 주급은 아주 조금이면 돼요.', '서두르지 않는 편이에요. 대신 주급은 정말 조금만 주세요.', '하아암… 배틀할 땐 깨어 있을게요. 아마도요.', '느긋하게 일하는 대신 욕심도 없어요.', '날씨 좋은 날엔 조금 늦을 수도 있어요. 그래도 괜찮죠?'],
};
const sayOf = c => { const L = LINES[c.trait] || [''], n = Math.abs((c.id | 0) * 2654435761 | 0) || 0; return `${HELLO[n % HELLO.length]} ${L[(n >>> 3) % L.length]}`; };
// 포켓몬 그림 + 레벨: 상자 없이 그림 밑에 작은 글씨 (경완 2026-10-27 '박스 없이 좀 더 깔끔하게')
const teamIc = (T, key) => `<span class="sf-team">${T.map(([sp, lv], i) => `<span${key != null ? ` class="sf-tp" role="button" data-tsp="${sp}" data-tlv="${lv}" data-tk="${key}-${i}"` : ''}><img alt="" data-sp="${sp}"><small>Lv.${lv}</small></span>`).join('')}</span>`;   // key 가 있으면 눌러서 상세카드 (지원서)
// 특성은 상자로 (경완 2026-10-27 '트레이너 특성은 확실하게 박스로')
const trtBox = (s, full, bare) => { const k = s?.trait, T = K.TRAITS[k]; return T ? `<span class="trt trt-${k}">${bare ? '' : '<b>특성</b>'}<i>${T.n}</i>${full ? `<small>${k === 'kind' ? `코치로 있으면 훈련장 친밀도 ${trM(s)}배` : k === 'star' || k === 'money' ? `도전자를 막으면 ${k === 'star' ? '평판' : '골드'} +${Math.round((K.trX(s) - 1) * 100)}%` : T.d}</small>` : ''}</span>` : ''; };   // v21.83 다정함은 코치 % 에 안 들어가 세기를 여기서
// 트레이너: 지원서 탭 / 고용 관리 탭 (경완 2026-10-27)
let sfT = 'sf';   // v17.40 경완: 트레이너 메뉴는 고용 관리 탭이 먼저
// 지원서 남은 시간 (경완 2026-10-28): 우상단에 시:분, 가운데 : 가 깜빡
const cvLeft = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return `${Math.floor(m / 60)}h ${m % 60}m`; };   // 경완 2026-10-28: '남은 시간' 상태박스 안에 h m
setInterval(() => document.querySelectorAll('.cv-left[data-exp]').forEach(e => { e.innerHTML = cvLeft(+e.dataset.exp - Date.now()); }), 20e3);
/* v16.35 경완 '지원서·고용 관리 없을 때 문구 화면 중앙 정렬 줄나눔 가독성': 그림 + 굵은 한 줄 + 설명 두 줄, 남은 자리 한가운데 */
const SF_IC = { mail: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#383848" d="M1 3h14v11H1z"/><path fill="#fffdf4" d="M2 4h12v9H2z"/><path fill="#383848" d="M3 5h1v1H3zM4 6h1v1H4zM5 7h1v1H5zM6 8h1v1H6zM7 9h2v1H7zM9 8h1v1H9zM10 7h1v1h-1zM11 6h1v1h-1zM12 5h1v1h-1z"/><path fill="#e84a3a" d="M7 10h2v2H7z"/></svg>',
  crew: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#383848" d="M5 1h6v1h1v4h-1v1H5V6H4V2h1zM3 8h10v1h1v6H2V9h1z"/><path fill="#ffd8b0" d="M5 3h6v3H5z"/><path fill="#e84a3a" d="M5 2h6v1H5z"/><path fill="#4a7ad8" d="M3 9h10v5H3z"/><path fill="#fffdf4" d="M7 9h2v3H7z"/></svg>' };
/* v16.40 경완 '오늘 630G인데 이번 주 90G?': 이번 주(s.eg)는 주급날에 0으로 돌아가서 오늘보다 작을 수 있었다 → 둘 다 일지(g.days)에서 오늘 / 최근 7일(오늘 포함)로 */
const sfEarn = x => { const g = st(), nm = `${x.cls} ${x.nm}`, t0 = K.dayStart(Date.now()); let d1 = 0, d7 = 0; try { K.dayRec(); } catch (e) {} for (const [k, d] of Object.entries(g.days || {})) { const v = d?.sf?.[nm]?.g || 0; if (!v) continue; const kk = +k; if (kk === t0) d1 += v; if (kk > t0 - 7 * K.DAY) d7 += v; } return [d1, d7]; };
const sfFace = x => `<div class="sf-face"><i class="sfc-base"></i><img alt="" src="${K.trSrc(x.tr)}"></div>`;
const sfEmpty = (ic, t, d) => `<div class="sf-void">${ic ? `<span class="sf-void-ic">${SF_IC[ic]}</span>` : ''}<b>${t}</b><p>${d}</p></div>`;
function drawStaff() {
  const g = st(), now = Date.now(), max = K.staffMax();
  const C = g.cands || (g.cands = []); if (C.length && !g.candSeen && sfT === 'cand') { g.candSeen = 1; K.setAt(); K.save(); K.menuDot(); }   // 지원서 탭을 보면 빨간 점이 꺼진다 (경완 2026-10-29)
  const c = C.length, yN = g.sf.filter(s => s.yard).length;
  const tabs = `<div class="sp-tabs" role="tablist"><button role="tab" data-sft="sf" aria-selected="${sfT === 'sf'}">고용 관리</button><button role="tab" data-sft="cand" aria-selected="${sfT === 'cand'}">지원서${c && !g.candSeen ? ' <i class="tdot"></i>' : ''}</button></div>`;
  // 지원서 (경완 2026-10-28): 스프라이트가 잘 보이는 세로 카드, 여러 장이면 옆으로 넘긴다. 면접 내용도 카드 안에, 바로 고용하기
  const cand = c ? `<div class="cv-deck">${C.map((x, i) => `<article class="cv-card" data-i="${i}"><header><b>트레이너 지원서</b><span class="cv-tm"><em>남은 시간</em><b class="cv-left" data-exp="${x.exp}">${cvLeft(x.exp - now)}</b></span></header>
      <div class="cv-photo"><img alt="" src="${K.trSrc(x.tr)}"><div class="cv-nm"><small>${esc(x.cls)}</small><b>${esc(x.nm)}</b></div></div>
      <p class="cv-say">“${esc(sayOf(x))}”</p>
      <dl class="cv-dl"><dt>특성</dt><dd>${trtBox(x, true, true)}</dd><dt>코치 실력</dt><dd>${ckBox(x, false, true)}</dd><dt>포켓몬</dt><dd>${teamIc(x.team, x.id)}</dd><dt>평균 레벨</dt><dd>Lv.${Math.round(K.teamLv(x.team))}</dd><dt>희망 주급</dt><dd>7일에 <b>${x.wage.toLocaleString()}G</b></dd></dl>
      <div class="cv-btns"><button class="gy-key" data-no="${i}">돌려보내기</button><button class="gy-key main" data-hire="${i}">고용하기</button></div></article>`).join('')}</div>
      ${C.length > 1 ? `<div class="cv-dots">${C.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}`
      : sfEmpty('', '지금은 지원서가 없어요', '새 지원자가 오면<br>트레이너 단추에 빨간 점이 떠요.');
  const gL = K.sfList ? K.sfList() : [], gNo = x => gL.findIndex(z => z[0] === x);
   /* v16.36 경완 '번 돈이 일지랑 안 맞음': 일지는 하루, 카드는 주급날부터라 달랐음 → 카드에 '오늘'(일지와 같은 값)과 '이번 주'를 따로 */
  const rib = x => K.inGym(x) ? `<i class="sfc-rib g">체육관${gNo(x) >= 0 ? ` ${gNo(x) + 1}번` : ''}</i>` : x.yard ? '' : '<i class="sfc-rib">대기 중</i>';
  const list = g.sf.length ? `<div class="sf-list sfl2">${g.sf.map((s, i) => { const st = [s.rest ? '<em class="r">쉬는 중</em>' : '', ].join('');
      return `<button class="sfc${s.rest ? ' rest' : ''}${s.yard ? ' yard' : ''}" data-sf="${i}">${rib(s)}${s.yard ? '<i class="sd2-coach sfc-coach">훈련장 코치</i>' : ''}<span class="sfc-pic"><i class="sfc-base"></i><img alt="" src="${K.trSrc(s.tr)}"></span>
      <span class="sfc-mid"><span class="sfc-nm"><small>${esc(s.cls)}</small><b>${esc(s.nm)}</b></span>${trtBox(s)}${ckBox(s)}${st ? `<span class="sfc-st">${st}</span>` : ''}</span><i class="sfc-go" aria-hidden="true">›</i>
      <span class="sfc-team"><i class="sfc-tag">라인업</i>${teamIc(s.team)}</span>
      <span class="sfc-num"><span><small>전적</small><b>${s.w || 0}승 ${s.l || 0}패</b></span><span><small>주급 (7일)</small><b class="pay">${s.wage.toLocaleString()}G</b></span>${(([d1, d7]) => `<span><small>오늘 번 돈</small><b class="${d1 ? 'up' : ''}">${d1.toLocaleString()}G</b></span><span><small>최근 7일</small><b class="${d7 >= s.wage ? 'up' : 'dn'}">${d7.toLocaleString()}G</b></span>`)(sfEarn(s))}</span></button>`; }).join('')}</div>`
    : sfEmpty('', '아직 고용한 트레이너가 없어요', '지원서 탭에서 마음에 드는<br>트레이너를 고용해 보세요.');
  sh.innerHTML = `<div class="sf-hd"><h3>트레이너</h3><span class="sf-cap"><span><small>고용</small><b>${g.sf.length}<em>/${max}명</em></b></span><span><small>훈련장 코치</small><b>${yN}<em>/${YARD_SF}명</em></b></span></span></div>${tabs}${sfT === 'cand' ? cand : list}`;
  const dk = sh.querySelector('.cv-deck'); if (dk) dk.onscroll = () => { const i = Math.round(dk.scrollLeft / (dk.firstElementChild.offsetWidth + 12)); sh.querySelectorAll('.cv-dots i').forEach((d, j) => d.classList.toggle('on', i === j)); };
  sh.onclick = e => {
    const tp = e.target.closest('[data-tsp]'); if (tp) { sfx('tap'); return GB().foePop(+tp.dataset.tsp, +tp.dataset.tlv, tp.dataset.tk); }   // 지원서 포켓몬 → 상세카드 (경완 2026-10-29)
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.sft) { sfT = b.dataset.sft; redraw(); return; }
    if (b.dataset.no) return reject(C[+b.dataset.no]);
    if (b.dataset.hire) return hire(C[+b.dataset.hire]);
    if (b.dataset.sf) return sfDetail(g.sf[+b.dataset.sf]);
  };
}
// 고용 트레이너 자세히 (경완 2026-10-27 '고용한 트레이너 카드 누르면 상세 정보'): 전신·특성·포켓몬·전적·주급과 배치 단추
/* v16.68 경완 '고용 트레이너 상세카드에 자리 바꾸기 없애고, 체육관 홈에서 트레이너 누르면 뜨는 카드(같은 카드)에 자리 바꾸기': home = 홈에서 연 카드 */
function sfDetail(s, home) {
  const g = st(), now = Date.now(); if (!s) return; const i = g.sf.indexOf(s), yN = g.sf.filter(x => x.yard).length, lv = Math.round(K.teamLv(s.team));
  const gb = home,   /* v21.29 경완 '체육관 배치 버튼 빼고 고용하면 알아서 체육관에': 자리 바꾸기는 홈에서 연 카드에만 */ up = !home && i > 0, bn = (gb ? 1 : 0) + 2 + (up ? 1 : 0), gi = K.sfList ? K.sfList().findIndex(z => z[0] === s) : -1, dd = Math.max(0, Math.ceil((s.pay - now) / K.DAY));
  const W = s.w || 0, L = s.l || 0, wr = W + L ? W / (W + L) : 0, [tg, eg] = sfEarn(s);
  const bar = (f, c) => `<i class="sd2-bar ${c || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%"></i></i>`;
  const rib = K.inGym(s) ? `<i class="sfc-rib g">체육관${gi >= 0 ? ` ${gi + 1}번` : ''}</i>` : s.yard ? `<i class="sfc-rib y">훈련장 코치${ckIn(s)}</i>` : '<i class="sfc-rib">대기 중</i>';
  /* v16.35~36 경완 '상세 카드 디자인 퀄': 위는 지원서처럼 배경 + 받침 위 전신과 자리 딱지, 아래는 라인업 · 막대가 있는 숫자 칸 */
  const p = pop(`<div class="sd2">${K.inGym(s) || !s.yard ? rib.replace('sfc-rib', 'sfc-rib sd2-corner') : ''}<div class="sd2-hero">${s.yard ? '<i class="sd2-coach">훈련장 코치</i>' : ''}<img alt="" src="${K.trSrc(s.tr)}"><div class="sd2-nm"><small>${esc(s.cls)}</small><b>${esc(s.nm)}</b></div>${s.rest ? '<em class="sd2-rest">쉬는 중</em>' : ''}</div>
    <div class="sd2-trt">${trtBox(s, true)}${ckBox(s, true)}</div>
    <p class="sd2-h">라인업 <small>평균 Lv.${lv}</small></p>
    <div class="sd2-team">${s.team.map(([sp, l]) => `<span><img alt="" data-sp="${sp}"><b>${esc(SPECIES[sp]?.n || '???')}</b><small>Lv.${l}</small></span>`).join('')}</div>
    <p class="sd2-h">기록</p>
    <div class="sd2-rec">   <!-- v16.63 경완 '기록 부분 보기 쉽게': 네 칸 막대 대신 한 줄씩 (이름 · 값 · 설명) -->
      <div><span>전적</span><b>${W}승 ${L}패</b><em>${W + L ? `승률 <b class="${wr >= .5 ? 'up' : 'dn'}">${Math.round(wr * 100)}%</b>` : '아직 없어요'}</em></div>
      <div><span>주급</span><b class="pay">${s.wage.toLocaleString()}G</b><em>${s.rest ? '<b class="dn">밀렸어요</b>' : `7일마다 · <b>${dd}일 뒤</b>`}</em></div>
      <div><span>번 돈</span><b class="${eg >= s.wage ? 'up' : 'dn'}">${eg.toLocaleString()}G</b><em>최근 7일 · 오늘 ${tg.toLocaleString()}G</em></div>
      <div><span>고용</span><b>${s.hired ? `${Math.max(0, Math.floor((now - s.hired) / K.DAY)) + 1}일째` : '-'}</b><em>${s.lastE != null ? `지난주 ${s.lastE.toLocaleString()}G` : '첫 주예요'}</em></div></div>
    <div class="gy-btns sd-btns${bn === 3 ? ' three' : bn === 4 ? ' four' : ''}"><button data-a="yd" ${s.yard ? 'class="sd2-in"' : !s.yard && yN >= YARD_SF ? 'disabled' : ''}>${s.yard ? '코치 빼기' : '코치 맡기기'}</button>${gb ? `<button data-a="gym">${K.inGym(s) ? '자리 바꾸기' : '체육관에 배치'}</button>` : ''}
      ${up ? '<button data-a="up">순서 앞으로</button>' : ''}<button data-a="fire" class="danger">해고</button><button class="main" data-a="x" style="grid-column:1/-1">닫기</button></div></div>`,
    (a, close) => {
      if (a === 'x') return close();
      if (a === 'gym') { close(); return K.sfPlace(s, home ? () => {} : () => { K.openTab?.('staff'); }); }   // 홈에서 연 카드는 자리 바꾼 뒤 홈 그대로
      if (a === 'yd') { tickTrain(Date.now()); s.yard = s.yard ? 0 : 1; K.glog('sf', `${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} ${s.yard ? '훈련장 코치로 배치했다.' : '훈련장 코치에서 뺐다.'}`); K.save(); close(); redraw(); K.renderHome(); return sfDetail(s, home); }
      if (a === 'up') { const k = g.sf.indexOf(s); if (k > 0) { [g.sf[k - 1], g.sf[k]] = [g.sf[k], g.sf[k - 1]]; K.save(); } close(); redraw(); K.renderHome(); return sfDetail(s); }
      if (a === 'fire') { close();   /* v16.41 경완 '해고할 때는 지금까지 일한 수당은 챙겨줘야 함': 이번 주급 주기에서 일한 날만큼 (쉬는 중이면 일 안 했으니 없음) */
        const wd = s.rest ? 0 : Math.max(1, Math.min(7, Math.ceil((now - (s.pay - 7 * K.DAY)) / K.DAY - .01))), amt = s.rest ? 0 : Math.round(s.wage * wd / 7);
        pop(`${sfFace(s)}<h4>해고할까요?</h4><p class="gy-msg">${esc(s.cls)} <b>${esc(s.nm)}</b>${K.jong(s.nm) ? '을' : '를'} 해고해요.${amt ? `<br>지금까지 일한 <b>${wd}일치 수당 ${amt.toLocaleString()}G</b>를 줘요.` : ''}</p><div class="gy-btns"><button data-a="x">아니요</button><button class="main" data-a="y">${amt ? `${amt.toLocaleString()}G 주고 해고` : '해고'}</button></div>`,
        (b2, c2) => { c2(); if (b2 !== 'y') return sfDetail(s, home); if (amt && !spend(amt)) return say(`골드가 모자라요. 수당 ${amt.toLocaleString()}G가 필요해요.`); if (amt) { try { K.dayRec().p += amt; window.pkGold?.('wage', amt); } catch (e) {} }
          g.sf = g.sf.filter(x => x !== s); K.glog('sf', `${esc(s.cls)} ${esc(s.nm)}${K.jong(s.nm) ? '을' : '를'} 해고했다.${amt ? ` <small>수당 ${amt.toLocaleString()}G</small>` : ''}`); K.save(); redraw(); K.renderHome(); }); }
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
  if (g.sf.length >= K.staffMax()) return pop(`<div class="sf-face full">${g.sf.slice(0, 5).map(x => `<img alt="" src="${K.trSrc(x.tr)}">`).join('')}</div><h4>트레이너 자리가 꽉 찼어요</h4><p class="gy-msg">지금 <b>${g.sf.length}/${K.staffMax()}명</b>이에요.<br>체육관 등급을 올리거나<br>한 명을 해고하면 고용할 수 있어요.</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (a, close) => close());
  /* v15.60 경완: 고용할지 한 번 묻고, 고용하면 효과음과 함께 고용 관리 탭으로 */
  pop(`${sfFace(c)}<h4>고용할까요?</h4><p class="gy-msg">${esc(c.cls)} <b>${esc(c.nm)}</b>${K.jong(c.nm) ? '을' : '를'} 고용해요.<br>첫 주 주급 <b>${c.wage.toLocaleString()}G</b>를 바로 내요.</p><div class="gy-btns"><button data-a="x">아니요</button><button class="main" data-a="y">고용하기</button></div>`, (a, close) => {
    close(); if (a !== 'y') return;
    if (!spend(c.wage)) return say(`골드가 모자라요. 첫 주 주급 ${c.wage.toLocaleString()}G가 필요해요.`); try { window.pkGold?.('wage', c.wage); } catch (e) {} try { K.dayRec().p += c.wage; } catch (e) {}
    const now = Date.now(); g.sf.push(Object.assign({}, c, { hired: now, pay: now + 7 * K.DAY, w: 0, l: 0, xp: 0 })); dropCand(c);
    K.glog('sf', `${esc(c.cls)} <b>${esc(c.nm)}</b>${K.jong(c.nm) ? '을' : '를'} 고용했다! <small>주급 ${c.wage.toLocaleString()}G</small>`); K.save();
    try { const M = window.GymBGM; M?.fan ? M.fan('ME_FANFA1') : M?.se('ME_FANFA1'); } catch (e) {}
    sfT = 'sf'; redraw(); K.renderHome();
  });
}

// ======================= 상점 (5단계) =======================
const SHOP_T = [['tm', '기술머신'], ['tr', '기술레코드'], ['it', '도구'], ['deco', '꾸미기']];   // v14.79 경완 '의상 탭 아직 넣지마': 필드 걸음 그림까지 바꾼 뒤에 (shopFit 은 남겨 둠)
// 이전:   // 넓히기는 빼고 등급 따라 저절로 (경완 2026-10-28)
const tmPrice = x => x[3] === 2 ? 500 : (x[4] || 0) <= 50 ? 300 : x[4] <= 70 ? 700 : x[4] <= 85 ? 1200 : x[4] <= 100 ? 2000 : 3000;
const prBtn = () => `<button class="tm-sort" type="button" data-pr="1">${shopPr > 0 ? '가격 낮은 순 ▼' : '가격 높은 순 ▲'}</button>`;
// v17.58 경완: 기술머신·기술레코드·도구 탭 위 줄 전체 '추천받기' → 라인업 포켓몬 고르기 → 그 포킷몬에게 추천할 만한 것만
const recMon = () => { const P = shRec != null && S.box.find(p => p.id === shRec); return P && luMons().some(x => x.id === P.id) ? P : null; };
const luMons = () => [...new Set((GB().lus() || []).flat())].map(id => S.box.find(p => p.id === id)).filter(Boolean);
function recBar() { if (!['tm', 'tr', 'it'].includes(shopT)) return ''; const P = recMon();   // v17.67 경완: 작은 버튼으로 보유 골드 왼쪽에
  return P ? `<div class="sp-recs on"><button type="button" class="sp-recsb" data-rec="pick" aria-label="추천 포켓몬 바꾸기"><span class="sp-recth">${GB().thumb(P)}</span><b>${esc(nmOf(P))}</b></button><button type="button" class="sp-recsx" data-rec="off" aria-label="추천 끄기">✕</button></div>`   /* v20.66 경완: 추천받기 켜면 이름 옆 ✕ (누르면 끔) */
    : `<button type="button" class="sp-recs sp-recsb" data-rec="pick"><i class="sp-recic" aria-hidden="true">★</i><b>추천받기</b></button>`; }
// v17.82 경완 '추천받기 버튼 도구 탭이랑 정렬 맞추고 폰트·여백도 탭이랑, 테두리는 검정': 도구 탭과 같은 가로 자리·폭
function recAlign() { const r = sh.querySelector('.sp-recs'), t = sh.querySelector('.sp-tabs [data-st=it]'), hd = sh.querySelector('.sf-hd'); if (!r || !t || !hd) return;
  const a = t.getBoundingClientRect(), h = hd.getBoundingClientRect(); if (!a.width) return; r.style.left = (a.left - h.left) + 'px';
  if (r.classList.contains('on')) { const tl = sh.querySelector('.sp-hl')?.getBoundingClientRect(); r.style.left = ''; r.style.width = ''; r.style.right = (h.right - a.right) + 'px'; r.style.minWidth = a.width + 'px'; r.style.maxWidth = (tl ? a.right - tl.right - 8 : a.width * 2) + 'px'; r.style.minWidth = (a.width + 22) + 'px'; } else { r.style.right = ''; r.style.minWidth = r.style.maxWidth = ''; r.style.width = a.width + 'px'; } }   // v17.88 경완: 켜지면 도구 탭 오른쪽 끝에 맞추고 이름이 길면 왼쪽으로 늘어남
addEventListener('resize', () => { try { recAlign(); } catch (e) {} });
function recPick() {   // v17.61 경완: 라인업 1·2·3 탭
  GB().loadSim?.().catch(() => {});   // v19.65: 고르는 동안 미리
  const LU = GB().lus() || [[], [], []], mons = k => (LU[k] || []).map(id => S.box.find(p => p.id === id)).filter(Boolean);
  if (!LU.some((_, k) => mons(k).length)) return say('라인업에 포켓몬이 없어요. 포켓몬 메뉴에서 라인업을 먼저 짜 주세요.');
  let t = LU.findIndex(L => L.includes(shRec)); if (t < 0) t = st().luI | 0; if (!mons(t).length) t = LU.findIndex((_, k) => mons(k).length);
  const pane = k => { const L = mons(k); return L.length ? `<div class="sp-recl">${L.map(P => `<button type="button" class="sp-recp${P.id === shRec ? ' on' : ''}" data-a="p${P.id}">${GB().thumb(P)}<b>${esc(nmOf(P))}</b><small>Lv.${GB().gm(P).lv}</small></button>`).join('')}</div>` : '<p class="sf-none sp-recn">이 라인업은 비어 있어요.</p>'; };
  const w = pop(`<h4>누구에게 추천할까요?</h4><div class="sp-tabs sp-lut" role="tablist">${[0, 1, 2].map(k => `<button type="button" role="tab" data-a="t${k}" aria-selected="${k === t}">라인업 ${k + 1}</button>`).join('')}</div><div class="sp-recpn">${pane(t)}</div><div class="gy-btns${shRec ? '' : ' one'}">${shRec ? '<button data-a="off">추천 끄기</button>' : ''}<button data-a="x">닫기</button></div>`, (a, close) => {   // v17.88 경완: ✕ 없애고 이 창에서 추천 끄기
    if (a[0] === 't') { sfx('tap'); t = +a.slice(1); w.querySelectorAll('.sp-lut [role=tab]').forEach((b, k) => b.setAttribute('aria-selected', k === t)); w.querySelector('.sp-recpn').innerHTML = pane(t); GB().fillTh(w); return; }
    if (a === 'off') { close(); shRec = null; redraw(); return; }
    close(); if (a[0] !== 'p') return; shRec = +a.slice(1) || a.slice(1); redraw(); }); }
function drawShop() {
  const goIt = window.gymShopIt, goMint = window.gymShopMint; window.gymShopIt = window.gymShopMint = null;   // v17.57 경완: 상세카드 추천 도구·추천 성격 → 상점 도구 탭의 그 도구·민트 사기 창으로 바로
  if (goIt || goMint) { shopT = 'it'; shRec = null; }
  if (!SHOP_T.some(([k]) => k === shopT)) shopT = 'tm';
  const back = window.gymShopBack, BK_N = { battle: back?.opt?.pick ? '배틀 라인업' : '포켓몬', train: '훈련장', staff: '트레이너' };
  sh.innerHTML = `<div class="sp-top"><div class="sf-hd"><span class="sp-hl">${back ? `<button type="button" class="bw-x sp-back" data-bk="1" aria-label="${BK_N[back.t] || '이전 화면'}으로 돌아가기">‹</button>` : ''}<h3>체육관 상점</h3></span><span class="sf-cap"><span><small>보유 골드</small><b class="sp-gold"><i class="coin"></i><span class="gy-goldn">${/[?&]studio/.test(location.search) ? '∞' : S.gold.toLocaleString()}</span>G</b></span></span></div><div class="sp-tabs" role="tablist">${SHOP_T.map(([k, n]) => `<button role="tab" data-st="${k}" aria-selected="${shopT === k}">${n}${k !== shopT && shopNewOf(k).length ? '<i class="tdot"></i>' : ''}</button>`).join('')}</div></div><div class="sp-body"></div>`;   // 탭은 다시 위 작은 탭 (경완 2026-10-28)
  const body = sh.querySelector('.sp-body');
  GB().loadSim?.().catch(() => {});   /* v19.65 경완 '추천리스트 불러오는 중 뜨지 않고 바로': 상점을 열 때 추천 점수용 쇼다운 자료를 미리 받아 둔다 */
  ({ tm: b => shopTm(b, false), tr: b => shopTm(b, true), it: shopIt, deco: shopDeco, fit: shopFit })[shopT](body);
  { const NW = shopSeeT(shopT), dot = el => { if (!el.querySelector('.nwdot')) el.insertAdjacentHTML('beforeend', '<i class="nwdot"></i>'); };   // v20.78 새로 들어온 칸에 점
    const mark = () => NW.size && body.querySelectorAll('[data-tm],[data-it],[data-mint],[data-vit],[data-dc]').forEach(b => { const d = b.dataset, k = d.tm ? 'tm:' + d.tm : d.it ? 'it:' + d.it : d.mint ? 'mint:' + d.mint : d.vit != null ? 'vit:' + d.vit : 'deco:' + d.dc; if (NW.has(k)) dot(b); });
    mark(); if (NW.size) new MutationObserver((r, o) => { if (!body.isConnected) return o.disconnect(); o.disconnect(); mark(); o.observe(body, { childList: true, subtree: true }); }).observe(body, { childList: true, subtree: true }); K.menuDot?.(); }
  { const f = body.firstElementChild; if (f?.classList.contains('tm-row')) sh.querySelector('.sp-top').appendChild(f); }   /* v17.61 경완: 추천받기는 필터 줄 밑에 */ sh.querySelector('.sf-cap')?.insertAdjacentHTML('afterbegin', recBar()); recAlign();   /* v17.34 경완 '꾸미기 상점처럼 위쪽 고정, 필터 포함': 제목·골드·탭·필터 줄은 스크롤해도 위에 붙어 있음 */
  const inner = body.onclick; body.onclick = null;
  sh.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.bk) { sfx('tap'); window.gymShopBack = null; K.openTab(back.t, back.opt || undefined); if (back.re) setTimeout(back.re, 0); return; } if (b.dataset.st) { sfx('tap'); if (b.dataset.st !== shopT) shopLeave(shopT); shopT = b.dataset.st; redraw(); return; } if (b.dataset.pr) { sfx('tap'); shopPr = -shopPr; redraw(); return; } if (b.dataset.rec) { sfx('tap'); if (b.dataset.rec === 'off') { shRec = null; redraw(); return; } return recPick(); } inner?.(e, b); };
  if (goIt || goMint) { const b = sh.querySelector(goIt ? `.sp-body [data-it="${goIt}"]` : `.sp-body [data-mint="${goMint}"]`); if (b) { b.classList.add('sp-go'); b.scrollIntoView({ block: 'center' }); setTimeout(() => document.addEventListener('pointerdown', () => b.classList.remove('sp-go'), { capture: true, once: true }), 0); }   /* v18.08 경완: 빛 테두리는 은은하게 계속, 그 칸·다른 곳·빈 곳을 누르면 꺼짐 */ }   // v17.58 경완: 그 칸을 가운데로 + 빛나게 (사기 창은 눌러서)
}
/* v20.78 경완 '체육관 상점도 추가되는 거 있으면 빨간 점': 새로 살 수 있게 된 칸(업데이트로 들어온 물건, 등급이 올라 풀린 꾸미기, 새 포켓몬으로 늘어난 기술머신)에 점.
   g.shSeen {키: 1} = 본 칸. 처음엔 지금 있는 것 모두 본 걸로. 탭을 열면 본 걸로 저장하되 그 탭을 보는 동안(탭 바꾸기·상점 닫기 전)엔 점을 그대로 둔다 */
function shopKeys(t) { const g = st(), B = GB(), D = B?.D; if (!D) return [];
  if (t === 'tm' || t === 'tr') { const K2 = new Set(); S.box.filter(P => (SPECIES[P.sp]?.t || []).includes(g.ty)).forEach(P => GB().tmOf(P.sp).forEach(i => { const id = D.mv[i]?.[0]; if (id && B.isTR(id) === (t === 'tr')) K2.add('tm:' + id); })); return [...K2]; }
  if (t === 'it') return [...B.IT_CAT.flatMap(([, , ids]) => ids.filter(id => B.HOLD[id]).map(id => 'it:' + id)), ...B.MINT.map(k => 'mint:' + k), ...(B.evOn?.() ? B.EV_VIT.map((_, i) => 'vit:' + i) : [])];
  if (t === 'deco') { const G = K.gradeOf(g.rep || 0).i; return Object.entries(K.DECO).filter(([, o]) => G >= o.lv).map(([k]) => 'deco:' + k); }
  return []; }
const shNow = {};   // 지금 보는 탭에서 점을 띄울 칸 (탭을 떠나면 비움)
function shopNewOf(t) { const g = st(), L = shopKeys(t); if (!g.shSeen) { g.shSeen = {}; SHOP_T.forEach(([k]) => shopKeys(k).forEach(x => { g.shSeen[x] = 1; })); K.save(); } return L.filter(x => !g.shSeen[x]); }
function shopHas() { try { const g = st(); if (!g?.d || !GB()?.D || K.lockedT?.('shop')) return false; return SHOP_T.some(([k]) => (shNow[k]?.size && k !== (cur === 'shop' ? shopT : '')) || shopNewOf(k).length); } catch (e) { return false; } }
function shopSeeT(t) { const g = st(), N = shopNewOf(t); if (N.length) { shNow[t] = new Set([...(shNow[t] || []), ...N]); N.forEach(x => { g.shSeen[x] = 1; }); K.save(); } return shNow[t] || new Set(); }
function shopLeave(t) { if (t) delete shNow[t]; else for (const k in shNow) delete shNow[k]; K.menuDot?.(); }
// 기술머신: 내 체육관 타입 포켓몬이 배울 수 있는 기술. 사면 창고(g.tms {기술: 개수})에 들어가고, 가르치기는 포켓몬 정보 창의 '기술 가르치기'에서 (경완 2026-10-27)
function shopTm(body, wantTR) {   /* v15.75 경완: 기술머신 탭·기술레코드 탭 따로 */
  const D = GB().D, g = st(), mons = S.box.filter(P => (SPECIES[P.sp]?.t || []).includes(g.ty)); g.tms = g.tms || {};
  const can = new Map(); mons.forEach(P => GB().tmOf(P.sp).forEach(i => { if (GB().isTR(D.mv[i][0]) !== !!wantTR) return; if (!can.has(i)) can.set(i, []); can.get(i).push(P); }));
  const types = [...new Set([...can.keys()].map(i => D.mv[i][2]))].sort((a, b) => a - b);
  if (tmTy !== -1 && !types.includes(tmTy)) tmTy = -1;   // -1 = 전체 (경완 2026-10-27 '에스퍼 포켓몬이라고 에스퍼 기술만 배우는 건 아닌데')
  if (recMon() && !window.PSim) { body.innerHTML = ''; GB().loadSim().then(() => redraw()); return; }   // 추천 점수는 쇼다운 기술 정보(특성·연속기 등)를 써서 처음 한 번 받아 옴
  const RP = recMon(), RL = RP && GB().recTms(RP, wantTR);   // 추천받기: 그 포켓몬 추천 기술만 (추천 순), (v17.82: 타입·형태 필터는 아래 fOk 로 적용)
  const fOk = x => (tmTy === -1 || x[2] === tmTy) && (tmCat === -1 || x[3] === tmCat);   // v17.82 경완 '추천받기 켜도 필터는 그대로': 추천 목록에도 타입·형태 필터
  const L = RP ? RL.map(id => GB().mvOf(id)).filter(x => x && fOk(x)).sort((a, b) => (tmPrice(a) - tmPrice(b)) * shopPr) : [...can.keys()].map(i => D.mv[i]).filter(x => (tmTy === -1 || x[2] === tmTy) && (tmCat === -1 || x[3] === tmCat)).sort((a, b) => RP ? 0 : (tmPrice(a) - tmPrice(b)) * shopPr || a[2] - b[2] || (b[4] || 0) - (a[4] || 0));   // 가격순 (경완 2026-10-29 '위력순 말고 가격순')   // 모든 타입이면 타입별로 묶고 그 안에서 위력순 (경완 2026-10-29)
  body.innerHTML = `
    ${types.length ? `<div class="tm-row"><button class="fsel${tmTy !== -1 ? ' on' : ''}" data-f="ty">${tmTy === -1 ? '모든 타입' : TYPE_KO[tmTy]}</button><button class="fsel${tmCat !== -1 ? ' on' : ''}" data-f="cat">${tmCat === -1 ? '모든 형태' : ['물리', '특수', '변화'][tmCat]}</button>${prBtn()}</div>` : `<p class="sf-none">${TYPE_KO[g.ty]} 타입 포켓몬이 아직 없어요.</p>`}
    ${RP && !L.length ? `<p class="sf-none sp-recnone">${tmTy !== -1 || tmCat !== -1 ? '해당 필터에' : `${esc(nmOf(RP))}에게`} 추천할 ${wantTR ? '기술레코드가' : '기술머신이'} 없어요.</p>` : ''}
    ${!RP && types.length && !L.length ? `<p class="sf-none">조건에 맞는 ${wantTR ? '기술레코드가' : '기술머신이'} 없어요.</p>` : ''}
    ${L.length ? `<p class="sp-sub tm-kdl${wantTR ? ' tr' : ''}"><i class="tm-kdb">${wantTR ? '1회용' : '계속 사용'}</i>${wantTR ? '한 번 가르치면 없어져요' : '한 번 사면 몇 번이든 가르칠 수 있어요'}</p>` : ''}<div class="sp-list">${L.map(x => { const tr = GB().isTR(x[0]), own = !tr && g.tms[x[0]] > 0; return `<button class="sp-tm${own ? ' own' : ''}" data-tm="${x[0]}"${own ? ' disabled' : ''}><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png"><span class="tm-nm">${tr ? '<i class="tm-tr">TR</i>' : ''}<b>${esc(x[1])}</b></span><span class="tm-meta">${GB().tyTag(x[2], x[3])}<small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}</small></span><em>${own ? '보유 중' : gold(tmPrice(x))}</em></button>`; }).join('')}</div>`;
  // 필터는 눌러서 고르는 목록으로 (경완 2026-10-28 '모든 항목을 나열하지 말고')
  // 필터: 도감처럼 단추를 누르면 목록 창 (경완 2026-10-28)
  const fPick = f => { const O = f === 'ty' ? [[-1, '모든 타입'], ...types.map(t => [t, TYPE_KO[t], t])] : [[-1, '모든 형태'], ...['물리', '특수', '변화'].map((n, c) => [c, n, null, `<img class="fo-cat" alt="" src="${K.IMG}bt/cat_${c}.png">`])];   // 포켓몬 박스 필터와 같은 목록 창 (경완 2026-10-30)
    K.fPop(f === 'ty' ? '타입' : '형태', O, f === 'ty' ? tmTy : tmCat, v => { if (f === 'ty') tmTy = v; else tmCat = v; redraw(); }); };
  body.onclick = (e, b) => { sfx('tap'); if (b.dataset.f) return fPick(b.dataset.f); if (b.dataset.pow) { tmPow = -tmPow; redraw(); return; } if (b.dataset.tm) buyTm(b.dataset.tm, can); };
}
/* v19.49 경완: 기술머신(계속 씀)·기술레코드(한 번 쓰면 없어짐) 안내를 색 딱지로 구분, 사기 창에 라인업에서 배울 수 있는 포켓몬 목록(스프라이트) */
const tmKdBox = id => { const tr = GB().isTR(id); return `<div class="tm-kd${tr ? ' tr' : ''}"><div class="tm-kdr"><i class="tm-kdb">${tr ? '1회용' : '계속 사용'}</i><span>${tr ? '기술레코드는 한 번 가르치면 없어져요.' : '기술머신은 한 번 사면 몇 번이든 가르칠 수 있어요.'}</span></div></div>`; };   // v19.49 경완: 기술 설명은 위 기술 칸 안으로(진한 글자)
function tmWho(id, i) {
  const D = GB().D, M = luMons().filter(P => GB().tmOf(P.sp).includes(i)), kn = P => GB().gm(P).mv.includes(id), L = [...M.filter(P => !kn(P)), ...M.filter(kn)], n = L.length - L.filter(kn).length;
  const h = `<p class="tm-whoh">라인업에서 배울 수 있는 포켓몬${n ? ` <b>${n}</b>` : ''}</p>`;
  if (!L.length) return `${h}<p class="tm-who0">라인업에 배울 수 있는 포켓몬이 없어요.</p>`;
  return `${h}<div class="tm-who${L.length > 4 ? ' many' : ''}${L.length > 8 ? ' scr' : ''}">${L.map(P => `<button type="button" class="tm-wp${kn(P) ? ' kn' : ''}" data-a="wp${P.id}">${GB().thumb(P)}<b>${esc(nmOf(P))}</b>${kn(P) ? '<small>이미 앎</small>' : ''}</button>`).join('')}</div>`;
}
function buyTm(id, can) {
  const D = GB().D, g = st(), x = GB().mvOf(id), i = D.mv.indexOf(x), price = tmPrice(x), L = can.get(i) || [], n = g.tms?.[id] || 0;
  const kd = GB().tmKind(id); if (!GB().isTR(id) && n > 0) return;   /* 기술머신은 한 번 사면 계속 (v15.69) */
  pop(`${GB().tmHead(id, n)}${GB().tmBody(x)}${tmKdBox(id)}${tmWho(id, i)}
    <div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="buy">${gold(price)} 사기</button></div>`, (a, close) => {
    if (a === 'x') return close(); if (a.startsWith('wp')) return GB()._monPop(+a.slice(2) || a.slice(2), 'view');   // v20.60 경완: 배울 수 있는 포켓몬을 누르면 그 포켓몬 상세카드
    if (a !== 'buy') return;
    if (!buy(price)) { close(); return say(`골드가 모자라요. ${price.toLocaleString()}G가 필요해요.`); }
    close(); g.tms = g.tms || {}; g.tms[id] = (g.tms[id] || 0) + 1; K.newMark?.('tm', id); K.glog('tr', `${kd} <b>${esc(x[1])}</b>${K.jong(x[1]) ? '을' : '를'} 샀다.`); K.save(); redraw();
    say(`${kd} ${esc(x[1])}${K.jong(x[1]) ? '을' : '를'} 창고에 넣었어요.`);   // 경완 2026-10-29 '여기까지만'
  });
}
// 지니는 도구 (경완 2026-10-29): 계속 효과 있는 것만. 사면 창고(g.itm)로, 지니게 하기는 창고·도구 사용에서
let itCat = -1;   // v20.80 도구 탭 항목 필터 (-1 = 모든 항목)
const itCats = () => [...GB().IT_CAT.map(([k, n]) => [k, n]), ['mint', '민트'], ...(GB().evOn?.() ? [['vit', '영양제']] : [])];
function shopIt(body) {
  const g = st(), H = GB().HOLD, ty = g.ty; g.itm = g.itm || {};
  // 분류별로 (경완 2026-10-31 '기존 도구들도 민트처럼 항목 분류', 열매 추가). 분류 안에서는 가격순, 타입 강화는 체육관 타입 먼저
  const row = id => { const own = GB().itHave(id); return GB().itRow(id).replace('class="sp-tm sp-it"', `class="sp-tm sp-it${own ? ' own' : ''}"${own ? ' disabled' : ''}`).replace('</button>', `<em>${own ? '보유 중' : gold(H[id][1])}</em></button>`); };
  const sec = ([k, nm, ids]) => { const L = ids.filter(id => H[id]).sort((a, b) => (k === 'type' && ((H[b][3] === ty) - (H[a][3] === ty))) || (H[a][1] - H[b][1]) * shopPr);
    return `<p class="sp-sub">${nm}${k === 'berry' ? ' · 배틀에서 먹어도 도구는 남아요' : ''}</p><div class="sp-list">${L.map(row).join('')}</div>`; };
  const RP = recMon();
  if (RP) {   // 추천받기: 그 포켓몬에게 맞는 도구(추천 순) + 추천 민트
    const nk = GB().recNat(RP), nOk = nk && nk !== GB().gm(RP).nat;
    body.innerHTML = `<div class="tm-row sp-prr">${prBtn()}</div><p class="sp-sub">${esc(nmOf(RP))}에게 맞는 도구</p><div class="sp-list sp-recit"></div>${nOk ? `<p class="sp-sub">추천 성격 민트</p><div class="sp-list">${GB().mintRow(nk, 0).replace('</button>', `<em>${gold(GB().MINT_P)}</em></button>`)}</div>` : ''}`;
    GB().recIts(RP).then(L => { const el = body.querySelector('.sp-recit'); if (!el || !el.isConnected) return; L = L.filter(id => H[id]).slice(0, 8).sort((a, b) => (H[a][1] - H[b][1]) * shopPr); el.innerHTML = L.length ? L.map(row).join('') : '<p class="sf-none">추천할 도구가 없어요.</p>'; GB().fillTh?.(el); });
  } else
  { const IC = itCats(); if (!IC[itCat]) itCat = -1; const on = k => itCat === -1 || IC[itCat][0] === k;   /* fPop 은 숫자 값만 → 칸 번호 */   /* v20.80 경완 '도구 탭 가격 필터 있는 행 좌측에 항목 필터' */
  body.innerHTML = `<div class="tm-row sp-prr sp-itr"><button class="fsel${itCat !== -1 ? ' on' : ''}" data-f="ic">${itCat === -1 ? '모든 항목' : IC[itCat][1]}</button>${prBtn()}</div>${GB().IT_CAT.filter(([k]) => on(k)).map(sec).join('')}
    ${on('mint') ? `<p class="sp-sub">민트 · 먹이면 성격이 바뀌어요</p><div class="sp-list">${GB().MINT.map(k => GB().mintRow(k, 0).replace('</button>', `<em>${gold(GB().MINT_P)}</em></button>`)).join('')}</div>` : ''}${on('vit') ? evShop() : ''}`; }   // 민트 (경완 2026-10-30): 여러 개 살 수 있음
  body.onclick = (e, b) => { const mk = b.dataset.mint;
    if (b.dataset.f === 'ic') { sfx('tap'); return K.fPop('항목', [[-1, '모든 항목'], ...itCats().map(([, n], i) => [i, n])], itCat, v => { itCat = v; redraw(); }); }
    if (b.dataset.vit != null) { sfx('tap'); return vitBuy(+b.dataset.vit); }
    if (mk) { sfx('tap'); const n = g.mint?.[mk] || 0, P = GB().MINT_P, nm = GB().mintNm(mk);
      return GB().mintInfo(mk, `${gold(P)} 사기`, () => { if (!buy(P)) return say(`골드가 모자라요. ${P.toLocaleString()}G가 필요해요.`);
        g.mint = g.mint || {}; g.mint[mk] = (g.mint[mk] || 0) + 1; K.newMark?.('mint', mk); K.glog('tr', `도구 <b>${esc(nm)}</b>${K.jong(nm) ? '을' : '를'} 샀다.`); K.save(); redraw(); say(`${esc(nm)}${K.jong(nm) ? '을' : '를'} 창고에 넣었어요.`); }, '', n); }
    const id = b.dataset.it; if (!id || GB().itHave(id)) return; sfx('tap'); const x = H[id];
    GB().itInfo(id, `${gold(x[1])} 사기`, () => { if (!buy(x[1])) return say(`골드가 모자라요. ${x[1].toLocaleString()}G가 필요해요.`);
      if (GB().itHave(id)) return; g.itm[id] = 1; K.newMark?.('it', id); K.glog('tr', `도구 <b>${esc(x[0])}</b>${K.jong(x[0]) ? '을' : '를'} 샀다.`); K.save(); redraw(); say(`${esc(x[0])}${K.jong(x[0]) ? '을' : '를'} 창고에 넣었어요.`); }, '', g.itm[id] || 0); };
}
// v20.45 영양제 (노력치 +10, 300G): 상점 도구 탭 민트 밑, 창고(g.vit)에 쌓였다가 노력치 설정 창에서 먹임. 슬롯엔 창고 수 안 보임 (경완)
function evShop() { if (!GB().evOn?.()) return ''; const B = GB();
  return `<p class="sp-sub ev-shs">영양제 · 먹이면 그 능력치 노력치 +10</p><div class="sp-list">${B.EV_VIT.map(([k, nm], i) => `<button type="button" class="sp-tm sp-it sp-vit" data-vit="${i}"><img class="tm-ic it-ic" alt="" src="${B.itImg(k)}"><span class="tm-nm"><b>${nm}</b></span><span class="tm-meta"><small><b class="ev-stc">${B.EV_N[i]}</b> 노력치 +10 · 한 능력치 252까지</small></span><em>${gold(B.EV_VP)}</em></button>`).join('')}</div>`; }
function vitBuy(i) { const B = GB(), [k, nm] = B.EV_VIT[i], g = st(), n = g.vit?.[k] | 0;
  B.gymPop(`<h4 class="mi-h has-own"><img class="tm-ic it-ic" alt="" src="${B.itImg(k)}">${nm}${B.bagN(n)}</h4><p class="gy-msg mi-d">${B.EV_VD[i]}. 먹이면 ${B.EV_N[i]} 노력치가 10 올라간다. 상세카드 노력치 박스에서 먹일 수 있다.</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="y">${gold(B.EV_VP)} 사기</button></div>`, (a, close) => {
    close(); if (a !== 'y') return; if (!buy(B.EV_VP)) return say(`골드가 모자라요. ${B.EV_VP}G가 필요해요.`);
    (g.vit ||= {})[k] = (g.vit[k] | 0) + 1; K.newMark?.('vit', i); K.glog('tr', `도구 <b>${esc(nm)}</b>${K.jong(nm) ? '을' : '를'} 샀다.`); K.save(); redraw(); say(`${esc(nm)}${K.jong(nm) ? '을' : '를'} 창고에 넣었어요.`); }); }
// 훈련장 상세카드 '노력치 훈련': 고른 능력치에 노력치가 쌓임, 지금까지 오른 양만 (하루 속도는 안 보임)
// v20.61 경완 '훈련장 카드 노력치 훈련 박스에도 ? — 지금 어떤 훈련이 좋은지 힌트': 추천 배분(evPlan) 순서대로 아직 목표에 못 미친 첫 능력치
function evTrHint(P, after) { const B = GB(), m = B.gm(P), e = B.evArr(m), pl = B.evPlan(P.sp), N = B.EV_N, T = st().tr.find(x => x.id === P.id);
  const k = pl.k.find((k, j) => (e[k] | 0) < pl.v[j]), j = pl.k.indexOf(k);
  const msg = k == null ? '추천 배분대로 노력치가 다 찼어요. 이제 노력치 훈련은 쉬어도 돼요.' : `지금은 <b>${N[k]}</b> 노력치 훈련이 좋아요.${T?.evk === k ? ' 이미 이 훈련을 하고 있어요!' : ''}`;
  B.gymPop(`<h4 class="mi-h">${esc(nmOf(P))}에게 좋은 훈련</h4><p class="gy-msg ev-trhint">${msg}</p><p class="gy-msg mi-d ev-trwhy">${pl.why}</p><div class="gy-btns${k == null || T?.evk === k ? ' one' : ''}"><button data-a="x"${k == null || T?.evk === k ? ' class="main"' : ''}>닫기</button>${k == null || T?.evk === k ? '' : `<button class="main" data-a="y">${N[k]} 훈련하기</button>`}</div>`, (a, c) => { c(); if (a === 'y' && T) { tickTrain(Date.now()); T.evk = k; K.save(); after?.(); } }).classList.add('ev-qpop'); }
function evTrBox(P) { const B = GB(); if (!B.evOn?.()) return ''; const T = st().tr.find(e => e.id === P.id); if (!T) return ''; const on = T.evk ?? -1, g = T.evg | 0;
  return `<div class="ev-tr"><div class="ev-trh"><b>노력치 훈련<button type="button" class="ev-q ev-trq" data-a="evq" aria-label="어떤 훈련이 좋을까"><svg viewBox="0 0 5 7" width="8" height="11" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h3v1h-3zM0 1h1v1h-1zM4 1h1v2h-1zM3 3h1v1h-1zM2 4h1v1h-1zM2 6h1v1h-1z"/></svg></button></b><small>${on < 0 ? '키울 능력치를 골라 주세요' : `${B.EV_N[on]} 노력치 <b class="ev-trn">+${g}</b> 올랐어요`}</small></div>
    <div class="ev-trg">${B.EV_N.map((n, i) => `<button type="button" class="ev-tk${i === on ? ' on' : ''}" data-a="evk${i}"><img alt="" src="${B.itImg(B.EV_PW[i])}"><span>${n}</span></button>`).join('')}</div></div>`; }
// 꾸미기: 사면 빈 칸에 바로 놓인다. 놓인 것을 누르면 치우기, 가진 것을 누르면 놓기
function shopDeco(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.own = g.own || {}; g.dp = (g.dp || []).filter(Boolean);   // 개수 제한 없음 (경완 2026-10-28)
  const placed = g.dp;
  body.innerHTML = `
    <div class="tm-row sp-prr">${prBtn()}</div><div class="dc-grid">${Object.entries(K.DECO).sort((a, b) => (a[1].g - b[1].g) * shopPr).map(([k, o]) => { const lock = G < o.lv, own = g.own[k];
      return `<button data-dc="${k}" class="${own ? 'own' : ''}${lock ? ' lock' : ''}"><span class="dc-pic"><img alt="" src="${IMG}deco/${k}.png" class="${o.w > 16 ? 'big' : ''}"></span><b>${o.n}</b><em>${own ? (placed.includes(k) ? '놓여 있음' : '가지고 있음') : lock ? `${K.GRADES[o.lv][1]}부터` : gold(o.g)}</em></button>`; }).join('')}</div>`;
  body.onclick = (e, b) => {
    sfx('tap');
    const k = b.dataset.dc; if (!k) return; const o = K.DECO[k];
    if (g.own[k]) { if (placed.includes(k)) g.dp.splice(placed.indexOf(k), 1); else g.dp.push(k); K.save(); redraw(); return; }
    if (G < o.lv) return say(`${K.GRADES[o.lv][1]}이 되면 살 수 있어요.`);
    pop(`<h4>${o.n}</h4><div class="dc-big"><img alt="" src="${IMG}deco/${k}.png"></div><div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`, (a, close) => {
      close(); if (a !== 'y') return; if (!buy(o.g)) return say('골드가 모자라요.');
      g.own[k] = 1; g.dp.push(k); K.newMark?.('deco', k); K.save(); redraw(); });
  };
}
// 관장 의상: 앞모습은 옷 모양까지 새로 그린 그림, 맵·배틀 뒷모습은 옷 색만. 누르면 그 옷을 입은 전신 카드 (경완 2026-10-27)
function shopFit(body) {
  const g = st(), G = K.gradeOf(g.rep || 0).i; g.fits = g.fits || {};
  const need = o => K.GRADES[o.lv][1];
  const row = (k, o) => { const own = !k || g.fits[k], on = (K.fitOf(g.fit) ? g.fit : '') === k, lock = o.lv && G < o.lv;
    return `<button data-fit="${k}" class="${on ? 'on' : ''}${lock ? ' lock' : ''}"><i class="ft-pic"><img alt="" data-fk="${k}"></i><b>${o.n}</b><em>${on ? '입는 중' : own ? '입기' : lock ? `${need(o)}부터` : gold(o.g)}</em></button>`; };
  body.innerHTML = `<div class="tm-row sp-prr">${prBtn()}</div><div class="ft-grid">${row('', { n: '기본 옷' })}${Object.entries(K.OUTFITS).filter(([k, o]) => K.fitOf(k) && (!o.ev || g.fits?.[k])).sort((a, b) => ((a[1].g || 0) - (b[1].g || 0)) * shopPr).map(([k, o]) => row(k, o)).join('')}</div>`;
  body.querySelectorAll('img[data-fk]').forEach(im => K.fitSrc('tr', im.dataset.fk).then(u => { im.src = u; }));
  body.onclick = async (e, b) => {
    sfx('tap'); const k = b.dataset.fit; if (k == null) return; const o = k ? K.OUTFITS[k] : { n: '기본 옷' }, own = !k || g.fits[k], on = (K.fitOf(g.fit) ? g.fit : '') === k, lock = o.lv && G < o.lv;
    const btn = on ? '<div class="gy-btns one"><button data-a="x">입는 중</button></div>'
      : own ? '<div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="w">입기</button></div>'
      : lock ? `<div class="gy-btns one"><button data-a="x">${need(o)}이 되면 살 수 있어요</button></div>`
      : `<div class="gy-btns"><button data-a="x">그만두기</button><button class="main" data-a="y">${gold(o.g)} 사기</button></div>`;
    K.bodyCard(await K.fitSrc('tr', k), o.n, own ? '' : lock ? '아직 살 수 없어요' : '사면 바로 입어요', btn, (a, close) => {
      close(); if (a === 'y' && !buy(o.g)) return say('골드가 모자라요.'); if (a === 'y') g.fits[k] = 1; K.fitSet(k); K.save(); redraw(); K.renderHome(); });
  };
}
/* v19.53 경완 '기존에 배웠던 특별한 기술 데이터는 다 지워줘': 예전(기술머신 공격기 기준) 특별한 기술을 한 번 지운다 (g.spW).
   훈련 일지 R.sm·R.cm 과 일지 글('훈련장에서 특별한 기술 <b>이름</b>')로 찾는다. 알 기술 목록에 있는 건 새로 배운 것이라 둔다.
   쓰던 칸에서 빠지면 레벨업·익힌 기술 중 가장 센 것으로 채운다. */
function spWipe() {
  const g = st(); if (!g || g.spW || !GB()?.D) return; const E = GB().EGG || {}, ko = {}; GB().D.mv.forEach(x => { ko[x[1]] ||= x[0]; });
  const bad = {}, add = (id, mv) => { if (mv) (bad[id] ||= new Set()).add(mv); };
  for (const [id, T] of Object.entries(g.tlog || {})) for (const R of Object.values(T)) [...(R.sm || []), ...(R.cm || [])].forEach(mv => add(id, mv));
  const byNm = {}; S.box.forEach(P => { (byNm[nmOf(P)] ||= []).push(P.id); });
  const spLn = l => { const h = l[2]; if (typeof h !== 'string' || !h.includes('훈련장에서 특별한 기술')) return null; const nm = h.split('훈련장에서')[0].replace(/(이|가) $/, '').replace(/&amp;/g, '&').trim(), mv = ko[(h.match(/특별한 기술 <b>([^<]+)<\/b>/) || [])[1]]; return mv ? [byNm[nm] || [], mv] : null; };
  for (const l of g.log || []) { const L = spLn(l); if (L) L[0].forEach(id => add(id, L[1])); }
  let n = 0; const gone = {};
  for (const [id, set] of Object.entries(bad)) { const P = boxOf(+id) || boxOf(id); if (!P) continue; const egg = E[P.sp] || [], m = GB().gm(P), del = [...set].filter(mv => !egg.includes(mv)); if (!del.length) continue;
    gone[P.id] = new Set(del); m.kn = (m.kn || []).filter(mv => !del.includes(mv));
    if (m.mv.some(mv => del.includes(mv))) { m.mv = m.mv.filter(mv => !del.includes(mv)); const pw = mv => { const x = GB().mvOf(mv); return x ? (x[3] === 2 ? 0 : x[4] || 0) : -1; };
      const c = GB().mvCands(P, m).filter(mv => !del.includes(mv)).sort((a, b) => pw(b) - pw(a)); while (m.mv.length < 4 && c.length) m.mv.push(c.shift()); }
    n += del.length; }
  for (const [id, T] of Object.entries(g.tlog || {})) { const G = gone[id] || gone[+id]; if (!G) continue; for (const R of Object.values(T)) { R.mv = (R.mv || []).filter(mv => !G.has(mv)); if (R.sm) R.sm = R.sm.filter(mv => !G.has(mv)); if (R.cm) R.cm = R.cm.filter(mv => !G.has(mv)); } }
  (g.tr || []).forEach(e => { const G = gone[e.id]; if (G && e.mv) e.mv = e.mv.filter(mv => !G.has(mv)); });
  if (g.aw?.mv) g.aw.mv = g.aw.mv.filter(([id, mv]) => !gone[id]?.has(mv));
  g.log = (g.log || []).filter(l => { const L = spLn(l); return !L || !L[0].some(id => gone[id]?.has(L[1])); });
  g.spW = 1; K.save(); console.log('spWipe', n);
}
try { spWipe(); } catch (e) { console.warn('spWipe', e); }
// v20.68 경완 '퇴근하고 돌아오면 상점 필터 다 기본값': 탭·타입·형태·위력순·가격순·추천받기 모두 처음대로
function shopReset() { itCat = -1; shopT = 'tm'; tmTy = -1; tmCat = -1; tmPow = 1; shopPr = 1; shRec = null; }
window.GymManage = { egGainPop: u => new Promise(ok => { const P = boxOf(u.pid); if (!P) return ok(); mvListPop([], P, { ...u, done: ok }); }), egAwPop: (P, mv, i, n) => new Promise(ok => mvListPop([], P, { aw: { mv, i, n }, got: 1, done: ok })), tab, tickTrain, spWipe, redraw, trSend, sfDetail, coachX, coachP, shopReset, shopHas, shopLeave };
setTimeout(() => K.menuDot?.(), 0);   // v20.78 상점 빨간 점: 불러오자마자 한 번
})();
