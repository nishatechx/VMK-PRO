import {
  UserProfile,
  StudentRecord,
  CenterNotice,
  VisitorRecord,
  TabPermission,
  FeaturePermission,
} from '../types/auth';
import { OFFICIAL_PORTAL_USERS } from '../data/seedUsers';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { safeStorage } from '../utils/safeStorage';

/**
 * Recursively removes any properties with `undefined` values from objects and arrays,
 * preventing Firestore "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const USERS_STORAGE_KEY = 'vmk_user_profiles_v1';
const DELETED_USERS_STORAGE_KEY = 'vmk_deleted_user_ids_v1';
const CURRENT_USER_KEY = 'vmk_current_logged_user';
const STUDENTS_STORAGE_KEY = 'vmk_students_records_v1';
const NOTICES_STORAGE_KEY = 'vmk_center_notices_v1';
const VISITORS_STORAGE_KEY = 'vmk_visitors_records_v1';

export function getDeletedUserIdsLocal(): Set<string> {
  try {
    const raw = safeStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return new Set(list.map((id: string) => String(id).toLowerCase().trim()));
      }
    }
  } catch {}
  return new Set<string>();
}

export function markUserDeletedLocal(id: string) {
  try {
    const clean = String(id || '').toLowerCase().trim();
    if (!clean) return;
    const set = getDeletedUserIdsLocal();
    set.add(clean);
    safeStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function unmarkUserDeletedLocal(id: string) {
  try {
    const clean = String(id || '').toLowerCase().trim();
    if (!clean) return;
    const set = getDeletedUserIdsLocal();
    if (set.has(clean)) {
      set.delete(clean);
      safeStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

// Default Master Super Admin Account (Root Administrator for all districts)
export const SUPER_ADMIN_USER: UserProfile = {
  id: 'super_admin_shrinath',
  uid: 'super_admin_shrinath',
  username: 'shrinath',
  password: 'shri@8975',
  fullName: 'Mr. Shrinath Ghodake',
  designation: 'Super Administrator',
  role: 'super_admin',
  allowedTabs: [
    'user_management',
    'profile',
  ],
  allowedFeatures: [],
  canUseApiKey: true,
  isActive: true,
  createdAt: '2026-08-20T00:00:00.000Z',
  phone: '+91 98220 89750',
  email: 'shrinathyg@gmail.com',
};

// Default Master DNO Account (District Nodal Administrator)
export const DNO_USER: UserProfile = {
  id: 'dno_washim_admin',
  uid: 'dno_washim_admin',
  username: 'dno',
  password: 'dno1',
  fullName: 'Mr. Shrinath Ghodake',
  designation: 'District Nodal Officer (DNO)',
  role: 'dno',
  district: 'Washim',
  allowedTabs: [
    'dashboard',
    'facilitation_tools',
    'visitors',
    'tickets',
    'candidates',
    'students',
    'reports',
    'notices_circulars',
    'knowledge_base',
    'settings',
    'profile',
    'user_management',
    'google_sheets',
  ],
  allowedFeatures: [
    'whatsapp_tool',
    'qr_upload_tool',
    'ticket_generator_tool',
    'img_to_pdf_tool',
    'image_to_text_tool',
    'add_candidate',
    'add_visitor',
    'export_reports',
  ],
  canUseApiKey: true,
  isActive: true,
  createdAt: '2026-08-22T00:00:00.000Z',
  phone: '+91 98220 00000',
  email: 'dno.washim@cetcell.mah.gov.in',
};

// Default Supporting Staff User (Facilitation & Scrutiny Counter Desk)
export const DEFAULT_STAFF_USER: UserProfile = {
  id: 'staff_operator_1',
  uid: 'staff_operator_1',
  username: 'staff',
  password: 'staff123',
  fullName: 'Pooja Deshmukh',
  designation: 'Supporting Staff (Reception & Verification Desk)',
  role: 'supporting_staff',
  district: 'Washim',
  allowedTabs: [
    'dashboard',
    'facilitation_tools',
    'visitors',
    'candidates',
    'students',
    'tickets',
    'notices_circulars',
    'knowledge_base',
    'settings',
    'profile',
  ],
  allowedFeatures: [
    'whatsapp_tool',
    'qr_upload_tool',
    'ticket_generator_tool',
    'img_to_pdf_tool',
    'image_to_text_tool',
    'add_candidate',
    'add_visitor',
    'export_reports',
  ],
  canUseApiKey: true,
  isActive: true,
  createdAt: '2026-08-25T00:00:00.000Z',
  phone: '+91 98220 12345',
  email: 'staff.washim@cetcell.mah.gov.in',
};

// Available system tabs with display labels and descriptions for RBAC control
export const AVAILABLE_TABS: { id: TabPermission; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Institutional overview, KPIs, and live verification activity' },
  { id: 'facilitation_tools', label: 'Facilitation Tools', description: 'WhatsApp Ticket, Files by QR, SAC Ticket, Image-to-PDF, OCR & CIA' },
  { id: 'candidates', label: 'Candidates Register', description: 'Candidate dossiers, scrutiny status & verification' },
  { id: 'tickets', label: 'Tickets Desk', description: 'Candidate grievance, counseling & SAC inquiry tickets' },
  { id: 'reports', label: 'Reports & Analytics', description: 'Verification statistics, scrutiny summaries and exportable audits' },
  { id: 'notices_circulars', label: 'Notices & Circulars', description: 'Live official notifications & circulars feed' },
  { id: 'knowledge_base', label: 'Knowledge Base', description: 'Official CET Information Brochures & Rulebooks' },
  { id: 'settings', label: 'Settings', description: 'Institutional center profile, credentials & preferences' },
  { id: 'visitors', label: 'Visitors Entry Register', description: 'Visitor entry logbook, check-in/out and reception directory' },
  { id: 'google_sheets', label: 'Google Sheets (DNO Admin)', description: 'Cloud spreadsheet live sync & central export (Passcode: dno1)' },
  { id: 'user_management', label: 'User Management (Admin)', description: 'Staff accounts, role assignment and tab access controls' },
];

export const AVAILABLE_FEATURES: { id: FeaturePermission; label: string; description: string }[] = [
  { id: 'whatsapp_tool', label: 'WhatApp Ticket', description: 'Direct WhatsApp ticket generator & notice dispatch' },
  { id: 'qr_upload_tool', label: 'Files by QR', description: 'Instant mobile QR code camera sync for candidate document uploads' },
  { id: 'ticket_generator_tool', label: 'SAC Ticket Generator', description: 'Official CET/CAP candidate grievance & scrutiny ticket desk' },
  { id: 'img_to_pdf_tool', label: 'Image to PDF', description: 'Convert candidate image documents to multi-page PDF' },
  { id: 'image_to_text_tool', label: 'Image to Text (OCR)', description: 'Extract Marathi, Hindi & English printed or handwritten text with multimodal vision' },
  { id: 'add_candidate', label: 'Add New Candidates', description: 'Ability to register and input candidate details' },
  { id: 'add_visitor', label: 'Add Visitor Entry', description: 'Ability to log new visitor check-in and check-out' },
  { id: 'export_reports', label: 'Export Data & Reports', description: 'Download CSV and print scrutiny logs' },
];

/**
 * Return friendly title for UserRole
 */
export function getRoleLabel(role?: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Administrator (All Districts)';
    case 'dno':
      return 'District Nodal Officer (Admin)';
    case 'counsellor':
      return 'Admission Counsellor';
    case 'supporting_staff':
      return 'Supporting Staff';
    case 'operator':
      return 'Scrutiny Operator';
    case 'student':
      return 'Candidate User';
    default:
      return 'Staff Member';
  }
}

/**
 * Check whether a user is authorized to access a given portal tab.
 * Super Admin can customize tab access per user via allowedTabs in User Management / Settings.
 */
export function hasTabPermission(user: UserProfile | null | undefined, tab: TabPermission): boolean {
  if (!user) return false;
  const isSuperAdmin = user.role === 'super_admin' || user.username.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    // Super Administrator has MASTER access across ALL portal tabs
    return true;
  }

  // Facilitation Tools is accessible by default to all users
  if (tab === 'facilitation_tools') {
    return true;
  }

  // Dashboard and profile are accessible to all users
  if (tab === 'dashboard' || tab === 'profile') {
    return true;
  }

  // Check user's allowedTabs explicitly configured by Super Admin
  const allowed = Array.isArray(user.allowedTabs) ? user.allowedTabs : [];

  // Direct match
  if (allowed.includes(tab)) return true;

  // Aliases for backward compatibility
  if (tab === 'candidates' && allowed.includes('students')) return true;
  if (tab === 'students' && allowed.includes('candidates')) return true;
  if (tab === 'settings' && allowed.includes('profile')) return true;

  return false;
}

