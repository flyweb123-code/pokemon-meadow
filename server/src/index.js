// 포켓몬 키우기 친구 서버 (Cloudflare Workers + D1).
// 아이폰 앱 FriendServer(CloudKit)와 같은 일을 아이폰·안드로이드 모두를 위해 한다.
//
// 요청: POST /v1  {op, dev, ...}  →  {ok:true, v} | {ok:false, err}
//   dev = 기기 비밀값. 친구 코드 = SHA256(dev) 앞 8바이트 → 32글자표 (아이폰은 dev = iCloud 사용자 ID 라 지금 코드 그대로).
//   서버는 dev 로 코드를 계산하므로, 남의 코드로 카드·기록을 덮어쓸 수 없다.
//
// 계정 비밀번호는 서버로 보내지 않는다: 기기가 소금으로 2만 번 해시(ph)와 k = sha("pkgk:id:pw") 를 계산해 보낸다
// (무료 요금제 CPU 10ms 한도 + CloudKit 에서 옮겨 온 pwh 형식 그대로 쓰려고).

export { FieldRoom } from './room.js';
import { maskNick, maskRows } from './nick.js';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PART = 600_000;   // 저장 조각 크기 (글자). 한글이 섞여도 D1 한 칸 한도(2MB) 안 넘게
const enc = new TextEncoder();

async function shaBytes(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha(s) { return hex(await shaBytes(s)); }
async function codeOf(dev) { const h = await shaBytes(dev); return [...h.slice(0, 8)].map(b => ABC[b % ABC.length]).join(''); }

class E extends Error {}
const bad = m => { throw new E(m); };
const str = (v, max) => typeof v === 'string' && v.length <= max ? v : null;
const gameOk = g => typeof g === 'string' && g.length > 0 && g.length <= 20 && /^[\p{L}\p{N}]+$/u.test(g);
const acctId = v => { const s = typeof v === 'string' ? v.toLowerCase() : ''; return /^[a-z0-9_]{4,12}$/.test(s) ? s : null; };
const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const out = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', ...cors } });
    if (req.method === 'GET' && url.pathname === '/') return out({ ok: true, v: 'pokegrow' });
    const rm = url.pathname.match(/^\/room\/([A-Z0-9]{8})$/);
    if (req.method === 'GET' && rm) return room(env, req, rm[1], url.searchParams.get('t') || '');
    if (req.method !== 'POST') return out({ ok: false, err: 'POST 만 받아요' }, 405);
    let body;
    try { body = await req.json(); } catch (e) { return out({ ok: false, err: '잘못된 요청' }, 400); }
    try {
      if (url.pathname === '/admin/import') return out({ ok: true, v: await adminImport(env, req, body) });
      if (url.pathname !== '/v1') return out({ ok: false, err: '없는 주소' }, 404);
      return out({ ok: true, v: await handle(env, body) });
    } catch (e) {
      if (e instanceof E) return out({ ok: false, err: e.message });
      return out({ ok: false, err: '친구 서버 오류: ' + (e?.message || e) }, 500);
    }
  }
};

