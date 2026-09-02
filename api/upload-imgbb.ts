export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey =
      process.env.IMGBB_API_KEY ||
      req.body?.key ||
      (req.query?.key as string);

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: "No ImgBB API key provided. Set IMGBB_API_KEY in Vercel Environment Variables.",
      });
    }

    let imageData = req.body?.image;
    if (!imageData) {
      return res.status(400).json({ success: false, error: "Missing image data for ImgBB upload" });
    }

    if (typeof imageData === 'string' && imageData.includes('base64,')) {
      imageData = imageData.split('base64,')[1];
    }

    const formData = new URLSearchParams();
    formData.append("image", imageData);
    if (req.body?.name) {
      formData.append("name", String(req.body.name));
    }

    const imgbbUrl = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey.trim())}`;
    const response = await fetch(imgbbUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const json = await response.json();
    return res.status(response.status).json(json);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
}
