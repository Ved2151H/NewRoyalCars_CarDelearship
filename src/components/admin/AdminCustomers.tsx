import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Enquiry } from '../../types';
import { GlassSelect } from '../common/GlassSelect';
import { Search, UserCheck, Phone, Mail, MessageSquare } from 'lucide-react';

interface AdminCustomersProps {
  /** Customers are derived live from real enquiry submissions — no dummy records. */
  enquiries: Enquiry[];
}

interface DerivedCustomer {
  key: string;
  name: string;
  phone: string;
  email: string;
  interestedCar: string;
  totalEnquiries: number;
  lastActive: string;
  status: 'High Intent' | 'Warm' | 'Purchased' | 'Browsing';
}

const formatRelativeDay = (dateStr: string): string => {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return dateStr;
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

export const AdminCustomers: React.FC<AdminCustomersProps> = ({ enquiries }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Group real enquiries into customer profiles — derived entirely from submitted data.
  const derivedCustomers = useMemo<DerivedCustomer[]>(() => {
    const byKey = new Map<string, DerivedCustomer>();

    for (const enq of enquiries) {
      const key = `${enq.customerName.trim().toLowerCase()}|${enq.phone.replace(/\s+/g, '')}`;
      const existing = byKey.get(key);

      if (existing) {
        existing.totalEnquiries += 1;
        if (enq.status === 'Closed') existing.status = 'Purchased';
        else if (enq.status === 'Scheduled Visit' && existing.status !== 'Purchased')
          existing.status = 'High Intent';
      } else {
        const status: DerivedCustomer['status'] =
          enq.status === 'Closed'
            ? 'Purchased'
            : enq.status === 'Scheduled Visit'
            ? 'High Intent'
            : enq.status === 'Contacted'
            ? 'Warm'
            : 'Browsing';
        byKey.set(key, {
          key,
          name: enq.customerName,
          phone: enq.phone,
          email: enq.email,
          interestedCar: enq.carName,
          totalEnquiries: 1,
          lastActive: enq.date,
          status,
        });
      }
    }

    return Array.from(byKey.values()).sort((a, b) => b.lastActive.localeCompare(a.lastActive));
  }, [enquiries]);

  const filteredCustomers = derivedCustomers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.interestedCar.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Patron &amp; Customer Registry
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Customer profiles built live from enquiry submissions — every record here is a real lead.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, phone, interested model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Intent:
          </span>
          <GlassSelect
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter customers by intent"
            className="px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-xs sm:text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
            options={[
              { value: 'all', label: `All Profiles (${derivedCustomers.length})` },
              { value: 'High Intent', label: 'High Intent' },
              { value: 'Warm', label: 'Warm' },
              { value: 'Purchased', label: 'Purchased' },
              { value: 'Browsing', label: 'Browsing' },
            ]}
          />
        </div>
      </div>

      {/* Customer Glass Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust, idx) => (
            <motion.div
              key={cust.key}
              initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.5,
                delay: Math.min(idx * 0.06, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
              className="p-5 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      cust.status === 'Purchased'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : cust.status === 'High Intent'
                        ? 'bg-white/10 text-neutral-300 border-white/25'
                        : cust.status === 'Warm'
                        ? 'bg-white/[0.06] text-neutral-300 border-white/15'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {cust.status}
                  </span>
                  <UserCheck className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                </div>

                <h3 className="font-serif text-lg font-bold text-white group-hover:text-white transition-colors">
                  {cust.name}
                </h3>

                <div className="space-y-1.5 mt-3 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <a href={`tel:${cust.phone}`} className="hover:text-white transition-colors">
                      {cust.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                </div>

                <div className="mt-4 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-0.5">
                    Interested Model
                  </span>
                  <span className="font-semibold text-neutral-200">{cust.interestedCar}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                <span>
                  {cust.totalEnquiries} Enquiry{cust.totalEnquiries === 1 ? '' : 'ies'} logged
                </span>
                <span className="font-mono">Active {formatRelativeDay(cust.lastActive)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State — no dummy data */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="py-20 text-center rounded-3xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 max-w-lg mx-auto p-10 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/20 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-white mb-2">No Customers Yet</h3>
          <p className="text-sm text-neutral-400 mb-2">
            Your patron registry is empty. Customer profiles appear here automatically as enquiries
            arrive through the public showroom.
          </p>
          <p className="text-xs text-neutral-500 flex items-center justify-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Submit an enquiry from the public site to see the first profile.
          </p>
        </motion.div>
      )}
    </div>
  );
};
