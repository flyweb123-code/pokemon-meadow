// CloudKit(아이폰 친구 서버) → Cloudflare 친구 서버로 옮기기. 여러 번 돌려도 안전하다 (서버는 더 새 기록만 덮어씀).
// node server/ck2cf.mjs            → 옮김 (환경 변수 CLOUDKIT_API_TOKEN, SERVER_ADMIN_TOKEN, SERVER_URL)
// node server/ck2cf.mjs --dry      → CloudKit 에서 읽기만 하고 개수만 보여 줌
const CK = `https://api.apple-cloudkit.com/database/1/iCloud.com.flyweb123.pokerun/production/public/records`;
const TOK = process.env.CLOUDKIT_API_TOKEN, ADMIN = process.env.SERVER_ADMIN_TOKEN;
const URL_ = (process.env.SERVER_URL || 'https://pokegrow.flyweb123.workers.dev').replace(/\/$/, '');
const DRY = process.argv.includes('--dry');
if (!TOK) throw new Error('CLOUDKIT_API_TOKEN 없음');
if (!DRY && !ADMIN) throw new Error('SERVER_ADMIN_TOKEN 없음');

async function ck(path, body) {
  const r = await fetch(`${CK}/${path}?ckAPIToken=${encodeURIComponent(TOK)}`, { method: 'POST', body: JSON.stringify(body) });
  const j = await r.json();
  if (j.serverErrorCode) throw new Error(`${path}: ${j.serverErrorCode} ${j.reason || ''}`);
  return j;
}
async function query(recordType, filterBy, sortBy) {
  const out = []; let marker;
  do {
    const j = await ck('query', { query: { recordType, filterBy, sortBy }, resultsLimit: 200, continuationMarker: marker });
    out.push(...(j.records || [])); marker = j.continuationMarker;
  } while (marker);
  return out;
}
async function lookup(names) {
  const out = [];
  for (let i = 0; i < names.length; i += 100) {
    const j = await ck('lookup', { records: names.slice(i, i + 100).map(recordName => ({ recordName })) });
    out.push(...(j.records || []).filter(r => r.fields));
  }
  return out;
}
const f = (r, k) => r.fields?.[k]?.value;
const at = r => r.modified?.timestamp || r.created?.timestamp || 0;
// 이번 주 월요일 (한국 시간) 'YYYY-MM-DD' — 게임 wkKey 와 같게
function wkKey(t = Date.now()) {
  const d = new Date(t + 9 * 3600e3); const dow = (d.getUTCDay() + 6) % 7;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow));
  return m.toISOString().slice(0, 10);
}

const accounts = await query('Account');
const saves = await query('Save');
const codes = new Set(accounts.map(r => f(r, 'code')).filter(Boolean));
for (const s of saves) { const m = /^V_.+_([A-Z0-9]{8})$/.exec(s.recordName); if (m) codes.add(m[1]); }
const tq = [...await query('Trainer', [{ fieldName: 'dex', comparator: 'GREATER_THAN', fieldValue: { value: 0 } }]),
            ...await query('Trainer', [{ fieldName: 'wk', comparator: 'EQUALS', fieldValue: { value: 'H' + wkKey() } }])];
tq.forEach(r => codes.add(r.recordName.slice(2)));
const trainers = new Map();
for (const r of [...tq, ...await lookup([...codes].map(c => 'T_' + c))]) trainers.set(r.recordName, r);
// 미니게임 기록: 게임별 역대 + 이번 주, 친구 요청: 'fr'+코드
const wk = wkKey().replace(/-/g, 'x');
const games = ['jump', 'balloon', 'berry'].flatMap(g => [g, g + 'W' + wk]).concat([...codes].map(c => 'fr' + c));
const scores = [];
for (const g of games) scores.push(...await query('Score', [{ fieldName: 'game', comparator: 'EQUALS', fieldValue: { value: g } }]));

console.log(`CloudKit: 계정 ${accounts.length}, 저장 ${saves.length}, 트레이너 ${trainers.size}, 기록 ${scores.length} (코드 ${codes.size}개)`);
if (DRY) process.exit(0);

async function put(table, rows) {
  for (let i = 0; i < rows.length; i += table === 'save' ? 1 : 50) {
    const part = rows.slice(i, i + (table === 'save' ? 1 : 50));
    const r = await fetch(`${URL_}/admin/import`, { method: 'POST', headers: { authorization: 'Bearer ' + ADMIN, 'content-type': 'application/json' }, body: JSON.stringify({ table, rows: part }) });
    const j = await r.json().catch(() => ({ ok: false, err: 'HTTP ' + r.status }));
    if (!j.ok) throw new Error(`${table}: ${j.err}`);
  }
  console.log(`넣음 ${table} ${rows.length}`);
}

await put('account', accounts.map(r => ({ id: r.recordName.slice(2), pwh: f(r, 'pwh'), code: f(r, 'code') || '', at: at(r) })).filter(r => r.pwh));
await put('trainer', [...trainers.values()].filter(r => f(r, 'card')).map(r => ({ code: r.recordName.slice(2), card: f(r, 'card'), wk: f(r, 'wk') || '', wkm: f(r, 'wkm') || 0, dex: f(r, 'dex') || 0, at: at(r) })));
await put('score', scores.filter(r => f(r, 'card') && /^S_[A-Z0-9]{8}_/.test(r.recordName)).map(r => ({ code: r.recordName.slice(2, 10), game: f(r, 'game'), best: f(r, 'best') || 0, card: f(r, 'card'), at: at(r) })));
const srows = [];
for (const s of saves) {
  const m = /^V_(.+)_([A-Z0-9]{8})$/.exec(s.recordName), url = f(s, 'data')?.downloadURL;
  if (!m || !url || !f(s, 'sig')) continue;
  const res = await fetch(url.replace('${f}', 'save.json'));
  if (!res.ok) { console.log(`저장 받기 실패 ${s.recordName} ${res.status}`); continue; }
  const data = await res.text();
  let saved = 0; try { saved = +JSON.parse(data).savedAt || 0; } catch (e) {}
  srows.push({ acct: m[1], code: m[2], sig: f(s, 'sig'), saved, at: at(s), data });
}
await put('save', srows);
console.log('끝');
