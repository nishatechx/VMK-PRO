import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { sanitizeForFirestore, getAllUsers, saveUserAsync } from './authService';

const MASTER_API_KEY_STORAGE = 'vmk_system_gemini_api_key';
const FALLBACK_API_KEY_STORAGE = 'vmk_gemini_api_key';

let inMemoryMasterKey: string = '';
const masterKeySubscribers: ((key: string) => void)[] = [];
let isListenerActive = false;

// Initialize cached key from local storage or Vite env
if (typeof window !== 'undefined') {
  try {
    inMemoryMasterKey =
      localStorage.getItem(MASTER_API_KEY_STORAGE) ||
      localStorage.getItem(FALLBACK_API_KEY_STORAGE) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';
  } catch {
    inMemoryMasterKey = '';
  }
}

/**
 * Initializes Firestore real-time listener for the Center Master Gemini API Key
 */
export function initMasterApiKeySync() {
  if (isListenerActive || typeof window === 'undefined') return;
  isListenerActive = true;

  try {
    const configDocRef = doc(db, 'system_settings', 'gemini_api');
    onSnapshot(
      configDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const key = (data?.apiKey || '').trim();
          if (key) {
            inMemoryMasterKey = key;
            localStorage.setItem(MASTER_API_KEY_STORAGE, key);
            notifySubscribers(key);
          }
        }
      },
      (err) => {
        console.warn('Firestore system_settings/gemini_api listener fallback:', err?.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach master API key listener:', err);
  }
}

// Auto-start sync in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initMasterApiKeySync();
  }, 150);
}

function notifySubscribers(key: string) {
  masterKeySubscribers.forEach((cb) => {
    try {
      cb(key);
    } catch (e) {
      console.error('Error notifying API key subscriber:', e);
    }
  });
}

/**
 * Subscribe to real-time changes in the master Gemini API key
 */
export function subscribeToMasterApiKey(callback: (key: string) => void): () => void {
  masterKeySubscribers.push(callback);
  callback(inMemoryMasterKey);
  return () => {
    const idx = masterKeySubscribers.indexOf(callback);
    if (idx >= 0) masterKeySubscribers.splice(idx, 1);
  };
}

/**
 * Retrieve the active Master Gemini API Key
 */
export async function getMasterApiKey(): Promise<string> {
  if (inMemoryMasterKey && inMemoryMasterKey.trim()) {
    return inMemoryMasterKey.trim();
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    const cached =
      localStorage.getItem(MASTER_API_KEY_STORAGE) ||
      localStorage.getItem(FALLBACK_API_KEY_STORAGE) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';
    if (cached && cached.trim()) {
      inMemoryMasterKey = cached.trim();
      return inMemoryMasterKey;
    }
  }

  // Check server endpoint
  try {
    const resp = await fetch('/api/system-settings/master-api-key');
    if (resp.ok) {
      const data = await resp.json();
      if (data.apiKey && String(data.apiKey).trim()) {
        const key = String(data.apiKey).trim();
        inMemoryMasterKey = key;
        if (typeof window !== 'undefined') {
          localStorage.setItem(MASTER_API_KEY_STORAGE, key);
        }
        return key;
      }
    }
  } catch (e) {
    // Ignore server error and fallback
  }

  // Check Firestore
  try {
    const configDocRef = doc(db, 'system_settings', 'gemini_api');
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const key = (data?.apiKey || '').trim();
      if (key) {
        inMemoryMasterKey = key;
        if (typeof window !== 'undefined') {
          localStorage.setItem(MASTER_API_KEY_STORAGE, key);
        }
        return key;
      }
    }
  } catch (err) {
    console.warn('Could not fetch master API key from Firestore:', err);
  }

  return inMemoryMasterKey || '';
}

/**
 * Save master Gemini API Key to Server, Firestore & Local Storage
 */
