// custom-dict.js

// 精簡後的企業專屬保護層 (專注於 OpenCC 無法處理的語境詞與專有名稱)
const customHkDictS2HK = {
  '海内存知己': '海內存知己',
  '香港特别行政区房屋委员会': '香港特別行政區房屋委員會',
  '数字脱敏': '數據脫敏' // 範例：OpenCC 未涵蓋的現代 IT 企業術語
};

const PUA_ESCAPE_PREFIX = '\uE000\uE002';
const makeToken = (index) => `\uE000${index}\uE001`;

function protectTerms(text, terms) {
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const map = new Map();
  let protectedText = text;
  
  // 1. 碰撞防禦：轉義用戶原始輸入中的私用區字元
  protectedText = protectedText.replace(
    /[\uE000-\uF8FF]/g,
    (char) => `${PUA_ESCAPE_PREFIX}${char.charCodeAt(0).toString(16)}`
  );
  
  // 2. 佔位符保護
  for (const term of sorted) {
    if (protectedText.includes(term)) {
      const token = makeToken(map.size);
      protectedText = protectedText.split(term).join(token);
      map.set(token, term);
    }
  }
  return { protectedText, map };
}

function restoreTerms(text, map, dict = {}) {
  let restored = text;
  
  // 1. 還原佔位符為目標詞彙
  for (const [token, originalTerm] of map) {
    const targetTerm = dict[originalTerm] || originalTerm;
    restored = restored.split(token).join(targetTerm);
  }
  
  // 2. 反轉義：還原用戶原始的私用區字元
  restored = restored.replace(
    new RegExp(`${PUA_ESCAPE_PREFIX}([0-9a-fA-F]+)`, 'g'),
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  
  // 3. 安全回退檢測：精確檢測是否殘留系統生成的 Token 或轉義前綴
  if (/\uE000\d+\uE001/.test(restored) || restored.includes(PUA_ESCAPE_PREFIX)) {
    console.warn('⚠️ 警告：部分佔位符還原或反轉義失敗，系統防護層可能發生異常。');
  }
  
  return restored;
}

function applyProtectionAndConversion(text, mode, converter) {
  if (mode === 's2hk') {
    const protectionList = Object.keys(customHkDictS2HK);
    const { protectedText, map } = protectTerms(text, protectionList);
    const convertedText = converter(protectedText);
    return restoreTerms(convertedText, map, customHkDictS2HK);
  }
  return converter(text);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyProtectionAndConversion };
}
