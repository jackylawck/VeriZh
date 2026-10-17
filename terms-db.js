// terms-db.js
const DB_NAME = 'VeriZh_Terminology';
const DB_VERSION = 3; // 💡 升級到 v3，觸發自動重建，徹底消滅髒資料
const STORE_NAME = 'terms';
const META_STORE = 'metadata';

class TerminologyStore {
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onblocked = () => {
        console.warn('資料庫升級被阻擋，請關閉其他 VeriZh 分頁後重試。');
        reject(new Error('DB_BLOCKED'));
      };

      // 💡 版本升級時，自動刪除舊表並重建乾淨的結構
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
        if (db.objectStoreNames.contains(META_STORE)) db.deleteObjectStore(META_STORE);
        db.createObjectStore(STORE_NAME, { keyPath: 'source' });
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.db.onversionchange = () => {
          this.db.close();
          console.warn('⚠️ 資料庫版本已在其他分頁變更，當前連線已安全關閉。請重新整理頁面以載入最新詞庫。');
        };
        resolve();
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  _ensureDB() {
    if (!this.db) {
      throw new Error('DB_NOT_INITIALIZED');
    }
  }

  async getMetadata(key) {
    this._ensureDB();
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([META_STORE], 'readonly').objectStore(META_STORE).get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async setMetadata(key, value) {
    this._ensureDB();
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([META_STORE], 'readwrite').objectStore(META_STORE).put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async _writeAllTerms(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.clear();
      
      for (const [keyword, record] of Object.entries(data)) {
        if (keyword === '_metadata') continue;
        
        // 確保來源字串與紀錄格式合法
        if (typeof keyword !== 'string' || !keyword.trim() || typeof record !== 'object' || record === null) {
          continue;
        }

        try {
          // 💡 核心修復：解決屬性名稱衝突！
          // 將 JSON 裡的 record.source (文獻) 重新命名為 reference
          // 確保 IDB 的主鍵 (source) 永遠是單純的字串
          const itemToPut = {
            source: keyword.trim(),       // 關鍵字 (IDB Primary Key)
            target: record.target,        // 替換目標
            level: record.level,          // 級別
            status: record.status,        // 狀態
            note: record.note,            // 備註
            reference: record.source      // 避開衝突，改名為 reference
          };

          store.put(itemToPut);
        } catch (e) {
          console.error(`寫入詞條失敗 [${keyword}]:`, e);
        }
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
      transaction.onabort = (event) => reject(event.target.error || new Error('Transaction aborted'));
    });
  }

  async syncDictionaries(urlList) {
    this._ensureDB();
    try {
      let combinedVersion = 0;
      const fetchedDicts = [];

      const responses = await Promise.allSettled(urlList.map(url => fetch(url)));
      for (const result of responses) {
        if (result.status === 'fulfilled' && result.value.ok) {
          try {
            const data = await result.value.json();
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
              fetchedDicts.push(data);
            }
          } catch (jsonErr) {
             console.error(`無法解析 JSON，跳過檔案: ${result.value.url}`, jsonErr);
          }
        }
      }

      if (fetchedDicts.length === 0) {
        console.warn('⚠️ 無法載入任何詞庫模組，跳過同步。');
        return;
      }

      fetchedDicts.sort((a, b) => {
        const pA = a._metadata?.priority || 0;
        const pB = b._metadata?.priority || 0;
        return pA - pB;
      });

      let mergedData = {};
      for (const data of fetchedDicts) {
        if (data._metadata?.version) combinedVersion += data._metadata.version;
        for (const [source, record] of Object.entries(data)) {
          if (source !== '_metadata') {
            mergedData[source] = JSON.parse(JSON.stringify(record));
          }
        }
      }

      const rawVersion = await this.getMetadata('jsonVersion');
      const currentVersion = rawVersion === null ? null : parseInt(rawVersion, 10);

      if (currentVersion === null || currentVersion !== combinedVersion) {
        console.log(`🔄 詞庫依權重合併完成: 總版本號 v${combinedVersion}`);
        await this._writeAllTerms(mergedData);
        await this.setMetadata('jsonVersion', combinedVersion);
      }
    } catch (error) {
      console.error('多模組詞庫同步發生嚴重錯誤:', error);
      throw error;
    }
  }

  async getAllTermsFromDB() {
    this._ensureDB();
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const result = request.result || [];
        result.sort((a, b) => a.source.localeCompare(b.source));
        resolve(result);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TerminologyStore };
}