async function handle(env, b) {
  const db = env.DB, now = Date.now();
  const dev = str(b.dev, 200);
  if (!dev || dev.length < 8) bad('기기 정보가 없어요');
  const me = await codeOf(dev);
  switch (b.op) {
    case 'me': return me;

    case 'publish': {
      const card = str(b.card, 50_000); if (card == null) bad('카드가 너무 커요');
      let wk = str(b.wk, 40) || '', wkm = Math.max(0, +b.wkm || 0), dex = Math.max(0, Math.floor(+b.dex || 0));
      if (dev.startsWith('bot:')) { wk = ''; wkm = 0; dex = 0; }   // 시험용 봇은 랭킹에 안 나옴 (2026-11-03 경완)
      await db.prepare('INSERT INTO trainer (code, card, wk, wkm, dex, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(code) DO UPDATE SET card = ?2, wk = ?3, wkm = ?4, dex = ?5, at = ?6')
        .bind(me, card, wk, wkm, dex, now).run();
      return true;
    }

    case 'get': {
      const codes = [...new Set((Array.isArray(b.codes) ? b.codes : []).map(cleanCode).filter(c => c.length === 8))].slice(0, 100);
      if (!codes.length) return [];
      const { results } = await db.prepare(`SELECT code, card, at FROM trainer WHERE code IN (${codes.map(() => '?').join(',')})`).bind(...codes).all();
      return maskRows(results, me);   // 남의 닉네임 비속어는 * 로 (nick.js)
    }

    case 'top': {
      const wk = str(b.wk, 40); if (!wk) bad('잘못된 요청');
      const q = b.kind === 'dex'
        ? db.prepare('SELECT code, card, at FROM trainer WHERE dex > 0 ORDER BY dex DESC LIMIT 100')
        : db.prepare('SELECT code, card, at FROM trainer WHERE wk = ? ORDER BY wkm DESC LIMIT 100').bind(wk);
      return maskRows((await q.all()).results, me);
    }

    case 'score': {
      if (!gameOk(b.game)) bad('잘못된 요청');
      const card = str(b.card, 5_000); if (card == null) bad('잘못된 요청');
      const best = String(b.game).startsWith('fr') ? (+b.best || 0) : Math.max(0, +b.best || 0);   // 친구 요청: >0 요청, <0 수락, 0 취소
      await db.prepare('INSERT INTO score (code, game, best, card, at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(code, game) DO UPDATE SET best = ?3, card = ?4, at = ?5')
        .bind(me, b.game, best, card, now).run();
      return true;
    }

    case 'mgtop': {
      const game = str(b.game, 40); if (!game) bad('잘못된 요청');
      return maskRows((await db.prepare('SELECT code, card, best, at FROM score WHERE game = ? ORDER BY best DESC LIMIT 100').bind(game).all()).results, me);
    }

    case 'notice': {
      const admins = String(env.ADMIN_CODES || '').split(',').map(s => s.trim());
      if (!admins.includes(me)) bad('공지는 운영자만 보낼 수 있어요');
      const t = str(b.title, 40), m = str(b.body, 160);
      if (!t || !m) bad('제목과 내용을 확인해 주세요');
      await db.prepare('INSERT INTO notice (title, body, at) VALUES (?, ?, ?)').bind(t, m, now).run();
      return true;
    }
    case 'news': {   // 공지 목록 (n 보다 새 것) — 알림은 앱이 이걸 보고 띄운다
      const after = Math.floor(+b.after || 0);
      return (await db.prepare('SELECT n, title, body, at FROM notice WHERE n > ? ORDER BY n DESC LIMIT 20').bind(after).all()).results;
    }

    // ---------- 계정 ----------
    case 'acctSalt': {   // 로그인 1단계: 소금 받기
      const id = acctId(b.id); if (!id) bad('아이디는 영문 소문자·숫자 4~12글자예요');
      const a = await db.prepare('SELECT pwh FROM account WHERE id = ?').bind(id).first();
      if (!a) bad('없는 아이디예요');
      return a.pwh.split('$')[0];
    }
    case 'acctNew': {
      const id = acctId(b.id); if (!id) bad('아이디는 영문 소문자·숫자 4~12글자, 비밀번호는 4글자 이상이에요');
      const salt = str(b.salt, 64), ph = str(b.ph, 64), k = str(b.k, 64);
      if (!salt || !ph || ph.length !== 64 || !k || k.length !== 64) bad('잘못된 요청');
      const r = await db.prepare('INSERT INTO account (id, pwh, kh, code, dev, at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
        .bind(id, salt + '$' + ph, await sha(k), me, dev, now).run();
      if (!r.meta.changes) bad('이미 있는 아이디예요. 다른 아이디를 골라 주세요');
      return { id, k };
    }
    case 'acctLogin': {
      const id = acctId(b.id); if (!id) bad('없는 아이디예요');
      const ph = str(b.ph, 64), k = str(b.k, 64); if (!ph || !k) bad('잘못된 요청');
      const a = await db.prepare('SELECT pwh, kh, dev FROM account WHERE id = ?').bind(id).first();
      if (!a) bad('없는 아이디예요');
      if (a.pwh.split('$')[1] !== ph) bad('비밀번호가 맞지 않아요');
      const kh = await sha(k);
      if (a.kh !== kh) await db.prepare('UPDATE account SET kh = ? WHERE id = ?').bind(kh, id).run();
      // dev: 안드로이드는 다시 깔아도 같은 친구 코드를 쓰도록 계정을 만든 기기의 dev 를 받아 간다
      return { id, k, ...(await newestSave(db, id, k)), dev: a.dev || undefined };
    }
    case 'acctSave': {
      const id = acctId(b.id), k = str(b.k, 64), data = str(b.data, 20_000_000);
      if (!id || !k || k.length !== 64 || data == null) bad('잘못된 요청');
      await checkK(db, id, k);
      const sig = await sha(k + await sha(data));
      let saved = 0, o = null; try { o = JSON.parse(data); saved = +o.savedAt || 0; } catch (e) {}
      // v21.38 경완 '유찬님 계정 다시 켰어?': 예전 버전 앱(덮어쓰기 막기가 없는)이 빈 새 게임을 올려 또 덮어씀 → 서버에서도 막는다.
      // 마지막 저장보다 도감이 절반 아래로 줄면(도감 10 이상일 때) 받지 않는다. 요약이 없던 계정은 저장 크기로 본다.
      const osum = o ? { dex: Array.isArray(o.unlocked) ? o.unlocked.length : 0, box: Array.isArray(o.box) ? o.box.length : 0, gold: Math.max(0, Math.floor(+o.gold || 0)) } : null;
      {
        const ps = await db.prepare('SELECT dex FROM acct_sum WHERE acct = ?').bind(id).first();
        if (ps && osum) { if (ps.dex >= 10 && osum.dex < ps.dex * .5) bad('기록이 갑자기 크게 줄어서 서버에 올리지 않았어요'); }
        else {
          const top = await db.prepare('SELECT code FROM save WHERE acct = ? ORDER BY saved DESC, at DESC LIMIT 1').bind(id).first();
          const len = top ? (await db.prepare('SELECT SUM(length(data)) n FROM save_part WHERE acct = ? AND code = ?').bind(id, top.code).first())?.n || 0 : 0;
          if (len > 20000 && data.length < len * .3) bad('기록이 갑자기 크게 줄어서 서버에 올리지 않았어요');
        }
      }
      const parts = [];
      for (let i = 0; i < data.length; i += PART) parts.push(data.slice(i, i + PART));
      const st = [
        db.prepare('DELETE FROM save_part WHERE acct = ? AND code = ?').bind(id, me),
        ...parts.map((p, i) => db.prepare('INSERT INTO save_part (acct, code, i, data) VALUES (?, ?, ?, ?)').bind(id, me, i, p)),
        db.prepare('INSERT INTO save (acct, code, sig, saved, parts, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(acct, code) DO UPDATE SET sig = ?3, saved = ?4, parts = ?5, at = ?6')
          .bind(id, me, sig, saved, parts.length, now),
      ];
      // 서버 계정 자동 백업 (v21.37 경완 '자동 백업이 기기에도 저장되고 서버 계정에도'): 덮어쓰기 전에 갑자기 줄었으면 줄기 전을 p 칸에, 그날 첫 저장은 d 칸에
      const sm = b.sum && typeof b.sum === 'object' ? b.sum : null, n = v => Math.max(0, Math.floor(+v || 0));
      const sum = osum || (sm ? { dex: n(sm.dex), box: n(sm.box), gold: n(sm.gold) } : null);   // v21.38: 서버가 저장에서 직접 센 값 먼저 (예전 앱도 백업되게)
      const prev = sum ? await db.prepare('SELECT dex, box, gold FROM acct_sum WHERE acct = ?').bind(id).first() : null;
      const pre = [];
      if (prev && ((prev.dex - sum.dex >= 3 && sum.dex < prev.dex * .8) || (prev.box - sum.box >= 3 && sum.box < prev.box * .8))) {
        const old = await db.prepare('SELECT code FROM save WHERE acct = ? ORDER BY saved DESC, at DESC LIMIT 1').bind(id).first();
        if (old) pre.push(...bakCopy(db, id, 'p' + now, old.code, prev, now));
      }
      if (pre.length) await db.batch(pre);
      await db.batch(st);
      { const pin = await db.prepare('SELECT v FROM kv WHERE k = ?').bind('rst:' + id).first(); let pd = 0; try { pd = +JSON.parse(pin?.v || '{}').dex || 0; } catch (e) {}
        if (pin && osum && osum.dex >= pd * .7) await db.prepare('DELETE FROM kv WHERE k = ?').bind('rst:' + id).run(); }
      if (sum) {
        const day = 'd' + new Date(now + 9 * 3600e3).toISOString().slice(0, 10), old14 = 'd' + new Date(now + 9 * 3600e3 - 14 * 864e5).toISOString().slice(0, 10);
        const has = await db.prepare('SELECT 1 FROM bak WHERE acct = ? AND slot = ?').bind(id, day).first();
        const post = [db.prepare('INSERT INTO acct_sum (acct, dex, box, gold, at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(acct) DO UPDATE SET dex = ?2, box = ?3, gold = ?4, at = ?5').bind(id, sum.dex, sum.box, sum.gold, now)];
        if (!has && sum.dex + sum.box > 0) post.push(...bakCopy(db, id, day, me, sum, now));
        post.push(db.prepare("DELETE FROM bak_part WHERE acct = ? AND slot IN (SELECT slot FROM bak WHERE acct = ? AND slot LIKE 'd%' AND slot < ?)").bind(id, id, old14),
          db.prepare("DELETE FROM bak WHERE acct = ? AND slot LIKE 'd%' AND slot < ?").bind(id, old14),
          db.prepare("DELETE FROM bak_part WHERE acct = ? AND slot IN (SELECT slot FROM bak WHERE acct = ? AND slot LIKE 'p%' ORDER BY at DESC LIMIT -1 OFFSET 5)").bind(id, id),
          db.prepare("DELETE FROM bak WHERE acct = ? AND slot IN (SELECT slot FROM bak WHERE acct = ? AND slot LIKE 'p%' ORDER BY at DESC LIMIT -1 OFFSET 5)").bind(id, id));
        await db.batch(post);
      }
      return true;
    }
    case 'acctBaks': {   // 서버 계정 자동 백업 목록 (v21.37)
      const id = acctId(b.id), k = str(b.k, 64); if (!id || !k) bad('잘못된 요청');
      await checkK(db, id, k);
      return (await db.prepare('SELECT slot, saved, dex, box, gold, at FROM bak WHERE acct = ? ORDER BY at DESC LIMIT 30').bind(id).all()).results;
    }
    case 'acctBak': {   // 백업 하나 받기
      const id = acctId(b.id), k = str(b.k, 64), slot = str(b.slot, 40); if (!id || !k || !slot) bad('잘못된 요청');
      await checkK(db, id, k);
      const r = await db.prepare('SELECT parts FROM bak WHERE acct = ? AND slot = ?').bind(id, slot).first(); if (!r) bad('백업을 못 찾았어요');
      const { results } = await db.prepare('SELECT data FROM bak_part WHERE acct = ? AND slot = ? ORDER BY i').bind(id, slot).all();
      if (results.length !== r.parts) bad('백업이 깨져 있어요');
      return { data: results.map(x => x.data).join('') };
    }
    case 'acctPull': {
      const id = acctId(b.id), k = str(b.k, 64); if (!id || !k) bad('잘못된 요청');
      await checkK(db, id, k);
      return await newestSave(db, id, k);
    }
    case 'acctDel': {
      const id = acctId(b.id), k = str(b.k, 64); if (!id || !k) bad('잘못된 요청');
      await checkK(db, id, k);
      const games = (Array.isArray(b.games) ? b.games : []).filter(gameOk).slice(0, 500);
      await db.batch([
        db.prepare('DELETE FROM account WHERE id = ?').bind(id),
        db.prepare('DELETE FROM save WHERE acct = ?').bind(id),
        db.prepare('DELETE FROM save_part WHERE acct = ?').bind(id),
        db.prepare('DELETE FROM bak WHERE acct = ?').bind(id),
        db.prepare('DELETE FROM bak_part WHERE acct = ?').bind(id),
        db.prepare('DELETE FROM acct_sum WHERE acct = ?').bind(id),
        db.prepare('DELETE FROM trainer WHERE code = ?').bind(me),
        db.prepare('DELETE FROM score WHERE code = ?').bind(me),
      ]);
      return { ok: true, kept: false, failed: 0, games: games.length };
    }
    // ---------- 진짜 푸시 (2026-11-03, push.js) ----------
    case 'errRep': {   // 게임에서 오류 창이 뜬 오류 (경완 2026-11-04). 같은 오류(메시지+위치)는 한 줄로 모아 셈. GitHub Actions(err-report.yml)가 새 줄을 이슈로 올림
      const msg = str(b.msg, 300), where = str(b.where, 1500) || '', ver = str(b.ver, 20) || '', ctx = str(b.ctx, 60000) || '';
      if (!msg) bad('잘못된 요청');
      const k = (await sha(msg.replace(/\d+/g, '#') + '|' + where.split(' | ')[0].replace(/:\d+:\d+/g, ''))).slice(0, 24);
      const o = await db.prepare('SELECT n, codes, st FROM err WHERE k = ?').bind(k).first();
      if (!o) await db.prepare('INSERT INTO err (k, msg, where_, ver, beta, ctx, n, codes, at0, at, st) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)').bind(k, msg, where, ver, b.beta ? 1 : 0, ctx, me, now, now).run();
      else { const cs = o.codes ? o.codes.split(',') : []; if (!cs.includes(me) && cs.length < 50) cs.push(me);
        await db.prepare('UPDATE err SET n = n + 1, codes = ?, ver = ?, ctx = ?, where_ = ?, at = ?, st = CASE WHEN st = 2 THEN 0 ELSE st END WHERE k = ?').bind(cs.join(','), ver, ctx, where, now, k).run(); }   // 고친 뒤(st 2) 다시 나면 새로
      return k;
    }
    case 'balLog': {   // 밸런스 기록 (경완 2026-11-05): 게임이 모아 둔 판 기록 {ev:[{k,t,v,d}]} 최대 50개. 매주 bal-report.yml 이 모아 'auto-bal' 이슈로
      const ev = Array.isArray(b.ev) ? b.ev.slice(0, 50) : []; if (!ev.length) return 0;
      const st = [];
      for (const e of ev) {
        const k = ['gym', 'sf', 'mg', 'gold', 'egg'].includes(e?.k) ? e.k : null, d = JSON.stringify(e?.d ?? null), t = +e?.t || now;
        if (!k || d.length > 2000) continue;
        st.push(db.prepare('INSERT INTO bal (code, kind, ver, beta, t, at, d) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(me, k, str(e.v, 20) || '', b.beta ? 1 : 0, Math.min(t, now), now, d));
      }
      const n = st.length;
      if (Math.random() < .02) st.push(db.prepare('DELETE FROM bal WHERE at < ?').bind(now - 120 * 864e5));   // 120일 지난 기록은 가끔 지움
      if (st.length) await db.batch(st);
      return n;
    }
    case 'pushReg': {   // {tok, plat, env, kinds:['visit',...]}. kinds 가 비면 이 기기 토큰을 지운다
      const tok = str(b.tok, 400), plat = b.plat === 'ios' || b.plat === 'android' ? b.plat : null; if (!tok || !plat || !/^[\w:.\-]+$/.test(tok)) bad('잘못된 요청');
      const kinds = [...new Set((Array.isArray(b.kinds) ? b.kinds : []).filter(k => /^[a-z]{1,12}$/.test(k)))].slice(0, 10).join(',');
      if (!kinds) { await db.prepare('DELETE FROM push WHERE tok = ?').bind(tok).run(); return true; }
      await db.prepare('INSERT INTO push (tok, code, plat, env, kinds, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(tok) DO UPDATE SET code = ?2, plat = ?3, env = ?4, kinds = ?5, at = ?6')
        .bind(tok, me, plat, b.env === 'dev' ? 'dev' : 'prod', kinds, now).run();
      // 한 사람 기기는 5대까지 (오래된 것부터 지움)
      await db.prepare('DELETE FROM push WHERE code = ?1 AND tok NOT IN (SELECT tok FROM push WHERE code = ?1 ORDER BY at DESC LIMIT 5)').bind(me).run();
      return true;
    }
    // ---------- 친구 필드 놀러가기 (v15.34~ 본게임) ----------
    case 'fieldPut': {   // 주인이 없을 때 친구들에게 보여 줄 내 필드 + 들어올 수 있는 친구 코드
      const data = str(b.data, 300_000); if (data == null) bad('필드가 너무 커요');
      const fr = [...new Set((Array.isArray(b.fr) ? b.fr : []).map(cleanCode).filter(c => c.length === 8))].slice(0, 200).join(',');
      await db.prepare('INSERT INTO field (code, data, fr, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(code) DO UPDATE SET data = ?2, fr = ?3, at = ?4').bind(me, data, fr, now).run();
      return true;
    }
    case 'visitTicket': {   // 방에 들어갈 2분짜리 표. 내 방이거나, 그 친구의 친구 목록에 내가 있어야 한다
      const to = cleanCode(b.to); if (to.length !== 8) bad('잘못된 요청');
      if (to !== me) {
        const f = await db.prepare('SELECT fr FROM field WHERE code = ?').bind(to).first();
        if (!f) bad('친구가 아직 필드를 열지 않았어요. 친구가 새 버전으로 게임을 한 번 켜야 해요');
        if (!f.fr.split(',').includes(me)) bad('서로 친구여야 놀러 갈 수 있어요');
      }
      let n = '트레이너', sx = 'm';
      try { const t = await db.prepare('SELECT card FROM trainer WHERE code = ?').bind(me).first(); const c = t && JSON.parse(t.card); if (c?.n) n = maskNick(String(c.n).slice(0, 12)); if (c?.sex === 'f') sx = 'f'; } catch (e) {}
      const body = b64u(enc.encode(JSON.stringify({ c: me, r: to, n, sx, e: now + 120_000 })));
      return { t: body + '.' + await sign(env, body), me };
    }
    default: bad('모르는 요청');
  }
}

// ---------- 놀러가기 표 ----------
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)));
let keyP = null;
async function hmacKey(env) {   // 서명 열쇠는 처음 한 번 만들어 D1 kv 에 둔다 (비밀 변수 따로 안 만들어도 되게)
  return keyP ||= (async () => {
    let row = await env.DB.prepare("SELECT v FROM kv WHERE k = 'visit'").first();
    if (!row) {
      const v = hex(crypto.getRandomValues(new Uint8Array(32)));
      await env.DB.prepare("INSERT INTO kv (k, v) VALUES ('visit', ?) ON CONFLICT(k) DO NOTHING").bind(v).run();
      row = await env.DB.prepare("SELECT v FROM kv WHERE k = 'visit'").first();
    }
    return crypto.subtle.importKey('raw', enc.encode(row.v), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  })().catch(e => { keyP = null; throw e; });
}
async function sign(env, body) { return b64u(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body)))); }

