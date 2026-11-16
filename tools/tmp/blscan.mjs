import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {};
for (const r of rows) (by[r.acct + '/' + r.code] ||= []).push(r);
const K = t => new Date(t + 9 * 3600e3).toISOString().slice(5, 16);
for (const k in by) {
  if (!/^flyweb\//.test(k)) continue;
  let S; try { S = JSON.parse(by[k].sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(k, 'parse err'); continue; }
  console.log('==', k, 'savedAt', K(S.savedAt || 0), 'box', (S.box || []).length);
  for (const P of (S.box || []).filter(p => p.sp === 741)) console.log('BOX741', JSON.stringify(P).slice(0, 400), 'born', K(P.t || 0));
  const near = (S.box || []).filter(p => p.t > Date.now() - 6 * 3600e3).map(p => [p.id, p.sp, p.fm || '', K(p.t)]);
  console.log('recent box', JSON.stringify(near));
  console.log('eggs', JSON.stringify((S.eggs || []).filter(e => e.sp === 741 || e.ct === 10).map(e => [e.id, e.g, e.sp, e.ct, e.km, e.need])));
  console.log('bag741', JSON.stringify((S.bag || []).filter(e => e.sp === 741)));
  console.log('log', JSON.stringify((S.log || S.logs || []).filter(l => /춤추새/.test(JSON.stringify(l))).slice(0, 10)).slice(0, 1500));
  console.log('fm keys', Object.keys(S).filter(x => /fm|form/i.test(x)).join(','), JSON.stringify(S.fmSeen || S.fm || null).slice(0, 300));
  console.log('errs', JSON.stringify((S.errs || []).slice(-8)).slice(0, 1500));
}
