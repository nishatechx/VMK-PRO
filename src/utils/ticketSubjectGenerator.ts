/**
 * Automatic Ticket Subject Generator based on the nature of candidate queries
 * Designed specifically for Maharashtra State CET Cell & CAP Admission Facilitation Desks.
 */

interface SubjectRule {
  patterns: (string | RegExp)[];
  subject: string;
}

const SUBJECT_RULES: SubjectRule[] = [
  // 1. Caste Validity & Verification
  {
    patterns: [
      /caste\s*validity/i,
      /validity\s*certificate/i,
      /scrutiny\s*committee/i,
      /validity\s*pending/i,
      /validity\s*receipt/i,
      /tribe\s*validity/i,
      /जात\s*वैधता/i,
      /वैधता\s*प्रमाणपत्र/i,
      /प्रमाणपत्र\s*पडताळणी/i,
    ],
    subject: 'Caste / Tribe Validity Certificate Verification Issue',
  },
  // 2. Non-Creamy Layer (NCL)
  {
    patterns: [
      /non[-\s]*creamy\s*layer/i,
      /\bncl\b/i,
      /नॉन\s*क्रिमीलेअर/i,
      /ncl\s*certificate/i,
      /creamy\s*layer/i,
    ],
    subject: 'Non-Creamy Layer (NCL) Certificate Grievance',
  },
  // 3. EWS Eligibility Certificate
  {
    patterns: [
      /\bews\b/i,
      /economically\s*weaker/i,
      /ईडब्ल्यूएस/i,
      /इ\.?डब्ल्यू\.?एस/i,
      /ews\s*certificate/i,
      /ews\s*eligibility/i,
    ],
    subject: 'EWS Eligibility Certificate Grievance',
  },
  // 4. Caste Certificate
  {
    patterns: [
      /caste\s*certificate/i,
      /जात\s*प्रमाणपत्र/i,
      /caste\s*category/i,
      /category\s*document/i,
    ],
    subject: 'Caste Certificate Verification Discrepancy',
  },
  // 5. Income Certificate
  {
    patterns: [
      /income\s*certificate/i,
      /उत्पन्न\s*दाखला/i,
      /वार्षिक\s*उत्पन्न/i,
      /tahsildar\s*income/i,
      /income\s*proof/i,
    ],
    subject: 'Income Certificate Verification Issue',
  },
  // 6. Domicile & Nationality
  {
    patterns: [
      /\bdomicile\b/i,
      /\bnationality\b/i,
      /रहिवासी/i,
      /राष्ट्रीयत्व/i,
      /leaving\s*certificate/i,
      /\blc\b/i,
      /birth\s*certificate/i,
      /जन्म\s*दाखला/i,
    ],
    subject: 'Domicile / Nationality Document Verification',
  },
  // 7. Academic Marksheets & Marks Discrepancy
  {
    patterns: [
      /hsc\s*marksheet/i,
      /ssc\s*marksheet/i,
      /12th\s*marks/i,
      /10th\s*marks/i,
      /marksheet/i,
      /गुणपत्रिका/i,
      /aggregate\s*marks/i,
      /\bpcm\b/i,
      /\bpcb\b/i,
      /percentage\s*mismatch/i,
      /marks\s*discrepancy/i,
      /marks\s*correction/i,
    ],
    subject: 'Academic Marksheet / Score Discrepancy',
  },
  // 8. Entrance Exam Score Card & Percentile
  {
    patterns: [
      /cet\s*score/i,
      /percentile/i,
      /jee\s*score/i,
      /neet\s*score/i,
      /score\s*card/i,
      /merit\s*rank/i,
      /rank\s*discrepancy/i,
    ],
    subject: 'CET / Entrance Exam Score Card Discrepancy',
  },
  // 9. Name Spelling Correction
  {
    patterns: [
      /name\s*spelling/i,
      /spelling\s*mistake/i,
      /name\s*mismatch/i,
      /father\s*name/i,
      /mother\s*name/i,
      /surname/i,
      /नाव\s*बदल/i,
      /नाव\s*दुरुस्ती/i,
      /spelling\s*error/i,
      /name\s*correction/i,
    ],
    subject: 'Candidate Name Spelling Correction in Application Form',
  },
  // 10. Date of Birth (DOB) Correction
  {
    patterns: [
      /date\s*of\s*birth/i,
      /\bdob\b/i,
      /birth\s*date/i,
      /जन्मतारीख/i,
      /dob\s*correction/i,
      /dob\s*mismatch/i,
    ],
    subject: 'Date of Birth (DOB) Correction Request',
  },
  // 11. Category Change Request
  {
    patterns: [
      /category\s*change/i,
      /change\s*category/i,
      /open\s*to\s*obc/i,
      /obc\s*to\s*open/i,
      /open\s*to\s*ews/i,
      /sc\s*to\s*open/i,
      /प्रवर्ग\s*बदल/i,
      /category\s*conversion/i,
    ],
    subject: 'Candidate Category Change Request',
  },
  // 12. Mobile / Email / OTP & Login Issue
  {
    patterns: [
      /\botp\b/i,
      /mobile\s*number\s*change/i,
      /wrong\s*mobile/i,
      /email\s*change/i,
      /reset\s*password/i,
      /forgot\s*password/i,
      /portal\s*login/i,
      /can'?t\s*login/i,
      /cannot\s*login/i,
      /लॉगिन/i,
      /पासवर्ड/i,
      /ओटीपी/i,
      /भ्रमणध्वनी/i,
    ],
    subject: 'Mobile Number / Email / OTP & Portal Login Issue',
  },
  // 13. Photo / Signature Upload
  {
    patterns: [
      /photo\s*upload/i,
      /signature\s*upload/i,
      /photo\s*unclear/i,
      /signature\s*blurred/i,
      /फोटो/i,
      /स्वाक्षरी/i,
      /sign\s*mismatch/i,
    ],
    subject: 'Photo / Signature Upload Discrepancy',
  },
  // 14. E-Scrutiny Objection & Document Pending
  {
    patterns: [
      /e-scrutiny\s*objection/i,
      /scrutiny\s*objection/i,
      /\bobjection\b/i,
      /आक्षेप/i,
      /document\s*pending/i,
      /document\s*rejected/i,
      /re-upload/i,
      /पुन्हा\s*अपलोड/i,
      /discrepancy\s*raised/i,
      /physical\s*scrutiny/i,
    ],
    subject: 'E-Scrutiny Document Objection Resolution',
  },
  // 15. CAP Option Form & Preferences
  {
    patterns: [
      /option\s*form/i,
      /choice\s*code/i,
      /college\s*preference/i,
      /college\s*option/i,
      /विकल्प\s*अर्ज/i,
      /पसंतीक्रम/i,
      /unlock\s*option\s*form/i,
      /option\s*form\s*confirm/i,
    ],
    subject: 'CAP Option Form / College Preference Query',
  },
  // 16. Seat Allotment (Freeze / Float / Betterment)
  {
    patterns: [
      /\bfreeze\b/i,
      /\bfloat\b/i,
      /allotment\s*letter/i,
      /seat\s*allotment/i,
      /betterment/i,
      /जागा\s*वाटप/i,
      /seat\s*acceptance/i,
      /seat\s*confirmation/i,
    ],
    subject: 'CAP Seat Allotment (Freeze / Float / Betterment) Query',
  },
  // 17. Fee Payment & Transaction Failure
  {
    patterns: [
      /payment\s*failed/i,
      /fee\s*payment/i,
      /transaction\s*failure/i,
      /money\s*deducted/i,
      /double\s*payment/i,
      /शुल्क\s*भरणा/i,
      /payment\s*receipt/i,
      /fee\s*refund/i,
    ],
    subject: 'Admission / Seat Acceptance Fee Payment Issue',
  },
  // 18. Admission Cancellation & Seat Surrender
  {
    patterns: [
      /cancel\s*admission/i,
      /admission\s*cancellation/i,
      /surrender\s*seat/i,
      /seat\s*surrender/i,
      /प्रवेश\s*रद्द/i,
      /जागा\s*त्याग/i,
      /withdraw\s*admission/i,
    ],
    subject: 'CAP Admission Cancellation & Seat Surrender',
  },
  // 19. Special Quotas (TFWS, Defence, PwD, Orphan, Minority)
  {
    patterns: [
      /\btfws\b/i,
      /\bdefence\b/i,
      /\bpwd\b/i,
      /\bhandicap\b/i,
      /\borphan\b/i,
      /\bminority\b/i,
      /अल्पसंख्याक/i,
      /दिव्यांग/i,
      /अनाथ/i,
    ],
    subject: 'Special Quota (TFWS / PwD / Minority / Defence) Eligibility',
  },
  // 20. Hall Ticket / Admit Card Issues
  {
    patterns: [
      /hall\s*ticket/i,
      /admit\s*card/i,
      /admit\s*letter/i,
      /हॉल\s*तिकीट/i,
      /प्रवेशपत्र/i,
      /roll\s*number/i,
    ],
    subject: 'CET Hall Ticket / Admit Card Grievance',
  },
  // 21. Institute Reporting & Document Retention Grievance
  {
    patterns: [
      /institute\s*reporting/i,
      /college\s*reporting/i,
      /original\s*documents\s*retention/i,
      /document\s*return/i,
      /महाविद्यालय\s*हजेरी/i,
      /reporting\s*center/i,
    ],
    subject: 'Institute Reporting & Document Verification Grievance',
  },
  // 22. Scrutiny Center (FC / SC) Change Request
  {
    patterns: [
      /change\s*fc/i,
      /change\s*sc/i,
      /scrutiny\s*center\s*change/i,
      /physical\s*to\s*e-scrutiny/i,
      /e-scrutiny\s*to\s*physical/i,
      /सुविधा\s*केंद्र/i,
    ],
    subject: 'Scrutiny Facilitation Center (FC/SC) Change Request',
  },
  // 23. New Registration & Profile Verification
  {
    patterns: [
      /new\s*registration/i,
      /registration\s*failed/i,
      /unable\s*to\s*register/i,
      /नवीन\s*नोंदणी/i,
      /application\s*confirmation/i,
    ],
    subject: 'Candidate New Registration & Application Confirmation',
  },
];

