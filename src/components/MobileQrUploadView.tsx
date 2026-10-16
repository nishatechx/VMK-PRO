import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  FileUp,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ArrowLeft,
  X,
  UploadCloud,
  Plus,
  Sparkles,
  Crop,
} from 'lucide-react';
import { QrUploadedFile, formatBytes, fileToDataUrl } from '../types/qrUpload';
import { qrUploadService } from '../services/qrUploadService';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { SmartCropModal } from './SmartCropModal';

interface MobileQrUploadViewProps {
  sessionId: string;
  onBackToMain?: () => void;
}

interface StagedFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isPdf: boolean;
}

export const MobileQrUploadView: React.FC<MobileQrUploadViewProps> = ({ sessionId, onBackToMain }) => {
  const [uploaderParams] = useState<{
    uploadedBy?: string;
    uploaderName?: string;
    uploaderRole?: string;
    district?: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const uploader = (sp.get('uploader') || '').trim();
      const uploaderName = (sp.get('uploaderName') || '').trim();
      const uploaderRole = (sp.get('uploaderRole') || '').trim();
      const district = (sp.get('district') || '').trim();
      return {
        uploadedBy: uploader || 'counsellor',
        uploaderName: uploaderName || uploader || 'Counselor',
        uploaderRole: uploaderRole || 'counsellor',
        district: district || undefined,
      };
    }
    return {
      uploadedBy: 'counsellor',
      uploaderName: 'Counselor',
      uploaderRole: 'counsellor',
    };
  });

  const [stagedFiles, setStagedFiles] = useState<StagedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [files, setFiles] = useState<QrUploadedFile[]>([]);
  const [showLiveScanner, setShowLiveScanner] = useState<boolean>(false);
  const [cropStagedItem, setCropStagedItem] = useState<StagedFileItem | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({
    text: '',
    type: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [autoUpload, setAutoUpload] = useState<boolean>(true);

  const cleanSessionId = String(sessionId || '').trim().toUpperCase();

  const loadFiles = async () => {
    try {
      const list = await qrUploadService.getFiles(cleanSessionId);
      setFiles(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 2000);
    return () => clearInterval(interval);
  }, [cleanSessionId]);

  const uploadFilesDirectly = async (itemsToUpload: StagedFileItem[]) => {
    if (itemsToUpload.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    const total = itemsToUpload.length;
    let completed = 0;
    let failureCount = 0;

    for (let i = 0; i < itemsToUpload.length; i++) {
      const item = itemsToUpload[i];
      try {
        const dataUrl = item.previewUrl || (await fileToDataUrl(item.file));
        const fileType =
          item.file.type ||
          (dataUrl.startsWith('data:image/')
            ? 'image/jpeg'
            : item.isPdf
            ? 'application/pdf'
            : 'application/octet-stream');

        await qrUploadService.uploadFile(cleanSessionId, {
          name: item.file.name,
          type: fileType,
          size: item.file.size,
          dataUrl,
          category: item.isPdf ? 'PDF Document' : 'Scanned Image',
          uploadedBy: uploaderParams.uploadedBy,
          uploaderName: uploaderParams.uploaderName,
          uploaderRole: uploaderParams.uploaderRole,
          district: uploaderParams.district,
        });

        completed++;
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      } catch (err) {
        console.error('File upload failed:', err);
        failureCount++;
      }
    }

    setIsUploading(false);
    setUploadProgress(0);

    // Remove uploaded items from staged queue
    const uploadedIds = new Set(itemsToUpload.map((it) => it.id));
    setStagedFiles((prev) => prev.filter((it) => !uploadedIds.has(it.id)));

    if (failureCount === 0) {
      setStatusMsg({
        text: `✓ ${completed} document(s) uploaded successfully to computer!`,
        type: 'success',
      });
    } else {
      setStatusMsg({
        text: `Uploaded ${completed} file(s), ${failureCount} failed. Please tap retry.`,
        type: 'error',
      });
    }

    await loadFiles();
    const vaultSection = document.getElementById('mobile-vault-documents-section');
    if (vaultSection) {
      vaultSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFilesAdded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const newItems: StagedFileItem[] = [];
    let skippedCount = 0;
    const isFromCamera = e.target === cameraInputRef.current;

    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      const mime = (file.type || '').toLowerCase();
      const isImage = mime.startsWith('image/');
      const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = extension && ['pdf', 'jpeg', 'jpg', 'png', 'webp', 'heic', 'heif'].includes(extension);

      // Camera captures on mobile often come with empty type or generic names without extensions
      const isAccepted = isFromCamera || isImage || isPdf || isAllowedExt || (file.size > 0 && !file.name.match(/\.(exe|bat|sh|zip)$/i));

      if (!isAccepted) {
        skippedCount++;
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        skippedCount++;
        continue;
      }

      let previewUrl: string | null = null;
      if (!isPdf) {
        try {
          previewUrl = await fileToDataUrl(file);
        } catch {
          // fallback without preview
        }
      }

      // Friendly clean name for camera snaps or unnamed captures
      const isCameraSnap = isFromCamera || file.name.startsWith('image') || file.name === 'blob' || !file.name.includes('.');
      const resolvedName = isCameraSnap
        ? `Scan_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}_${i + 1}.jpg`
        : file.name;

      const resolvedFile = file.name !== resolvedName
        ? new File([file], resolvedName, { type: file.type || 'image/jpeg' })
        : file;

      newItems.push({
        id: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file: resolvedFile,
        previewUrl,
        isPdf,
      });
    }

    // Reset inputs so same file or camera capture can be triggered again
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    if (skippedCount > 0) {
      setStatusMsg({
        text: `${skippedCount} file(s) skipped. Only PDF, JPG, PNG under 50MB allowed.`,
        type: 'error',
      });
    }

    if (newItems.length > 0) {
      if (autoUpload) {
        setStatusMsg({
          text: `Uploading ${newItems.length} document(s) directly to computer...`,
          type: 'success',
        });
        await uploadFilesDirectly(newItems);
      } else {
        setStagedFiles((prev) => [...prev, ...newItems]);
        setStatusMsg({
          text: `✓ ${newItems.length} document(s) ready! Tap "Upload to Vault" below.`,
          type: 'success',
        });
      }
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllStaged = () => {
    setStagedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleLiveCapture = async (capturedDataUrl: string) => {
    setShowLiveScanner(false);
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const fileName = `Scan_${timestamp}.jpg`;
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const newItem: StagedFileItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl: capturedDataUrl,
        isPdf: false,
      };

      if (autoUpload) {
        setStatusMsg({
          text: 'Uploading scanned document directly to computer...',
          type: 'success',
        });
        await uploadFilesDirectly([newItem]);
      } else {
        setStagedFiles((prev) => [...prev, newItem]);
        setStatusMsg({
          text: `✓ Scanned document captured! Tap "Upload to Vault" below to finish.`,
          type: 'success',
        });
      }
    } catch {
      setStatusMsg({ text: 'Failed to process capture', type: 'error' });
    }
  };

  const handleSaveStagedCrop = async (croppedDataUrl: string, croppedSize: number, saveAsCopy: boolean) => {
    if (!cropStagedItem) return;

    try {
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();
      const newFile = new File([blob], cropStagedItem.file.name, { type: 'image/jpeg' });

      if (saveAsCopy) {
        const copyItem: StagedFileItem = {
          id: `cropped-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file: new File([blob], `Cropped_${cropStagedItem.file.name}`, { type: 'image/jpeg' }),
          previewUrl: croppedDataUrl,
          isPdf: false,
        };
        setStagedFiles((prev) => [...prev, copyItem]);
      } else {
        setStagedFiles((prev) =>
          prev.map((item) =>
            item.id === cropStagedItem.id
              ? { ...item, file: newFile, previewUrl: croppedDataUrl }
              : item
          )
        );
      }
      setCropStagedItem(null);
    } catch (err) {
      console.error('Failed to apply staged crop:', err);
    }
  };

  const handleUploadAll = async () => {
    if (stagedFiles.length === 0) return;
    await uploadFilesDirectly(stagedFiles);
  };

  const handleDelete = async (fileId: string) => {
    try {
      await qrUploadService.deleteFile(cleanSessionId, fileId);
      await loadFiles();
    } catch {
      // ignore
    }
  };

  const shortSession = cleanSessionId.length > 8 ? cleanSessionId.slice(-6).toUpperCase() : cleanSessionId.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-none">Document Upload</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-slate-500">Session #{shortSession}</span>
              </div>
            </div>
          </div>

          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Status Notification */}
        <AnimatePresence>
          {statusMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
                statusMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="flex-1">{statusMsg.text}</span>
              <button
                onClick={() => setStatusMsg({ text: '', type: '' })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Action Card (Google Files Material 3) */}
        <div className="bg-white border border-[#E0E2EC] rounded-3xl p-5 shadow-xs space-y-4">
          {/* Instant Upload Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E0E2EC] text-xs">
            <div className="flex items-center gap-1.5 text-[#1F1F1F] font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Auto-Upload to Computer</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" title="Auto-upload photos directly upon capture">
              <input
                type="checkbox"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-[#C4C7C5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0B57D0]"></div>
            </label>
          </div>

          {/* Action Buttons: Google Files 3-button layout */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              id="scanner-btn"
              onClick={() => setShowLiveScanner(true)}
              className="h-14 rounded-2xl bg-[#E8F0FE] hover:bg-[#D2E3FC] active:scale-98 text-[#0B57D0] font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              title="Scan document"
            >
              <Crop className="w-5 h-5 text-[#0B57D0]" />
              <span>Scan</span>
            </button>

            <button
              type="button"
              id="camera-capture-btn"
              onClick={() => cameraInputRef.current?.click()}
              className="h-14 rounded-2xl bg-[#F2F2F2] hover:bg-[#E6E6E6] active:scale-98 text-[#1F1F1F] font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-[#1F1F1F]" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              id="browse-multiple-files-btn"
              onClick={() => fileInputRef.current?.click()}
              className="h-14 rounded-2xl bg-[#F2F2F2] hover:bg-[#E6E6E6] active:scale-98 text-[#1F1F1F] font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <FileUp className="w-5 h-5 text-[#444746]" />
              <span>Files</span>
            </button>
          </div>

          {/* Hidden File Inputs (File input allows multiple selection) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleFilesAdded}
            className="hidden"
          />
          {/* Camera input captures photo and allows consecutive snaps */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesAdded}
            className="hidden"
          />

          {/* Tap / Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#C4C7C5] hover:border-[#0B57D0] rounded-2xl p-5 text-center bg-[#F8F9FA] hover:bg-[#F2F4F7] cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#0B57D0] mx-auto mb-2 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-[#1F1F1F]">Choose files or capture photo</p>
            <p className="text-[11px] text-[#444746] mt-0.5">PDF, JPG, PNG up to 50MB</p>
          </div>

          {/* Staged Files Queue */}
          <AnimatePresence>
            {stagedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 space-y-3"
              >
                {/* Queue Header */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-slate-700">
                    Selected Files ({stagedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={clearAllStaged}
                    disabled={isUploading}
                    className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer text-[11px]"
                  >
                    Clear all
                  </button>
                </div>

                {/* Staged Items List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stagedFiles.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.isPdf ? (
                          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{item.file.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatBytes(item.file.size)} • #{index + 1}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!item.isPdf && item.previewUrl && (
                          <button
                            type="button"
                            onClick={() => setCropStagedItem(item)}
                            disabled={isUploading}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                            title="Crop & Straighten with AI"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Crop</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeStagedFile(item.id)}
                          disabled={isUploading}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add More Controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Add Files</span>
                  </button>
                </div>

                {/* Main Upload Button */}
                <button
                  type="button"
                  id="mobile-upload-submit-btn"
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Upload {stagedFiles.length} Document{stagedFiles.length > 1 ? 's' : ''} to Vault</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Uploaded Documents in Session / Vault */}
        <div id="mobile-vault-documents-section" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Uploaded Documents in Vault</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                {files.length}
              </span>
            </h2>
            <button
              onClick={loadFiles}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {files.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">No documents uploaded yet</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {files.map((file) => {
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={file.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isPdf ? (
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatBytes(file.size)} •{' '}
                          {new Date(file.uploadedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                        Uploaded
                      </span>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Live AI Camera Scanner Modal */}
      {showLiveScanner && (
        <LiveCameraScannerModal
          isOpen={showLiveScanner}
          onClose={() => setShowLiveScanner(false)}
          onCapture={handleLiveCapture}
        />
      )}

      {/* Smart Crop Modal for Staged Image */}
      {cropStagedItem && cropStagedItem.previewUrl && (
        <SmartCropModal
          isOpen={!!cropStagedItem}
          file={{
            id: cropStagedItem.id,
            name: cropStagedItem.file.name,
            size: cropStagedItem.file.size,
            type: cropStagedItem.file.type,
            dataUrl: cropStagedItem.previewUrl,
            uploadedAt: Date.now(),
          }}
          onClose={() => setCropStagedItem(null)}
          onSaveCrop={handleSaveStagedCrop}
        />
      )}
    </div>
  );
};
