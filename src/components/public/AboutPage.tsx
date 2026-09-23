import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, HeartHandshake, Award, Sparkles } from 'lucide-react';

interface AboutPageProps {
  onExploreCars: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onExploreCars }) => {
  const values = [
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: 'Certified Quality',
      desc: 'Every car passes a rigorous multi-point inspection before it earns a place in our dealership.',
    },
    {
      icon: <HeartHandshake className="w-5 h-5" />,
      title: 'Trusted Deals',
      desc: 'Transparent pricing, verified documents, and honest guidance at every step of the journey.',
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: 'After-Sales Care',
      desc: 'A dedicated support team that stays with you long after the keys change hands.',
    },
  ];

  return (
    <div className="relative pt-28 sm:pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl"
      >
        <p className="text-[11px] tracking-label uppercase text-neutral-500 mb-3">About</p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight leading-[1.05]">
          Driven by <span className="silver-gradient-text italic">Trust</span>, Defined by Quality
        </h1>
        <p className="mt-5 text-sm sm:text-base text-neutral-400 leading-relaxed">
          New Royal Cars is a premium pre-owned automotive dealership built on a simple promise —
          quality cars, trusted deals, and a better tomorrow. Every vehicle we list is inspected,
          verified, and presented with complete transparency.
        </p>
      </motion.div>

      {/* Values */}
      <div className="grid md:grid-cols-3 gap-5 mt-14">
        {values.map((v, idx) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -5 }}
            className="rounded-2xl glass-card glass-card-hover p-7"
          >
            <div className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-neutral-300 mb-5">
              {v.icon}
            </div>
            <h3 className="font-serif text-xl font-semibold text-white mb-2">{v.title}</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">{v.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Stat band */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mt-14 rounded-3xl glass-panel p-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
      >
        {[
          ['500+', 'Happy Customers'],
          ['100%', 'Verified Cars'],
          ['Best', 'Prices in the Market'],
          ['24x7', 'After-Sales Support'],
        ].map(([v, l]) => (
          <div key={l}>
            <div className="font-serif text-3xl font-semibold text-white">{v}</div>
            <div className="text-xs text-neutral-400 mt-1">{l}</div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-14 flex justify-center"
      >
        <button
          onClick={onExploreCars}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl btn-silver text-sm font-semibold tracking-wide cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Explore the Collection
        </button>
      </motion.div>
    </div>
  );
};
