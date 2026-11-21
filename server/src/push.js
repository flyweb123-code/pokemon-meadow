/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
// 진짜 푸시 알림 (2026-11-03 경완: 친구가 필드에 놀러 오면 아이폰·안드로이드 둘 다)
// 기기는 POST /v1 {op:'pushReg', tok, plat:'ios'|'android', env:'dev'|'prod', on} 으로 푸시 토큰을 맡긴다 (D1 push 표).
// 비밀 변수 (없으면 그 쪽은 조용히 건너뛴다)
//   APNS_KEY      애플 개발자 사이트 Keys 에서 만든 .p8 파일 내용 그대로 (-----BEGIN PRIVATE KEY----- ...)
//   APNS_KEY_ID   그 키의 Key ID (10글자)
//   APNS_TEAM_ID  팀 ID (10글자, 개발자 사이트 오른쪽 위 / Membership)
//   FCM_SA        Firebase 프로젝트 설정 › 서비스 계정 › 새 비공개 키 생성 으로 받은 JSON 내용 그대로
// Workers 의 fetch 는 HTTP/2 로 APNs 에 붙는다.

const TOPIC = 'com.flyweb123.pokerun';
const enc = new TextEncoder();
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uS = s => b64u(enc.encode(s));
const pemDer = pem => Uint8Array.from(atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));

async function jwt(head, claims, pem, alg) {
  const key = await crypto.subtle.importKey('pkcs8', pemDer(pem), alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const body = b64uS(JSON.stringify({ alg, typ: 'JWT', ...head })) + '.' + b64uS(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : 'RSASSA-PKCS1-v1_5', key, enc.encode(body));
  return body + '.' + b64u(sig);
}

// 토큰은 40분 동안 다시 쓴다 (애플은 너무 자주 새로 만들면 막는다)
let apnsTok = null, apnsAt = 0, fcmTok = null, fcmAt = 0;
async function apnsAuth(env) {
  if (apnsTok && Date.now() - apnsAt < 40 * 60e3) return apnsTok;
  apnsTok = await jwt({ kid: env.APNS_KEY_ID }, { iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, env.APNS_KEY, 'ES256'); apnsAt = Date.now();
  return apnsTok;
}
async function fcmAuth(sa) {
  if (fcmTok && Date.now() - fcmAt < 40 * 60e3) return fcmTok;
  const t = Math.floor(Date.now() / 1000);
  const a = await jwt({}, { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: t, exp: t + 3600 }, sa.private_key, 'RS256');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + a });
  const j = await r.json(); if (!j.access_token) throw new Error('FCM 인증 실패: ' + JSON.stringify(j).slice(0, 200));
  fcmTok = j.access_token; fcmAt = Date.now(); return fcmTok;
}

// 한 기기에 보내기. 돌려주는 값: 'ok' | 'gone'(토큰이 더는 안 씀 → 지움) | 'skip'(비밀 변수 없음) | 'fail'
async function one(env, row, m) {
  if (row.plat === 'ios') {
    if (!env.APNS_KEY || !env.APNS_KEY_ID || !env.APNS_TEAM_ID) return 'skip';
    const host = row.env === 'dev' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    const r = await fetch(`https://${host}/3/device/${row.tok}`, { method: 'POST', headers: {
      authorization: 'bearer ' + await apnsAuth(env), 'apns-topic': TOPIC, 'apns-push-type': 'alert', 'apns-priority': '10', ...(m.collapse ? { 'apns-collapse-id': m.collapse } : {}),
    }, body: JSON.stringify({ aps: { alert: { title: m.title, body: m.body }, sound: 'default', 'thread-id': m.thread || 'pk' }, t: m.kind || '' }) });
    if (r.ok) return 'ok';
    const e = await r.text().catch(() => ''); if (r.status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(e)) return 'gone';
    console.log('apns', r.status, e.slice(0, 200)); return 'fail';
  }
  if (row.plat === 'android') {
    if (!env.FCM_SA) return 'skip';
    let sa; try { sa = JSON.parse(env.FCM_SA); } catch (e) { return 'skip'; }
    // 데이터만 보낸다 → 앱(PushService)이 직접 알림을 만든다 (게임이 켜져 있으면 안 띄움)
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, { method: 'POST', headers: { authorization: 'Bearer ' + await fcmAuth(sa), 'content-type': 'application/json' },
      body: JSON.stringify({ message: { token: row.tok, data: { t: m.kind || '', id: m.collapse || m.kind || 'pk', title: m.title, body: m.body }, android: { priority: 'HIGH', ttl: '1800s' } } }) });
    if (r.ok) return 'ok';
    const e = await r.text().catch(() => ''); if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT.*token/i.test(e)) return 'gone';
    console.log('fcm', r.status, e.slice(0, 200)); return 'fail';
  }
  return 'skip';
}

