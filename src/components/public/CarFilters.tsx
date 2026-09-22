import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FilterState } from '../../types';
import { GlassSelect } from '../common/GlassSelect';
import { Search, X, RotateCcw } from 'lucide-react';

interface CarFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  brands: string[];
  totalResults: number;
}

const selectClass =
  'w-full appearance-none px-4 py-3 pr-10 rounded-xl glass-panel text-sm text-left text-neutral-200 focus:outline-none focus:border-white/30 cursor-pointer transition-all duration-300 hover:border-white/20';

export const CarFilters: React.FC<CarFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  brands,
  totalResults,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full mb-10">
      {/* Search — always available, primary row on mobile */}
      <div className="relative mb-4 sm:hidden">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search cars..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          className="w-full pl-10 pr-4 py-3 rounded-xl glass-panel text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/30 transition-colors"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onFilterChange({ searchQuery: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reference row: 4 glass dropdowns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* All Brands */}
        <GlassSelect
          value={filters.brand}
          onChange={(brand) => onFilterChange({ brand })}
          className={selectClass}
          ariaLabel="Filter by brand"
          options={[
            { value: 'all', label: 'All Brands' },
            ...brands.map((b) => ({ value: b, label: b })),
          ]}
        />

        {/* AC / Non-AC */}
        <GlassSelect
          value={filters.ac}
          onChange={(ac) => onFilterChange({ ac: ac as FilterState['ac'] })}
          className={selectClass}
          ariaLabel="Filter by air conditioning"
          options={[
            { value: 'all', label: 'AC / Non-AC' },
            { value: 'ac', label: 'AC' },
            { value: 'non-ac', label: 'Non-AC' },
          ]}
        />

        {/* Price Range */}
        <GlassSelect
          value={`${filters.maxPrice}`}
          onChange={(v) => onFilterChange({ maxPrice: Number(v) })}
          className={selectClass}
          ariaLabel="Filter by price range"
          options={[
            { value: '25000000', label: 'Price Range' },
            { value: '500000', label: 'Under ₹5 Lakh' },
            { value: '1000000', label: 'Under ₹10 Lakh' },
            { value: '2000000', label: 'Under ₹20 Lakh' },
            { value: '3500000', label: 'Under ₹35 Lakh' },
            { value: '5000000', label: 'Under ₹50 Lakh' },
          ]}
        />

        {/* Sort By */}
        <GlassSelect
          value={filters.sortBy}
          onChange={(sortBy) => onFilterChange({ sortBy: sortBy as FilterState['sortBy'] })}
          className={selectClass}
          ariaLabel="Sort cars"
          options={[
            { value: 'featured', label: 'Sort By' },
            { value: 'price-low', label: 'Price: Low to High' },
            { value: 'price-high', label: 'Price: High to Low' },
            { value: 'km-low', label: 'KM: Lowest First' },
            { value: 'year-new', label: 'Year: Newest First' },
          ]}
        />
      </div>

      {/* Advanced drawer toggle */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-neutral-500">
          Showing <strong className="text-neutral-300">{totalResults}</strong>{' '}
          {totalResults === 1 ? 'car' : 'cars'}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {expanded ? 'Hide' : 'More'} filters
          </button>
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Expandable advanced drawer: fuel, transmission, km */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 rounded-2xl glass-panel grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Fuel */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Fuel Type
                </label>
                <GlassSelect
                  value={filters.fuel}
                  onChange={(fuel) => onFilterChange({ fuel })}
                  className={selectClass}
                  ariaLabel="Filter by fuel type"
                  options={[
                    { value: 'all', label: 'All Fuels' },
                    { value: 'Petrol', label: 'Petrol' },
                    { value: 'Diesel', label: 'Diesel' },
                    { value: 'CNG', label: 'CNG' },
                    { value: 'Electric', label: 'Electric' },
                    { value: 'Hybrid', label: 'Hybrid' },
                  ]}
                />
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Transmission
                </label>
                <GlassSelect
                  value={filters.transmission}
                  onChange={(transmission) => onFilterChange({ transmission })}
                  className={selectClass}
                  ariaLabel="Filter by transmission"
                  options={[
                    { value: 'all', label: 'All Transmissions' },
                    { value: 'Manual', label: 'Manual' },
                    { value: 'Automatic', label: 'Automatic' },
                  ]}
                />
              </div>

              {/* Max KM */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    KM Driven
                  </label>
                  <span className="text-xs font-mono text-neutral-300">
                    Up to {(filters.maxKm / 1000).toFixed(0)}k km
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="5000"
                  value={filters.maxKm}
                  onChange={(e) => onFilterChange({ maxKm: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
