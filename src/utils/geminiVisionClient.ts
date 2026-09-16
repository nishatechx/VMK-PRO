import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

function parseBase64(dataUrl: string): { mimeType: string; base64Data: string } {
  if (!dataUrl) return { mimeType: 'image/jpeg', base64Data: '' };
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], base64Data: matches[2] };
  }
  return { mimeType: 'image/jpeg', base64Data: dataUrl };
}

const visionSystemInstruction = `You are a world-class AI vision system specialized in accurate, faithful transcription of both handwritten and printed text from images.

Your task is to analyze the complete visual context of the uploaded image and accurately extract all readable text into digital format.

CRITICAL DIRECTIVES:
1. SUPPORTED LANGUAGES & SCRIPTS:
- Marathi (मराठी) in Devanagari script
- Hindi (हिन्दी) in Devanagari script
- English in Latin script
- Mixed-language / code-switched text.

2. HANDWRITING RECOGNITION:
- Accurately recognize handwritten text in Marathi, Hindi, and English.
- Decipher cursive, joined, slanted or uneven handwriting, different pen/pencil weights, notebook pages, personal notes, letters, forms, and mobile camera photographs.

3. PRESERVE ORIGINAL TEXT STRICTLY:
- Output what is ACTUALLY written in the image.
- DO NOT translate.
- DO NOT summarize.
- DO NOT rewrite or simplify.
- DO NOT change language.
- Transcribe verbatim.

4. UNCLEAR TEXT:
- If a word is genuinely impossible to read, use "[unclear]" in place of that word.

5. OUTPUT FORMAT:
- Output ONLY the transcribed text. No conversational preamble. Preserve line breaks, paragraphs, lists, and numbers.`;

const ticketVisionSystemInstruction = `You are an expert AI vision system specialized in Maharashtra State Common Entrance Test (CET) Cell and SAC Scrutiny Center verification.
Your task is to analyze the candidate's document or image (printed or handwritten) and extract ONLY the following 8 fields:

Candidate name:
CET Application Number:
CAP Application Number:
DOB:
Mobile Number:
Email ID:
Course Name:
Query:

FIELD SPECIFICATIONS:
1. Candidate name: Full legal name of the candidate.
2. CET Application Number: CET Application Form Number or Roll Number (e.g., 241088921 or CET202409812).
3. CAP Application Number: Centralized Admission Process (CAP) Application ID/Number (typically starting with state course prefix like EN24108892, MB24108892, PH24108892, AR24108892, DS24108892, or labelled as CAP Application ID / Application ID).
4. DOB: Date of birth (in DD/MM/YYYY or YYYY-MM-DD).
5. Mobile Number: 10-digit mobile number.
6. Email ID: Candidate email address.
7. Course Name: Course applied for (e.g. B.E. / B.Tech, B.Pharmacy, MBA / MMS, etc.).
8. Query: The candidate query, discrepancy, grievance, or issue description described in the document.

STRICT OUTPUT RULES:
- Extract ONLY the 8 fields above.
- Do NOT output any other text, instructions, conversational remarks, or extra document fields.
- If a field is not found in the image, leave its value blank after the colon.
- Format strictly as:
Candidate name: <value>
CET Application Number: <value>
CAP Application Number: <value>
DOB: <value>
Mobile Number: <value>
Email ID: <value>
Course Name: <value>
Query: <value>`;

export async function extractTextClientSide(
  apiKey: string,
  images: Array<{ dataUrl: string; name?: string }>,
  prompt?: string,
  mode?: 'default' | 'ticket_fields'
): Promise<{
  text: string;
  pages: Array<{ pageIndex: number; name?: string; text: string }>;
}> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("No Gemini API key provided. Please enter a valid Gemini API key.");
  }

  const isTicketMode = mode === 'ticket_fields';
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const results: Array<{ pageIndex: number; name?: string; text: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const { mimeType, base64Data } = parseBase64(item.dataUrl);

    if (!base64Data) continue;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const customPrompt = isTicketMode
      ? `Extract ONLY the 8 candidate ticket details from this image:
Candidate name:
CET Application Number:
CAP Application Number:
DOB:
Mobile Number:
Email ID:
Course Name:
Query:
Do not extract any other text. Follow the system instructions strictly.`
      : prompt?.trim()
      ? `Transcribe all text from this image following system instructions. Additional guidance: ${prompt}`
      : `Transcribe all readable text from this image (Marathi, Hindi, English, printed or handwritten). Look at the complete visual context, detect text orientation, preserve exact words, reading order, line breaks, and tables. Use [unclear] if a word is truly illegible. Do not translate or modify anything.`;

    let extractedText = '';
    let lastError: any = null;

    for (const model of CANDIDATE_VISION_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [imagePart, { text: customPrompt }],
          },
          config: {
            systemInstruction: isTicketMode ? ticketVisionSystemInstruction : visionSystemInstruction,
            temperature: 0.1,
          },
        });

        extractedText = (response.text || '').trim();
        if (extractedText) break;
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!extractedText && lastError) {
      throw lastError;
    }

    results.push({
      pageIndex: i,
      name: item.name,
      text: extractedText,
    });
  }

  const combinedText = results
    .map((r, idx) => {
      if (results.length === 1) return r.text;
      const header = r.name ? `--- Page ${idx + 1} (${r.name}) ---` : `--- Page ${idx + 1} ---`;
      return `${header}\n\n${r.text}`;
    })
    .join('\n\n\n');

  return {
    text: combinedText,
    pages: results,
  };
}

export async function translateTextClientSide(
  apiKey: string,
  text: string
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("No Gemini API key provided.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const translateSystemInstruction = `You are a professional bilingual translator specialized in translating Marathi (मराठी) and Hindi (हिन्दी) documents into natural, highly accurate, and fluent English.
Translate the text faithfully and accurately into fluent English.
Keep all paragraphs, numbered lists, and line breaks intact.
For official Maharashtra administrative terms (like तहसीलदार, तलाठी, ग्रामसेवक, ७/१२ उतारा, दाखला, प्रमाणपत्र, गुणपत्रिका), provide recognized English equivalents (Tahsildar, Talathi, Gram Sevak, 7/12 Extract, Certificate, Marksheet).
Output ONLY the translated English text.`;

  for (const model of CANDIDATE_VISION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Translate the following Marathi/Hindi text into English following your instructions:\n\n${text}`,
        config: {
          systemInstruction: translateSystemInstruction,
          temperature: 0.2,
        },
      });

      const translated = (response.text || '').trim();
      if (translated) return translated;
    } catch {
      continue;
    }
  }

  throw new Error("Failed to translate text using AI models.");
}
