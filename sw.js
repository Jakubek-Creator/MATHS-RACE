/* Offline support. The page and its code are checked online first (so updates arrive at once), then kept for offline play.
   Pictures, voice files and fonts come from the cache straight away and are refreshed in the background,
   so re-recorded voice lines arrive on the next visit. */
const CACHE = 'neonbay-v2';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), fresh = u.origin === location.origin && /\.(html|js|css|webmanifest)$|\/$/.test(u.pathname) && !u.pathname.includes('/audio/voice/');
  const save = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; };
  if (fresh) e.respondWith(fetch(r).then(save).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
  // pictures, voice and fonts: use the saved copy at once, and quietly fetch a fresh one for next time
  else e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(save).catch(() => m); if (m) e.waitUntil(net); return m || net; }));
});
