import { QrUploadedFile, QR_BROADCAST_CHANNEL } from '../types/qrUpload';
export type { QrUploadedFile };
import { db } from '../lib/firebase';
import { sanitizeForFirestore, getCurrentUser } from './authService';
import { UserProfile } from '../types/auth';
import { getDefaultVaultFiles } from '../data/seedVaultDocuments';
import { safeStorage } from '../utils/safeStorage';
import { idbSaveFile, idbSaveFiles, idbGetAllFiles, idbDeleteFile } from '../utils/idbStorage';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'vmk_qr_files_';
const VAULT_STORAGE_KEY = 'vmk_in_software_vault_v1';

// In-memory cache for ultra-fast document access without LocalStorage bloat
let inMemoryVaultFiles: QrUploadedFile[] = [];
let isIdbInitialized = false;

// BroadcastChannel for cross-tab realtime sync (on same browser)
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(QR_BROADCAST_CHANNEL);
  }
} catch {
  // BroadcastChannel unavailable
}

/**
 * Strict role-based isolation rule:
 * - "show vault files to concern user only like any other counselor should not be able to see other user files"
 * - "only dno can see this"
 * - "give district list to select while user account creation so that respective dno can see his counselors and supporting staff data"
 */
export function filterVaultFilesForUser(
  files: QrUploadedFile[],
  user: UserProfile | null | undefined
): QrUploadedFile[] {
  if (!user) return [];

  const isDno = user.role === 'dno' || user.username.toLowerCase() === 'dno';

  if (isDno) {
    // Root master DNO ('dno' without district) can see all files across Maharashtra
    if (user.username.toLowerCase() === 'dno' && !user.district) {
      return files;
    }
    // Respective district DNO can see files belonging to their assigned district
    const dnoDistrict = (user.district || 'Washim').trim().toLowerCase();
    return files.filter((f) => {
      if (!f.district) return true; // Legacy/unassigned files visible to DNO
      return f.district.trim().toLowerCase() === dnoDistrict;
    });
  }

  // Any other counselor / staff / operator:
  // Strictly filter to files where uploadedBy === current user's username!
  // No other counselor can see them!
  const currentUsername = user.username.trim().toLowerCase();
  return files.filter((f) => {
    const uploader = (f.uploadedBy || '').trim().toLowerCase();
    return uploader === currentUsername;
  });
}

