/**
 * Resilient Storage Layer with QuotaExceeded Protection
 * 
 * Prevents unhandled QuotaExceededError crashes when saving user profiles, sessions, or records.
 * Automatically evicts disposable caches and oversized blobs from LocalStorage,
 * falling back to high-capacity in-memory storage if browser storage limit is reached.
 */

import { idbSaveFiles } from './idbStorage';

const memoryStore = new Map<string, string>();

// Disposable / cache keys that can be evicted or pruned when quota is exceeded
const VOLATILE_KEYS = [
  'vmk_in_software_vault_v1',
  'vmk_audit_logs_v1',
  'vmk_center_notices_v1',
];

/**
 * Checks whether an exception corresponds to a browser LocalStorage quota exceeded condition
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const e = err as any;
  return (
    e instanceof DOMException &&
    (e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) || (
    typeof e?.message === 'string' &&
    (e.message.includes('quota') || e.message.includes('QuotaExceeded'))
  );
}

/**
 * Evict heavy temporary items from LocalStorage to reclaim space for critical system keys
 */
export function evictDisposableStorage(targetKey?: string): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  let reclaimedCount = 0;

  try {
    // 1. Move any existing vault documents into IndexedDB before removing from LocalStorage
    const vaultRaw = window.localStorage.getItem('vmk_in_software_vault_v1');
    if (vaultRaw) {
      try {
        const vaultFiles = JSON.parse(vaultRaw);
        if (Array.isArray(vaultFiles) && vaultFiles.length > 0) {
          idbSaveFiles(vaultFiles).catch(() => {});
        }
      } catch {
        // ignore parse error
      }
      window.localStorage.removeItem('vmk_in_software_vault_v1');
      reclaimedCount++;
    }

    // 2. Remove all session-specific QR file caches
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('vmk_qr_files_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      window.localStorage.removeItem(k);
      reclaimedCount++;
    });

    // 3. If targetKey is not in volatile list, also prune other volatile keys
    VOLATILE_KEYS.forEach((vk) => {
      if (vk !== targetKey && window.localStorage.getItem(vk)) {
        window.localStorage.removeItem(vk);
        reclaimedCount++;
      }
    });
  } catch (err) {
    console.warn('[SafeStorage] Error during eviction:', err);
  }

  return reclaimedCount;
}

/**
 * Strips huge base64 strings (like raw profile pictures) from user profile JSON
 * if needed to ensure critical credentials and roles can always fit in LocalStorage.
 */
function sanitizeProfilesForStorage(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const sanitized = parsed.map((user: any) => {
        if (user && user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.length > 2000) {
          // Keep a lightweight marker or omit giant base64 from localStorage
          const { profilePicture, ...rest } = user;
          return rest;
        }
        return user;
      });
      return JSON.stringify(sanitized);
    }
  } catch {
    // Return original if not JSON
  }
  return value;
}

export const safeStorage = {
  /**
   * Safe setItem with automatic QuotaExceeded error recovery and fallback to in-memory store
   */
  setItem(key: string, value: string): boolean {
    // Always keep latest value in memory store
    memoryStore.set(key, value);

    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (firstErr) {
      if (isQuotaExceededError(firstErr)) {
        console.warn(`[SafeStorage] LocalStorage quota exceeded while setting "${key}". Evicting disposable items...`);
        evictDisposableStorage(key);

        let finalValueToSave = value;
        if (key === 'vmk_user_profiles_v1') {
          finalValueToSave = sanitizeProfilesForStorage(value);
        }

        try {
          window.localStorage.setItem(key, finalValueToSave);
          console.log(`[SafeStorage] Successfully saved "${key}" to LocalStorage after eviction.`);
          return true;
        } catch (retryErr) {
          console.warn(`[SafeStorage] LocalStorage still full after eviction for "${key}". Preserved in memory store safely.`);
          return false;
        }
      }

      console.warn(`[SafeStorage] Error writing key "${key}" to LocalStorage:`, firstErr);
      return false;
    }
  },

  /**
   * Safe getItem with fallback to in-memory cache
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return memoryStore.get(key) || null;
    }

    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        memoryStore.set(key, val);
        return val;
      }
    } catch (err) {
      console.warn(`[SafeStorage] Error reading key "${key}" from LocalStorage:`, err);
    }

    return memoryStore.get(key) || null;
  },

  /**
   * Safe removeItem
   */
  removeItem(key: string): void {
    memoryStore.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  },

  /**
   * Helper to retrieve and parse JSON safely
   */
  getJSON<T>(key: string, defaultValue: T): T {
    const raw = this.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Helper to serialize and save JSON safely
   */
  setJSON<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized);
    } catch (err) {
      console.warn(`[SafeStorage] JSON serialization failed for key "${key}":`, err);
      return false;
    }
  },
};

// On client startup: perform an initial cleanup check if LocalStorage has large legacy files
if (typeof window !== 'undefined') {
  try {
    const vaultRaw = window.localStorage.getItem('vmk_in_software_vault_v1');
    if (vaultRaw && vaultRaw.length > 500000) {
      // Greater than 500KB - migrate to IndexedDB immediately to free up space
      try {
        const vaultFiles = JSON.parse(vaultRaw);
        if (Array.isArray(vaultFiles) && vaultFiles.length > 0) {
          idbSaveFiles(vaultFiles).then(() => {
            window.localStorage.removeItem('vmk_in_software_vault_v1');
            console.log('[SafeStorage] Migrated legacy vault files from LocalStorage to IndexedDB.');
          }).catch(() => {});
        }
      } catch {
        window.localStorage.removeItem('vmk_in_software_vault_v1');
      }
    }
  } catch {
    // ignore
  }
}
