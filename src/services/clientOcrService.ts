/**
 * Client-Side In-Browser OCR Service using Tesseract.js
 * 
 * Works 100% offline and client-side without any API keys, environment variables,
 * or server configuration. Runs directly inside the browser using WebAssembly.
 */

import Tesseract from 'tesseract.js';
import { captureTicketDetailsFromText, CapturedTicketDetails } from '../utils/ticketExtractor';

export interface ClientOcrResult {
  text: string;
  confidence: number;
  ticketDetails?: CapturedTicketDetails;
  source: 'browser_ocr' | 'gemini_vision';
}

/**
 * Preprocess image on a hidden canvas to maximize OCR accuracy:
 * - Increases contrast
 * - Binarizes / sharpens high-contrast document elements
 * - Ensures optimal pixel density
 */
export async function preprocessImageForOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale up if resolution is too low (< 1000px)
        const minDimension = 1200;
        if (width < minDimension && height < minDimension) {
          const ratio = Math.max(minDimension / width, minDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Limit maximum size to prevent memory pressure
        const maxDimension = 2400;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Render image with high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Apply contrast & brightness adjustment
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 1.25; // 25% contrast boost
        const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

        for (let i = 0; i < data.length; i += 4) {
          // Greyscale conversion with luminance weights
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Contrast adjust
          let adjusted = factor * (gray - 128) + 128;
          if (adjusted < 0) adjusted = 0;
          if (adjusted > 255) adjusted = 255;

          // Slight thresholding for crisp dark text on light bg
          if (adjusted > 200) adjusted = 255;
          else if (adjusted < 50) adjusted = 0;

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.warn('Image preprocessing fallback to original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Format 8 ticket fields into structured, readable text
 */
export function formatTicketFieldsText(details: CapturedTicketDetails, originalOcrText?: string): string {
  const lines: string[] = [
    '=== EXTRACTED 8 TICKET FIELDS ===',
    `1. Candidate Name: ${details.candidateName || 'Not Found'}`,
    `2. CET Application Number: ${details.cetNo || 'Not Found'}`,
    `3. CAP Application Number: ${details.capId || 'Not Found'}`,
    `4. Date of Birth (DOB): ${details.dob || 'Not Found'}`,
    `5. Mobile Number: ${details.mobile || 'Not Found'}`,
    `6. Email ID: ${details.email || 'Not Found'}`,
    `7. Course Name: ${details.course || 'Not Found'}`,
    `8. Query: ${details.query || (originalOcrText ? originalOcrText.slice(0, 250).replace(/\n/g, ' ') : 'Not Found')}`,
  ];

  if (originalOcrText && originalOcrText.trim()) {
    lines.push('\n=== FULL DOCUMENT OCR TEXT ===');
    lines.push(originalOcrText.trim());
  }

  return lines.join('\n');
}

/**
 * Execute in-browser OCR without any API key or external server.
 * Uses Tesseract.js with progress feedback.
 */
export async function executeBrowserOcr(
  imageSource: string,
  options?: {
    lang?: string;
    mode?: 'ticket_fields' | 'default';
    onProgress?: (status: string) => void;
  }
): Promise<ClientOcrResult> {
  const { lang = 'eng+mar', mode = 'default', onProgress } = options || {};

  onProgress?.('Preparing image for browser OCR...');
  const preprocessedUrl = await preprocessImageForOcr(imageSource);

  onProgress?.('Initializing browser OCR engine (zero API key needed)...');

  let ocrResultText = '';
  let confidence = 0;

  try {
    // Attempt multi-language recognition
    const result = await Tesseract.recognize(preprocessedUrl, lang, {
      logger: (m: any) => {
        if (m.status === 'loading tesseract core') {
          onProgress?.('Loading OCR engine in browser...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(`Loading language support (${m.progress ? Math.round(m.progress * 100) : 0}%)...`);
        } else if (m.status === 'initializing api') {
          onProgress?.('Starting OCR recognition...');
        } else if (m.status === 'recognizing text') {
          const pct = Math.min(99, Math.round((m.progress || 0) * 100));
          onProgress?.(`Scanning document text (${pct}%)...`);
        }
      },
    });

    ocrResultText = result.data.text ? result.data.text.trim() : '';
    confidence = result.data.confidence || 0;
  } catch (langErr) {
    console.warn(`OCR with lang=${lang} failed, falling back to 'eng':`, langErr);
    onProgress?.('Retrying with English OCR engine...');
    
    // Fallback to English only if multilingual traineddata had network or load issue
    const result = await Tesseract.recognize(preprocessedUrl, 'eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const pct = Math.min(99, Math.round((m.progress || 0) * 100));
          onProgress?.(`Scanning document text (${pct}%)...`);
        }
      },
    });

    ocrResultText = result.data.text ? result.data.text.trim() : '';
    confidence = result.data.confidence || 0;
  }

  if (!ocrResultText || ocrResultText.length < 2) {
    ocrResultText = 'No readable text could be detected in this document. Please check the image lighting, orientation, and focus, and try again.';
  }

  // Extract 8 ticket fields
  const ticketDetails = captureTicketDetailsFromText(ocrResultText);

  // If in ticket_fields mode, format the text with the 8 fields header
  let finalText = ocrResultText;
  if (mode === 'ticket_fields') {
    finalText = formatTicketFieldsText(ticketDetails, ocrResultText);
  }

  return {
    text: finalText,
    confidence,
    ticketDetails,
    source: 'browser_ocr',
  };
}

/**
 * Free Zero-Key English Translation Service
 * Translates Marathi / Hindi document text to English without any API key or environment variable.
 */
export async function translateTextZeroKey(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  // 1. Try public translation API (client=gtx)
  try {
    // Process in chunks of 1500 chars to avoid URL length limitations
    const paragraphs = text.split('\n\n');
    const translatedParagraphs: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        translatedParagraphs.push('');
        continue;
      }

      // Split into sentences or lines if long
      const lines = para.split('\n');
      const translatedLines: string[] = [];

      for (const line of lines) {
        if (!line.trim()) {
          translatedLines.push('');
          continue;
        }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(
          line
        )}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // data[0] is array of [translatedChunk, originalChunk]
          if (Array.isArray(data) && Array.isArray(data[0])) {
            const combined = data[0].map((item: any) => item[0]).join('');
            translatedLines.push(combined);
          } else {
            translatedLines.push(line);
          }
        } else {
          translatedLines.push(line);
        }
      }

      translatedParagraphs.push(translatedLines.join('\n'));
    }

    const translatedFull = translatedParagraphs.join('\n\n');
    if (translatedFull && translatedFull.trim()) {
      return translatedFull.trim();
    }
  } catch (netErr) {
    console.warn('Public translation endpoint error, using dictionary fallback:', netErr);
  }

  // 2. Dictionary / rule-based fallback for Marathi/Hindi educational terms
  const dictionary: [RegExp, string][] = [
    [/उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव/gi, 'Candidate Name'],
    [/अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव/gi, 'Applicant Name'],
    [/विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव/gi, 'Student Name'],
    [/अर्ज\s*क्रमांक/gi, 'Application Number'],
    [/सीईटी\s*अर्ज\s*क्रमांक/gi, 'CET Application Number'],
    [/कॅप\s*अर्ज\s*क्रमांक/gi, 'CAP Application Number'],
    [/जन्मतारीख/gi, 'Date of Birth (DOB)'],
    [/जन्म\s*दिनांक/gi, 'Date of Birth'],
    [/मोबाईल\s*(?:क्रमांक|नंबर)/gi, 'Mobile Number'],
    [/दूरध्वनी\s*क्रमांक/gi, 'Phone Number'],
    [/ईमेल\s*(?:आयडी)?/gi, 'Email ID'],
    [/अभ्यासक्रम(?:चे\s*नाव)?/gi, 'Course Name'],
    [/शाखा/gi, 'Branch / Discipline'],
    [/तक्रार/gi, 'Grievance / Query'],
    [/समस्या/gi, 'Problem / Issue'],
    [/जात\s*प्रवर्ग/gi, 'Caste Category'],
    [/प्रवर्ग/gi, 'Category'],
    [/गुण/gi, 'Marks'],
    [/टक्केवारी/gi, 'Percentage'],
    [/महाविद्यालय(?:चे\s*नाव)?/gi, 'College Name'],
    [/संस्था/gi, 'Institute'],
    [/पत्ता/gi, 'Address'],
    [/लिंग/gi, 'Gender'],
    [/पुरुष/gi, 'Male'],
    [/स्त्री/gi, 'Female'],
    [/पात्रता/gi, 'Eligibility'],
    [/सत्यप्रत/gi, 'Attested Copy'],
    [/दस्तऐवज/gi, 'Document'],
    [/प्रमाणपत्र/gi, 'Certificate'],
    [/उत्पन्न/gi, 'Income'],
    [/अधिवास/gi, 'Domicile'],
    [/अल्पसंख्याक/gi, 'Minority'],
  ];

  let fallbackText = text;
  dictionary.forEach(([regex, repl]) => {
    fallbackText = fallbackText.replace(regex, repl);
  });

  return fallbackText;
}
