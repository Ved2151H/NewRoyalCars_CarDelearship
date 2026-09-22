import React, { useState } from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  glow?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  icon,
  iconPosition = 'left',
  glow = false,
  className = '',
  onClick,
  ...props
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setCoords(null), 500);
    if (onClick) onClick(e);
  };

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs font-medium tracking-wide gap-1.5 rounded-lg',
    md: 'px-5 py-2.5 text-sm font-semibold tracking-wide gap-2 rounded-xl',
    lg: 'px-7 py-3.5 text-sm font-semibold tracking-wide gap-2.5 rounded-xl',
  };

  // 'gold' variant is kept as the API name but now renders the reference's bright silver primary.
  const variantClasses = {
    gold: `relative overflow-hidden btn-silver active:scale-[0.97] transition-all duration-300 ${
      glow ? 'shadow-[0_0_30px_rgba(255,255,255,0.14)]' : ''
    }`,
    secondary: `relative overflow-hidden btn-outline text-neutral-200 hover:text-white active:scale-[0.97] transition-all duration-300 ${
      glow ? 'shadow-[0_0_25px_rgba(255,255,255,0.08)]' : ''
    }`,
    ghost: `relative overflow-hidden bg-transparent hover:bg-white/5
            text-neutral-300 hover:text-white border border-transparent hover:border-white/15
            active:scale-[0.97] transition-all duration-300`,
    danger: `relative overflow-hidden bg-white/5 hover:bg-red-500/15
             text-red-300 hover:text-red-200 border border-red-500/25 hover:border-red-400/50
             backdrop-blur-md active:scale-[0.97] transition-all duration-300`,
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center select-none cursor-pointer whitespace-nowrap light-sweep ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* Ripple element */}
      {coords && (
        <span
          className="absolute w-20 h-20 bg-white/25 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping"
          style={{ left: coords.x, top: coords.y }}
        />
      )}

      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
