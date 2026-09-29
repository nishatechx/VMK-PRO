/**
 * CIA — CET & CAP Information Assistant
 * Official Data Model & Types Specification
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

export type DocumentStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export interface CeraDocument {
  id: string;
  type: "CET" | "CAP";
  educationSection: EducationSection;
  courseName: string;
  level: EducationLevel;
  academicYear: string;
  documentType: DocumentType;
  language?: string;
  title: string;
  pdfUrl: string | null;
  officialSourcePageUrl: string;
  pageCount?: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CeraDocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  text: string;
  headings: string[];
  sections: string[];
  paragraphs: string[];
  points: string[];
  keywords: string[];
  embedding?: number[];
}

export interface CeraChunk {
  documentId: string;
  pageNumber: number;
  section?: string;
  subsection?: string;
  paragraph?: string;
  point?: string;
  text: string;
  keywords?: string[];
}

export type CeraAnswerType =
  | "eligibility"
  | "documents"
  | "fee"
  | "dates"
  | "process"
  | "quota"
  | "syllabus"
  | "general";

export interface CeraCitation {
  documentId: string;
  documentTitle: string;
  academicYear?: string;
  pageNumber: number;
  section?: string;
  point?: string;
  chunkId?: string;
  pdfUrl: string | null;
  officialSourcePageUrl?: string;
}

export interface CeraResponse {
  answerType: CeraAnswerType;
  title: string;
  sections: {
    heading: string;
    items?: string[];
    text?: string;
  }[];
  importantNotes?: string[];
  sources: CeraCitation[];
  followUpQuestions?: string[];
  confidence: "high" | "medium" | "low";
}

export interface CeraChatMessage {
  id: string;
  role: "user" | "cera" | "system";
  question?: string;
  structuredAnswer?: CeraResponse;
  rawContent?: string;
  timestamp: string;
  isLoading?: boolean;
  activeDocContext?: {
    documentId: string;
    courseName: string;
    academicYear: string;
  };
}

export interface AIRequest {
  question: string;
  retrievedContexts: any[];
  detected?: {
    course?: string;
    type?: "CET" | "CAP";
    academicYear?: string;
    section?: string;
    targetPage?: number | null;
  };
  activeDocument?: CeraDocument | null;
  history?: { role: string; text: string }[];
}

export interface AIProvider {
  generateAnswer(input: AIRequest): Promise<CeraResponse>;
}

export interface CeraBookmark {
  id: string;
  documentId: string;
  documentTitle: string;
  courseName: string;
  academicYear: string;
  pageNumber: number;
  note?: string;
  createdAt: string;
}

export interface CeraHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  detectedCourse?: string;
  documentId?: string;
}
