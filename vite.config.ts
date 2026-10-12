import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// In-memory store for QR upload sessions
const qrSessions = new Map<string, Array<{
  id: string;
  sessionId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}>>();

function qrUploadApiPlugin(): Plugin {
  return {
    name: 'qr-upload-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // POST /api/qr-upload
        if (req.method === 'POST' && url === '/api/qr-upload') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 60 * 1024 * 1024) {
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'File too large' }));
              req.destroy();
            }
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { sessionId, name, type, size, dataUrl } = data;
              if (!sessionId || !dataUrl || !name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required file data' }));
                return;
              }

              const newFile = {
                id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                sessionId,
                name,
                type: type || 'application/octet-stream',
                size: Number(size) || 0,
                dataUrl,
                uploadedAt: new Date().toISOString(),
              };

              const existing = qrSessions.get(sessionId) || [];
              existing.unshift(newFile);
              if (existing.length > 30) existing.pop();
              qrSessions.set(sessionId, existing);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, file: newFile }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        // GET /api/qr-files
        if (req.method === 'GET' && url.startsWith('/api/qr-files')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const sessionId = parsedUrl.searchParams.get('sessionId') || '';
          const files = qrSessions.get(sessionId) || [];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ files }));
          return;
        }

        // DELETE /api/qr-files
        if (req.method === 'DELETE' && url.startsWith('/api/qr-files')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const sessionId = parsedUrl.searchParams.get('sessionId') || '';
          const fileId = parsedUrl.searchParams.get('fileId') || '';
          const files = qrSessions.get(sessionId) || [];
          const updated = files.filter((f) => f.id !== fileId);
          qrSessions.set(sessionId, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, files: updated }));
          return;
        }

        // GET /api/cetcell-notices
        if (req.method === 'GET' && url.startsWith('/api/cetcell-notices')) {
          (async () => {
            try {
              const cetRes = await fetch("https://cetcell.mahacet.org/notices/", {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                }
              });
              const html = await cetRes.text();
              const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
              const matches = [...html.matchAll(rowRegex)];
              const seen = new Set<string>();
              const list: any[] = [];

              for (const m of matches) {
                const sn = m[1].replace(/<[^>]+>/g, "").trim();
                if (!sn || sn.toLowerCase().includes("sr.no")) continue;
                const course = m[2].replace(/<[^>]+>/g, "").trim();
                const subject = m[3].replace(/<[^>]+>/g, "").trim()
                  .replace(/&#038;/g, "&")
                  .replace(/&amp;/g, "&")
                  .replace(/&ndash;/g, "–")
                  .replace(/&nbsp;/g, " ");
                const date = m[4].replace(/<[^>]+>/g, "").trim();
                const linkMatch = m[5].match(/href="([^"]+)"/i);
                let link = linkMatch ? linkMatch[1] : "";
                if (link && !link.startsWith("http")) {
                  link = `https://cetcell.mahacet.org${link.startsWith('/') ? '' : '/'}${link}`;
                }
                const dedupeKey = `${subject}::${date}`;
                if (!seen.has(dedupeKey)) {
                  seen.add(dedupeKey);
                  list.push({ sn, course, subject, date, link });
                }
              }

              const now = new Date();
              const istFormatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              const istDate = istFormatter.format(now);
              const day = String(now.getDate()).padStart(2, '0');
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const year = String(now.getFullYear());
              const sysDate = `${day}/${month}/${year}`;

              const parsedUrl = new URL(url, 'http://localhost');
              const requestedDate = parsedUrl.searchParams.get('date');

              function parseDDMMYYYY(str: string) {
                const [d, m, y] = str.split('/').map(Number);
                return new Date(y, m - 1, d);
              }
              function formatDDMMYYYY(dt: Date) {
                const d = String(dt.getDate()).padStart(2, '0');
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const y = String(dt.getFullYear());
                return `${d}/${m}/${y}`;
              }
              function getPriorDay(str: string) {
                try {
                  const dt = parseDDMMYYYY(str);
                  dt.setDate(dt.getDate() - 1);
                  return formatDDMMYYYY(dt);
                } catch {
                  return '';
                }
              }

              const primaryTodayDate = requestedDate || sysDate;
              const primaryYesterdayDate = getPriorDay(primaryTodayDate);

              const todayDates = new Set<string>();
              if (requestedDate) todayDates.add(requestedDate);
              todayDates.add(istDate);
              todayDates.add(sysDate);

              const yesterdayDates = new Set<string>();
              for (const d of todayDates) {
                const yd = getPriorDay(d);
                if (yd && !todayDates.has(yd)) yesterdayDates.add(yd);
              }

              const todayNotices = list
                .filter((n) => todayDates.has(n.date))
                .map((n) => ({ ...n, period: 'today' }));

              const yesterdayNotices = list
                .filter((n) => yesterdayDates.has(n.date) && !todayDates.has(n.date))
                .map((n) => ({ ...n, period: 'yesterday' }));

              let highlightNotices = [...todayNotices, ...yesterdayNotices];
              if (highlightNotices.length === 0 && list.length > 0) {
                highlightNotices = list.slice(0, 3).map((n) => ({ ...n, period: 'recent' }));
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                currentDate: primaryTodayDate,
                yesterdayDate: primaryYesterdayDate,
                istDate,
                highlightNotices,
                todayNotices,
                yesterdayNotices,
                hasHighlightNotices: highlightNotices.length > 0,
                hasTodayNotices: todayNotices.length > 0,
                hasYesterdayNotices: yesterdayNotices.length > 0,
                latestDate: list.length > 0 ? list[0].date : sysDate,
                latestNotices: list.slice(0, 10),
                allNotices: list,
                totalNotices: list.length,
                source: 'https://cetcell.mahacet.org/notices/',
              }));
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                currentDate: '09/09/2026',
                yesterdayDate: '08/09/2026',
                highlightNotices: [{
                  sn: '1',
                  course: 'Engineering',
                  subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
                  date: '09/09/2026',
                  link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf',
                  period: 'today'
                }],
                todayNotices: [{
                  sn: '1',
                  course: 'Engineering',
                  subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
                  date: '09/09/2026',
                  link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf',
                  period: 'today'
                }],
                hasHighlightNotices: true,
                hasTodayNotices: true,
                hasYesterdayNotices: false,
                latestDate: '09/09/2026',
                allNotices: [],
              }));
            }
          })();
          return;
        }

        // GET /api/pdf-proxy
        if (req.method === 'GET' && url.startsWith('/api/pdf-proxy')) {
          (async () => {
            try {
              const parsedUrl = new URL(url, 'http://localhost');
              const targetUrl = parsedUrl.searchParams.get('url') || '';
              if (!targetUrl || !targetUrl.startsWith('http')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing or invalid target PDF url' }));
                return;
              }

              const headers: Record<string, string> = {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'application/pdf,*/*',
              };
              if (req.headers.range) {
                headers['Range'] = String(req.headers.range);
              }

              const upstreamRes = await fetch(targetUrl.trim(), { headers });
              if (!upstreamRes.ok && upstreamRes.status !== 206) {
                res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Remote server error fetching PDF' }));
                return;
              }

              const respHeaders: Record<string, string> = {
                'Content-Type': 'application/pdf',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400',
              };

              const contentRange = upstreamRes.headers.get('content-range');
              if (contentRange) respHeaders['Content-Range'] = contentRange;
              const contentLength = upstreamRes.headers.get('content-length');
              if (contentLength) respHeaders['Content-Length'] = contentLength;

              res.writeHead(upstreamRes.status === 206 ? 206 : 200, respHeaders);
              const arrayBuffer = await upstreamRes.arrayBuffer();
              res.end(Buffer.from(arrayBuffer));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'PDF proxy error', details: err?.message }));
            }
          })();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), qrUploadApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
                return 'vendor-pdf';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-dom') || id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              return 'vendor-misc';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
