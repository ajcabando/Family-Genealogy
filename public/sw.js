// Minimal PWA service worker.
// Caches ONLY static assets (icons, favicon, manifest) for offline startup.
// Never caches API responses, uploads, or any page HTML — private family
// information stays out of the cache.
const CACHE = 'family-archive-v1';
const STATIC = ['/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only static, non-API requests qualify for the cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((res) => {
        if (res.ok && STATIC.some((p) => url.pathname === p || url.pathname.startsWith(p))) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
      return cached || fetched;
    }),
  );
});