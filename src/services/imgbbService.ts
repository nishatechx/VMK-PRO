/**
 * Image Storage Service - Powered by Firebase Cloud Database (Firestore)
 * All user profile pictures, documents, and media are stored and synchronized directly in Firebase.
 */
import {
  uploadImageToFirebase,
  fileToBase64,
  compressImage,
  ImageUploadResult,
  FirebaseImageRecord,
  getImageFromFirebase,
  deleteImageFromFirebase,
} from './imageStorageService';

export {
  uploadImageToFirebase,
  fileToBase64,
  compressImage,
  getImageFromFirebase,
  deleteImageFromFirebase,
};
export type { ImageUploadResult, FirebaseImageRecord };

/**
 * Upload helper that stores the image directly into Firebase
 */
export async function uploadImageToImgbb(
  fileOrBase64: File | Blob | string,
  fileName?: string,
  _ignoredApiKey?: string
): Promise<{
  url: string;
  displayUrl: string;
  thumbUrl?: string;
  isLocalFallback?: boolean;
  raw?: any;
}> {
  const result = await uploadImageToFirebase(fileOrBase64, fileName || 'user_profile');
  return {
    url: result.url,
    displayUrl: result.displayUrl,
    thumbUrl: result.thumbUrl,
    isLocalFallback: false,
    raw: {
      source: 'firebase_firestore',
      id: result.id,
      sizeBytes: result.sizeBytes,
      message: 'Stored directly in Firebase Cloud Database',
    },
  };
}

export function getSavedImgbbKey(): string {
  return '';
}

export function saveImgbbKey(_key: string): void {
  // No longer needed since Firebase Cloud storage is used
}
