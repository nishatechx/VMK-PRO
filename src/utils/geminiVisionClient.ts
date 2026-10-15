import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
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

const ticketVisionSystemInstruction = `You are an expert AI vision system specialized in Maharashtra State Common Entrance Test (CET) Cell and SAC (Scrutiny Center) student forms, verification sheets, and grievance letters.

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

    if (!extractedText) {
      if (lastError) throw lastError;
      throw new Error("No readable text could be detected by Gemini Vision.");
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
