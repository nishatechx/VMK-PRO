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

const TICKETS_STORAGE_KEY = 'vmk_tickets_records_v1';

// In-memory subscribers
const ticketSubscribers: ((tickets: TicketRecord[]) => void)[] = [];
let isTicketsFirestoreSynced = false;

/**
 * Get all tickets from local storage cache
 */
export function getTicketRecords(): TicketRecord[] {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
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

          localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(list));
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
 */
export async function saveTicketRecord(record: TicketRecord): Promise<{ success: boolean; message: string }> {
  try {
    const tickets = getTicketRecords();
    const idx = tickets.findIndex((t) => t.id === record.id || t.ticketNo === record.ticketNo);

    if (idx >= 0) {
      tickets[idx] = { ...tickets[idx], ...record, updatedAt: new Date().toISOString() };
    } else {
      tickets.unshift(record);
    }

    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    notifyTicketSubscribers(tickets);

    // Save directly to Firestore Cloud Database
    const docId = record.id || record.ticketNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    setDoc(doc(db, 'tickets', docId), sanitizeForFirestore({ ...record, id: docId }), {
      merge: true,
    }).catch((e) => {
      console.warn('Firestore saveTicket sync error:', e?.message);
    });

    return { success: true, message: 'Ticket saved to database successfully.' };
  } catch (err) {
    console.error('Error saving ticket:', err);
    return { success: false, message: 'Failed to save ticket.' };
  }
}

/**
 * Delete ticket from LocalStorage & Firestore
 */
export async function deleteTicketRecord(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const tickets = getTicketRecords().filter((t) => t.id !== id && t.ticketNo !== id);
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    notifyTicketSubscribers(tickets);

    // Remove from Firestore
    deleteDoc(doc(db, 'tickets', id)).catch((e) => {
      console.warn('Firestore deleteTicket sync error:', e?.message);
    });

    return { success: true, message: 'Ticket deleted successfully.' };
  } catch (err) {
    console.error('Error deleting ticket:', err);
    return { success: false, message: 'Failed to delete ticket.' };
  }
}

/**
 * Update the status and resolution notes of a ticket
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
      tickets[idx] = {
        ...tickets[idx],
        status,
        resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : tickets[idx].resolutionNotes,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
      notifyTicketSubscribers(tickets);

      const docId = tickets[idx].id;
      setDoc(
        doc(db, 'tickets', docId),
        sanitizeForFirestore({
          status,
          resolutionNotes: tickets[idx].resolutionNotes,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      ).catch((e) => {
        console.warn('Firestore updateTicketStatus sync error:', e?.message);
      });

      return { success: true, message: `Ticket status updated to ${status}.` };
    }

    return { success: false, message: 'Ticket not found.' };
  } catch (err) {
    console.error('Error updating ticket status:', err);
    return { success: false, message: 'Failed to update ticket status.' };
  }
}
