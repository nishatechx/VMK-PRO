import { getStoredUsers, saveStoredUsers, findUserByIdentifier } from "../_userStore";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let rawId = String(req.query?.id || '').trim();
  if (!rawId) {
    const parts = (req.url || '').split('?')[0].split('/');
    const last = parts[parts.length - 1];
    if (last) {
      rawId = decodeURIComponent(last).trim();
    }
  }

  if (!rawId) {
    return res.status(400).json({ success: false, message: "User ID is required." });
  }

  // GET: Single user lookup
  if (req.method === 'GET') {
    const user = findUserByIdentifier(rawId);
    if (user) {
      return res.status(200).json({ success: true, user });
    }
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // DELETE: Remove user
  if (req.method === 'DELETE') {
    if (
      rawId === "super_admin_shrinath" ||
      rawId.toLowerCase() === "shrinath"
    ) {
      return res.status(403).json({
        success: false,
        message: "The Super Administrator profile is protected and cannot be deleted.",
      });
    }

    const users = getStoredUsers();
    const targetIndex = users.findIndex(
      (u) => u.id === rawId || u.username?.toLowerCase() === rawId.toLowerCase()
    );

    if (targetIndex !== -1) {
      const deletedUser = users[targetIndex];
      users.splice(targetIndex, 1);
      saveStoredUsers(users);
      return res.status(200).json({
        success: true,
        message: `User profile "${deletedUser.username}" deleted successfully.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile removed successfully.",
    });
  }

  return res.status(405).json({ success: false, message: "Method Not Allowed" });
}
