import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey =
    (customApiKey && customApiKey.trim()) ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. The District Nodal Officer (DNO) can set the Master Gemini API Key in User Management, or configure GEMINI_API_KEY in Vercel Project Settings."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const systemInstruction = `You are a professional bilingual translator specialized in translating Marathi (मराठी) and Hindi (हिन्दी) documents into natural, highly accurate, and fluent English.

CRITICAL DIRECTIVES:
1. Translate the entire text faithfully and accurately into fluent, natural English.
2. PRESERVE STRUCTURE: Keep all paragraphs, numbered lists, bullet points, headers, tabular columns, and line breaks intact.
3. INDIAN / MAHARASHTRA TERMINOLOGY: For official administrative, legal, revenue, educational, and government terms (such as 'तहसीलदार', 'तलाठी', 'ग्रामसेवक', '७/१२ उतारा', 'दाखला', 'प्रमाणपत्र', 'गुणपत्रिका', 'शपथपत्र', 'अधिवास', 'जातीचा दाखला', 'शाळा सोडल्याचा दाखला', 'फेरफार'), provide their standard recognized English equivalents (e.g. 'Tahsildar', 'Talathi / Village Accountant', 'Gram Sevak', '7/12 Land Record Extract', 'Certificate', 'Marksheet', 'Affidavit', 'Domicile Certificate', 'Caste Certificate', 'School Leaving Certificate', 'Mutation Entry') with utmost precision.
4. UNCLEAR WORDS: If the source text contains "[unclear]", retain "[unclear]" in the corresponding position.
5. NO CONVERSATIONAL FILLER: Return ONLY the translated English text. Do not add any greeting, preamble (e.g. "Here is the translation:"), or closing notes.`;

async function readRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = await readRequestBody(req);
    const { text, targetLanguage = 'English' } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "No text provided to translate.",
      });
    }

    const customKey = body.apiKey || (req.headers['x-gemini-api-key'] as string);
    const ai = getGeminiClient(customKey);
    let translatedText = '';
    let lastModelError: any = null;

    for (const model of CANDIDATE_VISION_MODELS) {
      try {
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
          break;
        }
      } catch (err: any) {
        lastModelError = err;
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

    return res.status(200).json({
      success: true,
      originalText: text,
      translatedText,
      targetLanguage,
    });
  } catch (err: any) {
    console.error("[VERCEL /api/translate-text ERROR]", err);
    const rawMsg = String(err?.message || '');
    let cleanMessage = "Failed to translate text.";

    if (rawMsg.includes('GEMINI_API_KEY') || rawMsg.includes('API key')) {
      cleanMessage = "Gemini API key is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables, then redeploy.";
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
}
