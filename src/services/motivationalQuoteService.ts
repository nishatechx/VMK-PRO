import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { MotivationalQuote, DailyQuoteRecord, QuotesCollection } from '../types/motivationalQuote';
import rawQuotesData from '../data/motivationalQuotes.json';

const quotesCollection = rawQuotesData as unknown as QuotesCollection;
const ALL_QUOTES: MotivationalQuote[] = quotesCollection.quotes || [];

// Safe memory caches & concurrency guards
const inFlightRequests = new Set<string>();

/**
 * Returns all 365 motivational quotes locally stored in the app.
 */
export function getAllMotivationalQuotes(): MotivationalQuote[] {
  return ALL_QUOTES;
}

/**
 * Validates that quotes are properly loaded and returns count
 */
export function validateQuotesCollection(): { valid: boolean; count: number; error?: string } {
  if (!Array.isArray(ALL_QUOTES) || ALL_QUOTES.length === 0) {
    return { valid: false, count: 0, error: 'No quotes loaded' };
  }
  return { valid: true, count: ALL_QUOTES.length };
}

/**
 * Computes calendar date strictly in the Asia/Kolkata timezone (YYYY-MM-DD).
 */
export function getKolkataDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    // Fallback if environment doesn't support specific timezone
    const offsetMs = 5.5 * 60 * 60 * 1000;
    const kolkataTime = new Date(date.getTime() + offsetMs);
    return kolkataTime.toISOString().slice(0, 10);
  }
}

/**
 * Returns a stable unique identifier for the user (username or ID).
 */
export function getUserStableKey(user: UserProfile | null | undefined): string {
  if (!user) return 'anonymous';
  const raw = (user.username || user.id || (user as any).uid || '').toLowerCase().trim();
  return raw.replace(/[^a-z0-9_-]/g, '_') || 'anonymous';
}

/**
 * Storage key builders
 */
function getLocalRecordKey(userKey: string, date: string): string {
  return `vmk_daily_quote_${userKey}_${date}`;
}

function getLastQuoteIdKey(userKey: string): string {
  return `vmk_last_quote_id_${userKey}`;
}

/**
 * Read the previously displayed quote ID for the user to avoid consecutive repetition.
 */
export function getLastQuoteIdForUser(userKey: string): number | null {
  try {
    const val = localStorage.getItem(getLastQuoteIdKey(userKey));
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return null;
}

/**
 * Check if the user has already received/seen a motivational quote for the given date.
 * Inspects local storage (immediate) and queries Firestore (cloud persistence across devices).
 */
export async function hasUserSeenDailyQuoteToday(
  user: UserProfile,
  dateString: string = getKolkataDateString()
): Promise<{ seen: boolean; record?: DailyQuoteRecord }> {
  const userKey = getUserStableKey(user);
  const localKey = getLocalRecordKey(userKey, dateString);

  // 1. Instant check in localStorage
  try {
    const localVal = localStorage.getItem(localKey);
    if (localVal) {
      const parsed = JSON.parse(localVal) as DailyQuoteRecord;
      if (parsed && parsed.quoteId) {
        return { seen: true, record: parsed };
      }
    }
  } catch {}

  // 2. Cloud Firestore check (enables cross-device synchronization)
  try {
    const docId = `${userKey}_${dateString}`;
    const docRef = doc(db, 'user_daily_quotes', docId);

    // Give Firestore request a 2.5 second timeout to avoid blocking offline / slow networks
    const firestorePromise = getDoc(docRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    const snap = await Promise.race([firestorePromise, timeoutPromise]);
    if (snap && 'exists' in snap && snap.exists()) {
      const data = snap.data() as DailyQuoteRecord;
      if (data && data.quoteId) {
        // Cache to localStorage for fast subsequent checks
        try {
          localStorage.setItem(localKey, JSON.stringify(data));
        } catch {}
        return { seen: true, record: data };
      }
    }
  } catch (err) {
    console.warn('[DailyQuoteService] Cloud check note:', err);
  }

  return { seen: false };
}

/**
 * Select a random quote from the 365 collection, excluding the user's immediately previous quote.
 */
export function selectDailyQuoteForUser(userKey: string): MotivationalQuote {
  if (ALL_QUOTES.length === 0) {
    return {
      id: 1,
      category: 'Discipline',
      quote: 'Discipline is the promise you keep when motivation goes quiet.',
      supportingLine: 'Keep your standards steady, even on ordinary days.',
    };
  }

  const lastQuoteId = getLastQuoteIdForUser(userKey);
  const candidatePool = ALL_QUOTES.filter((q) => q.id !== lastQuoteId);
  const pool = candidatePool.length > 0 ? candidatePool : ALL_QUOTES;

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Records the displayed quote both in local storage and in Firestore.
 * Must be executed BEFORE opening the modal to ensure idempotency.
 */
export async function recordDailyQuoteDisplay(
  user: UserProfile,
  quote: MotivationalQuote,
  dateString: string = getKolkataDateString()
): Promise<DailyQuoteRecord> {
  const userKey = getUserStableKey(user);
  const localKey = getLocalRecordKey(userKey, dateString);

  const record: DailyQuoteRecord = {
    userId: user.id || userKey,
    userKey,
    date: dateString,
    quoteId: quote.id,
    quote,
    displayedAt: new Date().toISOString(),
    deviceSessionId: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  };

  // 1. Write immediately to localStorage (synchronous barrier for same browser / multiple tabs)
  try {
    localStorage.setItem(localKey, JSON.stringify(record));
    localStorage.setItem(getLastQuoteIdKey(userKey), String(quote.id));
  } catch (e) {
    console.warn('[DailyQuoteService] localStorage write error:', e);
  }

  // 2. Persist to Firestore asynchronously for multi-device enforcement
  try {
    const docId = `${userKey}_${dateString}`;
    const docRef = doc(db, 'user_daily_quotes', docId);
    setDoc(docRef, record, { merge: true }).catch((err) => {
      console.warn('[DailyQuoteService] Firestore persistence warning:', err);
    });
  } catch {}

  return record;
}

/**
 * Main coordinator function:
 * Checks whether user has already seen a quote today.
 * If not, selects a quote, records it immediately, and returns the quote to display.
 * If already seen, returns null.
 */
export async function checkAndPrepareDailyQuote(
  user: UserProfile
): Promise<MotivationalQuote | null> {
  if (!user) return null;

  const userKey = getUserStableKey(user);
  const todayDate = getKolkataDateString();
  const lockKey = `${userKey}_${todayDate}`;

  // Check in-flight lock to prevent simultaneous duplicate requests from concurrent tabs or re-renders
  if (inFlightRequests.has(lockKey)) {
    return null;
  }

  inFlightRequests.add(lockKey);

  try {
    // 1. Verify if user already has a record for today
    const { seen } = await hasUserSeenDailyQuoteToday(user, todayDate);
    if (seen) {
      return null;
    }

    // 2. Select a fresh quote
    const selectedQuote = selectDailyQuoteForUser(userKey);

    // 3. Atomically record before presenting
    await recordDailyQuoteDisplay(user, selectedQuote, todayDate);

    return selectedQuote;
  } catch (error) {
    console.error('[DailyQuoteService] Error preparing daily quote:', error);
    return null;
  } finally {
    inFlightRequests.delete(lockKey);
  }
}
