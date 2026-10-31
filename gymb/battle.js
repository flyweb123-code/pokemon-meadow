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
const trSrc = k => window.Gym?.k?.trSrc?.(k) || `${IMG}tr/${k}.png`;
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
let D = null, AB_D = {}, MVI = null, FEM = new Set(), ANIM = {}, FMA = {}, MFX = {}, dataP = null;
const getJ = u => fetch(`${u}?v=${VER}`).then(r => r.ok ? r.json() : null).catch(() => null);
function loadData() {
  return dataP || (dataP = Promise.all([
    fetch(`gym/data.json?v=${VER}`).then(r => { if (!r.ok) throw new Error('data'); return r.json(); }),
    getJ(`${IMG}pk/fem.json`), getJ(`${IMG}pk/anim.json`), getJ('gymb/mvfx.json'), getJ('gym/desc.json'), getJ(`${IMG}pk/fm/fm.json`)
  ]).then(([d, fem, an, fx, ds, fm]) => { FMA = fm || {}; D = d; AB_D = ds?.ab || {}; MVI = new Map(d.mv.map((m, i) => [m[0], i])); FEM = new Set(fem || []); ANIM = an || {}; MFX = fx || {}; mfxAdd(); }).catch(e => { dataP = null; throw e; }));
}
let simP = null;
const loadSim = () => window.PSim ? Promise.resolve() : simP || (simP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = `gym/psim.js?v=${VER}`; s.onload = () => window.PSim ? ok() : no(new Error('sim')); s.onerror = () => { simP = null; no(new Error('sim')); }; document.head.appendChild(s); }));
let splP = null;   // 기술 파티클 엔진 (gymb/spl.js)
const loadSpl = () => window.GymSPL ? Promise.resolve() : splP || (splP = new Promise(ok => { const s = document.createElement('script'); s.src = `gymb/spl.js?v=${VER}`; s.onload = ok; s.onerror = () => { splP = null; ok(); }; document.head.appendChild(s); }));
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
const abNorm = sp => { const o = D.sp[sp]; if (!o) return ['noability']; const L = (o.ab || []).filter(a => a !== o.h); return L.length ? L : o.ab || ['noability']; };
const HA_RATE = .05;   // 숨겨진 특성 5% (경완 2026-10-31: 종의 숨특 칸 때문에 많아 보였던 것 → 다시 5%)
const hiddenRoll = k => seeded(k)() < HA_RATE;
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
// 실전 기술 배치 (경완 2026-10-29 '난이도가 레벨뿐 아니라 실전 기술 배치·운용까지'): tier 1 = 레벨업 기술 중 자속·견제·변화기 하나, tier 2 = 기술머신·알 기술까지 넣고 능력치 올리기·선공기도
const MV_BAD = new Set('hyperbeam gigaimpact blastburn hydrocannon frenzyplant rockwrecker roaroftime selfdestruct explosion memento finalgambit healingwish lunardance focuspunch dreameater lastresort synchronoise futuresight doomdesire skullbash skyattack razorwind solarbeam solarblade meteorbeam belch steelbeam mindblown naturalgift fling snore spitup present magnitude return frustration trumpcard spitup beatup counter mirrorcoat metalburst bide endeavor painsplit perishsong destinybond grudge'.split(' '));
const MV_FIX = { seismictoss: 70, nightshade: 70, superfang: 60, dragonrage: 40, sonicboom: 20 };
const MV_SETUP = { swordsdance: 0, dragondance: 0, bulkup: 0, howl: 0, honeclaws: 0, shiftgear: 0, coil: 0, nastyplot: 1, calmmind: 1, quiverdance: 1, tailglow: 1, geomancy: 1, workup: -1, growth: 1 };
const MV_STAT = { thunderwave: 3, willowisp: 3, toxic: 3, spore: 5, sleeppowder: 4, hypnosis: 2, yawn: 2, glare: 3, stunspore: 2, stealthrock: 2, leechseed: 2, recover: 3, roost: 3, softboiled: 3, slackoff: 3, synthesis: 2, moonlight: 2, morningsun: 2, milkdrink: 3, shoreup: 3, substitute: 1, reflect: 1, lightscreen: 1, taunt: 1, encore: 1, trickroom: 0 };
const MV_2T = new Set('dig fly bounce dive phantomforce shadowforce skydrop solarbeam'.split(' '));   // 두 턴 기술
const MV_PRIO = new Set('extremespeed aquajet machpunch bulletpunch iceshard shadowsneak suckerpunch quickattack vacuumwave accelerock jetpunch firstimpression'.split(' '));
function smartMoves(sp, lv, tier, r) {
  const o = D.sp[sp]; if (!o) return pickMoves(sp, lv, r);
  const bs = SPECIES[sp]?.bs || [60, 60, 60, 60, 60, 60], phys = bs[1] >= bs[3], tys = SPECIES[sp]?.t || [];
  let ids = lvMoves(sp, lv).map(([l, i]) => i); if (tier >= 2) ids = ids.concat(o.tm || [], o.ex || []);
  ids = [...new Set(ids)].filter(i => D.mv[i] && !MV_BAD.has(D.mv[i][0]));
  const pw = i => { const m = D.mv[i]; if (m[3] === 2) return 0; const fx = MV_FIX[m[0]], bp = fx || m[4] || 0; if (!bp) return 0; return bp * ((m[5] || 100) / 100) ** 1.5 * (!fx && tys.includes(m[2]) ? 1.5 : 1) * (fx || (m[3] === 0) === phys ? 1 : .55) * (m[7] > 0 ? .8 : 1) * (MV_2T.has(m[0]) ? .7 : 1) * (.9 + r() * .2); };
  const atk = ids.filter(i => pw(i) > 0).map(i => [i, pw(i)]).sort((a, b) => b[1] - a[1]), take = [], tyIn = new Set();
  const add = i => { if (i != null && !take.includes(i) && take.length < 4) { take.push(i); tyIn.add(D.mv[i][2]); } };
  for (const t of tys) add(atk.find(([i]) => D.mv[i][2] === t)?.[0]);   // 자속 하나씩
  const nAtk = tier >= 2 ? 3 : 3;
  for (const [i] of atk) { if (take.length >= nAtk) break; if (!tyIn.has(D.mv[i][2])) add(i); }   // 다른 타입 견제기
  if (tier >= 2) { const pr = atk.find(([i]) => MV_PRIO.has(D.mv[i][0]) && (D.mv[i][3] === 0) === phys); if (pr && r() < .6 && take.length < 4) add(pr[0]); }
  const st = ids.filter(i => D.mv[i][3] === 2).map(i => { const k = D.mv[i][0]; let v = MV_STAT[k] ?? -1; if (k in MV_SETUP) v = MV_SETUP[k] < 0 ? 2 : (MV_SETUP[k] === 1) === !phys ? 4 + tier : -1; return [i, v + r()]; }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  if (st.length && take.length < 4) add(st[0][0]);
  if (tier >= 2 && st.length > 1 && take.length < 4 && r() < .5) add(st[1][0]);
  for (const [i] of atk) add(i);   // 남은 칸은 센 기술로
  if (!take.length) return pickMoves(sp, lv, r);
  return take.map(i => D.mv[i][0]);
}
// 체육관 개체 정보: 처음 볼 때 만든다
function gm(P) {
  const g = S.gym; g.mon = g.mon || {};
  let m = g.mon[P.id];
  if (!m || !D.sp[P.sp]) {
    const r = seeded('gm' + P.id), lv = BASE_LV[GA.rankOf(P)] || 5, ab = D.sp[P.sp]?.ab || ['noability'], nats = NATS();
    const nm = abNorm(P.sp), ha = hiddenRoll('ha' + P.id) && D.sp[P.sp]?.h;
    m = g.mon[P.id] = { lv, xp: xpAt(growth(P.sp), lv), nat: nats[Math.floor(r() * nats.length)], ab: nm[Math.floor(r() * Math.min(2, nm.length))], mv: pickMoves(P.sp, lv, r) };
    if (ha) { m.ab = ha; m.ha = 1; }
  }
  // 특성 (경완 2026-10-27 '특성, 숨겨진 특성'): 보통 특성은 숨겨진 특성을 뺀 것 중에서, 숨겨진 특성은 5% (ha). 진화하면 같은 자리 특성으로
  const h = D.sp[P.sp]?.h, nm = abNorm(P.sp);
  if (!m.haK5) { if (!m.ha && hiddenRoll('ha' + P.id)) m.ha = 1; m.haK5 = 1; }   // v12.10: 2% 때 빠진 숨겨진 특성을 5% 기준으로 되돌림 (같은 씨앗이라 그때 가졌던 개체만)
  if (m.ha) { if (h && m.ab !== h) m.ab = h; else if (!h) { m.ha = 0; m.ab = nm[0] || m.ab; } }
  else if (!nm.includes(m.ab)) m.ab = nm[0] || m.ab;
  return m;
}
// 경험치 (배틀·훈련장): 레벨업하면 그 레벨에 배우는 기술을 익힌다. 기술이 4개면 '아는 기술'(kn)에 넣고, 가장 약한 공격 기술보다 세면 바로 바꾼다 (변화 기술은 자동으로 안 바꿈)
// ask: 배틀처럼 기술이 4개면 바로 바꾸지 않고 out.ask 에 모아 두었다가 본가처럼 물어본다 (경완 2026-10-30)
function gainXp(P, n, ask = false) {
  const m = gm(P), g = growth(P.sp), out = { lv0: m.lv, lv: m.lv, n: 0, learned: [], ask: ask ? [] : null };   // learned: [[새 기술, 잊은 기술|'']]
  if (m.lv >= LV_MAX || !(n > 0)) return out;
  n = Math.round(n); out.n = n; m.xp = Math.min(m.xp + n, xpAt(g, LV_MAX));
  while (m.lv < LV_MAX && m.xp >= xpAt(g, m.lv + 1)) { m.lv++; const L = D.sp[P.sp]?.lv || []; for (let i = 0; i < L.length; i += 2) if (L[i] === m.lv) teach(m, D.mv[L[i + 1]][0], out, !ask); }
  out.lv = m.lv; return out;
}
const mvPow = id => { const d = mvOf(id); return !d ? 0 : d[3] === 2 ? -1 : (d[4] || 40); };
function teach(m, id, out, auto = true) {
  if (m.mv.includes(id)) return;
  if (m.mv.length < 4) { m.mv.push(id); out?.learned.push([id, '']); return; }
  m.kn = m.kn || []; if (!m.kn.includes(id)) m.kn.push(id);
  if (!auto) { out?.ask?.push(id); return; } const nw = mvPow(id); if (nw <= 0) return;
  let k = -1; m.mv.forEach((x, i) => { const p = mvPow(x); if (p >= 0 && p < nw && (k < 0 || p < mvPow(m.mv[k]))) k = i; });
  if (k < 0) return;
  const old = m.mv[k]; m.mv[k] = id; m.kn = m.kn.filter(x => x !== id); m.kn.push(old); out?.learned.push([id, old]);
}
// 기술 바꾸기 후보: 지금 레벨까지 레벨업으로 배우는 기술 + 아는 기술(기술머신·훈련장)
const mvCands = (P, m = gm(P)) => [...new Set([...lvMoves(P.sp, m.lv).map(([, i]) => D.mv[i][0]), ...(m.kn || [])])].filter(id => !m.mv.includes(id) && mvOf(id));
// 쓰러뜨린 상대 한 마리의 경험치 (본가 5세대 식, 기초 경험치는 종족값 합으로 어림, 트레이너 배틀 1.5배)
function xpFor(foe, Lp) { const bs = SPECIES[foe.sp]?.bs || [60, 60, 60, 60, 60, 60], t = bs.reduce((a, b) => a + b, 0), b = Math.round(t * t / 1000), L = foe.lv;
  return Math.floor(1.5 * b * L / 5 * ((2 * L + 10) / (L + Lp + 10)) ** 2.5) + 1; }
const boxOf = id => S.box.find(p => p.id === id);
const nmOf = P => P.nm || SPECIES[P.sp]?.n || '???';   // 지어 준 이름 먼저 (경완 2026-10-31 '체육관 정보카드에서도 이름 바꾸기')
const tyOk = P => (SPECIES[P.sp]?.t || []).includes(S.gym.ty);

const CRY_K = 2.2;   // 배틀 울음소리는 곡보다 잘 들리게 (v12.20 경완)
// ---------- 라인업 (3개 저장, 6마리) ----------
function lus() { const g = S.gym; if (!Array.isArray(g.lu)) g.lu = [[], [], []]; g.lu = g.lu.map(L => (L || []).filter(id => { const P = boxOf(id); return P && tyOk(P); }).slice(0, 6)); g.luI = clampN(g.luI | 0, 0, 2); return g.lu; }
const curLu = () => lus()[S.gym.luI | 0];

// ---------- 그림 ----------
// 라인업·고르기 그림은 포켓몬 상자와 같은 그림 (경완 2026-10-27)
// 랭크는 꾸미기 모드처럼 그림 테두리 색으로 (경완 2026-10-27)
// 랭크 배지도 본 게임 포켓몬 박스처럼 왼쪽 위에 (경완 2026-10-27 '체육관 모드에도 랭크 테두리 + 랭크 배지')
const thumb = P => { const rk = GA.rankOf(P), it = S.gym?.mon?.[P.id]?.it; return `<span class="rk-fr" data-rk="${rk}"><span class="rk ${rk}">${rk}</span><img alt="" data-th="${P.id}"${P.shiny ? ` class="shiny" style="--shue:${GA.shinyHue(P.sp)}deg"` : ''}>${it && HOLD[it] ? `<img class="th-it" alt="${HOLD[it][0]}" src="${itImg(it)}">` : ''}</span>`; };   // 지닌 도구는 그림 오른쪽 아래 (경완 2026-10-29)
function fillTh(root) { root.querySelectorAll('img[data-th]').forEach(im => { const P = S.box.find(p => String(p.id) === im.dataset.th); if (P) GA.thumb(P).then(u => { if (u) im.src = u; }).catch(() => {}); });
  // 트레이너 포켓몬(종만 앎)도 포켓몬 상자와 같은 그림 (경완 2026-10-27)
  root.querySelectorAll('img[data-sp]').forEach(im => { if (im.dataset.ok) return; im.dataset.ok = 1; GA.thumb({ sp: +im.dataset.sp }).then(u => { if (u) im.src = u; }).catch(() => {}); }); }
const pkSrc = (sp, o = {}) => `${IMG}pk/${sp}${o.b ? 'b' : ''}${o.s ? 's' : ''}${o.f && FEM.has(+sp) ? 'f' : ''}.png?v=${VER}`;
const TR_KO = { youngster: '반바지 꼬마', lass: '짧은 치마', bug_catcher: '곤충채집 소년', camper: '캠프 보이', picnicker: '피크닉 걸', hiker: '등산가', fisherman: '낚시꾼', swimmer_m: '수영팬티 소년', swimmer_f: '비키니 아가씨', cool_trainer_m: '엘리트 트레이너', cool_trainer_f: '엘리트 트레이너', beauty: '아가씨', gentleman: '신사', super_nerd: '괴짜', black_belt: '태권왕', bird_keeper: '새 조련사', psychic_m: '초능력자', psychic_f: '초능력자', engineer: '기술자', sailor: '뱃사람', rocker: '로커', tamer: '조련사', school_kid_m: '학원 소년', school_kid_f: '학원 소녀', battle_girl: '배틀걸', channeler: '기도사', juggler: '마술사', aroma_lady: '아로마 아가씨', ruin_maniac: '유적 마니아', poke_maniac: '포켓몬 마니아', pokemaniac: '포켓몬 마니아', ninja_boy: '닌자 보이', dragon_tamer: '드래곤 조련사', skier_f: '스키어', poke_kid: '포켓몬 꼬마', artist: '화가', cyclist_m: '사이클링 보이', jogger: '조깅맨' };
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
// ---------- 효과음 (플래티넘 원본 SEQ_SE_DP_*, gym/bgm.js 가 받아 와 연주) ----------
const se = (nm, o) => { try { window.GymBGM?.se('DP_' + nm, o); } catch (e) {} };
// 배틀 진동 (경완 2026-10-30): 맞을 때(효과가 굉장하면 세게), 급소, 쓰러질 때 우르르. 본 게임 진동(아이폰 앱 haptic·안드로이드 vibrate)을 그대로 쓴다
const vib = (n = 1) => { try { GA.haptic?.(n); } catch (e) {} };
const vibBig = (st = 2, g = 2) => { try { GA.rumble?.(st, g); } catch (e) {} };
const SE_BASE = ['DECIDE', 'SELECT', 'KOUKA_M', 'KOUKA_H', 'KOUKA_L', 'POKE_DEAD', 'BOWA2', 'SUIKOMU', 'SLIDEIN', 'HINSI', 'NAGERU'];
const tapSe = (nm = 'DECIDE') => { try { GA.quietTap?.(); } catch (e) {} se(nm); };
// 화면 x(0~256) → 소리 좌우
const panOf = side => side === 'e' ? .5 : -.5;

function buildUI() {
  el = document.createElement('div'); el.className = 'bt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '배틀');
  el.innerHTML = `<div class="bt-ds">
    <div class="bt-top">
      <div class="bt-bg"></div><i class="bt-terr"></i><i class="bt-dim"></i>
      <i class="bt-pl e"></i><i class="bt-pl p"></i>
      <i class="bt-tr e"></i><i class="bt-tr p"></i>
      <div class="bt-mw e"><div class="bt-mon e"><div class="clip"><img alt=""></div></div></div>
      <div class="bt-mw p"><div class="bt-mon p"><div class="clip"><img alt=""></div></div></div>
      <i class="bt-wx"></i><div class="bt-lvw" hidden></div><div class="bt-shw" hidden></div>
      <canvas class="bt-ptc" width="256" height="192"></canvas>
      <div class="bt-hb e"><span class="hbb"></span><b class="nm"></b><span class="lv"><i class="sx"></i><em class="lvn"></em></span><i class="st"></i><i class="hp"><i></i></i></div>
      <div class="bt-hb p"><span class="hbb"></span><b class="nm"></b><span class="lv"><i class="sx"></i><em class="lvn"></em></span><i class="st"></i><i class="hp"><i></i></i><span class="hpn"><b class="c"></b><b class="m"></b></span><i class="xp"><i></i></i></div>
      <div class="bt-pty e"></div><div class="bt-pty p"></div>
      <div class="bt-fx"></div>
      <div class="bt-msg"><span class="t"></span><b class="cur" hidden>▼</b></div>
      <i class="bt-flash"></i>
    </div>
    <div class="bt-hinge"></div>
    <div class="bt-mid"></div>
    <div class="bt-bot"><div class="bt-panel"></div></div>
  </div>`;
  document.getElementById('gym').appendChild(el);
  el.addEventListener('pointerup', () => { if (B?.tapWake) { const w = B.tapWake; B.tapWake = null; se('SELECT'); w(); }   /* 경완 2026-10-28: 글 넘길 때 본가(Pt 글상자 A 버튼)와 같은 SEQ_SE_DP_SELECT */ else if (B) B.fast = true; });
  addEventListener('resize', fit);
}
// 세로로 긴 휴대폰 (경완 2026-10-27 '전체 화면을 모바일 레이아웃에 맞게', '배틀 상태창은 배틀 화면 밑에 바로 붙여주고 버튼을 좀 위아래로 키워도 돼'):
// 위 화면은 맨 위 폭에 꽉 차게, 바로 밑에 대화창, 남는 높이는 모두 아래(터치) 화면 — 아래 화면은 세로로만 더 늘리고 글자·그림은 원래 비율로 되돌린다.
// 넓은 화면은 예전처럼 두 화면을 가운데에
let safe = null; const TOP_H = 144;   // 본가 대화창 윗선(144): 뒷모습 그림이 거기서 끝난다 (경완 2026-10-28)   // 대화창을 밖으로 꺼내면 위 화면은 배틀 장면 높이만
const safeIn = () => { if (safe) return safe; const q = document.createElement('div'); q.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(q);
  const cs = getComputedStyle(q); safe = [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0]; q.remove(); return safe; };
function fit() {
  if (!el) return; const W = innerWidth, H = innerHeight, mob = H / W > 1.45, msgEl = $b('.bt-msg');
  el.classList.toggle('mob', mob);
  if (mob) { const k = W / 256, [st, sb] = safeIn(), mh = 52 * k, tall = H - sb - st - (TOP_H + 52 + 192) * k >= 0, top = st + (tall ? TOP_H : 192) * k, bt = top + mh, bh = H - sb - bt;
    el.classList.toggle('msgmid', tall); (tall ? $b('.bt-mid') : $b('.bt-top')).appendChild(msgEl);
    [['--k', k], ['--bh', (tall ? bh / k : 192) + 'px'], ['--st', st + 'px'], ['--mt', top + 'px'], ['--mh', mh + 'px'], ['--bt', (tall ? bt : H - sb - 192 * k) + 'px']].forEach(([n, v]) => el.style.setProperty(n, v)); return; }
  el.classList.remove('msgmid'); $b('.bt-top').appendChild(msgEl);
  const k = Math.max(1, Math.floor(Math.min(W / 256, (H - 20) / 394) * 4) / 4); el.style.setProperty('--k', k);
}

// 대화창: 글자를 하나씩. wait=true 면 다 쓰고 잠깐 멈춤(누르면 바로 다음)
// 본가처럼 ▼ 가 깜빡이는 동안 대화창·빈 곳을 누르면 넘어간다. 안 눌러도 잠시 뒤 저절로 (경완 2026-10-28)
async function msg(t, hold = 650) {
  if (!B) return; const box = $b('.bt-msg .t'), cur = $b('.bt-msg .cur'); B.fast = false; cur.hidden = true; box.textContent = '';
  for (const ch of [...t]) { if (!B) return; if (B.fast) { box.textContent = t.replace(/[\u23F8\u0007]/g, ''); break; } if (ch === '\u23F8') { await wait(330); continue; } if (ch === '\u0007') { se('KON'); continue; } box.textContent += ch; await wait(ch === ' ' ? 12 : 26); }   // ⏸ = 본가 {PAUSE 20} (20프레임 멈춤)
  // 저절로 넘어가지 않는다: 대화창·빈 곳을 눌러야 다음 (경완 2026-10-28)
  if (hold) { cur.hidden = false; await new Promise(r => { if (!B) return r(); B.tapWake = r; const iv = setInterval(() => { if (!B || B.tapWake !== r) { clearInterval(iv); r(); } }, 250); }); if (B) B.tapWake = null; cur.hidden = true; }
}
// 누를 때까지 기다리는 대화 (승부 끝 등)
// 본가 {WAIT 5}{WAIT 2}: 글이 다 나오면 팡파르(레벨 업·새 기술), 끝날 때까지 기다렸다가 눌러서 다음 (경완 2026-10-31 본가 타이밍)
async function msgFan(t) { await msg(t, 0); if (!B) return; try { await window.GymBGM?.fan?.('ME_FANFA1'); } catch (e) {} if (!B) return; $b('.bt-msg .cur').hidden = false; await new Promise(r => { B.tapWake = r; }); if (B) { B.tapWake = null; $b('.bt-msg .cur').hidden = true; } }
async function msgTap(t) { await msg(t, 0); if (!B) return; $b('.bt-msg .cur').hidden = false; await new Promise(r => { B.tapWake = r; }); $b('.bt-msg .cur').hidden = true; }

// 체력 막대 (본가: 초록 > 1/2, 노랑 > 1/5, 빨강). 막대는 48칸, 4세대처럼 한 칸씩 줄어든다
function hpCol(r) { return r > .5 ? 'g' : r > .2 ? 'y' : 'r'; }
const hpPx = (hp, mhp) => hp <= 0 || !mhp ? 0 : Math.max(1, Math.ceil(hp / mhp * 48));
function paintHb(side, A) {
  const hb = $b(`.bt-hb.${side}`); if (!A) { hb.classList.remove('on'); return; }
  hb.querySelector('.nm').textContent = A.nm; hb.querySelector('.lvn').textContent = A.lv;
  const sx = hb.querySelector('.sx'); sx.className = 'sx ' + (A.g || ''); sx.textContent = A.g === 'M' ? '♂' : A.g === 'F' ? '♀' : '';
  setHp(side, A.hp, A.mhp); setSt(side, A.st);
  if (side === 'p') { const g = A.xpg; hb.querySelector('.xp>i').style.width = (g ? clampN(g, 0, 1) * 96 : 0) + 'px'; }
}
function setHp(side, hp, mhp, px = hpPx(hp, mhp)) {
  const hb = $b(`.bt-hb.${side}`), f = hb.querySelector('.hp>i');
  f.style.width = px + 'px'; f.className = hpCol(px / 48);
  if (side === 'p') { hb.querySelector('.hpn .c').textContent = Math.max(0, Math.round(hp)); hb.querySelector('.hpn .m').textContent = mhp; }
  if (side === 'p') lowHp(px > 0 && px / 48 <= .2);
  hbBalls(side);
}
// 체력 상자 안 HP 띠 왼쪽에 남은 포켓몬 수 몬스터볼 (경완 2026-10-28 '각자의 포켓몬 정보 박스 내에')
function hbBalls(side) { const b = el?.querySelector(`.bt-hb.${side} .hbb`); if (b && B) b.innerHTML = balls(side); }
async function drainHp(side, A, to) {
  const from = A.hp, p0 = hpPx(from, A.mhp), p1 = hpPx(to, A.mhp), n = Math.abs(p1 - p0);
  for (let i = 1; i <= n; i++) { if (!B) return; setHp(side, from + (to - from) * i / n, A.mhp, p0 + Math.sign(p1 - p0) * i); await wait(B.fast ? 8 : 17); }
  A.hp = to; setHp(side, to, A.mhp, p1);
}
// 내 포켓몬 체력이 빨강이면 본가처럼 삐삐 소리
function lowHp(on) {
  if (!B) return; if (on === !!B.lowT) return;
  if (on) { const f = () => { if (B && !B.btl.ended) se('HINSI'); }; f(); B.lowT = setInterval(f, 700); } else { clearInterval(B.lowT); B.lowT = 0; }
}
const ST_X = { par: 0, frz: 1, slp: 2, psn: 3, tox: 3, brn: 4 };
function setSt(side, st) { const i = $b(`.bt-hb.${side} .st`); i.className = 'st' + (st in ST_X ? ' s' + ST_X[st] : ''); hbBalls(side); }

// ---------- 포켓몬 그림 ----------
// 1~649: 블랙·화이트 움직이는 gif (못 받으면 1~493 은 플래티넘 2장 그림+움직임, 494~649 는 한 장), 650~: 팬게임(pokeemerald-expansion) 2장 그림을 같은 판으로 (gym/img/pk/anim.json)
// 위치는 DS 화면 좌표: 상대 80x80 칸 왼쪽 위 (136, E_Y+보정), 내 쪽 (40, P_Y+보정)
const E_Y = 8, P_Y = 64;
function monEl(side) { return $b(`.bt-mon.${side}`); }
// 1~649 는 블랙·화이트 움직이는 gif 를 smogon/sprites(고정 커밋)에서 바로 받아 계속 움직인다. 못 받으면 저장소 그림
const G5 = 'https://raw.githubusercontent.com/smogon/sprites/18fc3d83b8bc6746f0052273232c1794ef2d7d42/src/sprites/gen5/';
const G5K = ['-b', '-s', '-f', '-b-s', '-b-f', '-f-s', '-b-f-s'];
// 배틀 중 바뀐 폼 (tools/gym/mkforms.py): 1~649 는 블랙·화이트 gif 폼 이름, 650~ 은 gym/img/pk/fm/<쇼다운 id>.png
const FM_G = { castformrainy: 'castform-orainy', castformsunny: 'castform-osunny', castformsnowy: 'castform-osnowy', cherrimsunshine: 'cherrim-osunshine', darmanitanzen: 'darmanitan-ozen', meloettapirouette: 'meloetta-opirouette' };
const anOf = A => A && (FMA[A.fm] || ANIM[A.sp]);
function gifUrl(sp, b, sh, f, fm) {
  if (FM_G[fm]) return `${G5}s${FM_G[fm]}${b ? '-b' : ''}${sh ? '-s' : ''}.gif`;
  const g = ANIM.g?.[sp]; if (!g) return null; const [nm, bits] = g, has = k => !k || (bits >> G5K.indexOf(k) & 1);
  const fs = f ? ['-f', ''] : [''], ss = sh ? ['-s', ''] : [''];
  for (const fk of fs) for (const sk of ss) { const k = (b ? '-b' : '') + fk + sk; if (has(k)) return `${G5}s${nm}${k}.gif`; }
  return has(b ? '-b' : '') ? `${G5}s${nm}${b ? '-b' : ''}.gif` : null;
}
const gifOk = new Map();   // 주소 → Promise<bool>
function gifLoad(u) {
  if (!u) return Promise.resolve(false);
  if (!gifOk.has(u)) gifOk.set(u, new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = u; }));
  return gifOk.get(u);
}
// 나올 그림 고르기: gif 가 1.5초 안에 오면 gif, 아니면 저장소 그림 (늦게라도 오면 다음 번엔 gif)
async function pickGif(side, A) {
  const u = gifUrl(A.sp, side === 'p', A.shiny, A.g === 'F', A.fm); if (!u) return null;
  return (await Promise.race([gifLoad(u), wait(1500).then(() => false)])) ? u : null;
}
// 새 그림이 다 올 때까지 숨긴다: 아이폰은 새 주소를 받는 동안 앞 포켓몬 그림을 그대로 보여 줘서 이름과 그림이 어긋났다 (경완 2026-10-27 '모래두지인데 깨비참')
function setSrc(img, u) {
  const abs = new URL(u, location.href).href; if (img.src === abs && img.complete && img.naturalWidth) { img.style.visibility = ''; return; }
  img.style.visibility = 'hidden'; img.onload = () => { img.onload = null; img.style.visibility = ''; }; img.src = u;
}
function showMon(side, A, on = true) {
  const m = monEl(side), img = m.querySelector('img');
  img.style.width = '';
  if (A && A.gif) { img.onerror = null; setSrc(img, A.gif); img.alt = ''; m.classList.remove('pl2'); m.classList.add('gf'); img.style.transform = ''; m.style.left = m.style.top = '';
    // 블랙·화이트 뒷모습 gif 는 앞모습과 거의 같은 크기라 모두 같은 배율로 키운다: 종끼리 크기 비율은 그대로, 플래티나 뒷모습(2장 그림)과 비슷한 크기 (경완 2026-10-31 '밀탱크 뒷모습 너무 작아')
    const k = side === 'p' ? 1.4 : 1, fw = () => { if (img.naturalWidth) img.style.width = img.naturalWidth * k + 'px'; };
    if (k !== 1) { if (img.complete && img.naturalWidth && img.style.visibility !== 'hidden') fw(); else img.addEventListener('load', fw, { once: true }); } }
  else if (A) {
    m.classList.remove('gf'); const a = anOf(A), sheet = !!a, fm = FMA[A.fm] ? A.fm : ''; img.onerror = () => { img.onerror = null; setSrc(img, pkSrc(A.sp, { b: side === 'p', s: A.shiny })); }; setSrc(img, fm ? `${IMG}pk/fm/${fm}${side === 'p' ? 'b' : ''}${A.shiny ? 's' : ''}.png?v=${VER}` : pkSrc(A.sp, { b: side === 'p', s: A.shiny, f: A.g === 'F' })); img.alt = '';
    m.classList.toggle('pl2', sheet); img.style.transform = '';
    if (sheet) { m.style.left = (side === 'e' ? 136 : 40) + 'px'; m.style.top = (side === 'e' ? E_Y + a[0] : P_Y + a[1]) + 'px'; }
    else { m.style.left = m.style.top = ''; }
  }
  // 한 장짜리 그림(650~ 뒷모습 등)은 bw: 고르는 동안 스프라이트는 가만히, 정보 박스만 까딱 (경완 2026-10-28)
  const an = A && !A.gif && anOf(A); m.classList.toggle('bw', !!A && !A.gif && A.sp >= 494 && (side === 'p' || !an || !(an[3] || []).length));
  m.classList.toggle('on', on);
}
// 본가 움직임: [장, 지연(1/30초), x, y], 장이 -2 보다 작으면 그 칸으로 지연 횟수만큼 되돌아가기
function playAnim(side, A) {
  const a = anOf(A), m = monEl(side); if (!a || A.gif) return;
  const fr = side === 'e' ? a[3] : a[5], st = side === 'e' ? a[2] : a[4], img = m.querySelector('img'), tok = (m._tok = (m._tok || 0) + 1);
  const set = (f, x, y) => { img.style.transform = `translate(${-80 * f + (side === 'p' ? -x : x)}px,${y}px)`; };
  (async () => {
    await wait(st * 1000 / 30); const cnt = {}; let i = 0, g = 0;
    while (i < fr.length && g++ < 80) {
      if (m._tok !== tok) return; const [f, d, x, y] = fr[i];
      if (f < -1) { cnt[i] = cnt[i] ?? d; if (cnt[i]-- > 0) { i = -f - 2; continue; } i++; continue; }
      set(f, x, y); await wait(Math.max(1, d) * 1000 / 30); i++;
    }
    if (m._tok === tok) set(0, 0, 0);
    // 650~ (팬게임 그림)은 블랙·화이트처럼 계속 움직이도록 잠깐 쉬고 다시
    if (A.sp >= 650 && fr.length) { await wait(rnd(900, 1800)); if (m._tok === tok && B && !A.fnt) playAnim(side, A); }
  })();
}
// 볼 던지기 → 펑 → 하얗게 커지며 나타남 (4세대)
async function sendOut(side, A) {
  A.gif = await pickGif(side, A); if (!B) return;
  const m = monEl(side); m.classList.remove('faint', 'on', 'recall', 'fmc', 'sub', 'hid'); showMon(side, A, false); m.classList.add('ball');
  await throwBall(side);
  ballPoof(side); se('BOWA2', { pan: panOf(side) }); m.classList.add('on'); await wait(60);
  m.classList.remove('ball'); await wait(260); try { GA.cry?.(A.sp, 0, 1, CRY_K); } catch (e) {} playAnim(side, A);
  if (A.shiny) await shinyFx(side);   // 색이 다른 포켓몬은 나올 때 반짝반짝 (본가)
  paintHb(side, A); $b(`.bt-hb.${side}`).classList.add('on'); await wait(450);
}
async function shinyFx(side) {
  const m = monEl(side); se('REAPOKE', { pan: panOf(side) });
  for (let i = 0; i < 7; i++) { const k = document.createElement('i'); k.className = 'bt-shn'; k.style.setProperty('--a', (i * 51) + 'deg'); k.style.animationDelay = (i * 60) + 'ms'; m.appendChild(k); setTimeout(() => k.remove(), 1100); }
  await wait(800);
}
// 대타: 인형으로 바뀐다 / 공중날기·구멍파기 등 숨는 기술: 다음 기술까지 사라진다 (본가)
function subFx(s, on) { const m = monEl(s); if (!m) return; let d = m.querySelector('.bt-sub'); if (!d) { d = document.createElement('i'); d.className = 'bt-sub'; m.appendChild(d); } m.classList.toggle('sub', on); }
const HIDE_MV = /^(fly|dig|dive|bounce|phantomforce|shadowforce|skydrop)$/;
function throwBall(side) {
  const fx = $b('.bt-fx'), b = document.createElement('i'); b.className = 'ball'; fx.appendChild(b);
  const [x0, y0, x1, y1] = side === 'e' ? [190, 40, 176, 66] : [40, 120, 80, 112];
  const mid = side === 'e' ? 30 : 70;
  const an = b.animate([{ transform: `translate(${x0}px,${y0}px) rotate(0)` }, { transform: `translate(${(x0 + x1) / 2}px,${mid}px) rotate(360deg)`, offset: .5 }, { transform: `translate(${x1}px,${y1}px) rotate(720deg)` }], { duration: 420, easing: 'linear' });
  return an.finished.catch(() => {}).then(() => b.remove());
}
function ballPoof(side) {
  const fx = $b('.bt-fx'), x = side === 'e' ? 176 : 80, y = side === 'e' ? 66 : 112;
  for (let k = 0; k < 10; k++) { const i = document.createElement('i'); i.className = 'poof'; const a = k / 10 * Math.PI * 2; i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.setProperty('--dx', Math.cos(a) * 30 + 'px'); i.style.setProperty('--dy', Math.sin(a) * 22 + 'px'); fx.appendChild(i); setTimeout(() => i.remove(), 600); }
}
async function recall(side) { const m = monEl(side); se('SUIKOMU', { pan: panOf(side) }); m.classList.add('recall'); await wait(420); m.classList.remove('on', 'recall'); $b(`.bt-hb.${side}`).classList.remove('on'); }
// 쓰러짐: 울음소리 → 발판 아래로 쑥 내려감 (4세대)
async function faint(side, A) {
  // 본가처럼 낮은 울음소리를 다 낸 뒤 쓰러진다 (경완 2026-10-28)
  let d = 0; try { d = await GA.cry?.(A.sp, 0, .8, CRY_K) || 0; } catch (e) {} await wait(B?.fast ? 200 : clampN(d * 1000 - 120, 520, 1400)); vibBig(side === 'p' ? 3 : 2, 2);
  se('POKE_DEAD', { pan: panOf(side) }); monEl(side).classList.add('faint'); await wait(420);
  $b(`.bt-hb.${side}`).classList.remove('on'); if (side === 'p') lowHp(false);
}
async function flash(n = 1) { const f = $b('.bt-flash'); for (let i = 0; i < n; i++) { f.classList.add('on'); await wait(70); f.classList.remove('on'); await wait(70); } }