export const TAB_TO_FEATURES_MAP: Record<TabPermission, FeaturePermission[]> = {
  facilitation_tools: [
    'whatsapp_tool',
    'qr_upload_tool',
    'ticket_generator_tool',
    'img_to_pdf_tool',
    'image_to_text_tool',
  ],
  candidates: ['add_candidate'],
  students: ['add_candidate'],
  visitors: ['add_visitor'],
  reports: ['export_reports'],
  dashboard: [],
  tickets: [],
  events_camps: [],
  counsellor_tools: [],
  notices_circulars: [],
  knowledge_base: [],
  settings: [],
  profile: [],
  user_management: [],
  google_sheets: [],
};

export function getFeaturesForTabs(tabs: TabPermission[]): FeaturePermission[] {
  const features = new Set<FeaturePermission>();
  for (const t of tabs) {
    const list = TAB_TO_FEATURES_MAP[t] || [];
    for (const f of list) {
      features.add(f);
    }
  }
  return Array.from(features);
}

export function getParentTabForFeature(feature: FeaturePermission): TabPermission {
  switch (feature) {
    case 'whatsapp_tool':
    case 'qr_upload_tool':
    case 'ticket_generator_tool':
    case 'img_to_pdf_tool':
    case 'image_to_text_tool':
      return 'facilitation_tools';
    case 'add_candidate':
      return 'candidates';
    case 'add_visitor':
      return 'visitors';
    case 'export_reports':
      return 'reports';
    default:
      return 'dashboard';
  }
}

/**
 * Check whether a user has been granted a specific interactive tool/feature permission.
 * Rule: Tab access = access to all tools within that tab, unless individually restricted by Super Admin.
 */
export function hasFeaturePermission(user: UserProfile | null | undefined, feature: FeaturePermission): boolean {
  if (!user) return false;
  const isSuperAdmin = user.role === 'super_admin' || user.username.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    // Super Administrator has MASTER access across ALL interactive tools and utilities
    return true;
  }

  const parentTab = getParentTabForFeature(feature);
  // 1. If user does not have permission to the parent tab, they cannot access the feature
  if (!hasTabPermission(user, parentTab)) {
    return false;
  }

  // 2. Check if Super Admin has explicitly restricted this individual tool
  if (Array.isArray(user.restrictedFeatures) && user.restrictedFeatures.includes(feature)) {
    return false;
  }

  // 3. Tab access grants access to all tools within that tab by default
  return true;
}

// In-memory subscribers
const userSubscribers: ((users: UserProfile[]) => void)[] = [];
const studentSubscribers: ((students: StudentRecord[]) => void)[] = [];
const visitorSubscribers: ((visitors: VisitorRecord[]) => void)[] = [];
const noticeSubscribers: ((notices: CenterNotice[]) => void)[] = [];

let isFirestoreSynced = false;

// -------------------------------------------------------------
// USER MANAGEMENT & CLOUD SYNC
// -------------------------------------------------------------

export function getAllUsers(): UserProfile[] {
  try {
    const raw = safeStorage.getItem(USERS_STORAGE_KEY);
    let parsed: UserProfile[] = [];
    if (!raw) {
      parsed = [...OFFICIAL_PORTAL_USERS];
      safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
    parsed = JSON.parse(raw);

    let modified = false;
    const deletedSet = getDeletedUserIdsLocal();

    // Filter out deleted users from parsed
    const nonDeleted = parsed.filter((u) => {
      const uId = String(u.id || '').toLowerCase().trim();
      const uName = String(u.username || '').toLowerCase().trim();
      return !deletedSet.has(uId) && !deletedSet.has(uName);
    });
    if (nonDeleted.length !== parsed.length) {
      parsed = nonDeleted;
      modified = true;
    }

    // Guarantee official portal users created by Super Admin & DNO are present (unless deleted)
    for (const seed of OFFICIAL_PORTAL_USERS) {
      const sId = String(seed.id || '').toLowerCase().trim();
      const sName = String(seed.username || '').toLowerCase().trim();
      if (deletedSet.has(sId) || deletedSet.has(sName)) {
        continue;
      }
      const idx = parsed.findIndex(
        (u) => u.username?.toLowerCase() === sName || u.id === sId
      );
      if (idx === -1) {
        parsed.push({ ...seed, permissionVersion: seed.permissionVersion || 1 });
        modified = true;
      }
    }

    // Ensure Super Admin always exists and has valid credentials
    const superAdminIndex = parsed.findIndex((u) => u.username.toLowerCase() === 'shrinath');
    if (superAdminIndex === -1) {
      parsed.unshift(SUPER_ADMIN_USER);
      modified = true;
    } else {
      if (parsed[superAdminIndex].password !== 'shri@8975') {
        parsed[superAdminIndex].password = 'shri@8975';
        modified = true;
      }
      if (parsed[superAdminIndex].role !== 'super_admin') {
        parsed[superAdminIndex].role = 'super_admin';
        modified = true;
      }
      if (parsed[superAdminIndex].isActive === false) {
        parsed[superAdminIndex].isActive = true;
        modified = true;
      }
      parsed[superAdminIndex].allowedTabs = ['user_management', 'profile'];
      parsed[superAdminIndex].allowedFeatures = [];
      modified = true;
    }

    // Ensure DNO always exists (unless deleted)
    const dnoIndex = parsed.findIndex((u) => u.username.toLowerCase() === 'dno');
    if (dnoIndex === -1 && !deletedSet.has('dno') && !deletedSet.has(DNO_USER.id.toLowerCase())) {
      parsed.push(DNO_USER);
      modified = true;
    } else if (dnoIndex >= 0) {
      if (!Array.isArray(parsed[dnoIndex].allowedTabs)) {
        parsed[dnoIndex].allowedTabs = [...DNO_USER.allowedTabs];
        modified = true;
      }
      if (!parsed[dnoIndex].district) {
        parsed[dnoIndex].district = 'Washim';
        modified = true;
      }
    }

    // Ensure Default Supporting Staff user always exists (unless deleted)
    const staffIndex = parsed.findIndex((u) => u.username.toLowerCase() === 'staff');
    if (staffIndex === -1 && !deletedSet.has('staff') && !deletedSet.has(DEFAULT_STAFF_USER.id.toLowerCase())) {
      parsed.push(DEFAULT_STAFF_USER);
      modified = true;
    } else if (staffIndex >= 0) {
      if (!Array.isArray(parsed[staffIndex].allowedTabs)) {
        parsed[staffIndex].allowedTabs = [...DEFAULT_STAFF_USER.allowedTabs];
        modified = true;
      }
      if (!Array.isArray(parsed[staffIndex].allowedFeatures)) {
        parsed[staffIndex].allowedFeatures = [...DEFAULT_STAFF_USER.allowedFeatures];
        modified = true;
      }
    }

    if (modified) {
      safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (err) {
    console.error('Error reading users from storage:', err);
    return [...OFFICIAL_PORTAL_USERS];
  }
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  userSubscribers.push(callback);
  callback(getAllUsers());
  return () => {
    const idx = userSubscribers.indexOf(callback);
    if (idx >= 0) userSubscribers.splice(idx, 1);
  };
}

function notifyUserSubscribers(users: UserProfile[]) {
  userSubscribers.forEach((cb) => {
    try {
      cb(users);
    } catch (e) {
      console.error('Error in user subscriber callback:', e);
    }
  });
}

/**
 * Initializes Firestore cloud listeners for users and collections
 */
export function initFirestoreDataSync() {
  if (isFirestoreSynced || typeof window === 'undefined') return;
  isFirestoreSynced = true;

  try {
    // 1. Sync Users from Firestore
    onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreUsers: UserProfile[] = [];
          const seen = new Set<string>();
          const deletedSet = getDeletedUserIdsLocal();
          snapshot.forEach((d) => {
            const data = d.data() as any;
            if (data) {
              const rawUid = data.id || data.uid || d.id;
              const rawUsername = (data.username || (data.email ? data.email.split('@')[0] : rawUid)).toLowerCase().trim();
              if (deletedSet.has(rawUid.toLowerCase()) || deletedSet.has(rawUsername) || deletedSet.has(d.id.toLowerCase())) {
                return;
              }
              if (!seen.has(rawUsername)) {
                seen.add(rawUsername);
                seen.add(rawUid.toLowerCase());
                firestoreUsers.push({
                  ...data,
                  id: rawUid,
                  uid: rawUid,
                  username: data.username || rawUsername,
                });
              }
            }
          });

          // Ensure Super Admin is present
          const hasSuperAdmin = firestoreUsers.some((u) => u.username.toLowerCase() === 'shrinath' || u.id === SUPER_ADMIN_USER.id);
          if (!hasSuperAdmin) {
            firestoreUsers.unshift(SUPER_ADMIN_USER);
            setDoc(doc(db, 'users', SUPER_ADMIN_USER.id), sanitizeForFirestore(SUPER_ADMIN_USER), { merge: true }).catch(() => {});
          }

          // Ensure DNO is present (unless deleted)
          const hasDno = firestoreUsers.some((u) => u.username.toLowerCase() === 'dno' || u.id === DNO_USER.id);
          if (!hasDno && !deletedSet.has('dno') && !deletedSet.has(DNO_USER.id.toLowerCase())) {
            firestoreUsers.push(DNO_USER);
            setDoc(doc(db, 'users', DNO_USER.id), sanitizeForFirestore(DNO_USER), { merge: true }).catch(() => {});
          }

          // Ensure Default Supporting Staff is present (unless deleted)
          const hasStaff = firestoreUsers.some((u) => u.username.toLowerCase() === 'staff' || u.id === DEFAULT_STAFF_USER.id);
          if (!hasStaff && !deletedSet.has('staff') && !deletedSet.has(DEFAULT_STAFF_USER.id.toLowerCase())) {
            firestoreUsers.push(DEFAULT_STAFF_USER);
            setDoc(doc(db, 'users', DEFAULT_STAFF_USER.id), sanitizeForFirestore(DEFAULT_STAFF_USER), { merge: true }).catch(() => {});
          }

          safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(firestoreUsers));
          notifyUserSubscribers(firestoreUsers);

          // Push to backend server sync to guarantee cross-device availability
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: firestoreUsers }),
          }).catch(() => {});

          // Update current active user session if modified
          const current = getCurrentUser();
          if (current) {
            const updatedCurrent = firestoreUsers.find((u) => u.id === current.id || (u.uid && u.uid === current.id) || u.username.toLowerCase() === current.username.toLowerCase());
            if (updatedCurrent) {
              setCurrentUser(updatedCurrent);
            }
          }
        } else {
          // If Firestore users collection is currently empty, seed super admin & master DNO
          setDoc(doc(db, 'users', SUPER_ADMIN_USER.id), sanitizeForFirestore(SUPER_ADMIN_USER), { merge: true }).catch(() => {});
          setDoc(doc(db, 'users', DNO_USER.id), sanitizeForFirestore(DNO_USER), { merge: true }).catch(() => {});
        }
      },
      (err) => {
        console.warn('Firestore users sync listener fallback to local:', err?.message);
      }
    );

    // 2. Sync Students from Firestore
    onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StudentRecord[] = [];
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as StudentRecord));
          safeStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(list));
          studentSubscribers.forEach((cb) => cb(list));
        }
      },
      (err) => console.warn('Firestore students sync error:', err?.message)
    );

    // 3. Sync Visitors from Firestore
    onSnapshot(
      collection(db, 'visitors'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: VisitorRecord[] = [];
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as VisitorRecord));
          safeStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(list));
          visitorSubscribers.forEach((cb) => cb(list));
        }
      },
      (err) => console.warn('Firestore visitors sync error:', err?.message)
    );

    // 4. Sync Notices from Firestore
    onSnapshot(
      collection(db, 'notices'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CenterNotice[] = [];
          snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as CenterNotice));
          safeStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(list));
          noticeSubscribers.forEach((cb) => cb(list));
        }
      },
      (err) => console.warn('Firestore notices sync error:', err?.message)
    );
  } catch (err) {
    console.error('Failed to init Firestore listeners:', err);
  }
}

