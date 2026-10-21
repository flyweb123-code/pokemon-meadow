// 뉴트럴의 조언 (v8.13 경완): 생활 패턴이 다른 100명이 90일 동안 게임을 한다고 치고 돌려 보는 시뮬레이터
// 작업실(브라우저)과 매일 도는 Claude 루틴(tools/neutral-run.js, 헤드리스 작업실) 모두 이 파일 하나를 쓴다.
// 씨앗이 고정이라 같은 값이면 늘 같은 결과 → 값을 바꾼 효과만 비교된다.
(function (root) {
  'use strict';
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const med = L => { const a = L.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const pick = (r, L) => { let x = r() * L.reduce((a, o) => a + o[1], 0); for (const o of L) if ((x -= o[1]) <= 0) return o[0]; return L[L.length - 1][0]; };

  // 생활 패턴 (n = 100명 중 몇 명). wd/we = 평일/주말 하루 km, run = 달리기 비율, care = 돌봄(0~1), mg = 하루 미니게임 판 수, sc = 평균 점수, on = 접속하는 날 비율
  const PERSONAS = [
    { id: 'home', n: 15, name: '집순이', d: '거의 집에 있고, 포켓몬을 자주 돌봐요', wd: 1.2, we: 2, run: 0, care: .9, mg: 3, sc: 2000, on: .95 },
    { id: 'commute', n: 25, name: '출퇴근', d: '평일엔 출퇴근길 5km, 주말엔 조금', wd: 5, we: 2, run: 0, care: .5, mg: 1, sc: 2500, on: .9 },
    { id: 'walk', n: 15, name: '산책 매니아', d: '매일 8km 넘게 걸어요', wd: 8, we: 9, run: 0, care: .7, mg: 1, sc: 2500, on: .95 },
    { id: 'run', n: 10, name: '러너', d: '일주일에 네 번 10km 달리기', wd: 6, we: 8, run: .8, care: .4, mg: .5, sc: 2500, on: .9 },
    { id: 'wkend', n: 15, name: '주말 몰아서', d: '평일엔 거의 안 걷고 주말에 12km', wd: 1, we: 12, run: 0, care: .4, mg: 1, sc: 2500, on: .85 },
    { id: 'mg', n: 10, name: '미니게임 덕후', d: '많이는 안 걷고 미니게임을 하루 8판', wd: 2, we: 2.5, run: 0, care: .8, mg: 8, sc: 3500, on: .95 },
    { id: 'casual', n: 10, name: '가끔 접속', d: '사흘에 한 번쯤 켜고 3km', wd: 3, we: 3, run: 0, care: .2, mg: .5, sc: 1800, on: .4 },
  ];
  const MQ_DAY = [[5, 50], [3, 50], [3000, 60]], MQ_TY = [[1500, 100], [3000, 220], [5000, 400], [7000, 650], [10000, 1000]];
  const MQ_PLAY = [[5, 30], [20, 80], [50, 160], [100, 300], [300, 800]], MQ_SUM = [[20000, 60], [100000, 200], [300000, 500], [1000000, 1200]];
  const EVO_FR = [0, 30, 60];

  // model = { odds[5], pity{e,l}, b{밸런스 전부}, probs{g: [[sp, p]]}, SP{sp: {t, fr, kids, ev, eqx, gb(바탕 종 등급), st(진화 단계)}}, price{도구 이름: G} }
  function evoWay(model, c) { const ev = model.SP[c]?.ev || ''; if (!ev || ev.startsWith('fr')) return { k: ev ? 'fr' : 'km' };
    if (ev.includes('통신교환')) return { k: 'item', p: model.price['연결의끈'] ?? 1500 };
    for (const [n, p] of Object.entries(model.price)) if (ev.startsWith(n)) return { k: 'item', p };
    return null; }
  // 얻을 수 있는 종 = 알에서 나오는 종 + 진화로 갈 수 있는 종
  function reach(model) { const S = new Set(); for (let g = 1; g <= 5; g++) for (const [sp] of model.probs[g] || []) S.add(+sp);
    const q = [...S]; while (q.length) { const s = q.pop(); for (const c of model.SP[s]?.kids || []) if (!S.has(c) && evoWay(model, c)) { S.add(c); q.push(c); } } return S; }

  function simUser(model, P, seed, days, R) {
    const r = rng(seed), b = model.b, odds = model.odds, HK = b.HATCH_KM, mul = .6 + r() * .9, scM = .75 + r() * .6;
    const sub = .25, per = sub / (b.BAG_STEP || .25), EVN = [0, 5, 10, 15, 20, 25];
    const U = { p: P.id, dex: new Set(), box: [], bag: [], inc: [], pe: 0, pl: 0, gold: 0, gs: { hatch: 0, run: 0, mg: 0, mq: 0, evo: 0 }, spent: 0, buy: 0, evo: 0, sh: 0, eggs: 0, hatched: 0, km: 0,
      fE: null, fL: null, d: {}, bud: [], frD: {}, q: { n: 0, sum: 0, ty: {}, cl: {} } };
    const addG = (k, v) => { U.gold += v; U.gs[k] += v; };
    const getMon = (sp, day) => { const isNew = !U.dex.has(sp); U.dex.add(sp); const m = { sp, fr: 0, km: 0, sex: r() < .5 ? 'f' : 'm', d: day }; U.box.push(m); return [m, isNew]; };
    const kidsOk = (m, cond) => (model.SP[m.sp]?.kids || []).filter(c => { const d = model.SP[c]; if (!d) return false; if (d.eqx && (d.eqx === 1 ? 'f' : 'm') !== m.sex) return false; const w = evoWay(model, c); return w && cond(w, c); });
    const evolve = (m, c, day) => { m.sp = c; m.km = 0; m.fr = Math.min(b.FR_MAX, m.fr + (EVO_FR[model.SP[c].st] || 0)); U.evo++; if (!U.dex.has(c)) { U.dex.add(c); addG('evo', b.NEW_G); } };
    const need = m => model.SP[m.sp]?.ek || EVN[model.SP[m.sp]?.gb || 1] * (model.SP[m.sp]?.st ? 1.5 : 1);
    // 짝꿍(최대 3): 거리로 아직 못 본 종으로 진화할 수 있는 포켓몬을 고른다. 첫째 칸은 아끼는 포켓몬(친밀도 기록)
    const fillBud = () => { while (U.bud.length < 3) { const m = U.box.find(o => !U.bud.includes(o) && kidsOk(o, (w, c) => w.k !== 'item' && !U.dex.has(c)).length); if (!m) break; U.bud.push(m); } };
    for (let day = 1; day <= days; day++) {
      const wk = day % 7 === 6 || day % 7 === 0, on = r() < P.on;
      let km = 0;
      if (on) { const base = wk ? P.we : P.wd; km = base * mul * (.6 + r() * .8); }
      const runKm = km * P.run; U.km += km;
      if (runKm) addG('run', Math.round(runKm * b.RUN_G));
      // 250m 마다: 알 줍기 → 부화기 채우기 → 부화기의 모든 알이 같이 걷는다
      for (let left = km; left > 1e-9; left -= sub) {
        const st = Math.min(sub, left); U.pe += st; U.pl += st;
        let n = per < 1 ? (r() < per * st / sub ? 1 : 0) : Math.floor(r() * (2 * per + 1) * st / sub);
        n = Math.min(n, b.MAX_BAG - U.bag.length);
        for (let i = 0; i < n; i++) { let x = r(), g = 5; for (let j = 0; j < 5; j++) if ((x -= odds[j]) <= 0) { g = j + 1; break; }
          if (U.pl >= model.pity.l) g = 5; else if (U.pe >= model.pity.e) g = Math.max(g, 4);
          if (g === 5) U.pl = 0; if (g >= 4) U.pe = 0; U.bag.push(g); U.eggs++; }
        while (U.inc.length < b.MAX_EGGS && U.bag.length) { const g = U.bag.shift(); U.inc.push({ g, km: 0, need: HK[g] }); }
        for (const e of U.inc) e.km += st;
        for (let i = U.inc.length - 1; i >= 0; i--) { const e = U.inc[i]; if (e.km < e.need) continue; U.inc.splice(i, 1); U.hatched++;
          const sp = +pick(r, model.probs[e.g]), [, isNew] = getMon(sp, day); addG('hatch', isNew ? b.NEW_EGG_G[e.g] : b.DUP_G[e.g]);
          if (r() < 1 / (b.SHINY_N || 4096)) U.sh++;
          if (e.g >= 4 && U.fE == null) U.fE = day; if (e.g === 5 && U.fL == null) U.fL = day; }
      }
      fillBud();
      // 친밀도: 짝꿍들은 필드에 있다고 친다 (필드 시간 + 열매 + 쓰다듬기 + 빗질 + 짝꿍 거리)
      if (on || P.care > .6) {
        const T = b.FR_TABLE, gauge = 30 + P.care * 60, rate = (T.find(([v]) => gauge >= v) || T[T.length - 1])[1];
        const fld = Math.min(b.FLD_FR_DAY, Math.floor(rate * 24)), berry = on ? Math.round(b.BERRY_FR_DAY * P.care) : 0, pet = on ? Math.round(b.PET_DAY * P.care) * b.PET_FR : 0;
        const wash = on && P.care > .3 && day % (b.CLEAN_DAYS || 3) === 0 ? b.WASH_FR1 : 0;
        U.bud.forEach((m, i) => { m.fr = Math.min(b.FR_MAX, m.fr + fld + berry + pet + wash + Math.floor(km * b.WALK_FR)); m.km += km; });
      }
      // 미니게임: 골드는 점수 30점마다 1G, 친밀도는 첫째 짝꿍에게
      if (on && P.mg) { let n = Math.floor(P.mg) + (r() < P.mg % 1 ? 1 : 0), best = 0, cnt = 0;
        for (let i = 0; i < n; i++) { const s = Math.round(P.sc * scM * (.5 + r())), m = U.bud[i % Math.max(1, U.bud.length)] || U.box[0]; if (!m) break; cnt++;
          addG('mg', Math.floor(s / 30)); best = Math.max(best, s); U.q.n++; U.q.sum += s;
          const frB = s >= 2000 ? Math.floor(s / 1000) : s >= 300 ? 1 : 0; if (U.bud[0]) U.bud[0].fr = Math.min(b.FR_MAX, U.bud[0].fr + (i < 5 ? frB : frB ? 1 : 0));
          for (const t of model.SP[m.sp]?.t || []) U.q.ty[t] = Math.max(U.q.ty[t] || 0, s); }
        if (cnt >= MQ_DAY[0][0]) addG('mq', MQ_DAY[0][1]); if (cnt >= MQ_DAY[1][0] && new Set(U.box.map(o => o.sp)).size >= 3) addG('mq', MQ_DAY[1][1]); if (best >= MQ_DAY[2][0]) addG('mq', MQ_DAY[2][1]);
        const claim = (id, v, L) => L.forEach(([x, gG], j) => { const k = id + j; if (v >= x && !U.q.cl[k]) { U.q.cl[k] = 1; addG('mq', gG); } });
        claim('play', U.q.n, MQ_PLAY); claim('sum', U.q.sum, MQ_SUM); for (const [t, v] of Object.entries(U.q.ty)) claim('ty' + t, v, MQ_TY); }
      // 진화: 거리·친밀도 진화는 짝꿍, 도구 진화는 돈이 되면 상점에서 사서
      for (const m of [...U.bud]) { const L = kidsOk(m, (w, c) => w.k === 'km' || (w.k === 'fr' && m.fr >= b.FR_EVO)); if (L.length && m.km >= need(m)) { evolve(m, L.find(c => !U.dex.has(c)) ?? L[0], day);
          if (!kidsOk(m, (w, c) => w.k !== 'item' && !U.dex.has(c)).length && m !== U.bud[0]) U.bud.splice(U.bud.indexOf(m), 1); } }
      if (on) for (const m of U.box) { const L = kidsOk(m, (w, c) => w.k === 'item' && !U.dex.has(c)); for (const c of L) { const p = evoWay(model, c).p; if (U.gold >= p) { U.gold -= p; U.spent += p; U.buy++; evolve(m, c, day); break; } } }
      if (U.bud[0] && U.frD[b.FR_EVO] == null && U.bud[0].fr >= b.FR_EVO) U.frD[b.FR_EVO] = day;
      if (U.bud[0] && U.frD.max == null && U.bud[0].fr >= b.FR_MAX) U.frD.max = day;
      if (day === 7 || day === 30 || day === days) U.d[day] = { dex: U.dex.size, bag: U.bag.length, gold: U.gold, earn: Object.values(U.gs).reduce((a, x) => a + x, 0) };
    }
    const earn = Object.values(U.gs).reduce((a, x) => a + x, 0);
    return { p: P.id, d: U.d, fE: U.fE, fL: U.fL, earn, gs: U.gs, spent: U.spent, buy: U.buy, evo: U.evo, sh: U.sh, eggs: U.eggs, hatched: U.hatched, km: U.km, fr160: U.frD[b.FR_EVO] ?? null, frMax: U.frD.max ?? null };
  }

  function sim(model, o = {}) {
    const days = o.days || 90, seed = o.seed ?? 20261021, users = [], R = reach(model), N = R.size || 1;
    let k = 0; for (const P of PERSONAS) for (let i = 0; i < P.n; i++) users.push(simUser(model, P, seed + k++ * 7919, days, R));
    const by = {}; for (const P of PERSONAS) { const L = users.filter(u => u.p === P.id), f = fn => med(L.map(fn));
      by[P.id] = { name: P.name, n: L.length, dex7: f(u => u.d[7].dex / N), dex30: f(u => u.d[30].dex / N), dex90: f(u => u.d[days].dex / N), fE: f(u => u.fE ?? days + 1), fL: f(u => u.fL ?? days + 1), noL: L.filter(u => u.fL == null).length / L.length,
        gpd: f(u => u.d[30].earn / 30), gold30: f(u => u.d[30].gold), bag30: f(u => u.d[30].bag), fr160: f(u => u.fr160 ?? days + 1), frMax: f(u => u.frMax ?? days + 1), km: f(u => u.km / days), buy: f(u => u.buy), sh: L.reduce((a, u) => a + u.sh, 0),
        src: Object.fromEntries(Object.keys(L[0].gs).map(k => [k, Math.round(f(u => u.gs[k]))])) }; }
    // 제일 드문 종: 그 알 등급 확률 × 그 종 확률 로 몇 km 에 하나꼴인지 (천장 빼고)
    let rare = null; const epk = 1 / (model.b.BAG_STEP || .25);
    for (let g = 1; g <= 5; g++) for (const [sp, p] of model.probs[g] || []) { const v = 1 / (epk * model.odds[g - 1] * p); if (p > 0 && (!rare || v > rare.km)) rare = { sp: +sp, g, km: v }; }
    const all = { dex30: med(users.map(u => u.d[30].dex / N)), gpd: med(users.map(u => u.d[30].earn / 30)), fL: med(users.map(u => u.fL ?? days + 1)) };
    return { days, N, users: users.length, by, all, rare, seed };
  }

  // 뉴트럴의 기준: 목표치 대신 '너무 쉬움 / 적당 / 너무 어려움' 세 칸으로만 본다
  const BANDS = [
    { id: 'dex30', n: '30일 도감 (출퇴근)', of: s => s.by.commute.dex30, lo: .15, hi: .6, f: v => Math.round(v * 100) + '%', easy: '한 달 만에 도감이 너무 많이 차요', hard: '한 달이 지나도 도감이 잘 안 차요' },
    { id: 'dexH', n: '30일 도감 (집순이)', of: s => s.by.home.dex30, lo: .06, hi: .45, f: v => Math.round(v * 100) + '%', easy: '거의 안 걷는 사람도 도감이 금방 차요', hard: '거의 안 걷는 사람은 새 포켓몬을 보기 어려워요' },
    { id: 'fE', n: '첫 에픽 알 부화 (출퇴근)', of: s => s.by.commute.fE, lo: 2, hi: 10, f: v => Math.round(v) + '일', easy: '에픽 알이 너무 빨리 나와요', hard: '에픽 알을 보기까지 너무 오래 걸려요' },
    { id: 'fL', n: '첫 전설 알 부화 (출퇴근)', of: s => s.by.commute.fL, lo: 10, hi: 60, f: v => Math.round(v) + '일', easy: '전설 알이 너무 흔해요', hard: '전설 알을 거의 못 봐요' },
    { id: 'gpd', n: '하루 골드 (출퇴근)', of: s => s.by.commute.gpd, lo: 120, hi: 600, f: v => Math.round(v).toLocaleString() + 'G', easy: '골드가 넘쳐서 상점 물건이 금방 다 사져요', hard: '진화의 돌 하나 사기까지 너무 오래 모아야 해요' },
    { id: 'gpdH', n: '하루 골드 (가끔 접속)', of: s => s.by.casual.gpd, lo: 25, hi: 400, f: v => Math.round(v).toLocaleString() + 'G', easy: '가끔 켜는 사람도 골드가 넘쳐요', hard: '가끔 켜는 사람은 골드를 거의 못 모아요' },
    { id: 'fr160', n: '친밀도 진화까지 (출퇴근)', of: s => s.by.commute.fr160, lo: 3, hi: 30, f: v => Math.round(v) + '일', easy: '친밀도 진화가 너무 금방이에요', hard: '친밀도 진화까지 너무 오래 걸려요' },
    { id: 'frMax', n: '친밀도 만점까지 (출퇴근)', of: s => s.by.commute.frMax, lo: 7, hi: 60, f: v => Math.round(v) + '일', easy: '친밀도 만점이 너무 쉬워요', hard: '친밀도 만점까지 너무 멀어요' },
    { id: 'bag', n: '30일째 가방에 쌓인 알 (산책 매니아)', of: s => s.by.walk.bag30, lo: -1, hi: 120, f: v => Math.round(v) + '개', easy: '', hard: '부화기가 못 따라가서 가방에 알이 계속 쌓여요' },
    { id: 'rare', n: '제일 드문 포켓몬', of: s => s.rare?.km, lo: 300, hi: 2500, f: v => Math.round(v).toLocaleString() + 'km', easy: '제일 드문 포켓몬도 금방 나와요', hard: '제일 드문 포켓몬은 사실상 못 만나요' },
  ];
  const lvOf = (B, v) => v == null ? 'ok' : v < B.lo ? (B.id === 'gpd' || B.id === 'gpdH' || B.id.startsWith('dex') ? 'hard' : 'easy') : v > B.hi ? (B.id === 'gpd' || B.id === 'gpdH' || B.id.startsWith('dex') ? 'easy' : 'hard') : 'ok';
  function judge(s) { return BANDS.map(B => { const v = B.of(s), lv = lvOf(B, v); return { id: B.id, n: B.n, v, txt: v == null ? '-' : B.f(v), lv, why: lv === 'easy' ? B.easy : lv === 'hard' ? B.hard : '적당해요', lo: B.f(Math.max(0, B.lo)), hi: B.f(B.hi) }; }); }

  // 고칠 거리: 치우친 칸마다 고칠 값(patch)을 만들고, 그 값으로 다시 돌려 본 결과를 함께 붙인다
  const sc = (L, k, from = 1) => L.map((x, i) => i < from ? x : Math.round(x * k * 100) / 100);
  const scG = (L, k) => L.map((x, i) => i ? Math.max(5, Math.round(x * k / 5) * 5) : x);   // v8.15 경완: 골드는 5G 단위로
  function propose(model, s) {
    const J = judge(s), b = model.b, out = [], has = id => J.find(j => j.id === id)?.lv;
    const add = (id, t, why, patch) => out.push({ id, t, why, patch });
    if (has('dex30') === 'hard' || has('dexH') === 'hard') add('hatchD', '알 부화 거리 20% 줄이기', '도감이 너무 느리게 차요', { bal: { HATCH_KM: sc(b.HATCH_KM, .8) } });
    if (has('dex30') === 'easy') add('hatchU', '알 부화 거리 20% 늘리기', '도감이 너무 빨리 차요', { bal: { HATCH_KM: sc(b.HATCH_KM, 1.2) } });
    if (has('fE') === 'hard') add('pityE', `에픽 천장 ${model.pity.e} → ${Math.round(model.pity.e * .7)}km`, '에픽 알을 보기까지 너무 멀어요', { pity: { e: Math.round(model.pity.e * .7) } });
    if (has('fE') === 'easy') add('oddE', '에픽 알 확률 30% 낮추기', '에픽 알이 너무 흔해요', { odds: reOdds(model.odds, 3, .7) });
    if (has('fL') === 'hard') add('pityL', `전설 천장 ${model.pity.l} → ${Math.round(model.pity.l * .75)}km`, '전설 알을 거의 못 봐요', { pity: { l: Math.round(model.pity.l * .75) } });
    if (has('fL') === 'easy') add('oddL', '전설 알 확률 30% 낮추기', '전설 알이 너무 흔해요', { odds: reOdds(model.odds, 4, .7) });
    if (has('gpd') === 'hard' || has('gpdH') === 'hard') add('goldU', '부화 골드 30% 올리기', '골드가 너무 안 모여요', { bal: { DUP_G: scG(b.DUP_G, 1.3), NEW_EGG_G: scG(b.NEW_EGG_G, 1.3) } });
    if (has('gpd') === 'easy') add('goldD', '부화 골드 25% 내리기', '골드가 넘쳐요 (골드는 대부분 알 부화에서 나와요)', { bal: { DUP_G: scG(b.DUP_G, .75), NEW_EGG_G: scG(b.NEW_EGG_G, .75) } });
    if (has('fr160') === 'hard' || has('frMax') === 'hard') add('frU', `필드 친밀도 하루 최대 ${b.FLD_FR_DAY} → ${b.FLD_FR_DAY + 4}`, '친밀도가 너무 느려요', { bal: { FLD_FR_DAY: b.FLD_FR_DAY + 4 } });
    if (has('frMax') === 'easy') add('frD', `짝꿍 1km 친밀도 ${b.WALK_FR} → ${Math.max(1, b.WALK_FR - 1)}`, '친밀도가 너무 빨리 차요', { bal: { WALK_FR: Math.max(1, b.WALK_FR - 1) } });
    if (has('rare') === 'hard') add('rare', '티어 메뉴에서 드문 쪽 기울기 줄이기', `${s.rare?.g === 5 ? '전설' : '드문'} 알 안에서 제일 드문 종이 너무 안 나와요. 티어 안 순서 기울기는 작업실 티어 메뉴에서 직접 봐 주세요`, null);
    { const odd = ['DUP_G', 'NEW_EGG_G'].filter(k => Array.isArray(b[k]) && b[k].some((x, i) => i && x % 5)); if (odd.length && !out.some(x => x.id.startsWith('gold'))) add('gold5', '골드 값 5G 단위로 맞추기', '부화 골드에 5G 단위가 아닌 값이 있어요 (' + odd.map(k => b[k].slice(1).join('·')).join(' / ') + ')', { bal: Object.fromEntries(odd.map(k => [k, scG(b[k], 1)])) }); }
    if (has('bag') === 'hard') add('inc', `부화기 칸 ${b.MAX_EGGS} → ${b.MAX_EGGS + 5}`, '가방에 알이 계속 쌓여요', { bal: { MAX_EGGS: b.MAX_EGGS + 5 } });
    return out;
  }
  function reOdds(o, i, k) { const a = [...o]; const d = a[i] * (1 - k); a[i] -= d; a[0] += d; return a.map(x => Math.round(x * 1e6) / 1e6); }
  function patched(model, p) { const m = { ...model, b: { ...model.b, ...(p.bal || {}) }, pity: { ...model.pity, ...(p.pity || {}) }, odds: p.odds || model.odds }; return m; }
  // 고칠 거리마다 다시 돌려서 고친 뒤 칸 값이 어떻게 되는지
  function advise(model, o = {}) { const s = sim(model, o), J = judge(s), P = propose(model, s);
    for (const x of P) { if (!x.patch) continue; const s2 = sim(patched(model, x.patch), o), J2 = judge(s2); x.after = J2.filter(j => { const a = J.find(q => q.id === j.id); return a.txt !== j.txt; }).map(j => ({ id: j.id, n: j.n, from: J.find(q => q.id === j.id).txt, to: j.txt, lv: j.lv })); }
    return { s, J, P }; }

  const NEU = { PERSONAS, BANDS, sim, judge, propose, advise, patched, reach };
  if (typeof module !== 'undefined' && module.exports) module.exports = NEU; else root.NEU = NEU;
})(typeof window !== 'undefined' ? window : globalThis);
