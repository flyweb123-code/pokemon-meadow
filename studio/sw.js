// 작업실 홈 화면 앱: 화면은 늘 새로 받고(온라인), 오프라인일 때만 저장해 둔 것을 쓴다
// v1.7: 이름에 ?v= 가 붙은 파일(글꼴·그림 모음)은 내용이 안 바뀌니 저장해 둔 것을 바로 쓴다
const CACHE = 'studio-v2';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('studio-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.includes('/studio/')) return;
  if (u.searchParams.has('v')) { e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { c.put(e.request, r.clone()); c.keys().then(ks => ks.filter(k => { const q = new URL(k.url); return q.pathname === u.pathname && q.search !== u.search; }).forEach(k => c.delete(k))); } return r; })))); return; }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok && e.request.mode === 'navigate') caches.open(CACHE).then(c => c.put('./', r.clone())); return r; }).catch(() => caches.match(e.request.mode === 'navigate' ? './' : e.request)));
});
