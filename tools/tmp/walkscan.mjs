import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const meta = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))[0].results;
const by = {};
for (const r of rows) (by[r.acct + '/' + r.code] ||= []).push(r);
const now = Date.now(), out = [];
for (const k in by) {
  const L = by[k].sort((a, b) => a.i - b.i); let S;
  try { S = JSON.parse(L.map(r => r.data).join('')); } catch (e) { out.push({ k, err: 'parse' }); continue; }
  const m = meta.find(x => x.acct + '/' + x.code === k) || {};
  const eggs = [...(S.bag || []), ...(S.eggs || [])], bt = {};
  for (const e of eggs) if (e.t) bt[e.t] = (bt[e.t] || 0) + 1;
  const batches = Object.entries(bt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${n}@${new Date(+t + 9 * 3600e3).toISOString().slice(5, 16)}`);
  const logs = (S.log || []).map(e => (e.html || '').replace(/<[^>]+>/g, '')).map(s => +(s.match(/알 (\d+)개를 주웠다/) || [])[1] || 0);
  out.push({ k, savedKST: m.at ? new Date(m.at + 9 * 3600e3).toISOString().slice(0, 16) : '', bag: (S.bag || []).length, inc: (S.eggs || []).length, full: S.bagFull?.n || 0, eid: S.eid, totalKm: Math.round(S.totalKm || 0), walkKm: Math.round(S.walkKm || 0), since: S.since ? new Date(S.since).toISOString().slice(0, 10) : '', topBatch: batches.join(' '), maxLogPick: Math.max(0, ...logs) });
}
out.sort((a, b) => (b.bag || 0) - (a.bag || 0));
console.table(out);