// 친구 코드 한 사람의 모든 기기에 (kind = 알림 종류: 기기가 그 종류를 켜 둔 것만)
export async function pushTo(env, code, m) {
  if (!env.DB) return 0;
  const { results } = await env.DB.prepare('SELECT tok, plat, env FROM push WHERE code = ? AND kinds LIKE ?').bind(code, m.any ? '%' : `%${m.kind}%`).all();   /* m.any: 앱이 종류를 'visit' 하나로만 보내서, 푸시를 켠 기기 모두 (걸음 알림) */
  let n = 0;
  for (const row of results || []) {
    let r = 'fail'; try { r = await one(env, row, m); } catch (e) { console.log('push', e.message); }
    if (r === 'ok') n++;
    if (r === 'gone') await env.DB.prepare('DELETE FROM push WHERE tok = ?').bind(row.tok).run();
  }
  return n;
}

// 받침 있으면 '이', 없으면 '가' (한글이 아니면 '가')
export const iGa = s => { const c = String(s).trim().slice(-1).charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
export const _jwt = jwt;   // 시험용

// v28.07 걸음 알림 (경완 2026-11-21 '꺼져 있는 유저들한테는 주기적으로 켜라고 알림' → '푸시랑 걸음 알림창 둘 다 배포해'):
// 매일 12:30 KST. 만보기가 꺼졌거나(off) 3일 넘게 0km 인 유저에게, 한 번 끊긴 동안 최대 3번 (처음 · 3일 뒤 · 7일 뒤). 알 속 포켓몬은 말하지 않는다
const DAY = 864e5, GR = ['', '일반', '우수', '레어', '에픽', '전설', '전설'];
export function pedMsg(r, now = Date.now()) {
  let e = {}; try { e = JSON.parse(r.eg || '{}') || {}; } catch (x) {}
  const n = +e.n || 0, days = r.lw ? Math.floor((now - r.lw) / DAY) : 0, waitT = n ? `부화기 알 ${n}개가 기다리고 있어요` : '알이 기다리고 있어요';
  const offB = '동작 및 피트니스가 꺼져 있어서 걸음이 안 들어와요. 설정 › 개인정보 보호 및 보안 › 동작 및 피트니스에서 포켓에그를 켜 주세요.';
  const zeroB = `${Math.max(3, days)}일째 걸음이 0km예요. 폰을 들고 걸었다면 설정 › 동작 및 피트니스에서 포켓에그가 켜져 있는지 봐 주세요.`;
  if (r.n === 0) return r.st === 'off' ? { title: '알이 멈춰 있어요', body: offB } : { title: waitT, body: zeroB };
  if (r.n === 1) return { title: waitT, body: r.st === 'off' ? offB : zeroB };
  const nr = Array.isArray(e.nr) && e.nr[1] > 0 ? e.nr : null, km = nr ? (nr[1] < 10 ? nr[1].toFixed(1) : Math.round(nr[1])) : 0;
  return { title: nr ? `${GR[nr[0]] || ''} 알이 ${km}km만 더 가면 깨어나요` : waitT, body: '걸음이 들어오면 바로 따뜻해져요. 동작 및 피트니스를 켜고 앱을 한 번 열어 주세요.' };
}
export function pedDue(r, now = Date.now()) {
  if (!r.on_ || r.n >= 3 || now - r.at > 30 * DAY) return false;   // 한 달 넘게 소식 없는 기기는 그만
  if (!(r.st === 'off' || (r.lw > 0 && now - r.lw > 3 * DAY))) return false;
  const slack = 6 * 3600e3;
  return r.n === 0 || (r.n === 1 && now - r.t0 >= 3 * DAY - slack) || (r.n === 2 && now - r.t0 >= 7 * DAY - slack);
}
export async function pedCron(env) {
  if (!env.DB) return 0; const now = Date.now(); let sent = 0;
  const { results } = await env.DB.prepare("SELECT * FROM ped WHERE on_ = 1 AND n < 3 AND st != 'ok' OR (on_ = 1 AND n < 3 AND lw > 0 AND lw < ?)").bind(now - 3 * DAY).all();
  for (const r of results || []) {
    if (!pedDue(r, now)) continue;
    const m = pedMsg(r, now), k = await pushTo(env, r.code, { kind: 'ped', any: true, title: m.title, body: m.body, collapse: 'ped', thread: 'ped' });
    if (k > 0) { sent++; await env.DB.prepare('UPDATE ped SET n = n + 1, t0 = CASE WHEN n = 0 THEN ?2 ELSE t0 END, ls = ?2 WHERE code = ?1').bind(r.code, now).run(); }
  }
  console.log('pedCron', (results || []).length, 'sent', sent); return sent;
}
