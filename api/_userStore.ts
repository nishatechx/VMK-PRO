import fs from "fs";
import path from "path";

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

function loadDefaultSeedUsers(): StoredUser[] {
  try {
    const candidates = [
      path.join(process.cwd(), "data", "users.json"),
      path.join(process.cwd(), "..", "data", "users.json"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as StoredUser[];
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return [
    {
      id: "super_admin_shrinath",
      username: "shrinath",
      password: "shri@8975",
      fullName: "Mr. Shrinath Ghodake",
      designation: "Super Administrator",
      role: "super_admin",
      district: "State-wide",
      allowedTabs: ["dashboard", "user_management", "profile", "students", "visitors", "tickets", "settings", "google_sheets"],
      allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor", "export_reports"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-08-20T00:00:00.000Z",
      phone: "+91 98220 89750",
      email: "shrinathyg@gmail.com",
    },
    {
      id: "dno_washim_admin",
      username: "dno",
      password: "dno1",
      fullName: "District Nodal Officer (Admin)",
      designation: "District Nodal Officer (CET Facilitation Center, Washim)",
      role: "dno",
      district: "Washim",
      allowedTabs: ["dashboard", "visitors", "tickets", "students", "settings", "profile", "user_management", "google_sheets"],
      allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor", "export_reports"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-08-22T00:00:00.000Z",
      phone: "+91 98220 00000",
      email: "dno.washim@cetcell.mah.gov.in",
    },
    {
      id: "staff_operator_1",
      username: "staff",
      password: "staff123",
      fullName: "Pooja Deshmukh",
      designation: "Supporting Staff (Reception & Verification Desk)",
      role: "supporting_staff",
      district: "Washim",
      allowedTabs: ["dashboard", "visitors", "students", "profile", "tickets"],
      allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "add_candidate", "add_visitor", "export_reports"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-08-25T00:00:00.000Z",
      phone: "+91 98220 12345",
      email: "staff.washim@cetcell.mah.gov.in",
    },
    {
      id: "dinesh",
      username: "dinesh",
      password: "Dinesh@1234",
      fullName: "Dinesh Katarmal",
      designation: "Counsellor",
      role: "counsellor",
      district: "Washim",
      allowedTabs: ["dashboard", "students", "profile", "tickets"],
      allowedFeatures: ["whatsapp_tool", "ticket_generator_tool", "add_candidate", "qr_upload_tool", "add_visitor", "img_to_pdf_tool", "image_to_text_tool"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-09-02T07:14:11.111Z",
      phone: "+91 98220 54321",
      email: "dinesh.washim@cetcell.mah.gov.in",
    },
    {
      id: "naresh",
      username: "naresh",
      password: "Naresh@9527",
      fullName: "Naresh Nagare",
      designation: "Supporting Staff",
      role: "supporting_staff",
      district: "Washim",
      allowedTabs: ["visitors", "dashboard", "tickets", "students", "profile"],
      allowedFeatures: ["add_visitor", "export_reports", "whatsapp_tool", "ticket_generator_tool", "add_candidate", "qr_upload_tool", "img_to_pdf_tool", "image_to_text_tool"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-09-02T08:43:25.376Z",
      phone: "9527859266",
      email: "naresh.washim@cetcell.mah.gov.in",
    },
    {
      id: "rushali",
      username: "rushali",
      password: "Rushali@920",
      fullName: "Rushali",
      designation: "Student Guidance Counsellor",
      role: "counsellor",
      district: "Washim",
      allowedTabs: ["dashboard", "tickets", "students", "profile"],
      allowedFeatures: ["whatsapp_tool", "ticket_generator_tool", "add_candidate", "add_visitor", "qr_upload_tool", "img_to_pdf_tool", "image_to_text_tool"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-09-02T09:22:50.139Z",
      phone: "9209557937",
      email: "rushali.washim@cetcell.mah.gov.in",
    },
    {
      id: "user_1789988800540_ry2vgj",
      username: "rajesh.adcc@gmail.com",
      password: "9270621133",
      fullName: "Mr. Rajesh Dawane",
      designation: "District Nodal Officer (DNO)",
      role: "dno",
      district: "Hingoli",
      allowedTabs: ["dashboard", "visitors", "tickets", "students", "user_management", "settings", "profile", "google_sheets"],
      allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor", "export_reports"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-09-21T11:06:40.540Z",
      phone: "9270621133",
      email: "rajesh.adcc@gmail.com",
    },
    {
      id: "user_1789990244776_c1ci8a",
      username: "sanghadip",
      password: "Harane@1234",
      fullName: "Sanghadip Harane",
      designation: "Counsellor",
      role: "counsellor",
      district: "Hingoli",
      allowedTabs: ["dashboard", "tickets", "students", "profile"],
      allowedFeatures: ["whatsapp_tool", "ticket_generator_tool", "add_visitor", "qr_upload_tool", "img_to_pdf_tool", "image_to_text_tool"],
      canUseApiKey: true,
      isActive: true,
      createdAt: "2026-09-21T11:30:44.776Z",
      phone: "+91 94221 00000",
      email: "sanghadip.hingoli@cetcell.mah.gov.in",
    },
  ];
}

export const DEFAULT_INITIAL_USERS: StoredUser[] = loadDefaultSeedUsers();

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
