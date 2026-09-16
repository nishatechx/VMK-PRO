import { sessionStore, vaultStore, detectDocCategory, QrUploadedFile } from "./_qrStore";
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
    const { sessionId, name, type, size, dataUrl, category } = body;

    if (!sessionId || !name || !dataUrl) {
      return res.status(400).json({ success: false, error: "Missing required fields (sessionId, name, dataUrl)" });
    }

    const file: QrUploadedFile = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId: String(sessionId).trim(),
      name: String(name),
      type: type || 'application/octet-stream',
      size: Number(size) || 0,
      dataUrl: String(dataUrl),
      uploadedAt: new Date().toISOString(),
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: category || detectDocCategory(name),
    };

    // Store in session
    if (!sessionStore.has(file.sessionId)) {
      sessionStore.set(file.sessionId, []);
    }
    const sessionFiles = sessionStore.get(file.sessionId)!;
    sessionFiles.unshift(file);
    if (sessionFiles.length > 50) sessionFiles.pop();

    // Store in global vault
    vaultStore.unshift(file);
    if (vaultStore.length > 100) vaultStore.pop();

    console.log(`[QR-UPLOAD VERCEL] Received "${file.name}" (${file.size} bytes) for Session ${file.sessionId}`);

    return res.status(200).json({ success: true, file });
  } catch (err: any) {
    console.error('[QR-UPLOAD VERCEL ERROR]', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error processing file' });
  }
}
