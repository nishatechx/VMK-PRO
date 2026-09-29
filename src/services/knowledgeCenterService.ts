/**
 * CET & CAP Knowledge Center Service
 * 
 * Provides:
 * - Structured document access & cascading dependent filter calculations
 * - Multi-criteria search across metadata & indexed PDF text
 * - RAG question answering with exact Page, Section & Point citations
 * - Document management (Add, Edit, Re-index, Archive) with official domain validation
 */

import {
  DocumentRecord,
  DocumentPageChunk,
  EducationSection,
  EducationLevel,
  DocumentType,
  AiSourceCitation,
  KnowledgeCenterChatMessage,
} from '../types/knowledgeCenter';
import { OFFICIAL_CET_DOCUMENTS, OFFICIAL_PAGE_CHUNKS } from '../data/officialCetDocuments';
import { safeStorage } from '../utils/safeStorage';

const CUSTOM_DOCS_KEY = 'vmk_custom_cet_documents_v1';
const APPROVED_DOMAIN = 'cetcell.mahacet.org';

/**
 * Validates that an official source URL belongs to the approved State CET Cell domain
 */
export function validateOfficialUrl(urlStr: string): { isValid: boolean; error?: string } {
  if (!urlStr || !urlStr.trim()) {
    return { isValid: false, error: 'URL is required.' };
  }

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.hostname !== APPROVED_DOMAIN && !parsed.hostname.endsWith(`.${APPROVED_DOMAIN}`)) {
      return {
        isValid: false,
        error: `Only official State CET Cell domain (${APPROVED_DOMAIN}) is permitted for official source documents.`,
      };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format. Please provide a valid https:// URL.' };
  }
}

/**
 * Get all active and archived documents (combining official catalogue with any admin added documents)
 */
export function getAllKnowledgeDocuments(): DocumentRecord[] {
  const custom = safeStorage.getJSON<DocumentRecord[]>(CUSTOM_DOCS_KEY, []);
  let pool = OFFICIAL_CET_DOCUMENTS;

  if (custom && custom.length > 0) {
    const customMap = new Map<string, DocumentRecord>();
    custom.forEach((d) => customMap.set(d.id, d));

    const merged = OFFICIAL_CET_DOCUMENTS.map((doc) => customMap.get(doc.id) || doc);
    custom.forEach((d) => {
      if (!OFFICIAL_CET_DOCUMENTS.some((o) => o.id === d.id)) {
        merged.unshift(d);
      }
    });
    pool = merged;
  }

  // Strictly filter out any header artifacts and guarantee unique IDs
  const seenIds = new Set<string>();
  const cleanDocs: DocumentRecord[] = [];

  for (const d of pool) {
    if (
      !d.id ||
      d.courseName.toLowerCase() === 'course name' ||
      d.title.toLowerCase() === 'subject' ||
      d.id.includes('Sr.No') ||
      d.publishedDate === 'Published Date'
    ) {
      continue;
    }
    if (!seenIds.has(d.id)) {
      seenIds.add(d.id);
      cleanDocs.push(d);
    }
  }

  return cleanDocs;
}

/**
 * Save custom/modified document to storage
 */
export function saveKnowledgeDocument(doc: DocumentRecord): boolean {
  const current = getAllKnowledgeDocuments();
  const existingIdx = current.findIndex((d) => d.id === doc.id);
  let updatedList: DocumentRecord[];

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...doc, indexedStatus: 'Ready' };
  } else {
    updatedList = [{ ...doc, indexedStatus: 'Ready' }, ...current];
  }

  return safeStorage.setJSON(CUSTOM_DOCS_KEY, updatedList);
}

/**
 * Archive or Delete a document
 */
export function toggleArchiveDocument(docId: string, setActive: boolean): boolean {
  const current = getAllKnowledgeDocuments();
  const target = current.find((d) => d.id === docId);
  if (!target) return false;

  target.isActive = setActive;
  return saveKnowledgeDocument(target);
}

