// 친구 필드 놀러가기 (베타, 2026-11-03 경완). 필드(주인 친구 코드)마다 방 하나.
//
// 연결: GET /room/<주인코드>?t=<표>  (WebSocket). 표는 POST /v1 {op:'visitTicket', to} 로 받는다 (2분짜리, 서버 서명).
// 주인 기기가 기준: 포켓몬 위치·필드 모습은 주인만 보내고 방은 손님들에게 전해 준다. 주인이 없으면 마지막 필드(D1 field 표)를 보여 준다.
//
// 받는 말 (손님·주인 → 방)
//   {t:'chat', m}                 채팅 (100글자, 1초에 한 번). 최근 50개는 방에 남는다 (주인이 없을 때 방명록)
//   {t:'tr', x, y, d, w}          내 트레이너 자리 (x,y 필드 좌표, d 방향 0아래 1위 2옆, w 걷는 중, f 왼쪽 보기)
//   {t:'act', k, u, x, y}         손님 → 주인 포켓몬에게 (k pet·wash·feed u=포켓몬 uid / berry x,y 땅에 열매). 주인이 없으면 모아 뒀다가 들어올 때 hi.pend 로
//   {t:'field', d}                주인만: 지금 필드 모습 (문자열 JSON). 방이 기억했다가 새 손님에게
//   {t:'mons', L}                 주인만: 포켓몬 자리 [[uid,x,y,...]] — 손님이 있을 때만 보낸다
//   {t:'ev', e}                   주인만: 그 밖의 일 (손님들에게 그대로)
// 보내는 말 (방 → 모두)
//   {t:'hi', me, own, on, ppl, chat, field, fat, pend, acts}   들어왔을 때 한 번 (on = 주인이 있는지, ppl = 지금 있는 사람, acts = 주인에게만: 손님이 한 일 최근 50개 → 방명록)
//   {t:'join', p} / {t:'leave', c} / {t:'chat', c, n, m, at} / {t:'tr', c, ...} / {t:'act', c, n, k, u} / {t:'mons', L} / {t:'ev', e} / {t:'field', d, at}
//   {t:'own', on}                 주인이 들어오거나 나감

const MAX_PPL = 8, CHAT_KEEP = 50, ACT_KEEP = 50, CHAT_LEN = 100, ACTS = ['pet', 'wash', 'feed', 'berry'];

