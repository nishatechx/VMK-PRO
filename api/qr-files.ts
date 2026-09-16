import { sessionStore, vaultStore, QrUploadedFile } from "./_qrStore";
import { readRequestBody } from "./_gemini";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Get files for a session
  if (req.method === 'GET') {
    try {
      const sessionId = (req.query?.sessionId as string) || '';
      if (!sessionId) {
        return res.status(200).json({ success: true, files: [] });
      }

      const files = sessionStore.get(String(sessionId).trim()) || [];
      return res.status(200).json({ success: true, files });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error fetching files' });
    }
  }

  // PATCH: Update/crop a file
  if (req.method === 'PATCH') {
    try {
      const body = await readRequestBody(req);
      const { sessionId, fileId, dataUrl, size, name } = body;
      if (!fileId) {
        return res.status(400).json({ success: false, error: "Missing fileId" });
      }

      let updatedFile: QrUploadedFile | null = null;

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const target = list.find((f) => f.id === fileId);
        if (target) {
          if (dataUrl) target.dataUrl = dataUrl;
          if (size !== undefined) target.size = size;
          if (name) target.name = name;
          updatedFile = target;
        }
      }

      const vaultTarget = vaultStore.find((f) => f.id === fileId);
      if (vaultTarget) {
        if (dataUrl) vaultTarget.dataUrl = dataUrl;
        if (size !== undefined) vaultTarget.size = size;
        if (name) vaultTarget.name = name;
        if (!updatedFile) updatedFile = vaultTarget;
      }

      return res.status(200).json({ success: true, file: updatedFile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error updating file' });
    }
  }

  // DELETE: Delete a file
  if (req.method === 'DELETE') {
    try {
      const sessionId = (req.query?.sessionId as string) || '';
      const fileId = (req.query?.fileId as string) || '';

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) list.splice(idx, 1);
      }

      const vaultIdx = vaultStore.findIndex((f) => f.id === fileId);
      if (vaultIdx >= 0) vaultStore.splice(vaultIdx, 1);

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error deleting file' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
