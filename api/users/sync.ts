import { getStoredUsers, saveStoredUsers, StoredUser } from "../_userStore";
import { readRequestBody } from "../_gemini";

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
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    const { users } = body || {};

    if (!Array.isArray(users)) {
      return res.status(400).json({ success: false, message: "Array of users expected." });
    }

    const currentUsers = getStoredUsers();
    const map = new Map<string, StoredUser>();

    // Seed current users by lowercase username
    for (const u of currentUsers) {
      if (u && u.username) {
        map.set(u.username.toLowerCase(), { ...u });
      }
    }

    // Merge incoming users
    for (const u of users) {
      if (u && u.username) {
        const key = u.username.toLowerCase();
        const existing = map.get(key);
        const merged: StoredUser = {
          ...existing,
          ...u,
          username: key,
          password: u.password || existing?.password || "123456",
        };
        map.set(key, merged);
      }
    }

    const mergedList = Array.from(map.values());
    saveStoredUsers(mergedList);

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${mergedList.length} users across system.`,
      users: mergedList,
    });
  } catch (err: any) {
    console.error("[USERS SYNC ERROR]", err);
    return res.status(500).json({ success: false, message: err?.message || "Sync failed." });
  }
}