export class FieldRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    this.rate = new Map();   // 소켓별 보낸 횟수 (잠들면 사라져도 괜찮음)
    // 연결 유지용 ping 은 방을 깨우지 않고 바로 답한다 (무료 요금제 아끼기)
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}')); } catch (e) {}
  }

  people() { return this.ctx.getWebSockets().filter(ws => ws.readyState === 1).map(ws => { let a = {}; try { a = ws.deserializeAttachment() || {}; } catch (e) {} return { ws, a }; }).filter(x => x.a.c); }
  send(ws, o) { try { ws.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }
  cast(o, but) { const s = JSON.stringify(o); for (const { ws } of this.people()) if (ws !== but) this.send(ws, s); }
  pub(a) { return { c: a.c, n: a.n, sx: a.sx, o: !!a.o, p: a.p || null }; }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket 만', { status: 426 });
    const c = req.headers.get('x-c'), n = decodeURIComponent(req.headers.get('x-n') || '') || '트레이너', sx = req.headers.get('x-sx') || 'm', o = req.headers.get('x-o') === '1';
    const owner = req.headers.get('x-r');
    if (owner) await this.ctx.storage.put('owner', owner);
    let ppl = this.people();
    // 같은 사람이 다시 들어오면 (다른 기기·다시 연결) 예전 연결은 닫는다
    for (const x of ppl) if (x.a.c === c) { try { x.ws.close(4000, '다른 곳에서 들어왔어요'); } catch (e) {} }
    ppl = this.people().filter(x => x.a.c !== c);
    if (!o && ppl.filter(x => !x.a.o).length >= MAX_PPL) return new Response('방이 가득 찼어요', { status: 429 });

    const pair = new WebSocketPair(), [cl, sv] = Object.values(pair);
    this.ctx.acceptWebSocket(sv);
    const a = { c, n, sx, o, at: Date.now() };
    sv.serializeAttachment(a);

    const [chat, fld, pend, acts] = await Promise.all([this.ctx.storage.get('chat'), this.field(owner), o ? this.ctx.storage.get('pend') : null, o ? this.ctx.storage.get('acts') : null]);
    if (pend?.length) await this.ctx.storage.delete('pend');
    this.send(sv, { t: 'hi', me: c, own: o, on: o || ppl.some(x => x.a.o), ppl: ppl.map(x => this.pub(x.a)), chat: chat || [], field: o ? null : fld?.d || null, fat: fld?.at || 0, pend: pend || [], acts: o ? acts || [] : [] });
    this.cast({ t: 'join', p: this.pub(a) }, sv);
    if (o) this.cast({ t: 'own', on: true }, sv);
    return new Response(null, { status: 101, webSocket: cl });
  }

  // 마지막 필드: 주인이 방에 보낸 것과 D1(주인이 없을 때 올려 둔 것) 중 나중 것
  async field(owner) {
    const mem = await this.ctx.storage.get('field');
    let db = null;
    owner ||= await this.ctx.storage.get('owner');
    if (owner && this.env.DB) { try { db = await this.env.DB.prepare('SELECT data, at FROM field WHERE code = ?').bind(owner).first(); } catch (e) {} }
    if (db && (!mem || db.at > mem.at)) return { d: db.data, at: db.at };
    return mem || null;
  }

  ok(ws, k, per, n) {   // per 초 동안 n 번까지
    const now = Date.now(), r = this.rate.get(ws) || {}, q = (r[k] ||= []);
    while (q.length && now - q[0] > per * 1000) q.shift();
    this.rate.set(ws, r);
    if (q.length >= n) return false;
    q.push(now); return true;
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 200_000) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const a = ws.deserializeAttachment() || {}; if (!a.c || !m || typeof m.t !== 'string') return;
    if (!this.ok(ws, 'all', 1, 30)) return;
    const num = v => Number.isFinite(+v) ? Math.round(+v * 10) / 10 : 0;
    switch (m.t) {
      case 'chat': {
        const t = String(m.m || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, CHAT_LEN); if (!t) return;
        if (!this.ok(ws, 'chat', 1, 1) || !this.ok(ws, 'chat10', 10, 6)) return this.send(ws, { t: 'err', m: '조금 천천히 말해 주세요' });
        const line = { c: a.c, n: a.n, m: t, at: Date.now() };
        const chat = (await this.ctx.storage.get('chat')) || []; chat.push(line);
        await this.ctx.storage.put('chat', chat.slice(-CHAT_KEEP));
        return this.cast({ t: 'chat', ...line });
      }
      case 'tr': {
        a.p = { x: num(m.x), y: num(m.y), d: m.d | 0, w: m.w ? 1 : 0, f: m.f ? 1 : 0, k: String(m.k || '').slice(0, 40), out: m.out ? 1 : 0 };
        ws.serializeAttachment(a);
        return this.cast({ t: 'tr', c: a.c, ...a.p }, ws);
      }
      case 'act': {
        if (a.o || !ACTS.includes(m.k) || !this.ok(ws, 'act', 2, 3)) return;
        const o = { t: 'act', c: a.c, n: a.n, k: m.k, u: m.u | 0, x: num(m.x), y: num(m.y), at: Date.now() };
        // 주인이 없으면 모아 뒀다가 주인이 들어올 때 준다 (쓰다듬기·열매가 주인 포켓몬에게 남게)
        if (!this.people().some(x => x.a.o)) { const L = (await this.ctx.storage.get('pend')) || []; L.push(o); await this.ctx.storage.put('pend', L.slice(-30)); }
        // 방명록: 손님이 한 일도 말과 같이 남긴다 (v14.99 경완 '방명록에 상호작용도 일지처럼')
        const A = (await this.ctx.storage.get('acts')) || []; A.push({ c: o.c, n: o.n, k: o.k, u: o.u, at: o.at }); await this.ctx.storage.put('acts', A.slice(-ACT_KEEP));
        return this.cast(o);
      }
      case 'field': {
        if (!a.o || typeof m.d !== 'string') return;
        const f = { d: m.d, at: Date.now() };
        await this.ctx.storage.put('field', f);
        return this.cast({ t: 'field', ...f }, ws);
      }
      case 'mons': case 'ev': {
        if (!a.o) return;
        return this.cast(m.t === 'mons' ? { t: 'mons', L: Array.isArray(m.L) ? m.L.slice(0, 40) : [] } : { t: 'ev', e: m.e }, ws);
      }
      case 'ping': return this.send(ws, { t: 'pong' });
    }
  }

  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch (e) {} }
  async webSocketError(ws) { this.gone(ws); }
  gone(ws) {
    let a = {}; try { a = ws.deserializeAttachment() || {}; ws.serializeAttachment({}); } catch (e) {}   // 이미 나간 소켓은 people() 에서 빠지게
    this.rate.delete(ws);
    if (!a.c) return;
    // 같은 사람이 새로 연결했으면 (다시 연결) 나갔다고 알리지 않는다
    if (this.people().some(x => x.a.c === a.c)) return;
    this.cast({ t: 'leave', c: a.c });
    if (a.o) this.cast({ t: 'own', on: false });
  }
}
