import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassButton } from '../common/GlassButton';
import { Logo } from '../common/Logo';
import { loginAction } from '@/lib/actions/auth';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToSite: () => void;
  adminEmail: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToSite, adminEmail }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both admin ID and password.');
      setShakeKey((k) => k + 1);
      return;
    }

    setError(null);
    setIsAuthenticating(true);

    try {
      const res = await loginAction(
        // The demo credential is the admin email — accept both the bare label
        // "admin" and the full email for convenience.
        (() => {
          const fd = new FormData();
          const email = username.trim().toLowerCase() === 'admin' ? adminEmail : username.trim();
          fd.set('email', email);
          fd.set('password', password);
          return fd;
        })()
      );

      if (res.ok) {
        setIsAuthenticating(false);
        setIsSuccess(true);
        setTimeout(onSuccess, 900);
      } else {
        setIsAuthenticating(false);
        setError(res.error || 'Invalid credentials. Access denied.');
        setShakeKey((k) => k + 1);
        setPassword('');
      }
    } catch {
      setIsAuthenticating(false);
      setError('Sign-in failed. Please check your connection and try again.');
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <motion.div
      key={shakeKey}
      animate={shakeKey > 0 ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="relative rounded-3xl glass-modal p-8 sm:p-10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
    >
      {/* Ambient white aura */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-white/[0.05] blur-[100px] pointer-events-none" />
      <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Success overlay */}
      <motion.div
        initial={false}
        animate={
          isSuccess
            ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
            : { opacity: 0, scale: 0.92, filter: 'blur(8px)' }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`absolute inset-0 z-20 rounded-3xl bg-[#08090b]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-4 ${
          isSuccess ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <motion.div
          initial={{ scale: 0.4 }}
          animate={isSuccess ? { scale: 1 } : { scale: 0.4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.12)]"
        >
          <CheckCircle2 className="w-8 h-8 text-white" />
        </motion.div>
        <div className="text-center">
          <p className="font-serif text-2xl font-semibold text-white tracking-wide">Access Granted</p>
          <p className="text-[10px] text-neutral-500 mt-1 tracking-[0.25em] uppercase">
            Entering Dealership Command
          </p>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10">
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-8">
          <div className="mb-6 scale-110">
            <Logo size="md" />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-400">
              Restricted Access
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Admin Suite
          </h1>
          <p className="text-xs text-neutral-400 mt-2 max-w-xs">
            Authenticate with your dealership credentials to manage the fleet.
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div variants={itemVariants}>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5">
              Admin ID
            </label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin ID"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-panel text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/35 transition-all duration-300"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-12 py-3 rounded-xl glass-panel text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/35 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-600 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-1">
            <GlassButton
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              icon={<Lock className="w-4 h-4" />}
            >
              {isAuthenticating ? 'Verifying Credentials…' : 'Enter Admin Suite'}
            </GlassButton>
          </motion.div>
        </form>

        <motion.div variants={itemVariants} className="mt-6 flex justify-center">
          <button
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dealership</span>
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
