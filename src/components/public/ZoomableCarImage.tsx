import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react';

/**
 * E-commerce style car photo viewer.
 *
 * Display contract (fixed by the frame, never by the photo):
 * - The frame has a FIXED size supplied by the parent (`className` prop, e.g.
 *   "h-72 sm:h-96 lg:h-[420px]" or an aspect-ratio box). The photograph always
 *   renders FIT inside it at zoom 100% (object-contain): whole vehicle visible,
 *   aspect ratio preserved — no crop, no stretch, no layout shift. Resizing the
 *   window re-fits via pure CSS; no JS resize listeners.
 * - Zoom is user-controlled only: +/− steps (100 → 125 → 150 → 175 → 200%),
 *   Reset/Fit button, double-click/double-tap toggles Fit ↔ 150%.
 * - While zoomed, the photo pans by mouse/touch drag (clamped to the photo
 *   edges); at Fit nothing is draggable so page interaction is normal.
 * - Zoom/pan are transforms inside the clipped frame — the frame, the gallery
 *   and the page layout never move; no horizontal overflow.
 * - `srcKey` (photo identity) resets everything to Fit on photo switch.
 * - `onUserInteract` fires on any manual inspection (zoom, pan, double-click)
 *   so a parent slideshow can pause while the user is examining a photo.
 * - Automatic crossfade between photos: the previous photo fades out under
 *   the incoming one (opacity only — the car is never rotated/sheared).
 */

const ZOOM_STEPS = [100, 125, 150, 175, 200] as const;
const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

interface ZoomableCarImageProps {
  src: string;
  alt: string;
  /** Parent-supplied frame sizing classes (height/aspect-ratio/width). */
  className?: string;
  /** Next.js responsive sizes hint. */
  sizes?: string;
  /** Above-the-fold photos only. */
  priority?: boolean;
  /** Changing identity resets the viewer to Fit. */
  srcKey?: string | number;
  /** Fired when the user manually inspects the photo (zoom/pan/dbl-click). */
  onUserInteract?: () => void;
}

