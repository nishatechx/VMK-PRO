import { getGeminiClient, parseBase64Image, readRequestBody, CANDIDATE_VISION_MODELS } from "./_gemini";

export const config = {
  maxDuration: 45,
};

export default async function handler(req: any, res: any) {
  // CORS & Preflight
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
    const dataUrl = body?.image;

    if (!dataUrl) {
      return res.status(400).json({ success: false, error: "Missing image in request body" });
    }

    const customKey = body?.apiKey || (req.headers['x-gemini-api-key'] as string);
    const ai = getGeminiClient(customKey);
    const { mimeType, base64Data } = parseBase64Image(dataUrl);

    if (!base64Data) {
      return res.status(400).json({ success: false, error: "Could not decode image base64 data" });
    }

    const systemInstruction = `You are a world-class AI document scanner and computer vision engine.
Your task is to analyze the image containing a document (e.g. Aadhaar card, PAN card, certificate, official application form, driving license, receipt, passport, ID card, or document) photographed in the real world.
The document may be photographed from an angle, tilted, rotated, placed on a desk/table, or have uneven shadows.

Identify:
1. The EXACT four corners of the document in normalized percentage coordinates (0.0 to 100.0) relative to image width and height:
   - topLeft: { x, y } (top-left corner of the document)
   - topRight: { x, y } (top-right corner of the document)
   - bottomRight: { x, y } (bottom-right corner of the document)
   - bottomLeft: { x, y } (bottom-left corner of the document)
2. documentType: classified document type (e.g. "Aadhaar Card", "PAN Card", "Government Certificate", "Application Form", "Driving License", "Passport", "Receipt", "Official Document")
3. confidence: integer between 70 and 99 representing detection certainty
4. detectedAngle: rotation angle in degrees needed to make text right-side up (0, 90, 180, 270, or small skew like -5 to +5)
5. perspectiveDistorted: boolean, true if the document was photographed at an angle or trapezoidally distorted
6. qualityReport:
   - isEntireDocumentVisible: boolean (true if all borders are in frame)
   - allFourEdgesFound: boolean
   - isProperlyAligned: boolean
   - isTextCutOffLikely: boolean
   - isBlurry: boolean
   - isTooDark: boolean
   - clarityScore: number (0-100)
   - recommendation: concise human-readable assessment (e.g. "Document detected with high precision. Ready for perspective correction.")
7. suggestedEnhancement: one of "magic_clean", "vivid_id", "high_contrast_bw", "grayscale", "original"

Return STRICTLY a JSON object matching this schema.`;

    const prompt = "Detect the 4 corners of the document, classify the document, check orientation, and evaluate quality.";

    const modelsToTry = ["gemini-3.8-flash", ...CANDIDATE_VISION_MODELS.filter(m => m !== "gemini-3.8-flash")];
    let responseText = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                corners: {
                  type: "object",
                  properties: {
                    topLeft: {
                      type: "object",
                      properties: { x: { type: "number" }, y: { type: "number" } },
                      required: ["x", "y"],
                    },
                    topRight: {
                      type: "object",
                      properties: { x: { type: "number" }, y: { type: "number" } },
                      required: ["x", "y"],
                    },
                    bottomRight: {
                      type: "object",
                      properties: { x: { type: "number" }, y: { type: "number" } },
                      required: ["x", "y"],
                    },
                    bottomLeft: {
                      type: "object",
                      properties: { x: { type: "number" }, y: { type: "number" } },
                      required: ["x", "y"],
                    },
                  },
                  required: ["topLeft", "topRight", "bottomRight", "bottomLeft"],
                },
                documentType: { type: "string" },
                confidence: { type: "number" },
                detectedAngle: { type: "number" },
                perspectiveDistorted: { type: "boolean" },
                qualityReport: {
                  type: "object",
                  properties: {
                    isEntireDocumentVisible: { type: "boolean" },
                    allFourEdgesFound: { type: "boolean" },
                    isProperlyAligned: { type: "boolean" },
                    isTextCutOffLikely: { type: "boolean" },
                    isBlurry: { type: "boolean" },
                    isTooDark: { type: "boolean" },
                    clarityScore: { type: "number" },
                    recommendation: { type: "string" },
                  },
                  required: [
                    "isEntireDocumentVisible",
                    "allFourEdgesFound",
                    "isProperlyAligned",
                    "isTextCutOffLikely",
                    "isBlurry",
                    "isTooDark",
                    "clarityScore",
                    "recommendation",
                  ],
                },
                suggestedEnhancement: { type: "string" },
              },
              required: [
                "corners",
                "documentType",
                "confidence",
                "detectedAngle",
                "perspectiveDistorted",
                "qualityReport",
                "suggestedEnhancement",
              ],
            },
          },
        });

        responseText = (response.text || '').trim();
        if (responseText) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to receive output from AI vision models");
    }

    const result = JSON.parse(responseText);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[VERCEL /api/ai-document-detect ERROR]", err);
    return res.status(500).json({
      error: err?.message || "Failed to detect document with AI",
    });
  }
}