// Start listener automatically
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFirestoreDataSync();
  }, 100);
}

/**
 * Sync users from server persistent store into local storage cache
 * Also pushes any existing local users to server for bidirectional persistence across devices
 */
export async function syncUsersFromServer(): Promise<UserProfile[]> {
  if (typeof window === 'undefined') return getAllUsers();
  const local = getAllUsers();
  try {
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: local }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
        notifyUserSubscribers(data.users);
        return data.users;
      }
    }
  } catch (e) {
    console.warn('Sync from /api/users/sync fallback to /api/users:', e);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
          notifyUserSubscribers(data.users);
          return data.users;
        }
      }
    } catch {}
  }
  return getAllUsers();
}

// Auto-sync users on app load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncUsersFromServer().catch(() => {});
  }, 50);
}

// Broadcast channel for real-time instant cross-tab user permission synchronization
const userBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('vmk_user_permissions_channel')
  : null;

export function broadcastUserUpdate(updatedUser: UserProfile) {
  if (userBroadcastChannel) {
    try {
      userBroadcastChannel.postMessage({ type: 'USER_PERMISSIONS_UPDATED', user: updatedUser });
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vmk_user_updated', { detail: updatedUser }));
  }
}

if (userBroadcastChannel) {
  userBroadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'USER_PERMISSIONS_UPDATED' && event.data?.user) {
      const u = event.data.user as UserProfile;
      const all = getAllUsers();
      const idx = all.findIndex(
        (existing) =>
          existing.id === u.id ||
          (existing.uid && existing.uid === u.id) ||
          existing.username.toLowerCase() === u.username.toLowerCase()
      );
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...u };
      } else {
        all.push(u);
      }
      safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all));
      notifyUserSubscribers(all);

      // If the currently logged in user in this tab is the one updated, update currentUser instantly
      const current = getCurrentUser();
      if (
        current &&
        (current.id === u.id ||
          (current.uid && current.uid === u.id) ||
          current.username.toLowerCase() === u.username.toLowerCase())
      ) {
        setCurrentUser({
          ...current,
          ...u,
          allowedTabs: Array.isArray(u.allowedTabs) ? u.allowedTabs : current.allowedTabs,
          allowedFeatures: Array.isArray(u.allowedFeatures) ? u.allowedFeatures : current.allowedFeatures,
        });
      }
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === USERS_STORAGE_KEY && e.newValue) {
      try {
        const freshList = JSON.parse(e.newValue);
        if (Array.isArray(freshList)) {
          notifyUserSubscribers(freshList);
          const current = getCurrentUser();
          if (current) {
            const freshCur = freshList.find(
              (u: any) =>
                u.id === current.id ||
                (u.uid && u.uid === current.id) ||
                u.username?.toLowerCase() === current.username.toLowerCase()
            );
            if (freshCur) {
              setCurrentUser({
                ...current,
                ...freshCur,
                allowedTabs: freshCur.allowedTabs,
                allowedFeatures: freshCur.allowedFeatures,
              });
            }
          }
        }
      } catch {}
    }
  });
}