// ---------- 아래 화면 ----------
function panel(html) { const p = $b('.bt-panel'); p.innerHTML = html; return p; }
function idlePanel() { panel(`<div class="bp-idle"></div>`); el?.classList.remove('idle'); }
function mainPanel(A) {
  el.classList.add('idle');   // 고르는 동안 내 포켓몬·체력 상자가 위아래로 살짝 (본가)
  // 지난 메시지가 남아 있으면 멈춘 것처럼 보인다 (경완 2026-10-28): 본가처럼 대화창에 '무엇을 할까?'
  $b('.bt-msg .t').textContent = `${A.nm}${jong(A.nm) ? '은' : '는'} 무엇을 할까?`; $b('.bt-msg .cur').hidden = true;
  return new Promise(res => {
    const p = panel(`<div class="bp-main">
      <button class="bb fight" data-a="fight"><span>싸우다</span></button>
      <button class="bb bag" data-a="bag"><span>가방</span></button>
      <button class="bb run" data-a="run"><span>${B.practice ? '그만두기' : '기권'}</span></button>
      <button class="bb mon" data-a="mon"><span>포켓몬</span></button>
      <p class="bp-q">${esc(A.nm)}${jong(A.nm) ? '은' : '는'} 무엇을 할까?</p></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; tapSe(); res(b.dataset.a); };
  });
}
// 상대에게 얼마나 잘 듣는지 (본가 이후 세대의 '효과가 굉장함' 표시처럼)
function effOf(type) {
  const foe = B?.btl.p2.active[0]; if (!foe || foe.fainted) return null;
  const dex = B.btl.dex, T = dex.types.get(type); if (!T?.exists) return null;
  if (!dex.getImmunity(T.name, foe)) return 0;
  return 2 ** dex.getEffectiveness(T.name, foe);
}
const TY_C = ['', '#9fa19f', '#ff8000', '#81b9ef', '#9141cb', '#915121', '#afa981', '#91a119', '#704170', '#60a1b8', '#e62829', '#2980ef', '#3fa129', '#fac000', '#ef4179', '#3dcef3', '#5060e1', '#624d4e', '#ef70ef'];
const TY_EN = ['', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy'];
const CAT_KO = ['물리', '특수', '변화'];
// 본가(플래티넘) 타입 꼬리표 + 물리·특수·변화 아이콘. 꼬리표 글자는 한국어로 위에 쓴다
const tyTag = (ty, cat) => `<span class="tg"><i class="ty" style="background-image:url(${IMG}bt/ty_${ty}.png)">${TYPE_KO[ty] || ''}</i>${cat == null ? '' : `<i class="ct" style="background-image:url(${IMG}bt/cat_${cat | 0}.png)" title="${CAT_KO[cat | 0]}"></i>`}</span>`;
function effTag(d) {
  if (!d || d[3] === 2) return '';
  const e = effOf(TY_EN[d[2]]); if (e == null) return '';
  return e === 0 ? '<i class="eff no">효과 없음</i>' : e > 1 ? '<i class="eff hi">효과 굉장!</i>' : e < 1 ? '<i class="eff lo">효과 별로</i>' : '<i class="eff">효과 있음</i>';
}
// 배틀 기술 박스 한 칸 (기술 고르기·잊을 기술 고르기·교체 카드 같은 모양, 우상단 ? = 기술 설명)
const mvBox = (i, d, pp, maxpp, dis, eff = true) => { const ty = d[2] || 1; return `<div class="mvw"><button class="mvb" data-i="${i}" style="background-image:url(${IMG}bt/mv_${ty}.png);--tc:${TY_C[ty]}" ${dis ? 'disabled' : ''}><b>${esc(d[1])}</b><span class="pw">위력 <em>${d[4] || '—'}</em> 명중 <em>${d[5] && d[5] !== true ? d[5] : '—'}</em></span>${eff ? effTag(d) : ''}${tyTag(ty, d[3])}<span class="pp">PP <em>${pp}/${maxpp}</em></span></button><button class="mvi" data-info="${i}" aria-label="기술 설명">?</button></div>`; };
function movePanel(req) {
  return new Promise(res => {
    const mv = req.active[0].moves;
    const p = panel(`<div class="bp-moves">${[0, 1, 2, 3].map(i => { const m = mv[i]; if (!m) return `<i class="mvb empty"></i>`; const d = mvOf(m.id) || ['', m.move, 1, 0];
      return mvBox(i, d, m.pp, m.maxpp, m.disabled || m.pp <= 0); }).join('')}
      <button class="bb cancel" data-x><span>취소</span></button></div>`);
    p.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return; tapSe();
      if (b.hasAttribute('data-x')) return res(null);
      if (b.dataset.info) return moveInfo(mv[+b.dataset.info]).then(() => movePanel(req).then(res));
      res(+b.dataset.i);
    };
  });
}
// 기술 설명: 타입·분류·위력·명중·PP·설명 (아래 화면)
function moveInfo(m) {
  return new Promise(res => {
    const d = mvOf(m.id) || ['', m.move, 1, 0, 0, 0, m.maxpp, 0, '']; const ty = d[2] || 1;
    const p = panel(`<div class="bp-info"><div class="mi-top" style="background-image:url(${IMG}bt/mv_${ty}.png);--tc:${TY_C[ty]}"><b>${esc(d[1])}</b></div>
      <dl><dt>타입</dt><dd>${tyTag(ty)}</dd><dt>분류</dt><dd>${tyTag(ty, d[3]).replace(/<i class="ty"[^]*?<\/i>/, '')} ${CAT_KO[d[3] | 0]}</dd>
      <dt>위력</dt><dd>${d[4] || '—'}</dd><dt>명중</dt><dd>${d[5] && d[5] !== true ? d[5] : '—'}</dd><dt>PP</dt><dd>${m.pp}/${m.maxpp}</dd><dt>효과</dt><dd>${effTag(d).replace(/<\/?i[^>]*>/g, '') || '—'}</dd></dl>
      <p>${esc(d[8] || '')}</p><button class="bb cancel" data-x><span>돌아가기</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe(); res(); };
  });
}
// 쇼다운은 교체할 때마다 side.pokemon 순서를 바꾼다: 지금 i번째 → 처음 순서(B.my) 번호. 울부짖기·날려버리기로 바뀐 뒤 이름·그림이 어긋나 원래 포켓몬이 '나와 있음'으로 잠겼다 (경완 2026-10-28)
const myIx = i => { const P = B.btl.p1.pokemon[i], j = B.o.p.indexOf(P); return j >= 0 ? j : i; };
function partyPanel(req, forced) {
  return new Promise(res => {
    const L = req.side.pokemon, sx = g => g === 'M' || g === 'F' ? `<i class="sx ${g}"></i>` : '';
    const hpOfM = m => { const [hp, mhp] = (m.condition.split(' ')[0] || '0/0').split('/').map(Number); return [hp, mhp, mhp ? hp / mhp : 0, /fnt/.test(m.condition)]; };
    const tys = A => (SPECIES[A.sp]?.t || []).map(t => tyI(t)).join('');
    // 포켓몬 버튼: 정사각형 프로필 + 이름·성별 + 타입 (경완 2026-10-29)
    const list = () => { const p = panel(`<div class="bp-party">${L.map((m, i) => { const [hp, mhp, r, fnt] = hpOfM(m), A = B.my[myIx(i)];
      return `<button class="pty${m.active ? ' act' : ''}${fnt ? ' fnt' : ''}" data-i="${i}">${boxOf(A.pid) ? thumb(boxOf(A.pid)) : ''}<b>${esc(A.nm)}${sx(A.g)}</b><span class="lv">Lv${A.lv}</span><span class="pty-ty">${tys(A)}</span><i class="hp"><i class="${hpCol(r)}" style="width:${r * 100}%"></i></i><span class="hpn">${fnt ? '기절' : `${hp}/${mhp}`}</span></button>`; }).join('')}
      ${forced ? '' : '<button class="bb cancel" data-x><span>취소</span></button>'}</div>`); fillTh(p);
      p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe(); if (b.hasAttribute('data-x')) return res(null); card(+b.dataset.i); }; };
    // 누르면 바로 바뀌지 않고 상세 카드 → '바꾸기' (경완 2026-10-29)
    const card = i => { const m = L[i], A = B.my[myIx(i)], P = boxOf(A.pid), [hp, mhp, r, fnt] = hpOfM(m), can = !m.active && !fnt;
      const sl = B.btl.p1.pokemon[i]?.moveSlots || [], mv = (m.moves || A.mv || []).map(id => { const d = mvOf(toID(id)); if (!d) return null; const s0 = sl.find(x => x.id === toID(id)); return { d, id: toID(id), move: d[1], pp: s0?.pp ?? d[6], maxpp: s0?.maxpp ?? d[6] }; }).filter(Boolean);   // 기술마다 위력·명중·PP, 누르면 기술 설명 (v12.20 경완)
      const p = panel(`<div class="bp-card"><div class="bc-hd">${P ? thumb(P) : ''}<div class="bc-tx"><b>${esc(A.nm)}${sx(A.g)}</b><span class="bc-lv">Lv.${A.lv}<span class="pty-ty">${tys(A)}</span></span><i class="hp"><i class="${hpCol(r)}" style="width:${r * 100}%"></i></i><span class="hpn">${fnt ? '기절' : `HP ${hp}/${mhp}`}</span></div></div>
        <p class="bc-ab"><small>특성</small><b>${esc(abKo(A.ab))}</b>${A.it && HOLD[A.it] ? `<small>도구</small><img class="bc-it" alt="" src="${itImg(A.it)}">${esc(HOLD[A.it][0])}` : ''}${AB_D[A.ab] ? `<span class="bc-abd">${esc(AB_D[A.ab])}</span>` : ''}</p>
        <div class="bc-mv">${mv.map((x, k) => mvBox(k, x.d, x.pp, x.maxpp, false)).join('')}</div>
        <div class="bc-btns"><button class="bb cancel" data-x><span>뒤로</span></button><button class="bb go" data-go ${can ? '' : 'disabled'}><span>${m.active ? '나와 있음' : fnt ? '기절' : '바꾸기'}</span></button></div></div>`); fillTh(p);
      p.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; tapSe(); if (b.dataset.i != null || b.dataset.info) return moveInfo(mv[+(b.dataset.info ?? b.dataset.i)]).then(() => card(i)); if (b.hasAttribute('data-x')) return list(); if (b.hasAttribute('data-go')) { panel(''); res(i); } }; };   // 바꾸기를 누르면 아래 화면 포켓몬 정보는 닫는다 (v12.24 경완)
    list();
  });
}
function yesNo(q) {
  return new Promise(res => { const p = panel(`<div class="bp-yn"><p>${q}</p><button class="bb yes" data-a="1"><span>네</span></button><button class="bb no" data-a="0"><span>아니요</span></button></div>`);
    p.onclick = e => { const b = e.target.closest('button[data-a]'); if (!b) return; tapSe(); res(b.dataset.a === '1'); }; });
}

// ---------- 쇼다운 세트 ----------
const toID = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function psSet(o) {
  const dx = PSim.Dex, sp = dx.species.get(D.sp[o.sp]?.id || String(o.sp));
  const iv = o.iv || [20, 20, 20, 20, 20, 20];
  return { name: o.nm, species: sp.name, level: o.lv, moves: o.mv, ability: o.ab, nature: dx.natures.get(o.nat || 'hardy').name, item: o.it && HOLD[o.it] ? dx.items.get(o.it).name : '',
    gender: o.g === 'M' || o.g === 'F' ? o.g : '', shiny: !!o.shiny,
    ivs: { hp: iv[0], atk: iv[1], def: iv[2], spa: iv[3], spd: iv[4], spe: iv[5] }, evs: o.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };
}
function myEntry(P) { const m = gm(P); return { pid: P.id, sp: P.sp, nm: nmOf(P), lv: m.lv, mv: m.mv, ab: m.ab, nat: m.nat, it: m.it, iv: P.iv, fr: P.fr || 0, g: P.sex === 'f' ? 'F' : P.sex === 'm' ? 'M' : '', shiny: !!P.shiny }; }
// 상대 포켓몬: 그 레벨에 배우는 기술 중 무작위 4개
function foeEntry(sp, lv, tier = 0) {
  const r = Math.random, ab = D.sp[sp]?.ab || ['noability'], nats = NATS(), g = SPECIES[sp]?.g;
  const sex = /수컷만|♂만/.test(g || '') ? 'M' : /암컷만|♀만/.test(g || '') ? 'F' : Math.random() < .5 ? 'M' : 'F';
  return { sp, nm: SPECIES[sp]?.n || String(sp), lv, mv: tier ? smartMoves(sp, lv, tier, r) : pickMoves(sp, lv, r), ab: Math.random() < HA_RATE && D.sp[sp]?.h ? D.sp[sp].h : abNorm(sp)[Math.floor(r() * Math.min(2, abNorm(sp).length))], nat: pick(nats), iv: Array.from({ length: 6 }, () => Math.floor(rnd(8, 26))), g: sex, shiny: Math.random() < 1 / 4096 };
}

// ---------- AI (난이도: 0 쉬움 1 보통 2 어려움) ----------
function aiChoice(btl, diff) {
  const side = btl.p2, req = side.activeRequest; if (!req || req.wait) return null;
  const foe = btl.p1.active[0], me = side.active[0];
  const score = (mon, mid) => { const m = btl.dex.moves.get(mid); if (!foe || foe.fainted) return 1; if (m.category === 'Status') return diff ? 18 + Math.random() * 14 : 20;
    if (!btl.dex.getImmunity(m.type, foe)) return 0; const eff = 2 ** btl.dex.getEffectiveness(m.type, foe); const stab = (mon.types || mon.species?.types || []).includes(m.type) ? 1.5 : 1;
    return (m.basePower || 40) * eff * stab * ((m.accuracy === true ? 100 : m.accuracy) / 100); };
  const bench = () => req.side.pokemon.map((p, i) => ({ p, i, mon: side.pokemon[i] })).filter(o => !o.p.active && !/fnt/.test(o.p.condition));
  // 쉬움: 예전 그대로 (거의 아무 기술)
  if (diff === 0) {
    if (req.forceSwitch) { const o = bench(); return o.length ? 'switch ' + (pick(o).i + 1) : 'pass'; }
    const mv = req.active[0].moves.map((m, i) => ({ m, i })).filter(o => !o.m.disabled && o.m.pp > 0); if (!mv.length) return 'move 1';
    if (Math.random() < .7) return 'move ' + (pick(mv).i + 1);
    return 'move ' + (mv.map(o => ({ o, s: score(me, o.m.id) * rnd(.85, 1.15) })).sort((a, b) => b.s - a.s)[0].o.i + 1);
  }
  // 보통·어려움: 실제 데미지를 어림해서 운용 (경완 2026-10-29 '실전 운용까지 AI'): 마무리·선공기·능력치 올리기·상태이상·회복·교체
  // 쇼다운 getStat·hasType 은 이벤트를 돌려서 배틀 밖에서 부르면 스택이 넘친다 → 저장된 능력치·종족 타입으로 직접 계산
  const st = (p, k) => { const b = p.boosts?.[k] || 0; let v = (p.storedStats?.[k] || 100) * (b >= 0 ? (2 + b) / 2 : 2 / (2 - b)); if (k === 'spe' && p.status === 'par') v /= 2; if (k === 'atk' && p.status === 'brn') v /= 2; return v; };
  const hasT = (p, t) => (p.types || p.species?.types || []).includes(t);
  const dmg = (a, d, mid) => { if (!a || !d || d.fainted) return 0; const m = btl.dex.moves.get(mid); if (m.category === 'Status') return 0;
    if (!btl.dex.getImmunity(m.type, d)) return 0; if (m.damage === 'level') return a.level; if (typeof m.damage === 'number') return m.damage;
    const bp = m.basePower || 0; if (!bp) return 0; const ph = m.category === 'Physical', A = st(a, ph ? 'atk' : 'spa'), Df = Math.max(1, st(d, ph ? 'def' : 'spd'));
    const base = Math.floor(Math.floor(Math.floor(2 * a.level / 5 + 2) * bp * A / Df) / 50) + 2;
    return base * (hasT(a, m.type) ? 1.5 : 1) * 2 ** btl.dex.getEffectiveness(m.type, d) * .925 * ((m.accuracy === true ? 100 : m.accuracy) / 100); };
  const best = (a, d) => Math.max(0, ...(a?.moveSlots || []).filter(x => x.pp > 0).map(x => dmg(a, d, x.id)));
  const fast = (a, d) => st(a, 'spe') >= st(d, 'spe');
  // 들어갈 포켓몬 고르기: 내가 주는 피해 비율 − 받는 피해 비율이 가장 좋은 쪽
  const matchup = mon => !foe || foe.fainted ? 0 : Math.min(1.2, best(mon, foe) / Math.max(1, foe.hp)) - Math.min(1.2, best(foe, mon) / Math.max(1, mon.hp)) * .9;
  if (req.forceSwitch) { const o = bench(); if (!o.length) return 'pass'; return 'switch ' + (o.map(x => ({ x, s: matchup(x.mon) + Math.random() * .1 })).sort((a, b) => b.s - a.s)[0].x.i + 1); }
  const mv = req.active[0].moves.map((m, i) => ({ m, i })).filter(o => !o.m.disabled && o.m.pp > 0);
  if (!mv.length) return 'move 1';
  if (diff === 1 && Math.random() < .12) return 'move ' + (pick(mv).i + 1);   // 보통은 가끔 실수
  const fHp = Math.max(1, foe?.hp || 1), mHp = me.hp / me.maxhp, inDanger = best(foe, me) >= me.hp, foeHit = best(foe, me) / Math.max(1, me.hp), bo = me.boosts || {};
  const sc = mv.map(o => { const m = btl.dex.moves.get(o.m.id); let v;
    if (m.category !== 'Status') { const d = dmg(me, foe, o.m.id); v = Math.min(1, d / fHp); if (d >= fHp) v += 1 + (m.priority > 0 ? .3 : 0); if (m.priority > 0 && inDanger && !fast(me, foe)) v += d >= fHp ? .6 : .25; if (m.self?.boosts && Object.values(m.self.boosts).some(x => x < 0)) v -= .08; }
    else { v = .05; const sb = m.boosts && m.target === 'self' ? m.boosts : null;
      if (sb) { const up = Object.entries(sb).filter(([k, x]) => x > 0), cur = Math.max(...up.map(([k]) => bo[k] || 0), 0); if (up.length && cur < 2 && mHp > .6 && foeHit < .45) v = .62 - cur * .2; }
      else if (m.status && foe && !foe.status && !foe.fainted) { const im = !btl.dex.getImmunity(m.status === 'par' && m.type === 'Electric' ? 'Electric' : m.type, foe) || (m.status === 'brn' && hasT(foe, 'Fire')) || ((m.status === 'psn' || m.status === 'tox') && (hasT(foe, 'Poison') || hasT(foe, 'Steel'))) || (m.status === 'par' && hasT(foe, 'Electric'));
        if (!im && foe.hp / foe.maxhp > .4) v = m.status === 'slp' ? .75 : m.status === 'brn' ? (st(foe, 'atk') > st(foe, 'spa') ? .6 : .35) : m.status === 'par' ? (fast(me, foe) ? .3 : .55) : .45; }
      else if (m.heal || m.id === 'roost' || m.id === 'synthesis' || m.id === 'moonlight' || m.id === 'morningsun') v = mHp < .45 && !inDanger ? .7 : mHp < .7 ? .25 : 0;
      else if (m.sideCondition === 'stealthrock') v = !btl.p1.sideConditions?.stealthrock && btl.p1.pokemon.filter(p => !p.fainted).length > 2 ? .5 : 0;
      else if (m.volatileStatus === 'leechseed') v = foe && !foe.volatiles?.leechseed && !hasT(foe, 'Grass') ? .4 : 0;
      else if (m.id === 'substitute') v = mHp > .6 && !me.volatiles?.substitute ? .3 : 0;
      else if (m.id === 'protect' || m.id === 'detect') v = .1;
      if (m.accuracy !== true) v *= m.accuracy / 100; }
    return { o, s: v * rnd(.95, 1.05) }; }).sort((a, b) => b.s - a.s);
  // 상성이 나쁘면 교체: 지금 기술로 거의 못 때리고, 맞으면 크게 다칠 때 더 나은 포켓몬이 있으면
  if (!req.active[0].trapped && foe && !foe.fainted && sc[0].s < .3 && (foeHit > .5 || sc[0].s < .12)) {
    const b = bench().map(x => ({ x, s: matchup(x.mon) })).sort((a, b) => b.s - a.s)[0];
    if (b && b.s > matchup(me) + .35 && Math.random() < (diff === 2 ? .75 : .4)) return 'switch ' + (b.x.i + 1);
  }
  return 'move ' + (sc[0].o.i + 1);
}

