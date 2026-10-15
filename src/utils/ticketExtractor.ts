/**
 * Extracts student / candidate grievance & admission details from OCR text
 * for populating the SAC Ticket Generator (TG) modal.
 * 
 * Strict field-to-field mapping:
 * 1. Candidate Name -> TG 'Candidate Name' field
 * 2. Mobile Number -> TG 'Mobile Number' field
 * 3. Email Address -> TG 'Email Address' field
 * 4. DOB (Date of Birth) -> TG 'DOB' field (normalized YYYY-MM-DD)
 * 5. CET Application Number -> TG 'CET Application Number' field
 * 6. Course Name -> TG 'Course Name' dropdown
 * 7. Query: -> TG 'Query / Grievance Details' textarea
 */

import { ALL_COURSES, DEFAULT_COURSE } from '../data/courses';
import { convertQueryToThirdPersonFallback, detectFirstPersonLanguage } from './queryRewriter';

export interface CapturedTicketDetails {
  candidateName?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  cetNo?: string;
  course?: string;
  query?: string;
  capId?: string;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

/**
 * Normalizes date string into YYYY-MM-DD format for HTML <input type="date">
 */
export function normalizeDateToYMD(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const clean = dateStr.trim().replace(/,/g, '');

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y >= 1950 && y <= 2026 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Format: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) {
      y = y > 30 ? 1900 + y : 2000 + y;
    }
    if (y >= 1950 && y <= 2026 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Format: 15 Aug 2004 or 15-Aug-2004 or 15 August 2004
  const namedMonthMatch = clean.match(/^(\d{1,2})[\s\-.]([A-Za-z]{3,9})[\s\-.](\d{2,4})$/);
  if (namedMonthMatch) {
    const d = parseInt(namedMonthMatch[1], 10);
    const mStr = namedMonthMatch[2].toLowerCase();
    let y = parseInt(namedMonthMatch[3], 10);
    if (y < 100) {
      y = y > 30 ? 1900 + y : 2000 + y;
    }
    const m = MONTH_NAME_MAP[mStr];
    if (m && y >= 1950 && y <= 2026 && d >= 1 && d <= 31) {
      return `${y}-${m}-${String(d).padStart(2, '0')}`;
    }
  }

  // Format: Aug 15 2004 or August 15 2004
  const usNamedMonthMatch = clean.match(/^([A-Za-z]{3,9})[\s\-.](\d{1,2})[\s\-.](\d{2,4})$/);
  if (usNamedMonthMatch) {
    const mStr = usNamedMonthMatch[1].toLowerCase();
    const d = parseInt(usNamedMonthMatch[2], 10);
    let y = parseInt(usNamedMonthMatch[3], 10);
    if (y < 100) {
      y = y > 30 ? 1900 + y : 2000 + y;
    }
    const m = MONTH_NAME_MAP[mStr];
    if (m && y >= 1950 && y <= 2026 && d >= 1 && d <= 31) {
      return `${y}-${m}-${String(d).padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Finds matching course name from our comprehensive course catalog
 */
export function matchCourseName(courseText: string): string | undefined {
  if (!courseText) return undefined;
  const raw = courseText.trim();
  const lower = raw.toLowerCase();

  // 1. Exact match in ALL_COURSES
  const exact = ALL_COURSES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Partial match in ALL_COURSES
  const partial = ALL_COURSES.find(
    (c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
  );
  if (partial) return partial;

  // 3. Department / CET course keywords matching
  if (
    lower.includes('direct second') ||
    lower.includes('dse') ||
    lower.includes('lateral entry')
  ) {
    if (lower.includes('pharm') || lower.includes('dsp')) {
      return 'Direct Second Year Pharmacy (DSP)';
    }
    return 'Direct Second Year Engineering (DSE)';
  }

  if (lower.includes('dsp')) {
    return 'Direct Second Year Pharmacy (DSP)';
  }

  if (
    lower.includes('engineering') ||
    lower.includes('b.e') ||
    lower.includes('b.tech') ||
    lower.includes('btech')
  ) {
    return 'B.E. / B.Tech';
  }

  if (
    lower.includes('pharmacy') ||
    lower.includes('b.pharm') ||
    lower.includes('pharm.d') ||
    lower.includes('pharm')
  ) {
    return 'B.Pharmacy / Pharm.D';
  }

  if (lower.includes('mba') || lower.includes('mms') || lower.includes('management')) {
    return 'MBA / MMS';
  }

  if (lower.includes('mca')) {
    return 'MCA';
  }

  if (lower.includes('architecture') || lower.includes('b.arch')) {
    return 'B.Architecture';
  }

  if (
    lower.includes('agriculture') ||
    lower.includes('b.sc agri') ||
    lower.includes('horticulture')
  ) {
    return 'B.Sc. (Hons) Agriculture';
  }

  if (lower.includes('bba') || lower.includes('bms') || lower.includes('bbm')) {
    return 'BBA / BMS / BBM / MBA (Integrated)';
  }

  if (lower.includes('bca')) {
    return 'BCA / MCA (Integrated)';
  }

  if (lower.includes('fine art') || lower.includes('applied art')) {
    return 'Fine Art';
  }

  if (lower.includes('nursing') || lower.includes('b.sc nursing')) {
    return 'B.Sc. Nursing';
  }

  if (lower.includes('llb') || lower.includes('law')) {
    if (lower.includes('5') || lower.includes('five')) {
      return 'B.A. L.L.B. / B.B.A. L.L.B. – 5 Years';
    }
    return 'L.L.B. – 3 Years';
  }

  if (lower.includes('m.tech') || lower.includes('m.e.') || lower.includes('mtech')) {
    return 'M.E. / M.Tech';
  }

  if (lower.includes('hotel') || lower.includes('bhmct')) {
    return 'Hotel Management & Catering (BHMCT / MHMCT)';
  }

  if (lower.includes('b.ed') || lower.includes('bed')) {
    return 'B.Ed. / M.Ed.';
  }

  return undefined;
}

// Common CAP state prefixes (Engineering EN, MBA MB, MCA MC, Pharmacy PH, Architecture AR, Direct Second Year DS/DSE/DSP, etc.)
export const CAP_PREFIX_REGEX = /^(?:EN|MB|MC|PH|AR|HM|DS|DSE|DSP|TE|CO|PL|BS|AG|LA|ED|MP|NU)\d{6,10}$/i;

/**
 * Cleans application ID / CET number string by stripping markdown, punctuation,
 * and normalizing spaces or dashes (e.g. "EN 24108892" -> "EN24108892", "CET 24108892" -> "CET24108892")
 */
export function cleanAppId(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^(?:none|na|n\/a|not\s*found|not\s*available|available|unclear|null|undefined|nil|-+|blank|optional)$/i.test(trimmed)) {
    return '';
  }
  if (/\b(?:not\s*available|not\s*found|n\/a|none|nil|null|undefined|unclear)\b/i.test(trimmed)) {
    return '';
  }
  // Remove markdown bold, backticks, leading punctuation, colons
  let clean = val.replace(/[*`_]/g, '').replace(/^[ :.\-#\t—=|]+/, '').trim();
  // Cut off if subsequent field labels are concatenated on same line
  clean = clean.replace(/\s*(?:Candidate|Name|Mobile|Phone|Email|DOB|Date|CET|CAP|Course|Query|Status|Father|Mother|Gender).*$/i, '').trim();

  if (/^(?:none|na|n\/a|not\s*found|not\s*available|available|unclear|null|undefined|nil|-+|blank)$/i.test(clean)) {
    return '';
  }

  // Check for CAP prefix with optional space or dash, e.g. "EN 24108892" -> "EN24108892"
  const capWithSpaceMatch = clean.match(/\b((?:EN|MB|MC|PH|AR|HM|DS|DSE|DSP|TE|CO|PL|BS|AG|LA|ED|MP|NU)[\s\-_/]?\d{6,10})\b/i);
  if (capWithSpaceMatch) {
    return capWithSpaceMatch[1].replace(/[\s\-_/]/g, '').toUpperCase();
  }

  // Check for CET prefix with optional space or dash, e.g. "CET 24108892" -> "CET24108892"
  const cetWithSpaceMatch = clean.match(/\b(CET[\s\-_/]?\d{6,14})\b/i);
  if (cetWithSpaceMatch) {
    return cetWithSpaceMatch[1].replace(/[\s\-_/]/g, '').toUpperCase();
  }

  // Pure digits token of 6 to 14 digits (typical CET application / roll number)
  const digitsMatch = clean.match(/\b(\d{6,14})\b/);
  if (digitsMatch) {
    return digitsMatch[1];
  }

  // Extract contiguous alphanumeric token of 6 to 16 chars
  const tokenMatch = clean.match(/([A-Za-z0-9]{6,16})/);
  if (tokenMatch && !/^(candidate|applicant|student|course|status|number|application|details|none|notavailable|available|notfound|unclear|present)$/i.test(tokenMatch[1])) {
    return tokenMatch[1].toUpperCase();
  }
  return '';
}

/**
 * Extracts ONLY the 8 required ticket details from extracted OCR / document text.
 * Strictly maps:
 * 1. Candidate Name -> details.candidateName
 * 2. CET Application Number -> details.cetNo
 * 3. CAP Application Number -> details.capId
 * 4. Date of Birth (DOB) -> details.dob
 * 5. Mobile Number -> details.mobile
 * 6. Email ID -> details.email
 * 7. Course Name -> details.course
 * 8. Query / Grievance Details -> details.query
 */
// Helper to cleanly sanitize extracted candidate names
export function cleanCandidateName(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  // Strip markdown bold/italic/code formatting and table pipes
  clean = clean.replace(/^[*_`|]+|[*_`|]+$/g, '').trim();
  // Strip leading list numbers/bullets (e.g., "1. ", "1) ", "- ", "• ")
  clean = clean.replace(/^[\s\d.)\-*•#[\]|]+/, '').trim();
  // Strip any leading label prefix
  clean = clean.replace(
    /^(?:Candidate(?:\s*['’]s)?(?:\s*Full)?\s*Name|Name\s*of\s*(?:the\s*)?(?:Candidate|Applicant|Student)|Student(?:\s*['’]s)?(?:\s*Full)?\s*Name|Applicant(?:\s*['’]s)?(?:\s*Full)?\s*Name|Full\s*Name(?:\s*of\s*(?:Candidate|Applicant|Student))?|Candidate|Student|Applicant|Name|उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव|अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव|विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव|उमेदवार|विद्यार्थी|अर्जदार)(?:\s*\([^)]*\))?[\s:.\-#\t—=|]+/i,
    ''
  ).trim();
  // Strip leading parenthetical note like '(as per SSC):' or '(in block letters):'
  clean = clean.replace(/^\([^)]*\)[\s:.\-#\t—=|]*/, '').trim();
  // Strip inline next-field label if present on same line (e.g. 'DOB: 15/08/2004' or 'Mobile: 9822...' or 'Father's Name')
  clean = clean.replace(/\s+(?:Mobile(?:\s*No)?|Phone|Email(?:\s*ID)?|DOB|Date\s*of\s*Birth|CET|CAP|Course(?:\s*Name)?|Query|Father|Mother|Gender|Category|Nationality|Sign)\s*[:.\-].*$/i, '').trim();
  // Strip leading/trailing quotes, bullets, punctuation, numbers at start, table pipes
  clean = clean.replace(/^[\s"'“”‘’\-.:,;0-9*#|]+|[\s"'“”‘’\-.:,;*#|]+$/g, '').trim();
  // Reject placeholder values
  if (/^(candidate|name|student|applicant|query|course|none|na|n\/a|not\s*found|not\s*available|unclear|null|undefined|nil|-+|blank)$/i.test(clean)) {
    return '';
  }
  return clean || raw.trim();
}

export function captureTicketDetailsFromText(rawText: string): CapturedTicketDetails {
  if (!rawText || !rawText.trim()) return {};

  const details: CapturedTicketDetails = {};
  const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanedText.split('\n').map((l) => l.trim()).filter(Boolean);

  // ---------------------------------------------------------------------------
  // STEP 1: LINE-BY-LINE STRUCTURED KEY-VALUE EXTRACTION
  // Matches exact 8 fields from form lines (with or without numbers like 1., 2.)
  // ---------------------------------------------------------------------------
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip leading list numbers/bullets/markdown
    const strippedLine = line
      .replace(/^[\s\d.)\-*•#[\]|]+/, '')
      .replace(/[*_]/g, '')
      .trim();

    // Helper: extracts value after label on same line or from next line
    const extractLineVal = (labelRegex: RegExp): string => {
      // 1. Try strippedLine first (matches "1. Candidate Name: Ramesh Shinde")
      let match = strippedLine.match(labelRegex);
      if (match && match[1] !== undefined && match[1].trim()) {
        return match[1].trim();
      }
      // 2. Try raw line
      match = line.match(labelRegex);
      if (match && match[1] !== undefined && match[1].trim()) {
        return match[1].trim();
      }
      // 3. If line is just the label without value, look at next line
      const cleanOnlyLabel = strippedLine.replace(/[\s:.\-#\t—=|]+$/, '');
      if (
        (labelRegex.test(strippedLine) || labelRegex.test(line) || labelRegex.test(cleanOnlyLabel + ':')) &&
        i + 1 < lines.length
      ) {
        const next = lines[i + 1].trim();
        // Ensure next line is not another label
        if (
          !/^(candidate|name|mobile|phone|email|dob|date of birth|cet|cap|course|query|grievance|\*{1,2}(candidate|name|mobile|email|dob|cet|cap|course|query))/i.test(
            next
          )
        ) {
          return next;
        }
      }
      return '';
    };

    // 1. Candidate Name
    if (!details.candidateName) {
      const nameVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Candidate(?:\s*['’]s)?(?:\s*Full)?\s*Name|Name\s*of\s*(?:the\s*)?(?:Candidate|Applicant|Student)|Student(?:\s*['’]s)?(?:\s*Full)?\s*Name|Applicant(?:\s*['’]s)?(?:\s*Full)?\s*Name|Full\s*Name(?:\s*of\s*(?:Candidate|Applicant|Student))?|Candidate|Student|Applicant|Name|उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव|अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव|विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव|उमेदवार|विद्यार्थी|अर्जदार))(?:\s*\([^)]*\))?[\s:.\-#\t—=|]+(.*)$/i
      );
      if (nameVal) {
        const clean = cleanCandidateName(nameVal);
        if (clean.length >= 2) {
          details.candidateName = clean;
        }
      }
    }

    // 2. CET Application Number (exact CET field on form)
    if (!details.cetNo) {
      const cetVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:CET\s*(?:Application|App|Reg|Registration|Form)?\s*(?:Number|No|Num|ID)?|CET\s*Roll\s*(?:No|Number)|सीईटी\s*(?:अर्ज|नोंदणी)?\s*(?:क्रमांक|क्र\.?|नंबर)?|सीईटी\s*रोल\s*नंबर|MHT[\s-]?CET\s*(?:Application|App|Reg)?\s*(?:Number|No|Num|ID)?|MAH[\s-]?CET\s*(?:Application|App|Reg)?\s*(?:Number|No|Num|ID)?))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (cetVal) {
        const cleaned = cleanAppId(cetVal);
        if (cleaned && !/^(CANDIDATE|COURSE|MOBILE|EMAIL|FATHER|MOTHER|STATUS|NUMBER|APPLICATION|NONE|NA|NOT\s*FOUND|NOTAVAILABLE)$/i.test(cleaned)) {
          details.cetNo = cleaned;
        }
      }
    }

    // 3. CAP Application Number (exact CAP field on form)
    if (!details.capId) {
      const capVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:CAP\s*(?:Application|App|Reg|Registration)?\s*(?:Number|No|Num|ID|Form)?|CAP\s*ID|कॅप\s*(?:नोंदणी|अर्ज)?\s*(?:क्रमांक|क्र\.?|आयडी)?))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (capVal) {
        const cleaned = cleanAppId(capVal);
        if (cleaned && !/^(CANDIDATE|COURSE|MOBILE|EMAIL|STATUS|QUERY|NONE|NA|NOT\s*FOUND|NOTAVAILABLE)$/i.test(cleaned)) {
          details.capId = cleaned;
        }
      }
    }

    // 4. Generic Application Number / ID (only if neither CET nor CAP matched)
    if (!details.cetNo && !details.capId) {
      const genAppVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Application\s*(?:Number|No|Num|ID|Form\s*No)|अर्ज\s*(?:क्रमांक|क्र\.?|नंबर)))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (genAppVal) {
        const cleaned = cleanAppId(genAppVal);
        if (cleaned && !/^(CANDIDATE|COURSE|MOBILE|EMAIL|STATUS|QUERY|NONE|NA|NOTAVAILABLE)$/i.test(cleaned)) {
          if (CAP_PREFIX_REGEX.test(cleaned)) {
            details.capId = cleaned;
          } else {
            details.cetNo = cleaned;
          }
        }
      }
    }

    // 5. Date of Birth (DOB)
    if (!details.dob) {
      const dobVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Date\s*of\s*Birth(?:\s*\(\s*DOB\s*\))?|DOB(?:\s*\(\s*Date\s*of\s*Birth\s*\))?|Birth\s*Date|D\.O\.B\.?|जन्म\s*तारीख|जन्म\s*दिनांक))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (dobVal) {
        const dateToken = dobVal.match(/(\d{1,4}[/\-.][0-9A-Za-z]{1,9}[/\-.][0-9]{2,4}|\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]\d{2,4})/);
        if (dateToken) {
          const norm = normalizeDateToYMD(dateToken[1]);
          if (norm) details.dob = norm;
        }
      }
    }

    // 6. Mobile Number
    if (!details.mobile) {
      const mobVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Mobile\s*(?:Number|No)?|Phone\s*(?:Number|No)?|Contact\s*(?:Number|No)?|Cell\s*(?:Number|No)?|मोबाईल(?:\s*(?:क्रमांक|नंबर|क्र\.?))?|भ्रमणध्वनी(?:\s*क्र\.?)?|दूरध्वनी))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (mobVal) {
        const digits = mobVal.replace(/\D/g, '').slice(-10);
        if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
          details.mobile = digits;
        }
      }
    }

    // 7. Email ID
    if (!details.email) {
      const emailVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Email\s*(?:Address|ID)?|E-mail\s*(?:Address|ID)?|Mail\s*ID|ई-मेल|ईमेल(?:\s*आयडी)?))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (emailVal) {
        const m = emailVal.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (m) details.email = m[1].toLowerCase().trim();
      }
    }

