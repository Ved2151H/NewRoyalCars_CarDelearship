import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Car, Enquiry } from '../../types';
import { GlassButton } from '../common/GlassButton';
import {
  X,
  Sparkles,
  CheckCircle2,
  Phone,
  MapPin,
  User,
  AlertCircle,
} from 'lucide-react';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car | null;
  onSubmitEnquiry: (enquiry: Omit<Enquiry, 'id' | 'date'>) => Promise<string>;
}

/** Inner form lives in its own component so hooks never run conditionally. */
const EnquiryForm: React.FC<{
  car: Car | null;
  onClose: () => void;
  onSubmitEnquiry: (enquiry: Omit<Enquiry, 'id' | 'date'>) => Promise<string>;
}> = ({ car, onClose, onSubmitEnquiry }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !city) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const ref = await onSubmitEnquiry({
        customerName: name,
        phone,
        city,
        email: '',
        carId: car ? car.id : 'general',
        carName: car ? car.name : 'General Royal Fleet Inquiry',
        acRequired: true,
        message: car
          ? `I am interested in the ${car.name} (${car.year}).`
          : 'General enquiry.',
        status: 'Pending',
        preferredDate: undefined,
      });
      setReferenceId(ref);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Your enquiry could not be sent. Please try again or call us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="relative z-10 w-full max-w-lg rounded-3xl glass-modal p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95),0_0_60px_rgba(212,175,55,0.2)]">
      {/* Close button */}
      <button
        onClick={handleResetAndClose}
        className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {!submitted ? (
        <div>
          {/* Modal Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/20 text-neutral-300 text-xs font-semibold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enquire Now</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {car ? `Enquire on ${car.name}` : 'Send Us Your Details'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Interested in a car? Send us your details and we&apos;ll get back to you.
            </p>
          </div>

          {/* Selected Car preview chip if applicable */}
          {car && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 p-3 rounded-xl bg-black/50 border border-white/10 flex items-center gap-3"
            >
              <img
                src={car.images[0]}
                alt={car.name}
                className="w-14 h-11 object-cover rounded-lg border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{car.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  {car.carNumber} &middot; {car.year} &middot; {car.fuel}
                </div>
              </div>
              <div className="font-serif text-sm font-bold text-neutral-300">
                {car.formattedPrice}
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-neutral-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60 transition-colors"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Contact Number <span className="text-neutral-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60 transition-colors"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.19, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                City <span className="text-neutral-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="Your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/60 transition-colors"
                />
              </div>
            </motion.div>

            {/* Submission error */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <GlassButton
              variant="gold"
              size="lg"
              glow
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending Your Enquiry…' : 'Submit Enquiry →'}
            </GlassButton>
          </form>
        </div>
      ) : (
        /* Animated Success State */
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-center py-6"
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -16 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </motion.div>

          <h3 className="font-serif text-3xl font-bold text-white mb-2">
            Enquiry Submitted Successfully
          </h3>

          <p className="text-sm text-neutral-300 max-w-sm mx-auto mb-4">
            We&apos;ll get back to you shortly.
          </p>

          {/* Reference ticket badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-xl bg-black/50 border border-white/20 max-w-xs mx-auto mb-6"
          >
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">
              Enquiry Reference
            </span>
            <span className="font-mono text-xl font-bold text-neutral-300 tracking-wider">
              {referenceId}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-1">
              We&apos;ll call {phone} shortly.
            </span>
          </motion.div>

          <GlassButton
            variant="gold"
            size="md"
            className="min-w-[140px]"
            onClick={handleResetAndClose}
          >
            Done &amp; Return
          </GlassButton>
        </motion.div>
      )}
    </div>
  );
};

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  car,
  onClose,
  onSubmitEnquiry,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
        >
          {/* Background click backdrop */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full flex justify-center"
          >
            <EnquiryForm car={car} onClose={onClose} onSubmitEnquiry={onSubmitEnquiry} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
