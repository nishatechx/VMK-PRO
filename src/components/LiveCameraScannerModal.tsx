import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Maximize,
  RefreshCw,
} from 'lucide-react';
import { fastClientCornerDetection, QuadCorners } from '../utils/documentVision';

interface LiveCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capturedDataUrl: string) => void;
}

export const LiveCameraScannerModal: React.FC<LiveCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<QuadCorners | null>(null);
  const [guidanceMessage, setGuidanceMessage] = useState<string>('Align document within frame');
  const [guidanceType, setGuidanceType] = useState<'info' | 'success' | 'warning'>('info');
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [confidence, setConfidence] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Consecutive steady frames counter for auto-capture
  const steadyFramesRef = useRef<number>(0);

  // Start device camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
      console.error('[Camera Scanner] Error accessing camera:', err);
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
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Real-time frame analysis loop
  useEffect(() => {
    if (!isOpen || !hasCameraPermission) return;

    let lastAnalysis = 0;
    const processFrame = (time: number) => {
      // Analyze ~10 times per second for smooth battery-friendly performance
      if (time - lastAnalysis > 100 && videoRef.current && videoRef.current.readyState === 4) {
        lastAnalysis = time;
        try {
          const res = fastClientCornerDetection(videoRef.current);
          setDetectedCorners(res.corners);
          setConfidence(res.confidence);

          const { topLeft, topRight, bottomRight, bottomLeft } = res.corners;
          const widthTop = topRight.x - topLeft.x;
          const widthBottom = bottomRight.x - bottomLeft.x;
          const heightLeft = bottomLeft.y - topLeft.y;
          const heightRight = bottomRight.y - topRight.y;
          const avgWidth = (widthTop + widthBottom) / 2;
          const avgHeight = (heightLeft + heightRight) / 2;

          // Quality guidance logic
          if (res.qualityReport.isTooDark) {
            setGuidanceMessage('Poor lighting. Move into better light');
            setGuidanceType('warning');
            steadyFramesRef.current = 0;
          } else if (avgWidth < 45 || avgHeight < 40) {
            setGuidanceMessage('Move closer to document');
            setGuidanceType('info');
            steadyFramesRef.current = 0;
          } else if (topLeft.x <= 3 || topRight.x >= 97 || topLeft.y <= 3 || bottomLeft.y >= 97) {
            setGuidanceMessage('Document touching edge. Move farther away');
            setGuidanceType('warning');
            steadyFramesRef.current = 0;
          } else if (Math.abs(widthTop - widthBottom) > 25 || Math.abs(heightLeft - heightRight) > 25) {
            setGuidanceMessage('Align camera straight above document');
            setGuidanceType('warning');
            steadyFramesRef.current = 0;
          } else {
            setGuidanceMessage('Document detected! Hold steady');
            setGuidanceType('success');
            steadyFramesRef.current += 1;

            // Auto-capture after 1.2s of steady alignment
            if (autoCaptureEnabled && steadyFramesRef.current >= 8 && !isCapturing) {
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

      // Play subtle haptic feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }

      stopCamera();
      onCapture(capturedDataUrl);
    } catch (err) {
      console.error('[Live Scanner] Capture error:', err);
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between select-none overflow-hidden"
      >
        {/* Top Control Bar */}
        <div className="w-full px-4 py-3.5 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase">Live AI Document Scanner</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Flip camera */}
            <button
              onClick={() => setCameraFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Switch camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Stage & Overlays */}
        <div className="relative flex-1 w-full max-w-2xl flex items-center justify-center overflow-hidden px-4">
          {hasCameraPermission === false ? (
            <div className="text-center p-6 text-slate-300">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Camera Access Denied</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Please grant camera permissions in your browser settings to use the real-time AI scanner.
              </p>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Real-time Document Detection Quad Overlay */}
              {detectedCorners && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {/* Subtle dark mask outside detected quad */}
                  <polygon
                    points={`
                      ${detectedCorners.topLeft.x}%,${detectedCorners.topLeft.y}%
                      ${detectedCorners.topRight.x}%,${detectedCorners.topRight.y}%
                      ${detectedCorners.bottomRight.x}%,${detectedCorners.bottomRight.y}%
                      ${detectedCorners.bottomLeft.x}%,${detectedCorners.bottomLeft.y}%
                    `}
                    fill={guidanceType === 'success' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.12)'}
                    stroke={guidanceType === 'success' ? '#3B82F6' : '#EAB308'}
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />

                  {/* 4 Corner Markers */}
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
                      r="7"
                      fill="#FFFFFF"
                      stroke={guidanceType === 'success' ? '#3B82F6' : '#EAB308'}
                      strokeWidth="3"
                      className="transition-all duration-75"
                    />
                  ))}
                </svg>
              )}

              {/* Guidance Badge Overlay */}
              <div className="absolute top-4 left-0 right-0 flex justify-center px-4 pointer-events-none z-20">
                <motion.div
                  key={guidanceMessage}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 border ${
                    guidanceType === 'success'
                      ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                      : guidanceType === 'warning'
                      ? 'bg-amber-600/90 text-white border-amber-400/40'
                      : 'bg-slate-900/80 text-white border-white/20'
                  }`}
                >
                  {guidanceType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : guidanceType === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-blue-300" />
                  )}
                  <span>{guidanceMessage}</span>
                </motion.div>
              </div>

              {/* Auto-Capture Progress Bar */}
              {autoCaptureEnabled && guidanceType === 'success' && (
                <div className="absolute bottom-4 left-8 right-8 z-20">
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, (steadyFramesRef.current / 8) * 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-white/80 mt-1 font-medium">Auto-capturing...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Shutter & Options Bar */}
        <div className="w-full px-6 py-5 bg-gradient-to-t from-black to-transparent flex flex-col items-center gap-3 z-10">
          <div className="flex items-center gap-3">
            {/* Auto Capture Toggle */}
            <button
              onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                autoCaptureEnabled
                  ? 'bg-blue-600/80 text-white border-blue-400'
                  : 'bg-white/10 text-slate-300 border-white/20'
              }`}
            >
              Auto-Snap: {autoCaptureEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Shutter Button */}
          <button
            onClick={handleTriggerCapture}
            disabled={isCapturing || hasCameraPermission === false}
            className="relative w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
            title="Snap Photo"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-slate-100 transition-colors flex items-center justify-center">
              <Camera className="w-7 h-7 text-slate-900" />
            </div>
          </button>
          <span className="text-[11px] text-slate-400">Tap to capture or let AI auto-snap when steady</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
