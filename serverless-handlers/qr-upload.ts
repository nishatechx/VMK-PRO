import { sessionStore, vaultStore, persistVaultStore, detectDocCategory, QrUploadedFile } from "./_qrStore";
import { readRequestBody } from "./_gemini";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    const resolvedSessionId =
      body?.sessionId || body?.session || body?.qrSession || req.query?.sessionId || req.query?.qrSession;
    const resolvedDataUrl = body?.dataUrl || body?.data || body?.fileData;
    const resolvedName =
      body?.name ||
      (resolvedDataUrl && typeof resolvedDataUrl === 'string' && resolvedDataUrl.startsWith('data:application/pdf')
        ? `Document_${Date.now()}.pdf`
        : `Scan_${Date.now()}.jpg`);

    if (!resolvedSessionId || !resolvedDataUrl) {
      return res.status(400).json({ success: false, error: "Missing required fields (sessionId, dataUrl)" });
    }

    const { type, size, category, folder, uploadedBy, uploaderName, uploaderRole, district } = body;
    const normSessionId = String(resolvedSessionId).trim().toUpperCase();
    const rawSessionId = String(resolvedSessionId).trim();

    const file: QrUploadedFile = {
      id: (body?.id && String(body.id).trim()) || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId: normSessionId,
      name: String(resolvedName),
      type: type || (resolvedDataUrl.startsWith('data:image/') ? 'image/jpeg' : (resolvedDataUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'application/octet-stream')),
      size: Number(size) || Math.round(String(resolvedDataUrl).length * 0.75),
      dataUrl: String(resolvedDataUrl),
      uploadedAt: body?.uploadedAt || new Date().toISOString(),
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: category || detectDocCategory(resolvedName),
      folder: folder ? String(folder).trim() : undefined,
      uploadedBy: uploadedBy ? String(uploadedBy).trim() : undefined,
      uploaderName: uploaderName ? String(uploaderName).trim() : undefined,
      uploaderRole: uploaderRole ? String(uploaderRole).trim() : undefined,
      district: district ? String(district).trim() : undefined,
    };

    // Store in session (normalized and raw) with de-duplication
    if (!sessionStore.has(normSessionId)) {
      sessionStore.set(normSessionId, []);
    }
    const sessionFiles = sessionStore.get(normSessionId)!;
    const existingSessionIdx = sessionFiles.findIndex((f) => f.id === file.id);
    if (existingSessionIdx >= 0) {
      sessionFiles[existingSessionIdx] = file;
    } else {
      sessionFiles.unshift(file);
    }
    if (sessionFiles.length > 100) sessionFiles.pop();

    if (rawSessionId !== normSessionId) {
      if (!sessionStore.has(rawSessionId)) {
        sessionStore.set(rawSessionId, []);
      }
      const rawList = sessionStore.get(rawSessionId)!;
      const existingRawIdx = rawList.findIndex((f) => f.id === file.id);
      if (existingRawIdx >= 0) {
        rawList[existingRawIdx] = file;
      } else {
        rawList.unshift(file);
      }
    }

    // Store in global vault with de-duplication
    const existingVaultIdx = vaultStore.findIndex((f) => f.id === file.id);
    if (existingVaultIdx >= 0) {
      vaultStore[existingVaultIdx] = file;
    } else {
      vaultStore.unshift(file);
    }
    if (vaultStore.length > 300) vaultStore.pop();

    // Persist to disk so other lambdas / restarts see it
    persistVaultStore();

    console.log(`[QR-UPLOAD] Received "${file.name}" (${file.size} bytes) [ID: ${file.id}] for Session ${normSessionId} by ${file.uploadedBy || 'anonymous'}`);

    return res.status(200).json({ success: true, file });
  } catch (err: any) {
    console.error('[QR-UPLOAD ERROR]', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error processing file' });
  }
}
