import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  Copy,
  Download,
  Check,
  RotateCw,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Columns,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  FileImage,
  CheckCheck,
  CornerUpLeft,
  Languages,
  Key,
  ExternalLink,
  CheckCircle2,
  Lock,
  FolderArchive,
  Search,
  CheckSquare,
  Square,
  Ticket,
  Plus,
  ArrowRight,
  Sparkles,
  Send,
  FolderDown,
  Loader2,
} from 'lucide-react';
import { APP_ASSETS } from '../constants/assets';
import { extractTextClientSide, translateTextClientSide } from '../utils/geminiVisionClient';
import { UserProfile } from '../types/auth';
import { getCurrentUser, DNO_USER } from '../services/authService';
import {
  getMasterApiKey,
  subscribeToMasterApiKey,
  hasUserApiKeyPermission,
} from '../services/apiConfigService';
import { qrUploadService, QrUploadedFile } from '../services/qrUploadService';
import { captureTicketDetailsFromText, CapturedTicketDetails } from '../utils/ticketExtractor';
import { safeStorage } from '../utils/safeStorage';

export interface UploadedImagePage {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  width?: number;
  height?: number;
  extractedText?: string;
  unclearCount?: number;
  isProcessing?: boolean;
}

interface ImageToTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  currentUser?: UserProfile | null;
  onSendToTicketGenerator?: (details: CapturedTicketDetails) => void;
}

