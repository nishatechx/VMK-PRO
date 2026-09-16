export interface QrUploadedFile {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  isDownloadedToSoftware: boolean;
  verifiedStamp: boolean;
  category: string;
}

declare global {
  var __globalSessionStore: Map<string, QrUploadedFile[]> | undefined;
  var __globalVaultStore: QrUploadedFile[] | undefined;
}

export const sessionStore: Map<string, QrUploadedFile[]> =
  globalThis.__globalSessionStore || (globalThis.__globalSessionStore = new Map());

export const vaultStore: QrUploadedFile[] =
  globalThis.__globalVaultStore || (globalThis.__globalVaultStore = []);

export function detectDocCategory(fileName: string): string {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('hsc') || lower.includes('ssc') || lower.includes('mark') || lower.includes('result')) return 'Mark Sheet / Result';
  if (lower.includes('caste') || lower.includes('ncl') || lower.includes('ews') || lower.includes('validity')) return 'Caste / Category Certificate';
  if (lower.includes('domicile') || lower.includes('birth') || lower.includes('lc') || lower.includes('leaving')) return 'Domicile / Birth / LC';
  if (lower.includes('income') || lower.includes('tws')) return 'Income Certificate';
  if (lower.includes('photo') || lower.includes('sign') || lower.includes('image') || lower.includes('pic')) return 'Photo / Signature';
  if (lower.includes('cet') || lower.includes('allotment') || lower.includes('score') || lower.includes('admit')) return 'CET / Score Card / Allotment';
  return 'Candidate Document';
}
