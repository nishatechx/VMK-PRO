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
  Folder,
  FolderPlus,
  FolderOpen,
  Calendar,
  ArrowLeft,
  Wrench,
  FileUp,
  Send,
  RefreshCw,
} from 'lucide-react';
import {
  QrUploadedFile,
  CustomVaultFolder,
  formatBytes,
  fileToDataUrl,
  triggerFileDownload,
  printDocumentDirectly,
} from '../types/qrUpload';
import {
  qrUploadService,
  filterVaultFilesForUser,
  getCustomVaultFolders,
  fetchCustomVaultFoldersAsync,
  addCustomVaultFolder,
  removeCustomVaultFolder,
} from '../services/qrUploadService';
import { UserProfile } from '../types/auth';
import { getCurrentUser } from '../services/authService';
import { InSoftwareDocumentViewer } from './InSoftwareDocumentViewer';
import { SmartCropModal } from './SmartCropModal';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { autoCropAndOptimizeDocument } from '../utils/documentVision';
import { APP_ASSETS } from '../constants/assets';

interface QrUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onOpenImgToPdf?: () => void;
  onOpenImageToText?: (image?: string | QrUploadedFile) => void;
  onOpenTicketWithData?: (candidateData: any) => void;
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

function isTodayDate(isoString: string): boolean {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    // Files within 24 hours are always treated as today / current
    if (Math.abs(now.getTime() - d.getTime()) < 24 * 60 * 60 * 1000) {
      return true;
    }
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return true;
  }
}

function isYesterdayDate(isoString: string): boolean {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return (
      d.getDate() === yest.getDate() &&
      d.getMonth() === yest.getMonth() &&
      d.getFullYear() === yest.getFullYear()
    );
  } catch {
    return false;
  }
}

function getDateKey(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return 'unknown';
  }
}

function formatDateFolderLabel(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Archive';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (isYesterdayDate(isoString)) {
      return `Yesterday (${d.getDate()} ${months[d.getMonth()]})`;
    }
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'Archive';
  }
}

