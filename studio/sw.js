/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
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
