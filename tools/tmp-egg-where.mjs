// 임시 (머지 전 지움): 사람마다 최근 지역·많이 주운 지역. 공개 로그라 결과는 암호화해서만 찍음.
import { execFileSync } from 'node:child_process';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const NOW = Date.now(), DAY = 864e5;
const rows = d1(`SELECT code, t, d FROM bal WHERE kind='egg' AND t >= ${NOW - 21 * DAY} ORDER BY t`);
const P = {};
for (const r of rows) { let d = {}; try { d = JSON.parse(r.d) } catch (e) {} const k = (d.u || d.c || '?') + (d.r ? ' [' + d.r + ']' : ''); (P[r.code] ||= []).push([r.t, k, d.s || '-']); }
const out = Object.values(P).map((L, i) => { const cnt = {}; L.forEach(x => cnt[x[1]] = (cnt[x[1]] || 0) + 1); const last = L.slice(-5).reverse();
  return { p: i + 1, n: L.length, last: last.map(x => [new Date(x[0] + 9 * 3600e3).toISOString().slice(0, 16), x[1]]), top: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6) }; });
console.log(JSON.stringify(out));
