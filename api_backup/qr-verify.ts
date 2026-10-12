import { sessionStore, vaultStore } from "./_qrStore";
import { readRequestBody } from "./_gemini";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    const { sessionId, fileId } = body;
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

    return res.status(200).json({ success: true, verified: updatedStatus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error updating verification' });
  }
}
