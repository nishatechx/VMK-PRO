import { findUserByIdentifier } from "../_userStore";

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

  try {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    let username = (url.searchParams.get('username') || req.query?.username || '').trim();

    if (!username) {
      const parts = url.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last !== 'lookup' && last !== 'lookup.ts') {
        username = decodeURIComponent(last).trim();
      }
    }

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    const user = findUserByIdentifier(username);
    if (user) {
      return res.status(200).json({ success: true, found: true, user });
    }

    return res.status(200).json({ success: true, found: false, user: null });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || "Lookup error." });
  }
}
