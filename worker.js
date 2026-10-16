// worker.js

let scriptsLoaded = true;

try {
  // 合併載入核心腳本，確保依賴項依序解析
  // 💡 修正：已將 dict-store.js 替換為 terms-db.js 以繞過快取與廣告阻擋
  importScripts('./assets/js/opencc.js', './terms-db.js', './custom-dict.js');
  
  if (typeof OpenCC === 'undefined' || typeof TerminologyStore === 'undefined' || typeof applyProtectionAndConversion === 'undefined') {
    scriptsLoaded = false;
  }
} catch (e) {
  scriptsLoaded = false;
  console.error("Worker 腳本載入失敗:", e);
}

const converterCache = new Map();
let hotDictCache = {};     // 存放 Approved, AutoReplace 
let warningDictCache = {}; // 存放 Draft, Forbidden (直接儲存狀態字串)
let workerState = 'loading'; 
let failReason = '';       // 精確區分載入失敗與初始化失敗

async function initializeWorker() {
  if (!scriptsLoaded) {
    workerState = 'failed';
    failReason = "核心腳本載入失敗，請確認檔案路徑或清除快取重試 (Ctrl+F5)。";
    postMessage({ status: 'error', error: failReason });
    return;
  }

  try {
    // 預先載入所有 OpenCC 轉換器 (消滅首次轉換的延遲)
    const fromToMap = {
      's2hk': { from: 'cn', to: 'hk' },
      'hk2s': { from: 'hk', to: 'cn' },
      's2twp': { from: 'cn', to: 'twp' },
      'tw2sp': { from: 'twp', to: 'cn' } // 修正：使用 twp 確保台灣詞彙正確認識並反向轉對譯簡體
    };
    for (const [m, config] of Object.entries(fromToMap)) {
      converterCache.set(m, OpenCC.Converter(config));
    }

    const store = new TerminologyStore();
    await store.init();
    
    try {
      await store.syncFromJson('./assets/data/lshk-sample.json');
    } catch (syncErr) {
      console.warn("JSON 同步失敗，將降級使用 IndexedDB 現有快取:", syncErr);
    }
    
    const activeTerms = await store.getAllTermsFromDB();
    activeTerms.forEach(item => {
      if (['Approved', 'AutoReplace'].includes(item.status)) {
        hotDictCache[item.source] = item.target;
      }
      if (['Draft', 'Forbidden'].includes(item.status)) {
        warningDictCache[item.source] = item.status; // 精簡結構
      }
    });
    
    workerState = 'ready';
    const termCount = Object.keys(hotDictCache).length;
    
    // 離線且空庫的降級提示
    const warningMsg = termCount === 0 ? '本地術語庫為空 (系統可能處於離線狀態)' : null;
    
    postMessage({ status: 'ready', termCount, warning: warningMsg });
  } catch (error) {
    workerState = 'failed';
    failReason = "術語庫初始化失敗，請檢查瀏覽器儲存權限或強制重新整理。";
    console.error("術語庫初始化失敗:", error);
    postMessage({ status: 'error', error: failReason });
  }
}

initializeWorker();

onmessage = function(e) {
  if (workerState === 'loading') {
    postMessage({ status: 'error', error: "系統正在載入術語庫，請稍候..." });
    return;
  }
  if (workerState === 'failed') {
    postMessage({ status: 'error', error: failReason });
    return;
  }

  const { text, mode, requestId } = e.data;
  
  try {
    const warningSet = new Set();
    
    // 警告掃描限定：僅在來源為簡體時 (s2hk / s2twp) 觸發企業術語審查
    if (mode === 's2hk' || mode === 's2twp') {
      for (const [sourceTerm, status] of Object.entries(warningDictCache)) {
        if (text.includes(sourceTerm)) {
          const prefix = status === 'Forbidden' ? '🚫 禁用詞' : '⚠️ 待確認';
          warningSet.add(`${prefix}：${sourceTerm}`);
        }
      }
    }

    const activeConverter = converterCache.get(mode);
    const result = applyProtectionAndConversion(text, mode, activeConverter, hotDictCache);
    
    postMessage({ 
      status: 'success', 
      result: result, 
      warnings: [...warningSet],
      requestId: requestId 
    });
  } catch (err) {
    postMessage({ status: 'error', error: err.message, requestId: requestId });
  }
};