export async function saveUserAsync(user: UserProfile): Promise<{ success: boolean; message: string }> {
  try {
    const users = getAllUsers();
    const cleanUsername = (user.username || user.email?.split('@')[0] || '').trim().toLowerCase();
    const userUid = user.id || (user as any).uid || `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Unmark from deleted set so user can be re-created/updated
    unmarkUserDeletedLocal(cleanUsername);
    if (user.id) unmarkUserDeletedLocal(user.id);
    if ((user as any).uid) unmarkUserDeletedLocal((user as any).uid);

    const existingIndex = users.findIndex(
      (u) =>
        u.id === userUid ||
        (u.uid && u.uid === userUid) ||
        (user.id && u.id === user.id) ||
        u.username?.toLowerCase() === cleanUsername
    );

    const existingUser = existingIndex >= 0 ? users[existingIndex] : null;
    const existingVersion = existingUser?.permissionVersion || user.permissionVersion || 0;
    const newVersion = existingVersion + 1;

    // Respect explicitly provided allowedTabs and ensure facilitation_tools is included by default
    const rawTabs: TabPermission[] = Array.isArray(user.allowedTabs)
      ? [...user.allowedTabs]
      : ['dashboard', 'facilitation_tools', 'visitors', 'candidates', 'students', 'tickets', 'notices_circulars', 'knowledge_base', 'settings', 'profile'];
    if (!rawTabs.includes('facilitation_tools')) {
      rawTabs.push('facilitation_tools');
    }
    const explicitTabs = rawTabs;

    // Automatically calculate tools belonging to granted tabs
    const autoFeatures = getFeaturesForTabs(explicitTabs);
    const existingExplicitFeatures = Array.isArray(user.allowedFeatures) ? user.allowedFeatures : [];
    const combinedFeatures = Array.from(new Set([...autoFeatures, ...existingExplicitFeatures]))
      .filter((feat) => {
        const parentTab = getParentTabForFeature(feat);
        return explicitTabs.includes(parentTab) ||
          (parentTab === 'candidates' && explicitTabs.includes('students')) ||
          (parentTab === 'students' && explicitTabs.includes('candidates'));
      });

    let cleanUser: UserProfile = {
      ...user,
      id: existingUser ? existingUser.id : userUid,
      uid: existingUser ? (existingUser.uid || existingUser.id) : userUid,
      username: cleanUsername,
      fullName: user.fullName?.trim() || cleanUsername,
      allowedTabs: explicitTabs,
      allowedFeatures: combinedFeatures,
      isActive: user.isActive !== false,
      canUseApiKey: user.canUseApiKey !== false,
      permissionVersion: newVersion,
    };

    // 1. Immediately persist locally to ensure zero-lag instant UI responsiveness
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...cleanUser };
      if (!cleanUser.profilePicture) {
        delete users[existingIndex].profilePicture;
      }
    } else {
      users.push(cleanUser);
    }
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Update active session if this is the currently logged in user
    const currentUser = getCurrentUser();
    if (
      currentUser &&
      (currentUser.id === cleanUser.id ||
        (currentUser.uid && currentUser.uid === cleanUser.id) ||
        currentUser.username.toLowerCase() === cleanUser.username.toLowerCase())
    ) {
      setCurrentUser({
        ...currentUser,
        ...cleanUser,
        allowedTabs: cleanUser.allowedTabs,
        allowedFeatures: cleanUser.allowedFeatures,
      });
    }

    // Broadcast permission changes to all open tabs and windows
    broadcastUserUpdate(cleanUser);

    // 2. Post to persistent server API
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUser),
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.success && data?.user) {
        cleanUser = { ...cleanUser, ...data.user };
      }
    } catch (e: any) {
      console.warn('Server user save network notice, saved locally:', e?.message);
    }

    // Sync full user array across serverless instances in background
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    }).catch(() => {});

    // 3. Save directly to Firestore cloud database with UID & lookup aliases (non-blocking)
    try {
      const sanitized = sanitizeForFirestore(cleanUser);
      // Primary document by UID
      setDoc(doc(db, 'users', cleanUser.id), sanitized, { merge: true }).catch(() => {});
      // Alias document by username for instant lookup
      if (cleanUser.username) {
        setDoc(doc(db, 'users', cleanUser.username.toLowerCase()), sanitized, { merge: true }).catch(() => {});
      }
      // Alias document by email if present
      if (cleanUser.email) {
        setDoc(doc(db, 'users', cleanUser.email.toLowerCase()), sanitized, { merge: true }).catch(() => {});
      }
    } catch {}

    return { success: true, message: 'User profile and permissions saved successfully.' };
  } catch (err: any) {
    console.error('Error saving user:', err);
    return { success: false, message: err?.message || 'Failed to save user profile.' };
  }
}

export function saveUser(user: UserProfile): { success: boolean; message: string } {
  try {
    const users = getAllUsers();
    const cleanUsername = (user.username || '').trim().toLowerCase();
    const cleanId = (user.id || (user as any).uid || '').trim();

    unmarkUserDeletedLocal(cleanUsername);
    if (cleanId) unmarkUserDeletedLocal(cleanId);

    const existingIndex = users.findIndex(
      (u) =>
        (cleanId && (u.id === cleanId || (u.uid && u.uid === cleanId))) ||
        u.username.toLowerCase() === cleanUsername
    );

    // Check duplicate username for another user with different id
    if (existingIndex === -1) {
      const usernameTaken = users.some(
        (u) => u.username.toLowerCase() === cleanUsername && u.id !== cleanId
      );
      if (usernameTaken) {
        return { success: false, message: `Username "${user.username}" is already taken.` };
      }
    }

    const existingUser = existingIndex >= 0 ? users[existingIndex] : null;
    const existingVersion = existingUser?.permissionVersion || user.permissionVersion || 0;
    const newVersion = existingVersion + 1;

    // Respect explicitly provided allowedTabs and ensure facilitation_tools is included by default
    const rawTabs: TabPermission[] = Array.isArray(user.allowedTabs)
      ? [...user.allowedTabs]
      : ['dashboard', 'facilitation_tools', 'visitors', 'candidates', 'students', 'tickets', 'notices_circulars', 'knowledge_base', 'settings', 'profile'];
    if (!rawTabs.includes('facilitation_tools')) {
      rawTabs.push('facilitation_tools');
    }
    const explicitTabs = rawTabs;

    // Automatically calculate tools belonging to granted tabs
    const autoFeatures = getFeaturesForTabs(explicitTabs);
    const existingExplicitFeatures = Array.isArray(user.allowedFeatures) ? user.allowedFeatures : [];
    const combinedFeatures = Array.from(new Set([...autoFeatures, ...existingExplicitFeatures]))
      .filter((feat) => {
        const parentTab = getParentTabForFeature(feat);
        return explicitTabs.includes(parentTab) ||
          (parentTab === 'candidates' && explicitTabs.includes('students')) ||
          (parentTab === 'students' && explicitTabs.includes('candidates'));
      });

    const cleanUser: UserProfile = {
      ...user,
      id: cleanId || (existingIndex >= 0 ? users[existingIndex].id : `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`),
      uid: cleanId || (existingIndex >= 0 ? (users[existingIndex].uid || users[existingIndex].id) : undefined),
      username: cleanUsername,
      fullName: user.fullName?.trim() || cleanUsername,
      allowedTabs: explicitTabs,
      allowedFeatures: combinedFeatures,
      permissionVersion: newVersion,
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...cleanUser };
      if (!cleanUser.profilePicture) {
        delete users[existingIndex].profilePicture;
      }
    } else {
      users.push(cleanUser);
    }

    // Save to local storage
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Update current session if the edited user is currently logged in
    const currentUser = getCurrentUser();
    if (
      currentUser &&
      (currentUser.id === cleanUser.id ||
        (currentUser.uid && currentUser.uid === cleanUser.id) ||
        currentUser.username.toLowerCase() === cleanUser.username.toLowerCase())
    ) {
      setCurrentUser({
        ...currentUser,
        ...cleanUser,
        allowedTabs: cleanUser.allowedTabs,
        allowedFeatures: cleanUser.allowedFeatures,
      });
    }

    // Broadcast across all tabs
    broadcastUserUpdate(cleanUser);

    // Background sync to server API
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanUser),
    }).catch(() => {});

    // Save directly to Firestore cloud database
    const sanitized = sanitizeForFirestore(cleanUser);
    setDoc(doc(db, 'users', cleanUser.id), sanitized, { merge: true }).catch(() => {});
    if (cleanUser.username) {
      setDoc(doc(db, 'users', cleanUser.username.toLowerCase()), sanitized, { merge: true }).catch(() => {});
    }

    return { success: true, message: 'User profile saved successfully and synced.' };
  } catch (err) {
    console.error('Error saving user:', err);
    return { success: false, message: 'Failed to save user profile.' };
  }
}

export async function deleteUserAsync(userId: string, username?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (
      userId === SUPER_ADMIN_USER.id ||
      userId === 'super_admin_shrinath' ||
      userId === 'shrinath' ||
      username?.toLowerCase() === 'shrinath'
    ) {
      return { success: false, message: 'The Super Administrator profile cannot be deleted.' };
    }

    // 1. Locate target user in stored database BEFORE marking deleted
    const existingUsers = getAllUsers();
    const existingTarget = existingUsers.find(
      (u) =>
        u.id === userId ||
        (u.uid && u.uid === userId) ||
        u.username?.toLowerCase() === userId.toLowerCase() ||
        (username && u.username?.toLowerCase() === username.toLowerCase())
    );

    const targetId = existingTarget?.id || userId;
    const targetUid = existingTarget?.uid || targetId;
    const targetUsername = existingTarget?.username || username || userId;
    const targetEmail = existingTarget?.email || '';

    // 2. Mark all identifiers in deleted set so seed users and Firestore never resurrect them
    markUserDeletedLocal(targetId);
    markUserDeletedLocal(targetUid);
    markUserDeletedLocal(targetUsername);
    if (targetEmail) markUserDeletedLocal(targetEmail);

    // 3. Delete on persistent server
    try {
      const q = new URLSearchParams({ username: targetUsername });
      await fetch(`/api/users/${encodeURIComponent(targetId)}?${q.toString()}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server user delete notice:', e);
    }

    // 4. Remove from local storage cache
    const filteredUsers = existingUsers.filter(
      (u) =>
        u.id !== targetId &&
        u.id !== targetUid &&
        (u.uid ? u.uid !== targetUid : true) &&
        u.username?.toLowerCase() !== targetUsername.toLowerCase()
    );
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredUsers));
    notifyUserSubscribers(filteredUsers);

    // 5. Remove from Firestore cloud database (non-blocking)
    const firestoreKeys = Array.from(
      new Set([targetId, targetUid, targetUsername.toLowerCase(), targetEmail.toLowerCase()].filter(Boolean))
    );
    for (const key of firestoreKeys) {
      deleteDoc(doc(db, 'users', key)).catch(() => {});
    }

    // Broadcast deletion across open tabs
    if (userBroadcastChannel) {
      userBroadcastChannel.postMessage({
        type: 'USER_DELETED',
        userId: targetId,
        username: targetUsername,
      });
    }

    return { success: true, message: `User profile "${targetUsername}" deleted successfully.` };
  } catch (err) {
    console.error('Error deleting user:', err);
    return { success: false, message: 'Failed to delete user profile.' };
  }
}

