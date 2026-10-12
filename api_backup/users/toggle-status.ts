import { getStoredUsers, saveStoredUsers } from "../_userStore";
import { readRequestBody } from "../_gemini";

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
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    const { userId, isActive } = body || {};

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const cleanUserId = String(userId).trim().toLowerCase();
    const users = getStoredUsers();
    const user = users.find(
      (u) => u.id === userId || u.username?.toLowerCase() === cleanUserId
    );

    if (!user) {
      return res.status(200).json({ success: true, message: "User status updated." });
    }

    if (user.username?.toLowerCase() === "shrinath" && !isActive) {
      return res.status(400).json({
        success: false,
        message: "The Super Administrator account cannot be disabled.",
      });
    }

    user.isActive = Boolean(isActive);
    saveStoredUsers(users);

    return res.status(200).json({
      success: true,
      message: `User "${user.username}" is now ${user.isActive ? "active" : "disabled"}.`,
      user,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to toggle user status.",
    });
  }
}
