import {
  UserProfile,
  StudentRecord,
  CenterNotice,
  VisitorRecord,
  TabPermission,
  FeaturePermission,
} from '../types/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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
const CURRENT_USER_KEY = 'vmk_current_logged_user';
const STUDENTS_STORAGE_KEY = 'vmk_students_records_v1';
const NOTICES_STORAGE_KEY = 'vmk_center_notices_v1';
const VISITORS_STORAGE_KEY = 'vmk_visitors_records_v1';

// Default Master Super Admin Account (Root Administrator for all districts)
export const SUPER_ADMIN_USER: UserProfile = {
  id: 'super_admin_shrinath',
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
  username: 'dno',
  password: 'dno1',
  fullName: 'Mr. Shrinath Ghodake',
  designation: 'District Nodal Officer (DNO)',
  role: 'dno',
  district: 'Washim',
  allowedTabs: [
    'dashboard',
    'visitors',
    'tickets',
    'students',
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
  username: 'staff',
  password: 'staff123',
  fullName: 'Pooja Deshmukh',
  designation: 'Supporting Staff (Reception & Verification Desk)',
  role: 'supporting_staff',
  district: 'Washim',
  allowedTabs: [
    'dashboard',
    'visitors',
    'students',
    'profile',
  ],
  allowedFeatures: [
    'whatsapp_tool',
    'qr_upload_tool',
    'ticket_generator_tool',
    'add_candidate',
    'add_visitor',
    'export_reports',
  ],
  canUseApiKey: false,
  isActive: true,
  createdAt: '2026-08-25T00:00:00.000Z',
  phone: '+91 98220 12345',
  email: 'staff.washim@cetcell.mah.gov.in',
};

// Available system tabs with display labels and icons
export const AVAILABLE_TABS: { id: TabPermission; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Core tools access & verification activity' },
  { id: 'visitors', label: 'Visitors Entry Register', description: 'Record visitor entry form, check-in/out & directory' },
  { id: 'tickets', label: 'Counsellor Tickets', description: 'Grievance, inquiry & WhatsApp tickets created by counsellors' },
  { id: 'students', label: 'Students Directory', description: 'Candidate registration, records & scrutiny status' },
  { id: 'settings', label: 'Center Settings', description: 'Center identity, DNO details & preferences' },
  { id: 'profile', label: 'Operator Profile', description: 'Account details and session information' },
  { id: 'user_management', label: 'User Management', description: 'Create & manage staff profiles and rule permissions' },
  { id: 'google_sheets', label: 'Google Sheets (DNO Admin)', description: 'Live cloud spreadsheet synchronization & export (Passcode: dno1)' },
];

export const AVAILABLE_FEATURES: { id: FeaturePermission; label: string; description: string }[] = [
  { id: 'whatsapp_tool', label: 'WhatApp Ticket', description: 'Direct WhatsApp ticket generator & notice dispatch' },
  { id: 'qr_upload_tool', label: 'Files by QR', description: 'Instant mobile QR code camera sync for candidate document uploads' },
  { id: 'ticket_generator_tool', label: 'SAC Ticket Generator', description: 'Official CET/CAP candidate grievance & scrutiny ticket desk' },
  { id: 'img_to_pdf_tool', label: 'Image to PDF', description: 'Convert candidate image documents to multi-page PDF' },
  { id: 'image_to_text_tool', label: 'Image to Text (AI)', description: 'Extract Marathi, Hindi & English printed or handwritten text with multimodal AI vision' },
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
 * Check whether a user is authorized to access a given portal tab
 */
export function hasTabPermission(user: UserProfile | null | undefined, tab: TabPermission): boolean {
  if (!user) return false;
  const isSuperAdmin = user.role === 'super_admin' || user.username.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    // Super Administrator has MASTER access across ALL portal tabs
    return true;
  }
  const isDno = user.role === 'dno' || user.username.toLowerCase() === 'dno';
  if (isDno) {
    return true;
  }
  // Supporting staff and operators always have full access to visitors directory
  if (tab === 'visitors' && (user.role === 'supporting_staff' || user.role === 'operator')) {
    return true;
  }
  // Counsellors always have access to tickets directory to see their created tickets
  if (tab === 'tickets' && user.role === 'counsellor') {
    return true;
  }
  return Array.isArray(user.allowedTabs) ? user.allowedTabs.includes(tab) : false;
}

/**
 * Check whether a user has been granted a specific interactive tool/feature permission
 */
export function hasFeaturePermission(user: UserProfile | null | undefined, feature: FeaturePermission): boolean {
  if (!user) return false;
  const isSuperAdmin = user.role === 'super_admin' || user.username.toLowerCase() === 'shrinath';
  if (isSuperAdmin) {
    // Super Administrator has MASTER access across ALL interactive tools and utilities
    return true;
  }
  // Counsellors always have permission for ticket generator tool
  if (feature === 'ticket_generator_tool' && user.role === 'counsellor') {
    return true;
  }
  if (Array.isArray(user.allowedFeatures)) {
    return user.allowedFeatures.includes(feature);
  }
  // Fallback for root DNO
  return user.role === 'dno' || user.username.toLowerCase() === 'dno';
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
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let parsed: UserProfile[] = [];
    if (!raw) {
      parsed = [SUPER_ADMIN_USER, DNO_USER];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
    parsed = JSON.parse(raw);

    let modified = false;

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
      parsed[superAdminIndex].allowedTabs = ['user_management', 'profile'];
      parsed[superAdminIndex].allowedFeatures = [];
      modified = true;
    }

    // Ensure DNO always exists and has google_sheets & tickets tab
    const dnoIndex = parsed.findIndex((u) => u.username.toLowerCase() === 'dno');
    if (dnoIndex === -1) {
      parsed.push(DNO_USER);
      modified = true;
    } else {
      if (!parsed[dnoIndex].allowedTabs.includes('google_sheets')) {
        parsed[dnoIndex].allowedTabs.push('google_sheets');
        modified = true;
      }
      if (!parsed[dnoIndex].allowedTabs.includes('tickets')) {
        parsed[dnoIndex].allowedTabs.push('tickets');
        modified = true;
      }
      if (!parsed[dnoIndex].district) {
        parsed[dnoIndex].district = 'Washim';
        modified = true;
      }
    }

    // Ensure Default Supporting Staff user always exists and has visitors access
    const staffIndex = parsed.findIndex((u) => u.username.toLowerCase() === 'staff');
    if (staffIndex === -1) {
      parsed.push(DEFAULT_STAFF_USER);
      modified = true;
    } else {
      if (!parsed[staffIndex].allowedTabs.includes('visitors')) {
        parsed[staffIndex].allowedTabs.push('visitors');
        modified = true;
      }
      if (!parsed[staffIndex].allowedFeatures.includes('add_visitor')) {
        parsed[staffIndex].allowedFeatures.push('add_visitor');
        modified = true;
      }
      if (!parsed[staffIndex].allowedFeatures.includes('export_reports')) {
        parsed[staffIndex].allowedFeatures.push('export_reports');
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (err) {
    console.error('Error reading users from storage:', err);
    return [SUPER_ADMIN_USER, DNO_USER, DEFAULT_STAFF_USER];
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
          snapshot.forEach((d) => {
            const data = d.data() as UserProfile;
            if (data && data.username) {
              firestoreUsers.push({ ...data, id: d.id });
            }
          });

          // Ensure Super Admin is present
          const hasSuperAdmin = firestoreUsers.some((u) => u.username.toLowerCase() === 'shrinath');
          if (!hasSuperAdmin) {
            firestoreUsers.unshift(SUPER_ADMIN_USER);
            setDoc(doc(db, 'users', SUPER_ADMIN_USER.id), sanitizeForFirestore(SUPER_ADMIN_USER), { merge: true }).catch(() => {});
          }

          // Ensure DNO is present
          const hasDno = firestoreUsers.some((u) => u.username.toLowerCase() === 'dno');
          if (!hasDno) {
            firestoreUsers.push(DNO_USER);
            // Also write DNO to Firestore for consistency
            setDoc(doc(db, 'users', DNO_USER.id), sanitizeForFirestore(DNO_USER), { merge: true }).catch(() => {});
          }

          // Ensure Default Supporting Staff is present
          const hasStaff = firestoreUsers.some((u) => u.username.toLowerCase() === 'staff');
          if (!hasStaff) {
            firestoreUsers.push(DEFAULT_STAFF_USER);
            setDoc(doc(db, 'users', DEFAULT_STAFF_USER.id), sanitizeForFirestore(DEFAULT_STAFF_USER), { merge: true }).catch(() => {});
          }

          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(firestoreUsers));
          notifyUserSubscribers(firestoreUsers);

          // Update current active user session if modified
          const current = getCurrentUser();
          if (current) {
            const updatedCurrent = firestoreUsers.find((u) => u.id === current.id);
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
          localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(list));
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
          localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(list));
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
          localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(list));
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
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
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
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
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

export async function saveUserAsync(user: UserProfile): Promise<{ success: boolean; message: string }> {
  try {
    let cleanUser: UserProfile = {
      ...user,
      id: user.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username: user.username.trim().toLowerCase(),
      fullName: user.fullName?.trim() || user.username.trim(),
    };

    // 1. Post to persistent server API first
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUser),
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.success && data?.user) {
        cleanUser = data.user;
      } else if (data && !data.success && data.message) {
        // Only error out if the server reported a real conflict like duplicate username
        if (data.message.includes('already in use')) {
          return { success: false, message: data.message };
        }
      }
    } catch (e: any) {
      console.warn('Server user save network notice, saving locally:', e?.message);
    }

    // 2. Update local storage & subscribers
    const users = getAllUsers();
    const existingIndex = users.findIndex(
      (u) => u.id === cleanUser.id || u.username?.toLowerCase() === cleanUser.username.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...cleanUser };
      if (!cleanUser.profilePicture) {
        delete users[existingIndex].profilePicture;
      }
    } else {
      users.push(cleanUser);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Update current session if the edited user is currently logged in
    const currentUser = getCurrentUser();
    if (currentUser && (currentUser.id === cleanUser.id || currentUser.username.toLowerCase() === cleanUser.username.toLowerCase())) {
      setCurrentUser(cleanUser);
    }

    // 3. Save directly to Firestore cloud database if quota allows
    try {
      const sanitized = sanitizeForFirestore(cleanUser);
      await setDoc(doc(db, 'users', cleanUser.id), sanitized, { merge: true });
      if (cleanUser.username) {
        await setDoc(doc(db, 'users', cleanUser.username.toLowerCase()), sanitized, { merge: true });
      }
    } catch (e: any) {
      // Gracefully handle Firestore quota/offline
    }

    return { success: true, message: 'User profile saved successfully across all systems.' };
  } catch (err: any) {
    console.error('Error saving user:', err);
    return { success: false, message: err?.message || 'Failed to save user profile.' };
  }
}