export function deleteUser(userId: string, username?: string): { success: boolean; message: string } {
  try {
    if (
      userId === SUPER_ADMIN_USER.id ||
      userId === 'super_admin_shrinath' ||
      userId === 'shrinath' ||
      username?.toLowerCase() === 'shrinath'
    ) {
      return { success: false, message: 'The Super Administrator profile cannot be deleted.' };
    }

    const existingUsers = getAllUsers();
    const existingTarget = existingUsers.find(
      (u) =>
        u.id === userId ||
        (u.uid && u.uid === userId) ||
        u.username?.toLowerCase() === userId.toLowerCase() ||
        (username && u.username?.toLowerCase() === username.toLowerCase())
    );

    const targetId = existingTarget?.id || userId;
    const targetUid = existingTarget?.uid || targetId;
    const targetUsername = existingTarget?.username || username || userId;
    const targetEmail = existingTarget?.email || '';

    markUserDeletedLocal(targetId);
    markUserDeletedLocal(targetUid);
    markUserDeletedLocal(targetUsername);
    if (targetEmail) markUserDeletedLocal(targetEmail);

    // Background delete on server
    const q = new URLSearchParams({ username: targetUsername });
    fetch(`/api/users/${encodeURIComponent(targetId)}?${q.toString()}`, {
      method: 'DELETE',
    }).catch(() => {});

    const users = existingUsers.filter(
      (u) =>
        u.id !== targetId &&
        u.id !== targetUid &&
        (u.uid ? u.uid !== targetUid : true) &&
        u.username?.toLowerCase() !== targetUsername.toLowerCase()
    );
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Remove from Firestore cloud database
    const firestoreKeys = Array.from(
      new Set([targetId, targetUid, targetUsername.toLowerCase(), targetEmail.toLowerCase()].filter(Boolean))
    );
    for (const key of firestoreKeys) {
      deleteDoc(doc(db, 'users', key)).catch(() => {});
    }

    if (userBroadcastChannel) {
      userBroadcastChannel.postMessage({
        type: 'USER_DELETED',
        userId: targetId,
        username: targetUsername,
      });
    }

    return { success: true, message: `User profile "${targetUsername}" deleted successfully.` };
  } catch (err) {
    console.error('Error deleting user:', err);
    return { success: false, message: 'Failed to delete user profile.' };
  }
}

/**
 * Toggle user active/disabled status with server sync
 */
export async function toggleUserStatusAsync(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUserId = String(userId).trim().toLowerCase();

    // 1. Send to server
    try {
      const resp = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive }),
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.message) {
        // server processed
      }
    } catch (e) {
      console.warn('Server toggle status notice:', e);
    }

    // 2. Update local storage
    const users = getAllUsers();
    const idx = users.findIndex(
      (u) => u.id === userId || u.username?.toLowerCase() === cleanUserId
    );
    if (idx >= 0) {
      users[idx] = { ...users[idx], isActive };
      safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      notifyUserSubscribers(users);

      // 3. Update Firestore if possible
      setDoc(doc(db, 'users', users[idx].id), { isActive }, { merge: true }).catch(() => {});
      if (users[idx].username) {
        setDoc(doc(db, 'users', users[idx].username.toLowerCase()), { isActive }, { merge: true }).catch(() => {});
      }

      return {
        success: true,
        message: `User "${users[idx].username}" is now ${isActive ? 'active' : 'disabled'}.`,
      };
    }

    return { success: true, message: 'Status updated successfully.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to toggle status.' };
  }
}

/**
 * Match a user across multiple identifiers (username, ID, email, phone number, full name)
 * Supports flexible logins for all accounts created by Super Admin & DNO
 */
export function matchUserLocally(users: UserProfile[], identifier: string): UserProfile | null {
  const raw = String(identifier || '').trim().toLowerCase();
  if (!raw) return null;

  // 1. Direct match on username or id / uid from the provided users database FIRST
  const direct = users.find(
    (u) =>
      u.username?.toLowerCase() === raw ||
      u.id?.toLowerCase() === raw ||
      (u.uid && u.uid.toLowerCase() === raw)
  );
  if (direct) return direct;

  // 2. Email or username prefix match (e.g. rajesh or rajesh.adcc -> rajesh.adcc@gmail.com)
  const emailMatch = users.find((u) => {
    const em = (u.email || '').toLowerCase().trim();
    const uname = (u.username || '').toLowerCase().trim();
    if (em === raw || uname === raw) return true;
    if (em.startsWith(raw + '@') || em.startsWith(raw + '.') || em.split('@')[0] === raw) return true;
    if (uname.startsWith(raw + '@') || uname.startsWith(raw + '.') || uname.split('@')[0] === raw) return true;
    return false;
  });
  if (emailMatch) return emailMatch;

  // 3. Phone number match
  const cleanDigits = raw.replace(/\D/g, '');
  if (cleanDigits.length >= 8) {
    const phoneMatch = users.find((u) => {
      if (!u.phone) return false;
      const uPhone = u.phone.replace(/\D/g, '');
      return uPhone === cleanDigits || uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone);
    });
    if (phoneMatch) return phoneMatch;
  }

  // 4. Full name match
  const nameMatch = users.find(
    (u) => u.fullName && u.fullName.toLowerCase().trim() === raw
  );
  if (nameMatch) return nameMatch;

  // 5. Fallback defaults only if NOT found in stored database list
  if (
    raw === 'shrinath' ||
    raw === 'shri123' ||
    raw === 'shri' ||
    raw === 'super_admin_shrinath' ||
    raw === 'shrinathyg@gmail.com' ||
    raw.replace(/\D/g, '') === '9822089750'
  ) {
    return SUPER_ADMIN_USER;
  }
  if (
    raw === 'dno' ||
    raw === 'dno_washim_admin' ||
    raw === 'dno.washim@cetcell.mah.gov.in'
  ) {
    return DNO_USER;
  }
  if (
    raw === 'staff' ||
    raw === 'staff_operator_1' ||
    raw === 'staff.washim@cetcell.mah.gov.in'
  ) {
    return DEFAULT_STAFF_USER;
  }

  return null;
}

/**
 * Validates password with case-insensitivity and default alias fallbacks
 */
export function isPasswordMatch(user: UserProfile, pass: string): boolean {
  const cleanPass = String(pass || '').trim();
  const userPass = String(user.password || '').trim();
  if (userPass === cleanPass) return true;
  if (userPass.toLowerCase() === cleanPass.toLowerCase()) return true;
  if (
    (user.role === 'super_admin' || user.username?.toLowerCase() === 'shrinath' || user.id === 'super_admin_shrinath') &&
    (cleanPass === 'shri@8975' || cleanPass.toLowerCase() === 'shri@8975')
  ) {
    return true;
  }
  if (
    user.role === 'dno' &&
    (cleanPass.toLowerCase() === 'dno1' || cleanPass === '123456')
  ) {
    return true;
  }
  if (
    user.role === 'supporting_staff' &&
    (cleanPass.toLowerCase() === 'staff123' || cleanPass.toLowerCase() === 'staff1' || cleanPass === '123456')
  ) {
    return true;
  }
  return false;
}

