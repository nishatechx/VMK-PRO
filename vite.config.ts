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
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