export function saveUser(user: UserProfile): { success: boolean; message: string } {
  try {
    const users = getAllUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id);

    // Check duplicate username for another user
    const usernameTaken = users.some(
      (u) => u.username.toLowerCase() === user.username.toLowerCase() && u.id !== user.id
    );
    if (usernameTaken) {
      return { success: false, message: `Username "${user.username}" is already taken.` };
    }

    const cleanUser: UserProfile = {
      ...user,
      username: user.username.trim().toLowerCase(),
      fullName: user.fullName?.trim() || user.username.trim(),
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
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Update current session if the edited user is currently logged in
    const currentUser = getCurrentUser();
    if (currentUser && (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase())) {
      setCurrentUser(cleanUser);
    }

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

export async function deleteUserAsync(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (
      userId === SUPER_ADMIN_USER.id ||
      userId === 'super_admin_shrinath' ||
      userId === 'shrinath'
    ) {
      return { success: false, message: 'The Super Administrator profile cannot be deleted.' };
    }

    // 1. Delete on persistent server
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server user delete notice:', e);
    }

    // 2. Remove from local storage
    const users = getAllUsers().filter((u) => u.id !== userId && u.username?.toLowerCase() !== userId.toLowerCase());
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // 3. Remove from Firestore cloud database
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      // ignore
    }
    try {
      await deleteDoc(doc(db, 'users', userId.toLowerCase()));
    } catch (e) {
      // ignore
    }

    return { success: true, message: 'User profile deleted successfully.' };
  } catch (err) {
    console.error('Error deleting user:', err);
    return { success: false, message: 'Failed to delete user profile.' };
  }
}

