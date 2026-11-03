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
  const { results } = await env.DB.prepare('SELECT tok, plat, env FROM push WHERE code = ? AND kinds LIKE ?').bind(code, `%${m.kind}%`).all();
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
