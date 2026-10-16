// scripts/audit-csp.js
const fs = require('fs');
const path = require('path');

// 補上 .js 副檔名，確保 Node.js 環境穩定解析
const { CspParser } = require('csp_evaluator/dist/parser.js');
const { CspEvaluator } = require('csp_evaluator/dist/evaluator.js');
const { Version } = require('csp_evaluator/dist/csp.js');

// 嘗試載入官方 Severity 枚舉，若失敗則回退至精確的硬編碼映射
let Severity;
try {
  Severity = require('csp_evaluator/dist/finding.js').Severity;
} catch (e) {
  // Fallback 保險機制
}

const SEVERITY = Severity || {
  HIGH: 10,
  SYNTAX: 20,
  MEDIUM: 30,
  HIGH_MAYBE: 40,
  STRICT_CSP: 45,
  MEDIUM_MAYBE: 50,
  INFO: 60,
  NONE: 100
};

// 1. 確保目標檔案存在
const htmlPath = path.join(__dirname, '../index.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`❌ 找不到目標檔案: ${htmlPath}`);
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 2. 抓取 index.html 中的 CSP 內容
const match = htmlContent.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']+)["']/i);

if (!match) {
  console.error('❌ 找不到 CSP <meta> 標籤');
  process.exit(1);
}

// 清理換行與多餘空白，確保 Parser 準確解析
const rawCsp = match[1].replace(/\s+/g, ' ').trim();

console.log(`\n🔍 開始靜態審計 Content-Security-Policy (CSP3 標準)...`);
console.log(`📜 提取策略: ${rawCsp}\n`);

//