// ---------- 배틀 들어가는 화면 전환 (DP·Pt 본가처럼) ----------
// 화면이 두 번 하얗게 번쩍 → 일반 트레이너는 가로 띠가 양옆에서 번갈아 밀려 들어와 화면을 덮고,
// 관장·사천왕·챔피언·라이벌(music 이 gymBattle·champ·rival)은 어두운 화면에 트레이너 얼굴 띠가 미끄러져 들어온다.
// 끝나면 배틀 화면을 그 밑에 띄우고 돌려준 함수로 전환 화면을 걷는다.
async function encounter(opts) {
  const host = el.parentElement || document.body, w = document.createElement('div'), big = ['gymBattle', 'champ', 'rival'].includes(opts.music);
  w.className = 'bt-enc'; host.append(w);
  for (let i = 0; i < 2; i++) { w.classList.add('flash'); await wait(90); w.classList.remove('flash'); await wait(120); }
  if (opts.exam) {   // 승급 심사 (경완 2026-10-31 '배틀 시작할 때 연출도 웅장하게'): 암전 → 금빛 띠 → 빛줄기 속 배지 → '승급 심사' → 심사관 띠
    w.classList.add('ex');
    // 줄무늬·빛줄기 없이 (경완 2026-10-31 '구려'): 암전 → 금빛 실선이 가로로 그어지고 → 위아래로 열리는 어두운 무대 → 배지가 떠오름 → '승급 심사' → 심사관 띠
    w.insertAdjacentHTML('beforeend', `<i class="bk"></i><i class="ex-ln"></i><div class="ex-pn"><i class="ex-glow"></i><div class="ex-bd">${opts.exam.bd}</div><b class="ex-t"><small>${esc(opts.exam.g)}</small>승급 심사</b></div><i class="ex-fl"></i><div class="band ex-band"><i class="mug" style="background-image:url(${trSrc(opts.foe.tr)})"></i><b><small>심사관 · ${esc(opts.foe.cls)}</small>${esc(opts.foe.nm)}</b></div>`);
    await wait(500); se('KIRAKIRA2'); await wait(1000); w.classList.add('hit'); se('KON'); await wait(1500); w.classList.add('foe'); se('SLIDEIN'); await wait(1600);
  } else if (!big) {
    w.insertAdjacentHTML('beforeend', Array.from({ length: 12 }, (_, i) => `<i class="st ${i % 2 ? 'r' : 'l'}" style="top:${(i * 100 / 12).toFixed(3)}%;animation-delay:${i * 28}ms"></i>`).join(''));
    await wait(760);
  } else {
    w.insertAdjacentHTML('beforeend', `<i class="bk"></i><div class="band"><i class="mug" style="background-image:url(${trSrc(opts.foe.tr)})"></i><b><small>${esc(opts.foe.cls)}</small>${esc(opts.foe.nm)}</b></div>`);
    await wait(1900);
  }
  return () => { w.classList.add('out'); setTimeout(() => w.remove(), 520); };
}

// ---------- 배틀 진행 ----------
// opts: { my: [P...], foe: { tr, cls, nm, f, team: [entry...] }, diff, practice, bg, music: 'train'|'gymBattle'|'rival'|'champ' }
const M = (f, ...a) => { try { window.GymBGM?.[f](...a); } catch (e) {} };   // 체육관 BGM (gym/bgm.js)
// 본가 몬스터볼 줄: 배틀 시작 때 양쪽이 가진 포켓몬 수 (쓰러짐은 회색, 상태 이상은 노랑, 빈 칸은 테두리만) (경완 2026-10-28)
function tray() { ['e', 'p'].forEach(s => { const L = B.o[s] || [], t = $b(`.bt-pty.${s}`);
  t.innerHTML = balls(s); t.classList.add('on'); }); }
// 포켓몬 수 몬스터볼 (도트, gym/img/bt/pball8.png: 보통·상태 이상·기절·빈 칸)
const balls = s => { const L = B.o[s] || [], live = B.btl?.[s === 'p' ? 'p1' : 'p2']?.pokemon || [];
  return Array.from({ length: 6 }, (_, i) => { const P = L[i], X = P && (live.find(q => q === P) || P), D = X && B.act?.[s]?.pk === X ? B.act[s] : null;
    // 나와 있는 포켓몬은 화면에 보인 상태로: 쓰러지는 연출이 끝나기 전엔 볼이 안 꺼진다 (경완 2026-10-28 '스포')
    return `<i class="${!X ? 'x' : D ? (D.fntS ? 'f' : D.st ? 's' : 'o') : X.fainted || X.hp <= 0 ? 'f' : X.status ? 's' : 'o'}"></i>`; }).join(''); };
// 배틀 기록 (경완 2026-10-31 '내 배틀로그 못 보나?'): 최근 5판을 저장(S.gym.blog)에 남긴다. 서버 저장(V_ 레코드)에도 같이 올라가서 나중에 그 판을 그대로 읽어 볼 수 있다
// {t 끝난 시각, v 버전, foe 상대, won, out(quit), pr 연습, turns, my [[sp,lv,'기술들',특성,친밀도,도구]], fo 상대 팀, ch [[턴, 관장 선택, 상대 선택]], log 쇼다운 기록(정확한 체력 줄만, 600줄까지)}
const BLOG_N = 5, BLOG_L = 600, BLOG_SKIP = /^\|(t:|gametype|gen|tier|rule|player|teamsize|poke|teampreview|clearpoke|start|upkeep|debug)(\||$)/;
function blogSave(opts, my, foeT, won, out) {
  if (!B || !S.gym) return; const L = B.btl.log, lines = [];
  for (let i = 0; i < L.length && lines.length < BLOG_L; i++) { const ln = L[i]; if (ln.startsWith('|split|')) { lines.push(L[i + 1]); i += 2; continue; } if (!ln || ln === '|' || BLOG_SKIP.test(ln)) continue; lines.push(ln); }
  let v = ''; try { v = APP_VER; } catch (e) {}
  const rec = { t: Date.now(), v, foe: B.foeNm || opts.foe?.nm || '', won: won ? 1 : 0, out: out || undefined, pr: B.practice ? 1 : 0, turns: B.btl.turn,
    my: my.map(o => [o.sp, o.lv, (o.mv || []).join(' '), o.ab || '', o.fr || 0, o.it || '']), fo: foeT.map(o => [o.sp, o.lv, (o.mv || []).join(' '), o.ab || '', o.it || '']),
    ch: B.picks || [], log: lines };
  S.gym.blog = [rec, ...(S.gym.blog || [])].slice(0, BLOG_N);
  try { GA.save(); } catch (e) {}
}
async function run(opts) {
  await Promise.all([loadData(), loadSim()]);
  if (!el) buildUI(); fit();
  const my = opts.my.map(myEntry), foeT = opts.foe.team;
  const btl = new PSim.Battle({ formatid: 'gen9customgame', seed: [1, 2, 3, 4].map(() => Math.floor(Math.random() * 65536)) });
  btl.setPlayer('p1', { name: '관장', team: my.map(psSet) });
  btl.setPlayer('p2', { name: opts.foe.nm, team: foeT.map(psSet) });
  // 쇼다운은 교체할 때마다 pokemon 배열 순서를 바꾼다. 처음 순서(my·foe 와 같은 순서)를 따로 둔다 (경완 2026-10-27 '시라소몬인데 망키라고 나옴')
  const monSnap = opts.practice ? JSON.stringify(S.gym.mon || {}) : null;   // 연습 배틀: 연출은 다 보여 주고 경험치·레벨·기술은 끝나면 되돌림 (경완 2026-10-29)
  B = { btl, my, foe: foeT, o: { p: [...btl.p1.pokemon], e: [...btl.p2.pokemon] }, act: { p: null, e: null }, li: 0, practice: !!opts.practice, diff: opts.diff ?? 1, fast: false, tapWake: null, out: null, used: new Set(), xr: {} };
  frHooks(btl); B.picks = [];
  const meF = GA.trOf().sex === 'f';
  const music = opts.music || 'train'; M('prep', music === 'train' ? 'winTrain' : 'winGym');
  // 곡이 준비된 뒤에 연출 시작 (경완 2026-10-28 '시작 연출이랑 BGM 타이밍이 안 맞음'): 처음 만드는 곡이면 기다림, 최대 4초
  await Promise.race([(async () => { try { await window.GymBGM?.play(music, { fade: .05 }); } catch (e) {} })(), wait(4000)]);
  const encDone = await encounter(opts);
  el.classList.remove('off'); el.hidden = false; el.className = 'bt intro now'; fit();   // className 을 새로 쓰면 mob·msgmid 가 지워져 대화창이 사라졌음 (경완 2026-10-27 '배틀 상태창이 없어졌네')
  $b('.bt-bg').style.backgroundImage = `url(${IMG}bt/bg_${opts.bg || 'in1'}.png)`;
  // 지난 배틀의 away·back·throw 가 남아 있으면 트레이너가 미끄러져 들어오지 않고 제자리에 있었다 (경완 2026-10-28 '발판만 움직이고 캐릭터는 안 움직임')
  const trE = $b('.bt-tr.e'), trP = $b('.bt-tr.p'), uE = trSrc(opts.foe.tr), uP = opts.meBackUrl || `${IMG}trb/${meF ? 'pt_f' : 'pt_m'}.png`;
  trE.className = 'bt-tr e'; trP.className = 'bt-tr p';
  trE.style.backgroundImage = `url(${uE})`; trP.style.backgroundImage = `url(${uP})`;
  await Promise.race([Promise.all([uE, uP].map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; }))), wait(1200)]);   // 그림이 늦게 떠서 멈춰 보이지 않게 미리 받기
  ['e', 'p'].forEach(s => { $b(`.bt-pty.${s}`).classList.remove('on'); $b(`.bt-hb.${s}`).classList.remove('on'); monEl(s).className = `bt-mon ${s}`; setSt(s, ''); });
  $b('.bt-msg .t').textContent = ''; idlePanel(); wxSet(''); $b('.bt-terr').className = 'bt-terr'; $b('.bt-lvw').hidden = true; $b('.bt-shw').hidden = true;
  // 등장: 화면이 번쩍이며 가로줄로 열리고, 발판·트레이너가 양옆에서 미끄러져 들어온다
  M('sePrep', SE_BASE.map(n => 'DP_' + n)); await wait(40); el.classList.add('now', 'open'); void el.offsetWidth; el.classList.remove('now'); encDone(); se('SLIDEIN');   // 배틀 화면은 바로 불투명하게 (서서히 나타나면 걷히는 전환 화면 사이로 체육관이 비쳤다, 경완 2026-10-28)
  await wait(900); el.classList.remove('intro');
  const foeNm = B.foeNm = `${opts.foe.cls} ${opts.foe.nm}`;
  tray(); await msg(`${iga(foeNm)} 승부를 걸어왔다!`, 900);
  my.forEach(o => gifLoad(gifUrl(o.sp, true, o.shiny, o.g === 'F'))); foeT.forEach(o => gifLoad(gifUrl(o.sp, false, o.shiny, o.g === 'F')));   // 미리 받기
  btl.makeChoices('default', 'default');   // 팀 미리보기: 라인업 순서 그대로
  try { await play(); } catch (e) { console.error(e); try { window.pkErr?.('battle: ' + (e?.message || e), e?.stack); } catch (e2) {} }
  const won = btl.winner === '관장', out = B?.out;
  try { blogSave(opts, my, foeT, won, out); } catch (e) {}
  if (B) {
    if (out !== 'quit') {
      $b('.bt-tr.e').classList.add('back');
      if (won) { M('play', music === 'train' ? 'winTrain' : 'winGym', { fade: .05 }); await msgTap(`${wa(foeNm)}의 승부에서 이겼다!`); }
      else await msgTap('승부에서 졌다…');
      const ln = opts.foe.say?.[won ? 'win' : 'lose']; if (ln && B) await msgTap(ln);   // 상대 한마디 (본가처럼 다시 나와서)
      // 보상 (경완 2026-10-28): 한마디 뒤 골드·평판
      const W = opts.rew; if (W && B) { if (won) { await msgTap(`${W.g.toLocaleString()}G를 받았다!`); if (W.r) await msgTap(`체육관 평판이 ${W.r} 올랐다!`); } else if (W.rl) await msgTap(`체육관 평판이 ${-W.rl} 깎였다…`); }
    }
  }
  if (monSnap) S.gym.mon = JSON.parse(monSnap);
  lowHp(false); M('play', 'gym', { fade: 1.2 });
  // 끝나면 까맣게 어두워졌다가 체육관이 밝아지며 돌아온다 (본가처럼, 경완 2026-10-28)
  const fd = document.createElement('i'); fd.className = 'bt-fade'; (el.parentElement || document.body).appendChild(fd); void fd.offsetWidth; fd.classList.add('on'); await wait(420);
  el.classList.add('off'); el.hidden = true; await wait(120); fd.classList.remove('on'); setTimeout(() => fd.remove(), 800); await wait(650); const res = { won, quit: out === 'quit', turns: btl.turn, my: B?.my, used: [...(B?.used || [])], xr: B?.xr || {} }; B = null; return res;
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
    if (c2 && !c1 && r2.forceSwitch && btl.p2.active[0]?.fainted && /^switch/.test(c2)) { await shiftAsk(c2); if (!B) return; }
    idlePanel();
    if (B.picks) B.picks.push([btl.turn, c1 || '', c2 || '']);   // 배틀 기록: 이 턴에 관장이 고른 것·상대 AI 가 고른 것
    if (c1 && c2) btl.makeChoices(c1, c2); else if (c1) btl.choose('p1', c1); else if (c2) btl.choose('p2', c2); else return;
  }
}
// 교체 룰 (본가 기본): 상대가 쓰러진 포켓몬 대신 다음을 내보내기 전에 '포켓몬을 바꾸겠습니까?' (경완 2026-10-29). 바꾸면 내 쪽이 먼저 나온다
async function shiftAsk(c2) {
  const btl = B.btl, me = btl.p1.active[0];
  if (!me || me.fainted || !btl.p1.pokemon.some(p => !p.fainted && !p.isActive)) return;
  const nx = btl.p2.pokemon[+c2.split(' ')[1] - 1], nm = B.foe[B.o.e.indexOf(nx)]?.nm || nx?.name || '';
  await msg(`${eun(B.foeNm)} ${eul(nm)} 내보내려 하고 있다!`, 0);
  if (!await yesNo('포켓몬을 바꾸겠습니까?')) return;
  const i = await partyPanel({ side: btl.p1.getRequestData() }, false); if (i == null || !B) return;
  const pk = btl.p1.pokemon[i]; if (!pk || pk.fainted || pk.isActive) return;
  btl.actions.switchIn(pk, 0); btl.queue.list = btl.queue.list.filter(x => !(x.choice === 'runSwitch' && x.pokemon === pk)); btl.actions.runSwitch(pk);
  await readLog();
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
  const L = B.o[side], nm = nmIn(line[2]), spn = line[3].split(',')[0];
  const k = L.findIndex(p => p.name === nm && p.species.name === spn && !p.fainted && p !== (side === 'p' ? B.act.p?.pk : B.act.e?.pk));
  return k >= 0 ? k : L.findIndex(p => p.name === nm);
}
// 맞는 소리는 효과(굉장/별로)에 따라 다르다: 이어지는 줄을 미리 본다
function effAhead(id) { const L = B.btl.log; for (let k = B.li; k < Math.min(L.length, B.li + 4); k++) { const x = L[k].split('|'); if (x[1] === '-supereffective' && x[2] === id) return 'H'; if (x[1] === '-resisted' && x[2] === id) return 'L'; if (x[1] === 'move' || x[1] === '-damage') break; } return 'M'; }
// 정보 카드 친밀도 (경완 2026-10-29 '체육관 상세 정보카드에서도 확인')
function frRow(P) { const fr = Math.min(255, P.fr || 0), h = fr >= 255 ? 5 : Math.min(4, Math.floor(fr / 51)); return `<p class="mp-frh"><small>친밀도</small><b class="${h >= 5 ? 'max' : ''}">${'♥'.repeat(h)}${'♡'.repeat(5 - h)}</b></p>`; }   // 레벨·랭크 밑 (경완 2026-10-29 '친밀도 + 하트만')
// 친밀도 기믹 (경완 2026-10-29 '배틀에 친밀도 기믹'): 하트(친밀도 51마다 1개, 255 = 만점)가 많을수록 내 포켓몬이 관장을 위해 힘낸다 (본가 소드·실드 '어펙션' 느낌)
// ♥3 이상: 쓰러질 공격을 HP 1로 버팀 (15·20·25%) · ♥4 이상: 급소 +1, 턴 끝에 상태 이상을 스스로 고침 (20%) · ♥5(만점): 공격을 피함 (10%)
const FR_END = [0, 0, 0, 15, 20, 25];
function frLv(pk) { if (!B || !pk || pk.side?.id !== 'p1') return 0; const fr = B.my[B.o.p.indexOf(pk)]?.fr || 0; return fr >= 255 ? 5 : Math.min(4, Math.floor(fr / 51)); }
function frHooks(btl) {
  const F = btl.format;
  btl.onEvent('Damage', F, -40, function (dmg, target, src, eff) {
    if (eff?.effectType !== 'Move' || !(dmg >= target.hp) || target.hp <= 1) return;
    const h = frLv(target); if (h < 3 || !this.randomChance(FR_END[h], 100)) return;
    this.add('-frmsg', target, 'endure'); return target.hp - 1;
  });
  btl.onEvent('Accuracy', F, function (acc, target, src, move) {
    if (acc === true || target === src || move?.category === 'Status' || frLv(target) < 5 || !this.randomChance(10, 100)) return;
    this.add('-frmsg', target, 'dodge'); return 0;
  });
  btl.onEvent('ModifyCritRatio', F, function (r, src) { return frLv(src) >= 4 ? r + 1 : r; });
  btl.onEvent('Residual', F, function () {
    for (const pk of this.p1.active) if (pk && !pk.fainted && pk.status && frLv(pk) >= 4 && this.randomChance(20, 100)) { this.add('-frmsg', pk, 'cure', pk.status); pk.cureStatus(true); }
  });
}
const FR_ST = { slp: '잠', frz: '얼음', par: '마비', brn: '화상', psn: '독', tox: '독' };
async function frFx(s) { const m = monEl(s); if (!m) return; const h = document.createElement('i'); h.className = 'bt-hrt'; h.textContent = '♥'; m.appendChild(h); setTimeout(() => h.remove(), 1400); try { window.GymBGM?.se?.('DP_PINPON'); } catch (e) {} await wait(500); }
async function readLog() {
  const L = B.btl.log;
  while (B && B.li < L.length) {
    let line = L[B.li++];
    if (line === '|split|p1' || line === '|split|p2') { line = L[B.li]; B.li += 2; }   // 정확한 체력 줄만 쓴다
    try { await handle(line.split('|')); } catch (e) { console.error(e, line); }
  }
}
// 이 기술 줄 뒤 (다음 행동 전까지)에 '효과 없음·실패·방어' 가 오면 연출을 건너뛴다
function noFx() {
  const L = B.btl.log;
  for (let j = B.li; j < L.length && j < B.li + 12; j++) {
    const t = L[j].split('|'), k = t[1];
    if (k === '-immune' || k === '-fail' || (k === '-activate' && /Protect|Detect|King's Shield|Spiky Shield|Baneful Bunker|Obstruct|Silk Trap|Burning Bulwark|Max Guard/.test(t[3] || ''))) return true;
    if (k === 'move' || k === 'turn' || k === 'switch' || k === 'drag' || k === '-damage' || k === 'faint' || k === 'upkeep' || k === '-hitcount' || k === '-heal' || k === '-boost' || k === '-unboost' || k === '-status' || k === '-start') return false;
  }
  return false;
}
const hpOf = s => { const [a] = String(s || '').split(' '); if (a === '0') return [0, 0]; const [h, m] = a.split('/').map(Number); return [h || 0, m || 0]; };
const stOf = s => (String(s || '').split(' ')[1] || '').replace('fnt', '');
// 급소·상성 말은 본가처럼 체력바가 다 줄어든 뒤에 (경완 2026-10-28). 쇼다운은 -damage 앞에 보내므로 모아 뒀다가 낸다
const PEND = { '-crit': '급소에 맞았다!', '-supereffective': '효과가 굉장했다!', '-resisted': '효과가 별로인 듯하다…' };
async function flushPend() { const L = B?.pend; if (!L?.length) return; B.pend = []; for (const t of L) { if (/버텼다!$/.test(t) && B.frq?.length) await frFx(B.frq.shift()); await msg(t); } }
async function handle(a) {
  const k = a[1], A = s => B.act[s];
  // v13.16 경완 '맞지 않았다! 가 너무 빨리': 기술 이름 바로 뒤에 오는 결과 말은 이름을 읽을 틈(0.75초)을 둔다
  const pk = B.prevK; B.prevK = k; const gap = () => pk === 'move' ? wait(750) : null;
  if (PEND[k]) { if (k === '-crit') setTimeout(() => vib(2), 120); (B.pend = B.pend || []).push(PEND[k]); return; }
  if (k === '-frmsg') {   // 친밀도: 버티기는 체력바가 줄어든 뒤에, 피하기·고치기는 바로
    const n = nmIn(a[2]), s = sideOf(a[2]);
    if (a[3] === 'endure') { (B.pend = B.pend || []).push(`${eun(n)} 관장님을 슬프게 하지 않으려고 버텼다!`); (B.frq = B.frq || []).push(s); return; }
    await flushPend(); await frFx(s);
    await msg(a[3] === 'dodge' ? `${eun(n)} 관장님의 기대에 응하려고 공격을 피했다!` : `${eun(n)} 관장님을 걱정시키지 않으려고 ${FR_ST[a[4]] || '상태 이상'}에서 스스로 벗어났다!`);
    if (a[3] === 'cure') { const X = B.act[s]; if (X) { X.st = ''; setSt(s, ''); } }
    return;
  }
  if (k !== '-damage') await flushPend();
  // 특성은 본가처럼 화면 위 따로 띄우고, 그 효과는 대화창에 (경완 2026-10-29 '위협은 별도 창, 공격이 떨어졌다는 배틀창')
  const fa = a.find(x => /^\[from\] ability: /.test(x)), of = a.find(x => /^\[of\] /.test(x));
  if (k === '-ability' && a[2]) { await abPop(a[2], toID(a[3])); return; }
  if (fa) await abPop(of ? of.slice(5) : a[2], toID(fa.replace('[from] ability: ', '')));
  else B.abLast = '';
  switch (k) {
    case 'switch': case 'drag': {
      const s = sideOf(a[2]), i = partyIdx(s, a), det = a[3].split(', '), [hp, mhp] = hpOf(a[4]);
      const src = s === 'p' ? B.my[i] : B.foe[i], pk = B.o[s][i];
      const old = A(s);
      if (old && !old.fnt) { await msg(s === 'p' ? `돌아와! ${old.nm}!` : `${eun(B.foeNm)} ${eul(old.nm)} 되돌렸다!`, 0); await recall(s); }
      const sp = PSim.Dex.species.get(det[0]).num || src.sp;
      const X = B.act[s] = { i, pk, nm: src.nm, sp, fm: toID(det[0]) === 'minior' && hp * 2 > mhp ? 'miniormeteor' : toID(det[0]),   // 메테오나 (리밋실드): 체력 절반 넘으면 껍질 모습으로 나온다
      lv: +(det.find(d => /^L\d+/.test(d)) || 'L100').slice(1), g: det.includes('F') ? 'F' : det.includes('M') ? 'M' : '', shiny: det.includes('shiny'), hp, mhp, st: stOf(a[4]), fnt: false };
      if (s === 'p') { X.xpg = xpGauge(src); X.pid = src.pid; B.used.add(src.pid); }
      if (s === 'e') { if (!B.eOut) { B.eOut = 1; $b('.bt-tr.e').classList.add('away'); $b('.bt-pty.e').classList.remove('on'); } await msg(`${eun(B.foeNm)} ${eul(X.nm)} 내보냈다!`, 0); }
      else { if (!B.pOut) { B.pOut = 1; $b('.bt-tr.p').classList.add('throw'); $b('.bt-pty.p').classList.remove('on'); } await msg(`가랏! ${X.nm}!`, 0); }
      await sendOut(s, X); await wait(200);
      break;
    }
    case 'move': {
      const s = sideOf(a[2]), X = A(s); const id = toID(a[3]); B.lastMove = { s, id };
      monEl(s).classList.remove('hid');   // 공중날기·구멍파기 2턴째: 다시 나타나며 공격
      await msg(`${who(a[2])}의 ${mvKo(id)}!`, 0);
      if (a.includes('[notarget]')) break;
      if (noFx()) break;   // 효과가 없는 기술·실패·방어에 막힘은 본가처럼 연출 없이 바로 그 말 (경완 2026-10-29)   // 상대가 먼저 쓰러져 맞을 대상이 없으면 연출 없이 '하지만 상대가 없었다' (본가처럼, 경완 2026-10-29)
      await moveFx(s, id, a.includes('[miss]') || a.some(x => x === '[still]'));
      break;
    }
    case '-notarget': await gap(); await msg('하지만 공격할 상대가 없었다!', 500); break;
    case '-damage': {
      const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); const from = (a[4] || '').replace('[from] ', '');
      if (ST_P[from]) await stFx(s, from, true);   // 화상·독 데미지는 본가처럼 연출 뒤 HP
      else if (from) await resFx(s, from, a);   // 씨뿌리기·스텔스록·압정·조이기·모래바람 등 (경완 2026-10-29 '지속 데미지·패시브 기술 모션')
      const hz = /^(move: )?(Stealth Rock|Spikes)$/.test(from);   // 스텔스록·압정은 HP 먼저, 말은 뒤 (본가)
      if (from && !hz) { const t = dmgFrom(from, a[2]); if (t) await msg(t, 300); }
      if (from === 'confusion') { await moveFx(other(s), 'pound'); await hitFx(s, 'M'); }   // 혼란 자해: 본가처럼 막치기 연출·소리 → 깜빡 → HP (경완 2026-10-28)
      if (!from) await hitFx(s, effAhead(a[2]));
      if (mhp) X.mhp = mhp; await drainHp(s, X, hp); X.st = stOf(a[3]) || X.st; if (hz) { const t = dmgFrom(from, a[2]); if (t) await msg(t, 300); } await flushPend(); break;
    }
    case '-heal': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp, mhp] = hpOf(a[3]); if (mhp) X.mhp = mhp; const from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7), sil = a.includes('[silent]');
      if (!sil && HEAL_FX[from.replace(/^(item|ability|move): /, '')]) await moveFx(s, HEAL_FX[from.replace(/^(item|ability|move): /, '')]);
      await drainHp(s, X, hp); if (!sil) await msg(healMsg(who(a[2]), from)); break; }
    case '-sethp': { const s = sideOf(a[2]), X = A(s); if (!X) break; const [hp] = hpOf(a[3]); await drainHp(s, X, hp); break; }
    case 'faint': { const s = sideOf(a[2]), X = A(s); if (!X) break; X.fnt = true; await faint(s, X); X.fntS = true; hbBalls(s); await msg(`${who(a[2]) === nmIn(a[2]) ? eun(X.nm) : '상대 ' + eun(X.nm)} 쓰러졌다!`); if (s === 'e') await expGain(X); break; }
    case '-immune': await gap(); await msg(`${who(a[2])}에게는 효과가 없는 것 같다…`); break;
    case '-miss': await gap(); await msg(a[3] ? `${who(a[3])}에게는 맞지 않았다!` : `${who(a[2])}의 공격은 빗나갔다!`); break;
    case '-fail': await wait(750); await msg('그러나 실패했다!'); break;   // 기술 이름을 읽을 틈 (경완 2026-10-29 '내던지기 > 그러나 실패했다! 너무 빨라')
    case '-nothing': await wait(750); await msg('그러나 아무 일도 일어나지 않았다!'); break;
    case '-status': { const s = sideOf(a[2]), X = A(s); if (X) { X.st = a[3]; setSt(s, a[3]); } await stFx(s, a[3]); await msg(statusMsg(who(a[2]), a[3])); break; }
    case '-curestatus': { const s = sideOf(a[2]), X = A(s); if (X) { X.st = ''; setSt(s, ''); } await msg(cureMsg(who(a[2]), a[3])); break; }
    case 'cant': if (ST_P[a[3]]) await stFx(sideOf(a[2]), a[3]); await msg(cantMsg(who(a[2]), a[3])); break;
    case '-boost': case '-unboost': { const n = +a[4] || 0, up = k === '-boost', s = sideOf(a[2]); await statFx(s, up); await msg(`${who(a[2])}의 ${iga(STAT_KO[a[3]] || a[3])} ${n >= 3 ? '매우 크게 ' : n === 2 ? '크게 ' : n === 0 ? '더 이상 ' : ''}${n === 0 ? (up ? '올라가지 않는다!' : '떨어지지 않는다!') : up ? '올라갔다!' : '떨어졌다!'}`); break; }
    case '-weather': { const w = a[2]; wxSet(w); if (a.includes('[upkeep]')) { const u = { Sandstorm: ['sandstorm', '모래바람이 세차게 분다'], Hail: ['hail', '싸라기눈이 계속 내리고 있다'], Snow: ['hail', '눈이 계속 내리고 있다'], RainDance: ['raindance', '비가 계속 내리고 있다'], SunnyDay: ['sunnyday', '햇살이 강하다'] }[w];   // 턴 끝마다 본가처럼 날씨 연출 (경완 2026-10-29)
        if (u) { await moveFx('p', u[0]); await msg(u[1], 300); } break; } const T = { RainDance: '비가 내리기 시작했다!', SunnyDay: '햇살이 강해졌다!', Sandstorm: '모래바람이 불기 시작했다!', Hail: '싸라기눈이 내리기 시작했다!', Snow: '눈이 내리기 시작했다!', none: '날씨가 원래대로 돌아왔다!' }; if (T[w]) await msg(T[w]); break; }
    case '-start': { if (/confusion/.test(a[3])) await confFx(sideOf(a[2])); if (/Substitute/.test(a[3])) subFx(sideOf(a[2]), true); const t = startMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-end': { if (/Substitute/.test(a[3])) subFx(sideOf(a[2]), false); const t = endMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-activate': { if (/confusion/.test(a[3])) await confFx(sideOf(a[2])); else await gap(); const t = actMsg(who(a[2]), a[3]); if (t) await msg(t); break; }
    case '-ability': await msg(`${who(a[2])}의 ${abKo(toID(a[3]))}!`, 500); break;
    case '-hitcount': await msg(`${a[3]}번 맞았다!`); break;
    case '-ohko': await msg('일격필살!'); break;
    case '-prepare': { const id = toID(a[3]), n = who(a[2]), e = jong(nmIn(a[2])) ? '은' : '는';
      if (HIDE_MV.test(id)) { await moveFx(sideOf(a[2]), id); monEl(sideOf(a[2])).classList.add('hid'); }
      const T = { fly: '하늘 높이 날아올랐다!', dig: '땅으로 파고들었다!', dive: '물속으로 숨었다!', bounce: '높이 뛰어올랐다!', phantomforce: '모습을 감췄다!', shadowforce: '모습을 감췄다!', solarbeam: '빛을 흡수했다!', solarblade: '빛을 흡수했다!', skullbash: '목을 움츠렸다!', skyattack: '격렬한 빛에 휩싸였다!', razorwind: '바람을 일으켰다!' };
      await msg(`${n}${e} ${T[id] || '힘을 모으고 있다!'}`); break; }
    case '-transform': { const s = sideOf(a[2]), X = A(s), T = A(other(s)); if (!X || !T) break;   // 변신: 상대 모습 그대로 (메타몽 등)
      await moveFx(s, 'transform'); X.sp = T.sp; X.fm = T.fm; X.g = T.g; X.gif = await pickGif(s, X); if (!B) break; showMon(s, X, true); playAnim(s, X);
      await msg(`${eun(who(a[2]))} ${T.nm}${jong(T.nm) ? '으로' : '로'} 변신했다!`); break; }
    case '-enditem': { const n = who(a[2]), it = itKo(a[3]), eat = a.includes('[eat]'), from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7);
      if (/stealeat|move: (Knock Off|Thief|Covet|Bug Bite|Pluck|Incinerate)/i.test(from)) { await msg(`${n}의 ${eun(it)} 사라졌다!`); break; }
      if (eat) { await moveFx(sideOf(a[2]), 'stockpile'); await msg(`${eun(n)} ${eul(it)} 먹었다!`); break; }
      if (/Focus Sash|Focus Band/.test(a[3])) { await msg(`${eun(n)} ${it}${jong(it) ? '으로' : '로'} 버텼다!`); break; }
      if (/Air Balloon/.test(a[3])) { await msg(`${n}의 풍선이 터졌다!`); break; }
      if (/White Herb|Mental Herb|Power Herb/.test(a[3])) { await msg(`${eun(n)} ${eul(it)} 사용했다!`); break; }
      break; }
    case '-item': { const n = who(a[2]), it = itKo(a[3]), from = (a.find(x => /^\[from\] /.test(x)) || '').slice(7);
      if (/Air Balloon/.test(a[3])) await msg(`${eun(n)} 풍선으로 떠 있다!`);
      else if (/Frisk/.test(from)) await msg(`${eun(n)} ${eul(it)} 가지고 있다!`);
      else await msg(`${eun(n)} ${eul(it)} 얻었다!`); break; }
    case '-clearallboost': await msg('모든 능력 변화가 원래대로 돌아왔다!'); break;
    case '-clearboost': await msg(`${who(a[2])}의 능력 변화가 원래대로 돌아왔다!`); break;
    case '-clearnegativeboost': await msg(`${who(a[2])}의 떨어진 능력이 원래대로 돌아왔다!`); break;
    case '-setboost': if (/atk/.test(a[3])) { await statFx(sideOf(a[2]), true); await msg(`${eun(who(a[2]))} 체력을 깎아서 공격을 최대로 올렸다!`); } break;
    case '-copyboost': await msg(`${eun(who(a[2]))} ${who(a[3] || a[2])}의 능력 변화를 복사했다!`); break;
    case '-swapboost': case '-invertboost': await msg(`${who(a[2])}의 능력 변화가 바뀌었다!`); break;
    case '-singleturn': { const w = (a[3] || '').replace('move: ', ''), n = who(a[2]), T = { Protect: `${eun(n)} 방어 태세에 들어갔다!`, Detect: `${eun(n)} 방어 태세에 들어갔다!`, Endure: `${eun(n)} 버티기 태세에 들어갔다!`, 'Focus Punch': `${eun(n)} 기합을 모으고 있다!`, 'Magic Coat': `${eun(n)} 매직코트로 몸을 감쌌다!`, Snatch: `${eun(n)} 상대가 기술을 쓰기를 기다리고 있다!`, 'Helping Hand': `${eun(n)} 돕기 태세에 들어갔다!`, Roost: '' }; const t = T[w] ?? ''; if (t) await msg(t); break; }
    case '-singlemove': { const w = (a[3] || '').replace('move: ', ''), n = who(a[2]), T = { 'Destiny Bond': `${eun(n)} 상대를 길동무로 삼으려 하고 있다!`, Grudge: `${eun(n)} 상대에게 원한을 품으려 하고 있다!`, Rage: '' }; const t = T[w] ?? ''; if (t) await msg(t); break; }
    case '-mustrecharge': break;
    case '-sidestart': { const t = sideMsg(a[2], a[3], true); if (t) await msg(t); break; }
    case '-sideend': { const t = sideMsg(a[2], a[3], false); if (t) await msg(t); break; }
    case '-fieldstart': case '-fieldend': { const on = k === '-fieldstart', w = (a[2] || '').replace('move: ', ''), t = FIELD_T[w]; const tr = TERR[w];   // 필드 (경완 2026-10-29 '일렉트릭필드 발동이 안 됨')
      if (tr) { const f = $b('.bt-terr'); f.className = 'bt-terr' + (on ? ' on ' + tr : ''); }
      if (t) await msg(t[on ? 0 : 1]); break; }
    case '-formechange': case 'detailschange': { const s = sideOf(a[2]), X = A(s), m = monEl(s); if (!X) break;   // 폼 체인지 (리밋실드·꼬르륵스위치·배틀스위치·탈 등): 하얗게 번쩍이며 그 폼 그림으로 (경완 2026-10-29)
      const fm = toID((a[3] || '').split(', ')[0]); if (fm === X.fm) break; X.fm = fm; X.gif = await pickGif(s, X); if (!B) break;
      se('KOUKA_M', { pan: panOf(s) }); m.classList.remove('fmc'); void m.offsetWidth; m.classList.add('fmc'); await wait(260);
      m._tok = (m._tok || 0) + 1; showMon(s, X, true); playAnim(s, X); await wait(420); m.classList.remove('fmc');
      await msg(/busted/.test(fm) ? `${who(a[2])}의 탈이 벗겨졌다!` : `${who(a[2])}의 모습이 바뀌었다!`); break; }
    case 'turn': break;
    case 'win': break;
  }
}
const TERR = { 'Electric Terrain': 'el', 'Grassy Terrain': 'gr', 'Misty Terrain': 'mi', 'Psychic Terrain': 'ps' };
const FIELD_T = { 'Electric Terrain': ['발밑에 전기가 흐르기 시작했다!', '발밑의 전기가 사라졌다!'], 'Grassy Terrain': ['발밑에 풀이 무성해졌다!', '발밑의 풀이 사라졌다!'], 'Misty Terrain': ['발밑에 안개가 자욱해졌다!', '발밑의 안개가 사라졌다!'], 'Psychic Terrain': ['발밑이 이상한 느낌이 되었다!', '발밑의 이상한 느낌이 사라졌다!'],
  'Trick Room': ['시공이 뒤틀렸다!', '뒤틀린 시공이 원래대로 돌아왔다!'], Gravity: ['중력이 강해졌다!', '중력이 원래대로 돌아왔다!'], 'Magic Room': ['도구의 효과가 사라지는 공간이 되었다!', '도구의 효과가 원래대로 돌아왔다!'], 'Wonder Room': ['방어와 특수방어가 뒤바뀌는 공간이 되었다!', '방어와 특수방어가 원래대로 돌아왔다!'], 'Mud Sport': ['전기의 위력이 약해졌다!', '흙놀이의 효과가 사라졌다!'], 'Water Sport': ['불꽃의 위력이 약해졌다!', '물놀이의 효과가 사라졌다!'] };
