/*
 * LetsCycle service worker.
 *
 * Deliberately conservative. It exists so an installed app opens instead of
 * showing a browser error when the network is flaky — not to serve stale
 * marketplace data.
 *
 * Rules:
 *  - API calls are never cached. Prices, availability and auth state must not
 *    come from a cache, and a signed-out user must never see a cached response
 *    belonging to someone else.
 *  - Static build assets are cache-first: they are content-hashed, so a hit is
 *    always correct.
 *  - Page navigations are network-first, falling back to the cached page and
 *    then to /offline.
 */
const VERSION = 'v1';
const STATIC_CACHE = `letscycle-static-${VERSION}`;
const PAGE_CACHE = `letscycle-pages-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Anything that must always hit the network. */
function isNeverCached(url) {
  return (
    url.pathname.startsWith('/api/') ||
    // The dev media store and uploads proxy through the API origin.
    url.pathname.startsWith('/media') ||
    url.pathname.startsWith('/dev-uploads')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin (tiles, geocoding, remote photos) and API traffic: leave alone.
  if (url.origin !== self.location.origin || isNeverCached(url)) return;

  // Build assets are content-hashed — a cache hit can't be stale.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: fresh when possible, last-known copy when not, offline page as the
  // final fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match(OFFLINE_URL))
            .then((hit) => hit || Response.error()),
        ),
    );
  }
});
