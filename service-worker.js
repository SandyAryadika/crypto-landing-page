const CACHE_NAME = 'cryptovisual-v1';
const assets = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/manifest.json',
  '/images/icon.png',
];

// Tahap Install: Menyimpan file ke cache agar bisa dibuka saat offline
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(assets);
    })
  );
});

// Tahap Fetch: Mengambil data dari cache jika sedang tidak ada internet
self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request);
    })
  );
});