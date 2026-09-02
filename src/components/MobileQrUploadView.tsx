import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Camera,
  RefreshCw,
  ArrowLeft,
  FileUp,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { QrUploadedFile, formatBytes, fileToDataUrl, triggerFileDownload } from '../types/qrUpload';
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

  // Load existing session files
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

    // Validate type (PDF, JPEG, PNG)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = extension && ['pdf', 'jpeg', 'jpg', 'png'].includes(extension);

    if (!validTypes.includes(file.type) && !isAllowedExt) {
      setStatusMsg({
        text: 'Invalid file type! Please choose a PDF, JPEG, or PNG file.',
        type: 'error',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatusMsg({
        text: 'File size exceeds 50MB limit.',
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

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      setUploadProgress(60);

      const uploaded = await qrUploadService.uploadFile(sessionId, {
        name: selectedFile.name,
        type: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
        dataUrl,
      });

      setUploadProgress(100);
      setIsUploading(false);
      setSelectedFile(null);
      setFilePreview(null);

      // Reset file input values
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      setStatusMsg({
        text: `"${uploaded.name}" has been transmitted & downloaded instantly into the software console!`,
        type: 'success',
      });

      await loadFiles();
    } catch (err) {
      setIsUploading(false);
      setStatusMsg({
        text: 'Failed to upload file. Please try again.',
        type: 'error',
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    if (window.confirm('Delete this file from software?')) {
      await qrUploadService.deleteFile(sessionId, fileId);
      await loadFiles();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Mobile Header */}
      <header className="bg-gradient-to-r from-[#091a30] via-[#0f2747] to-[#1b4b80] border-b border-blue-500/20 px-4 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow text-white font-bold">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                Document Scanner Desk
              </h1>
              <p className="text-[10px] text-blue-200 font-mono">
                SESSION: <span className="font-bold text-amber-300">#{sessionId}</span>
              </p>
            </div>
          </div>

          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-100 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Main Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* Status Message */}
        {statusMsg.text && (
          <div
            className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-medium ${
              statusMsg.type === 'error'
                ? 'bg-red-950/80 text-red-200 border border-red-500/40'
                : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{statusMsg.text}</span>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-[#132d52] border border-blue-400/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              Upload Candidate Document
            </h2>
            <p className="text-xs text-blue-200/90">
              Format: <span className="font-bold text-amber-300">PDF, JPEG, PNG</span> • Downloads directly into software
            </p>
          </div>

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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

          {/* Action Buttons: Camera & File Browse */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-3 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 shadow-md border border-blue-300/30 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-blue-200" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-3 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 shadow-md border border-emerald-300/30 active:scale-95 transition-all cursor-pointer"
            >
              <FileUp className="w-5 h-5 text-emerald-200" />
              <span>Browse PDF / Image</span>
            </button>
          </div>

          {/* Drag or Drop Area / Tap To Browse */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-400/40 hover:border-emerald-400 rounded-xl p-5 text-center bg-[#0a1e38]/60 cursor-pointer transition-colors"
          >
            <UploadCloud className="w-8 h-8 text-blue-300 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-white">Tap here to select PDF or JPEG/PNG document</p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Instant transmission to in-software storage</p>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="bg-[#091a30] border border-emerald-500/40 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                {selectedFile.type === 'application/pdf' ? (
                  <div className="w-10 h-10 rounded-lg bg-red-600/30 border border-red-400/40 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-emerald-300 font-mono">
                    {formatBytes(selectedFile.size)} • {selectedFile.type || 'Document'}
                  </p>
                </div>
              </div>

              {/* Upload Action */}
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transmitting to Software... ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Send & Download to Software
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Uploaded Files in this Session */}
        <div className="bg-[#132d52] border border-blue-400/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-blue-400/20 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Transmitted to Software ({files.length})
            </h3>
            <button
              onClick={loadFiles}
              className="text-[11px] text-blue-200 hover:text-white flex items-center gap-1 font-mono"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-6 text-blue-200/70 text-xs">
              No files uploaded yet in this session. Select a file above to upload.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {files.map((file) => {
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={file.id}
                    className="bg-[#091a30] border border-blue-400/20 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-400/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isPdf ? (
                        <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-400/40 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-red-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-white truncate">{file.name}</p>
                          {file.verifiedStamp && (
                            <span className="text-[8px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded border border-emerald-400/30 font-mono">
                              VERIFIED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-blue-300/80 font-mono">
                          {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Optional Download to Phone */}
                      <button
                        onClick={() => triggerFileDownload(file.dataUrl, file.name)}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors cursor-pointer"
                        title="Download to Phone"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Delete File"
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

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-blue-300/60 border-t border-blue-500/10">
        Direct In-Software E-Scrutiny File Transmission
      </footer>
    </div>
  );
};
