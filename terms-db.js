// terms-db.js
const DB_NAME = 'VeriZh_Terminology';
const DB_VERSION = 2; 
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

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'source' });
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
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
      
      for (const [source, record] of Object.entries(data)) {
        if (source === '_metadata') continue;
        
        // 💡 嚴格防禦：確保 source 是有效字串，且 record 是物件
        if (typeof source !== 'string' || !source.trim() || typeof record !== 'object' || record === null) {
          console.warn(`跳過無效的詞條: ${source}`, record);
          continue;
        }

        try {
          // 強制將 source 寫入物件中，確保 IDB 的 keyPath 絕對能找到它
          store.put({ ...record, source: source.trim() });
        } catch (e) {
          console.error(`寫入詞條失敗 [${source}]:`, e);
          // 不中斷整個迴圈，讓好的資料繼續寫入
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

      // 1. 並行抓取所有詞庫模組
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

      // 2. 依照 priority 升序排序 (確保高權重模組最後合併，覆寫低權重)
      fetchedDicts.sort((a, b) => {
        const pA = a._metadata?.priority || 0;
        const pB = b._metadata?.priority || 0;
        return pA - pB;
      });

      // 3. 執行合併與總雜湊版本號計算
      let mergedData = {};
      for (const data of fetchedDicts) {
        if (data._metadata?.version) combinedVersion += data._metadata.version;
        for (const [source, record] of Object.entries(data)) {
          if (source !== '_metadata') {
            // 深拷貝，避免參照污染
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
