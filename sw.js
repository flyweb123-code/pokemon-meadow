// Offline cache for the home-screen app. The page is fetched fresh when online so updates arrive;
// sprite chunks are served from cache; bump CACHE when they change.
const CACHE = 'meadow-v21';   // 청크가 바뀌면 올린다 (v21: 그림 바꾼 56종 공격 동작을 원래 대기 그림 돌진으로(mkatk.py), v20: 빠지거나 멈춘 동작 24종 채움(mkmotion.py), v19: 프레임 1px 여백(딩루 테두리)·하랑우탄 원래 그림, v18: 하랑우탄·미라이돈 공격 자세, v17: 새 공격 자세 43종, v16: 새 공격 자세 33종·대여르 작게, v15: 딩루 등 11종 모션 채움·새 공격 자세 12종, v14: 하랑우탄 앞모습·던지미 공격 자세, v13: 무쇠머리·도트 수 늘림, v12: 45종 종별 공격·특수공격·걷기 모션, v11: 마임꽁꽁 얼굴, v10: 육파리 뒷모습·자루도 눈, v9: 떨구새 날갯짓·뒷모습 크기, v8: 옛 캐시 청크가 새 캐시로 옮겨지던 문제 고침, v2: 암컷 스프라이트, v3: 기술 모션, v4: 45종 도트 다시 그림, v5: 45종 뒷모습·대기 프레임, v6: 45종 얼굴 점 살림)
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data === 'warm') caches.open(CACHE).then(async c => {
    for (let k = 0; k < 21; k++) { const u = `s${k}.json`; if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (err) {} } }
  });
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/studio/') || u.pathname.includes('/config/')) return;   // 작업실과 배포 데이터는 늘 네트워크로
  if (/\/s\d+\.json$/.test(u.pathname) || /\.png$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else if (e.request.mode === 'navigate' && !u.pathname.includes('/studio/')) {   // 작업실(/studio/) 화면은 게임 첫 화면으로 담지 않는다
    e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then(r => { caches.open(CACHE).then(c => c.put('index.html', r.clone())); return r; }).catch(() => caches.match('index.html')));
  }
});
