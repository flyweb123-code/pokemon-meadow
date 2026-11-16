import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {};
for (const r of rows) (by[r.slot] ||= []).push(r);
const K = t => new Date(t + 9 * 3600e3).toISOString().slice(5, 16);
for (const k of Object.keys(by).sort()) {
  let S; try { S = JSON.parse(by[k].sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(k, 'parse err'); continue; }
  console.log('==', k, 'savedAt', K(S.savedAt || 0), 'box', (S.box || []).length);
  const egs = [...(S.eggs || []).map(e => ['incu', e]), ...(S.bag || []).map(e => ['bag', e])].filter(([, e]) => e.sp === 741 || e.t > 1794830000000);
  for (const [w, e] of egs) console.log(' ', w, JSON.stringify({ id: e.id, g: e.g, sp: e.sp, ct: e.ct, gc: e.gc, place: e.place, t: K(e.t || 0), km: e.km, need: e.need }));
  for (const P of (S.box || []).filter(p => p.sp === 741)) console.log('  BOX741', P.id, P.fm, P.place, K(P.t));
}
