// 일회용: 경완 저장에서 체육관 라인업(포켓몬·레벨)만 출력 (읽기 전용)
import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {}; for (const r of rows) (by[r.code] ||= []).push(r);
for (const [code, R] of Object.entries(by)) {
  let S; try { S = JSON.parse(R.sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(code, 'parse fail'); continue; }
  const g = S.gym; if (!g) { console.log(code, 'no gym'); continue; }
  const box = Object.fromEntries((S.box || []).map(p => [p.id, p]));
  for (const G of [g, ...(g.shelf || [])]) {
    console.log('CODE', code, 'savedAt', S.savedAt, 'gym', G.nm, 'ty', G.ty, 'luI', G.luI);
    (G.lu || []).forEach((L, i) => console.log(' lu' + i, JSON.stringify(L.map(id => [box[id]?.sp, (g.mon?.[id] || G.mon?.[id])?.lv]))));
  }
}
