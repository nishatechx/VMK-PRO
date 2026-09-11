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
  ShieldCheck,
  GripVertical,
  ExternalLink,
  Sparkles,
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
  const cleanDoc = doc === 'CUSTOM'
    ? (custom.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'Document')
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
  
  // Official Document Naming state (CET / CAP Format: e.g., CET2024XXXX_HSC_Marksheet.pdf)
  const [cetNumber, setCetNumber] = useState('');
  const [docType, setDocType] = useState('HSC_Marksheet');
  const [customDocName, setCustomDocName] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');

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
        img.onerror = reject;
        img.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processVaultFileToImageItem = (vaultFile: QrUploadedFile): Promise<ImageItem> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let file: File;
        try {
          const arr = vaultFile.dataUrl.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : (vaultFile.type || 'image/jpeg');
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          file = new File([u8arr], vaultFile.name, { type: mime });
        } catch {
          file = new File([], vaultFile.name, { type: vaultFile.type || 'image/jpeg' });
        }

        resolve({
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
          file,
          name: vaultFile.name,
          size: vaultFile.size || file.size || 0,
          dataUrl: vaultFile.dataUrl,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          rotation: 0,
        });
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image from vault: ${vaultFile.name}`));
      };
      img.src = vaultFile.dataUrl;
    });
  };

  const openVaultPicker = async () => {
    setIsVaultPickerOpen(true);
    setSelectedVaultFileIds([]);
    setVaultSearchQuery('');
    setVaultCategoryFilter('ALL');
    setIsLoadingVault(true);

    // Synchronous read first for instant rendering
    const cached = qrUploadService.getAllVaultFiles();
    setVaultFiles(cached);

    // Fetch async from firestore/server
    try {
      const fresh = await qrUploadService.getAllVaultFilesAsync();
      if (Array.isArray(fresh) && fresh.length > 0) {
        setVaultFiles(fresh);
      }
    } catch (e) {
      console.warn('Could not refresh vault files async:', e);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleAddSelectedFromVault = async () => {
    if (selectedVaultFileIds.length === 0) return;
    const selectedFiles = vaultFiles.filter((f) => selectedVaultFileIds.includes(f.id));

    try {
      setIsProcessing(true);
      const newItems: ImageItem[] = [];
      for (const f of selectedFiles) {
        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          continue;
        }
        const item = await processVaultFileToImageItem(f);
        newItems.push(item);
      }

      if (newItems.length > 0) {
        setImages((prev) => [...prev, ...newItems]);
        setSuccessMessage(`Added ${newItems.length} image${newItems.length > 1 ? 's' : ''} from Software Vault`);
        setSavedVaultSuccess(false);
        setPreviewPdfUrl(null);

        if (images.length === 0 && newItems.length > 0) {
          const baseName = newItems[0].name.replace(/\.[^/.]+$/, '');
          setPdfFileName(`${baseName}.pdf`);
        }
      }
      setIsVaultPickerOpen(false);
      setSelectedVaultFileIds([]);
    } catch (err) {
      console.error('Error adding images from vault:', err);
      alert('Failed to load selected image(s) from vault');
    } finally {
      setIsProcessing(false);
    }
  };

  const isImageFile = (f: QrUploadedFile) =>
    f.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name) ||
    (f.dataUrl && f.dataUrl.startsWith('data:image/'));

  const eligibleVaultImages = vaultFiles.filter((f) => {
    if (!isImageFile(f)) return false;
    if (vaultCategoryFilter !== 'ALL' && f.category !== vaultCategoryFilter) {
      return false;
    }
    if (vaultSearchQuery.trim()) {
      const q = vaultSearchQuery.toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchCategory = (f.category || '').toLowerCase().includes(q);
      return matchName || matchCategory;
    }
    return true;
  });

  const availableCategories = Array.from(
    new Set(vaultFiles.filter(isImageFile).map((f) => f.category || 'General Document'))
  );

  const handleFilesAdded = async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name)
    );
    if (validFiles.length === 0) return;

    try {
      const newItems = await Promise.all(validFiles.map(processFileToImageItem));
      setImages((prev) => [...prev, ...newItems]);
      setSuccessMessage(null);
      setSavedVaultSuccess(false);
      setPreviewPdfUrl(null);

      // Auto-set output filename from first image name if default
      if (images.length === 0 && newItems.length > 0) {
        const baseName = newItems[0].name.replace(/\.[^/.]+$/, '');
        setPdfFileName(`${baseName}.pdf`);
      }
    } catch (err) {
      console.error('Error reading image files:', err);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
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
    setSuccessMessage(null);
    setSavedVaultSuccess(false);
  };

  const clearAll = () => {
    setImages([]);
    setSuccessMessage(null);
    setSavedVaultSuccess(false);
    setPreviewPdfUrl(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const newRot = (img.rotation + 90) % 360;
        return { ...img, rotation: newRot };
      })
    );
  };

  // Helper to render image onto canvas with rotation and quality setting
  const getRenderedImageData = (
    imgItem: ImageItem,
    qualitySetting: ImageQuality
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const rot = imgItem.rotation % 360;
        const isSwap = rot === 90 || rot === 270;
        const canvas = document.createElement('canvas');
        canvas.width = isSwap ? img.naturalHeight : img.naturalWidth;
        canvas.height = isSwap ? img.naturalWidth : img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: imgItem.dataUrl, width: imgItem.width, height: imgItem.height });
          return;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const qualityFactor = qualitySetting === 'high' ? 0.95 : qualitySetting === 'medium' ? 0.8 : 0.6;
        const exportUrl = canvas.toDataURL('image/jpeg', qualityFactor);
        resolve({ dataUrl: exportUrl, width: canvas.width, height: canvas.height });
      };
      img.src = imgItem.dataUrl;
    });
  };

  // Build jsPDF instance
  const buildPdfDocument = async (
    overrideFileName?: string
  ): Promise<{ doc: jsPDF; fileName: string; blob: Blob; blobUrl: string }> => {
    if (images.length === 0) {
      throw new Error('No images to convert');
    }

    const marginMm = margin === 'none' ? 0 : margin === 'small' ? 10 : 20;
    let doc: jsPDF | null = null;

    for (let i = 0; i < images.length; i++) {
      setProcessingProgress(Math.round(((i + 1) / images.length) * 100));
      const imgItem = images[i];
      const { dataUrl, width: imgW, height: imgH } = await getRenderedImageData(imgItem, quality);

      let pageOrient: 'portrait' | 'landscape';
      if (orientation === 'auto') {
        pageOrient = imgW >= imgH ? 'landscape' : 'portrait';
      } else {
        pageOrient = orientation;
      }

      if (pageSize === 'fit') {
        // Fit page to image dimensions
        const pxToMm = 0.264583;
        const pageW = imgW * pxToMm + marginMm * 2;
        const pageH = imgH * pxToMm + marginMm * 2;
        const fitOrient = pageW >= pageH ? 'landscape' : 'portrait';

        if (i === 0) {
          doc = new jsPDF({
            orientation: fitOrient,
            unit: 'mm',
            format: [pageW, pageH],
          });
        } else if (doc) {
          doc.addPage([pageW, pageH], fitOrient);
        }

        if (doc) {
          doc.addImage(dataUrl, 'JPEG', marginMm, marginMm, imgW * pxToMm, imgH * pxToMm, undefined, 'FAST');
        }
      } else {
        // A4 or Letter
        const standardFormat = pageSize === 'letter' ? 'letter' : 'a4';
        const pageDim = standardFormat === 'letter'
          ? (pageOrient === 'portrait' ? { w: 215.9, h: 279.4 } : { w: 279.4, h: 215.9 })
          : (pageOrient === 'portrait' ? { w: 210, h: 297 } : { w: 297, h: 210 });

        if (i === 0) {
          doc = new jsPDF({
            orientation: pageOrient,
            unit: 'mm',
            format: standardFormat,
          });
        } else if (doc) {
          doc.addPage(standardFormat, pageOrient);
        }

        if (doc) {
          const availW = pageDim.w - marginMm * 2;
          const availH = pageDim.h - marginMm * 2;

          const scale = Math.min(availW / imgW, availH / imgH);
          const renderW = imgW * scale;
          const renderH = imgH * scale;

          const posX = marginMm + (availW - renderW) / 2;
          const posY = marginMm + (availH - renderH) / 2;

          doc.addImage(dataUrl, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
        }
      }
    }

    if (!doc) throw new Error('Failed to create PDF document');

    const cleanName = overrideFileName?.trim()
      ? (overrideFileName.trim().toLowerCase().endsWith('.pdf') ? overrideFileName.trim() : `${overrideFileName.trim()}.pdf`)
      : formatCombinedFileName(cetNumber, docType, customDocName);

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    return { doc, fileName: cleanName, blob, blobUrl };
  };

  // Initiate Download: prompts for CET/CAP number and document name if CET number is blank
  const handleInitiateDownload = () => {
    if (images.length === 0) return;
    if (!cetNumber.trim()) {
      setPendingAction('download');
      setIsSetNameModalOpen(true);
      return;
    }
    executeDownload();
  };

  // Initiate Preview: prompts for CET/CAP number and document name if CET number is blank, or opens preview directly
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
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D9E1EA] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#003B73] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-white/30 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              <img src={APP_ASSETS.IMAGE_TO_PDF} alt="Image to PDF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Image to PDF</h2>
            </div>
          </div>

          <button
            id="img-to-pdf-close-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Dropzone / Image Uploader */}
          <div
            id="img-to-pdf-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-[#0056A6] bg-[#0056A6]/5'
                : 'border-[#D9E1EA] hover:border-[#0056A6] bg-[#F7F9FC]'
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

            <div className="w-12 h-12 rounded-xl bg-white border border-[#D9E1EA] text-[#0056A6] mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-[#1F2937]">Select or drop images</p>
            <p className="text-xs text-[#6B7280] mt-1">JPG, PNG, WebP, BMP</p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
              <button
                type="button"
                id="img-to-pdf-browse-pc-btn"
                className="px-3.5 py-1.5 rounded-lg bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Browse Computer
              </button>

              <button
                type="button"
                id="img-to-pdf-browse-vault-btn"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openVaultPicker();
                }}
              >
                <FolderDown className="w-3.5 h-3.5" />
                Browse from Vault
              </button>
            </div>
          </div>

          {/* Selected Images List */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9E1EA]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1F2937]">
                    {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    Total: {formatFileSize(images.reduce((acc, curr) => acc + curr.size, 0))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-md border border-[#D9E1EA] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#1F2937] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Computer Files
                  </button>

                  <button
                    type="button"
                    id="img-to-pdf-add-vault-btn"
                    onClick={openVaultPicker}
                    className="px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                    title="Browse and add files from Software Vault"
                  >
                    <FolderDown className="w-3 h-3 text-emerald-700" />
                    From Vault
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="px-2.5 py-1 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[11px] font-semibold text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Drag & Drop Reorder Tip */}
              <div className="flex items-center justify-between text-[11px] text-[#4B5563] pb-0.5">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                  <GripVertical className="w-3.5 h-3.5 text-[#0056A6]" />
                  Drag cards by handle to reorder pages, or use arrow buttons:
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {images.length} {images.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>

              {/* Image Items Grid / List */}
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
                      if (dragOverCardIndex !== idx) {
                        setDragOverCardIndex(idx);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverCardIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverCardIndex === idx) {
                        setDragOverCardIndex(null);
                      }
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
                    className={`flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-xl border transition-all select-none ${
                      draggedCardIndex === idx
                        ? 'opacity-40 border-dashed border-[#0056A6] bg-blue-50/50'
                        : dragOverCardIndex === idx
                        ? 'border-[#0056A6] ring-2 ring-[#0056A6]/30 bg-blue-50/70 scale-[1.01]'
                        : 'border-[#D9E1EA] bg-white hover:border-[#0056A6] shadow-2xs'
                    }`}
                  >
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-[#0056A6] transition-colors shrink-0"
                      title="Click and drag to reorder page"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-cover transition-transform duration-150"
                        style={{ transform: `rotate(${img.rotation}deg)` }}
                      />
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/75 text-white text-[9px] font-mono font-bold">
                        P.{idx + 1}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1F2937] truncate" title={img.name}>
                        {img.name}
                      </p>
                      <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                        {img.width}×{img.height} • {formatFileSize(img.size)}
                        {img.rotation > 0 && ` • ${img.rotation}°`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-100 text-[#4B5563] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1 rounded hover:bg-slate-100 text-[#4B5563] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => rotateImage(img.id)}
                        className="p-1 rounded hover:bg-slate-100 text-[#4B5563] cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
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

          {/* Settings Section */}
          <div className="bg-[#F7F9FC] border border-[#D9E1EA] rounded-xl p-3.5 sm:p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              PDF Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Orientation */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PageOrientation)}
                  className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-2.5 py-1.5 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                >
                  <option value="auto">Auto (Match Image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSize)}
                  className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-2.5 py-1.5 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter</option>
                  <option value="fit">Fit to Image Size</option>
                </select>
              </div>

              {/* Margins */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Margin
                </label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(e.target.value as MarginSize)}
                  className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-2.5 py-1.5 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                >
                  <option value="none">None (0 mm)</option>
                  <option value="small">Small (10 mm)</option>
                  <option value="normal">Normal (20 mm)</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Compression
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as ImageQuality)}
                  className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-2.5 py-1.5 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                >
                  <option value="high">High (Best quality)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="low">Low (Small file size)</option>
                </select>
              </div>
            </div>

            {/* Official Document Naming Structure (CET/CAP Format) */}
            <div className="pt-2 border-t border-slate-200">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0056A6]" />
                    <h4 className="text-xs font-bold text-[#003B73] uppercase tracking-wide">
                      Official Document Naming (CET / CAP Format)
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                    Required for Admission Portal
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CET / CAP Application ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#1F2937] mb-1">
                      CET / CAP Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cetNumber}
                      onChange={(e) => setCetNumber(e.target.value)}
                      placeholder="e.g., CET2024XXXX or EN26102345"
                      className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-3 py-2 text-[#1F2937] font-mono focus:outline-none focus:border-[#0056A6] focus:ring-1 focus:ring-[#0056A6]"
                    />
                  </div>

                  {/* Document Name Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#1F2937] mb-1">
                      Document Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                    >
                      {STANDARD_CAP_DOCUMENTS.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Document Name if CUSTOM selected */}
                {docType === 'CUSTOM' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                      Specify Custom Document Name
                    </label>
                    <input
                      type="text"
                      value={customDocName}
                      onChange={(e) => setCustomDocName(e.target.value)}
                      placeholder="e.g., Gap_Affidavit or Sports_Certificate"
                      className="w-full text-xs bg-white border border-[#D9E1EA] rounded-lg px-3 py-1.5 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                    />
                  </div>
                )}

                {/* Combined Filename Result Preview */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/60 text-xs">
                  <span className="text-slate-600 font-medium text-[11px]">
                    Combined File Name:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#003B73] bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
                      {formatCombinedFileName(cetNumber, docType, customDocName)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAction('download');
                        setIsSetNameModalOpen(true);
                      }}
                      className="text-[10px] text-[#0056A6] hover:underline font-semibold cursor-pointer"
                    >
                      Edit Name Dialog
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              {previewPdfUrl && (
                <button
                  type="button"
                  onClick={handleInitiatePreview}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold text-[11px] inline-flex items-center gap-1 hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  Preview PDF
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-[#D9E1EA] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#6B7280]">
            {images.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{images.length} {images.length === 1 ? 'page' : 'pages'} ready</span>
                <span className="text-slate-400 font-mono text-[11px] ml-1">
                  ({formatCombinedFileName(cetNumber, docType, customDocName)})
                </span>
              </span>
            ) : (
              <span>No images selected</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Save to Software Vault */}
            <button
              type="button"
              onClick={() => handleSaveToVault()}
              disabled={images.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-50 text-xs font-semibold text-[#1F2937] inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              title="Save directly into candidate's secure Software Vault"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0056A6]" />
              ) : savedVaultSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <FolderDown className="w-3.5 h-3.5 text-[#0056A6]" />
              )}
              <span>Vault</span>
            </button>

            {/* Preview PDF Button */}
            <button
              id="img-to-pdf-preview-btn"
              type="button"
              onClick={handleInitiatePreview}
              disabled={images.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-[#0056A6] bg-white hover:bg-blue-50 text-xs font-semibold text-[#0056A6] inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              title="Preview PDF before downloading"
            >
              <Eye className="w-3.5 h-3.5 text-[#0056A6]" />
              <span>Preview PDF</span>
            </button>

            {/* Download PDF Button */}
            <button
              id="img-to-pdf-convert-btn"
              type="button"
              onClick={handleInitiateDownload}
              disabled={images.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting ({processingProgress}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Software Vault Image Picker Modal */}
      {isVaultPickerOpen && (
        <div
          id="vault-image-picker-overlay"
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsVaultPickerOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-[#003B73] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <FolderDown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight">
                    Browse Files from Software Vault
                  </h3>
                  <p className="text-[11px] text-white/75">
                    Select stored photos or documents to add as pages in your PDF
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="vault-picker-close-btn"
                onClick={() => setIsVaultPickerOpen(false)}
                disabled={isProcessing}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3.5 sm:p-4 bg-[#F7F9FC] border-b border-[#D9E1EA] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  placeholder="Search files by name or category..."
                  className="w-full text-xs bg-white border border-[#D9E1EA] rounded-xl pl-9 pr-8 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0056A6]"
                />
                {vaultSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setVaultSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {availableCategories.length > 0 && (
                  <select
                    value={vaultCategoryFilter}
                    onChange={(e) => setVaultCategoryFilter(e.target.value)}
                    className="text-xs bg-white border border-[#D9E1EA] rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#0056A6]"
                  >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const eligibleIds = eligibleVaultImages.map((f) => f.id);
                    const allSelected =
                      eligibleIds.length > 0 &&
                      eligibleIds.every((id) => selectedVaultFileIds.includes(id));
                    if (allSelected) {
                      setSelectedVaultFileIds((prev) =>
                        prev.filter((id) => !eligibleIds.includes(id))
                      );
                    } else {
                      setSelectedVaultFileIds((prev) =>
                        Array.from(new Set([...prev, ...eligibleIds]))
                      );
                    }
                  }}
                  disabled={eligibleVaultImages.length === 0}
                  className="px-3 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {eligibleVaultImages.length > 0 &&
                  eligibleVaultImages.every((f) => selectedVaultFileIds.includes(f.id)) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-[#0056A6]" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Grid of Vault Files */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[220px]">
              {isLoadingVault && vaultFiles.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0056A6]" />
                  <p className="text-xs">Loading documents from Software Vault...</p>
                </div>
              ) : eligibleVaultImages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <FolderDown className="w-10 h-10 text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">No matching images in vault</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {vaultFiles.length === 0
                      ? 'Upload images via Mobile QR Upload or Computer to store them in your Software Vault.'
                      : 'Try changing your search keywords or category filter.'}
                  </p>
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
                        className={`relative rounded-xl border p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#0056A6] bg-blue-50/40 shadow-xs ring-2 ring-[#0056A6]/20'
                            : 'border-[#D9E1EA] bg-white hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        {/* Selection Checkmark Badge */}
                        <div
                          className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-colors z-10 ${
                            isSelected
                              ? 'bg-[#0056A6] text-white shadow-2xs'
                              : 'bg-black/35 text-white/80 hover:bg-black/55'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-full aspect-4/3 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden mb-2 relative flex items-center justify-center">
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          {file.category && (
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium truncate max-w-[90%]">
                              {file.category}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate leading-tight ${
                              isSelected ? 'text-[#0056A6]' : 'text-slate-800'
                            }`}
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="px-5 py-3.5 bg-white border-t border-[#D9E1EA] flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {selectedVaultFileIds.length}
                </span>{' '}
                of {eligibleVaultImages.length} images selected
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVaultPickerOpen(false)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="vault-picker-add-btn"
                  onClick={handleAddSelectedFromVault}
                  disabled={selectedVaultFileIds.length === 0 || isProcessing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>
                    Add {selectedVaultFileIds.length > 0 ? `(${selectedVaultFileIds.length})` : ''} to PDF
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Official Document Name Modal (Before Download / Preview) */}
      {isSetNameModalOpen && (
        <div
          id="set-name-modal-overlay"
          className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsSetNameModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-[#003B73] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight">
                    Set Official Document Name
                  </h3>
                  <p className="text-[11px] text-white/75">
                    CET / CAP combined naming structure for admission upload
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSetNameModalOpen(false)}
                disabled={isProcessing}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4">
              {/* CET / CAP Application ID */}
              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                  1. CET / CAP Application ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={cetNumber}
                  onChange={(e) => setCetNumber(e.target.value)}
                  placeholder="e.g., CET2024XXXX or EN26123456"
                  className="w-full text-xs font-mono bg-slate-50 border border-[#D9E1EA] rounded-xl px-3 py-2.5 text-[#1F2937] focus:bg-white focus:outline-none focus:border-[#0056A6] focus:ring-1 focus:ring-[#0056A6]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your official application or candidate ID from Maharashtra CET Cell.
                </p>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                  2. Document Name / Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-[#D9E1EA] rounded-xl px-3 py-2.5 text-[#1F2937] focus:bg-white focus:outline-none focus:border-[#0056A6]"
                >
                  {STANDARD_CAP_DOCUMENTS.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Document Name if CUSTOM selected */}
              {docType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                    Custom Document Title
                  </label>
                  <input
                    type="text"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    placeholder="e.g., Gap_Affidavit or Sports_Certificate"
                    className="w-full text-xs bg-white border border-[#D9E1EA] rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#0056A6]"
                  />
                </div>
              )}

              {/* Result Preview Box */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 space-y-1">
                <span className="text-[11px] font-semibold text-blue-900 block">
                  Generated File Name Preview:
                </span>
                <div className="font-mono text-xs font-bold text-[#003B73] break-all bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                  {formatCombinedFileName(cetNumber, docType, customDocName)}
                </div>
                <p className="text-[10px] text-blue-700 pt-0.5">
                  Example: CET2024XXXX_HSC_Marksheet.pdf
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-[#D9E1EA] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSetNameModalOpen(false)}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {/* Preview PDF Option */}
                <button
                  type="button"
                  onClick={() => executePreview()}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-xl border border-[#0056A6] bg-white hover:bg-blue-50 text-xs font-semibold text-[#0056A6] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5 text-[#0056A6]" />
                  <span>Preview PDF</span>
                </button>

                {/* Confirm & Download PDF */}
                <button
                  type="button"
                  onClick={() => executeDownload()}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {isPreviewModalOpen && previewDocData && (
        <div
          id="pdf-preview-modal-overlay"
          className="fixed inset-0 z-80 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsPreviewModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Preview Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-[#003B73] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate font-mono" title={previewDocData.fileName}>
                    {previewDocData.fileName}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-white/80">
                    <span className="bg-white/15 px-1.5 py-0.2 rounded font-medium">
                      {previewDocData.pageCount} {previewDocData.pageCount === 1 ? 'Page' : 'Pages'}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(previewDocData.blob.size)}</span>
                  </div>
                </div>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-2">
                {/* Save to Vault */}
                <button
                  type="button"
                  onClick={() => handleSaveToVault(previewDocData.fileName)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Save to Software Vault"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save to Vault</span>
                </button>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={() => {
                    previewDocData.doc.save(previewDocData.fileName);
                    setSuccessMessage(`Downloaded ${previewDocData.fileName} (${formatFileSize(previewDocData.blob.size)})`);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Close Preview */}
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer ml-1"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-3 relative overflow-hidden flex flex-col">
              <iframe
                src={`${previewDocData.blobUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-inner"
                title="PDF Document Preview"
              />
            </div>

            {/* Preview Footer */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-[#D9E1EA] flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>PDF generated and verified. Ready for CET portal upload.</span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={previewDocData.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0056A6] hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-3 py-1 rounded-lg border border-[#D9E1EA] bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Back to Adjust Pages
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
