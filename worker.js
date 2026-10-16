importScripts('./assets/js/opencc.js');

const converterCache = new Map();

// 建立企業專屬的香港地道詞庫 (應用於 OpenCC s2hk 轉換之後)
// 注意：這裡的 key 必須是簡體被 OpenCC 轉成繁體字形後的狀態
const customHkDict = {
  '默認': '預設',
  '服務器': '伺服器',
  '硬盤': '硬碟',
  '短信': '短訊',
  '注銷': '登出',
  '賬號': '帳號',
  '帳戶': '帳號', // 統一用字
  '文件夾': '資料夾',
  '搜索': '搜尋',
  '在線': '線上',
  '程序': '程式',
  '視頻': '影片',
  '音頻': '音效',
  '菜單': '選單'
};

// 自訂詞庫替換函數
function applyCustomDictionary(text, mode) {
  let processedText = text;
  
  if (mode === 's2hk') {
    // 遍歷字典進行替換
    for (const [cnTerm, hkTerm] of Object.entries(customHkDict)) {
      // 加上全局替換 (g) 標籤
      const regex = new RegExp(cnTerm, 'g');
      processedText = processedText.replace(regex, hkTerm);
    }
  }
  
  return processedText;
}

onmessage = function(e) {
  const { text, mode } = e.data;
  
  try {
    if (!converterCache.has(mode)) {
      const fromToMap = {
        's2hk': { from: 'cn', to: 'hk' },
        'hk2s': { from: 'hk', to: 'cn' },
        's2twp': { from: 'cn', to: 'twp' },
        'tw2sp': { from: 'twp', to: 'cn' }
      };
      
      const config = fromToMap[mode];
      if (!config) throw new Error("未知的轉換模式");
      
      const converter = OpenCC.Converter(config);
      converterCache.set(mode, converter);
    }

    const activeConverter = converterCache.get(mode);
    
    // 第一步：調用 OpenCC 進行基礎字形與通用詞彙轉換
    let result = activeConverter(text); 
    
    // 第二步：調用自訂詞庫攔截器，進行深度本地化
    result = applyCustomDictionary(result, mode);
    
    postMessage({ status: 'success', result });
  } catch (err) {
    postMessage({ status: 'error', error: err.message });
  }
};
