import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Car } from '../../types';
import { formatKm } from '../../lib/utils';
import { GlassButton } from '../common/GlassButton';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Phone,
  Snowflake,
  Users,
  Gauge,
  Fuel,
  Cog,
  Calendar,
  Hash,
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

  const specs = [
    { icon: <Hash className="w-4 h-4" />, label: 'Car Number', value: car.carNumber },
    { icon: <Snowflake className="w-4 h-4" />, label: 'AC', value: car.ac ? 'Yes' : 'No' },
    { icon: <Users className="w-4 h-4" />, label: 'Number of Owners', value: String(car.owners) },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: 'KM Driven',
      value: `${formatKm(car.kmFrom)} - ${formatKm(car.kmTo)} km`,
    },
    { icon: <Fuel className="w-4 h-4" />, label: 'Fuel Type', value: car.fuel },
    { icon: <Cog className="w-4 h-4" />, label: 'Transmission', value: car.transmission },
    { icon: <Calendar className="w-4 h-4" />, label: 'Year', value: String(car.year) },
  ];

  return (
    <div className="relative pt-28 sm:pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 text-xs text-neutral-500 mb-6"
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
        <span className="text-neutral-300">{car.name}</span>
      </motion.nav>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Gallery (7 cols) */}
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          {/* Main image */}
          <div className="relative h-72 sm:h-96 lg:h-[420px] rounded-2xl overflow-hidden glass-card group">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                src={car.images[activeImageIndex] || car.images[0]}
                alt={`${car.name} — view ${activeImageIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </AnimatePresence>

            {/* Grade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

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

            {/* Prev / Next */}
            {car.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImageIndex((p) => (p === 0 ? car.images.length - 1 : p - 1))
                  }
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all duration-300 opacity-75 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setActiveImageIndex((p) => (p === car.images.length - 1 ? 0 : p + 1))
                  }
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 transition-all duration-300 opacity-75 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-3 right-4 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md text-xs font-mono text-neutral-200 border border-white/10">
              {activeImageIndex + 1} / {car.images.length}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 mt-4 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {car.images.map((img, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25 }}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border transition-all duration-300 cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-white/70 shadow-[0_0_18px_rgba(255,255,255,0.15)]'
                    : 'border-white/10 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Info panel (5 cols) */}
        <motion.div
          initial={{ opacity: 0, x: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              {car.name}
            </h1>
            <span
              className={`mt-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${
                car.availability === 'Available'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                  : car.availability === 'Reserved'
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
                className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-white/[0.03] transition-colors duration-300"
              >
                <span className="flex items-center gap-3 text-sm text-neutral-400">
                  <span className="text-neutral-500">{spec.icon}</span>
                  {spec.label}
                </span>
                <span className="text-sm font-semibold text-white text-right">{spec.value}</span>
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
        <div className="inline-flex p-1 rounded-xl glass-panel mb-8">
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
                  <p className="text-sm text-neutral-300 leading-relaxed">
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
                        className="flex items-center gap-3 text-sm text-neutral-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0" />
                        {item}
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
                        className="flex items-center gap-3 text-sm text-neutral-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-neutral-500 shrink-0" />
                        {feat}
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
                      setActiveImageIndex(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="relative h-40 rounded-xl overflow-hidden border border-white/10 group cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`Gallery image ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
