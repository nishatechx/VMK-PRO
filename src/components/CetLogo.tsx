import React from 'react';

interface CetLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CetLogo: React.FC<CetLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  return (
    <div
      id="cet-logo-badge"
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white font-extrabold shadow-sm border-2 border-blue-400/80 shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      <div className="absolute inset-0.5 rounded-full border border-white/40 pointer-events-none" />
      <span className="tracking-tight font-sans drop-shadow-xs font-black">CET</span>
    </div>
  );
};
