// 일회용 (경완 2026-11-04 허락): 경완 계정 체육관 일지·연승만 출력
import { execSync } from 'node:child_process';
const q = sql => JSON.parse(execSync(`npx wrangler d1 execute pokegrow --remote --json --command "${sql}"`, { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const s = q("SELECT code, saved, parts FROM save WHERE acct = 'flyweb' ORDER BY saved DESC")[0];
const parts = []; for (let i = 0; i < s.parts; i++) parts.push(q(`SELECT data FROM save_part WHERE acct = 'flyweb' AND code = '${s.code}' AND i = ${i}`)[0].data);
const S = JSON.parse(parts.join('')), g = S.gym;
console.log('saved', new Date(s.saved).toISOString(), 'stk', g.stk, 'w', g.w, 'l', g.l, 'rep', g.rep, 'wk', JSON.stringify(g.wk), 'fixCut1', S.fixCut1);
for (const [t, k, h] of (g.log || []).slice(0, 60)) console.log(new Date(t).toISOString(), k, h.replace(/<[^>]+>/g, ''));
