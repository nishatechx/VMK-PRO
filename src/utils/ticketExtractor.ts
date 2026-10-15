/**
 * Extracts student / candidate grievance & admission details from handwritten or printed SAC forms
 * for populating the SAC Ticket Generator (TG) modal and displaying extracted field cards.
 * 
 * Canonical 8 Fields:
 * 1. Candidate Name (As in CET / Form)
 * 2. CET Application Number (digits/string from CET row)
 * 3. CAP Application Number (state CAP ID with prefixes like EN, MB, MC, PH, AR, DS, etc.)
 * 4. Date of Birth (DOB) (normalized YYYY-MM-DD when unambiguous)
 * 5. Mobile Number (10-digit phone number as string)
 * 6. Email ID (complete email address preserved)
 * 7. Course Name (degree / program applied)
 * 8. Query / Grievance Details (complete handwritten grievance text)
 */

import { ALL_COURSES, DEFAULT_COURSE } from '../data/courses';

export type ExtractionConfidenceLevel = 'high' | 'medium' | 'low';

export interface FieldConfidenceMap {
  candidateName: ExtractionConfidenceLevel;
  cetApplicationNumber: ExtractionConfidenceLevel;
  capApplicationNumber: ExtractionConfidenceLevel;
  dob: ExtractionConfidenceLevel;
  mobileNumber: ExtractionConfidenceLevel;
  emailId: ExtractionConfidenceLevel;
  courseName: ExtractionConfidenceLevel;
  queryGrievanceDetails: ExtractionConfidenceLevel;
}

export interface CanonicalTicketFields {
  candidateName: string;
  cetApplicationNumber: string;
  capApplicationNumber: string;
  dob: string;
  mobileNumber: string;
  emailId: string;
  courseName: string;
  queryGrievanceDetails: string;
  confidence: FieldConfidenceMap;
  needsReview: string[];
}

export interface CapturedTicketDetails {
  candidateName?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  cetNo?: string;
  course?: string;
  query?: string;
  capId?: string;
  confidence?: Partial<FieldConfidenceMap>;
  needsReview?: string[];
  canonical?: CanonicalTicketFields;
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
 * Returns undefined if date format is ambiguous or invalid.
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

  // Contiguous alphanumeric token of 6 to 16 chars
  const tokenMatch = clean.match(/([A-Za-z0-9]{6,16})/);
  if (tokenMatch && !/^(candidate|applicant|student|course|status|number|application|details|none|notavailable|available|notfound|unclear|present)$/i.test(tokenMatch[1])) {
    return tokenMatch[1].toUpperCase();
  }
  return '';
}

/**
 * Sanitizes candidate names, removing labels, ticket numbers, digits, and noise.
 */
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

  // If candidate name is purely numbers or looks like a ticket number / application ID, reject it
  if (/^\d+$/.test(clean) || /^(?:EN|MB|MC|PH|AR|DS|DSP|DSE)\d+/i.test(clean) || /^SAC\b/i.test(clean) || /^TK\b/i.test(clean)) {
    return '';
  }

  // Reject headers, institutional phrases, form titles, or signature lines
  if (/\b(?:ASSISTANCE\s*CENTRE|STUDENT\s*ASSISTANCE|GRIEVANCE\s*FORM|VERIFICATION|SCRUTINY|SIGNATURE|STATE\s*COMMON|CET\s*CELL|SAC\b|DATE\b|PLACE\b)\b/i.test(clean)) {
    return '';
  }

  // Reject placeholder values
  if (/^(candidate|name|student|applicant|query|course|none|na|n\/a|not\s*found|not\s*available|unclear|null|undefined|nil|-+|blank)$/i.test(clean)) {
    return '';
  }
  return clean;
}

/**
 * Validates and normalizes parsed JSON or raw ticket fields into the canonical 8-field structure.
 */
