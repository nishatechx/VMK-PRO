import React from 'react';
import { APP_ASSETS } from '../constants/assets';

interface CetLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CetLogo: React.FC<CetLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-auto max-w-[80px]',
    md: 'h-11 w-auto max-w-[120px]',
    lg: 'h-14 w-auto max-w-[160px]',
  };

  return (
    <img
      id="cet-logo-badge"
      src={APP_ASSETS.LOGO}
      alt="State Common Entrance Test Cell, Maharashtra"
      className={`object-contain shrink-0 select-none ${sizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};

