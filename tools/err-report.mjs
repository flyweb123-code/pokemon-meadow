// .github/workflows/err-report.yml 이 돌림: D1 err 표의 새 오류(st 0) → GitHub 이슈 'auto-err' (경완 2026-11-04)
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'pokegrow', '--remote', '--json', '--command', sql], { cwd: 'server', maxBuffer: 1 << 30 }).toString())[0].results;
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
const hexk = k => String(k).replace(/[^0-9a-f]/g, '');
// 1) 닫힌 이슈 = 고친 오류 → st 2 (다시 나면 서버가 st 0 으로 되돌림)
for (const r of d1('SELECT k, issue FROM err WHERE st = 1 AND issue > 0')) {
  try { if (gh('issue', 'view', String(r.issue), '--json', 'state', '-q', '.state') === 'CLOSED') d1(`UPDATE err SET st = 2 WHERE k = '${hexk(r.k)}'`); } catch (e) {}
}
// 2) 새 오류 → 이슈 (고쳤던 오류가 다시 나면 같은 이슈를 다시 엶)
const rows = d1('SELECT k, msg, where_, ver, beta, ctx, n, codes, at0, at, issue FROM err WHERE st = 0 ORDER BY at LIMIT 20');
if (!rows.length) { console.log('새 오류 없음'); process.exit(0); }
try { gh('label', 'create', 'auto-err', '--color', 'd73a4a', '--description', '게임에서 자동 보고된 오류'); } catch (e) {}
for (const r of rows) {
  let ctx = {}; try { ctx = JSON.parse(r.ctx || '{}'); } catch (e) {}
  const users = r.codes ? r.codes.split(',').length : 1;
  const body = ['게임에서 오류 창이 뜬 오류예요 (자동 보고).', '',
    `- 오류: \`${r.msg}\``, `- 위치: \`${r.where_ || '-'}\``, `- 버전: ${r.ver || '?'}${r.beta ? ' (베타)' : ''}`,
    `- 횟수: ${r.n}회, ${users}명`, `- 처음: ${new Date(r.at0).toISOString()} · 마지막: ${new Date(r.at).toISOString()}`, `- 키: \`${r.k}\``, '',
    '<details><summary>마지막 상황</summary>', '', '```json', JSON.stringify(ctx, null, 1).slice(0, 55000), '```', '</details>'].join('\n');
  writeFileSync('/tmp/body.md', body);
  let num = r.issue;
  if (num) { try { gh('issue', 'reopen', String(num)); gh('issue', 'comment', String(num), '--body-file', '/tmp/body.md'); } catch (e) { num = 0; } }
  if (!num) { const url = gh('issue', 'create', '--title', `[자동 오류] ${r.msg.slice(0, 80)}`, '--label', 'auto-err', '--body-file', '/tmp/body.md'); num = +url.split('/').pop(); }
  d1(`UPDATE err SET st = 1, issue = ${num | 0} WHERE k = '${hexk(r.k)}'`);
  console.log('issue', num, r.msg);
}