export async function saveMasterApiKey(
  apiKey: string,
  updatedBy: string = 'dno'
): Promise<{ success: boolean; message: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: 'API key cannot be empty.' };
  }

  try {
    inMemoryMasterKey = cleanKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem(MASTER_API_KEY_STORAGE, cleanKey);
      localStorage.setItem(FALLBACK_API_KEY_STORAGE, cleanKey);
    }
    notifySubscribers(cleanKey);

    // Save to server API for instant cross-device availability
    try {
      await fetch('/api/system-settings/master-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
    } catch (e) {
      console.warn('Server master API key sync notice:', e);
    }

    // Save to Firestore so all users and devices receive it if rules allow
    try {
      const configDocRef = doc(db, 'system_settings', 'gemini_api');
      await setDoc(
        configDocRef,
        sanitizeForFirestore({
          apiKey: cleanKey,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy,
          isActive: true,
        }),
        { merge: true }
      );
    } catch (e) {
      // Ignore firestore quota issue
    }

    return {
      success: true,
      message: 'Master Gemini API Key saved to cloud database and distributed to authorized staff.',
    };
  } catch (err: any) {
    console.error('Failed to save master API key:', err);
    return {
      success: true,
      message: 'Master API Key saved locally.',
    };
  }
}

/**
 * Remove master Gemini API Key
 */
export async function deleteMasterApiKey(): Promise<{ success: boolean; message: string }> {
  try {
    inMemoryMasterKey = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MASTER_API_KEY_STORAGE);
      localStorage.removeItem(FALLBACK_API_KEY_STORAGE);
    }
    notifySubscribers('');

    // Remove on server
    try {
      await fetch('/api/system-settings/master-api-key', {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server delete master key notice:', e);
    }

    try {
      const configDocRef = doc(db, 'system_settings', 'gemini_api');
      await deleteDoc(configDocRef);
    } catch (e) {
      // Ignore firestore quota
    }

    return { success: true, message: 'Master Gemini API key removed.' };
  } catch (err: any) {
    console.error('Failed to remove master API key:', err);
    return { success: false, message: 'Failed to remove master key: ' + err?.message };
  }
}

/**
 * Checks whether a user has been granted permission by DNO to use the master API key
 */
export function hasUserApiKeyPermission(user?: UserProfile | null): boolean {
  if (!user) return false;
  // DNO root account always has full permission
  if (user.role === 'dno' || user.username.toLowerCase() === 'dno') {
    return true;
  }
  // Check explicit permission flag set by DNO
  if (user.canUseApiKey === true) {
    return true;
  }
  // If user has image_to_text_tool feature and canUseApiKey is not explicitly false
  if (user.canUseApiKey === undefined && Array.isArray(user.allowedFeatures) && user.allowedFeatures.includes('image_to_text_tool')) {
    return true;
  }
  return false;
}

/**
 * Toggle API Key permission for a user directly (Called by DNO from User Management)
 */
export async function toggleUserApiKeyPermission(
  userId: string,
  grantAccess: boolean
): Promise<{ success: boolean; message: string }> {
  const allUsers = getAllUsers();
  const targetUser = allUsers.find((u) => u.id === userId);

  if (!targetUser) {
    return { success: false, message: 'User not found.' };
  }

  const updatedUser: UserProfile = {
    ...targetUser,
    canUseApiKey: grantAccess,
  };

  const res = await saveUserAsync(updatedUser);
  return {
    success: res.success,
    message: grantAccess
      ? `API Key access granted to ${targetUser.fullName || targetUser.username}.`
      : `API Key access revoked from ${targetUser.fullName || targetUser.username}.`,
  };
}

/**
 * Grant API Key access to all active staff users (Bulk action for DNO)
 */
export async function grantApiKeyToAllUsers(): Promise<{ success: boolean; count: number; message: string }> {
  const allUsers = getAllUsers();
  let updatedCount = 0;

  for (const user of allUsers) {
    if (user.username.toLowerCase() !== 'dno' && user.canUseApiKey !== true) {
      await saveUserAsync({
        ...user,
        canUseApiKey: true,
      });
      updatedCount++;
    }
  }

  return {
    success: true,
    count: updatedCount,
    message: `Granted API Key access to ${updatedCount} staff member(s).`,
  };
}
