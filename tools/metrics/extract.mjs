// 유저 지표판 (경완 2026-11-28 '1 반영' · '둘 다 해 줘'): .github/workflows/metrics-report.yml 이 매주 돌려 metrics.json 을 Actions 산출물로 남긴다 — D1 읽기만.
// 친구 코드·아이디는 내보내지 않는다 (코드 해시 h + 트레이너 카드 닉네임 nick). 월요일 예약 작업이 이걸 받아 tools/metrics/build.py 로 지표판(Artifact)을 새로 채운다.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const DAY = 864e5, KST = 9 * 3600e3, kd = t => new Date(t + KST).toISOString().slice(0, 10);
const DEV = new Set(['flyweb', 'test']);
const acc = d1('SELECT id, code, dev, at FROM account');
const sv = d1('SELECT acct, code, saved, parts, at FROM save');
const bk = d1("SELECT acct, slot, dex, box, gold, at FROM bak WHERE slot LIKE 'd%'");
const tr = d1('SELECT code, dex, at, card FROM trainer');
const ped = d1('SELECT code, st, lw, on_ FROM ped');
const push = d1('SELECT code, plat, kinds, at FROM push');
const bal = d1('SELECT code, kind, ver, beta, t, d FROM bal ORDER BY t LIMIT 300000');
const H = s => createHash('sha256').update('pkm' + s).digest('hex').slice(0, 8);
const devCodes = new Set(acc.filter(a => DEV.has(a.id)).map(a => a.code));
for (const s of sv) if (DEV.has(s.acct)) devCodes.add(s.code);
const users = new Map(); const U = code => { if (!users.has(code)) users.set(code, { h: H(code), dev: devCodes.has(code) ? 1 : 0, bal: {}, bak: [] }); return users.get(code); };
for (const a of acc) { const u = U(a.code || ('acct:' + a.id)); u.acctAt = a.at; u.devT = a.dev ? String(a.dev).slice(0, 12) : ''; }
for (const t of tr) { const u = U(t.code); u.trAt = t.at; u.trDex = t.dex; try { const c = JSON.parse(t.card); u.nick = String(c.n || '').slice(0, 20); u.ver = c.v || c.ver || ''; u.gi = c.gym?.gi; } catch (e) {} }
for (const p of ped) Object.assign(U(p.code), { ped: p.st, pedLw: p.lw });
for (const p of push) { const u = U(p.code); u.push = (u.push ? u.push + ',' : '') + p.plat; }
const acctCode = new Map(acc.map(a => [a.id, a.code]));
for (const b of bk) { const u = U(acctCode.get(b.acct) || ('acct:' + b.acct)); u.bak.push([b.slot.slice(1), b.dex, b.box, b.gold]); }
for (const r of bal) { const u = U(r.code); let d = {}; try { d = JSON.parse(r.d); } catch (e) {} if (r.kind === 'day') { (u.day ||= {})[d.d || kd(r.t)] = { n: d.n | 0, m: d.m || {}, q: d.q || {}, last: d.last || '', t: r.t }; continue; }
  if (r.kind === 'ms') { (u.ms ||= {})[d.s] = u.ms[d.s] || { t: r.t, since: d.since || 0, old: d.old ? 1 : 0 }; continue; }
  const k = kd(r.t), g = r.kind === 'mg' ? 'mg:' + (d.g || 'jump') : r.kind; (u.bal[k] ||= {}); u.bal[k][g] = (u.bal[k][g] || 0) + 1; u.lastVer = r.ver; u.balT0 = u.balT0 || r.t; u.balT1 = r.t; if (r.kind === 'mg' && d.t) { (u.mgSec ||= {}); u.mgSec[k] = (u.mgSec[k] || 0) + (+d.t || 0); } }
const N = o => o && typeof o === 'object' ? (Array.isArray(o) ? o.length : Object.keys(o).length) : 0;
for (const s of sv) {
  const u = U(s.code); u.bk = /^RST/.test(s.code) ? 1 : 0; u.saveAt = s.at; u.savedAt = s.saved;
  try {
    const P = d1(`SELECT i, data FROM save_part WHERE acct = '${String(s.acct).replace(/'/g, "''")}' AND code = '${String(s.code).replace(/'/g, "''")}' ORDER BY i`);
    let S = JSON.parse(P.map(p => p.data).join(''));
    if (typeof S === 'string') S = JSON.parse(S);
    Object.assign(u, {
      since: S.since || 0, seenAt: S.seenAt || 0, useH: (S.useH || []).reduce((a, b) => a + (+b || 0), 0), useHD: S.useHD || 0,
      dex: N(S.unlocked), box: N(S.box), eggs: N(S.eggs), bag: N(S.bag), km: Math.round(S.totalKm || 0), walkKm: Math.round(S.walkKm || 0), gold: S.gold | 0,
      hatchN: (S.box || []).filter(p => p && p.place).length, runs: N(S.runs), fr: N(S.friends), mons: N(S.mons), log: N(S.log),
      gym: g ? { rep: g.rep | 0, gmax: g.gmax ?? null, tut: g.tut ? 1 : 0, d: g.d || 0, days: g.days ? Object.keys(g.days) : [], keys: N(g), shelf: (g.shelf || []).map(x => ({ rep: x.rep | 0, gmax: x.gmax ?? null, off: x.off || 0 })) } : null,
      mgK: S.mg ? Object.keys(S.mg) : [], trRw: S.trRw ?? null, tr: S.tr ? (S.tr.lv ?? S.tr.g ?? N(S.tr)) : null,
      fedDays: Array.isArray(S.fedLog) ? S.fedLog.map(x => Array.isArray(x) ? x[0] : x?.d).filter(Boolean) : [],
      dorm: S.dorm ? 1 : 0, sound: S.tracks ? N(S.tracks) : 0, lay: N(S.lay), fits: N(S.fits), unl: N(S.unlocked),
      gymUnlk: S.gymUnlk ?? null, noti: N(S.noti), th: S.th || '',
    });
  } catch (e) { u.err = String(e).slice(0, 80); }
}
const out = { now: Date.now(), n: { acc: acc.length, save: sv.length, tr: tr.length, bal: bal.length, bak: bk.length }, users: [...users.values()] };
writeFileSync(process.argv[2] || 'metrics.json', JSON.stringify(out));
console.log('metrics', JSON.stringify(out.n), 'users', out.users.length);
