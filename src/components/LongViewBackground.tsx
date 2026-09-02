import React from 'react';

export const LongViewBackground: React.FC = () => {
  // Long-view panoramic architectural and digital landscape background
  const longViewImgUrl =
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=2069&auto=format&fit=crop';

  return (
    <div
      id="login-longview-bg-root"
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none bg-slate-950"
    >
      {/* 1. Long view perspective background picture */}
      <img
        id="login-longview-image"
        src={longViewImgUrl}
        alt="Institutional Campus Long View"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] saturate-[0.9] scale-[1.02]"
      />

      {/* 2. Optical color grading layer tailored to software's Midnight Slate & Amber palette */}
      <div className="absolute inset-0 bg-[#020617]/65 mix-blend-multiply" />

      {/* 3. Subtle ambient light cones in Amber & Deep Slate */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-500/15 rounded-full blur-[100px]" />

      {/* 4. Elegant SVG vector perspective grid lines & depth contours */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="longViewGridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Perspective floor grid receding to horizon */}
        <g stroke="url(#longViewGridGrad)" strokeWidth="0.75">
          <line x1="960" y1="560" x2="-200" y2="1100" />
          <line x1="960" y1="560" x2="200" y2="1100" />
          <line x1="960" y1="560" x2="600" y2="1100" />
          <line x1="960" y1="560" x2="960" y2="1100" />
          <line x1="960" y1="560" x2="1320" y2="1100" />
          <line x1="960" y1="560" x2="1720" y2="1100" />
          <line x1="960" y1="560" x2="2120" y2="1100" />

          {/* Perspective horizontal lines */}
          <line x1="0" y1="620" x2="1920" y2="620" strokeOpacity="0.1" />
          <line x1="0" y1="700" x2="1920" y2="700" strokeOpacity="0.15" />
          <line x1="0" y1="810" x2="1920" y2="810" strokeOpacity="0.25" />
          <line x1="0" y1="950" x2="1920" y2="950" strokeOpacity="0.35" />
        </g>
      </svg>

      {/* 5. Smooth Vignette at borders */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/40 to-slate-950/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/90" />
    </div>
  );
};