async function room(env, req, code, t) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket 만', { status: 426 });
  const [body, sig] = t.split('.');
  let p = null;
  try { if (body && sig && sig === await sign(env, body)) p = JSON.parse(unb64u(body)); } catch (e) {}
  if (!p || p.r !== code || !(p.e > Date.now())) return new Response('표가 맞지 않아요', { status: 403 });
  const h = new Headers(req.headers);
  h.set('x-c', p.c); h.set('x-n', encodeURIComponent(p.n || '')); h.set('x-sx', p.sx || 'm'); h.set('x-o', p.c === code ? '1' : '0'); h.set('x-r', code);
  return env.ROOM.get(env.ROOM.idFromName(code)).fetch(new Request(req.url, { headers: h }));
}

// k 확인: kh 가 있으면 그것과, 없으면(CloudKit 에서 옮겨 온 계정) 옮겨 온 저장의 서명으로 확인하고 kh 를 채운다
async function checkK(db, id, k) {
  const a = await db.prepare('SELECT kh FROM account WHERE id = ?').bind(id).first();
  if (!a) bad('없는 아이디예요');
  const kh = await sha(k);
  if (a.kh) { if (a.kh !== kh) bad('계정 정보가 맞지 않아요. 다시 로그인해 주세요'); return; }
  const { results } = await db.prepare('SELECT code, sig, parts FROM save WHERE acct = ?').bind(id).all();
  for (const s of results) {
    const data = await readSave(db, id, s.code, s.parts);
    if (data != null && await sha(k + await sha(data)) === s.sig) {
      await db.prepare('UPDATE account SET kh = ? WHERE id = ?').bind(kh, id).run();
      return;
    }
  }
  if (results.length) bad('계정 정보가 맞지 않아요. 다시 로그인해 주세요');
  await db.prepare('UPDATE account SET kh = ? WHERE id = ?').bind(kh, id).run();   // 저장이 하나도 없는 옮겨 온 계정: 처음 온 k 로
}

