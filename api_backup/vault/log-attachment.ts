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
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    console.log('[VAULT LOG VERCEL]', body?.id, body?.fileName);
    return res.status(200).json({ success: true, logged: true });
  } catch (err: any) {
    return res.status(200).json({ success: true, note: 'ignored' });
  }
}
