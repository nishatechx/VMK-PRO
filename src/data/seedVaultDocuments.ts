import { QrUploadedFile } from '../types/qrUpload';

// Helper to generate realistic scanned government document SVG Data URLs
function generateScannedDocSvg(
  title: string,
  docType: string,
  docNumber: string,
  isVerified: boolean,
  accentColor: string
): string {
  const verifiedStampSvg = isVerified
    ? `
      <g transform="translate(320, 480) rotate(-12)">
        <rect x="0" y="0" width="180" height="70" rx="8" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6,3" />
        <text x="90" y="28" font-family="sans-serif" font-size="11" font-weight="bold" fill="#16a34a" text-anchor="middle">VERIFIED & SCRUTINIZED</text>
        <text x="90" y="44" font-family="sans-serif" font-size="10" font-weight="bold" fill="#15803d" text-anchor="middle">STATE CET CELL WASHIM</text>
        <text x="90" y="58" font-family="sans-serif" font-size="8" fill="#166534" text-anchor="middle">NODAL OFFICER DESK #01</text>
      </g>
    `
    : '';

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCFDFF" />
          <stop offset="100%" stop-color="#F2F5F9" />
        </linearGradient>
        <filter id="subtleShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1" />
        </filter>
      </defs>

      <!-- Background Paper -->
      <rect width="600" height="800" fill="url(#paperGrad)" />
      
      <!-- Subtle Paper Border & Grid -->
      <rect x="25" y="25" width="550" height="750" rx="10" fill="#FFFFFF" stroke="#D1D9E2" stroke-width="2" filter="url(#subtleShadow)" />
      <rect x="35" y="35" width="530" height="730" rx="6" fill="none" stroke="#E2E8F0" stroke-width="1" />

      <!-- Official Header -->
      <rect x="35" y="35" width="530" height="85" rx="6" fill="${accentColor}" />
      <circle cx="75" cy="78" r="26" fill="#FFFFFF" opacity="0.15" />
      <path d="M 68 70 L 75 62 L 82 70 L 78 70 L 78 86 L 72 86 L 72 70 Z" fill="#FFFFFF" />
      
      <text x="115" y="65" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" letter-spacing="1">GOVERNMENT OF MAHARASHTRA</text>
      <text x="115" y="82" font-family="sans-serif" font-size="16" font-weight="900" fill="#FFFFFF" letter-spacing="1.5">STATE COMMON ENTRANCE TEST CELL</text>
      <text x="115" y="98" font-family="sans-serif" font-size="10" font-weight="bold" fill="#E0F2FE">ADMISSION REGULATORY AUTHORITY • SCRUTINY DIVISION</text>

      <!-- Document Barcode & Serial -->
      <rect x="400" y="135" width="150" height="28" fill="#F8FAFC" stroke="#CBD5E1" rx="4" />
      <text x="475" y="153" font-family="monospace" font-size="10" font-weight="bold" fill="#334155" text-anchor="middle">${docNumber}</text>

      <!-- Document Title -->
      <text x="50" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0F172A">${title}</text>
      <text x="50" y="173" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">${docType}</text>
      <line x1="50" y1="185" x2="550" y2="185" stroke="#E2E8F0" stroke-width="1.5" />

      <!-- Candidate Profile Mock Details -->
      <rect x="440" y="200" width="100" height="120" rx="6" fill="#F1F5F9" stroke="#CBD5E1" stroke-dasharray="3,3" />
      <circle cx="490" cy="245" r="22" fill="#94A3B8" />
      <path d="M 462 295 C 462 275, 518 275, 518 295 Z" fill="#94A3B8" />
      <text x="490" y="312" font-family="sans-serif" font-size="8" fill="#64748B" text-anchor="middle">PHOTO VERIFIED</text>

      <!-- Left Data Fields -->
      <g transform="translate(50, 205)" font-family="sans-serif">
        <text x="0" y="15" font-size="10" font-weight="bold" fill="#64748B">CANDIDATE NAME:</text>
        <text x="0" y="30" font-size="13" font-weight="bold" fill="#1E293B">PATIL SNEHAL ANIL</text>

        <text x="0" y="60" font-size="10" font-weight="bold" fill="#64748B">APPLICATION ID:</text>
        <text x="0" y="75" font-size="12" font-family="monospace" font-weight="bold" fill="#0369A1">EN26108492</text>

        <text x="0" y="105" font-size="10" font-weight="bold" fill="#64748B">CET ROLL NUMBER:</text>
        <text x="0" y="120" font-size="12" font-family="monospace" font-weight="bold" fill="#0369A1">2604819401</text>
      </g>

      <!-- Verification Grid / Table -->
      <rect x="50" y="340" width="500" height="180" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
      <line x1="50" y1="375" x2="550" y2="375" stroke="#CBD5E1" stroke-width="1.5" />
      
      <text x="65" y="362" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">SR.</text>
      <text x="110" y="362" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">DOCUMENT / CERTIFICATE NAME</text>
      <text x="380" y="362" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">STATUS</text>
      <text x="470" y="362" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">SCORE / REMARK</text>

      <g font-family="sans-serif" font-size="11" fill="#475569">
        <text x="65" y="405">1</text>
        <text x="110" y="405">MHT-CET 2026 Score Card</text>
        <text x="380" y="405" font-weight="bold" fill="#16A34A">SUBMITTED</text>
        <text x="470" y="405" font-weight="bold">98.42%ile</text>

        <line x1="50" y1="420" x2="550" y2="420" stroke="#E2E8F0" />

        <text x="65" y="445">2</text>
        <text x="110" y="445">HSC Marks Sheet (Science)</text>
        <text x="380" y="445" font-weight="bold" fill="#16A34A">VERIFIED</text>
        <text x="470" y="445" font-weight="bold">88.50%</text>

        <line x1="50" y1="460" x2="550" y2="460" stroke="#E2E8F0" />

        <text x="65" y="485">3</text>
        <text x="110" y="485">Domicile & Nationality Certificate</text>
        <text x="380" y="485" font-weight="bold" fill="#16A34A">VALID</text>
        <text x="470" y="485">Approved</text>
      </g>

      ${verifiedStampSvg}

      <!-- Bottom Signature & Seal -->
      <line x1="50" y1="670" x2="550" y2="670" stroke="#CBD5E1" stroke-dasharray="4,4" />
      <text x="70" y="700" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B">DIGITALLY GENERATED DOCUMENT</text>
      <text x="70" y="715" font-family="sans-serif" font-size="9" fill="#94A3B8">State CET Cell Admission Portal • Washim District</text>
      
      <g transform="translate(420, 680)">
        <path d="M 10 25 Q 35 5, 55 20 T 95 15" stroke="#1E40AF" stroke-width="2" fill="none" />
        <text x="45" y="40" font-family="sans-serif" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">FACILITATION OFFICER</text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

// Generate matching initial documents matching the user's screenshot
export function getDefaultVaultFiles(): QrUploadedFile[] {
  return [
    {
      id: 'doc-vault-1',
      sessionId: 'VMK-102132',
      name: '1788927768234659531431608387890.jpg',
      type: 'image/jpeg',
      size: 2705326, // 2.58 MB
      uploadedAt: '2026-09-09T09:53:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: true,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'HSC Statement of Marks & Certificate',
        'Maharashtra State Board Examination 2026',
        'MH-HSC-2026-849201',
        true,
        '#0056A6'
      ),
    },
    {
      id: 'doc-vault-2',
      sessionId: 'VMK-102132',
      name: 'IMG-20260623-WA0001.jpg',
      type: 'image/jpeg',
      size: 134175, // 131.03 KB
      uploadedAt: '2026-09-08T23:05:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'Domicile & Nationality Certificate',
        'Tehsil Office Washim • Govt of Maharashtra',
        'DOM-WA-2026-10492',
        false,
        '#0284C7'
      ),
    },
    {
      id: 'doc-vault-3',
      sessionId: 'VMK-102132',
      name: '17888584200748435069968002489884.jpg',
      type: 'image/jpeg',
      size: 2055208, // 1.96 MB
      uploadedAt: '2026-09-08T14:37:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'MHT-CET 2026 Score Card (PCM Group)',
        'State Common Entrance Test Cell, Maharashtra State',
        'CET-26-PCM-984210',
        false,
        '#003B73'
      ),
    },
    {
      id: 'doc-vault-4',
      sessionId: 'VMK-102132',
      name: 'IMG-20260908-WA0015.jpg',
      type: 'image/jpeg',
      size: 225853, // 220.56 KB
      uploadedAt: '2026-09-08T12:35:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: true,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'Caste Validity / Scrutiny Certificate',
        'Divisional Caste Certificate Scrutiny Committee',
        'CST-VAL-2026-5592',
        true,
        '#0D9488'
      ),
    },
    {
      id: 'doc-vault-5',
      sessionId: 'VMK-102132',
      name: 'Document_5.jpg',
      type: 'image/jpeg',
      size: 510167, // 498.21 KB
      uploadedAt: '2026-09-07T16:12:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'Income Certificate (Financial Year 2025-26)',
        'Revenue Department, Washim District',
        'INC-2026-88402',
        false,
        '#4F46E5'
      ),
    },
    {
      id: 'doc-vault-6',
      sessionId: 'VMK-102132',
      name: 'Document_6.pdf',
      type: 'application/pdf',
      size: 1174405, // 1.12 MB
      uploadedAt: '2026-09-07T10:20:00.000Z',
      isDownloadedToSoftware: true,
      verifiedStamp: false,
      category: 'Candidate Document',
      uploadedBy: 'dno',
      uploaderName: 'Mr. Shrinath Ghodake (DNO)',
      uploaderRole: 'dno',
      district: 'Washim',
      dataUrl: generateScannedDocSvg(
        'CAP Centralized Admission Registration Form',
        'First Year B.E./B.Tech Admissions 2026-2027',
        'CAP-APP-2026-EN26108492',
        false,
        '#BE123C'
      ),
    },
  ];
}
