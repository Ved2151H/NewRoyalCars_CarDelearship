import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Enquiry } from '../../types';
import { GlassButton } from '../common/GlassButton';
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from 'lucide-react';

interface ContactPageProps {
  onSubmitEnquiry: (enquiry: Omit<Enquiry, 'id' | 'date'>) => Promise<string>;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onSubmitEnquiry }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitEnquiry({
        customerName: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        email: '',
        carId: 'general',
        carName: 'General Enquiry',
        acRequired: true,
        message: 'General contact page enquiry.',
        status: 'Pending',
        preferredDate: undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Your enquiry could not be sent. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl glass-panel text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/30 transition-colors';

  return (
    <div className="relative pt-28 sm:pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl"
      >
        <p className="text-[11px] tracking-label uppercase text-neutral-500 mb-3">Contact</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight">
          Enquire <span className="silver-gradient-text italic">Now</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-neutral-400">
          Interested in a car? Send us your details and we&apos;ll get back to you.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8 mt-12">
        {/* Contact info */}
        <div className="lg:col-span-5 space-y-4">
          {[
            { icon: <MapPin className="w-4 h-4" />, title: 'Showroom', lines: ['Plot 42, Royal Pavilion Blvd', 'Worli Sea Face, Mumbai 400018'] },
            { icon: <Phone className="w-4 h-4" />, title: 'Phone', lines: ['+91 98200 12345', '022 4589 7700'] },
            { icon: <Mail className="w-4 h-4" />, title: 'Email', lines: ['concierge@newroyalcars.com'] },
            { icon: <Clock className="w-4 h-4" />, title: 'Hours', lines: ['Mon – Sun: 10:00 AM – 8:30 PM'] },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl glass-card p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-neutral-300 shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                {item.lines.map((line) => (
                  <p key={line} className="text-xs text-neutral-400 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <div className="rounded-3xl glass-modal p-6 sm:p-8">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center py-14"
              >
                <motion.div
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
                  className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 className="w-8 h-8 text-neutral-200" />
                </motion.div>
                <h3 className="font-serif text-2xl font-semibold text-white mb-2">
                  Enquiry Submitted Successfully
                </h3>
                <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto">
                  We&apos;ll get back to you shortly.
                </p>
                <GlassButton variant="secondary" size="md" onClick={() => setSubmitted(false)}>
                  Send Another Enquiry
                </GlassButton>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Full Name *
                  </label>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
                  </motion.div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Contact Number *
                  </label>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98200 00000" className={inputClass} />
                  </motion.div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    City *
                  </label>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.19, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" className={inputClass} />
                  </motion.div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <GlassButton
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending Your Enquiry…' : 'Submit Enquiry →'}
                </GlassButton>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
