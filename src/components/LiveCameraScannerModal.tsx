import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import { fastClientCornerDetection, QuadCorners } from '../utils/documentVision';

interface LiveCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capturedDataUrl: string, allPages?: string[]) => void;
  initialMultiPage?: boolean;
}

export const LiveCameraScannerModal: React.FC<LiveCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  initialMultiPage = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<QuadCorners | null>(null);
  const [guidanceMessage, setGuidanceMessage] = useState<string>('Position document in frame');
  const [guidanceType, setGuidanceType] = useState<'info' | 'success' | 'warning'>('info');
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashFeedback, setFlashFeedback] = useState<boolean>(false);

  // Multi-page batch scanning state
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [isMultiPageMode, setIsMultiPageMode] = useState<boolean>(initialMultiPage);

  // Consecutive steady frames counter for auto-capture
  const steadyFramesRef = useRef<number>(0);
  const prevCornersRef = useRef<QuadCorners | null>(null);

  // Start device camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 2560, min: 1280 },
          height: { ideal: 1440, min: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error('[Google Files Camera] Error accessing camera:', err);
      setHasCameraPermission(false);
    }
  }, [cameraFacing]);

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCapturedPages([]);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Real-time document detection loop
  useEffect(() => {
    if (!isOpen || !hasCameraPermission) return;

    let lastAnalysis = 0;
    const processFrame = (time: number) => {
      if (
        time - lastAnalysis > 90 &&
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        !isCapturing
      ) {
        lastAnalysis = time;
        try {
          const res = fastClientCornerDetection(videoRef.current);
          setDetectedCorners(res.corners);

          const { topLeft, topRight, bottomRight, bottomLeft } = res.corners;
          const widthTop = topRight.x - topLeft.x;
          const widthBottom = bottomRight.x - bottomLeft.x;
          const heightLeft = bottomLeft.y - topLeft.y;
          const heightRight = bottomRight.y - topRight.y;
          const avgWidth = (widthTop + widthBottom) / 2;
          const avgHeight = (heightLeft + heightRight) / 2;

          let isStable = false;
          if (prevCornersRef.current) {
            const dTL = Math.hypot(
              topLeft.x - prevCornersRef.current.topLeft.x,
              topLeft.y - prevCornersRef.current.topLeft.y
            );
            const dTR = Math.hypot(
              topRight.x - prevCornersRef.current.topRight.x,
              topRight.y - prevCornersRef.current.topRight.y
            );
            const dBR = Math.hypot(
              bottomRight.x - prevCornersRef.current.bottomRight.x,
              bottomRight.y - prevCornersRef.current.bottomRight.y
            );
            const dBL = Math.hypot(
              bottomLeft.x - prevCornersRef.current.bottomLeft.x,
              bottomLeft.y - prevCornersRef.current.bottomLeft.y
            );
            const maxMovement = Math.max(dTL, dTR, dBR, dBL);
            isStable = maxMovement < 1.8;
          }
          prevCornersRef.current = res.corners;

          if (res.qualityReport.isTooDark) {
            setGuidanceMessage('Poor lighting. Move into brighter light');
            setGuidanceType('warning');
            steadyFramesRef.current = 0;
          } else if (avgWidth < 40 || avgHeight < 35) {
            setGuidanceMessage('Move closer');
            setGuidanceType('info');
            steadyFramesRef.current = 0;
          } else if (
            topLeft.x <= 2 ||
            topRight.x >= 98 ||
            topLeft.y <= 2 ||
            bottomLeft.y >= 98
          ) {
            setGuidanceMessage('Document touching edge');
            setGuidanceType('warning');
            steadyFramesRef.current = 0;
          } else {
            if (isStable) {
              steadyFramesRef.current += 1;
              setGuidanceMessage('Hold steady');
              setGuidanceType('success');
            } else {
              setGuidanceMessage('Hold steady');
              setGuidanceType('info');
            }

            // Auto-capture after 7 steady frames
            if (autoCaptureEnabled && steadyFramesRef.current >= 7 && !isCapturing) {
              handleTriggerCapture();
              return;
            }
          }
        } catch {
          // Ignore transient frame analysis errors
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, hasCameraPermission, autoCaptureEnabled, isCapturing]);

  // Capture frame
  const handleTriggerCapture = () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }

      setFlashFeedback(true);
      setTimeout(() => setFlashFeedback(false), 150);

      const nextPages = [...capturedPages, capturedDataUrl];
      setCapturedPages(nextPages);

      if (!isMultiPageMode && nextPages.length === 1) {
        stopCamera();
        onCapture(capturedDataUrl, nextPages);
      } else {
        steadyFramesRef.current = 0;
        prevCornersRef.current = null;
        setTimeout(() => {
          setIsCapturing(false);
        }, 400);
      }
    } catch (err) {
      console.error('[Google Camera Scan] Capture error:', err);
      setIsCapturing(false);
    }
  };

  // Complete batch scan
  const handleFinishMultiPage = () => {
    if (capturedPages.length === 0) return;
    stopCamera();
    onCapture(capturedPages[0], capturedPages);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#131314] text-[#E3E3E3] flex flex-col justify-between select-none overflow-hidden font-sans"
      >
        {/* Top App Bar (Google Camera Style) */}
        <div className="w-full px-4 py-3 flex items-center justify-between z-20">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-[#1E1F20]/70 hover:bg-[#282A2C] text-[#E3E3E3] transition-colors cursor-pointer"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>

          {capturedPages.length > 0 && (
            <div className="px-3.5 py-1 rounded-full bg-[#1E1F20]/80 text-[#E3E3E3] text-xs font-normal border border-white/10">
              Page {capturedPages.length + 1}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCameraFacing((f) => (f === 'environment' ? 'user' : 'environment'))
              }
              className="p-2.5 rounded-full bg-[#1E1F20]/70 hover:bg-[#282A2C] text-[#E3E3E3] transition-colors cursor-pointer"
              title="Switch camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative flex-1 w-full max-w-xl mx-auto flex items-center justify-center overflow-hidden px-4">
          {hasCameraPermission === false ? (
            <div className="text-center p-6 text-[#C4C7C5]">
              <AlertCircle className="w-10 h-10 text-[#F2B8B5] mx-auto mb-2" />
              <h3 className="text-sm font-medium text-[#E3E3E3] mb-1">Camera Access Required</h3>
              <p className="text-xs text-[#8E918F] max-w-xs">
                Allow camera permissions in your browser to scan documents.
              </p>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/4] max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Shutter Flash */}
              {flashFeedback && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-150 pointer-events-none" />
              )}

              {/* Google-style Real-time Document Outline */}
              {detectedCorners && !flashFeedback && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <polygon
                    points={`
                      ${detectedCorners.topLeft.x}%,${detectedCorners.topLeft.y}%
                      ${detectedCorners.topRight.x}%,${detectedCorners.topRight.y}%
                      ${detectedCorners.bottomRight.x}%,${detectedCorners.bottomRight.y}%
                      ${detectedCorners.bottomLeft.x}%,${detectedCorners.bottomLeft.y}%
                    `}
                    fill="rgba(26, 115, 232, 0.12)"
                    stroke="#1A73E8"
                    strokeWidth="2"
                  />
                  {[
                    detectedCorners.topLeft,
                    detectedCorners.topRight,
                    detectedCorners.bottomRight,
                    detectedCorners.bottomLeft,
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={`${pt.x}%`}
                      cy={`${pt.y}%`}
                      r="4"
                      fill="#FFFFFF"
                      stroke="#1A73E8"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              )}

              {/* Google-style Guidance Pill */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
                <div className="px-4 py-1.5 rounded-full text-xs font-normal bg-[#1E1F20]/90 text-[#E3E3E3] border border-white/10 shadow-sm backdrop-blur-xs">
                  {guidanceMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Shutter & Controls (Google Camera Style) */}
        <div className="w-full px-6 py-5 bg-[#131314] flex flex-col items-center gap-4 z-20">
          {/* Segmented Auto/Manual Toggle */}
          <div className="flex items-center p-1 bg-[#1E1F20] rounded-full border border-white/10 text-xs">
            <button
              onClick={() => setAutoCaptureEnabled(true)}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                autoCaptureEnabled
                  ? 'bg-[#0B57D0] text-white'
                  : 'text-[#C4C7C5] hover:text-white'
              }`}
            >
              Auto-capture
            </button>
            <button
              onClick={() => setAutoCaptureEnabled(false)}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                !autoCaptureEnabled
                  ? 'bg-[#0B57D0] text-white'
                  : 'text-[#C4C7C5] hover:text-white'
              }`}
            >
              Manual
            </button>
          </div>

          {/* Shutter Row */}
          <div className="w-full max-w-sm flex items-center justify-between">
            {/* Thumbnail / Page count preview */}
            <div className="w-16 flex items-center">
              {capturedPages.length > 0 && (
                <div
                  onClick={handleFinishMultiPage}
                  className="relative w-11 h-13 rounded-lg overflow-hidden border border-white/40 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  title="Finish and review scanned pages"
                >
                  <img
                    src={capturedPages[capturedPages.length - 1]}
                    alt="Last page thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-white font-medium">
                    {capturedPages.length}
                  </span>
                </div>
              )}
            </div>

            {/* Google Shutter Button */}
            <button
              onClick={handleTriggerCapture}
              disabled={isCapturing || hasCameraPermission === false}
              className="relative w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
              title="Capture page"
            >
              <div className="w-full h-full rounded-full bg-white transition-colors" />
            </button>

            {/* Done Button (Multi-page) */}
            <div className="w-16 flex justify-end">
              {capturedPages.length > 0 && (
                <button
                  onClick={handleFinishMultiPage}
                  className="px-4 py-2 rounded-full bg-[#0B57D0] hover:bg-[#1A73E8] text-white text-xs font-medium shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
