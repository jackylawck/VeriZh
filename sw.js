// sw.js
const CACHE_NAME = 'verizh-cache-v1';
// 核心資源清單 (包含自託管的 opencc-js 與字典檔)
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './worker.js',
  './manifest.json',
  './assets/js/opencc.js'
  // 若使用分離字典檔，需在此補上 .json 路徑
];

// 安裝階段：強制預先快取核心資源
self.addEventListener('install', event => {
  self.skipWaiting(); // 確保新版 SW 立即接管
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-caching core assets');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// 啟動階段：清理舊版本快取 (解決 iOS 7天快取過期重建或版本衝突問題)
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

// 攔截請求：Cache First 策略，確保斷網可用
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // 若快取有命中，直接返回；否則發起網路請求
      return response || fetch(event.request).catch(() => {
        // 若網路與快取皆失敗（離線狀態下請求非快取資源）
        console.warn('SW: 離線且資源未快取', event.request.url);
      });
    })
  );
});
