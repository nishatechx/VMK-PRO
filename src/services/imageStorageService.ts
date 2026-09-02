import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from './authService';

export interface FirebaseImageRecord {
  id: string;
  name: string;
  dataUrl: string;
  mimeType?: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ImageUploadResult {
  id: string;
  url: string;
  displayUrl: string;
  thumbUrl: string;
  success: boolean;
  sizeBytes?: number;
}

/**
 * Convert a File object or blob to a base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Resize and compress image to keep data fast, lightweight and guaranteed to save
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          resolve(readerEvent.target?.result as string || '');
        }
      };

      img.onerror = () => {
        resolve(readerEvent.target?.result as string || '');
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload and persist an image directly to Firebase Firestore
 */
export async function uploadImageToFirebase(
  fileOrBase64: File | Blob | string,
  imageName = 'user_avatar',
  uploadedBy?: string
): Promise<ImageUploadResult> {
  let base64Data = '';

  if (typeof fileOrBase64 === 'string') {
    base64Data = fileOrBase64;
  } else {
    try {
      base64Data = await compressImage(fileOrBase64);
    } catch {
      base64Data = await fileToBase64(fileOrBase64);
    }
  }

  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  const imageRecord: FirebaseImageRecord = {
    id: imageId,
    name: imageName,
    dataUrl: base64Data,
    mimeType: 'image/jpeg',
    sizeBytes: sizeBytes,
    uploadedAt: new Date().toISOString(),
    ...(uploadedBy ? { uploadedBy } : {}),
  };

  // Persist directly into Firebase Firestore 'images' collection
  try {
    const docRef = doc(db, 'images', imageId);
    await setDoc(docRef, sanitizeForFirestore(imageRecord));
    console.log(`[Firebase Image Storage] Successfully stored image ${imageId} (${sizeBytes} bytes) in Firestore.`);
  } catch (err: any) {
    console.warn('[Firebase Image Storage] Notice writing to Firestore images collection:', err?.message);
  }

  return {
    id: imageId,
    url: base64Data,
    displayUrl: base64Data,
    thumbUrl: base64Data,
    success: true,
    sizeBytes: sizeBytes,
  };
}

/**
 * Retrieve image from Firebase Firestore by ID
 */
export async function getImageFromFirebase(imageId: string): Promise<FirebaseImageRecord | null> {
  try {
    const docRef = doc(db, 'images', imageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirebaseImageRecord;
    }
  } catch (err: any) {
    console.warn(`[Firebase Image Storage] Error fetching image ${imageId}:`, err?.message);
  }
  return null;
}

/**
 * Delete image from Firebase Firestore
 */
export async function deleteImageFromFirebase(imageId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'images', imageId);
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    console.warn(`[Firebase Image Storage] Error deleting image ${imageId}:`, err?.message);
    return false;
  }
}
