const fs = require('fs');
const path = require('path');
const { CspParser } = require('csp_evaluator/dist/parser');
const { CspEvaluator } = require('csp_evaluator/dist/evaluator');

const htmlPath = path.join(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 抓取 index.html 中的 CSP 內容
const match = htmlContent.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']+)["']/i);

if (!match) {
  console.error('❌ 找不到 CSP <meta> 標籤');
  process.exit(1);
}

const rawCsp = match[1];

// 使用 Google CSP Evaluator 進行解析與評估
const parsedCsp = new CspParser(rawCsp).csp;
const evaluator = new CspEvaluator(parsedCsp);
const findings = evaluator.evaluate();

// 過濾出中高風險的漏洞 (Severity: 40 為 Medium, 50 為 High)
const vulnerabilities = findings.filter(finding => finding.severity >= 40);

if (vulnerabilities.length > 0) {
  console.error('❌ CSP 靜態稽核發現風險:', vulnerabilities);
  process.exit(1);
} else {
  console.log('✅ Google CSP Evaluator 驗證通過，安全邊界合規。');
}
