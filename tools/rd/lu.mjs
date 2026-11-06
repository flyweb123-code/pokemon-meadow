// 일회용: 경완 저장에서 또도가스 계열(110, 10167)·지역 폼 상자 항목만 출력 (읽기 전용)
import fs from 'fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0].results;
const by = {}; for (const r of rows) (by[r.code] ||= []).push(r);
for (const [code, R] of Object.entries(by)) {
  let S; try { S = JSON.parse(R.sort((a, b) => a.i - b.i).map(r => r.data).join('')); } catch (e) { console.log(code, 'parse fail'); continue; }
  console.log('CODE', code, 'savedAt', S.savedAt, 'ver', S.ver);
  for (const p of S.box || []) if (p.sp === 110 || p.sp === 109 || p.sp >= 10000) { const q = { ...p }; delete q.log; console.log(' box', JSON.stringify(q).slice(0, 400), 'gym', JSON.stringify(S.gym?.mon?.[p.id] || null).slice(0, 200)); }
  for (const m of S.mons || []) if (m.sp === 110 || m.sp >= 10000 || m.form === 110 || m.form >= 10000) console.log(' mon', JSON.stringify({ sp: m.sp, form: m.form, sk: m.sk, pid: m.pid }));
}
