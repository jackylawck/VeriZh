// sw.js
const CACHE_NAME = 'verizh-cache-v2'; // 更新版本號以清除舊錯誤快取
// 核心資源清單 (已補上所有缺失的新檔案)
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './worker.js',
  './custom-dict.js',
  './dict-store.js',
  './manifest.json',
  './assets/js/opencc.js',
  './assets/data/lshk-sample.json',
  './VeriZh192icon.png',
  './VeriZh512icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-caching core assets');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
