#!/usr/bin/env node
// 작업실 직원(뉴트럴·스칼렛) 루틴 도구. 사용법은 staff/README.md
//   node tools/staff/staff.js neutral-run            지금 배포된 값으로 100명 90일 시뮬레이션 → config/staff/neutral.json 맨 앞에 기록 (글은 비어 있음)
//   node tools/staff/staff.js neutral-say <글 파일>   맨 앞 기록에 뉴트럴의 분석 글 넣기
//   node tools/staff/staff.js scarlet-add <JSON 파일> 오늘 소품 10개 검사하고 config/staff/scarlet.json 맨 앞에 넣기
//   node tools/staff/staff.js fb-pending              아직 반영 안 한 작업물 피드백 보기
//   node tools/staff/staff.js fb-done <id> <글 파일>  그 피드백을 반영했다고 기록 (무엇을 했는지 한두 문장, config/staff/feedback-done.json)
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '../..'), F = p => path.join(ROOT, 'config/staff', p);
const rd = (p, d) => { try { return JSON.parse(fs.readFileSync(F(p), 'utf8')); } catch (e) { return d; } };
const wr = (p, o) => { fs.mkdirSync(path.dirname(F(p)), { recursive: true }); fs.writeFileSync(F(p), JSON.stringify(o, null, 1) + '\n'); };
const txt = f => fs.readFileSync(f, 'utf8').trim();
const STAFF = { neu: '뉴트럴', sca: '스칼렛' };

function serve() { const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
  return new Promise(ok => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
    s.listen(0, '127.0.0.1', () => ok(s)); }); }

