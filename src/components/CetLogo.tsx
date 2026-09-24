import React from 'react';
import { APP_ASSETS } from '../constants/assets';

interface CetLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CetLogo: React.FC<CetLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-9 w-auto max-w-[100px]',
    md: 'h-13 w-auto max-w-[160px]',
    lg: 'h-16 w-auto max-w-[220px]',
    xl: 'h-20 w-auto max-w-[280px]',
  };

  return (
    <img
      id="cet-logo-badge"
      src={APP_ASSETS.LOGO}
      alt="State Common Entrance Test Cell, Maharashtra"
      className={`object-contain shrink-0 select-none bg-transparent ${sizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};

