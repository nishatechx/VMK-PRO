import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface QrUploadedFile {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  isDownloadedToSoftware: boolean;
  verifiedStamp: boolean;
  category: string;
}

// In-memory data store for real-time cross-device sync
const sessionStore = new Map<string, QrUploadedFile[]>();
const vaultStore: QrUploadedFile[] = [];

// SSE client connections for instant push notifications
const sseSubscribers = new Map<string, Set<express.Response>>();

function detectDocCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('hsc') || lower.includes('ssc') || lower.includes('mark') || lower.includes('result')) return 'Mark Sheet / Result';
  if (lower.includes('caste') || lower.includes('ncl') || lower.includes('ews') || lower.includes('validity')) return 'Caste / Category Certificate';
  if (lower.includes('domicile') || lower.includes('birth') || lower.includes('lc') || lower.includes('leaving')) return 'Domicile / Birth / LC';
  if (lower.includes('income') || lower.includes('tws')) return 'Income Certificate';
  if (lower.includes('photo') || lower.includes('sign') || lower.includes('image') || lower.includes('pic')) return 'Photo / Signature';
  if (lower.includes('cet') || lower.includes('allotment') || lower.includes('score') || lower.includes('admit')) return 'CET / Score Card / Allotment';
  return 'Candidate Document';
}

function broadcastToFileSubscribers(sessionId: string, file: QrUploadedFile) {
  const clients = sseSubscribers.get(sessionId);
  if (clients) {
    const data = JSON.stringify({ type: 'NEW_FILE', sessionId, file });
    clients.forEach((res) => {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        console.warn('Failed to send SSE to client:', e);
      }
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure high body limit for high-resolution images & PDFs uploaded via mobile
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // CORS and Cache control
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Upload file from Mobile or Desktop
  app.post("/api/qr-upload", (req, res) => {
    try {
      const { sessionId, name, type, size, dataUrl, category } = req.body;

      if (!sessionId || !name || !dataUrl) {
        return res.status(400).json({ error: "Missing required fields (sessionId, name, dataUrl)" });
      }

      const file: QrUploadedFile = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sessionId: String(sessionId).trim(),
        name: String(name),
        type: type || 'application/octet-stream',
        size: Number(size) || 0,
        dataUrl: String(dataUrl),
        uploadedAt: new Date().toISOString(),
        isDownloadedToSoftware: true,
        verifiedStamp: false,
        category: category || detectDocCategory(name),
      };

      // Store in session
      if (!sessionStore.has(file.sessionId)) {
        sessionStore.set(file.sessionId, []);
      }
      const sessionFiles = sessionStore.get(file.sessionId)!;
      sessionFiles.unshift(file);
      if (sessionFiles.length > 50) sessionFiles.pop();

      // Store in global vault
      vaultStore.unshift(file);
      if (vaultStore.length > 100) vaultStore.pop();

      // Realtime push to any listening desktop clients
      broadcastToFileSubscribers(file.sessionId, file);

      console.log(`[QR-UPLOAD] Received "${file.name}" (${file.size} bytes) for Session ${file.sessionId}`);

      return res.status(200).json({ success: true, file });
    } catch (err: any) {
      console.error('[QR-UPLOAD ERROR]', err);
      return res.status(500).json({ error: err?.message || 'Server error processing file' });
    }
  });

  // Get files for a specific session
  app.get("/api/qr-files", (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.json({ success: true, files: [] });
      }

      const files = sessionStore.get(String(sessionId).trim()) || [];
      return res.json({ success: true, files });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error fetching files' });
    }
  });

  // Get all vault files
  app.get("/api/qr-vault", (req, res) => {
    try {
      return res.json({ success: true, files: vaultStore });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error fetching vault files' });
    }
  });

  // Real-time Server-Sent Events (SSE) stream for instant sync
  app.get("/api/qr-events", (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).send("sessionId required");
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', sessionId })}\n\n`);

    if (!sseSubscribers.has(sessionId)) {
      sseSubscribers.set(sessionId, new Set());
    }
    const set = sseSubscribers.get(sessionId)!;
    set.add(res);

    req.on('close', () => {
      set.delete(res);
      if (set.size === 0) {
        sseSubscribers.delete(sessionId);
      }
    });
  });

  // Toggle verification stamp
  app.post("/api/qr-verify", (req, res) => {
    try {
      const { sessionId, fileId } = req.body;
      let updatedStatus = false;

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const target = list.find((f) => f.id === fileId);
        if (target) {
          target.verifiedStamp = !target.verifiedStamp;
          updatedStatus = target.verifiedStamp;
        }
      }

      const vaultTarget = vaultStore.find((f) => f.id === fileId);
      if (vaultTarget) {
        vaultTarget.verifiedStamp = updatedStatus;
      }

      return res.json({ success: true, verified: updatedStatus });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error updating verification' });
    }
  });

  // Delete file
  app.delete("/api/qr-files", (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const fileId = req.query.fileId as string;

      if (sessionId && sessionStore.has(sessionId)) {
        const list = sessionStore.get(sessionId)!;
        const idx = list.findIndex((f) => f.id === fileId);
        if (idx >= 0) list.splice(idx, 1);
      }

      const vaultIdx = vaultStore.findIndex((f) => f.id === fileId);
      if (vaultIdx >= 0) vaultStore.splice(vaultIdx, 1);

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error deleting file' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