export function deleteUser(userId: string): { success: boolean; message: string } {
  try {
    if (
      userId === SUPER_ADMIN_USER.id ||
      userId === 'super_admin_shrinath' ||
      userId === 'shrinath'
    ) {
      return { success: false, message: 'The Super Administrator profile cannot be deleted.' };
    }

    // Background delete on server
    fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }).catch(() => {});

    const users = getAllUsers().filter((u) => u.id !== userId && u.username?.toLowerCase() !== userId.toLowerCase());
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyUserSubscribers(users);

    // Remove from Firestore cloud database
    deleteDoc(doc(db, 'users', userId)).catch(() => {});
    deleteDoc(doc(db, 'users', userId.toLowerCase())).catch(() => {});

    return { success: true, message: 'User profile deleted successfully.' };
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
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
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
 * Enhanced authentication that returns explicit status/error messages
 * Guarantees cross-laptop login reliability
 */
export async function authenticateWithResultAsync(
  username: string,
  pass: string
): Promise<{ user: UserProfile | null; error?: string }> {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = pass.trim();

  // 1. Instant match for Super Admin shrinath (id: shrinath, pass: shri@8975)
  if (trimmedUser === 'shrinath' && trimmedPass === 'shri@8975') {
    const updated = { ...SUPER_ADMIN_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return { user: updated };
  }

  // 2. Query persistent server authentication endpoint first
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
    });

    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.success && data?.user) {
      const authedUser = data.user as UserProfile;
      // Update local cache
      const all = getAllUsers();
      const idx = all.findIndex(
        (u) => u.id === authedUser.id || u.username.toLowerCase() === authedUser.username.toLowerCase()
      );
      if (idx >= 0) {
        all[idx] = authedUser;
      } else {
        all.push(authedUser);
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all));
      notifyUserSubscribers(all);
      setCurrentUser(authedUser);
      return { user: authedUser };
    } else if (data && !data.success && data.message) {
      // If server returned invalid password or disabled account for an existing user, return error
      if (data.message.toLowerCase().includes('password')) {
        return { user: null, error: data.message };
      }
      if (data.message.toLowerCase().includes('disabled')) {
        return { user: null, error: data.message };
      }
      // If server said user not found, continue to local and Firestore checks!
    }
  } catch (err) {
    console.warn('Server auth call failed, trying local/firestore fallback:', err);
  }

  // 3. Try local cache
  const localUsers = getAllUsers();
  const matchedUser = localUsers.find(
    (u) => u.username.toLowerCase() === trimmedUser || u.id.toLowerCase() === trimmedUser
  );

  if (matchedUser) {
    if (matchedUser.password !== trimmedPass) {
      return { user: null, error: 'Invalid password. Please try again.' };
    }
    if (matchedUser.isActive === false) {
      return { user: null, error: 'This account has been disabled. Please contact Super Administrator.' };
    }
    const updated = { ...matchedUser, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return { user: updated };
  }

  // 4. Try Firestore directly (gracefully handles quota limits)
  // Check direct document by username first
  try {
    const directDoc = await getDoc(doc(db, 'users', trimmedUser));
    if (directDoc.exists()) {
      const d = directDoc.data() as UserProfile;
      if (d && d.username) {
        const found = { ...d, id: d.id || directDoc.id };
        if (found.password !== trimmedPass) {
          return { user: null, error: 'Invalid password. Please try again.' };
        }
        if (found.isActive === false) {
          return { user: null, error: 'This account has been disabled. Please contact Super Administrator.' };
        }
        const updated = { ...found, lastLogin: new Date().toISOString() };
        saveUser(updated);
        setCurrentUser(updated);
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});
        return { user: updated };
      }
    }
  } catch (err) {
    // direct get fallback
  }

  // Check entire Firestore users collection
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    if (!snapshot.empty) {
      const cloudUsers: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as UserProfile;
        if (data && data.username) {
          cloudUsers.push({ ...data, id: data.id || d.id });
        }
      });

      if (cloudUsers.length > 0) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cloudUsers));
        notifyUserSubscribers(cloudUsers);
      }

      const cloudMatch = cloudUsers.find(
        (u) => u.username.toLowerCase() === trimmedUser || u.id.toLowerCase() === trimmedUser
      );

      if (cloudMatch) {
        if (cloudMatch.password !== trimmedPass) {
          return { user: null, error: 'Invalid password. Please try again.' };
        }
        if (cloudMatch.isActive === false) {
          return { user: null, error: 'This account has been disabled. Please contact Super Administrator.' };
        }
        const updated = { ...cloudMatch, lastLogin: new Date().toISOString() };
        saveUser(updated);
        setCurrentUser(updated);
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});
        return { user: updated };
      }
    }
  } catch (err) {
    // Firestore quota exceeded or offline
  }

  // Check root DNO and staff default fallbacks
  if (trimmedUser === 'dno') {
    if (trimmedPass === 'dno1' || trimmedPass === '123456') {
      const updated = { ...DNO_USER, lastLogin: new Date().toISOString() };
      saveUser(updated);
      setCurrentUser(updated);
      return { user: updated };
    } else {
      return { user: null, error: 'Invalid password. Please try again.' };
    }
  }

  if (trimmedUser === 'staff') {
    if (trimmedPass === 'staff1' || trimmedPass === '123456') {
      const updated = { ...DEFAULT_STAFF_USER, lastLogin: new Date().toISOString() };
      saveUser(updated);
      setCurrentUser(updated);
      return { user: updated };
    } else {
      return { user: null, error: 'Invalid password. Please try again.' };
    }
  }

  return { user: null, error: 'Invalid User ID. Please check your username.' };
}

