import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCw,
  Crop,
  Layers,
  Palette,
  Camera,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Plus,
  Maximize2,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { QrUploadedFile } from '../types/qrUpload';
import {
  Point2D,
  QuadCorners,
  DetectionResult,
  EnhancementPreset,
  EnhancementOptions,
  warpPerspective,
  applyDocumentEnhancement,
  detectDocumentWithAI,
  snapCornerToNearestEdge,
} from '../utils/documentVision';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { qrUploadService } from '../services/qrUploadService';

export interface ScannedDocumentPage {
  id: string;
  sourceDataUrl: string;
  corners: QuadCorners;
  rotationAngle: number;
  preset: EnhancementPreset;
  brightness: number;
  contrast: number;
  detectionInfo: DetectionResult | null;
  initialCorners?: QuadCorners;
  previewUrl: string;
  previewSize: number;
}

interface SmartCropModalProps {
  isOpen: boolean;
  file: QrUploadedFile | null;
  onClose: () => void;
  onSaveCrop: (
    croppedDataUrl: string,
    croppedSize: number,
    saveAsCopy: boolean,
    allProcessedPages?: { dataUrl: string; size: number; name?: string }[]
  ) => Promise<void>;
  title?: string;
  actionButtonLabel?: string;
  isNewUpload?: boolean;
}

type DragTarget =
  | 'topLeft'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft'
  | 'topEdge'
  | 'rightEdge'
  | 'bottomEdge'
  | 'leftEdge'
  | 'move';

