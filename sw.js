// Offline cache for the home-screen app. The page is fetched fresh when online so updates arrive;
// sprite chunks are served from cache; bump CACHE when they change.
const CACHE = 'meadow-v8';   // 청크가 바뀌면 올린다 (v8: 옛 캐시 청크가 새 캐시로 옮겨지던 문제 고침, v2: 암컷 스프라이트, v3: 기술 모션, v4: 45종 도트 다시 그림, v5: 45종 뒷모습·대기 프레임, v6: 45종 얼굴 점 살림)
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
  if (/\/s\d+\.json$/.test(u.pathname) || /\.png$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then(r => { caches.open(CACHE).then(c => c.put('index.html', r.clone())); return r; }).catch(() => caches.match('index.html')));
  }
});