export const QrUploadModal: React.FC<QrUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenImgToPdf,
  onOpenImageToText,
  onOpenTicketWithData,
}) => {
  const activeUser = currentUser || getCurrentUser();
  const isDno = activeUser?.role === 'dno' || activeUser?.username?.toLowerCase() === 'dno';
  const userDistrict = activeUser?.district || 'Washim';

  const [sessionId, setSessionId] = useState<string>(() => {
    return 'VMK-' + Math.floor(100000 + Math.random() * 900000);
  });

  // Display mode: 'upload' (Files by QR + live uploaded files) | 'vault' (software vault) | 'dual' (split view) | 'tools' (upload tools & scanner)
  const [activeTab, setActiveTab] = useState<'upload' | 'vault' | 'dual' | 'tools'>('upload');
  const [sessionFiles, setSessionFiles] = useState<QrUploadedFile[]>([]);
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

  // Folder navigation and custom folders management (Isolated per user, with DNO audit view)
  const [customFolders, setCustomFolders] = useState<CustomVaultFolder[]>(() => getCustomVaultFolders(activeUser));
  const [activeFolder, setActiveFolder] = useState<{
    type: 'custom' | 'date';
    name: string;
    key: string;
  } | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [moveTargetFile, setMoveTargetFile] = useState<QrUploadedFile | null>(null);

  useEffect(() => {
    setCustomFolders(getCustomVaultFolders(activeUser));
  }, [activeUser]);

  // AI & Computer Vision Auto-Cropping States
  const [autoCropOnUpload, setAutoCropOnUpload] = useState<boolean>(true);
  const [isProcessingAutoCrop, setIsProcessingAutoCrop] = useState<boolean>(false);
  const [autoCropProgressText, setAutoCropProgressText] = useState<string>('');
  const [showLiveCameraModal, setShowLiveCameraModal] = useState<boolean>(false);
  const [showScanChoiceModal, setShowScanChoiceModal] = useState<boolean>(false);
  const [newUploadCropFile, setNewUploadCropFile] = useState<QrUploadedFile | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [stagedFiles, setStagedFiles] = useState<{
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
    isPdf: boolean;
    folder?: string;
  }[]>([]);
  const [isUploadingStaged, setIsUploadingStaged] = useState<boolean>(false);

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const singleScanFileInputRef = useRef<HTMLInputElement>(null);

  // Derive mobile upload URL with counselor and district context for strict isolation
  const uploadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?qrSession=${sessionId}&uploader=${encodeURIComponent(activeUser?.username || 'counsellor')}&uploaderName=${encodeURIComponent(activeUser?.fullName || activeUser?.username || 'Counselor')}&uploaderRole=${encodeURIComponent(activeUser?.role || 'counsellor')}&district=${encodeURIComponent(userDistrict)}`
    : `https://vmkwashim.gov.in/?qrSession=${sessionId}`;

  // Fetch session & vault files filtered strictly by user role and district
  const fetchFiles = async () => {
    try {
      const [fetchedSessionFiles, allVault, remoteFolders] = await Promise.all([
        qrUploadService.getFiles(sessionId),
        qrUploadService.getAllVaultFilesAsync(activeUser, sessionId),
        fetchCustomVaultFoldersAsync(activeUser),
      ]);
      setSessionFiles((prev) => {
        const sessionMap = new Map<string, QrUploadedFile>();
        prev.forEach((f) => sessionMap.set(f.id, f));
        fetchedSessionFiles.forEach((f) => sessionMap.set(f.id, f));
        return Array.from(sessionMap.values()).sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
      });

      setVaultFiles((prev) => {
        const mergedMap = new Map<string, QrUploadedFile>();
        prev.forEach((f) => mergedMap.set(f.id, f));
        allVault.forEach((f) => mergedMap.set(f.id, f));
        fetchedSessionFiles.forEach((f) => mergedMap.set(f.id, f));
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
      });
      setCustomFolders(remoteFolders);
    } catch {
      // fallback to sync cache
      const cached = qrUploadService.getAllVaultFiles(activeUser, sessionId);
      const cachedSession = qrUploadService.getFromLocalStorage(sessionId);
      setSessionFiles(cachedSession);
      setVaultFiles(cached);
      setCustomFolders(getCustomVaultFolders(activeUser));
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchFiles();

    // Fast polling every 1.5 seconds for fresh mobile uploads across devices
    const interval = setInterval(fetchFiles, 1500);

    const onIncomingFile = (newFile: QrUploadedFile) => {
      // If file was uploaded to THIS session, it is always accepted!
      const normActiveSession = String(sessionId || '').trim().toUpperCase();
      const normFileSession = String(newFile.sessionId || '').trim().toUpperCase();
      const isCurrentSession = normFileSession === normActiveSession || !newFile.sessionId;

      if (!isCurrentSession) {
        const filtered = filterVaultFilesForUser([newFile], activeUser, sessionId);
        if (filtered.length === 0) return;
      }

      // Ensure file is persisted to software vault cache immediately
      qrUploadService.saveToSoftwareVault(newFile);

      // Add to sessionFiles for real-time display under the QR code
      if (isCurrentSession) {
        setSessionFiles((prev) => {
          if (prev.some((f) => f.id === newFile.id)) return prev;
          return [newFile, ...prev];
        });
      }

      // Reset any active subfolder so user immediately sees the fresh incoming file in vault
      setActiveFolder(null);

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
              folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
              uploadedBy: activeUser?.username,
              uploaderName: activeUser?.fullName || activeUser?.username,
              uploaderRole: activeUser?.role,
              district: userDistrict,
            });
            croppedCount++;
          } catch (cropErr) {
            console.warn('[Auto-Crop Fallback to Raw File]', cropErr);
            await qrUploadService.uploadFile(sessionId, {
              name: file.name,
              type: file.type || 'image/jpeg',
              size: file.size,
              dataUrl: rawDataUrl,
              folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
              uploadedBy: activeUser?.username,
              uploaderName: activeUser?.fullName || activeUser?.username,
              uploaderRole: activeUser?.role,
              district: userDistrict,
            });
          }
        } else {
          await qrUploadService.uploadFile(sessionId, {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: rawDataUrl,
            folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
            uploadedBy: activeUser?.username,
            uploaderName: activeUser?.fullName || activeUser?.username,
            uploaderRole: activeUser?.role,
            district: userDistrict,
          });
        }
        processedCount++;
      }

      await fetchFiles();
      setActiveTab('vault');
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
    if (!e.target.files || e.target.files.length === 0) return;
    const inputFiles: File[] = Array.from(e.target.files);
    const newItems: {
      id: string;
      name: string;
      size: number;
      type: string;
      dataUrl: string;
      isPdf: boolean;
      folder?: string;
    }[] = [];

    for (const file of inputFiles) {
      const isImage = file.type ? file.type.startsWith('image/') : false;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ext && ['pdf', 'jpeg', 'jpg', 'png', 'webp', 'heic', 'heif'].includes(ext);

      if (!isImage && !isPdf && !isAllowedExt) {
        setStatusMessage({
          text: `Skipped "${file.name}": Only PDF, JPEG, PNG, and WebP files are allowed.`,
          type: 'error',
        });
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        newItems.push({
          id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          dataUrl,
          isPdf,
          folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
        });
      } catch (err) {
        console.warn('Failed to read file:', file.name, err);
      }
    }

    if (newItems.length > 0) {
      setStagedFiles((prev) => [...prev, ...newItems]);
      setStatusMessage({
        text: `✓ ${newItems.length} file(s) selected! Click "Upload to Vault" below to save to Software Vault.`,
        type: 'success',
      });
    }

    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllStaged = () => {
    setStagedFiles([]);
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  const handleUploadAllStaged = async () => {
    if (stagedFiles.length === 0) return;
    setIsUploadingStaged(true);
    setStatusMessage({
      text: `Uploading ${stagedFiles.length} file(s) to Software Vault...`,
      type: '',
    });

    try {
      const createdDocs: QrUploadedFile[] = [];
      for (const item of stagedFiles) {
        let finalDataUrl = item.dataUrl;
        let finalSize = item.size;

        if (!item.isPdf && autoCropOnUpload) {
          try {
            const optimized = await autoCropAndOptimizeDocument(item.dataUrl);
            if (optimized?.dataUrl) {
              finalDataUrl = optimized.dataUrl;
              finalSize = optimized.size;
            }
          } catch (cropErr) {
            console.warn('Perspective correction skipped, saving original file:', cropErr);
          }
        }

        const uploadedDoc = await qrUploadService.uploadFile(sessionId, {
          name: item.name,
          type: item.type,
          size: finalSize,
          dataUrl: finalDataUrl,
          category: item.isPdf ? 'PDF Document' : (autoCropOnUpload ? 'Auto-Cropped' : 'Camera-Scan'),
          folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
          uploadedBy: activeUser?.username,
          uploaderName: activeUser?.fullName || activeUser?.username,
          uploaderRole: activeUser?.role,
          district: userDistrict,
        });

        createdDocs.push(uploadedDoc);
      }

      setVaultFiles((prev) => {
        const existingIds = new Set(createdDocs.map((d) => d.id));
        return [...createdDocs, ...prev.filter((f) => !existingIds.has(f.id))];
      });

      await fetchFiles();
      setStagedFiles([]);
      setActiveTab('vault');

      setStatusMessage({
        text: `✓ ${createdDocs.length} document(s) uploaded successfully & available in Software Vault!`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to upload staged files:', err);
      setStatusMessage({
        text: 'Failed to upload document(s) to Vault. Please try again.',
        type: 'error',
      });
    } finally {
      setIsUploadingStaged(false);
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

  const handleSaveNewUploadCrop = async (
    croppedDataUrl: string,
    croppedSize: number,
    _isNewUpload?: boolean,
    allPages?: { dataUrl: string; size: number; name?: string }[]
  ) => {
    if (!newUploadCropFile) return;
    try {
      const createdDocs: QrUploadedFile[] = [];
      if (allPages && allPages.length > 1) {
        for (let i = 0; i < allPages.length; i++) {
          const pg = allPages[i];
          const pageName = pg.name || (i === 0 ? newUploadCropFile.name : `Page_${i + 1}_${newUploadCropFile.name}`);
          const uploadedDoc = await qrUploadService.uploadFile(sessionId, {
            name: pageName,
            type: 'image/jpeg',
            size: pg.size,
            dataUrl: pg.dataUrl,
            category: 'Auto-Cropped',
            folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
            uploadedBy: activeUser?.username,
            uploaderName: activeUser?.fullName || activeUser?.username,
            uploaderRole: activeUser?.role,
            district: userDistrict,
          });
          createdDocs.push(uploadedDoc);
        }
      } else {
        const uploadedDoc = await qrUploadService.uploadFile(sessionId, {
          name: newUploadCropFile.name,
          type: 'image/jpeg',
          size: croppedSize,
          dataUrl: croppedDataUrl,
          category: 'Auto-Cropped',
          folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
          uploadedBy: activeUser?.username,
          uploaderName: activeUser?.fullName || activeUser?.username,
          uploaderRole: activeUser?.role,
          district: userDistrict,
        });
        createdDocs.push(uploadedDoc);
      }

      setVaultFiles((prev) => {
        const existingIds = new Set(createdDocs.map((d) => d.id));
        return [...createdDocs, ...prev.filter((f) => !existingIds.has(f.id))];
      });
      await fetchFiles();
      setNewUploadCropFile(null);
      setActiveTab('vault');
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

  const handleLiveCameraCapture = async (capturedDataUrl: string, allPages?: string[]) => {
    setShowLiveCameraModal(false);
    const pagesToStage = allPages && allPages.length > 0 ? allPages : [capturedDataUrl];
    const newItems: {
      id: string;
      name: string;
      size: number;
      type: string;
      dataUrl: string;
      isPdf: boolean;
      folder?: string;
    }[] = [];

    for (let i = 0; i < pagesToStage.length; i++) {
      const pageDataUrl = pagesToStage[i];
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const fileName = pagesToStage.length > 1
        ? `Scan_${timestamp}_p${i + 1}.jpg`
        : `Scan_${timestamp}.jpg`;
      const size = Math.round((pageDataUrl.length * 3) / 4);

      newItems.push({
        id: `scan-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: fileName,
        size,
        type: 'image/jpeg',
        dataUrl: pageDataUrl,
        isPdf: false,
        folder: activeFolder?.type === 'custom' ? activeFolder.key : undefined,
      });
    }

    setStagedFiles((prev) => [...prev, ...newItems]);
    setStatusMessage({
      text: `✓ ${newItems.length} scanned photo(s) captured! Click "Upload to Vault" below to save to Software Vault.`,
      type: 'success',
    });
  };

  const handleCreateFolder = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const updated = addCustomVaultFolder(clean, activeUser);
    setCustomFolders(updated);
    setShowNewFolderModal(false);
    setNewFolderNameInput('');
    setStatusMessage({ text: `Folder "${clean}" created successfully!`, type: 'success' });
  };

  const handleDeleteCustomFolder = async (folderName: string) => {
    const updated = removeCustomVaultFolder(folderName, activeUser);
    setCustomFolders(updated);
    if (activeFolder && activeFolder.key.toLowerCase() === folderName.toLowerCase()) {
      setActiveFolder(null);
    }
    for (const f of vaultFiles) {
      if ((f.folder || '').toLowerCase() === folderName.toLowerCase()) {
        await qrUploadService.updateVaultFile(f.id, { folder: null, sessionId: f.sessionId });
      }
    }
    await fetchFiles();
    setStatusMessage({ text: `Folder "${folderName}" removed. Documents restored to date root.`, type: 'success' });
  };

  const handleMoveFileToFolder = async (file: QrUploadedFile, targetFolder: string | null) => {
    await qrUploadService.updateVaultFile(file.id, {
      folder: targetFolder,
      sessionId: file.sessionId || sessionId,
    });
    await fetchFiles();
    setMoveTargetFile(null);
    setStatusMessage({
      text: targetFolder ? `Moved "${file.name}" to folder "${targetFolder}"` : `Moved "${file.name}" to Root`,
      type: 'success',
    });
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
        uploadedBy: activeUser?.username || cropTargetFile.uploadedBy,
        uploaderName: activeUser?.fullName || activeUser?.username || cropTargetFile.uploaderName,
        uploaderRole: activeUser?.role || cropTargetFile.uploaderRole,
        district: userDistrict || cropTargetFile.district,
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

  // Counts and Categorization:
  // Date-wise archive folders for previous days (Yesterday, earlier dates)
  const dateWiseFolders = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; isYesterday: boolean; latestTime: number }>();
    vaultFiles.forEach((f) => {
      if (f.folder && f.folder.trim().length > 0) return; // Belongs to custom folder
      if (isTodayDate(f.uploadedAt)) return; // Today files are shown directly on root
      const key = getDateKey(f.uploadedAt);
      if (key === 'unknown') return;
      const existing = map.get(key);
      const fileTime = new Date(f.uploadedAt).getTime() || 0;
      if (existing) {
        existing.count += 1;
        if (fileTime > existing.latestTime) existing.latestTime = fileTime;
      } else {
        map.set(key, {
          key,
          label: formatDateFolderLabel(f.uploadedAt),
          count: 1,
          isYesterday: isYesterdayDate(f.uploadedAt),
          latestTime: fileTime,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.latestTime - a.latestTime);
  }, [vaultFiles]);

  // Files in current active category/folder view:
  // Root Vault: SHOW ONLY TODAY'S UPLOADED FILES!
  // Custom folder: SHOW FILES IN THAT CUSTOM FOLDER
  // Date folder: SHOW FILES FROM THAT SPECIFIC DATE
  const currentCategoryFiles = React.useMemo(() => {
    if (!activeFolder) {
      return vaultFiles.filter((f) => {
        // Documents placed into custom named folders show in those folders
        if (f.folder && f.folder.trim().length > 0) return false;
        // Documents uploaded during the active session ALWAYS show on root!
        if (f.sessionId && sessionId && f.sessionId.trim().toUpperCase() === sessionId.trim().toUpperCase()) return true;
        // Documents uploaded by current user show on root
        if (activeUser?.username && f.uploadedBy && f.uploadedBy.trim().toLowerCase() === activeUser.username.trim().toLowerCase()) return true;
        // Today's and recent documents show on root
        return isTodayDate(f.uploadedAt);
      });
    }
    if (activeFolder.type === 'custom') {
      return vaultFiles.filter((f) => (f.folder || '').trim().toLowerCase() === activeFolder.key.toLowerCase());
    }
    if (activeFolder.type === 'date') {
      return vaultFiles.filter((f) => (!f.folder || f.folder.trim().length === 0) && getDateKey(f.uploadedAt) === activeFolder.key);
    }
    return vaultFiles;
  }, [vaultFiles, activeFolder, sessionId]);

  // Counts for category tabs
  const totalCount = currentCategoryFiles.length;
  const pdfCount = currentCategoryFiles.filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  ).length;
  const imageCount = currentCategoryFiles.filter(
    (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(f.name)
  ).length;
  const verifiedCount = currentCategoryFiles.filter((f) => !!f.verifiedStamp).length;

  // Filter & Sort
  const displayedVaultFiles = currentCategoryFiles
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
                  ? 'max-w-5xl'
                  : activeTab === 'tools'
                  ? 'max-w-4xl'
                  : 'max-w-3xl'
              } bg-slate-100 text-slate-800 rounded-3xl shadow-2xl border border-slate-300/80 overflow-hidden my-auto max-h-[96vh] flex flex-col transition-all duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Switcher: Upload Options vs Software Vault (Google Files Material 3) */}
              <div className="bg-white text-[#1F1F1F] px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#E0E2EC] shrink-0 text-xs font-sans">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#F1F3F4] p-1 rounded-full border border-transparent">
                    <button
                      id="upload-switcher-upload-tab"
                      onClick={() => setActiveTab('upload')}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'upload'
                          ? 'bg-[#C2E7FF] text-[#001D35] shadow-none font-semibold'
                          : 'text-[#444746] hover:text-[#1F1F1F]'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Files by QR</span>
                      {sessionFiles.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B57D0] text-white">
                          {sessionFiles.length}
                        </span>
                      )}
                    </button>
                    <button
                      id="upload-switcher-vault-tab"
                      onClick={() => setActiveTab('vault')}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'vault'
                          ? 'bg-[#C2E7FF] text-[#001D35] shadow-none font-semibold'
                          : 'text-[#444746] hover:text-[#1F1F1F]'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Software Vault</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-[#001D35] border border-[#C4C7C5]">
                        {vaultFiles.length}
                      </span>
                    </button>
                    <button
                      id="upload-switcher-tools-tab"
                      onClick={() => setActiveTab('tools')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'tools'
                          ? 'bg-[#C2E7FF] text-[#001D35] shadow-none font-semibold'
                          : 'text-[#444746] hover:text-[#1F1F1F]'
                      }`}
                      title="Upload Tools & Scanner (QR साधने)"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>QR Tools</span>
                      {stagedFiles.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-white">
                          {stagedFiles.length}
                        </span>
                      )}
                    </button>
                    <button
                      id="upload-switcher-dual-tab"
                      onClick={() => setActiveTab('dual')}
                      className={`hidden md:flex px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer items-center gap-1 ${
                        activeTab === 'dual'
                          ? 'bg-[#C2E7FF] text-[#001D35] shadow-none font-semibold'
                          : 'text-[#444746] hover:text-[#1F1F1F]'
                      }`}
                      title="Side-by-side split view"
                    >
                      Split View
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[#444746] text-xs font-mono">
                    <span className="hidden sm:inline text-[#747775]">Session:</span>
                    <span className="bg-[#F1F3F4] px-2.5 py-0.5 rounded-full border border-[#E0E2EC] text-[#1F1F1F] font-bold">
                      #{sessionId}
                    </span>
                    <button
                      onClick={handleCopySessionId}
                      className="p-1 rounded-full text-[#444746] hover:text-[#1F1F1F] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
                      title="Copy Session ID"
                    >
                      {copiedSession ? <Check className="w-3.5 h-3.5 text-[#0B57D0]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] text-[#444746] hover:text-[#1F1F1F] flex items-center justify-center transition-colors cursor-pointer ml-1"
                    title="Close"
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
                      : activeTab === 'vault'
                      ? 'grid-cols-1 max-w-5xl mx-auto'
                      : activeTab === 'tools'
                      ? 'grid-cols-1 max-w-4xl mx-auto'
                      : 'grid-cols-1 max-w-3xl mx-auto'
                  }`}
                >
                  {/* ========================================================= */}
                  {/* UPLOAD OPTIONS PANEL (Google Files Material 3)            */}
                  {/* ========================================================= */}
                  {(activeTab === 'upload' || activeTab === 'dual') && (
                    <div
                      id="upload-options-panel"
                      className="bg-white rounded-3xl border border-[#E0E2EC] shadow-2xs flex flex-col overflow-hidden font-sans"
                    >
                      {/* Section Header */}
                      <div className="bg-white px-5 sm:px-6 py-4 border-b border-[#E0E2EC] flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center shrink-0">
                            <QrCode className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-[#1F1F1F] tracking-tight flex items-center gap-2">
                              <span>Files by QR</span>
                              {sessionFiles.length > 0 && (
                                <span className="bg-[#0B57D0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {sessionFiles.length} Uploaded
                                </span>
                              )}
                            </h2>
                            <p className="text-xs text-[#747775]">
                              Scan QR code with phone camera to take photos and upload documents directly
                            </p>
                          </div>
                        </div>

                        {activeTab !== 'dual' && (
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] text-[#444746] hover:text-[#1F1F1F] flex items-center justify-center transition-colors cursor-pointer"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Content Body */}
                      <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col bg-[#F8F9FA]">
                        {/* Option 1: Mobile Camera QR Code */}
                        <div className="bg-white rounded-2xl border border-[#E0E2EC] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-5 shadow-2xs">
                          {/* QR Code Container */}
                          <div className="relative p-3 bg-white rounded-2xl border border-[#E0E2EC] shadow-2xs shrink-0">
                            <div className="relative w-36 h-36 flex items-center justify-center">
                              <QRCodeSVG
                                value={uploadUrl}
                                size={144}
                                level="H"
                                includeMargin={false}
                                className="w-full h-full"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-9 h-9 bg-[#0B57D0] rounded-full flex items-center justify-center border-2 border-white shadow-sm text-white">
                                  <UploadCloud className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#001D35] text-xs font-medium">
                              <Smartphone className="w-3.5 h-3.5 text-[#0B57D0]" />
                              <span>Connect Mobile Device</span>
                            </div>
                            <p className="text-xs text-[#444746] leading-relaxed">
                              Scan this QR code with your phone camera to take photos and upload documents directly.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                              <span className="text-[11px] text-[#747775]">Session:</span>
                              <span className="font-mono font-medium text-xs text-[#1F1F1F] bg-[#F1F3F4] px-2.5 py-0.5 rounded-full border border-[#E0E2EC]">
                                #{sessionId}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopySessionId}
                                className="p-1 rounded-full text-[#747775] hover:text-[#1F1F1F] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
                                title="Copy Session ID"
                              >
                                {copiedSession ? (
                                  <Check className="w-3.5 h-3.5 text-[#0B57D0]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#444746] hover:text-[#1F1F1F] transition-colors cursor-pointer flex items-center gap-1"
                                title="Copy Mobile Link"
                              >
                                {copiedLink ? <Check className="w-3 h-3 text-[#0B57D0]" /> : <LinkIcon className="w-3 h-3" />}
                                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleOpenOnMobile}
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#444746] hover:text-[#1F1F1F] transition-colors cursor-pointer flex items-center gap-1"
                                title="Open Mobile Upload in new tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Link</span>
                              </button>
                            </div>
                            <div className="pt-1">
                              <div className="flex items-center gap-1.5 text-[11px] text-[#137333] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full font-medium inline-flex">
                                <span className="w-2 h-2 rounded-full bg-[#137333] animate-pulse"></span>
                                <span>Live sync active &bull; Uploaded files appear below instantly</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ========================================================= */}
                        {/* LIVE UPLOADED FILES SECTION (DIRECTLY UNDER QR CODE)      */}
                        {/* ========================================================= */}
                        <div className="bg-white rounded-2xl border border-[#E0E2EC] p-4 sm:p-5 shadow-2xs space-y-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E0E2EC]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center">
                                <FileText className="w-4 h-4 text-[#0B57D0]" />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-[#1F1F1F] flex items-center gap-2">
                                  <span>Documents Uploaded via QR</span>
                                  <span className="bg-[#E8F0FE] text-[#001D35] px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {sessionFiles.length}
                                  </span>
                                </h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={fetchFiles}
                                className="px-2.5 py-1 rounded-xl bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#444746] hover:text-[#1F1F1F] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                title="Refresh files"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Refresh</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTab('tools')}
                                className="px-2.5 py-1 rounded-xl bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#444746] hover:text-[#1F1F1F] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                title="Open QR Tools & Scanner"
                              >
                                <Wrench className="w-3.5 h-3.5 text-[#0B57D0]" />
                                <span>QR Tools</span>
                              </button>
                              {activeTab !== 'dual' && sessionFiles.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('vault')}
                                  className="px-2.5 py-1 rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View in Software Vault"
                                >
                                  <span>Vault ({vaultFiles.length}) →</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* When no files have been uploaded yet in this session */}
                          {sessionFiles.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-[#C4C7C5] bg-[#F8F9FA] p-6 text-center space-y-3.5">
                              <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#0B57D0] mx-auto flex items-center justify-center relative shadow-xs">
                                <Smartphone className="w-6 h-6 text-[#0B57D0]" />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0B57D0] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0B57D0]"></span>
                                </span>
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-[#1F1F1F]">
                                  Waiting for document uploads from phone...
                                </h4>
                                <p className="text-xs text-[#747775] max-w-md mx-auto leading-relaxed">
                                  Scan the QR code above with any mobile camera. Uploaded photos &amp; PDFs will appear here automatically with zero delay!
                                </p>
                              </div>

                              <div className="bg-white border border-[#E0E2EC] rounded-xl p-3 max-w-md mx-auto text-left text-xs text-[#444746] space-y-2 shadow-2xs font-sans">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                  <span>Scan the QR code above on candidate's mobile device</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                  <span>Snap document photo (Aadhaar, Marksheet, CET Form)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                  <span>Document will appear here &amp; can be sent directly to Ticket Generator</span>
                                </div>
                              </div>

                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('tools')}
                                  className="text-xs font-semibold text-[#0B57D0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  <span>Need to upload from this PC? Open QR Tools tab →</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Live Files Grid */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
                              {sessionFiles.map((file) => {
                                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                return (
                                  <div
                                    key={file.id}
                                    className="bg-white border border-[#E0E2EC] hover:border-[#0B57D0]/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all gap-3"
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      {/* Thumbnail */}
                                      <div
                                        onClick={() => setPreviewFile(file)}
                                        className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group relative"
                                        title="Click to preview"
                                      >
                                        {isPdf ? (
                                          <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center text-white">
                                            <FileText className="w-5 h-5 text-white" />
                                            <span className="text-[9px] font-bold mt-0.5">PDF</span>
                                          </div>
                                        ) : file.dataUrl ? (
                                          <img
                                            src={file.dataUrl}
                                            alt={file.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                          />
                                        ) : (
                                          <ImageIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                      </div>

                                      {/* Details */}
                                      <div className="min-w-0 flex-1">
                                        <h4
                                          onClick={() => setPreviewFile(file)}
                                          className="text-xs font-semibold text-[#1F1F1F] truncate hover:text-[#0B57D0] cursor-pointer"
                                          title={file.name}
                                        >
                                          {file.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <span className="text-[10px] font-medium bg-[#E8F0FE] text-[#001D35] px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                            {file.category || 'Candidate Document'}
                                          </span>
                                          <span className="text-[10px] text-[#747775]">
                                            {formatBytes(file.size)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#747775]">
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                            📱 QR Upload
                                          </span>
                                          <span>&bull;</span>
                                          <span>{formatDocumentDate(file.uploadedAt)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions Toolbar */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-[#F1F3F4]">
                                      <div className="flex items-center gap-1">
                                        {/* View Button */}
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile(file)}
                                          className="px-2.5 py-1 rounded-lg bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#1F1F1F] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                          title="View document"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-[#0B57D0]" />
                                          <span>View</span>
                                        </button>

                                        {/* Send to TG Button */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (onOpenTicketWithData) {
                                              onOpenTicketWithData({
                                                attachmentName: file.name,
                                                attachmentUrl: file.dataUrl,
                                                category: file.category,
                                                sessionId: file.sessionId || sessionId,
                                              });
                                              onClose();
                                            } else if (onOpenImageToText) {
                                              onOpenImageToText(file.dataUrl);
                                              onClose();
                                            }
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#0B57D0] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Send to Ticket Generator"
                                        >
                                          <Send className="w-3.5 h-3.5 text-[#0B57D0]" />
                                          <span>Send to TG</span>
                                        </button>

                                        {/* OCR / Image-to-Text */}
                                        {onOpenImageToText && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onOpenImageToText(file.dataUrl);
                                              onClose();
                                            }}
                                            className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Extract SAC form fields via AI"
                                          >
                                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                            <span className="hidden sm:inline">OCR</span>
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1">
                                        {/* Print */}
                                        <button
                                          type="button"
                                          onClick={() => printDocumentDirectly(file.dataUrl, file.name, !isPdf)}
                                          className="p-1 rounded-lg text-[#444746] hover:bg-[#F1F3F4] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                                          title="Print document"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Download */}
                                        <button
                                          type="button"
                                          onClick={() => triggerFileDownload(file.dataUrl, file.name)}
                                          className="p-1 rounded-lg text-[#444746] hover:bg-[#F1F3F4] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                                          title="Download to PC"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFile(file.id)}
                                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* QR TOOLS PANEL (Dedicated Upload & Scanner Tools Tab)      */}
                  {/* ========================================================= */}
                  {activeTab === 'tools' && (
                    <div
                      id="qr-tools-panel"
                      className="bg-white rounded-3xl border border-[#E0E2EC] shadow-2xs flex flex-col overflow-hidden font-sans"
                    >
                      {/* Section Header */}
                      <div className="bg-white px-5 sm:px-6 py-4 border-b border-[#E0E2EC] flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-[#1F1F1F] tracking-tight flex items-center gap-2">
                              <span>QR Tools &amp; Scanners</span>
                              <span className="bg-[#E8F0FE] text-[#001D35] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Direct PC Uploads
                              </span>
                            </h2>
                            <p className="text-xs text-[#747775]">
                              Webcam scanner, smart perspective crop, local document browser, and batch upload to Software Vault
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className="px-2.5 py-1 rounded-xl bg-[#F1F3F4] hover:bg-[#E0E2EC] text-[#444746] hover:text-[#1F1F1F] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Back to Files by QR"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#0B57D0]" />
                            <span>Files by QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-[#F1F3F4] text-[#444746] hover:text-[#1F1F1F] flex items-center justify-center transition-colors cursor-pointer"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-4 sm:p-6 space-y-4.5 flex-1 flex flex-col bg-[#F8F9FA]">
                        {/* 3 Action Tool Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Tool 1: Live Webcam Scanner */}
                          <div
                            onClick={() => setShowLiveCameraModal(true)}
                            className="bg-white border border-[#E0E2EC] hover:border-[#0B57D0] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="space-y-2">
                              <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] group-hover:bg-[#0B57D0] text-[#0B57D0] group-hover:text-white flex items-center justify-center transition-colors">
                                <Camera className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-[#1F1F1F] group-hover:text-[#0B57D0] transition-colors">
                                  Webcam / Live Scanner
                                </h3>
                                <p className="text-[11px] text-[#747775] leading-relaxed mt-1">
                                  Live camera feed with real-time corner &amp; border detection for physical docs
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowLiveCameraModal(true);
                              }}
                              className="mt-3 w-full py-1.5 rounded-xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#0B57D0] font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Launch Scanner
                            </button>
                          </div>

                          {/* Tool 2: Smart Crop & Straighten */}
                          <div
                            onClick={() => singleScanFileInputRef.current?.click()}
                            className="bg-white border border-[#E0E2EC] hover:border-purple-600 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="space-y-2">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                                <Crop className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-[#1F1F1F] group-hover:text-purple-600 transition-colors">
                                  Smart Crop &amp; Straighten
                                </h3>
                                <p className="text-[11px] text-[#747775] leading-relaxed mt-1">
                                  Select an image to adjust perspective, straighten tilt &amp; enhance contrast
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                singleScanFileInputRef.current?.click();
                              }}
                              className="mt-3 w-full py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Select &amp; Crop
                            </button>
                          </div>

                          {/* Tool 3: Browse Computer Files */}
                          <div
                            onClick={() => localFileInputRef.current?.click()}
                            className="bg-white border border-[#E0E2EC] hover:border-emerald-600 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="space-y-2">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                                <FileUp className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-[#1F1F1F] group-hover:text-emerald-700 transition-colors">
                                  Browse Files from PC
                                </h3>
                                <p className="text-[11px] text-[#747775] leading-relaxed mt-1">
                                  Select PDF, JPEG, PNG candidate documents from this PC (multi-file support)
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                localFileInputRef.current?.click();
                              }}
                              className="mt-3 w-full py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Choose Files
                            </button>
                          </div>
                        </div>

                        {/* AI Optimization Toggle & Scanner Settings Bar */}
                        <div className="bg-white border border-[#E0E2EC] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#1F1F1F]">
                                AI Auto-Crop &amp; Perspective Correction on Upload
                              </p>
                              <p className="text-[11px] text-[#747775]">
                                Automatically detects paper edges, removes background skew, and flattens orientation
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                            <input
                              type="checkbox"
                              checked={autoCropOnUpload}
                              onChange={(e) => setAutoCropOnUpload(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#C4C7C5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                          </label>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => localFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                            isDraggingOver
                              ? 'border-[#0B57D0] bg-[#E8F0FE]/50 scale-[0.99]'
                              : 'border-[#C4C7C5] hover:border-[#0B57D0] bg-white hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#0B57D0] mx-auto mb-2 flex items-center justify-center">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-[#1F1F1F]">
                            Drag &amp; Drop Documents from PC here
                          </h4>
                          <p className="text-xs text-[#747775] mt-1 max-w-sm mx-auto">
                            Supports candidate Mark Sheets, Caste Certificates, Domicile, and CET Form in PDF, JPG, PNG up to 50MB
                          </p>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F3F4] text-[#444746] text-[11px] font-medium">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Or click here to browse files</span>
                          </div>
                        </div>

                        {/* Staged Documents Queue */}
                        {stagedFiles.length > 0 && (
                          <div className="bg-white border-2 border-[#0B57D0]/40 rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-[#E0E2EC]">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0B57D0] animate-pulse" />
                                <h3 className="text-xs font-bold text-[#1F1F1F]">
                                  Selected &amp; Ready for Vault ({stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''})
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={clearAllStaged}
                                disabled={isUploadingStaged}
                                className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                Clear all
                              </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {stagedFiles.map((staged, idx) => (
                                <div
                                  key={staged.id}
                                  className="bg-[#F8F9FA] border border-[#E0E2EC] rounded-xl p-2.5 flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {staged.isPdf ? (
                                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                    ) : staged.dataUrl ? (
                                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden border border-slate-300">
                                        <img
                                          src={staged.dataUrl}
                                          alt={staged.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0">
                                        <ImageIcon className="w-4 h-4" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-[#1F1F1F] truncate">{staged.name}</p>
                                      <p className="text-[10px] text-[#747775]">
                                        {formatBytes(staged.size)} &bull; #{idx + 1}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => removeStagedFile(staged.id)}
                                      disabled={isUploadingStaged}
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={handleUploadAllStaged}
                              disabled={isUploadingStaged}
                              className="w-full py-2.5 rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isUploadingStaged ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Uploading to Software Vault...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-4 h-4" />
                                  <span>Upload {stagedFiles.length} File{stagedFiles.length > 1 ? 's' : ''} to Software Vault</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Bottom Navigation Links */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#E0E2EC]">
                          <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className="text-xs font-semibold text-[#0B57D0] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Files by QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('vault')}
                            className="text-xs font-semibold text-[#0B57D0] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Software Vault ({vaultFiles.length}) →</span>
                          </button>
                        </div>
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
                      {/* Clean Modern Vault Header */}
                      <div className="bg-gradient-to-r from-[#0056A6] to-[#003B73] px-5 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-xs border border-white/20">
                            <UploadCloud className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-white tracking-wide leading-tight flex items-center gap-2">
                              <span>Software Vault</span>
                              <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md border border-white/20">
                                {activeFolder ? activeFolder.name : "Today's Uploads"}
                              </span>
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewFolderModal(true)}
                            className="text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Create New Named Folder"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ New Folder</span>
                          </button>
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

                      {/* Folder Breadcrumb or Folder Selector */}
                      {activeFolder ? (
                        <div className="px-4 sm:px-5 py-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs select-none">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setActiveFolder(null)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#0056A6] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Today's Files</span>
                            </button>
                            <span className="text-slate-300 shrink-0">/</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                              {activeFolder.type === 'custom' ? (
                                <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                              ) : (
                                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                              <span className="truncate">{activeFolder.name}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                              {currentCategoryFiles.length} {currentCategoryFiles.length === 1 ? 'doc' : 'docs'}
                            </span>
                          </div>

                          {activeFolder.type === 'custom' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomFolder(activeFolder.name)}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold shrink-0"
                              title="Delete this folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Folder</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 select-none">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Folder className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-bold text-slate-700">Folders &amp; Archives</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {customFolders.length + dateWiseFolders.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowNewFolderModal(true)}
                              className="text-[11px] font-bold text-[#0056A6] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FolderPlus className="w-3 h-3" />
                              <span>+ Create Folder</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {/* Custom folders created by user */}
                            {customFolders.map((folder) => {
                              const folderName = folder.name;
                              const count = vaultFiles.filter((f) => (f.folder || '').trim().toLowerCase() === folderName.toLowerCase()).length;
                              const isOtherCreator = isDno && folder.createdBy && folder.createdBy.toLowerCase() !== (activeUser?.username || '').toLowerCase();
                              return (
                                <div
                                  key={folder.id || `${folderName}_${folder.createdBy}`}
                                  onClick={() => setActiveFolder({ type: 'custom', name: folderName, key: folderName })}
                                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 rounded-xl cursor-pointer transition-all shadow-2xs group"
                                >
                                  <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                                  <div className="text-left min-w-0">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900 truncate max-w-[130px]">{folderName}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <span>{count} {count === 1 ? 'doc' : 'docs'}</span>
                                      {isOtherCreator && (
                                        <span className="text-amber-700 font-medium truncate max-w-[80px]" title={`Created by ${folder.creatorName || folder.createdBy}`}>
                                          • {folder.creatorName || folder.createdBy}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Date-wise archive folders (Yesterday, previous dates) */}
                            {dateWiseFolders.map((dateGrp) => (
                              <div
                                key={dateGrp.key}
                                onClick={() => setActiveFolder({ type: 'date', name: dateGrp.label, key: dateGrp.key })}
                                className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition-all shadow-2xs group"
                              >
                                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                                <div className="text-left min-w-0">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900 truncate max-w-[150px]">{dateGrp.label}</p>
                                  <p className="text-[10px] text-slate-400">{dateGrp.count} {dateGrp.count === 1 ? 'doc' : 'docs'}</p>
                                </div>
                              </div>
                            ))}

                            {customFolders.length === 0 && dateWiseFolders.length === 0 && (
                              <span className="text-[11px] text-slate-400 py-1">
                                No past date archives. Click &quot;+ Create Folder&quot; to organize docs separately.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

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

                      {/* Staged Files Queue inside Vault View - Allows Review & Instant Upload */}
                      {stagedFiles.length > 0 && (
                        <div className="m-4 bg-white border-2 border-[#0B57D0]/40 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-[#E0E2EC]">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#0B57D0] animate-pulse" />
                              <h3 className="text-xs font-bold text-[#1F1F1F]">
                                Selected &amp; Ready for Vault ({stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''})
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={clearAllStaged}
                              disabled={isUploadingStaged}
                              className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              Clear all
                            </button>
                          </div>

                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {stagedFiles.map((staged, idx) => (
                              <div
                                key={staged.id}
                                className="bg-[#F8F9FA] border border-[#E0E2EC] rounded-xl p-2.5 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {staged.isPdf ? (
                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : staged.dataUrl ? (
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden border border-slate-300">
                                      <img
                                        src={staged.dataUrl}
                                        alt={staged.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0">
                                      <ImageIcon className="w-4 h-4" />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-[#1F1F1F] truncate">
                                      {staged.name}
                                    </p>
                                    <p className="text-[10px] text-[#747775]">
                                      {formatBytes(staged.size)} &bull; #{idx + 1}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeStagedFile(staged.id)}
                                  disabled={isUploadingStaged}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                  title="Remove file"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            id="vault-panel-make-upload-btn"
                            onClick={handleUploadAllStaged}
                            disabled={isUploadingStaged}
                            className="w-full h-11 rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                          >
                            {isUploadingStaged ? (
                              <>
                                <RotateCw className="w-4 h-4 animate-spin text-white" />
                                <span>Uploading to Software Vault...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-4 h-4 text-white" />
                                <span>
                                  Upload {stagedFiles.length} File{stagedFiles.length > 1 ? 's' : ''} to Vault
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Section Header: Today's Uploads or Current Folder */}
                      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs select-none">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          {activeFolder ? (
                            activeFolder.type === 'custom' ? (
                              <Folder className="w-4 h-4 text-amber-500 fill-amber-100" />
                            ) : (
                              <Calendar className="w-4 h-4 text-blue-600" />
                            )
                          ) : (
                            <FileText className="w-4 h-4 text-[#0056A6]" />
                          )}
                          <span>{activeFolder ? activeFolder.name : "Today's Uploaded Documents"}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                          {displayedVaultFiles.length} {displayedVaultFiles.length === 1 ? 'document' : 'documents'}
                        </span>
                      </div>

                      {/* Documents List View / Grid View */}
                      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[520px]">
                        {displayedVaultFiles.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-2">
                            <UploadCloud className="w-10 h-10 mx-auto text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">
                              {activeFolder ? `No documents in "${activeFolder.name}"` : "No documents uploaded today"}
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                              {activeFolder
                                ? "Use Scan or Upload to add documents to this folder."
                                : "Upload or scan new documents today, or view older days in the archive folders above."}
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
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <span className="inline-block text-[10px] font-semibold text-[#0056A6] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                        {file.category || 'Candidate Document'}
                                      </span>
                                      {file.folder && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          <Folder className="w-3 h-3 text-amber-500 fill-amber-100" />
                                          <span>{file.folder}</span>
                                        </span>
                                      )}
                                      {file.uploadedBy && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                          <span>By: {file.uploaderName || file.uploadedBy}</span>
                                          {file.district && <span className="text-blue-700 font-semibold">• {file.district}</span>}
                                        </span>
                                      )}
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

                                  {/* Move to Folder Button */}
                                  <button
                                    onClick={() => setMoveTargetFile(file)}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Move to named folder"
                                  >
                                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="hidden sm:inline">Move</span>
                                  </button>

                                  {/* Crop Button for Images */}
                                  {!isPdf && (
                                    <button
                                      onClick={() => setCropTargetFile(file)}
                                      className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Crop & Scan Document"
                                    >
                                      <Crop className="w-3.5 h-3.5 text-slate-600" />
                                      <span className="hidden sm:inline">Crop</span>
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
                                            setMoveTargetFile(file);
                                            setActiveDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        >
                                          <Folder className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Move to Folder...</span>
                                        </button>
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
                                            <Crop className="w-3.5 h-3.5 text-slate-600" />
                                            <span>Crop &amp; Rotate</span>
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
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                    <span>{formatBytes(file.size)}</span>
                                    {file.folder && (
                                      <span className="text-amber-700 font-semibold truncate max-w-[80px]">
                                        📁 {file.folder}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => setPreviewFile(file)}
                                        className="text-[11px] font-semibold text-[#0056A6] hover:underline"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => setMoveTargetFile(file)}
                                        className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                        title="Move to Folder"
                                      >
                                        <Folder className="w-3 h-3 text-amber-500" />
                                        <span>Move</span>
                                      </button>
                                      {!isPdf && (
                                        <button
                                          onClick={() => setCropTargetFile(file)}
                                          className="text-[11px] font-semibold text-slate-600 hover:text-[#0056A6] flex items-center gap-0.5 cursor-pointer"
                                          title="Crop & Rotate"
                                        >
                                          <Crop className="w-3 h-3 text-slate-500" />
                                          <span>Crop</span>
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
          onSaveCrop={async (croppedDataUrl, croppedSize, isNewUpload, processedPages) => {
            await handleSaveNewUploadCrop(croppedDataUrl, croppedSize, isNewUpload, processedPages);
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

      {/* Scan & Auto-Crop Choice Dialog (Google Files Material 3) */}
      {showScanChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E0E2EC] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center">
                  <Crop className="w-5 h-5 text-[#0B57D0]" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#1F1F1F]">Scan document</h3>
                  <p className="text-xs text-[#444746]">Choose how to capture your document</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScanChoiceModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F2F2] text-[#444746] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Scan with Camera */}
              <button
                type="button"
                onClick={() => {
                  setShowScanChoiceModal(false);
                  setShowLiveCameraModal(true);
                }}
                className="w-full text-left p-4 rounded-2xl border border-[#E0E2EC] hover:border-[#0B57D0] hover:bg-[#F7FAFE] transition-all cursor-pointer group flex items-start gap-3.5"
              >
                <div className="w-11 h-11 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5 text-[#0B57D0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-[#1F1F1F] group-hover:text-[#0B57D0] transition-colors">Camera scanner</span>
                  <p className="text-xs text-[#444746] mt-0.5 leading-snug">
                    Real-time document edge detection and auto-capture.
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
                className="w-full text-left p-4 rounded-2xl border border-[#E0E2EC] hover:border-[#0B57D0] hover:bg-[#F7FAFE] transition-all cursor-pointer group flex items-start gap-3.5"
              >
                <div className="w-11 h-11 rounded-full bg-[#F2F2F2] text-[#444746] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5 text-[#444746]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-[#1F1F1F] group-hover:text-[#0B57D0] transition-colors">Upload photo or document</span>
                  <p className="text-xs text-[#444746] mt-0.5 leading-snug">
                    Import existing image to crop, straighten, and scan.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScanChoiceModal(false)}
                className="px-5 py-2 rounded-full text-xs font-medium text-[#444746] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Named Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#0056A6]" />
                <h3 className="text-sm font-bold text-slate-900">New Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderNameInput('');
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                autoFocus
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderNameInput.trim()) {
                    handleCreateFolder(newFolderNameInput);
                  }
                }}
                placeholder="e.g. Caste Certificate, Income Proof"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0056A6] focus:border-[#0056A6]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderNameInput('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newFolderNameInput.trim()}
                onClick={() => handleCreateFolder(newFolderNameInput)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0056A6] text-white hover:bg-[#003B73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Document to Folder Dialog */}
      {moveTargetFile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="w-5 h-5 text-amber-500 fill-amber-100 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">Move to Folder</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{moveTargetFile.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoveTargetFile(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Root option (Remove from folder) */}
              <button
                type="button"
                onClick={() => handleMoveFileToFolder(moveTargetFile, null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  !moveTargetFile.folder
                    ? 'bg-blue-50 text-[#0056A6] border border-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Today's Files (No Folder)</span>
                </span>
                {!moveTargetFile.folder && <Check className="w-3.5 h-3.5 text-[#0056A6]" />}
              </button>

              {/* Custom Folders */}
              {customFolders.map((folder) => {
                const folderName = folder.name;
                const isSelected = (moveTargetFile.folder || '').toLowerCase() === folderName.toLowerCase();
                const isOtherCreator = isDno && folder.createdBy && folder.createdBy.toLowerCase() !== (activeUser?.username || '').toLowerCase();
                return (
                  <button
                    key={folder.id || `${folderName}_${folder.createdBy}`}
                    type="button"
                    onClick={() => handleMoveFileToFolder(moveTargetFile, folderName)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 border border-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-100 shrink-0" />
                      <span className="truncate">{folderName}</span>
                      {isOtherCreator && (
                        <span className="text-[10px] font-normal text-slate-400 truncate">
                          ({folder.creatorName || folder.createdBy})
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Quick new folder create inside move dialog */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or create new folder..."
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newFolderNameInput.trim()) {
                    const fName = newFolderNameInput.trim();
                    handleCreateFolder(fName);
                    await handleMoveFileToFolder(moveTargetFile, fName);
                  }
                }}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0056A6]"
              />
              <button
                type="button"
                disabled={!newFolderNameInput.trim()}
                onClick={async () => {
                  const fName = newFolderNameInput.trim();
                  if (!fName) return;
                  handleCreateFolder(fName);
                  await handleMoveFileToFolder(moveTargetFile, fName);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0056A6] text-white hover:bg-[#003B73] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                Create & Move
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setMoveTargetFile(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