export const SmartCropModal: React.FC<SmartCropModalProps> = ({
  isOpen,
  file,
  onClose,
  onSaveCrop,
  title,
  actionButtonLabel,
  isNewUpload = false,
}) => {
  // Google Files Screen Modes:
  // 'review' = Document review & filter screen (default view for scanned pages)
  // 'crop' = Crop & rotate screen (Google Files crop editor)
  const [screenMode, setScreenMode] = useState<'review' | 'crop'>('review');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isProcessingFinal, setIsProcessingFinal] = useState<boolean>(false);
  const [showLiveCamera, setShowLiveCamera] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Multi-Page State
  const [pages, setPages] = useState<ScannedDocumentPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // File input ref for adding extra pages
  const pageFileInputRef = useRef<HTMLInputElement>(null);

  // Interaction refs for crop editor
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Drag interaction state
  const dragRef = useRef<{
    target: DragTarget | null;
    startNormX: number;
    startNormY: number;
    initialCorners: QuadCorners;
  }>({
    target: null,
    startNormX: 0,
    startNormY: 0,
    initialCorners: {
      topLeft: { x: 5, y: 5 },
      topRight: { x: 95, y: 5 },
      bottomRight: { x: 95, y: 95 },
      bottomLeft: { x: 5, y: 95 },
    },
  });

  // Google-style Magnifier Loupe state
  const [loupeState, setLoupeState] = useState<{
    visible: boolean;
    normX: number;
    normY: number;
  }>({
    visible: false,
    normX: 0,
    normY: 0,
  });

  const currentPage = pages[activePageIndex] || null;

  // Initialize pages when modal opens with a file
  useEffect(() => {
    if (isOpen && file && file.dataUrl) {
      const defaultCorners: QuadCorners = {
        topLeft: { x: 6, y: 6 },
        topRight: { x: 94, y: 6 },
        bottomRight: { x: 94, y: 94 },
        bottomLeft: { x: 6, y: 94 },
      };

      const initialPage: ScannedDocumentPage = {
        id: `page-${Date.now()}-0`,
        sourceDataUrl: file.dataUrl,
        corners: defaultCorners,
        initialCorners: defaultCorners,
        rotationAngle: 0,
        preset: 'auto',
        brightness: 0,
        contrast: 0,
        detectionInfo: null,
        previewUrl: '',
        previewSize: 0,
      };

      setPages([initialPage]);
      setActivePageIndex(0);
      setScreenMode('review');
      setShowFilters(false);
      setLoupeState({ visible: false, normX: 0, normY: 0 });

      // Detect document edges automatically
      analyzeDocumentPage(initialPage.id, file.dataUrl);
    }
  }, [isOpen, file]);

  // Document Edge Detection
  const analyzeDocumentPage = useCallback(async (pageId: string, dataUrl: string) => {
    setIsDetecting(true);
    try {
      const result = await detectDocumentWithAI(dataUrl);
      setPages((prevPages) =>
        prevPages.map((pg) => {
          if (pg.id !== pageId) return pg;
          return {
            ...pg,
            detectionInfo: result,
            corners: result.corners,
            initialCorners: result.corners,
            rotationAngle: 0,
            preset: result.suggestedEnhancement || pg.preset,
            previewUrl: '', // Invalidate preview so it regenerates with detected crop
          };
        })
      );
    } catch (err) {
      console.error('[Document Detection Error]', err);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Generate perspective warped & enhanced canvas preview
  const generateCurrentPagePreview = useCallback(async () => {
    if (!currentPage) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for preview'));
        img.src = currentPage.sourceDataUrl;
      });

      // Perspective Warp
      const warpedCanvas = warpPerspective(img, currentPage.corners);

      // Apply Google Files Enhancement Filters
      const options: EnhancementOptions = {
        preset: currentPage.preset,
        brightness: currentPage.brightness,
        contrast: currentPage.contrast,
        sharpen: currentPage.preset === 'auto' ? 24 : 18,
      };
      const enhancedCanvas = applyDocumentEnhancement(warpedCanvas, options);

      // High-resolution output
      const previewDataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.94);
      const base64Len = previewDataUrl.length - (previewDataUrl.indexOf(',') + 1);
      const estSize = Math.round((base64Len * 3) / 4);

      setPages((prevPages) =>
        prevPages.map((pg, idx) =>
          idx === activePageIndex
            ? { ...pg, previewUrl: previewDataUrl, previewSize: estSize }
            : pg
        )
      );
    } catch (err) {
      console.error('[Generate Preview Error]', err);
    }
  }, [currentPage, activePageIndex]);

  // Keep preview updated when in review mode or when page properties change
  useEffect(() => {
    if (currentPage && (!currentPage.previewUrl || screenMode === 'review')) {
      generateCurrentPagePreview();
    }
  }, [
    screenMode,
    currentPage?.corners,
    currentPage?.sourceDataUrl,
    currentPage?.preset,
    currentPage?.brightness,
    currentPage?.contrast,
    generateCurrentPagePreview,
  ]);

  // DRAG HANDLER: Pointer Down on Corner, Edge, or Move
  const handleStartDrag = (e: React.PointerEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentPage || !imageWrapperRef.current) return;

    const rect = imageWrapperRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const normY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    dragRef.current = {
      target,
      startNormX: normX,
      startNormY: normY,
      initialCorners: {
        topLeft: { ...currentPage.corners.topLeft },
        topRight: { ...currentPage.corners.topRight },
        bottomRight: { ...currentPage.corners.bottomRight },
        bottomLeft: { ...currentPage.corners.bottomLeft },
      },
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const isCorner =
      target === 'topLeft' ||
      target === 'topRight' ||
      target === 'bottomRight' ||
      target === 'bottomLeft';

    if (isCorner) {
      setLoupeState({
        visible: true,
        normX,
        normY,
      });
    }
  };

  // DRAG HANDLER: Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const { target, startNormX, startNormY, initialCorners } = dragRef.current;
    if (!target || !imageWrapperRef.current || !currentPage) return;

    const rect = imageWrapperRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let normX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let normY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const dx = normX - startNormX;
    const dy = normY - startNormY;

    let updatedCorners = { ...currentPage.corners };

    const clamp = (val: number, min = 0, max = 100) =>
      Math.max(min, Math.min(max, Math.round(val * 10) / 10));

    if (
      target === 'topLeft' ||
      target === 'topRight' ||
      target === 'bottomRight' ||
      target === 'bottomLeft'
    ) {
      if (imageRef.current) {
        const snap = snapCornerToNearestEdge(imageRef.current, { x: normX, y: normY }, 16);
        if (snap.snapped) {
          normX = snap.point.x;
          normY = snap.point.y;
        }
      }
      updatedCorners[target] = { x: clamp(normX), y: clamp(normY) };

      setLoupeState({
        visible: true,
        normX,
        normY,
      });
    } else if (target === 'topEdge') {
      updatedCorners.topLeft.y = clamp(initialCorners.topLeft.y + dy, 0, initialCorners.bottomLeft.y - 4);
      updatedCorners.topRight.y = clamp(initialCorners.topRight.y + dy, 0, initialCorners.bottomRight.y - 4);
    } else if (target === 'bottomEdge') {
      updatedCorners.bottomLeft.y = clamp(initialCorners.bottomLeft.y + dy, initialCorners.topLeft.y + 4, 100);
      updatedCorners.bottomRight.y = clamp(initialCorners.bottomRight.y + dy, initialCorners.topRight.y + 4, 100);
    } else if (target === 'leftEdge') {
      updatedCorners.topLeft.x = clamp(initialCorners.topLeft.x + dx, 0, initialCorners.topRight.x - 4);
      updatedCorners.bottomLeft.x = clamp(initialCorners.bottomLeft.x + dx, 0, initialCorners.bottomRight.x - 4);
    } else if (target === 'rightEdge') {
      updatedCorners.topRight.x = clamp(initialCorners.topRight.x + dx, initialCorners.topLeft.x + 4, 100);
      updatedCorners.bottomRight.x = clamp(initialCorners.bottomRight.x + dx, initialCorners.bottomLeft.x + 4, 100);
    } else if (target === 'move') {
      const minX = Math.min(initialCorners.topLeft.x, initialCorners.bottomLeft.x);
      const maxX = Math.max(initialCorners.topRight.x, initialCorners.bottomRight.x);
      const minY = Math.min(initialCorners.topLeft.y, initialCorners.topRight.y);
      const maxY = Math.max(initialCorners.bottomLeft.y, initialCorners.bottomRight.y);

      const boundedDx = Math.max(-minX, Math.min(100 - maxX, dx));
      const boundedDy = Math.max(-minY, Math.min(100 - maxY, dy));

      updatedCorners = {
        topLeft: { x: clamp(initialCorners.topLeft.x + boundedDx), y: clamp(initialCorners.topLeft.y + boundedDy) },
        topRight: { x: clamp(initialCorners.topRight.x + boundedDx), y: clamp(initialCorners.topRight.y + boundedDy) },
        bottomRight: { x: clamp(initialCorners.bottomRight.x + boundedDx), y: clamp(initialCorners.bottomRight.y + boundedDy) },
        bottomLeft: { x: clamp(initialCorners.bottomLeft.x + boundedDx), y: clamp(initialCorners.bottomLeft.y + boundedDy) },
      };
    }

    setPages((prevPages) =>
      prevPages.map((pg, idx) => (idx === activePageIndex ? { ...pg, corners: updatedCorners } : pg))
    );
  };

  // DRAG HANDLER: Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.target) {
      dragRef.current.target = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
      setLoupeState({ visible: false, normX: 0, normY: 0 });
    }
  };

  // Reset to full page or initial detection
  const handleResetCrop = () => {
    if (!currentPage) return;
    const resetTarget = currentPage.initialCorners || {
      topLeft: { x: 6, y: 6 },
      topRight: { x: 94, y: 6 },
      bottomRight: { x: 94, y: 94 },
      bottomLeft: { x: 6, y: 94 },
    };
    setPages((prevPages) =>
      prevPages.map((pg, idx) =>
        idx === activePageIndex ? { ...pg, corners: { ...resetTarget } } : pg
      )
    );
  };

  // Expand to full 100% bounds
  const handleExpandToFull = () => {
    if (!currentPage) return;
    const full: QuadCorners = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    };
    setPages((prevPages) =>
      prevPages.map((pg, idx) => (idx === activePageIndex ? { ...pg, corners: full } : pg))
    );
  };

  // 90° Clockwise Rotation
  const handleRotate90 = async () => {
    if (!currentPage) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image rotate failed'));
        img.src = currentPage.sourceDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Rotate corners 90 deg clockwise: (x, y) -> (100 - y, x)
      const rotatePt = (p: Point2D): Point2D => ({
        x: Math.max(0, Math.min(100, Math.round((100 - p.y) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(p.x * 10) / 10)),
      });

      const rotatedCorners: QuadCorners = {
        topLeft: rotatePt(currentPage.corners.bottomLeft),
        topRight: rotatePt(currentPage.corners.topLeft),
        bottomRight: rotatePt(currentPage.corners.topRight),
        bottomLeft: rotatePt(currentPage.corners.bottomRight),
      };

      setPages((prev) =>
        prev.map((pg, idx) =>
          idx === activePageIndex
            ? {
                ...pg,
                sourceDataUrl: rotatedDataUrl,
                corners: rotatedCorners,
                rotationAngle: 0,
                previewUrl: '',
              }
            : pg
        )
      );
    } catch (err) {
      console.error('[Rotate error]', err);
    }
  };

  // Change enhancement filter preset
  const handleSetPreset = (preset: EnhancementPreset) => {
    setPages((prevPages) =>
      prevPages.map((pg, idx) => (idx === activePageIndex ? { ...pg, preset } : pg))
    );
  };

  // Add pages via file upload
  const handleAddPageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const newPageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const defaultCorners: QuadCorners = {
          topLeft: { x: 6, y: 6 },
          topRight: { x: 94, y: 6 },
          bottomRight: { x: 94, y: 94 },
          bottomLeft: { x: 6, y: 94 },
        };

        const newPage: ScannedDocumentPage = {
          id: newPageId,
          sourceDataUrl: dataUrl,
          corners: defaultCorners,
          initialCorners: defaultCorners,
          rotationAngle: 0,
          preset: currentPage?.preset || 'auto',
          brightness: 0,
          contrast: 0,
          detectionInfo: null,
          previewUrl: '',
          previewSize: 0,
        };

        setPages((prev) => [...prev, newPage]);
        analyzeDocumentPage(newPageId, dataUrl);
      };
      reader.readAsDataURL(f);
    });

    e.target.value = '';
  };

  // Add page via Camera
  const handleCameraCapture = (capturedDataUrl: string, allCameraPages?: string[]) => {
    setShowLiveCamera(false);
    const pagesToAdd =
      allCameraPages && allCameraPages.length > 0 ? allCameraPages : [capturedDataUrl];

    pagesToAdd.forEach((dataUrl) => {
      const newPageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const defaultCorners: QuadCorners = {
        topLeft: { x: 6, y: 6 },
        topRight: { x: 94, y: 6 },
        bottomRight: { x: 94, y: 94 },
        bottomLeft: { x: 6, y: 94 },
      };

      const newPage: ScannedDocumentPage = {
        id: newPageId,
        sourceDataUrl: dataUrl,
        corners: defaultCorners,
        initialCorners: defaultCorners,
        rotationAngle: 0,
        preset: currentPage?.preset || 'auto',
        brightness: 0,
        contrast: 0,
        detectionInfo: null,
        previewUrl: '',
        previewSize: 0,
      };

      setPages((prev) => [...prev, newPage]);
      analyzeDocumentPage(newPageId, dataUrl);
    });

    setTimeout(() => {
      setPages((current) => {
        setActivePageIndex(Math.max(0, current.length - 1));
        return current;
      });
    }, 100);
  };

  // Delete current page
  const handleDeletePage = (indexToDelete: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== indexToDelete));
    if (activePageIndex >= indexToDelete) {
      setActivePageIndex(Math.max(0, activePageIndex - 1));
    }
  };

  // Process a page into a clean high-resolution document image
  const processPageToDataUrl = async (
    page: ScannedDocumentPage
  ): Promise<{ dataUrl: string; size: number }> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load page image for rendering'));
      el.src = page.sourceDataUrl;
    });

    const warpedCanvas = warpPerspective(img, page.corners);
    const options: EnhancementOptions = {
      preset: page.preset,
      brightness: page.brightness,
      contrast: page.contrast,
      sharpen: page.preset === 'auto' ? 24 : 18,
    };
    const enhancedCanvas = applyDocumentEnhancement(warpedCanvas, options);
    const dataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.94);
    const base64Len = dataUrl.length - (dataUrl.indexOf(',') + 1);
    const size = Math.round((base64Len * 3) / 4);

    return { dataUrl, size };
  };

  // Final Save to Vault
  const handleFinalSave = async () => {
    if (!currentPage) return;
    setIsProcessingFinal(true);
    try {
      const processedResults: { dataUrl: string; size: number; name?: string }[] = [];
      for (let i = 0; i < pages.length; i++) {
        const res = await processPageToDataUrl(pages[i]);
        processedResults.push({
          ...res,
          name: pages.length > 1 ? `Scanned_Document_Page_${i + 1}.jpg` : undefined,
        });
      }

      const primary = processedResults[activePageIndex] || processedResults[0];

      if (processedResults.length > 1 && file?.sessionId) {
        for (let i = 1; i < processedResults.length; i++) {
          try {
            await qrUploadService.uploadFile(file.sessionId, {
              name: `Page_${i + 1}_${file.name || 'Document.jpg'}`,
              type: 'image/jpeg',
              size: processedResults[i].size,
              dataUrl: processedResults[i].dataUrl,
              category: file.category || 'Official Document',
            });
          } catch (e) {
            console.warn('[SmartCropModal] Note saving extra page to vault:', e);
          }
        }
      }

      await onSaveCrop(primary.dataUrl, primary.size, isNewUpload, processedResults);
      onClose();
    } catch (err) {
      console.error('[Save Scanned Document Error]', err);
    } finally {
      setIsProcessingFinal(false);
    }
  };

  // Keyboard shortcuts: Escape to close / cancel crop, Enter to save or apply
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (screenMode === 'crop') {
          setScreenMode('review');
        } else {
          onClose();
        }
      } else if (e.key === 'Enter') {
        if (screenMode === 'crop') {
          setScreenMode('review');
        } else if (screenMode === 'review' && !isProcessingFinal) {
          handleFinalSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, screenMode, isProcessingFinal, onClose, handleFinalSave]);

  if (!isOpen || !file || !currentPage) return null;

  // Midpoints for Google-style Edge Handles
  const { topLeft, topRight, bottomRight, bottomLeft } = currentPage.corners;
  const topMid = { x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 };
  const rightMid = { x: (topRight.x + bottomRight.x) / 2, y: (topRight.y + bottomRight.y) / 2 };
  const bottomMid = { x: (bottomLeft.x + bottomRight.x) / 2, y: (bottomLeft.y + bottomRight.y) / 2 };
  const leftMid = { x: (topLeft.x + bottomLeft.x) / 2, y: (topLeft.y + bottomLeft.y) / 2 };

  // Google Files Filter Preset Definitions
  const filterPresets: { id: EnhancementPreset; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'color', label: 'Color' },
    { id: 'document_bw', label: 'Black & white' },
    { id: 'grayscale', label: 'Grayscale' },
    { id: 'original', label: 'None' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#1E1F20] text-[#E3E3E3] flex flex-col justify-between select-none overflow-hidden font-sans"
      >
        {/* Hidden Multi-Page File Input */}
        <input
          type="file"
          ref={pageFileInputRef}
          accept="image/*"
          multiple
          onChange={handleAddPageFiles}
          className="hidden"
        />

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 1: GOOGLE FILES CROP & ROTATE VIEW                     */}
        {/* ------------------------------------------------------------- */}
        {screenMode === 'crop' && (
          <div className="flex-1 flex flex-col justify-between w-full h-full bg-[#1E1F20]">
            {/* Google Files Top App Bar */}
            <div className="w-full px-4 py-3 flex items-center justify-between border-b border-[#303134] bg-[#1E1F20] z-30">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreenMode('review')}
                  className="p-2 rounded-full text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-normal text-[#E3E3E3] tracking-wide">
                  Crop &amp; rotate
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCrop}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#A8C7FA] hover:bg-[#282A2C] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Google Files Crop Stage */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 overflow-hidden select-none">
              <div
                ref={imageWrapperRef}
                className="relative inline-block max-w-full max-h-[66vh] select-none touch-none shadow-xl rounded-sm overflow-visible"
                style={{ touchAction: 'none' }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Source Image */}
                <img
                  ref={imageRef}
                  src={currentPage.sourceDataUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-[66vh] block object-contain pointer-events-none rounded-sm"
                  draggable={false}
                />

                {/* Google-style Dark Scrim & Blue Border Box */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                  {/* Outer Dimmed Scrim */}
                  <path
                    d={`
                      M 0 0 L 100 0 L 100 100 L 0 100 Z
                      M ${topLeft.x} ${topLeft.y}
                      L ${bottomLeft.x} ${bottomLeft.y}
                      L ${bottomRight.x} ${bottomRight.y}
                      L ${topRight.x} ${topRight.y} Z
                    `}
                    fillRule="evenodd"
                    fill="rgba(0, 0, 0, 0.52)"
                  />

                  {/* Clean Google Blue Bounding Quad */}
                  <polygon
                    points={`
                      ${topLeft.x}%,${topLeft.y}%
                      ${topRight.x}%,${topRight.y}%
                      ${bottomRight.x}%,${bottomRight.y}%
                      ${bottomLeft.x}%,${bottomLeft.y}%
                    `}
                    fill="transparent"
                    stroke="#1A73E8"
                    strokeWidth="2"
                    className="cursor-move pointer-events-auto"
                    onPointerDown={(e) => handleStartDrag(e, 'move')}
                  />
                </svg>

                {/* 4 Google-style Edge Midpoint Handles (Pill Bars) */}
                {[
                  { target: 'topEdge' as const, pt: topMid, cursor: 'ns-resize', isVert: false },
                  { target: 'bottomEdge' as const, pt: bottomMid, cursor: 'ns-resize', isVert: false },
                  { target: 'leftEdge' as const, pt: leftMid, cursor: 'ew-resize', isVert: true },
                  { target: 'rightEdge' as const, pt: rightMid, cursor: 'ew-resize', isVert: true },
                ].map(({ target, pt, cursor, isVert }) => (
                  <div
                    key={target}
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor,
                    }}
                    onPointerDown={(e) => handleStartDrag(e, target)}
                    className="absolute z-25 touch-none p-3 flex items-center justify-center cursor-grab active:cursor-grabbing"
                  >
                    <div
                      className={`rounded-full bg-white border border-[#1A73E8] shadow-sm transition-transform hover:scale-110 ${
                        isVert ? 'w-1.5 h-6' : 'w-6 h-1.5'
                      }`}
                    />
                  </div>
                ))}

                {/* 4 Google-style Circular Corner Nodes */}
                {[
                  { key: 'topLeft' as const, pt: topLeft },
                  { key: 'topRight' as const, pt: topRight },
                  { key: 'bottomRight' as const, pt: bottomRight },
                  { key: 'bottomLeft' as const, pt: bottomLeft },
                ].map(({ key, pt }) => (
                  <div
                    key={key}
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onPointerDown={(e) => handleStartDrag(e, key)}
                    className="absolute w-11 h-11 flex items-center justify-center cursor-grab active:cursor-grabbing z-30 touch-none group"
                  >
                    <div className="w-5 h-5 rounded-full bg-white border-[2.5px] border-[#1A73E8] shadow-md transition-transform group-hover:scale-115 group-active:scale-125" />
                  </div>
                ))}

                {/* Google-style Minimalist Magnifier Loupe */}
                {loupeState.visible && (
                  <div
                    style={{
                      left: `${Math.max(12, Math.min(88, loupeState.normX))}%`,
                      top:
                        loupeState.normY < 24
                          ? `${loupeState.normY + 8}%`
                          : `${loupeState.normY - 6}%`,
                      transform:
                        loupeState.normY < 24
                          ? 'translate(-50%, 0%)'
                          : 'translate(-50%, -100%)',
                    }}
                    className="absolute w-24 h-24 rounded-full border-2 border-white shadow-2xl overflow-hidden pointer-events-none z-40 bg-black flex items-center justify-center"
                  >
                    <div
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{
                        backgroundImage: `url(${currentPage.sourceDataUrl})`,
                        backgroundPosition: `${loupeState.normX}% ${loupeState.normY}%`,
                        backgroundSize: '400%',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    {/* Minimalist Blue Crosshair */}
                    <div className="relative w-4 h-4 pointer-events-none">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1A73E8] -translate-y-1/2 opacity-90" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#1A73E8] -translate-x-1/2 opacity-90" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Files Crop Bottom Action Bar */}
            <div className="w-full px-6 py-4 bg-[#1E1F20] border-t border-[#303134] flex items-center justify-between z-30">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRotate90}
                  className="p-2.5 rounded-full text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer flex items-center gap-2 text-xs"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Rotate</span>
                </button>

                <button
                  onClick={handleExpandToFull}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                >
                  Full page
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreenMode('review')}
                  className="px-5 py-2 rounded-full text-xs font-medium text-[#C4C7C5] hover:bg-[#282A2C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setScreenMode('review')}
                  className="px-6 py-2 rounded-full text-xs font-medium bg-[#0B57D0] hover:bg-[#1A73E8] text-white transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 2: GOOGLE FILES DOCUMENT REVIEW & SAVE VIEW            */}
        {/* ------------------------------------------------------------- */}
        {screenMode === 'review' && (
          <div className="flex-1 flex flex-col justify-between w-full h-full bg-[#1E1F20]">
            {/* Google Files Top App Bar */}
            <div className="w-full px-4 py-3 flex items-center justify-between border-b border-[#303134] bg-[#1E1F20] z-30">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-normal text-[#E3E3E3] tracking-wide">
                    {pages.length > 1
                      ? `Page ${activePageIndex + 1} of ${pages.length}`
                      : title || 'Scanned Document'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pages.length > 1 && (
                  <button
                    onClick={() => handleDeletePage(activePageIndex)}
                    className="p-2 rounded-full text-[#C4C7C5] hover:text-[#F2B8B5] hover:bg-[#282A2C] transition-colors cursor-pointer"
                    title="Delete this page"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Document Review Stage (Clean Paper Display like Google Files) */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
              {currentPage.previewUrl ? (
                <div className="relative max-w-full max-h-[66vh] flex items-center justify-center">
                  <img
                    src={currentPage.previewUrl}
                    alt="Processed document page"
                    className="max-w-full max-h-[66vh] block object-contain rounded-xs shadow-2xl border border-[#444746]/50 bg-white"
                  />

                  {/* Multi-page Navigation Chevrons */}
                  {pages.length > 1 && (
                    <>
                      {activePageIndex > 0 && (
                        <button
                          onClick={() => setActivePageIndex(activePageIndex - 1)}
                          className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#282A2C]/80 hover:bg-[#333538] text-white shadow-lg backdrop-blur-xs transition-colors cursor-pointer"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      {activePageIndex < pages.length - 1 && (
                        <button
                          onClick={() => setActivePageIndex(activePageIndex + 1)}
                          className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#282A2C]/80 hover:bg-[#333538] text-white shadow-lg backdrop-blur-xs transition-colors cursor-pointer"
                          title="Next page"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-[#C4C7C5]">
                  <div className="w-7 h-7 border-2 border-[#1A73E8] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-normal">Processing page...</span>
                </div>
              )}
            </div>

            {/* Filter Chips Bar (Shown when Filter tool is toggled or always accessible) */}
            {showFilters && (
              <div className="w-full px-4 py-2.5 bg-[#282A2C] border-t border-[#383A3D] flex items-center justify-center gap-2 overflow-x-auto scrollbar-none z-30">
                {filterPresets.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleSetPreset(id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      currentPage.preset === id
                        ? 'bg-[#C2E7FF] text-[#001D35]'
                        : 'bg-[#1E1F20] text-[#C4C7C5] hover:bg-[#333538]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Google Files Bottom Toolbar & Action Bar */}
            <div className="w-full bg-[#1E1F20] border-t border-[#303134] px-4 sm:px-6 py-3 flex flex-col gap-2 z-30">
              <div className="flex items-center justify-between">
                {/* Google Files 4 Tools */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* 1. Crop */}
                  <button
                    onClick={() => setScreenMode('crop')}
                    className="flex flex-col items-center justify-center w-14 sm:w-16 py-1 rounded-xl text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                  >
                    <Crop className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-normal">Crop</span>
                  </button>

                  {/* 2. Filter */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex flex-col items-center justify-center w-14 sm:w-16 py-1 rounded-xl transition-colors cursor-pointer ${
                      showFilters
                        ? 'text-[#A8C7FA] bg-[#004A77]/40'
                        : 'text-[#C4C7C5] hover:text-white hover:bg-[#282A2C]'
                    }`}
                  >
                    <Palette className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-normal">Filter</span>
                  </button>

                  {/* 3. Rotate */}
                  <button
                    onClick={handleRotate90}
                    className="flex flex-col items-center justify-center w-14 sm:w-16 py-1 rounded-xl text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-normal">Rotate</span>
                  </button>

                  {/* 4. Add Page */}
                  <button
                    onClick={() => pageFileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-14 sm:w-16 py-1 rounded-xl text-[#C4C7C5] hover:text-white hover:bg-[#282A2C] transition-colors cursor-pointer"
                    title="Add another page"
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-normal">Add page</span>
                  </button>
                </div>

                {/* Primary Google Blue Save Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFinalSave}
                    disabled={isProcessingFinal}
                    className="px-7 py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-sm font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isProcessingFinal ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{actionButtonLabel || 'Save'}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal (Google Camera Scanner Style) */}
        {showLiveCamera && (
          <LiveCameraScannerModal
            isOpen={showLiveCamera}
            onClose={() => setShowLiveCamera(false)}
            onCapture={handleCameraCapture}
            initialMultiPage={true}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
