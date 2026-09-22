import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, CarAvailability } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';
import { GlassButton } from '../common/GlassButton';
import { GlassSelect } from '../common/GlassSelect';
import { formatKm } from '../../lib/utils';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Car as CarIcon,
} from 'lucide-react';

interface AdminManageCarsProps {
  cars: Car[];
  onAddNewCar: () => void;
  onEditCar: (car: Car) => void;
  onViewCar: (car: Car) => void;
  onDeleteCar: (carId: string) => void;
  onUpdateAvailability: (carId: string, availability: CarAvailability) => void;
}

export const AdminManageCars: React.FC<AdminManageCarsProps> = ({
  cars,
  onAddNewCar,
  onEditCar,
  onViewCar,
  onDeleteCar,
  onUpdateAvailability,
}) => {
  const [search, setSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);

  const filteredCars = cars.filter((car) => {
    const matchesSearch =
      car.name.toLowerCase().includes(search.toLowerCase()) ||
      car.carNumber.toLowerCase().includes(search.toLowerCase()) ||
      car.model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterAvailability === 'all' || car.availability === filterAvailability;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteCar(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Manage Fleet Inventory
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {cars.length === 0
              ? 'No vehicles registered in the dealership registry yet.'
              : `Total of ${cars.length} vehicle${cars.length === 1 ? '' : 's'} registered in dealership registry.`}
          </p>
        </div>

        <GlassButton
          variant="gold"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={onAddNewCar}
        >
          Add New Vehicle
        </GlassButton>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by car name, RC number (e.g. MH20AB1234)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Status:
          </span>
          <GlassSelect
            value={filterAvailability}
            onChange={setFilterAvailability}
            ariaLabel="Filter by availability status"
            className="px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-xs sm:text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
            options={[
              { value: 'all', label: `All Statuses (${cars.length})` },
              { value: 'Available', label: 'Available' },
              { value: 'Reserved', label: 'Reserved' },
              { value: 'Sold', label: 'Sold' },
            ]}
          />
        </div>
      </div>

      {/* Cars Glass Table / Empty State */}
      {cars.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-2xl py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/20 flex items-center justify-center mx-auto mb-4">
            <CarIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-white mb-2">The Fleet Awaits</h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
            Your showroom is completely empty — no dummy vehicles, no sample data. Add your first
            real vehicle and it will appear instantly on the public site.
          </p>
          <GlassButton
            variant="gold"
            size="md"
            glow
            icon={<Plus className="w-4 h-4" />}
            onClick={onAddNewCar}
          >
            Add First Vehicle
          </GlassButton>
        </motion.div>
      ) : (
        <div className="rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">RC Number</th>
                  <th className="py-3.5 px-4">AC Status</th>
                  <th className="py-3.5 px-4">KM Driven</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Availability Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-neutral-300">
                {filteredCars.map((car, idx) => (
                  <motion.tr
                    key={car.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: Math.min(idx * 0.05, 0.4),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Car Image + Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={car.images[0]}
                          alt={car.name}
                          className="w-14 h-11 object-cover rounded-lg border border-white/10 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white group-hover:text-white transition-colors text-sm">
                            {car.name}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {car.year} &middot; {car.fuel} &middot; {car.transmission}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* RC */}
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-200">
                      {car.carNumber}
                    </td>

                    {/* AC */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border ${
                          car.ac
                            ? 'bg-white/[0.08] text-neutral-300 border-white/20'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {car.ac ? 'Dual AC' : 'Non-AC'}
                      </span>
                    </td>

                    {/* KM */}
                    <td className="py-3 px-4 font-mono text-neutral-300">
                      {formatKm(car.kmFrom)} - {formatKm(car.kmTo)} km
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-serif font-bold text-neutral-300 text-sm">
                      {car.formattedPrice}
                    </td>

                    {/* Change Availability Dropdown */}
                    <td className="py-3 px-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <GlassSelect
                          value={car.availability}
                          onChange={(v) =>
                            onUpdateAvailability(car.id, v as CarAvailability)
                          }
                          ariaLabel={`Availability for ${car.name}`}
                          className={`px-2.5 py-1 pr-8 rounded-lg text-xs font-semibold cursor-pointer border text-left focus:outline-none transition-colors ${
                            car.availability === 'Available'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : car.availability === 'Reserved'
                              ? 'bg-white/[0.08] text-neutral-300 border-white/25'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          }`}
                          options={[
                            { value: 'Available', label: 'Available' },
                            { value: 'Reserved', label: 'Reserved' },
                            { value: 'Sold', label: 'Sold' },
                          ]}
                        />
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewCar(car)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="View car details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditCar(car)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit car details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(car)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-300 transition-colors cursor-pointer"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCars.length === 0 && (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">
                No vehicles match your current search or status filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Vehicle Deletion"
        message={`Are you sure you want to remove ${deleteTarget?.name} (${deleteTarget?.carNumber}) from the dealership showcase? This will immediately remove it from public view.`}
      />
    </div>
  );
};
