import React from 'react';

export const VectorBackground: React.FC = () => {
  return (
    <div
      id="login-vector-bg-root"
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none bg-[#020617]"
    >
      {/* SVG Vector Composition matching software color scheme (Deep Slate, Amber Gold & Electric Cyan) */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Vector Gradients */}
          <linearGradient id="amberWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="cyanVectorGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#0369a1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="strokeAmber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="strokeCyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.05" />
          </linearGradient>

          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
            <stop offset="60%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>

          {/* Vector Isometric Grid Pattern */}
          <pattern id="vectorGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.5"
              strokeOpacity="0.06"
            />
            <circle cx="0" cy="0" r="1" fill="#f59e0b" fillOpacity="0.2" />
          </pattern>

          {/* Isometric Diamond Pattern */}
          <pattern id="diamondGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 80 40 L 40 80 L 0 40 Z"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.4"
              strokeOpacity="0.04"
            />
          </pattern>
        </defs>

        {/* 1. Vector Grid Foundations */}
        <rect width="100%" height="100%" fill="url(#vectorGrid)" />
        <rect width="100%" height="100%" fill="url(#diamondGrid)" />

        {/* 2. Soft Ambient Radial Fill */}
        <rect width="100%" height="100%" fill="url(#centerGlow)" />

        {/* 3. Sweeping Vector Fluid Wave Shapes (Bottom-Left to Top-Right) */}
        <path
          d="M-100,1180 C300,900 500,1050 900,820 C1300,590 1500,750 2020,400 L2020,1180 L-100,1180 Z"
          fill="url(#amberWaveGrad)"
        />

        <path
          d="M-100,1180 C250,750 650,920 1100,680 C1550,440 1650,580 2020,220 L2020,1180 L-100,1180 Z"
          fill="url(#cyanVectorGrad)"
        />

        {/* 4. Crisp Vector Contour Lines */}
        <path
          d="M-100,1080 C350,820 600,980 1000,740 C1400,500 1600,660 2020,320"
          fill="none"
          stroke="url(#strokeAmber)"
          strokeWidth="2.5"
          strokeDasharray="8 4"
        />

        <path
          d="M-100,980 C280,680 720,860 1180,600 C1620,360 1720,480 2020,140"
          fill="none"
          stroke="url(#strokeCyan)"
          strokeWidth="2"
        />

        <path
          d="M-100,850 C400,550 800,780 1280,480 C1750,220 1850,320 2020,40"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* 5. Modern Geometric Vector Accents (Polygons, Crosses, Data Nodes) */}
        {/* Top Right Vector Nodes */}
        <g transform="translate(1550, 140)" opacity="0.6">
          <polygon points="0,-30 26,15 -26,15" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#f59e0b" />
          <line x1="0" y1="15" x2="0" y2="80" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
        </g>

        <g transform="translate(1720, 260)" opacity="0.5">
          <rect x="-20" y="-20" width="40" height="40" fill="none" stroke="#38bdf8" strokeWidth="1" transform="rotate(45)" />
          <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
        </g>

        {/* Bottom Left Geometric Accents */}
        <g transform="translate(220, 780)" opacity="0.5">
          <circle cx="0" cy="0" r="45" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="0" cy="0" r="30" fill="none" stroke="#f59e0b" strokeWidth="0.75" />
          <circle cx="0" cy="0" r="3" fill="#fbbf24" />
          <line x1="-60" y1="0" x2="60" y2="0" stroke="#f59e0b" strokeWidth="0.75" />
          <line x1="0" y1="-60" x2="0" y2="60" stroke="#f59e0b" strokeWidth="0.75" />
        </g>

        <g transform="translate(380, 920)" opacity="0.4">
          <polygon points="0,-24 20,12 -20,12" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="0,24 -20,-12 20,-12" fill="none" stroke="#f59e0b" strokeWidth="1" />
        </g>

        {/* Vector Plus Cross Markers */}
        <g opacity="0.35">
          <path d="M 120 180 L 140 180 M 130 170 L 130 190" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M 450 120 L 470 120 M 460 110 L 460 130" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 1780 820 L 1800 820 M 1790 810 L 1790 830" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M 1420 950 L 1440 950 M 1430 940 L 1430 960" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 980 140 L 1000 140 M 990 130 L 990 150" stroke="#f59e0b" strokeWidth="1" />
        </g>

        {/* Top-Left Diagonal Vector Ribbons */}
        <path
          d="M-50,250 L350,-150 M-50,290 L390,-150 M-50,330 L430,-150"
          stroke="#f59e0b"
          strokeWidth="0.8"
          strokeOpacity="0.18"
        />

        {/* Bottom-Right Diagonal Vector Ribbons */}
        <path
          d="M1650,1180 L2050,780 M1690,1180 L2050,820 M1730,1180 L2050,860"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.15"
        />
      </svg>

      {/* Subtle Vignette Overlay for focus on the center login inputs */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#020617]/20 to-[#020617]/70" />
    </div>
  );
};
