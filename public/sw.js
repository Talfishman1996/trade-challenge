const CACHE_NAME = 'tradevault-shell-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/tradevault-icon.svg',
  '/tradevault-icon-192.png',
  '/tradevault-icon-512.png',
  '/mountain-bg.jpg',
];
const BUILD_ASSETS = [/* INJECT_BUILD_ASSETS */];

const precacheApp = async () => {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([...APP_SHELL, ...BUILD_ASSETS]);
};

self.addEventListener('install', event => {
  event.waitUntil(precacheApp());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const network = fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/index.html', response.clone());
      }
      return response;
    });
    event.waitUntil(network.catch(() => undefined));
    event.respondWith(
      caches.match('/index.html', { ignoreVary: true })
        .then(cached => cached || network)
        .catch(() => network)
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