// 계정 저장(save/save_part 의 한 줄)을 백업 칸으로 그대로 복사 (서버가 큰 저장을 풀지 않게 SQL 안에서)
function bakCopy(db, id, slot, code, sum, now) {
  return [
    db.prepare('DELETE FROM bak_part WHERE acct = ? AND slot = ?').bind(id, slot),
    db.prepare('INSERT INTO bak_part (acct, slot, i, data) SELECT acct, ?, i, data FROM save_part WHERE acct = ? AND code = ?').bind(slot, id, code),
    db.prepare('INSERT OR REPLACE INTO bak (acct, slot, code, sig, saved, dex, box, gold, parts, at) SELECT acct, ?, code, sig, saved, ?, ?, ?, parts, ? FROM save WHERE acct = ? AND code = ?').bind(slot, sum.dex | 0, sum.box | 0, sum.gold | 0, now, id, code),
  ];
}
async function readSave(db, id, code, parts) {
  const { results } = await db.prepare('SELECT i, data FROM save_part WHERE acct = ? AND code = ? ORDER BY i').bind(id, code).all();
  if (results.length !== parts) return null;
  return results.map(r => r.data).join('');
}

// 이 계정의 저장(기기마다 하나) 중 서명이 맞고 게임 안 저장 시각(savedAt)이 가장 나중인 것
async function newestSave(db, id, k) {
  // v21.38: 운영자가 되살려 둔 칸(kv 'rst:<아이디>' = {code})이 있으면 그걸 가장 최근 기록으로 내준다 (savedAt 을 지금으로 바꿔 예전 앱도 받게).
  // 그 계정이 도감을 거의 되찾은 저장을 올리면 지운다 (acctSave)
  const pin = await db.prepare('SELECT v FROM kv WHERE k = ?').bind('rst:' + id).first();
  if (pin) { try { const p = JSON.parse(pin.v), s = await db.prepare('SELECT sig, parts FROM save WHERE acct = ? AND code = ?').bind(id, p.code).first();
    const data = s && await readSave(db, id, p.code, s.parts), now = Date.now();
    if (data != null && await sha(k + await sha(data)) === s.sig) return { data: data.replace(/"savedAt":[0-9.]+/, '"savedAt":' + now), t: now }; } catch (e) {} }
  const { results } = await db.prepare('SELECT code, sig, saved, parts, at FROM save WHERE acct = ? ORDER BY saved DESC, at DESC LIMIT 20').bind(id).all();
  for (const s of results) {
    const data = await readSave(db, id, s.code, s.parts);
    if (data != null && await sha(k + await sha(data)) === s.sig) return { data, t: s.saved || s.at };
  }
  return {};
}

