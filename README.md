# VeriZh (字準) - Enterprise Terminology & Compliance Engine

[![Privacy: Local First](https://img.shields.io/badge/Privacy-Local_First-success.svg)](#)
[![Compliance: Zero Data](https://img.shields.io/badge/Compliance-Zero_Data_Retention-blue.svg)](#)
[![PWA: Ready](https://img.shields.io/badge/PWA-Ready-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](#)

**[EN]** VeriZh is a privacy-first, purely client-side text conversion and terminology alignment tool designed for enterprises operating across Mainland China, Hong Kong, and Taiwan. Built on a "Local-First" architecture, it ensures absolute data confidentiality while aligning cross-border corporate communications with legal, HR, and IT compliance standards.

**[HK]** VeriZh（字準）是一款隱私優先、純前端運算的文字轉換與術語對齊工具，專為在中國大陸、香港與台灣營運的企業所設計。基於「本地優先 (Local-First)」架構，在確保資料絕對機密的同時，協助企業法務、人資與 IT 部門精準對齊跨境合規術語。

---

## 🌟 Core Features / 核心功能

### 1. Privacy by Design (隱私即設計)
* **[EN]** Zero server-side processing. All text conversions and terminology matches are executed within the browser using Web Workers and IndexedDB. Immune to cross-border data transfer restrictions.
* **[HK]** 零伺服器端處理。所有文字轉換與術語比對皆透過 Web Workers 與 IndexedDB 於瀏覽器內完成。徹底免疫資料跨境傳輸限制。

### 2. Multi-Tiered Terminology Governance (多層級術語治理)
* **[EN]** Intelligent dictionary engine supporting priority merging across modules (`hr.json`, `legal.json`, `compliance.json`). Terms are classified into strict tiers:
  * **AutoReplace:** Forced localization (e.g., IT terminology, NLP boundaries).
  * **Approved:** Permitted enterprise substitutions, highlighted with dashed underlines for user review.
  * **Draft / Forbidden:** Triggers aggressive UI warnings for mismatched legal entities (e.g., mainland Labor Contract vs. HK Employment Contract) or discriminatory terms.
* **[HK]** 智慧型詞庫引擎，支援多模組 (`hr.json`, `legal.json`, `compliance.json`) 依權重合併。詞彙嚴格分級：
  * **AutoReplace (自動替換):** 強制在地化（如 IT 術語、NLP 邊界防禦）。
  * **Approved (建議替換):** 企業允許的習慣用語替換，自動標示虛底線供用戶覆核。
  * **Draft / Forbidden (警告/禁用):** 針對法規實體不對等（如內地勞動合同 vs 香港僱傭合約）或歧視用語，觸發強烈 UI 警告。

### 3. Progressive Web App & Offline Ready (PWA 與離線支援)
* **[EN]** Installable as a native-like app on desktop and mobile. Robust Service Worker caching ensures full functionality even without an internet connection.
* **[HK]** 支援安裝為桌面或手機應用程式。強大的 Service Worker 快取機制確保在無網路連線時依然能完整運作。

---

## 🛡️ Compliance & Security / 合規與資安宣告

**[EN]** VeriZh is engineered to meet the highest global data protection standards. Because the application fundamentally does not collect, transmit, or retain data, it inherently satisfies or is exempted from major privacy regulations.
For detailed applicability matrices regarding **EU GDPR, HK PCPD, CAC Cross-Border Regulations, and ISO 27001/27701/42001**, please refer to our [COMPLIANCE.md](./COMPLIANCE.md).

**[HK]** VeriZh 的架構設計旨在符合全球最高資料保護標準。由於本應用程式從根本上不收集、傳輸或保留資料，因此自然符合（或豁免於）各大主要隱私法規。
關於 **歐盟 GDPR、香港私隱條例 (PCPD)、國家網信辦數據出境評估辦法以及 ISO 27001/27701/42001** 的詳細適用性矩陣，請參閱我們的 [COMPLIANCE.md](./COMPLIANCE.md)。

---

## 🏗️ Architecture & Tech Stack / 系統架構與技術棧

* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+). No heavy frameworks, ensuring blazing fast load times and strict Content Security Policy (CSP) compliance.
* **Engine:** `OpenCC` (Open Chinese Convert) for base topological character conversion, fortified by a custom AST-like terminology wrapper (`custom-dict.js`).
* **Storage:** `IndexedDB` for robust local dictionary management.
* **Offline Routing:** Web `Service Workers` (`sw.js`).
* **CI/CD:** Automated deployment to GitHub Pages via GitHub Actions (`deploy.yml`).

---

## 📖 Directory Structure / 目錄結構

```text
VeriZh/
├── assets/
│   ├── css/
│   │   └── style.css          # UI styles, Dark Mode, rich text rendering
│   ├── data/
│   │   └── dicts/             # Modular JSON Enterprise Dictionaries
│   │       ├── common.json
│   │       ├── compliance.json
│   │       ├── hr.json
│   │       ├── legal.json
│   │       └── tech.json
│   └── js/
│       └── opencc.js          # Base character conversion engine
├── .github/workflows/
│   └── deploy.yml             # CI/CD pipeline
├── app.js                     # Main application logic & DOM interactions
├── worker.js                  # Background processing for heavy text conversions
├── terms-db.js                # IndexedDB wrapper & multi-module sync logic
├── custom-dict.js             # Terminology replacement & XSS protection rules
├── sw.js                      # Service Worker for PWA & caching
├── index.html                 # UI Entry Point
├── COMPLIANCE.md              # Compliance Declaration
└── README.md                  # This file

```

---

## 🚀 Installation & Usage / 安裝與使用指南

### For Users / 終端使用者

1. **[EN]** Visit the [VeriZh App URL].
**[HK]** 訪問 [VeriZh App 網址]。
2. **[EN]** (Optional) Click "Add to Home Screen" to install it as a local PWA.
**[HK]** (非必要) 點擊「加到手機主畫面 / 安裝」將其做為本機應用程式安裝。
3. **[EN]** Paste your draft text into the left panel. The conversion and compliance check will happen instantly.
**[HK]** 將您的草稿貼入左側面板，系統將即時進行轉換與合規檢查。

### For Developers / 開發與維護者

**[EN]** Adding or updating terms is as simple as editing the JSON files in `assets/data/dicts/`. The system will automatically detect the version bump and safely synchronize the new terms to users' local IndexedDB without requiring them to clear their cache manually.
**[HK]** 新增或更新術語非常簡單，只需編輯 `assets/data/dicts/` 目錄下的 JSON 檔案。系統會自動偵測版本變更，並將新術語安全地同步至用戶的本地 IndexedDB，無需用戶手動清除快取。

**Dictionary Entry Example (詞庫條目範例):**

```json
"劳动合同": {
  "target": "僱傭合約",
  "level": "L2",
  "status": "Approved",
  "note": "需語境判斷：一般商務泛指合約時可替換；若特指內地《勞動合同法》則不可替換",
  "source": { "name": "香港勞工處", "url": "[https://www.labour.gov.hk/](https://www.labour.gov.hk/)" }
}

```

---

## 📄 License / 授權條款

**[EN]** This project is licensed under the MIT License.
**[HK]** 本專案採用 MIT 授權條款。
