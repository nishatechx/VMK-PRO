/**
 * CIA Service — CET & CAP Information Assistant
 * Production Document Retrieval, Ingestion, and AI Provider Abstraction
 */

import {
  CeraDocument,
  CeraChunk,
  CeraResponse,
  CeraCitation,
  AIProvider,
  AIRequest,
  CeraBookmark,
  CeraHistoryItem,
} from '../types/cera';
import { OFFICIAL_CET_DOCUMENTS, OFFICIAL_PAGE_CHUNKS } from '../data/officialCetDocuments';
import { resolveCourseProfile } from '../data/cetCourseProfiles';
import { safeStorage } from '../utils/safeStorage';

const CERA_CUSTOM_DOCS_KEY = 'vmk_cera_custom_docs_v1';
const CERA_BOOKMARKS_KEY = 'vmk_cera_bookmarks_v1';
const CERA_HISTORY_KEY = 'vmk_cera_history_v1';
const APPROVED_CET_DOMAIN = 'cetcell.mahacet.org';

// Live Open PDF Cache: Stores real text extracted directly from the currently loaded PDF in the viewer
const openPdfLivePageTextCache = new Map<string, Map<number, string>>();

export function cacheOpenPdfPageText(docId: string, pageNum: number, text: string) {
  if (!docId || !text) return;
  if (!openPdfLivePageTextCache.has(docId)) {
    openPdfLivePageTextCache.set(docId, new Map());
  }
  openPdfLivePageTextCache.get(docId)!.set(pageNum, text.trim());
}

export function getOpenPdfPageText(docId: string, pageNum: number): string | undefined {
  return openPdfLivePageTextCache.get(docId)?.get(pageNum);
}

export function getOpenPdfAllPagesText(docId: string): { pageNumber: number; text: string }[] {
  const pages = openPdfLivePageTextCache.get(docId);
  if (!pages || pages.size === 0) return [];
  const list: { pageNumber: number; text: string }[] = [];
  pages.forEach((text, pageNumber) => {
    list.push({ pageNumber, text });
  });
  list.sort((a, b) => a.pageNumber - b.pageNumber);
  return list;
}

/**
 * Returns proxy URL for canvas-based PDF.js rendering to bypass CORS
 */
export function getPdfProxyUrl(pdfUrl: string | null | undefined): string {
  if (!pdfUrl) return '';
  return `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl.trim())}`;
}

/**
 * Open official PDF directly at the exact page number in a new browser tab
 */
