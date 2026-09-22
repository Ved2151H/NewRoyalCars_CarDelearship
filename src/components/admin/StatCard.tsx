import React, { useEffect, useState } from 'react';
import { GlassCard } from '../common/GlassCard';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'gold' | 'emerald' | 'rose' | 'amber' | 'blue';
  prefix?: string;
  suffix?: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  prefix = '',
  suffix = '',
  delay = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const frameTime = 20;
    const totalFrames = duration / frameTime;
    const increment = value / totalFrames;

    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, frameTime);
      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <GlassCard
      enableTilt
      intensity={5}
      className="p-5 flex items-center gap-4"
    >
      {/* Icon tile */}
      <div className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center text-neutral-200 shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-xs text-neutral-400 mb-1 truncate">{label}</div>
        <div className="font-serif text-3xl font-semibold text-white tracking-tight leading-none">
          {prefix}
          {displayValue}
          {suffix}
        </div>
      </div>
    </GlassCard>
  );
};
