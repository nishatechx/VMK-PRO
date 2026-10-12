import { getStoredUsers, saveStoredUsers, StoredUser, DEFAULT_INITIAL_USERS } from "./_userStore";
import { readRequestBody } from "./_gemini";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch all users
  if (req.method === 'GET') {
    try {
      const users = getStoredUsers();
      return res.status(200).json({ success: true, users });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Error fetching users' });
    }
  }

  // POST: Create or update user
  if (req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const user = body;
      if (!user || !user.username) {
        return res.status(400).json({ success: false, message: "Invalid user data provided." });
      }

      const cleanUsername = String(user.username).trim().toLowerCase();
      const cleanPassword = user.password ? String(user.password).trim() : "";
      const users = getStoredUsers();

      // Check duplicate username for another user ID
      const duplicate = users.find(
        (u) => u.username?.toLowerCase() === cleanUsername && u.id !== user.id
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Username "${user.username}" is already in use by another profile.`,
        });
      }

      const existingIndex = users.findIndex(
        (u) => u.id === user.id || u.username?.toLowerCase() === cleanUsername
      );

      const existingUser = existingIndex >= 0 ? users[existingIndex] : null;

      const cleanUser: StoredUser = {
        ...user,
        id: user.id || (existingUser ? existingUser.id : `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`),
        username: cleanUsername,
        password: cleanPassword || (existingUser ? existingUser.password : "123456"),
        fullName: (user.fullName || cleanUsername).trim(),
        designation: (user.designation || "Staff Member").trim(),
        role: user.role || "supporting_staff",
        district: user.district || (existingUser ? existingUser.district : "Washim"),
        phone: user.phone || (existingUser ? existingUser.phone : ""),
        email: user.email || (existingUser ? existingUser.email : ""),
        allowedTabs: Array.isArray(user.allowedTabs) ? user.allowedTabs : ["dashboard", "profile"],
        allowedFeatures: Array.isArray(user.allowedFeatures) ? user.allowedFeatures : [],
        canUseApiKey: user.canUseApiKey !== false,
        isActive: user.isActive !== false,
        createdAt: user.createdAt || (existingUser ? existingUser.createdAt : new Date().toISOString()),
        ...(user.profilePicture ? { profilePicture: user.profilePicture } : {}),
        ...(user.lastLogin ? { lastLogin: user.lastLogin } : {}),
      };

      if (existingIndex >= 0) {
        users[existingIndex] = { ...users[existingIndex], ...cleanUser };
      } else {
        users.push(cleanUser);
      }

      saveStoredUsers(users);

      return res.status(200).json({
        success: true,
        message: "User profile saved successfully.",
        user: cleanUser,
      });
    } catch (err: any) {
      console.error("[USERS POST VERCEL ERROR]", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Server error saving user profile.",
      });
    }
  }

  // DELETE: Remove user
  if (req.method === 'DELETE') {
    try {
      let rawId = String(req.query?.id || '').trim();
      if (!rawId) {
        const parts = (req.url || '').split('?')[0].split('/');
        const last = parts[parts.length - 1];
        if (last && last !== 'users' && last !== 'users.ts') {
          rawId = decodeURIComponent(last).trim();
        }
      }
      if (!rawId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
      }

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

      return res.status(404).json({ success: false, message: "User not found." });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to delete user." });
    }
  }

  return res.status(405).json({ success: false, message: "Method Not Allowed" });
}
