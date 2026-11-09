// 일회용: flyweb 저장에서 체육관 최근 배틀(S.gym.blog)만 읽어 보여 준다 (읽기만)
import { execSync } from 'node:child_process';
import zlib from 'node:zlib';
const q = sql => JSON.parse(execSync(`npx wrangler d1 execute pokegrow --remote --json --command "${sql}"`, { cwd: 'server', maxBuffer: 1 << 28 }).toString())[0].results;
const s = q("SELECT code, saved, parts FROM save WHERE acct = 'flyweb' ORDER BY saved DESC LIMIT 1")[0];
console.log('save', s.code, new Date(s.saved).toISOString(), s.parts);
let data = q(`SELECT i, data FROM save_part WHERE acct = 'flyweb' AND code = '${s.code}' ORDER BY i`).map(r => r.data).join('');
let d; try { d = JSON.parse(data); } catch (e) { try { d = JSON.parse(zlib.gunzipSync(Buffer.from(data, 'base64')).toString()); } catch (e2) { console.log('format?', data.slice(0, 200)); process.exit(0); } }
if (typeof d === 'string') d = JSON.parse(d);
const g = d.gym || d.S?.gym; const B = g?.blog || [];
console.log('battles', B.length, 'mons', JSON.stringify(Object.fromEntries(Object.entries(g?.mon || {}).map(([k, v]) => [k, v.ab]))));
for (const b of B) { console.log('=== BATTLE', b.t ? new Date(b.t).toISOString() : '', 'foe', JSON.stringify(b.foe), 'won', b.won, b.out || '');
  console.log('my', JSON.stringify(b.my)); console.log('fo', JSON.stringify(b.fo));
  for (const l of (b.log || [])) if (/^\|(switch|drag|move|-ability|-activate|-status|-curestatus|-item|-enditem|turn|faint|win|-fail|-immune|cant|-start|-end|-message)\|/.test(l) || /Forewarn|Synchronize|ability/i.test(l)) console.log(l); }