// 지속 데미지 연출: 씨뿌리기 = 심은 쪽이 흡수, 스텔스록·압정 = 박힘, 조이기류 = 그 기술, 저주·악몽 = 그 기술
const TRAP = { 'Bind': 'bind', 'Wrap': 'wrap', 'Fire Spin': 'firespin', 'Whirlpool': 'whirlpool', 'Sand Tomb': 'sandtomb', 'Magma Storm': 'magmastorm', 'Clamp': 'clamp', 'Infestation': 'infestation', 'Snap Trap': 'bind', 'Thunder Cage': 'bind' };
async function resFx(s, from, a) {
  const f = from.replace(/^(move|item|ability): /, ''), of = (a.find(x => /^\[of\] /.test(x)) || '').slice(5);
  if (f === 'Leech Seed') return moveFx(of ? sideOf(of) : other(s), 'absorb');
  if (f === 'Stealth Rock' || f === 'Spikes') return;   // v13.17 경완 '본가 효과로': 플래티넘은 연출·깜빡임 없이 HP 가 줄고 나서 '뾰족한 바위가 박혔다' (subscript_hazards_check)
  if (TRAP[f]) return moveFx(other(s), mvOf(TRAP[f]) && MFX[TRAP[f]] ? TRAP[f] : 'bind');
  if (f === 'Curse' || f === 'Nightmare') return moveFx(other(s), f === 'Curse' ? 'curse' : 'nightmare');
  if (f === 'Sandstorm' || f === 'Hail' || f === 'confusion' || f === 'Recoil') return;
  if (/^(Life Orb|Rocky Helmet|Rough Skin|Iron Barbs|Black Sludge|Sticky Barb|Solar Power|Dry Skin|Bad Dreams|Salt Cure|Aftermath|Liquid Ooze)$/.test(f)) return hitFx(s);
}
const HEAL_FX = { 'Leftovers': 'aquaring', 'Black Sludge': 'aquaring', 'Shell Bell': 'aquaring', 'Aqua Ring': 'aquaring', 'Ingrain': 'ingrain', 'Wish': 'wish', 'Grassy Terrain': 'aquaring', 'Rain Dish': 'aquaring', 'Ice Body': 'aquaring', 'Poison Heal': 'aquaring', 'Dry Skin': 'aquaring' };
const IT_KO = { 'Sitrus Berry': '자뭉열매', 'Oran Berry': '오렌열매', 'Lum Berry': '리샘열매', 'Focus Sash': '기합의띠', 'Focus Band': '기합의머리띠', 'Air Balloon': '풍선', 'White Herb': '하양허브', 'Mental Herb': '멘탈허브', 'Power Herb': '파워풀허브', 'Leftovers': '먹다남은음식', 'Life Orb': '생명의구슬', 'Choice Scarf': '구애스카프', 'Choice Band': '구애머리띠', 'Choice Specs': '구애안경', 'Chesto Berry': '유루열매', 'Cheri Berry': '버치열매', 'Pecha Berry': '복슝열매', 'Rawst Berry': '복분열매', 'Aspear Berry': '배리열매', 'Persim Berry': '시마열매', 'Leppa Berry': '과사열매', 'Liechi Berry': '치리열매', 'Salac Berry': '캄라열매', 'Petaya Berry': '야타비열매', 'Ganlon Berry': '용아열매', 'Apicot Berry': '규살열매' };
const itKo = nm => { const id = toID(nm || ''); return (HOLD[id] && HOLD[id][0]) || IT_KO[nm] || nm || '도구'; };
function healMsg(n, from) { if (from === 'drain') return `${eun(n)} 상대의 체력을 흡수했다!`; const f = from.replace(/^(move|item|ability): /, ''), T = { 'Leftovers': '먹다남은음식으로 조금 회복했다!', 'Black Sludge': '검은진흙으로 조금 회복했다!', 'Aqua Ring': '아쿠아링으로 체력을 회복했다!', 'Ingrain': '뿌리로부터 양분을 흡수했다!', 'Wish': '희망사항이 이루어졌다!', 'Shell Bell': '조개껍질방울로 조금 회복했다!', 'Grassy Terrain': '그래스필드로 체력이 회복되었다!' }; return T[f] ? `${eun(n)} ${T[f]}` : `${n}의 체력이 회복되었다!`; }
const dmgFrom = (f, id) => { const n = who(id); f = f.replace(/^item: |^ability: /, ''); const T = { brn: `${n}${jong(nmIn(id)) ? '은' : '는'} 화상 데미지를 입었다!`, psn: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, tox: `${n}${jong(nmIn(id)) ? '은' : '는'} 독에 의한 데미지를 입었다!`, Recoil: `${n}${jong(nmIn(id)) ? '은' : '는'} 공격의 반동을 받았다!`, confusion: '영문도 모른 채 자신을 공격했다!', Sandstorm: `모래바람이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, Hail: `싸라기눈이 ${n}${jong(nmIn(id)) ? '을' : '를'} 덮쳤다!`, 'Leech Seed': `씨뿌리기가 ${n}의 체력을 빼앗는다!`, 'Stealth Rock': `뾰족한 바위가 ${n}에게 박혔다!`, Spikes: `${n}${jong(nmIn(id)) ? '은' : '는'} 압정의 데미지를 입었다!`, Curse: `${n}${jong(nmIn(id)) ? '은' : '는'} 저주를 받고 있다!`, Nightmare: `${n}${jong(nmIn(id)) ? '은' : '는'} 악몽에 시달리고 있다!`, 'Life Orb': `${n}${jong(nmIn(id)) ? '은' : '는'} 생명이 조금 깎였다!`, 'Rocky Helmet': `${n}${jong(nmIn(id)) ? '은' : '는'} 울퉁불퉁멧으로 데미지를 입었다!` };
  const tr = f.replace(/^move: /, ''); if (TRAP[tr]) return `${n}${jong(nmIn(id)) ? '은' : '는'} ${mvKo(TRAP[tr])}의 데미지를 입었다!`; return T[f] || ''; };
function statusMsg(n, st) { const T = { brn: '화상을 입었다!', par: '마비되어 기술이 나오기 어려워졌다!', slp: '잠들어 버렸다!', frz: '얼어붙었다!', psn: '독에 걸렸다!', tox: '맹독을 입었다!' }; return `${eun(n)} ${T[st] || '상태 이상이 되었다!'}`; }
function cureMsg(n, st) { const T = { slp: '눈을 떴다!', frz: '얼음 상태가 나았다!', par: '마비가 풀렸다!', brn: '화상이 나았다!', psn: '독이 사라졌다!', tox: '독이 사라졌다!' }; return `${eun(n)} ${T[st] || '상태가 나았다!'}`; }
function cantMsg(n, r) { const T = { par: '몸이 저려서 움직일 수 없다!', slp: '쿨쿨 잠들어 있다.', frz: '얼어버려서 움직일 수 없다!', flinch: '풀이 죽어 기술을 쓸 수 없었다!', recharge: '공격의 반동으로 움직일 수 없다!', nopp: '기술의 남은 PP 가 없다!' }; return `${eun(n)} ${T[r] || '움직일 수 없다!'}`; }
function startMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠졌다!`, Substitute: `${n}의 대타가 나타났다!`, 'Leech Seed': `${n}에게 씨앗을 심었다!`, Taunt: `${eun(n)} 도발에 넘어가 버렸다!`, Encore: `${eun(n)} 앙코르를 받았다!`, Attract: `${eun(n)} 헤롱헤롱해졌다!`, typechange: '', 'Focus Energy': `${eun(n)} 의욕이 넘치고 있다!`, Disable: `${n}의 기술을 쓸 수 없게 되었다!`, Yawn: `${eun(n)} 졸음이 오기 시작했다!`, perish3: `${n}의 멸망의 카운트가 3이 되었다!`, perish2: `${n}의 멸망의 카운트가 2가 되었다!`, perish1: `${n}의 멸망의 카운트가 1이 되었다!`, perish0: `${n}의 멸망의 카운트가 0이 되었다!`, Torment: `${eun(n)} 트집을 잡혔다!`, 'Magnet Rise': `${eun(n)} 전자력으로 떠올랐다!`, 'Aqua Ring': `${eun(n)} 물의 베일로 몸을 감쌌다!`, Ingrain: `${eun(n)} 뿌리를 뻗었다!`, Curse: `${eun(n)} 저주를 받았다!`, Nightmare: `${eun(n)} 악몽을 꾸기 시작했다!`, 'Heal Block': `${eun(n)} 회복할 수 없게 되었다!`, Embargo: `${eun(n)} 도구를 쓸 수 없게 되었다!`, Stockpile: '', Charge: `${eun(n)} 전기를 모으고 있다!`, Imprison: `${eun(n)} 봉인을 걸었다!`, Telekinesis: `${eun(n)} 공중에 떠올랐다!`, 'Smack Down': `${eun(n)} 떨어졌다!`, 'Salt Cure': `${eun(n)} 소금에 절여졌다!` }; return T[w] ?? ''; }
function endMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${n}의 혼란이 풀렸다!`, Substitute: `${n}의 대타는 사라져 버렸다…`, Taunt: `${n}의 도발 효과가 풀렸다!`, Encore: `${n}의 앙코르 상태가 풀렸다!`, Disable: `${n}의 사슬묶기가 풀렸다!`, Yawn: '', 'Magnet Rise': `${n}의 전자력이 사라졌다!`, 'Heal Block': `${n}의 회복봉인이 풀렸다!`, Torment: '', 'Leech Seed': `${n}의 씨앗이 떨어졌다!`, 'Salt Cure': '' }; return T[w] ?? ''; }
function actMsg(n, w) { w = (w || '').replace('move: ', ''); const T = { confusion: `${eun(n)} 혼란에 빠져 있다!`, Protect: `${eun(n)} 공격으로부터 몸을 지켰다!`, Substitute: '대타가 대신 공격을 받았다!', 'Destiny Bond': `${eun(n)} 상대를 길동무로 삼았다!`, Endure: `${eun(n)} 공격을 버텼다!` }; return T[w] ?? ''; }
function sideMsg(sd, w, on) { const mine = sd.startsWith('p1'), who2 = mine ? '우리 편' : '상대 편'; w = (w || '').replace('move: ', ''); const T = { Reflect: on ? `리플렉터로 ${who2}의 물리 공격에 강해졌다!` : `${who2}의 리플렉터가 사라졌다!`, 'Light Screen': on ? `빛의장막으로 ${who2}의 특수 공격에 강해졌다!` : `${who2}의 빛의장막이 사라졌다!`, Spikes: on ? `${who2} 발밑에 압정이 뿌려졌다!` : '', 'Stealth Rock': on ? `${who2} 주변에 뾰족한 바위가 떠다니기 시작했다!` : '', Tailwind: on ? `${who2}에 순풍이 불기 시작했다!` : `${who2}의 순풍이 멈췄다!`, Safeguard: on ? `${who2}는 신비의 베일에 감싸였다!` : `${who2}의 신비의 베일이 사라졌다!`, 'Toxic Spikes': on ? `${who2} 발밑에 독압정이 뿌려졌다!` : `${who2} 발밑의 독압정이 사라졌다!`, 'Sticky Web': on ? `${who2} 발밑에 끈적끈적네트가 펼쳐졌다!` : '', Mist: on ? `${who2}는 흰안개에 둘러싸였다!` : `${who2}의 흰안개가 사라졌다!`, 'Lucky Chant': on ? `행운의 주문으로 ${who2}에 급소가 맞지 않게 되었다!` : '', 'Aurora Veil': on ? `오로라베일로 ${who2}의 물리·특수 공격에 강해졌다!` : `${who2}의 오로라베일이 사라졌다!` }; return T[w] || ''; }

// ---------- 연출 (4세대 느낌. 기술별 본가 연출은 다음 단계에서 기술마다 붙인다) ----------
const TY_FX = { 10: '#ff7a30', 11: '#48a0ff', 13: '#ffe040', 15: '#a8f0ff', 4: '#c060e0', 8: '#7058a8', 18: '#ff9ed8', 6: '#b8a058', 5: '#d8b060', 2: '#e05030', 14: '#ff70b0', 12: '#68d048', 3: '#a8c8ff', 7: '#a8c020', 9: '#c8c8d8', 16: '#7050f0', 17: '#504048', 1: '#f8f8f8' };
// 기술 연출: 플래티넘 원본 대본(gym/mvfx.json, tools/gym/mkanim.py)대로 소리·흔들기·움직임·배경·색 번쩍을 같은 박자(1/30초)에.
// 파티클은 원본 방출기 그대로 gymb/spl.js 가 그린다 ('p' 사건). 대본이 없는 기술만 타입 색 불꽃('e').
const FR = 1000 / 30;
const CTR = { e: [176, 56], p: [80, 104] };
const other = s => s === 'p' ? 'e' : 'p';
function tintOf(side) {   // 포켓몬 색 덮기용 SVG 필터 (한 번 만든다)
  let f = el.querySelector(`#btTint${side}`);
  if (!f) {
    let svg = el.querySelector('svg.bt-defs');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'bt-defs'); svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute'; el.appendChild(svg); }
    svg.insertAdjacentHTML('beforeend', `<filter id="btTint${side}" color-interpolation-filters="sRGB"><feFlood flood-color="#fff" flood-opacity="0"/><feComposite in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter>`);
    f = el.querySelector(`#btTint${side}`);
  }
  return f.querySelector('feFlood');
}
function emit(where, s, col, ms) {
  const fx = $b('.bt-fx'), [ax, ay] = CTR[s], [dx, dy] = CTR[other(s)];
  const one = (x, y, tx, ty, d) => { const i = document.createElement('i'); i.className = 'em'; i.style.left = x + 'px'; i.style.top = y + 'px'; i.style.setProperty('--c', col); i.style.setProperty('--dx', tx + 'px'); i.style.setProperty('--dy', ty + 'px'); i.style.animationDuration = d + 'ms'; fx.appendChild(i); setTimeout(() => i.remove(), d + 50); };
  if (where === 'ad' || where === 'da') {
    const [x0, y0, x1, y1] = where === 'ad' ? [ax, ay, dx, dy] : [dx, dy, ax, ay];
    for (let k = 0; k < 6; k++) setTimeout(() => B && one(x0 + rnd(-4, 4), y0 + rnd(-4, 4), x1 - x0 + rnd(-6, 6), y1 - y0 + rnd(-6, 6), ms * .7), k * ms / 14);
    return;
  }
  const [x, y] = where === 'a' ? [ax, ay] : where === 'c' ? [128, 80] : [dx, dy];
  for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2 + rnd(0, .5), r = rnd(14, 28); setTimeout(() => B && one(x + rnd(-6, 6), y + rnd(-6, 6), Math.cos(t) * r, Math.sin(t) * r * .8, ms * .8), k * ms / 30); }
}
const MV_REP = { 1: ['tackle', 'hypervoice', 'growl'], 2: ['brickbreak', 'aurasphere', 'bulkup'], 3: ['wingattack', 'airslash', 'roost'], 4: ['poisonjab', 'sludgebomb', 'toxic'], 5: ['earthquake', 'earthpower', 'mudsport'],
  6: ['rockslide', 'ancientpower', 'stealthrock'], 7: ['xscissor', 'bugbuzz', 'tailglow'], 8: ['shadowclaw', 'shadowball', 'confuseray'], 9: ['ironhead', 'flashcannon', 'irondefense'], 10: ['firepunch', 'flamethrower', 'willowisp'],
  11: ['waterfall', 'surf', 'raindance'], 12: ['leafblade', 'energyball', 'synthesis'], 13: ['thunderpunch', 'thunderbolt', 'thunderwave'], 14: ['zenheadbutt', 'psychic', 'calmmind'], 15: ['icepunch', 'icebeam', 'hail'],
  16: ['dragonclaw', 'dragonpulse', 'dragondance'], 17: ['crunch', 'darkpulse', 'nastyplot'], 18: ['tackle', 'charm', 'charm'] };
