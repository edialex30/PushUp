// Service worker: network-first so the installed home-screen app always
// loads the latest version when online, with an offline cache fallback.
// Bump CACHE_VERSION whenever you want to guarantee old caches are purged.
const CACHE_VERSION = 'pushup-v01-tag';

self.addEventListener('install', event => {
  // Activate this new worker immediately instead of waiting for old tabs.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Drop caches from previous versions.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET on our own origin; let everything else pass through
  // (e.g. Supabase API calls must always hit the network).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    try {
      // Network-first: always try to get the freshest file.
      const fresh = await fetch(request);
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, fresh.clone());
      return fresh;
    } catch (err) {
      // Offline: fall back to whatever we cached last.
      const cached = await caches.match(request);
      if (cached) return cached;
      // Last resort for navigations: serve the cached shell.
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
