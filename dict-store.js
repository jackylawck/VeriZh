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

  async getMetadata(key) {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([META_STORE], 'readonly').objectStore(META_STORE).get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async setMetadata(key, value) {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([META_STORE], 'readwrite').objectStore(META_STORE).put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async syncFromJson(jsonUrl) {
    try {
      const response = await fetch(jsonUrl);
      const data = await response.json();
      
      const newVersion = parseInt(data._metadata?.version, 10) || Date.now();
      const currentVersion = parseInt(await this.getMetadata('jsonVersion'), 10) || 0;

      if (currentVersion !== newVersion) {
        console.log(`🔄 偵測到詞庫版本更新: v${currentVersion} ➔ v${newVersion}`);
        
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.clear(); 
          
          for (const [source, record] of Object.entries(data)) {
            if (source === '_metadata') continue;
            store.put({ source, ...record });
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event) => reject(event.target.error);
        });
        
        await this.setMetadata('jsonVersion', newVersion);
      }
    } catch (error) {
      console.error('JSON 詞庫同步失敗:', error);
      throw error;
    }
  }

  async getAllTermsFromDB() {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}
