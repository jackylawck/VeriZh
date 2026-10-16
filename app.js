// app.js

// 1. 註冊 Service Worker (PWA 核心與離線快取)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker 註冊失敗，離線模式將不可用。', err);
    });
  });
}

const sourceText = document.getElementById('sourceText');
const targetText = document.getElementById('targetText');
const modeSelect = document.getElementById('conversionMode');
const statusIndicator = document.getElementById('statusIndicator');

// 2. 實例化 Web Worker 避免解析大檔案時阻塞 UI
const converterWorker = new Worker('./worker.js');

let debounceTimer;

converterWorker.onmessage = function(e) {
  const { status, result, error } = e.data;
  if (status === 'success') {
    targetText.value = result;
    statusIndicator.textContent = `✅ 轉換完成 (${result.length} 字)`;
  } else if (status === 'error') {
    statusIndicator.textContent = `❌ 錯誤: ${error}`;
  }
};

function triggerConversion() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const text = sourceText.value;
    const mode = modeSelect.value;
    if (!text.trim()) {
      targetText.value = '';
      statusIndicator.textContent = 'Ready';
      return;
    }
    statusIndicator.textContent = '⏳ 轉換中...';
    // 傳送給 Worker 處理
    converterWorker.postMessage({ text, mode });
  }, 300); // 300ms 防抖
}

sourceText.addEventListener('input', triggerConversion);
modeSelect.addEventListener('change', triggerConversion);

// 3. 複製功能
document.getElementById('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(targetText.value);
    const originalText = statusIndicator.textContent;
    statusIndicator.textContent = '✅ 已複製！';
    setTimeout(() => statusIndicator.textContent = originalText, 2000);
  } catch (err) {
    statusIndicator.textContent = '❌ 複製失敗';
  }
});

// 4. PWA 安裝按鈕邏輯 (Add to Home Screen)
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// 當瀏覽器判斷符合 PWA 安裝條件時觸發
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // 儲存事件以便稍後觸發
  deferredPrompt = e;
  // 顯示 UI 上的安裝按鈕
  if (installBtn) {
    installBtn.style.display = 'block';
  }
});

// 使用者點擊安裝按鈕時
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // 顯示系統層級的安裝提示
      deferredPrompt.prompt();
      // 等待使用者回應
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('使用者接受安裝 PWA');
        installBtn.style.display = 'none'; // 安裝成功後隱藏按鈕
      }
      // 提示只能使用一次，用完清空
      deferredPrompt = null;
    }
  });
}
