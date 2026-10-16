// tests/unit/vocab.test.js
const assert = require('assert');
const OpenCC = require('opencc-js');
const { applyProtectionAndConversion } = require('../../custom-dict.js');

function runComplianceTests() {
  console.log('🚀 初始化 VeriZh 轉換器與預處理保護層...');
  
  const converterS2HK = OpenCC.Converter({ from: 'cn', to: 'hk' });
  const converterS2TW = OpenCC.Converter({ from: 'cn', to: 'twp' });
  // 修正：將 from 參數改回 'twp'，以啟用台灣正體地區詞彙的還原轉換
  const converterTW2SP = OpenCC.Converter({ from: 'twp', to: 'cn' });

  const hkCases = [
    { input: '默认服务器', expected: '默認服務器' }, // 驗證：OpenCC 原生處理，不依賴自訂詞庫
    { input: '海内存知己，天涯若比邻', expected: '海內存知己，天涯若比鄰' }, // 驗證：保護層 mmseg 防禦
    { input: '数字脱敏', expected: '數據脫敏' }, // 驗證：保護層企業術語
    { input: '\uE0000\uE001 海内存知己', expected: '\uE0000\uE001 海內存知己' } // 驗證：PUA 惡意碰撞防禦
  ];

  const twCases = [
    { input: '默认服务器', expected: '預設伺服器' },
    { input: '打印机', expected: '印表機' }
  ];

  const tw2spCases = [
    { input: '預設伺服器', expected: '默认服务器' },
    { input: '印表機', expected: '打印机' }
  ];

  let failedCount = 0;

  function runAsserts(cases, converter, mode, testName) {
    console.log(`\n▶ 執行 [${testName}] 基準斷言...`);
    cases.forEach(({ input, expected }) => {
      const actual = applyProtectionAndConversion(input, mode, converter);
      try {
        assert.strictEqual(actual, expected);
        console.log(`  ✔ ${input.replace(/\uE0000\uE001/g, '[PUA]')} ➔ ${actual.replace(/\uE0000\uE001/g, '[PUA]')}`);
      } catch (err) {
        console.error(`  ❌ 斷言失敗: 預期 "${expected}", 實際 "${actual}"`);
        failedCount++;
      }
    });
  }

  runAsserts(hkCases, converterS2HK, 's2hk', '香港繁體 (s2hk)');
  runAsserts(twCases, converterS2TW, 's2twp', '台灣正體 (s2twp)');
  runAsserts(tw2spCases, converterTW2SP, 'tw2sp', '台灣正體轉簡體 (tw2sp)');

  if (failedCount > 0) {
    console.error(`\n🚫 測試未通過！共 ${failedCount} 個異常，CI 構建中斷。`);
    process.exit(1);
  }

  console.log('\n✅ 核心詞庫、API 配置、PUA 碰撞防禦測試 100% 通過。');
}

runComplianceTests();
