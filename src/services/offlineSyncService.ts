/**
 * Offline Sync Queue & Storage Manager
 * Uses IndexedDB to store queued ticket creations, ticket updates,
 * and document uploads when network connectivity is lost or unstable.
 * Automatically synchronizes with Firebase & backend APIs upon network reconnection.
 */

export interface QueuedTicketAction {
  id: string;
  type: 'CREATE_OR_UPDATE_TICKET' | 'UPDATE_TICKET_STATUS' | 'DELETE_TICKET';
  data: any;
  queuedAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface QueuedDocumentUpload {
  id: string;
  sessionId: string;
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
  };
  queuedAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

const DB_NAME = 'vmk_sync_queue_v1';
const TICKETS_STORE = 'queued_tickets';
const UPLOADS_STORE = 'queued_uploads';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getSyncDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(TICKETS_STORE)) {
            db.createObjectStore(TICKETS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(UPLOADS_STORE)) {
            db.createObjectStore(UPLOADS_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (err) => {
          console.warn('[SyncQueue DB] Error opening database:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[SyncQueue DB] Exception opening database:', err);
        resolve(null);
      }
    });
  }

  return dbPromise;
}

// ================= Ticket Queue Operations =================

export async function queueTicketAction(
  type: QueuedTicketAction['type'],
  data: any
): Promise<QueuedTicketAction> {
  const item: QueuedTicketAction = {
    id: `sync_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    data,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  try {
    const db = await getSyncDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TICKETS_STORE, 'readwrite');
        const store = tx.objectStore(TICKETS_STORE);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('[SyncQueue] Failed to persist ticket in IndexedDB queue:', err);
  }

  notifySyncSubscribers();
  return item;
}

export async function getQueuedTicketActions(): Promise<QueuedTicketAction[]> {
  try {
    const db = await getSyncDb();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(TICKETS_STORE, 'readonly');
      const store = tx.objectStore(TICKETS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeQueuedTicketAction(id: string): Promise<void> {
  try {
    const db = await getSyncDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(TICKETS_STORE, 'readwrite');
      const store = tx.objectStore(TICKETS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
  notifySyncSubscribers();
}

// ================= Document Upload Queue Operations =================

export async function queueDocumentUpload(
  sessionId: string,
  fileData: QueuedDocumentUpload['fileData']
): Promise<QueuedDocumentUpload> {
  const item: QueuedDocumentUpload = {
    id: `sync_doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId,
    fileData,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  try {
    const db = await getSyncDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(UPLOADS_STORE, 'readwrite');
        const store = tx.objectStore(UPLOADS_STORE);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('[SyncQueue] Failed to persist doc upload in IndexedDB queue:', err);
  }

  notifySyncSubscribers();
  return item;
}

export async function getQueuedDocumentUploads(): Promise<QueuedDocumentUpload[]> {
  try {
    const db = await getSyncDb();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(UPLOADS_STORE, 'readonly');
      const store = tx.objectStore(UPLOADS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeQueuedDocumentUpload(id: string): Promise<void> {
  try {
    const db = await getSyncDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(UPLOADS_STORE, 'readwrite');
      const store = tx.objectStore(UPLOADS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
  notifySyncSubscribers();
}

// ================= Subscribers & Count =================

export interface SyncQueueStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queuedTicketsCount: number;
  queuedUploadsCount: number;
  totalPendingCount: number;
  lastSyncedAt: string | null;
}

type SyncSubscriber = (status: SyncQueueStatus) => void;
const syncSubscribers: SyncSubscriber[] = [];
let currentSyncingState = false;
let lastSyncedTime: string | null = null;

export function subscribeToSyncStatus(cb: SyncSubscriber): () => void {
  syncSubscribers.push(cb);
  getSyncQueueStatus().then(cb);
  return () => {
    const idx = syncSubscribers.indexOf(cb);
    if (idx >= 0) syncSubscribers.splice(idx, 1);
  };
}

export async function getSyncQueueStatus(): Promise<SyncQueueStatus> {
  const [tickets, uploads] = await Promise.all([
    getQueuedTicketActions(),
    getQueuedDocumentUploads(),
  ]);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const total = tickets.length + uploads.length;

  return {
    isOnline,
    isSyncing: currentSyncingState,
    queuedTicketsCount: tickets.length,
    queuedUploadsCount: uploads.length,
    totalPendingCount: total,
    lastSyncedAt: lastSyncedTime,
  };
}

export function notifySyncSubscribers() {
  getSyncQueueStatus().then((status) => {
    syncSubscribers.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.warn('Sync subscriber notification error:', e);
      }
    });
  });
}

export function setSyncingFlag(syncing: boolean) {
  currentSyncingState = syncing;
  if (!syncing) {
    lastSyncedTime = new Date().toISOString();
  }
  notifySyncSubscribers();
}
