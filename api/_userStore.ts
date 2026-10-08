import fs from "fs";
import path from "path";
import { OFFICIAL_PORTAL_USERS } from "../src/data/seedUsers";

export interface StoredUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  designation: string;
  role: string;
  district: string;
  allowedTabs: string[];
  allowedFeatures: string[];
  canUseApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  phone?: string;
  email?: string;
  profilePicture?: string;
  lastLogin?: string;
}

export const DEFAULT_INITIAL_USERS: StoredUser[] = OFFICIAL_PORTAL_USERS as StoredUser[];

declare global {
  var __vmkUserStore: StoredUser[] | undefined;
}

function resolveUserFilePath(): string {
  const localDataDir = path.join(process.cwd(), "data");
  if (fs.existsSync(localDataDir)) {
    return path.join(localDataDir, "users.json");
  }
  return path.join("/tmp", "vmk_users.json");
}

export function getStoredUsers(): StoredUser[] {
  if (globalThis.__vmkUserStore && Array.isArray(globalThis.__vmkUserStore) && globalThis.__vmkUserStore.length > 0) {
    return ensureCoreAdmins(globalThis.__vmkUserStore);
  }

  const filePath = resolveUserFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        const validated = ensureCoreAdmins(list);
        globalThis.__vmkUserStore = validated;
        return validated;
      }
    }
  } catch (e) {
    console.warn("[UserStore] File read warning, falling back to default users:", e);
  }

  const seeded = ensureCoreAdmins([...DEFAULT_INITIAL_USERS]);
  globalThis.__vmkUserStore = seeded;
  saveStoredUsers(seeded);
  return seeded;
}

export function saveStoredUsers(users: StoredUser[]): void {
  const validated = ensureCoreAdmins(users);
  globalThis.__vmkUserStore = validated;

  const targetPaths = [
    path.join("/tmp", "vmk_users.json"),
    path.join(process.cwd(), "data", "users.json"),
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(validated, null, 2), "utf-8");
    } catch {
      // Ignore if directory not writable in serverless environment
    }
  }
}

function ensureCoreAdmins(list: StoredUser[]): StoredUser[] {
  const map = new Map<string, StoredUser>();

  // 1. First add all official portal users created by Super Admin & DNO
  for (const u of DEFAULT_INITIAL_USERS) {
    if (u && u.username) {
      map.set(u.username.toLowerCase(), { ...u });
    }
  }

  // 2. Overlay any runtime/saved users
  for (const u of list) {
    if (u && u.username) {
      const key = u.username.toLowerCase();
      const existing = map.get(key);
      const merged: StoredUser = {
        ...existing,
        ...u,
        username: key,
      };
      map.set(key, merged);
    }
  }

  // 3. Guarantee Super Admin credentials are protected
  const adminKey = "shrinath";
  const currentAdmin = map.get(adminKey);
  if (currentAdmin) {
    currentAdmin.password = "shri@8975";
    currentAdmin.role = "super_admin";
    currentAdmin.isActive = true;
  }

  return Array.from(map.values());
}

export function findUserByIdentifier(identifier: string): StoredUser | null {
  const raw = String(identifier || "").trim().toLowerCase();
  if (!raw) return null;

  // Support Super Admin aliases
  if (raw === "shri123" || raw === "shri" || raw === "shrinath") {
    return DEFAULT_INITIAL_USERS[0];
  }
  if (raw === "dno") {
    return DEFAULT_INITIAL_USERS[1];
  }
  if (raw === "staff") {
    return DEFAULT_INITIAL_USERS[2];
  }

  const users = getStoredUsers();

  // 1. Direct match on username or id
  const direct = users.find(
    (u) =>
      u.username?.toLowerCase() === raw ||
      u.id?.toLowerCase() === raw
  );
  if (direct) return direct;

  // 2. Match on email or username prefix (e.g. rajesh or rajesh.adcc -> rajesh.adcc@gmail.com)
  const emailMatch = users.find((u) => {
    const em = (u.email || '').toLowerCase().trim();
    const uname = (u.username || '').toLowerCase().trim();
    if (em === raw || uname === raw) return true;
    if (em.startsWith(raw + '@') || em.startsWith(raw + '.') || em.split('@')[0] === raw) return true;
    if (uname.startsWith(raw + '@') || uname.startsWith(raw + '.') || uname.split('@')[0] === raw) return true;
    return false;
  });
  if (emailMatch) return emailMatch;

  // 3. Match on phone number (digits only)
  const cleanDigits = raw.replace(/\D/g, "");
  if (cleanDigits.length >= 8) {
    const phoneMatch = users.find((u) => {
      if (!u.phone) return false;
      const uPhone = u.phone.replace(/\D/g, "");
      return uPhone === cleanDigits || uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone);
    });
    if (phoneMatch) return phoneMatch;
  }

  // 4. Match on full name
  const nameMatch = users.find(
    (u) => u.fullName && u.fullName.toLowerCase().trim() === raw
  );
  if (nameMatch) return nameMatch;

  return null;
}

export function authenticateUser(
  username: string,
  pass: string
): { success: boolean; user?: StoredUser; message?: string } {
  const cleanIdentifier = String(username || "").trim();
  const cleanPass = String(pass || "").trim();

  if (!cleanIdentifier || !cleanPass) {
    return { success: false, message: "Username and password are required." };
  }

  // Support Super Admin instant match
  const lowerId = cleanIdentifier.toLowerCase();
  if ((lowerId === "shrinath" || lowerId === "shri123") && cleanPass === "shri@8975") {
    const admin = { ...DEFAULT_INITIAL_USERS[0], lastLogin: new Date().toISOString() };
    return { success: true, user: admin };
  }

  const matched = findUserByIdentifier(cleanIdentifier);

  if (!matched) {
    return {
      success: false,
      message: "Invalid User ID. Please check the login ID provided by Super Administrator or DNO.",
    };
  }

  // Flexible password check: exact match OR case-insensitive trimmed match OR default role passwords
  const userPass = String(matched.password || "").trim();
  const isPassMatch =
    userPass === cleanPass ||
    userPass.toLowerCase() === cleanPass.toLowerCase() ||
    (matched.role === 'dno' && (cleanPass === 'dno1' || cleanPass === '123456')) ||
    (matched.role === 'supporting_staff' && (cleanPass === 'staff123' || cleanPass === 'staff1' || cleanPass === '123456'));

  if (!isPassMatch) {
    return {
      success: false,
      message: "Invalid password. Please enter the correct password provided by Super Administrator or DNO.",
    };
  }

  if (matched.isActive === false) {
    return {
      success: false,
      message: "This account has been disabled. Please contact Super Administrator or DNO.",
    };
  }

  matched.lastLogin = new Date().toISOString();
  const users = getStoredUsers();
  saveStoredUsers(users);

  return { success: true, user: matched };
}
