import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', onClick }) => {
  const titleSizes = {
    sm: 'text-[11px] tracking-[0.22em]',
    md: 'text-sm tracking-[0.26em]',
    lg: 'text-lg tracking-[0.3em]',
  };

  return (
    <div
      id="brand-logo-container"
      onClick={onClick}
      className={`group flex items-center gap-2.5 cursor-pointer select-none transition-transform duration-300 hover:scale-[1.02] ${className}`}
    >
      {/* Car silhouette emblem — thin silver arc over body */}
      <svg
        viewBox="0 0 64 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-white/90 transition-all duration-500 group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.35)] ${
          size === 'sm' ? 'w-9' : size === 'md' ? 'w-11' : 'w-14'
        }`}
      >
        {/* Roof arc */}
        <path
          d="M10 17C14 7.5 22 4 32 4C42 4 50 7.5 54 17"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Body line */}
        <path
          d="M6 20C10 17.5 16 16 32 16C48 16 54 17.5 58 20"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Wheel hints */}
        <circle cx="17" cy="21.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="47" cy="21.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
        {/* Road line */}
        <path d="M4 25H60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      </svg>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <span className={`font-serif font-semibold text-white leading-tight ${titleSizes[size]}`}>
          NEW ROYAL CARS
        </span>
      </div>
    </div>
  );
};
