import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish, duration = 1200 }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const stepTime = Math.max(30, Math.floor(duration / 15));
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsExiting(true);
          setTimeout(() => {
            setIsHidden(true);
            if (onFinish) onFinish();
          }, 600);
          return 100;
        }
        return prev + Math.floor(Math.random() * 14 + 8);
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, [onFinish, duration]);

  if (isHidden) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050607] transition-all duration-700 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none blur-sm' : 'opacity-100'
      }`}
    >
      {/* Ambient white pulse */}
      <div className="absolute w-96 h-96 rounded-full bg-white/[0.05] blur-[120px] animate-pulse pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Emblem */}
        <div className="mb-6 scale-125 transform transition-all duration-700 animate-fade-in">
          <Logo size="lg" />
        </div>

        {/* Tagline */}
        <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-400 mb-8">
          The Pinnacle of Luxury Automotive
        </p>

        {/* Silver progress bar */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden border border-white/10 relative">
          <div
            className="h-full bg-gradient-to-r from-neutral-400 via-white to-neutral-300 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Loading percentage */}
        <div className="mt-3 flex items-center justify-between w-64 text-[10px] text-neutral-500 tracking-[0.2em]">
          <span>INITIALIZING SHOWROOM</span>
          <span className="text-neutral-300">{Math.min(progress, 100)}%</span>
        </div>
      </div>
    </div>
  );
};
