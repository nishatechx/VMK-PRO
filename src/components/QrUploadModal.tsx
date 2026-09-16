import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  UploadCloud,
  FileText,
  FileImage,
  Trash2,
  ExternalLink,
  Eye,
  Plus,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  Link as LinkIcon,
  LayoutGrid,
  List,
  MoreVertical,
  Printer,
  Image as ImageIcon,
  ChevronDown,
  Crop,
  Sparkles,
  Camera,
  RotateCw,
} from 'lucide-react';
import {
  QrUploadedFile,
  formatBytes,
  fileToDataUrl,
  triggerFileDownload,
  printDocumentDirectly,
} from '../types/qrUpload';
import { qrUploadService } from '../services/qrUploadService';
import { InSoftwareDocumentViewer } from './InSoftwareDocumentViewer';
import { SmartCropModal } from './SmartCropModal';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { autoCropAndOptimizeDocument } from '../utils/documentVision';
import { APP_ASSETS } from '../constants/assets';

interface QrUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImgToPdf?: () => void;
}

// Format date matching the screenshot: "9 Sep 2026, 09:53 AM"
function formatDocumentDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return 'Recently';
  }
}

export const QrUploadModal: React.FC<QrUploadModalProps> = ({ isOpen, onClose, onOpenImgToPdf }) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    return 'VMK-' + Math.floor(100000 + Math.random() * 900000);
  });

  // Display mode: 'upload' (default: only upload options) | 'vault' (software vault) | 'dual' (split view)
  const [activeTab, setActiveTab] = useState<'upload' | 'vault' | 'dual'>('upload');
  const [vaultFiles, setVaultFiles] = useState<QrUploadedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'image' | 'verified'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'name' | 'size'>('latest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedSession, setCopiedSession] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<QrUploadedFile | null>(null);
  const [cropTargetFile, setCropTargetFile] = useState<QrUploadedFile | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({
    text: '',
    type: '',
  });

  // AI & Computer Vision Auto-Cropping States
  const [autoCropOnUpload, setAutoCropOnUpload] = useState<boolean>(true);
  const [isProcessingAutoCrop, setIsProcessingAutoCrop] = useState<boolean>(false);
  const [autoCropProgressText, setAutoCropProgressText] = useState<string>('');
  const [showLiveCameraModal, setShowLiveCameraModal] = useState<boolean>(false);
  const [showScanChoiceModal, setShowScanChoiceModal] = useState<boolean>(false);
  const [newUploadCropFile, setNewUploadCropFile] = useState<QrUploadedFile | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const singleScanFileInputRef = useRef<HTMLInputElement>(null);

  // Derive mobile upload URL
  const uploadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?qrSession=${sessionId}`
    : `https://vmkwashim.gov.in/?qrSession=${sessionId}`;

  // Fetch session & vault files
  const fetchFiles = async () => {
    try {
      const allVault = await qrUploadService.getAllVaultFilesAsync();
      setVaultFiles(allVault);
    } catch {
      // fallback to sync cache
      const cached = qrUploadService.getAllVaultFiles();
      setVaultFiles(cached);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchFiles();

    // Fast polling every 1.5 seconds for fresh mobile uploads across devices
    const interval = setInterval(fetchFiles, 1500);

    const onIncomingFile = (newFile: QrUploadedFile) => {
      setVaultFiles((prev) => {
        if (prev.some((f) => f.id === newFile.id)) return prev;
        return [newFile, ...prev];
      });
      setStatusMessage({
        text: `📥 Real-time Received: "${newFile.name}" (${formatBytes(newFile.size)}) stored in Software Vault!`,
        type: 'success',
      });
    };

    // 1. Listen to real-time Firebase Firestore database snapshots
    const unsubFirestore = qrUploadService.listenFirestoreRealtime(sessionId, onIncomingFile);

    // 2. Listen to real-time Server-Sent Events (cross-device: Phone -> PC)
    const unsubServer = qrUploadService.listenServerEvents(sessionId, onIncomingFile);

    // 3. Listen to cross-tab BroadcastChannel
    const unsubBroadcast = qrUploadService.listenBroadcast(sessionId, onIncomingFile);

    return () => {
      clearInterval(interval);
      unsubFirestore();
      unsubServer();
      unsubBroadcast();
    };
  }, [isOpen, sessionId]);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (previewFile) {
          setPreviewFile(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, previewFile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = () => {
      if (activeDropdownId) setActiveDropdownId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [activeDropdownId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2200);
    } catch (err) {
      console.error('Failed to copy session id', err);
    }
  };

  const handleOpenOnMobile = () => {
    window.open(uploadUrl, '_blank');
  };

  /**
   * Process multiple files (from file dialog or drag-and-drop)
   * Uses real-time computer vision document boundary detection & perspective correction
   * to automatically optimize and flatten images before saving into the vault.
   */
  const processFilesForVault = async (filesToProcess: FileList | File[]) => {
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsProcessingAutoCrop(true);
    let processedCount = 0;
    let croppedCount = 0;

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isAllowedExt = ext && ['pdf', 'jpeg', 'jpg', 'png', 'webp'].includes(ext);

        if (!validTypes.includes(file.type) && !isAllowedExt) {
          setStatusMessage({
            text: `Skipped "${file.name}": Only PDF, JPEG, PNG, and WebP files are allowed.`,
            type: 'error',
          });
          continue;
        }

        const rawDataUrl = await fileToDataUrl(file);
        const isPdf = file.type === 'application/pdf' || ext === 'pdf';

        if (!isPdf && autoCropOnUpload) {
          setAutoCropProgressText(
            `Analyzing & perspective correcting: "${file.name}" (${i + 1}/${filesToProcess.length})...`
          );
          try {
            const optimized = await autoCropAndOptimizeDocument(rawDataUrl);
            await qrUploadService.uploadFile(sessionId, {
              name: file.name,
              type: 'image/jpeg',
              size: optimized.size,
              dataUrl: optimized.dataUrl,
              category: 'Auto-Cropped',
            });
            croppedCount++;
          } catch (cropErr) {
            console.warn('[Auto-Crop Fallback to Raw File]', cropErr);
            await qrUploadService.uploadFile(sessionId, {
              name: file.name,
              type: file.type || 'image/jpeg',
              size: file.size,
              dataUrl: rawDataUrl,
            });
          }
        } else {
          await qrUploadService.uploadFile(sessionId, {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: rawDataUrl,
          });
        }
        processedCount++;
      }

      await fetchFiles();
      if (croppedCount > 0) {
        setStatusMessage({
          text: `✓ ${croppedCount} document(s) perspective-corrected & added to Software Vault!`,
          type: 'success',
        });
      } else if (processedCount > 0) {
        setStatusMessage({
          text: `✓ ${processedCount} file(s) stored in Software Vault!`,
          type: 'success',
        });
      }
    } catch {
      setStatusMessage({
        text: 'Failed to process selected file(s).',
        type: 'error',
      });
    } finally {
      setIsProcessingAutoCrop(false);
      setAutoCropProgressText('');
      if (localFileInputRef.current) localFileInputRef.current.value = '';
      if (singleScanFileInputRef.current) singleScanFileInputRef.current.value = '';
    }
  };

  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFilesForVault(e.target.files);
    }
  };

  const handleSingleScanFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setNewUploadCropFile({
        id: `pending-scan-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
      setShowScanChoiceModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      if (singleScanFileInputRef.current) singleScanFileInputRef.current.value = '';
    }
  };

  const handleSaveNewUploadCrop = async (croppedDataUrl: string, croppedSize: number) => {
    if (!newUploadCropFile) return;
    try {
      await qrUploadService.uploadFile(sessionId, {
        name: newUploadCropFile.name,
        type: 'image/jpeg',
        size: croppedSize,
        dataUrl: croppedDataUrl,
        category: 'Auto-Cropped',
      });
      await fetchFiles();
      setNewUploadCropFile(null);
      setStatusMessage({
        text: `✓ Document "${newUploadCropFile.name}" perspective-corrected & added to Software Vault!`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        text: 'Failed to save document to Vault.',
        type: 'error',
      });
    }
  };

  const handleLiveCameraCapture = async (capturedDataUrl: string) => {
    setShowLiveCameraModal(false);
    setIsProcessingAutoCrop(true);
    setAutoCropProgressText('Correcting perspective and optimizing captured document...');
    try {
      const optimized = await autoCropAndOptimizeDocument(capturedDataUrl);
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const fileName = `Scan_${timestamp}.jpg`;
      await qrUploadService.uploadFile(sessionId, {
        name: fileName,
        type: 'image/jpeg',
        size: optimized.size,
        dataUrl: optimized.dataUrl,
        category: 'Camera-Scan',
      });
      await fetchFiles();
      setStatusMessage({
        text: `✓ Live camera scan perspective-corrected and stored in Software Vault!`,
        type: 'success',
      });
    } catch (err) {
      console.error('Camera capture error:', err);
      setStatusMessage({
        text: 'Failed to optimize camera document.',
        type: 'error',
      });
    } finally {
      setIsProcessingAutoCrop(false);
      setAutoCropProgressText('');
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFilesForVault(e.dataTransfer.files);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    await qrUploadService.deleteFile(sessionId, fileId);
    await fetchFiles();
  };

  const handleSaveCrop = async (croppedDataUrl: string, croppedSize: number, saveAsCopy: boolean) => {
    if (!cropTargetFile) return;

    if (saveAsCopy) {
      const extMatch = cropTargetFile.name.match(/(\.[^.]+)$/);
      const ext = extMatch ? extMatch[1] : '.jpg';
      const baseName = cropTargetFile.name.replace(/\.[^.]+$/, '');
      const newName = `${baseName}_cropped${ext}`;

      await qrUploadService.uploadFile(sessionId, {
        name: newName,
        type: cropTargetFile.type || 'image/jpeg',
        size: croppedSize,
        dataUrl: croppedDataUrl,
        category: cropTargetFile.category,
      });

      setStatusMessage({
        text: `Cropped document "${newName}" saved in Vault`,
        type: 'success',
      });
    } else {
      await qrUploadService.updateVaultFile(cropTargetFile.id, {
        dataUrl: croppedDataUrl,
        size: croppedSize,
        sessionId: cropTargetFile.sessionId || sessionId,
      });

      setStatusMessage({
        text: `Document "${cropTargetFile.name}" updated with crop`,
        type: 'success',
      });
    }

    await fetchFiles();
    setCropTargetFile(null);
  };

  const handleToggleStamp = async (file: QrUploadedFile) => {
    await qrUploadService.toggleVerifyStamp(file.sessionId || sessionId, file.id);
    await fetchFiles();
  };

  // Counts for category tabs
  const totalCount = vaultFiles.length;
  const pdfCount = vaultFiles.filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  ).length;
  const imageCount = vaultFiles.filter(
    (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(f.name)
  ).length;
  const verifiedCount = vaultFiles.filter((f) => !!f.verifiedStamp).length;

  // Filter & Sort
  const displayedVaultFiles = vaultFiles
    .filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (typeFilter === 'pdf') {
        return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      }
      if (typeFilter === 'image') {
        return f.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(f.name);
      }
      if (typeFilter === 'verified') {
        return !!f.verifiedStamp;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'size') {
        return b.size - a.size;
      }
      return 0;
    });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="qr-upload-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-xs overflow-y-auto"
            onClick={onClose}
          >
            <motion.div
              id="qr-upload-modal-container"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full ${
                activeTab === 'dual'
                  ? 'max-w-[1400px]'
                  : activeTab === 'vault'
                  ? 'max-w-4xl'
                  : 'max-w-2xl'
              } bg-slate-100 text-slate-800 rounded-3xl shadow-2xl border border-slate-300/80 overflow-hidden my-auto max-h-[96vh] flex flex-col transition-all duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Switcher: Upload Options vs Software Vault (Switcher default: upload) */}
              <div className="bg-[#002B54] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#003B73] shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#001D3D] p-1 rounded-xl border border-blue-900">
                    <button
                      id="upload-switcher-upload-tab"
                      onClick={() => setActiveTab('upload')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'upload'
                          ? 'bg-[#0056A6] text-white shadow-xs'
                          : 'text-blue-300 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Files by QR</span>
                    </button>
                    <button
                      id="upload-switcher-vault-tab"
                      onClick={() => setActiveTab('vault')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'vault'
                          ? 'bg-[#0056A6] text-white shadow-xs'
                          : 'text-blue-300 hover:text-white'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Software Vault</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-950/80 text-blue-200 border border-blue-800">
                        {vaultFiles.length}
                      </span>
                    </button>
                    <button
                      id="upload-switcher-dual-tab"
                      onClick={() => setActiveTab('dual')}
                      className={`hidden md:flex px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer items-center gap-1 ${
                        activeTab === 'dual'
                          ? 'bg-[#0056A6] text-white shadow-xs font-bold'
                          : 'text-blue-400 hover:text-white'
                      }`}
                      title="Side-by-side split view"
                    >
                      Split View
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-blue-200 text-xs font-mono">
                    <span className="hidden sm:inline text-blue-300">Session:</span>
                    <span className="bg-[#0056A6]/40 px-2 py-0.5 rounded border border-blue-400/30 text-white font-bold">
                      #{sessionId}
                    </span>
                    <button
                      onClick={handleCopySessionId}
                      className="p-1 rounded text-blue-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Copy Session ID"
                    >
                      {copiedSession ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {statusMessage.text && (
                <div
                  className={`px-4 py-2 flex items-center justify-between text-xs font-semibold border-b shrink-0 ${
                    statusMessage.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusMessage.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{statusMessage.text}</span>
                    {activeTab !== 'vault' && vaultFiles.length > 0 && (
                      <button
                        onClick={() => setActiveTab('vault')}
                        className="ml-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        View in Vault ({vaultFiles.length})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setStatusMessage({ text: '', type: '' })}
                    className="text-xs opacity-70 hover:opacity-100 cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Hidden file input for "+ Upload More" or local uploads */}
              <input
                ref={localFileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLocalFileSelect}
              />
              {/* Hidden file input for single image scan & crop */}
              <input
                ref={singleScanFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleSingleScanFileSelect}
              />

              {/* MAIN CONTENT AREA: DUAL PANES OR SINGLE PANE */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-200/50">
                <div
                  className={`grid gap-4 sm:gap-5 ${
                    activeTab === 'dual'
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1 max-w-4xl mx-auto'
                  }`}
                >
                  {/* ========================================================= */}
                  {/* UPLOAD OPTIONS PANEL                                      */}
                  {/* ========================================================= */}
                  {(activeTab === 'upload' || activeTab === 'dual') && (
                    <div
                      id="upload-options-panel"
                      className="bg-white rounded-2xl border border-slate-300 shadow-sm flex flex-col overflow-hidden"
                    >
                      {/* Deep Blue Header */}
                      <div className="bg-gradient-to-r from-[#0056A6] to-[#003B73] px-5 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-white/40 overflow-hidden">
                            <img src={APP_ASSETS.FILES_BY_QR} alt="Files by QR" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-white tracking-wide leading-tight">
                              Files by QR
                            </h2>
                          </div>
                        </div>

                        {activeTab !== 'dual' && (
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Close (Esc)"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Content Body: Pure Options, no unwanted instructions or marketing fluff */}
                      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                        {/* Option 1: Mobile Camera QR Code */}
                        <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-center gap-5">
                          {/* QR Code with Camera Focus Corners */}
                          <div className="relative p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs shrink-0">
                            <span className="absolute -top-2 -left-2 w-5 h-5 border-t-3 border-l-3 border-[#0056A6] rounded-tl-lg pointer-events-none" />
                            <span className="absolute -top-2 -right-2 w-5 h-5 border-t-3 border-r-3 border-[#0056A6] rounded-tr-lg pointer-events-none" />
                            <span className="absolute -bottom-2 -left-2 w-5 h-5 border-b-3 border-l-3 border-[#0056A6] rounded-bl-lg pointer-events-none" />
                            <span className="absolute -bottom-2 -right-2 w-5 h-5 border-b-3 border-r-3 border-[#0056A6] rounded-br-lg pointer-events-none" />

                            <div className="relative w-36 h-36 flex items-center justify-center">
                              <QRCodeSVG
                                value={uploadUrl}
                                size={144}
                                level="H"
                                includeMargin={false}
                                className="w-full h-full"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-9 h-9 bg-[#0056A6] rounded-xl flex items-center justify-center border-2 border-white shadow-md text-white">
                                  <UploadCloud className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-[#0056A6] text-xs font-bold">
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>Scan with Mobile Camera</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              Scan this QR code with any phone camera to upload documents directly into the software.
                            </p>
                            <div className="flex items-center gap-2 pt-0.5 justify-center sm:justify-start">
                              <span className="text-[11px] text-slate-400 font-mono">Session ID:</span>
                              <span className="font-mono font-bold text-xs text-[#003B73] bg-white px-2 py-0.5 rounded border border-slate-200">
                                #{sessionId}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopySessionId}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Copy Session ID"
                              >
                                {copiedSession ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Auto-Crop & Perspective Correction Option Toggle */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0056A6] flex items-center justify-center shrink-0">
                              <Crop className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">Auto-crop & perspective correction</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  autoCropOnUpload 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                    : 'bg-slate-200 text-slate-600 border-slate-300'
                                }`}>
                                  {autoCropOnUpload ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                Automatically detect borders, straighten perspective, and optimize images before storing in Vault.
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0" title="Toggle automatic perspective correction on upload">
                            <input
                              type="checkbox"
                              checked={autoCropOnUpload}
                              onChange={(e) => setAutoCropOnUpload(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0056A6]"></div>
                          </label>
                        </div>

                        {/* Real-time processing progress bar */}
                        {isProcessingAutoCrop && (
                          <div className="bg-blue-50 border border-blue-200 text-[#003B73] px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold animate-pulse shadow-2xs">
                            <RotateCw className="w-4 h-4 animate-spin text-[#0056A6] shrink-0" />
                            <span className="flex-1 truncate">
                              {autoCropProgressText || 'Detecting document borders and applying perspective correction...'}
                            </span>
                          </div>
                        )}

                        {/* Options Buttons Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option: Scan & Auto-Crop Document */}
                          <button
                            type="button"
                            id="upload-opt-scan-crop-btn"
                            onClick={() => setShowScanChoiceModal(true)}
                            className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 hover:bg-blue-100/60 border-2 border-blue-300 hover:border-[#0056A6] rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#0056A6] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                <Crop className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                    Scan & Auto-Crop Document
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                  Live camera or image with real-time border detection
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl border border-blue-200 bg-white text-[#0056A6] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-50">
                              <Sparkles className="w-4 h-4 text-[#0056A6]" />
                            </div>
                          </button>

                          {/* Option: Make Images to PDF Tool (USER EXPLICIT REQUEST) */}
                          <button
                            type="button"
                            id="upload-opt-make-pdf-btn"
                            onClick={() => {
                              if (onOpenImgToPdf) onOpenImgToPdf();
                            }}
                            className="bg-gradient-to-br from-[#0056A6]/10 to-[#003B73]/10 border-2 border-[#0056A6]/40 hover:border-[#0056A6] rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#0056A6] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                <FileImage className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                  Make Images to PDF
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                  Convert images into a single PDF
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl border border-blue-300 bg-white text-[#0056A6] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-50">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </button>

                          {/* Option: Upload from Computer */}
                          <button
                            type="button"
                            id="upload-opt-from-pc-btn"
                            onClick={() => localFileInputRef.current?.click()}
                            className="bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0056A6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <UploadCloud className="w-5 h-5 text-[#0056A6]" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                  Upload from Computer
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                  Select PDF, JPG, or PNG files
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-50">
                              <Plus className="w-4 h-4" />
                            </div>
                          </button>

                          {/* Option: Open on Mobile */}
                          <button
                            type="button"
                            id="upload-opt-open-mobile-btn"
                            onClick={handleOpenOnMobile}
                            className="bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Smartphone className="w-5 h-5 text-slate-700" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                  Open on Mobile
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                  Open upload page in browser
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-50">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </button>

                          {/* Option: Copy Upload Link */}
                          <button
                            type="button"
                            id="upload-opt-copy-link-btn"
                            onClick={handleCopyLink}
                            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <LinkIcon className="w-5 h-5 text-emerald-700" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                  Copy Upload Link
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                                  {copiedLink ? 'Link copied to clipboard!' : 'Share link to mobile or WhatsApp'}
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-50">
                              {copiedLink ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Switch to Vault Quick Bar */}
                        {activeTab !== 'dual' && (
                          <div className="pt-1">
                            <button
                              type="button"
                              id="upload-opt-goto-vault-btn"
                              onClick={() => setActiveTab('vault')}
                              className="w-full bg-[#003B73]/5 hover:bg-[#003B73]/10 border border-[#003B73]/20 rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <UploadCloud className="w-4 h-4 text-[#0056A6]" />
                                <span className="text-xs font-bold text-[#003B73]">
                                  Open Software Vault
                                </span>
                              </div>
                              <span className="text-xs font-bold text-[#0056A6] bg-white px-2.5 py-0.5 rounded-lg border border-[#0056A6]/20">
                                {vaultFiles.length} files available →
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* SOFTWARE VAULT PANEL                                      */}
                  {/* ========================================================= */}
                  {(activeTab === 'vault' || activeTab === 'dual') && (
                    <div
                      id="software-vault-panel"
                      className="bg-white rounded-2xl border border-slate-300 shadow-sm flex flex-col overflow-hidden"
                    >
                      {/* Deep Blue Header */}
                      <div className="bg-gradient-to-r from-[#0056A6] to-[#003B73] px-5 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-xs border border-white/20">
                            <UploadCloud className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-white tracking-wide leading-tight">
                              Software Vault
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {onOpenImgToPdf && (
                            <button
                              type="button"
                              id="vault-header-make-pdf-btn"
                              onClick={onOpenImgToPdf}
                              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Make Images to PDF"
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Make Images to PDF</span>
                            </button>
                          )}
                          {activeTab !== 'dual' && (
                            <button
                              type="button"
                              onClick={onClose}
                              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Close (Esc)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter Category Tabs */}
                      <div className="flex items-center gap-2 border-b border-slate-200 px-4 pt-2.5 pb-0.5 bg-white overflow-x-auto text-xs font-semibold select-none">
                        <button
                          onClick={() => setTypeFilter('all')}
                          className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            typeFilter === 'all'
                              ? 'border-[#0056A6] text-[#0056A6] font-bold'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-[#0056A6]" />
                          <span>Documents ({totalCount})</span>
                        </button>

                        <button
                          onClick={() => setTypeFilter('pdf')}
                          className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            typeFilter === 'pdf'
                              ? 'border-[#0056A6] text-[#0056A6] font-bold'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-rose-500" />
                          <span>PDFs ({pdfCount})</span>
                        </button>

                        <button
                          onClick={() => setTypeFilter('image')}
                          className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            typeFilter === 'image'
                              ? 'border-[#0056A6] text-[#0056A6] font-bold'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          <span>Images ({imageCount})</span>
                        </button>

                        <button
                          onClick={() => setTypeFilter('verified')}
                          className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            typeFilter === 'verified'
                              ? 'border-[#0056A6] text-[#0056A6] font-bold'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Verified ({verifiedCount})</span>
                        </button>
                      </div>

                      {/* Search and Sort controls */}
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 select-none">
                        {/* Search input */}
                        <div className="relative flex-1 min-w-[180px] max-w-xs">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documents..."
                            className="w-full pl-9 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0056A6] focus:border-[#0056A6]"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Sort by dropdown and View mode toggles */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
                            <span className="text-[11px] text-slate-400 font-medium">Sort by</span>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as any)}
                              className="bg-transparent font-semibold text-slate-700 focus:outline-hidden cursor-pointer text-xs"
                            >
                              <option value="latest">Latest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="name">Name (A-Z)</option>
                              <option value="size">File Size</option>
                            </select>
                          </div>

                          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                            <button
                              onClick={() => setViewMode('grid')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                viewMode === 'grid'
                                  ? 'bg-blue-50 text-[#0056A6]'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title="Grid View"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setViewMode('list')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                viewMode === 'list'
                                  ? 'bg-blue-50 text-[#0056A6]'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title="List View"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Documents List View / Grid View */}
                      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[520px]">
                        {displayedVaultFiles.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-2">
                            <UploadCloud className="w-10 h-10 mx-auto text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">No documents found</p>
                            <p className="text-xs text-slate-400">
                              Scan the QR code to upload from your mobile, or click &quot;Upload More&quot;.
                            </p>
                          </div>
                        ) : viewMode === 'list' ? (
                          /* LIST VIEW matching user screenshot */
                          displayedVaultFiles.map((file) => {
                            const isPdf =
                              file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                            const formattedDate = formatDocumentDate(file.uploadedAt);

                            return (
                              <div
                                key={file.id}
                                className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all group"
                              >
                                {/* Thumbnail + Details */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Document Thumbnail */}
                                  <div
                                    onClick={() => setPreviewFile(file)}
                                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 relative shadow-2xs"
                                  >
                                    {isPdf ? (
                                      <div className="w-full h-full bg-gradient-to-br from-rose-500 to-rose-700 flex flex-col items-center justify-center text-white">
                                        <FileText className="w-6 h-6 text-white" />
                                        <span className="text-[9px] font-black tracking-wider uppercase mt-0.5">
                                          PDF
                                        </span>
                                      </div>
                                    ) : (
                                      <img
                                        src={file.dataUrl}
                                        alt={file.name}
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                      />
                                    )}
                                  </div>

                                  {/* Name, Meta, and Badge */}
                                  <div className="min-w-0 flex-1">
                                    <h4
                                      onClick={() => setPreviewFile(file)}
                                      className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-[#0056A6] cursor-pointer"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </h4>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                      <span>{formatBytes(file.size)}</span>
                                      <span>•</span>
                                      <span className="uppercase">{isPdf ? 'PDF' : 'JPG'}</span>
                                      <span>•</span>
                                      <span>{formattedDate}</span>
                                    </div>
                                    <div className="mt-1">
                                      <span className="inline-block text-[10px] font-semibold text-[#0056A6] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                        {file.category || 'Candidate Document'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Badges & Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                  {/* Verified Badge / Toggle */}
                                  {file.verifiedStamp ? (
                                    <button
                                      onClick={() => handleToggleStamp(file)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                                      title="Click to toggle verification status"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Verified</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleStamp(file)}
                                      className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-colors cursor-pointer"
                                      title="Mark as Verified"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* View Button */}
                                  <button
                                    onClick={() => setPreviewFile(file)}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#0056A6]" />
                                    <span className="hidden sm:inline">View</span>
                                  </button>

                                  {/* Crop Button for Images */}
                                  {!isPdf && (
                                    <button
                                      onClick={() => setCropTargetFile(file)}
                                      className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0056A6] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="AI Document Scanner & Auto-Crop"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">AI Crop</span>
                                    </button>
                                  )}

                                  {/* Download Button */}
                                  <button
                                    onClick={() => triggerFileDownload(file.dataUrl, file.name)}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-600" />
                                    <span className="hidden sm:inline">Download</span>
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-rose-100 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Delete document"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>

                                  {/* 3-dots more menu */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(activeDropdownId === file.id ? null : file.id);
                                      }}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="More Options"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeDropdownId === file.id && (
                                      <div
                                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() => {
                                            printDocumentDirectly(file.dataUrl, file.name, !isPdf);
                                            setActiveDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                          <span>Print Document</span>
                                        </button>
                                        {!isPdf && (
                                          <button
                                            onClick={() => {
                                              setCropTargetFile(file);
                                              setActiveDropdownId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                          >
                                            <Sparkles className="w-3.5 h-3.5 text-[#0056A6]" />
                                            <span>AI Scanner & Crop</span>
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            handleToggleStamp(file);
                                            setActiveDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>{file.verifiedStamp ? 'Unverify' : 'Mark Verified'}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleDeleteFile(file.id);
                                            setActiveDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Delete Permanently</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          /* GRID VIEW */
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {displayedVaultFiles.map((file) => {
                              const isPdf =
                                file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                              return (
                                <div
                                  key={file.id}
                                  className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition-all group"
                                >
                                  <div
                                    onClick={() => setPreviewFile(file)}
                                    className="w-full aspect-4/3 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer mb-2"
                                  >
                                    {isPdf ? (
                                      <div className="w-full h-full bg-gradient-to-br from-rose-500 to-rose-700 flex flex-col items-center justify-center text-white">
                                        <FileText className="w-8 h-8 text-white" />
                                        <span className="text-[10px] font-bold uppercase mt-1">PDF</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={file.dataUrl}
                                        alt={file.name}
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                      />
                                    )}
                                  </div>

                                  <h4
                                    onClick={() => setPreviewFile(file)}
                                    className="text-xs font-bold text-slate-900 truncate hover:text-[#0056A6] cursor-pointer"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {formatBytes(file.size)}
                                  </p>

                                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setPreviewFile(file)}
                                        className="text-[11px] font-semibold text-[#0056A6] hover:underline"
                                      >
                                        View
                                      </button>
                                      {!isPdf && (
                                        <button
                                          onClick={() => setCropTargetFile(file)}
                                          className="text-[11px] font-semibold text-slate-600 hover:text-[#0056A6] flex items-center gap-0.5 cursor-pointer"
                                          title="AI Document Scanner & Auto-Crop"
                                        >
                                          <Sparkles className="w-3 h-3 text-[#0056A6]" />
                                          <span>AI Crop</span>
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => triggerFileDownload(file.dataUrl, file.name)}
                                      className="p-1 text-slate-500 hover:text-slate-800"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer Bar */}
                      <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 select-none shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            {displayedVaultFiles.length} {displayedVaultFiles.length === 1 ? 'document' : 'documents'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            id="vault-footer-scan-crop-btn"
                            onClick={() => setShowScanChoiceModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                            title="Scan with camera or photo with perspective correction"
                          >
                            <Crop className="w-4 h-4 text-[#0056A6]" />
                            <span>Scan & Crop</span>
                          </button>

                          {onOpenImgToPdf && (
                            <button
                              type="button"
                              id="vault-footer-make-pdf-btn"
                              onClick={onOpenImgToPdf}
                              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0056A6] font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-blue-200 transition-all cursor-pointer"
                              title="Convert images to PDF"
                            >
                              <FileImage className="w-4 h-4" />
                              <span>Make Images to PDF</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (localFileInputRef.current) {
                                localFileInputRef.current.click();
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#0056A6] hover:bg-[#003B73] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Upload More</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full in-software Document Inspection Viewer */}
      {previewFile && (
        <InSoftwareDocumentViewer
          file={previewFile}
          allFiles={vaultFiles}
          onClose={() => setPreviewFile(null)}
          onSelectFile={(f) => setPreviewFile(f)}
        />
      )}

      {/* Smart Crop Modal for Existing Vault Documents */}
      {cropTargetFile && (
        <SmartCropModal
          isOpen={!!cropTargetFile}
          file={cropTargetFile}
          onClose={() => setCropTargetFile(null)}
          onSaveCrop={handleSaveCrop}
        />
      )}

      {/* Smart Crop Modal for New Upload (Review & Crop before Vault) */}
      {newUploadCropFile && (
        <SmartCropModal
          isOpen={!!newUploadCropFile}
          file={newUploadCropFile}
          isNewUpload={true}
          title="Auto-Crop & Verify Document"
          actionButtonLabel="Add to Software Vault"
          onClose={() => setNewUploadCropFile(null)}
          onSaveCrop={async (croppedDataUrl, croppedSize) => {
            await handleSaveNewUploadCrop(croppedDataUrl, croppedSize);
          }}
        />
      )}

      {/* Live Camera Scanner Modal */}
      {showLiveCameraModal && (
        <LiveCameraScannerModal
          isOpen={showLiveCameraModal}
          onClose={() => setShowLiveCameraModal(false)}
          onCapture={handleLiveCameraCapture}
        />
      )}

      {/* Scan & Auto-Crop Choice Dialog */}
      {showScanChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0056A6] text-white flex items-center justify-center shadow-2xs">
                  <Crop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scan & Auto-Crop Document</h3>
                  <p className="text-[11px] text-slate-500">Real-time computer vision document boundary detection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScanChoiceModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Option 1: Live Camera Scanner */}
              <button
                type="button"
                onClick={() => {
                  setShowScanChoiceModal(false);
                  setShowLiveCameraModal(true);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#0056A6] hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0056A6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5 text-[#0056A6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">Live Camera Scanner</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-[#0056A6]">
                      Real-Time
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Use your camera with real-time border detection, corner tracking, and automatic capture.
                  </p>
                </div>
              </button>

              {/* Option 2: Image from Computer with Corner Review */}
              <button
                type="button"
                onClick={() => {
                  setShowScanChoiceModal(false);
                  singleScanFileInputRef.current?.click();
                }}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#0056A6] hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5 text-slate-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">Select Image File</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                      Auto-Detect & Tweak
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Choose an image file, view auto-detected corners, adjust corners if needed, and save to Vault.
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScanChoiceModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
