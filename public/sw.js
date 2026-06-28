const CACHE_PREFIX = 'asteridle-shell-';
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') ?? 'dev';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SCOPE = new URL(self.registration.scope).pathname;
const CORE_ASSETS = [
  APP_SCOPE,
  `${APP_SCOPE}index.html`,
  `${APP_SCOPE}manifest.webmanifest`,
  `${APP_SCOPE}pwa-icon.svg`,
  `${APP_SCOPE}skill-icons.svg`,
  `${APP_SCOPE}audio/zone-1.mp3`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) {
    return;
  }
  if (url.pathname === `${APP_SCOPE}sw.js`) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match(APP_SCOPE)))
  );
});