export function normalizeTicketFields(raw: any, sourceText?: string): CapturedTicketDetails {
  const needsReview: string[] = [];
  const confidence: FieldConfidenceMap = {
    candidateName: 'high',
    cetApplicationNumber: 'high',
    capApplicationNumber: 'high',
    dob: 'high',
    mobileNumber: 'high',
    emailId: 'high',
    courseName: 'high',
    queryGrievanceDetails: 'high',
  };

  // 1. Candidate Name
  let candidateName = cleanCandidateName(
    raw.candidateName || raw.name || raw.studentName || raw.applicantName || raw.fullName || ''
  );
  if (!candidateName || candidateName.length < 2) {
    candidateName = '';
    confidence.candidateName = 'low';
    needsReview.push('candidateName');
  } else if (raw.confidence?.candidateName) {
    confidence.candidateName = raw.confidence.candidateName;
    if (confidence.candidateName !== 'high') needsReview.push('candidateName');
  }

  // 2. CET Application Number (digits / string, NEVER swapped with CAP)
  let cetNo = cleanAppId(
    raw.cetApplicationNumber || raw.cetNo || raw.cetAppNo || raw.cetRollNo || raw.applicationNumber || ''
  );
  // Ensure CET does not contain state CAP prefix if distinct
  if (CAP_PREFIX_REGEX.test(cetNo) && !raw.capApplicationNumber && !raw.capId) {
    // If it has CAP prefix (e.g. EN24...) and no capId provided, it's actually a CAP ID
    raw.capApplicationNumber = cetNo;
    cetNo = '';
  }
  if (!cetNo) {
    confidence.cetApplicationNumber = 'low';
    needsReview.push('cetApplicationNumber');
  } else if (raw.confidence?.cetApplicationNumber) {
    confidence.cetApplicationNumber = raw.confidence.cetApplicationNumber;
    if (confidence.cetApplicationNumber !== 'high') needsReview.push('cetApplicationNumber');
  }

  // 3. CAP Application Number
  let capId = cleanAppId(
    raw.capApplicationNumber || raw.capId || raw.capAppNo || ''
  );
  if (capId && CAP_PREFIX_REGEX.test(capId)) {
    capId = capId.toUpperCase();
  }
  if (!capId) {
    confidence.capApplicationNumber = 'low';
    // CAP number may legitimately be absent for students at CET stage before CAP registration
    if (raw.needsReview?.includes('capApplicationNumber')) {
      needsReview.push('capApplicationNumber');
    }
  } else if (raw.confidence?.capApplicationNumber) {
    confidence.capApplicationNumber = raw.confidence.capApplicationNumber;
    if (confidence.capApplicationNumber !== 'high') needsReview.push('capApplicationNumber');
  }

  // 4. Date of Birth (DOB)
  const rawDob = String(raw.dob || raw.birthDate || raw.dateOfBirth || '').trim();
  let dob = '';
  if (rawDob) {
    const normalized = normalizeDateToYMD(rawDob);
    if (normalized) {
      dob = normalized;
      confidence.dob = raw.confidence?.dob || 'high';
    } else {
      // Preserve original handwriting text when ambiguous
      dob = rawDob;
      confidence.dob = 'medium';
      needsReview.push('dob');
    }
  } else {
    confidence.dob = 'low';
    needsReview.push('dob');
  }

  // 5. Mobile Number (10 digits as string)
  let mobile = String(raw.mobileNumber || raw.mobile || raw.phone || '').trim();
  const digits = mobile.replace(/\D/g, '');
  if (digits.length >= 10) {
    mobile = digits.slice(-10);
    confidence.mobileNumber = raw.confidence?.mobileNumber || 'high';
  } else if (mobile) {
    // Partial or uncertain mobile number
    confidence.mobileNumber = 'medium';
    needsReview.push('mobileNumber');
  } else {
    mobile = '';
    confidence.mobileNumber = 'low';
    needsReview.push('mobileNumber');
  }

  // 6. Email ID
  let email = String(raw.emailId || raw.email || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (email && emailRegex.test(email)) {
    confidence.emailId = raw.confidence?.emailId || 'high';
  } else if (email) {
    confidence.emailId = 'medium';
    needsReview.push('emailId');
  } else {
    email = '';
    confidence.emailId = 'low';
    needsReview.push('emailId');
  }

  // 7. Course Name
  let course = String(raw.courseName || raw.course || '').trim();
  if (course) {
    const matched = matchCourseName(course);
    course = matched || course;
    confidence.courseName = raw.confidence?.courseName || 'high';
  } else {
    course = '';
    confidence.courseName = 'low';
    needsReview.push('courseName');
  }

  // 8. Query / Grievance Details
  let query = String(raw.queryGrievanceDetails || raw.query || raw.grievance || '').trim();
  // Strip separate Ticket Number from query if mistakenly included
  query = query
    .replace(/(?:^|\n|\s*)(?:Ticket\s*(?:No|Number)|Token\s*No|Sr\s*No)[\s:.\-#\t—=]+[A-Za-z0-9\-_/]+/gi, '')
    .trim();
  if (query && query.length >= 3) {
    confidence.queryGrievanceDetails = raw.confidence?.queryGrievanceDetails || 'high';
  } else {
    query = '';
    confidence.queryGrievanceDetails = 'low';
    needsReview.push('queryGrievanceDetails');
  }

  // Merge any custom needsReview items passed from AI model
  if (Array.isArray(raw.needsReview)) {
    for (const item of raw.needsReview) {
      if (typeof item === 'string' && !needsReview.includes(item)) {
        needsReview.push(item);
      }
    }
  }

  const canonical: CanonicalTicketFields = {
    candidateName,
    cetApplicationNumber: cetNo,
    capApplicationNumber: capId,
    dob,
    mobileNumber: mobile,
    emailId: email,
    courseName: course,
    queryGrievanceDetails: query,
    confidence,
    needsReview,
  };

  return {
    candidateName,
    cetNo,
    capId,
    dob,
    mobile,
    email,
    course,
    query,
    confidence,
    needsReview,
    canonical,
  };
}

/**
 * Attempts to parse JSON string (or markdown json block) into CanonicalTicketFields.
 */
export function tryParseJsonTicket(text: string): CanonicalTicketFields | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.includes('```json') && !trimmed.includes('```')) {
    return null;
  }

  try {
    let cleanJson = trimmed;
    const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (blockMatch) {
      cleanJson = blockMatch[1].trim();
    } else {
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object') {
      const normalized = normalizeTicketFields(parsed);
      return normalized.canonical || null;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Extracts ONLY the 8 required ticket details from extracted text (JSON or plain OCR).
 */
export function captureTicketDetailsFromText(rawText: string): CapturedTicketDetails {
  if (!rawText || !rawText.trim()) return {};

  // First, check if input is structured JSON
  const jsonResult = tryParseJsonTicket(rawText);
  if (jsonResult) {
    return {
      candidateName: jsonResult.candidateName,
      cetNo: jsonResult.cetApplicationNumber,
      capId: jsonResult.capApplicationNumber,
      dob: jsonResult.dob,
      mobile: jsonResult.mobileNumber,
      email: jsonResult.emailId,
      course: jsonResult.courseName,
      query: jsonResult.queryGrievanceDetails,
      confidence: jsonResult.confidence,
      needsReview: jsonResult.needsReview,
      canonical: jsonResult,
    };
  }

  const details: CapturedTicketDetails = {};
  const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanedText.split('\n').map((l) => l.trim()).filter(Boolean);

  // ---------------------------------------------------------------------------
  // STEP 1: LINE-BY-LINE STRUCTURED KEY-VALUE EXTRACTION
  // Matches exact 8 fields from form lines (with or without numbers like 1., 2.)
  // ---------------------------------------------------------------------------
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip leading list numbers/bullets/markdown but preserve underscores inside emails
    const strippedLine = line
      .replace(/^[\s\d.)\-*•#[\]|]+/, '')
      .replace(/(?<!\w)[*`]|[*`](?!\w)/g, '')
      .trim();

    // Helper: extracts value after label on same line or from next line
    const extractLineVal = (labelRegex: RegExp): string => {
      let match = strippedLine.match(labelRegex);
      if (match && match[1] !== undefined && match[1].trim()) {
        return match[1].trim();
      }
      match = line.match(labelRegex);
      if (match && match[1] !== undefined && match[1].trim()) {
        return match[1].trim();
      }
      const cleanOnlyLabel = strippedLine.replace(/[\s:.\-#\t—=|]+$/, '');
      if (
        (labelRegex.test(strippedLine) || labelRegex.test(line) || labelRegex.test(cleanOnlyLabel + ':')) &&
        i + 1 < lines.length
      ) {
        const next = lines[i + 1].trim();
        if (
          !/^(?:\d+[.)\-]|[*•#]+|candidate|name|mobile|phone|email|dob|date|cet|cap|course|query|grievance|ticket|application)/i.test(
            next
          )
        ) {
          return next;
        }
      }
      return '';
    };

    // 1. Candidate Name (As in CET)
    if (!details.candidateName) {
      const nameVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Candidate(?:\s*['’]s)?(?:\s*Full)?\s*Name(?:\s*\(As in CET\))?|Name\s*of\s*(?:the\s*)?(?:Candidate|Applicant|Student)|Student(?:\s*['’]s)?(?:\s*Full)?\s*Name|Applicant(?:\s*['’]s)?(?:\s*Full)?\s*Name|Full\s*Name(?:\s*of\s*(?:Candidate|Applicant|Student))?|उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव|अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव|विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव))(?:\s*\([^)]*\))?[\s:.\-#\t—=|]+(.*)$/i
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
          details.dob = norm || dobVal.trim();
        } else {
          details.dob = dobVal.trim();
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
        } else if (mobVal.trim()) {
          details.mobile = mobVal.trim();
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
        if (m) {
          details.email = m[1].toLowerCase().trim();
        } else if (emailVal.trim()) {
          details.email = emailVal.trim();
        }
      }
    }

    // 8. Course Name
    if (!details.course) {
      const courseVal = extractLineVal(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Course\s*(?:Name|Applied)?|Applied\s*Course|Branch|Programme|अभ्यासक्रमाचे\s*नाव(?:\s*(?:\/|\&)\s*Course)?|अभ्यासक्रम(?:\s*(?:\/|\&)\s*Course)?))[\s:.\-#\t—=|]+(.*)$/i
      );
      if (courseVal) {
        const cleanVal = courseVal.replace(/^[*_`|]+|[*_`|]+$/g, '').trim();
        if (!/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|-+)$/i.test(cleanVal)) {
          const matched = matchCourseName(cleanVal);
          details.course = matched || cleanVal;
        }
      }
    }

    // 9. Query / Grievance Details (gathers complete multi-line handwritten complaint)
    if (!details.query) {
      const queryHeaderMatch = strippedLine.match(
        /^(?:(?:\d+[.)\-]*)?\s*(?:Query\s*(?:\/|\&|and)?\s*Grievance(?:\s*Details)?|Query\s*Details|Query|Grievance(?:\s*Details)?|Issue(?:\s*Details)?|Problem|Complaint|Subject|Reason|Remarks?|तक्रार\s*(?:\/|\&)?\s*(?:अडचण|समस्या)?(?:\s*(?:तपशील|सविस्तर|वर्णन))?|समस्या\s*(?:तपशील|सविस्तर)?|अडचण\s*(?:तपशील|सविस्तर)?|तक्रार|विषय))[\s:.\-#\t—=|\/]*(.*)$/i
      );
      if (queryHeaderMatch) {
        const queryLines: string[] = [];
        if (queryHeaderMatch[1] && queryHeaderMatch[1].trim()) {
          queryLines.push(queryHeaderMatch[1].trim());
        }
        for (let j = i + 1; j < lines.length; j++) {
          const l = lines[j].trim();
          if (/^(?:Candidate\s*Signature|Signature|Sign|Date\s*:|Place\s*:|Thanking|Yours|Ticket\s*No)/i.test(l)) {
            break;
          }
          if (/^(?:\d+[.)\-]|[*•#]+|candidate|name|mobile|phone|email|dob|date of birth|cet|cap|course)/i.test(l)) {
            break;
          }
          if (l) queryLines.push(l);
        }
        if (queryLines.length > 0) {
          let fullQ = queryLines.join(' ');
          fullQ = fullQ.replace(/(?:^|\n|\s*)(?:Ticket\s*(?:No|Number)|Token\s*No)[\s:.\-#\t—=]+[A-Za-z0-9\-_/]+/gi, '').trim();
          if (!/^(none|na|n\/a|not\s*found|not\s*available|null|undefined|nil|-+)$/i.test(fullQ)) {
            details.query = fullQ;
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 2: GLOBAL REGEX SEARCH FOR UNRESOLVED FIELDS
  // ---------------------------------------------------------------------------

  // 1. Candidate Name (if not resolved)
  if (!details.candidateName) {
    const nameGlobalPatterns = [
      /(?:Candidate(?:\s*['’]s)?(?:\s*Full)?\s*Name(?:\s*\(As in CET\))?|Name\s*of\s*(?:the\s*)?(?:Candidate|Applicant|Student)|Student(?:\s*['’]s)?(?:\s*Full)?\s*Name|Applicant(?:\s*['’]s)?(?:\s*Full)?\s*Name|Full\s*Name(?:\s*of\s*(?:Candidate|Applicant|Student))?|उमेदवाराचे\s*(?:संपूर्ण\s*)?नाव|अर्जदाराचे\s*(?:संपूर्ण\s*)?नाव|विद्यार्थ्याचे\s*(?:संपूर्ण\s*)?नाव)(?:\s*\([^)]*\))?[\s:.\-#\t—=|]+([^\n\r|]{2,80})/i,
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
        details.dob = norm || m[1].trim();
        break;
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
            /\s*(?:Thanking\s*you|Yours\s*faithfully|Yours\s*sincerely|Date\s*:|Place\s*:|Signature\s*:|Ticket\s*No:).*$/i,
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

  // Generate canonical validation
  const normalized = normalizeTicketFields(details, rawText);
  return normalized;
}

/**
 * Formats the 8 extracted ticket fields cleanly for the text editor
 */
export function formatTicketFieldsText(details: CapturedTicketDetails, originalOcrText?: string): string {
  const lines: string[] = [
    `Candidate Name: ${details.candidateName || ''}`,
    `CET Application Number: ${details.cetNo || ''}`,
    `CAP Application Number: ${details.capId || ''}`,
    `Date of Birth (DOB): ${details.dob || ''}`,
    `Mobile Number: ${details.mobile || ''}`,
    `Email ID: ${details.email || ''}`,
    `Course Name: ${details.course || ''}`,
    `Query / Grievance Details: ${details.query || ''}`,
  ];

  return lines.join('\n');
}
