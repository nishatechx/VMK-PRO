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
} from 'lucide-react';
import { QrUploadedFile, formatBytes, fileToDataUrl } from '../types/qrUpload';
import { qrUploadService } from '../services/qrUploadService';

interface MobileQrUploadViewProps {
  sessionId: string;
  onBackToMain?: () => void;
}

export const MobileQrUploadView: React.FC<MobileQrUploadViewProps> = ({ sessionId, onBackToMain }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [files, setFiles] = useState<QrUploadedFile[]>([]);
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
    const interval = setInterval(loadFiles, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = extension && ['pdf', 'jpeg', 'jpg', 'png', 'webp'].includes(extension);

    if (!validTypes.includes(file.type) && !isAllowedExt) {
      setStatusMsg({
        text: 'Please select a PDF or image file (JPG, PNG).',
        type: 'error',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatusMsg({
        text: 'File size must be under 50MB.',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);
    setStatusMsg({ text: '', type: '' });

    if (file.type.startsWith('image/')) {
      const dataUrl = await fileToDataUrl(file);
      setFilePreview(dataUrl);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(25);

    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      setUploadProgress(70);

      await qrUploadService.uploadFile(sessionId, {
        name: selectedFile.name,
        type: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
        dataUrl,
      });

      setUploadProgress(100);
      setIsUploading(false);
      clearSelection();

      setStatusMsg({
        text: 'File uploaded successfully',
        type: 'success',
      });

      await loadFiles();
      setTimeout(() => {
        setStatusMsg((prev) => (prev.type === 'success' ? { text: '', type: '' } : prev));
      }, 4000);
    } catch {
      setIsUploading(false);
      setStatusMsg({
        text: 'Upload failed. Please try again.',
        type: 'error',
      });
    }
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
      {/* Minimal Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 shadow-xs">
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

        {/* Upload Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Action Buttons: Camera & File Browse */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <FileUp className="w-4 h-4 text-slate-600" />
              <span>Browse File</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drop / Tap Target */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-700">Tap to choose document</p>
            <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG up to 50MB</p>
          </div>

          {/* Selected File Card */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {selectedFile.type === 'application/pdf' ? (
                      <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">{formatBytes(selectedFile.size)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={isUploading}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Uploaded Documents List */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
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
                    className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors"
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
                          {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
};
