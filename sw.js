const CACHE_NAME = 'ledshopik-v2';
const ASSETS = [
  '/app/index.html',
  '/app/instalace.html',
  '/app/obhlidky.html',
  '/app/reklamace.html',
  '/app/konfigurator.html',
  '/app/dochazka.html',
  '/app/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // POST požadavky a Google Scripts — nechat projít bez SW
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('script.google.com')) return;
  if (e.request.url.includes('script.googleusercontent.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
