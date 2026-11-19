const CACHE_NAME = 'vehicle-booking-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './css/variables.css',
  './css/components.css',
  './css/login.css',
  './js/config.js',
  './js/state.js',
  './js/utils.js',
  './js/api.js',
  './js/auth.js',
  './js/navigation.js',
  './js/ui.js',
  './js/booking.js',
  './js/fleet.js',
  './js/admin.js',
  './js/events.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
