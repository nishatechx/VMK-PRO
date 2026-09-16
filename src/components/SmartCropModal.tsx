import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCw,
  RotateCcw,
  Sparkles,
  Check,
  Undo2,
  Save,
  Crop,
  Layers,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Eye,
  Camera,
  ShieldCheck,
  FileText,
  HelpCircle,
  Maximize2,
  ZoomIn,
} from 'lucide-react';
import { QrUploadedFile, formatBytes } from '../types/qrUpload';
import {
  Point2D,
  QuadCorners,
  DetectionResult,
  EnhancementPreset,
  EnhancementOptions,
  warpPerspective,
  applyDocumentEnhancement,
  detectDocumentWithAI,
  fastClientCornerDetection,
  distance,
} from '../utils/documentVision';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';

interface SmartCropModalProps {
  isOpen: boolean;
  file: QrUploadedFile | null;
  onClose: () => void;
  onSaveCrop: (croppedDataUrl: string, croppedSize: number, saveAsCopy: boolean) => Promise<void>;
  title?: string;
  actionButtonLabel?: string;
  isNewUpload?: boolean;
}

export const SmartCropModal: React.FC<SmartCropModalProps> = ({
  isOpen,
  file,
  onClose,
  onSaveCrop,
  title,
  actionButtonLabel,
  isNewUpload = false,
}) => {
  // Processing & View Modes
  const [activeTab, setActiveTab] = useState<'corners' | 'enhanced'>('corners');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isProcessingFinal, setIsProcessingFinal] = useState<boolean>(false);
  const [saveAsCopy, setSaveAsCopy] = useState<boolean>(isNewUpload);
  const [showLiveCamera, setShowLiveCamera] = useState<boolean>(false);
  const [showQualityDetails, setShowQualityDetails] = useState<boolean>(false);

  // Document Vision State
  const [sourceDataUrl, setSourceDataUrl] = useState<string>('');
  const [corners, setCorners] = useState<QuadCorners>({
    topLeft: { x: 5, y: 5 },
    topRight: { x: 95, y: 5 },
    bottomRight: { x: 95, y: 95 },
    bottomLeft: { x: 5, y: 95 },
  });
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [detectionInfo, setDetectionInfo] = useState<DetectionResult | null>(null);

  // Enhancement State
  const [enhancementOptions, setEnhancementOptions] = useState<EnhancementOptions>({
    preset: 'magic_clean',
    brightness: 0,
    contrast: 0,
    sharpen: 20,
    shadowRemoval: 30,
  });

  // Cached warped & enhanced previews
  const [warpedPreviewUrl, setWarpedPreviewUrl] = useState<string>('');
  const [warpedSize, setWarpedSize] = useState<number>(0);

  // Interaction refs & Drag Loupe state
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const activeDragCornerRef = useRef<'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' | null>(null);

  // Magnifier Loupe state
  const [loupeState, setLoupeState] = useState<{
    visible: boolean;
    normX: number;
    normY: number;
    screenX: number;
    screenY: number;
  }>({
    visible: false,
    normX: 0,
    normY: 0,
    screenX: 0,
    screenY: 0,
  });

  // Reset and analyze document whenever file changes
  useEffect(() => {
    if (isOpen && file && file.dataUrl) {
      setSourceDataUrl(file.dataUrl);
      setRotationAngle(0);
      setActiveTab('corners');
      setLoupeState((prev) => ({ ...prev, visible: false }));
      triggerAIDocumentDetection(file.dataUrl);
    }
  }, [isOpen, file]);

  // Run AI / Computer Vision Document Detection
  const triggerAIDocumentDetection = useCallback(async (dataUrl: string) => {
    setIsDetecting(true);
    try {
      // Execute AI document detection (Gemini 3.8 Flash with client CV fallback)
      const result = await detectDocumentWithAI(dataUrl);
      setDetectionInfo(result);
      setCorners(result.corners);
      if (result.detectedAngle) {
        setRotationAngle(result.detectedAngle);
      }
      if (result.suggestedEnhancement) {
        setEnhancementOptions((prev) => ({ ...prev, preset: result.suggestedEnhancement }));
      }
    } catch (err) {
      console.error('[AI Detection Error]', err);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Generate perspective warped & enhanced canvas preview
  const generatePerspectivePreview = useCallback(async () => {
    const img = imageRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    try {
      // 1. Create a canvas holding the rotated source if rotationAngle != 0
      let baseCanvas: HTMLCanvasElement;
      if (rotationAngle % 360 !== 0) {
        baseCanvas = document.createElement('canvas');
        const rad = (rotationAngle * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const newW = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
        const newH = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
        baseCanvas.width = newW;
        baseCanvas.height = newH;
        const bCtx = baseCanvas.getContext('2d');
        if (bCtx) {
          bCtx.translate(newW / 2, newH / 2);
          bCtx.rotate(rad);
          bCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        }
      } else {
        baseCanvas = document.createElement('canvas');
        baseCanvas.width = img.naturalWidth;
        baseCanvas.height = img.naturalHeight;
        const bCtx = baseCanvas.getContext('2d');
        if (bCtx) bCtx.drawImage(img, 0, 0);
      }

      // 2. Perform Heckbert Perspective Warp
      const warpedCanvas = warpPerspective(baseCanvas, corners);

      // 3. Apply Document Enhancement Filters (Magic Clean, Vivid ID, B&W, etc.)
      const enhancedCanvas = applyDocumentEnhancement(warpedCanvas, enhancementOptions);

      // 4. Generate high quality JPEG
      const previewDataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.94);
      setWarpedPreviewUrl(previewDataUrl);

      // Estimate byte size
      const base64Len = previewDataUrl.length - (previewDataUrl.indexOf(',') + 1);
      const estSize = Math.round((base64Len * 3) / 4);
      setWarpedSize(estSize);
    } catch (err) {
      console.error('[Generate Perspective Preview]', err);
    }
  }, [corners, rotationAngle, enhancementOptions]);

  // Re-generate preview when switching to enhanced tab or changing filters
  useEffect(() => {
    if (activeTab === 'enhanced') {
      generatePerspectivePreview();
    }
  }, [activeTab, generatePerspectivePreview]);

  // Handle Corner Drag Interaction
  const handlePointerDown = (
    e: React.PointerEvent,
    cornerKey: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    activeDragCornerRef.current = cornerKey;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      const normX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const normY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setLoupeState({
        visible: true,
        normX,
        normY,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragCornerRef.current || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const normY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const cornerKey = activeDragCornerRef.current;
    setCorners((prev) => ({
      ...prev,
      [cornerKey]: { x: Math.round(normX * 10) / 10, y: Math.round(normY * 10) / 10 },
    }));

    setLoupeState({
      visible: true,
      normX,
      normY,
      screenX: e.clientX,
      screenY: e.clientY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDragCornerRef.current) {
      activeDragCornerRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
      setLoupeState((prev) => ({ ...prev, visible: false }));
    }
  };

  // Reset corners to 100% full boundary
  const handleResetToFull = () => {
    setCorners({
      topLeft: { x: 3, y: 3 },
      topRight: { x: 97, y: 3 },
      bottomRight: { x: 97, y: 97 },
      bottomLeft: { x: 3, y: 97 },
    });
  };

  // Rotate 90 deg clockwise
  const handleRotate90 = () => {
    setRotationAngle((r) => (r + 90) % 360);
  };

  // Final Save to Software Vault
  const handleFinalSave = async () => {
    setIsProcessingFinal(true);
    try {
      const img = imageRef.current;
      if (!img) throw new Error('Image reference missing');

      // Create full-resolution canvas
      let baseCanvas: HTMLCanvasElement;
      if (rotationAngle % 360 !== 0) {
        baseCanvas = document.createElement('canvas');
        const rad = (rotationAngle * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const newW = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
        const newH = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
        baseCanvas.width = newW;
        baseCanvas.height = newH;
        const bCtx = baseCanvas.getContext('2d');
        if (bCtx) {
          bCtx.translate(newW / 2, newH / 2);
          bCtx.rotate(rad);
          bCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        }
      } else {
        baseCanvas = document.createElement('canvas');
        baseCanvas.width = img.naturalWidth;
        baseCanvas.height = img.naturalHeight;
        const bCtx = baseCanvas.getContext('2d');
        if (bCtx) bCtx.drawImage(img, 0, 0);
      }

      // Perform perspective warp
      const warpedCanvas = warpPerspective(baseCanvas, corners);

      // Apply enhancement filters
      const enhancedCanvas = applyDocumentEnhancement(warpedCanvas, enhancementOptions);

      // Export high-quality JPEG
      const finalDataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.94);
      const base64Len = finalDataUrl.length - (finalDataUrl.indexOf(',') + 1);
      const finalBytes = Math.round((base64Len * 3) / 4);

      await onSaveCrop(finalDataUrl, finalBytes, saveAsCopy);
      onClose();
    } catch (err) {
      console.error('[Save Scanned Document Error]', err);
    } finally {
      setIsProcessingFinal(false);
    }
  };

  if (!isOpen || !file) return null;

  const confidence = detectionInfo?.confidence ?? 85;
  const confidenceColor =
    confidence >= 95
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : confidence >= 80
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between select-none overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="w-full px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0056A6] text-white shadow-xs">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {title || 'Document Scanner & Perspective Crop'}
                </h2>
                {detectionInfo?.documentType && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                    {detectionInfo.documentType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Drag corners to align edges, or switch to Enhanced to inspect the flattened scan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Camera Scanner Button */}
            <button
              onClick={() => setShowLiveCamera(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Live Camera Scanner"
            >
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Camera Scanner</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs & AI Status Sub-header */}
        <div className="w-full px-4 sm:px-6 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('corners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'corners'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>AI Detection & Corners</span>
            </button>
            <button
              onClick={() => setActiveTab('enhanced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'enhanced'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Scanned Document Preview</span>
            </button>
          </div>

          {/* AI Detection Info & Confidence Badge */}
          <div className="flex items-center gap-2">
            {isDetecting ? (
              <div className="flex items-center gap-1.5 text-xs text-blue-400">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI analyzing document...</span>
              </div>
            ) : (
              detectionInfo && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${confidenceColor}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{confidence}% Confidence</span>
                  </span>

                  <button
                    onClick={() => setShowQualityDetails(!showQualityDetails)}
                    className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="View Quality Details"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Quality Details Drawer / Popover */}
        <AnimatePresence>
          {showQualityDetails && detectionInfo?.qualityReport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full bg-slate-900/95 border-b border-slate-800 px-6 py-3 text-xs text-slate-300 shrink-0 z-20"
            >
              <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>AI Quality Assessment:</span>
                  <span className="font-normal text-slate-300">{detectionInfo.qualityReport.recommendation}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        detectionInfo.qualityReport.allFourEdgesFound ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    4 Edges Detected
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !detectionInfo.qualityReport.isBlurry ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    {detectionInfo.qualityReport.isBlurry ? 'Slight Blur' : 'Sharp Clarity'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !detectionInfo.qualityReport.isTooDark ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {detectionInfo.qualityReport.isTooDark ? 'Shadows Lifted' : 'Even Lighting'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Interactive Stage */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
        >
          {activeTab === 'corners' ? (
            /* TAB 1: AI Corner Detection & Quadrilateral Manipulation */
            <div className="relative max-w-full max-h-[68vh] flex items-center justify-center">
              <img
                ref={imageRef}
                src={sourceDataUrl}
                alt="Document to scan"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl border border-slate-700/60 pointer-events-none"
                onLoad={() => {
                  if (!detectionInfo) {
                    triggerAIDocumentDetection(sourceDataUrl);
                  }
                }}
              />

              {/* Interactive SVG Overlay with 4 Corners & Boundary Lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Connecting Quadrilateral Polygon */}
                <polygon
                  points={`
                    ${corners.topLeft.x}%,${corners.topLeft.y}%
                    ${corners.topRight.x}%,${corners.topRight.y}%
                    ${corners.bottomRight.x}%,${corners.bottomRight.y}%
                    ${corners.bottomLeft.x}%,${corners.bottomLeft.y}%
                  `}
                  fill="rgba(37, 99, 235, 0.18)"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />

                {/* Subtle Rule-of-Thirds Grid inside detected quad */}
                {/* Diagonal guides for perspective flatness visual cue */}
                <line
                  x1={`${corners.topLeft.x}%`}
                  y1={`${corners.topLeft.y}%`}
                  x2={`${corners.bottomRight.x}%`}
                  y2={`${corners.bottomRight.y}%`}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <line
                  x1={`${corners.topRight.x}%`}
                  y1={`${corners.topRight.y}%`}
                  x2={`${corners.bottomLeft.x}%`}
                  y2={`${corners.bottomLeft.y}%`}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
              </svg>

              {/* Draggable Corner Handles (4 points) */}
              {(
                [
                  { key: 'topLeft', label: 'Top-Left', pt: corners.topLeft },
                  { key: 'topRight', label: 'Top-Right', pt: corners.topRight },
                  { key: 'bottomRight', label: 'Bottom-Right', pt: corners.bottomRight },
                  { key: 'bottomLeft', label: 'Bottom-Left', pt: corners.bottomLeft },
                ] as const
              ).map(({ key, label, pt }) => (
                <div
                  key={key}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, key)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-30 touch-none group"
                  title={`Drag ${label} corner to adjust`}
                >
                  {/* Outer pulse ring */}
                  <div className="w-7 h-7 rounded-full bg-blue-500/30 group-hover:scale-125 transition-transform flex items-center justify-center">
                    {/* Inner core handle */}
                    <div className="w-4.5 h-4.5 rounded-full bg-white border-2 border-blue-600 shadow-md group-hover:border-blue-400" />
                  </div>
                </div>
              ))}

              {/* Magnifier Loupe: 2.5x Zoom with Crosshairs when dragging a corner */}
              {loupeState.visible && imageRef.current && (
                <div
                  style={{
                    left: `${loupeState.normX}%`,
                    top: `${Math.max(12, loupeState.normY - 14)}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="absolute w-28 h-28 rounded-full border-3 border-white shadow-2xl overflow-hidden pointer-events-none z-40 bg-black flex items-center justify-center"
                >
                  <img
                    src={sourceDataUrl}
                    alt="Magnifier"
                    style={{
                      transform: `scale(2.5) translate(${50 - loupeState.normX}%, ${
                        50 - loupeState.normY
                      }%)`,
                      transformOrigin: 'center center',
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Precision Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-0.5 bg-blue-500" />
                    <div className="h-6 w-0.5 bg-blue-500 absolute" />
                    <div className="w-2 h-2 rounded-full border border-white absolute" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Scanned Document Preview (Perspective Corrected + Enhanced) */
            <div className="relative max-w-full max-h-[68vh] flex flex-col items-center justify-center">
              {warpedPreviewUrl ? (
                <div className="relative max-h-[62vh] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-white">
                  <img
                    src={warpedPreviewUrl}
                    alt="Perspective corrected document"
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">
                    {formatBytes(warpedSize)} • Perspective Corrected
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                  <RotateCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs">Flattening perspective and enhancing document...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Toolbar & Filter Controls */}
        <div className="w-full bg-slate-950/95 border-t border-slate-800 px-4 sm:px-6 py-3 shrink-0 z-20 flex flex-col gap-2.5">
          {activeTab === 'corners' ? (
            /* Controls for Tab 1 (Corners) */
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerAIDocumentDetection(sourceDataUrl)}
                  disabled={isDetecting}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Re-run AI Document Detection"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Re-Detect AI</span>
                </button>

                <button
                  onClick={handleRotate90}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetToFull}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset handles to full image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset to Full</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('enhanced')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span>Preview Flattened Document</span>
                  <Wand2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Controls for Tab 2 (Enhanced Filters & Sliders) */
            <div className="flex flex-col gap-2.5">
              {/* Preset Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'magic_clean', label: 'Magic Clean', icon: Wand2 },
                    { id: 'vivid_id', label: 'Vivid ID (Aadhaar/PAN)', icon: Sparkles },
                    { id: 'high_contrast_bw', label: 'B&W Document', icon: FileText },
                    { id: 'grayscale', label: 'Grayscale', icon: Layers },
                    { id: 'original', label: 'Original Colors', icon: Sliders },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() =>
                      setEnhancementOptions((prev) => ({ ...prev, preset: id as EnhancementPreset }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
                      enhancementOptions.preset === id
                        ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Sliders: Brightness & Contrast */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-900">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-16">Brightness:</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={enhancementOptions.brightness}
                    onChange={(e) =>
                      setEnhancementOptions((prev) => ({
                        ...prev,
                        brightness: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <span className="w-8 text-right text-[11px] font-mono">
                    {enhancementOptions.brightness > 0 ? `+${enhancementOptions.brightness}` : enhancementOptions.brightness}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-16">Contrast:</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={enhancementOptions.contrast}
                    onChange={(e) =>
                      setEnhancementOptions((prev) => ({
                        ...prev,
                        contrast: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <span className="w-8 text-right text-[11px] font-mono">
                    {enhancementOptions.contrast > 0 ? `+${enhancementOptions.contrast}` : enhancementOptions.contrast}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            {/* Save As Copy Checkbox (hidden if it's already a new upload) */}
            {!isNewUpload ? (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsCopy}
                  onChange={(e) => setSaveAsCopy(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-[#0056A6] focus:ring-[#0056A6] w-3.5 h-3.5"
                />
                <span>Save as a new copy in Software Vault (keep original photo)</span>
              </label>
            ) : (
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Perspective corrected document will be stored directly into Software Vault.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={handleFinalSave}
                disabled={isProcessingFinal}
                className="px-4 py-2 rounded-xl bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessingFinal ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Vault...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{actionButtonLabel || (isNewUpload ? 'Add to Software Vault' : 'Apply & Save to Vault')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Integrated Live Camera Scanner Modal */}
        {showLiveCamera && (
          <LiveCameraScannerModal
            isOpen={showLiveCamera}
            onClose={() => setShowLiveCamera(false)}
            onCapture={(capturedDataUrl) => {
              setSourceDataUrl(capturedDataUrl);
              setRotationAngle(0);
              setActiveTab('corners');
              setShowLiveCamera(false);
              triggerAIDocumentDetection(capturedDataUrl);
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
