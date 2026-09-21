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
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const username = (url.searchParams.get('username') || req.query?.username || '').trim().toLowerCase();
    const role = (url.searchParams.get('role') || req.query?.role || '').trim().toLowerCase();
    const district = (url.searchParams.get('district') || req.query?.district || '').trim().toLowerCase();

    let files = vaultStore;

    // DNO can see all files in their district (or all files if root master DNO)
    const isDno = role === 'dno' || username === 'dno';

    if (isDno) {
      if (district && username !== 'dno') {
        files = files.filter(f => !f.district || f.district.trim().toLowerCase() === district);
      }
      return res.status(200).json({ success: true, files });
    }

    // Counsellors, Supporting Staff, and Operators can ONLY see their own uploaded files.
    // Other counsellors cannot see each other's files.
    if (username) {
      files = files.filter(f => (f.uploadedBy || '').trim().toLowerCase() === username);
    } else {
      files = [];
    }

    return res.status(200).json({ success: true, files });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error fetching vault files' });
  }
}
