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
    const sessionId = (url.searchParams.get('sessionId') || req.query?.sessionId || '').trim().toUpperCase();

    let files = vaultStore;

    // Super Admin sees all files across all districts
    const isSuperAdmin = role === 'super_admin' || username === 'shrinath';
    if (isSuperAdmin) {
      return res.status(200).json({ success: true, files });
    }

    // DNO can see all files in their district (or all files if root master DNO)
    const isDno = role === 'dno' || username === 'dno';
    if (isDno) {
      if (district && username !== 'dno') {
        files = files.filter(f => !f.district || f.district.trim().toLowerCase() === district);
      }
      return res.status(200).json({ success: true, files });
    }

    // Counsellors, Supporting Staff, and Operators:
    // Always include files from this active session!
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

    return res.status(200).json({ success: true, files });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error fetching vault files' });
  }
}
