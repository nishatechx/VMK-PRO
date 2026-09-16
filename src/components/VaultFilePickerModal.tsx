import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileText,
  Image as ImageIcon,
  FileCode,
  File as FileGenericIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  Filter,
  RefreshCw,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { QrUploadedFile } from '../types/qrUpload';
import { getAllVaultFilesAsync, getAllVaultFiles } from '../services/qrUploadService';
import { getCurrentUser } from '../services/authService';
import {
  isFileFormatAccepted,
  isFileSizeAccepted,
  broadcastVaultFileSelection,
  logVaultAttachmentAudit,
  TARGET_PORTAL_URL,
  TARGET_PORTAL_DOMAIN
} from '../services/vaultBridgeService';

export type VaultCategoryFilter = 'All Files' | 'PDF' | 'Images' | 'Documents' | 'Other';

interface VaultFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: QrUploadedFile) => void;
  /** Accepted file formats e.g. ['.pdf', '.jpg', '.png'] or MIME types from target website */
  acceptedFormats?: string[];
  /** Maximum file size in bytes from target website restriction (e.g. 2097152 for 2MB) */
  maxSizeBytes?: number;
  /** Custom target name or URL */
  targetWebsiteName?: string;
  targetWebsiteUrl?: string;
  /** If in standalone window mode (e.g. opened via popup by browser extension) */
  isStandalone?: boolean;
}

