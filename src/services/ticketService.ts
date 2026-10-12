import { TicketRecord, TicketStatus } from '../types/auth';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from './authService';
import { safeStorage } from '../utils/safeStorage';
import { queueTicketAction } from './offlineSyncService';
import { requestBackgroundSync } from './backgroundSyncProcessor';

const TICKETS_STORAGE_KEY = 'vmk_tickets_records_v1';

// In-memory subscribers
const ticketSubscribers: ((tickets: TicketRecord[]) => void)[] = [];
let isTicketsFirestoreSynced = false;

/**
 * Get all tickets from local storage cache
 */
export function getTicketRecords(): TicketRecord[] {
  try {
    const raw = safeStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading tickets from local storage:', err);
    return [];
  }
}

/**
 * Subscribe to tickets changes (instant local + real-time Firestore sync)
 */
export function subscribeToTickets(callback: (tickets: TicketRecord[]) => void): () => void {
  ticketSubscribers.push(callback);
  callback(getTicketRecords());
  return () => {
    const idx = ticketSubscribers.indexOf(callback);
    if (idx >= 0) ticketSubscribers.splice(idx, 1);
  };
}

function notifyTicketSubscribers(tickets: TicketRecord[]) {
  ticketSubscribers.forEach((cb) => {
    try {
      cb(tickets);
    } catch (e) {
      console.error('Error in ticket subscriber callback:', e);
    }
  });
}

/**
 * Initialize real-time Firestore listener for tickets collection
 */
export function initTicketsFirestoreSync() {
  if (isTicketsFirestoreSynced || typeof window === 'undefined') return;
  isTicketsFirestoreSynced = true;

  try {
    onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: TicketRecord[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as TicketRecord;
            if (data && data.ticketNo) {
              list.push({ ...data, id: d.id });
            }
          });

          // Sort by creation date descending (newest first)
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          safeStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(list));
          notifyTicketSubscribers(list);
        }
      },
      (err) => {
        console.warn('Firestore tickets sync notice:', err?.message);
      }
    );
  } catch (err) {
    console.error('Failed to init Firestore tickets listener:', err);
  }
}

// Automatically start Firestore sync
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initTicketsFirestoreSync();
  }, 120);
}

/**
 * Save / Create a new ticket or update existing ticket in LocalStorage & Firestore
 * Automatically queues to IndexedDB and triggers background sync if offline.
 */
export async function saveTicketRecord(record: TicketRecord): Promise<{ success: boolean; message: string; queuedOffline?: boolean }> {
  try {
    const tickets = getTicketRecords();
    const idx = tickets.findIndex((t) => t.id === record.id || t.ticketNo === record.ticketNo);

    if (idx >= 0) {
      tickets[idx] = { ...tickets[idx], ...record, updatedAt: new Date().toISOString() };
    } else {
      tickets.unshift(record);
    }

    safeStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    notifyTicketSubscribers(tickets);

    const docId = record.id || record.ticketNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Offline: Add to sync queue for auto-sync when online
      await queueTicketAction('CREATE_OR_UPDATE_TICKET', { ...record, id: docId });
      requestBackgroundSync();
      return {
        success: true,
        message: 'Saved locally in Offline Queue. Will auto-sync when network reconnects.',
        queuedOffline: true,
      };
    }

    // Save directly to Firestore Cloud Database
    setDoc(doc(db, 'tickets', docId), sanitizeForFirestore({ ...record, id: docId }), {
      merge: true,
    }).catch(async (e) => {
      console.warn('Firestore saveTicket sync error, queuing action:', e?.message);
      await queueTicketAction('CREATE_OR_UPDATE_TICKET', { ...record, id: docId });
      requestBackgroundSync();
    });

    return { success: true, message: 'Ticket saved to database successfully.' };
  } catch (err) {
    console.error('Error saving ticket:', err);
    return { success: false, message: 'Failed to save ticket.' };
  }
}

/**
 * Delete ticket from LocalStorage & Firestore (Queued if offline)
 */
export async function deleteTicketRecord(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const tickets = getTicketRecords().filter((t) => t.id !== id && t.ticketNo !== id);
    safeStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    notifyTicketSubscribers(tickets);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await queueTicketAction('DELETE_TICKET', { id });
      requestBackgroundSync();
      return { success: true, message: 'Ticket deleted locally. Sync queued for online.' };
    }

    // Remove from Firestore
    deleteDoc(doc(db, 'tickets', id)).catch(async (e) => {
      console.warn('Firestore deleteTicket sync error, queuing:', e?.message);
      await queueTicketAction('DELETE_TICKET', { id });
      requestBackgroundSync();
    });

    return { success: true, message: 'Ticket deleted successfully.' };
  } catch (err) {
    console.error('Error deleting ticket:', err);
    return { success: false, message: 'Failed to delete ticket.' };
  }
}

/**
 * Update the status and resolution notes of a ticket (Queued if offline)
 */
export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  resolutionNotes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const tickets = getTicketRecords();
    const idx = tickets.findIndex((t) => t.id === id || t.ticketNo === id);

    if (idx >= 0) {
      const updatedAt = new Date().toISOString();
      tickets[idx] = {
        ...tickets[idx],
        status,
        resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : tickets[idx].resolutionNotes,
        updatedAt,
      };

      safeStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
      notifyTicketSubscribers(tickets);

      const docId = tickets[idx].id;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await queueTicketAction('UPDATE_TICKET_STATUS', {
          id: docId,
          status,
          resolutionNotes: tickets[idx].resolutionNotes,
          updatedAt,
        });
        requestBackgroundSync();
        return { success: true, message: `Status updated locally to "${status}". Auto-sync queued.` };
      }

      setDoc(
        doc(db, 'tickets', docId),
        sanitizeForFirestore({
          status,
          resolutionNotes: tickets[idx].resolutionNotes,
          updatedAt,
        }),
        { merge: true }
      ).catch(async (e) => {
        console.warn('Firestore updateTicketStatus sync error, queuing:', e?.message);
        await queueTicketAction('UPDATE_TICKET_STATUS', {
          id: docId,
          status,
          resolutionNotes: tickets[idx].resolutionNotes,
          updatedAt,
        });
        requestBackgroundSync();
      });

      return { success: true, message: `Ticket status updated to ${status}.` };
    }

    return { success: false, message: 'Ticket not found.' };
  } catch (err) {
    console.error('Error updating ticket status:', err);
    return { success: false, message: 'Failed to update ticket status.' };
  }
}
