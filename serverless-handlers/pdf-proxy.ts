export default async function handler(req: any, res: any) {
  // Standard Cross-Origin Headers for PDF canvas & worker consumption
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let targetUrl = (req.query?.url as string) || '';
    if (!targetUrl && req.url) {
      try {
        const parsed = new URL(req.url, 'http://localhost');
        targetUrl = parsed.searchParams.get('url') || '';
      } catch {
        // fallback
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Missing or invalid target PDF url.' });
    }

    targetUrl = targetUrl.trim();

    // Security check: validate permitted CET / document domains
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase();
      const isApprovedHost =
        host.includes('mahacet.org') ||
        host.includes('cetcell') ||
        host.includes('amazonaws.com') ||
        host.includes('gov.in') ||
        host.includes('nic.in') ||
        host.includes('googleusercontent.com') ||
        host.includes('drive.google.com');

      if (!isApprovedHost) {
        return res.status(403).json({ error: 'Domain not permitted for PDF proxying.' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL structure.' });
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/pdf,*/*',
    };

    // Forward HTTP Range header for streaming chunks and large PDF support
    const clientRange = req.headers?.range || req.headers?.Range;
    if (clientRange) {
      headers['Range'] = String(clientRange);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const upstreamResponse = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return res.status(upstreamResponse.status).json({
        error: `Remote PDF server responded with status: ${upstreamResponse.statusText || upstreamResponse.status}`,
      });
    }

    // Set PDF streaming headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const statusCode = upstreamResponse.status === 206 ? 206 : 200;
    res.status(statusCode);

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    return res.end(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('[PDF-PROXY HANDLER ERROR]', err);
    return res.status(500).json({
      error: 'Could not stream PDF document.',
      details: err?.message || String(err),
    });
  }
}
