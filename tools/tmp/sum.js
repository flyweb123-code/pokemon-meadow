// 임시 요약 (읽기만). 알 속 종은 찍지 않는다
const fs = require('fs');
const rows = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return (Array.isArray(j) ? j : [j]).flatMap(r => r.results || []); };
const K = t => t ? new Date(t + 9 * 36e5).toISOString().slice(0, 16).replace('T', ' ') + ' KST' : '-';
function sum(S, tag) {
  console.log(`=== ${tag} ===`);
  console.log('seenAt', K(S.seenAt), 'savedAt', K(S.savedAt), 'walkSync', K(S.walkSync), 'totalKm', S.totalKm, 'walkKm', S.walkKm);
  console.log('dorm', JSON.stringify(S.dorm && { ...S.dorm, k: K(S.dorm.k) }));
  const eggs = S.eggs || [];
  console.log('incubator', eggs.length, eggs.map(e => ({ id: e.id, g: e.g, km: +(+e.km).toFixed(2), need: e.need, ready: e.km >= e.need, t: K(e.t), place: e.place, gc: !!e.gc, ct: e.ct })));
  const bag = S.bag || []; const bg = {}; bag.forEach(e => bg[e.g] = (bg[e.g] || 0) + 1);
  console.log('bag', bag.length, JSON.stringify(bg), 'newest', K(Math.max(0, ...bag.map(e => e.t || 0))));
  const box = (S.box || []).slice().sort((a, b) => (b.t || 0) - (a.t || 0));
  console.log('box', box.length, 'eid', S.eid);
  box.slice(0, 12).forEach(P => console.log('  born', K(P.t), 'sp', P.sp, 'g', P.g, 'place', P.place, P.nw ? 'NEW' : ''));
  console.log('recentHatch', JSON.stringify(S.recentHatch));
  const L = (S.log || []).slice(-40); console.log('log tail'); L.forEach(x => console.log('  ', JSON.stringify(x).slice(0, 200)));
}
const p = rows(process.argv[2]).map(r => r.data).join('');
if (p) sum(JSON.parse(p), 'current');
try { const b = rows(process.argv[3]); const by = {}; b.forEach(r => (by[r.slot] = by[r.slot] || []).push(r.data));
  for (const s of Object.keys(by).sort().slice(-3)) { try { const S = JSON.parse(by[s].join('')); console.log('--- bak', s, 'seenAt', K(S.seenAt), 'eggs', (S.eggs||[]).length, 'ready', (S.eggs||[]).filter(e=>e.km>=e.need).length, 'bag', (S.bag||[]).length, 'box', (S.box||[]).length, 'km', S.totalKm); } catch (e) { console.log('bak parse', s, e.message); } } } catch (e) { console.log('bak err', e.message); }
