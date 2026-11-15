const { chromium } = require('playwright');
// 관장 배틀 흐름 시뮬 (경완 2026-11-16 '이거 그리고 유저들 실제 배틀 로그 보면서 난이도 밸런스 잡는거 정기 루틴화')
// 실제 게임 코드(beta.html + gymb/gym.js + gymb/battle.js)를 헤드리스 브라우저에 띄워, 봇 관장(aiChoice 2단계)이 도전자 N명과 이어서 싸운 승패 흐름을 찍는다.
// 저장소 파일을 그대로 읽고(서버 필요 없음), 띄울 때만 gym.js·battle.js 끝에 시뮬용 창구(__G·__GBX)를 끼운다 — 저장소 파일은 안 바뀜.
// 쓰는 법 (저장소 루트에서):  node tools/gym-sim/flow.js car 300 1     # 등급 3~6 × 평범(종족값≈520)·센(≈600) 라인업, 300판씩, 1 = 도구·메가·Z 줌
//                             node tools/gym-sim/flow.js lv 200 1      # 등급 천장보다 −9·−4·0 레벨일 때 보통 도전자만 (키우는 보람)
//                             node tools/gym-sim/flow.js leg 300 1     # 전설 Lv90·95·100
// 줄: who gi myLv n win% easy hard named avgWinStreak maxWinStreak maxLoseStreak lose3+ lose5+ foeLv-my  (easy/hard/named = 승률%/판)
// 봇은 사람보다 교체·읽기를 못 하므로 실제 유저 승률(auto-bal 이슈 '관장 배틀 난이도')보다 낮게 나온다 — 바꾸기 전·후 비교용. car 300 은 10분쯤 걸림.
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../..');
const MIME = { html: 'text/html', js: 'text/javascript', json: 'application/json', css: 'text/css', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', wasm: 'application/wasm' };
const GBX = String.raw`
window.__GBX = { ev: s => eval(s), simB(myT, foeT, hold, tier) {
  try { foeItems(foeT, hold); } catch (e) {}
  const btl = new PSim.Battle({ formatid: 'gen9customgame', seed: [1, 2, 3, 4].map(() => Math.floor(Math.random() * 65536)) });
  btl.setPlayer('p1', { name: 'aa', team: myT.map(psSet) }); btl.setPlayer('p2', { name: 'bb', team: foeT.map(psSet) });
  B = { btl, train: null, bag: [], dbl: false, diff: tier, gmk: window.__gmk || null, gmBase: {} }; if (window.__gmk?.dmax) btl.sides.forEach(sd => { sd.dynamaxUsed = false; sd.canDynamaxNow = function () { return !this.dynamaxUsed; }; }); const GK = !!window.__gmk;
  const mb = new Proxy(btl, { get: (t, k) => k === 'p1' ? t.p2 : k === 'p2' ? t.p1 : typeof t[k] === 'function' ? t[k].bind(t) : t[k] });
  let i = 0;
  for (; i < 600 && !btl.ended; i++) { const r1 = btl.p1.activeRequest, r2 = btl.p2.activeRequest; let c1 = null, c2 = null;
    if (r1 && !r1.wait) c1 = r1.teamPreview ? 'default' : GK ? (B.diff = 2, aiGmk(mb, aiChoice(mb, 2))) : aiChoice(mb, 2); B.diff = tier; if (r2 && !r2.wait) c2 = r2.teamPreview ? 'default' : GK ? aiGmk(btl, aiChoice(btl, tier)) : aiChoice(btl, tier);
    try { if (c1 && c2) btl.makeChoices(c1, c2); else if (c1) btl.choose('p1', c1); else if (c2) btl.choose('p2', c2); else break; } catch (e) { try { btl.makeChoices('default', 'default'); } catch (e2) { break; } } }
  const r = { dm: btl.p1.dynamaxUsed ? 1 : 0, mg: btl.p1.pokemon.some(p => /mega/i.test(p.species.forme || '')) ? 1 : 0, w: btl.winner === 'aa' ? 1 : 0, end: btl.ended ? 1 : 0, t: btl.turn, left: btl.p1.pokemon.filter(p => !p.fainted).length }; B = null; return r; } };
`;
const serve = async route => { try { const u = new URL(route.request().url()); let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (!f.startsWith(ROOT)) return route.abort();
  let body = fs.readFileSync(f); const cut = s => { const t = body.toString('utf8'), i = t.lastIndexOf('})();'); if (i < 0) throw new Error('끼울 자리 없음 ' + f); return Buffer.from(t.slice(0, i) + s + '\n' + t.slice(i)); };
  if (/gymb\/gym\.js$/.test(u.pathname)) body = cut('window.__G = { ev: s => eval(s) };'); if (/gymb\/battle\.js$/.test(u.pathname)) body = cut(GBX);
  return route.fulfill({ status: 200, contentType: MIME[f.split('.').pop()] || 'application/octet-stream', body }); } catch (e) { return route.fulfill({ status: 404, body: '' }); } };
const MODE = process.argv[2] || 'car', N = +(process.argv[3] || 300);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 780 } });
  pg.on('pageerror', e => console.log('PE ' + e.message));
  await pg.addInitScript(() => { const o = window.addEventListener; window.addEventListener = function (t, f, ...a) { if (typeof f === 'function' && /say\.poke/.test(String(f))) return; return o.call(this, t, f, ...a); }; });
  await pg.route('http://sim.local/**', serve); await pg.route(u => !/^http:\/\/sim\.local\//.test(String(u)) && /^https?:/.test(String(u)), r => r.abort());
  await pg.goto('http://sim.local/beta.html?debug=1'); await pg.waitForTimeout(4000);
  for (let i = 0; i < 6; i++) { const ok = await pg.evaluate(() => { const x = [...document.querySelectorAll('button')].find(x => x.offsetParent && /시작|건너/.test(x.textContent)); x?.click(); return !!x; }); if (!ok) break; await pg.waitForTimeout(1500); }
  await pg.evaluate(async (KIT) => {
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'gymb/gym.js?v=t'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    await window.Gym.prepare();
    await __GBX.ev('Promise.all([loadData(), loadSim()])'); window.__kit = KIT;
    __G.ev(`window.__car = (gi, N, sps, TY, myLv, onlyHard) => {
      const ids = (window.__ids ||= {}), key = sps.join();
      ids[key] ||= sps.map(sp => window.__meadow.ev('newPoke(' + sp + ',{shiny:false})').id);
      const my = ids[key], rep = gi < 6 ? Math.round((GRADES[gi][0] + GRADES[gi + 1][0]) / 2) : 1500;
      S.gym = { d: (DESIGNS.find(d => d.ty === TY) || DESIGNS[0]).id, ty: TY, nm: 't', rep, gmax: gi, unl: 1, rv: 6, lu: [my, [], []], luI: 0, tr: [], mon: {}, itm: {}, tms: {}, own: {}, dp: [], vis: Date.now(), q: [], sf: [], ms: { r: BD_MID.slice() }, ez: 99, nc: 0, cid: 1, stk: 0, lstk: 0, log: [], nt: {} };
      const g = S.gym; my.forEach(id => { const P = S.box.find(p => p.id === id); const m = GB().gm(P); m.lv = myLv; g.mon[id] = m; });
      const MY = my.map(id => S.box.find(p => p.id === id)), seq = [], K = { e: [0, 0], h: [0, 0], n: [0, 0] };
      let tries = 0, lvd = 0;
      while (seq.length < N && tries++ < N * 30) { g.q = []; g.rep = rep; const c = mkChal(Date.now()); if (pairOf(c) || (onlyHard && (c.named || !c.diff))) continue; if (onlyHard) { g.stk = 0; g.lstk = 0; c.brk = 0; } refit(c, MY);
        const le = lsE(g), tier = c.named ? 2 : Math.max(0, (c.ai ?? (c.diff ? 1 : 0)) - (le >> 1));
        const team = c.team.map(([sp, lv, mv]) => { const o = GB()._foeEntry(sp, lv, tier); if (mv && mv.length) o.mv = mv; if (c.named) o.iv = o.iv.map(() => rndI(22, 31)); else if (c.ivm) o.iv = o.iv.map(v => Math.max(v, c.ivm)); if (le) o.iv = o.iv.map(v => Math.min(v, 31 - le * 6)); o.evs = GB().foeEvs(sp, Math.max(0, gi - Math.round(le * 1.5))); return o; });
        const myT = sps.map(sp => { const o = GB()._foeEntry(sp, myLv, 2); o.iv = o.iv.map(() => rndI(15, 31)); o.evs = GB().foeEvs(sp, gi); return o; });
        if (window.__kit) { const B2 = GB(); B2.itAi.setB && 0; __GBX.ev('foeItems')(myT, 2);
          if (gi >= 3) { const o = myT.find(o => B2.mgSt?.(o.sp)?.length || __GBX.ev('mgSt')(o.sp).length); if (o) o.it = __GBX.ev('mgSt')(o.sp)[0]; }
          if (gi >= 4) { const MS = __GBX.ev('MEGA_ST'), ZS = __GBX.ev('ZC_ST'), o = myT.find(o => !MS[o.it]); if (o) { const t = (SPECIES[o.sp].t || [])[0]; if (ZS[t]) o.it = ZS[t]; } }
          window.__gmk = { ...(gi >= 3 ? { mega: 1 } : {}), ...(gi >= 4 ? { z: 1 } : {}), };
          const kd = c.named ? 'named' : c.diff | 0, ef = 1 - le * .25;
          if (gi >= 3 && Math.random() < MG_FOE.max[kd] * ef) foeMega(c, team, 1, MY); if (gi >= 4 && Math.random() < Z_FOE.max[kd] * ef) foeZ(c, team, 1, MY); } else window.__gmk = null;
        const r = __GBX.simB(myT, team, tier, tier); if (!r.end) continue; window.__mgc = (window.__mgc || 0) + r.mg; window.__dmc = (window.__dmc || 0) + r.dm;
        const k = c.named ? 'n' : c.diff ? 'h' : 'e'; K[k][0] += r.w; K[k][1]++; lvd += teamLv(c.team) - myLv;
        if (r.w) { g.stk = (g.stk | 0) + 1; g.lstk = Math.max(0, Math.min(5, g.lstk | 0) - 1); if (!c.named) g.nc = (g.nc | 0) + 1; } else { g.stk = 0; g.lstk = Math.min(5, (g.lstk | 0) + 1); }
        seq.push(r.w); }
      const runs = v => { const L = []; let n = 0; for (const x of seq) { if (x === v) n++; else { if (n) L.push(n); n = 0; } } if (n) L.push(n); return L; };
      const W = runs(1), Ls = runs(0), pc = a => a[1] ? Math.round(a[0] / a[1] * 100) : '-';
      return [gi, myLv, seq.length, Math.round(seq.reduce((a, b) => a + b, 0) / seq.length * 100), pc(K.e) + '/' + K.e[1], pc(K.h) + '/' + K.h[1], pc(K.n) + '/' + K.n[1], +(W.reduce((a, b) => a + b, 0) / Math.max(1, W.length)).toFixed(1), Math.max(0, ...W), Math.max(0, ...Ls), Ls.filter(x => x >= 3).length, Ls.filter(x => x >= 5).length, +(lvd / seq.length).toFixed(1)];
    }`);
  }, +(process.argv[4] || 0));
  const MID = [[6, 59, 78, 38, 136, 126], 10], STR = [[149, 373, 445, 635, 706, 784], 16], LV = [25, 35, 45, 55, 66, 78, 92], CEIL = [30, 40, 50, 60, 72, 85, 100];
  console.log('who gi myLv n win% easy hard named avgWinStreak maxWinStreak maxLoseStreak lose3+ lose5+ foeLv-my');
  const jobs = [];
  if (MODE === 'leg') for (const lv of [90, 95, 100]) jobs.push(['str', 6, N, STR[0], STR[1], lv, 0]);
  if (MODE === 'car') for (const [nm, T] of [['mid', MID], ['str', STR]]) for (const gi of [3, 4, 5, 6]) jobs.push([nm, gi, N, T[0], T[1], LV[gi], 0]);
  if (MODE === 'lv') for (const [nm, T] of [['mid', MID], ['str', STR]]) for (const gi of [3, 5]) for (const d of [-9, -4, 0]) jobs.push([nm, gi, N, T[0], T[1], Math.min(100, CEIL[gi] + d), 1]);
  for (const [nm, ...a] of jobs) { const r = await pg.evaluate(a => __car(...a), a); console.log(nm + '\t' + r.join('\t') + '\tmega:' + await pg.evaluate(() => { const x = window.__mgc || 0; window.__mgc = 0; window.__dmc = 0; return x; })); }
  await b.close();
})();
