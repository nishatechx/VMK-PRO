import { authenticateUser } from "../_userStore";
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
    const { username, password } = body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Both username and password are required.",
      });
    }

    const authResult = authenticateUser(username, password);
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message || "Invalid credentials. Please verify ID and password.",
      });
    }

    return res.status(200).json({
      success: true,
      user: authResult.user,
    });
  } catch (err: any) {
    console.error("[AUTH LOGIN VERCEL ERROR]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error during authentication.",
    });
  }
}
