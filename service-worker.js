// service-worker.js
const CACHE_NAME = 'lottogun-v17';
const STATIC_ASSETS = [
  '/js/lottery-data.js',
  '/js/ads.js',
  '/js/ticket-check.js',
  '/js/site-footer.js',
  '/css/app.css',
  '/css/pages.css',
  '/css/site-a11y.css',
  '/css/ads.css',
  '/css/home.css',
  '/css/check-ticket.css',
  '/manifest.json',
  '/image.png'
];

function isLiveDataRequest(url) {
  return url.includes('firebaseio.com/lotto') ||
    url.includes('firebaseio.com/ads') ||
    url.includes('cloudfunctions.net/checkLotteryNow');
}

function isHtmlRequest(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.log('Cache install error:', err))
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
  if (isLiveDataRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