/**
 * Asynchronous authentication that queries persistent server API,
 * local storage cache, and live Firestore database.
 * This guarantees any user created on any laptop can log in immediately!
 */
export async function authenticateAsync(username: string, pass: string): Promise<UserProfile | null> {
  const result = await authenticateWithResultAsync(username, pass);
  return result.user;
}

export function authenticate(username: string, pass: string): UserProfile | null {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = pass.trim();

  // Instant match for Super Admin
  if (trimmedUser === 'shrinath' && trimmedPass === 'shri@8975') {
    const updated = { ...SUPER_ADMIN_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  const users = getAllUsers();

  const user = users.find(
    (u) => u.username.toLowerCase() === trimmedUser && u.password === trimmedPass && u.isActive
  );

  if (user) {
    const updated = { ...user, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  if (trimmedUser === 'dno' && trimmedPass === 'dno1') {
    const updated = { ...DNO_USER, lastLogin: new Date().toISOString() };
    saveUser(updated);
    setCurrentUser(updated);
    return updated;
  }

  return null;
}

export async function findUserByUsername(username: string): Promise<UserProfile | null> {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed === 'shrinath' || trimmed === 'shri123') return SUPER_ADMIN_USER;
  if (trimmed === 'dno') return DNO_USER;

  // 1. Check persistent server lookup
  try {
    const resp = await fetch(`/api/users/lookup/${encodeURIComponent(trimmed)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.found && data.user) {
        return data.user;
      }
    }
  } catch (e) {
    // Ignore server error and fallback
  }

  // 2. Check local memory/storage
  const localUsers = getAllUsers();
  const localFound = localUsers.find(
    (u) => u.username.toLowerCase() === trimmed || u.id.toLowerCase() === trimmed
  );
  if (localFound) return localFound;

  // 3. Query Firestore directly if not found locally
  try {
    const snap = await getDocs(collection(db, 'users'));
    let found: UserProfile | null = null;
    snap.forEach((d) => {
      const data = d.data() as UserProfile;
      if (data && (data.username?.toLowerCase() === trimmed || d.id.toLowerCase() === trimmed)) {
        found = { ...data, id: d.id };
      }
    });
    return found;
  } catch (err) {
    return null;
  }
}

const LAST_ACTIVE_KEY = 'vmk_last_active_time';
// Inactivity timeout disabled per user request
export const INACTIVITY_TIMEOUT_MS = 0;

export function updateLastActiveTime(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {}
}

export function isSessionExpired(): boolean {
  // Session timeout is completely disabled per user request
  return false;
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
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
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem('vmk_auth_token', `logged_in_${user.username}`);
    updateLastActiveTime();
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('vmk_auth_token');
    localStorage.removeItem('vmk_auth_time');
    localStorage.removeItem(LAST_ACTIVE_KEY);
  }
}

// -------------------------------------------------------------
// STUDENT RECORDS MANAGEMENT & CLOUD SYNC
// -------------------------------------------------------------

export function getStudentRecords(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
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
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(records));
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
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(records));
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
    const raw = localStorage.getItem(NOTICES_STORAGE_KEY);
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
    localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices));
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
    localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices));
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
    const raw = localStorage.getItem(VISITORS_STORAGE_KEY);
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
    localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
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
    localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
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
      localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(records));
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
