import React from 'react';
import { motion } from 'motion/react';
import { Car, FilterState } from '../../types';
import { CarCard } from './CarCard';
import { CarFilters } from './CarFilters';
import { Car as CarIcon } from 'lucide-react';

interface CarsPageProps {
  cars: Car[];
  totalCars: number;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  brands: string[];
  favorites: Set<string>;
  onToggleFavorite: (carId: string) => void;
  onViewDetails: (car: Car) => void;
}

const BANNER_IMAGE =
  'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80';

export const CarsPage: React.FC<CarsPageProps> = ({
  cars,
  totalCars,
  filters,
  onFilterChange,
  onResetFilters,
  brands,
  favorites,
  onToggleFavorite,
  onViewDetails,
}) => {
  return (
    <div className="relative pt-28 sm:pt-32 pb-20">
      {/* Banner strip with car image */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={BANNER_IMAGE}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-center opacity-25 grayscale brightness-[0.6]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050607]/60 via-[#050607]/80 to-[#050607]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050607] via-transparent to-[#050607]/80" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] tracking-label uppercase text-neutral-500 mb-3">Cars</p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight">
              Our <span className="silver-gradient-text italic">Cars</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-neutral-400 max-w-xl">
              Discover quality pre-owned cars, carefully selected for you.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <CarFilters
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            brands={brands}
            totalResults={cars.length}
          />
        </motion.div>

        {/* Grid: 4 / 2 / 1 */}
        {cars.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
            {cars.map((car, idx) => (
              <CarCard
                key={car.id}
                car={car}
                index={idx}
                isFavorite={favorites.has(car.id)}
                onToggleFavorite={onToggleFavorite}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="py-20 text-center rounded-3xl glass-panel max-w-lg mx-auto p-10"
          >
            <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center mx-auto mb-4">
              <CarIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-white mb-2">
              {totalCars === 0 ? 'Dealership Opening Soon' : 'No Matching Cars'}
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              {totalCars === 0
                ? 'Our inventory is being curated right now. Check back shortly — only real cars are listed here.'
                : 'No cars match your current filters. Try broadening your search.'}
            </p>
            {totalCars > 0 && (
              <button
                onClick={onResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-silver text-xs font-semibold tracking-wide cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
