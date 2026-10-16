// worker.js
// 於後台執行緒載入自託管的 opencc-js。
// 注意：生產環境需將 opencc.js 下載至 assets/js/ 內。
importScripts('./assets/js/opencc.js');

// 快取已初始化的同步轉換器實例，避免重複解析字典
const converterCache = new Map();

onmessage = function(e) {
  const { text, mode } = e.data;
  
  try {
    // 若尚未初始化該模式，則實例化同步轉換器
    if (!converterCache.has(mode)) {
      // 解析 mode (例如 's2hk' 拆分為 'cn' 和 'hk')
      // 根據 OpenCC-js API，簡體代碼為 'cn'
      const fromToMap = {
        's2hk': { from: 'cn', to: 'hk' },
        'hk2s': { from: 'hk', to: 'cn' },
        's2twp': { from: 'cn', to: 'twp' },
        'tw2sp': { from: 'twp', to: 'cn' }
      };
      
      const config = fromToMap[mode];
      if (!config) throw new Error("未知的轉換模式");
      
      // 注意：此處直接調用同步 API
      const converter = OpenCC.Converter(config);
      converterCache.set(mode, converter);
    }

    const activeConverter = converterCache.get(mode);
    const result = activeConverter(text); // 同步運算
    
    postMessage({ status: 'success', result });
  } catch (err) {
    postMessage({ status: 'error', error: err.message });
  }
};
