import React, { useState, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import {
  X,
  FileImage,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Download,
  Plus,
  Loader2,
  Check,
  FolderDown,
  FileText,
  Eye,
  Search,
  CheckSquare,
  Square,
  Filter,
  GripVertical,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { qrUploadService } from '../services/qrUploadService';
import { QrUploadedFile } from '../types/qrUpload';
import { UserProfile } from '../types/auth';
import { APP_ASSETS } from '../constants/assets';

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export const STANDARD_CAP_DOCUMENTS = [
  { id: 'HSC_Marksheet', label: 'HSC (12th) Marksheet' },
  { id: 'SSC_Marksheet', label: 'SSC (10th) Marksheet' },
  { id: 'MHT_CET_Scorecard', label: 'MHT-CET Score Card' },
  { id: 'Leaving_Certificate_LC', label: 'Leaving Certificate (T.C. / L.C.)' },
  { id: 'Caste_Certificate', label: 'Caste Certificate' },
  { id: 'Caste_Validity_Certificate', label: 'Caste Validity Certificate' },
  { id: 'Non_Creamy_Layer_NCL', label: 'Non-Creamy Layer (NCL)' },
  { id: 'EWS_Eligibility_Certificate', label: 'EWS Eligibility Certificate' },
  { id: 'Income_Certificate', label: 'Tahsildar Income Certificate' },
  { id: 'Domicile_Certificate', label: 'Domicile Certificate' },
  { id: 'Nationality_Certificate', label: 'Nationality Certificate' },
  { id: 'Aadhaar_Card', label: 'Candidate Aadhaar Card' },
  { id: 'CAP_Allotment_Letter', label: 'CAP Seat Allotment Letter' },
  { id: 'Admission_Fee_Receipt', label: 'Admission Fee Receipt' },
  { id: 'Passport_Photo', label: 'Candidate Passport Photo' },
  { id: 'Candidate_Signature', label: 'Candidate Signature' },
  { id: 'CUSTOM', label: 'Other / Custom Document Name...' },
];

export const formatCombinedFileName = (cet: string, doc: string, custom: string): string => {
  const cleanCet = cet.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'CET2024XXXX';
  const cleanDoc =
    doc === 'CUSTOM'
      ? custom.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'Document'
      : doc;
  return `${cleanCet}_${cleanDoc}.pdf`;
};

interface ImgToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
}

type PageOrientation = 'auto' | 'portrait' | 'landscape';
type PageSize = 'a4' | 'letter' | 'fit';
type MarginSize = 'none' | 'small' | 'normal';
type ImageQuality = 'high' | 'medium' | 'low';

export const ImgToPdfModal: React.FC<ImgToPdfModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [images, setImages] = useState<ImageItem[]>([]);

  // Official Document Naming state (CET / CAP Format)
  const [cetNumber, setCetNumber] = useState('');
  const [docType, setDocType] = useState('HSC_Marksheet');
  const [customDocName, setCustomDocName] = useState('');

  // Page reorder drag & drop state
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  // Set Document Name Before Download Modal
  const [isSetNameModalOpen, setIsSetNameModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'preview' | null>(null);

  // Full PDF Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocData, setPreviewDocData] = useState<{
    doc: jsPDF;
    fileName: string;
    blob: Blob;
    blobUrl: string;
    pageCount: number;
  } | null>(null);

  const [orientation, setOrientation] = useState<PageOrientation>('auto');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [margin, setMargin] = useState<MarginSize>('none');
  const [quality, setQuality] = useState<ImageQuality>('high');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedVaultSuccess, setSavedVaultSuccess] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Software Vault browsing state
  const [isVaultPickerOpen, setIsVaultPickerOpen] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<QrUploadedFile[]>([]);
  const [selectedVaultFileIds, setSelectedVaultFileIds] = useState<string[]>([]);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState('ALL');
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFileToImageItem = (file: File): Promise<ImageItem> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
            file,
            name: file.name,
            size: file.size,
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            rotation: 0,
          });
        };
        img.onerror = () => reject(new Error('Failed to load image: ' + file.name));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files) as File[];
    await addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFiles = async (files: File[]) => {
    const validImageFiles = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/bmp', 'image/gif'].includes(
        f.type
      )
    );

    if (validImageFiles.length === 0) {
      alert('Please select valid image files (JPG, PNG, WebP, BMP)');
      return;
    }

    setIsProcessing(true);
    try {
      const newItems: ImageItem[] = [];
      for (const file of validImageFiles) {
        const item = await processFileToImageItem(file);
        newItems.push(item);
      }
      setImages((prev) => [...prev, ...newItems]);
      setPreviewPdfUrl(null);
      setSuccessMessage(null);
    } catch (err: any) {
      console.error('Error loading images:', err);
      alert('Failed to load some images: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const files = Array.from(e.dataTransfer.files) as File[];
    await addFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setPreviewPdfUrl(null);
  };

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          const nextRotation = (img.rotation + 90) % 360;
          return { ...img, rotation: nextRotation };
        }
        return img;
      })
    );
    setPreviewPdfUrl(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
    setPreviewPdfUrl(null);
  };

  const clearAll = () => {
    setImages([]);
    setPreviewPdfUrl(null);
    setSuccessMessage(null);
    setSavedVaultSuccess(false);
  };

  // Open Vault Picker
  const openVaultPicker = async () => {
    setIsLoadingVault(true);
    setIsVaultPickerOpen(true);
    setSelectedVaultFileIds([]);
    try {
      const allFiles = await qrUploadService.getAllVaultFilesAsync(currentUser);
      setVaultFiles(allFiles);
    } catch (err) {
      console.error('Error loading vault files:', err);
      const cached = qrUploadService.getAllVaultFiles(currentUser);
      setVaultFiles(cached);
    } finally {
      setIsLoadingVault(false);
    }
  };

  // Convert a dataURL to a File object
  const dataUrlToFile = (dataUrl: string, fileName: string): File => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  };

  // Add selected images from vault to PDF page list
  const handleAddSelectedFromVault = async () => {
    if (selectedVaultFileIds.length === 0) return;
    setIsProcessing(true);
    try {
      const selectedFiles = vaultFiles.filter((f) => selectedVaultFileIds.includes(f.id));
      const newItems: ImageItem[] = [];

      for (const vf of selectedFiles) {
        if (!vf.dataUrl || vf.type === 'application/pdf') continue;
        const fileObj = dataUrlToFile(vf.dataUrl, vf.name || 'Vault_Image.jpg');
        const item = await processFileToImageItem(fileObj);
        newItems.push(item);
      }

      setImages((prev) => [...prev, ...newItems]);
      setIsVaultPickerOpen(false);
      setSelectedVaultFileIds([]);
      setPreviewPdfUrl(null);
    } catch (err: any) {
      console.error('Error adding vault files to PDF:', err);
      alert('Failed to load selected vault files: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter vault files
  const eligibleVaultImages = vaultFiles.filter((f) => {
    const isImage =
      f.type.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(
        f.name.split('.').pop()?.toLowerCase() || ''
      );
    if (!isImage) return false;

    if (vaultSearchQuery.trim()) {
      const q = vaultSearchQuery.toLowerCase();
      const matchName = f.name?.toLowerCase().includes(q);
      const matchCat = f.category?.toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }

    if (vaultCategoryFilter !== 'ALL') {
      if (f.category !== vaultCategoryFilter) return false;
    }

    return true;
  });

  const getRotatedImageDataUrl = (
    dataUrl: string,
    rotation: number,
    targetQuality: ImageQuality
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      if (rotation === 0 && targetQuality === 'high') {
        const img = new Image();
        img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = dataUrl;
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
          return;
        }

        const isRotated90or270 = rotation === 90 || rotation === 270;
        canvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
        canvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        let encoderQuality = 0.95;
        if (targetQuality === 'medium') encoderQuality = 0.75;
        if (targetQuality === 'low') encoderQuality = 0.55;

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', encoderQuality);
        resolve({
          dataUrl: rotatedDataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const buildPdfDocument = async (
    customName?: string
  ): Promise<{ doc: jsPDF; fileName: string; blob: Blob; blobUrl: string }> => {
    let doc: jsPDF | null = null;
    const totalImages = images.length;

    for (let i = 0; i < totalImages; i++) {
      const item = images[i];
      setProcessingProgress(Math.round(((i + 1) / totalImages) * 90));

      const { dataUrl: processedDataUrl, width, height } = await getRotatedImageDataUrl(
        item.dataUrl,
        item.rotation,
        quality
      );

      let pageOrient: 'portrait' | 'landscape' = 'portrait';
      if (orientation === 'auto') {
        pageOrient = width > height ? 'landscape' : 'portrait';
      } else {
        pageOrient = orientation;
      }

      let pageWidthMm = 210;
      let pageHeightMm = 297;

      if (pageSize === 'letter') {
        pageWidthMm = pageOrient === 'landscape' ? 279.4 : 215.9;
        pageHeightMm = pageOrient === 'landscape' ? 215.9 : 279.4;
      } else if (pageSize === 'a4') {
        pageWidthMm = pageOrient === 'landscape' ? 297 : 210;
        pageHeightMm = pageOrient === 'landscape' ? 210 : 297;
      } else if (pageSize === 'fit') {
        const pxToMm = 0.264583;
        pageWidthMm = width * pxToMm;
        pageHeightMm = height * pxToMm;
      }

      if (i === 0) {
        doc = new jsPDF({
          orientation: pageOrient,
          unit: 'mm',
          format: pageSize === 'fit' ? [pageWidthMm, pageHeightMm] : pageSize,
        });
      } else if (doc) {
        doc.addPage(pageSize === 'fit' ? [pageWidthMm, pageHeightMm] : pageSize, pageOrient);
      }

      if (!doc) throw new Error('PDF document creation failed');

      let marginMm = 0;
      if (margin === 'small') marginMm = 10;
      if (margin === 'normal') marginMm = 20;

      const availWidth = pageWidthMm - marginMm * 2;
      const availHeight = pageHeightMm - marginMm * 2;

      const imgAspect = width / height;
      const pageAspect = availWidth / availHeight;

      let drawWidth = availWidth;
      let drawHeight = availHeight;

      if (imgAspect > pageAspect) {
        drawWidth = availWidth;
        drawHeight = drawWidth / imgAspect;
      } else {
        drawHeight = availHeight;
        drawWidth = drawHeight * imgAspect;
      }

      const posX = marginMm + (availWidth - drawWidth) / 2;
      const posY = marginMm + (availHeight - drawHeight) / 2;

      doc.addImage(processedDataUrl, 'JPEG', posX, posY, drawWidth, drawHeight, undefined, 'FAST');
    }

    if (!doc) throw new Error('No pages were generated.');

    const fileName =
      customName || formatCombinedFileName(cetNumber, docType, customDocName);

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return { doc, fileName, blob, blobUrl };
  };

  const handleInitiateDownload = () => {
    if (images.length === 0) return;
    if (!cetNumber.trim()) {
      setPendingAction('download');
      setIsSetNameModalOpen(true);
      return;
    }
    executeDownload();
  };

  const handleInitiatePreview = () => {
    if (images.length === 0) return;
    if (!cetNumber.trim()) {
      setPendingAction('preview');
      setIsSetNameModalOpen(true);
      return;
    }
    executePreview();
  };

  const executeDownload = async (customName?: string) => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setSuccessMessage(null);

    try {
      const { doc, fileName, blob, blobUrl } = await buildPdfDocument(customName);
      doc.save(fileName);
      setPreviewPdfUrl(blobUrl);
      setSuccessMessage(`Downloaded ${fileName} (${formatFileSize(blob.size)})`);
      setIsSetNameModalOpen(false);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const executePreview = async (customName?: string) => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setSuccessMessage(null);

    try {
      const { doc, fileName, blob, blobUrl } = await buildPdfDocument(customName);
      setPreviewDocData({
        doc,
        fileName,
        blob,
        blobUrl,
        pageCount: images.length,
      });
      setIsPreviewModalOpen(true);
      setIsSetNameModalOpen(false);
    } catch (err: any) {
      console.error('PDF preview generation error:', err);
      alert('Failed to generate PDF preview: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToVault = async (customName?: string) => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setSuccessMessage(null);

    try {
      const { doc, fileName, blob } = await buildPdfDocument(customName);
      const dataUri = doc.output('datauristring');

      qrUploadService.saveToSoftwareVault({
        id: 'pdf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        sessionId: 'img-to-pdf-converter',
        name: fileName,
        type: 'application/pdf',
        size: blob.size,
        dataUrl: dataUri,
        uploadedAt: new Date().toISOString(),
        isDownloadedToSoftware: true,
        verifiedStamp: false,
        category: 'Candidate Document',
      });

      setSavedVaultSuccess(true);
      setSuccessMessage(`Saved ${fileName} to Software Vault`);
    } catch (err: any) {
      console.error('Vault save error:', err);
      alert('Failed to save to vault: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="img-to-pdf-modal"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E0E2EC] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#1F1F1F]">
        {/* Google Files Top App Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-[#E0E2EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F1F3F4] text-[#0B57D0] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#0B57D0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-[#1F1F1F] tracking-tight">
                  Convert to PDF
                </h2>
                {images.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C2E7FF] text-[#001D35]">
                    {images.length} {images.length === 1 ? 'page' : 'pages'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            id="img-to-pdf-close-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full hover:bg-[#F1F3F4] flex items-center justify-center transition-colors text-[#444746] hover:text-[#1F1F1F] cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F8F9FA]">
          {/* Google Files Dropzone Card */}
          <div
            id="img-to-pdf-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-[#0B57D0] bg-[#E8F0FE]'
                : 'border-[#C4C7C5] hover:border-[#0B57D0] bg-white shadow-2xs'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#0B57D0] mx-auto flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6 text-[#0B57D0]" />
            </div>

            <p className="text-sm font-medium text-[#1F1F1F]">Drop images here or browse from device</p>
            <p className="text-xs text-[#747775] mt-1">Supports JPG, PNG, and WebP</p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                id="img-to-pdf-browse-pc-btn"
                className="px-4 py-2 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Plus className="w-4 h-4" />
                Browse files
              </button>

              <button
                type="button"
                id="img-to-pdf-browse-vault-btn"
                className="px-4 py-2 rounded-full border border-[#747775]/40 bg-white hover:bg-[#F1F3F4] text-[#1F1F1F] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openVaultPicker();
                }}
              >
                <FolderDown className="w-4 h-4 text-[#444746]" />
                From Software Vault
              </button>
            </div>
          </div>

          {/* Selected Images List */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#1F1F1F]">
                    {images.length} {images.length === 1 ? 'image' : 'images'}
                  </span>
                  <span className="text-[11px] text-[#747775]">
                    • {formatFileSize(images.reduce((acc, curr) => acc + curr.size, 0))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 rounded-full border border-[#747775]/30 bg-white hover:bg-[#F1F3F4] text-xs font-medium text-[#1F1F1F] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add more
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="px-3 py-1 rounded-full text-xs font-medium text-[#B3261E] hover:bg-[#F9DEDC]/50 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                </div>
              </div>

              {/* Image Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggedCardIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(idx));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverCardIndex !== idx) setDragOverCardIndex(idx);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverCardIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverCardIndex === idx) setDragOverCardIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedCardIndex(null);
                      setDragOverCardIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedCardIndex !== null && draggedCardIndex !== idx) {
                        setImages((prev) => {
                          const updated = [...prev];
                          const [moved] = updated.splice(draggedCardIndex, 1);
                          updated.splice(idx, 0, moved);
                          return updated;
                        });
                        setPreviewPdfUrl(null);
                      }
                      setDraggedCardIndex(null);
                      setDragOverCardIndex(null);
                    }}
                    className={`bg-white border rounded-2xl p-2.5 flex items-center gap-3 transition-all ${
                      dragOverCardIndex === idx
                        ? 'border-[#0B57D0] ring-2 ring-[#0B57D0]/20 bg-[#E8F0FE]'
                        : 'border-[#E0E2EC] hover:border-[#C4C7C5] shadow-2xs'
                    }`}
                  >
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-[#747775] hover:text-[#1F1F1F] p-1"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-13 h-13 rounded-xl bg-[#F1F3F4] border border-[#E0E2EC] overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                        style={{ transform: `rotate(${img.rotation}deg)` }}
                      />
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/70 text-white text-[9px] font-mono">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#1F1F1F] truncate" title={img.name}>
                        {img.name}
                      </p>
                      <p className="text-[11px] text-[#747775] mt-0.5">
                        {formatFileSize(img.size)}
                        {img.rotation > 0 && ` • ${img.rotation}°`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-full hover:bg-[#F1F3F4] text-[#444746] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1.5 rounded-full hover:bg-[#F1F3F4] text-[#444746] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => rotateImage(img.id)}
                        className="p-1.5 rounded-full hover:bg-[#F1F3F4] text-[#444746] cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="p-1.5 rounded-full hover:bg-[#F9DEDC] text-[#B3261E] cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Material 3 PDF Settings */}
          <div className="bg-white border border-[#E0E2EC] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-medium text-[#444746] uppercase tracking-wider">
              Page layout &amp; options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Orientation Chips */}
              <div>
                <span className="block text-xs font-medium text-[#1F1F1F] mb-2">Orientation</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: 'portrait', label: 'Portrait' },
                      { id: 'landscape', label: 'Landscape' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOrientation(id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        orientation === id
                          ? 'bg-[#C2E7FF] text-[#001D35]'
                          : 'bg-[#F1F3F4] text-[#444746] hover:bg-[#E0E2EC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Size Chips */}
              <div>
                <span className="block text-xs font-medium text-[#1F1F1F] mb-2">Page size</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'a4', label: 'A4' },
                      { id: 'letter', label: 'Letter' },
                      { id: 'fit', label: 'Fit to image' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPageSize(id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        pageSize === id
                          ? 'bg-[#C2E7FF] text-[#001D35]'
                          : 'bg-[#F1F3F4] text-[#444746] hover:bg-[#E0E2EC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin Chips */}
              <div>
                <span className="block text-xs font-medium text-[#1F1F1F] mb-2">Margins</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'none', label: 'None' },
                      { id: 'small', label: 'Small' },
                      { id: 'normal', label: 'Normal' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMargin(id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        margin === id
                          ? 'bg-[#C2E7FF] text-[#001D35]'
                          : 'bg-[#F1F3F4] text-[#444746] hover:bg-[#E0E2EC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Name Section */}
            <div className="pt-3 border-t border-[#E0E2EC] space-y-3">
              <span className="block text-xs font-medium text-[#444746]">File name</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#747775] mb-1">
                    Application / ID Number
                  </label>
                  <input
                    type="text"
                    value={cetNumber}
                    onChange={(e) => setCetNumber(e.target.value)}
                    placeholder="e.g. CET2024XXXX"
                    className="w-full text-xs bg-[#F8F9FA] border border-[#C4C7C5] focus:border-[#0B57D0] focus:bg-white rounded-xl px-3 py-2 text-[#1F1F1F] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#747775] mb-1">Document type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full text-xs bg-[#F8F9FA] border border-[#C4C7C5] focus:border-[#0B57D0] focus:bg-white rounded-xl px-3 py-2 text-[#1F1F1F] outline-none transition-colors"
                  >
                    {STANDARD_CAP_DOCUMENTS.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {docType === 'CUSTOM' && (
                <div>
                  <input
                    type="text"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    placeholder="Enter custom document name"
                    className="w-full text-xs bg-[#F8F9FA] border border-[#C4C7C5] focus:border-[#0B57D0] focus:bg-white rounded-xl px-3 py-2 text-[#1F1F1F] outline-none transition-colors"
                  />
                </div>
              )}

              <div className="text-[11px] text-[#747775] font-mono truncate">
                Preview: {formatCombinedFileName(cetNumber, docType, customDocName)}
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-[#E8F0FE] text-[#001D35] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#0B57D0] shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              {previewPdfUrl && (
                <button
                  type="button"
                  onClick={handleInitiatePreview}
                  className="px-3 py-1 rounded-full bg-[#0B57D0] text-white font-medium text-xs hover:bg-[#1A73E8] transition-colors cursor-pointer"
                >
                  Preview
                </button>
              )}
            </div>
          )}
        </div>

        {/* Google Files Bottom Action Bar */}
        <div className="px-6 py-4 bg-white border-t border-[#E0E2EC] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#747775]">
            {images.length > 0 ? (
              <span>{images.length} {images.length === 1 ? 'page' : 'pages'} ready</span>
            ) : (
              <span>No images selected</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Vault Save */}
            <button
              type="button"
              onClick={() => handleSaveToVault()}
              disabled={images.length === 0 || isProcessing}
              className="px-4 py-2 rounded-full border border-[#747775]/30 bg-white hover:bg-[#F1F3F4] text-xs font-medium text-[#1F1F1F] inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
              ) : savedVaultSuccess ? (
                <Check className="w-3.5 h-3.5 text-[#0B57D0]" />
              ) : (
                <FolderDown className="w-3.5 h-3.5 text-[#444746]" />
              )}
              <span>Save to Vault</span>
            </button>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handleInitiatePreview}
              disabled={images.length === 0 || isProcessing}
              className="px-4 py-2 rounded-full border border-[#0B57D0] text-[#0B57D0] hover:bg-[#E8F0FE] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            {/* Primary Save as PDF Button */}
            <button
              type="button"
              onClick={handleInitiateDownload}
              disabled={images.length === 0 || isProcessing}
              className="px-6 py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting ({processingProgress}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Google Files Software Vault Picker */}
      {isVaultPickerOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsVaultPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-[#E0E2EC] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-[#1F1F1F]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Vault Picker Header */}
            <div className="px-5 py-3.5 bg-white border-b border-[#E0E2EC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderDown className="w-5 h-5 text-[#0B57D0]" />
                <h3 className="text-sm font-medium text-[#1F1F1F]">Select from Software Vault</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVaultPickerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] flex items-center justify-center text-[#444746]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-4 border-b border-[#E0E2EC] bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#747775]" />
                <input
                  type="text"
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  placeholder="Search vault files..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#C4C7C5] focus:border-[#0B57D0] rounded-full outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const eligibleIds = eligibleVaultImages.map((f) => f.id);
                  const allSelected =
                    eligibleIds.length > 0 &&
                    eligibleIds.every((id) => selectedVaultFileIds.includes(id));
                  if (allSelected) {
                    setSelectedVaultFileIds([]);
                  } else {
                    setSelectedVaultFileIds(eligibleIds);
                  }
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#747775]/30 hover:bg-white text-[#1F1F1F] cursor-pointer"
              >
                {eligibleVaultImages.length > 0 &&
                eligibleVaultImages.every((f) => selectedVaultFileIds.includes(f.id))
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            </div>

            {/* Vault Files Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {eligibleVaultImages.length === 0 ? (
                <div className="py-12 text-center text-[#747775] text-xs">
                  No images found in Software Vault.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {eligibleVaultImages.map((file) => {
                    const isSelected = selectedVaultFileIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedVaultFileIds((prev) =>
                            prev.includes(file.id)
                              ? prev.filter((id) => id !== file.id)
                              : [...prev, file.id]
                          );
                        }}
                        className={`relative rounded-2xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#0B57D0] ring-2 ring-[#0B57D0]/20 bg-[#E8F0FE]'
                            : 'border-[#E0E2EC] bg-white hover:border-[#C4C7C5]'
                        }`}
                      >
                        <div className="w-full aspect-4/3 rounded-xl overflow-hidden mb-2 bg-[#F1F3F4]">
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs font-medium text-[#1F1F1F] truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[#747775] mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vault Picker Footer */}
            <div className="px-5 py-3.5 bg-white border-t border-[#E0E2EC] flex items-center justify-between">
              <span className="text-xs text-[#747775]">
                {selectedVaultFileIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVaultPickerOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#444746] hover:bg-[#F1F3F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedFromVault}
                  disabled={selectedVaultFileIds.length === 0}
                  className="px-5 py-2 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs font-medium disabled:opacity-40 shadow-xs cursor-pointer"
                >
                  Add to PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Official Document Name Modal */}
      {isSetNameModalOpen && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsSetNameModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E0E2EC] w-full max-w-md overflow-hidden text-[#1F1F1F]">
            <div className="px-5 py-3.5 bg-white border-b border-[#E0E2EC] flex items-center justify-between">
              <h3 className="text-sm font-medium text-[#1F1F1F]">File name</h3>
              <button
                type="button"
                onClick={() => setIsSetNameModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] flex items-center justify-center text-[#444746]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1.5">
                  Application / ID Number
                </label>
                <input
                  type="text"
                  autoFocus
                  value={cetNumber}
                  onChange={(e) => setCetNumber(e.target.value)}
                  placeholder="e.g. CET2024XXXX"
                  className="w-full text-xs bg-[#F8F9FA] border border-[#C4C7C5] focus:border-[#0B57D0] focus:bg-white rounded-xl px-3 py-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1.5">
                  Document type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs bg-[#F8F9FA] border border-[#C4C7C5] focus:border-[#0B57D0] focus:bg-white rounded-xl px-3 py-2.5 outline-none"
                >
                  {STANDARD_CAP_DOCUMENTS.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-[#E8F0FE] text-xs font-mono text-[#001D35] truncate">
                {formatCombinedFileName(cetNumber, docType, customDocName)}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-white border-t border-[#E0E2EC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSetNameModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#444746] hover:bg-[#F1F3F4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingAction === 'preview') executePreview();
                  else executeDownload();
                }}
                className="px-5 py-2 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs font-medium shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {isPreviewModalOpen && previewDocData && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsPreviewModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E0E2EC] w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-white border-b border-[#E0E2EC] flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-[#1F1F1F] truncate">
                  {previewDocData.fileName}
                </h3>
                <span className="text-[11px] text-[#747775]">
                  {previewDocData.pageCount} {previewDocData.pageCount === 1 ? 'page' : 'pages'} • {formatFileSize(previewDocData.blob.size)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    previewDocData.doc.save(previewDocData.fileName);
                    setSuccessMessage(`Downloaded ${previewDocData.fileName}`);
                  }}
                  className="px-4 py-2 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs font-medium shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] flex items-center justify-center text-[#444746]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#F1F3F4] p-3">
              <iframe
                src={`${previewDocData.blobUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full rounded-2xl border border-[#E0E2EC] bg-white shadow-xs"
                title="PDF Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
