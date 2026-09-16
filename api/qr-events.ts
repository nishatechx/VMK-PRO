export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = (req.query?.sessionId as string) || '';
  if (!sessionId) {
    return res.status(400).send("sessionId required");
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', sessionId })}\n\n`);

  // In serverless environments, heartbeat ping to keep connection healthy
  const interval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'PING', timestamp: Date.now() })}\n\n`);
    } catch {
      clearInterval(interval);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
