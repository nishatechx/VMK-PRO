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
      return {
        uploadedBy: sp.get('uploader') || undefined,
        uploaderName: sp.get('uploaderName') || sp.get('uploader') || undefined,
        uploaderRole: sp.get('uploaderRole') || 'counsellor',
        district: sp.get('district') || undefined,
      };
    }
    return {};
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

  const loadFiles = async () => {
    try {
      const list = await qrUploadService.getFiles(sessionId);
      setFiles(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 2500);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleFilesAdded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const newItems: StagedFileItem[] = [];
    let skippedCount = 0;

    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = extension && ['pdf', 'jpeg', 'jpg', 'png', 'webp'].includes(extension);

      if (!validTypes.includes(file.type) && !isAllowedExt) {
        skippedCount++;
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        skippedCount++;
        continue;
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let previewUrl: string | null = null;
      if (!isPdf && file.type.startsWith('image/')) {
        previewUrl = await fileToDataUrl(file);
      }

      newItems.push({
        id: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        isPdf,
      });
    }

    if (skippedCount > 0) {
      setStatusMsg({
        text: `${skippedCount} file(s) skipped. Only PDF, JPG, PNG under 50MB allowed.`,
        type: 'error',
      });
    } else {
      setStatusMsg({ text: '', type: '' });
    }

    if (newItems.length > 0) {
      setStagedFiles((prev) => [...prev, ...newItems]);
    }

    // Reset inputs so same file or camera capture can be triggered again
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const fileName = `Scan_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const newItem: StagedFileItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl: capturedDataUrl,
        isPdf: false,
      };

      setStagedFiles((prev) => [...prev, newItem]);
      setStatusMsg({
        text: 'Document scanned with AI and staged. Tap Crop to adjust if needed.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to process live scan capture:', err);
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

    setIsUploading(true);
    setUploadProgress(10);

    const total = stagedFiles.length;
    let completed = 0;
    let failureCount = 0;

    for (let i = 0; i < stagedFiles.length; i++) {
      const item = stagedFiles[i];
      try {
        const dataUrl = item.previewUrl || (await fileToDataUrl(item.file));

        await qrUploadService.uploadFile(sessionId, {
          name: item.file.name,
          type: item.file.type || 'application/octet-stream',
          size: item.file.size,
          dataUrl,
          uploadedBy: uploaderParams.uploadedBy,
          uploaderName: uploaderParams.uploaderName,
          uploaderRole: uploaderParams.uploaderRole,
          district: uploaderParams.district,
        });

        completed++;
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      } catch {
        failureCount++;
      }
    }

    setIsUploading(false);
    clearAllStaged();

    if (failureCount === 0) {
      setStatusMsg({
        text: `${completed} file${completed > 1 ? 's' : ''} uploaded successfully`,
        type: 'success',
      });
    } else {
      setStatusMsg({
        text: `Uploaded ${completed} file(s), ${failureCount} failed`,
        type: 'error',
      });
    }

    await loadFiles();
    setTimeout(() => {
      setStatusMsg((prev) => (prev.type === 'success' ? { text: '', type: '' } : prev));
    }, 4000);
  };

  const handleDelete = async (fileId: string) => {
    try {
      await qrUploadService.deleteFile(sessionId, fileId);
      await loadFiles();
    } catch {
      // ignore
    }
  };

  const shortSession = sessionId.length > 8 ? sessionId.slice(-6).toUpperCase() : sessionId.toUpperCase();

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

        {/* Upload Action Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Action Buttons: AI Scanner, Camera, and Browse Files */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="ai-scanner-btn"
              onClick={() => setShowLiveScanner(true)}
              className="h-13 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-98 text-white font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Live AI Document Scanner"
            >
              <Sparkles className="w-4 h-4 text-blue-200 animate-pulse" />
              <span>AI Scanner</span>
            </button>

            <button
              type="button"
              id="camera-capture-btn"
              onClick={() => cameraInputRef.current?.click()}
              className="h-13 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              id="browse-multiple-files-btn"
              onClick={() => fileInputRef.current?.click()}
              className="h-13 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-medium text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-slate-600" />
              <span>Browse Files</span>
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
            className="border border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-700">Choose multiple files or capture with camera</p>
            <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG up to 50MB</p>
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
                      <span>Upload {stagedFiles.length} Document{stagedFiles.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Uploaded Documents in Session */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Uploaded Documents</span>
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