async function neutralRun() {
  let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
  const s = await serve(), b = await pw.chromium.launch(), p = await b.newPage();
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/studio/`);
    await p.waitForFunction(() => typeof A !== 'undefined' && A && typeof ORIG !== 'undefined' && ORIG, null, { timeout: 120000 });
    const r = await p.evaluate(() => window.__neuRun()); r.text = '';
    const R = rd('neutral.json', { runs: [] }); R.runs = [r, ...(R.runs || [])].slice(0, 60); wr('neutral.json', R);
    console.log(`게임 ${r.app} · 데이터 v${r.data} · 도감 ${r.s.N}종 · ${r.s.users}명 ${r.s.days}일`);
    for (const j of r.J) console.log(`[${j.lv}] ${j.n}: ${j.txt} (적당 ${j.lo}~${j.hi}) ${j.lv === 'ok' ? '' : j.why}`);
    console.log('\n생활 패턴별 (가운데 사람)'); for (const [k, o] of Object.entries(r.s.by)) console.log(`${o.name}: 하루 ${o.km.toFixed(1)}km, 도감 30일 ${Math.round(o.dex30 * 100)}% / 90일 ${Math.round(o.dex90 * 100)}%, 첫 에픽 ${o.fE}일, 첫 전설 ${o.fL}일 (90일 동안 못 본 사람 ${Math.round(o.noL * 100)}%), 하루 골드 ${Math.round(o.gpd)}G (출처 ${JSON.stringify(o.src)}), 진화의 돌 ${o.buy}개 삼, 친밀도 160 ${o.fr160}일·만점 ${o.frMax}일, 30일 가방 ${o.bag30}개`);
    console.log(`\n제일 드문 포켓몬: ${r.s.rare?.n} (${['', '일반', '우수', '레어', '에픽', '전설'][r.s.rare?.g]} 알) ${Math.round(r.s.rare?.km || 0)}km에 하나꼴`);
    console.log('\n고칠 거리:'); for (const x of r.P) console.log(`- ${x.t}: ${x.why}${x.after?.length ? ' → 고치면 ' + x.after.map(a => `${a.n} ${a.from}→${a.to}(${a.lv})`).join(', ') : ''}`);
    if (R.runs[1]) { const o = R.runs[1]; console.log(`\n지난번(${new Date(o.at).toLocaleDateString('ko-KR')}, 게임 ${o.app}, 데이터 v${o.data}): ` + o.J.map(j => `${j.n} ${j.txt}`).join(' · ')); }
  } finally { await b.close(); s.close(); }
}

function scarletAdd(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8')), L = d.items || [], bad = [];
  if (L.length !== 10) bad.push(`소품이 ${L.length}개예요 (10개여야 해요)`);
  const old = new Set((rd('scarlet.json', { days: [] }).days || []).flatMap(x => x.items.map(o => o.id)));
  L.forEach((o, i) => { const at = `${i + 1}번(${o.n || '?'})`;
    if (!o.id || !/^[a-z0-9-]+$/.test(o.id)) bad.push(`${at}: id 는 영문 소문자·숫자·- 만`); if (old.has(o.id)) bad.push(`${at}: id ${o.id} 는 이미 있어요`);
    if (!o.n || !o.d) bad.push(`${at}: 이름(n)과 설명(d)이 필요해요`);
    if (!Array.isArray(o.px) || !o.px.length) { bad.push(`${at}: 도트 줄(px)이 없어요`); return; }
    const w = o.px[0].length; if (o.px.length < 12 || o.px.length > 40 || w < 12 || w > 40) bad.push(`${at}: 도트 크기 ${w}×${o.px.length} (12~40칸)`);
    o.px.forEach((r, y) => { if (r.length !== w) bad.push(`${at}: ${y + 1}째 줄 길이가 ${r.length} (첫 줄 ${w})`); for (const c of r) if (c !== '.' && !o.pal?.[c]) bad.push(`${at}: 색 '${c}' 이 pal 에 없어요`); });
    for (const [c, v] of Object.entries(o.pal || {})) if (!/^#[0-9a-f]{6}$/i.test(v)) bad.push(`${at}: 색 ${c} 값 ${v}`);
    if (!Array.isArray(o.acts) || o.acts.length < 2) bad.push(`${at}: 상호작용(acts)을 2개 이상`); });
  const uniq = [...new Set(bad)]; if (uniq.length) { console.error(uniq.join('\n')); process.exit(1); }
  const R = rd('scarlet.json', { days: [] }); R.days = [{ at: Date.now(), theme: d.theme || '', note: d.note || '', items: L }, ...(R.days || [])].slice(0, 60); wr('scarlet.json', R);
  console.log(`소품 ${L.length}개를 올렸어요`);
}

function fbPending() { const I = rd('feedback.json', { items: [] }).items || [], D = new Set((rd('feedback-done.json', { items: [] }).items || []).map(d => d.id)), P = I.filter(f => !D.has(f.id));
  if (!P.length) { console.log('반영할 피드백이 없어요'); return; }
  for (const f of P) console.log(`=== ${f.id} → ${STAFF[f.to] || f.to} (${new Date(f.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}) ${f.ref === 'all' ? '[전체 작업]' : `[소품 ${f.ref} ${f.refn || ''}]`}\n${f.t}\n`); }
function fbDone(id, file) { const f = (rd('feedback.json', { items: [] }).items || []).find(x => x.id === id); if (!f) { console.error('그런 피드백이 없어요: ' + id); process.exit(1); }
  const D = rd('feedback-done.json', { items: [] }); D.items = [...(D.items || []).filter(d => d.id !== id), { id, at: Date.now(), note: txt(file) }].slice(-500); wr('feedback-done.json', D); console.log(`${STAFF[f.to]} 반영 기록을 넣었어요`); }

const [cmd, a, b] = process.argv.slice(2);
({ 'neutral-run': () => neutralRun().catch(e => { console.error(e); process.exit(1); }),
  'neutral-say': () => { const R = rd('neutral.json', { runs: [] }); if (!R.runs?.[0]) { console.error('먼저 neutral-run'); process.exit(1); } R.runs[0].text = txt(a); wr('neutral.json', R); console.log('넣었어요'); },
  'scarlet-add': () => scarletAdd(a), 'fb-pending': fbPending, 'fb-done': () => fbDone(a, b) }[cmd] || (() => { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 8).join('\n')); }))();
