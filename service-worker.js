// service-worker.js
const CACHE_NAME = 'loto-hot-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// התקנת Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache נפתח');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache install error:', err))
  );
});

// הפעלת Service Worker
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // החזר מה-cache אם קיים, אחרת fetch מהרשת
        return response || fetch(event.request);
      })
  );
});

// עדכון Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('מוחק cache ישן:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
