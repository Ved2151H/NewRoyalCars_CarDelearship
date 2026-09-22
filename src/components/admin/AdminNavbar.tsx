import React from 'react';
import { AdminTab } from './AdminSidebar';
import { Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';

interface AdminNavbarProps {
  currentTab: AdminTab;
  pendingCount: number;
  adminUsername: string;
  onLogout: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  currentTab,
  pendingCount,
  adminUsername,
  onLogout,
}) => {
  const tabTitles: Record<AdminTab, string> = {
    dashboard: 'Dashboard',
    cars: 'Manage Cars',
    'add-car': 'Add Car',
    enquiries: 'Enquiries',
    customers: 'Customers',
    settings: 'Settings',
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-3.5 bg-[#08090b]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1">
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
        {/* Notifications */}
        <div className="relative p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
          <Bell className="w-4 h-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-bold text-[9px] flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>

        {/* Admin profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-500 flex items-center justify-center text-black font-bold text-xs shadow-md uppercase">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left text-xs">
            <span className="text-white font-semibold block capitalize">{adminUsername}</span>
            <span className="text-[10px] text-neutral-500">admin@newroyalcars.com</span>
          </div>
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
