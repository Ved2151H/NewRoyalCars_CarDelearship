import React from 'react';
import { motion } from 'motion/react';
import { Car, Enquiry } from '../../types';
import { StatCard } from './StatCard';
import { AdminTab } from './AdminSidebar';
import {
  Car as CarIcon,
  CheckCircle2,
  XCircle,
  Wind,
  Fan,
  MessageSquare,
  ArrowRight,
  Plus,
  Inbox,
} from 'lucide-react';

interface AdminDashboardProps {
  cars: Car[];
  enquiries: Enquiry[];
  onNavigateTab: (tab: AdminTab) => void;
  onViewCar: (car: Car) => void;
}

/** Animated monochrome donut showing available vs unavailable. */
const DonutChart: React.FC<{ available: number; total: number }> = ({ available, total }) => {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        {/* Value arc */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#donutGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        <defs>
          <linearGradient id="donutGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8b9298" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-semibold text-white">{pct}%</span>
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">Available</span>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  cars,
  enquiries,
  onNavigateTab,
  onViewCar,
}) => {
  // All metrics computed from real state — zero fabricated numbers.
  const availableCount = cars.filter((c) => c.availability === 'Available').length;
  const soldCount = cars.filter((c) => c.availability === 'Sold' || c.availability === 'Reserved').length;
  const acCount = cars.filter((c) => c.ac).length;
  const nonAcCount = cars.filter((c) => !c.ac).length;

  const pendingCount = enquiries.filter((e) => e.status === 'Pending').length;
  const recentEnquiries = enquiries.slice(0, 5);

  const statusPill = (status: Enquiry['status']) => {
    // Monochrome status pills per reference
    if (status === 'Pending') return 'bg-white/[0.06] text-neutral-300 border-white/15';
    if (status === 'Contacted') return 'bg-white/[0.1] text-white border-white/25';
    if (status === 'Scheduled Visit') return 'bg-white/20 text-white border-white/35';
    return 'bg-transparent text-neutral-500 border-white/10';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Welcome back. Here's an overview of your business.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl glass-panel text-xs text-neutral-300 font-medium flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={() => onNavigateTab('add-car')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-silver text-xs font-bold tracking-wide cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Car</span>
          </button>
        </div>
      </div>

      {/* 6 Stat tiles — reference layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Cars" value={cars.length} icon={<CarIcon className="w-5 h-5" />} delay={0} />
        <StatCard label="Available" value={availableCount} icon={<CheckCircle2 className="w-5 h-5" />} delay={80} />
        <StatCard label="Sold / Unavailable" value={soldCount} icon={<XCircle className="w-5 h-5" />} delay={160} />
        <StatCard label="AC Cars" value={acCount} icon={<Wind className="w-5 h-5" />} delay={240} />
        <StatCard label="Non-AC Cars" value={nonAcCount} icon={<Fan className="w-5 h-5" />} delay={320} />
        <StatCard label="Total Enquiries" value={enquiries.length} icon={<MessageSquare className="w-5 h-5" />} delay={400} />
      </div>

      {/* Donut + Recent Enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Car Availability donut */}
        <div className="lg:col-span-4 p-6 rounded-2xl glass-card">
          <h3 className="text-sm font-semibold text-white mb-6">Car Availability</h3>

          {cars.length > 0 ? (
            <>
              <DonutChart available={availableCount} total={cars.length} />
              <div className="mt-6 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Available ({availableCount})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-neutral-500">
                    <span className="w-2 h-2 rounded-full bg-white/20" />
                    Unavailable ({cars.length - availableCount})
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <CarIcon className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No vehicles yet.</p>
              <p className="text-xs text-neutral-500 mt-1">Add cars to see availability.</p>
            </div>
          )}
        </div>

        {/* Recent Enquiries table */}
        <div className="lg:col-span-8 p-6 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Recent Enquiries</h3>
            {enquiries.length > 0 && (
              <button
                onClick={() => onNavigateTab('enquiries')}
                className="text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentEnquiries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Car</th>
                    <th className="py-2.5 px-3">AC</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-neutral-300">
                  {recentEnquiries.map((enq, idx) => (
                    <motion.tr
                      key={enq.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.06 }}
                      className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-white whitespace-nowrap">
                        {enq.customerName}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{enq.carName}</td>
                      <td className="py-3 px-3">{enq.acRequired ? 'Yes' : 'No'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${statusPill(enq.status)}`}>
                          {enq.status === 'Pending' ? 'New' : enq.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(enq.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center">
              <Inbox className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No enquiries yet.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Customer leads from the public site appear here in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