/**
 * Enhanced authentication supporting Firebase Auth signInWithEmailAndPassword,
 * direct Firestore targeted UID queries, persistent localStorage syncing,
 * and seamless fallback across environments.
 */
export async function authenticateWithResultAsync(
  username: string,
  pass: string,
  preResolvedUser?: UserProfile | null
): Promise<{ user: UserProfile | null; error?: string }> {
  const cleanIdentifier = String(username || '').trim();
  const trimmedUser = cleanIdentifier.toLowerCase();
  const trimmedPass = String(pass || '').trim();

  // Helper to commit successful login and synchronize state
  const handleSuccess = (userToLogin: UserProfile) => {
    const uid = userToLogin.id || (userToLogin as any).uid || `user_${Date.now()}`;
    const normalized: UserProfile = {
      ...userToLogin,
      id: uid,
      uid: uid,
      lastLogin: new Date().toISOString(),
    };
    saveUser(normalized);
    setCurrentUser(normalized);

    // Sync to Firestore cloud database in background
    try {
      const sanitized = sanitizeForFirestore(normalized);
      setDoc(doc(db, 'users', normalized.id), sanitized, { merge: true }).catch(() => {});
      if (normalized.username) {
        setDoc(doc(db, 'users', normalized.username.toLowerCase()), sanitized, { merge: true }).catch(() => {});
      }
    } catch {}

    // Background notify server
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanIdentifier, password: trimmedPass }),
    }).catch(() => {});

    return { user: normalized };
  };

  // 1. Query Authoritative Backend Server API FIRST!
  // This ensures permissions granted or revoked by Super Admin are immediately loaded on login.
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanIdentifier, password: trimmedPass }),
    });

    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      if (data?.success && data?.user) {
        return handleSuccess(data.user);
      }
    } else {
      const errData = await resp.json().catch(() => null);
      if (resp.status === 403 || errData?.message?.includes('disabled')) {
        return { user: null, error: errData?.message || 'This account has been disabled. Please contact Super Administrator or DNO.' };
      }
      if (resp.status === 401 && errData?.message?.includes('password')) {
        return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
      }
    }
  } catch (err) {
    console.warn('[authService] Server auth unreachable, checking offline cache fallbacks:', err);
  }

  // 2. Offline Fallback: Check local storage database if server is unreachable
  const localUsers = getAllUsers();
  const localMatched = matchUserLocally(localUsers, cleanIdentifier);
  if (localMatched && isPasswordMatch(localMatched, trimmedPass)) {
    if (localMatched.isActive === false) {
      return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
    }
    return handleSuccess(localMatched);
  }

  // 1. If pre-resolved user was passed, verify password against it or local copy
  if (preResolvedUser) {
    const candidateUser = localMatched || preResolvedUser;
    if (isPasswordMatch(candidateUser, trimmedPass)) {
      if (candidateUser.isActive === false) {
        return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
      }
      return handleSuccess(candidateUser);
    }
  }

  // 2. Instant match for Master Super Admin (shrinath / super_admin_shrinath / shri@8975)
  if (
    (trimmedUser === 'shrinath' ||
      trimmedUser === 'shri123' ||
      trimmedUser === 'shri' ||
      trimmedUser === 'super_admin_shrinath' ||
      trimmedUser === 'shrinathyg@gmail.com' ||
      trimmedUser.replace(/\D/g, '') === '9822089750') &&
    (trimmedPass === 'shri@8975' || trimmedPass.toLowerCase() === 'shri@8975')
  ) {
    return handleSuccess(localMatched || SUPER_ADMIN_USER);
  }

  // 3. Fallback for Master DNO if not customized (dno / dno_washim_admin / dno1)
  if (
    (trimmedUser === 'dno' ||
      trimmedUser === 'dno_washim_admin' ||
      trimmedUser === 'dno.washim@cetcell.mah.gov.in') &&
    (trimmedPass.toLowerCase() === 'dno1' || trimmedPass === '123456')
  ) {
    return handleSuccess(localMatched || DNO_USER);
  }

  // 4. Fallback for Master Supporting Staff if not customized (staff / staff_operator_1 / staff123)
  if (
    (trimmedUser === 'staff' ||
      trimmedUser === 'staff_operator_1' ||
      trimmedUser === 'staff.washim@cetcell.mah.gov.in') &&
    (trimmedPass.toLowerCase() === 'staff123' || trimmedPass.toLowerCase() === 'staff1' || trimmedPass === '123456')
  ) {
    return handleSuccess(localMatched || DEFAULT_STAFF_USER);
  }

  // 5. Check official portal seed baseline for immediate fallback
  const officialMatch = matchUserLocally(OFFICIAL_PORTAL_USERS, cleanIdentifier);
  if (officialMatch && isPasswordMatch(officialMatch, trimmedPass)) {
    if (officialMatch.isActive === false) {
      return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
    }
    return handleSuccess(localMatched || officialMatch);
  }

  // 6. Try Firebase Authentication (signInWithEmailAndPassword)
  const candidateEmail = cleanIdentifier.includes('@')
    ? cleanIdentifier
    : localMatched?.email || officialMatch?.email;

  if (candidateEmail) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, candidateEmail, trimmedPass);
      const fbUser = userCredential.user;
      if (fbUser && fbUser.uid) {
        // UID retrieved successfully from Firebase Auth!
        // Retrieve matching Firestore document
        let cloudProfile: UserProfile | null = null;
        try {
          const docSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (docSnap.exists()) {
            const d = docSnap.data() as any;
            cloudProfile = { ...d, id: fbUser.uid, uid: fbUser.uid };
          }
        } catch {}

        if (!cloudProfile && localMatched) {
          cloudProfile = { ...localMatched, id: fbUser.uid, uid: fbUser.uid };
        } else if (!cloudProfile && officialMatch) {
          cloudProfile = { ...officialMatch, id: fbUser.uid, uid: fbUser.uid };
        } else if (!cloudProfile) {
          cloudProfile = {
            id: fbUser.uid,
            uid: fbUser.uid,
            username: fbUser.displayName || candidateEmail.split('@')[0],
            password: trimmedPass,
            fullName: fbUser.displayName || candidateEmail.split('@')[0],
            designation: 'Staff Member',
            role: 'supporting_staff',
            allowedTabs: ['dashboard', 'visitors', 'students', 'profile'],
            allowedFeatures: ['whatsapp_tool', 'add_visitor', 'ticket_generator_tool'],
            isActive: true,
            createdAt: new Date().toISOString(),
            email: candidateEmail,
          };
        }

        return handleSuccess(cloudProfile);
      }
    } catch (fbAuthErr: any) {
      // Firebase auth failed or user not in Firebase Auth; fall back smoothly to Firestore & custom auth
    }
  }

  // 7. Check Firestore directly using targeted single-doc and query lookups (avoids 429 quota exhaustion)
  const idCandidates = [cleanIdentifier, trimmedUser];
  for (const docKey of idCandidates) {
    if (!docKey) continue;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000)
      );
      const snap = await Promise.race([getDoc(doc(db, 'users', docKey)), timeoutPromise]);
      if (snap.exists()) {
        const d = snap.data() as any;
        const uid = d.id || d.uid || snap.id;
        const candidate: UserProfile = {
          ...d,
          id: uid,
          uid: uid,
          username: d.username || snap.id,
        };
        if (isPasswordMatch(candidate, trimmedPass)) {
          if (candidate.isActive === false) {
            return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
          }
          return handleSuccess(candidate);
        } else {
          return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
        }
      }
    } catch {}
  }

  // Targeted query by username
  try {
    const qUser = query(collection(db, 'users'), where('username', '==', trimmedUser), limit(1));
    const snap = await Promise.race([
      getDocs(qUser),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 2000))
    ]);
    if (!snap.empty) {
      const docRef = snap.docs[0];
      const d = docRef.data() as any;
      const uid = d.id || d.uid || docRef.id;
      const candidate: UserProfile = {
        ...d,
        id: uid,
        uid: uid,
        username: d.username || docRef.id,
      };
      if (isPasswordMatch(candidate, trimmedPass)) {
        if (candidate.isActive === false) {
          return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
        }
        return handleSuccess(candidate);
      } else {
        return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
      }
    }
  } catch {}

  // Targeted query by email
  if (cleanIdentifier.includes('@')) {
    try {
      const qEmail = query(collection(db, 'users'), where('email', '==', cleanIdentifier.toLowerCase()), limit(1));
      const snap = await Promise.race([
        getDocs(qEmail),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 2000))
      ]);
      if (!snap.empty) {
        const docRef = snap.docs[0];
        const d = docRef.data() as any;
        const uid = d.id || d.uid || docRef.id;
        const candidate: UserProfile = {
          ...d,
          id: uid,
          uid: uid,
          username: d.username || docRef.id,
        };
        if (isPasswordMatch(candidate, trimmedPass)) {
          if (candidate.isActive === false) {
            return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
          }
          return handleSuccess(candidate);
        } else {
          return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
        }
      }
    } catch {}
  }

  // Targeted query by id or uid field
  try {
    const qId = query(collection(db, 'users'), where('id', '==', cleanIdentifier), limit(1));
    const snap = await Promise.race([
      getDocs(qId),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 2000))
    ]);
    if (!snap.empty) {
      const docRef = snap.docs[0];
      const d = docRef.data() as any;
      const uid = d.id || d.uid || docRef.id;
      const candidate: UserProfile = {
        ...d,
        id: uid,
        uid: uid,
        username: d.username || docRef.id,
      };
      if (isPasswordMatch(candidate, trimmedPass)) {
        if (candidate.isActive === false) {
          return { user: null, error: 'This account has been disabled. Please contact Super Administrator or DNO.' };
        }
        return handleSuccess(candidate);
      } else {
        return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
      }
    }
  } catch {}

  // 8. Query persistent server authentication endpoint
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanIdentifier, password: trimmedPass }),
    });

    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.success && data?.user) {
      const authedUser = data.user as UserProfile;
      return handleSuccess(authedUser);
    }
  } catch (err) {
    console.warn('Server auth call notice:', err);
  }

  // 9. If user matched locally or in seed, but password failed:
  if (localMatched && !isPasswordMatch(localMatched, trimmedPass)) {
    return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
  }
  if (officialMatch && !isPasswordMatch(officialMatch, trimmedPass)) {
    return { user: null, error: 'Invalid password. Please enter the correct password provided by Super Administrator or DNO.' };
  }

  return { user: null, error: 'Invalid User ID. Please check the login ID provided by Super Administrator or DNO.' };
}

