import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { VisitorRecord } from '../types/auth';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Workspace Scopes for Sheets and Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache tokens & sync configs
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const SHEETS_CONFIG_KEY = 'vmk_google_sheets_config_v1';
const MANUAL_ACCESS_TOKEN_KEY = 'vmk_google_access_token_v1';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  sheetName: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  userEmail?: string;
  userName?: string;
}

export const getSavedSheetsConfig = (): GoogleSheetsConfig | null => {
  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveSheetsConfig = (config: GoogleSheetsConfig | null): void => {
  if (config) {
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(SHEETS_CONFIG_KEY);
  }
};

// Auth state observer
export const initGoogleAuth = (
  onAuthSuccess?: (user: User | { email: string; displayName: string }, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for cached manual token first
  try {
    const savedToken = sessionStorage.getItem(MANUAL_ACCESS_TOKEN_KEY);
    if (savedToken) {
      cachedAccessToken = savedToken;
      const savedConfig = getSavedSheetsConfig();
      if (onAuthSuccess) {
        onAuthSuccess(
          {
            email: savedConfig?.userEmail || 'Google User',
            displayName: savedConfig?.userName || 'Authorized Account',
          },
          savedToken
        );
      }
    }
  } catch {
    // Ignore storage read error
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!cachedAccessToken) {
      if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = sessionStorage.getItem(MANUAL_ACCESS_TOKEN_KEY);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {
    // Ignore
  }
  return null;
};

export const setManualAccessToken = (token: string, email = 'Authorized Google User', name = 'Google Workspace Officer') => {
  cachedAccessToken = token.trim();
  try {
    sessionStorage.setItem(MANUAL_ACCESS_TOKEN_KEY, token.trim());
  } catch {
    // Ignore
  }
};

export const getGoogleUser = (): User | null => {
  return auth.currentUser;
};

// Sign in with Google with Workspace scopes
export const signInWithGoogleSheets = async (): Promise<{ user: { email?: string | null; displayName?: string | null }; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem(MANUAL_ACCESS_TOKEN_KEY, credential.accessToken);
    } catch {
      // Ignore
    }

    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);

    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

    if (error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed')) {
      const formattedError = new Error(
        `Google Sign-In is not enabled in Firebase Console for project "${firebaseConfig.projectId}". Please go to Firebase Console > Authentication > Sign-in method, click "Google", and toggle "Enable".`
      );
      (formattedError as any).code = 'auth/operation-not-allowed';
      (formattedError as any).projectId = firebaseConfig.projectId;
      throw formattedError;
    }

    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      const formattedError = new Error(
        `The sign-in popup was blocked by your browser or iframe security settings. Please allow popups for this site or open the app in a new window tab.`
      );
      (formattedError as any).code = 'auth/popup-blocked';
      throw formattedError;
    }

    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const formattedError = new Error(
        `Firebase Auth Domain Authorization Required: The domain "${currentDomain}" is not authorized in your Firebase project (${firebaseConfig.projectId}). To enable Google Sign-In popups, go to Firebase Console -> Authentication -> Settings -> Authorized domains and add "${currentDomain}".`
      );
      (formattedError as any).code = 'auth/unauthorized-domain';
      (formattedError as any).domain = currentDomain;
      throw formattedError;
    }

    if (error?.code === 'auth/popup-closed-by-user') {
      const formattedError = new Error('Sign-in popup was closed before completing authentication.');
      (formattedError as any).code = 'auth/popup-closed-by-user';
      throw formattedError;
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const disconnectGoogleSheets = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // Ignore
  }
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(MANUAL_ACCESS_TOKEN_KEY);
  } catch {
    // Ignore
  }
};

