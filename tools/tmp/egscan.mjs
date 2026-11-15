import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const EGG = JSON.parse(fs.readFileSync('../gym/egg.json', 'utf8'));
const by = {};
for (const r of rows) (by[r.acct + '/' + r.code] ||= []).push(r);
for (const k in by) {
  if (!/flyweb|2X392NYD|^test\//.test(k)) continue;
  let S; try { S = JSON.parse(by[k].sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(k, 'parse err'); continue; }
  const g = S.gym || {}, gl = S.gyms ? Object.keys(S.gyms) : [];
  console.log('==', k, 'gym keys', Object.keys(g).length, 'gyms', gl.length, 'ver', S.ver || S.v);
  const E = EGG.sp || EGG;
  for (const [id, m] of Object.entries(g.mon || {})) {
    const P = (S.box || []).find(p => String(p.id) === id); if (!P) continue;
    const eg = E[P.sp] || [], hit = [];
    eg.forEach((mv, i) => { const p = (m.egP || [])[i] || 0, inMv = (m.mv || []).includes(mv), inKn = (m.kn || []).includes(mv); if (p >= 100 || inMv || inKn) hit.push(`${i}:${mv} p=${Math.round(p)} mv=${+inMv} kn=${+inKn}`); });
    if (hit.length) console.log(P.sp, P.nm || '', 'lv', m.lv, 'sp', m.sp, '|', hit.join(' ; '), '| mv', (m.mv || []).join(','), '| egF', m.egF);
  }
  const L = (g.log || []).filter(l => typeof l[2] === 'string' && /특별한 기술/.test(l[2])).slice(-15);
  L.forEach(l => console.log('LOG', new Date(l[0] + 9 * 3600e3).toISOString().slice(5, 16), String(l[2]).replace(/<[^>]+>/g, '').slice(0, 120)));
  console.log('aw', JSON.stringify(g.aw || null).slice(0, 400));
}