/**
 * Re-index document status simulator
 */
export async function reindexDocument(docId: string): Promise<boolean> {
  const current = getAllKnowledgeDocuments();
  const target = current.find((d) => d.id === docId);
  if (!target) return false;

  target.indexedStatus = 'Processing...';
  saveKnowledgeDocument(target);

  await new Promise((r) => setTimeout(r, 600));

  target.indexedStatus = 'Ready';
  return saveKnowledgeDocument(target);
}

/**
 * Cascading / Dependent Filter computation
 * Evaluates available options strictly from current matching subset
 */
export function getCascadingFilterOptions(
  allDocs: DocumentRecord[],
  currentType: 'CET' | 'CAP',
  filters: {
    section?: string;
    level?: string;
    course?: string;
    academicYear?: string;
    documentType?: string;
  }
) {
  // Base pool filtered by CET vs CAP
  let pool = allDocs.filter((d) => d.type === currentType);

  // Available sections for this type
  const sections = Array.from(new Set(pool.map((d) => d.educationSection))).sort();

  // If section selected, filter pool
  if (filters.section && filters.section !== 'all') {
    pool = pool.filter((d) => d.educationSection === filters.section);
  }

  // Available levels in current section
  const levels = Array.from(new Set(pool.map((d) => d.level))).sort();

  // If level selected, filter pool
  if (filters.level && filters.level !== 'all') {
    pool = pool.filter((d) => d.level === filters.level);
  }

  // Available courses
  const courses = Array.from(new Set(pool.map((d) => d.courseName))).sort();

  // If course selected, filter pool
  if (filters.course && filters.course !== 'all') {
    pool = pool.filter((d) => d.courseName.toLowerCase() === filters.course.toLowerCase());
  }

  // Available academic years
  const academicYears = Array.from(new Set(pool.map((d) => d.academicYear))).sort().reverse();

  // If year selected, filter pool
  if (filters.academicYear && filters.academicYear !== 'all') {
    pool = pool.filter((d) => d.academicYear === filters.academicYear);
  }

  // Available document types
  const documentTypes = Array.from(new Set(pool.map((d) => d.documentType))).sort();

  return {
    sections,
    levels,
    courses,
    academicYears,
    documentTypes,
  };
}

/**
 * Filter documents according to selected criteria and search query
 */
export function filterKnowledgeDocuments(
  allDocs: DocumentRecord[],
  type: 'CET' | 'CAP',
  filters: {
    section?: string;
    level?: string;
    course?: string;
    academicYear?: string;
    documentType?: string;
    searchQuery?: string;
  }
): DocumentRecord[] {
  return allDocs.filter((doc) => {
    // 1. Type
    if (doc.type !== type) return false;

    // 2. Section
    if (filters.section && filters.section !== 'all' && doc.educationSection !== filters.section) {
      return false;
    }

    // 3. Level
    if (filters.level && filters.level !== 'all' && doc.level !== filters.level) {
      return false;
    }

    // 4. Course
    if (
      filters.course &&
      filters.course !== 'all' &&
      doc.courseName.toLowerCase() !== filters.course.toLowerCase()
    ) {
      return false;
    }

    // 5. Academic Year
    if (
      filters.academicYear &&
      filters.academicYear !== 'all' &&
      doc.academicYear !== filters.academicYear
    ) {
      return false;
    }

    // 6. Document Type
    if (
      filters.documentType &&
      filters.documentType !== 'all' &&
      doc.documentType !== filters.documentType
    ) {
      return false;
    }

    // 7. Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchMeta =
        doc.courseName.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        doc.educationSection.toLowerCase().includes(q) ||
        doc.academicYear.toLowerCase().includes(q) ||
        doc.documentType.toLowerCase().includes(q) ||
        doc.level.toLowerCase().includes(q);

      if (matchMeta) return true;

      // Check indexed chunks
      const matchChunk = OFFICIAL_PAGE_CHUNKS.some(
        (c) =>
          c.documentId === doc.id &&
          (c.text.toLowerCase().includes(q) ||
            c.section?.toLowerCase().includes(q) ||
            c.keywords?.some((k) => k.toLowerCase().includes(q)))
      );

      return matchChunk;
    }

    return true;
  });
}

