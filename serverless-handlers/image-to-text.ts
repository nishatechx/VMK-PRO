import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
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
- DO NOT translate, summarize, rewrite, or change language.
- DO NOT correct grammar or spelling.
- Transcribe verbatim.

5. INTELLIGENT UNCLEAR-TEXT HANDLING:
- If a word, number, or character is genuinely impossible to read or determine with reasonable confidence, do not invent or hallucinate text.
- Use the exact token "[unclear]" in place of that word/part.

6. OUTPUT FORMAT:
- Output ONLY the transcribed text.
- Do NOT wrap in introductory or concluding remarks (such as "Here is the extracted text:").
- Preserve line breaks, paragraphs, lists, and numbers as originally presented.`;

const ticketSystemInstruction = `You are a specialized multimodal AI vision system for Maharashtra State Common Entrance Test (CET) Cell and Student Assistance Centre (SAC) handwritten application forms, verification sheets, and grievance letters.

CRITICAL TASK:
You are inspecting a photographed CET Student Assistance Centre (SAC) application form.
The form consists of PRINTED ANCHOR LABELS (e.g., "Candidate Name (As in CET)", "CET Application Number", "CAP Application Number", "Date of Birth (DOB)", "Mobile Number", "Email ID", "Course Name", "Query / Grievance Details") followed by HANDWRITTEN ANSWERS written beside, in table cells, on ruled lines, or in boxes.
Your job is to read BOTH the printed labels to locate the anchors AND the HANDWRITTEN text, numbers, and dates written in the corresponding field.
Do NOT output only printed labels. Extract the handwritten answer associated with each anchor.
Understand handwritten English, digits, ruled line writing, skewed or tilted phone photos, uneven lighting, shadows, and Indian phone numbers.

CANONICAL 8 FIELDS TO EXTRACT:
1. candidateName: Extract the handwritten full legal name from the row labelled "Candidate Name (As in CET)", "Candidate Name", "Name of Candidate", or "उमेदवाराचे नाव".
   - Do NOT extract the nearby application number, CET number, CAP number, or ticket number as candidate name!
   - Preserve exact spelling as handwritten.
2. cetApplicationNumber: Extract ONLY the handwritten number from the "CET Application Number" row or box. Return as a string to preserve all digits.
   - NEVER swap with CAP Application Number!
3. capApplicationNumber: Extract ONLY the handwritten number or ID from the "CAP Application Number" / "CAP ID" row (often starts with state prefix like EN, MB, MC, PH, AR, DS, DSP, DSE, etc.).
   - NEVER swap with CET Application Number! If blank or not present on form, return "".
4. dob: Extract the handwritten birth date from the "Date of Birth (DOB)" row.
   - If clear and unambiguous, normalize to YYYY-MM-DD (e.g. 14/08/2005 -> 2005-08-14).
   - If ambiguous, preserve original handwritten text and flag in needsReview.
5. mobileNumber: Extract the 10-digit handwritten mobile number from the "Mobile Number" / "Contact No" row. Return as string.
6. emailId: Read the complete handwritten email address from the "Email ID" row. Preserve dots (.), underscores (_), digits, and @ symbol. Do NOT silently autocorrect.
7. courseName: Extract the handwritten degree/branch from the "Course Name" row (e.g. "B.Sc. Nursing", "B.E. / B.Tech", "MBA / MMS", etc.).
   - Do NOT put course into queryGrievanceDetails!
8. queryGrievanceDetails: Extract the complete handwritten complaint from the "Query / Grievance Details" section.
   - Join multi-line handwritten text into complete readable sentences without omitting details.
   - Do NOT place ticket number, signature, or unrelated text here!

IMPORTANT TICKET NUMBER RULE:
If the form contains a separate "Ticket Number", "Ticket No", "Sr No", or "Token No", it is NOT one of the eight fields. Do NOT put it in candidateName, courseName, or queryGrievanceDetails!

