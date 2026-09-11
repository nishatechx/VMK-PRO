import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set your Gemini API key in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

function parseBase64Image(dataUrl: string): { mimeType: string; base64Data: string } {
  if (!dataUrl) return { mimeType: 'image/jpeg', base64Data: '' };
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], base64Data: matches[2] };
  }
  return { mimeType: 'image/jpeg', base64Data: dataUrl };
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

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

  // CET Cell Notices Scraping & In-memory Cache
  interface CetNotice {
    sn: string;
    course: string;
    subject: string;
    date: string;
    link: string;
  }

  let cachedCetNotices: CetNotice[] = [];
  let cetNoticesCacheTimestamp = 0;
  const CET_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  async function fetchLiveCetNotices(): Promise<CetNotice[]> {
    const now = Date.now();
    if (cachedCetNotices.length > 0 && now - cetNoticesCacheTimestamp < CET_CACHE_TTL_MS) {
      return cachedCetNotices;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch("https://cetcell.mahacet.org/notices/", {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`CET Cell portal returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
      const matches = [...html.matchAll(rowRegex)];
      const seen = new Set<string>();
      const list: CetNotice[] = [];

      for (const m of matches) {
        const sn = m[1].replace(/<[^>]+>/g, "").trim();
        if (!sn || sn.toLowerCase().includes("sr.no")) continue;

        const course = m[2].replace(/<[^>]+>/g, "").trim();
        const rawSubject = m[3].replace(/<[^>]+>/g, "").trim();
        const subject = rawSubject
          .replace(/&#038;/g, "&")
          .replace(/&amp;/g, "&")
          .replace(/&ndash;/g, "–")
          .replace(/&mdash;/g, "—")
          .replace(/&nbsp;/g, " ")
          .replace(/&#8211;/g, "–")
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"');

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

      if (list.length > 0) {
        cachedCetNotices = list;
        cetNoticesCacheTimestamp = now;
      }
      return cachedCetNotices;
    } catch (err: any) {
      console.warn('[CET-NOTICES] Warning fetching from cetcell.mahacet.org:', err?.message || err);
      if (cachedCetNotices.length > 0) {
        return cachedCetNotices;
      }
      // Resilient fallback to the verified published notice
      return [
        {
          sn: '1',
          course: 'Engineering',
          subject: 'Important Notice to Institutes Regarding Fees for A.Y. 2026–27',
          date: '09/09/2026',
          link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Notice-Addtional-Fees-Demand-2.pdf'
        },
        {
          sn: '2',
          course: 'All Courses Under Technical Education',
          subject: 'Imp Notice :Regarding the Cut-Off Date for All Courses Under Technical Education – A.Y. 2026–27',
          date: '07/09/2026',
          link: 'https://cetcell.mahacet.org/wp-content/uploads/2026/09/Cut-off-circular.pdf'
        }
      ];
    }
  }

  // GET /api/cetcell-notices
  app.get("/api/cetcell-notices", async (req, res) => {
    try {
      const force = req.query.force === 'true';
      if (force) {
        cetNoticesCacheTimestamp = 0;
      }

      const notices = await fetchLiveCetNotices();

      const now = new Date();
      // Format in IST (Asia/Kolkata)
      const istFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const istDate = istFormatter.format(now); // e.g. "10/09/2026"

      // Format in local/system timezone
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      const sysDate = `${day}/${month}/${year}`; // e.g. "09/09/2026" or "10/09/2026"

      // Allow optional custom date query from client
      const requestedDate = req.query.date as string | undefined;

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

      // Filter today notices
      const todayNotices: (CetNotice & { period: 'today' })[] = notices
        .filter((n) => todayDates.has(n.date))
        .map((n) => ({ ...n, period: 'today' as const }));

      // Filter yesterday notices
      const yesterdayNotices: (CetNotice & { period: 'yesterday' })[] = notices
        .filter((n) => yesterdayDates.has(n.date) && !todayDates.has(n.date))
        .map((n) => ({ ...n, period: 'yesterday' as const }));

      // Combined highlight notices from yesterday and today
      let highlightNotices: (CetNotice & { period: 'today' | 'yesterday' | 'recent' })[] = [
        ...todayNotices,
        ...yesterdayNotices,
      ];

      // If no notices were published specifically on yesterday or today (e.g. over weekend), include latest recent notices
      if (highlightNotices.length === 0 && notices.length > 0) {
        highlightNotices = notices.slice(0, 3).map((n) => ({ ...n, period: 'recent' as const }));
      }

      res.json({
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
        latestDate: notices.length > 0 ? notices[0].date : sysDate,
        latestNotices: notices.slice(0, 10),
        allNotices: notices,
        totalNotices: notices.length,
        source: 'https://cetcell.mahacet.org/notices/',
        cachedAt: new Date(cetNoticesCacheTimestamp).toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to fetch CET Cell notices',
      });
    }
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

  // AI-Powered Multimodal Vision Image-to-Text OCR Endpoint
  app.post("/api/image-to-text", async (req, res) => {
    try {
      const { image, images, prompt } = req.body;

      // Normalize images into structured array
      const imageList: Array<{ dataUrl: string; name?: string }> = [];
      if (Array.isArray(images) && images.length > 0) {
        images.forEach((img: any, idx: number) => {
          if (typeof img === 'string' && img.trim()) {
            imageList.push({ dataUrl: img, name: `Page ${idx + 1}` });
          } else if (img && img.dataUrl) {
            imageList.push({ dataUrl: img.dataUrl, name: img.name || `Page ${idx + 1}` });
          }
        });
      } else if (image) {
        if (typeof image === 'string' && image.trim()) {
          imageList.push({ dataUrl: image, name: 'Image 1' });
        } else if (image.dataUrl) {
          imageList.push({ dataUrl: image.dataUrl, name: image.name || 'Image 1' });
        }
      }

      if (imageList.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No image received. Please provide at least one valid image (JPG, JPEG, PNG, WEBP).",
        });
      }

      const ai = getGeminiClient();

      const systemInstruction = `You are a world-class AI vision system specialized in accurate, faithful transcription of both handwritten and printed text from images.

Your task is to analyze the complete visual context of the uploaded image and accurately extract all readable text into digital format.

CRITICAL DIRECTIVES:
1. SUPPORTED LANGUAGES & SCRIPTS:
- Marathi (मराठी) in Devanagari script
- Hindi (हिन्दी) in Devanagari script
- English in Latin script
- Mixed-language / code-switched text (e.g. Marathi + English, Hindi + English, Marathi + Hindi, Marathi + Hindi + English).

2. HANDWRITING RECOGNITION:
- Accurately recognize handwritten text in Marathi, Hindi, and English.
- Handle cursive handwriting, joined letters, diverse handwriting styles, slanted or poorly aligned writing, different pen/pencil weights, notebook pages, personal notes, letters, forms, and mobile camera photographs.
- Use visual context, grammatical context, and language vocabulary to decipher difficult handwriting.

3. INTELLIGENT IMAGE & LAYOUT UNDERSTANDING:
- Automatically understand the complete image, including reading order, headings, paragraphs, multiple columns, lists, tables, handwritten annotations, and forms.
- Automatically handle orientation, rotation, perspective distortion, skew, shadows, uneven lighting, blur, noise, low contrast, and diverse backgrounds.
- For tables or forms, structure the output in a clean, readable text format.
- For handwritten pages, prioritize accurate transcription over pixel-perfect layout reproduction.

4. PRESERVE ORIGINAL TEXT STRICTLY:
- Output what is ACTUALLY written in the image.
- DO NOT translate.
- DO NOT summarize.
- DO NOT rewrite or simplify.
- DO NOT change language.
- DO NOT correct grammar or spelling.
- DO NOT interpret or guess the author's underlying intent.
- Transcribe verbatim. If an image has mixed Marathi and English like "आज मला office मध्ये जायचे आहे.", keep it exactly as "आज मला office मध्ये जायचे आहे.".

5. INTELLIGENT UNCLEAR-TEXT HANDLING:
- If a word, number, or character is genuinely impossible to read or determine with reasonable confidence, do not invent or hallucinate text.
- Use the exact token "[unclear]" in place of that word/part.

6. OUTPUT FORMAT:
- Output ONLY the transcribed text.
- Do NOT wrap in introductory or concluding remarks (such as "Here is the extracted text:").
- Preserve line breaks, paragraphs, lists, and numbers as originally presented.`;

      const results: Array<{ pageIndex: number; name?: string; text: string }> = [];

      // Multi-model resilience: prioritize Google's recommended gemini-3.6-flash and immediately
      // fallback across companion vision models if any individual model encounters temporary demand spikes (503/429/UNAVAILABLE).
      const candidateModels = [
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
      ];

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const { mimeType, base64Data } = parseBase64Image(item.dataUrl);

        if (!base64Data) {
          continue;
        }

        const imagePart = {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Data,
          },
        };

        const customPrompt = prompt?.trim()
          ? `Transcribe all text from this image following the system instructions. Additional guidance: ${prompt}`
          : `Transcribe all readable text from this image (Marathi, Hindi, English, printed or handwritten). Look at the complete visual context, detect text orientation, preserve exact words, reading order, line breaks, and tables. Use [unclear] if a word is truly illegible. Do not translate or modify anything.`;

        let extractedText = '';
        let lastModelError: any = null;

        for (const model of candidateModels) {
          try {
            console.log(`[IMAGE-TO-TEXT] Calling vision model '${model}' for page ${i + 1}/${imageList.length}`);
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [imagePart, { text: customPrompt }],
              },
              config: {
                systemInstruction,
                temperature: 0.1,
              },
            });

            extractedText = (response.text || '').trim();
            if (extractedText) {
              console.log(`[IMAGE-TO-TEXT] Model '${model}' succeeded on page ${i + 1}`);
              break;
            }
          } catch (err: any) {
            lastModelError = err;
            const errMsg = String(err?.message || err || '');
            console.warn(`[IMAGE-TO-TEXT] Model '${model}' encountered error: ${errMsg}. Failing over to next candidate model...`);
            // Immediate fallback to next candidate model in the resilience pool
            continue;
          }
        }

        if (!extractedText && lastModelError) {
          throw lastModelError;
        }

        results.push({
          pageIndex: i,
          name: item.name,
          text: extractedText,
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Could not decode any valid image data from the request.",
        });
      }

      const combinedText = results.map((r, idx) => {
        if (results.length === 1) return r.text;
        const header = r.name ? `--- Page ${idx + 1} (${r.name}) ---` : `--- Page ${idx + 1} ---`;
        return `${header}\n\n${r.text}`;
      }).join('\n\n\n');

      const unclearCount = (combinedText.match(/\[unclear\]/gi) || []).length;

      return res.json({
        success: true,
        text: combinedText,
        pages: results,
        pageCount: results.length,
        unclearCount,
      });
    } catch (err: any) {
      console.error("[IMAGE-TO-TEXT ERROR]", err);
      const rawMsg = String(err?.message || '');
      let cleanMessage = "Failed to process image with vision AI.";

      if (rawMsg.includes('GEMINI_API_KEY') || rawMsg.includes('API key')) {
        cleanMessage = "Gemini API key is not configured. Please verify GEMINI_API_KEY in the environment.";
      } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
        cleanMessage = "The AI vision model is currently experiencing temporary high demand on Google servers. Please retry in a few moments.";
      } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        cleanMessage = "Rate limit temporarily reached. Please wait a moment and click Retry.";
      } else {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.message) {
            cleanMessage = parsed.error.message;
          }
        } catch {
          if (rawMsg.trim()) cleanMessage = rawMsg;
        }
      }

      return res.status(503).json({
        success: false,
        error: cleanMessage,
      });
    }
  });

  // AI-Powered Text Translation Endpoint (Marathi / Hindi -> English)
  app.post("/api/translate-text", async (req, res) => {
    try {
      const { text, targetLanguage = 'English' } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: "No text provided to translate.",
        });
      }

      const ai = getGeminiClient();

      const candidateModels = [
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
      ];

      const systemInstruction = `You are a professional bilingual translator specialized in translating Marathi (मराठी) and Hindi (हिन्दी) documents into natural, highly accurate, and fluent English.

CRITICAL DIRECTIVES:
1. Translate the entire text faithfully and accurately into fluent, natural English.
2. PRESERVE STRUCTURE: Keep all paragraphs, numbered lists, bullet points, headers, tabular columns, and line breaks intact.
3. INDIAN / MAHARASHTRA TERMINOLOGY: For official administrative, legal, revenue, educational, and government terms (such as 'तहसीलदार', 'तलाठी', 'ग्रामसेवक', '७/१२ उतारा', 'दाखला', 'प्रमाणपत्र', 'गुणपत्रिका', 'शपथपत्र', 'अधिवास', 'जातीचा दाखला', 'शाळा सोडल्याचा दाखला', 'फेरफार'), provide their standard recognized English equivalents (e.g. 'Tahsildar', 'Talathi / Village Accountant', 'Gram Sevak', '7/12 Land Record Extract', 'Certificate', 'Marksheet', 'Affidavit', 'Domicile Certificate', 'Caste Certificate', 'School Leaving Certificate', 'Mutation Entry') with utmost precision.
4. UNCLEAR WORDS: If the source text contains "[unclear]", retain "[unclear]" in the corresponding position.
5. NO CONVERSATIONAL FILLER: Return ONLY the translated English text. Do not add any greeting, preamble (e.g. "Here is the translation:"), or closing notes.`;

      let translatedText = '';
      let lastModelError: any = null;

      for (const model of candidateModels) {
        try {
          console.log(`[TRANSLATION] Calling model '${model}' to translate into ${targetLanguage}`);
          const response = await ai.models.generateContent({
            model,
            contents: `Translate the following Marathi/Hindi text into English following your system instructions:\n\n${text}`,
            config: {
              systemInstruction,
              temperature: 0.2,
            },
          });

          translatedText = (response.text || '').trim();
          if (translatedText) {
            console.log(`[TRANSLATION] Model '${model}' succeeded`);
            break;
          }
        } catch (err: any) {
          lastModelError = err;
          const errMsg = String(err?.message || err || '');
          console.warn(`[TRANSLATION] Model '${model}' error: ${errMsg}. Trying next candidate model...`);
          continue;
        }
      }

      if (!translatedText && lastModelError) {
        throw lastModelError;
      }

      if (!translatedText) {
        return res.status(500).json({
          success: false,
          error: "Failed to generate translation.",
        });
      }

      return res.json({
        success: true,
        originalText: text,
        translatedText,
        targetLanguage,
      });
    } catch (err: any) {
      console.error("[TRANSLATION ERROR]", err);
      const rawMsg = String(err?.message || '');
      let cleanMessage = "Failed to translate text.";

      if (rawMsg.includes('GEMINI_API_KEY') || rawMsg.includes('API key')) {
        cleanMessage = "Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.";
      } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
        cleanMessage = "The AI service is experiencing high demand. Please try translating again.";
      } else {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.message) {
            cleanMessage = parsed.error.message;
          }
        } catch {
          if (rawMsg.trim()) cleanMessage = rawMsg;
        }
      }

      return res.status(500).json({
        success: false,
        error: cleanMessage,
      });
    }
  });

  function getDistPath(): string {
    const cwdDist = path.join(process.cwd(), 'dist');
    if (fs.existsSync(path.join(cwdDist, 'index.html'))) {
      return cwdDist;
    }
    try {
      let dir: string = process.cwd();
      if (typeof __dirname !== 'undefined') {
        dir = __dirname;
      } else if (import.meta && typeof import.meta.url === 'string') {
        dir = path.dirname(fileURLToPath(import.meta.url));
      }
      const siblingDist = path.join(dir, 'dist');
      if (fs.existsSync(path.join(siblingDist, 'index.html'))) {
        return siblingDist;
      }
      if (fs.existsSync(path.join(dir, 'index.html'))) {
        return dir;
      }
    } catch {
      // Fallback
    }
    return cwdDist;
  }

  const distPath = getDistPath();
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isDev = process.env.NODE_ENV === "development" || process.env.npm_lifecycle_event === "dev";
  const isProduction = process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start" || (!isDev && hasBuiltDist);

  if (isProduction) {
    console.log(`[PROD] Serving production build from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('Application build not found. Run npm run build.');
      }
    });
  } else {
    console.log('[DEV] Initializing Vite middleware for development');
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
