import React, { useEffect, useRef } from 'react';

interface BackgroundCanvasProps {
  mode?: 'hero' | 'showcase' | 'details' | 'admin';
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  targetAlpha: number;
  twinkleSpeed: number;
}

interface SmokeWisp {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  drift: number;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ mode = 'hero', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    mouseRef.current.x = width / 2;
    mouseRef.current.y = height / 2;
    mouseRef.current.targetX = width / 2;
    mouseRef.current.targetY = height / 2;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    if (!touchDevice && !reducedMotion) window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Silver dust particles — count scales down for calmer admin/details modes
    const baseParticleCount = mode === 'admin' ? 20 : mode === 'details' ? 28 : mode === 'showcase' ? 42 : 60;
    const particleCount = reducedMotion ? 0 : touchDevice ? Math.ceil(baseParticleCount * 0.45) : baseParticleCount;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + (mode === 'hero' ? 0.5 : 0.3),
        vx: (Math.random() - 0.5) * (mode === 'admin' ? 0.1 : 0.28),
        vy: (Math.random() * -0.35 - 0.06) * (mode === 'admin' ? 0.2 : 0.5),
        alpha: Math.random() * 0.4 + 0.08,
        targetAlpha: Math.random() * 0.55 + 0.08,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    // Slow drifting smoke wisps — the showroom-at-night fog
    const wispCount = reducedMotion ? 0 : touchDevice ? 3 : mode === 'admin' ? 3 : 5;
    const wisps: SmokeWisp[] = [];
    for (let i = 0; i < wispCount; i++) {
      wisps.push({
        x: Math.random() * width,
        y: height * (0.35 + Math.random() * 0.6),
        radius: 180 + Math.random() * 260,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.05,
        alpha: mode === 'admin' ? 0.018 + Math.random() * 0.02 : 0.03 + Math.random() * 0.035,
        drift: Math.random() * Math.PI * 2,
      });
    }

    // White light beams cutting from the top — cinematic showroom spots
    interface Beam {
      x: number;
      width: number;
      sway: number;
      swaySpeed: number;
      alpha: number;
    }
    const beams: Beam[] = [];
    if (mode === 'hero' || mode === 'showcase') {
      const beamCount = mode === 'hero' ? 4 : 3;
      for (let i = 0; i < beamCount; i++) {
        beams.push({
          x: width * (0.12 + (i / beamCount) * 0.76) + (Math.random() - 0.5) * 60,
          width: 60 + Math.random() * 110,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 0.0016 + Math.random() * 0.0012,
          alpha: mode === 'hero' ? 0.045 + Math.random() * 0.035 : 0.025 + Math.random() * 0.02,
        });
      }
    }

    let time = 0;

    const render = () => {
      time += reducedMotion ? 0 : 0.008;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // 1. Slow ambient white light pool
      const gradCenterX = width * 0.5 + Math.sin(time * 0.5) * (width * 0.14);
      const gradCenterY = height * 0.38 + Math.cos(time * 0.4) * (height * 0.1);

      const radialGrad = ctx.createRadialGradient(gradCenterX, gradCenterY, 50, gradCenterX, gradCenterY, width * 0.6);
      if (mode === 'admin') {
        radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.022)');
        radialGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.008)');
        radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        radialGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.018)');
        radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Mouse following spotlight
      const mouseGrad = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        mode === 'admin' ? 200 : 320
      );
      mouseGrad.addColorStop(0, touchDevice || reducedMotion ? 'rgba(255,255,255,0.012)' : mode === 'admin' ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)');
      mouseGrad.addColorStop(0.5, 'rgba(255,255,255,0.008)');
      mouseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Cinematic light beams from above
      if (beams.length > 0) {
        ctx.save();
        beams.forEach((beam) => {
          beam.sway += beam.swaySpeed;
          const swayOffset = Math.sin(beam.sway) * 70;
          const beamGrad = ctx.createLinearGradient(beam.x, 0, beam.x + swayOffset, height);
          beamGrad.addColorStop(0, `rgba(255, 255, 255, ${beam.alpha})`);
          beamGrad.addColorStop(0.55, `rgba(255, 255, 255, ${beam.alpha * 0.4})`);
          beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(beam.x - beam.width * 0.35, 0);
          ctx.lineTo(beam.x + beam.width * 0.35, 0);
          ctx.lineTo(beam.x + swayOffset + beam.width * 1.4, height);
          ctx.lineTo(beam.x + swayOffset - beam.width * 1.4, height);
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
      }

      // 4. Drifting smoke wisps
      wisps.forEach((w) => {
        w.drift += 0.002;
        w.x += w.vx + Math.sin(w.drift) * 0.15;
        w.y += w.vy;
        if (w.x < -w.radius) w.x = width + w.radius;
        if (w.x > width + w.radius) w.x = -w.radius;
        if (w.y < -w.radius) w.y = height + w.radius;
        if (w.y > height + w.radius) w.y = -w.radius;

        const wispGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.radius);
        wispGrad.addColorStop(0, `rgba(255, 255, 255, ${w.alpha})`);
        wispGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = wispGrad;
        ctx.fillRect(w.x - w.radius, w.y - w.radius, w.radius * 2, w.radius * 2);
      });

      // 5. Floating silver dust
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        p.alpha += (p.targetAlpha - p.alpha) * p.twinkleSpeed;
        if (Math.abs(p.targetAlpha - p.alpha) < 0.03) {
          p.targetAlpha = Math.random() * 0.5 + 0.08;
        }

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.fillStyle = `rgba(230, 235, 240, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reducedMotion) animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ opacity: 0.95 }}
    />
  );
};