// 원본 대본에서 포켓몬 그림 조작(어둡게·늘이기 등)이 빠져 소리만 나던 기술 31개에 비슷한 움직임을 더한다 (경완 2026-10-28 '나이트헤드 연출이 없음')
// [종류, 시각(1/30초), …] — f 색 덮기 [대상, 색, 세기(16), 길이] / k 흔들기 [대상, x, y, 간격, 횟수] / m 움직임 [대상, x, y, 프레임] / z 늘이기 [대상, 가로, 세로, 길이] / e 불꽃 [대상, 길이]
const MFX_ADD = {
  nightshade: [['f', 6, 'a', '#201830', 16, 30], ['e', 24, 'ad', 16], ['f', 40, 'd', '#000', 14, 16], ['k', 40, 'd', 3, 0, 1, 5]],
  constrict: [['f', 2, 'd', '#c8a060', 10, 16], ['z', 2, 'd', .85, 1, 16], ['k', 6, 'd', 2, 0, 1, 5]],
  magnitude: [['k', 0, 'bg', 4, 2, 1, 10], ['k', 0, 'd', 4, 0, 1, 10]],
  glare: [['f', 4, 'a', '#ffd040', 14, 12], ['e', 10, 'ad', 10], ['k', 22, 'd', 1, 0, 1, 4]],
  meanlook: [['f', 4, 'a', '#000', 12, 16], ['k', 22, 'd', 1, 0, 1, 4]],
  scaryface: [['z', 0, 'a', 1.15, 1.15, 16], ['f', 4, 'a', '#000', 10, 14], ['k', 20, 'd', 2, 0, 1, 5]],
  bulkup: [['z', 0, 'a', 1.1, 1.05, 12], ['z', 14, 'a', 1.1, 1.05, 12], ['f', 0, 'a', '#e05030', 10, 26]],
  growth: [['z', 0, 'a', 1.15, 1.15, 20], ['f', 0, 'a', '#60c050', 10, 22]],
  meditate: [['f', 0, 'a', '#e080f0', 12, 26], ['m', 0, 'a', 0, -4, 6], ['m', 14, 'a', 0, 4, 6]],
  irondefense: [['f', 0, 'a', '#d8d8e8', 14, 24]],
  minimize: [['z', 0, 'a', .5, .5, 24]],
  camouflage: [['f', 0, 'a', '#80b880', 12, 24]],
  flash: [['f', 0, 'd', '#fff', 16, 14], ['f', 0, 'a', '#fff', 12, 10]],
  foresight: [['f', 6, 'd', '#ff5050', 10, 12], ['f', 20, 'd', '#ff5050', 10, 12]],
  lockon: [['f', 6, 'd', '#ff3030', 12, 10], ['k', 6, 'd', 1, 0, 1, 3]],
  kinesis: [['f', 0, 'a', '#e080f0', 10, 16], ['k', 8, 'd', 2, 0, 1, 6]],
  tailwhip: [['m', 0, 'a', 5, 0, 2], ['m', 3, 'a', -10, 0, 3], ['m', 7, 'a', 10, 0, 3], ['m', 11, 'a', -5, 0, 2]],
  metronome: [['m', 0, 'a', 4, 0, 3], ['m', 4, 'a', -8, 0, 4], ['m', 9, 'a', 8, 0, 4], ['m', 14, 'a', -4, 0, 3]],
  assist: [['m', 0, 'a', 0, -6, 3], ['m', 5, 'a', 0, 6, 3], ['f', 0, 'a', '#ffffff', 8, 12]],
  followme: [['m', 0, 'a', 0, -6, 3], ['m', 5, 'a', 0, 6, 3], ['m', 10, 'a', 0, -6, 3], ['m', 15, 'a', 0, 6, 3]],
  memento: [['f', 0, 'a', '#000', 16, 26], ['f', 24, 'd', '#000', 10, 14]],
  grudge: [['f', 0, 'd', '#6040a0', 12, 20]],
  spite: [['f', 0, 'd', '#6040a0', 12, 16], ['k', 8, 'd', 2, 0, 1, 4]],
  torment: [['f', 0, 'd', '#e04838', 10, 16], ['k', 4, 'd', 2, 0, 1, 6]],
  swagger: [['z', 0, 'a', 1.1, 1.1, 14], ['k', 14, 'd', 2, 0, 1, 4]],
  roleplay: [['m', 0, 'a', 12, -4, 4], ['m', 10, 'a', -12, 4, 4]],
  trick: [['m', 0, 'a', 10, 0, 4], ['m', 0, 'd', 10, 0, 4], ['m', 8, 'a', -10, 0, 4], ['m', 8, 'd', -10, 0, 4]],
  switcheroo: [['m', 0, 'a', 10, 0, 4], ['m', 0, 'd', 10, 0, 4], ['m', 8, 'a', -10, 0, 4], ['m', 8, 'd', -10, 0, 4]],
  doomdesire: [['k', 30, 'd', 3, 0, 1, 6]],
  trickroom: [['k', 0, 'bg', 2, 2, 1, 8]],
};
function mfxAdd() { for (const [k, L] of Object.entries(MFX_ADD)) { const v = MFX[k]; if (!v) continue;
  (Array.isArray(v[0]) ? v : [v]).forEach(A => { if (A.added) return; A.added = 1; A[1].push(...L); A[0] = Math.max(A[0], ...L.map(e => e[1] + (e[0] === 'k' ? (e[5] + 1) * e[6] * 2 : e[0] === 'e' ? e[3] : e[0] === 'z' ? e[5] : e[0] === 'f' ? e[5] : e[5] || 4))); }); } }
// 본가 연출이 어색한 기술은 다른 기술 연출로 (경완 2026-10-30 '세차게 휘두르기 모션 물기라서 어색해' → 몸을 휘둘러 치는 힘껏치기)
const MV_SUB = { thrash: 'slam' };
const MV_LIKE = { poweruppunch: 'megapunch', jetpunch: 'machpunch', ragefist: 'shadowpunch', plasmafists: 'thunderpunch' };
// v13.17 경완 '울음소리 기술은 포켓몬 울음소리': 본가 플래티넘 연출(PlayPokemonCry)처럼 쓰는 포켓몬의 울음소리
const CRY_MV = new Set(['growl', 'roar', 'howl', 'hypervoice', 'chatter', 'nobleroar', 'snarl', 'partingshot']);
async function moveFx(s, id, miss) {
  const m = mvOf(id); if (!m || miss) return; const ty = m[2], cat = m[3], col = TY_FX[ty] || '#fff';
  if (CRY_MV.has(id)) { const X = B.act[s]; try { if (X) GA.cry?.(X.sp, 0, 1, CRY_K); } catch (e) {} }
  let A = MFX[MV_SUB[id] || id]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1];
  // 5세대 이후 주먹 기술은 비슷한 4세대 주먹 연출로 (경완 2026-10-29 '그로우펀치가 당수 모션')
  if (!A && MV_LIKE[id]) { A = MFX[MV_LIKE[id]]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1]; }
  // 5세대 이후 기술: 같은 타입·분류의 4세대 기술 연출을 빌린다
  if (!A) { const r = MV_REP[ty]?.[cat]; A = r && MFX[r]; if (A && Array.isArray(A[0])) A = A[s === 'p' ? 0 : 1]; }
  if (!A) {   // 그래도 없으면 분류에 따라 간단히
    A = cat === 0 ? [14, [['s', 0, '050', 'd'], ['m', 0, 'a', 14, -8, 2], ['e', 2, 'd', 12], ['k', 2, 'd', 2, 0, 1, 2], ['m', 4, 'a', -14, 8, 2]]]
      : cat === 1 ? [26, [['s', 0, 'W207', 'm'], ['e', 0, 'ad', 18], ['e', 14, 'd', 12], ['k', 16, 'd', 2, 0, 1, 2]]]
      : [20, [['s', 0, 'W287', 'a'], ['f', 0, 'a', col, 10, 20]]];
  }
  // 원본 대본에 몸 움직임이 없는 공격 기술(쪼기·흡수 등): 파티클만으론 잘 안 보여서 쳐들어가기·맞고 흔들림을 덧붙인다 (경완 2026-10-29 '쪼기 모션 및 효과 없음')
  if (cat < 2 && !A[1].some(e => e[0] === 'm' || e[0] === 'k')) {
    const hit = A[1].find(e => e[0] === 's' && e[3] === 'd')?.[1] ?? Math.round(A[0] / 2), n = Math.max(3, Math.round(A[0] / 3));
    A = [A[0], [...A[1], ...(/^(earthquake|magnitude)$/.test(id) ? [['k', 0, 'bg', 3, 0, 1, n], ['k', 0, 'd', 3, 0, 1, n]]
      : cat === 0 ? [['m', Math.max(0, hit - 3), 'a', 14, -8, 2], ['m', hit + 1, 'a', -14, 8, 2], ['k', hit, 'd', 2, 0, 1, 3]] : [['k', hit, 'd', 2, 0, 1, 3]])]];
  }
  const sp = B.fast ? .6 : 1, F = FR * sp, side = w => w === 'a' ? s : other(s), mw = w => $b(`.bt-mw.${side(w)}`);
  const pan = w => w === 'a' ? panOf(s) : w === 'd' ? panOf(other(s)) : 0;
  // 원본 파티클: 그림을 다 받은 뒤 다른 연출과 같은 박자로 시작
  let spl = null;
  if (A[1].some(e => e[0] === 'p')) {
    await Promise.race([loadSpl(), wait(1500)]);
    if (window.GymSPL && B) { spl = window.GymSPL.start($b('.bt-ptc'), A[1], s, F, VER); await Promise.race([spl.ready, wait(2000)]); }
    if (!B) { spl?.stop(); return; }
    spl?.go();
  }
  const pos = { p: [0, 0], e: [0, 0] }, setPos = sd => { $b(`.bt-mw.${sd}`).style.translate = `${pos[sd][0]}px ${pos[sd][1]}px`; };
  const job = [];
  for (const e of A[1]) {
    const t = e[1] * F, k = e[0];
    job.push(new Promise(res => setTimeout(() => { if (!B) return res();
      if (k === 's') se(e[2], { pan: e[3] === 'm' ? 0 : pan(e[3]) });
      else if (k === 'k') {
        const tg = e[2] === 'bg' ? [$b('.bt-bg')] : e[2] === 'ad' ? [mw('a'), mw('d')] : [mw(e[2])], n = Math.max(1, e[6]) * 2, iv = (e[5] + 1) * F;
        tg.forEach(x => x.animate(Array.from({ length: n + 1 }, (_, i) => ({ transform: i === n ? 'none' : `translate(${(i % 2 ? -1 : 1) * e[3]}px,${(i % 2 ? -1 : 1) * e[4]}px)` })), { duration: n * iv, easing: `steps(${n})` }));
      } else if (k === 'm') {
        const sd = side(e[2]), fl = sd === 'e' ? -1 : 1, fr = Math.max(1, e[5]); const p0 = [...pos[sd]];
        pos[sd] = [p0[0] + e[3] * fl, p0[1] + e[4] * fl];
        $b(`.bt-mw.${sd}`).animate([{ translate: `${p0[0]}px ${p0[1]}px` }, { translate: `${pos[sd][0]}px ${pos[sd][1]}px` }], { duration: fr * F, easing: `steps(${fr})`, fill: 'forwards' }); setPos(sd);
      } else if (k === 'b') {
        const d = $b('.bt-dim'); d.style.background = e[4]; d.style.setProperty('--fd', e[5] * F + 'ms'); d.style.opacity = e[3] / 16 * .75;
      } else if (k === 'f') {
        const fl = tintOf(side(e[2])), c = monEl(side(e[2])).querySelector('.clip'); fl.setAttribute('flood-color', e[3] === '#fff' ? '#fff' : e[3]); c.style.filter = `url(#btTint${side(e[2])})`;
        const half = e[5] / 2 * F, t0 = performance.now(), mx = Math.min(1, e[4] / 16);
        const step = () => { const u = (performance.now() - t0) / half; if (u >= 2 || !B) { fl.setAttribute('flood-opacity', 0); c.style.filter = ''; return; } fl.setAttribute('flood-opacity', (u < 1 ? u : 2 - u) * mx); requestAnimationFrame(step); }; step();
      } else if (k === 'e') emit(e[2], s, col, Math.max(10, e[3]) * F);
      else if (k === 'h') monEl(side(e[2])).style.visibility = e[3] ? 'hidden' : '';
      else if (k === 'z') { const c = monEl(side(e[2])).querySelector('.clip'); c.style.transformOrigin = '50% 100%'; c.animate([{ transform: 'none' }, { transform: `scale(${e[3]},${e[4]})` }, { transform: 'none' }], { duration: e[5] * F }); }
      else if (k === 'w') { const d = $b('.bt-dim'); d.style.background = col; d.style.setProperty('--fd', 8 * F + 'ms'); d.style.opacity = e[2] ? .35 : 0; }
      res();
    }, t)));
  }
  await wait(A[0] * F + 30);
  if (spl) { await Promise.race([spl.done, wait(1500)]); spl.stop(); }
  // 원래 자리로
  ['p', 'e'].forEach(sd => { const x = $b(`.bt-mw.${sd}`); x.getAnimations().forEach(a => a.cancel()); x.style.translate = ''; monEl(sd).style.visibility = ''; });
  const d = $b('.bt-dim'); d.style.setProperty('--fd', '.2s'); d.style.opacity = 0;
}
// 맞음: 본가 효과음(굉장 H / 보통 M / 별로 L) + 4번 깜빡
async function hitFx(s, eff = 'M') { se('KOUKA_' + eff, { pan: panOf(s) }); vib(eff === 'H' ? 2 : eff === 'L' ? 0 : 1); const m = monEl(s); for (let i = 0; i < 4; i++) { m.classList.add('blink'); await wait(B?.fast ? 34 : 66); m.classList.remove('blink'); await wait(B?.fast ? 34 : 66); } }
// 능력 변화·상태 이상: 플래티넘 공통 연출의 소리
async function statFx(s, up) { const m = monEl(s); m.classList.add(up ? 'up' : 'down'); se(up ? 'W287' : 'W287B', { pan: panOf(s) }); await wait(640); m.classList.remove('up', 'down'); }
// [소리, 간격(1/30초), 횟수] (common_anims: burn·paralysis·sleep·freeze·poison)
const ST_SE = { brn: ['W172', 0, 1], par: ['W085C', 0, 1], slp: ['W173B', 20, 1], frz: ['W258', 8, 2], psn: ['W092D', 3, 3], tox: ['W092D', 3, 3], conf: ['W146', 4, 4] };
const stSe = (s, st) => { const x = ST_SE[st]; if (!x) return; for (let i = 0; i < x[2]; i++) se(x[0], { pan: panOf(s), at: i * x[1] / 30 }); };
// 본가처럼 상태 이상 연출 (경완 2026-10-28): 화상 = 불꽃이 피어오름, 독 = 보라 거품, 잠듦 = Z, 마비 = 번개, 얼음 = 얼음 조각. 걸릴 때·턴마다 데미지·못 움직일 때
const ST_P = { brn: ['f', 7], psn: ['b', 8], tox: ['b', 8], slp: ['z', 3], par: ['e', 5], frz: ['i', 6] };
// 특성 알림: 그 포켓몬 쪽 화면 위로 미끄러져 나오는 띠 (같은 특성이 줄줄이 오면 한 번만)
async function abPop(id, ab) {
  if (!id || !ab || !B) return; const s = sideOf(id), key = s + ab; if (B.abLast === key) return; B.abLast = key;
  const w = document.createElement('div'); w.className = `bt-abp ${s}`; w.innerHTML = `<small>${esc(who(id))}의</small><b>${esc(abKo(ab))}</b>`;
  $b('.bt-top')?.appendChild(w) || el.appendChild(w);
  await wait(30); w.classList.add('on'); await wait(B.fast ? 500 : 1100); w.classList.remove('on'); await wait(220); w.remove(); }
// 혼란: 본가처럼 머리 위로 병아리 셋이 빙글빙글 (플래티넘 status_effect 그림, 경완 2026-10-28)
// 그림에서 가장 위쪽 불투명 줄(머리)의 위치: 포켓몬 칸 기준 [x, y] (그림을 못 읽으면 null)
function headAt(m) {
  try { const im = m.querySelector('img'); if (!im || !im.naturalWidth || !im.offsetWidth) return null; const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, W, H).data;
    let top = -1, sx = 0, n = 0; for (let y = 0; y < H && (top < 0 || y < top + 6); y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (top < 0) top = y; sx += x; n++; }
    if (top < 0) return null; const kx = im.offsetWidth / W, ky = im.offsetHeight / H, ir = im.getBoundingClientRect(), mr = m.getBoundingClientRect(), z = mr.width / m.offsetWidth || 1;
    return [(ir.left - mr.left) / z + sx / n * kx, (ir.top - mr.top) / z + (top + 4) * ky]; } catch (e) { return null; }
}
async function confFx(s) {
  const m = monEl(s); if (!m) return; stSe(s, 'conf');
  const w = document.createElement('div'); w.className = 'bt-conf'; w.innerHTML = '<i></i><i></i><i></i>'; m.appendChild(w);
  const hd = headAt(m); if (hd) w.style.top = hd[1] + 'px';   // 병아리 높이만 포켓몬 머리에 맞춘다. 좌우는 원래대로 가운데 (경완 2026-10-30 '좌우로 빠져나옴')
  const T = B?.fast ? 700 : 1300, N = 16;
  [...w.children].forEach((d, k) => d.animate(Array.from({ length: N + 1 }, (_, i) => { const t = (i / N + k / 3) * Math.PI * 2, z = Math.sin(t);
    return { transform: `translate(${Math.cos(t) * 26}px,${z * 6}px) scale(${.8 + z * .2})`, zIndex: z > 0 ? 2 : 0, opacity: i === 0 || i === N ? 0 : 1 }; }), { duration: T, easing: `steps(${N})` }));
  await wait(T); w.remove(); }
async function stFx(s, st, hurt = false) {
  const m = monEl(s); if (!m) return; m.style.setProperty('--fx', { brn: '#ff6030', par: '#ffe040', slp: '#a0a0c0', frz: '#a8f0ff', psn: '#c060e0', tox: '#a040c0' }[st] || '#fff'); stSe(s, st); m.classList.add('glow');
  const P = ST_P[st]; let w = null;
  if (P) { w = document.createElement('div'); w.className = `bt-stp ${P[0]}`; w.innerHTML = Array.from({ length: P[1] }, (_, i) => `<i style="--x:${Math.round((P[0] === 'z' ? 58 + i * 10 : 18 + (i * 64 / Math.max(1, P[1] - 1)) + (i % 2 ? 6 : -6)))}%;--d:${i * (P[0] === 'z' ? 260 : 90)}ms">${P[0] === 'z' ? 'Z' : ''}</i>`).join(''); m.appendChild(w); }
  if (hurt) m.animate([{ opacity: 1 }, { opacity: .15 }, { opacity: 1 }, { opacity: .15 }, { opacity: 1 }], { duration: 520, easing: 'steps(5)', delay: 260 });
  await wait(P ? (P[0] === 'z' ? 1100 : 900) : 520); m.classList.remove('glow'); w?.remove(); }
// 날씨가 이어지는 동안 위 화면에 비·모래바람·싸라기눈·눈이 계속 흩날리고, 쾌청이면 햇살이 비친다 (경완 2026-10-30)
const WX_C = { RainDance: 'rain', PrimordialSea: 'rain', SunnyDay: 'sun', DesolateLand: 'sun', Sandstorm: 'sand', Hail: 'hail', Snow: 'snow' };
function wxSet(w) { const f = $b('.bt-wx'); if (f) f.className = 'bt-wx' + (WX_C[w] ? ' on ' + WX_C[w] : ''); }
// 레벨업 능력치 창 (본가처럼): 먼저 오른 만큼(+N), 누르면 새 능력치. 다시 누르면 닫힘 (경완 2026-10-30)
const LV_ST = ['최대HP', '공격', '방어', '특수공격', '특수방어', '스피드'];
function lvWin(P, lv0, lv) {
  const m = gm(P), a = statsOf(P.sp, lv0, P.iv || [], m.nat), b = statsOf(P.sp, lv, P.iv || [], m.nat), w = $b('.bt-lvw');
  const show = f => { w.innerHTML = `<table>${LV_ST.map((n, i) => `<tr><th>${n}</th><td>${f(i)}</td></tr>`).join('')}</table><b class="cur">▼</b>`; };
  const tap = () => new Promise(r => { if (!B) return r(); B.tapWake = r; });
  return { a, b, run: async () => { show(i => '+' + (b[i] - a[i])); w.hidden = false; se('SELECT'); await tap();
  if (B) { show(i => b[i]); await tap(); }
  w.hidden = true; } };
}
// 배틀 중 레벨업: 쇼다운 쪽 능력치·HP 도 새 레벨로 (본가처럼 오른 최대HP 만큼 지금 HP 도 오른다)
function lvApply(pk, X, lv, a, b) {
  try { if (!pk || pk.fainted) return; pk.level = lv; pk.details = String(pk.details || '').replace(/, L\d+/, ', L' + lv);
    const d = b[0] - a[0]; pk.maxhp = pk.baseMaxhp = pk.maxhp + d; pk.hp = Math.min(pk.maxhp, pk.hp + d);
    ['atk', 'def', 'spa', 'spd', 'spe'].forEach((k, j) => { if (pk.baseStoredStats) pk.baseStoredStats[k] += b[j + 1] - a[j + 1]; if (pk.storedStats) pk.storedStats[k] += b[j + 1] - a[j + 1]; });
    if (X) { X.lv = lv; X.mhp = pk.maxhp; X.hp = pk.hp; setHp('p', X.hp, X.mhp); } } catch (e) { console.error(e); }
}
// 상대를 쓰러뜨리면 나왔던 내 포켓몬(쓰러지지 않은)이 경험치를 받고, 나머지 라인업은 학습장치로 절반. 나와 있는 포켓몬은 경험치 막대가 차오르고 레벨업
async function expGain(X) {
  const foe = B.foe[X.i]; if (!foe || B.practice) return;   // v13.04 경완: 연습 배틀은 경험치 연출도 없음
  // 학습장치 (본가 6세대~처럼 늘 켜짐, 경완 2026-10-30): 나오지 않은 라인업 포켓몬도 절반을 받는다. 얻은 경험치 글은 한 번에
  const SH = [];   // 학습장치로 받은 포켓몬: 나와 싸운 포켓몬이 다 받은 뒤 한 창에 미니 그림 + 경험치 막대로 한꺼번에 (경완 2026-10-30)
  for (const pid of [...B.used, ...B.my.map(o => o.pid).filter(p => !B.used.has(p))]) {
    const i = B.my.findIndex(o => o.pid === pid), pk = B.o.p[i], P = boxOf(pid); if (!P || !pk || pk.fainted) continue;
    const share = !B.used.has(pid), m = gm(P), g0 = xpGauge(B.my[i]), r = gainXp(P, xpFor(foe, m.lv) * (share ? .5 : 1), true); if (!r.n) continue;
    if (share) { const x = B.xr[pid] = B.xr[pid] || { n: 0, lv0: r.lv0, lv: r.lv0, learned: [] }; x.n += r.n; x.lv = r.lv; x.learned.push(...r.learned);
      if (r.lv > r.lv0) { const L = lvWin(P, r.lv0, r.lv); lvApply(pk, null, r.lv, L.a, L.b); B.my[i].lv = r.lv; }
      SH.push({ i, P, r, g0 }); continue; }
    const x = B.xr[pid] = B.xr[pid] || { n: 0, lv0: r.lv0, lv: r.lv0, learned: [] }; x.n += r.n; x.lv = r.lv; x.learned.push(...r.learned);
    const nm = B.my[i].nm, A = B.act.p, on = A && A.pid === pid && !A.fnt;
    await msg(`${eun(nm)} 경험치 ${eul(r.n.toLocaleString())} 얻었다!`, on ? 0 : 500);
    if (on) { const hb = $b('.bt-hb.p .xp>i'), g = growth(P.sp); let lv = r.lv0;
      for (;;) { const goal = lv < r.lv ? 1 : xpGauge(B.my[i]); se('EXP', { dur: B.fast ? .25 : .6 }); hb.style.transition = 'width .6s linear'; hb.style.width = clampN(goal, 0, 1) * 96 + 'px'; await wait(B.fast ? 250 : 620); if (lv >= r.lv) break; lv++; A.lv = lv; $b('.bt-hb.p .lvn').textContent = lv; se('EXPMAX');   /* 경완 2026-10-28: 경험치 막대 차는 본가 소리(SEQ_SE_DP_EXP), 꽉 차면 EXPMAX */ hb.style.transition = 'none'; hb.style.width = '0px'; await wait(30); }
      hb.style.transition = ''; A.xpg = xpGauge(B.my[i]); }
    if (r.lv > r.lv0) { await msg(`${nm}의 레벨이 ${r.lv}${/[036]$/.test(String(r.lv)) ? '으로' : '로'} 올랐다!`, 0); if (B) try { await window.GymBGM?.fan?.('ME_FANFA1'); } catch (e) {}   /* 본가 {WAIT 5}{WAIT 2}: 레벨 업 팡파르가 끝난 뒤 능력치 창 */ if (!B) return; const L = lvWin(P, r.lv0, r.lv); lvApply(pk, on ? A : null, r.lv, L.a, L.b); if (B) await L.run(); }
    for (const [id, f] of r.learned) await msgFan(f ? `${eun(nm)} ${eul(mvKo(f))} 잊고 ${eul(mvKo(id))} 배웠다!` : `${eun(nm)} 새로 ${eul(mvKo(id))} 배웠다!`);
    for (const id of r.ask || []) if (B) await learnAsk(P, i, id);
  }
  if (SH.length && B) await shareWin(SH);
  if (!B.practice) GA.save();
}
// 새 기술을 배우려는데 기술이 4개일 때 (본가처럼): 잊을 기술을 고르거나 배우기를 포기한다 (경완 2026-10-30 '알아서 잊어버리는데 선택할 수 있게')
async function learnAsk(P, i, id) {
  const m = gm(P), nm = B.my[i].nm, nw = mvKo(id); if (m.mv.includes(id)) return;
  await msg(`${eun(nm)} 새로 ${eul(nw)} 배우고 싶다…`); if (!B) return;
  await msg(`그러나 ${eun(nm)} 기술을 4개 알고 있으므로 더 이상 기술을 배울 수 없다!`); if (!B) return;
  for (;;) {
    await msg(`${nw} 대신 다른 기술을 잊게 하겠습니까?`, 0);
    if (await yesNo('기술을 잊게 하겠습니까?')) {
      await msg('어느 기술을 잊게 하겠습니까?', 0); const k = await forgetPanel(m.mv, id); if (!B) return;
      if (k != null) { const old = m.mv[k]; m.mv[k] = id; m.kn = (m.kn || []).filter(x => x !== id); if (!m.kn.includes(old)) m.kn.push(old);
        const x = B.xr[P.id]; if (x) x.learned.push([id, old]);
        try { const pk = B.o.p[i], mv = B.btl.dex.moves.get(id), j = pk.baseMoveSlots.findIndex(sl => sl.id === old);   // 쇼다운 쪽 기술도 바로 바꾼다
          if (mv?.exists && j >= 0) { const sl = { id: mv.id, move: mv.name, pp: mv.pp * 8 / 5 | 0, maxpp: mv.pp * 8 / 5 | 0, target: mv.target, disabled: false, used: false }; pk.baseMoveSlots[j] = sl; const j2 = pk.moveSlots.findIndex(q => q.id === old); if (j2 >= 0) pk.moveSlots[j2] = { ...sl }; } } catch (e) { console.error(e); }
        idlePanel(); await msg('1, ⏸2, 그리고⏸… ⏸… ⏸\u0007짠!'); if (!B) return;   // 본가: '1, {PAUSE 20}2, and{PAUSE 20}... {PAUSE 20}... {PAUSE 20}Poof!' (경완 2026-10-31)
        await msg(`${eun(nm)} ${eul(mvKo(old))} 깨끗이 잊었다!`); if (!B) return;
        await msg('그리고…'); if (!B) return;   // 본가: '{0} forgot how to use {1}.' → 'And...' → '{0} learned {1}!'
        await msgFan(`${eun(nm)} 새로 ${eul(nw)} 배웠다!`); if (!B) return; if (!B.practice) GA.save(); return; }
    }
    if (!B) return;
    await msg(`${eul(nw)} 배우는 것을 포기하겠습니까?`, 0);
    if (await yesNo('배우는 것을 포기하겠습니까?')) { idlePanel(); await msg(`${eun(nm)} ${eul(nw)} 배우지 않았다!`); return; }
  }
}
// 잊을 기술 고르기: 지금 기술 4개를 배틀 기술 카드처럼, 취소는 잊지 않기
// 맨 위 가로 한 줄 = 새로 배울 기술 (경완 2026-10-31 '배울 기술이 뭔지도 하단 화면 상단에'), 누르거나 ? 면 기술 설명
function forgetPanel(L, nw) {
  return new Promise(res => {
    const N = nw && mvOf(nw), A = [...L, nw];
    const p = panel(`<div class="bp-moves bp-fg${N ? ' has-nw' : ''}">${[0, 1, 2, 3].map(i => { const d = mvOf(L[i]); if (!d) return `<i class="mvb empty"></i>`;
      return mvBox(i, d, d[6] || '—', d[6] || '—', false, false); }).join('')}
      <button class="bb cancel" data-x><span>그만두기</span></button>${N ? `<div class="fg-nw"><small><em>NEW</em>새로 배울 기술</small>${mvBox(4, N, N[6] || '—', N[6] || '—', false, false)}</div>` : ''}</div>`);
    p.onclick = e => { const b = e.target.closest('button'); if (!b) return; tapSe();
      const j = b.dataset.info ? +b.dataset.info : b.closest('.fg-nw') ? 4 : -1;
      if (j >= 0) { const d = mvOf(A[j]); return moveInfo({ id: A[j], move: d[1], pp: d[6], maxpp: d[6] }).then(() => forgetPanel(L, nw).then(res)); }   // ? = 기술 설명 (경완 2026-10-31)
      res(b.hasAttribute('data-x') ? null : +b.dataset.i); };
  });
}
async function shareWin(SH) {
  const w = $b('.bt-shw'); if (!w) return;
  msg('다른 포켓몬들도 학습장치로 경험치를 얻었다!', 0); w.innerHTML = `<p>학습장치</p>${SH.map(({ i, P, r }) => `<div class="sh-r"><span class="sh-ic"><img alt="" data-th="${P.id}"></span><b>${esc(B.my[i].nm)}</b><span class="lv">Lv<em>${r.lv0}</em></span><i class="xp"><i></i></i><span class="up">+${r.n.toLocaleString()}</span></div>`).join('')}<b class="cur">▼</b>`;
  fillTh(w); w.hidden = false; const R = [...w.querySelectorAll('.sh-r')];
  R.forEach((row, k) => { row.querySelector('.xp>i').style.width = clampN(SH[k].g0, 0, 1) * 100 + '%'; });
  await wait(250); se('EXP', { dur: .9 });
  await Promise.all(SH.map(async ({ i, r }, k) => { const row = R[k], bar = row.querySelector('.xp>i'), lvE = row.querySelector('.lv em'); let lv = r.lv0;
    for (;;) { const goal = lv < r.lv ? 1 : xpGauge(B.my[i]); bar.style.transition = 'width .7s linear'; bar.style.width = clampN(goal, 0, 1) * 100 + '%'; await wait(B?.fast ? 260 : 720); if (!B || lv >= r.lv) break;
      lv++; lvE.textContent = lv; row.classList.remove('lvup'); void row.offsetWidth; row.classList.add('lvup'); se('EXPMAX'); bar.style.transition = 'none'; bar.style.width = '0%'; await wait(30); } }));
  if (!B) return; await new Promise(r => { B.tapWake = r; }); w.hidden = true;
  for (const { i, P, r } of SH) { const nm = B.my[i].nm; for (const [id, f] of r.learned) await msgFan(f ? `${eun(nm)} ${eul(mvKo(f))} 잊고 ${eul(mvKo(id))} 배웠다!` : `${eun(nm)} 새로 ${eul(mvKo(id))} 배웠다!`);
    for (const id of r.ask || []) if (B) await learnAsk(P, i, id); }
}
function xpGauge(src) { const P = boxOf(src.pid); if (!P) return 0; const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1); return b > a ? (m.xp - a) / (b - a) : 1; }

