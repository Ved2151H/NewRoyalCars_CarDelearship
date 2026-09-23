import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Trash2,
  Car,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Search,
  Clock,
} from 'lucide-react';
import { GlassButton } from '../common/GlassButton';
import { ConfirmationModal } from './ConfirmationModal';
import {
  getDeletedCarsAction,
  getDeletedEnquiriesAction,
  restoreCarAction,
  restoreEnquiryAction,
  purgeCarAction,
  purgeEnquiryAction,
} from '../../lib/actions/trash';
import { TRASH_RETENTION_DAYS, type DeletedCarItem, type DeletedEnquiryItem } from '../../lib/trash';

type TrashSection = 'cars' | 'enquiries';

/** Days remaining until permanent deletion (server timestamps, day-rounded). */
function daysRemaining(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RetentionBadge({ expiresAt }: { expiresAt: string }) {
  const days = daysRemaining(expiresAt);
  return days <= 0 ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
      <Clock className="w-3 h-3" />
      Expired — pending cleanup
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-neutral-300 border border-white/10">
      <Clock className="w-3 h-3" />
      {days} day{days === 1 ? '' : 's'} remaining
    </span>
  );
}

export const AdminTrash: React.FC = () => {
  const [section, setSection] = useState<TrashSection>('cars');
  const [deletedCars, setDeletedCars] = useState<DeletedCarItem[]>([]);
  const [deletedEnquiries, setDeletedEnquiries] = useState<DeletedEnquiryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Confirmation state — cars and enquiries are confirmed separately.
  const [purgeCarTarget, setPurgeCarTarget] = useState<DeletedCarItem | null>(null);
  const [purgeEnquiryTarget, setPurgeEnquiryTarget] = useState<DeletedEnquiryItem | null>(null);

  const loadCars = useCallback(async (q: string) => {
    const res = await getDeletedCarsAction(q || undefined);
    if (res.ok && res.data) setDeletedCars(res.data);
    else setError(res.ok ? 'Could not load deleted cars.' : res.error);
  }, []);

  const loadEnquiries = useCallback(async (q: string) => {
    const res = await getDeletedEnquiriesAction(q || undefined);
    if (res.ok && res.data) setDeletedEnquiries(res.data);
    else setError(res.ok ? 'Could not load deleted enquiries.' : res.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const t = setTimeout(() => {
      (section === 'cars' ? loadCars(search) : loadEnquiries(search)).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [section, search, loadCars, loadEnquiries]);

  const handleRestoreCar = async (item: DeletedCarItem) => {
    setBusyId(item.id);
    const res = await restoreCarAction(item.id);
    setBusyId(null);
    if (res.ok) setDeletedCars((prev) => prev.filter((c) => c.id !== item.id));
    else setError(res.error || 'Restore failed.');
  };

  const handleRestoreEnquiry = async (item: DeletedEnquiryItem) => {
    setBusyId(item.id);
    const res = await restoreEnquiryAction(item.id);
    setBusyId(null);
    if (res.ok) setDeletedEnquiries((prev) => prev.filter((e) => e.id !== item.id));
    else setError(res.error || 'Restore failed.');
  };

  const handlePurgeCar = async () => {
    if (!purgeCarTarget) return;
    setBusyId(purgeCarTarget.id);
    const res = await purgeCarAction(purgeCarTarget.id);
    setBusyId(null);
    if (res.ok) setDeletedCars((prev) => prev.filter((c) => c.id !== purgeCarTarget.id));
    else setError(res.error || 'Permanent delete failed.');
    setPurgeCarTarget(null);
  };

  const handlePurgeEnquiry = async () => {
    if (!purgeEnquiryTarget) return;
    setBusyId(purgeEnquiryTarget.id);
    const res = await purgeEnquiryAction(purgeEnquiryTarget.id);
    setBusyId(null);
    if (res.ok)
      setDeletedEnquiries((prev) => prev.filter((e) => e.id !== purgeEnquiryTarget.id));
    else setError(res.error || 'Permanent delete failed.');
    setPurgeEnquiryTarget(null);
  };

  const sections: { id: TrashSection; label: string; icon: React.FC<{ className?: string }>; count: number }[] = useMemo(
    () => [
      { id: 'cars', label: 'Deleted Cars', icon: Car, count: deletedCars.length },
      { id: 'enquiries', label: 'Deleted Enquiries', icon: MessageSquare, count: deletedEnquiries.length },
    ],
    [deletedCars.length, deletedEnquiries.length]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">Trash</h1>
          <p className="text-xs text-neutral-500">
            Deleted items are kept for {TRASH_RETENTION_DAYS} days, then permanently removed.
          </p>
        </div>
      </div>

      {/* Section tabs — separate Deleted Cars / Deleted Enquiries */}
      <div className="flex gap-2 flex-wrap">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer border ${
                active
                  ? 'bg-white/[0.08] text-white border-white/15'
                  : 'bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.05] border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
              {s.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            section === 'cars' ? 'Search by car name or RC number…' : 'Search by customer name or phone…'
          }
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-white/40"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500">Loading trash…</div>
      ) : section === 'cars' ? (
        <div className="space-y-3">
          {deletedCars.length === 0 ? (
            <div className="py-12 text-center">
              <Car className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No deleted cars. The trash is empty.</p>
            </div>
          ) : (
            deletedCars.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Image */}
                <div className="w-full sm:w-28 h-28 sm:h-20 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700">
                      <Car className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {item.carNumber} · ₹{item.price.toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] text-neutral-600">
                      Deleted: {formatDate(item.deletedAt)}
                    </span>
                    <RetentionBadge expiresAt={item.expiresAt} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => handleRestoreCar(item)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </GlassButton>
                  <GlassButton
                    variant="danger"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => setPurgeCarTarget(item)}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Delete Permanently
                  </GlassButton>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {deletedEnquiries.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No deleted enquiries. The trash is empty.</p>
            </div>
          ) : (
            deletedEnquiries.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-400 shrink-0 self-start">
                  <MessageSquare className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{item.customerName}</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {item.phone}
                    {item.city ? ` · ${item.city}` : ''}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{item.carName}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] text-neutral-600">
                      Deleted: {formatDate(item.deletedAt)}
                    </span>
                    <RetentionBadge expiresAt={item.expiresAt} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => handleRestoreEnquiry(item)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </GlassButton>
                  <GlassButton
                    variant="danger"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => setPurgeEnquiryTarget(item)}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Delete Permanently
                  </GlassButton>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation — permanent car delete */}
      <ConfirmationModal
        isOpen={Boolean(purgeCarTarget)}
        onClose={() => setPurgeCarTarget(null)}
        onConfirm={handlePurgeCar}
        title="Permanently Delete Car"
        confirmLabel="Delete Permanently"
        message={
          purgeCarTarget
            ? `Are you sure you want to permanently delete this car?\n\n${purgeCarTarget.name} (${purgeCarTarget.carNumber})\n\nThis action cannot be undone. Its photos will also be removed from storage.`
            : ''
        }
      />

      {/* Confirmation — permanent enquiry delete */}
      <ConfirmationModal
        isOpen={Boolean(purgeEnquiryTarget)}
        onClose={() => setPurgeEnquiryTarget(null)}
        onConfirm={handlePurgeEnquiry}
        title="Permanently Delete Enquiry"
        confirmLabel="Delete Permanently"
        message={
          purgeEnquiryTarget
            ? `Are you sure you want to permanently delete this enquiry?\n\n${purgeEnquiryTarget.customerName} (${purgeEnquiryTarget.phone})\n\nThis action cannot be undone.`
            : ''
        }
      />
    </motion.div>
  );
};
