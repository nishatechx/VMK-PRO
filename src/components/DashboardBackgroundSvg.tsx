import React from 'react';

export const DashboardBackgroundSvg: React.FC = () => {
  return (
    <div
      id="dashboard-background-art"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 rounded-2xl md:rounded-3xl"
    >
      {/* Base clean white-blue background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9]/70 to-[#e8f0fe]/80" />

      {/* Top-Right Dotted Matrix Pattern */}
      <svg
        className="absolute top-0 right-0 w-[420px] h-[340px] opacity-40 text-blue-300"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 420 340"
        fill="none"
      >
        <defs>
          <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="2" fill="currentColor" />
          </pattern>
          <linearGradient id="dot-fade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.8" />
            <stop offset="70%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="dot-mask">
            <rect width="420" height="340" fill="url(#dot-fade)" />
          </mask>
        </defs>
        <rect width="420" height="340" fill="url(#dot-pattern)" mask="url(#dot-mask)" />
      </svg>

      {/* Bottom Subtle Wavy Streamlines & Fluid Curves (matches image aesthetic) */}
      <svg
        className="absolute bottom-0 right-0 w-full h-[65%] min-h-[300px] opacity-85"
        viewBox="0 0 1200 600"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Soft background shape 1 */}
        <path
          d="M0,450 C300,560 600,380 900,480 C1050,530 1150,420 1200,360 L1200,600 L0,600 Z"
          fill="url(#waveGrad1)"
          opacity="0.35"
        />

        {/* Foreground fluid hill 2 */}
        <path
          d="M0,520 C250,580 500,460 750,510 C950,550 1100,450 1200,400 L1200,600 L0,600 Z"
          fill="url(#waveGrad2)"
          opacity="0.45"
        />

        {/* Fine Wavy Wireframe / Contour Lines */}
        <g stroke="url(#lineGrad)" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M0,380 C320,490 620,330 920,440 C1080,500 1160,370 1200,300" />
          <path d="M0,400 C320,505 620,350 920,455 C1080,510 1160,390 1200,320" />
          <path d="M0,420 C320,520 620,370 920,470 C1080,520 1160,410 1200,340" />
          <path d="M0,440 C320,535 620,390 920,485 C1080,530 1160,430 1200,360" />
          <path d="M0,460 C320,550 620,410 920,500 C1080,540 1160,450 1200,380" />
          <path d="M0,480 C320,565 620,430 920,515 C1080,550 1160,470 1200,400" />
          <path d="M0,500 C320,580 620,450 920,530 C1080,560 1160,490 1200,420" />
          <path d="M0,520 C320,595 620,470 920,545 C1080,570 1160,510 1200,440" />
        </g>
      </svg>
    </div>
  );
};
