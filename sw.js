// sw.js
const CACHE_NAME = 'verizh-cache-v8';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './worker.js',
  './custom-dict.js',
  './dict-store.js',
  './manifest.json',
  './assets/js/opencc.js',
  './assets/css/style.css',
  './assets/data/lshk-sample.json',
  './VeriZh192icon.png',
  './VeriZh512icon.png'
];

self.addEventListener('install', event => {
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

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 弱網超時實作 (設定 3 秒極限)
const fetchWithTimeout = (request, timeoutMs = 3000) => {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
};

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 1. 處理導航請求 (Navigation Fallback)
  // 確保離線時，直接輸入網址或重新整理也能回退到主程式
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(event.request, 5000).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 2. 處理動態術語庫 (Network-First + 超時降級 + 錯誤防護)
  if (requestUrl.pathname.endsWith('.json') && !requestUrl.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
        .then(response => {
          // 防禦：絕不將 404/500 等錯誤狀態寫入快取
          if (!response.ok) return response;
          
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => {
          console.warn('SW: 網路異常或超時，降級使用快取字典檔');
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            
            // 優雅降級：若快取為空，回傳標準 503 錯誤 JSON，讓 dict-store.js 觸發安全處理
            return new Response(JSON.stringify({ error: 'OFFLINE_NO_CACHE' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // 3. 其他 App Shell 靜態資源 (Cache-First)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
