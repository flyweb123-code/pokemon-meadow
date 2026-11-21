import { execFileSync } from 'node:child_process';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const NOW = Date.now(), DAY = 864e5;
const rows = d1(`SELECT code, ver, beta, t, d FROM bal WHERE kind='mg' AND t >= ${NOW - 21 * DAY} ORDER BY t LIMIT 200000`);
const G = {};
for (const r of rows) { let d; try { d = JSON.parse(r.d); } catch (e) { continue; } const g = d.g || 'jump'; if (r.beta) continue; (G[g] ||= []).push({ c: r.code, v: r.ver, sc: +d.sc || 0, t: +d.t || 0, gd: +d.gd || 0, at: r.t }); }
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * p)] : 0; };
for (const [g, a] of Object.entries(G)) {
  const ok = a.filter(x => x.t > 3);
  const ppl = new Set(ok.map(x => x.c)).size;
  const st = ok.reduce((s, x) => s + x.t, 0), ss = ok.reduce((s, x) => s + x.sc, 0);
  console.log(`== ${g} 판 ${ok.length} 사람 ${ppl} 평균초 ${(st / ok.length).toFixed(0)} 중앙초 ${med(ok.map(x => x.t))} p25 ${q(ok.map(x=>x.t),.25)} p75 ${q(ok.map(x=>x.t),.75)} 중앙점 ${med(ok.map(x => x.sc))} 평균점 ${(ss/ok.length).toFixed(0)} 점/분(합) ${(ss / st * 60).toFixed(0)} 점/분 중앙 ${med(ok.map(x => x.sc / x.t * 60)).toFixed(0)}`);
  const per = {}; for (const x of ok) { const p = per[x.c] ||= { n: 0, t: 0, sc: 0 }; p.n++; p.t += x.t; p.sc += x.sc; }
  for (const [c, p] of Object.entries(per).sort((a, b) => b[1].n - a[1].n).slice(0, 12)) console.log(`   ${c.slice(0, 3)}… 판 ${p.n} 평균초 ${(p.t / p.n).toFixed(0)} 평균점 ${(p.sc / p.n).toFixed(0)} 점/분 ${(p.sc / p.t * 60).toFixed(0)}`);
  // 버전별 최근
  const vv = {}; for (const x of ok) { const p = vv[x.v] ||= { n: 0, t: 0, sc: 0 }; p.n++; p.t += x.t; p.sc += x.sc; }
  console.log('   버전별: ' + Object.entries(vv).slice(-8).map(([v, p]) => `${v}:${p.n}판 ${(p.t/p.n).toFixed(0)}s ${(p.sc/p.t*60).toFixed(0)}점/분`).join(' | '));
}
