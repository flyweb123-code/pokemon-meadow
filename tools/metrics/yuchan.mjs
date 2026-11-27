// 임시: 유찬(NDN66BNL) 체육관이 언제 평판 1로 바뀌었는지 — 읽기만
import { execFileSync } from 'node:child_process';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const C = 'NDN66BNL', kd = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 16);
const acct = d1(`SELECT id FROM account WHERE code = '${C}'`).map(r => r.id);
console.log('acct', acct.length);
if (0) for (const r of d1(`SELECT t, ver, d FROM bal WHERE code = '${C}' AND kind IN ('gym','sf') ORDER BY t`)) { let d = {}; try { d = JSON.parse(r.d); } catch (e) {} if (d.c || d.gr != null) console.log('BAL', kd(r.t), r.ver, 'c', d.c, 'gr', d.gr, 'rp', d.rp, 'w', d.w); }
for (const a of acct) {
  const S0 = d1(`SELECT slot, at FROM bak WHERE acct = '${a}' AND slot >= 'd2026-11-24' ORDER BY slot`);
  for (const s of S0) {
    try { const P = d1(`SELECT data FROM bak_part WHERE acct = '${a}' AND slot = '${s.slot}' ORDER BY i`); let S = JSON.parse(P.map(p => p.data).join('')); if (typeof S === 'string') S = JSON.parse(S); const g = S.gym;
      console.log('BAK', s.slot, kd(s.at), g ? JSON.stringify({ rep: g.rep, gmax: g.gmax, t0: g.t0 && kd(g.t0), v: g.v, d: g.d, ty: g.ty, nm: g.nm, days: g.days ? Object.keys(g.days).length : 0, shelf: (g.shelf || []).map(x => ({ nm: x.nm, rep: x.rep, gmax: x.gmax, off: x.off && kd(x.off), ty: x.ty })), shut: g.shut || g.cl || g.off, tut: g.tut, keys: Object.keys(g).length }) : 'gym null');
    } catch (e) { console.log('BAK', s.slot, 'err', String(e).slice(0, 80)); }
  }
}
