import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { GlassButton } from '../common/GlassButton';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface HeroSectionProps {
  onBrowseCars: () => void;
  onContactUs: () => void;
  featuredCarImage?: string | null;
}

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=90';

export const HeroSection: React.FC<HeroSectionProps> = ({
  onBrowseCars,
  onContactUs,
  featuredCarImage,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scroll parallax
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 150, damping: 25 });

  const textY = useTransform(smoothProgress, [0, 1], ['0px', '-80px']);
  const textOpacity = useTransform(smoothProgress, [0, 0.65], [1, 0]);
  const vehicleY = useTransform(smoothProgress, [0, 1], ['0px', '60px']);
  const vehicleScale = useTransform(smoothProgress, [0, 1], [1, 0.96]);
  const ghostWordX = useTransform(smoothProgress, [0, 1], ['0px', '-120px']);

  // Mouse tilt for the car stage
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 220, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 220, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x * 14);
    mouseY.set(y * 10);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const heroImage = featuredCarImage || DEFAULT_HERO_IMAGE;
  const headlineWords = ['Drive', 'Your', 'Dream', 'Today'];

  return (
    <section
      ref={containerRef}
      id="hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
    >
      {/* Ghost watermark word */}
      <motion.span
        style={{ x: ghostWordX }}
        className="ghost-word right-[-4%] top-[38%] text-[22vw] hidden md:block"
        aria-hidden
      >
        CARS
      </motion.span>

      {/* Right-edge vertical caption */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute right-6 lg:right-10 top-[24%] hidden lg:block text-right"
      >
        <p className="text-[10px] tracking-[0.4em] text-neutral-500 uppercase leading-loose">
          Luxury
          <br />
          Redefined
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-28 sm:pt-32 pb-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center">
          {/* Left: editorial copy */}
          <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-[11px] sm:text-xs tracking-label uppercase text-neutral-400 mb-5"
            >
              Premium Pre-Owned Cars
            </motion.p>

            {/* Headline with word stagger */}
            <h1 className="font-serif text-5xl sm:text-7xl xl:text-[5.2rem] font-semibold leading-[1.02] tracking-tight flex flex-wrap gap-x-4">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.8,
                    delay: 0.15 + i * 0.11,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={
                    i >= 2
                      ? 'silver-gradient-text inline-block'
                      : 'text-white inline-block'
                  }
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
              className="mt-5 text-sm sm:text-base text-neutral-400 tracking-wide"
            >
              Quality Cars. Trusted Deals. A Better Tomorrow.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75, ease: 'easeOut' }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <GlassButton
                variant="gold"
                size="lg"
                icon={<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />}
                iconPosition="right"
                onClick={onBrowseCars}
                className="group min-w-[170px]"
              >
                Browse Cars
              </GlassButton>

              <GlassButton variant="secondary" size="lg" onClick={onContactUs} className="min-w-[150px]">
                Contact Us
              </GlassButton>
            </motion.div>
          </motion.div>

          {/* Right: cinematic vehicle */}
          <motion.div
            style={{ y: vehicleY, scale: vehicleScale }}
            className="relative mt-6 lg:mt-0"
          >
            <motion.div
              style={{ x: springX, y: springY }}
              initial={{ opacity: 0, scale: 0.94, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Floor reflection glow */}
              <div className="absolute inset-x-8 bottom-0 h-24 bg-white/[0.05] blur-[70px] rounded-full pointer-events-none" />

              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.85)] group">
                <img
                  src={heroImage}
                  alt="New Royal Cars premium fleet"
                  className="w-full h-[260px] sm:h-[380px] lg:h-[440px] object-cover object-center grayscale-[0.35] transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                />

                {/* Cinematic grade overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050607] via-transparent to-[#050607]/30 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050607]/70 via-transparent to-transparent pointer-events-none" />

                {/* Light sweep on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Trust statistics row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-12 lg:mt-16 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-8"
        >
          {[
            { value: '500+', label: 'Happy Customers' },
            { value: '100%', label: 'Verified Cars' },
            { value: 'Best Prices', label: 'in the Market' },
            { value: 'Dedicated', label: 'After-Sales Support' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 + idx * 0.1 }}
              className={`text-center ${idx > 0 ? 'md:border-l md:border-white/10' : ''}`}
            >
              <div className="font-serif text-2xl sm:text-3xl font-semibold text-white">{stat.value}</div>
              <div className="text-xs sm:text-[13px] text-neutral-400 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll down prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-12 flex flex-col items-center justify-center"
        >
          <button
            onClick={onBrowseCars}
            className="flex flex-col items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-neutral-500 hover:text-white transition-colors duration-300 cursor-pointer group"
          >
            <span>Scroll Down</span>
            <ArrowDown className="w-4 h-4 text-neutral-400 animate-bounce group-hover:text-white transition-colors" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
