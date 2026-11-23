// 임시 (읽기만, 곧 지움): 사람마다 최근·많이 주운 알 지역. 결과는 암호화해서만 찍는다 (공개 로그)
const fs = require('fs'), crypto = require('crypto');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = (Array.isArray(j) ? j : [j]).flatMap(r => r.results || []);
const by = {};
for (const r of rows) { let d = {}; try { d = JSON.parse(r.d); } catch (e) {} (by[r.code] = by[r.code] || []).push({ t: r.t, k: d.u || d.c || '?', r: d.r || '?', aw: d.aw ? 1 : 0, s: d.s || '' }); }
const out = Object.entries(by).map(([c, A], i) => { A.sort((a, b) => b.t - a.t); const cnt = {}; A.forEach(a => cnt[a.k] = (cnt[a.k] || 0) + 1);
  return { p: i + 1, n: A.length, last: new Date(A[0].t + 9 * 36e5).toISOString().slice(0, 16), recent: A.slice(0, 15).map(a => [new Date(a.t + 9 * 36e5).toISOString().slice(5, 10), a.k, a.r, a.aw]), top: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8) }; });
const key = crypto.randomBytes(32), iv = crypto.randomBytes(12), ci = crypto.createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([ci.update(JSON.stringify(out)), ci.final(), ci.getAuthTag()]);
const pub = fs.readFileSync(__dirname + '/pub.pem');
console.log('KEY ' + crypto.publicEncrypt({ key: pub, oaepHash: 'sha256' }, key).toString('base64'));
console.log('IV ' + iv.toString('base64'));
console.log('DAT ' + enc.toString('base64'));
