// 일회용: 경완 계정 서버 저장에서 마지막 배틀 기록(S.gym.blog)과 오류 목록(S.errs)만 뽑아 보여 준다 (경완 2026-11-04 허락)
import { execSync } from 'node:child_process';
const q = sql => JSON.parse(execSync(`npx wrangler d1 execute pokegrow --remote --json --command "${sql}"`, { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const saves = q("SELECT code, saved, parts, at FROM save WHERE acct = 'flyweb' ORDER BY saved DESC");
console.log('saves', JSON.stringify(saves));
for (const s of saves.slice(0, 2)) {
  const parts = [];
  for (let i = 0; i < s.parts; i++) parts.push(q(`SELECT data FROM save_part WHERE acct = 'flyweb' AND code = '${s.code}' AND i = ${i}`)[0].data);
  let S; try { S = JSON.parse(parts.join('')); } catch (e) { console.log('parse fail', s.code, e.message); continue; }
  console.log('=== save', s.code, new Date(s.saved).toISOString(), 'ver', S.ver || S.v);
  console.log('--- errs'); for (const e of (S.errs || []).slice(-30)) console.log(JSON.stringify(e), new Date(e[0]).toISOString());
  const G = S.gym || {};
  console.log('--- gym stk', G.stk, 'w', G.w, 'l', G.l, 'rep', G.rep);
  for (const b of (G.blog || [])) {
    console.log('### battle', new Date(b.t).toISOString(), 'v', b.v, 'foe', b.foe, 'won', b.won, 'out', b.out, 'pr', b.pr, 'turns', b.turns);
    console.log('my', JSON.stringify(b.my)); console.log('fo', JSON.stringify(b.fo)); console.log('ch', JSON.stringify(b.ch));
    console.log((Array.isArray(b.log) ? b.log : String(b.log || '').split('\n')).join('\n'));
  }
}
