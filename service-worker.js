// service-worker.js
const CACHE_NAME = 'lottogun-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/lottery-data.js',
  '/js/ads.js',
  '/js/site-footer.js',
  '/css/app.css',
  '/css/ads.css'
];

function isLiveDataRequest(url) {
  return url.includes('firebaseio.com/lotto') ||
    url.includes('firebaseio.com/ads') ||
    url.includes('cloudfunctions.net/checkLotteryNow');
}

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
  if (isLiveDataRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
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
