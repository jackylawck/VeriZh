const assert = require('assert');
const OpenCC = require('opencc-js');

function runComplianceTests() {
  console.log('🚀 初始化 VeriZh 同步轉換器實例...');
  
  const converterS2HK = OpenCC.Converter({ from: 'cn', to: 'hk' });
  const converterS2TW = OpenCC.Converter({ from: 'cn', to: 'twp' });

// 1. 香港標準字形與詞彙基準 (已掛載自訂詞庫)
  const hkCases = [
    { input: '卫生署', expected: '衞生署' },
    { input: '里面', expected: '裏面' },
    { input: '专线', expected: '專線' },
    { input: '默认服务器', expected: '預設伺服器' }, // 測試自訂詞庫：默認 -> 預設，服务器 -> 伺服器
    { input: '软件网络', expected: '軟件網絡' },
    { input: '打印机屏幕', expected: '打印機屏幕' },
    { input: '注销账号', expected: '登出帳號' },     // 測試自訂詞庫
    { input: '在线搜索', expected: '線上搜尋' }      // 測試自訂詞庫
  ];

  // 2. 台灣標準字形與詞彙基準
  const twCases = [
    { input: '默认服务器', expected: '預設伺服器' },
    { input: '打印机', expected: '印表機' },
    { input: '软件网络', expected: '軟體網路' }
  ];

  let failedCount = 0;

  function runAsserts(cases, converter, testName) {
    console.log(`\n▶ 執行 [${testName}] 基準斷言...`);
    cases.forEach(({ input, expected }) => {
      const actual = converter(input);
      try {
        assert.strictEqual(actual, expected);
        console.log(`  ✔ ${input} ➔ ${actual}`);
      } catch (err) {
        console.error(`  ❌ 斷言失敗: 預期 "${expected}", 實際 "${actual}"`);
        failedCount++;
      }
    });
  }

  runAsserts(hkCases, converterS2HK, '香港繁體 (zh-HK)');
  runAsserts(twCases, converterS2TW, '台灣正體 (zh-TW)');

  if (failedCount > 0) {
    console.error(`\n🚫 測試未通過！共 ${failedCount} 個異常，CI 構建中斷。`);
    process.exit(1);
  }

  console.log('\n✅ VeriZh 核心詞庫與字形測試 100% 通過。');
}

runComplianceTests();
