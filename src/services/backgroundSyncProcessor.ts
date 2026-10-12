import {
  getQueuedTicketActions,
  removeQueuedTicketAction,
  getQueuedDocumentUploads,
  removeQueuedDocumentUpload,
  setSyncingFlag,
  notifySyncSubscribers,
} from './offlineSyncService';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from './authService';

let isSyncRunning = false;
let syncIntervalId: any = null;

/**
 * Register Service Worker and initialize online auto-sync listeners
 */
export function registerServiceWorkerAndSync(): void {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[ServiceWorker] Registered with scope:', reg.scope);

          // Request background sync tag if supported by browser
          if ('sync' in reg) {
            try {
              (reg as any).sync.register('vmk-background-sync').catch(() => {});
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[ServiceWorker] Registration failed:', err);
        });
    });

    // Listen for messages from Service Worker (e.g. background sync events)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'TRIGGER_BACKGROUND_SYNC') {
        console.log('[ServiceWorker] Received background sync trigger');
        processOfflineSyncQueue();
      }
    });
  }

  // 2. Listen to browser Online / Offline network events
  window.addEventListener('online', () => {
    console.log('[Network] Back online! Automatically processing pending offline queue...');
    notifySyncSubscribers();
    // Immediate sync
    processOfflineSyncQueue();
    // Follow-up sync 3 seconds later to ensure network socket stability
    setTimeout(() => {
      processOfflineSyncQueue();
    }, 3000);
  });

  window.addEventListener('offline', () => {
    console.warn('[Network] Connection lost. Ticket creation and document uploads will be queued.');
    notifySyncSubscribers();
  });

  // 3. Periodic queue check (every 15 seconds) if online
  if (!syncIntervalId) {
    syncIntervalId = setInterval(() => {
      if (navigator.onLine) {
        processOfflineSyncQueue();
      }
    }, 15000);
  }

  // Run on initial startup after 2 seconds
  setTimeout(() => {
    if (navigator.onLine) {
      processOfflineSyncQueue();
    }
  }, 2000);
}

/**
 * Request background sync via Service Worker if supported
 */
export function requestBackgroundSync(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        if ('sync' in reg) {
          return (reg as any).sync.register('vmk-background-sync');
        }
      })
      .catch(() => {});
  }
}

/**
 * Process all queued tickets and document uploads
 */
export async function processOfflineSyncQueue(): Promise<{
  syncedTickets: number;
  syncedDocs: number;
  remainingTickets: number;
  remainingDocs: number;
}> {
  if (isSyncRunning || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { syncedTickets: 0, syncedDocs: 0, remainingTickets: 0, remainingDocs: 0 };
  }

  isSyncRunning = true;
  setSyncingFlag(true);

  let syncedTickets = 0;
  let syncedDocs = 0;

  try {
    // 1. Process Queued Tickets
    const queuedTickets = await getQueuedTicketActions();
    for (const item of queuedTickets) {
      try {
        let success = false;
        if (item.type === 'CREATE_OR_UPDATE_TICKET') {
          const record = item.data;
          const docId = record.id || record.ticketNo.replace(/[^a-zA-Z0-9_-]/g, '_');
          await setDoc(doc(db, 'tickets', docId), sanitizeForFirestore({ ...record, id: docId }), {
            merge: true,
          });
          success = true;
        } else if (item.type === 'UPDATE_TICKET_STATUS') {
          const { id, status, resolutionNotes, updatedAt } = item.data;
          await setDoc(
            doc(db, 'tickets', id),
            sanitizeForFirestore({
              status,
              resolutionNotes: resolutionNotes || '',
              updatedAt: updatedAt || new Date().toISOString(),
            }),
            { merge: true }
          );
          success = true;
        } else if (item.type === 'DELETE_TICKET') {
          const id = item.data?.id;
          if (id) {
            await deleteDoc(doc(db, 'tickets', id));
          }
          success = true;
        }

        if (success) {
          await removeQueuedTicketAction(item.id);
          syncedTickets++;
          console.log(`[Offline Sync] Synchronized ticket action: ${item.type} (${item.id})`);
        }
      } catch (err: any) {
        console.warn(`[Offline Sync] Ticket sync failed for ${item.id}, will retry:`, err?.message);
        // Stop batch if completely offline error
        if (!navigator.onLine) break;
      }
    }

    // 2. Process Queued Document Uploads
    const queuedUploads = await getQueuedDocumentUploads();
    for (const item of queuedUploads) {
      try {
        const { sessionId, fileData } = item;
        let finalDataUrl = fileData.dataUrl;

        // Sync to Server API
        try {
          await fetch('/api/qr-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              name: fileData.name,
              type: fileData.type,
              size: fileData.size,
              dataUrl: finalDataUrl,
              category: fileData.category,
              folder: fileData.folder,
              uploadedBy: fileData.uploadedBy,
              uploaderName: fileData.uploaderName,
              uploaderRole: fileData.uploaderRole,
              district: fileData.district,
            }),
          });
        } catch (serverErr) {
          console.warn('[Offline Sync] Server API upload notice:', serverErr);
        }

        // Sync to Firebase Firestore
        const docId = `doc_${item.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const firestoreDoc = {
          id: docId,
          sessionId,
          ...fileData,
          dataUrl: finalDataUrl && finalDataUrl.length > 750 * 1024 ? '' : finalDataUrl,
          uploadedAt: item.queuedAt,
          isDownloadedToSoftware: true,
          verifiedStamp: false,
        };

        await setDoc(doc(db, 'qr_uploads', docId), sanitizeForFirestore(firestoreDoc), {
          merge: true,
        });

        await removeQueuedDocumentUpload(item.id);
        syncedDocs++;
        console.log(`[Offline Sync] Synchronized document upload: ${fileData.name} (${item.id})`);
      } catch (docErr: any) {
        console.warn(`[Offline Sync] Document sync failed for ${item.id}, will retry:`, docErr?.message);
        if (!navigator.onLine) break;
      }
    }
  } catch (err) {
    console.error('[Offline Sync] General sync failure:', err);
  } finally {
    isSyncRunning = false;
    setSyncingFlag(false);
  }

  const remainingTickets = (await getQueuedTicketActions()).length;
  const remainingDocs = (await getQueuedDocumentUploads()).length;

  return {
    syncedTickets,
    syncedDocs,
    remainingTickets,
    remainingDocs,
  };
}
