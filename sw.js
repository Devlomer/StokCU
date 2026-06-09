const CACHE_NAME = 'stokcu-v1.4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './css/base.css',
  './css/components.css',
  './js/main.js',
  './js/utils.js',
  './js/config.js',
  './js/state.js',
  './js/firebase.js',
  './js/firebase-config.js',
  './js/ui/toast.js',
  './js/ui/navigation.js',
  './js/ui/views/order.js',
  './js/ui/views/history.js',
  './js/ui/views/admin.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