// Parse Google Sheets API error response
const parseSheetsApiError = async (res: Response): Promise<Error> => {
  let errMessage = `Google Sheets request failed with status ${res.status}`;
  let enableUrl = '';
  try {
    const errData = await res.json();
    if (errData?.error?.message) {
      errMessage = errData.error.message;
    }
    // Check for help activation links
    if (Array.isArray(errData?.error?.details)) {
      for (const detail of errData.error.details) {
        if (Array.isArray(detail?.links)) {
          for (const link of detail.links) {
            if (link?.url && link.url.includes('sheets.googleapis.com')) {
              enableUrl = link.url;
              break;
            }
          }
        }
      }
    }
  } catch {
    // Ignore JSON parse error
  }

  // Extract URL from error message if not found in details
  if (!enableUrl) {
    const urlMatch = errMessage.match(/https:\/\/console\.(?:developers|cloud)\.google\.com\/[^\s]+/);
    if (urlMatch) {
      enableUrl = urlMatch[0];
    }
  }

  const error = new Error(errMessage);
  if (errMessage.includes('disabled') || errMessage.includes('has not been used in project') || enableUrl) {
    (error as any).code = 'sheets/api-disabled';
    (error as any).enableUrl =
      enableUrl ||
      `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${firebaseConfig.projectId || '700750943390'}`;
  }
  return error;
};

// Standard Sheet Headers
export const VISITOR_SHEET_HEADERS = [
  'Sr No',
  'Date & Time Stamp',
  'Date',
  'Visitor Name',
  'Mobile Number',
  'Visitor Type',
  'Address / Location',
  'Purpose of Visit',
  'Check In Time',
  'Check Out Time',
  'Status',
  'Candidate App ID',
  'Remarks',
  'Logged At (ISO)',
];

// Helper to convert VisitorRecord to row array
export const visitorToRow = (v: VisitorRecord): (string | number)[] => {
  return [
    v.srNo,
    v.timestamp || `${v.date}, ${v.checkInTime}`,
    v.date,
    v.name,
    v.mobile,
    v.visitorType,
    v.address || 'Washim',
    v.purpose,
    v.checkInTime,
    v.checkOutTime || '',
    v.status,
    v.candidateAppId || '',
    v.remarks || '',
    v.createdAt || new Date().toISOString(),
  ];
};

// Create a new styled Google Spreadsheet for Visitors
export const createVisitorsSpreadsheet = async (
  title = 'Visitors Entry Register'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetName: string }> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google authentication required. Please sign in with Google first.');
  }

  const sheetName = 'Visitors_Register';

  // 1. Create Spreadsheet with initial sheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: sheetName,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    throw await parseSheetsApiError(createRes);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Add header row
  await appendRowsToSpreadsheet(spreadsheetId, sheetName, [VISITOR_SHEET_HEADERS]);

  return {
    spreadsheetId,
    spreadsheetUrl,
    sheetName,
  };
};

// Append rows to an existing Google Spreadsheet
export const appendRowsToSpreadsheet = async (
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number)[][]
): Promise<{ updatedRows: number }> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google authentication required. Please sign in with Google.');
  }

  const range = `${sheetName}!A:N`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    throw await parseSheetsApiError(res);
  }

  const result = await res.json();
  return { updatedRows: result?.updates?.updatedRows || rows.length };
};

// Sync all visitors to Google Sheet (overwrites and rewrites with fresh header + full dataset)
export const syncAllVisitorsToGoogleSheet = async (
  spreadsheetId: string,
  sheetName: string,
  visitors: VisitorRecord[]
): Promise<{ totalSynced: number }> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google authentication required. Please sign in with Google.');
  }

  // Clear existing sheet content
  const clearRange = `${sheetName}!A1:Z10000`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      clearRange
    )}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Prepare full data payload (Header + all sorted visitor rows)
  const sorted = [...visitors].sort((a, b) => a.srNo - b.srNo);
  const rows = [VISITOR_SHEET_HEADERS, ...sorted.map(visitorToRow)];

  const updateRange = `${sheetName}!A1`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    updateRange
  )}?valueInputOption=USER_ENTERED`;

  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    throw await parseSheetsApiError(res);
  }

  return { totalSynced: visitors.length };
};

// Single Visitor Auto-Sync helper
export const autoSyncVisitorRow = async (visitor: VisitorRecord): Promise<boolean> => {
  try {
    const config = getSavedSheetsConfig();
    if (!config || !config.autoSync || !config.spreadsheetId || !cachedAccessToken) {
      return false;
    }

    const row = visitorToRow(visitor);
    await appendRowsToSpreadsheet(config.spreadsheetId, config.sheetName || 'Visitors_Register', [row]);
    
    // Update last sync time
    saveSheetsConfig({
      ...config,
      lastSyncedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('[Google Sheets Auto-Sync Warning]', err);
    return false;
  }
};
