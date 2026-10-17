// worker.js

let scriptsLoaded = true;

try {
  // 合併載入核心腳本，確保依賴項依序解析
  importScripts('./assets/js/opencc.js', './terms-db.js', './custom-dict.js');
  
  if (typeof OpenCC === 'undefined' || typeof TerminologyStore === 'undefined' || typeof applyProtectionAndConversion === 'undefined') {
    scriptsLoaded = false;
  }
} catch (e) {
  scriptsLoaded = false;
  console.error("Worker 腳本載入失敗:", e);
}

const converterCache = new Map();
// 💡 修正：拆分快取，以便獨立追蹤 Approved 給 UI 畫虛底線
let autoReplaceCache = {}; 
let approvedCache = {};    
let warningDictCache = {}; // 存放 Draft, Forbidden (直接儲存狀態字串)
let workerState = 'loading'; 
let failReason = '';       

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
      'tw2sp': { from: 'twp', to: 'cn' } 
    };
    for (const [m, config] of Object.entries(fromToMap)) {
      converterCache.set(m, OpenCC.Converter(config));
    }

    const store = new TerminologyStore();
    await store.init();
    
    try {
      // 💡 修正：使用 syncDictionaries 並提供 5 大領域詞庫陣列
      const activeDictionaries = [
        './assets/data/dicts/common.json',
        './assets/data/dicts/hr.json',
        './assets/data/dicts/compliance.json',
        './assets/data/dicts/legal.json',
        './assets/data/dicts/tech.json'
      ];
      await store.syncDictionaries(activeDictionaries);
    } catch (syncErr) {
      console.warn("多模組 JSON 同步失敗，將降級使用 IndexedDB 現有快取:", syncErr);
    }
    
    const activeTerms = await store.getAllTermsFromDB();
    activeTerms.forEach(item => {
      // 依狀態分流
      if (item.status === 'AutoReplace') {
        autoReplaceCache[item.source] = item.target;
      } else if (item.status === 'Approved') {
        approvedCache[item.source] = item.target;
      } else if (['Draft', 'Forbidden'].includes(item.status)) {
        warningDictCache[item.source] = item.status; 
      }
    });
    
    workerState = 'ready';
    const termCount = Object.keys(autoReplaceCache).length + Object.keys(approvedCache).length;
    
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
    const approvedReplacements = []; // 用於記錄命中的 Approved 詞彙
    
    // 前置掃描：僅在來源為簡體時觸發
    if (mode === 's2hk' || mode === 's2twp') {
      // 1. Draft & Forbidden 警告掃描
      for (const [sourceTerm, status] of Object.entries(warningDictCache)) {
        if (text.includes(sourceTerm)) {
          const prefix = status === 'Forbidden' ? '🚫 禁用詞' : '⚠️ 待確認';
          warningSet.add(`${prefix}：${sourceTerm}`);
        }
      }
      
      // 2. Approved 替換追蹤 (準備回傳給 UI 畫虛底線)
      for (const sourceTerm of Object.keys(approvedCache)) {
        if (text.includes(sourceTerm)) {
          approvedReplacements.push(sourceTerm);
        }
      }
    }

    // 將兩種替換詞庫合併，交給底層保護層
    const hotDictCache = { ...autoReplaceCache, ...approvedCache };
    const activeConverter = converterCache.get(mode);
    const result = applyProtectionAndConversion(text, mode, activeConverter, hotDictCache);
    
    postMessage({ 
      status: 'success', 
      result: result, 
      warnings: [...warningSet],
      approvedReplacements: approvedReplacements, // 💡 回傳給 app.js 進行渲染
      requestId: requestId 
    });
  } catch (err) {
    postMessage({ status: 'error', error: err.message, requestId: requestId });
  }
};
