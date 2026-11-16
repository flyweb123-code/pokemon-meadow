import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {};
for (const r of rows) (by[r.acct + '/' + r.code] ||= []).push(r);
const K = t => new Date(t + 9 * 3600e3).toISOString().slice(5, 16);
for (const k in by) {
  let S; try { S = JSON.parse(by[k].sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(k, 'parse err'); continue; }
  const box = S.box || [], all = [...box.map(p => ['box', p]), ...(S.eggs || []).map(e => ['incu', e]), ...(S.bag || []).map(e => ['bag', e])];
  const g = [0, 0, 0, 0, 0, 0]; for (const [, x] of all) if (x.g >= 1 && x.g <= 5) g[x.g]++;
  const kms = Object.entries(S).filter(([a, v]) => typeof v === 'number' && /km|dist|walk/i.test(a)).map(([a, v]) => a + '=' + Math.round(v));
  const L = all.filter(([, x]) => x.g === 5 || x.lt).map(([w, x]) => [w, x.sp, x.g, x.lt || '', x.place || '', K(x.t || 0)]);
  const t0 = Math.min(...box.map(p => p.t || Infinity));
  console.log('==', k, 'start', isFinite(t0) ? K(t0) : '-', 'saved', K(S.savedAt || 0), 'grades', g.slice(1).join('/'), kms.join(' '));
  for (const l of L) console.log('   L', JSON.stringify(l));
}
