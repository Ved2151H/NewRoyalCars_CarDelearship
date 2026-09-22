import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Car } from '../../types';
import { formatKm } from '../../lib/utils';
import { ArrowRight, Heart, Users, Snowflake, Gauge } from 'lucide-react';

interface CarCardProps {
  car: Car;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (carId: string) => void;
  onViewDetails: (car: Car) => void;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  index,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 25, mass: 0.5 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 25, mass: 0.5 });

  const imageX = useTransform(mouseXSpring, [-0.5, 0.5], ['-3px', '3px']);
  const imageY = useTransform(mouseYSpring, [-0.5, 0.5], ['-3px', '3px']);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['10%', '90%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['10%', '90%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    setRotateX(-normY * 8);
    setRotateY(normX * 8);

    x.set(normX);
    y.set(normY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 35, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-30px' }}
      whileHover={{
        rotateX: rotateX,
        rotateY: rotateY,
        y: -6,
        transition: { type: 'spring', stiffness: 300, damping: 24 },
      }}
      transition={{
        duration: 0.65,
        delay: (index % 4) * 0.09,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="group relative rounded-2xl overflow-hidden glass-card glass-card-hover cursor-pointer flex flex-col"
      onClick={() => onViewDetails(car)}
    >
      {/* Glare sheen following cursor */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl z-20 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(380px circle at ${gx} ${gy}, rgba(255, 255, 255, 0.12), transparent 70%)`
          ),
        }}
      />

      {/* Image */}
      <motion.div
        style={{ x: imageX, y: imageY, transform: 'translateZ(18px)' }}
        className="relative h-48 sm:h-52 overflow-hidden"
      >
        <img
          src={car.images[0]}
          alt={car.name}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0d] via-transparent to-transparent pointer-events-none" />

        {/* Favorite heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(car.id);
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all duration-300 cursor-pointer ${
            isFavorite
              ? 'bg-white/90 border-white text-[#0a0c0d] scale-110'
              : 'bg-black/45 border-white/20 text-white hover:bg-black/70 hover:border-white/50'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </motion.div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-5" style={{ transform: 'translateZ(12px)' }}>
        <h3 className="font-serif text-lg sm:text-xl font-semibold text-white tracking-wide group-hover:text-neutral-200 transition-colors duration-300">
          {car.name}
        </h3>

        {/* Spec chips row */}
        <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5 text-neutral-500" />
            {car.ac ? 'AC' : 'Non-AC'}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-500" />
            {car.owners} {car.owners === 1 ? 'Owner' : 'Owners'}
          </span>
        </div>

        {/* KM row */}
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-neutral-400">
          <Gauge className="w-3.5 h-3.5 text-neutral-500" />
          <span>
            {formatKm(car.kmFrom)} - {formatKm(car.kmTo)} km
          </span>
        </div>

        {/* Price */}
        <div className="mt-3 font-serif text-xl sm:text-2xl font-semibold text-white tracking-wide">
          {car.formattedPrice}
        </div>

        {/* View Details */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(car);
          }}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl btn-outline text-xs font-semibold tracking-wide text-neutral-200 group-hover:text-white cursor-pointer"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </motion.div>
  );
};
