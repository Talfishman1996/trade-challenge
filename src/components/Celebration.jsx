import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#a855f7', '#ffffff'];

export default function Celebration({ milestone, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    })),
  []);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Confetti particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            position: 'absolute',
            left: p.left + '%',
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size > 7 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0,
          }}
        />
      ))}

      {/* Center content */}
      <motion.div
        className="relative text-center z-10 px-8"
        initial={{ scale: 0.3, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <div
          className="text-6xl font-black font-mono text-white tracking-tight"
          style={{ textShadow: '0 0 40px rgba(16,185,129,.5), 0 0 80px rgba(16,185,129,.3)' }}
        >
          {milestone.l}
        </div>
        <div className="text-xl font-bold text-emerald-400 mt-3">
          Milestone Reached!
        </div>
        <div className="text-sm text-slate-500 mt-2">Tap to continue</div>
      </motion.div>
    </motion.div>
  );
}
