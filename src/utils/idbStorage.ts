/**
 * High-capacity IndexedDB storage for document scans, PDFs, and uploaded vault files.
 * Provides hundreds of megabytes of quota, preventing browser LocalStorage 5MB QuotaExceeded errors.
 */

const DB_NAME = 'vmk_vault_storage_v1';
const STORE_NAME = 'vault_documents';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (err) => {
          console.warn('[IndexedDB] Could not open database:', err);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('[IndexedDB] Database open blocked.');
          resolve(null);
        };
      } catch (e) {
        console.warn('[IndexedDB] Init error:', e);
        resolve(null);
      }
    });
  }

  return dbPromise;
}

export async function idbSaveFile<T extends { id: string }>(file: T): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file);

      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.warn('[IndexedDB] Error saving file:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Save exception:', err);
    return false;
  }
}

export async function idbSaveFiles<T extends { id: string }>(files: T[]): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      files.forEach((f) => {
        try {
          store.put(f);
        } catch (e) {
          // ignore individual item error
        }
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.warn('[IndexedDB] Batch save error:', err);
        resolve(false);
      };
      tx.onabort = () => resolve(false);
    });
  } catch (err) {
    console.warn('[IndexedDB] Batch save exception:', err);
    return false;
  }
}

export async function idbGetFile<T>(id: string): Promise<T | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result ? (req.result as T) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbGetAllFiles<T>(): Promise<T[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function idbDeleteFile(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function idbClearFiles(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
