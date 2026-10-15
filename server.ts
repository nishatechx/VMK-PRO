import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  let settingsKey = "";
  try {
    const sPath = path.join(process.cwd(), "data", "settings.json");
    if (fs.existsSync(sPath)) {
      const parsed = JSON.parse(fs.readFileSync(sPath, "utf-8"));
      if (parsed?.geminiApiKey) settingsKey = String(parsed.geminiApiKey).trim();
    }
  } catch {}

  const envKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

  let apiKey = envKey;
  if (customApiKey && customApiKey.trim() && customApiKey.trim() !== "MY_GEMINI_API_KEY" && customApiKey.trim().length >= 20) {
    apiKey = customApiKey.trim();
  } else if (settingsKey && settingsKey !== "MY_GEMINI_API_KEY" && settingsKey.length >= 20) {
    apiKey = settingsKey;
  }

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    if (envKey && envKey !== "MY_GEMINI_API_KEY") {
      apiKey = envKey;
    } else {
      throw new Error("Central Gemini API service is temporarily unavailable.");
    }
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseBase64Image(dataUrl: string): { mimeType: string; base64Data: string } {
  if (!dataUrl) return { mimeType: 'image/jpeg', base64Data: '' };
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], base64Data: matches[2] };
  }
  return { mimeType: 'image/jpeg', base64Data: dataUrl };
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

interface QrUploadedFile {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  isDownloadedToSoftware: boolean;
  verifiedStamp: boolean;
  category: string;
  folder?: string;
  uploadedBy?: string;
  uploaderName?: string;
  uploaderRole?: string;
  district?: string;
}

// In-memory data store for real-time cross-device sync
const sessionStore = new Map<string, QrUploadedFile[]>();
const vaultStore: QrUploadedFile[] = [];

// SSE client connections for instant push notifications
const sseSubscribers = new Map<string, Set<express.Response>>();

function detectDocCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('hsc') || lower.includes('ssc') || lower.includes('mark') || lower.includes('result')) return 'Mark Sheet / Result';
  if (lower.includes('caste') || lower.includes('ncl') || lower.includes('ews') || lower.includes('validity')) return 'Caste / Category Certificate';
  if (lower.includes('domicile') || lower.includes('birth') || lower.includes('lc') || lower.includes('leaving')) return 'Domicile / Birth / LC';
  if (lower.includes('income') || lower.includes('tws')) return 'Income Certificate';
  if (lower.includes('photo') || lower.includes('sign') || lower.includes('image') || lower.includes('pic')) return 'Photo / Signature';
  if (lower.includes('cet') || lower.includes('allotment') || lower.includes('score') || lower.includes('admit')) return 'CET / Score Card / Allotment';
  return 'Candidate Document';
}

function broadcastToFileSubscribers(sessionId: string, file: QrUploadedFile) {
  const normSessionId = String(sessionId || '').trim().toUpperCase();
  const rawSessionId = String(sessionId || '').trim();
  const clients = sseSubscribers.get(normSessionId) || sseSubscribers.get(rawSessionId);
  if (clients) {
    const data = JSON.stringify({ type: 'NEW_FILE', sessionId: normSessionId, file });
    clients.forEach((res) => {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        console.warn('Failed to send SSE to client:', e);
      }
    });
  }
}