    // 8. Course Name
    if (!details.course) {
      const courseVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Course\s*Name|Course\s*Applied|Applied\s*Course|Course|Branch|Programme|अभ्यासक्रमाचे\s*नाव|अभ्यासक्रम))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (courseVal) {
        const cleanVal = courseVal.replace(/^[*_`|]+|[*_`|]+$/g, '').trim();
        if (!/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|-+)$/i.test(cleanVal)) {
          const matched = matchCourseName(cleanVal);
          details.course = matched || cleanVal;
        }
      }
    }

    // 9. Query / Grievance Details
    if (!details.query) {
      const queryVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Query\s*(?:\/|\&|and)?\s*Grievance(?:\s*Details)?|Query\s*Details|Query|Grievance(?:\s*Details)?|Issue(?:\s*Details)?|Problem|Complaint|Subject|Reason|Remarks?|तक्रार\s*(?:\/|\&)?\s*(?:अडचण|समस्या)?(?:\s*तपशील)?|तक्रार\s*तपशील|तक्रार|समस्या|अडचण|विषय))[\s:.\-#\t—=|\/]+(.*)$/i
      );
      if (queryVal && queryVal.length >= 2) {
        const cleanQ = queryVal.replace(/^[*_`|/:\s\-—]+|[*_`|/:\s\-—]+$/g, '').trim();
        if (!/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|nil|-+)$/i.test(cleanQ)) {
          details.query = cleanQ;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 2: GLOBAL REGEX SEARCH FOR UNRESOLVED FIELDS
  // Scans for exact label prefixes across document text
  // ---------------------------------------------------------------------------

  // 1. Candidate Name (if not resolved)
  if (!details.candidateName) {
    const nameGlobalPatterns = [
      /(?:Candidate(?:\s*['’]s)?(?:\s*Full)?\s*Name|Name\s*of\s*(?:the\s*)?(?:Candidate|Applicant|Student)|Student(?:\s*['’]s)?(?:\s*Full)?\s*Name|Applicant(?:\s*['’]s)?(?:\s*Full)?\s*Name|Full\s*Name(?:\s*of\s*(?:Candidate|Applicant|Student))?|उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव|अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव|विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव)(?:\s*\([^)]*\))?[\s:.\-#\t—=|]+([^\n\r|]{2,80})/i,
      /(?:^|\n)\s*(?:Candidate\s*Name|Student\s*Name|Applicant\s*Name)(?:\s*\([^)]*\))?[\s:.\-#\t\n|]+([^\n\r|]{2,80})/i,
    ];
    for (const pat of nameGlobalPatterns) {
      const m = cleanedText.match(pat);
      if (m && m[1]) {
        const cleaned = cleanCandidateName(m[1]);
        if (cleaned.length >= 2) {
          details.candidateName = cleaned;
          break;
        }
      }
    }
  }

  // 2. CAP Application Number
  if (!details.capId) {
    const capMatch = cleanedText.match(
      /(?:CAP\s*(?:Application|App|Reg|Registration)?\s*(?:Number|No|Num|ID|Form)?|CAP\s*ID|कॅप\s*अर्ज\s*क्रमांक|कॅप\s*आयडी)[\s:.\-#\t—=\n]+([A-Za-z0-9\s\-_/]{6,20})/i
    );
    if (capMatch && capMatch[1]) {
      const cleaned = cleanAppId(capMatch[1]);
      if (cleaned && !/^(CANDIDATE|APPLICANT|STUDENT|COURSE|STATUS|NUMBER|MOBILE|DETAILS|NONE|NA|NOTAVAILABLE)$/i.test(cleaned)) {
        details.capId = cleaned;
      }
    }
  }

  // Standalone CAP course prefix pattern (e.g., EN24108892) only if not matching CET number
  if (!details.capId) {
    const capPrefixMatch = cleanedText.match(/\b((?:EN|MB|MC|PH|AR|HM|DS|DSE|DSP|TE|CO|PL|BS|AG|LA|ED|MP|NU)\d{6,10})\b/i);
    if (capPrefixMatch && capPrefixMatch[1] !== details.cetNo) {
      details.capId = capPrefixMatch[1].toUpperCase();
    }
  }

  // 3. CET Application Number (explicit CET prefix or Marathi label)
  if (!details.cetNo) {
    const explicitCet = cleanedText.match(
      /(?:CET\s*(?:Application|App|Reg|Registration|Form)?\s*(?:Number|No|Num|ID)?|CET\s*Roll\s*(?:No|Number)|सीईटी\s*अर्ज\s*क्रमांक|सीईटी\s*नोंदणी\s*क्रमांक|सीईटी\s*रोल\s*नंबर|MHT[\s-]?CET\s*(?:Application|App|Reg)?\s*(?:Number|No|Num|ID)?|MAH[\s-]?CET\s*(?:Application|App|Reg)?\s*(?:Number|No|Num|ID)?)[\s:.\-#\t—=\n]+([A-Za-z0-9\s\-_/]{6,20})/i
    );
    if (explicitCet && explicitCet[1]) {
      const cleaned = cleanAppId(explicitCet[1]);
      if (cleaned && !/^(CANDIDATE|APPLICANT|STUDENT|COURSE|STATUS|NUMBER|MOBILE|DETAILS|NONE|NA|NOTAVAILABLE)$/i.test(cleaned)) {
        details.cetNo = cleaned;
      }
    }
  }

  // Standalone CET number (starts with CET prefix)
  if (!details.cetNo) {
    const cetPrefixMatch = cleanedText.match(/\b(CET[\s\-_/]?\d{6,14})\b/i);
    if (cetPrefixMatch) {
      details.cetNo = cetPrefixMatch[1].replace(/[\s\-_/]/g, '').toUpperCase();
    }
  }

  // 4. Date of Birth (DOB) - ONLY match when explicitly labeled
  if (!details.dob) {
    const dobGlobalPatterns = [
      /(?:Date\s*of\s*Birth(?:\s*\(\s*DOB\s*\))?|DOB(?:\s*\(\s*Date\s*of\s*Birth\s*\))?|Birth\s*Date|D\.O\.B\.?|जन्म\s*तारीख)[\s:.\-#\t\n]+(\d{1,4}[/\-.][0-9A-Za-z]{1,9}[/\-.][0-9]{2,4})/i,
    ];
    for (const pat of dobGlobalPatterns) {
      const m = cleanedText.match(pat);
      if (m && m[1]) {
        const norm = normalizeDateToYMD(m[1].trim());
        if (norm) {
          details.dob = norm;
          break;
        }
      }
    }
  }

  // 5. Mobile Number (if not resolved)
  if (!details.mobile) {
    const mobGlobal = cleanedText.match(/(?:Mobile|Phone|Contact|Cell|मोबाईल)[\s:.\-#\t\n+]+(?:(?:91|0)[\s\-]*)?([6-9]\d{9})\b/i);
    if (mobGlobal && mobGlobal[1]) {
      details.mobile = mobGlobal[1];
    }
  }

  // 6. Email ID (if not resolved)
  if (!details.email) {
    const emailGlobal = cleanedText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailGlobal && emailGlobal[1]) {
      details.email = emailGlobal[1].toLowerCase().trim();
    }
  }

  // 7. Course Name (if not resolved)
  if (!details.course) {
    const courseHeaderMatch = cleanedText.match(
      /(?:Course\s*Name|Course\s*Applied|Applied\s*Course|Course|Branch|Programme|अभ्यासक्रमाचे\s*नाव|अभ्यासक्रम)[\s:.\-#\t]+([^\n\r]{2,80})/i
    );
    if (courseHeaderMatch && courseHeaderMatch[1]) {
      const cleanVal = courseHeaderMatch[1].replace(/^[*_`|]+|[*_`|]+$/g, '').trim();
      if (!/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|-+)$/i.test(cleanVal)) {
        const matched = matchCourseName(cleanVal);
        details.course = matched || cleanVal;
      }
    }
  }

  // 8. Query / Grievance Details (if not resolved)
  if (!details.query) {
    const queryPatterns = [
      /(?:Query\s*(?:\/|\&)?\s*Grievance(?:\s*Details)?|Query\s*Details|Query|Grievance(?:\s*Details)?|Issue(?:\s*Details)?|Problem|Complaint|Subject|Reason|Remarks?|तक्रार\s*(?:\/|\&)?\s*अडचण(?:\s*तपशील)?|तक्रार\s*तपशील|तक्रार|विषय)[\s:.\-#\t—=]+([\s\S]+?)(?=(?:\n\s*(?:Candidate|Name|Mobile|Email|DOB|Date\s*of\s*Birth|CET|CAP|Course|Date|Sign|Signature|Note|Place|Status\b))|$)/i,
    ];
    for (const pat of queryPatterns) {
      const m = cleanedText.match(pat);
      if (m && m[1]) {
        let q = m[1].replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        q = q
          .replace(
            /\s*(?:Thanking\s*you|Yours\s*faithfully|Yours\s*sincerely|Date\s*:|Place\s*:|Signature\s*:).*$/i,
            ''
          )
          .trim();
        if (q.length >= 2 && !/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|-+)$/i.test(q)) {
          details.query = q;
          break;
        }
      }
    }
  }

  return details;
}
