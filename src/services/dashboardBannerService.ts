import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DashboardBannerConfig {
  enabled: boolean;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  subtitle?: string;
  altText?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = 'vmk_dashboard_banner_config_v1';
const EVENT_KEY = 'vmk_dashboard_banner_change';

const DEFAULT_BANNER: DashboardBannerConfig = {
  enabled: false,
  imageUrl: '',
  linkUrl: '',
  title: '',
  subtitle: '',
  altText: 'Dashboard Banner',
};

/**
 * Get current cached banner configuration
 */
export function getDashboardBannerConfig(): DashboardBannerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_BANNER, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[DashboardBannerService] Failed to read from localStorage:', err);
  }
  return DEFAULT_BANNER;
}

/**
 * Save banner configuration locally and synchronize with Firestore
 */
export async function saveDashboardBannerConfig(
  config: Partial<DashboardBannerConfig>,
  updatedByUsername?: string
): Promise<DashboardBannerConfig> {
  const current = getDashboardBannerConfig();
  const updated: DashboardBannerConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedByUsername || current.updatedBy || 'Super Admin',
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: updated }));
  } catch (err) {
    console.warn('[DashboardBannerService] Failed to save to localStorage:', err);
  }

  // Cloud persistence in Firestore for real-time synchronization across all devices
  try {
    if (db) {
      const bannerDocRef = doc(db, 'system_config', 'dashboard_banner');
      await setDoc(bannerDocRef, updated, { merge: true });
    }
  } catch (err) {
    console.warn('[DashboardBannerService] Cloud sync error (local state preserved):', err);
  }

  return updated;
}

/**
 * Subscribe to banner updates (via local storage events and Firestore onSnapshot)
 */
export function subscribeToDashboardBanner(
  callback: (banner: DashboardBannerConfig) => void
): () => void {
  // 1. Initial fire
  callback(getDashboardBannerConfig());

  // 2. Local window event listener
  const handleLocalChange = (e: Event) => {
    const custom = e as CustomEvent<DashboardBannerConfig>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getDashboardBannerConfig());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getDashboardBannerConfig());
    }
  };

  window.addEventListener(EVENT_KEY, handleLocalChange);
  window.addEventListener('storage', handleStorageEvent);

  // 3. Firestore real-time listener
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    if (db) {
      const bannerDocRef = doc(db, 'system_config', 'dashboard_banner');
      unsubscribeFirestore = onSnapshot(
        bannerDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<DashboardBannerConfig>;
            const merged: DashboardBannerConfig = {
              ...DEFAULT_BANNER,
              ...data,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            callback(merged);
          }
        },
        (err) => {
          console.warn('[DashboardBannerService] Firestore listener notice:', err);
        }
      );
    }
  } catch (err) {
    console.warn('[DashboardBannerService] Error attaching firestore listener:', err);
  }

  return () => {
    window.removeEventListener(EVENT_KEY, handleLocalChange);
    window.removeEventListener('storage', handleStorageEvent);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}
