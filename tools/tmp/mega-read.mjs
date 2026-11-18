import fs from 'fs';
const rows = f => JSON.parse(fs.readFileSync(f, 'utf8'))[0].results;
const p = rows('/tmp/p.json'); const S = JSON.parse(p.map(r => r.data).join(''));
console.log('ver', S.ver, S.appVer, 'beta?', S.beta, 'mega ring', JSON.stringify(Object.keys(S.gym || {}).filter(k => /mega|ring|mg|gk/i.test(k)).map(k => [k, S.gym[k]])));
for (const P of (S.box || [])) if (P.sp === 670 || P.sp === 718) console.log('BOX', JSON.stringify({ id: P.id, sp: P.sp, fm: P.fm, nm: P.nm, gym: S.gym?.mon?.[P.id] }));
for (const b of (S.gym?.blog || [])) { const s = JSON.stringify(b); console.log('BLOG', s.slice(0, 300)); if (/670|Floette|플로르/i.test(s)) console.log('BLOGFULL', s.slice(0, 6000)); }
console.log('ERRS', JSON.stringify((S.errs || []).slice(-15)));
const t = S.tower || S.gym?.tw || S.tw; if (t) console.log('TOWER', JSON.stringify(t).slice(0, 800));
const bal = rows('/tmp/bal.json'); for (const r of bal) { const s = JSON.stringify(r); if (/670|Floette|dbl|mega/i.test(s)) console.log('BAL', s.slice(0, 1500)); }
