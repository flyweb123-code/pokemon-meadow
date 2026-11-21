import { execFileSync } from 'node:child_process';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const NOW = Date.now(), DAY = 864e5;
const rows = d1(`SELECT code, ver, beta, t, d FROM bal WHERE kind='mg' AND t >= ${NOW - 21 * DAY} ORDER BY t LIMIT 200000`);
const G = {};
for (const r of rows) { let d; try { d = JSON.parse(r.d); } catch (e) { continue; } const g = d.g || 'jump'; if (r.beta) continue; (G[g] ||= []).push({ c: r.code, sc: +d.sc || 0, t: +d.t || 0 }); }
for (const g of ['jump', 'stack']) { const ok = G[g].filter(x => x.t > 3), st = ok.reduce((s, x) => s + x.t, 0);
  const f = dv => { const s = ok.reduce((a, x) => a + Math.floor(x.sc / dv), 0); return `${dv}: 1분 ${(s / st * 60).toFixed(2)} 한 판 ${(s / ok.length).toFixed(2)} 0판 ${ok.filter(x => x.sc < dv).length}`; };
  console.log(`== ${g} 판 ${ok.length}`); for (const dv of [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1800, 2000, 2400]) console.log('  ' + f(dv));
  const o2 = ok.filter(x => x.c.slice(0, 3) !== 'AED'), st2 = o2.reduce((s, x) => s + x.t, 0);
  for (const dv of [1000, 1200, 1400]) { const s = o2.reduce((a, x) => a + Math.floor(x.sc / dv), 0); console.log(`  (AED 빼고) ${dv}: 1분 ${(s / st2 * 60).toFixed(2)}`); }
}
