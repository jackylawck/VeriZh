// app.js
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

// 實例化 Web Worker 避免解析大檔案時阻塞 UI
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
