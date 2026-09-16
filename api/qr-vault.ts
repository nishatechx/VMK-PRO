import { vaultStore } from "./_qrStore";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    return res.status(200).json({ success: true, files: vaultStore });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error fetching vault files' });
  }
}
