import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from './authService';
import { BroadcastNotification } from '../types/broadcast';
import { UserProfile } from '../types/auth';
import { safeStorage } from '../utils/safeStorage';

const BROADCASTS_STORAGE_KEY = 'vmk_broadcasts_v1';
const BROADCAST_CHANNEL_NAME = 'vmk_broadcast_notifications_channel';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // Ignore in environments without BroadcastChannel
}

const subscribers: ((broadcasts: BroadcastNotification[]) => void)[] = [];

function notifySubscribers(broadcasts: BroadcastNotification[]) {
  subscribers.forEach((cb) => {
    try {
      cb(broadcasts);
    } catch (e) {
      console.error('Error notifying broadcast subscriber:', e);
    }
  });
}

// Listen to local BroadcastChannel for tab-to-tab sync
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'BROADCAST_UPDATED') {
      const stored = getBroadcasts();
      notifySubscribers(stored);
    }
  };
}

export function getBroadcasts(): BroadcastNotification[] {
  try {
    const raw = safeStorage.getItem(BROADCASTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: BroadcastNotification[] = JSON.parse(raw);
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Real-time subscription to broadcasts with Firestore listener & localStorage fallback
 */
export function subscribeToBroadcasts(
  callback: (broadcasts: BroadcastNotification[]) => void
): () => void {
  subscribers.push(callback);
  callback(getBroadcasts());

  // Firestore live listener
  let unsubscribeFirestore = () => {};
  try {
    const colRef = collection(db, 'broadcasts');
    unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        const list: BroadcastNotification[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((d) => {
            const data = d.data() as BroadcastNotification;
            if (data) {
              const item: BroadcastNotification = {
                ...data,
                id: data.id || d.id,
              };
              list.push(item);
            }
          });
          list.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        safeStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(list));
        notifySubscribers(list);
      },
      (err) => {
        console.warn('Firestore broadcasts onSnapshot note:', err.message);
      }
    );
  } catch (err) {
    console.warn('Could not initialize firestore broadcasts listener:', err);
  }

  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx >= 0) subscribers.splice(idx, 1);
    unsubscribeFirestore();
  };
}

/**
 * Save / Publish a new broadcast notification
 */
export async function saveBroadcast(broadcast: BroadcastNotification): Promise<void> {
  try {
    const list = getBroadcasts();
    const idx = list.findIndex((b) => b.id === broadcast.id);
    if (idx >= 0) {
      list[idx] = broadcast;
    } else {
      list.unshift(broadcast);
    }
    safeStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(list));
    notifySubscribers(list);

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'BROADCAST_UPDATED' });
    }

    // Cloud Firestore Sync
    try {
      await setDoc(
        doc(db, 'broadcasts', broadcast.id),
        sanitizeForFirestore(broadcast),
        { merge: true }
      );
    } catch (e: any) {
      console.warn('Firestore broadcast save note:', e?.message);
    }
  } catch (err) {
    console.error('Error saving broadcast notification:', err);
    throw err;
  }
}

/**
 * Delete a broadcast notification
 */
export async function deleteBroadcast(broadcastId: string): Promise<void> {
  try {
    const list = getBroadcasts().filter((b) => b.id !== broadcastId);
    safeStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(list));
    notifySubscribers(list);

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'BROADCAST_UPDATED' });
    }

    // Cloud Firestore Delete
    try {
      await deleteDoc(doc(db, 'broadcasts', broadcastId));
      // Also query by 'id' property in case document was stored under an auto-generated Firestore ID
      const q = query(collection(db, 'broadcasts'), where('id', '==', broadcastId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== broadcastId) {
          await deleteDoc(d.ref);
        }
      }
    } catch (e: any) {
      console.warn('Firestore broadcast delete note:', e?.message);
    }
  } catch (err) {
    console.error('Error deleting broadcast notification:', err);
    throw err;
  }
}

function getUserReadStorageKey(userIdOrUsername: string): string {
  return `vmk_read_broadcasts_${userIdOrUsername.trim().toLowerCase()}`;
}

/**
 * Mark a broadcast as read / dismissed by a specific user
 */
export function markBroadcastAsRead(broadcastId: string, userKey: string): void {
  try {
    const key = getUserReadStorageKey(userKey);
    const raw = safeStorage.getItem(key);
    const readIds: string[] = raw ? JSON.parse(raw) : [];
    if (!readIds.includes(broadcastId)) {
      readIds.push(broadcastId);
      safeStorage.setItem(key, JSON.stringify(readIds));
    }
  } catch (err) {
    console.error('Error marking broadcast as read:', err);
  }
}

/**
 * Check if user has already read / dismissed this broadcast
 */
export function hasUserReadBroadcast(broadcastId: string, userKey: string): boolean {
  try {
    const key = getUserReadStorageKey(userKey);
    const raw = safeStorage.getItem(key);
    if (!raw) return false;
    const readIds: string[] = JSON.parse(raw);
    return readIds.includes(broadcastId);
  } catch {
    return false;
  }
}

/**
 * Get active unread broadcast notifications for a counsellor or supporting staff member.
 * DNO and Super Admin are publishers, so they don't receive the mandatory popup.
 */
export function getUnreadBroadcastsForUser(
  user: UserProfile | null
): BroadcastNotification[] {
  if (!user) return [];

  // Super Admin & DNO are broadcasters; they don't get the popup meant for staff
  if (
    user.role === 'super_admin' ||
    user.role === 'dno' ||
    user.username?.toLowerCase() === 'shrinath' ||
    user.username?.toLowerCase() === 'dno'
  ) {
    return [];
  }

  const userKey = user.id || user.username || '';
  const userDistrict = (user.district || 'Washim').trim().toLowerCase();
  const userRole = user.role || 'counsellor';

  const allBroadcasts = getBroadcasts();

  return allBroadcasts.filter((b) => {
    if (b.isActive === false) return false;

    // Check if user already dismissed/acknowledged this broadcast
    if (hasUserReadBroadcast(b.id, userKey)) {
      return false;
    }

    // Role targeting check
    const roles = b.targetRoles || ['all'];
    const matchesRole =
      roles.includes('all') ||
      roles.includes(userRole as any) ||
      (userRole === 'operator' && (roles.includes('counsellor') || roles.includes('supporting_staff')));

    if (!matchesRole) return false;

    // District targeting check
    if (b.targetDistrict && b.targetDistrict !== 'all') {
      const bDist = b.targetDistrict.trim().toLowerCase();
      if (bDist !== userDistrict) {
        return false;
      }
    }

    return true;
  });
}
