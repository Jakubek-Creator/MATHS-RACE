/* Offline support. The page and its code are checked online first (so updates arrive), then kept for offline play.
   Pictures, voice files and fonts are served from the cache once they have been downloaded. */
const CACHE = 'neonbay-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), fresh = u.origin === location.origin && /\.(html|js|css|webmanifest)$|\/$/.test(u.pathname) && !u.pathname.includes('/audio/voice/');
  const save = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; };
  if (fresh) e.respondWith(fetch(r).then(save).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
  else e.respondWith(caches.match(r).then(m => m || fetch(r).then(save)));
});