// ---------- CloudKit 에서 옮겨 오기 (운영자만, 비밀 변수 ADMIN_TOKEN) ----------
// body: {table, rows:[...]} — 행을 그대로 넣는다 (이미 있으면 덮어씀). save 는 {acct, code, sig, saved, at, data}
async function adminImport(env, req, b) {
  const tok = req.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || tok !== 'Bearer ' + env.ADMIN_TOKEN) bad('권한 없음');
  const db = env.DB, rows = Array.isArray(b.rows) ? b.rows : [];
  const st = [];
  for (const r of rows) {
    switch (b.table) {
      // 이미 있는 것보다 새 기록일 때만 덮어쓴다 (옮긴 뒤 새 서버에 쓴 게 지워지지 않게, 여러 번 돌려도 안전)
      case 'trainer': st.push(db.prepare('INSERT INTO trainer (code, card, wk, wkm, dex, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(code) DO UPDATE SET card = ?2, wk = ?3, wkm = ?4, dex = ?5, at = ?6 WHERE trainer.at < ?6').bind(r.code, r.card, r.wk || '', +r.wkm || 0, +r.dex || 0, +r.at || 0)); break;
      case 'score': st.push(db.prepare('INSERT INTO score (code, game, best, card, at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(code, game) DO UPDATE SET best = ?3, card = ?4, at = ?5 WHERE score.at < ?5').bind(r.code, r.game, +r.best || 0, r.card, +r.at || 0)); break;
      case 'account': st.push(db.prepare('INSERT OR IGNORE INTO account (id, pwh, kh, code, dev, at) VALUES (?, ?, NULL, ?, NULL, ?)').bind(r.id, r.pwh, r.code || '', +r.at || 0)); break;
      case 'save': {
        const old = await db.prepare('SELECT at FROM save WHERE acct = ? AND code = ?').bind(r.acct, r.code).first();
        if (old && old.at >= (+r.at || 0)) break;
        const parts = [];
        for (let i = 0; i < r.data.length; i += PART) parts.push(r.data.slice(i, i + PART));
        st.push(db.prepare('DELETE FROM save_part WHERE acct = ? AND code = ?').bind(r.acct, r.code));
        parts.forEach((p, i) => st.push(db.prepare('INSERT INTO save_part (acct, code, i, data) VALUES (?, ?, ?, ?)').bind(r.acct, r.code, i, p)));
        st.push(db.prepare('INSERT OR REPLACE INTO save (acct, code, sig, saved, parts, at) VALUES (?, ?, ?, ?, ?, ?)').bind(r.acct, r.code, r.sig, +r.saved || 0, parts.length, +r.at || 0));
        break;
      }
      default: bad('모르는 표');
    }
  }
  if (st.length) await db.batch(st);
  return { n: rows.length };
}
