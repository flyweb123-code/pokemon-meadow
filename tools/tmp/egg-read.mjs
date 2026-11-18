import fs from 'fs';
const rows = f => JSON.parse(fs.readFileSync(f, 'utf8'))[0].results;
const show = (tag, S) => {
  console.log('=== ' + tag, 'eggV', S.eggV, 'keys', Object.keys(S).filter(k => /egg|hatch|gc|bag|inc|tick/i.test(k)).join(','));
  for (const p of (S.box || [])) if (p.sp === 23) console.log('EKANS', JSON.stringify({ ...p, iv: p.iv, sum: (p.iv || []).reduce((a, b) => a + b, 0), when: new Date(p.t).toISOString() }));
  const g4 = (S.box || []).filter(p => p.g >= 4).map(p => [p.sp, p.g, p.place, new Date(p.t).toISOString().slice(0, 16)]);
  console.log('G4+ box', JSON.stringify(g4));
  console.log('recentHatch', JSON.stringify(S.recentHatch));
  /* 알은 내용 빼고 등급·장소·표시만 */
  const eg = e => ({ g: e.g, place: e.place, spN: e.spN, gc: e.gc, ct: e.ct, lt: e.lt, gk: e.gk, nt: e.nt, t: e.t && new Date(e.t).toISOString().slice(0, 16), keys: Object.keys(e).join(',') });
  console.log('bag eggs', JSON.stringify((S.bag || []).map(eg)));
  console.log('incu eggs', JSON.stringify((S.eggs || []).map(eg)));
};
const p = rows('/tmp/p.json'); show('LIVE', JSON.parse(p.map(r => r.data).join('')));
const bp = rows('/tmp/bp.json'), by = {}; for (const r of bp) (by[r.slot] ||= []).push(r.data);
for (const [s, a] of Object.entries(by)) { try { const S = JSON.parse(a.join('')); const e = (S.box || []).filter(p => p.sp === 23).map(p => [p.g, p.place, new Date(p.t).toISOString().slice(0, 16)]); console.log('BAK', s, 'ekans', JSON.stringify(e)); } catch (x) { console.log('BAK', s, 'parse fail', x.message); } }