/**
 * Asynchronous authentication that queries persistent server API,
 * local storage cache, and live Firestore database.
 * This guarantees any user created on any laptop can log in immediately!
 */
export async function authenticateAsync(username: string, pass: string, preResolvedUser?: UserProfile | null): Promise<UserProfile | null> {
  const result = await authenticateWithResultAsync(username, pass, preResolvedUser);
  return result.user;
}

export function authenticate(username: string, pass: string): UserProfile | null {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = pass.trim();

  // Instant match for Super Admin
  if (
    (trimmedUser === 'shrinath' ||
      trimmedUser === 'shri123' ||
      trimmedUser === 'shri' ||
      trimmedUser === 'super_admin_shrinath' ||
      trimmedUser === 'shrinathyg@gmail.com') &&
    trimmedPass === 'shri@8975'
  ) {
    const updated = { ...SUPER_ADMIN_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  const users = getAllUsers();
  const user = users.find(
    (u) =>
      (u.username?.toLowerCase() === trimmedUser || u.id?.toLowerCase() === trimmedUser || (u.uid && u.uid.toLowerCase() === trimmedUser)) &&
      isPasswordMatch(u, trimmedPass) &&
      u.isActive !== false
  );

  if (user) {
    const updated = { ...user, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  if (trimmedUser === 'dno' && (trimmedPass === 'dno1' || trimmedPass === '123456')) {
    const updated = { ...DNO_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  if (trimmedUser === 'staff' && (trimmedPass === 'staff123' || trimmedPass === 'staff1' || trimmedPass === '123456')) {
    const updated = { ...DEFAULT_STAFF_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  const official = OFFICIAL_PORTAL_USERS.find(
    (u) =>
      (u.username?.toLowerCase() === trimmedUser || u.id?.toLowerCase() === trimmedUser || (u.uid && u.uid.toLowerCase() === trimmedUser)) &&
      isPasswordMatch(u, trimmedPass) &&
      u.isActive !== false
  );
  if (official) {
    const updated = { ...official, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  return null;
}

export async function refreshUserPermissionsFromBackend(user: UserProfile): Promise<UserProfile | null> {
  if (!user) return null;
  const identifier = user.username || user.id;
  if (!identifier) return null;

  try {
    const res = await fetch(`/api/users/lookup/${encodeURIComponent(identifier)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.user) {
        const backendUser = data.user as UserProfile;
        const curVer = user.permissionVersion || 0;
        const backendVer = backendUser.permissionVersion || 0;
        const tabsChanged = JSON.stringify(backendUser.allowedTabs) !== JSON.stringify(user.allowedTabs);
        const featuresChanged = JSON.stringify(backendUser.allowedFeatures) !== JSON.stringify(user.allowedFeatures);
        const statusChanged = backendUser.isActive !== user.isActive;

        if (backendVer > curVer || tabsChanged || featuresChanged || statusChanged) {
          const merged: UserProfile = {
            ...user,
            ...backendUser,
            allowedTabs: backendUser.allowedTabs,
            allowedFeatures: backendUser.allowedFeatures,
            isActive: backendUser.isActive,
            permissionVersion: Math.max(backendVer, curVer),
          };
          setCurrentUser(merged);
          const all = getAllUsers();
          const idx = all.findIndex((u) => u.id === merged.id || u.username.toLowerCase() === merged.username.toLowerCase());
          if (idx >= 0) {
            all[idx] = { ...all[idx], ...merged };
          } else {
            all.push(merged);
          }
          safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all));
          notifyUserSubscribers(all);
          return merged;
        }
      }
    }
  } catch (e) {
    console.warn('[authService] refreshUserPermissionsFromBackend notice:', e);
  }
  return null;
}

export async function findUserByUsername(username: string): Promise<UserProfile | null> {
  const clean = String(username || '').trim();
  const trimmed = clean.toLowerCase();
  if (!trimmed) return null;

  // 1. Query persistent server API first for authoritative dynamically updated user
  try {
    const res = await fetch(`/api/users/lookup/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.found && data?.user) {
        const u = data.user as UserProfile;
        const all = getAllUsers();
        const idx = all.findIndex((x) => x.id === u.id || x.username?.toLowerCase() === u.username?.toLowerCase());
        if (idx >= 0) all[idx] = u; else all.push(u);
        safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all));
        return u;
      }
    }
  } catch {}

  // 2. Fall back to local storage cache if offline
  const localUsers = getAllUsers();
  const localFound = matchUserLocally(localUsers, clean);
  if (localFound) return localFound;

  // 3. Check official portal seed baseline
  const official = matchUserLocally(OFFICIAL_PORTAL_USERS, clean);
  if (official) return official;

  // 4. Default accounts fallback only if not in database
  if (
    trimmed === 'shrinath' ||
    trimmed === 'shri123' ||
    trimmed === 'shri' ||
    trimmed === 'super_admin_shrinath' ||
    trimmed === 'shrinathyg@gmail.com' ||
    trimmed.replace(/\D/g, '') === '9822089750'
  ) {
    return SUPER_ADMIN_USER;
  }
  if (
    trimmed === 'dno' ||
    trimmed === 'dno_washim_admin' ||
    trimmed === 'dno.washim@cetcell.mah.gov.in'
  ) {
    return DNO_USER;
  }
  if (
    trimmed === 'staff' ||
    trimmed === 'staff_operator_1' ||
    trimmed === 'staff.washim@cetcell.mah.gov.in'
  ) {
    return DEFAULT_STAFF_USER;
  }

  // Helper to cache in localStorage
  const cacheUserLocally = (candidate: UserProfile) => {
    const all = getAllUsers();
    const idx = all.findIndex((u) => u.id === candidate.id || (u.uid && u.uid === candidate.id) || u.username.toLowerCase() === candidate.username.toLowerCase());
    if (idx >= 0) all[idx] = candidate; else all.push(candidate);
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all));
  };

  // 4. Targeted single document lookup in Firestore (by UID, username, or email)
  const candidateKeys = [clean, trimmed];
  for (const docKey of candidateKeys) {
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'users', docKey)),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 1500))
      ]);
      if (snap.exists()) {
        const d = snap.data() as any;
        const uid = d.id || d.uid || snap.id;
        const candidate: UserProfile = {
          ...d,
          id: uid,
          uid: uid,
          username: d.username || snap.id,
        };
        cacheUserLocally(candidate);
        return candidate;
      }
    } catch {}
  }

  // 5. Targeted query by username in Firestore with limit(1)
  try {
    const qUser = query(collection(db, 'users'), where('username', '==', trimmed), limit(1));
    const snap = await Promise.race([
      getDocs(qUser),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 1500))
    ]);
    if (!snap.empty) {
      const d = snap.docs[0].data() as any;
      const uid = d.id || d.uid || snap.docs[0].id;
      const candidate: UserProfile = {
        ...d,
        id: uid,
        uid: uid,
        username: d.username || snap.docs[0].id,
      };
      cacheUserLocally(candidate);
      return candidate;
    }
  } catch {}

  // 6. Targeted query by email in Firestore
  if (clean.includes('@')) {
    try {
      const qEmail = query(collection(db, 'users'), where('email', '==', clean.toLowerCase()), limit(1));
      const snap = await Promise.race([
        getDocs(qEmail),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 1500))
      ]);
      if (!snap.empty) {
        const d = snap.docs[0].data() as any;
        const uid = d.id || d.uid || snap.docs[0].id;
        const candidate: UserProfile = {
          ...d,
          id: uid,
          uid: uid,
          username: d.username || snap.docs[0].id,
        };
        cacheUserLocally(candidate);
        return candidate;
      }
    } catch {}
  }

  // 7. Targeted query by id or uid in Firestore
  try {
    const qId = query(collection(db, 'users'), where('id', '==', clean), limit(1));
    const snap = await Promise.race([
      getDocs(qId),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 1500))
    ]);
    if (!snap.empty) {
      const d = snap.docs[0].data() as any;
      const uid = d.id || d.uid || snap.docs[0].id;
      const candidate: UserProfile = {
        ...d,
        id: uid,
        uid: uid,
        username: d.username || snap.docs[0].id,
      };
      cacheUserLocally(candidate);
      return candidate;
    }
  } catch {}

  // 8. Check persistent server lookup (try query param then path segment)
  try {
    const resp = await fetch(`/api/users/lookup?username=${encodeURIComponent(clean)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.found && data.user) {
        cacheUserLocally(data.user);
        return data.user;
      }
    }
  } catch {}

  try {
    const resp = await fetch(`/api/users/lookup/${encodeURIComponent(clean)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.found && data.user) {
        cacheUserLocally(data.user);
        return data.user;
      }
    }
  } catch {}

  return null;
}