export const qrUploadService = {
  // Upload a file to session - transmits to backend server & Firebase Firestore
  async uploadFile(
    sessionId: string,
    fileData: {
      name: string;
      type: string;
      size: number;
      dataUrl: string;
      category?: string;
      uploadedBy?: string;
      uploaderName?: string;
      uploaderRole?: string;
      district?: string;
    }
  ): Promise<QrUploadedFile> {
    const user = getCurrentUser();
    const uploadedBy = fileData.uploadedBy || user?.username || 'counsellor';
    const uploaderName = fileData.uploaderName || user?.fullName || user?.username || 'Counselor';
    const uploaderRole = fileData.uploaderRole || user?.role || 'counsellor';
    const district = fileData.district || user?.district || 'Washim';

    const newFile: QrUploadedFile = {
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      sessionId,
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
      dataUrl: fileData.dataUrl,
      uploadedAt: new Date().toISOString(),
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: fileData.category || this.detectCategory(fileData.name),
      uploadedBy,
      uploaderName,
      uploaderRole,
      district,
    };

    // 1. Post to Firebase Firestore Database
    try {
      const docRef = doc(db, 'qr_uploads', newFile.id);
      await setDoc(docRef, sanitizeForFirestore(newFile));
      console.log(`[Firebase Firestore] Saved document ${newFile.id} to Firestore (User: ${uploadedBy}, District: ${district})`);
    } catch (firestoreErr) {
      console.warn('[Firebase Firestore] Warning saving to Firestore:', firestoreErr);
    }

    // 2. Post to server API for cross-device synchronization (Mobile Phone -> Desktop Software)
    try {
      const res = await fetch('/api/qr-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: newFile.name,
          type: newFile.type,
          size: newFile.size,
          dataUrl: newFile.dataUrl,
          category: newFile.category,
          uploadedBy: newFile.uploadedBy,
          uploaderName: newFile.uploaderName,
          uploaderRole: newFile.uploaderRole,
          district: newFile.district,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.file) {
          const serverFile: QrUploadedFile = { ...json.file, isDownloadedToSoftware: true };
          this.saveToLocalStorage(sessionId, serverFile);
          this.saveToSoftwareVault(serverFile);
          this.notifyBroadcast(sessionId, serverFile);
          return serverFile;
        }
      }
    } catch (e) {
      console.warn('Server upload endpoint unreachable, saving to local store:', e);
    }

    // 3. Local fallback - stored in browser storage
    this.saveToLocalStorage(sessionId, newFile);
    this.saveToSoftwareVault(newFile);
    this.notifyBroadcast(sessionId, newFile);
    return newFile;
  },

  detectCategory(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.includes('hsc') || lower.includes('ssc') || lower.includes('mark') || lower.includes('result')) return 'Mark Sheet / Result';
    if (lower.includes('caste') || lower.includes('ncl') || lower.includes('ews') || lower.includes('validity')) return 'Caste / Category Certificate';
    if (lower.includes('domicile') || lower.includes('birth') || lower.includes('lc') || lower.includes('leaving')) return 'Domicile / Birth / LC';
    if (lower.includes('income') || lower.includes('tws')) return 'Income Certificate';
    if (lower.includes('photo') || lower.includes('sign') || lower.includes('image') || lower.includes('pic')) return 'Photo / Signature';
    if (lower.includes('cet') || lower.includes('allotment') || lower.includes('score') || lower.includes('admit')) return 'CET / Score Card / Allotment';
    return 'Candidate Document';
  },

  // Get all files for session from Firestore or Server or LocalStorage
  async getFiles(sessionId: string): Promise<QrUploadedFile[]> {
    // 1. Try Firebase Firestore
    try {
      const q = query(
        collection(db, 'qr_uploads'),
        where('sessionId', '==', sessionId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreFiles: QrUploadedFile[] = [];
        snapshot.forEach((docSnap) => {
          firestoreFiles.push(docSnap.data() as QrUploadedFile);
        });
        firestoreFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        firestoreFiles.forEach((f) => {
          this.saveToLocalStorage(sessionId, f);
          this.saveToSoftwareVault(f);
        });
        return firestoreFiles;
      }
    } catch (err) {
      console.warn('[Firebase] Query error:', err);
    }

    // 2. Try Server API
    let serverFiles: QrUploadedFile[] = [];
    try {
      const res = await fetch(`/api/qr-files?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files)) {
          serverFiles = json.files.map((f: QrUploadedFile) => ({ ...f, isDownloadedToSoftware: true }));
          serverFiles.forEach((f) => {
            this.saveToLocalStorage(sessionId, f);
            this.saveToSoftwareVault(f);
          });
          return serverFiles;
        }
      }
    } catch (e) {
      // Offline fallback
    }

    // Return from localStorage if server & firestore are unreachable
    return this.getFromLocalStorage(sessionId);
  },

  // Get all files stored inside the software vault across all sessions (Strictly scoped by user and district)
  async getAllVaultFilesAsync(forUser?: UserProfile | null): Promise<QrUploadedFile[]> {
    const targetUser = forUser !== undefined ? forUser : getCurrentUser();

    // 1. Query Server API with user identity
    try {
      const params = new URLSearchParams();
      if (targetUser) {
        params.set('username', targetUser.username);
        params.set('role', targetUser.role);
        if (targetUser.district) params.set('district', targetUser.district);
      }
      const res = await fetch(`/api/qr-vault?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files)) {
          json.files.forEach((f: QrUploadedFile) => this.saveToSoftwareVault(f));
          return filterVaultFilesForUser(json.files, targetUser);
        }
      }
    } catch {
      // ignore
    }

    // 2. Query Firestore
    try {
      const isDno = targetUser?.role === 'dno' || targetUser?.username?.toLowerCase() === 'dno';
      let q;
      if (isDno) {
        q = query(collection(db, 'qr_uploads'), limit(100));
      } else if (targetUser?.username) {
        q = query(collection(db, 'qr_uploads'), where('uploadedBy', '==', targetUser.username), limit(100));
      } else {
        q = query(collection(db, 'qr_uploads'), limit(50));
      }

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: QrUploadedFile[] = [];
        snapshot.forEach((d) => list.push(d.data() as QrUploadedFile));
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        list.forEach((f) => this.saveToSoftwareVault(f));
        return filterVaultFilesForUser(list, targetUser);
      }
    } catch (e) {
      // ignore
    }

    return this.getAllVaultFiles(targetUser);
  },

  // Synchronous read from local vault cache (Strictly scoped by user and district)
  getAllVaultFiles(forUser?: UserProfile | null): QrUploadedFile[] {
    const targetUser = forUser !== undefined ? forUser : getCurrentUser();
    try {
      if (inMemoryVaultFiles.length === 0) {
        // Initialize with default documents immediately for instantaneous render
        inMemoryVaultFiles = getDefaultVaultFiles();

        // Asynchronously hydrate from IndexedDB without blocking render
        if (typeof window !== 'undefined' && !isIdbInitialized) {
          isIdbInitialized = true;
          idbGetAllFiles<QrUploadedFile>().then((idbFiles) => {
            if (idbFiles.length > 0) {
              const fileMap = new Map<string, QrUploadedFile>();
              inMemoryVaultFiles.forEach((f) => fileMap.set(f.id, f));
              idbFiles.forEach((f) => fileMap.set(f.id, f));
              inMemoryVaultFiles = Array.from(fileMap.values());
              inMemoryVaultFiles.sort(
                (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
              );
            } else {
              // Seed IndexedDB
              idbSaveFiles(inMemoryVaultFiles).catch(() => {});
            }
          }).catch(() => {});
        }
      }

      return filterVaultFilesForUser(inMemoryVaultFiles, targetUser);
    } catch {
      return filterVaultFilesForUser(getDefaultVaultFiles(), targetUser);
    }
  },

  // Connect to Firebase Firestore Realtime Snapshots & Server-Sent Events for instant push
  listenFirestoreRealtime(sessionId: string, onUpdate: (file: QrUploadedFile) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    try {
      const q = query(
        collection(db, 'qr_uploads'),
        where('sessionId', '==', sessionId)
      );
      unsubFirestore = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const file = change.doc.data() as QrUploadedFile;
            this.saveToLocalStorage(sessionId, file);
            this.saveToSoftwareVault(file);
            onUpdate(file);
          }
        });
      }, (error) => {
        console.warn('[Firestore onSnapshot warning]', error);
      });
    } catch (e) {
      console.warn('Firestore snapshot setup failed:', e);
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  },

  // Connect to Server-Sent Events (SSE) for instant push of mobile uploads
  listenServerEvents(sessionId: string, onNewFile: (file: QrUploadedFile) => void): () => void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return () => {};
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/qr-events?sessionId=${encodeURIComponent(sessionId)}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'NEW_FILE' && data.file) {
            const file: QrUploadedFile = { ...data.file, isDownloadedToSoftware: true };
            this.saveToLocalStorage(sessionId, file);
            this.saveToSoftwareVault(file);
            onNewFile(file);
          }
        } catch (err) {
          console.warn('Error parsing SSE event:', err);
        }
      };
    } catch (err) {
      console.warn('SSE connection failed, falling back to polling:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  },

  // Toggle verification stamp for in-software review
  async toggleVerifyStamp(sessionId: string, fileId: string): Promise<boolean> {
    let newStatus = false;

    // 1. Update Firebase Firestore
    try {
      const docRef = doc(db, 'qr_uploads', fileId);
      await updateDoc(docRef, { verifiedStamp: true });
    } catch {
      // ignore
    }

    // 2. Notify server
    try {
      await fetch('/api/qr-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fileId }),
      });
    } catch {
      // ignore
    }

    try {
      // Session store
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = safeStorage.getItem(key);
      if (saved) {
        const list: QrUploadedFile[] = JSON.parse(saved);
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) {
          list[idx].verifiedStamp = !list[idx].verifiedStamp;
          newStatus = !!list[idx].verifiedStamp;
          safeStorage.setItem(key, JSON.stringify(list));
        }
      }

      // Vault in-memory & IndexedDB store
      const inMemoryIdx = inMemoryVaultFiles.findIndex((f) => f.id === fileId);
      if (inMemoryIdx >= 0) {
        inMemoryVaultFiles[inMemoryIdx].verifiedStamp = newStatus;
        idbSaveFile(inMemoryVaultFiles[inMemoryIdx]).catch(() => {});
      }
    } catch (e) {
      console.warn('Error toggling stamp:', e);
    }
    return newStatus;
  },

  // Update an existing file in session, vault, server, and Firestore (e.g. after Smart Cropping)
  async updateVaultFile(
    fileId: string,
    updates: { dataUrl: string; size?: number; name?: string; sessionId?: string }
  ): Promise<QrUploadedFile | null> {
    let updated: QrUploadedFile | null = null;

    // 1. Update in Firestore
    try {
      const docRef = doc(db, 'qr_uploads', fileId);
      const updateData: any = { dataUrl: updates.dataUrl };
      if (updates.size !== undefined) updateData.size = updates.size;
      if (updates.name) updateData.name = updates.name;
      await updateDoc(docRef, updateData);
    } catch (err) {
      console.warn('[Firebase] Warning updating Firestore document:', err);
    }

    // 2. Update via server API
    try {
      const res = await fetch('/api/qr-files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          sessionId: updates.sessionId,
          dataUrl: updates.dataUrl,
          size: updates.size,
          name: updates.name,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.file) {
          updated = json.file;
        }
      }
    } catch (err) {
      console.warn('Server patch error:', err);
    }

    // 3. Update in memory & IndexedDB
    try {
      const idx = inMemoryVaultFiles.findIndex((f) => f.id === fileId);
      if (idx >= 0) {
        inMemoryVaultFiles[idx] = {
          ...inMemoryVaultFiles[idx],
          dataUrl: updates.dataUrl,
          size: updates.size !== undefined ? updates.size : inMemoryVaultFiles[idx].size,
          name: updates.name || inMemoryVaultFiles[idx].name,
        };
        if (!updated) updated = inMemoryVaultFiles[idx];
        idbSaveFile(inMemoryVaultFiles[idx]).catch(() => {});
      }

      if (updates.sessionId) {
        const key = `${STORAGE_KEY_PREFIX}${updates.sessionId}`;
        const saved = safeStorage.getItem(key);
        if (saved) {
          const list: QrUploadedFile[] = JSON.parse(saved);
          const sIdx = list.findIndex((f) => f.id === fileId);
          if (sIdx >= 0) {
            list[sIdx] = {
              ...list[sIdx],
              dataUrl: updates.dataUrl,
              size: updates.size !== undefined ? updates.size : list[sIdx].size,
              name: updates.name || list[sIdx].name,
            };
            if (!updated) updated = list[sIdx];
            safeStorage.setItem(key, JSON.stringify(list));
          }
        }
      }

      if (broadcastChannel && updated) {
        broadcastChannel.postMessage({
          type: 'UPDATE_FILE',
          sessionId: updates.sessionId,
          file: updated,
        });
      }
    } catch (e) {
      console.warn('Local update warning:', e);
    }

    return updated;
  },

  // Delete a file from session and vault
  async deleteFile(sessionId: string, fileId: string): Promise<void> {
    // 1. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'qr_uploads', fileId));
    } catch {
      // ignore
    }

    try {
      await fetch(`/api/qr-files?sessionId=${encodeURIComponent(sessionId)}&fileId=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
    } catch {
      // ignore
    }

    try {
      // Delete from memory and IndexedDB
      inMemoryVaultFiles = inMemoryVaultFiles.filter((f) => f.id !== fileId);
      idbDeleteFile(fileId).catch(() => {});

      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = safeStorage.getItem(key);
      if (saved) {
        const list: QrUploadedFile[] = JSON.parse(saved);
        const filtered = list.filter((f) => f.id !== fileId);
        safeStorage.setItem(key, JSON.stringify(filtered));
      }

      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'DELETE_FILE', sessionId, fileId });
      }
    } catch {
      // ignore
    }
  },

  saveToLocalStorage(sessionId: string, file: QrUploadedFile) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = safeStorage.getItem(key);
      const list: QrUploadedFile[] = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex((f) => f.id === file.id);
      if (existingIdx >= 0) {
        list[existingIdx] = file;
      } else {
        list.unshift(file);
      }
      if (list.length > 25) list.pop();
      safeStorage.setItem(key, JSON.stringify(list));
      idbSaveFile(file).catch(() => {});
    } catch (e) {
      console.warn('localStorage save warning:', e);
    }
  },

  saveToSoftwareVault(file: QrUploadedFile) {
    try {
      const existingIdx = inMemoryVaultFiles.findIndex((f) => f.id === file.id);
      if (existingIdx >= 0) {
        inMemoryVaultFiles[existingIdx] = file;
      } else {
        inMemoryVaultFiles.unshift(file);
      }
      if (inMemoryVaultFiles.length > 60) inMemoryVaultFiles.pop();

      // Persist full base64 file to high-capacity IndexedDB
      idbSaveFile(file).catch(() => {});
    } catch (e) {
      console.warn('Vault save warning:', e);
    }
  },

  getFromLocalStorage(sessionId: string): QrUploadedFile[] {
    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = safeStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  notifyBroadcast(sessionId: string, file: QrUploadedFile) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'NEW_FILE', sessionId, file });
      } catch (e) {
        console.warn('Broadcast channel post failed:', e);
      }
    }
  },

  listenBroadcast(sessionId: string, onUpdate: (file: QrUploadedFile) => void): () => void {
    if (!broadcastChannel) return () => {};

    const handler = (event: MessageEvent) => {
      if (event.data?.sessionId === sessionId && event.data?.type === 'NEW_FILE') {
        onUpdate(event.data.file);
      }
    };

    broadcastChannel.addEventListener('message', handler);
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  },
};

export const getAllVaultFilesAsync = (forUser?: UserProfile | null) => qrUploadService.getAllVaultFilesAsync(forUser);
export const getAllVaultFiles = (forUser?: UserProfile | null) => qrUploadService.getAllVaultFiles(forUser);


