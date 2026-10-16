// app.js

// ============================================================
// 0. 頁面級拖放攔截（必須最先註冊，防止瀏覽器預設開啟檔案）
// ============================================================
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// ============================================================
// 1. 註冊 Service Worker（含更新提示）
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('發現新版本，是否立即重新載入？')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
    }).catch(err => {
      console.warn('Service Worker 註冊失敗，離線模式將不可用。', err);
    });
  });
}

// ============================================================
// 2. DOM 元素取得與無障礙屬性設定
// ============================================================
const sourceText = document.getElementById('sourceText');
const targetText = document.getElementById('targetText');
const modeSelect = document.getElementById('conversionMode');
const statusIndicator = document.getElementById('statusIndicator');
const warningBanner = document.getElementById('warningBanner');
const copyBtn = document.getElementById('copyBtn');
const installBtn = document.getElementById('installBtn');

statusIndicator.setAttribute('aria-live', 'polite');
statusIndicator.setAttribute('role', 'status');
warningBanner.setAttribute('role', 'alert');
warningBanner.setAttribute('aria-live', 'assertive');
sourceText.setAttribute('aria-label', '輸入要轉換的文字');
targetText.setAttribute('aria-label', '轉換結果');
targetText.readOnly = true;

// ============================================================
// 3. 實例化 Web Worker 與初始化狀態鎖
// ============================================================
const converterWorker = new Worker('./worker.js');

sourceText.disabled = true;
statusIndicator.textContent = '⏳ 載入企業術語庫中...';

let debounceTimer;
let isComposing = false;
let requestId = 0;
let latestRequestId = 0;

// ============================================================
// 4. Worker 訊息與錯誤處理
// ============================================================
converterWorker.onmessage = function (e) {
  const { status, result, error, warnings, warning, termCount, requestId: responseId } = e.data;

  if (status === 'ready') {
    statusIndicator.textContent = `✅ 系統就緒 (已掛載 ${termCount} 條企業術語)`;
    sourceText.disabled = false;
    
    if (warning) {
      warningBanner.textContent = `⚠️ 系統提示：${warning}`;
      warningBanner.style.display = 'block';
    }
    return;
  }

  // 防範請求競態
  if (responseId !== undefined && responseId !== latestRequestId) {
    return;
  }

  if (status === 'success') {
    targetText.value = result;
    statusIndicator.textContent = `✅ 轉換完成 (${result.length} 字 / ${result.split('\n').length} 行)`;

    if (warnings && warnings.length > 0) {
      warningBanner.textContent = warnings.join(' ｜ ');
      warningBanner.style.display = 'block';
    } else {
      warningBanner.style.display = 'none';
    }
  } else if (status === 'error') {
    statusIndicator.textContent = `❌ 錯誤: ${error}`;
    warningBanner.style.display = 'none';
  }
};

converterWorker.onerror = function (error) {
  console.error('Worker 錯誤:', error);
  statusIndicator.textContent = `❌ 核心載入失敗，請重新整理頁面`;
  sourceText.disabled = false;
  warningBanner.style.display = 'none';
};

// ============================================================
// 5. 觸發轉換邏輯（支援立即觸發與自適應防抖）
// ============================================================
function triggerConversion(immediate = false) {
  clearTimeout(debounceTimer);

  const text = sourceText.value;
  const mode = modeSelect.value;

  if (!text.trim()) {
    targetText.value = '';
    statusIndicator.textContent = 'Ready';
    warningBanner.style.display = 'none';
    return;
  }

  const doConvert = () => {
    const currentId = ++requestId;
    latestRequestId = currentId;
    statusIndicator.textContent = '⏳ 運算中...';
    converterWorker.postMessage({ text, mode, requestId: currentId });
  };

  if (immediate) {
    doConvert();
  } else {
    const debounceTime = Math.min(300 + text.length / 200, 800);
    debounceTimer = setTimeout(doConvert, debounceTime);
  }
}

// ============================================================
// 6. 事件監聽（組字鎖與快捷鍵）
// ============================================================
sourceText.addEventListener('compositionstart', () => { isComposing = true; });
sourceText.addEventListener('compositionend', () => {
  isComposing = false;
  triggerConversion();
});
sourceText.addEventListener('input', () => {
  if (!isComposing) triggerConversion();
});
modeSelect.addEventListener('change', () => triggerConversion(true)); // 切換模式時也應立即轉換

sourceText.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    triggerConversion(true); // 真正跳過防抖，即刻發車
  }
});

// ============================================================
// 7. 剪貼簿複製
// ============================================================
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) { /* fall through */ }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch (e) {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

copyBtn.addEventListener('click', async () => {
  const originalText = copyBtn.textContent;
  if (!targetText.value) return;

  const success = await copyToClipboard(targetText.value);
  copyBtn.textContent = success ? '✅ 已複製' : '❌ 失敗';
  setTimeout(() => copyBtn.textContent = originalText, 2000);
});

// ============================================================
// 8. PWA 安裝邏輯
// ============================================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
  console.log('PWA 已成功安裝至裝置');
});

// ============================================================
// 9. 拖曳檔案匯入
// ============================================================
const originalBorder = sourceText.style.border;

sourceText.addEventListener('dragover', (e) => {
  e.preventDefault();
  sourceText.style.border = '2px dashed var(--accent-color)';
});

sourceText.addEventListener('dragleave', (e) => {
  e.preventDefault();
  sourceText.style.border = originalBorder;
});

sourceText.addEventListener('drop', (e) => {
  e.preventDefault();
  sourceText.style.border = originalBorder;

  const file = e.dataTransfer.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('檔案過大，請匯入小於 5MB 的純文字檔。');
    return;
  }

  const isValidType = file.type.startsWith('text/') ||
                      /\.(txt|md|csv|json|log)$/i.test(file.name);
  if (!isValidType) {
    alert('僅支援拖曳純文字檔案（.txt、.md、.csv 等）');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    sourceText.value = event.target.result;
    triggerConversion(); // 讀取完畢後走一般防抖管線即可
  };
  reader.readAsText(file);
});