export const ImageToTextModal: React.FC<ImageToTextModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  currentUser,
  onSendToTicketGenerator,
}) => {
  const [pages, setPages] = useState<UploadedImagePage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [activeTextTab, setActiveTextTab] = useState<'original' | 'translated'>('original');
  const [textLayoutMode, setTextLayoutMode] = useState<'split' | 'expanded'>('split');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [promptGuidance, setPromptGuidance] = useState<string>('');
  const [showGuidanceInput, setShowGuidanceInput] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      safeStorage.getItem('vmk_gemini_api_key') ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ''
    );
  });
  const [masterApiKey, setMasterApiKey] = useState<string>(() => getMasterApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  // Software Vault browsing state
  const [isVaultPickerOpen, setIsVaultPickerOpen] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<QrUploadedFile[]>([]);
  const [selectedVaultFileIds, setSelectedVaultFileIds] = useState<string[]>([]);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState('ALL');
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  // Send to TG feedback
  const [tgNotification, setTgNotification] = useState<string | null>(null);
  // Extraction mode: 'ticket_fields' extracts strictly the 8 ticket fields, 'default' extracts full OCR text
  const [extractionMode, setExtractionMode] = useState<'ticket_fields' | 'default'>('ticket_fields');

  const activeUser = currentUser || getCurrentUser();
  const isAuthorizedForMasterKey = hasUserApiKeyPermission(activeUser);
  const isDNO =
    activeUser?.role === 'dno' ||
    activeUser?.email?.toLowerCase() === DNO_USER.email.toLowerCase() ||
    activeUser?.username?.toLowerCase() === 'dno';

  useEffect(() => {
    const unsub = subscribeToMasterApiKey((key) => {
      setMasterApiKey(key);
    });
    return () => unsub();
  }, []);

  const getEffectiveApiKey = (): string => {
    if (isAuthorizedForMasterKey && masterApiKey) {
      return masterApiKey;
    }
    return (
      apiKey.trim() ||
      safeStorage.getItem('vmk_gemini_api_key')?.trim() ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY?.trim() ||
      ''
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Software Vault browsing helpers
  const openVaultPicker = async () => {
    setIsVaultPickerOpen(true);
    setSelectedVaultFileIds([]);
    setVaultSearchQuery('');
    setVaultCategoryFilter('ALL');
    setIsLoadingVault(true);

    const cached = qrUploadService.getAllVaultFiles();
    setVaultFiles(cached);

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

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const eligibleVaultImages = vaultFiles.filter((f) => {
    const isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf');
    if (isPdf) return false;
    const isImage =
      (f.type && f.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|bmp|svg)$/i.test(f.name || '') ||
      (f.dataUrl && (f.dataUrl.startsWith('data:image/') || f.dataUrl.startsWith('blob:') || f.dataUrl.startsWith('http')));
    return (isImage || !isPdf) && Boolean(f.dataUrl);
  });

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    eligibleVaultImages.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return Array.from(cats);
  }, [eligibleVaultImages]);

  const displayedVaultImages = eligibleVaultImages.filter((f) => {
    const matchSearch =
      !vaultSearchQuery ||
      f.name.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      (f.candidateName && f.candidateName.toLowerCase().includes(vaultSearchQuery.toLowerCase())) ||
      (f.cetApplicationId && f.cetApplicationId.toLowerCase().includes(vaultSearchQuery.toLowerCase()));

    const matchCategory =
      vaultCategoryFilter === 'ALL' ||
      (f.category && f.category.toUpperCase() === vaultCategoryFilter.toUpperCase());

    return matchSearch && matchCategory;
  });

  const handleToggleVaultSelection = (id: string) => {
    setSelectedVaultFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVaultImages = () => {
    const displayedIds = displayedVaultImages.map((f) => f.id);
    const allSelected =
      displayedIds.length > 0 && displayedIds.every((id) => selectedVaultFileIds.includes(id));
    if (allSelected) {
      setSelectedVaultFileIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      setSelectedVaultFileIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleAddSelectedFromVault = () => {
    if (selectedVaultFileIds.length === 0) return;
    const selectedFiles = vaultFiles.filter((f) => selectedVaultFileIds.includes(f.id));

    const newPages: UploadedImagePage[] = selectedFiles.map((vf, idx) => ({
      id: `vault-${vf.id}-${Date.now()}-${idx}`,
      name: vf.name,
      size: vf.size || 0,
      dataUrl: vf.dataUrl,
    }));

    // Measure dimensions asynchronously
    newPages.forEach((page) => {
      const img = new Image();
      img.onload = () => {
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id ? { ...p, width: img.naturalWidth, height: img.naturalHeight } : p
          )
        );
      };
      img.src = page.dataUrl;
    });

    setPages((prev) => {
      const combined = [...prev, ...newPages];
      if (prev.length === 0 && newPages.length > 0) {
        setActivePageIndex(0);
      }
      return combined;
    });

    setZoomLevel(1);
    setRotation(0);
    setIsVaultPickerOpen(false);
    setSelectedVaultFileIds([]);
  };

  // Auto-resize textarea to match text length so no inner scrolling is needed
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const minH = textLayoutMode === 'expanded' ? 360 : 260;
      textareaRef.current.style.height = `${Math.max(minH, scrollH + 12)}px`;
    }
  }, [textLayoutMode]);

  // Initialize with initial image if provided
  useEffect(() => {
    if (initialImage && isOpen) {
      const pageId = `img-${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        setPages((prev) =>
          prev.map((p) =>
            p.id === pageId ? { ...p, width: img.naturalWidth, height: img.naturalHeight } : p
          )
        );
      };
      img.src = initialImage;

      const newPage: UploadedImagePage = {
        id: pageId,
        name: 'Document Image',
        size: Math.round((initialImage.length * 3) / 4),
        dataUrl: initialImage,
      };
      setPages([newPage]);
      setActivePageIndex(0);
      setExtractedText('');
      setTranslatedText('');
      setErrorMessage(null);
      setZoomLevel(1);
      setRotation(0);
    }
  }, [initialImage, isOpen]);

  // Handle global paste for images
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      // If user is focused on the editable text area or an input, don't hijack paste
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = Array.from(e.clipboardData.items);
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              handleIncomingFiles([file]);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const activePage = pages[activePageIndex] || null;

  // Process incoming files
  const handleIncomingFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) => {
      const type = file.type.toLowerCase();
      return (
        type === 'image/jpeg' ||
        type === 'image/jpg' ||
        type === 'image/png' ||
        type === 'image/webp'
      );
    });

    if (validFiles.length === 0) {
      setErrorMessage('Please upload supported image formats: JPG, JPEG, PNG, or WEBP.');
      return;
    }

    setErrorMessage(null);

    const loadPromises = validFiles.map((file) => {
      return new Promise<UploadedImagePage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: file.size,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.onerror = () => {
            resolve({
              id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: file.size,
              dataUrl,
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadPromises).then((newItems) => {
      setPages((prev) => {
        const combined = [...prev, ...newItems];
        if (prev.length === 0 && newItems.length > 0) {
          setActivePageIndex(0);
        }
        return combined;
      });
      setZoomLevel(1);
      setRotation(0);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePage = (indexToRemove: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length === 0) {
        setExtractedText('');
        setActivePageIndex(0);
      } else if (activePageIndex >= updated.length) {
        setActivePageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  // Helper to ensure image fits within Vercel body limits while keeping crystal clear text resolution (max 2048px)
  const optimizeImageForOcr = async (dataUrl: string, maxDimension = 2048): Promise<string> => {
    if (!dataUrl || dataUrl.length < 600000) return dataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(dataUrl);
          return;
        }
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 1500000) {
          resolve(dataUrl);
          return;
        }
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Save API key locally
  const handleSaveApiKey = (keyToSave: string) => {
    const cleanKey = keyToSave.trim();
    if (!cleanKey) return;
    safeStorage.setItem('vmk_gemini_api_key', cleanKey);
    setApiKey(cleanKey);
    setKeySavedMessage('API Key saved successfully!');
    setTimeout(() => {
      setKeySavedMessage(null);
      setShowApiKeyModal(false);
    }, 1200);

    // If pages are already loaded and no text extracted, automatically extract
    if (pages.length > 0 && !extractedText) {
      setTimeout(() => {
        handleExtractText('all');
      }, 500);
    }
  };

  const handleRemoveApiKey = () => {
    safeStorage.removeItem('vmk_gemini_api_key');
    setApiKey('');
    setTempApiKey('');
    setKeySavedMessage('API Key removed.');
    setTimeout(() => {
      setKeySavedMessage(null);
    }, 1200);
  };

  // Run AI Vision Extraction
  const handleExtractText = async (
    targetMode: 'current' | 'all' = 'all',
    forcedMode?: 'ticket_fields' | 'default'
  ): Promise<string | null> => {
    if (pages.length === 0) {
      setErrorMessage('Please upload at least one image to extract text.');
      return null;
    }

    const activeMode = forcedMode || extractionMode;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStep(
      activeMode === 'ticket_fields'
        ? 'Scanning document to extract 8 Candidate Ticket fields...'
        : 'Optimizing document resolution for vision AI...'
    );

    const imagesToProcess =
      targetMode === 'current' && activePage
        ? [activePage]
        : pages;

    try {
      // Optimize images to ensure payload comfortably fits within network limits
      const optimizedImages = await Promise.all(
        imagesToProcess.map(async (p) => {
          const optimizedDataUrl = await optimizeImageForOcr(p.dataUrl);
          return {
            dataUrl: optimizedDataUrl,
            name: p.name,
          };
        })
      );

      setAnalysisStep(
        activeMode === 'ticket_fields'
          ? 'Extracting Candidate Name, CET No, CAP No, DOB, Mobile, Email, Course & Query...'
          : 'Analyzing complete visual context & orientation...'
      );

      const stepTimer1 = setTimeout(() => {
        setAnalysisStep(
          activeMode === 'ticket_fields'
            ? 'Parsing application identifiers and candidate contact details...'
            : 'Recognizing Marathi, Hindi & English scripts and handwriting...'
        );
      }, 1400);

      const stepTimer2 = setTimeout(() => {
        setAnalysisStep(
          activeMode === 'ticket_fields'
            ? 'Formatting 8 candidate fields for SAC Ticket Generator...'
            : 'Detecting reading order, paragraphs & structured tables...'
        );
      }, 3000);

      const effectiveKey = getEffectiveApiKey();

      const payload = {
        images: optimizedImages,
        prompt: promptGuidance.trim() || undefined,
        apiKey: effectiveKey || undefined,
        mode: activeMode,
      };

      let extractionSuccess = false;
      let resultText = '';
      let resultPages: any[] = [];

      // 1. Try server endpoint first (/api/image-to-text)
      try {
        const response = await fetch('/api/image-to-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveKey ? { 'x-gemini-api-key': effectiveKey } : {}),
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        let data: any = null;

        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }

        if (response.ok && data?.success) {
          extractionSuccess = true;
          resultText = data.text || '';
          resultPages = Array.isArray(data.pages) ? data.pages : [];
        } else if (data?.error && !data.error.includes('GEMINI_API_KEY')) {
          // If server returned a genuine vision error (e.g. rate limit), throw it
          throw new Error(data.error);
        } else {
          // Server returned HTML (e.g. 404) or missing key error
          throw new Error(data?.error || `Server HTTP ${response.status}`);
        }
      } catch (serverErr: any) {
        console.warn('Server endpoint /api/image-to-text failed or unavailable:', serverErr);

        // 2. Resilient Fallback: If server is unavailable (e.g. on static Vercel build), use client-side Gemini Vision
        if (effectiveKey) {
          setAnalysisStep('Processing with Google Gemini AI...');
          const clientData = await extractTextClientSide(
            effectiveKey,
            optimizedImages,
            promptGuidance.trim() || undefined,
            activeMode
          );
          extractionSuccess = true;
          resultText = clientData.text || '';
          resultPages = clientData.pages || [];
        } else {
          // No client key and server failed
          if (!isAuthorizedForMasterKey) {
            throw new Error(
              isDNO
                ? 'Gemini Vision API access is not granted to your account by the District Nodal Officer (DNO). Please request permission from DNO in User Management, or click "Configure API Key" to enter a personal key.'
                : 'Gemini Vision API access is not granted to your account by the District Nodal Officer (DNO). Please contact the DNO to enable access.'
            );
          } else {
            throw new Error(
              isDNO
                ? 'The central Master Gemini API Key is not configured yet. The District Nodal Officer (DNO) can set it in User Management, or you can click "Configure API Key" to enter a key directly.'
                : 'The central Master Gemini API Key is not configured yet. Please contact the District Nodal Officer (DNO) to set it up.'
            );
          }
        }
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!extractionSuccess || !resultText) {
        throw new Error('Could not extract text from document.');
      }

      setAnalysisStep(
        activeMode === 'ticket_fields'
          ? 'Verifying 8 ticket generator fields...'
          : 'Finalizing verbatim transcription...'
      );

      // Update text in state
      setExtractedText(resultText);
      setTranslatedText('');
      setActiveTextTab('original');

      // Also attach text back to individual page objects
      if (Array.isArray(resultPages) && resultPages.length > 0) {
        setPages((prev) => {
          return prev.map((p) => {
            const match = resultPages.find((dp: any) => dp.name === p.name);
            if (match) {
              return {
                ...p,
                extractedText: match.text,
                unclearCount: (match.text.match(/\[unclear\]/gi) || []).length,
              };
            }
            return p;
          });
        });
      }

      // Auto-focus textarea for quick editing
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);

      return resultText;
    } catch (err: any) {
      console.error('Extraction error:', err);
      const raw = String(err?.message || err || '');
      let clean = 'Error occurred while communicating with the AI vision service.';
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error?.message) {
          clean = parsed.error.message;
        }
      } catch {
        if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
          clean = 'The AI model is experiencing a temporary spike in demand on Google servers. Please click Retry.';
        } else if (raw.trim()) {
          clean = raw;
        }
      }
      setErrorMessage(clean);
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Translate Marathi / Hindi text to English
  const handleTranslateToEnglish = async () => {
    if (!extractedText.trim() || isTranslating) return;

    setIsTranslating(true);
    setErrorMessage(null);

    const effectiveKey = getEffectiveApiKey();

    try {
      let translationSuccess = false;
      let englishTranslation = '';

      // 1. Try server endpoint first
      try {
        const response = await fetch('/api/translate-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveKey ? { 'x-gemini-api-key': effectiveKey } : {}),
          },
          body: JSON.stringify({
            text: extractedText,
            targetLanguage: 'English',
            apiKey: effectiveKey || undefined,
          }),
        });

        const responseText = await response.text();
        let data: any = null;

        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }

        if (response.ok && data?.success) {
          translationSuccess = true;
          englishTranslation = data.translatedText || '';
        } else {
          throw new Error(data?.error || `Server HTTP ${response.status}`);
        }
      } catch (serverErr: any) {
        console.warn('Server translation endpoint failed, trying client fallback:', serverErr);

        if (effectiveKey) {
          englishTranslation = await translateTextClientSide(effectiveKey, extractedText);
          translationSuccess = true;
        } else {
          if (!isAuthorizedForMasterKey) {
            throw new Error(
              isDNO
                ? 'Gemini Vision API access is not granted to your account by the District Nodal Officer (DNO). Please request permission from DNO in User Management, or click "Configure API Key" to enter a personal key.'
                : 'Gemini Vision API access is not granted to your account by the District Nodal Officer (DNO). Please contact the DNO to enable access.'
            );
          } else {
            throw new Error(
              isDNO
                ? 'Translation service unreachable. Please click "Configure API Key" to provide your Gemini API key or ask the DNO to set the Master Key in User Management.'
                : 'Translation service is currently unreachable. Please try again or contact the District Nodal Officer (DNO).'
            );
          }
        }
      }

      if (!translationSuccess || !englishTranslation) {
        throw new Error('Failed to translate text into English.');
      }

      setTranslatedText(englishTranslation);
      setActiveTextTab('translated');
      setTextLayoutMode('expanded'); // Automatically open translation expanded to full text length!

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        adjustTextareaHeight();
      }, 100);
    } catch (err: any) {
      console.error('Translation error:', err);
      setErrorMessage(err?.message || 'Error occurred while communicating with the translation service.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Active text being viewed or edited in textarea
  const currentText = activeTextTab === 'original' ? extractedText : translatedText;

  // Real-time extracted ticket details for Candidate Name, CET App No, CAP App No, DOB, Mobile, Email, Course, Query
  const detectedTicketFields = useMemo<CapturedTicketDetails | null>(() => {
    if (!currentText || !currentText.trim()) return null;
    return captureTicketDetailsFromText(currentText);
  }, [currentText]);

  // Send to TG (SAC Ticket Generator) with strictly extracted 8 candidate details:
  // 1. Candidate Name
  // 2. CET Application Number
  // 3. CAP Application Number
  // 4. DOB (Date of Birth)
  // 5. Mobile Number
  // 6. Email ID
  // 7. Course Name
  // 8. Query
  const handleSendToTicketGenerator = async () => {
    let textToCapture =
      activeTextTab === 'translated' && translatedText.trim()
        ? `${extractedText}\n${translatedText}`
        : currentText;

    // If no text is extracted yet but images exist, run 8 ticket fields extraction first
    if (!textToCapture.trim()) {
      if (pages.length > 0) {
        setTgNotification('Extracting 8 ticket fields from document image...');
        const extracted = await handleExtractText('all', 'ticket_fields');
        if (extracted) {
          textToCapture = extracted;
        } else {
          return;
        }
      } else {
        setErrorMessage(
          'Please upload a candidate document image or paste text first before sending to SAC Ticket Generator.'
        );
        return;
      }
    }

    const captured = captureTicketDetailsFromText(textToCapture);

    // 1. Candidate Name resolution with priority fallbacks:
    // (a) Memoized detectedTicketFields from active text currently shown to user
    // (b) Current captured text
    // (c) Original extracted text
    // (d) Translated text
    // (e) Text from any loaded document page
    // (f) Document metadata from vault if loaded from vault
    let resolvedCandidateName = (detectedTicketFields?.candidateName || captured.candidateName || '').trim();

    if (!resolvedCandidateName && extractedText.trim()) {
      const extCap = captureTicketDetailsFromText(extractedText);
      if (extCap.candidateName) resolvedCandidateName = extCap.candidateName.trim();
    }

    if (!resolvedCandidateName && translatedText.trim()) {
      const transCap = captureTicketDetailsFromText(translatedText);
      if (transCap.candidateName) resolvedCandidateName = transCap.candidateName.trim();
    }

    if (!resolvedCandidateName && pages.length > 0) {
      for (const p of pages) {
        if (p.extractedText) {
          const pCap = captureTicketDetailsFromText(p.extractedText);
          if (pCap.candidateName) {
            resolvedCandidateName = pCap.candidateName.trim();
            break;
          }
        }
      }
    }

    if (!resolvedCandidateName && selectedVaultFileIds.length > 0) {
      const matchedVault = vaultFiles.find((f) => selectedVaultFileIds.includes(f.id) && f.candidateName);
      if (matchedVault?.candidateName) {
        resolvedCandidateName = matchedVault.candidateName.trim();
      }
    }

    // 2. CET Application Number resolution
    let resolvedCetNo = (detectedTicketFields?.cetNo || captured.cetNo || '').trim();
    if (!resolvedCetNo && pages.length > 0) {
      for (const p of pages) {
        if (p.extractedText) {
          const pCap = captureTicketDetailsFromText(p.extractedText);
          if (pCap.cetNo) {
            resolvedCetNo = pCap.cetNo.trim();
            break;
          }
        }
      }
    }
    if (!resolvedCetNo && selectedVaultFileIds.length > 0) {
      const matchedVault = vaultFiles.find((f) => selectedVaultFileIds.includes(f.id) && f.cetApplicationId);
      if (matchedVault?.cetApplicationId) {
        resolvedCetNo = matchedVault.cetApplicationId.trim();
      }
    }

    // 3. CAP Application Number resolution
    let resolvedCapId = (detectedTicketFields?.capId || captured.capId || '').trim();
    if (!resolvedCapId && pages.length > 0) {
      for (const p of pages) {
        if (p.extractedText) {
          const pCap = captureTicketDetailsFromText(p.extractedText);
          if (pCap.capId) {
            resolvedCapId = pCap.capId.trim();
            break;
          }
        }
      }
    }

    // 4. DOB (Date of Birth) resolution
    let resolvedDob = (detectedTicketFields?.dob || captured.dob || '').trim();

    // 5. Mobile Number resolution
    let resolvedMobile = (detectedTicketFields?.mobile || captured.mobile || '').trim();

    // 6. Email ID resolution
    let resolvedEmail = (detectedTicketFields?.email || captured.email || '').trim();

    // 7. Course Name resolution
    let resolvedCourse = (detectedTicketFields?.course || captured.course || '').trim();

    // 8. Query resolution
    let resolvedQuery = (detectedTicketFields?.query || captured.query || '').trim();

    // Send strictly the respective 8 fields to TG with comprehensive aliases for seamless transmission
    const ticketPayload = {
      // Candidate Name aliases
      candidateName: resolvedCandidateName,
      name: resolvedCandidateName,
      candidate_name: resolvedCandidateName,
      candidate: resolvedCandidateName,
      studentName: resolvedCandidateName,
      student_name: resolvedCandidateName,
      applicantName: resolvedCandidateName,
      applicant_name: resolvedCandidateName,
      fullName: resolvedCandidateName,
      full_name: resolvedCandidateName,
      candidatename: resolvedCandidateName,
      'Candidate Name': resolvedCandidateName,
      'Candidate name': resolvedCandidateName,
      'candidate name': resolvedCandidateName,
      'Student Name': resolvedCandidateName,
      'Applicant Name': resolvedCandidateName,
      'Full Name': resolvedCandidateName,
      Name: resolvedCandidateName,
      FullName: resolvedCandidateName,
      Candidate: resolvedCandidateName,
      'उमेदवाराचे नाव': resolvedCandidateName,
      'नाव': resolvedCandidateName,

      // Application IDs
      cetNo: resolvedCetNo,
      capId: resolvedCapId,
      cetApplicationNumber: resolvedCetNo,
      capApplicationNumber: resolvedCapId,
      cetAppNo: resolvedCetNo,
      capAppNo: resolvedCapId,
      cetApplicationNo: resolvedCetNo,
      capApplicationNo: resolvedCapId,

      // DOB
      dob: resolvedDob,
      birthDate: resolvedDob,
      dateOfBirth: resolvedDob,

      // Mobile Number
      mobile: resolvedMobile,
      phone: resolvedMobile,
      mobileNumber: resolvedMobile,

      // Email ID
      email: resolvedEmail,
      emailId: resolvedEmail,

      // Course Name
      course: resolvedCourse,
      courseName: resolvedCourse,

      // Query
      query: resolvedQuery,
      grievance: resolvedQuery,
    };

    if (onSendToTicketGenerator) {
      setTgNotification('Sending 8 extracted details to respective fields in Ticket Generator...');
      onSendToTicketGenerator(ticketPayload);
    }
  };

  // Re-adjust textarea height to match text length on content, tab, or mode change
  useEffect(() => {
    const timer = setTimeout(() => {
      adjustTextareaHeight();
    }, 60);
    return () => clearTimeout(timer);
  }, [currentText, activeTextTab, textLayoutMode, isExpanded, adjustTextareaHeight]);

  // Check if extracted text contains Devanagari script (Marathi / Hindi)
  const hasIndicText = /[\u0900-\u097F]/.test(extractedText);

  // Handle textarea editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (activeTextTab === 'original') {
      setExtractedText(val);
    } else {
      setTranslatedText(val);
    }
  };

  // Action: Copy Text
  const handleCopyText = async () => {
    if (!currentText) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    }
  };

  // Action: Download TXT
  const handleDownloadTxt = () => {
    if (!currentText) return;
    const blob = new Blob([currentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = activePage?.name
      ? activePage.name.replace(/\.[^/.]+$/, '')
      : 'document';
    const suffix = activeTextTab === 'translated' ? '_english_translation' : '_transcription';
    link.href = url;
    link.download = `${baseName}${suffix}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Action: Select All
  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  };

  // Action: Clear text
  const handleClear = () => {
    if (activeTextTab === 'original') {
      setExtractedText('');
    } else {
      setTranslatedText('');
    }
    setErrorMessage(null);
  };

  // Action: Reset All (Images + Text + View)
  const handleResetAll = () => {
    setPages([]);
    setExtractedText('');
    setTranslatedText('');
    setActiveTextTab('original');
    setIsTranslating(false);
    setErrorMessage(null);
    setActivePageIndex(0);
    setZoomLevel(1);
    setRotation(0);
    setPromptGuidance('');
    setShowGuidanceInput(false);
    setIsAnalyzing(false);
    setAnalysisStep('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Unclear tags count
  const unclearCount = (currentText.match(/\[unclear\]/gi) || []).length;

  // Text metrics
  const charCount = currentText.length;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const lineCount = currentText ? currentText.split('\n').length : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-fade-in overflow-hidden">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-[#D9E1EA] w-full transition-all duration-200 flex flex-col overflow-hidden ${
          isExpanded
            ? 'max-w-[99vw] h-[98vh]'
            : textLayoutMode === 'expanded'
            ? 'max-w-5xl h-[94vh]'
            : 'max-w-6xl h-[94vh]'
        }`}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#D9E1EA] bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#D9E1EA] p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              <img src={APP_ASSETS.IMAGE_TO_TEXT} alt="Image to Text" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1F2937] leading-tight">
                Image to Text
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDNO && (
              <>
                {isAuthorizedForMasterKey && masterApiKey ? (
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800"
                    title="DNO Central Master Key active. No manual key entry required."
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">DNO Master Key Active</span>
                  </div>
                ) : !isAuthorizedForMasterKey ? (
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800"
                    title="Access restricted: DNO has not enabled Gemini API Key access for your account."
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">API Access Restricted</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setTempApiKey(apiKey);
                    setShowApiKeyModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isAuthorizedForMasterKey && masterApiKey
                      ? 'border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/70'
                      : apiKey
                      ? 'border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100/70'
                      : 'border-[#D9E1EA] text-[#4B5563] hover:text-[#0056A6] hover:bg-blue-50'
                  }`}
                  title="Configure Gemini API Key"
                >
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">
                    {isAuthorizedForMasterKey && masterApiKey
                      ? 'API Key (DNO)'
                      : apiKey
                      ? 'API Key Active'
                      : 'API Key'}
                  </span>
                  {(isAuthorizedForMasterKey && masterApiKey) || apiKey ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Key Ready" />
                  ) : null}
                </button>
              </>
            )}

            {(pages.length > 0 || extractedText.length > 0) && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 border border-[#D9E1EA] hover:border-red-200 transition-colors cursor-pointer"
                title="Reset all images and text"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded((exp) => !exp)}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
              title={isExpanded ? 'Restore window size' : 'Maximize window for full text length view'}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TG Transfer Notification Banner */}
        {tgNotification && (
          <div className="px-4 sm:px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{tgNotification}</span>
          </div>
        )}

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isDNO && (
                <button
                  type="button"
                  onClick={() => {
                    setTempApiKey(apiKey);
                    setShowApiKeyModal(true);
                  }}
                  className="px-2.5 py-1 bg-[#0056A6] hover:bg-[#004080] text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Key className="w-3 h-3" />
                  <span>Configure API Key</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleExtractText('all')}
                disabled={isAnalyzing}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-amber-700 hover:text-amber-950 p-1 rounded-md cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleIncomingFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {/* Main Work Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Image Upload & Preview Pane */}
          {(textLayoutMode === 'split' || pages.length === 0) && (
            <div className="lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[#D9E1EA] bg-[#FAFBFD] overflow-hidden min-h-[280px]">
              {pages.length === 0 ? (
              /* Empty State / Drag & Drop Upload Zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 m-4 sm:m-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-[#0056A6] bg-[#EAF4FB]'
                    : 'border-[#CBD5E1] hover:border-[#0056A6] bg-white hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#EAF4FB] text-[#0056A6] flex items-center justify-center mb-3 shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#1F2937] mb-1">
                  Drag & Drop Image Here
                </h3>
                <p className="text-xs text-[#6B7280] mb-4">
                  JPG, JPEG, PNG, WEBP
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0056A6] hover:bg-[#004080] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileImage className="w-4 h-4" />
                    <span>Select Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openVaultPicker();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Browse documents from Software Vault"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>Browse from Vault</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Image Preview & Page Carousel */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Image Toolbar */}
                <div className="px-3 sm:px-4 py-2 border-b border-[#D9E1EA] bg-white flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#1F2937] truncate max-w-[150px] sm:max-w-[200px]">
                      {activePage?.name || 'Document'}
                    </span>
                    {activePage?.width && (
                      <span className="text-[11px] text-[#6B7280] hidden sm:inline">
                        ({activePage.width} × {activePage.height}px)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={openVaultPicker}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold transition-colors cursor-pointer ml-1 shrink-0"
                      title="Browse documents from Software Vault"
                    >
                      <FolderArchive className="w-3 h-3 text-emerald-600" />
                      <span>Vault</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 rounded text-[#4B5563] hover:text-[#1F2937] hover:bg-gray-100"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono px-1 text-[#6B7280]">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 rounded text-[#4B5563] hover:text-[#1F2937] hover:bg-gray-100"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded text-[#4B5563] hover:text-[#1F2937] hover:bg-gray-100 ml-1"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="p-1 rounded text-[#4B5563] hover:text-[#1F2937] hover:bg-gray-100"
                      title="Reset View"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Zoomable Image Stage */}
                <div
                  className="flex-1 overflow-auto bg-[#1E293B]/5 p-4 flex items-center justify-center relative select-none"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {activePage ? (
                    <div
                      className="relative inline-block transition-transform duration-150 ease-out origin-center"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      }}
                    >
                      <img
                        src={activePage.dataUrl}
                        alt={activePage.name}
                        className="max-h-[50vh] lg:max-h-[60vh] max-w-full object-contain rounded-lg shadow-md border border-[#D9E1EA] bg-white block"
                      />

                      {/* OCR Scanning Laser & Grid Animation on file */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-20">
                          {/* Ambient Scanning Pulse Tint */}
                          <div className="absolute inset-0 bg-[#0056A6]/10 animate-ocr-pulse" />

                          {/* Optical Matrix Scan Grid */}
                          <div
                            className="absolute inset-0 opacity-25"
                            style={{
                              backgroundImage: `linear-gradient(to right, rgba(0, 86, 166, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 86, 166, 0.3) 1px, transparent 1px)`,
                              backgroundSize: '24px 24px',
                            }}
                          />

                          {/* Corner Precision Optical Brackets */}
                          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#0056A6] shadow-[0_0_8px_rgba(0,86,166,0.6)]" />
                          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#0056A6] shadow-[0_0_8px_rgba(0,86,166,0.6)]" />
                          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#0056A6] shadow-[0_0_8px_rgba(0,86,166,0.6)]" />
                          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#0056A6] shadow-[0_0_8px_rgba(0,86,166,0.6)]" />

                          {/* Sweeping Laser Line with Neon Glow and Tail */}
                          <div className="absolute inset-x-0 animate-ocr-scanner">
                            {/* Upward soft light fade */}
                            <div className="h-16 -mt-16 bg-gradient-to-t from-[#0056A6]/30 via-[#00B4D8]/15 to-transparent pointer-events-none" />
                            {/* Main Laser Line */}
                            <div className="h-1 bg-gradient-to-r from-transparent via-[#00B4D8] to-transparent shadow-[0_0_12px_#00B4D8,0_0_24px_#0056A6]" />
                            {/* Downward light flare */}
                            <div className="h-6 bg-gradient-to-b from-[#0056A6]/20 to-transparent pointer-events-none" />
                          </div>

                          {/* Live OCR Scanning Indicator Tag */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#1F2937]/90 text-white text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-lg border border-cyan-400/40 flex items-center gap-2 backdrop-blur-xs whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            <span>Scanning...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {isDragOver && (
                    <div className="absolute inset-0 bg-[#0056A6]/20 border-2 border-dashed border-[#0056A6] flex items-center justify-center backdrop-blur-2xs">
                      <span className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-[#0056A6] shadow-sm">
                        Drop images to add
                      </span>
                    </div>
                  )}
                </div>

                {/* Multi-page Thumbnail Carousel Strip */}
                <div className="p-2.5 bg-white border-t border-[#D9E1EA] flex items-center gap-2 overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5">
                    {pages.map((page, idx) => (
                      <div
                        key={page.id}
                        onClick={() => setActivePageIndex(idx)}
                        className={`group relative w-14 h-14 rounded-lg border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                          activePageIndex === idx
                            ? 'border-[#0056A6] ring-2 ring-[#0056A6]/20'
                            : 'border-[#CBD5E1] hover:border-gray-400 opacity-75 hover:opacity-100'
                        }`}
                        title={page.name}
                      >
                        <img
                          src={page.dataUrl}
                          alt={page.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold">
                          p.{idx + 1}
                        </span>
                        {isAnalyzing && activePageIndex === idx && (
                          <div className="absolute inset-0 bg-[#0056A6]/25 flex items-center justify-center pointer-events-none">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemovePage(idx, e)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add More from Files Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-[#CBD5E1] hover:border-[#0056A6] hover:bg-[#EAF4FB] text-[#6B7280] hover:text-[#0056A6] flex flex-col items-center justify-center text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                      title="Add more images from files"
                    >
                      <UploadCloud className="w-4 h-4 mb-0.5" />
                      <span>Files</span>
                    </button>

                    {/* Add More from Vault Button */}
                    <button
                      type="button"
                      onClick={openVaultPicker}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-600 hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                      title="Add images from Software Vault"
                    >
                      <FolderArchive className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span>Vault</span>
                    </button>
                  </div>

                  <div className="ml-auto text-[11px] text-[#6B7280] pl-2 border-l border-gray-200 hidden sm:block">
                    {pages.length} {pages.length === 1 ? 'Page' : 'Pages'} Loaded
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Right Column: AI Extraction & Editable Text Area */}
          <div
            className={`${
              textLayoutMode === 'expanded' && pages.length > 0 ? 'w-full' : 'lg:w-1/2'
            } flex flex-col bg-white overflow-hidden flex-1`}
          >
            {/* Action Bar / Primary Trigger */}
            <div className="p-3 sm:p-4 border-b border-[#D9E1EA] bg-[#FAFCFF] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                {/* 1. Primary Action: Extract 8 Candidate Ticket Fields */}
                <button
                  type="button"
                  disabled={pages.length === 0 || isAnalyzing}
                  onClick={() => handleExtractText('all', 'ticket_fields')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all ${
                    pages.length === 0 || isAnalyzing
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#0056A6] hover:bg-[#004080] text-white active:scale-98'
                  }`}
                  title="Extract strictly the 8 ticket fields: Candidate Name, CET App No, CAP App No, DOB, Mobile, Email, Course, Query"
                >
                  {isAnalyzing && extractionMode === 'ticket_fields' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Extracting 8 Fields...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 text-amber-300" />
                      <span>
                        {pages.length > 1
                          ? `Extract 8 Fields (${pages.length} Pages)`
                          : 'Extract 8 Ticket Fields'}
                      </span>
                    </>
                  )}
                </button>

                {/* 2. Secondary Action: Full Verbatim OCR */}
                <button
                  type="button"
                  disabled={pages.length === 0 || isAnalyzing}
                  onClick={() => handleExtractText('all', 'default')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-gray-50 text-xs font-semibold text-[#1F2937] transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  title="Extract full verbatim text including all paragraphs and tables"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Full Document OCR</span>
                  <span className="sm:hidden">Full OCR</span>
                </button>

                {pages.length > 1 && (
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => handleExtractText('current', extractionMode)}
                    className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-gray-50 text-xs font-semibold text-[#1F2937] transition-colors cursor-pointer"
                    title="Extract text from currently viewed page only"
                  >
                    <span>Page {activePageIndex + 1} Only</span>
                  </button>
                )}
              </div>

              {/* Action Buttons for Extracted / Translated Text */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Send to TG (SAC Ticket Generator) */}
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleSendToTicketGenerator}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#003B73] hover:bg-[#002850] text-white shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-40 disabled:pointer-events-none"
                  title="Populate Candidate Name, CET App No, CAP App No, DOB, Mobile, Email, Course, and Query directly into Ticket Generator"
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-300" />
                  <span>Send to TG</span>
                </button>

                <button
                  type="button"
                  disabled={!currentText}
                  onClick={handleCopyText}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white hover:bg-gray-50 text-[#1F2937] border-[#D9E1EA] disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                  title="Copy Text to Clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#4B5563]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!currentText}
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-gray-50 text-[#1F2937] border border-[#D9E1EA] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Download as TXT file"
                >
                  <Download className="w-3.5 h-3.5 text-[#4B5563]" />
                  <span>Download TXT</span>
                </button>

                <button
                  type="button"
                  disabled={!currentText}
                  onClick={handleSelectAll}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-[#4B5563] border border-[#D9E1EA] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Select All Text"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>

                <button
                  type="button"
                  disabled={!currentText}
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Clear Text Area"
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Analysis Progress Loading State */}
            {isAnalyzing && (
              <div className="p-3 bg-blue-50/70 border-b border-blue-200 text-xs text-[#0056A6] flex items-center gap-2.5 animate-pulse shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0056A6] shrink-0" />
                <div className="font-semibold">{analysisStep}</div>
              </div>
            )}

            {/* Translation Progress Loading State */}
            {isTranslating && (
              <div className="p-3 bg-blue-50/80 border-b border-blue-200 text-xs text-[#0056A6] flex items-center gap-2.5 animate-pulse shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0056A6] shrink-0" />
                <div className="font-semibold">Translating Marathi / Hindi text to English...</div>
              </div>
            )}

            {/* Language Switcher Bar & Translate Button */}
            <div className="px-3 sm:px-4 py-2 border-b border-[#D9E1EA] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Switcher Tabs */}
              <div className="inline-flex items-center bg-[#E2E8F0]/80 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTextTab('original')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTextTab === 'original'
                      ? 'bg-white text-[#0056A6] font-bold shadow-2xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <span>Original (Extracted)</span>
                  {hasIndicText && (
                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-blue-100/70 text-[#0056A6] font-medium">
                      मराठी / हिन्दी
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!translatedText && !isTranslating && extractedText.trim()) {
                      handleTranslateToEnglish();
                    } else {
                      setActiveTextTab('translated');
                      setTextLayoutMode('expanded'); // Automatically open translation expanded to full text length!
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTextTab === 'translated'
                      ? 'bg-white text-[#0056A6] font-bold shadow-2xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  <span>English Translation</span>
                  {isTranslating ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-[#0056A6]" />
                  ) : translatedText ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ) : null}
                </button>
              </div>

              {/* View Layout Toggle: Fit Text Length (Full View) vs Split View */}
              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTextLayoutMode((prev) => (prev === 'split' ? 'expanded' : 'split'))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    textLayoutMode === 'expanded'
                      ? 'bg-blue-50 text-[#0056A6] border-blue-200 shadow-2xs font-bold'
                      : 'bg-white text-[#4B5563] hover:text-[#111827] border-[#D9E1EA] hover:bg-gray-50'
                  }`}
                  title={
                    textLayoutMode === 'expanded'
                      ? 'Switch back to Side-by-Side Split View with Image'
                      : 'Expand window to full text length (no scrolling needed)'
                  }
                >
                  {textLayoutMode === 'expanded' ? (
                    <>
                      <Columns className="w-3.5 h-3.5 text-[#0056A6]" />
                      <span>Split View</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-[#0056A6]" />
                      <span>Fit Text Length (Full View)</span>
                    </>
                  )}
                </button>
              )}

              {/* Translate to English Button & Guidance Toggle */}
              <div className="flex items-center gap-2">
                {hasIndicText && extractedText && (
                  <button
                    type="button"
                    disabled={isTranslating || isAnalyzing || !extractedText.trim()}
                    onClick={handleTranslateToEnglish}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0056A6] hover:bg-[#004080] text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
                    title="Translate Marathi / Hindi into English"
                  >
                    {isTranslating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-3.5 h-3.5" />
                        <span>{translatedText ? 'Re-translate' : 'Translate to English'}</span>
                      </>
                    )}
                  </button>
                )}

                {currentText.trim() && (
                  <button
                    type="button"
                    disabled={isAnalyzing || isTranslating}
                    onClick={handleSendToTicketGenerator}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B73] hover:bg-[#002850] text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                    title="Send Candidate Name, Mobile, Email, DOB, CET No, Course, and Query to Ticket Generator"
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-300" />
                    <span>Send to TG</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowGuidanceInput((s) => !s)}
                  className="text-[11px] font-semibold text-[#0056A6] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showGuidanceInput ? 'Hide Guidance' : '+ Add Guidance'}</span>
                </button>
              </div>
            </div>

            {showGuidanceInput && (
              <div className="p-3 bg-[#F1F5F9] border-b border-[#D9E1EA] text-xs">
                <label className="block text-[11px] font-bold text-[#1F2937] mb-1">
                  Optional Guidance:
                </label>
                <input
                  type="text"
                  value={promptGuidance}
                  onChange={(e) => setPromptGuidance(e.target.value)}
                  placeholder="e.g. Focus on the signature area or tabular marksheet..."
                  className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#1F2937] focus:outline-hidden focus:ring-2 focus:ring-[#0056A6]"
                />
              </div>
            )}

            {/* 8 Ticket Generator Fields Detected Card */}
            {detectedTicketFields && (
              <div className="mx-3 sm:mx-4 mt-2.5 p-3 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-indigo-50/80 border border-blue-200/90 rounded-xl shadow-2xs shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-blue-200/70">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#0056A6] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      8
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Ticket Generator Fields Detected</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                          Ready to Send
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Mapped directly to SAC Candidate Ticket fields
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={handleSendToTicketGenerator}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0056A6] hover:bg-[#004080] text-white shadow-xs transition-all cursor-pointer active:scale-98"
                    title="Send these 8 details directly to the SAC Ticket Generator form"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to TG</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {/* 1. Candidate Name */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">1. Candidate Name:</span>
                    <span className="font-bold text-slate-800 truncate block" title={detectedTicketFields.candidateName || 'Not detected'}>
                      {detectedTicketFields.candidateName || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 2. CET App No */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">2. CET App Number:</span>
                    <span className="font-bold font-mono text-slate-800 truncate block" title={detectedTicketFields.cetNo || 'Not detected'}>
                      {detectedTicketFields.cetNo || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 3. CAP App No */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">3. CAP App Number:</span>
                    <span className="font-bold font-mono text-slate-800 truncate block" title={detectedTicketFields.capId || 'Optional / None'}>
                      {detectedTicketFields.capId || <span className="text-slate-400 font-normal italic">Optional / None</span>}
                    </span>
                  </div>

                  {/* 4. DOB */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">4. DOB:</span>
                    <span className="font-bold font-mono text-slate-800 truncate block" title={detectedTicketFields.dob || 'Not detected'}>
                      {detectedTicketFields.dob || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 5. Mobile Number */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">5. Mobile Number:</span>
                    <span className="font-bold font-mono text-slate-800 truncate block" title={detectedTicketFields.mobile || 'Not detected'}>
                      {detectedTicketFields.mobile || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 6. Email ID */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">6. Email ID:</span>
                    <span className="font-bold text-slate-800 truncate block" title={detectedTicketFields.email || 'Not detected'}>
                      {detectedTicketFields.email || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 7. Course Name */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">7. Course Name:</span>
                    <span className="font-bold text-slate-800 truncate block" title={detectedTicketFields.course || 'Not detected'}>
                      {detectedTicketFields.course || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>

                  {/* 8. Query */}
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100/80">
                    <span className="font-semibold text-slate-500 block text-[10px]">8. Query / Issue:</span>
                    <span className="font-medium text-slate-800 truncate block" title={detectedTicketFields.query || 'Not detected'}>
                      {detectedTicketFields.query || <span className="text-amber-600 font-normal italic">Not detected</span>}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Large Editable Textarea / Translation View */}
            <div className="flex-1 p-3 sm:p-4 flex flex-col relative overflow-y-auto min-h-0">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280] mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#374151]">
                    {activeTextTab === 'original' ? 'Original Extracted Text:' : 'English Translated Text:'}
                  </span>
                  {activeTextTab === 'translated' && translatedText && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                      English
                    </span>
                  )}
                  {activeTextTab === 'original' && hasIndicText && (
                    <span className="text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                      मराठी / हिन्दी
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span>{wordCount} words</span>
                  <span>{charCount} chars</span>
                  <span>{lineCount} lines</span>
                  {textLayoutMode === 'expanded' && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 font-semibold px-2 py-0.5 rounded border border-blue-200">
                      Full Text Length View
                    </span>
                  )}
                </div>
              </div>

              {activeTextTab === 'translated' && !translatedText && !isTranslating ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#CBD5E1] rounded-xl bg-gray-50/50 min-h-[260px]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0056A6] flex items-center justify-center mb-3">
                    <Languages className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-bold text-[#1F2937] mb-1">English Translation</p>
                  <p className="text-xs text-[#6B7280] max-w-xs mb-4 leading-relaxed">
                    Translate your extracted Marathi / Hindi document into natural, fluent English with preserved layout and official terminology.
                  </p>
                  <button
                    type="button"
                    disabled={!extractedText.trim() || isAnalyzing}
                    onClick={handleTranslateToEnglish}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0056A6] hover:bg-[#004080] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <Languages className="w-4 h-4" />
                    <span>Translate to English Now</span>
                  </button>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={currentText}
                  onChange={handleTextChange}
                  onInput={adjustTextareaHeight}
                  placeholder={
                    activeTextTab === 'translated'
                      ? 'English translation will appear here...'
                      : 'Extracted text will appear here...'
                  }
                  className="w-full p-3.5 sm:p-4 bg-white border border-[#CBD5E1] focus:border-[#0056A6] rounded-xl text-xs sm:text-base font-sans leading-relaxed text-[#1F2937] focus:outline-hidden focus:ring-2 focus:ring-[#0056A6]/20 transition-all font-mono shadow-2xs resize-y"
                />
              )}
            </div>

            {/* Bottom Status / Footer */}
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#D9E1EA] flex items-center justify-between text-xs text-[#6B7280] shrink-0">
              <div>
                {activeTextTab === 'original' && unclearCount > 0 && (
                  <span className="text-amber-700 font-medium text-[11px]">
                    {unclearCount} [unclear] {unclearCount === 1 ? 'item' : 'items'}
                  </span>
                )}
                {activeTextTab === 'translated' && translatedText && (
                  <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    English Translation Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {currentText.trim() && (
                  <button
                    type="button"
                    disabled={isAnalyzing || isTranslating}
                    onClick={handleSendToTicketGenerator}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#003B73] hover:bg-[#002850] text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Send Candidate Name, Mobile, Email, DOB, CET No, Course, and Query to Ticket Generator"
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-300" />
                    <span>Send to TG</span>
                  </button>
                )}

                {extractedText && (
                  <button
                    type="button"
                    disabled={isAnalyzing || isTranslating}
                    onClick={() => handleExtractText('all')}
                    className="text-[#0056A6] hover:text-[#004080] font-semibold inline-flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Extract Again</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Configuration Modal Dialog */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D9E1EA] max-w-md w-full p-5 sm:p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => {
                setShowApiKeyModal(false);
                setKeySavedMessage(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">Google Gemini API Key</h3>
                <p className="text-xs text-[#6B7280]">Required for Marathi, Hindi & English handwriting extraction</p>
              </div>
            </div>

            {/* Status regarding DNO Central Key & Permissions */}
            {isAuthorizedForMasterKey && masterApiKey ? (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DNO Central Master Key Active</span>
                </div>
                <p className="text-[11px] text-emerald-800/90">
                  The District Nodal Officer (DNO) has configured a central Gemini Vision key and authorized your account. You can use the Image to Text tool without needing to enter your own key.
                </p>
              </div>
            ) : !isAuthorizedForMasterKey ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>DNO Key Permission Not Granted</span>
                </div>
                <p className="text-[11px] text-amber-800/90">
                  The District Nodal Officer (DNO) can grant your account access in the <b>User Management</b> tab. Alternatively, you can enter your personal Gemini API key below.
                </p>
              </div>
            ) : isAuthorizedForMasterKey && !masterApiKey ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>DNO Central Key Not Configured</span>
                </div>
                <p className="text-[11px] text-blue-800/90">
                  You have permission to use the central key, but the DNO has not yet saved a Master Gemini API Key in User Management. You can ask the DNO to add it, or provide a personal key below.
                </p>
              </div>
            ) : null}

            <p className="text-xs text-[#4B5563] leading-relaxed mb-3">
              Optional personal override: You can enter a personal Gemini API Key below if you prefer to use your own quota instead of the shared DNO key.
            </p>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-[#0056A6] flex items-center justify-between gap-2">
              <span>Need a free Gemini API Key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:text-[#004080] inline-flex items-center gap-1 shrink-0"
              >
                <span>Get Key at AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Gemini API Key
              </label>
              <input
                type="text"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-[#D9E1EA] focus:border-[#0056A6] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            {keySavedMessage && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{keySavedMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB]">
              {apiKey ? (
                <button
                  type="button"
                  onClick={handleRemoveApiKey}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  Remove Key
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setKeySavedMessage(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey(tempApiKey)}
                  disabled={!tempApiKey.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0056A6] hover:bg-[#004080] disabled:bg-gray-300 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Save & Use Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Software Vault Image Picker Modal */}
      {isVaultPickerOpen && (
        <div
          id="vault-image-picker-overlay"
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoadingVault) setIsVaultPickerOpen(false);
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
                    Select stored photos or documents to extract text and candidate details
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="vault-picker-close-btn"
                onClick={() => setIsVaultPickerOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
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
                  onClick={handleSelectAllVaultImages}
                  disabled={displayedVaultImages.length === 0}
                  className="px-3 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {displayedVaultImages.length > 0 &&
                  displayedVaultImages.every((f) => selectedVaultFileIds.includes(f.id)) ? (
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
              ) : displayedVaultImages.length === 0 ? (
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
                  {displayedVaultImages.map((file) => {
                    const isSelected = selectedVaultFileIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleVaultSelection(file.id)}
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
                of {displayedVaultImages.length} images selected
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVaultPickerOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#D9E1EA] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="vault-picker-add-btn"
                  onClick={handleAddSelectedFromVault}
                  disabled={selectedVaultFileIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>
                    Add {selectedVaultFileIds.length > 0 ? `(${selectedVaultFileIds.length})` : ''} to OCR Scanner
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
