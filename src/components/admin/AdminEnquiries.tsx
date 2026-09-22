import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Enquiry } from '../../types';
import { GlassSelect } from '../common/GlassSelect';
import {
  MessageSquare,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Inbox,
} from 'lucide-react';

interface AdminEnquiriesProps {
  enquiries: Enquiry[];
  onUpdateStatus: (enquiryId: string, newStatus: Enquiry['status']) => void;
  onDeleteEnquiry?: (enquiryId: string) => void;
}

export const AdminEnquiries: React.FC<AdminEnquiriesProps> = ({
  enquiries,
  onUpdateStatus,
  onDeleteEnquiry,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      e.customerName.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.carName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Client Enquiries &amp; Test Drives
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review and coordinate VIP client test drive appointments and pricing consultations.
        </p>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by patron name, phone number, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Status:
          </span>
          <GlassSelect
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter enquiries by status"
            className="px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-xs sm:text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
            options={[
              { value: 'all', label: `All Enquiries (${enquiries.length})` },
              { value: 'Pending', label: 'Pending' },
              { value: 'Contacted', label: 'Contacted' },
              { value: 'Scheduled Visit', label: 'Scheduled Visit' },
              { value: 'Closed', label: 'Closed' },
            ]}
          />
        </div>
      </div>

      {enquiries.length === 0 ? (
        /* Empty State — nothing fabricated */
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-2xl py-16 text-center max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/20 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-white mb-2">No Enquiries Yet</h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-2">
            Your inbox is clean — no sample enquiries, no seeded records. Real customer
            submissions from the public showroom appear here instantly.
          </p>
          <p className="text-xs text-neutral-500">
            Try the &ldquo;Contact Us&rdquo; button on the public site to file the first enquiry.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Selected hint for mobile/tablet users */}
          {selectedEnquiry && (
            <div className="lg:hidden p-3 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-neutral-200">
              Dossier for <strong>{selectedEnquiry.customerName}</strong> is shown below.
            </div>
          )}

          {/* Enquiries Grid & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table List (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-neutral-300">
                    {filteredEnquiries.map((enq, idx) => (
                      <motion.tr
                        key={enq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(idx * 0.05, 0.4),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onClick={() => setSelectedEnquiry(enq)}
                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                          selectedEnquiry?.id === enq.id ? 'bg-white/[0.05]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-white">{enq.customerName}</td>
                        <td className="py-3 px-4 font-mono text-neutral-200">{enq.phone}</td>
                        <td className="py-3 px-4 text-neutral-200">{enq.city || '—'}</td>
                        <td className="py-3 px-4 font-mono text-neutral-300">{enq.date}</td>
                        <td className="py-3 px-4">
                          <div onClick={(e) => e.stopPropagation()}>
                            <GlassSelect
                              value={enq.status}
                              onChange={(v) =>
                                onUpdateStatus(enq.id, v as Enquiry['status'])
                              }
                              ariaLabel={`Status for ${enq.customerName}`}
                              className="px-2.5 py-1 pr-8 rounded-lg text-xs font-semibold cursor-pointer border bg-black/60 text-left focus:outline-none border-white/20 text-neutral-200"
                              options={[
                                { value: 'Pending', label: 'Pending' },
                                { value: 'Contacted', label: 'Contacted' },
                                { value: 'Scheduled Visit', label: 'Scheduled Visit' },
                                { value: 'Closed', label: 'Closed' },
                              ]}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[11px] text-neutral-400 hover:underline">
                            View &rarr;
                          </span>
                          {onDeleteEnquiry && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEnquiry(enq.id);
                              }}
                              className="ml-3 text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredEnquiries.length === 0 && (
                <div className="py-10 text-center">
                  <MessageSquare className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">
                    No enquiries match your current search or status filter.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Enquiry Details Pane (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-neutral-900/60 backdrop-blur-2xl border border-white/15 p-5 shadow-2xl flex flex-col justify-between">
              {selectedEnquiry ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-300 font-serif">
                      Enquiry Dossier
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {selectedEnquiry.id}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-white">
                      {selectedEnquiry.customerName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <a href={`tel:${selectedEnquiry.phone}`} className="hover:text-white">
                        {selectedEnquiry.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{selectedEnquiry.city || '—'}</span>
                    </div>
                    {selectedEnquiry.email && (
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <a
                          href={`mailto:${selectedEnquiry.email}`}
                          className="hover:text-white"
                        >
                          {selectedEnquiry.email}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-black/50 border border-white/10">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">
                      Interested In
                    </span>
                    <span className="font-semibold text-white text-sm block">
                      {selectedEnquiry.carName}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Enquiry received {selectedEnquiry.date}
                    </span>
                  </div>

                  {selectedEnquiry.preferredDate && (
                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block">
                          Scheduled Date
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {selectedEnquiry.preferredDate}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold block mb-1.5">
                      Client Request Notes
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                      &ldquo;{selectedEnquiry.message}&rdquo;
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs text-neutral-400 block mb-1">Quick Action:</span>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${selectedEnquiry.phone}`}
                        className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-center text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                      >
                        Call Client
                      </a>
                      <button
                        onClick={() => onUpdateStatus(selectedEnquiry.id, 'Scheduled Visit')}
                        className="flex-1 py-2 rounded-xl bg-white text-black text-center text-xs font-bold hover:bg-neutral-200 transition-colors"
                      >
                        Book Visit
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400">
                  <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs">
                    Select an enquiry row to view complete client correspondence notes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