/**
 * Open official PDF directly at the exact page number in a new browser tab
 */
export function openPdfPage(pdfUrl: string | null | undefined, pageNumber: number, fallbackUrl?: string) {
  if (pdfUrl && pdfUrl.trim()) {
    const targetUrl = `${pdfUrl.trim()}#page=${pageNumber}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } else if (fallbackUrl && fallbackUrl.trim()) {
    window.open(fallbackUrl.trim(), '_blank', 'noopener,noreferrer');
  }
}

/**
 * NLP Intent Detector for user queries in English, Marathi, Hinglish
 */
export function detectQueryIntent(
  rawQuery: string,
  currentDoc?: DocumentRecord | null,
  contextHistory?: KnowledgeCenterChatMessage[]
) {
  const query = (rawQuery || '').toLowerCase().trim();

  // Check recent conversation context for course and year inheritance
  let inheritedCourse = currentDoc?.courseName || '';
  let inheritedYear = currentDoc?.academicYear || '2026-27';
  let inheritedType: 'CET' | 'CAP' = currentDoc?.type || 'CET';

  if (!inheritedCourse && contextHistory && contextHistory.length > 0) {
    for (let i = contextHistory.length - 1; i >= 0; i--) {
      const msg = contextHistory[i];
      if (msg.detectedIntent?.course) {
        inheritedCourse = msg.detectedIntent.course;
        inheritedYear = msg.detectedIntent.academicYear || inheritedYear;
        inheritedType = msg.detectedIntent.type || inheritedType;
        break;
      }
    }
  }

  // Detect Course
  let detectedCourse = inheritedCourse;
  if (/ll\.?b\.?\s*3|llb\s*3/i.test(query)) {
    detectedCourse = 'LL.B. 3 Years';
  } else if (/ll\.?b\.?\s*5|llb\s*5/i.test(query)) {
    detectedCourse = 'LL.B. 5 Years';
  } else if (/mht[-\s]*cet|engineering|b\.?tech|b\.?e\b/i.test(query)) {
    detectedCourse = 'MHT-CET';
  } else if (/b\.?ed\b/i.test(query)) {
    detectedCourse = 'B.Ed';
  } else if (/m\.?ed\b/i.test(query)) {
    detectedCourse = 'M.Ed';
  } else if (/mca/i.test(query)) {
    detectedCourse = 'MCA';
  } else if (/mba|mms/i.test(query)) {
    detectedCourse = 'MBA';
  } else if (/agri|agriculture|b\.?sc\s*agri/i.test(query)) {
    detectedCourse = 'Agriculture & Allied Courses';
  } else if (/nursing/i.test(query)) {
    detectedCourse = 'MH-Nursing';
  } else if (/aac|fine\s*art/i.test(query)) {
    detectedCourse = 'MAH-AAC-CET';
  } else if (/design|b\.?design/i.test(query)) {
    detectedCourse = 'B.Design CET';
  }

  // Detect CET vs CAP
  let detectedType: 'CET' | 'CAP' = inheritedType;
  if (/cap|allotment|option\s*form|seat|scrutiny\s*center|rounds|preference/i.test(query)) {
    detectedType = 'CAP';
  } else if (/cet|exam\s*pattern|syllabus|hall\s*ticket|admit\s*card|negative\s*marking/i.test(query)) {
    detectedType = 'CET';
  }

  // Detect Academic Year
  let detectedYear = inheritedYear;
  if (/2026-27|2026/i.test(query)) {
    detectedYear = '2026-27';
  } else if (/2025-26|2025/i.test(query)) {
    detectedYear = '2025-26';
  } else if (/2024-25|2024/i.test(query)) {
    detectedYear = '2024-25';
  }

  return {
    course: detectedCourse,
    type: detectedType,
    academicYear: detectedYear,
  };
}

/**
 * Retrieve most relevant document page chunk based on detected intent and semantic keywords
 */
export function retrieveRelevantPageChunks(
  query: string,
  detected: { course?: string; type?: 'CET' | 'CAP'; academicYear?: string },
  currentDocId?: string
): { chunk: DocumentPageChunk; doc: DocumentRecord }[] {
  const allDocs = getAllKnowledgeDocuments();
  const q = query.toLowerCase();

  // Find target document
  let candidateDocs = allDocs;
  if (currentDocId) {
    const exact = allDocs.find((d) => d.id === currentDocId);
    if (exact) candidateDocs = [exact];
  } else {
    if (detected.course) {
      const match = allDocs.filter(
        (d) =>
          d.courseName.toLowerCase().includes(detected.course!.toLowerCase()) ||
          d.title.toLowerCase().includes(detected.course!.toLowerCase())
      );
      if (match.length > 0) candidateDocs = match;
    }

    if (detected.academicYear) {
      const yearMatch = candidateDocs.filter((d) => d.academicYear === detected.academicYear);
      if (yearMatch.length > 0) candidateDocs = yearMatch;
    }
  }

  const results: { chunk: DocumentPageChunk; doc: DocumentRecord; score: number }[] = [];

  for (const doc of candidateDocs) {
    // Check available chunks
    const docChunks = OFFICIAL_PAGE_CHUNKS.filter((c) => {
      if (c.documentId === doc.id) return true;
      // Match by course keyword in chunk id
      const courseNorm = doc.courseName.toLowerCase();
      if (courseNorm.includes('mht-cet') && c.documentId.includes('mht-cet')) return true;
      if (courseNorm.includes('llb') && c.documentId.includes('llb')) return true;
      if (courseNorm.includes('agri') && c.documentId.includes('agri')) return true;
      if (courseNorm.includes('b.ed') && c.documentId.includes('bed')) return true;
      if (courseNorm.includes('mba') && c.documentId.includes('mba')) return true;
      if (courseNorm.includes('mca') && c.documentId.includes('mca')) return true;
      return false;
    });

    for (const chunk of docChunks) {
      let score = 0;
      const chunkText = (chunk.text + ' ' + (chunk.section || '') + ' ' + (chunk.point || '')).toLowerCase();

      // Keyword queries
      if (/document|lagto|pahije|submit|upload|papers|दाखले/i.test(q) && /document|marksheet|validity|ncl|ews/i.test(chunkText)) {
        score += 50;
      }
      if (/eligib|patrata|qualif|percentage|marks|पात्रता/i.test(q) && /eligibility|aggregate|bachelor|hsc|passed/i.test(chunkText)) {
        score += 50;
      }
      if (/fee|shulka|charge|cost|kiti|किंमत|फी/i.test(q) && /fee|1000|800|payment/i.test(chunkText)) {
        score += 50;
      }
      if (/pattern|marking|negative|marks|गुणांकन|स्वरूप/i.test(q) && /exam|cbt|questions|duration|negative/i.test(chunkText)) {
        score += 50;
      }
      if (/weightage|7\/12|land|शेतकरी/i.test(q) && /weightage|agriculturist|7\/12/i.test(chunkText)) {
        score += 50;
      }

      // Exact phrase bonus
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      words.forEach((w) => {
        if (chunkText.includes(w)) score += 10;
      });

      if (score > 0) {
        results.push({ chunk, doc, score });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3).map((r) => ({ chunk: r.chunk, doc: r.doc }));
}

/**
 * Ask Question to the CET/CAP AI Assistant
 * Primary source of truth is official documents indexed in knowledge base
 */
export async function askKnowledgeAssistant(
  question: string,
  currentDoc?: DocumentRecord | null,
  contextHistory?: KnowledgeCenterChatMessage[]
): Promise<{
  answer: string;
  source?: AiSourceCitation;
  additionalSources?: AiSourceCitation[];
}> {
  const query = question.trim();
  if (!query) {
    return {
      answer: "Please enter your query regarding official Maharashtra State CET or CAP admission documents.",
    };
  }

  // 1. Detect Intent, Course, Year & Type
  const detected = detectQueryIntent(query, currentDoc, contextHistory);

  // 2. Retrieve relevant chunks
  const retrieved = retrieveRelevantPageChunks(query, detected, currentDoc?.id);

  // If we have an indexed chunk, extract primary citation
  const primary = retrieved[0];
  const sourceCitation: AiSourceCitation | undefined = primary
    ? {
        documentId: primary.doc.id,
        documentTitle: primary.doc.title,
        academicYear: primary.doc.academicYear,
        educationSection: primary.doc.educationSection,
        courseName: primary.doc.courseName,
        pageNumber: primary.chunk.pageNumber,
        section: primary.chunk.section,
        point: primary.chunk.point,
        paragraph: primary.chunk.paragraph,
        pdfUrl: primary.doc.pdfUrl,
        officialSourcePageUrl: primary.doc.officialSourcePageUrl,
      }
    : undefined;

  // 3. Attempt Server-side Gemini API call with RAG context
  try {
    const res = await fetch('/api/knowledge-center/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        currentDocId: currentDoc?.id,
        detected,
        retrievedContext: primary
          ? {
              documentTitle: primary.doc.title,
              academicYear: primary.doc.academicYear,
              educationSection: primary.doc.educationSection,
              courseName: primary.doc.courseName,
              pageNumber: primary.chunk.pageNumber,
              section: primary.chunk.section,
              point: primary.chunk.point,
              text: primary.chunk.text,
              pdfUrl: primary.doc.pdfUrl,
              officialSourcePageUrl: primary.doc.officialSourcePageUrl,
            }
          : null,
        history: contextHistory
          ?.filter((m) => m.role !== 'system')
          ?.slice(-4)
          ?.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.answer) {
        return {
          answer: data.answer,
          source: data.source || sourceCitation,
          additionalSources: data.additionalSources,
        };
      }
    }
  } catch (err) {
    console.warn('[KnowledgeAssistant] Server API unavailable, falling back to local grounded synthesis:', err);
  }

  // 4. Grounded Local Fallback if server call unavailable
  if (primary) {
    const chunk = primary.chunk;
    const doc = primary.doc;

    // Detect user query language
    const isMarathi = /sathi|pahije|aahe|kiti|lagto|kont|kay|कसे|काय|आहे|पाहिजे|लागतात|दाखले|प्रवर्ग/i.test(query);

    let answerText = '';
    if (isMarathi) {
      answerText = `**${doc.courseName} (${doc.academicYear}) अधिकृत माहिती पुस्तिकेनुसार (${chunk.section || 'प्रकरण'}):**\n\n${chunk.text}\n\nसविस्तर माहिती अधिकृत ब्रोशरच्या पृष्ठ क्रमांक ${chunk.pageNumber} वर पाहू शकता.`;
    } else {
      answerText = `According to the official **${doc.courseName} Information Brochure (${doc.academicYear})**, under **${chunk.section || 'General Provisions'}**:\n\n${chunk.text}\n\nYou can verify the complete official guidelines directly on **Page ${chunk.pageNumber}** of the document.`;
    }

    return {
      answer: answerText,
      source: sourceCitation,
    };
  }

  // Strict Rule 21: No-Hallucination UI
  return {
    answer: `I couldn't find a clear answer in the available official documents.\n\nTry selecting:\n• Course (e.g. LL.B. 3 Years, MHT-CET, B.Ed)\n• Academic Year (e.g. 2026-27)\n• CET / CAP`,
  };
}
