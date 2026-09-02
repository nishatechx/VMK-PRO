import { QrUploadedFile, QR_BROADCAST_CHANNEL } from '../types/qrUpload';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from './authService';
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

// BroadcastChannel for cross-tab realtime sync (on same browser)
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(QR_BROADCAST_CHANNEL);
  }
} catch {
  // BroadcastChannel unavailable
}

export const qrUploadService = {
  // Upload a file to session - transmits to backend server & Firebase Firestore
  async uploadFile(
    sessionId: string,
    fileData: { name: string; type: string; size: number; dataUrl: string; category?: string }
  ): Promise<QrUploadedFile> {
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
    };

    // 1. Post to Firebase Firestore Database
    try {
      const docRef = doc(db, 'qr_uploads', newFile.id);
      await setDoc(docRef, sanitizeForFirestore(newFile));
      console.log(`[Firebase Firestore] Saved document ${newFile.id} to Firestore`);
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

  // Get all files stored inside the software vault across all sessions
  async getAllVaultFilesAsync(): Promise<QrUploadedFile[]> {
    try {
      const q = query(collection(db, 'qr_uploads'), limit(50));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: QrUploadedFile[] = [];
        snapshot.forEach((d) => list.push(d.data() as QrUploadedFile));
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        list.forEach((f) => this.saveToSoftwareVault(f));
        return list;
      }
    } catch (e) {
      // ignore
    }

    try {
      const res = await fetch('/api/qr-vault');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files) && json.files.length > 0) {
          json.files.forEach((f: QrUploadedFile) => this.saveToSoftwareVault(f));
          return json.files;
        }
      }
    } catch {
      // ignore
    }
    return this.getAllVaultFiles();
  },

  // Synchronous read from local vault cache
  getAllVaultFiles(): QrUploadedFile[] {
    try {
      const saved = localStorage.getItem(VAULT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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
      const saved = localStorage.getItem(key);
      if (saved) {
        const list: QrUploadedFile[] = JSON.parse(saved);
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) {
          list[idx].verifiedStamp = !list[idx].verifiedStamp;
          newStatus = !!list[idx].verifiedStamp;
          localStorage.setItem(key, JSON.stringify(list));
        }
      }

      // Vault store
      const vaultSaved = localStorage.getItem(VAULT_STORAGE_KEY);
      if (vaultSaved) {
        const list: QrUploadedFile[] = JSON.parse(vaultSaved);
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) {
          list[idx].verifiedStamp = newStatus;
          localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Error toggling stamp:', e);
    }
    return newStatus;
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
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const list: QrUploadedFile[] = JSON.parse(saved);
        const filtered = list.filter((f) => f.id !== fileId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }

      const vaultSaved = localStorage.getItem(VAULT_STORAGE_KEY);
      if (vaultSaved) {
        const list: QrUploadedFile[] = JSON.parse(vaultSaved);
        const filtered = list.filter((f) => f.id !== fileId);
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(filtered));
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
      const saved = localStorage.getItem(key);
      const list: QrUploadedFile[] = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex((f) => f.id === file.id);
      if (existingIdx >= 0) {
        list[existingIdx] = file;
      } else {
        list.unshift(file);
      }
      if (list.length > 25) list.pop();
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('localStorage save warning:', e);
    }
  },

  saveToSoftwareVault(file: QrUploadedFile) {
    try {
      const saved = localStorage.getItem(VAULT_STORAGE_KEY);
      const list: QrUploadedFile[] = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex((f) => f.id === file.id);
      if (existingIdx >= 0) {
        list[existingIdx] = file;
      } else {
        list.unshift(file);
      }
      if (list.length > 50) list.pop();
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Vault save warning:', e);
    }
  },

  getFromLocalStorage(sessionId: string): QrUploadedFile[] {
    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const saved = localStorage.getItem(key);
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


