// worker.js
importScripts('./assets/js/opencc.js');
importScripts('./custom-dict.js'); 

const converterCache = new Map();

onmessage = function(e) {
  const { text, mode } = e.data;
  
  try {
    if (!converterCache.has(mode)) {
      const fromToMap = {
        's2hk': { from: 'cn', to: 'hk' },
        'hk2s': { from: 'hk', to: 'cn' },
        's2twp': { from: 'cn', to: 'twp' },
        'tw2sp': { from: 'tw', to: 'cn' } // 修正 API 配置
      };
      
      const config = fromToMap[mode];
      if (!config) throw new Error("未知的轉換模式");
      
      const converter = OpenCC.Converter(config);
      converterCache.set(mode, converter);
    }

    const activeConverter = converterCache.get(mode);
    const result = applyProtectionAndConversion(text, mode, activeConverter);
    
    postMessage({ status: 'success', result });
  } catch (err) {
    postMessage({ status: 'error', error: err.message });
  }
};