/**
 * Derives a crisp, formal subject automatically from the nature of the query.
 * Falls back to an intelligent clause summary if no direct predefined rule matches.
 */
export function deriveTicketSubject(rawQuery: string, courseName?: string): string {
  const query = (rawQuery || '').trim();
  if (!query) {
    return 'Candidate Grievance & Scrutiny Query';
  }

  // 1. Check against predefined high-precision rules
  for (const rule of SUBJECT_RULES) {
    for (const pattern of rule.patterns) {
      if (typeof pattern === 'string') {
        if (query.toLowerCase().includes(pattern.toLowerCase())) {
          return rule.subject;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(query)) {
          return rule.subject;
        }
      }
    }
  }

  // 2. Intelligent NLP fallback: Extract clean subject phrase from query
  const cleanText = query
    .replace(/^(the\s+candidate\s+(states|says|requested|wants|reported|has|is)|candidate\s+(states|says|wants|has)|i\s+(want|need|have|am)|please|kindly|sir|madam)\s+/i, '')
    .trim();

  // Look for introductory clause
  const firstSentence = cleanText.split(/[.\n;?]/)[0].trim();
  if (firstSentence && firstSentence.length >= 8 && firstSentence.length <= 65) {
    // Capitalize first letter and format cleanly
    const formatted = firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    return formatted.replace(/[.,;:]$/, '');
  }

  // If query is longer, construct a meaningful topic
  if (cleanText.length > 65) {
    const words = cleanText.split(/\s+/).slice(0, 8).join(' ');
    const formatted = words.charAt(0).toUpperCase() + words.slice(1);
    return `${formatted.replace(/[.,;:]$/, '')}...`;
  }

  if (courseName && courseName.trim()) {
    return `${courseName.trim()} Admission Scrutiny Query`;
  }

  return 'Candidate Scrutiny & Admission Query';
}