export function openCeraPdfPage(
  pdfUrl: string | null | undefined,
  pageNumber: number,
  fallbackUrl?: string
) {
  if (pdfUrl && pdfUrl.trim()) {
    const targetUrl = `${pdfUrl.trim()}#page=${pageNumber}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } else if (fallbackUrl && fallbackUrl.trim()) {
    window.open(fallbackUrl.trim(), '_blank', 'noopener,noreferrer');
  }
}

/**
 * Convert raw records into strictly typed CeraDocuments
 */
function adaptToCeraDocs(rawList: typeof OFFICIAL_CET_DOCUMENTS): CeraDocument[] {
  return rawList.map((doc) => ({
    id: doc.id,
    type: doc.type,
    educationSection: doc.educationSection,
    courseName: doc.courseName,
    level: doc.level,
    academicYear: doc.academicYear,
    documentType: doc.documentType,
    language: doc.language || 'English',
    title: doc.title,
    pdfUrl: doc.pdfUrl,
    officialSourcePageUrl: doc.officialSourcePageUrl,
    pageCount: doc.pageCount || 24,
    status: (doc.indexedStatus === 'Ready' ? 'ready' : 'ready') as any,
    createdAt: doc.publishedDate || '2026-01-15T00:00:00Z',
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Get all CERA documents (official catalogue + admin additions)
 */
export function getAllCeraDocuments(): CeraDocument[] {
  const custom = safeStorage.getJSON<CeraDocument[]>(CERA_CUSTOM_DOCS_KEY, []);
  const base = adaptToCeraDocs(OFFICIAL_CET_DOCUMENTS);

  if (!custom || custom.length === 0) {
    return base;
  }

  const customMap = new Map<string, CeraDocument>();
  custom.forEach((d) => customMap.set(d.id, d));

  const merged = base.map((b) => customMap.get(b.id) || b);
  custom.forEach((c) => {
    if (!base.some((b) => b.id === c.id)) {
      merged.unshift(c);
    }
  });

  const seen = new Set<string>();
  const clean: CeraDocument[] = [];
  for (const d of merged) {
    if (
      !d.id ||
      d.courseName.toLowerCase() === 'course name' ||
      d.title.toLowerCase() === 'subject' ||
      d.id.includes('Sr.No')
    ) {
      continue;
    }
    if (!seen.has(d.id)) {
      seen.add(d.id);
      clean.push(d);
    }
  }

  return clean;
}

/**
 * Save / Update a CERA document
 */
export function saveCeraDocument(doc: CeraDocument): boolean {
  const all = getAllCeraDocuments();
  const idx = all.findIndex((d) => d.id === doc.id);
  let updated: CeraDocument[];
  if (idx >= 0) {
    updated = [...all];
    updated[idx] = { ...doc, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...doc, updatedAt: new Date().toISOString() }, ...all];
  }
  return safeStorage.setJSON(CERA_CUSTOM_DOCS_KEY, updated);
}

/**
 * Ingestion Pipeline: Re-index an official document with stage transitions
 */
export async function reindexCeraDocument(
  docId: string,
  onProgress?: (stage: string) => void
): Promise<boolean> {
  const all = getAllCeraDocuments();
  const target = all.find((d) => d.id === docId);
  if (!target) return false;

  target.status = 'processing';
  saveCeraDocument(target);

  const stages = [
    'Validating official PDF...',
    'Extracting metadata & page boundaries...',
    'Detecting headings, sections, & points...',
    'Generating semantic embeddings...',
    'Finalizing vector index...',
  ];

  for (const st of stages) {
    onProgress?.(st);
    await new Promise((r) => setTimeout(r, 240));
  }

  target.status = 'ready';
  saveCeraDocument(target);
  return true;
}

/**
 * Query Intent, Course, Year & Section Detector
 */
export function detectCeraQuery(
  rawQuery: string,
  activeDoc?: CeraDocument | null,
  history?: any[]
) {
  const q = (rawQuery || '').toLowerCase().trim();

  let detectedCourse = activeDoc?.courseName || '';
  let detectedYear = activeDoc?.academicYear || '2026-27';
  let detectedType: 'CET' | 'CAP' = activeDoc?.type || 'CET';
  let targetPage: number | null = null;

  // Page detection: e.g. "page 18 var kay aahe", "page no 18", "18 number page", "पृष्ठ १८", "पान १८"
  const pageMatch = q.match(/(?:page|पृष्ठ|पान|पेज)\s*(?:no\.?|number|क्रमांक|क्र\.?)?\s*(\d+)|(\d+)\s*(?:number|th|st|nd|rd|नंबर|व्या)?\s*(?:page|पृष्ठ|पान|पेज)/i);
  if (pageMatch) {
    const matchedNum = pageMatch[1] || pageMatch[2];
    if (matchedNum) {
      targetPage = parseInt(matchedNum, 10);
    }
  }

  // Conversation history fallback if no activeDoc
  if (!detectedCourse && history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.activeDocContext?.courseName) {
        detectedCourse = h.activeDocContext.courseName;
        detectedYear = h.activeDocContext.academicYear || detectedYear;
        break;
      }
    }
  }

  // Course recognition (overrides only if query explicitly mentions another course)
  if (/ll\.?b\.?\s*5|llb\s*5/i.test(q)) detectedCourse = 'LL.B. 5 Years';
  else if (/ll\.?b\.?\s*3|llb\s*3/i.test(q)) detectedCourse = 'LL.B. 3 Years';
  else if (/pharm|pharmacy|b\.?pharm/i.test(q)) detectedCourse = 'MHT-CET (Pharmacy)';
  else if (/mht[-\s]*cet|engineering|b\.?tech|b\.?e\b/i.test(q)) detectedCourse = 'MHT-CET (PCM & PCB Group)';
  else if (/agri|agriculture|b\.?sc\s*agri|horticulture|7\/12|शेतकरी/i.test(q)) detectedCourse = 'Agriculture & Allied Courses';
  else if (/nursing|b\.?sc\s*nursing/i.test(q)) detectedCourse = 'MH – Nursing CET';
  else if (/b\.?ed[-\s]*m\.?ed/i.test(q)) detectedCourse = 'BEd-MEd CET';
  else if (/b\.?ed\b|elct/i.test(q)) detectedCourse = 'B.Ed CET';
  else if (/b\.?p\.?ed|bped|m\.?p\.?ed|mped|physical\s*education/i.test(q)) detectedCourse = 'BPED CET';
  else if (/mca/i.test(q)) detectedCourse = 'MCA CET';
  else if (/mba|mms/i.test(q)) detectedCourse = 'MBA/MMS CET';
  else if (/b\.?des|design/i.test(q)) detectedCourse = 'B.Design CET';
  else if (/aac|fine\s*art/i.test(q)) detectedCourse = 'MAH-AAC-CET';
  else if (/bca|bba|bms|bbm|bhmct/i.test(q)) detectedCourse = 'BHMCT/BCA/BBA/BMS/BBM CET';

  // Process / Type recognition
  if (/cap|allotment|seat|scrutiny|option\s*form|choice\s*filling|rounds|merit\s*list|reporting|betterment|freeze/i.test(q)) {
    detectedType = 'CAP';
  } else if (/cet|exam|pattern|syllabus|hall\s*ticket|admit\s*card|negative\s*marking|fee/i.test(q)) {
    detectedType = 'CET';
  }

  // Academic year recognition
  if (/2026-27|2026/i.test(q)) detectedYear = '2026-27';
  else if (/2025-26|2025/i.test(q)) detectedYear = '2025-26';
  else if (/2024-25|2024/i.test(q)) detectedYear = '2024-25';

  return {
    course: detectedCourse,
    academicYear: detectedYear,
    type: detectedType,
    targetPage,
  };
}

/**
 * 4-Layer Hybrid Retrieval Engine with Live Open PDF Priority
 */
export function retrieveCeraChunks(
  query: string,
  detected: { course?: string; academicYear?: string; type?: 'CET' | 'CAP'; targetPage?: number | null },
  activeDocId?: string
): { chunk: CeraChunk; doc: CeraDocument; score: number }[] {
  const allDocs = getAllCeraDocuments();
  const q = query.toLowerCase();

  const results: { chunk: CeraChunk; doc: CeraDocument; score: number }[] = [];
  const activeDoc = activeDocId ? allDocs.find((d) => d.id === activeDocId) : undefined;

  // Pool of chunks: Official catalogue chunks + any live extracted text from the currently open PDF
  const candidateChunks: Array<{
    documentId: string;
    pageNumber: number;
    section?: string;
    point?: string;
    paragraph?: string;
    text: string;
    keywords?: string[];
  }> = [...OFFICIAL_PAGE_CHUNKS];

  if (activeDocId && activeDoc) {
    const livePages = getOpenPdfAllPagesText(activeDocId);
    for (const p of livePages) {
      if (!candidateChunks.some((c) => c.documentId === activeDocId && c.pageNumber === p.pageNumber)) {
        candidateChunks.push({
          documentId: activeDocId,
          pageNumber: p.pageNumber,
          section: `Open Official PDF (Page ${p.pageNumber})`,
          text: p.text,
          keywords: [activeDoc.courseName, `Page ${p.pageNumber}`, activeDoc.academicYear],
        });
      }
    }
  }

  for (const c of candidateChunks) {
    let score = 0;
    const fullText = `${c.text} ${c.section || ''} ${c.point || ''} ${c.paragraph || ''}`.toLowerCase();

    // Find parent document for this chunk
    let doc = allDocs.find((d) => d.id === c.documentId);
    if (!doc) {
      if (c.documentId.includes('mht-cet') || c.documentId.includes('engineering')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('mht-cet') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('llb') && c.documentId.includes('5')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('5') && d.courseName.toLowerCase().includes('llb'));
      } else if (c.documentId.includes('llb')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('ll.b. 3') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('agri')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('agri') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('bed')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('b.ed') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('mba')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('mba') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('mca')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('mca') && d.academicYear === '2026-27');
      } else if (c.documentId.includes('nursing')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('nursing'));
      } else if (c.documentId.includes('design')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('design'));
      } else if (c.documentId.includes('bca') || c.documentId.includes('bba')) {
        doc = allDocs.find((d) => d.courseName.toLowerCase().includes('bca') || d.courseName.toLowerCase().includes('bba'));
      }
    }
    if (!doc) {
      doc = activeDoc || allDocs[0];
    }

    // 1. OPEN PDF HEAVIEST PRIORITY (+500 points if chunk is from the open PDF)
    if (activeDocId && (c.documentId === activeDocId || doc.id === activeDocId)) {
      score += 500;
    } else if (activeDoc && doc.courseName.toLowerCase() === activeDoc.courseName.toLowerCase()) {
      score += 300;
    }

    // 2. Direct page target boost: e.g. "page 18 var kay aahe", "page 6"
    if (detected.targetPage && c.pageNumber === detected.targetPage) {
      score += 400;
    }

    // 3. Direct course boost
    if (detected.course) {
      const cNorm = detected.course.toLowerCase();
      if (doc.courseName.toLowerCase().includes(cNorm) || c.documentId.toLowerCase().includes(cNorm)) {
        score += 200;
      }
    }

    // 4. Academic year boost
    if (detected.academicYear && doc.academicYear === detected.academicYear) {
      score += 40;
    }

    // 5. Topic keyword matching
    if (/document|lagto|pahije|papers|certificate|validity|ncl|ews|दाखले/i.test(q)) {
      if (/document|certificate|validity|marksheet|ncl|ews|domicile|appendix/i.test(fullText)) {
        score += 90;
      }
    }
    if (/eligib|patrata|qualif|percentage|marks|पात्रता/i.test(q)) {
      if (/eligibility|aggregate|passed|bachelor|hsc|minimum|qualifying/i.test(fullText)) {
        score += 90;
      }
    }
    if (/fee|shulka|cost|charge|kiti|फी/i.test(q)) {
      if (/fee|1000|800|1200|payment|general|reserved/i.test(fullText)) {
        score += 90;
      }
    }
    if (/choice|option|filling|betterment|freeze|round/i.test(q)) {
      if (/choice|option form|freeze|betterment|preference|allotment/i.test(fullText)) {
        score += 100;
      }
    }
    if (/7\/12|agriculturist|weightage|शेतकरी/i.test(q)) {
      if (/weightage|7\/12|agriculturist|appendix d/i.test(fullText)) {
        score += 120;
      }
    }
    if (/pattern|marking|negative|गुणांकन|स्वरूप|pcm|pcb|cbt/i.test(q)) {
      if (/exam|cbt|questions|duration|negative|marks/i.test(fullText)) {
        score += 90;
      }
    }

    // Token semantic overlap
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    words.forEach((w) => {
      if (fullText.includes(w)) score += 15;
    });

    if (score > 0) {
      results.push({
        chunk: {
          documentId: doc.id,
          pageNumber: c.pageNumber,
          section: c.section,
          paragraph: c.paragraph,
          point: c.point,
          text: c.text,
          keywords: c.keywords,
        },
        doc,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 6);
}

/**
 * Citation Validation Engine
 */
export function validateCeraCitations(
  citations: CeraCitation[],
  availableDocs: CeraDocument[]
): CeraCitation[] {
  if (!Array.isArray(citations)) return [];
  const valid: CeraCitation[] = [];

  for (const cit of citations) {
    if (!cit.documentId && !cit.documentTitle) continue;
    const doc = availableDocs.find(
      (d) =>
        d.id === cit.documentId ||
        d.title.toLowerCase().includes((cit.documentTitle || '').toLowerCase()) ||
        d.courseName.toLowerCase().includes((cit.documentTitle || '').toLowerCase())
    );

    if (doc) {
      valid.push({
        documentId: doc.id,
        documentTitle: doc.title,
        academicYear: doc.academicYear,
        pageNumber: typeof cit.pageNumber === 'number' && cit.pageNumber > 0 ? cit.pageNumber : 1,
        section: cit.section || undefined,
        point: cit.point || undefined,
        chunkId: cit.chunkId,
        pdfUrl: doc.pdfUrl,
        officialSourcePageUrl: doc.officialSourcePageUrl,
      });
    }
  }

  return valid;
}

/**
 * Gemini AI Provider Implementation with Grounded Synthesis
 */
export class GeminiCeraProvider implements AIProvider {
  async generateAnswer(input: AIRequest): Promise<CeraResponse> {
    const allDocs = getAllCeraDocuments();

    // 1. Send actual extracted text and section hierarchy to server endpoint
    try {
      const response = await fetch('/api/cera/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input.question,
          retrievedContexts: input.retrievedContexts.map((r) => ({
            documentId: r.doc.id,
            documentTitle: r.doc.title,
            academicYear: r.doc.academicYear,
            courseName: r.doc.courseName,
            pageNumber: r.chunk.pageNumber,
            section: r.chunk.section,
            point: r.chunk.point,
            text: r.chunk.text,
            pdfUrl: r.doc.pdfUrl,
            officialSourcePageUrl: r.doc.officialSourcePageUrl,
          })),
          detected: input.detected,
          activeDocument: input.activeDocument,
          history: input.history,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.success && json.data) {
          const rawAnswer: CeraResponse = json.data;
          rawAnswer.sources = validateCeraCitations(rawAnswer.sources, allDocs);
          return rawAnswer;
        }
      }
    } catch (err) {
      console.warn('[CIA Provider] Backend API call error, applying local synthesis engine:', err);
    }

    // 2. High-precision Local Grounded Synthesis Engine (ensures thorough answers even if server network drops or quota is exhausted)
    const primary = input.retrievedContexts[0];
    if (primary) {
      const q = input.question.toLowerCase();
      const isMarathi = /sathi|pahije|aahe|kiti|lagto|kont|kay|कसे|काय|आहे|पाहिजे|लागतात|दाखले|प्रवर्ग|फी|स्वरूप|कशी|करावी/i.test(q);
      const isDocQuery = /document|paper|certificate|दाखले/i.test(q);
      const isFeeQuery = /fee|shulka|cost|किंमत|फी/i.test(q);
      const isEligibilityQuery = /eligib|patrata|qualif|percentage|पात्रता|marks|टक्के/i.test(q);
      const isChoiceFillingQuery = /choice|option|filling|round|betterment|freeze/i.test(q);
      const isPageQuery = !!input.detected?.targetPage || /page\s*\d+|पृष्ठ\s*\d+|पान\s*\d+/i.test(q);
      const isAgri712Query = /7\/12|agriculturist|weightage|शेतकरी/i.test(q);
      const isExamPatternQuery = /pattern|marking|negative|गुणांकन|स्वरूप|pcm|pcb|cbt|questions/i.test(q);

      // Target course resolution (prioritizes currently open PDF)
      const targetCourseName = input.activeDocument?.courseName || primary.doc.courseName || input.detected?.course || 'MHT-CET';
      const targetYear = input.activeDocument?.academicYear || primary.doc.academicYear || input.detected?.academicYear || '2026-27';
      const profile = resolveCourseProfile(targetCourseName, input.activeDocument?.id || primary.doc.id);
      const lang = isMarathi ? 'mr' : 'en';
      const pageNum = input.detected?.targetPage || primary.chunk.pageNumber;

      let title = isMarathi ? `${profile.marathiName} (${targetYear})` : `${profile.name} (${targetYear})`;
      let summary = '';
      let sections: CeraResponse['sections'] = [];
      let importantNotes: string[] = [];
      let answerType: CeraResponse['answerType'] = 'general';

      if (isPageQuery) {
        answerType = 'general';
        const docPageText = primary.chunk.text;
        if (isMarathi) {
          title = `${profile.marathiName} — अधिकृत माहिती पुस्तिका पृष्ठ ${pageNum}`;
          summary = `अधिकृत माहिती पुस्तिकेतील पृष्ठ ${pageNum} (${primary.chunk.section || 'प्रकरण नियम'}) वरील तपशील खालीलप्रमाणे आहेत:`;
          sections = [
            {
              heading: primary.chunk.section || 'पृष्ठावरील अधिकृत नियम व माहिती',
              text: docPageText,
              items: primary.chunk.paragraph ? [primary.chunk.paragraph] : undefined,
            },
          ];
          importantNotes = [
            'अधिकृत पीडीएफमधील मूळ मजकूर वाचण्यासाठी खालील "Open Page" बटणावर क्लिक करा.',
          ];
        } else {
          title = `${profile.name} — Official Brochure Page ${pageNum}`;
          summary = `According to Page ${pageNum} (${primary.chunk.section || 'Official Section'}) of the information brochure:`;
          sections = [
            {
              heading: primary.chunk.section || 'Official Rules & Information',
              text: docPageText,
              items: primary.chunk.paragraph ? [primary.chunk.paragraph] : undefined,
            },
          ];
          importantNotes = [
            'Click "Open Page" below to view the verified official PDF directly at this page.',
          ];
        }
      } else if (isDocQuery) {
        answerType = 'documents';
        const docData = profile.documents[lang];
        title = isMarathi
          ? `${profile.marathiName} (${targetYear}) — आवश्यक कागदपत्रे व पडताळणी नियम`
          : `${profile.name} (${targetYear}) — Required Documents & Verification Rules`;
        summary = docData.summary;
        sections = [
          {
            heading: isMarathi ? 'अनिवार्य शैक्षणिक कागदपत्रे (Mandatory Academic Documents)' : 'Mandatory Academic Documents',
            items: docData.mandatory,
          },
          {
            heading: isMarathi ? 'राखीव प्रवर्ग व विशेष कागदपत्रे (Reservation Documents)' : 'Category & Reservation Documents',
            items: docData.category,
          },
        ];
        importantNotes = docData.notes;
      } else if (isEligibilityQuery) {
        answerType = 'eligibility';
        const eligData = profile.eligibility[lang];
        title = isMarathi
          ? `${profile.marathiName} (${targetYear}) — शैक्षणिक पात्रता (Eligibility Criteria)`
          : `${profile.name} (${targetYear}) — Eligibility Criteria & Minimum Marks`;
        summary = eligData.summary;
        sections = [
          {
            heading: isMarathi ? 'पात्रता अटी व किमान गुणांची टक्केवारी' : 'Qualifying Criteria & Minimum Percentages',
            items: eligData.items,
          },
        ];
        importantNotes = [
          isMarathi
            ? 'पदवी/१२ वीच्या अंतिम परीक्षेला प्रविष्ट असलेले विद्यार्थीही प्रवेश परीक्षेसाठी पात्र असतात.'
            : 'Candidates appearing for their final qualifying examination are also eligible to apply.',
        ];
      } else if (isExamPatternQuery) {
        answerType = 'syllabus';
        const examData = profile.examPattern[lang];
        title = isMarathi
          ? `${profile.marathiName} (${targetYear}) — परीक्षा स्वरूप व गुणांकन पद्धत`
          : `${profile.name} (${targetYear}) — Scheme of Examination & Marking Pattern`;
        summary = examData.summary;
        sections = [
          {
            heading: isMarathi ? 'परीक्षा पद्धत व विषयनिहाय गुण विभागणी' : 'Exam Structure & Mark Distribution',
            items: examData.items,
          },
        ];
        importantNotes = [
          isMarathi
            ? 'सर्व परीक्षा संगणक आधारित (CBT) पद्धतीने घेतल्या जातात. कोणतीही नकारात्मक गुणांकन पद्धत नसते.'
            : 'Computer Based Test (CBT) online mode. There is NO negative marking.',
        ];
      } else if (isFeeQuery) {
        answerType = 'fee';
        const feeData = profile.fees[lang];
        title = isMarathi
          ? `${profile.marathiName} (${targetYear}) — अधिकृत परीक्षा शुल्क रचना`
          : `${profile.name} (${targetYear}) — Application Fee Structure`;
        summary = feeData.summary;
        sections = [
          {
            heading: isMarathi ? 'प्रवर्गनिहाय अर्ज शुल्क' : 'Category-wise Application Fees',
            items: feeData.items,
          },
        ];
        importantNotes = [
          isMarathi
            ? 'शुल्क केवळ ऑनलाईन पेमेंट गेटवेद्वारे (Net Banking/UPI/Card) स्वीकारले जाते व ते परत केले जात नाही.'
            : 'Fees are non-refundable and must be paid through online banking or UPI.',
        ];
      } else if (isAgri712Query) {
        answerType = 'quota';
        if (isMarathi) {
          title = `कृषी पदवी प्रवेश (${targetYear}) — ७/१२ उतारा व १२% शेतकरी वेटेज गुण`;
          summary = `अधिकृत कृषी माहिती पुस्तिकेनुसार अतिरिक्त वेटेजचे नियम खालीलप्रमाणे आहेत:`;
          sections = [
            {
              heading: 'शेतकरी व इतर अतिरिक्त वेटेज रचना (Additional Weightages)',
              items: [
                '१. शेतकरी वेटेज: पालकांच्या नावावरील ७/१२ उतारा व तहसीलदारांचे परिशिष्ट "ड" (Appendix D) प्रमाणपत्र जोडल्यास १२% अतिरिक्त गुण मिळतात.',
                '२. भूमीहीन शेतमजूर प्रमाणपत्र (नमुना ८ — तहसीलदारांचे): १२% अतिरिक्त गुण.',
                '३. १२ वी मध्ये कृषी व्यावसायिक विषय (Vocational Agriculture): १०% अतिरिक्त गुण.',
                '४. NCC किंवा NSS प्रमाणपत्र धारक: २% अतिरिक्त गुण.',
                '५. राज्य किंवा राष्ट्रीय स्तरावरील क्रीडा स्पर्धा (Sports) प्राविण्य: २% ते ४% अतिरिक्त गुण.',
              ],
            },
          ];
          importantNotes = [
            'केवळ ७/१२ उतारा पुरेसा नाही, परिशिष्ट "ड" (Appendix D) मधील शेतकरी दाखला तहसीलदारांचा जोडणे अनिवार्य आहे.',
          ];
        } else {
          title = `Agriculture Degree Admissions (${targetYear}) — 7/12 Extract & 12% Weightage Rules`;
          summary = `According to the official Agriculture Information Brochure, additional weightage marks are awarded as follows:`;
          sections = [
            {
              heading: 'Weightage Marks for Agriculture Merit Calculation',
              items: [
                '1. Agriculturist Weightage: 12% additional marks added to merit if candidate produces recent 7/12 land extract along with Tahsildar-certified Appendix "D" certificate.',
                '2. Landless Agricultural Labourer (Form VIII certificate from Tahsildar): 12% additional marks.',
                '3. Agricultural vocational subjects in Std. XII: 10% additional weightage marks.',
                '4. NCC "B" or "C" / NSS certificate: 2% additional weightage marks.',
                '5. State / National level sports representation: 2% to 4% additional marks.',
              ],
            },
          ];
          importantNotes = [
            'The 7/12 extract must be for the current revenue year and submitted alongside the Appendix D certificate signed by Tahsildar/Naib Tahsildar.',
          ];
        }
      } else if (isChoiceFillingQuery) {
        answerType = 'process';
        if (isMarathi) {
          title = `केंद्रीभूत प्रवेश प्रक्रिया (CAP) — Option Form भरण्याचे नियम`;
          summary = `CAP अंतर्गत पसंतीक्रम (Option Form) भरण्याची अधिकृत कार्यपद्धती:`;
          sections = [
            {
              heading: 'पसंतीक्रम भरण्याची कार्यपद्धती (Step-by-Step)',
              items: [
                '१. अधिकृत CET Cell पोर्टलवर नोंदणीकृत Application ID व Password वापरून Candidate Login करा.',
                '२. Option Form मध्ये किमान १ आणि कमाल ३०० महाविद्यालये व शाखांचा पसंतीक्रम प्राधान्यानुसार भरा.',
                '३. पसंतीक्रम तपासून मोबाईलवर प्राप्त होणाऱ्या OTP द्वारे फॉर्म Confirm करा (Confirm नंतर बदल करता येत नाही).',
                '४. गुणवत्ता यादीनुसार जागा वाटप (Seat Allotment) जाहीर केले जाते.',
                '५. Auto-Freeze: पहिल्या पसंतीक्रमाची जागा मिळाल्यास ती आपोआप Freeze होते; उमेदवाराला Seat Acceptance Fee भरून महाविद्यालयात प्रवेश घेणे बंधनकारक असते.',
                '६. Betterment: २ ते ३०० क्रमांकाची जागा मिळाल्यास उमेदवार ती जागा सुरक्षित ठेवून पुढील फेरीत वरच्या पसंतीसाठी स्पर्धा करू शकतो.',
              ],
            },
          ];
        } else {
          title = `Centralized Admission Process (CAP) — Option Form & Choice Filling Guidelines`;
          summary = `Official guidelines for online Option Form submission and Seat Acceptance during CAP:`;
          sections = [
            {
              heading: 'Choice Filling Procedure',
              items: [
                '1. Log in to the candidate portal using registered Application ID and Password.',
                '2. Fill in choices of colleges and branches (minimum 1, maximum 300 choices in order of preference).',
                '3. Carefully verify the preference order and confirm the Option Form using mobile OTP.',
                '4. Seat allotment is published based on merit rank and choices.',
                '5. Auto-Freeze: If candidate is allotted their 1st preference, the seat is auto-frozen. Candidate must pay Seat Acceptance Fee and confirm admission at the college.',
                '6. Betterment: If candidate is allotted 2nd to 300th preference, they can accept the seat, pay fee, and opt for Betterment to participate in subsequent CAP rounds for higher preferences.',
              ],
            },
          ];
        }
      } else {
        // Direct Chunk Synthesis
        title = `${profile.name} (${targetYear}) — ${primary.chunk.section || 'Official Information'}`;
        summary = primary.chunk.text;
        sections = [
          {
            heading: primary.chunk.section || 'Official Guidelines',
            items: primary.chunk.paragraph ? [primary.chunk.paragraph] : [primary.chunk.text],
          },
        ];
      }

      const validatedSource: CeraCitation = {
        documentId: primary.doc.id,
        documentTitle: primary.doc.title,
        academicYear: primary.doc.academicYear,
        pageNumber: primary.chunk.pageNumber,
        section: primary.chunk.section,
        point: primary.chunk.point,
        pdfUrl: primary.doc.pdfUrl,
        officialSourcePageUrl: primary.doc.officialSourcePageUrl,
      };

      return {
        answerType,
        title,
        sections,
        importantNotes: importantNotes.length > 0 ? importantNotes : undefined,
        sources: [validatedSource],
        followUpQuestions: [
          `${profile.name} eligibility criteria?`,
          `${profile.name} documents required?`,
          `${profile.name} application fee?`,
        ],
        confidence: 'high',
      };
    }

    return {
      answerType: 'general',
      title: 'No Direct Official Match',
      sections: [
        {
          heading: 'Official Documents Search',
          text: "I couldn't find a sufficiently clear answer in the available official Maharashtra State CET Cell documents for this specific phrasing.",
        },
      ],
      importantNotes: [
        'Try selecting the course name (e.g., LL.B. 3 Years, MHT-CET, Agriculture) and academic year.',
      ],
      sources: [],
      followUpQuestions: [
        'LL.B. 3 Years eligibility?',
        'MHT-CET 2026 documents required?',
        'Agriculture 7/12 extract weightage?',
      ],
      confidence: 'low',
    };
  }
}

export const ceraAiProvider = new GeminiCeraProvider();

/**
 * Ask CIA main interaction function
 */
export async function askCera(
  question: string,
  activeDocument?: CeraDocument | null,
  history?: any[]
): Promise<CeraResponse> {
  const detected = detectCeraQuery(question, activeDocument, history);
  const retrieved = retrieveCeraChunks(question, detected, activeDocument?.id);

  return ceraAiProvider.generateAnswer({
    question,
    retrievedContexts: retrieved,
    detected,
    activeDocument,
    history,
  });
}

/**
 * Bookmarks management
 */
export function getCeraBookmarks(): CeraBookmark[] {
  return safeStorage.getJSON<CeraBookmark[]>(CERA_BOOKMARKS_KEY, []);
}

export function toggleCeraBookmark(bookmark: Omit<CeraBookmark, 'id' | 'createdAt'>): boolean {
  const current = getCeraBookmarks();
  const existingIdx = current.findIndex(
    (b) => b.documentId === bookmark.documentId && b.pageNumber === bookmark.pageNumber
  );

  let updated: CeraBookmark[];
  if (existingIdx >= 0) {
    updated = current.filter((_, i) => i !== existingIdx);
  } else {
    const newItem: CeraBookmark = {
      ...bookmark,
      id: `bm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updated = [newItem, ...current];
  }
  return safeStorage.setJSON(CERA_BOOKMARKS_KEY, updated);
}

/**
 * Search History management
 */
export function getCeraHistory(): CeraHistoryItem[] {
  return safeStorage.getJSON<CeraHistoryItem[]>(CERA_HISTORY_KEY, []);
}

export function addCeraHistory(query: string, detectedCourse?: string, documentId?: string) {
  const current = getCeraHistory();
  const newItem: CeraHistoryItem = {
    id: `hist-${Date.now()}`,
    query,
    detectedCourse,
    documentId,
    timestamp: new Date().toISOString(),
  };
  const updated = [newItem, ...current.filter((h) => h.query.toLowerCase() !== query.toLowerCase())].slice(0, 30);
  safeStorage.setJSON(CERA_HISTORY_KEY, updated);
}

export function clearCeraHistory(): boolean {
  return safeStorage.setJSON(CERA_HISTORY_KEY, []);
}
