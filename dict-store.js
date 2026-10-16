// dict-store.js
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
        store.put({ source, ...record });
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
      transaction.onabort = (event) => reject(event.target.error || new Error('Transaction aborted'));
    });
  }

  async syncFromJson(jsonUrl) {
    this._ensureDB();
    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('JSON 格式錯誤：預期為物件');
      }
      
      const metaVersion = data._metadata?.version;
      const newVersion = Number.isInteger(metaVersion) ? metaVersion : null;
      
      // 缺失版本號的安全降級處理
      if (newVersion === null) {
        console.warn('⚠️ JSON 缺少有效的 _metadata.version，跳過版本同步以避免不必要的清除。');
        const rawVersion = await this.getMetadata('jsonVersion');
        if (rawVersion === null) {
          await this._writeAllTerms(data);
          await this.setMetadata('jsonVersion', -1);
        }
        return;
      }
      
      // 💡 徹底解決 Falsy Value 陷阱：明確區分 null 與 0
      const rawVersion = await this.getMetadata('jsonVersion');
      const currentVersion = rawVersion === null ? null : parseInt(rawVersion, 10);

      // 首次載入（currentVersion === null）或版本號不同時，執行同步
      if (currentVersion === null || currentVersion !== newVersion) {
        console.log(`🔄 詞庫同步: ${currentVersion === null ? '首次載入' : `v${currentVersion} ➔ v${newVersion}`}`);
        await this._writeAllTerms(data);
        await this.setMetadata('jsonVersion', newVersion);
      }
    } catch (error) {
      console.error('JSON 詞庫同步失敗:', error);
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
