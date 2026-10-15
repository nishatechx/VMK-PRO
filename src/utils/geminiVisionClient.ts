import { GoogleGenAI } from "@google/genai";

const CANDIDATE_VISION_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
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
- DO NOT translate, summarize, rewrite, or simplify.
- Transcribe verbatim.

4. UNCLEAR TEXT:
- If a word is genuinely impossible to read, use "[unclear]" in place of that word.

5. OUTPUT FORMAT:
- Output ONLY the transcribed text. No conversational preamble. Preserve line breaks, paragraphs, lists, and numbers.`;

const ticketVisionSystemInstruction = `You are a specialized multimodal AI vision system for Maharashtra State Common Entrance Test (CET) Cell and Student Assistance Centre (SAC) handwritten application forms, verification sheets, and grievance letters.

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
    "candidateName": "high" | "medium" | "low",
    "cetApplicationNumber": "high" | "medium" | "low",
    "capApplicationNumber": "high" | "medium" | "low",
    "dob": "high" | "medium" | "low",
    "mobileNumber": "high" | "medium" | "low",
    "emailId": "high" | "medium" | "low",
    "courseName": "high" | "medium" | "low",
    "queryGrievanceDetails": "high" | "medium" | "low"
  },
  "needsReview": []
}

- Confidence must reflect genuine visual clarity ('high', 'medium', or 'low').
- If a value cannot be read reliably, return "" and add the field name to "needsReview".
- Never invent missing values. Never use placeholder text like "Not detected", "Rahul Patil", or "N/A".`;

export async function extractTextClientSide(
  apiKey: string,
  images: Array<{ dataUrl: string; name?: string }>,
  prompt?: string,
  mode?: 'default' | 'ticket_fields'
): Promise<{
  text: string;
  ticketData?: any;
  pages: Array<{ pageIndex: number; name?: string; text: string }>;
}> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("No Gemini API key provided. Please enter a valid Gemini API key.");
  }

  const isTicketMode = mode === 'ticket_fields';
  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  const results: Array<{ pageIndex: number; name?: string; text: string }> = [];
  let parsedTicketData: any = null;

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
            responseMimeType: isTicketMode ? "application/json" : undefined,
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
        console.warn("[CLIENT GEMINI] JSON parse fallback:", parseErr);
      }
    }

    results.push({
      pageIndex: i,
      name: item.name,
      text: formattedPageText,
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
    ticketData: parsedTicketData,
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

  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const translationPrompt = `You are a professional educational and administrative translator specializing in Maharashtra State CET Cell and higher education documents.
Translate the following document text faithfully and accurately into fluent, natural English.
Preserve proper names (student names, college names, district names, dates, application numbers, CET roll numbers, marks, percentages, category codes, and grievance details) with 100% precision.
Output ONLY the English translation without any preamble.

Text to translate:
${text}`;

  for (const model of CANDIDATE_VISION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: translationPrompt,
        config: {
          temperature: 0.2,
        },
      });

      const translated = (response.text || '').trim();
      if (translated) return translated;
    } catch {
      continue;
    }
  }

  throw new Error("Translation failed. Please verify API key and retry.");
}
