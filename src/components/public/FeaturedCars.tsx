import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Car } from '../../types';
import { CarCard } from './CarCard';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface FeaturedCarsProps {
  cars: Car[];
  favorites: Set<string>;
  onToggleFavorite: (carId: string) => void;
  onViewDetails: (car: Car) => void;
  onViewAll: () => void;
}

export const FeaturedCars: React.FC<FeaturedCarsProps> = ({
  cars,
  favorites,
  onToggleFavorite,
  onViewDetails,
  onViewAll,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 460;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const featured = cars.slice(0, 8);

  if (featured.length === 0) return null;

  return (
    <section id="featured" className="luxury-section-surface relative py-20 overflow-hidden">
      {/* Ghost word */}
      <span className="ghost-word left-[-2%] bottom-[-2%] text-[18vw] hidden lg:block" aria-hidden>
        FLEET
      </span>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -30, filter: 'blur(6px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] tracking-label uppercase text-neutral-500 mb-3">
              Featured Cars
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Explore Our <span className="silver-gradient-text italic">Collection</span>
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Find the perfect car for your next journey
            </p>
          </motion.div>

          {/* View All + arrows */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-outline text-xs font-semibold text-neutral-200 hover:text-white cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('left')}
              className="p-2.5 rounded-xl btn-outline text-neutral-300 hover:text-white cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-2.5 rounded-xl btn-outline text-neutral-300 hover:text-white cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Horizontal snap carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featured.map((car, idx) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: Math.min(idx * 0.08, 0.4), ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 w-[280px] sm:w-[320px] snap-start"
            >
              <CarCard
                car={car}
                index={idx}
                isFavorite={favorites.has(car.id)}
                onToggleFavorite={onToggleFavorite}
                onViewDetails={onViewDetails}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
