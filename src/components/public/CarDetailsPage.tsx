import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Car } from '../../types';
import { formatKm } from '../../lib/utils';
import { GlassButton } from '../common/GlassButton';
import { ZoomableCarImage } from './ZoomableCarImage';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  RotateCw,
  Pause,
  Phone,
  Snowflake,
  Users,
  Gauge,
  Fuel,
  Cog,
  Calendar,
  ShieldCheck,
  CarFront,
  Palette,
  CheckCircle2,
} from 'lucide-react';

interface CarDetailsPageProps {
  car: Car;
  isFavorite: boolean;
  dealershipPhone: string;
  onToggleFavorite: (carId: string) => void;
  onBack: () => void;
  onSendEnquiry: (car: Car) => void;
}

type DetailTab = 'overview' | 'features' | 'gallery';

const WHY_CHOOSE_US = [
  'Verified Vehicles',
  'Transparent Pricing',
  'Easy Transfer Options',
  'Dedicated After-Sales Support',
];

export const CarDetailsPage: React.FC<CarDetailsPageProps> = ({
  car,
  isFavorite,
  dealershipPhone,
  onToggleFavorite,
  onBack,
  onSendEnquiry,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [tab, setTab] = useState<DetailTab>('overview');

  /* ------------------ Automatic photo rotation (slideshow) ------------------
   * Cycles 1 → 2 → … → N → 1 every second with a crossfade. Pauses while the
   * pointer is over the viewer and for a few seconds after any manual
   * interaction (arrows/thumbnails/zoom/pan). Once the user takes over via a
   * control, the slideshow stays off until they re-enable the toggle.
   */
  const ROTATE_MS = 1000;
  const RESUME_MS = 4000;
  const [slideshowOn, setSlideshowOn] = useState(true);
  const hoverPauseRef = useRef(false); // pointer resting on the viewer
  const interactionPauseUntilRef = useRef(0); // brief pause after interaction
  // Set synchronously on manual photo selection so a pending interval tick can
  // never fire one stale advance after the user takes over (React clears the
  // interval on the NEXT render — the ref guards that gap).
  const manualOverrideRef = useRef(false);
  const imagesLength = car.images.length;

  const selectImage = useCallback(
    (idx: number) => {
      manualOverrideRef.current = true;
      setActiveImageIndex(idx);
      if (imagesLength > 1) {
        // A deliberate photo choice means the user is steering — stop the
        // automatic rotation until they re-enable it.
        setSlideshowOn(false);
      }
    },
    [imagesLength]
  );

  /** Fired by the viewer on zoom/pan/dbl-click — pause without hijacking. */
  const handleViewerInteract = useCallback(() => {
    interactionPauseUntilRef.current = Date.now() + RESUME_MS;
  }, [RESUME_MS]);

  useEffect(() => {
    if (!slideshowOn || imagesLength <= 1) return;
    const id = setInterval(() => {
      if (manualOverrideRef.current) return;
      if (hoverPauseRef.current || Date.now() < interactionPauseUntilRef.current) return;
      setActiveImageIndex((p) => (p + 1) % imagesLength);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slideshowOn, imagesLength, ROTATE_MS]);

  const toggleSlideshow = useCallback(() => {
    manualOverrideRef.current = false; // fresh start when re-enabled
    setSlideshowOn((s) => !s);
  }, []);

  // Preload only the NEXT optimized photo so the crossfade is instant
  // without downloading the whole gallery up front.
  const nextImage = imagesLength > 1 ? car.images[(activeImageIndex + 1) % imagesLength] : null;

  const specs = [
    { icon: <CarFront className="w-4 h-4" />, label: 'Variant', value: car.variant },
    { icon: <Snowflake className="w-4 h-4" />, label: 'AC', value: car.ac ? 'Yes' : 'No' },
    { icon: <ShieldCheck className="w-4 h-4" />, label: 'Insurance', value: car.insurance },
    { icon: <Users className="w-4 h-4" />, label: 'Number of Owners', value: String(car.owners) },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: 'KM Driven',
      value:
        car.kmTo > car.kmFrom
          ? `${formatKm(car.kmFrom)} - ${formatKm(car.kmTo)} km`
          : `${formatKm(car.kmFrom)} km`,
    },
    { icon: <Fuel className="w-4 h-4" />, label: 'Fuel Type', value: car.fuel },
    { icon: <Cog className="w-4 h-4" />, label: 'Transmission', value: car.transmission },
    { icon: <Palette className="w-4 h-4" />, label: 'Colour', value: car.color },
    { icon: <Calendar className="w-4 h-4" />, label: 'Year', value: String(car.year) },
  ];

  return (
    <div className="relative pt-28 sm:pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-6"
        aria-label="Breadcrumb"
      >
        <button onClick={onBack} className="hover:text-white transition-colors cursor-pointer">
          Home
        </button>
        <span>/</span>
        <button onClick={onBack} className="hover:text-white transition-colors cursor-pointer">
          Cars
        </button>
        <span>/</span>
        <span className="text-neutral-300 break-words min-w-0 flex-1">{car.name}</span>
      </motion.nav>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Gallery (7 cols) */}
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 min-w-0"
        >
          {/* Main image — fixed frame; the photo always FITS (object-contain,
              no crop/stretch), with Amazon-style zoom + pan inside the frame. */}
          <div className="relative">
            {car.images.length > 0 ? (
              <div
                onMouseEnter={() => {
                  hoverPauseRef.current = true;
                }}
                onMouseLeave={() => {
                  hoverPauseRef.current = false;
                }}
              >
                <ZoomableCarImage
                  src={car.images[activeImageIndex] || car.images[0]}
                  alt={`${car.name} — view ${activeImageIndex + 1}`}
                  srcKey={activeImageIndex}
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="h-72 sm:h-96 lg:h-[420px]"
                  onUserInteract={handleViewerInteract}
                />
              </div>
            ) : (
              <div className="relative h-72 sm:h-96 lg:h-[420px] rounded-2xl overflow-hidden glass-card" />
            )}

            {/* Grade */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 via-transparent to-black/20" />

            {/* Favorite */}
            <button
              onClick={() => onToggleFavorite(car.id)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 cursor-pointer ${
                isFavorite
                  ? 'bg-white/90 border-white text-[#0a0c0d] scale-110'
                  : 'bg-black/45 border-white/20 text-white hover:bg-black/70'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Slideshow toggle */}
            {car.images.length > 1 && (
              <button
                onClick={toggleSlideshow}
                aria-label={slideshowOn ? 'Pause automatic rotation' : 'Start automatic rotation'}
                title={slideshowOn ? 'Pause automatic rotation' : 'Start automatic rotation'}
                className="absolute top-4 right-16 p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 cursor-pointer bg-black/45 border-white/20 text-white hover:bg-black/70"
              >
                {slideshowOn ? <Pause className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
              </button>
            )}

            {/* Prev / Next */}
            {car.images.length > 1 && (
              <>
                <button
                  onClick={() => selectImage(activeImageIndex === 0 ? car.images.length - 1 : activeImageIndex - 1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all duration-300 opacity-75 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    selectImage(activeImageIndex === car.images.length - 1 ? 0 : activeImageIndex + 1)
                  }
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all duration-300 opacity-75 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Counter — bottom-left; the zoom controls occupy bottom-right */}
            {car.images.length > 0 && (
              <div className="absolute bottom-3 left-4 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md text-xs font-mono text-neutral-200 border border-white/10">
                {activeImageIndex + 1} / {car.images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 mt-4 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {car.images.map((img, idx) => (
              <motion.button
                key={idx}
                onClick={() => selectImage(idx)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25 }}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border transition-all duration-300 cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-white/70 shadow-[0_0_18px_rgba(255,255,255,0.15)]'
                    : 'border-white/10 opacity-60 hover:opacity-100'
                }`}
              >                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="96px"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="object-contain p-0.5"
                  />
              </motion.button>
            ))}
          </div>

          {/* Preload only the NEXT optimized photo (same responsive `sizes` as
              the viewer, so it's a true cache hit) — the crossfade is instant
              without downloading the whole gallery up front. */}
          {nextImage && (
            <div className="sr-only" aria-hidden>
              <Image
                src={nextImage}
                alt=""
                width={320}
                height={180}
                sizes="(max-width: 1024px) 100vw, 58vw"
                loading="eager"
              />
            </div>
          )}
        </motion.div>

        {/* Info panel (5 cols) */}
        <motion.div
          initial={{ opacity: 0, x: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 min-w-0"
        >
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight break-words">
              {car.name}
            </h1>
            <span
              className={`mt-2 sm:mt-0 self-start px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${
                car.availability === 'Available'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                  : car.availability === 'Booked'
                  ? 'bg-white/10 text-neutral-300 border border-white/20'
                  : 'bg-red-500/15 text-red-300 border border-red-400/30'
              }`}
            >
              {car.availability}
            </span>
          </div>

          <div className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-white">
            {car.formattedPrice}
          </div>

          {/* Spec list panel */}
          <div className="mt-6 rounded-2xl glass-panel divide-y divide-white/[0.06] overflow-hidden">
            {specs.map((spec, idx) => (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.25 + idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 hover:bg-white/[0.03] transition-colors duration-300"
              >
                <span className="flex items-center gap-3 text-sm text-neutral-400 shrink-0">
                  <span className="text-neutral-500">{spec.icon}</span>
                  {spec.label}
                </span>
                <span className="text-sm font-semibold text-white text-right break-words min-w-0">{spec.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <GlassButton
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => onSendEnquiry(car)}
            >
              Send Enquiry
            </GlassButton>
            {dealershipPhone && (
              <a href={`tel:${dealershipPhone.replace(/\s+/g, '')}`} className="block">
                <GlassButton variant="secondary" size="lg" className="w-full" icon={<Phone className="w-4 h-4" />}>
                  Call Now
                </GlassButton>
              </a>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tabs: Overview / Features / Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12"
      >
        {/* Tab bar */}
        <div className="flex sm:inline-flex overflow-x-auto max-w-full p-1 rounded-xl glass-panel mb-8 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(['overview', 'features', 'gallery'] as DetailTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-6 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors duration-300 cursor-pointer ${
                tab === t ? 'text-[#0a0c0d]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab === t && (
                <motion.span
                  layoutId="detail-tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-b from-white to-neutral-300 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 capitalize">{t}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* About this car */}
                <div className="rounded-2xl glass-panel p-6">
                  <h3 className="font-serif text-xl font-semibold text-white mb-3">About this car</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed break-words min-w-0">
                    {car.description || `The ${car.name} offers a perfect blend of style, performance and comfort. Well-maintained and ready for a new home.`}
                  </p>
                </div>

                {/* Why Choose Us */}
                <div className="rounded-2xl glass-panel p-6">
                  <h3 className="font-serif text-xl font-semibold text-white mb-4">Why Choose Us?</h3>
                  <ul className="space-y-3">
                    {WHY_CHOOSE_US.map((item, idx) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        className="flex items-start gap-3 text-sm text-neutral-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'features' && (
              <div className="rounded-2xl glass-panel p-6">
                {car.features.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                    {car.features.map((feat, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        className="flex items-start gap-3 text-sm text-neutral-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">{feat}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">
                    Feature list will appear here once added by the dealership.
                  </p>
                )}
              </div>
            )}

            {tab === 'gallery' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {car.images.map((img, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => {
                      selectImage(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="relative h-40 rounded-xl overflow-hidden border border-white/10 group cursor-pointer"
                  >
                    <Image
                      src={img}
                      alt={`Gallery image ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 380px"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="object-contain p-2 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
