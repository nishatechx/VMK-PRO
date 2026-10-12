import fs from "fs";
import path from "path";

export interface QrUploadedFile {
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

declare global {
  var __globalSessionStore: Map<string, QrUploadedFile[]> | undefined;
  var __globalVaultStore: QrUploadedFile[] | undefined;
}

export const sessionStore: Map<string, QrUploadedFile[]> =
  globalThis.__globalSessionStore || (globalThis.__globalSessionStore = new Map());

export const vaultStore: QrUploadedFile[] =
  globalThis.__globalVaultStore || (globalThis.__globalVaultStore = []);

function resolveVaultFilePath(): string {
  const localDataDir = path.join(process.cwd(), "data");
  if (fs.existsSync(localDataDir)) {
    return path.join(localDataDir, "vault.json");
  }
  return path.join("/tmp", "vmk_vault.json");
}

// Hydrate from disk on initial cold start
try {
  const filePath = resolveVaultFilePath();
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && vaultStore.length === 0) {
      vaultStore.push(...parsed);
      // Re-populate sessions
      for (const f of parsed) {
        if (f.sessionId) {
          const sId = String(f.sessionId).trim().toUpperCase();
          if (!sessionStore.has(sId)) sessionStore.set(sId, []);
          const list = sessionStore.get(sId)!;
          if (!list.some((existing) => existing.id === f.id)) {
            list.push(f);
          }
        }
      }
    }
  }
} catch (e) {
  // Ignore
}

export function persistVaultStore(): void {
  const targetPaths = [
    path.join("/tmp", "vmk_vault.json"),
    path.join(process.cwd(), "data", "vault.json"),
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(vaultStore.slice(0, 250), null, 2), "utf-8");
    } catch {
      // Ignore
    }
  }
}

export function detectDocCategory(fileName: string): string {
  const lower = (fileName || "").toLowerCase();
  if (lower.includes("hsc") || lower.includes("ssc") || lower.includes("mark") || lower.includes("result"))
    return "Mark Sheet / Result";
  if (lower.includes("caste") || lower.includes("ncl") || lower.includes("ews") || lower.includes("validity"))
    return "Caste / Category Certificate";
  if (lower.includes("domicile") || lower.includes("birth") || lower.includes("lc") || lower.includes("leaving"))
    return "Domicile / Birth / LC";
  if (lower.includes("income") || lower.includes("tws"))
    return "Income Certificate";
  if (lower.includes("photo") || lower.includes("sign") || lower.includes("image") || lower.includes("pic"))
    return "Photo / Signature";
  if (lower.includes("cet") || lower.includes("allotment") || lower.includes("score") || lower.includes("admit"))
    return "CET / Score Card / Allotment";
  return "Candidate Document";
}
