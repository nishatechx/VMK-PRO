import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  CheckCircle2,
  FileText,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { QrUploadedFile, formatBytes, printDocumentDirectly, triggerFileDownload } from '../types/qrUpload';
import { qrUploadService } from '../services/qrUploadService';

interface InSoftwareDocumentViewerProps {
  file: QrUploadedFile | null;
  allFiles?: QrUploadedFile[];
  onClose: () => void;
  onSelectFile?: (file: QrUploadedFile) => void;
}

export const InSoftwareDocumentViewer: React.FC<InSoftwareDocumentViewerProps> = ({
  file,
  allFiles = [],
  onClose,
  onSelectFile,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(() => !!file?.verifiedStamp);

  if (!file) return null;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const currentIndex = allFiles.findIndex((f) => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFiles.length - 1;

  const handleNext = () => {
    if (hasNext && onSelectFile) {
      onSelectFile(allFiles[currentIndex + 1]);
      setZoom(100);
      setRotation(0);
    }
  };

  const handlePrev = () => {
    if (hasPrev && onSelectFile) {
      onSelectFile(allFiles[currentIndex - 1]);
      setZoom(100);
      setRotation(0);
    }
  };

  const handleToggleStamp = () => {
    const updated = qrUploadService.toggleVerifyStamp(file.sessionId, file.id);
    setIsVerified(updated);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#D9E1EA] max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Control Bar */}
          <div className="px-5 py-3.5 bg-[#003B73] border-b border-[#002850] flex flex-wrap items-center justify-between gap-3 shrink-0 text-white select-none">
            {/* File Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-[#0056A6] border border-white/20 flex items-center justify-center shrink-0">
                {isPdf ? <FileText className="w-4 h-4 text-rose-200" /> : <Sparkles className="w-4 h-4 text-amber-200" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md" title={file.name}>
                    {file.name}
                  </h3>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    📥 In-Software Loaded
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-blue-100 font-mono">
                  {formatBytes(file.size)} • {file.category || 'Document'} • Uploaded: {new Date(file.uploadedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* In-Software Toolbar Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Previous / Next File in session */}
              {allFiles.length > 1 && (
                <div className="flex items-center bg-[#002850] border border-[#0056A6]/40 rounded-xl p-0.5 mr-1">
                  <button
                    disabled={!hasPrev}
                    onClick={handlePrev}
                    className="p-1 rounded-lg text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Previous Document"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono px-1.5 text-blue-100">
                    {currentIndex + 1}/{allFiles.length}
                  </span>
                  <button
                    disabled={!hasNext}
                    onClick={handleNext}
                    className="p-1 rounded-lg text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Next Document"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Zoom Controls for Images */}
              {!isPdf && (
                <div className="hidden sm:flex items-center bg-[#002850] border border-[#0056A6]/40 rounded-xl p-0.5">
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 20))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono px-1.5 text-white">{zoom}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(300, z + 20))}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer ml-0.5"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Verification Stamp Button */}
              <button
                onClick={handleToggleStamp}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isVerified
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/20'
                }`}
                title="Stamp as Verified"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isVerified ? 'Verified ✓' : 'Mark Verified'}</span>
              </button>

              {/* Print Directly from Software */}
              <button
                onClick={() => printDocumentDirectly(file.dataUrl, file.name, !isPdf)}
                className="px-3 py-1.5 rounded-xl bg-[#0056A6] hover:bg-[#002850] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-white/20 cursor-pointer"
                title="Print Document directly without saving to PC disk"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Copy Base64 / Link */}
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Copy Data Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Optional Export to PC Device */}
              <button
                onClick={() => triggerFileDownload(file.dataUrl, file.name)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Export / Save Copy to PC Device"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Close Viewer */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-1"
                title="Close Viewer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Document Display Area */}
          <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center bg-[#F7F9FC] relative min-h-[60vh] max-h-[78vh]">
            {/* Verification Official Watermark Stamp (if stamped) */}
            {isVerified && (
              <div className="absolute top-4 right-4 z-20 pointer-events-none bg-emerald-900/90 border-2 border-emerald-400 text-emerald-100 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 transform rotate-[-3deg] backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div className="text-left font-mono">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                    VERIFIED & SCRUTINIZED
                  </div>
                  <div className="text-[9px] text-emerald-300">DOCUMENT VERIFICATION • IN-SOFTWARE REPOSITORY</div>
                </div>
              </div>
            )}

            {isPdf ? (
              <iframe
                src={file.dataUrl}
                title={file.name}
                className="w-full h-[72vh] rounded-xl border border-[#D9E1EA] shadow-lg bg-white"
              />
            ) : (
              <div
                className="flex items-center justify-center transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-[#D9E1EA] select-none pointer-events-auto bg-white"
                />
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 bg-white border-t border-[#D9E1EA] flex items-center justify-between text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Loaded directly from in-software document memory (No device storage required)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-[#F7F9FC] hover:bg-[#EAF4FB] text-[#003B73] border border-[#D9E1EA] text-xs font-bold transition-colors cursor-pointer"
              >
                Back to Documents
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
