# VeriZh Compliance & Privacy Declaration / VeriZh 合規與隱私聲明

**Version:** 1.0
**Last Updated:** October 2026
**Architecture Profile:** Local-First, Zero-Data Retention (純前端本地運算、零資料保留)

## 1. Core Architecture & Privacy by Design (核心架構與隱私即設計)
**[EN]** VeriZh is engineered on a strict "Local-First" architecture using Progressive Web App (PWA) and IndexedDB technologies. All text processing, terminology matching, and format conversions are executed entirely within the user's local browser environment. 
**[HK]** VeriZh 建立於嚴格的「本地優先」架構上，運用 PWA 與 IndexedDB 技術。所有文字處理、術語比對與格式轉換，均完全在用戶的本地瀏覽器環境中執行。

**Declaration of Zero Data Collection (零資料收集聲明):** 
VeriZh does **NOT** collect, store, transmit, or process any user input data on remote servers. There are no backend databases, no telemetry of user content, and no cross-border data transfers.
VeriZh **不**收集、儲存、傳輸或在遠端伺服器處理任何用戶輸入的資料。本系統無後端資料庫、無用戶內容遙測，亦無任何跨境資料傳輸。

---

## 2. Global Regulatory Applicability Matrix (全球法規適用性矩陣)

### 🇭🇰 Hong Kong Personal Data (Privacy) Ordinance (HK PCPD)
* **Applicability:** Applicable to the user's data context, but completely mitigated by design.
* **Status:** **Fully Compliant (Exempted via Zero-Collection).**
* **Justification:** Since VeriZh acts solely as a client-side processor and does not collect or control Personal Data (PII), it inherently complies with the Data Protection Principles (DPPs) of the PCPD.

### 🇪🇺 General Data Protection Regulation (GDPR)
* **Applicability:** Applicable if EU citizens' data is processed, mitigated by design.
* **Status:** **Fully Compliant (No Data Processing Agreement required).**
* **Justification:** Under Article 4 of the GDPR, the host of VeriZh is neither a Data Controller nor a Data Processor for the text inputted, as no data leaves the user's local device (No cross-border transfer under Chapter V). 

### 🇨🇳 Cyberspace Administration of China (CAC) Regulations (國家網信辦規範)
* **Applicability:** Data Cross-Border Transfer Regulations (數據出境安全評估辦法).
* **Status:** **Out of Scope / Exempted (不適用 / 豁免).**
* **Justification:** Zero server-side processing means zero data leaves the origin jurisdiction. It strictly falls outside the scope of cross-border data transfer security assessments.

### 🇪🇺 EU Artificial Intelligence Act (EU AI Act)
* **Applicability:** **Strictly Out of Scope (明確不適用).**
* **Justification:** VeriZh utilizes deterministic Natural Language Processing (NLP) dictionaries (OpenCC) and rule-based regular expressions. It does **not** employ machine learning models, neural networks, or inferential logic to generate outputs. Therefore, it does not meet the definition of an "AI System" under the EU AI Act (Article 3) and requires no conformity assessments or CE marking.

---

## 3. Alignment with ISO Standards (ISO 標準精神對齊)
While VeriZh as a standalone open-source tool is not subject to formal organizational certification, its architectural design heavily aligns with the following international standards:

* **ISO/IEC 27001 (Information Security Management):** Addresses the Confidentiality and Integrity of the CIA triad by eliminating external attack vectors on user data (server-less text processing).
* **ISO/IEC 27701 (Privacy Information Management):** Implements "Privacy by Default" and "Privacy by Design." The system functions as a transparent, user-controlled local utility.
* **ISO/IEC 42001 (Artificial Intelligence Management System):** While VeriZh is fundamentally a deterministic rules engine rather than an AI system, the governance of its terminology database (verifying entities, guarding against NLP tokenization errors, and mitigating discriminatory terminology) strictly adheres to the risk management and impact assessment frameworks outlined in ISO 42001.

---

## 4. User Responsibilities & Disclaimer (用戶責任與免責聲明)
**[EN]** VeriZh provides deterministic text replacement based on enterprise terminology registries. It is intended as an assistive tool for legal, HR, and corporate compliance professionals. The system flags potential jurisdictional terminology risks (e.g., "Draft" or "Forbidden" terms), but the final linguistic and legal accuracy must be independently verified by the user. The author(s) of VeriZh assume no liability for legal disputes, contract invalidation, or compliance breaches arising from the use of this tool.

**[HK]** VeriZh 基於企業術語註冊表提供確定性的文字替換。本系統定位為法務、人力資源與企業合規專業人員的輔助工具。系統會標示潛在的法域術語風險（如「待確認」或「禁用詞」），但最終的語意與法律準確性必須由用戶獨立核實。VeriZh 之作者對於因使用本工具而引發之法律糾紛、合約失效或合規違約，概不承擔任何法律責任。
