import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export interface GlassSelectOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  options: GlassSelectOption[];
  onChange: (value: string) => void;
  /** Classes for the trigger button — defaults to the site-wide glass field style. */
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_BUTTON_CLASS =
  'w-full appearance-none px-4 py-3 pr-10 rounded-xl glass-panel text-sm text-left text-neutral-200 focus:outline-none focus:border-white/30 cursor-pointer transition-all duration-300 hover:border-white/20';

const MENU_MAX_HEIGHT = 260;

/**
 * Fully custom dark-glass dropdown used everywhere in the app.
 * Replaces native <select> so the open menu never renders with the
 * browser's default white background.
 *
 * Accessibility: click + keyboard navigation (arrows, Enter, Space,
 * Home/End), Escape to close, outside click to close, ARIA listbox roles.
 */
export const GlassSelect: React.FC<GlassSelectProps> = ({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    up: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const computeCoords = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const spaceBelow = window.innerHeight - rect.bottom;
    const up = spaceBelow < MENU_MAX_HEIGHT + 20 && rect.top > spaceBelow;
    return {
      top: up ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      up,
    };
  }, []);

  const openMenu = useCallback(() => {
    setCoords(computeCoords());
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : -1);
    setOpen(true);
  }, [computeCoords, options, value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  const commitHighlight = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt) return;
      onChange(opt.value);
      closeMenu();
      buttonRef.current?.focus();
    },
    [options, onChange, closeMenu]
  );

  /* ---------- outside click to close ---------- */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, closeMenu]);

  /* ---------- keep menu anchored on scroll / resize ---------- */
  useEffect(() => {
    if (!open) return;
    const reposition = () => setCoords(computeCoords());
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, computeCoords]);

  /* ---------- keyboard navigation ---------- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setHighlight(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlight >= 0) commitHighlight(highlight);
        else closeMenu();
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={`${className || DEFAULT_BUTTON_CLASS} focus-visible:border-white/40`}
      >
        <span className="block truncate">{selected ? selected.label : 'Select…'}</span>
        <ChevronDown
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none transition-transform duration-300 ${
            open ? 'rotate-180 text-neutral-300' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && coords && (
          <motion.div
            ref={menuRef}
            role="listbox"
            initial={{ opacity: 0, y: coords.up ? 6 : -6, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: coords.up ? 4 : -4, scale: 0.98, filter: 'blur(3px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 176),
              zIndex: 70,
            }}
            className="rounded-xl bg-[#0a0b0d]/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <div className="max-h-[260px] overflow-y-auto py-1.5">
              {options.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlight;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => commitHighlight(idx)}
                    className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between gap-3 transition-colors duration-150 ${
                      isHighlighted ? 'bg-white/[0.07] text-white' : 'text-neutral-300'
                    } ${isSelected ? 'font-semibold text-white' : ''}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-neutral-300 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
