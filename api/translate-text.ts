import { getGeminiClient, CANDIDATE_VISION_MODELS } from "./_gemini";

const systemInstruction = `You are a professional bilingual translator specialized in translating Marathi (मराठी) and Hindi (हिन्दी) documents into natural, highly accurate, and fluent English.

CRITICAL DIRECTIVES:
1. Translate the entire text faithfully and accurately into fluent, natural English.
2. PRESERVE STRUCTURE: Keep all paragraphs, numbered lists, bullet points, headers, tabular columns, and line breaks intact.
3. INDIAN / MAHARASHTRA TERMINOLOGY: For official administrative, legal, revenue, educational, and government terms (such as 'तहसीलदार', 'तलाठी', 'ग्रामसेवक', '७/१२ उतारा', 'दाखला', 'प्रमाणपत्र', 'गुणपत्रिका', 'शपथपत्र', 'अधिवास', 'जातीचा दाखला', 'शाळा सोडल्याचा दाखला', 'फेरफार'), provide their standard recognized English equivalents (e.g. 'Tahsildar', 'Talathi / Village Accountant', 'Gram Sevak', '7/12 Land Record Extract', 'Certificate', 'Marksheet', 'Affidavit', 'Domicile Certificate', 'Caste Certificate', 'School Leaving Certificate', 'Mutation Entry') with utmost precision.
4. UNCLEAR WORDS: If the source text contains "[unclear]", retain "[unclear]" in the corresponding position.
5. NO CONVERSATIONAL FILLER: Return ONLY the translated English text. Do not add any greeting, preamble (e.g. "Here is the translation:"), or closing notes.`;

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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const { text, targetLanguage = 'English' } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "No text provided to translate.",
      });
    }

    const ai = getGeminiClient();
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