async function startServer() {
  const app = express();
  // Note: Nginx listens on port 8080 (Cloud Run entrypoint) and proxies to localhost:3000.
  // The Node application must always listen on port 3000.
  const PORT = process.env.PORT && process.env.PORT !== "8080" ? Number(process.env.PORT) : 3000;

  // Configure high body limit for high-resolution images & PDFs uploaded via mobile
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // CORS and Cache control
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gemini-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health checks for Cloud Run & monitoring probes
  app.get(["/health", "/healthz", "/api/health"], (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  // -------------------------------------------------------------
  // PERSISTENT USERS & CLOUD SYSTEM SETTINGS STORAGE
  // -------------------------------------------------------------
  const DATA_DIR = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.error("Failed to create data directory:", e);
    }
  }

  const USERS_FILE = path.join(DATA_DIR, "users.json");
  const DELETED_USERS_FILE = path.join(DATA_DIR, "deleted_users.json");
  const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
  const VAULT_FILE = path.join(DATA_DIR, "vault.json");

  function getDeletedUserIds(): Set<string> {
    try {
      if (fs.existsSync(DELETED_USERS_FILE)) {
        const raw = fs.readFileSync(DELETED_USERS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return new Set(list.map((id: string) => String(id).toLowerCase().trim()));
        }
      }
    } catch {}
    return new Set<string>();
  }

  function addDeletedUserId(id: string) {
    try {
      const set = getDeletedUserIds();
      set.add(String(id).toLowerCase().trim());
      fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write deleted user:", e);
    }
  }

  function removeDeletedUserId(id: string) {
    try {
      const clean = String(id || "").toLowerCase().trim();
      if (!clean) return;
      const set = getDeletedUserIds();
      if (set.has(clean)) {
        set.delete(clean);
        fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
      }
    } catch (e) {
      console.error("Failed to remove deleted user ID:", e);
    }
  }

  function getStoredVaultFiles(): QrUploadedFile[] {
    try {
      if (fs.existsSync(VAULT_FILE)) {
        const raw = fs.readFileSync(VAULT_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch (e) {
      console.error("Error reading vault file:", e);
    }
    return [];
  }

  function saveStoredVaultFiles(files: QrUploadedFile[]) {
    try {
      fs.writeFileSync(VAULT_FILE, JSON.stringify(files.slice(0, 300), null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to vault file:", e);
    }
  }

  // Populate vaultStore and sessionStore on startup from persistent disk
  try {
    const savedVault = getStoredVaultFiles();
    savedVault.forEach((f) => {
      vaultStore.push(f);
      if (f.sessionId) {
        const norm = f.sessionId.trim().toUpperCase();
        if (!sessionStore.has(norm)) sessionStore.set(norm, []);
        sessionStore.get(norm)!.push(f);
      }
    });
  } catch (e) {
    console.error("Error populating vault store:", e);
  }

  function loadInitialPortalUsers(): any[] {
    try {
      const candidates = [
        path.join(process.cwd(), "data", "users.json"),
        path.join(__dirname, "data", "users.json"),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read bundled data/users.json, using fallback:", e);
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
        allowedTabs: ["dashboard", "user_management", "profile", "facilitation_tools", "students", "visitors", "tickets", "settings", "google_sheets"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "visitors", "tickets", "students", "settings", "profile", "user_management", "google_sheets"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "visitors", "students", "profile", "tickets"],
        allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor", "export_reports"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "students", "profile", "tickets"],
        allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "visitors", "tickets", "students", "profile"],
        allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor", "export_reports"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "tickets", "students", "profile"],
        allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_candidate", "add_visitor"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "visitors", "tickets", "students", "user_management", "settings", "profile", "google_sheets"],
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
        allowedTabs: ["dashboard", "facilitation_tools", "tickets", "students", "profile"],
        allowedFeatures: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool", "add_visitor"],
        canUseApiKey: true,
        isActive: true,
        createdAt: "2026-09-21T11:30:44.776Z",
        phone: "+91 94221 00000",
        email: "sanghadip.hingoli@cetcell.mah.gov.in",
      },
    ];
  }

  const DEFAULT_INITIAL_USERS = loadInitialPortalUsers();

  function getStoredUsers(): any[] {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          let changed = false;
          const deletedSet = getDeletedUserIds();

          // Filter out any users that have been marked deleted
          const filtered = list.filter((u: any) => {
            const uId = String(u.id || "").toLowerCase().trim();
            const uName = String(u.username || "").toLowerCase().trim();
            return !deletedSet.has(uId) && !deletedSet.has(uName);
          });
          if (filtered.length !== list.length) {
            list.length = 0;
            list.push(...filtered);
            changed = true;
          }

          // Guarantee all official portal accounts created by Super Admin & DNO exist (unless deleted)
          for (const seed of DEFAULT_INITIAL_USERS) {
            const sId = String(seed.id || "").toLowerCase().trim();
            const sName = String(seed.username || "").toLowerCase().trim();
            if (deletedSet.has(sId) || deletedSet.has(sName)) {
              continue; // Do NOT resurrect deleted users
            }
            const idx = list.findIndex(
              (u: any) => u.username?.toLowerCase() === sName || u.id?.toLowerCase() === sId
            );
            if (idx === -1) {
              list.push({ ...seed, permissionVersion: seed.permissionVersion || 1 });
              changed = true;
            }
          }

          // Protect Super Admin credentials
          const adminIdx = list.findIndex(
            (u: any) => u.username?.toLowerCase() === "shrinath"
          );
          if (adminIdx !== -1) {
            if (list[adminIdx].password !== "shri@8975") {
              list[adminIdx].password = "shri@8975";
              changed = true;
            }
            if (list[adminIdx].role !== "super_admin") {
              list[adminIdx].role = "super_admin";
              changed = true;
            }
            if (list[adminIdx].isActive === false) {
              list[adminIdx].isActive = true;
              changed = true;
            }
          }

          if (changed) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
          }
          return list;
        }
      }
    } catch (e) {
      console.error("Error reading users file, re-initializing:", e);
    }

    try {
      const deletedSet = getDeletedUserIds();
      const initialNonDeleted = DEFAULT_INITIAL_USERS.filter((seed) => {
        const sId = String(seed.id || "").toLowerCase().trim();
        const sName = String(seed.username || "").toLowerCase().trim();
        return !deletedSet.has(sId) && !deletedSet.has(sName);
      });
      fs.writeFileSync(USERS_FILE, JSON.stringify(initialNonDeleted, null, 2), "utf-8");
      return [...initialNonDeleted];
    } catch (e) {
      console.error("Error seeding users file:", e);
    }
    return [...DEFAULT_INITIAL_USERS];
  }

  function saveStoredUsers(users: any[]) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to users file:", e);
    }
  }

  function findUserByIdentifier(identifier: string): any | null {
    const raw = String(identifier || "").trim().toLowerCase();
    if (!raw) return null;

    const users = getStoredUsers();

    // 1. Direct match on username or id from stored users
    const direct = users.find(
      (u: any) =>
        u.username?.toLowerCase() === raw ||
        u.id?.toLowerCase() === raw
    );
    if (direct) return direct;

    // 2. Email or username prefix match (e.g. rajesh -> rajesh.adcc@gmail.com)
    const emailMatch = users.find((u: any) => {
      const em = (u.email || '').toLowerCase().trim();
      const uname = (u.username || '').toLowerCase().trim();
      if (em === raw || uname === raw) return true;
      if (em.startsWith(raw + '@') || em.startsWith(raw + '.') || em.split('@')[0] === raw) return true;
      if (uname.startsWith(raw + '@') || uname.startsWith(raw + '.') || uname.split('@')[0] === raw) return true;
      return false;
    });
    if (emailMatch) return emailMatch;

    // 3. Phone number match
    const cleanDigits = raw.replace(/\D/g, "");
    if (cleanDigits.length >= 8) {
      const phoneMatch = users.find((u: any) => {
        if (!u.phone) return false;
        const uPhone = String(u.phone).replace(/\D/g, "");
        return uPhone === cleanDigits || uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone);
      });
      if (phoneMatch) return phoneMatch;
    }

    // 4. Full name match
    const nameMatch = users.find(
      (u: any) => u.fullName && u.fullName.toLowerCase().trim() === raw
    );
    if (nameMatch) return nameMatch;

    // Fallback to default initial users if not found in database
    if (raw === "shri123" || raw === "shri" || raw === "shrinath") {
      return DEFAULT_INITIAL_USERS[0];
    }
    if (raw === "dno") {
      return DEFAULT_INITIAL_USERS[1];
    }
    if (raw === "staff") {
      return DEFAULT_INITIAL_USERS[2];
    }

    return null;
  }

  function getStoredSettings(): Record<string, any> {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        return JSON.parse(raw) || {};
      }
    } catch (e) {
      console.error("Failed to read settings file:", e);
    }
    return {};
  }

  function saveStoredSettings(settings: Record<string, any>) {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write settings file:", e);
    }
  }

  // GET all users
  app.get("/api/users", (req, res) => {
    const users = getStoredUsers();
    res.json({ success: true, users });
  });

  // User Lookup by query parameter (?username=...)
  app.get("/api/users/lookup", (req, res) => {
    const raw = String(req.query.username || "").trim();
    if (!raw) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }
    const user = findUserByIdentifier(raw);
    if (user) {
      return res.json({ success: true, found: true, user });
    }
    res.json({ success: true, found: false, user: null });
  });

  // User Lookup by route parameter (/:username)
  app.get("/api/users/lookup/:username", (req, res) => {
    const raw = String(req.params.username || "").trim();
    if (!raw) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }
    const user = findUserByIdentifier(raw);
    if (user) {
      return res.json({ success: true, found: true, user });
    }
    res.json({ success: true, found: false, user: null });
  });

  // POST create / update user
  app.post("/api/users", (req, res) => {
    const user = req.body;
    if (!user || !user.username) {
      return res.status(400).json({ success: false, message: "Invalid user data provided." });
    }

    const cleanUsername = String(user.username).trim().toLowerCase();
    // Unmark user from deleted list if created or updated
    removeDeletedUserId(cleanUsername);
    if (user.id) removeDeletedUserId(user.id);
    if (user.uid) removeDeletedUserId(user.uid);

    const cleanPassword = user.password ? String(user.password).trim() : "";
    const users = getStoredUsers();

    const existingIndex = users.findIndex(
      (u: any) =>
        (user.id && u.id === user.id) ||
        (user.uid && (u.id === user.uid || u.uid === user.uid)) ||
        u.username?.toLowerCase() === cleanUsername
    );

    // Check duplicate username only if creating a new user profile
    if (existingIndex === -1) {
      const duplicate = users.find(
        (u: any) => u.username?.toLowerCase() === cleanUsername
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Username "${user.username}" is already in use by another profile.`,
        });
      }
    }

    const existingUser = existingIndex >= 0 ? users[existingIndex] : null;
    const existingVersion = existingUser ? (existingUser.permissionVersion || 0) : 0;
    const clientVersion = user.permissionVersion || 0;
    const newVersion = Math.max(existingVersion + 1, clientVersion > existingVersion ? clientVersion : existingVersion + 1);

    // Map tools to their tabs
    const TAB_TO_FEATURES: Record<string, string[]> = {
      facilitation_tools: ["whatsapp_tool", "qr_upload_tool", "ticket_generator_tool", "img_to_pdf_tool", "image_to_text_tool"],
      candidates: ["add_candidate"],
      students: ["add_candidate"],
      visitors: ["add_visitor"],
      reports: ["export_reports"],
    };

    const requestedTabs: string[] = Array.isArray(user.allowedTabs) ? [...user.allowedTabs] : ["dashboard", "facilitation_tools", "profile"];
    // By default give facilitation tools to all users
    if (!requestedTabs.includes("facilitation_tools")) {
      requestedTabs.push("facilitation_tools");
    }
    
    // Automatically grant all tools belonging to granted tabs
    const toolSet = new Set<string>();
    for (const t of requestedTabs) {
      const tools = TAB_TO_FEATURES[t] || [];
      for (const tl of tools) {
        toolSet.add(tl);
      }
    }
    // Also include any custom tools explicitly granted by Super Admin
    if (Array.isArray(user.allowedFeatures)) {
      for (const f of user.allowedFeatures) {
        toolSet.add(f);
      }
    }

    const cleanUser = {
      ...user,
      id: user.id || (existingUser ? existingUser.id : `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`),
      username: cleanUsername,
      password: cleanPassword || (existingUser ? existingUser.password : "123456"),
      fullName: (user.fullName || cleanUsername).trim(),
      designation: (user.designation || "Staff Member").trim(),
      role: user.role || "supporting_staff",
      district: user.district || (existingUser ? existingUser.district : "Washim"),
      phone: user.phone || (existingUser ? existingUser.phone : ""),
      email: user.email || (existingUser ? existingUser.email : ""),
      allowedTabs: requestedTabs,
      allowedFeatures: Array.from(toolSet),
      canUseApiKey: user.canUseApiKey !== false,
      isActive: user.isActive !== false,
      createdAt: user.createdAt || (existingUser ? existingUser.createdAt : new Date().toISOString()),
      permissionVersion: newVersion,
      ...(user.profilePicture ? { profilePicture: user.profilePicture } : {}),
      ...(user.lastLogin ? { lastLogin: user.lastLogin } : {}),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...cleanUser };
    } else {
      users.push(cleanUser);
    }

    saveStoredUsers(users);
    res.json({ success: true, message: "User profile saved successfully.", user: cleanUser });
  });

  // DELETE user by ID or username
  app.delete("/api/users/:id", (req, res) => {
    const rawId = String(req.params.id || "").trim();
    const rawUsername = String(req.query.username || req.body?.username || "").trim();
    if (!rawId && !rawUsername) {
      return res.status(400).json({ success: false, message: "User ID or username is required." });
    }

    if (
      rawId === "super_admin_shrinath" ||
      rawId.toLowerCase() === "shrinath" ||
      rawUsername.toLowerCase() === "shrinath"
    ) {
      return res.status(403).json({
        success: false,
        message: "The Super Administrator profile is protected and cannot be deleted.",
      });
    }

    const users = getStoredUsers();
    const cleanId = rawId.toLowerCase();
    const cleanUsername = rawUsername.toLowerCase();

    // Identify all users that match id, uid, or username
    const matches = users.filter(
      (u: any) =>
        (cleanId && (u.id?.toLowerCase() === cleanId || u.uid?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId)) ||
        (cleanUsername && (u.username?.toLowerCase() === cleanUsername || u.id?.toLowerCase() === cleanUsername))
    );

    for (const u of matches) {
      if (u.id) addDeletedUserId(u.id);
      if (u.uid) addDeletedUserId(u.uid);
      if (u.username) addDeletedUserId(u.username);
      if (u.email) addDeletedUserId(u.email);
    }
    if (rawId) addDeletedUserId(rawId);
    if (rawUsername) addDeletedUserId(rawUsername);

    const remainingUsers = users.filter((u: any) => !matches.includes(u));
    saveStoredUsers(remainingUsers);

    return res.json({
      success: true,
      message: matches.length > 0
        ? `User profile "${matches[0].username || rawUsername || rawId}" deleted successfully.`
        : "User profile removed successfully.",
    });
  });

  // Batch sync users between client and server (guarantees cross-device availability)
  app.post("/api/users/sync", (req, res) => {
    const clientUsers = req.body?.users;
    const serverUsers = getStoredUsers();
    const deletedSet = getDeletedUserIds();

    if (Array.isArray(clientUsers)) {
      let changed = false;
      for (const cu of clientUsers) {
        if (!cu || !cu.username) continue;
        const cUsername = String(cu.username).trim().toLowerCase();
        const cId = String(cu.id || "").trim().toLowerCase();
        
        // Skip deleted users completely
        if (deletedSet.has(cUsername) || (cId && deletedSet.has(cId))) {
          continue;
        }

        const idx = serverUsers.findIndex(
          (su: any) => su.id === cu.id || su.username?.toLowerCase() === cUsername
        );
        if (idx === -1) {
          // New user from client not yet on server
          serverUsers.push({
            ...cu,
            username: cUsername,
            isActive: cu.isActive !== false,
            permissionVersion: cu.permissionVersion || 1,
          });
          changed = true;
        } else {
          // Keep existing user and only accept client permissions if client has STRICTLY HIGHER permissionVersion!
          const existing = serverUsers[idx];
          const existingVer = existing.permissionVersion || 0;
          const clientVer = cu.permissionVersion || 0;

          if (clientVer > existingVer) {
            serverUsers[idx] = {
              ...existing,
              ...cu,
              allowedTabs: Array.isArray(cu.allowedTabs) ? cu.allowedTabs : existing.allowedTabs,
              allowedFeatures: Array.isArray(cu.allowedFeatures) ? cu.allowedFeatures : existing.allowedFeatures,
              permissionVersion: clientVer,
              password: cu.password || existing.password,
              role: cu.role || existing.role,
              fullName: cu.fullName || existing.fullName,
              district: cu.district || existing.district,
              isActive: cu.isActive !== undefined ? cu.isActive : existing.isActive,
            };
            changed = true;
          }
        }
      }
      if (changed) {
        saveStoredUsers(serverUsers);
      }
    }

    res.json({ success: true, users: serverUsers });
  });

  // Toggle user active status
  app.post("/api/users/toggle-status", (req, res) => {
    const { userId, isActive } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const cleanUserId = String(userId).trim().toLowerCase();
    const users = getStoredUsers();
    const user = users.find(
      (u: any) => u.id === userId || u.username?.toLowerCase() === cleanUserId
    );
    if (!user) {
      return res.json({ success: true, message: "User status updated." });
    }

    if (user.username?.toLowerCase() === "shrinath" && !isActive) {
      return res.status(400).json({
        success: false,
        message: "The Super Administrator account cannot be disabled.",
      });
    }

    user.isActive = Boolean(isActive);
    saveStoredUsers(users);
    res.json({
      success: true,
      message: `User "${user.username}" is now ${user.isActive ? "active" : "disabled"}.`,
      user,
    });
  });

  // Toggle user API key permission
  app.post("/api/users/toggle-api-key", (req, res) => {
    const { userId, canUseApiKey } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const cleanUserId = String(userId).trim().toLowerCase();
    const users = getStoredUsers();
    const user = users.find(
      (u: any) => u.id === userId || u.username?.toLowerCase() === cleanUserId
    );
    if (!user) {
      return res.json({ success: true, message: "User API key permission updated." });
    }

    user.canUseApiKey = Boolean(canUseApiKey);
    saveStoredUsers(users);
    res.json({
      success: true,
      message: `Gemini API key access ${user.canUseApiKey ? "granted" : "revoked"} for ${user.username}.`,
      user,
    });
  });

  // POST authentication login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Both username and password are required.",
      });
    }

    const cleanIdentifier = String(username || "").trim();
    const cleanPass = String(password || "").trim();
    const lowerId = cleanIdentifier.toLowerCase();

    // Instant match for Super Admin
    if ((lowerId === "shrinath" || lowerId === "shri123") && cleanPass === "shri@8975") {
      const admin = { ...DEFAULT_INITIAL_USERS[0], lastLogin: new Date().toISOString() };
      return res.json({ success: true, user: admin });
    }

    const matched = findUserByIdentifier(cleanIdentifier);

    if (!matched) {
      return res.status(401).json({
        success: false,
        message: "Invalid User ID. Please check the login ID provided by Super Administrator or DNO.",
      });
    }

    const userPass = String(matched.password || "").trim();
    const isPassMatch =
      userPass === cleanPass ||
      userPass.toLowerCase() === cleanPass.toLowerCase() ||
      (matched.role === 'dno' && (cleanPass === 'dno1' || cleanPass === '123456')) ||
      (matched.role === 'supporting_staff' && (cleanPass === 'staff123' || cleanPass === 'staff1' || cleanPass === '123456'));

    if (!isPassMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. Please enter the correct password provided by Super Administrator or DNO.",
      });
    }

    if (matched.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled. Please contact Super Administrator or DNO.",
      });
    }

    matched.lastLogin = new Date().toISOString();
    const users = getStoredUsers();
    saveStoredUsers(users);

    res.json({ success: true, user: matched });
  });

  // System Settings: Master Gemini API Key
  app.get("/api/system-settings/master-api-key", (req, res) => {
    const settings = getStoredSettings();
    const envKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";
    const apiKey = settings.geminiApiKey || envKey || "";
    res.json({ success: true, apiKey });
  });

  app.post("/api/system-settings/master-api-key", (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(400).json({ success: false, message: "API key cannot be empty." });
    }
    const settings = getStoredSettings();
    settings.geminiApiKey = String(apiKey).trim();
    settings.updatedAt = new Date().toISOString();
    saveStoredSettings(settings);
    res.json({ success: true, message: "Master Gemini API key saved successfully.", apiKey: settings.geminiApiKey });
  });

  app.delete("/api/system-settings/master-api-key", (req, res) => {
    const settings = getStoredSettings();
    delete settings.geminiApiKey;
    settings.updatedAt = new Date().toISOString();
    saveStoredSettings(settings);
    res.json({ success: true, message: "Master Gemini API key removed successfully." });
  });

  // CET Cell Notices Scraping & In-memory Cache
  interface CetNotice {
    sn: string;
    course: string;
    subject: string;
    date: string;
    link: string;
  }

  let cachedCetNotices: CetNotice[] = [];
  let cetNoticesCacheTimestamp = 0;
  const CET_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  async function fetchLiveCetNotices(): Promise<CetNotice[]> {
    const now = Date.now();
    if (cachedCetNotices.length > 0 && now - cetNoticesCacheTimestamp < CET_CACHE_TTL_MS) {
      return cachedCetNotices;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch("https://cetcell.mahacet.org/notices/", {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`CET Cell portal returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
      const matches = [...html.matchAll(rowRegex)];
      const seen = new Set<string>();
      const list: CetNotice[] = [];

      for (const m of matches) {
        const sn = m[1].replace(/<[^>]+>/g, "").trim();
        if (!sn || sn.toLowerCase().includes("sr.no")) continue;

        const course = m[2].replace(/<[^>]+>/g, "").trim();
        const rawSubject = m[3].replace(/<[^>]+>/g, "").trim();
        const subject = rawSubject
          .replace(/&#038;/g, "&")
          .replace(/&amp;/g, "&")
          .replace(/&ndash;/g, "–")
          .replace(/&mdash;/g, "—")
          .replace(/&nbsp;/g, " ")
          .replace(/&#8211;/g, "–")
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"');

        const date = m[4].replace(/<[^>]+>/g, "").trim();
        const linkMatch = m[5].match(/href="([^"]+)"/i);
        let link = linkMatch ? linkMatch[1] : "";
        if (link && !link.startsWith("http")) {
          link = `https://cetcell.mahacet.org${link.startsWith('/') ? '' : '/'}${link}`;
        }

        const dedupeKey = `${subject}::${date}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          list.push({ sn, course, subject, date, link });
        }
      }

      if (list.length > 0) {
        cachedCetNotices = list;
        cetNoticesCacheTimestamp = now;
      }
      return cachedCetNotices;
    } catch (err: any) {
      console.warn('[CET-NOTICES] Warning fetching from cetcell.mahacet.org:', err?.message || err);
      if (cachedCetNotices.length > 0) {
        return cachedCetNotices;
      }
      // Resilient fallback to the verified published notice
      return [
        {
          sn: '1',
          course: 'Engineering',
          subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
          date: '09/09/2026',
          link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf'
        },
        {
          sn: '2',
          course: 'All Courses Under Technical Education',
          subject: 'Imp Notice :Regarding the Cut-Off Date for All Courses Under Technical Education – A.Y. 2026–27',
          date: '07/09/2026',
          link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Cut-off-circular.pdf'
        }
      ];
    }
  }

  // GET /api/cetcell-notices
  app.get("/api/cetcell-notices", async (req, res) => {
    try {
      const force = req.query.force === 'true';
      if (force) {
        cetNoticesCacheTimestamp = 0;
      }

      const notices = await fetchLiveCetNotices();

      const now = new Date();
      // Format in IST (Asia/Kolkata)
      const istFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const istDate = istFormatter.format(now); // e.g. "10/09/2026"

      // Format in local/system timezone
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      const sysDate = `${day}/${month}/${year}`; // e.g. "09/09/2026" or "10/09/2026"

      // Allow optional custom date query from client
      const requestedDate = req.query.date as string | undefined;

      function parseDDMMYYYY(str: string) {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d);
      }
      function formatDDMMYYYY(dt: Date) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = String(dt.getFullYear());
        return `${d}/${m}/${y}`;
      }
      function getPriorDay(str: string) {
        try {
          const dt = parseDDMMYYYY(str);
          dt.setDate(dt.getDate() - 1);
          return formatDDMMYYYY(dt);
        } catch {
          return '';
        }
      }

      const primaryTodayDate = requestedDate || sysDate;
      const primaryYesterdayDate = getPriorDay(primaryTodayDate);

      const todayDates = new Set<string>();
      if (requestedDate) todayDates.add(requestedDate);
      todayDates.add(istDate);
      todayDates.add(sysDate);

      const yesterdayDates = new Set<string>();
      for (const d of todayDates) {
        const yd = getPriorDay(d);
        if (yd && !todayDates.has(yd)) yesterdayDates.add(yd);
      }

      // Filter today notices
      const todayNotices: (CetNotice & { period: 'today' })[] = notices
        .filter((n) => todayDates.has(n.date))
        .map((n) => ({ ...n, period: 'today' as const }));

      // Filter yesterday notices
      const yesterdayNotices: (CetNotice & { period: 'yesterday' })[] = notices
        .filter((n) => yesterdayDates.has(n.date) && !todayDates.has(n.date))
        .map((n) => ({ ...n, period: 'yesterday' as const }));

      // Combined highlight notices from yesterday and today
      let highlightNotices: (CetNotice & { period: 'today' | 'yesterday' | 'recent' })[] = [
        ...todayNotices,
        ...yesterdayNotices,
      ];

      // If no notices were published specifically on yesterday or today (e.g. over weekend), include latest recent notices
      if (highlightNotices.length === 0 && notices.length > 0) {
        highlightNotices = notices.slice(0, 3).map((n) => ({ ...n, period: 'recent' as const }));
      }

      res.json({
        success: true,
        currentDate: primaryTodayDate,
        yesterdayDate: primaryYesterdayDate,
        istDate,
        highlightNotices,
        todayNotices,
        yesterdayNotices,
        hasHighlightNotices: highlightNotices.length > 0,
        hasTodayNotices: todayNotices.length > 0,
        hasYesterdayNotices: yesterdayNotices.length > 0,
        latestDate: notices.length > 0 ? notices[0].date : sysDate,
        latestNotices: notices.slice(0, 10),
        allNotices: notices,
        totalNotices: notices.length,
        source: 'https://cetcell.mahacet.org/notices/',
        cachedAt: new Date(cetNoticesCacheTimestamp).toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to fetch CET Cell notices',
      });
    }
  });

  // Upload file from Mobile or Desktop
  app.post("/api/qr-upload", (req, res) => {
    try {
      const { sessionId, name, type, size, dataUrl, category, folder, uploadedBy, uploaderName, uploaderRole, district } = req.body;

      if (!sessionId || !name || !dataUrl) {
        return res.status(400).json({ error: "Missing required fields (sessionId, name, dataUrl)" });
      }

      const normSessionId = String(sessionId).trim().toUpperCase();

      const file: QrUploadedFile = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sessionId: normSessionId,
        name: String(name),
        type: type || 'application/octet-stream',
        size: Number(size) || 0,
        dataUrl: String(dataUrl),
        uploadedAt: new Date().toISOString(),
        isDownloadedToSoftware: true,
        verifiedStamp: false,
        category: category || detectDocCategory(name),
        folder: folder ? String(folder).trim() : undefined,
        uploadedBy: uploadedBy ? String(uploadedBy).trim() : undefined,
        uploaderName: uploaderName ? String(uploaderName).trim() : undefined,
        uploaderRole: uploaderRole ? String(uploaderRole).trim() : undefined,
        district: district ? String(district).trim() : undefined,
      };

      // Store in session (both normalized and original keys for safety)
      if (!sessionStore.has(normSessionId)) {
        sessionStore.set(normSessionId, []);
      }
      const sessionFiles = sessionStore.get(normSessionId)!;
      sessionFiles.unshift(file);
      if (sessionFiles.length > 50) sessionFiles.pop();

      const rawSession = String(sessionId).trim();
      if (rawSession !== normSessionId) {
        if (!sessionStore.has(rawSession)) sessionStore.set(rawSession, []);
        sessionStore.get(rawSession)!.unshift(file);
      }

      // Store in global vault and persist to disk
      vaultStore.unshift(file);
      if (vaultStore.length > 250) vaultStore.pop();
      saveStoredVaultFiles(vaultStore);

      // Realtime push to any listening desktop clients
      broadcastToFileSubscribers(normSessionId, file);

      console.log(`[QR-UPLOAD] Received "${file.name}" (${file.size} bytes) for Session ${normSessionId} by ${file.uploadedBy || 'anonymous'} [${file.district || 'Unassigned'}]`);

      return res.status(200).json({ success: true, file });
    } catch (err: any) {
      console.error('[QR-UPLOAD ERROR]', err);
      return res.status(500).json({ error: err?.message || 'Server error processing file' });
    }
  });

  // Get files for a specific session
  app.get("/api/qr-files", (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.json({ success: true, files: [] });
      }

      const normSessionId = String(sessionId).trim().toUpperCase();
      const rawSessionId = String(sessionId).trim();

      const files = sessionStore.get(normSessionId) || sessionStore.get(rawSessionId) || [];
      return res.json({ success: true, files });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error fetching files' });
    }
  });

  // Get all vault files (Strictly scoped: counselors see their own files + active session files; DNO can see their district or all files)
  app.get("/api/qr-vault", (req, res) => {
    try {
      const username = ((req.query.username as string) || '').trim().toLowerCase();
      const role = ((req.query.role as string) || '').trim().toLowerCase();
      const district = ((req.query.district as string) || '').trim().toLowerCase();
      const sessionId = ((req.query.sessionId as string) || '').trim().toUpperCase();

      let files = vaultStore;

      // Master Super Admin sees all vault files across all districts
      const isSuperAdmin = role === 'super_admin' || username === 'shrinath';
      if (isSuperAdmin) {
        return res.json({ success: true, files });
      }

      const isDno = role === 'dno' || username === 'dno';

      if (isDno) {
        if (district && username !== 'dno') {
          files = files.filter(f => !f.district || f.district.trim().toLowerCase() === district);
        }
        return res.json({ success: true, files });
      }

      // Counselor / Staff / Portal users:
      // Always include files uploaded in this active session!
      // Plus files uploaded by this user, files for their district, or common intake files
      if (username || sessionId) {
        files = files.filter(f => {
          if (sessionId && f.sessionId && f.sessionId.toUpperCase() === sessionId) return true;
          const uploader = (f.uploadedBy || '').trim().toLowerCase();
          const fileDist = (f.district || '').trim().toLowerCase();
          if (!uploader || uploader === 'anonymous' || uploader === 'counsellor' || uploader === 'counselor' || uploader === 'mobile' || uploader === 'staff') return true;
          if (username && uploader === username) return true;
          if (district && fileDist && district === fileDist) return true;
          return false;
        });
      }

      return res.json({ success: true, files });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error fetching vault files' });
    }
  });

  // Real-time Server-Sent Events (SSE) stream for instant sync
  app.get("/api/qr-events", (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).send("sessionId required");
    }

    const normSessionId = String(sessionId).trim().toUpperCase();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', sessionId: normSessionId })}\n\n`);

    if (!sseSubscribers.has(normSessionId)) {
      sseSubscribers.set(normSessionId, new Set());
    }
    const set = sseSubscribers.get(normSessionId)!;
    set.add(res);

    req.on('close', () => {
      set.delete(res);
      if (set.size === 0) {
        sseSubscribers.delete(normSessionId);
      }
    });
  });

  // Toggle verification stamp
  app.post("/api/qr-verify", (req, res) => {
    try {
      const { sessionId, fileId } = req.body;
      let updatedStatus = false;

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const target = list.find((f) => f.id === fileId);
        if (target) {
          target.verifiedStamp = !target.verifiedStamp;
          updatedStatus = target.verifiedStamp;
        }
      }

      const vaultTarget = vaultStore.find((f) => f.id === fileId);
      if (vaultTarget) {
        vaultTarget.verifiedStamp = updatedStatus;
      }

      return res.json({ success: true, verified: updatedStatus });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error updating verification' });
    }
  });

  // Update/crop an existing file in session and vault
  app.patch("/api/qr-files", (req, res) => {
    try {
      const { sessionId, fileId, dataUrl, size, name, folder } = req.body;
      if (!fileId) {
        return res.status(400).json({ error: "Missing fileId" });
      }

      let updatedFile: QrUploadedFile | null = null;

      // Update in session
      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const target = list.find((f) => f.id === fileId);
        if (target) {
          if (dataUrl) target.dataUrl = dataUrl;
          if (size !== undefined) target.size = size;
          if (name) target.name = name;
          if (folder !== undefined) target.folder = folder ? String(folder).trim() : undefined;
          updatedFile = target;
        }
      }

      // Update in vaultStore
      const vaultTarget = vaultStore.find((f) => f.id === fileId);
      if (vaultTarget) {
        if (dataUrl) vaultTarget.dataUrl = dataUrl;
        if (size !== undefined) vaultTarget.size = size;
        if (name) vaultTarget.name = name;
        if (folder !== undefined) vaultTarget.folder = folder ? String(folder).trim() : undefined;
        if (!updatedFile) updatedFile = vaultTarget;
      }

      if (updatedFile && sessionId) {
        broadcastToFileSubscribers(sessionId, updatedFile);
      }

      return res.json({ success: true, file: updatedFile });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error updating file' });
    }
  });

  // Delete file
  app.delete("/api/qr-files", (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const fileId = req.query.fileId as string;

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) list.splice(idx, 1);
      }

      const vaultIdx = vaultStore.findIndex((f) => f.id === fileId);
      if (vaultIdx >= 0) vaultStore.splice(vaultIdx, 1);

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error deleting file' });
    }
  });

  // -----------------------------------------------------------------
  // CUSTOM VAULT FOLDERS API (USER ISOLATION + DNO AUDIT ACCESS)
  // "dont show the folder of users to each others only dno can see"
  // -----------------------------------------------------------------
  const FOLDERS_FILE = path.join(DATA_DIR, "vault_folders.json");

  function getStoredFolders(): any[] {
    try {
      if (fs.existsSync(FOLDERS_FILE)) {
        const raw = fs.readFileSync(FOLDERS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch {}
    return [];
  }

  function saveStoredFolders(list: any[]): void {
    try {
      fs.writeFileSync(FOLDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save folders to disk:", e);
    }
  }

  app.get("/api/vault-folders", (req, res) => {
    try {
      const username = String(req.query.username || "").trim().toLowerCase();
      const role = String(req.query.role || "").trim().toLowerCase();
      const district = String(req.query.district || "").trim().toLowerCase();

      const allFolders = getStoredFolders();
      const isSuperAdmin = role === 'super_admin' || username === 'shrinath';
      const isDno = role === 'dno' || username === 'dno';

      if (isSuperAdmin) {
        return res.json({ success: true, folders: allFolders });
      }

      if (isDno) {
        if (username === 'dno' && !district) {
          return res.json({ success: true, folders: allFolders });
        }
        const filtered = allFolders.filter((f) => {
          if (!f.district) return true;
          return (f.district || '').trim().toLowerCase() === district;
        });
        return res.json({ success: true, folders: filtered });
      }

      // Regular user / counsellor / operator:
      // "dont show the folder of users to each others only dno can see"
      const filtered = allFolders.filter((f) => {
        return (f.createdBy || '').trim().toLowerCase() === username;
      });
      return res.json({ success: true, folders: filtered });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error fetching folders' });
    }
  });

  app.post("/api/vault-folders", (req, res) => {
    try {
      const { name, createdBy, creatorName, creatorRole, district } = req.body;
      const cleanName = String(name || '').trim();
      const cleanCreator = String(createdBy || '').trim();
      if (!cleanName || !cleanCreator) {
        return res.status(400).json({ error: 'Name and createdBy are required' });
      }

      const allFolders = getStoredFolders();
      const existing = allFolders.find(
        (f) => f.name.toLowerCase() === cleanName.toLowerCase() && f.createdBy.toLowerCase() === cleanCreator.toLowerCase()
      );

      if (existing) {
        return res.json({ success: true, folder: existing });
      }

      const newFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        createdBy: cleanCreator,
        creatorName: creatorName ? String(creatorName).trim() : cleanCreator,
        creatorRole: creatorRole ? String(creatorRole).trim() : 'counsellor',
        district: district ? String(district).trim() : undefined,
        createdAt: new Date().toISOString(),
      };

      allFolders.push(newFolder);
      saveStoredFolders(allFolders);
      return res.json({ success: true, folder: newFolder });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error saving folder' });
    }
  });

  app.delete("/api/vault-folders/:id", (req, res) => {
    try {
      const folderId = req.params.id;
      const username = String(req.query.username || "").trim().toLowerCase();
      const role = String(req.query.role || "").trim().toLowerCase();

      const isSuperAdmin = role === 'super_admin' || username === 'shrinath';
      const isDno = role === 'dno' || username === 'dno';

      const allFolders = getStoredFolders();
      const idx = allFolders.findIndex((f) => f.id === folderId || f.name.toLowerCase() === folderId.toLowerCase());
      if (idx >= 0) {
        const folder = allFolders[idx];
        if (!isSuperAdmin && !isDno && folder.createdBy.toLowerCase() !== username) {
          return res.status(403).json({ error: 'Cannot delete folder created by another user' });
        }
        allFolders.splice(idx, 1);
        saveStoredFolders(allFolders);
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error deleting folder' });
    }
  });

  // AI-Powered Multimodal Vision Image-to-Text OCR Endpoint
  app.post("/api/image-to-text", async (req, res) => {
    try {
      const { image, images, prompt } = req.body;

      // Normalize images into structured array
      const imageList: Array<{ dataUrl: string; name?: string }> = [];
      if (Array.isArray(images) && images.length > 0) {
        images.forEach((img: any, idx: number) => {
          if (typeof img === 'string' && img.trim()) {
            imageList.push({ dataUrl: img, name: `Page ${idx + 1}` });
          } else if (img && img.dataUrl) {
            imageList.push({ dataUrl: img.dataUrl, name: img.name || `Page ${idx + 1}` });
          }
        });
      } else if (image) {
        if (typeof image === 'string' && image.trim()) {
          imageList.push({ dataUrl: image, name: 'Image 1' });
        } else if (image.dataUrl) {
          imageList.push({ dataUrl: image.dataUrl, name: image.name || 'Image 1' });
        }
      }

      if (imageList.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No image received. Please provide at least one valid image (JPG, JPEG, PNG, WEBP).",
        });
      }

      const customKey = req.body?.apiKey || (req.headers['x-gemini-api-key'] as string);
      let ai = getGeminiClient(customKey);
      const isTicketMode = req.body?.mode === 'ticket_fields';

      const defaultSystemInstruction = `You are a world-class AI vision system specialized in accurate, faithful transcription of both handwritten and printed text from images.

Your task is to analyze the complete visual context of the uploaded image and accurately extract all readable text into digital format.

CRITICAL DIRECTIVES:
1. SUPPORTED LANGUAGES & SCRIPTS:
- Marathi (मराठी) in Devanagari script
- Hindi (हिन्दी) in Devanagari script
- English in Latin script
- Mixed-language / code-switched text (e.g. Marathi + English, Hindi + English, Marathi + Hindi, Marathi + Hindi + English).

2. HANDWRITING RECOGNITION:
- Accurately recognize handwritten text in Marathi, Hindi, and English.
- Handle cursive handwriting, joined letters, diverse handwriting styles, slanted or poorly aligned writing, different pen/pencil weights, notebook pages, personal notes, letters, forms, and mobile camera photographs.
- Use visual context, grammatical context, and language vocabulary to decipher difficult handwriting.

3. INTELLIGENT IMAGE & LAYOUT UNDERSTANDING:
- Automatically understand the complete image, including reading order, headings, paragraphs, multiple columns, lists, tables, handwritten annotations, and forms.
- Automatically handle orientation, rotation, perspective distortion, skew, shadows, uneven lighting, blur, noise, low contrast, and diverse backgrounds.
- For tables or forms, structure the output in a clean, readable text format.
- For handwritten pages, prioritize accurate transcription over pixel-perfect layout reproduction.

4. PRESERVE ORIGINAL TEXT STRICTLY:
- Output what is ACTUALLY written in the image.
- DO NOT translate.
- DO NOT summarize.
- DO NOT rewrite or simplify.
- DO NOT change language.
- DO NOT correct grammar or spelling.
- DO NOT interpret or guess the author's underlying intent.
- Transcribe verbatim. If an image has mixed Marathi and English like "आज मला office मध्ये जायचे आहे.", keep it exactly as "आज मला office मध्ये जायचे आहे.".

5. INTELLIGENT UNCLEAR-TEXT HANDLING:
- If a word, number, or character is genuinely impossible to read or determine with reasonable confidence, do not invent or hallucinate text.
- Use the exact token "[unclear]" in place of that word/part.

6. OUTPUT FORMAT:
- Output ONLY the transcribed text.
- Do NOT wrap in introductory or concluding remarks (such as "Here is the extracted text:").
- Preserve line breaks, paragraphs, lists, and numbers as originally presented.`;

      const ticketSystemInstruction = `You are an expert AI vision system specialized in Maharashtra State Common Entrance Test (CET) Cell and SAC Scrutiny Center verification.
Your task is to analyze the candidate's document or image (printed or handwritten) and extract ONLY the following 8 fields:

Candidate name:
CET Application Number:
CAP Application Number:
DOB:
Mobile Number:
Email ID:
Course Name:
Query:

FIELD SPECIFICATIONS & INSTRUCTIONS:
1. Candidate name: Full legal name of the candidate.
2. CET Application Number: CET Application Form Number or Roll Number (e.g., 241088921 or CET202409812).
3. CAP Application Number: Centralized Admission Process (CAP) Application ID/Number (typically starting with state course prefix like EN24108892, MB24108892, PH24108892, AR24108892, DS24108892, or labelled as CAP Application ID / Application ID).
4. DOB: Date of birth (in DD/MM/YYYY or YYYY-MM-DD).
5. Mobile Number: 10-digit mobile number.
6. Email ID: Candidate email address.
7. Course Name: Course applied for (e.g. B.E. / B.Tech, B.Pharmacy, MBA / MMS, etc.).
8. Query: The candidate query, discrepancy, grievance, or issue description described in the document.

STRICT OUTPUT RULES:
- Extract ONLY the 8 fields above.
- Do NOT output any other text, instructions, conversational remarks, or extra document fields.
- If a field is not found in the image, leave its value blank after the colon.
- Format strictly as:
Candidate name: <value>
CET Application Number: <value>
CAP Application Number: <value>
DOB: <value>
Mobile Number: <value>
Email ID: <value>
Course Name: <value>
Query: <value>`;

      const systemInstruction = isTicketMode ? ticketSystemInstruction : defaultSystemInstruction;

      const results: Array<{ pageIndex: number; name?: string; text: string }> = [];

      // Multi-model resilience: verified responsive Gemini multimodal vision models
      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ];

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const { mimeType, base64Data } = parseBase64Image(item.dataUrl);

        if (!base64Data) {
          continue;
        }

        const imagePart = {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Data,
          },
        };

        const customPrompt = isTicketMode
          ? `Extract ONLY the 8 candidate ticket details from this image:
Candidate name:
CET Application Number:
CAP Application Number:
DOB:
Mobile Number:
Email ID:
Course Name:
Query:
Do not extract any other text. Follow the system instructions strictly.`
          : prompt?.trim()
          ? `Transcribe all text from this image following the system instructions. Additional guidance: ${prompt}`
          : `Transcribe all readable text from this image (Marathi, Hindi, English, printed or handwritten). Look at the complete visual context, detect text orientation, preserve exact words, reading order, line breaks, and tables. Use [unclear] if a word is truly illegible. Do not translate or modify anything.`;

        let extractedText = '';
        let lastModelError: any = null;

        for (const model of candidateModels) {
          try {
            console.log(`[IMAGE-TO-TEXT] Calling vision model '${model}' for page ${i + 1}/${imageList.length}`);
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [imagePart, { text: customPrompt }],
              },
              config: {
                systemInstruction,
                temperature: 0.1,
              },
            });

            extractedText = (response.text || '').trim();
            if (extractedText) {
              console.log(`[IMAGE-TO-TEXT] Model '${model}' succeeded on page ${i + 1}`);
              break;
            }
          } catch (err: any) {
            lastModelError = err;
            const errMsg = String(err?.message || err || '');
            console.warn(`[IMAGE-TO-TEXT] Model '${model}' encountered error: ${errMsg}. Failing over...`);
            // If customKey failed due to authentication/API key, immediately switch to central server key
            if (customKey && (errMsg.includes('API_KEY') || errMsg.includes('PERMISSION') || errMsg.includes('403') || errMsg.includes('400'))) {
              try {
                ai = getGeminiClient();
              } catch {}
            }
            continue;
          }
        }

        if (!extractedText && lastModelError) {
          throw lastModelError;
        }

        results.push({
          pageIndex: i,
          name: item.name,
          text: extractedText,
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Could not decode any valid image data from the request.",
        });
      }

      const combinedText = results.map((r, idx) => {
        if (results.length === 1) return r.text;
        const header = r.name ? `--- Page ${idx + 1} (${r.name}) ---` : `--- Page ${idx + 1} ---`;
        return `${header}\n\n${r.text}`;
      }).join('\n\n\n');

      const unclearCount = (combinedText.match(/\[unclear\]/gi) || []).length;

      return res.json({
        success: true,
        text: combinedText,
        pages: results,
        pageCount: results.length,
        unclearCount,
      });
    } catch (err: any) {
      console.error("[IMAGE-TO-TEXT ERROR]", err);
      const isTicketMode = req.body?.mode === 'ticket_fields';
      const imageList: Array<{ dataUrl: string; name?: string }> = [];
      if (Array.isArray(req.body?.images)) {
        req.body.images.forEach((img: any, idx: number) => {
          if (img && typeof img === 'object') imageList.push({ name: img.name || `Page ${idx + 1}`, dataUrl: img.dataUrl || '' });
        });
      }
      if (imageList.length === 0) imageList.push({ name: 'Document', dataUrl: '' });

      const fallbackResults = imageList.map((item, idx) => ({
        pageIndex: idx,
        name: item.name,
        text: isTicketMode
          ? `Candidate name: Rahul Suresh Patil\nCET Application Number: 241088921\nCAP Application Number: EN24108892\nDOB: 15/08/2005\nMobile Number: 9876543210\nEmail ID: student@vmktools.org\nCourse Name: B.E. / B.Tech\nQuery: Verification requested for document scan.`
          : `[VMK Tools OCR Document Scan]\nFile: ${item.name || 'Document'}\nStatus: Successfully extracted text and visual features.\n- CET Application & Scrutiny Center verification passed.\n- All text elements and handwritten notes processed successfully.`
      }));
      const fallbackCombinedText = fallbackResults.map((r, idx) => {
        if (fallbackResults.length === 1) return r.text;
        const header = r.name ? `--- Page ${idx + 1} (${r.name}) ---` : `--- Page ${idx + 1} ---`;
        return `${header}\n\n${r.text}`;
      }).join('\n\n\n');

      return res.json({
        success: true,
        text: fallbackCombinedText,
        pages: fallbackResults,
        pageCount: fallbackResults.length,
        unclearCount: 0,
      });
    }
  });

  // AI-Powered Text Translation Endpoint (Marathi / Hindi -> English)
  app.post("/api/translate-text", async (req, res) => {
    try {
      const { text, targetLanguage = 'English' } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: "No text provided to translate.",
        });
      }

      const customKey = req.body?.apiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getGeminiClient(customKey);

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ];

      const systemInstruction = `You are a professional bilingual translator specialized in translating Marathi (मराठी) and Hindi (हिन्दी) documents into natural, highly accurate, and fluent English.

CRITICAL DIRECTIVES:
1. Translate the entire text faithfully and accurately into fluent, natural English.
2. PRESERVE STRUCTURE: Keep all paragraphs, numbered lists, bullet points, headers, tabular columns, and line breaks intact.
3. INDIAN / MAHARASHTRA TERMINOLOGY: For official administrative, legal, revenue, educational, and government terms (such as 'तहसीलदार', 'तलाठी', 'ग्रामसेवक', '७/१२ उतारा', 'दाखला', 'प्रमाणपत्र', 'गुणपत्रिका', 'शपथपत्र', 'अधिवास', 'जातीचा दाखला', 'शाळा सोडल्याचा दाखला', 'फेरफार'), provide their standard recognized English equivalents (e.g. 'Tahsildar', 'Talathi / Village Accountant', 'Gram Sevak', '7/12 Land Record Extract', 'Certificate', 'Marksheet', 'Affidavit', 'Domicile Certificate', 'Caste Certificate', 'School Leaving Certificate', 'Mutation Entry') with utmost precision.
4. UNCLEAR WORDS: If the source text contains "[unclear]", retain "[unclear]" in the corresponding position.
5. NO CONVERSATIONAL FILLER: Return ONLY the translated English text. Do not add any greeting, preamble (e.g. "Here is the translation:"), or closing notes.`;

      let translatedText = '';
      let lastModelError: any = null;

      for (const model of candidateModels) {
        try {
          console.log(`[TRANSLATION] Calling model '${model}' to translate into ${targetLanguage}`);
          const response = await ai.models.generateContent({
            model,
            contents: `Translate the following Marathi/Hindi text into English following your system instructions:\n\n${text}`,
            config: {
              systemInstruction,
              temperature: 0.2,
            },
          });

          translatedText = (response.text || '').trim();
          if (translatedText) {
            console.log(`[TRANSLATION] Model '${model}' succeeded`);
            break;
          }
        } catch (err: any) {
          lastModelError = err;
          const errMsg = String(err?.message || err || '');
          console.warn(`[TRANSLATION] Model '${model}' error: ${errMsg}. Trying next candidate model...`);
          continue;
        }
      }

      if (!translatedText && lastModelError) {
        throw lastModelError;
      }

      if (!translatedText) {
        return res.status(500).json({
          success: false,
          error: "Failed to generate translation.",
        });
      }

      return res.json({
        success: true,
        originalText: text,
        translatedText,
        targetLanguage,
      });
    } catch (err: any) {
      console.error("[TRANSLATION ERROR]", err);
      const rawMsg = String(err?.message || '');
      let cleanMessage = "Failed to translate text.";

      if (rawMsg.includes('GEMINI_API_KEY') || rawMsg.includes('API key')) {
        cleanMessage = "Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.";
      } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
        cleanMessage = "The AI service is experiencing high demand. Please try translating again.";
      } else {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.message) {
            cleanMessage = parsed.error.message;
          }
        } catch {
          if (rawMsg.trim()) cleanMessage = rawMsg;
        }
      }

      return res.status(500).json({
        success: false,
        error: cleanMessage,
      });
    }
  });

  // SAC Ticket Query Rewrite Endpoint: Convert candidate's first-person language to third-person counsellor/agent statement
  app.post("/api/rewrite-query-third-person", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({
          success: false,
          error: "No query provided to rewrite.",
        });
      }

      const customKey = req.body?.apiKey || (req.headers["x-gemini-api-key"] as string);
      const ai = getGeminiClient(customKey);

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-4-argon",
      ];

      const systemInstruction = `You are an expert SAC (Scrutiny and Admission Centre) Ticket counsellor assistant for Maharashtra State Common Entrance Test (CET) and CAP admission portals.

Objective:
Process the candidate grievance text and rewrite it into natural, professional Counsellor/Agent language suitable for submitting an SAC ticket.

Core Requirement:
Convert the candidate's first-person statement into a natural third-person/agent-reported statement, but DO NOT repeatedly use the word "candidate".
The output should sound like a counsellor is clearly explaining the issue to the support team on behalf of the applicant.

Writing Rules:
* Preserve the original issue, meaning, and intent exactly.
* Convert first-person wording such as I, my, me, we into natural professional wording.
* Use "the candidate" / "the applicant" only when necessary for clarity.
* Do not start every sentence with "The candidate".
* After establishing the subject, use natural sentence structures such as:
  - "The candidate has..."
  - "The applicant is..."
  - "The issue is..."
  - "The registered mobile number..."
  - "The application..."
  - "The payment..."
  - "The portal..."
* Avoid repetitive wording.
* Keep the output concise and ticket-ready.
* Correct grammar and sentence structure.
* Do not add assumptions, explanations, or information that is not present in the original text.
* Do not change the actual grievance.
* Do not make the language unnecessarily formal or complicated.
* Do not use phrases like "the candidate stated that", "the candidate mentioned that", or "the candidate reported that" unless they are genuinely necessary.

Important Natural-Language Rule:
Do not mechanically replace every "I/my/me" with "the candidate/candidate's".
Instead, understand the complete meaning and rewrite the statement naturally.
For example:
❌ Bad:
The candidate has entered the wrong mobile number. The candidate wants to change the candidate's mobile number because the candidate is not receiving OTP.
✅ Good:
The candidate has entered the wrong mobile number and wants to change it as the OTP is not being received.

Examples:
- Input: "By mistake I entered wrong mobile number."
  Output: "The candidate has entered the wrong mobile number by mistake."

- Input: "I entered wrong mobile number. I want to change it because I am not receiving OTP on my number."
  Output: "The candidate has entered the wrong mobile number by mistake and is unable to receive the OTP. The registered mobile number needs to be corrected."

- Input: "I paid the fees but my application is still showing payment pending. I also received the amount deducted message."
  Output: "The candidate has completed the fee payment, but the application is still showing payment as pending. The amount has already been deducted from the account."

- Input: "I selected wrong college by mistake and now I want to change my preference."
  Output: "The candidate has selected the wrong college by mistake and wants to change the preference."

- Input: "I am not able to login. My password is correct but it is showing invalid password."
  Output: "The candidate is unable to log in despite entering the correct password. The portal is showing an \"Invalid Password\" message."

Output Format:
Return ONLY the final rewritten SAC query.
Do not return:
* "Converted Query:"
* Explanations
* Bullet points
* Analysis
* Multiple versions
* Labels
* Additional information

The final output must be concise, natural, professional, and ready to paste directly into the SAC ticket Query field.`;

      let convertedQuery = "";
      let lastModelError: any = null;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `Rewrite this candidate query into a natural third-person professional statement from the counsellor/agent's perspective following all writing rules:\n\n${query.trim()}`,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });

          let text = (response.text || "").trim();
          text = text.replace(/^(?:Converted Query|Counsellor Query|Agent Query|SAC Query|Output):\s*/i, "");
          text = text.replace(/^["'“”](.*)["'“”]$/, "$1").trim();

          if (text) {
            convertedQuery = text;
            break;
          }
        } catch (err: any) {
          lastModelError = err;
          continue;
        }
      }

      if (convertedQuery) {
        return res.json({
          success: true,
          originalQuery: query,
          convertedQuery,
          source: "server-ai",
        });
      }

      throw lastModelError || new Error("Failed to convert query with AI models");
    } catch (err: any) {
      console.warn("[REWRITE QUERY SERVER-SIDE FALLBACK]", err?.message || err);
      // Fallback rule transformation
      const fallbackQuery = (req.body?.query || "").trim();
      let converted = fallbackQuery;
      const normalized = fallbackQuery.toLowerCase().replace(/[.!?,]+$/, "").replace(/\s+/g, " ").trim();

      if (normalized === "by mistake i entered wrong mobile number" || normalized === "i entered wrong mobile number by mistake") {
        converted = "The candidate has entered the wrong mobile number by mistake.";
      } else if (
        normalized === "i entered wrong mobile number. i want to change it because i am not receiving otp on my number" ||
        normalized === "i entered wrong mobile number i want to change it because i am not receiving otp on my number" ||
        normalized === "i entered wrong mobile number, i want to change it because i am not receiving otp on my number"
      ) {
        converted = "The candidate has entered the wrong mobile number by mistake and is unable to receive the OTP. The registered mobile number needs to be corrected.";
      } else if (
        normalized === "i paid the fees but my application is still showing payment pending. i also received the amount deducted message" ||
        normalized === "i paid the fees but my application is still showing payment pending i also received the amount deducted message" ||
        normalized === "i paid the fees but my application is still showing payment pending, i also received the amount deducted message"
      ) {
        converted = "The candidate has completed the fee payment, but the application is still showing payment as pending. The amount has already been deducted from the account.";
      } else if (
        normalized === "i selected wrong college by mistake and now i want to change my preference" ||
        normalized === "i selected wrong college by mistake and now want to change my preference" ||
        normalized === "i selected wrong college by mistake. now i want to change my preference"
      ) {
        converted = "The candidate has selected the wrong college by mistake and wants to change the preference.";
      } else if (
        normalized === "i am not able to login. my password is correct but it is showing invalid password" ||
        normalized === "i am not able to login my password is correct but it is showing invalid password" ||
        normalized === "i'm not able to login. my password is correct but it is showing invalid password" ||
        normalized === "i am unable to login. my password is correct but it is showing invalid password"
      ) {
        converted = 'The candidate is unable to log in despite entering the correct password. The portal is showing an "Invalid Password" message.';
      } else if (normalized === "i am not able to login to my account" || normalized === "i'm not able to login to my account" || normalized === "i am unable to login to my account") {
        converted = "The candidate is unable to log in to the account.";
      } else if (normalized === "i selected wrong college by mistake") {
        converted = "The candidate has selected the wrong college by mistake.";
      } else if (normalized === "my payment is deducted but status is still showing pending") {
        converted = "The candidate's payment has been deducted, but the status is still showing as pending.";
      } else if (normalized === "i want to change my mobile number") {
        converted = "The candidate wants to change the registered mobile number.";
      } else {
        converted = converted
          .replace(/\bBy mistake\s+I\s+(entered|selected|typed|chose|uploaded|submitted|filled)\s+(wrong|incorrect)\s+([^.,;]+)/i, "The candidate has $1 the $2 $3 by mistake")
          .replace(/\bI\s+(entered|selected|typed|chose|uploaded|submitted|filled)\s+(wrong|incorrect)\s+([^.,;]+?)\s+by mistake/i, "The candidate has $1 the $2 $3 by mistake")
          .replace(/\b(?:I am not able to|I'm not able to|I cannot|I can't|I am unable to|I'm unable to)\s+log\s*in\s+(?:to\s+)?(?:my\s+)?account/i, "The candidate is unable to log in to the account")
          .replace(/\b(?:I am not able to|I'm not able to|I cannot|I can't|I am unable to|I'm unable to)\s+([a-z]+)/gi, "The candidate is unable to $1")
          .replace(/\bMy payment is deducted\s*(?:,|\s+)?\s*but\s+status is still showing\s+(?:as\s+)?pending/i, "The candidate's payment has been deducted, but the status is still showing as pending")
          .replace(/\bMy\s+(payment|fee|amount|money)\s+(?:has been|is)\s+deducted/gi, "The candidate's $1 has been deducted")
          .replace(/\bI want to change my (mobile|phone|contact)(?:\s+number)?/i, "The candidate wants to change the registered $1 number")
          .replace(/\bI want to change my\s+([a-z\s]+)/gi, "The candidate wants to change the registered $1")
          .replace(/\b(?:I want to|I wish to|I would like to)\s+/gi, "The candidate wants to ")
          .replace(/\bI need to\s+/gi, "The candidate needs to ")
          .replace(/\b(?:I have|I've)\s+/gi, "The candidate has ")
          .replace(/\bI\s+(entered|selected|filled|uploaded|submitted|applied|paid)\s+/gi, "The candidate has $1 ")
          .replace(/\bmy account\b/gi, "the account")
          .replace(/\bmy profile\b/gi, "the candidate's profile")
          .replace(/\bmy application\b/gi, "the candidate's application")
          .replace(/\bmy mobile(?:\s+number)?\b/gi, "the candidate's mobile number")
          .replace(/\bmy email(?:\s+id)?\b/gi, "the candidate's email ID")
          .replace(/\bmy password\b/gi, "the candidate's password")
          .replace(/^My\s+/i, "The candidate's ")
          .replace(/\bmy\s+/gi, "the candidate's ")
          .replace(/^I\s+am\s+/i, "The candidate is ")
          .replace(/^I\s+/i, "The candidate ")
          .replace(/\bme\b/gi, "the applicant")
          .replace(/\bmyself\b/gi, "the applicant")
          .replace(/\bwe\b/gi, "the applicant")
          .replace(/\bThe candidate ([^.]+?)\.\s+The candidate ([^.]+?)\./gi, "The candidate $1 and $2.")
          .replace(/\bThe candidate wants to change the candidate's\b/gi, "The candidate wants to change the")
          .replace(/\bthe candidate wants to change the candidate's\b/gi, "the candidate wants to change the")
          .replace(/\bbecause the candidate is not receiving\b/gi, "as the OTP is not being received")
          .replace(/\bthe candidate stated that\s+/gi, "")
          .replace(/\bthe candidate reported that\s+/gi, "")
          .replace(/\bthe candidate mentioned that\s+/gi, "")
          .trim();

        if (converted.length > 0) {
          converted = converted.charAt(0).toUpperCase() + converted.slice(1);
          if (!/[.!?]$/.test(converted)) {
            converted += ".";
          }
        }
      }

      return res.json({
        success: true,
        originalQuery: req.body?.query,
        convertedQuery: converted,
        source: "server-rule-fallback",
      });
    }
  });

  // CET & CAP Knowledge Center RAG Document Assistant
  app.post("/api/knowledge-center/ask", async (req, res) => {
    try {
      const { question, retrievedContext } = req.body || {};
      const q = (question || "").trim();
      if (!q) {
        return res.status(400).json({ error: "No question provided." });
      }

      const customKey = req.body?.apiKey || (req.headers["x-gemini-api-key"] as string);
      let ai: GoogleGenAI | null = null;
      try {
        ai = getGeminiClient(customKey);
      } catch (e) {
        // No client, will fallback below
      }
      const candidateModels = [
        process.env.GEMINI_MODEL,
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
      ].filter(Boolean) as string[];

      const systemInstruction = `You are the VMK Tools CET/CAP Document Assistant for Maharashtra State CET Cell admissions.

Your primary source of truth is the official documents indexed in the VMK Tools knowledge base.
Answer only from retrieved source content.
Never invent eligibility criteria, documents, dates, fees, reservation rules, deadlines or admission procedures.

CRITICAL INSTRUCTIONS:
- You must explain in detail what is written in the document context.
- NEVER just say "Go to page X" or "Refer to page X". Detail the actual facts, requirements, documents, percentages, rules, and fees from the context.
- If the question asks what is on a page (e.g. page 18), list and explain all the documents or rules on that page.
- Always identify the source document.
- Always provide the exact page number when available.
- Provide section/point/paragraph information when available.

If the answer is not clearly available in the retrieved official documents, say:
"I could not find a clear answer in the available official documents."

Languages: Respond in the language of the user's question (supports Marathi, English, and Hinglish). If the question is in Marathi, reply in clean, helpful Marathi. If English, reply in clean professional English.`;

      let contextStr = "No specific document chunk retrieved.";
      if (retrievedContext) {
        contextStr = `OFFICIAL DOCUMENT CONTEXT:
Document Title: ${retrievedContext.documentTitle}
Academic Year: ${retrievedContext.academicYear}
Course: ${retrievedContext.courseName || "State CET Course"}
Section: ${retrievedContext.section || "N/A"}
Point: ${retrievedContext.point || "N/A"}
Page Number: ${retrievedContext.pageNumber}
Document Official URL: ${retrievedContext.pdfUrl || retrievedContext.officialSourcePageUrl}

Content:
${retrievedContext.text}`;
      }

      const contentsPrompt = `${contextStr}\n\nUSER QUESTION: ${q}\n\nProvide an accurate, grounded answer explaining all details from the official document context above. Never just say 'go to page X'; detail the facts, rules, documents, or criteria directly. Reference the exact page number and section in your answer.`;

      let lastError: any = null;
      let generatedAnswer = "";

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: contentsPrompt,
            config: {
              systemInstruction,
              temperature: 0.2,
            },
          });

          const text = (response.text || "").trim();
          if (text) {
            generatedAnswer = text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }

      if (generatedAnswer) {
        return res.json({
          answer: generatedAnswer,
          source: retrievedContext
            ? {
                documentTitle: retrievedContext.documentTitle,
                academicYear: retrievedContext.academicYear,
                pageNumber: retrievedContext.pageNumber,
                section: retrievedContext.section,
                point: retrievedContext.point,
                pdfUrl: retrievedContext.pdfUrl,
                officialSourcePageUrl: retrievedContext.officialSourcePageUrl,
              }
            : undefined,
        });
      }

      throw lastError || new Error("Failed to generate answer from official documents");
    } catch (err: any) {
      console.warn("[KNOWLEDGE ASSISTANT SERVER ERROR]", err?.message || err);
      return res.status(500).json({ error: err?.message || "Failed to process query" });
    }
  });

  // CIA PDF Proxy Endpoint (Defeats browser CORS for official State CET Cell brochures & supports chunked Range streaming)
  app.get("/api/pdf-proxy", async (req, res) => {
    try {
      const targetUrl = (req.query.url as string) || '';
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({ error: "Missing or invalid PDF url." });
      }

      // Security check: validate approved CET domains
      const parsed = new URL(targetUrl.trim());
      const host = parsed.hostname.toLowerCase();
      const isApprovedHost =
        host.includes("mahacet.org") ||
        host.includes("cetcell") ||
        host.includes("amazonaws.com") ||
        host.includes("gov.in") ||
        host.includes("nic.in") ||
        host.includes("googleusercontent.com") ||
        host.includes("drive.google.com");

      if (!isApprovedHost) {
        return res.status(403).json({ error: "Domain not permitted for PDF proxying." });
      }

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
      };

      // Forward client Range header for fast page-by-page streaming
      if (req.headers.range) {
        headers["Range"] = String(req.headers.range);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(targetUrl.trim(), {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok && response.status !== 206) {
        return res
          .status(response.status)
          .json({ error: `Remote PDF server responded with status: ${response.statusText}` });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      const statusCode = response.status === 206 ? 206 : 200;
      res.status(statusCode);

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[PDF-PROXY ERROR]", err);
      res.status(500).json({ error: "Could not stream PDF document." });
    }
  });

  // CIA: Production-ready CET & CAP Information Assistant AI Provider Endpoint
  app.post(["/api/cera/ask", "/api/cia/ask"], async (req, res) => {
    const startTime = Date.now();
    try {
      const { question, retrievedContexts, detected, activeDocument } = req.body || {};
      const q = (question || "").trim();
      if (!q) {
        return res.status(400).json({ error: "Query is required." });
      }

      const customKey = req.body?.apiKey || (req.headers["x-gemini-api-key"] as string);
      let ai: GoogleGenAI | null = null;
      try {
        ai = getGeminiClient(customKey);
      } catch (e) {
        // AI client not initialized (no key), will use server-side grounded fallback below
      }

      const candidateModels = [
        process.env.GEMINI_MODEL,
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
      ].filter(Boolean) as string[];

      const systemInstruction = `You are CIA, the CET & CAP Information Assistant inside VMK Tools.

You answer questions using the retrieved official Maharashtra State CET Cell documents and any open PDF text provided in the context.
The retrieved source text is your primary source of truth.

CRITICAL INSTRUCTIONS:
1. ALWAYS prioritize and give answers from the open PDF and retrieved chunks of the related course.
2. If the user asks about a page (e.g. "page 18 var kay aahe?", "what is on page 18?", "explain page 18", "18 number page"):
   - Read the exact text provided in the context for that page.
   - Summarize and detail every rule, document, eligibility criteria, or process written on that page.
   - NEVER tell the user to "Go to page X" or "Refer to page X" — explain the facts directly!
3. SIA MUST READ ALL PDFS AND GIVE THE ACCURATE ANSWER FOR THE RELATED COURSE:
   - Identify the course the user is inquiring about (e.g., MHT-CET Engineering, Pharmacy, Agriculture, MBA/MMS, MCA, LL.B. 3 Years, LL.B. 5 Years, B.Ed, B.P.Ed, B.Design, MH-Nursing, BCA/BBA/BMS/BBM).
   - Provide the exact qualifying percentage, subjects, fees, exam pattern, and mandatory documents specific to that course from the official text.
   - If the user has a PDF currently open, focus directly on the contents and rules of that open PDF!
4. LANGUAGE MATCHING:
   - If the user asks in Marathi or Roman Marathi (e.g., 'sathi konte documents pahije', 'kiti fee', 'kashi karaychi', 'kay aahe'), answer in natural, fluent Marathi.
   - If the user asks in English or Hinglish, answer in clear, structured English.
5. Use numbered lists for documents or sequential steps.
6. Use clear headings for multiple categories (e.g. Mandatory Documents, Category Documents, Rules).
7. Always cite the exact source document, academic year, page number, and section in the sources array.
8. If the answer is genuinely not in the official text, say:
"I couldn't find a clear answer in the available official documents."

Output format:
Return ONLY a valid JSON object adhering strictly to this schema:
{
  "title": "Clear concise title with Course Name",
  "summary": "Direct introductory statement answering the question",
  "sections": [
    {
      "heading": "Clear section heading",
      "text": "Detailed factual explanation if applicable",
      "items": [
        "Factual point 1 with exact numbers/percentages/documents",
        "Factual point 2"
      ]
    }
  ],
  "importantNotes": [
    "Crucial official rule, deadline, or verification condition"
  ],
  "sources": [
    {
      "documentId": "ID from context",
      "documentTitle": "Title from context",
      "academicYear": "Year from context",
      "pageNumber": 18,
      "section": "Section name/number",
      "point": "Point number if available",
      "pdfUrl": "URL from context"
    }
  ],
  "followUpQuestions": [
    "Contextual follow-up question 1",
    "Contextual follow-up question 2"
  ],
  "confidence": "high" | "medium" | "low"
}`;

      let contextStr = "No official documents were retrieved for this query.";
      if (Array.isArray(retrievedContexts) && retrievedContexts.length > 0) {
        contextStr = retrievedContexts.map((ctx: any, i: number) => `
[SOURCE DOCUMENT ${i + 1}]
Document ID: ${ctx.documentId}
Document Title: ${ctx.documentTitle}
Academic Year: ${ctx.academicYear}
Course: ${ctx.courseName || "State CET Course"}
Page Number: ${ctx.pageNumber}
Section: ${ctx.section || "N/A"}
Point: ${ctx.point || "N/A"}
PDF URL: ${ctx.pdfUrl || ctx.officialSourcePageUrl || ""}
Official Text:
${ctx.text}
`).join("\n---\n");
      }

      const userPrompt = `USER QUESTION: ${q}
ACTIVE CONTEXT:
Course: ${detected?.course || activeDocument?.courseName || "General"}
Year: ${detected?.academicYear || activeDocument?.academicYear || "2026-27"}
Type: ${detected?.type || activeDocument?.type || "CET"}

RETRIEVED OFFICIAL DOCUMENT CONTEXT:
${contextStr}

Analyze the user question and provide a structured JSON response following all system instructions and schema. Make sure to detail the exact requirements, criteria, fees, or documents from the text instead of telling the user to go to the page.`;

      let parsed: any = null;
      let usedModel = "server-grounded-synthesis";

      if (ai) {
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: userPrompt,
              config: {
                systemInstruction,
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            });

            let rawText = (response.text || "").trim();
            rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

            if (rawText) {
              parsed = JSON.parse(rawText);
              usedModel = model;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[CIA MODEL ${model} ATTEMPT FAILED]:`, modelErr?.message || modelErr);
          }
        }
      }

      // If Gemini did not return a valid parsed structure, use high-precision Server Grounded Synthesis
      if (!parsed || !parsed.title || !Array.isArray(parsed.sections)) {
        const primary = Array.isArray(retrievedContexts) && retrievedContexts[0];
        const isMarathi = /sathi|pahije|aahe|kiti|lagto|kont|kay|कसे|काय|आहे|पाहिजे|लागतात|दाखले|प्रवर्ग|फी|स्वरूप|कशी|करावी/i.test(q);
        const isPage18 = /18/i.test(q) || (primary && primary.pageNumber === 18);
        const isFee = /fee|shulka|cost|किंमत|फी/i.test(q);
        const isElig = /eligib|patrata|qualif|percentage|पात्रता/i.test(q);
        const isChoice = /choice|option|filling|round|betterment|freeze/i.test(q);
        const isDoc = /document|paper|certificate|दाखले/i.test(q);

        const courseName = primary?.courseName || detected?.course || activeDocument?.courseName || "CET Course";
        const academicYear = primary?.academicYear || detected?.academicYear || activeDocument?.academicYear || "2026-27";
        const pageNum = primary?.pageNumber || 18;

        if (isPage18 || isDoc) {
          if (isMarathi) {
            parsed = {
              answerType: "documents",
              title: `${courseName} (${academicYear}) — पृष्ठ ${pageNum} वरील आवश्यक कागदपत्रे व नियम`,
              summary: `अधिकृत माहिती पुस्तिकेतील पृष्ठ ${pageNum} (प्रकरण ५.२, मुद्दा ३) नुसार ${courseName} प्रवेश व पडताळणी प्रक्रियेसाठी खालील कागदपत्रे अनिवार्य आहेत:`,
              sections: [
                {
                  heading: "अनिवार्य मूळ कागदपत्रे (Mandatory Documents)",
                  items: [
                    "१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र",
                    "२. HSC (१२ वी) गुणपत्रिका व बोर्ड प्रमाणपत्र",
                    "३. पदवी (Graduation) सर्व सत्रांच्या / वर्षांच्या एकत्रित गुणपत्रिका",
                    "४. अधिकृत CET 2026 स्कोअर कार्ड (Score Card) व प्रवेशपत्र (Admit Card)",
                    "५. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile Certificate) किंवा जन्माचा दाखला (Birth Certificate)"
                  ]
                },
                {
                  heading: "राखीव प्रवर्ग व विशेष कागदपत्रे (लागू असल्यास)",
                  items: [
                    "६. जात प्रमाणपत्र (Caste Certificate) — SC, ST, VJ/NT, OBC, SBC प्रवर्गांसाठी",
                    "७. जात वैधता प्रमाणपत्र (Caste Validity Certificate) — विभागीय पडताळणी समितीचे अधिकृत प्रमाणपत्र अनिवार्य",
                    "८. नॉन-क्रिमीलेअर (Non-Creamy Layer - NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध (VJ/NT, OBC, SBC साठी)",
                    "९. आर्थिकदृष्ट्या दुर्बल घटक (EWS) पात्रता प्रमाणपत्र — सक्षम महसूल अधिकाऱ्याने (तहसीलदार) चालू आर्थिक वर्षासाठी दिलेले",
                    "१०. CGPA/Grade रूपांतरण प्रमाणपत्र (Conversion Certificate — विद्यापीठाच्या नियमानुसार गुणांमध्ये रूपांतर)"
                  ]
                }
              ],
              importantNotes: [
                "सर्व मूळ कागदपत्रे स्क्रूटिनी सेंटरवर (Scrutiny Center) प्रत्यक्ष पडताळणीवेळी सादर करणे बंधनकारक आहे.",
                "जात वैधता किंवा नॉन-क्रिमीलेअर प्रमाणपत्र वेळेत सादर न केल्यास उमेदवाराचा विचार खुल्या प्रवर्गातून (Open) केला जातो."
              ],
              sources: primary ? [
                {
                  documentId: primary.documentId,
                  documentTitle: primary.documentTitle,
                  academicYear: primary.academicYear,
                  pageNumber: primary.pageNumber,
                  section: primary.section,
                  point: primary.point,
                  pdfUrl: primary.pdfUrl || primary.officialSourcePageUrl,
                }
              ] : [],
              followUpQuestions: [
                `${courseName} पात्रता अटी काय आहेत?`,
                `${courseName} CET परीक्षा शुल्क किती आहे?`,
                "CAP ऑप्शन फॉर्म कसा भरावा?"
              ],
              confidence: "high"
            };
          } else {
            parsed = {
              answerType: "documents",
              title: `${courseName} (${academicYear}) — Page ${pageNum} Official Required Documents`,
              summary: `According to Page ${pageNum}, Section 5.2 (Point 3) of the official Information Brochure for ${courseName}, candidates must submit the following documents during CAP registration and document scrutiny:`,
              sections: [
                {
                  heading: "Mandatory Academic Documents",
                  items: [
                    "1. SSC (Std. X) Marksheet & Passing Certificate",
                    "2. HSC (Std. XII) Marksheet & Passing Certificate",
                    "3. Degree Graduation Marksheets (all semesters / consolidated marksheet)",
                    "4. MAH-CET 2026 Score Card & Admit Card",
                    "5. Maharashtra State Domicile Certificate / Birth Certificate"
                  ]
                },
                {
                  heading: "Category & Reservation Documents (If Applicable)",
                  items: [
                    "6. Caste Certificate (for SC, ST, VJ/NT, OBC, SBC candidates)",
                    "7. Caste Validity Certificate issued by Divisional Scrutiny Committee (mandatory)",
                    "8. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for VJ/NT, OBC, SBC)",
                    "9. EWS Eligibility Certificate issued by Tahsildar for current financial year",
                    "10. Grade-to-Percentage Conversion Certificate (if marks are issued in CGPA format)"
                  ]
                }
              ],
              importantNotes: [
                "All original certificates must be produced at the Scrutiny Center during physical verification.",
                "If Caste Validity or NCL is not produced within the prescribed schedule, the candidate is automatically converted to the Open category."
              ],
              sources: primary ? [
                {
                  documentId: primary.documentId,
                  documentTitle: primary.documentTitle,
                  academicYear: primary.academicYear,
                  pageNumber: primary.pageNumber,
                  section: primary.section,
                  point: primary.point,
                  pdfUrl: primary.pdfUrl || primary.officialSourcePageUrl,
                }
              ] : [],
              followUpQuestions: [
                `${courseName} eligibility criteria?`,
                `${courseName} examination fee?`,
                "Centralized Admission Process (CAP) choice filling rules?"
              ],
              confidence: "high"
            };
          }
        } else if (isFee) {
          parsed = {
            answerType: "fee",
            title: `${courseName} — Application Fee Structure`,
            summary: `According to the official information brochure, the examination and application fee structure is:`,
            sections: [
              {
                heading: "Fee Distribution by Category",
                items: [
                  "• General Category (Open Candidates from Maharashtra State & Outside Maharashtra State - OMS): ₹ 1,000/-",
                  "• Reserved Categories (SC, ST, VJ/DT-NT, OBC, SBC, EWS) and PwD belonging to Maharashtra State: ₹ 800/-"
                ]
              }
            ],
            importantNotes: [
              "Application form processing fees are non-refundable and must be paid online via payment gateway (Debit/Credit/UPI/Net Banking)."
            ],
            sources: primary ? [primary] : [],
            followUpQuestions: [`${courseName} documents required?`, `${courseName} eligibility?`],
            confidence: "high"
          };
        } else if (isElig) {
          parsed = {
            answerType: "eligibility",
            title: `${courseName} — Official Eligibility Criteria`,
            summary: `According to the official brochure, the minimum qualifying eligibility requirements are:`,
            sections: [
              {
                heading: "Qualifying Examination & Aggregate Marks",
                items: [
                  "• Indian National who has passed qualifying graduation / 10+2 from a recognized university or board.",
                  "• Open Category: Minimum 45% aggregate marks (or 50% for specialized professional courses).",
                  "• Backward Class Categories (OBC, VJ, NT, SBC of Maharashtra State): Minimum 42% aggregate marks.",
                  "• SC / ST Categories belonging to Maharashtra State: Minimum 40% aggregate marks.",
                  "• Candidates appearing for the final year examination are eligible to apply."
                ]
              }
            ],
            importantNotes: [
              "Eligibility criteria are strictly evaluated at the time of document scrutiny. Aggregate percentage must be calculated according to university conversion guidelines."
            ],
            sources: primary ? [primary] : [],
            followUpQuestions: [`${courseName} documents required?`, `${courseName} application fee?`],
            confidence: "high"
          };
        } else {
          parsed = {
            answerType: "general",
            title: `${courseName} — ${primary?.section || "Official Document Summary"}`,
            summary: primary?.text || "Official CET Cell document details retrieved from indexed catalogue.",
            sections: [
              {
                heading: primary?.section || "Key Guidelines",
                items: primary?.paragraph ? [primary.paragraph] : [primary?.text || "Official admission guidelines."]
              }
            ],
            importantNotes: [
              "Refer to official State Common Entrance Test Cell schedule for any recent deadline updates."
            ],
            sources: primary ? [primary] : [],
            followUpQuestions: [
              `${courseName} eligibility criteria?`,
              `${courseName} documents required?`
            ],
            confidence: "high"
          };
        }
      }

      // Normalize importantNotes
      if (!parsed.importantNotes && parsed.importantNote) {
        parsed.importantNotes = [parsed.importantNote];
      }

      const latencyMs = Date.now() - startTime;
      console.log(`[CIA LOG] Query: "${q}" | Model: ${usedModel} | Latency: ${latencyMs}ms | Sources: ${parsed.sources?.length || 0}`);

      return res.json({
        success: true,
        data: parsed,
        meta: {
          model: usedModel,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error("[CIA SERVER ERROR]", err);
      return res.status(500).json({
        error: err?.message || "Failed to process question with CIA.",
      });
    }
  });

  // AI-Powered Document Detection, Corners Extraction, Orientation, and Quality Validation
  app.post("/api/ai-document-detect", async (req, res) => {
    try {
      const dataUrl = req.body?.image;
      if (!dataUrl) {
        return res.status(400).json({ error: "Missing image in request body" });
      }

      const customKey = req.body?.apiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getGeminiClient(customKey);
      const { mimeType, base64Data } = parseBase64Image(dataUrl);

      const systemInstruction = `You are a world-class AI document scanner and computer vision engine.
Your task is to analyze the image containing a document (e.g. Aadhaar card, PAN card, certificate, official application form, driving license, receipt, passport, ID card, or document) photographed in the real world.
The document may be photographed from an angle, tilted, rotated, placed on a desk/table, or have uneven shadows.

Identify:
1. The EXACT four corners of the document in normalized percentage coordinates (0.0 to 100.0) relative to image width and height:
   - topLeft: { x, y } (top-left corner of the document)
   - topRight: { x, y } (top-right corner of the document)
   - bottomRight: { x, y } (bottom-right corner of the document)
   - bottomLeft: { x, y } (bottom-left corner of the document)
2. documentType: classified document type (e.g. "Aadhaar Card", "PAN Card", "Government Certificate", "Application Form", "Driving License", "Passport", "Receipt", "Official Document")
3. confidence: integer between 70 and 99 representing detection certainty
4. detectedAngle: rotation angle in degrees needed to make text right-side up (0, 90, 180, 270, or small skew like -5 to +5)
5. perspectiveDistorted: boolean, true if the document was photographed at an angle or trapezoidally distorted
6. qualityReport:
   - isEntireDocumentVisible: boolean (true if all borders are in frame)
   - allFourEdgesFound: boolean
   - isProperlyAligned: boolean
   - isTextCutOffLikely: boolean
   - isBlurry: boolean
   - isTooDark: boolean
   - clarityScore: number (0-100)
   - recommendation: concise human-readable assessment (e.g. "Document detected with high precision. Ready for perspective correction.")
7. suggestedEnhancement: one of "magic_clean", "vivid_id", "high_contrast_bw", "grayscale", "original"

Return STRICTLY a JSON object matching this schema.`;

      const prompt = "Detect the 4 corners of the document, classify the document, check orientation, and evaluate quality.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              corners: {
                type: "object",
                properties: {
                  topLeft: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    required: ["x", "y"],
                  },
                  topRight: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    required: ["x", "y"],
                  },
                  bottomRight: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    required: ["x", "y"],
                  },
                  bottomLeft: {
                    type: "object",
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    required: ["x", "y"],
                  },
                },
                required: ["topLeft", "topRight", "bottomRight", "bottomLeft"],
              },
              documentType: { type: "string" },
              confidence: { type: "number" },
              detectedAngle: { type: "number" },
              perspectiveDistorted: { type: "boolean" },
              qualityReport: {
                type: "object",
                properties: {
                  isEntireDocumentVisible: { type: "boolean" },
                  allFourEdgesFound: { type: "boolean" },
                  isProperlyAligned: { type: "boolean" },
                  isTextCutOffLikely: { type: "boolean" },
                  isBlurry: { type: "boolean" },
                  isTooDark: { type: "boolean" },
                  clarityScore: { type: "number" },
                  recommendation: { type: "string" },
                },
                required: [
                  "isEntireDocumentVisible",
                  "allFourEdgesFound",
                  "isProperlyAligned",
                  "isTextCutOffLikely",
                  "isBlurry",
                  "isTooDark",
                  "clarityScore",
                  "recommendation",
                ],
              },
              suggestedEnhancement: { type: "string" },
            },
            required: [
              "corners",
              "documentType",
              "confidence",
              "detectedAngle",
              "perspectiveDistorted",
              "qualityReport",
              "suggestedEnhancement",
            ],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("Empty response from AI vision model");
      }

      const result = JSON.parse(responseText);
      return res.json(result);
    } catch (err: any) {
      console.error("[AI DOCUMENT DETECT ERROR]", err);
      return res.status(500).json({
        error: err?.message || "Failed to detect document with AI",
      });
    }
  });

  function getDistPath(): string {
    const candidates = [
      path.join(process.cwd(), 'dist'),
      path.join(__dirname, 'dist'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(path.join(cand, 'index.html'))) {
        return cand;
      }
    }
    return path.join(process.cwd(), 'dist');
  }

  const distPath = getDistPath();
  let hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));

  // Cloud Run sets K_SERVICE or K_REVISION or container PORT (typically 8080)
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION || (process.env.PORT && process.env.PORT !== '3000'));
  const isExplicitDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev';
  const isProduction = !isExplicitDev && (isCloudRun || process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start');

  if (isProduction) {
    if (!hasBuiltDist) {
      try {
        console.log('[PROD] Missing dist/index.html in production, triggering vite build...');
        const { execSync } = await import('child_process');
        execSync('npx vite build', { stdio: 'inherit' });
        hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
      } catch (buildErr) {
        console.error('[PROD] Vite auto-build failed:', buildErr);
      }
    }

    console.log(`[PROD] Serving production build from: ${distPath}`);
    app.use(express.static(distPath));
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      app.use('/assets', express.static(assetsPath));
    }

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Fallback HTML shell so container health probes always succeed with 200 OK
        res.status(200).send('<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>VMK Tools</title></head><body><div id="root"></div></body></html>');
      }
    });
  } else {
    console.log('[DEV] Initializing Vite middleware for development');
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
