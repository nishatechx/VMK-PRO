/**
 * Extracts student / candidate grievance & admission details from OCR text
 * for populating the SAC Ticket Generator (TG) modal.
 */

export interface CapturedTicketDetails {
  cetNo?: string;
  capId?: string;
  candidateName?: string;
  dob?: string;
  mobile?: string;
  email?: string;
  course?: string;
  query?: string;
}

export function captureTicketDetailsFromText(rawText: string): CapturedTicketDetails {
  if (!rawText || !rawText.trim()) return {};

  const details: CapturedTicketDetails = {};
  const cleanedText = rawText.replace(/\r\n/g, '\n');
  const lines = cleanedText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. CAP ID extraction (e.g., EN24123456, MB25100234, MC26109923, PH24001923, etc.)
  const capRegexes = [
    /\b((?:EN|MB|MC|PH|AR|HM|DS|TE|CO|PL|BS|AG)\d{6,10})\b/i,
    /(?:CAP\s*(?:ID|App|Application|No|Number)[\s:.\-#]+)([A-Z0-9]{8,14})/i,
    /(?:Application\s*(?:ID|No|Number)[\s:.\-#]+)([A-Z]{2}\d{6,10})/i,
  ];

  for (const reg of capRegexes) {
    const m = cleanedText.match(reg);
    if (m && m[1]) {
      details.capId = m[1].toUpperCase();
      break;
    }
  }

  // 2. CET Number extraction (e.g., CET2024123456, Roll No, 2412345678, etc.)
  const cetRegexes = [
    /(?:CET\s*(?:Roll|No|Number|App|Application)?[\s:.\-#]+)([A-Z0-9]{6,14})/i,
    /\b(CET\d{6,12})\b/i,
    /(?:Roll\s*(?:No|Number)[\s:.\-#]+)(\d{6,12})/i,
    /\b(2[3-6]\d{7,10})\b/,
  ];

  for (const reg of cetRegexes) {
    const m = cleanedText.match(reg);
    if (m && m[1]) {
      details.cetNo = m[1].toUpperCase();
      break;
    }
  }

  // If no separate CET No found but CAP ID exists, CET No can fallback to CAP ID or numeric part
  if (!details.cetNo && details.capId) {
    details.cetNo = details.capId;
  }

  // 3. Candidate Full Name extraction
  const namePatterns = [
    /(?:Name\s*of\s*(?:the\s*)?Candidate|Candidate(?:['\s]*s)?\s*Name|Student(?:['\s]*s)?\s*Name|Full\s*Name|Applicant\s*Name|विद्यार्थ्याचे\s*नाव|उमेदवाराचे\s*नाव|नाव)[\s:.\-#]+([A-Za-z\u0900-\u097F\s.]{3,60})/i,
    /(?:Name)[\s:.\-#]+([A-Z][A-Za-z\s.]{3,50})/,
  ];

  for (const pat of namePatterns) {
    const m = cleanedText.match(pat);
    if (m && m[1]) {
      let candidate = m[1].replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      // Remove trailing words that might be next form labels
      candidate = candidate.replace(/\s*(?:DOB|Date of Birth|Gender|Category|Father|Mother|Mobile|Email|Address|Course|Seat|Roll|CET|CAP).*$/i, '').trim();
      if (
        candidate.length >= 3 &&
        candidate.length <= 50 &&
        !/^(of|is|the|application|cet|date|father|mother|gender|category|seat|roll)$/i.test(candidate)
      ) {
        details.candidateName = candidate;
        break;
      }
    }
  }

  // 4. Date of Birth (DOB) -> Normalized to YYYY-MM-DD
  const dobPatterns = [
    /(?:DOB|Date\s*of\s*Birth|Birth\s*Date|जन्म\s*तारीख|जन्म\s*दिनांक)[\s:.\-#]+(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
    /\b(\d{1,2}[/\-.]\d{1,2}[/\-.](?:19|20)\d{2})\b/,
  ];

  for (const pat of dobPatterns) {
    const m = cleanedText.match(pat);
    if (m && m[1]) {
      const parts = m[1].split(/[/\-.]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        // If formatted as YYYY-MM-DD
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else if (year < 100) {
          year = year > 30 ? 1900 + year : 2000 + year;
        }

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950 && year <= 2025) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          details.dob = `${year}-${mm}-${dd}`;
          break;
        }
      }
    }
  }

  // 5. Mobile Phone Number (10 digits starting with 6,7,8,9)
  const mobilePatterns = [
    /(?:Mobile|Phone|Contact|Cell|मोबाईल|दूरध्वनी)[\s:.\-#+]+(?:91)?[\s\-]?([6-9]\d{9})\b/i,
    /\b([6-9]\d{9})\b/,
  ];

  for (const pat of mobilePatterns) {
    const m = cleanedText.match(pat);
    if (m && m[1]) {
      details.mobile = m[1];
      break;
    }
  }

  // 6. Email address
  const emailMatch = cleanedText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
  if (emailMatch) {
    details.email = emailMatch[1].toLowerCase();
  }

  // 7. Course mapping
  const lowerText = cleanedText.toLowerCase();
  if (
    lowerText.includes('engineering') ||
    lowerText.includes('b.e') ||
    lowerText.includes('b.tech') ||
    lowerText.includes('btech')
  ) {
    if (lowerText.includes('direct second') || lowerText.includes('dse') || lowerText.includes('lateral')) {
      details.course = 'Direct Second Year Engineering (DSE)';
    } else {
      details.course = 'B.E. / B.Tech';
    }
  } else if (
    lowerText.includes('pharmacy') ||
    lowerText.includes('b.pharm') ||
    lowerText.includes('pharm.d')
  ) {
    if (lowerText.includes('direct second') || lowerText.includes('dsp')) {
      details.course = 'Direct Second Year Pharmacy (DSP)';
    } else {
      details.course = 'B.Pharmacy / Pharm.D';
    }
  } else if (lowerText.includes('mba') || lowerText.includes('mms')) {
    details.course = 'MBA / MMS';
  } else if (lowerText.includes('mca')) {
    details.course = 'MCA';
  } else if (lowerText.includes('architecture') || lowerText.includes('b.arch')) {
    details.course = 'B.Architecture';
  } else if (lowerText.includes('agriculture') || lowerText.includes('b.sc agri')) {
    details.course = 'B.Sc (Honours) Agriculture';
  } else if (lowerText.includes('polytechnic') || lowerText.includes('diploma')) {
    details.course = 'Diploma in Engineering & Technology';
  } else if (lowerText.includes('bba') || lowerText.includes('bms')) {
    details.course = 'BBA / BMS / BBM / MBA (Integrated)';
  } else if (lowerText.includes('bca')) {
    details.course = 'BCA / MCA (Integrated)';
  }

  // 8. Query / Grievance extraction
  const queryPatterns = [
    /(?:Grievance|Query|Issue|Problem|Complaint|Subject|Reason|तक्रार|विषय|कारणे)[\s:.\-#]+([\s\S]{10,450}?)(?=\n\s*(?:Date|Sign|Signature|Note|Candidate|Application|Place)|$)/i,
    /(?:Remarks?|Comments?|Description)[\s:.\-#]+([\s\S]{10,350})/i,
  ];

  for (const pat of queryPatterns) {
    const m = cleanedText.match(pat);
    if (m && m[1]) {
      const q = m[1].replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (q.length > 5) {
        details.query = q;
        break;
      }
    }
  }

  // Fallback query if no explicit section
  if (!details.query) {
    const summaryLines = lines.slice(0, 3).join(' - ');
    if (summaryLines) {
      details.query = `Document Verification / Inquiry: ${summaryLines.slice(0, 180)}`;
    }
  }

  return details;
}
