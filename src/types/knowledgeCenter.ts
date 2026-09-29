/**
 * CET & CAP Knowledge Center Types
 * Official State CET Cell Document Repository & RAG Assistant
 */

export type EducationSection =
  | "Technical Education"
  | "Higher Education"
  | "Agriculture Education"
  | "Fine Art Education"
  | "Medical Education"
  | "Ayush Education";

export type EducationLevel = "UG" | "PG" | "Integrated" | "Other";

export type DocumentType =
  | "Information Brochure"
  | "User Manual"
  | "Notice"
  | "Other";

export type DocumentLanguage = "English" | "Marathi" | "Hindi" | "Other";

export interface DocumentRecord {
  id: string;
  type: "CET" | "CAP";
  educationSection: EducationSection;
  courseName: string;
  level: EducationLevel;
  academicYear: string;
  documentType: DocumentType;
  language?: DocumentLanguage;
  title: string;
  publishedDate?: string;
  officialSourcePageUrl: string;
  pdfUrl: string | null;
  pageCount?: number;
  isActive: boolean;
  indexedStatus?: "Ready" | "Processing..." | "Failed";
}

export interface DocumentPageChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  section?: string;
  point?: string;
  paragraph?: string;
  headings?: string[];
  text: string;
  keywords?: string[];
}

export interface AiSourceCitation {
  documentId: string;
  documentTitle: string;
  academicYear: string;
  educationSection?: string;
  courseName?: string;
  pageNumber: number;
  section?: string;
  point?: string;
  paragraph?: string;
  pdfUrl?: string | null;
  officialSourcePageUrl?: string;
  confidence?: number;
}

export interface KnowledgeCenterChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  sourceCitation?: AiSourceCitation;
  additionalCitations?: AiSourceCitation[];
  detectedIntent?: {
    course?: string;
    type?: "CET" | "CAP";
    academicYear?: string;
    section?: string;
  };
  isLoading?: boolean;
}

export interface KnowledgeCenterFilters {
  section: string;
  level: string;
  course: string;
  academicYear: string;
  documentType: string;
  searchQuery: string;
}
