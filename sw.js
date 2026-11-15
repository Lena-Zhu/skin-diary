const CACHE = 'skin-diary-v6';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page itself: network first so updates show on the next open; cached copy when offline.
// Everything else: serve from cache right away, refresh the cache in the background.
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        const r = await fetch(e.request, { cache: 'no-store' });
        if (r && r.ok) c.put('./index.html', r.clone());
        return r;
      } catch (err) {
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    }));
    return;
  }
  if (e.request.method !== 'GET') return;
  const host = new URL(e.request.url).host;
  // Only the app's own files and its fonts are cached; health data always goes to the network.
  if (host !== self.location.host && host !== 'fonts.googleapis.com' && host !== 'fonts.gstatic.com') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => {
      if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