export const ZoomableCarImage: React.FC<ZoomableCarImageProps> = ({
  src,
  alt,
  className = '',
  sizes,
  priority = false,
  srcKey,
  onUserInteract,
}) => {
  const [stepIndex, setStepIndex] = useState(0); // 0 = Fit (100%)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState<string | null>(null); // crossfade outgoer
  const lastSrcRef = useRef(src);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    pointerId: number | null;
  }>({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, pointerId: null });

  const zoom = ZOOM_STEPS[stepIndex] / 100;
  const zoomed = stepIndex > 0;

  /** Fit / Reset — the only way back to the default state. */
  const resetToFit = useCallback(() => {
    setStepIndex(0);
    setPan({ x: 0, y: 0 });
  }, []);

  /** Manual interactions pause any parent slideshow. */
  const interact = useCallback(() => {
    onUserInteract?.();
  }, [onUserInteract]);

  const zoomIn = useCallback(() => {
    setStepIndex((s) => Math.min(s + 1, ZOOM_STEPS.length - 1));
    interact();
  }, [interact]);

  // Track photo changes so the outgoing photo can fade out underneath.
  useEffect(() => {
    if (lastSrcRef.current !== src) {
      setPrevSrc(lastSrcRef.current);
      lastSrcRef.current = src;
    }
  }, [src]);

  // Switching photographs always resets to the default Fit state.
  useEffect(() => {
    resetToFit();
    setLoaded(false);
  }, [srcKey, resetToFit]);

  /* ------------------------- Pan (pointer events) ------------------------ */

  /** Max shift = (zoomed content box − frame) / 2 → never pans past the edges. */
  const clampPan = useCallback(
    (x: number, y: number, atZoom = zoom) => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      const maxX = (rect.width * (atZoom - 1)) / 2;
      const maxY = (rect.height * (atZoom - 1)) / 2;
      return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
    },
    [zoom]
  );

  const zoomOut = useCallback(() => {
    const next = Math.max(stepIndex - 1, 0);
    setStepIndex(next);
    interact();
    if (next === 0) {
      setPan({ x: 0, y: 0 }); // re-center when back at Fit
    } else {
      // Re-clamp the retained pan to the smaller step's bounds so the photo
      // can never sit past its own edge between steps.
      setPan((p) => clampPan(p.x, p.y, ZOOM_STEPS[next] / 100));
    }
  }, [stepIndex, clampPan, interact]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoomed) return; // at Fit the page scrolls/interacts normally
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
      pointerId: e.pointerId,
    };
    interact(); // panning is manual inspection — pause the slideshow
    try {
      frameRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is best-effort; drag still tracks via pointer events */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    setPan(clampPan(d.baseX + (e.clientX - d.startX), d.baseY + (e.clientY - d.startY)));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d.pointerId === e.pointerId) {
      dragRef.current = { ...d, active: false, pointerId: null };
      try {
        frameRef.current?.releasePointerCapture?.(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
  };

  /** Double-click / double-tap toggles: Fit → zoomed in → back to Fit. */
  const onDoubleClick = () => {
    if (stepIndex === 0) setStepIndex(2); // 150% — comfortable inspection zoom
    else resetToFit();
    interact();
  };

  const zoomPct = ZOOM_STEPS[stepIndex];

  const controls = useMemo(
    () => (
      <div
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-white/15 bg-black/65 p-1 shadow-lg backdrop-blur-md"
        // Controls must not start a drag or trigger the frame's dbl-click.
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={zoomOut}
          disabled={!zoomed}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent sm:h-8 sm:w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span
          aria-live="polite"
          className="min-w-[3.2rem] text-center font-mono text-[11px] font-semibold text-neutral-300"
        >
          {zoomPct}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoomPct >= ZOOM_MAX}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent sm:h-8 sm:w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-white/15" />
        <button
          type="button"
          onClick={resetToFit}
          disabled={!zoomed}
          aria-label="Reset to fit"
          title="Reset / Fit"
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent sm:h-8 sm:px-2.5 sm:text-xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fit</span>
        </button>
      </div>
    ),
    [zoomed, zoomPct, zoomIn, zoomOut, resetToFit]
  );

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      className={`group relative select-none overflow-hidden rounded-2xl glass-card bg-[#0a0c0d] ${
        zoomed ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
      style={{ touchAction: zoomed ? 'none' : 'auto' }}
    >
      {/* Photo layer: fits the fixed frame, clipped here — never on the page. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence>
          {!loaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <Loader2 className="h-7 w-7 animate-spin text-neutral-600" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crossfade outgoer: previous photo fades away under the new one.
            Zoom/pan are always reset to Fit before a switch, so a static
            render of it is correct. */}
        {prevSrc && (
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              key={`out-${prevSrc}`}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              onAnimationComplete={() => setPrevSrc(null)}
              className="absolute inset-0"
            >
              <div
                className="h-full w-full"
                style={{ transform: 'scale(1) translate(0px, 0px)' }}
              >
                <Image
                  src={prevSrc}
                  alt=""
                  aria-hidden
                  fill
                  sizes={sizes}
                  className="object-contain object-center p-2"
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Entrance animation layer (motion owns this transform). The
            crossfade comes from the outgoer above plus this fade-in. */}
        <motion.div
          key={String(srcKey)}
          initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {/* Zoom/pan layer (plain div owns this transform — never animated by
              motion, so the two never fight over `style.transform`). */}
          <div
            className="h-full w-full"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              // Center origin keeps zoom centered; pan then shifts exactly by
              // (pan.x, pan.y) because the translate is pre-scale (pan / zoom).
              transformOrigin: 'center center',
              transition: dragRef.current.active
                ? 'none'
                : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                setLoaded(true);
              }}
              className="object-contain object-center p-2"
            />
          </div>
        </motion.div>
      </div>
      {controls}
    </div>
  );
};