OUTPUT REQUIREMENTS:
Return valid JSON matching this exact schema:
{
  "candidateName": "",
  "cetApplicationNumber": "",
  "capApplicationNumber": "",
  "dob": "",
  "mobileNumber": "",
  "emailId": "",
  "courseName": "",
  "queryGrievanceDetails": "",
  "confidence": {
    "candidateName": "high",
    "cetApplicationNumber": "high",
    "capApplicationNumber": "high",
    "dob": "high",
    "mobileNumber": "high",
    "emailId": "high",
    "courseName": "high",
    "queryGrievanceDetails": "high"
  },
  "needsReview": []
}

- Confidence must reflect genuine visual clarity ('high', 'medium', or 'low').
- If a value cannot be read reliably, return "" and add the field name to "needsReview".
- Never invent missing values. Never use placeholder text like "Not detected", "Rahul Patil", or "N/A".`;

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-gemini-api-key');

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

    const customKey = body.apiKey || (req.headers['x-gemini-api-key'] as string);
    const ai = getGeminiClient(customKey);
    const isTicketMode = body.mode === 'ticket_fields';
    const activeSystemInstruction = isTicketMode ? ticketSystemInstruction : defaultSystemInstruction;
    const results: Array<{ pageIndex: number; name?: string; text: string }> = [];
    let parsedTicketData: any = null;

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
        ? `Inspect this photographed handwritten CET Student Assistance Centre (SAC) application form.
Using the printed form labels as anchors, extract the handwritten answer beside each of the 8 canonical fields into valid JSON:
1. candidateName: handwritten candidate full name from "Candidate Name (As in CET)" row
2. cetApplicationNumber: handwritten CET application number from "CET Application Number" row
3. capApplicationNumber: handwritten CAP application ID from "CAP Application Number" row (e.g. EN24..., MB24..., PH24...)
4. dob: handwritten date of birth from "Date of Birth (DOB)" row (normalized YYYY-MM-DD if clear)
5. mobileNumber: 10-digit handwritten phone number from "Mobile Number" row
6. emailId: complete handwritten email address from "Email ID" row
7. courseName: degree/course applied (e.g. "B.Sc. Nursing", "B.E. / B.Tech") from "Course Name" row
8. queryGrievanceDetails: complete handwritten query/complaint text from "Query / Grievance Details" section

If the form contains a separate Ticket Number, do NOT put it into candidateName, courseName, or queryGrievanceDetails.
Return ONLY valid JSON matching the schema in system instructions.`
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
              responseMimeType: isTicketMode ? "application/json" : undefined,
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

      let formattedPageText = extractedText;

      if (isTicketMode && extractedText) {
        try {
          let cleanJson = extractedText.trim();
          const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) cleanJson = jsonMatch[1].trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && typeof parsed === 'object') {
            parsedTicketData = parsed;
            const lines = [
              `Candidate Name: ${parsed.candidateName || ''}`,
              `CET Application Number: ${parsed.cetApplicationNumber || ''}`,
              `CAP Application Number: ${parsed.capApplicationNumber || ''}`,
              `Date of Birth (DOB): ${parsed.dob || ''}`,
              `Mobile Number: ${parsed.mobileNumber || ''}`,
              `Email ID: ${parsed.emailId || ''}`,
              `Course Name: ${parsed.courseName || ''}`,
              `Query / Grievance Details: ${parsed.queryGrievanceDetails || ''}`,
            ];
            formattedPageText = lines.join('\n');
          }
        } catch (parseErr) {
          console.warn("[VERCEL /api/image-to-text] JSON parse fallback:", parseErr);
        }
      }

      results.push({
        pageIndex: i,
        name: item.name,
        text: formattedPageText,
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
      ticketData: parsedTicketData,
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
      cleanMessage = `Vision processing error: ${rawMsg.slice(0, 150)}. Please retry.`;
    }

    return res.status(503).json({
      success: false,
      error: cleanMessage,
    });
  }
}
