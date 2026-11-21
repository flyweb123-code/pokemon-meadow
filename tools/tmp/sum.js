// 임시 요약 (읽기만). 알 속 종은 찍지 않는다
const fs = require('fs');
const rows = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return (Array.isArray(j) ? j : [j]).flatMap(r => r.results || []); };
const K = t => typeof t === 'number' && t > 1e12 ? new Date(t + 9 * 36e5).toISOString().slice(5, 16).replace('T', ' ') : String(t);
function sum(S, tag) {
  console.log(`=== ${tag} ===`);
  console.log('seenAt', K(S.seenAt), 'savedAt', K(S.savedAt), 'since', K(S.since), 'walkSync', S.walkSync, 'totalKm', S.totalKm, 'walkKm', S.walkKm, 'ver', S.ver || S.v);
  console.log('dorm', JSON.stringify(S.dorm), 'today', JSON.stringify(S.today), 'wk', JSON.stringify(S.wk), 'lastPlace', JSON.stringify(S.lastPlace)?.slice(0, 200));
  console.log('fedLog', JSON.stringify((S.fedLog || []).map(([a, b, k]) => [K(a), K(b), k])));
  console.log('eggsKm', JSON.stringify((S.eggs || []).map(e => [e.id, e.g, +(+e.km).toFixed(2), e.need])), 'bag', (S.bag || []).length);
  console.log('runs', JSON.stringify(S.runs?.slice?.(-10) || S.runs)?.slice(0, 800));
  console.log('keys', Object.keys(S).map(k => k + ':' + JSON.stringify(S[k])?.length).join(' '));
  console.log('errs', JSON.stringify(S.errs)?.slice(0, 1500));
  console.log('places', JSON.stringify(S.places)?.slice(-600));
  const dz = S.days || S.hist || S.daily; if (dz) console.log('days', JSON.stringify(dz).slice(-1500));
}
const p = rows(process.argv[2]).map(r => r.data).join('');
const b = rows(process.argv[3]); const by = {}; b.forEach(r => (by[r.slot] = by[r.slot] || []).push(r.data));
for (const s of Object.keys(by).sort()) { try { sum(JSON.parse(by[s].join('')), 'bak ' + s); } catch (e) { console.log('bak parse', s, e.message); } }
if (p) sum(JSON.parse(p), 'current');
