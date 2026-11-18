import fs from 'fs';
const rows = f => JSON.parse(fs.readFileSync(f, 'utf8'))[0].results;
const eg = e => [e.id, e.g, e.place, e.gc ? 'gc' : '', e.ct || '', e.lt || '', e.t && new Date(e.t).toISOString().slice(0, 16), e.km, e.need].join('|');
const live = JSON.parse(rows('/tmp/p.json').map(r => r.data).join(''));
const bp = rows('/tmp/bp.json'), by = {}; for (const r of bp) (by[r.slot] ||= []).push(r.data);
const sets = { ...Object.fromEntries(Object.entries(by).filter(([s]) => s >= 'd2026-11-16').map(([s, a]) => [s, JSON.parse(a.join(''))])), LIVE: live };
for (const [s, S] of Object.entries(sets)) {
  console.log('##', s, 'savedAt', S.savedAt && new Date(S.savedAt).toISOString(), 'eid', S.eid, 'box', S.box.length);
  console.log(' incu', JSON.stringify(S.eggs.map(eg)));
  console.log(' bag', JSON.stringify(S.bag.map(eg)));
  console.log(' ga', JSON.stringify({ pt: S.ga?.pt, pity: S.ga?.pity, t: S.ga?.t, in: (S.ga?.in || []).length }));
}
const ids = new Set(sets['d2026-11-18'].box.map(p => p.id));
console.log('NEW in LIVE', JSON.stringify(live.box.filter(p => !ids.has(p.id)).map(p => [p.id, p.sp, p.g, p.place, new Date(p.t).toISOString().slice(0, 19), (p.iv || []).reduce((a, b) => a + b, 0)])));
console.log('hatchQ', JSON.stringify(live.hatchQ || null), 'log tail', JSON.stringify((live.log || live.logs || []).slice(-15)));
console.log('keys', Object.keys(live).join(','));