// ---------- 배틀 탭: 라인업 (gym.js 의 배틀 메뉴 창) ----------
let tabEl = null;
let luPickCb = null, luTitle = '', luGo = '';   // 승급 심사 라인업 고르기 (경완 2026-10-30): 연습 배틀 대신 '이 라인업으로 결정'
async function tab(sh, opt) {
  tabEl = sh; luOrd = false; luPickCb = opt?.pick || null; luTitle = opt?.title || ''; luGo = opt?.go || ''; if (S.gym && !luPickCb) S.gym.luI = 0;   // 포켓몬 메뉴는 늘 라인업 1부터 (경완 2026-10-30) sh.innerHTML = `<h3>포켓몬</h3><p class="gy-lead">불러오는 중…</p>`;
  try { await loadData(); } catch (e) { sh.innerHTML = `<h3>포켓몬</h3><p class="gy-lead">배틀 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>`; return; }
  drawTab();
}
let luOrd = false;   // 라인업 순서 바꾸기 모드
function drawTab() {
  const sh = tabEl; if (!sh) return; const g = S.gym, L = lus(), cur = L[g.luI], ty = g.ty;
  const can = S.box.filter(tyOk);
  sh.innerHTML = `<h3>${luPickCb ? esc(luTitle || '라인업 고르기') : '포켓몬'}</h3>
    <div class="lu-tabs" role="tablist">${L.map((l, i) => `<button role="tab" aria-selected="${i === g.luI}" data-lu="${i}">라인업 ${i + 1}<small>${l.length}/6</small></button>`).join('')}</div>
    <div class="lu-grid">${[0, 1, 2, 3, 4, 5].map(i => { const P = boxOf(cur[i]); if (!P) return `<button class="lu-slot empty" data-add="${i}" ${can.length ? '' : 'disabled'}><i class="lu-n">${i + 1}</i><span>+</span><em>포켓몬 넣기</em></button>`; const m = gm(P);
      const T = SPECIES[P.sp]?.t || [];   // 칸 디자인 (경완 2026-10-29 '퀄리티 좀 높여줘', '한 칸이 가로 한 줄 꽉 채우는 6행, 남는 자리에 특성·성격'): 체육관 타입 색 띠('체육관 타입 색으로 통일'), 번호 딱지, 타입 아이콘, 레벨 딱지
      return `<button class="lu-slot${luOrd ? ' lu-ord' : ''}" data-p="${P.id}" style="--tc:${GA.TYPE_C?.[ty] || '#8890a8'}"><i class="lu-n">${i + 1}</i>${luOrd ? '' : `<span class="lu-x" data-rm="${P.id}" role="button" aria-label="라인업에서 빼기">✕</span>`}${thumb(P)}<span class="lu-mid"><b>${esc(nmOf(P))}</b><span class="lu-ft"><em>Lv.${m.lv}</em><span class="lu-tys">${T.map(tyI).join('')}</span></span></span><span class="lu-inf">${m.ha ? `<span class="lu-hab"><span><small>특성</small>${esc(abKo(m.ab))}</span><em class="ha-tag">숨겨진 특성</em></span>` : `<span><small>특성</small>${esc(abKo(m.ab))}</span>`}</span></button>`; }).join('')}</div>
    ${can.length ? '' : `<p class="lu-none">${TYPE_KO[ty]} 타입 포켓몬이 아직 없어요. 알을 부화시켜 데려와 주세요.</p>`}
    <div class="lu-act"><div class="lu-row2"><button class="gy-key" data-box><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M2 2h12v1H2zM1 3h1v11H1zM14 3h1v11h-1zM2 14h12v1H2zM2 7h12v1H2zM6 8h4v1H6zM6 9h1v1H6zM9 9h1v1H9zM6 10h4v1H6z"/><path fill="#e85a4a" d="M2 3h12v4H2z"/><path fill="#ff8a78" d="M2 3h12v1H2z"/><path fill="#f4f4f8" d="M2 8h4v6H2zM10 8h4v6h-4zM6 11h4v3H6z"/><path fill="#fff" d="M7 9h2v1H7z"/></svg></i>포켓몬 박스</button><button class="gy-key${luOrd ? ' on' : ''}" data-ord ${cur.length > 1 ? '' : 'disabled'}><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 1h1v1H4zM3 2h3v1H3zM2 3h5v1H2zM4 4h1v9H4zM11 3h1v9h-1zM9 11h5v1H9zM10 12h3v1h-3zM11 13h1v1h-1z"/></svg></i>${luOrd ? '순서 바꾸기 끝' : '순서 바꾸기'}</button></div><button class="gy-key main lu-go" data-go ${cur.length ? '' : 'disabled'}><i class="lu-ic"><svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#20202c" d="M5 1h6v1H5zM3 2h2v1H3zM11 2h2v1h-2zM2 3h1v2H2zM13 3h1v2h-1zM1 5h1v6H1zM14 5h1v6h-1zM2 11h1v2H2zM13 11h1v2h-1zM3 13h2v1H3zM11 13h2v1h-2zM5 14h6v1H5zM2 7h4v1H2zM10 7h4v1h-4zM6 6h4v1H6zM5 7h1v2H5zM10 7h1v2h-1zM6 9h4v1H6z"/><path fill="#e83a3a" d="M5 2h6v1H5zM3 3h10v2H3zM2 5h12v2H2zM6 6h0z"/><path fill="#fff" d="M2 8h3v1H2zM11 8h3v1h-3zM2 9h12v2H2zM3 11h10v2H3zM5 13h6v1H5zM6 7h4v2H6z"/><path fill="#ff9a9a" d="M4 3h2v1H4zM3 4h1v1H3z"/></svg></i>${luPickCb ? luGo || '이 라인업으로 결정' : '연습 배틀'}</button></div>`;   // 연습 배틀은 아래 가운데 크게, 박스 옆에 순서 바꾸기 (경완 2026-10-29)
  fillTh(sh);
  // 끌어서 순서 바꾸기 (경완 2026-10-28 '라인업 화면에서 포켓몬 순서 바꿀 수 있게')
  const grid = sh.querySelector('.lu-grid'); let dg = null, noTap = 0;
  // 옮길 자리는 칸이 아니라 칸과 칸 사이 여백 가운데에 막대로 보인다 (경완 2026-10-29)
  if (luOrd) grid.classList.add('lu-wig');   // 순서 바꾸기 중엔 칸이 흔들흔들
  const bar = document.createElement('i'); bar.className = 'lu-bar'; bar.hidden = true; grid.appendChild(bar);
  const insAt = (x, y) => { const F = [...grid.querySelectorAll('.lu-slot[data-p]')]; if (F.length < 2) return null; const gr = grid.getBoundingClientRect();
    let best = null, bd = 1e9; F.forEach((el, i) => { if (el.classList.contains('lu-drag')) return; const r = el.getBoundingClientRect(), d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom)); if (d < bd) { bd = d; best = [i, r]; } });
    const [i, r] = best, after = y > r.top + r.height / 2, k = i + (after ? 1 : 0), gap = parseFloat(getComputedStyle(grid).rowGap) || 8;   // 한 줄 한 칸이라 위아래 사이에 가로 막대
    bar.hidden = false; bar.style.left = (r.left - gr.left) + 'px'; bar.style.width = r.width + 'px'; bar.style.top = ((after ? r.bottom + gap / 2 : r.top - gap / 2) - gr.top) + 'px'; bar.style.height = ''; return k; };
  // 순서 바꾸기 모드에선 바로 끌고, 아니면 슬롯을 꾹 누르면 끌 수 있다 (경완 2026-10-29)
  grid.oncontextmenu = e => e.preventDefault();
  grid.addEventListener('touchmove', e => { if (dg?.ready) e.preventDefault(); }, { passive: false });   // 꾹 누른 뒤엔 화면이 스크롤되지 않게
  grid.onpointerdown = e => { const b = e.target.closest('.lu-slot[data-p]'); if (!b || e.button || e.target.closest('.lu-x')) return; const d = dg = { b, x: e.clientX, y: e.clientY, pid: e.pointerId, on: false, ready: luOrd };
    if (!luOrd) d.t = setTimeout(() => { if (dg !== d) return; d.ready = true; noTap = Date.now() + 1e4; b.classList.add('lu-hold'); grid.classList.add('lu-wig'); sfx('tap'); try { navigator.vibrate?.(15); } catch (er) {} }, 380); };
  grid.onpointermove = e => { if (!dg || e.pointerId !== dg.pid) return; const dx = e.clientX - dg.x, dy = e.clientY - dg.y;
    if (!dg.on) { if (!dg.ready) { if (Math.hypot(dx, dy) > 8) { clearTimeout(dg.t); dg = null; } return; } if (Math.hypot(dx, dy) < (luOrd ? 8 : 3)) return; dg.on = true; try { grid.setPointerCapture(e.pointerId); } catch (er) {} dg.b.classList.add('lu-drag'); }
    dg.b.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`; dg.ins = insAt(e.clientX, e.clientY); };
  grid.onpointerup = grid.onpointercancel = e => { if (!dg || e.pointerId !== dg.pid) return; const d = dg; dg = null; clearTimeout(d.t); d.b.classList.remove('lu-hold'); if (!luOrd) grid.classList.remove('lu-wig'); bar.hidden = true; if (!d.on) { if (d.ready && !luOrd) noTap = Date.now(); return; }
    noTap = Date.now(); const from = cur.indexOf(+d.b.dataset.p || d.b.dataset.p), ins = e.type === 'pointerup' ? d.ins ?? -1 : -1, to = ins < 0 ? -1 : ins > from ? ins - 1 : ins;
    if (from >= 0 && to >= 0 && to !== from) { const [id] = cur.splice(from, 1); cur.splice(to, 0, id); GA.save(); sfx('tap'); }
    drawTab(); };
  sh.onclick = e => {
    const x = e.target.closest('.lu-x'); if (x && Date.now() - noTap >= 400) { sfx('tap'); const id = +x.dataset.rm || x.dataset.rm; luAsk(boxOf(id), () => { const j = cur.indexOf(id); if (j >= 0) { cur.splice(j, 1); GA.save(); } drawTab(); }); return; }   // 슬롯 ✕ = 바로 빼기 (경완 2026-10-29)
    const b = e.target.closest('button'); if (!b || b.disabled || Date.now() - noTap < 400) return; sfx('tap');
    if (b.dataset.lu) { g.luI = +b.dataset.lu; GA.save(); drawTab(); return; }
    if (b.dataset.add) return pickMon();
    if (b.dataset.p) return luOrd ? undefined : monPop(b.dataset.p);
    if (b.hasAttribute('data-box')) return boxPop();
    if (b.hasAttribute('data-ord')) { luOrd = !luOrd; drawTab(); return; }
    if (b.hasAttribute('data-go')) { if (luPickCb) { const f = luPickCb; luPickCb = null; return f(g.luI); } return practice(); }
  };
}
function gymPop(html, onClick) { const p = document.createElement('div'); p.className = 'gy-pop'; p.innerHTML = `<div class="win" role="dialog">${html}</div>`;
  p.onclick = e => { if (e.target === p) return p.remove(); const h = e.target.closest('.iv-hex'); if (h) { sfx('tap'); ivBar = h.classList.toggle('bar'); return; } const b = e.target.closest('button[data-a]'); if (b) { sfx('tap'); onClick?.(b.dataset.a, () => p.remove(), b); } };
  document.querySelector('#gym .gy-main').appendChild(p); fillTh(p); return p; }
// 라인업에서 빼기 전에 묻는 창 (경완 2026-10-29)
function luAsk(P, ok) { ok(); }   // 묻지 않고 바로 빼기 (경완 2026-10-30 '빼기·x 누르면 바로 빠지게')
function pickMon() { boxWin(true); }
// 개체값 육각형 (본가 '능력 판정'처럼): HP 위, 시계 방향으로 공격·방어·스피드·특방·특공. 성격으로 오르는 능력은 빨강, 내려가는 능력은 파랑
const IV_ORD = [[0, 'HP', ''], [1, '공격', 'atk'], [2, '방어', 'def'], [5, '스피드', 'spe'], [4, '특방', 'spd'], [3, '특공', 'spa']];
let ivBar = false;
const ivJudge = v => v >= 31 ? '최고' : v >= 26 ? '훌륭해' : v >= 16 ? '굉장해' : v >= 1 ? '괜찮아' : '별로야';
// 능력치 육각형 (경완 2026-10-29 '노력치는 없으니까 나머지 다 반영한 능력치로, 판정에 개체값 판정'): 종족값·개체값·레벨·성격으로 본가 공식 그대로 계산
const ST_KEY = ['', 'atk', 'def', 'spa', 'spd', 'spe'];
function statsOf(sp, lv, iv, nat) {
  const bs = SPECIES[sp]?.bs || [60, 60, 60, 60, 60, 60], nt = D.nt[nat] || ['', '', ''];
  return bs.map((b, i) => { const v = Math.floor((2 * b + (iv[i] | 0)) * lv / 100); if (!i) return SPECIES[sp]?.n === '껍질몬' ? 1 : v + lv + 10;
    return Math.floor((v + 5) * (ST_KEY[i] === nt[1] ? 1.1 : ST_KEY[i] === nt[2] ? .9 : 1)); });
}
function ivHex(P, m) {
  const iv = P.iv || [0, 0, 0, 0, 0, 0], nt = D.nt[m.nat] || ['', '', ''], R = 52, cx = 90, cy = 72, pt = (k, r) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const st = statsOf(P.sp ?? m.sp, m.lv || 1, iv, m.nat), st0 = statsOf(P.sp ?? m.sp, m.lv || 1, iv, 'hardy'), mx = Math.max(...st) * 1.05;
  const nd = i => { const d = st[i] - st0[i]; return d ? `(${d > 0 ? '+' : ''}${d})` : ''; };   // 성격으로 오르내린 만큼 괄호로 (경완 2026-10-29)
  const ring = f => IV_ORD.map((_, k) => pt(k, R * f).map(v => v.toFixed(1)).join(',')).join(' ');
  const poly = IV_ORD.map(([i], k) => pt(k, R * Math.max(.06, st[i] / mx)).map(v => v.toFixed(1)).join(',')).join(' ');
  const cOf = key => key && key === nt[1] ? 'up' : key && key === nt[2] ? 'dn' : '', arw = c => c === 'up' ? '▲' : c === 'dn' ? '▼' : '';   // 성격으로 오른 능력 ▲, 내린 능력 ▼ (경완 2026-10-28)
  const lab = IV_ORD.map(([i, n, key], k) => { const [x, y] = pt(k, R + 17), c = cOf(key); return `<text x="${x.toFixed(1)}" y="${(y - 3).toFixed(1)}" class="${c}">${n}${arw(c)}</text><text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" class="v">${st[i]}${nd(i)}</text>`; }).join('');
  const sum = iv.reduce((a, b) => a + b, 0), best = IV_ORD.reduce((a, o) => st[o[0]] > st[a[0]] ? o : a, IV_ORD[0]);
  // 누르면 육각형 ↔ 가로 막대 (경완 2026-10-28). 막대는 종족값·개체값·성격으로 오른 몫을 색으로 나눔, 판정 글자 없음 (경완 2026-10-29)
  const sb = statsOf(P.sp ?? m.sp, m.lv || 1, [0, 0, 0, 0, 0, 0], 'hardy'), w = v => `calc((100% - 60px) * ${(Math.max(0, v) / mx).toFixed(3)})`;   // 숫자가 막대 끝에 붙으니 그 자리(60px)만큼 빼고 늘인다
  const bars = `<div class="iv-bars">${[[0, 'HP', ''], [1, '공격', 'atk'], [2, '방어', 'def'], [3, '특공', 'spa'], [4, '특방', 'spd'], [5, '스피드', 'spe']].map(([i, n, key]) => { const c = cOf(key), d = st[i] - st0[i];
    return `<div class="ivb ${c}"><span>${n}<i>${arw(c)}</i></span><b><i class="sg-b" style="width:${w(sb[i])}"></i><i class="sg-i" style="width:${w(st0[i] - sb[i])}"></i>${d > 0 ? `<i class="sg-u" style="width:${w(d)}"></i>` : d < 0 ? `<i class="sg-d" style="width:${w(-d)}"></i>` : ''}<em>${st[i]}<small>${nd(i)}</small></em></b></div>`; }).join('')}
    <div class="ivb-lg"><span><i class="sg-b"></i>종족값</span><span><i class="sg-i"></i>개체값</span><span><i class="sg-u"></i>성격 ▲</span><span><i class="sg-d"></i>성격 ▼</span></div></div>`;
  return `<div class="iv-hex${ivBar ? ' bar' : ''}" role="button" tabindex="0" aria-label="능력치 (누르면 보기 바꾸기)">${bars}<svg viewBox="0 -12 180 164" role="img" aria-label="능력치"><polygon points="${ring(1)}" class="r0"/><polygon points="${ring(2 / 3)}" class="r1"/><polygon points="${ring(1 / 3)}" class="r1"/><polygon points="${poly}" class="iv"/>${lab}</svg>
    <div class="iv-sum"><b>능력치</b><span>합계 ${st.reduce((a, b) => a + b, 0)}</span><span>판정: ${ivJudge(Math.round(sum / 6))}</span><span>가장 좋은 능력치: ${best[1]}</span></div></div>`;
}
// 포켓몬 박스 창: 본 게임 포켓몬 박스와 같은 모양(검색·정렬·칸)으로 화면 전체에 뜬다. 체육관 타입 포켓몬만, 기본은 레벨순 (경완 2026-10-27)
// add=true 면 라인업 빈 칸에서 연 것: 누르면 바로 라인업에 넣는다. 아니면 누르면 정보 창
// 팝업이 아니라 새 화면으로 (경완 2026-10-27): 체육관 화면 위를 통째로 덮고, 왼쪽 위 ‹ 로 돌아간다
const BX_SORT = [['lv', '레벨'], ['rank', '랭크'], ['new', '날짜']];   // 경완 2026-10-28 '정렬은 레벨, 랭크, 날짜만'
let bxSort = 'lv', bxDir = 1, bxQ = '', bxTy = 0, bxTyAll = [], bxRefresh = null;
const tyI = t => GA.tyIcon(t).replace(/ data-tip="[^"]*"/, '');   // 박스·라인업 타입 아이콘은 눌러도 말풍선 없이 (경완 2026-10-29)   // bxTy: 타입 필터 (0 = 전체, 경완 2026-10-29)
const RK_ORD = { S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
function boxWin(add, tmId, done, O) { bxTy = 0;   // 열 때마다 '모든 타입' (포켓몬 박스와 같게, 경완 2026-10-30)   // O: 다른 곳에서 쓰는 고르기 (훈련장 등) {title, tip, list, ok, first, tag, pick}   // tmId: 창고에서 기술머신 가르칠 포켓몬 고르기 (경완 2026-10-29)
  document.querySelector('#gym .gy-boxw')?.remove();
  const w = document.createElement('div'); w.className = 'gy-boxw';
  w.innerHTML = `<div class="win" role="dialog" aria-label="포켓몬 박스"><div class="bw-hd"><button class="bw-x" data-x aria-label="뒤로">‹</button><h4>${O ? O.title() : tmId ? `기술 가르치기 · ${esc(mvKo(tmId))}` : add ? `라인업 ${(S.gym.luI | 0) + 1}에 넣을 포켓몬 <small>${curLu().length}/6</small>` : '포켓몬 박스'}</h4></div>
        <div class="filters boxq"><span class="qw"><input type="search" placeholder="이름이나 번호" aria-label="포켓몬 이름이나 번호로 찾기" autocomplete="off" value="${esc(bxQ)}"><button type="button" class="qx" aria-label="검색어 지우기">✕</button></span></div>
    <div class="mgr-tools"><div class="bag-sort bw-sort">${BX_SORT.map(([k, n]) => `<button data-sort="${k}">${n}</button>`).join('')}</div><div class="bw-tyf" role="group" aria-label="타입 필터"></div><span class="tcount"></span></div>
    <div class="boxgrid bw-grid"></div></div>`;
  document.querySelector('#gym .gy-main').appendChild(w);
  const grid = w.querySelector('.bw-grid'), inp = w.querySelector('input');
  const draw = () => {
    w.querySelectorAll('[data-sort]').forEach(b => { const on = b.dataset.sort === bxSort; b.setAttribute('aria-pressed', on); b.dataset.dir = on ? (bxDir > 0 ? '▼' : '▲') : ''; });
    const lu = new Set(curLu()), q = bxQ.toLowerCase();
    const key = { lv: x => (x.m?.lv || 0) * 1e3 + GA.ivSum(x.P), rank: x => (RK_ORD[GA.rankOf(x.P)] || 0) * 1e5 + (x.m?.lv || 0), new: x => +x.P.t || +x.P.id || 0 }[bxSort] || (x => (x.m?.lv || 0));
    // 라인업 고르기는 가진 포켓몬 전부: 다른 타입은 흐리게(못 고름), 고를 수 있는 포켓몬이 앞에 (경완 2026-10-28)
    const all = O ? O.list() : S.box.filter(tyOk), tys = P => SPECIES[P.sp]?.t || [];
    // 타입 필터: 목록에 있는 타입만 아이콘으로, 고르면 그 타입이 들어간 포켓몬만 (경완 2026-10-29)
    const gt = S.gym.ty, TY = [...new Set(all.flatMap(tys))].filter(t => t !== gt).sort((a, b) => a - b); if (bxTy && !TY.includes(bxTy)) bxTy = 0;   // 체육관 타입은 기본, 나머지 한 타입을 팝업에서 고르기 (경완 2026-10-29)
    bxTyAll = TY;
    w.querySelector('.bw-tyf').innerHTML = TY.length ? `<button type="button" class="fsel bw-fsel${bxTy ? ' on' : ''}" data-typop aria-haspopup="listbox">${bxTy ? TYPE_KO[bxTy] : '모든 타입'}</button>` : '';
    const L = all.filter(P => (!q || nmOf(P).toLowerCase().includes(q) || String(P.sp) === q.replace(/^0+/, '')) && (!bxTy || tys(P).includes(bxTy))).map(P => { const ok = O ? O.ok(P) : tyOk(P) && (!tmId || tmCan(P, tmId)); return { P, ok, f: O?.first ? +!!O.first(P) : 0, m: O || tyOk(P) ? gm(P) : null }; }).sort((a, b) => (b.ok - a.ok) || (b.f - a.f) || (key(b) - key(a)) * bxDir);
    w.querySelector('.tcount').innerHTML = q || bxTy ? `찾은 포켓몬 <b>${L.length}</b>마리` : `<b>${all.length}</b>마리`;   // 마릿수만 (경완 2026-10-29)
    grid.innerHTML = L.length ? L.map(({ P, m, ok }) => { const rk = GA.rankOf(P), on = lu.has(P.id);
      return `<button class="pk${P.shiny ? ' shiny' : ''}${GA.pkCls?.(P) || ''}${ok ? '' : ' bw-no'}" data-id="${P.id}" ${ok ? '' : 'disabled'} style="--shue:${GA.shinyHue(P.sp)}deg"><span class="rk ${rk}">${rk}</span>${(T => T.length ? `<span class="tgs">${T.map(t => `<span class="tg${t === '훈련중' || t === '훈련 중' ? ' tg-tr' : ''}">${t}</span>`).join('')}</span>` : '')(O ? [O.tag?.(P)].filter(Boolean) : [on && '라인업', inTr(P.id) && '훈련중'].filter(Boolean))}<img alt="" data-th="${P.id}"><span class="nm">${esc(nmOf(P))}${P.shiny ? '<b class="sh">✦</b>' : ''}</span><span class="bw-tys">${tys(P).map(tyI).join('')}</span>${tmId && !ok ? `<span class="bw-lv">${m?.mv.includes(tmId) ? '이미 앎' : '못 배움'}</span>` : m ? `<span class="bw-lv">Lv.${m.lv}</span>` : ''}</button>`; }).join('')
      : `<p class="empty-msg">${q || bxTy ? '찾는 포켓몬이 없어요.' : `${TYPE_KO[S.gym.ty]} 타입 포켓몬이 아직 없어요.`}</p>`;
    fillTh(grid);
  };
  bxRefresh = () => w.isConnected && draw();
  w.onclick = e => {
    if (e.target.closest('[data-x]')) { sfx('tap'); w.remove(); if (tmId || O) done?.(); return; }
    if (e.target.closest('.qx')) { inp.value = ''; bxQ = ''; draw(); return; }
    if (e.target.closest('[data-typop]')) { sfx('tap');   // 포켓몬 박스 타입 필터와 같은 창 (경완 2026-10-30): 체육관 타입과 같이 가진 타입만
      const fp = document.createElement('div'); fp.className = 'fpop gy-fpop';
      fp.innerHTML = `<div class="win" role="listbox" aria-label="필터"><h4>타입</h4><div class="fopts"><button class="all" data-v="0" aria-selected="${!bxTy}">모든 타입</button>${bxTyAll.map(t => `<button data-v="${t}" aria-selected="${bxTy === t}"><i class="sw" style="background:${GA.TYPE_C[t]}"></i>${TYPE_KO[t]}</button>`).join('')}</div></div>`;
      fp.onclick = ev => { const o = ev.target.closest('[data-v]'); if (o) { sfx('tap'); bxTy = +o.dataset.v; draw(); grid.scrollTop = 0; } if (o || ev.target === fp) fp.remove(); };
      document.body.appendChild(fp); return; }
    const s = e.target.closest('[data-sort]'); if (s) { sfx('tap'); const k = s.dataset.sort; if (k === bxSort) bxDir = -bxDir; else { bxSort = k; bxDir = 1; } draw(); grid.scrollTop = 0; return; }
    const c = e.target.closest('.pk'); if (!c) return; sfx('tap');
    const id = +c.dataset.id || c.dataset.id;
    if (O) { const P = boxOf(id); if (P) O.pick(P, { close: () => w.remove(), redraw: () => { const h = w.querySelector('.bw-hd h4'); if (h) h.innerHTML = O.title(); draw(); } }); return; }
    if (tmId) { const P = boxOf(id); if (!P || !tmCan(P, tmId)) return; w.remove(); teachTm(P, tmId, done); return; }
    if (add) return monPop(id, 'add');   // 라인업 고르기도 상세카드 먼저, 버튼은 라인업에 넣기만 (경완 2026-10-29)
    if (add) { const cur = curLu(), j = cur.indexOf(id); if (j >= 0) cur.splice(j, 1); else if (cur.length < 6) cur.push(id); else return;   /* 경완 2026-10-28: 라인업에 든 포켓몬을 다시 누르면 빠진다 */ GA.save(); drawTab(); if (cur.length >= 6 && j < 0) w.remove(); else { const sm = w.querySelector('.bw-hd small'); if (sm) sm.textContent = `${cur.length}/6`; draw(); } return; }
    monPop(id, true);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bxQ = inp.value.trim(); draw(); inp.blur(); } });
  inp.addEventListener('input', () => { if (!inp.value.trim() && bxQ) { bxQ = ''; draw(); } });
  draw();
}
const boxPop = () => boxWin(false);
// 정보 카드 html (넘기기 때 옆 카드도 같은 걸로 그린다)
const inTr = id => !!S.gym?.tr?.some(e => e.id === id);
function monHtml(P, mode) {
  const inLu = curLu().includes(P.id); const m = gm(P), g = growth(P.sp), a = xpAt(g, m.lv), b = xpAt(g, m.lv + 1), mv = m.mv.map(x => mvOf(x)).filter(Boolean);
  return `<div class="mp-head"><button type="button" class="mp-thb" data-a="hit" aria-label="지닌 도구">${thumb(P)}</button><div class="mp-hd"><h4>${mode === 'view' || !GA.nmEdit ? esc(nmOf(P)) : GA.nmEdit(P)}${inTr(P.id) ? '<em class="tr-tag">훈련중</em>' : ''}</h4><p class="mp-tys">${(SPECIES[P.sp]?.t || []).map(t => tyTag(t)).join('')}</p><p class="mp-lv"><b>Lv.${m.lv}</b> · 랭크 ${GA.rankOf(P)}</p>${frRow(P)}<i class="mp-xp"><i style="width:${m.lv >= LV_MAX ? 100 : clampN((m.xp - a) / (b - a), 0, 1) * 100}%"></i></i><small class="mp-xpn">${m.lv >= LV_MAX ? '최고 레벨' : `${Math.max(0, m.xp - a).toLocaleString()}/${(b - a).toLocaleString()}`}</small></div></div>
    <div class="mp-na"><button type="button" class="mp-nat" data-a="nat"><small>성격 <i class="mp-more">›</i></small><p><b>${natKo(m.nat)}</b></p></button><button type="button" class="mp-ab${m.ha ? ' ha' : ''}" data-a="ab"><small>특성 <i class="mp-more">›</i></small><p><b${m.ha ? ' class="ha"' : ''}>${abKo(m.ab)}</b>${m.ha ? '<em class="ha-tag">숨겨진</em>' : ''}</p></button></div>
    ${ivHex(P, m)}
    <div class="mp-mvh"><small>기술</small>${mode === 'add' ? '' : '<button type="button" class="mp-tx" data-a="mv">기술 바꾸기 ›</button>'}</div>
    <div class="mp-moves mp-line">${mv.map(x => `<button type="button" class="mp-mv" data-a="i${x[0]}" style="--tc:${GA.TYPE_C?.[x[2]] || '#888'}">${tyTag(x[2], x[3])}<b>${esc(x[1])}</b>${mvSt(x)}</button>`).join('')}</div>
    ${mode === 'add' ? `<div class="gy-btns one mp-btns">${inLu ? '<button data-a="rm" class="danger">라인업에서 빼기</button>' : `<button data-a="add" class="main" ${tyOk(P) && curLu().length < 6 ? '' : 'disabled'}>라인업에 넣기</button>`}</div>` : `<div class="gy-btns mp-btns mp-3"><button data-a="tm">도구 사용</button>${inLu ? '<button data-a="rm" class="danger">라인업에서 빼기</button>' : `<button data-a="add" ${tyOk(P) && curLu().length < 6 ? '' : 'disabled'}>라인업으로</button>`}<button data-a="tr" class="${inTr(P.id) ? 'tr-on' : 'tr-go'}">${inTr(P.id) ? '훈련장에서 빼기' : '훈련장으로'}</button></div>`}<button class="mp-x" data-a="x" aria-label="닫기">✕</button>`;
}
function monPop(id, fromBox, under, lst) {   // lst: 넘겨 볼 목록 (함수). 없으면 라인업 (훈련장 슬롯은 훈련장 포켓몬끼리만, 경완 2026-10-29)
  if (!document.querySelector(".gy-pop .mp-head")) ivBar = false;   // 정보 카드를 새로 열면 능력치는 늘 육각형부터 (경완 2026-10-29)
  const P = boxOf(+id || id); if (!P) return; const m = gm(P), nt = D.nt[m.nat] || ['', '', ''], h = D.sp[P.sp]?.h;
  // 특성 팝업: 숨겨진 특성은 안내 문구 대신 눌러서 효과 (경완 2026-10-29)
  const abShow = (k, hid, hk) => gymPop(`<h4>${abKo(k)}${hid ? ' <em class="ha-tag">숨겨진 특성</em>' : ''}</h4><p class="gy-msg ab-d">${esc(AB_D?.[k] || '효과 설명이 아직 없어요.')}</p>${hk ? `<button type="button" class="ab-hid" data-a="hab"><small>이 종의 숨겨진 특성</small><b>${abKo(hk)}</b><i>›</i></button>` : ''}<div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => { if (b === 'hab') return abShow(hk, true); c2(); });
  // 정보 카드 (경완 2026-10-29): 이름 밑 타입·레벨·경험치 왼쪽 맞춤, 경험치 막대는 끝까지 / 성격·특성 한 줄(눌러서 효과) / 개체값 › / 기술(누르면 상세, 위에 '기술 바꾸기') / 기술 가르치기
  const p = gymPop(monHtml(P, fromBox),
    (a, close) => { const c = curLu(), i = c.indexOf(P.id);
      if (a === 'x') return close();   // ✕ 는 그냥 닫기 (아래 fin 으로 빠져 카드를 다시 열던 것, 경완 2026-10-31)
      if (a[0] === 'i' && a.length > 1) return mvInfo(a.slice(1));
      if (a === 'nat') return gymPop(`<h4>${natKo(m.nat)}</h4><p class="gy-msg nat-d">${nt[1] ? `<span class="nat-c up">${STAT_KO[nt[1]]} ▲</span><span class="nat-c dn">${STAT_KO[nt[2]]} ▼</span>` : '<span class="nat-c">능력 변화 없음</span>'}</p><p class="gy-msg ab-d">${nt[1] ? `${STAT_KO[nt[1]]}${jong(STAT_KO[nt[1]]) ? '이' : '가'} 잘 오르고, ${STAT_KO[nt[2]]}${jong(STAT_KO[nt[2]]) ? '이' : '가'} 덜 오르는 성격이에요.` : '모든 능력이 고르게 오르는 성격이에요.'}</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b2, c2) => c2());   // 성격 효과도 눌러서 (경완 2026-10-29)
      if (a === 'ab') return abShow(m.ab, m.ha, null);   // 특성 효과는 눌러서 팝업 (경완 2026-10-29). v12.10 경완: 숨특은 진짜 가진 개체만 (종의 숨특 칸 없앰)
      if (a === 'mv') { close(); movesPop(P, () => monPop(P.id, fromBox, null, lst)); return; }
      if (a === 'tm') { close(); usePop(P, () => monPop(P.id, fromBox, null, lst)); return; }
      // 프로필 그림을 누르면 지닌 도구 정보 + 돌려받기 (경완 2026-10-29)
      if (a === 'hit') { const it = m.it, x = HOLD[it];
        if (!x) return gymPop(`<h4>지닌 도구 없음</h4><p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} 아무것도 지니고 있지 않아요.</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="use">도구 사용</button></div>`, (b, c2) => { c2(); if (b === 'use') { close(); usePop(P, () => monPop(P.id, fromBox, null, lst)); } });
        return gymPop(`<h4 class="mi-h"><img class="tm-ic it-ic" alt="" src="${itImg(it)}">${esc(x[0])}</h4><p class="gy-msg it-own">${esc(nmOf(P))}${jong(nmOf(P)) ? '이' : '가'} 지니고 있어요</p><p class="gy-msg mi-d">${esc(x[2])}</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="take">돌려받기</button></div>`, (b, c2) => { c2(); if (b !== 'take') return; takeIt(P); se('DECIDE'); close(); monPop(P.id, fromBox, null, lst); }); }
      if (a === 'tr') return window.GymManage?.trSend(P, () => { drawTab(); bxRefresh?.(); monPop(P.id, fromBox, p, lst); });
      const fin = () => {
      if (a === 'rm' && i >= 0) c.splice(i, 1); if (a === 'add' && i < 0 && c.length < 6 && tyOk(P)) c.push(P.id); close(); GA.save(); drawTab();
      if (fromBox === 'add') { const bw = document.querySelector('#gym .gy-boxw'); if (a === 'add' && c.length >= 6) bw?.remove(); else { const sm = bw?.querySelector('.bw-hd small'); if (sm) sm.textContent = `${c.length}/6`; } }   // 라인업 고르기: 6마리 차면 박스도 닫힘
      if (fromBox) bxRefresh?.();
      if (fromBox !== 'add') monPop(P.id, fromBox, null, lst); };   // 정보 카드 '라인업으로'는 카드를 다시 열어 바뀐 버튼을 보여 줌 (경완 2026-10-30)
      if (a === 'rm') return luAsk(P, fin);   // 빼기 전에 한 번 묻기 (경완 2026-10-29)
      fin(); });
  p.querySelector('.win').classList.toggle('mp-tr', inTr(P.id));   // 훈련 중이면 카드 색이 바뀐다 (경완 2026-10-29)
  // 라인업 포켓몬은 카드를 좌우로 밀면 다음·이전 포켓몬: 꾸미기 모드 포켓몬 박스처럼 옆 카드가 붙어 따라 들어온다, 좌우 힌트 화살표 (경완 2026-10-29)
  const L = lst ? lst() : curLu(), k = L.indexOf(P.id), w = p.querySelector('.win');
  if (under) { p.style.background = 'transparent'; p.style.backdropFilter = p.style.webkitBackdropFilter = 'none'; Promise.race([Promise.all([...p.querySelectorAll('img')].map(i => new Promise(r => { if (i.complete && i.naturalWidth) r(); else { i.onload = i.onerror = r; } }))), new Promise(r => setTimeout(r, 300))]).then(() => { under.remove(); p.style.background = p.style.backdropFilter = p.style.webkitBackdropFilter = ''; }); }
  if (k >= 0 && L.length > 1) {
    const nb = d => L[k + d], go = (d, snd) => { if (nb(d) == null) return; if (snd) sfx('tap'); monPop(nb(d), fromBox, p, lst); };   // 끝에서는 안 넘어감, 밀어서 넘길 땐 소리 없음 (경완 2026-10-29)
    const pg = j => `<p class="mp-pg">${L.map((_, i) => `<i class="${i === j ? 'on' : ''}"></i>`).join('')}</p>`;
    w.insertAdjacentHTML('beforeend', `${pg(k)}<button class="dp-arr l" type="button" data-nav="-1" aria-label="이전 포켓몬"><i class="sw-h l"></i></button><button class="dp-arr r" type="button" data-nav="1" aria-label="다음 포켓몬"><i class="sw-h r"></i></button>`);
    const arrows = [...w.querySelectorAll(':scope > .dp-arr')];
    [1, -1].forEach(d => { const Q = nb(d) != null && boxOf(nb(d)); if (Q) GA.thumb(Q).catch(() => {}); });   // 옆 카드 그림 미리
    GA.cardPager?.(p, { can: d => nb(d) != null, step: d => go(d),
      snap: (d, w0) => { const c = w0.cloneNode(false); const Q = boxOf(nb(d)); c.innerHTML = Q ? monHtml(Q, fromBox) + pg(k + d) : ''; c.classList.toggle('mp-tr', !!Q && inTr(Q.id)); fillTh(c); return c; } });   // 옆 카드도 실제 카드와 똑같이 (점·훈련 색까지)
    arrows.forEach(a => { a.hidden = nb(+a.dataset.nav) == null; a.addEventListener('click', e => { e.stopPropagation(); go(+a.dataset.nav, 1); }); });
  }
  return p;
}
// 남의 포켓몬 상세카드 (경완 2026-10-29 '지원서 포켓몬 누르면 상세카드'): 종·레벨로 만든 보기 전용 카드, 같은 지원서에선 같은 개체
const FC = {};
function foePop(sp, lv, key) {
  const e = FC[key] || (FC[key] = foeEntry(sp, lv)), nt = D.nt[e.nat] || ['', '', ''], mv = (e.mv || []).map(x => mvOf(x)).filter(Boolean), ha = e.ab === D.sp[sp]?.h;
  gymPop(`<div class="mp-head"><span class="mp-fth"><img alt="" data-sp="${sp}"></span><div class="mp-hd"><h4>${esc(SPECIES[sp]?.n || '')}</h4><p class="mp-tys">${(SPECIES[sp]?.t || []).map(t => tyTag(t)).join('')}</p><p class="mp-lv"><b>Lv.${lv}</b></p></div></div>
    <div class="mp-na"><button type="button" class="mp-nat" data-a="nat"><small>성격 <i class="mp-more">›</i></small><p><b>${natKo(e.nat)}</b></p></button><button type="button" class="mp-ab${ha ? ' ha' : ''}" data-a="ab"><small>특성 <i class="mp-more">›</i></small><p><b${ha ? ' class="ha"' : ''}>${abKo(e.ab)}</b>${ha ? '<em class="ha-tag">숨겨진</em>' : ''}</p></button></div>
    ${ivHex({ iv: e.iv }, e)}
    <div class="mp-mvh"><small>기술</small></div>
    <div class="mp-moves mp-line">${mv.map(x => mvRow(x, 'i' + x[0])).join('')}</div><button class="mp-x" data-a="x" aria-label="닫기">✕</button>`, (a, close) => {
    if (a === 'x') return close();
    if (a[0] === 'i' && a.length > 1) return mvInfo(a.slice(1));
    if (a === 'nat') return gymPop(`<h4>${natKo(e.nat)}</h4><p class="gy-msg nat-d">${nt[1] ? `<span class="nat-c up">${STAT_KO[nt[1]]} ▲</span><span class="nat-c dn">${STAT_KO[nt[2]]} ▼</span>` : '<span class="nat-c">능력 변화 없음</span>'}</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => c2());
    if (a === 'ab') return gymPop(`<h4>${abKo(e.ab)}${ha ? ' <em class="ha-tag">숨겨진 특성</em>' : ''}</h4><p class="gy-msg ab-d">${esc(AB_D?.[e.ab] || '효과 설명이 아직 없어요.')}</p><div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (b, c2) => c2()); });
}
// 기술 상세 (경완 2026-10-29): 정보 카드·창고에서 기술을 누르면. teach 가 있으면 '기술 가르치기'
function mvInfo(id, teach, lab = '기술 가르치기', onX) {
  const x = mvOf(id); if (!x) return; const n = S.gym?.tms?.[id] || 0;
  gymPop(`<h4 class="mi-h"><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png">${esc(x[1])}</h4><div class="mi-tg">${tyTag(x[2], x[3])}${teach && !onX ? `<span class="mi-own">가진 개수 ×${n}</span>` : ''}</div>
    <dl class="mi-st"><div><dt>위력</dt><dd>${x[4] || '—'}</dd></div><div><dt>명중</dt><dd>${x[5] && x[5] !== true ? x[5] : '—'}</dd></div><div><dt>PP</dt><dd>${x[6] || '—'}</dd></div></dl>
    <p class="gy-msg mi-d">${esc(x[8] || '설명이 아직 없어요.')}</p><div class="gy-btns${teach ? '' : ' one'}">${teach ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button class="main" data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') teach?.(); else onX?.(); });
}
// 이 포켓몬이 이 기술머신을 배울 수 있나 (이미 아는 기술은 못 배움)
const tmCan = (P, id) => (D.sp[P.sp]?.tm || []).some(i => D.mv[i]?.[0] === id) && !gm(P).mv.includes(id);
// 기술머신 하나를 P 에게: 기술이 4개면 잊을 기술 고르기(또는 익혀 두기만)
function teachTm(P, id, done, slot) {   // slot: 기술 바꾸기에서 고른 칸이면 그 자리에 바로
  const g = S.gym, m = gm(P), x = mvOf(id); if (!x || !(g.tms?.[id] > 0)) return done?.();
  const use = k => { g.tms[id] = (g.tms[id] || 0) - 1; if (g.tms[id] <= 0) delete g.tms[id]; m.kn = (m.kn || []).filter(y => y !== id);
    if (k == null) { if (!m.kn.includes(id)) m.kn.push(id); } else if (k >= m.mv.length) m.mv.push(id); else { const old = m.mv[k]; m.mv[k] = id; if (!m.kn.includes(old)) m.kn.push(old); }
    GA.save(); se('DECIDE'); gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} ${esc(x[1])}${jong(x[1]) ? '을' : '를'} ${k == null ? '익혀 두었다! (기술 바꾸기에서 쓸 수 있어요)' : '배웠다!'}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => { c(); done?.(); }); };
  if (slot != null) return use(Math.min(slot, m.mv.length));
  if (m.mv.length < 4) return use(m.mv.length);
  gymPop(`<h4>${esc(x[1])} 대신 잊을 기술</h4><p class="gy-msg">잊은 기술은 나중에 기술 바꾸기에서 다시 배울 수 있어요.</p><div class="mp-moves mp-line pick">${m.mv.map((y, k) => mvOf(y) ? mvRow(mvOf(y), 's' + k) : '').join('')}</div>
    <div class="gy-btns"><button data-a="keep">익혀 두기만</button><button data-a="x">그만두기</button></div>`, (b, c2) => { c2(); if (b === 'x') return done?.(); use(b === 'keep' ? null : +b.slice(1)); });
}
// 기술 가르치기 (경완 2026-10-29): 창고 기술머신 탭과 같은 화면. 가르칠 수 있는 것 먼저, 못 가르치는 건 회색
function tmPop(P, done, slot) {
  const g = S.gym; g.tms = g.tms || {};
  const L = Object.entries(g.tms).filter(([, n]) => n > 0).map(([id, n]) => [mvOf(id), n, id]).filter(([x]) => x).map(r => [...r, tmCan(P, r[2])]).sort((a, b) => (b[3] - a[3]) || ((b[0][4] || 0) - (a[0][4] || 0)));
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-storew tm-teach';
  el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">기술 가르치기</b></div>
    <div class="gy-body"><p class="tt-who">${thumb(P)}<span><b>${esc(nmOf(P))}</b>에게 가르칠 기술머신</span></p>${L.length ? `<div class="sp-list">${L.map(([x, n, id, ok]) => tmRow(x, n, id, !ok, ok ? '' : (gm(P).mv.includes(id) ? '이미 앎' : '못 배움'))).join('')}</div>` : '<p class="sf-none">가진 기술머신이 없어요. 상점에서 살 수 있어요.</p>'}</div>`;
  document.querySelector('#gym .gy-main').appendChild(el); fillTh(el);   // 하단 메뉴는 그대로 (경완 2026-10-29)
  el.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap');
    if (b.dataset.a === 'x') { el.remove(); return done?.(); }
    const id = b.dataset.tm; if (id) mvInfo(id, () => { el.remove(); teachTm(P, id, done, slot); }); };
}
const tmRow = (x, n, id, off, note) => `<button type="button" class="sp-tm${off ? ' off' : ''}" data-tm="${id}" ${off ? 'disabled' : ''}><img class="tm-ic" alt="" src="${IMG}bt/tm_${x[2]}.png"><span class="tm-nm"><b>${esc(x[1])}</b><i class="tm-own">×${n}</i></span><span class="tm-meta">${tyTag(x[2], x[3])}<small>위력 ${x[4] || '—'} · 명중 ${x[5] && x[5] !== true ? x[5] : '—'}${note ? ` · ${note}` : ''}</small></span></button>`;
// ---------- 지니는 도구 (경완 2026-10-29): 본가처럼 포켓몬에게 하나씩. 일회용(상처약·열매 등)은 없고 계속 효과 있는 것만. 그림은 PokeAPI/sprites items
// HOLD[id] = [이름, 가격, 설명, 타입 강화면 타입 번호]
const HOLD = {
  leftovers: ["먹다남은음식", 4000, "지니게 하면 매 턴 끝날 때마다 HP가 조금씩 회복된다.", 0],
  blacksludge: ["검은오물", 2500, "독 타입이 지니면 매 턴 HP가 회복된다. 다른 타입은 HP가 줄어든다.", 0],
  shellbell: ["조개껍질방울", 2500, "상대에게 준 대미지의 일부만큼 HP를 회복한다.", 0],
  choiceband: ["구애머리띠", 5000, "공격이 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  choicespecs: ["구애안경", 5000, "특수공격이 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  choicescarf: ["구애스카프", 5000, "스피드가 1.5배가 되지만 처음 고른 기술만 쓸 수 있다.", 0],
  lifeorb: ["생명의구슬", 5000, "공격 기술의 위력이 1.3배가 되지만 공격할 때마다 HP가 조금 줄어든다.", 0],
  expertbelt: ["달인의띠", 3500, "효과가 굉장한 기술의 위력이 1.2배가 된다.", 0],
  assaultvest: ["돌격조끼", 4500, "특수방어가 1.5배가 되지만 변화 기술을 쓸 수 없다.", 0],
  eviolite: ["진화의휘석", 4000, "아직 진화할 수 있는 포켓몬의 방어와 특수방어가 1.5배가 된다.", 0],
  rockyhelmet: ["울퉁불퉁멧", 3500, "접촉 기술로 공격한 상대에게 대미지를 준다.", 0],
  muscleband: ["힘의머리띠", 2500, "물리 기술의 위력이 조금 올라간다.", 0],
  wiseglasses: ["박식안경", 2500, "특수 기술의 위력이 조금 올라간다.", 0],
  scopelens: ["초점렌즈", 2500, "기술이 급소에 맞기 쉬워진다.", 0],
  widelens: ["광각렌즈", 2000, "기술의 명중률이 조금 올라간다.", 0],
  zoomlens: ["포커스렌즈", 2000, "상대보다 늦게 움직이면 명중률이 올라간다.", 0],
  kingsrock: ["왕의징표석", 2500, "공격하면 가끔 상대를 풀죽게 한다.", 0],
  quickclaw: ["선제공격손톱", 2500, "가끔 상대보다 먼저 움직일 수 있다.", 0],
  brightpowder: ["반짝가루", 2500, "상대 기술의 명중률이 조금 떨어진다.", 0],
  focusband: ["기합의머리띠", 2500, "쓰러질 만한 공격을 받아도 가끔 HP 1로 버틴다.", 0],
  lightclay: ["빛의점토", 2500, "리플렉터·빛의장막이 오래 간다.", 0],
  bigroot: ["큰뿌리", 2000, "HP를 흡수하는 기술로 회복하는 양이 늘어난다.", 0],
  metronome: ["메트로놈", 2000, "같은 기술을 이어서 쓸수록 위력이 올라간다.", 0],
  flameorb: ["화염구슬", 1500, "턴이 끝나면 지닌 포켓몬이 화상을 입는다.", 0],
  toxicorb: ["맹독구슬", 1500, "턴이 끝나면 지닌 포켓몬이 맹독에 걸린다.", 0],
  silkscarf: ["실크스카프", 1500, "노말 타입 기술의 위력이 조금 올라간다.", 1],
  blackbelt: ["검은띠", 1500, "격투 타입 기술의 위력이 조금 올라간다.", 2],
  sharpbeak: ["예리한부리", 1500, "비행 타입 기술의 위력이 조금 올라간다.", 3],
  poisonbarb: ["독바늘", 1500, "독 타입 기술의 위력이 조금 올라간다.", 4],
  softsand: ["부드러운모래", 1500, "땅 타입 기술의 위력이 조금 올라간다.", 5],
  hardstone: ["딱딱한돌", 1500, "바위 타입 기술의 위력이 조금 올라간다.", 6],
  silverpowder: ["은빛가루", 1500, "벌레 타입 기술의 위력이 조금 올라간다.", 7],
  spelltag: ["저주의부적", 1500, "고스트 타입 기술의 위력이 조금 올라간다.", 8],
  metalcoat: ["금속코트", 1500, "강철 타입 기술의 위력이 조금 올라간다.", 9],
  charcoal: ["목탄", 1500, "불꽃 타입 기술의 위력이 조금 올라간다.", 10],
  mysticwater: ["신비의물방울", 1500, "물 타입 기술의 위력이 조금 올라간다.", 11],
  miracleseed: ["기적의씨", 1500, "풀 타입 기술의 위력이 조금 올라간다.", 12],
  magnet: ["자석", 1500, "전기 타입 기술의 위력이 조금 올라간다.", 13],
  twistedspoon: ["휘어진스푼", 1500, "에스퍼 타입 기술의 위력이 조금 올라간다.", 14],
  nevermeltice: ["녹지않는얼음", 1500, "얼음 타입 기술의 위력이 조금 올라간다.", 15],
  dragonfang: ["용의이빨", 1500, "드래곤 타입 기술의 위력이 조금 올라간다.", 16],
  blackglasses: ["검은안경", 1500, "악 타입 기술의 위력이 조금 올라간다.", 17],
  fairyfeather: ["요정의깃털", 1500, "페어리 타입 기술의 위력이 조금 올라간다.", 18],
  // 열매 (경완 2026-10-31): 배틀에선 먹으면 없어지지만 지닌 도구(S.gym.mon[id].it)는 그대로 — 배틀은 늘 지닌 도구를 새로 넣고 시작한다
  oranberry: ["오렌열매", 800, "HP가 절반 이하가 되면 먹고 HP를 10 회복한다.", 0],
  sitrusberry: ["자뭉열매", 2500, "HP가 절반 이하가 되면 먹고 최대 HP의 1/4을 회복한다.", 0],
  lumberry: ["리샘열매", 3000, "상태 이상이나 혼란에 걸리면 먹고 낫는다.", 0],
  cheriberry: ["버치열매", 1000, "마비되면 먹고 낫는다.", 0],
  chestoberry: ["유루열매", 1000, "잠들면 먹고 깨어난다.", 0],
  pechaberry: ["복슝열매", 1000, "독에 걸리면 먹고 낫는다.", 0],
  rawstberry: ["복분열매", 1000, "화상을 입으면 먹고 낫는다.", 0],
  aspearberry: ["배리열매", 1000, "얼면 먹고 녹는다.", 0],
  persimberry: ["시몬열매", 1000, "혼란에 빠지면 먹고 낫는다.", 0],
  liechiberry: ["치리열매", 3000, "HP가 1/4 이하가 되면 먹고 공격이 오른다.", 0],
  ganlonberry: ["용아열매", 3000, "HP가 1/4 이하가 되면 먹고 방어가 오른다.", 0],
  salacberry: ["캄라열매", 3000, "HP가 1/4 이하가 되면 먹고 스피드가 오른다.", 0],
  petayaberry: ["야타비열매", 3000, "HP가 1/4 이하가 되면 먹고 특수공격이 오른다.", 0],
  apicotberry: ["규살열매", 3000, "HP가 1/4 이하가 되면 먹고 특수방어가 오른다.", 0],
  chilanberry: ["카리열매", 2000, "노말 타입 기술에 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  chopleberry: ["로플열매", 2000, "격투 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  cobaberry: ["바코열매", 2000, "비행 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  kebiaberry: ["으름열매", 2000, "독 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  shucaberry: ["슈캐열매", 2000, "땅 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  chartiberry: ["루미열매", 2000, "바위 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  tangaberry: ["리체열매", 2000, "벌레 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  kasibberry: ["수불열매", 2000, "고스트 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  babiriberry: ["바리비열매", 2000, "강철 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  occaberry: ["오카열매", 2000, "불꽃 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  passhoberry: ["꼬시개열매", 2000, "물 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  rindoberry: ["린드열매", 2000, "풀 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  wacanberry: ["초나열매", 2000, "전기 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  payapaberry: ["야파열매", 2000, "에스퍼 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  yacheberry: ["플카열매", 2000, "얼음 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  habanberry: ["하반열매", 2000, "드래곤 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  colburberry: ["마코열매", 2000, "악 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0],
  roseliberry: ["로셀열매", 2000, "페어리 타입 기술에 효과가 굉장하게 맞을 때 먹고 대미지를 반으로 줄인다.", 0]
};
// 상점·창고 분류 (경완 2026-10-31 '민트처럼 항목 분류')
const IT_CAT = [['heal', '회복', ['leftovers', 'blacksludge', 'shellbell']], ['atk', '공격 강화', ['choiceband', 'choicespecs', 'lifeorb', 'expertbelt', 'muscleband', 'wiseglasses', 'metronome']],
  ['def', '방어·스피드', ['choicescarf', 'assaultvest', 'eviolite', 'rockyhelmet', 'focusband', 'lightclay']], ['acc', '명중·급소', ['scopelens', 'widelens', 'zoomlens', 'brightpowder', 'kingsrock', 'quickclaw']],
  ['etc', '특수', ['bigroot', 'flameorb', 'toxicorb']], ['type', '타입 강화', Object.keys(HOLD).filter(k => HOLD[k][3])], ['berry', '열매', Object.keys(HOLD).filter(k => /berry$/.test(k))]];
const itImg = id => `${IMG}item/${id}.png`;
const itRow = (id, n, note) => { const x = HOLD[id]; return `<button type="button" class="sp-tm sp-it" data-it="${id}"><img class="tm-ic it-ic" alt="" src="${itImg(id)}"><span class="tm-nm"><b>${esc(x[0])}</b>${n ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta"><small>${esc(x[2])}</small>${note ? `<em class="it-note">${note}</em>` : ''}</span></button>`; };
// 도구는 종류마다 하나만 (경완 2026-10-29): 창고에 있거나 누가 지니고 있으면 가진 것
const itWho = id => { const M = S.gym?.mon || {}; for (const k in M) if (M[k]?.it === id) { const P = boxOf(+k || k); if (P) return P; } return null; };
const itHave = id => (S.gym?.itm?.[id] > 0) || !!itWho(id);
// 가진 도구 전부: [id, 지닌 포켓몬|null]. 창고에 있는 것 먼저
const itAll = () => { const g = S.gym || {}, bag = Object.entries(g.itm || {}).filter(([id, n]) => n > 0 && HOLD[id]).map(([id]) => [id, null]), M = g.mon || {}, held = [];
  for (const k in M) { const id = M[k]?.it, P = id && HOLD[id] && boxOf(+k || k); if (P) held.push([id, P]); } return [...bag, ...held]; };
// 지닌 도구 카드: 회색 + 지닌 포켓몬 그림 + 돌려받기 (어느 화면에서든)
const itRowAll = ([id, P]) => { if (!P) return itRow(id); const x = HOLD[id];
  return `<div class="sp-tm sp-it held"><img class="tm-ic it-ic" alt="" src="${itImg(id)}"><span class="tm-nm"><b>${esc(x[0])}</b></span><span class="tm-meta it-who"><span class="it-wth"><img alt="" data-th="${P.id}"></span><small>${esc(nmOf(P))}${jong(nmOf(P)) ? '이' : '가'} 지니고 있어요</small></span><button type="button" class="it-back" data-takeit="${P.id}">돌려받기</button></div>`; };
// 도구 상세 카드: btn = [글자, 누르면] (없으면 닫기만)
function itInfo(id, lab, act, foot = '') {
  const x = HOLD[id]; if (!x) return; const n = S.gym?.itm?.[id] || 0;
  gymPop(`<h4 class="mi-h"><img class="tm-ic it-ic" alt="" src="${itImg(id)}">${esc(x[0])}</h4>${foot}<p class="gy-msg mi-d">${esc(x[2])}</p><div class="gy-btns${lab ? '' : ' one'}">${lab ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button class="main" data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') act?.(); });
}
// 지니게 하기: 이미 지닌 도구는 창고로 돌아온다
function giveIt(P, id) {
  const g = S.gym, m = gm(P); g.itm = g.itm || {}; if (!(g.itm[id] > 0)) return;
  g.itm[id]--; if (!g.itm[id]) delete g.itm[id];
  const old = m.it; if (old) g.itm[old] = (g.itm[old] || 0) + 1; m.it = id; GA.save(); se('DECIDE');
  gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}에게 ${esc(HOLD[id][0])}${jong(HOLD[id][0]) ? '을' : '를'} 지니게 했다!${old ? `<br><small>${esc(HOLD[old]?.[0] || '')}${jong(HOLD[old]?.[0] || '') ? '은' : '는'} 창고로 돌아갔어요.</small>` : ''}</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => c());
}
function takeIt(P) { const g = S.gym, m = gm(P), id = m.it; if (!id) return; g.itm = g.itm || {}; g.itm[id] = (g.itm[id] || 0) + 1; delete m.it; GA.save(); }
// 민트 (경완 2026-10-30 '성격 바꾸는 본가 도구'): 먹으면 성격이 바뀐다. 지니는 도구와 달리 먹으면 없어지고 여러 개 살 수 있음. g.mint = {성격: 개수}
const MINT_P = 3000, MINT = ['lonely', 'adamant', 'naughty', 'brave', 'bold', 'impish', 'lax', 'relaxed', 'modest', 'mild', 'rash', 'quiet', 'calm', 'gentle', 'careful', 'sassy', 'timid', 'hasty', 'jolly', 'naive', 'serious'];
const ro = w => { const j = jong(w); return j && j !== 8 ? '으로' : '로'; };
const mintNm = k => `${natKo(k)}민트`, mintImg = k => `${IMG}item/mint_${k}.png`;
const mintD = k => { const n = D?.nt?.[k] || []; return `먹이면 성격이 ${natKo(k)}${ro(natKo(k))} 바뀐다. ${n[1] ? `${STAT_KO[n[1]]}${jong(STAT_KO[n[1]]) ? '이' : '가'} 잘 오르고 ${STAT_KO[n[2]]}${jong(STAT_KO[n[2]]) ? '이' : '가'} 잘 오르지 않게 된다.` : '능력이 고르게 오르게 된다.'}`; };
const mintAll = () => Object.entries(S.gym?.mint || {}).filter(([k, n]) => n > 0 && MINT.includes(k)).sort((a, b) => MINT.indexOf(a[0]) - MINT.indexOf(b[0]));
const mintRow = (k, n, P) => { const same = P && gm(P).nat === k; return `<button type="button" class="sp-tm sp-it sp-mint${same ? ' off' : ''}" data-mint="${k}" ${same ? 'disabled' : ''}><img class="tm-ic it-ic" alt="" src="${mintImg(k)}"><span class="tm-nm"><b>${esc(mintNm(k))}</b>${n ? `<i class="tm-own">×${n}</i>` : ''}</span><span class="tm-meta"><small>${same ? '지금 성격' : esc(D?.nt?.[k]?.[1] ? `${STAT_KO[D.nt[k][1]]}▲ ${STAT_KO[D.nt[k][2]]}▼` : '변화 없음')}</small></span></button>`; };
function mintInfo(k, lab, act, foot = '') {
  gymPop(`<h4 class="mi-h"><img class="tm-ic it-ic" alt="" src="${mintImg(k)}">${esc(mintNm(k))}</h4>${foot}<p class="gy-msg mi-d">${esc(mintD(k))}</p><div class="gy-btns${lab ? '' : ' one'}">${lab ? `<button data-a="x">닫기</button><button class="main" data-a="t">${lab}</button>` : '<button data-a="x">닫기</button>'}</div>`,
    (a, close) => { close(); if (a === 't') act?.(); });
}
function mintUse(P, k) {
  const g = S.gym, m = gm(P); g.mint = g.mint || {}; if (!(g.mint[k] > 0) || m.nat === k) return;
  if (!--g.mint[k]) delete g.mint[k]; m.nat = k; GA.save(); se('DECIDE');
  gymPop(`<p class="gy-msg" style="text-align:center">${esc(nmOf(P))}${jong(nmOf(P)) ? '은' : '는'} ${esc(mintNm(k))}${jong(mintNm(k)) ? '을' : '를'} 먹었다!<br>성격이 ${esc(natKo(k))}${ro(natKo(k))} 바뀌었다!</p><div class="gy-btns one"><button class="main" data-a="x">확인</button></div>`, (b, c) => c());
}
// 창고 민트 → 먹이기 → 포켓몬 박스에서 고르기
function mintPick(k, done) {
  boxWin(false, null, done, { title: () => `민트 먹이기 · ${esc(mintNm(k))}`, tip: `${TYPE_KO[S.gym.ty]} 타입 포켓몬만 보여요`, list: () => S.box.filter(tyOk), ok: P => gm(P).nat !== k, first: P => curLu().includes(P.id),
    tag: P => natKo(gm(P).nat), pick: (P, w) => { w.close(); mintUse(P, k); done?.(); } });
}
// 도구 사용 (경완 2026-10-29 '기술 가르치기 > 도구 사용'): 창고와 같은 화면, 탭은 기술머신·도구
let useT = 'tm';
function usePop(P, done) {
  const g = S.gym; g.tms = g.tms || {}; g.itm = g.itm || {};
  const el = document.createElement('section'); el.className = 'gy-setup gy-infos gy-storew tm-teach';
  const draw = () => { const m = gm(P), it = m.it;
    const TL = Object.entries(g.tms).filter(([, n]) => n > 0).map(([id, n]) => [mvOf(id), n, id]).filter(([x]) => x).map(r => [...r, tmCan(P, r[2])]).sort((a, b) => (b[3] - a[3]) || ((b[0][4] || 0) - (a[0][4] || 0)));
    const IL = itAll(), ML = mintAll();
    const T = [['tm', '기술머신', TL.reduce((a, r) => a + r[1], 0)], ['it', '도구', IL.length + ML.reduce((a, r) => a + r[1], 0)]];
    const body = useT === 'tm' ? (TL.length ? `<div class="sp-list">${TL.map(([x, n, id, ok]) => tmRow(x, n, id, !ok, ok ? '' : (m.mv.includes(id) ? '이미 앎' : '못 배움'))).join('')}</div>` : '<p class="sf-none">가진 기술머신이 없어요. 상점에서 살 수 있어요.</p>')
      : (IL.length + ML.length ? `<div class="sp-list">${IL.map(itRowAll).join('')}${ML.map(([k, n]) => mintRow(k, n, P)).join('')}</div>` : '<p class="sf-none">가진 도구가 없어요. 상점에서 살 수 있어요.</p>');
    el.innerHTML = `<div class="gy-sh"><button class="gy-back" type="button" data-a="x" aria-label="뒤로">◀</button><b class="if-t">도구 사용</b></div>
      <div class="gy-body"><p class="tt-who">${thumb(P)}<span><b>${esc(nmOf(P))}</b>${it && HOLD[it] ? `<small class="it-hold">지닌 도구 · ${esc(HOLD[it][0])}</small>` : '<small class="it-hold">지닌 도구 없음</small>'}</span>${it ? '<button type="button" class="it-take" data-take>돌려받기</button>' : ''}</p>
      <div class="sp-tabs st-tabs" role="tablist">${T.map(([k, n, c]) => `<button type="button" role="tab" data-ut="${k}" aria-selected="${useT === k}">${n} <small>${c}</small></button>`).join('')}</div>${body}</div>`;
    fillTh(el); };
  document.querySelector('#gym .gy-main').appendChild(el); draw();   // 하단 메뉴는 그대로
  el.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sfx('tap');
    if (b.dataset.a === 'x') { el.remove(); return done?.(); }
    if (b.dataset.ut) { useT = b.dataset.ut; return draw(); }
    if (b.hasAttribute('data-take')) { takeIt(P); return draw(); }
    if (b.dataset.takeit) { const Q = boxOf(+b.dataset.takeit || b.dataset.takeit); if (Q) { takeIt(Q); se('DECIDE'); } return draw(); }
    if (b.dataset.tm) { const id = b.dataset.tm; return mvInfo(id, () => teachTm(P, id, draw)); }
    if (b.dataset.it) { const id = b.dataset.it; return itInfo(id, '지니게 하기', () => { giveIt(P, id); draw(); }); }
    if (b.dataset.mint) { const k = b.dataset.mint; return mintInfo(k, '먹이기', () => { mintUse(P, k); draw(); }); } };
}
// 창고 도구 → 지니게 하기 → 포켓몬 박스에서 고르기
function itPick(id, done) {
  boxWin(false, null, done, { title: () => `도구 지니게 하기 · ${esc(HOLD[id][0])}`, tip: `${TYPE_KO[S.gym.ty]} 타입 포켓몬만 보여요`, list: () => S.box.filter(tyOk), ok: () => true, first: P => curLu().includes(P.id),
    tag: P => { const it = S.gym.mon?.[P.id]?.it; return it && HOLD[it] ? HOLD[it][0] : ''; },
    pick: (P, w) => { w.close(); giveIt(P, id); done?.(); } });
}
// 창고 기술머신 → 기술 가르치기 → 가르칠 포켓몬 고르기 (경완 2026-10-29): 포켓몬 박스와 같은 화면, 배울 수 있는 포켓몬 먼저
function teachPick(id, done) { boxWin(false, id, done); }
// 위력·명중·PP 는 칸을 나눠 줄마다 같은 열에 (경완 2026-10-29)
const mvSt = x => `<em class="mv-st"><i>위력 <b>${x[4] || '—'}</b></i><i>명중 <b>${x[5] && x[5] !== true ? x[5] : '—'}</b></i><i>PP <b>${x[6] || '—'}</b></i></em>`;
// 기술 줄 = 정보 카드 기술 줄과 같은 모양 (경완 2026-10-29 '기술 바꾸기 카드도 상세 카드랑 동일하게')
const mvRow = (x, a) => `<button type="button" class="mp-mv" data-a="${a}" style="--tc:${GA.TYPE_C?.[x[2]] || '#888'}">${tyTag(x[2], x[3])}<b>${esc(x[1])}</b>${mvSt(x)}</button>`;
// 기술 바꾸기: 잊을 기술(또는 빈 칸)을 고르고 → 배울 기술을 고른다. 잊은 기술은 '아는 기술'로 남아 다시 배울 수 있다
// 기술 순서 (경완 2026-10-29): 기술 줄을 꾹 눌러 위아래로 끌면 순서가 바뀐다
function movesPop(P, done, hi = -1) {   // hi: 방금 바꾼 칸 — 테두리가 한 번 빛나고, 창 안 다른 곳을 누르면 꺼진다 (경완 2026-10-31)
  const m = gm(P), C = mvCands(P, m).map(id => [id, mvOf(id)]).filter(([, x]) => x).sort((a, b) => (a[1][2] - b[1][2]) || ((b[1][4] || 0) - (a[1][4] || 0))).map(([id]) => id);   // 배울 기술은 타입순 (경완 2026-10-29)
  let drag = 0, ord = false;
  // 안내 줄 오른쪽 '순서 바꾸기' (경완 2026-10-30): 누르면 길게 누르지 않고 바로 끌어서 순서를 바꾸고, '완료'로 끝
  const p = gymPop(`<h4>${esc(nmOf(P))}의 기술</h4><div class="mv-hd"><p class="gy-msg">바꿀 기술을 고르세요</p>${m.mv.length > 1 ? '<button type="button" class="mv-ordb" data-a="ord">순서 바꾸기</button>' : ''}</div>
    <div class="mp-moves mp-line pick mv-ord">${m.mv.map((id, i) => mvOf(id) ? mvRow(mvOf(id), 's' + i).replace('class="mp-mv"', `class="mp-mv${i === hi ? ' just' : ''}"`) : '').join('')}${m.mv.length < 4 ? `<button class="mp-mv empty" data-a="s${m.mv.length}"><b>빈 칸</b></button>` : ''}</div>
    <div class="gy-btns one"><button class="main" data-a="x">닫기</button></div>`, (a, close, btn) => {
    if (a === 'ord') { ord = !ord; list.classList.toggle('on', ord); btn.textContent = ord ? '완료' : '순서 바꾸기'; btn.classList.toggle('on', ord); p.querySelector('.mv-hd .gy-msg').textContent = ord ? '기술을 끌어서 순서를 바꾸세요' : '바꿀 기술을 고르세요'; return; }
    if (drag || (ord && a !== 'x')) return;
    if (a === 'x') { close(); return done?.(); }
    const k = +a.slice(1), old = m.mv[k];
    // 지금 기술을 누르면 먼저 상세 카드, 거기서 '기술 바꾸기'를 눌러야 배울 기술 고르기로 (경완 2026-10-30). 빈 칸은 바로
    // 상세 카드는 기술 창을 닫지 않고 그 위에 뜬다 (뒤는 흐리게, 경완 2026-10-31)
    if (old) return mvInfo(old, () => { close(); pickNew(k, old); }, '기술 바꾸기', () => {});
    close(); pickNew(k, old);
  });
  function pickNew(k, old) {
    if (!C.length) { gymPop(`<h4>기술 바꾸기</h4><p class="gy-msg">지금 배울 수 있는 다른 기술이 없어요. 레벨을 올리거나 기술머신·훈련장에서 익혀 보세요.</p><div class="gy-btns"><button data-a="x">닫기</button><button class="main" data-a="tm">기술 가르치기</button></div>`, (b, c2) => { c2(); if (b === 'tm') return tmPop(P, () => movesPop(P, done), k); movesPop(P, done); }); return; }
    // 배울 기술을 누르면 바로 바뀌지 않고 상세 창 → '바꾸기' (경완 2026-10-29)
    const learn = () => gymPop(`<h4>${old ? `${esc(mvKo(old))} 대신` : '새로'} 배울 기술</h4><div class="mp-moves mp-line pick mv-learn">${C.map(id => mvRow(mvOf(id), 'n' + id)).join('')}</div><div class="gy-btns"><button data-a="x">뒤로</button><button class="main" data-a="tm">기술 가르치기</button></div>`, (b, c2) => {
      if (b === 'x') { c2(); return movesPop(P, done); }
      if (b === 'tm') { c2(); return tmPop(P, () => movesPop(P, done, Math.min(k, gm(P).mv.length - 1)), k); }   // 기술머신으로 이 칸에 가르치기 (경완 2026-10-29)
      const id = b.slice(1);
      mvInfo(id, () => { c2(); m.kn = (m.kn || []).filter(x => x !== id); if (old) { m.mv[k] = id; if (!m.kn.includes(old)) m.kn.push(old); } else m.mv.push(id); GA.save(); se('DECIDE'); movesPop(P, done, old ? k : m.mv.length - 1); }, old ? '바꾸기' : '배우기', () => {}); });
    learn();
  }
  const list = p.querySelector('.mv-ord'); let lp = null;
  if (hi >= 0) p.addEventListener('pointerdown', () => p.querySelector('.mp-mv.just')?.classList.remove('just'), { once: true });
  const end = () => { if (!lp) return; clearTimeout(lp.t); const on = lp.on; lp.b.classList.remove('drag'); lp = null; if (!on) return;
    const rows = [...list.querySelectorAll('.mp-mv:not(.empty)')], o2 = rows.map(b => +b.dataset.a.slice(1)), mv0 = m.mv.slice();
    m.mv = o2.map(i => mv0[i]); GA.save();
    if (ord) { rows.forEach((b, i) => { b.dataset.a = 's' + i; }); setTimeout(() => { drag = 0; }, 0); return; }   // 순서 바꾸기 중엔 창을 그대로 두고 번호만 새로
    setTimeout(() => { drag = 0; p.remove(); movesPop(P, done); }, 0); };
  list.addEventListener('contextmenu', e => e.preventDefault());
  list.addEventListener('pointerdown', e => { const b = e.target.closest('.mp-mv:not(.empty)'); if (!b || m.mv.length < 2) return;
    addEventListener('pointerup', end, { once: true }); addEventListener('pointercancel', end, { once: true });
    if (ord) { e.preventDefault(); lp = { b, y: e.clientY, on: true }; drag = 1; b.classList.add('drag'); sfx('tap'); return; }
    lp = { b, y: e.clientY, on: false, t: setTimeout(() => { if (!lp) return; lp.on = true; drag = 1; b.classList.add('drag'); sfx('tap'); try { navigator.vibrate?.(15); } catch (e) {} }, 380) }; });
  list.addEventListener('pointermove', e => { if (!lp) return;
    if (!lp.on) { if (Math.abs(e.clientY - lp.y) > 8) { clearTimeout(lp.t); lp = null; } return; }
    e.preventDefault(); const rows = [...list.querySelectorAll('.mp-mv:not(.empty)')];
    for (const r of rows) { if (r === lp.b) continue; const R = r.getBoundingClientRect(); if (e.clientY > R.top && e.clientY < R.bottom) { const i = rows.indexOf(r), j = rows.indexOf(lp.b); r.parentNode.insertBefore(lp.b, i > j ? r.nextSibling : r); break; } } });
}
// 연습 배틀: 라인업 평균 레벨 근처의 아무 트레이너
async function practice() {
  const ids = curLu(); if (!ids.length) return; const my = ids.map(boxOf).filter(Boolean);
  const avg = Math.round(my.reduce((s, P) => s + gm(P).lv, 0) / my.length);
  const T = pick(PRACTICE), n = clampN(Math.round(rnd(1, Math.min(3, my.length) + .4)), 1, 3);
  const team = Array.from({ length: n }, () => foeEntry(pick(T.sp), clampN(avg + Math.round(rnd(-3, 1)), 2, 100)));
  // 연습 배틀도 끝나면 상대가 한마디 (경완 2026-10-28)
  const say = { win: pick(['으윽, 연습이라도 지는 건 분하네요!', '덕분에 좋은 연습이 됐어요!', '역시 관장님 포켓몬은 강하네요.', '다음 연습 땐 꼭 이길게요!']), lose: pick(['연습이라도 이긴 건 이긴 거죠!', '오늘은 제가 한 수 위였네요!', '좋은 연습 상대가 되어 드렸나요?']) };
  const foe = { tr: T.tr, cls: TR_KO[T.tr] || '트레이너', nm: pick(T.f ? NAMES_F : NAMES_M), team, say };
  document.body.classList.add('gymBattle');
  // 연습 배틀은 보상·경험치 연출 없음 (v13.04 경완)
  try { await run({ my, foe, diff: 1, practice: true, bg: pick(['in1', 'in2', 'in3']) }); }
  catch (e) { console.error(e); GA.toast?.('배틀을 시작하지 못했어요'); }
  finally { document.body.classList.remove('gymBattle'); drawTab(); }
}

window.GymBattle = { HOLD, IT_CAT, MINT, MINT_P, mintNm, mintImg, mintAll, mintRow, mintInfo, mintPick, itImg, itRow, itAll, itRowAll, itHave, takeIt, itInfo, itPick, giveIt, usePop, tab, run, loadData, loadSim, gm, lus, gainXp, teach, movesPop, tmPop, mvCands, mvOf, mvKo, foeEntry, xpAt, growth, curLu, boxOf, thumb, fillTh, gymPop, tyTag, gifUrl, pkSrc, mvRow, TR_KO, NAMES_M, NAMES_F, LV_MAX, get D() { return D; }, _xpAt: xpAt, _psSet: psSet, _stFx: (s, t, h) => stFx(s, t, h), _confFx: s => confFx(s), _monPop: (i, b, u, l) => monPop(i, b, u, l), mvInfo, foePop, teachPick, tmRow, teachTm, tmCan, boxWin, _abPop: (i, a) => abPop(i, a), _foeEntry: foeEntry, _ai: aiChoice, get _B() { return B; }, _fg: (L, n) => forgetPanel(L, n) };
})();
