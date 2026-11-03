// 시험용 손님 봇 (2026-11-03 경완 '시뮬레이터 하나 만들어서 놀러 와'): 진짜 서버에 '클로드' 트레이너로 친구 요청을 보내고,
// 받아 주면 그 사람 필드에 들어가 걸어 다니며 말하고 포켓몬을 쓰다듬는다. GitHub Actions(.github/workflows/visit-bot.yml)에서 돈다.
// node tools/visit-bot.mjs  (환경 변수 SERVER, TO=주인 친구 코드, BOT_SEED, STAY_MIN)
import { createHash } from 'node:crypto';
const SERVER = (process.env.SERVER || 'https://pokegrow.flyweb123.workers.dev').replace(/\/$/, '');
const TO = (process.env.TO || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const DEV = 'bot:' + createHash('sha256').update('visitbot:' + (process.env.BOT_SEED || 'pokegrow')).digest('hex').slice(0, 40);
const STAY = (+process.env.STAY_MIN || 8) * 60e3, WAIT = (+process.env.WAIT_MIN || 25) * 60e3;
const NAME = process.env.BOT_NAME || '클로드';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function api(o) {
  const r = await fetch(SERVER + '/v1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...o, dev: DEV }) });
  const j = await r.json(); if (!j.ok) throw new Error(j.err || 'error'); return j.v;
}
if (TO.length !== 8) { console.log('TO (주인 친구 코드 8글자) 가 필요해요'); process.exit(1); }
const me = await api({ op: 'me' });
const card = JSON.stringify({ v: 1, n: NAME, sex: 'm', dex: 1 });
await api({ op: 'publish', card, wk: '', wkm: 0, dex: 1 });
log('봇 코드', me, '→ 주인', TO);

// 0) 주인 모드 (HOST=1, 2026-11-03 경완 '클로드 봇도 필드 열어놔줘'): 내 필드를 올려 두고 내 방에 주인으로 있으면서
//    걸어 다니고, 손님이 오면 인사하고 말에 답한다. 손님은 TO (그 사람이 내 필드에 들어올 수 있게)
if (process.env.HOST) {
  const { readFileSync } = await import('node:fs');
  const field = readFileSync(new URL('./visit-bot-field.json', import.meta.url), 'utf8');
  await api({ op: 'fieldPut', data: field, fr: [TO] });
  log('필드 열어 둠. 손님', TO, '·', Math.round(STAY / 60e3), '분 동안');
  const ws = await (async () => { const tk = await api({ op: 'visitTicket', to: me }); const w = new WebSocket(`${SERVER.replace(/^http/, 'ws')}/room/${me}?t=${encodeURIComponent(tk.t)}`); await new Promise((r, j) => { w.onopen = r; w.onerror = j; }); return w; })();
  const send = o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const say = m => { send({ t: 'chat', m }); log('말:', m); };
  const guests = new Map();
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (er) { return; }
    if (m.t === 'hi') { for (const p of m.ppl || []) if (!p.o) guests.set(p.c, p.n); log('주인으로 들어옴. 손님', guests.size); }
    else if (m.t === 'join' && !m.p.o) { guests.set(m.p.c, m.p.n); log('손님 옴:', m.p.n); setTimeout(() => say(`${m.p.n} 어서 와! 내 필드 구경하고 가`), 2000); }
    else if (m.t === 'leave' && guests.has(m.c)) { log('손님 감:', guests.get(m.c)); guests.delete(m.c); }
    else if (m.t === 'chat' && m.c !== me) {
      log('손님 말:', m.n, m.m);
      const r = /안녕|하이|ㅎㅇ/.test(m.m) ? '안녕! 놀러 와 줘서 고마워' : /\?/.test(m.m) ? '음… 그건 나도 잘 모르겠어!' : /ㅋ|ㅎ/.test(m.m) ? 'ㅋㅋㅋ' : '좋아!';
      setTimeout(() => say(r), 1800);
    } else if (m.t === 'act') log('손님이', m.k === 'pet' ? '쓰다듬음' : m.k === 'berry' ? '열매 줌' : m.k, m.u || '');
    else if (m.t === 'err') log('서버:', m.m);
  };
  ws.onclose = e => { log('연결 끝', e.code); process.exit(0); };
  send({ t: 'field', d: field });
  setInterval(() => send({ t: 'ping' }), 25e3);
  let x = 200, y = 430, tx = x, ty = y, pause = 0, lastF = 0;
  const pick = () => { tx = 50 + Math.random() * 260; ty = 380 + Math.random() * 170; };
  setInterval(() => {
    if (!guests.size) return;   // 손님이 없으면 가만히
    if (pause > 0) { pause--; send({ t: 'tr', x, y, d: 0, w: 0, f: lastF, out: 1 }); return; }
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
    if (d < 4) { pause = 8 + Math.floor(Math.random() * 20); pick(); return; }
    const v = Math.min(d, 72 * 0.25); if (Math.abs(dx) > 1) lastF = dx > 0 ? 1 : 0; x += dx / d * v; y += dy / d * v;
    send({ t: 'tr', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: Math.abs(dx) > Math.abs(dy) ? 2 : dy < 0 ? 1 : 0, w: 1, f: lastF, out: 1 });
  }, 250);
  send({ t: 'tr', x, y, d: 0, w: 0, f: 0, out: 1 });
  setTimeout(() => { if (guests.size) say('이제 가 봐야 해. 또 놀러 와!'); setTimeout(() => ws.close(), 3000); }, STAY);
  await new Promise(() => {});
}

// 1) 친구 요청 (이미 친구면 바로 표가 나옴)
let tk = null, asked = false; const t0 = Date.now();
while (Date.now() - t0 < WAIT) {
  try { tk = await api({ op: 'visitTicket', to: TO }); break; }
  catch (e) {
    if (!asked) { await api({ op: 'score', game: 'fr' + TO, best: Date.now(), card }); asked = true; log('친구 요청 보냄 — 게임에서 받아 주세요:', e.message); }
    await sleep(20e3);
  }
}
if (!tk) { log('친구가 되지 않아서 들어가지 못했어요'); process.exit(1); }

// 2) 방에 들어가기
const ws = new WebSocket(`${SERVER.replace(/^http/, 'ws')}/room/${TO}?t=${encodeURIComponent(tk.t)}`);
let mons = [], ownerOn = false, x = 180, y = 470, tx = x, ty = y, said = new Set(), live = new Map();
const send = o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const say = m => { send({ t: 'chat', m }); log('말:', m); };
ws.onmessage = e => {
  let m; try { m = JSON.parse(e.data); } catch (er) { return; }
  if (m.t === 'hi') {
    ownerOn = m.on; try { mons = (JSON.parse(m.field || '{}').mons || []).map(p => p.uid).filter(Boolean); } catch (er) {}
    log('들어옴. 주인', ownerOn ? '있음' : '없음', '포켓몬', mons.length, '마리');
  } else if (m.t === 'own') { ownerOn = m.on; log('주인', m.on ? '들어옴' : '나감'); if (m.on) setTimeout(() => say('안녕! 기다리고 있었어'), 1500); }
  else if (m.t === 'mons') { for (const r of m.L || []) live.set(r[0], r); }
  else if (m.t === 'chat' && m.c !== me) {
    log('주인 말:', m.n, m.m);
    const r = /안녕|하이|ㅎㅇ/.test(m.m) ? '안녕안녕! 필드 구경 중이야' : /\?/.test(m.m) ? '음… 나도 잘 모르겠어!' : '좋아!';
    setTimeout(() => say(r), 1800);
  } else if (m.t === 'err') log('서버:', m.m);
};
ws.onclose = e => { log('연결 끝', e.code); process.exit(0); };
await new Promise(r => { ws.onopen = r; });
setInterval(() => send({ t: 'ping' }), 25e3);

// 3) 걸어 다니기 (필드 아래쪽 풀밭 위주), 가끔 말하고 쓰다듬기
const pick = () => { tx = 50 + Math.random() * 260; ty = 380 + Math.random() * 170; };
let step = 0, pause = 0, lastF = 0;
setInterval(() => {
  if (pause > 0) { pause--; send({ t: 'tr', x, y, d: 0, w: 0, f: lastF }); return; }
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
  if (d < 4) { pause = 5 + Math.floor(Math.random() * 15); pick(); return; }
  const v = Math.min(d, 72 * 0.25); if (Math.abs(dx) > 1) lastF = dx > 0 ? 1 : 0; x += dx / d * v; y += dy / d * v;
  send({ t: 'tr', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: Math.abs(dx) > Math.abs(dy) ? 2 : dy < 0 ? 1 : 0, w: 1, f: dx > 0 ? 1 : 0 });   // f = 오른쪽을 봄 (게임 stepMe 와 같게)
  step++;
}, 250);
pick();
const lines = ['안녕! 클로드가 놀러 왔어', '와 필드 예쁘다', '포켓몬들 귀엽다!', '열매 하나 두고 갈게', '또 놀러 올게!'];
const plan = [[3e3, () => say(lines[0])], [25e3, () => say(lines[1])], [45e3, () => { const u = [...live.keys()][0] || mons[0]; if (u) { send({ t: 'act', k: 'pet', u }); log('쓰다듬기', u); } say(lines[2]); }],
  [80e3, () => { send({ t: 'act', k: 'berry', x: x + 10, y: y - 6 }); log('열매'); say(lines[3]); }], [110e3, () => { const u = [...live.keys()][1] || mons[1]; if (u) { send({ t: 'act', k: 'pet', u }); log('쓰다듬기', u); } }],
  [STAY - 8e3, () => say(lines[4])]];
for (const [t, f] of plan) setTimeout(f, t);
setTimeout(() => { log('돌아감'); ws.close(); }, STAY);
