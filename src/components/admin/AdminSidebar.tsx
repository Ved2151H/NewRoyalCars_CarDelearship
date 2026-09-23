import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  Car,
  PlusCircle,
  MessageSquare,
  Users,
  Settings,
  Trash2,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  X,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'cars' | 'add-car' | 'enquiries' | 'customers' | 'settings' | 'trash' | 'account';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingEnquiriesCount: number;
  /** SPA navigation to the public website — no reload, session intact. */
  onBackToWebsite?: () => void;
  /** Controlled mobile-drawer open state (owned by App so the navbar hamburger can open it). */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  pendingEnquiriesCount,
  onBackToWebsite,
  mobileOpen,
  onMobileOpenChange,
}) => {
  const menuItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cars' as AdminTab, label: 'Manage Cars', icon: Car },
    { id: 'add-car' as AdminTab, label: 'Add Car', icon: PlusCircle },
    {
      id: 'enquiries' as AdminTab,
      label: 'Enquiries',
      icon: MessageSquare,
      badge: pendingEnquiriesCount > 0 ? pendingEnquiriesCount : undefined,
    },
    { id: 'customers' as AdminTab, label: 'Customers', icon: Users },
    { id: 'trash' as AdminTab, label: 'Trash', icon: Trash2 },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
    { id: 'account' as AdminTab, label: 'Account Management', icon: UserCog },
  ];

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresenceDrawer
        open={mobileOpen}
        onClose={() => onMobileOpenChange(false)}
      >
        <MobileNavContent
          menuItems={menuItems}
          currentTab={currentTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
          onClose={() => onMobileOpenChange(false)}
          onBackToWebsite={onBackToWebsite}
        />
      </AnimatePresenceDrawer>

      {/* Desktop / tablet sidebar */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#08090b]/85 backdrop-blur-2xl border-r border-white/[0.07] shadow-2xl ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        {/* Header */}
        <div>
          <div className={`p-5 border-b border-white/[0.06] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed ? (
              <Logo size="sm" />
            ) : (
              <div className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-white">
                <LayoutDashboard className="w-4 h-4" />
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="flex justify-center pt-3">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nav */}
          <nav className="p-3 space-y-1.5 mt-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer group relative ${
                    isActive
                      ? 'bg-white/[0.07] text-white border border-white/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Active left accent */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                  {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout + Back to website */}
        <div className="p-3 border-t border-white/[0.06] space-y-1">
          {onBackToWebsite && (
            <button
              onClick={onBackToWebsite}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="View Website"
            >
              <Globe className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>View Website</span>}
            </button>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

/** Full-screen mobile drawer with slide animation. */
const AnimatePresenceDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close admin navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#08090b]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MobileNavContent: React.FC<{
  menuItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[];
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  onClose: () => void;
  onBackToWebsite?: () => void;
}> = ({ menuItems, currentTab, onTabChange, onLogout, onClose, onBackToWebsite }) => {
  return (
    <>
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="p-3 space-y-1.5 mt-2 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer relative ${
                isActive
                  ? 'bg-white/[0.07] text-white border border-white/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-white rounded-r-full" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        {onBackToWebsite && (
          <button
            onClick={onBackToWebsite}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Back to Website</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
};
