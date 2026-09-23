import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AdminTab } from './AdminSidebar';
import { Enquiry } from '../../types';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  UserCog,
  Menu,
  Globe,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';

interface AdminNavbarProps {
  currentTab: AdminTab;
  pendingCount: number;
  adminUsername: string;
  onLogout: () => void;
  /** Open the mobile navigation drawer (sidebar becomes a drawer on <md). */
  onMenuClick: () => void;
  /** Pending enquiries — the real notification source. */
  pendingEnquiries: Enquiry[];
  /** Navigate to the Enquiries tab (optionally focused on one enquiry). */
  onViewEnquiries: () => void;
  /** Open Account Management for the signed-in admin. */
  onOpenAccount: () => void;
  /** SPA navigation back to the public website — no reload, session intact. */
  onBackToWebsite: () => void;
}

const SEEN_KEY = 'nrc-seen-enquiry-ids';

function readSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeenIds(ids: Set<string>) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — unread state simply won't persist in-session */
  }
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  currentTab,
  pendingCount,
  adminUsername,
  onLogout,
  onMenuClick,
  pendingEnquiries,
  onViewEnquiries,
  onOpenAccount,
  onBackToWebsite,
}) => {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  // Restore seen ids after mount (SSR-safe).
  useEffect(() => {
    setSeenIds(readSeenIds());
  }, []);

  // Outside click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = pendingEnquiries.filter((e) => !seenIds.has(e.id));
  const unreadCount = unread.length;

  const markAllSeen = () => {
    const next = new Set(seenIds);
    pendingEnquiries.forEach((e) => next.add(e.id));
    setSeenIds(next);
    persistSeenIds(next);
  };

  const handleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        // Opening the panel acknowledges the current list.
        const seen = readSeenIds();
        pendingEnquiries.forEach((e) => seen.add(e.id));
        setSeenIds(seen);
        persistSeenIds(seen);
      }
      return next;
    });
  };

  const openEnquiry = () => {
    setOpen(false);
    onViewEnquiries();
  };

  const tabTitles: Record<AdminTab, string> = {
    dashboard: 'Dashboard',
    cars: 'Manage Cars',
    'add-car': 'Add Car',
    enquiries: 'Enquiries',
    customers: 'Customers',
    trash: 'Trash',
    settings: 'Settings',
    account: 'Account Management',
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-3.5 bg-[#08090b]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile hamburger — opens the sidebar drawer */}
        <button
          onClick={onMenuClick}
          aria-label="Open admin navigation"
          className="md:hidden p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Search affordance */}
        <button
          aria-label="Search"
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
        <h2 className="font-serif text-base sm:text-lg font-semibold text-white tracking-wide truncate">
          {tabTitles[currentTab]}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Back to public website — SPA navigation, session untouched */}
        <button
          onClick={onBackToWebsite}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          title="Back to Website"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden lg:inline">View Website</span>
        </button>

        {/* Notifications — real pending enquiries */}
        <div className="relative" ref={wrapRef}>
          <button
            onClick={handleOpen}
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
            aria-expanded={open}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-bold text-[9px] flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="max-md:fixed max-md:left-2 max-md:right-2 max-md:top-16 max-md:w-auto absolute right-0 top-[calc(100%+10px)] w-[min(92vw,22rem)] rounded-2xl bg-[#0a0b0d]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden z-50 max-md:z-[70]"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-[10px] text-neutral-500">{unreadCount} new</span>
                    )}
                  </span>
                  {pendingEnquiries.length > 0 && (
                    <button
                      onClick={markAllSeen}
                      className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {pendingEnquiries.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                      <p className="text-xs text-neutral-500">No new enquiries.</p>
                    </div>
                  ) : (
                    pendingEnquiries.slice(0, 8).map((e) => (
                      <button
                        key={e.id}
                        onClick={openEnquiry}
                        className="w-full text-left px-4 py-3 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 p-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-white truncate max-md:whitespace-normal max-md:break-words">
                                {e.customerName}
                              </span>
                              {!seenIds.has(e.id) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-label="unread" />
                              )}
                            </span>
                            <span className="block text-[11px] text-neutral-400 truncate max-md:whitespace-normal max-md:break-words mt-0.5">
                              {e.carName}
                            </span>
                            <span className="block text-[10px] text-neutral-600 mt-0.5">
                              {e.city ? `${e.city} · ` : ''}{e.date}
                            </span>
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {pendingEnquiries.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/[0.07]">
                    <button
                      onClick={openEnquiry}
                      className="w-full text-center text-[11px] font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      View all enquiries
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin profile — click to open Account Management */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-3 group cursor-pointer"
            title="Account Management"
            aria-label="Open Account Management"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-500 flex items-center justify-center text-black font-bold text-xs shadow-md uppercase">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left text-xs">
              <span className="text-white font-semibold block capitalize group-hover:text-neutral-300 transition-colors">{adminUsername}</span>
              <span className="text-[10px] text-neutral-500">Account Management</span>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <ChevronDown className="w-4 h-4 text-neutral-600 hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
