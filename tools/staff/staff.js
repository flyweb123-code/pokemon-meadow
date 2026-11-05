#!/usr/bin/env node
// 작업실 직원(스칼렛) 루틴 도구. (뉴트럴 밸런스 시뮬레이터는 작업실 3.97 에서 없앰) 사용법은 staff/README.md
//   node tools/staff/staff.js scarlet-add <JSON 파일> 오늘 소품 10개 검사하고 config/staff/scarlet.json 맨 앞에 넣기
//   node tools/staff/staff.js fb-pending              아직 반영 안 한 작업물 피드백 보기
//   node tools/staff/staff.js fb-done <id> <글 파일>  그 피드백을 반영했다고 기록 (무엇을 했는지 한두 문장, config/staff/feedback-done.json)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), F = p => path.join(ROOT, 'config/staff', p);
const rd = (p, d) => { try { return JSON.parse(fs.readFileSync(F(p), 'utf8')); } catch (e) { return d; } };
const wr = (p, o) => { fs.mkdirSync(path.dirname(F(p)), { recursive: true }); fs.writeFileSync(F(p), JSON.stringify(o, null, 1) + '\n'); };
const txt = f => fs.readFileSync(f, 'utf8').trim();
const STAFF = { neu: '뉴트럴', sca: '스칼렛' };

function scarletAdd(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8')), L = d.items || [], bad = [];
  if (L.length !== 10) bad.push(`소품이 ${L.length}개예요 (10개여야 해요)`);
  const R0 = rd('scarlet.json', { days: [] }), old = new Set([...(R0.days || []).flatMap(x => x.items.map(o => o.id)), ...(R0.trash || []).map(o => o.id)]);   // 휴지통(경완이 지운 것)의 id 도 다시 쓰지 않음
  L.forEach((o, i) => { const at = `${i + 1}번(${o.n || '?'})`;
    if (!o.id || !/^[a-z0-9-]+$/.test(o.id)) bad.push(`${at}: id 는 영문 소문자·숫자·- 만`); if (old.has(o.id)) bad.push(`${at}: id ${o.id} 는 이미 있어요`);
    if (!o.n || !o.d) bad.push(`${at}: 이름(n)과 설명(d)이 필요해요`);
    if (!Array.isArray(o.px) || !o.px.length) { bad.push(`${at}: 도트 줄(px)이 없어요`); return; }
    const w = o.px[0].length; if (o.px.length < 12 || o.px.length > 40 || w < 12 || w > 40) bad.push(`${at}: 도트 크기 ${w}×${o.px.length} (12~40칸)`);
    o.px.forEach((r, y) => { if (r.length !== w) bad.push(`${at}: ${y + 1}째 줄 길이가 ${r.length} (첫 줄 ${w})`); for (const c of r) if (c !== '.' && !o.pal?.[c]) bad.push(`${at}: 색 '${c}' 이 pal 에 없어요`); });
    for (const [c, v] of Object.entries(o.pal || {})) if (!/^#[0-9a-f]{6}$/i.test(v)) bad.push(`${at}: 색 ${c} 값 ${v}`);
    const grn = v => { const n = parseInt(String(v).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); return g === mx && mx - mn > 24 && g - b > 12; };   // 2026-10-23 경완: 밑둥 풀·그림자 금지
    if (o.px.slice(-2).some(r => [...r].some(c => c !== '.' && grn(o.pal?.[c])))) bad.push(`${at}: 맨 아래 두 줄에 풀색이 있어요 — 밑둥 풀·그림자는 그리지 않아요`);
    if (!Array.isArray(o.acts) || o.acts.length < 2) bad.push(`${at}: 상호작용(acts)을 2개 이상`); });
  const uniq = [...new Set(bad)]; if (uniq.length) { console.error(uniq.join('\n')); process.exit(1); }
  const R = rd('scarlet.json', { days: [] }); R.days = [{ at: Date.now(), theme: d.theme || '', note: d.note || '', items: L }, ...(R.days || [])].slice(0, 60); wr('scarlet.json', R);
  console.log(`소품 ${L.length}개를 올렸어요`);
}

function fbPending() { const I = rd('feedback.json', { items: [] }).items || [], D = new Set((rd('feedback-done.json', { items: [] }).items || []).map(d => d.id)), P = I.filter(f => !D.has(f.id) && f.to !== 'neu');   // 작업실 3.97: 뉴트럴은 없어서 뉴트럴 피드백은 건너뜀
  if (!P.length) { console.log('반영할 피드백이 없어요'); return; }
  for (const f of P) console.log(`=== ${f.id} → ${STAFF[f.to] || f.to} (${new Date(f.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}) ${f.ref === 'all' ? '[전체 작업]' : `[소품 ${f.ref} ${f.refn || ''}]`}\n${f.t}\n`); }
function fbDone(id, file) { const f = (rd('feedback.json', { items: [] }).items || []).find(x => x.id === id); if (!f) { console.error('그런 피드백이 없어요: ' + id); process.exit(1); }
  const D = rd('feedback-done.json', { items: [] }); D.items = [...(D.items || []).filter(d => d.id !== id), { id, at: Date.now(), note: txt(file) }].slice(-500); wr('feedback-done.json', D); console.log(`${STAFF[f.to]} 반영 기록을 넣었어요`); }

const [cmd, a, b] = process.argv.slice(2);
({ 'scarlet-add': () => scarletAdd(a), 'fb-pending': fbPending, 'fb-done': () => fbDone(a, b) }[cmd] || (() => { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 5).join('\n')); }))();