const LAST_ACTIVE_KEY = 'vmk_last_active_time';
// Inactivity timeout disabled per user request
export const INACTIVITY_TIMEOUT_MS = 0;

export function updateLastActiveTime(): void {
  try {
    safeStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {}
}

export function isSessionExpired(): boolean {
  // Session timeout is completely disabled per user request
  return false;
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = safeStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user: UserProfile = JSON.parse(raw);
    if (user && (user.role === 'super_admin' || user.username.toLowerCase() === 'shrinath')) {
      user.allowedTabs = ['user_management', 'profile'];
      user.allowedFeatures = [];
    }
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  if (user) {
    safeStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    safeStorage.setItem('vmk_auth_token', `logged_in_${user.username}`);
    updateLastActiveTime();
  } else {
    safeStorage.removeItem(CURRENT_USER_KEY);
    safeStorage.removeItem('vmk_auth_token');
    safeStorage.removeItem('vmk_auth_time');
    safeStorage.removeItem(LAST_ACTIVE_KEY);
  }
}

// -------------------------------------------------------------
// STUDENT RECORDS MANAGEMENT & CLOUD SYNC
// -------------------------------------------------------------

export function getStudentRecords(): StudentRecord[] {
  try {
    const raw = safeStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function subscribeToStudents(callback: (records: StudentRecord[]) => void): () => void {
  studentSubscribers.push(callback);
  callback(getStudentRecords());
  return () => {
    const idx = studentSubscribers.indexOf(callback);
    if (idx >= 0) studentSubscribers.splice(idx, 1);
  };
}

export function saveStudentRecord(record: StudentRecord): void {
  try {
    const records = getStudentRecords();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.unshift(record);
    }
    safeStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(records));
    studentSubscribers.forEach((cb) => cb(records));

    // Cloud sync
    setDoc(doc(db, 'students', record.id), sanitizeForFirestore(record), { merge: true }).catch((e) => {
      console.warn('Firestore saveStudent sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error saving student record:', err);
  }
}

export function deleteStudentRecord(id: string): void {
  try {
    const records = getStudentRecords().filter((r) => r.id !== id);
    safeStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(records));
    studentSubscribers.forEach((cb) => cb(records));

    // Cloud sync
    deleteDoc(doc(db, 'students', id)).catch((e) => {
      console.warn('Firestore deleteStudent sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error deleting student record:', err);
  }
}

// -------------------------------------------------------------
// CENTER NOTICES MANAGEMENT & CLOUD SYNC
// -------------------------------------------------------------

export function getCenterNotices(): CenterNotice[] {
  try {
    const raw = safeStorage.getItem(NOTICES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function subscribeToNotices(callback: (notices: CenterNotice[]) => void): () => void {
  noticeSubscribers.push(callback);
  callback(getCenterNotices());
  return () => {
    const idx = noticeSubscribers.indexOf(callback);
    if (idx >= 0) noticeSubscribers.splice(idx, 1);
  };
}

export function saveCenterNotice(notice: CenterNotice): void {
  try {
    const notices = getCenterNotices();
    const idx = notices.findIndex((n) => n.id === notice.id);
    if (idx >= 0) {
      notices[idx] = notice;
    } else {
      notices.unshift(notice);
    }
    safeStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices));
    noticeSubscribers.forEach((cb) => cb(notices));

    // Cloud sync
    setDoc(doc(db, 'notices', notice.id), sanitizeForFirestore(notice), { merge: true }).catch((e) => {
      console.warn('Firestore saveNotice sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error saving notice:', err);
  }
}

export function deleteCenterNotice(id: string): void {
  try {
    const notices = getCenterNotices().filter((n) => n.id !== id);
    safeStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices));
    noticeSubscribers.forEach((cb) => cb(notices));

    // Cloud sync
    deleteDoc(doc(db, 'notices', id)).catch((e) => {
      console.warn('Firestore deleteNotice sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error deleting notice:', err);
  }
}

// -------------------------------------------------------------
// VISITORS REGISTER MANAGEMENT & CLOUD SYNC
// -------------------------------------------------------------

export function getVisitorRecords(): VisitorRecord[] {
  try {
    const raw = safeStorage.getItem(VISITORS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function subscribeToVisitors(callback: (visitors: VisitorRecord[]) => void): () => void {
  visitorSubscribers.push(callback);
  callback(getVisitorRecords());
  return () => {
    const idx = visitorSubscribers.indexOf(callback);
    if (idx >= 0) visitorSubscribers.splice(idx, 1);
  };
}

export function saveVisitorRecord(record: VisitorRecord): void {
  try {
    const records = getVisitorRecords();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.unshift(record);
    }
    safeStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
    visitorSubscribers.forEach((cb) => cb(records));

    // Cloud sync
    setDoc(doc(db, 'visitors', record.id), sanitizeForFirestore(record), { merge: true }).catch((e) => {
      console.warn('Firestore saveVisitor sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error saving visitor record:', err);
  }
}

export function deleteVisitorRecord(id: string): void {
  try {
    const records = getVisitorRecords().filter((r) => r.id !== id);
    safeStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
    visitorSubscribers.forEach((cb) => cb(records));

    // Cloud sync
    deleteDoc(doc(db, 'visitors', id)).catch((e) => {
      console.warn('Firestore deleteVisitor sync error:', e?.message);
    });
  } catch (err) {
    console.error('Error deleting visitor record:', err);
  }
}

export function checkoutVisitor(id: string, checkOutTime?: string): void {
  try {
    const records = getVisitorRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx >= 0) {
      const nowTime = checkOutTime || new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      records[idx] = {
        ...records[idx],
        checkOutTime: nowTime,
        status: 'Checked Out',
      };
      safeStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
      visitorSubscribers.forEach((cb) => cb(records));

      // Cloud sync
      setDoc(doc(db, 'visitors', id), sanitizeForFirestore(records[idx]), { merge: true }).catch((e) => {
        console.warn('Firestore checkoutVisitor sync error:', e?.message);
      });
    }
  } catch (err) {
    console.error('Error checking out visitor:', err);
  }
}

export function getNextVisitorSrNo(): number {
  const records = getVisitorRecords();
  if (records.length === 0) return 1;
  const maxSr = Math.max(...records.map((r) => (typeof r.srNo === 'number' ? r.srNo : 0)));
  return maxSr + 1;
}
