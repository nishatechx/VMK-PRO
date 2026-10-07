import { QrUploadedFile, CustomVaultFolder, QR_BROADCAST_CHANNEL } from '../types/qrUpload';
export type { QrUploadedFile, CustomVaultFolder };
import { db } from '../lib/firebase';
import { sanitizeForFirestore, getCurrentUser } from './authService';
import { UserProfile } from '../types/auth';
import { getDefaultVaultFiles } from '../data/seedVaultDocuments';
import { safeStorage } from '../utils/safeStorage';
import { idbSaveFile, idbSaveFiles, idbGetAllFiles, idbDeleteFile } from '../utils/idbStorage';
import { compressImageForUpload } from '../utils/documentVision';
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
const VAULT_FOLDERS_STORAGE_KEY = 'vmk_vault_custom_folders_v2';
const LEGACY_VAULT_FOLDERS_STORAGE_KEY = 'vmk_vault_custom_folders_v1';

/**
 * Filter custom folders according to user role:
 * - Super admin sees all folders across all users & districts
 * - District Nodal Officer (DNO) can see all folders created by users in their district
 * - Regular users / counsellors CANNOT see each other's folders (only their own)
 */
export function filterVaultFoldersForUser(
  folders: CustomVaultFolder[],
  user: UserProfile | null | undefined
): CustomVaultFolder[] {
  if (!user) return folders;

  const isSuperAdmin = user.role === 'super_admin' || user.username?.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    return folders;
  }

  const isDno = user.role === 'dno' || user.username?.toLowerCase() === 'dno';
  if (isDno) {
    // Master state-wide DNO sees all folders
    if (user.username.toLowerCase() === 'dno' && !user.district) {
      return folders;
    }
    const dnoDistrict = (user.district || 'Washim').trim().toLowerCase();
    return folders.filter((f) => {
      if (!f.district) return true;
      return f.district.trim().toLowerCase() === dnoDistrict;
    });
  }

  // Regular user / counsellor / operator:
  // "dont show the folder of users to each others only dno can see"
  const currentUsername = user.username.trim().toLowerCase();
  return folders.filter((f) => {
    const creator = (f.createdBy || '').trim().toLowerCase();
    return creator === currentUsername;
  });
}

export function getAllStoredCustomVaultFolders(): CustomVaultFolder[] {
  try {
    const raw = safeStorage.getItem(VAULT_FOLDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') {
            return {
              id: item,
              name: item,
              createdBy: 'counsellor',
              createdAt: new Date().toISOString(),
            };
          }
          return item as CustomVaultFolder;
        });
      }
    }

    // Check legacy key
    const legacyRaw = safeStorage.getItem(LEGACY_VAULT_FOLDERS_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed)) {
        const migrated: CustomVaultFolder[] = legacyParsed.map((name: string) => ({
          id: String(name),
          name: String(name),
          createdBy: 'counsellor',
          createdAt: new Date().toISOString(),
        }));
        saveAllCustomVaultFolders(migrated);
        return migrated;
      }
    }
  } catch {}
  return [];
}

