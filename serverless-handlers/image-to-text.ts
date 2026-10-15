import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
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

function parseBase64Image(dataUrl: string): { mimeType: string; base64Data: string } {
  if (!dataUrl) return { mimeType: 'image/jpeg', base64Data: '' };
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], base64Data: matches[2] };
  }
  return { mimeType: 'image/jpeg', base64Data: dataUrl };
}

export const config = {
  maxDuration: 60,
};

const defaultSystemInstruction = `You are a world-class AI vision system specialized in accurate, faithful transcription of both handwritten and printed text from images.

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

const ticketSystemInstruction = `You are an expert AI vision system specialized in Maharashtra State Common Entrance Test (CET) Cell and SAC (Scrutiny Center) student forms, verification sheets, and grievance letters.

Your task is to inspect the uploaded candidate document (printed or handwritten) and extract EXACTLY what is written on the document in front of or under each of the following 8 fields:

1. Candidate Name: The student's legal full name written on the form (e.g. in front of "Candidate Name", "Name of Candidate", "Full Name", "उमेदवाराचे नाव").
2. CET Application Number: The CET application form number or roll number written on the form (in front of "CET Application Number", "CET App No", "CET Roll No", "सीईटी अर्ज क्रमांक"). If blank or not present on form, leave blank.
3. CAP Application Number: The Centralized Admission Process application ID starting with state course prefixes like EN..., MB..., MC..., PH..., AR..., DS..., DSP..., DSE..., or written in front of "CAP Application Number", "CAP ID", "Application ID", "कॅप अर्ज क्रमांक". If blank or not present on form, leave blank.
4. Date of Birth (DOB): The student's actual birth date (e.g. DD/MM/YYYY) written in front of "Date of Birth", "DOB", or "जन्म तारीख". DO NOT extract the form print/submission date or current date!
5. Mobile Number: The 10-digit mobile number written in front of "Mobile Number", "Contact No", "Phone", or "मोबाईल".
6. Email ID: The student's email address written in front of "Email ID", "Email", or "ईमेल".
7. Course Name: The exact degree/branch/course written on the form in front of "Course Name", "Course Applied", "Branch", or "अभ्यासक्रम" (e.g. B.E. / B.Tech, B.Pharmacy, MBA / MMS, etc.).
8. Query / Grievance Details: The candidate's exact query, problem, discrepancy, or grievance text written in front of or under "Query / Grievance Details", "Query", "Grievance", "Issue", "तक्रार / अडचण तपशील", or letter body.

STRICT ACCURACY RULES:
- Extract EXACTLY what is written on the document image for these 8 fields.
- Do NOT invent, assume, fabricate, or guess any information.
- Never output placeholder or demo data (never output dummy names like Rahul Patil).
- If a field is not present or blank on the document, leave the value empty after the colon.
- Format strictly as:
Candidate Name: <exact value from form>
CET Application Number: <exact value from form>
CAP Application Number: <exact value from form>
Date of Birth (DOB): <exact value from form>
Mobile Number: <exact value from form>
Email ID: <exact value from form>
Course Name: <exact value from form>
Query / Grievance Details: <exact value from form>`;

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
  // CORS & Security headers
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
    const { image, images, prompt } = body;

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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-gemini-api-key');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const customKey = body.apiKey || (req.headers['x-gemini-api-key'] as string);
    const ai = getGeminiClient(customKey);
    const isTicketMode = body.mode === 'ticket_fields';
    const activeSystemInstruction = isTicketMode ? ticketSystemInstruction : defaultSystemInstruction;
    const results: Array<{ pageIndex: number; name?: string; text: string }> = [];

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

      const customPrompt = isTicketMode
        ? `Extract EXACTLY what is written on this form in front of each of the 8 candidate ticket fields:
Candidate Name:
CET Application Number:
CAP Application Number:
Date of Birth (DOB):
Mobile Number:
Email ID:
Course Name:
Query / Grievance Details:

Extract strictly what is on the form. If a field is absent, leave it blank.`
        : (prompt?.trim()
          ? `Transcribe all text from this image following the system instructions. Additional guidance: ${prompt}`
          : `Transcribe all readable text from this image (Marathi, Hindi, English, printed or handwritten). Look at the complete visual context, detect text orientation, preserve exact words, reading order, line breaks, and tables. Use [unclear] if a word is truly illegible. Do not translate or modify anything.`);

      let extractedText = '';
      let lastModelError: any = null;

      for (const model of CANDIDATE_VISION_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [imagePart, { text: customPrompt }],
            },
            config: {
              systemInstruction: activeSystemInstruction,
              temperature: 0.1,
            },
          });

          extractedText = (response.text || '').trim();
          if (extractedText) {
            break;
          }
        } catch (err: any) {
          lastModelError = err;
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

    const combinedText = results
      .map((r, idx) => {
        if (results.length === 1) return r.text;
        const header = r.name ? `--- Page ${idx + 1} (${r.name}) ---` : `--- Page ${idx + 1} ---`;
        return `${header}\n\n${r.text}`;
      })
      .join('\n\n\n');

    const unclearCount = (combinedText.match(/\[unclear\]/gi) || []).length;

    return res.status(200).json({
      success: true,
      text: combinedText,
      pages: results,
      pageCount: results.length,
      unclearCount,
    });
  } catch (err: any) {
    console.error("[VERCEL /api/image-to-text ERROR]", err);
    const rawMsg = String(err?.message || '');
    let cleanMessage = "Failed to process image with vision AI.";

    if (rawMsg.includes('GEMINI_API_KEY') || rawMsg.includes('API key')) {
      cleanMessage = "Gemini API key is not configured in Vercel. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables, then redeploy.";
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
}
