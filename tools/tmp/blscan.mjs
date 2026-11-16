import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {};
for (const r of rows) (by[r.acct + '/' + r.code] ||= []).push(r);
for (const k in by) {
  if (!/^flyweb\//.test(k)) continue;
  let S; try { S = JSON.parse(by[k].sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(k, 'parse err'); continue; }
  const g = S.gym || {};
  console.log('==', k, 'ver', S.ver || S.v, 'gmax', g.gmax, 'rep', g.rep);
  for (const P of (S.box || []).filter(p => p.sp === 776)) { const m = (g.mon || {})[P.id] || {}; console.log('776', P.id, 'lv', m.lv, 'mv', (m.mv || []).join(','), 'kn', (m.kn || []).join(','), 'egP', JSON.stringify(m.egP), 'egS', JSON.stringify(m.egS), 'it', m.it, 'fr', P.fr); }
  console.log('aw', JSON.stringify(g.aw || null).slice(0, 300));
  for (const r of (g.blog || []).slice(0, 4)) {
    console.log('--- BLOG', new Date(r.t + 9 * 3600e3).toISOString().slice(5, 16), 'v', r.v, 'foe', r.foe, 'won', r.won, 'out', r.out, 'pr', r.pr, 'turns', r.turns);
    console.log('my', JSON.stringify(r.my)); console.log('fo', JSON.stringify(r.fo));
    (r.log || []).filter(l => /gametype|^\|move\||-item|-enditem|-supereffective|-resisted|^\|turn\||^\|switch\|p1|^\|win/.test(l)).slice(0, 80).forEach(l => console.log('  ', l.slice(0, 140)));
  }
}
