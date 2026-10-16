// worker.js

// 1. 加入快取破壞者 (Cache Buster)
// 加上時間戳記，強制瀏覽器無視 Service Worker 的舊快取，立刻去伺服器抓最新檔案
const CACHE_BUSTER = '?v=' + new Date().getTime(); 

try {
  importScripts('./assets/js/opencc.js' + CACHE_BUSTER);
  importScripts('./custom-dict.js' + CACHE_BUSTER); 
} catch (e) {
  console.error("Worker 腳本載入失敗:", e);
}

const converterCache = new Map();

onmessage = function(e) {
  const { text, mode } = e.data;
  
  try {
    // 2. 安全防護：確保字典檔真的有被載入，否則停止執行並報錯，避免無限轉圈
    if (typeof applyProtectionAndConversion === 'undefined') {
      throw new Error("系統字典檔載入失敗，請按 Ctrl + F5 強制重新整理網頁。");
    }

    if (!converterCache.has(mode)) {
      const fromToMap = {
        's2hk': { from: 'cn', to: 'hk' },
        'hk2s': { from: 'hk', to: 'cn' },
        's2twp': { from: 'cn', to: 'twp' },
        'tw2sp': { from: 'twp', to: 'cn' } // 維持正確的 twp 配置
      };
      
      const config = fromToMap[mode];
      if (!config) throw new Error("未知的轉換模式");
      
      const converter = OpenCC.Converter(config);
      converterCache.set(mode, converter);
    }

    const activeConverter = converterCache.get(mode);
    
    // 執行 安全保護 ➔ 轉換 ➔ 還原 的完整管線
    const result = applyProtectionAndConversion(text, mode, activeConverter);
    
    postMessage({ status: 'success', result });
  } catch (err) {
    // 將錯誤傳回前端 UI 顯示，不再讓畫面卡死
    postMessage({ status: 'error', error: err.message });
  }
};