export function saveAllCustomVaultFolders(folders: CustomVaultFolder[]): void {
  try {
    const map = new Map<string, CustomVaultFolder>();
    folders.forEach((f) => {
      const key = `${(f.name || '').trim().toLowerCase()}__${(f.createdBy || '').trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, f);
    });
    safeStorage.setItem(VAULT_FOLDERS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

export function getCustomVaultFolders(forUser?: UserProfile | null): CustomVaultFolder[] {
  const targetUser = forUser !== undefined ? forUser : getCurrentUser();
  const all = getAllStoredCustomVaultFolders();
  return filterVaultFoldersForUser(all, targetUser);
}

export function saveCustomVaultFolders(folders: CustomVaultFolder[]): void {
  saveAllCustomVaultFolders(folders);
}

export function addCustomVaultFolder(
  folderName: string,
  forUser?: UserProfile | null
): CustomVaultFolder[] {
  const clean = folderName.trim();
  const targetUser = forUser !== undefined ? forUser : getCurrentUser();
  if (!clean) return getCustomVaultFolders(targetUser);

  const currentUsername = targetUser?.username || 'counsellor';
  const all = getAllStoredCustomVaultFolders();

  const existingIndex = all.findIndex(
    (f) => f.name.toLowerCase() === clean.toLowerCase() && f.createdBy.toLowerCase() === currentUsername.toLowerCase()
  );

  let updatedAll: CustomVaultFolder[];
  let folderObj: CustomVaultFolder;

  if (existingIndex >= 0) {
    folderObj = all[existingIndex];
    updatedAll = all;
  } else {
    folderObj = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      createdBy: currentUsername,
      creatorName: targetUser?.fullName || targetUser?.username || 'Counsellor',
      creatorRole: targetUser?.role || 'counsellor',
      district: targetUser?.district || 'Washim',
      createdAt: new Date().toISOString(),
    };
    updatedAll = [...all, folderObj];
    saveAllCustomVaultFolders(updatedAll);
  }

  // Cloud sync to Server & Firestore
  syncFolderToCloud(folderObj).catch(() => {});

  return filterVaultFoldersForUser(updatedAll, targetUser);
}

export function removeCustomVaultFolder(
  folderNameOrId: string,
  forUser?: UserProfile | null
): CustomVaultFolder[] {
  const targetUser = forUser !== undefined ? forUser : getCurrentUser();
  const isSuperAdmin = targetUser?.role === 'super_admin' || targetUser?.username?.toLowerCase() === 'shrinath';
  const isDno = targetUser?.role === 'dno' || targetUser?.username?.toLowerCase() === 'dno';
  const currentUsername = (targetUser?.username || '').trim().toLowerCase();

  const all = getAllStoredCustomVaultFolders();
  const updatedAll = all.filter((f) => {
    const isTarget = f.id === folderNameOrId || f.name.toLowerCase() === folderNameOrId.trim().toLowerCase();
    if (!isTarget) return true; // keep
    // Can only delete if creator OR DNO / super admin
    if (isSuperAdmin || isDno) return false; // remove
    if (f.createdBy.toLowerCase() === currentUsername) return false; // remove
    return true; // keep
  });

  saveAllCustomVaultFolders(updatedAll);
  deleteFolderFromCloud(folderNameOrId, targetUser).catch(() => {});

  return filterVaultFoldersForUser(updatedAll, targetUser);
}

async function syncFolderToCloud(folder: CustomVaultFolder): Promise<void> {
  // 1. Server API
  try {
    await fetch('/api/vault-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder),
    });
  } catch {}

  // 2. Firestore
  try {
    const docId = `folder_${folder.createdBy}_${folder.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    await setDoc(doc(db, 'vault_folders', docId), sanitizeForFirestore(folder), { merge: true });
  } catch {}
}

async function deleteFolderFromCloud(folderIdOrName: string, user?: UserProfile | null): Promise<void> {
  const username = user?.username || '';
  const role = user?.role || '';
  // 1. Server API
  try {
    await fetch(`/api/vault-folders/${encodeURIComponent(folderIdOrName)}?username=${encodeURIComponent(username)}&role=${encodeURIComponent(role)}`, {
      method: 'DELETE',
    });
  } catch {}

  // 2. Firestore
  try {
    const q = query(
      collection(db, 'vault_folders'),
      where('name', '==', folderIdOrName)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      deleteDoc(d.ref).catch(() => {});
    });
  } catch {}
}

export async function fetchCustomVaultFoldersAsync(forUser?: UserProfile | null): Promise<CustomVaultFolder[]> {
  const targetUser = forUser !== undefined ? forUser : getCurrentUser();
  const map = new Map<string, CustomVaultFolder>();

  // Add local stored
  getAllStoredCustomVaultFolders().forEach((f) => {
    map.set(`${f.name.toLowerCase()}__${f.createdBy.toLowerCase()}`, f);
  });

  // 1. Fetch from Server
  try {
    const params = new URLSearchParams();
    if (targetUser) {
      params.set('username', targetUser.username);
      params.set('role', targetUser.role);
      if (targetUser.district) params.set('district', targetUser.district);
    }
    const res = await fetch(`/api/vault-folders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.folders)) {
        data.folders.forEach((f: CustomVaultFolder) => {
          map.set(`${f.name.toLowerCase()}__${f.createdBy.toLowerCase()}`, f);
        });
      }
    }
  } catch {}

  // 2. Fetch from Firestore
  try {
    const isSuperAdmin = targetUser?.role === 'super_admin' || targetUser?.username?.toLowerCase() === 'shrinath';
    const isDno = targetUser?.role === 'dno' || targetUser?.username?.toLowerCase() === 'dno';

    let q;
    if (isSuperAdmin || isDno) {
      q = query(collection(db, 'vault_folders'), limit(100));
    } else if (targetUser?.username) {
      q = query(collection(db, 'vault_folders'), where('createdBy', '==', targetUser.username), limit(50));
    } else {
      q = query(collection(db, 'vault_folders'), limit(30));
    }

    const snap = await getDocs(q);
    snap.forEach((d) => {
      const f = d.data() as CustomVaultFolder;
      if (f && f.name && f.createdBy) {
        map.set(`${f.name.toLowerCase()}__${f.createdBy.toLowerCase()}`, f);
      }
    });
  } catch {}

  const merged = Array.from(map.values());
  saveAllCustomVaultFolders(merged);
  return filterVaultFoldersForUser(merged, targetUser);
}

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
 * - Super admin sees all files across all users and districts
 * - Respective DNO can see their counselors and supporting staff data
 * - Counselor sees their own files or common intake files
 */
export function filterVaultFilesForUser(
  files: QrUploadedFile[],
  user: UserProfile | null | undefined
): QrUploadedFile[] {
  if (!user) return files;

  const isSuperAdmin = user.role === 'super_admin' || user.username?.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    return files;
  }

  const isDno = user.role === 'dno' || user.username.toLowerCase() === 'dno';
  const userDist = (user.district || '').trim().toLowerCase();
  const currentUsername = (user.username || '').trim().toLowerCase();
  const currentUserId = (user.id || '').trim().toLowerCase();

  if (isDno) {
    // Root master DNO ('dno' without district) can see all files across Maharashtra
    if (user.username.toLowerCase() === 'dno' && !user.district) {
      return files;
    }
    // Respective district DNO can see files belonging to their assigned district
    return files.filter((f) => {
      if (!f.district) return true; // Legacy/unassigned files visible to DNO
      const fileDist = (f.district || '').trim().toLowerCase();
      return !userDist || fileDist === userDist;
    });
  }

  // Any counselor / staff / operator / portal user:
  return files.filter((f) => {
    const uploader = (f.uploadedBy || '').trim().toLowerCase();
    const fileDist = (f.district || '').trim().toLowerCase();
    // Allow intake, anonymous, mobile, or default uploads
    if (!uploader || uploader === 'anonymous' || uploader === 'counsellor' || uploader === 'counselor' || uploader === 'mobile' || uploader === 'staff') {
      return true;
    }
    // Match current user
    if (uploader === currentUsername || uploader === currentUserId) {
      return true;
    }
    // Match district
    if (userDist && fileDist && userDist === fileDist) {
      return true;
    }
    return false;
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
      folder?: string;
      uploadedBy?: string;
      uploaderName?: string;
      uploaderRole?: string;
      district?: string;
    }
  ): Promise<QrUploadedFile> {
    const cleanSessionId = String(sessionId || '').trim().toUpperCase();
    const user = getCurrentUser();
    const uploadedBy = fileData.uploadedBy || user?.username || 'counsellor';
    const uploaderName = fileData.uploaderName || user?.fullName || user?.username || 'Counselor';
    const uploaderRole = fileData.uploaderRole || user?.role || 'counsellor';
    const district = fileData.district || user?.district || 'Washim';

    // Compress image if needed to ensure rapid upload under 750KB
    let finalDataUrl = fileData.dataUrl;
    let finalSize = fileData.size;
    if (fileData.dataUrl && fileData.dataUrl.startsWith('data:image/')) {
      try {
        const compressed = await compressImageForUpload(fileData.dataUrl);
        finalDataUrl = compressed.dataUrl;
        finalSize = compressed.size;
      } catch (err) {
        console.warn('Image compression fallback:', err);
      }
    }

    const newFile: QrUploadedFile = {
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      sessionId: cleanSessionId,
      name: fileData.name,
      type: fileData.type,
      size: finalSize,
      dataUrl: finalDataUrl,
      uploadedAt: new Date().toISOString(),
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: fileData.category || this.detectCategory(fileData.name),
      folder: fileData.folder ? String(fileData.folder).trim() : undefined,
      uploadedBy,
      uploaderName,
      uploaderRole,
      district,
    };

    // 1. Immediately cache locally for zero-latency UI responsiveness
    this.saveToLocalStorage(cleanSessionId, newFile);
    this.saveToSoftwareVault(newFile);
    this.notifyBroadcast(cleanSessionId, newFile);

    // 2. Post to server API for cross-device synchronization (Mobile Phone -> Desktop Software)
    try {
      const res = await fetch('/api/qr-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: cleanSessionId,
          name: newFile.name,
          type: newFile.type,
          size: newFile.size,
          dataUrl: newFile.dataUrl,
          category: newFile.category,
          folder: newFile.folder,
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
          this.saveToLocalStorage(cleanSessionId, serverFile);
          this.saveToSoftwareVault(serverFile);
          this.notifyBroadcast(cleanSessionId, serverFile);
        }
      }
    } catch (e) {
      console.warn('Server upload endpoint unreachable, relying on local/firestore sync:', e);
    }

    // 3. Post to Firebase Firestore Database safely (stay well within 1MB document limit)
    try {
      const firestoreDoc = { ...newFile };
      if (finalDataUrl && finalDataUrl.length > 750 * 1024) {
        // Keep document metadata in Firestore without the huge base64 payload to prevent 1MB limit error
        firestoreDoc.dataUrl = '';
      }
      const docRef = doc(db, 'qr_uploads', newFile.id);
      await setDoc(docRef, sanitizeForFirestore(firestoreDoc));
      console.log(`[Firebase Firestore] Saved document ${newFile.id} to Firestore (User: ${uploadedBy}, District: ${district})`);
    } catch (firestoreErr) {
      console.warn('[Firebase Firestore] Warning saving to Firestore:', firestoreErr);
    }

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
    const cleanSessionId = String(sessionId || '').trim().toUpperCase();

    // 1. Try Server API first for fastest real-time sync across devices
    try {
      const res = await fetch(`/api/qr-files?sessionId=${encodeURIComponent(cleanSessionId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files) && json.files.length > 0) {
          const serverFiles: QrUploadedFile[] = json.files.map((f: QrUploadedFile) => ({
            ...f,
            isDownloadedToSoftware: true,
          }));
          serverFiles.forEach((f) => {
            this.saveToLocalStorage(cleanSessionId, f);
            this.saveToSoftwareVault(f);
          });
          return serverFiles;
        }
      }
    } catch {
      // Server API unreachable
    }

    // 2. Try Firebase Firestore
    try {
      const q = query(
        collection(db, 'qr_uploads'),
        where('sessionId', 'in', [cleanSessionId, String(sessionId).trim()])
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreFiles: QrUploadedFile[] = [];
        snapshot.forEach((docSnap) => {
          firestoreFiles.push(docSnap.data() as QrUploadedFile);
        });
        firestoreFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        firestoreFiles.forEach((f) => {
          this.saveToLocalStorage(cleanSessionId, f);
          this.saveToSoftwareVault(f);
        });
        return firestoreFiles;
      }
    } catch (err) {
      console.warn('[Firebase] Query error:', err);
    }

    // Return from localStorage if server & firestore are unreachable
    return this.getFromLocalStorage(cleanSessionId);
  },

  // Get all files stored inside the software vault across all sessions (Strictly scoped by user and district)
  async getAllVaultFilesAsync(forUser?: UserProfile | null, sessionId?: string): Promise<QrUploadedFile[]> {
    const targetUser = forUser !== undefined ? forUser : getCurrentUser();

    // 1. Query Server API with user identity and session ID
    try {
      const params = new URLSearchParams();
      if (targetUser) {
        params.set('username', targetUser.username);
        params.set('role', targetUser.role);
        if (targetUser.district) params.set('district', targetUser.district);
      }
      if (sessionId) {
        params.set('sessionId', sessionId);
      }
      const res = await fetch(`/api/qr-vault?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files) && json.files.length > 0) {
          json.files.forEach((f: QrUploadedFile) => this.saveToSoftwareVault(f));
          return filterVaultFilesForUser(json.files, targetUser);
        }
      }
    } catch {
      // ignore
    }

    // 2. Query Firestore with short timeout to prevent 10s offline stall
    try {
      const isSuperAdmin = targetUser?.role === 'super_admin' || targetUser?.username?.toLowerCase() === 'shrinath';
      const isDno = targetUser?.role === 'dno' || targetUser?.username?.toLowerCase() === 'dno';
      let q;
      if (isSuperAdmin) {
        q = query(collection(db, 'qr_uploads'), limit(150));
      } else if (isDno) {
        q = query(collection(db, 'qr_uploads'), limit(120));
      } else {
        q = query(collection(db, 'qr_uploads'), limit(100));
      }

      const snapPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      const snapshot = await Promise.race([snapPromise, timeoutPromise]);

      if (!snapshot.empty) {
        const list: QrUploadedFile[] = [];
        snapshot.forEach((d) => list.push(d.data() as QrUploadedFile));
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        list.forEach((f) => this.saveToSoftwareVault(f));
        return filterVaultFilesForUser(list, targetUser);
      }
    } catch (e) {
      // ignore timeout or offline
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

  // Update an existing file in session, vault, server, and Firestore (e.g. after Smart Cropping or moving to folder)
  async updateVaultFile(
    fileId: string,
    updates: { dataUrl?: string; size?: number; name?: string; sessionId?: string; folder?: string | null }
  ): Promise<QrUploadedFile | null> {
    let updated: QrUploadedFile | null = null;

    // 1. Update in Firestore
    try {
      const docRef = doc(db, 'qr_uploads', fileId);
      const updateData: any = {};
      if (updates.dataUrl) updateData.dataUrl = updates.dataUrl;
      if (updates.size !== undefined) updateData.size = updates.size;
      if (updates.name) updateData.name = updates.name;
      if (updates.folder !== undefined) updateData.folder = updates.folder || null;
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
          folder: updates.folder !== undefined ? updates.folder : undefined,
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
          dataUrl: updates.dataUrl || inMemoryVaultFiles[idx].dataUrl,
          size: updates.size !== undefined ? updates.size : inMemoryVaultFiles[idx].size,
          name: updates.name || inMemoryVaultFiles[idx].name,
          folder: updates.folder !== undefined ? (updates.folder || undefined) : inMemoryVaultFiles[idx].folder,
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
              dataUrl: updates.dataUrl || list[sIdx].dataUrl,
              size: updates.size !== undefined ? updates.size : list[sIdx].size,
              name: updates.name || list[sIdx].name,
              folder: updates.folder !== undefined ? (updates.folder || undefined) : list[sIdx].folder,
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


