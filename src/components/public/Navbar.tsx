import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useMotionValueEvent, AnimatePresence } from 'motion/react';
import { Logo } from '../common/Logo';
import { GlassButton } from '../common/GlassButton';
import { Menu, X, Search, ArrowRight } from 'lucide-react';

export type PublicRoute = 'home' | 'cars' | 'about' | 'contact' | 'admin';

interface NavbarProps {
  route: PublicRoute;
  onNavigate: (route: PublicRoute) => void;
  onOpenEnquiry: () => void;
  onSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ route, onNavigate, onOpenEnquiry, onSearch }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 35);
  });

  const navItems: { id: PublicRoute; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'cars', label: 'Cars' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <>
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neutral-500 via-white to-neutral-400 origin-left z-50 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        style={{ scaleX }}
      />

      {/* Floating glass header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <motion.div
          animate={{
            y: isScrolled ? 8 : 0,
            maxWidth: isScrolled ? '1200px' : '100%',
            paddingTop: isScrolled ? '10px' : '18px',
            paddingBottom: isScrolled ? '10px' : '18px',
            paddingLeft: isScrolled ? '24px' : '32px',
            paddingRight: isScrolled ? '24px' : '32px',
            borderRadius: isScrolled ? '18px' : '0px',
            backgroundColor: isScrolled ? 'rgba(7, 8, 9, 0.82)' : 'rgba(5, 6, 7, 0.35)',
            backdropFilter: isScrolled ? 'blur(24px)' : 'blur(6px)',
            borderColor: isScrolled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            boxShadow: isScrolled
              ? '0 18px 50px -10px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 0 0 rgba(0,0,0,0)',
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full mx-auto pointer-events-auto border transition-all duration-300 flex items-center justify-between gap-4"
        >
          <Logo size={isScrolled ? 'sm' : 'md'} onClick={() => onNavigate('home')} />

          {/* Desktop links with animated active underline */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10">
            {navItems.map((item) => {
              const isActive = route === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-1 text-[13px] font-medium tracking-wide transition-colors duration-300 cursor-pointer select-none ${
                    isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {item.label}
                  {/* Active indicator — thin silver line that slides between items */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-line"
                      className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Search + Enquire Now */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onSearch}
              aria-label="Search cars"
              className="p-2.5 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/10 hover:border-white/30 text-neutral-300 hover:text-white transition-all duration-300 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            <GlassButton variant="secondary" size="md" onClick={onOpenEnquiry} icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
              Enquire Now
            </GlassButton>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white relative z-50"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <motion.span animate={{ rotate: mobileMenuOpen ? 90 : 0 }} className="block">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.span>
          </button>
        </motion.div>
      </header>

      {/* Mobile glass dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              aria-label="Close navigation menu"
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[72px] left-4 right-4 z-40 p-4 rounded-2xl glass-modal md:hidden flex flex-col gap-2.5"
            >
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + index * 0.05 }}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    route === item.id
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </motion.button>
              ))}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <GlassButton
                  variant="gold"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    onOpenEnquiry();
                    setMobileMenuOpen(false);
                  }}
                >
                  Enquire Now
                </GlassButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
