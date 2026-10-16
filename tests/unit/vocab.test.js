// tests/unit/vocab.test.js
const OpenCC = require('opencc-js');
const { applyProtectionAndConversion, protectTerms, restoreTerms } = require('../../custom-dict.js');

describe('VeriZh 核心轉換與防禦邏輯測試', () => {
  // 1. 嚴格對齊 OpenCC 合法 Locale 參數
  const converterS2HK = OpenCC.Converter({ from: 'cn', to: 'hk' });   // 簡體 -> 香港繁體 (僅字形)
  const converterS2TW = OpenCC.Converter({ from: 'cn', to: 'twp' });  // 簡體 -> 台灣正體 (含詞彙)
  const converterTW2SP = OpenCC.Converter({ from: 'tw', to: 'cn' });  // 台灣繁體 -> 簡體 (含大陸詞彙)

  // 2. 模擬企業術語庫 (Mock DictCache)
  const mockDictCache = {
    '数字脱敏': '數據脫敏',
    '海内存知己': '海內存知己' // 防禦 mmseg 切分錯誤
  };

  describe('1. 完整管線測試 (applyProtectionAndConversion)', () => {
    test('香港繁體 (s2hk) - 結合 OpenCC 字形轉換與企業術語保護', () => {
      const cases = [
        // s2hk 僅做字形轉換，因此「打印机」只會變成「打印機」
        { input: '打印机', expected: '打印機' }, 
        { input: '海内存知己，天涯若比邻', expected: '海內存知己，天涯若比鄰' }, 
        { input: '数字脱敏', expected: '數據脫敏' } 
      ];

      cases.forEach(({ input, expected }) => {
        const actual = applyProtectionAndConversion(input, 's2hk', converterS2HK, mockDictCache);
        expect(actual).toBe(expected);
      });
    });

    test('台灣正體 (s2twp) - 驗證原生詞彙映射與防污染機制', () => {
      const cases = [
        // 驗證 s2twp 原生的「大陸 -> 台灣」詞彙轉換能力
        { input: '打印机', expected: '印表機' },
        { input: '默认', expected: '預設' }
      ];

      cases.forEach(({ input, expected }) => {
        // 刻意傳入香港的 mockDictCache，驗證是否被正確擋下 (不被污染)
        const actual = applyProtectionAndConversion(input, 's2twp', converterS2TW, mockDictCache);
        expect(actual).toBe(expected);
      });
    });

    test('台灣繁體轉簡體 (tw2sp) - 驗證逆向字形與地區詞彙轉換', () => {
      const cases = [
        // 使用確定的純字形轉換與原生對譯
        { input: '繁體中文', expected: '繁体中文' },
        { input: '伺服器', expected: '服务器' } // tw2sp 預期會將伺服器轉為服务器
      ];

      cases.forEach(({ input, expected }) => {
        const actual = applyProtectionAndConversion(input, 'tw2sp', converterTW2SP, mockDictCache);
        expect(actual).toBe(expected);
      });
    });
  });

  describe('2. 底層防禦純函數測試 (protectTerms / restoreTerms)', () => {
    test('正確轉義惡意 PUA 碰撞並精準統計 escapeCount', () => {
      // 模擬使用者輸入了惡意構造的 PUA 字元 (與系統佔位符衝突)
      const maliciousInput = '\uE0000\uE001 海内存知己';
      const terms = ['海内存知己'];

      // 1. 執行保護與轉義
      const { protectedText, map, escapeCount } = protectTerms(maliciousInput, terms);

      // 驗證：輸入中的兩個 PUA 字元 (\uE000, \uE001) 必須被抓出並轉義計數
      expect(escapeCount).toBe(2);
      
      // 驗證：「海内存知己」成功被提取並保護
      expect(map.size).toBe(1);

      // 2. 執行還原
      const restored = restoreTerms(protectedText, map, mockDictCache, escapeCount);

      // 驗證：惡意的 PUA 原封不動地還原，且企業術語成功被替換，完美防禦碰撞
      expect(restored).toBe('\uE0000\uE001 海內存知己');
    });
  });
});