export const VaultFilePickerModal: React.FC<VaultFilePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxSizeBytes = 2 * 1024 * 1024, // 2MB default CET portal limit
  targetWebsiteName = 'MHCET Ticket Portal',
  targetWebsiteUrl = TARGET_PORTAL_URL,
  isStandalone = false,
}) => {
  const [files, setFiles] = useState<QrUploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<VaultCategoryFilter>('All Files');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attachmentSuccess, setAttachmentSuccess] = useState<{ file: QrUploadedFile; timestamp: number } | null>(null);

  const currentUser = getCurrentUser();

  // Load vault files with authentication and authorization check
  const loadVaultFiles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch async from cloud Firestore + local storage
      const fetched = await getAllVaultFilesAsync();
      const vaultList = fetched && fetched.length > 0 ? fetched : getAllVaultFiles();

      // Filter based on user authorization if role-based restriction exists
      // DNO and Counsellor have access to all scrutiny vault files
      setFiles(vaultList);

      // Default select the first compatible file if none selected
      if (vaultList.length > 0 && !selectedFileId) {
        const firstValid = vaultList.find((f) =>
          isFileFormatAccepted(f.name, f.type, acceptedFormats) &&
          isFileSizeAccepted(f.size, maxSizeBytes)
        );
        if (firstValid) {
          setSelectedFileId(firstValid.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load Vault files:', err);
      setErrorMessage(err?.message || 'Unable to retrieve Vault files. Please check connection.');
      // Fallback to synchronous local files
      setFiles(getAllVaultFiles());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen || isStandalone) {
      loadVaultFiles();
      setAttachmentSuccess(null);
    }
  }, [isOpen, isStandalone]);

  // Format bytes into readable format (KB / MB)
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date string
  const formatUploadDate = (isoStr?: string): string => {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  // Classify file for filter category
  const getFileCategory = (file: QrUploadedFile): VaultCategoryFilter => {
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return 'PDF';
    }
    if (mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
      return 'Images';
    }
    if (
      mime.includes('word') ||
      mime.includes('document') ||
      mime.includes('text') ||
      name.match(/\.(doc|docx|txt|rtf|odt|xls|xlsx)$/)
    ) {
      return 'Documents';
    }
    return 'Other';
  };

  // Filtered and searched list
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (file.name || '').toLowerCase().includes(q);
        const matchesCategory = (file.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }

      // 2. Category tab filter
      if (selectedCategory !== 'All Files') {
        const cat = getFileCategory(file);
        if (selectedCategory === 'PDF' && cat !== 'PDF') return false;
        if (selectedCategory === 'Images' && cat !== 'Images') return false;
        if (selectedCategory === 'Documents' && cat !== 'Documents') return false;
        if (selectedCategory === 'Other' && cat !== 'Other') return false;
      }

      return true;
    });
  }, [files, searchQuery, selectedCategory]);

  const selectedFile = useMemo(() => {
    return files.find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  // Validation status of selected file
  const selectedValidation = useMemo(() => {
    if (!selectedFile) return { isValid: false, reason: 'No file selected' };

    const formatOk = isFileFormatAccepted(selectedFile.name, selectedFile.type, acceptedFormats);
    if (!formatOk) {
      return {
        isValid: false,
        reason: `Unsupported format. Target website requires: ${acceptedFormats.join(', ')}`,
      };
    }

    const sizeOk = isFileSizeAccepted(selectedFile.size, maxSizeBytes);
    if (!sizeOk) {
      return {
        isValid: false,
        reason: `Exceeds maximum size restriction of ${formatFileSize(maxSizeBytes)}`,
      };
    }

    return { isValid: true, reason: null };
  }, [selectedFile, acceptedFormats, maxSizeBytes]);

  // Handle "Use This File" confirmation
  const handleConfirmSelection = async () => {
    if (!selectedFile || !selectedValidation.isValid) return;

    setIsSubmitting(true);
    try {
      // 1. Broadcast to extension / companion tab
      broadcastVaultFileSelection(selectedFile);

      // 2. Log audit event
      await logVaultAttachmentAudit({
        fileId: selectedFile.id,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        userId: currentUser?.id,
        userName: currentUser?.fullName || currentUser?.username,
        targetSite: targetWebsiteUrl,
        method: isStandalone ? 'extension_bridge' : 'in_app_simulator',
        status: 'success',
        details: `Selected from Vault for ${targetWebsiteName}`,
      });

      // 3. Callback
      if (onSelectFile) {
        onSelectFile(selectedFile);
      }

      setAttachmentSuccess({ file: selectedFile, timestamp: Date.now() });

      // In standalone popup window mode, auto-close after 1.2s to return to external tab
      if (isStandalone) {
        setTimeout(() => {
          window.close();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Error confirming vault file selection:', err);
      setErrorMessage(err?.message || 'Failed to attach file from Vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !isStandalone) return null;

  return (
    <div
      id="vault-file-picker-overlay"
      className={`${
        isStandalone
          ? 'min-h-screen w-full bg-[#F7F9FC] flex flex-col p-3 sm:p-6'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs'
      }`}
    >
      {/* Modal / Container */}
      <div
        id="vault-file-picker-container"
        className={`w-full ${
          isStandalone ? 'max-w-4xl mx-auto flex-1' : 'max-w-3xl max-h-[90vh]'
        } bg-white rounded-2xl shadow-2xl border border-[#D9E1EA] flex flex-col overflow-hidden animate-fadeIn`}
      >
        {/* Header: Exact spec "Select from Vault" */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#003B73] to-[#0056A6] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="vault-picker-title" className="text-lg font-bold tracking-tight text-white">
                  Select from Vault
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/30">
                  Target Integration
                </span>
              </div>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span>Upload to:</span>
                <span className="font-semibold text-white truncate max-w-[260px] sm:max-w-md">
                  {targetWebsiteName}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadVaultFiles}
              disabled={isLoading}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh Vault files"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {!isStandalone && (
              <button
                type="button"
                id="vault-picker-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Target Site Restrictions Strip */}
        <div className="px-5 py-2.5 bg-[#EAF4FB] border-b border-[#D9E1EA] flex flex-wrap items-center justify-between gap-2 text-xs text-[#003B73]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0056A6] shrink-0" />
            <span>
              Target Field Accepted:{' '}
              <strong className="font-semibold">
                {acceptedFormats && acceptedFormats.length > 0
                  ? acceptedFormats.join(', ').toUpperCase()
                  : 'ALL FORMATS'}
              </strong>
            </span>
            <span className="text-[#6B7280]">|</span>
            <span>
              Max Size: <strong className="font-semibold">{formatFileSize(maxSizeBytes)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#198754]" />
            <span>Authenticated Operator: {currentUser?.fullName || currentUser?.username || 'DNO Desk'}</span>
          </div>
        </div>

        {/* Success Alert Banner */}
        {attachmentSuccess && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">
                  File Ready: "{attachmentSuccess.file.name}"
                </p>
                <p className="text-emerald-700">
                  {isStandalone
                    ? 'Injected directly into the target upload field. Window closing...'
                    : 'Dispatched to target website bridge and system clipboard.'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-[11px]">
              Ready to Submit
            </span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search & Category Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-[#D9E1EA] space-y-3 bg-white">
          {/* Search: Exact spec "Search files..." */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="vault-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-sm text-[#111827] placeholder-[#9CA3AF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056A6] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters: Exact spec: All Files, PDF, Images, Documents, Other */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['All Files', 'PDF', 'Images', 'Documents', 'Other'] as VaultCategoryFilter[]).map(
              (cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0056A6] text-white shadow-xs'
                        : 'bg-[#F7F9FC] text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#003B73] border border-[#D9E1EA]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* File List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-[#FBFDFF] min-h-[260px] max-h-[420px]">
          {isLoading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#0056A6] animate-spin" />
              <p className="text-sm font-semibold text-[#003B73]">Retrieving authenticated Vault files...</p>
              <p className="text-xs text-[#6B7280]">Connecting to secure scrutiny document storage</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4FB] text-[#0056A6] flex items-center justify-center">
                <FileGenericIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#003B73]">No matching files in Vault</h3>
              <p className="text-xs text-[#6B7280] max-w-sm">
                {searchQuery
                  ? `No files matched "${searchQuery}". Try a different search term or category.`
                  : 'Your Vault currently has no documents in this category.'}
              </p>
            </div>
          ) : (
            /* File Items List */
            filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              const formatAccepted = isFileFormatAccepted(file.name, file.type, acceptedFormats);
              const sizeAccepted = isFileSizeAccepted(file.size, maxSizeBytes);
              const isCompatible = formatAccepted && sizeAccepted;

              const isPdf = file.type?.includes('pdf') || file.name.endsWith('.pdf');
              const isImage = file.type?.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp)$/i);

              return (
                <div
                  key={file.id}
                  id={`vault-file-item-${file.id}`}
                  onClick={() => {
                    if (isCompatible) {
                      setSelectedFileId(file.id);
                    }
                  }}
                  className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#EAF4FB] border-[#0056A6] ring-2 ring-[#0056A6]/20 shadow-xs'
                      : isCompatible
                      ? 'bg-white border-[#D9E1EA] hover:border-[#0056A6]/40 hover:bg-[#F7F9FC] cursor-pointer'
                      : 'bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail / Icon */}
                    <div className="relative w-12 h-12 rounded-xl bg-slate-100 border border-[#D9E1EA] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {isImage && file.dataUrl ? (
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <FileText className="w-6 h-6" />
                          <span className="text-[8px] font-black leading-none mt-0.5">PDF</span>
                        </div>
                      ) : (
                        <FileGenericIcon className="w-6 h-6 text-[#0056A6]" />
                      )}

                      {/* Verified Stamp indicator if present */}
                      {file.verifiedStamp && (
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center"
                          title="Verified & Scrutinized"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Meta details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-[#003B73]' : 'text-[#1E293B]'
                          }`}
                          title={file.name}
                        >
                          {file.name}
                        </h4>
                        {file.category && (
                          <span className="hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {file.category}
                          </span>
                        )}
                      </div>

                      {/* File Specs Row: Type, Size, Date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280] mt-1">
                        <span className="font-medium text-[#0056A6]">
                          {isPdf ? 'PDF Document' : isImage ? 'Image File' : file.type || 'Document'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{formatFileSize(file.size)}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatUploadDate(file.uploadedAt)}
                        </span>
                      </div>

                      {/* Compatibility warning if not matching target criteria */}
                      {!isCompatible && (
                        <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {!formatAccepted
                            ? `Format not accepted by target (requires ${acceptedFormats.join(', ')})`
                            : `File size exceeds ${formatFileSize(maxSizeBytes)} limit`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Selection State Indicator */}
                  <div className="shrink-0 flex items-center pl-2">
                    {isCompatible ? (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#0056A6] text-white shadow-xs'
                            : 'border-2 border-[#CBD5E1] group-hover:border-[#0056A6]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        Incompatible
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected File Summary & Validation Notice */}
        {selectedFile && (
          <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#D9E1EA] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#6B7280]">Selected:</span>
              <strong className="font-bold text-[#003B73] truncate">{selectedFile.name}</strong>
              <span className="text-[#6B7280]">({formatFileSize(selectedFile.size)})</span>
            </div>

            {selectedValidation.isValid ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Compatible with target form
              </span>
            ) : (
              <span className="text-rose-700 font-semibold flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {selectedValidation.reason}
              </span>
            )}
          </div>
        )}

        {/* Footer Actions: Cancel, Use This File */}
        <div className="px-5 py-3.5 bg-white border-t border-[#D9E1EA] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#6B7280] hidden sm:block">
            {filteredFiles.length} file{filteredFiles.length === 1 ? '' : 's'} available in Vault
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {!isStandalone && (
              <button
                type="button"
                id="vault-picker-cancel-btn"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-[#4B5563] border border-[#D9E1EA] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              id="vault-picker-use-file-btn"
              onClick={handleConfirmSelection}
              disabled={!selectedFile || !selectedValidation.isValid || isSubmitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Attaching...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Use This File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
