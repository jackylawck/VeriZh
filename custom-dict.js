// custom-dict.js

// 命名空間完全隔離
const TOKEN_OPEN = '\uE000';
const TOKEN_CLOSE = '\uE001';
const ESCAPE_PREFIX = '\uE002\uE003';
const makeToken = (index) => `${TOKEN_OPEN}${index}${TOKEN_CLOSE}`;

function protectTerms(text, terms) {
  const validTerms = [...new Set(terms)].filter(t => typeof t === 'string' && t.length > 0);
  const sorted = validTerms.sort((a, b) => b.length - a.length);
  const map = new Map();
  let protectedText = text;
  let escapeCount = 0;
  
  // 1. 碰撞防禦：轉義用戶原始輸入中的私用區字元並計數
  protectedText = protectedText.replace(
    /[\uE000-\uF8FF]/g,
    (char) => {
      escapeCount++;
      return `${ESCAPE_PREFIX}${char.charCodeAt(0).toString(16)}`;
    }
  );
  
  // 2. 佔位符保護
  for (const term of sorted) {
    if (protectedText.includes(term)) {
      const token = makeToken(map.size);
      protectedText = protectedText.split(term).join(token);
      map.set(token, term);
    }
  }
  
  return { protectedText, map, escapeCount };
}

function restoreTerms(text, map, dict = {}, escapeCount = 0) {
  const safeDict = (dict && typeof dict === 'object') ? dict : {};
  let restored = text;
  
  // 1. 還原佔位符為目標詞彙
  for (const [token, originalTerm] of map) {
    const targetTerm = safeDict[originalTerm] || originalTerm;
    restored = restored.split(token).join(targetTerm);
  }
  
  // 2. 佔位符殘留檢測 (在反轉義前執行，僅針對 Token 格式)
  const tokenRegex = new RegExp(`${TOKEN_OPEN}\\d+${TOKEN_CLOSE}`);
  if (tokenRegex.test(restored)) {
    console.warn('⚠️ 警告：部分佔位符還原失敗，系統防護層可能發生異常。');
  }
  
  // 3. 反轉義並統計次數
  let unescapeCount = 0;
  restored = restored.replace(
    new RegExp(`${ESCAPE_PREFIX}([0-9a-fA-F]{4})`, 'g'),
    (_, hex) => {
      unescapeCount++;
      return String.fromCharCode(parseInt(hex, 16));
    }
  );
  
  // 4. 狀態比對檢測：確保進出的 PUA 字元數量絕對一致
  if (unescapeCount !== escapeCount) {
    console.warn(`⚠️ 警告：轉義計數不一致 (預期 ${escapeCount}，實際 ${unescapeCount})，部分私用區字元可能在轉換過程中丟失。`);
  }
  
  return restored;
}

function applyProtectionAndConversion(text, mode, converter, dictCache = {}) {
  // 嚴格限定於 s2hk 模式，避免香港詞典污染台灣用語
  if (mode === 's2hk' && dictCache && Object.keys(dictCache).length > 0) {
    const protectionList = Object.keys(dictCache);
    const { protectedText, map, escapeCount } = protectTerms(text, protectionList);
    const convertedText = converter(protectedText);
    return restoreTerms(convertedText, map, dictCache, escapeCount);
  }
  return converter(text);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    applyProtectionAndConversion, 
    protectTerms, 
    restoreTerms 
  };
}
