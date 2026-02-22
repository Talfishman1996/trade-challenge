import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SMIN, GPS_Z } from '../math/constants.js';
import { lg } from '../math/format.js';

export default function GPSJourney({ equity, compact = false }) {
  const g = useMemo(() => {
    const W = compact ? 120 : 280, H = compact ? 180 : 420;
    const CX = compact ? W / 2 : W * 0.36, PAD = 16, IH = H - PAD * 2;
    const pfx = compact ? 'gc' : 'gf';

    const eqToT = eq => Math.max(0, Math.min(1,
      (lg(Math.max(eq, SMIN)) - lg(20000)) / (lg(110000) - lg(20000))
    ));

    const youT = eqToT(equity), youY = PAD + (1 - youT) * IH;

    const hw = t => {
      const sc = compact ? 0.55 : 1, BN = 0.54;
      const ss = s => 3 * s * s - 2 * s * s * s;
      if (t <= BN) { const s = t / BN; return (22 - 14 * ss(s)) * sc; }
      const s = (t - BN) / (1 - BN); return (8 + 30 * ss(s)) * sc;
    };

    const N = 80, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, y = PAD + (1 - t) * IH, w = hw(t);
      L.push((CX - w).toFixed(1) + ',' + y.toFixed(1));
      R.unshift((CX + w).toFixed(1) + ',' + y.toFixed(1));
    }

    const poly = L.join(' ') + ' ' + R.join(' ');
    const youClr = equity <= 35000 ? '#ef4444' : equity <= 65000 ? '#eab308' : '#10b981';

    // Wireframe grid lines across the funnel
    const gridLines = [];
    const gridCount = compact ? 14 : 24;
    for (let i = 1; i < gridCount; i++) {
      const t = i / gridCount;
      const y = PAD + (1 - t) * IH;
      const w = hw(t);
      // Atmospheric perspective: lines are brighter near bottom, fade toward top
      const opacity = compact ? (0.05 + t * 0.08) : (0.04 + t * 0.14);
      gridLines.push({ y, x1: CX - w, x2: CX + w, opacity });
    }

    // Progress trail from bottom to YOU
    const trailPoints = [];
    const trailSteps = 50;
    for (let i = 0; i <= trailSteps; i++) {
      const t = (youT * i) / trailSteps;
      const y = PAD + (1 - t) * IH;
      trailPoints.push(CX.toFixed(1) + ',' + y.toFixed(1));
    }

    const zones = GPS_Z.map(z => {
      const t = eqToT(z.eq);
      return { ...z, zy: PAD + (1 - t) * IH, zhw: hw(t), t };
    });

    // Narrowest point for goal glow
    const narrowT = 0.54;
    const narrowY = PAD + (1 - narrowT) * IH;
    const narrowW = hw(narrowT);

    // Particles
    const particles = compact ? [] : [
      { dx: -9, delay: 0, dur: 2.6, clr: youClr },
      { dx: 6, delay: 0.9, dur: 3.1, clr: youClr },
      { dx: -4, delay: 1.7, dur: 2.9, clr: youClr },
      { dx: 11, delay: 2.3, dur: 3.3, clr: youClr },
    ];

    return { W, H, CX, PAD, IH, pfx, youY, youT, youClr, poly, L, R, zones, gridLines, trailPoints, particles, narrowY, narrowW };
  }, [equity, compact]);

  const perspectiveStyle = compact ? {} : {
    perspective: '550px',
  };

  const innerStyle = compact ? {
    width: g.W,
    height: g.H,
  } : {
    width: g.W,
    height: g.H,
    transform: 'rotateX(12deg)',
    transformOrigin: 'center 65%',
    transformStyle: 'preserve-3d',
  };

  return (
    <div className="relative mx-auto" style={{ width: g.W, height: g.H + (compact ? 0 : 24), ...perspectiveStyle }}>
      {/* Perspective container - everything inside tilts together */}
      <div style={innerStyle}>
        <svg width={g.W} height={g.H} className="absolute inset-0">
          <defs>
            {/* Main funnel fill gradient */}
            <linearGradient id={g.pfx + 'f'} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity=".5" />
              <stop offset="20%" stopColor="#dc2626" stopOpacity=".4" />
              <stop offset="40%" stopColor="#eab308" stopOpacity=".35" />
              <stop offset="60%" stopColor="#22c55e" stopOpacity=".25" />
              <stop offset="85%" stopColor="#10b981" stopOpacity=".18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity=".12" />
            </linearGradient>
            {/* Inner shadow gradient (creates depth illusion) */}
            <linearGradient id={g.pfx + 'is'} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="black" stopOpacity=".15" />
              <stop offset="30%" stopColor="black" stopOpacity="0" />
              <stop offset="70%" stopColor="black" stopOpacity="0" />
              <stop offset="100%" stopColor="black" stopOpacity=".15" />
            </linearGradient>
            {/* Edge glow gradient */}
            <linearGradient id={g.pfx + 'e'} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            {/* Glow filter */}
            <filter id={g.pfx + 'g'}>
              <feGaussianBlur stdDeviation={compact ? 4 : 7} result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Soft outer glow */}
            <filter id={g.pfx + 'sg'}>
              <feGaussianBlur stdDeviation={compact ? 10 : 16} result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* YOU radial glow */}
            <radialGradient id={g.pfx + 'r'} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={g.youClr} stopOpacity=".55" />
              <stop offset="70%" stopColor={g.youClr} stopOpacity=".1" />
              <stop offset="100%" stopColor={g.youClr} stopOpacity="0" />
            </radialGradient>
            {/* Background atmosphere */}
            <radialGradient id={g.pfx + 'bg'} cx="45%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity=".5" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
            {/* Trail gradient */}
            <linearGradient id={g.pfx + 'tg'} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity=".15" />
              <stop offset="30%" stopColor="#eab308" stopOpacity=".35" />
              <stop offset="70%" stopColor="#22c55e" stopOpacity=".6" />
              <stop offset="100%" stopColor={g.youClr} stopOpacity=".9" />
            </linearGradient>
            {/* Narrowest point glow */}
            <radialGradient id={g.pfx + 'ng'} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity=".4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background atmosphere glow */}
          {!compact && (
            <ellipse cx={g.CX} cy={g.H * 0.48} rx={g.W * 0.4} ry={g.H * 0.42}
              fill={'url(#' + g.pfx + 'bg)'} opacity=".6" />
          )}

          {/* Outer depth shadow */}
          <polygon points={g.poly} fill={'url(#' + g.pfx + 'f)'}
            filter={'url(#' + g.pfx + 'sg)'} opacity=".15" />

          {/* Main funnel body */}
          <polygon points={g.poly} fill={'url(#' + g.pfx + 'f)'} />

          {/* Inner shadow overlay (adds 3D concavity) */}
          <polygon points={g.poly} fill={'url(#' + g.pfx + 'is)'} />

          {/* Wireframe grid - creates topographic 3D surface */}
          {g.gridLines.map((gl, i) => (
            <line key={i}
              x1={gl.x1} y1={gl.y} x2={gl.x2} y2={gl.y}
              stroke="#cbd5e1" strokeOpacity={gl.opacity}
              strokeWidth="0.5"
            />
          ))}

          {/* Edge strokes - brighter, with glow effect */}
          <polyline points={g.L.join(' ')} fill="none"
            stroke={'url(#' + g.pfx + 'e)'} strokeWidth={compact ? 1 : 2} strokeOpacity=".5" />
          <polyline points={g.R.join(' ')} fill="none"
            stroke={'url(#' + g.pfx + 'e)'} strokeWidth={compact ? 1 : 2} strokeOpacity=".5" />
          {/* Edge glow (subtle double-stroke effect) */}
          {!compact && (<>
            <polyline points={g.L.join(' ')} fill="none"
              stroke={'url(#' + g.pfx + 'e)'} strokeWidth="5" strokeOpacity=".06" />
            <polyline points={g.R.join(' ')} fill="none"
              stroke={'url(#' + g.pfx + 'e)'} strokeWidth="5" strokeOpacity=".06" />
          </>)}

          {/* Center axis */}
          <line x1={g.CX} y1={g.PAD} x2={g.CX} y2={g.H - g.PAD}
            stroke="white" strokeDasharray={compact ? '3 7' : '5 9'}
            strokeOpacity=".06" />

          {/* Narrowest point glow (the bottleneck/goal) */}
          {!compact && (
            <ellipse cx={g.CX} cy={g.narrowY} rx={g.narrowW + 12} ry="18"
              fill={'url(#' + g.pfx + 'ng)'} />
          )}

          {/* Progress trail */}
          {g.trailPoints.length > 1 && (<>
            {/* Wide glow behind trail */}
            <polyline points={g.trailPoints.join(' ')} fill="none"
              stroke={g.youClr} strokeWidth={compact ? 8 : 14}
              strokeLinecap="round" strokeOpacity=".06" />
            {/* Main trail line */}
            <polyline className="trail-pulse"
              points={g.trailPoints.join(' ')} fill="none"
              stroke={'url(#' + g.pfx + 'tg)'}
              strokeWidth={compact ? 2 : 3.5}
              strokeLinecap="round" strokeLinejoin="round" />
          </>)}

          {/* Zone milestone markers */}
          {g.zones.map((z, i) => {
            const achieved = equity >= z.eq;
            return (
              <g key={i}>
                <line x1={g.CX - z.zhw} y1={z.zy} x2={g.CX + z.zhw} y2={z.zy}
                  stroke={z.c} strokeOpacity={achieved ? '.4' : '.2'} strokeDasharray="3 5" />
                {/* Left diamond */}
                <polygon
                  points={`${g.CX - z.zhw},${z.zy - 5} ${g.CX - z.zhw + 5},${z.zy} ${g.CX - z.zhw},${z.zy + 5} ${g.CX - z.zhw - 5},${z.zy}`}
                  fill={z.c} fillOpacity={achieved ? '.85' : '.2'}
                  stroke={z.c} strokeWidth="0.5" strokeOpacity={achieved ? '.7' : '.3'} />
                {/* Right diamond */}
                <polygon
                  points={`${g.CX + z.zhw},${z.zy - 5} ${g.CX + z.zhw + 5},${z.zy} ${g.CX + z.zhw},${z.zy + 5} ${g.CX + z.zhw - 5},${z.zy}`}
                  fill={z.c} fillOpacity={achieved ? '.85' : '.2'}
                  stroke={z.c} strokeWidth="0.5" strokeOpacity={achieved ? '.7' : '.3'} />
                {/* Glow on achieved diamonds */}
                {achieved && !compact && (
                  <circle cx={g.CX - z.zhw} cy={z.zy} r="8"
                    fill={z.c} fillOpacity=".15" />
                )}
              </g>
            );
          })}

          {/* YOU indicator */}
          {/* Expanding ring pulse */}
          {!compact && (
            <circle className="ring-pulse" cx={g.CX} cy={g.youY}
              r="16" fill="none" stroke={g.youClr} strokeWidth="1.5" />
          )}
          {/* Large outer glow */}
          <circle cx={g.CX} cy={g.youY} r={compact ? 22 : 36}
            fill={'url(#' + g.pfx + 'r)'} />
          {/* Main pulsing dot */}
          <circle className="gps-pulse" cx={g.CX} cy={g.youY}
            r={compact ? 7 : 12} fill={g.youClr}
            filter={'url(#' + g.pfx + 'g)'} />
          {/* Bright core */}
          <circle cx={g.CX} cy={g.youY} r={compact ? 3 : 5} fill="white" />

          {/* Upward chevron (full mode) */}
          {!compact && (
            <polyline
              points={`${g.CX - 7},${g.youY - 20} ${g.CX},${g.youY - 27} ${g.CX + 7},${g.youY - 20}`}
              fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"
              strokeOpacity=".5" />
          )}
        </svg>

        {/* Labels - INSIDE perspective wrapper so they align with the funnel */}
        {!compact && (
          <div className="absolute inset-0 pointer-events-none font-mono">
            <motion.div
              className="absolute text-xs font-bold text-white drop-shadow-lg"
              style={{ left: g.CX - 30 }}
              animate={{ top: g.youY - 28 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              YOU
            </motion.div>
            {g.zones.map((z, i) => (
              <div key={i} className="absolute" style={{ left: g.CX + z.zhw + 16, top: z.zy - 12 }}>
                <div className={'text-sm font-bold drop-shadow-sm ' + z.tc}>{z.l}</div>
                <div className={'text-xs opacity-45 ' + z.tc}>{z.s}</div>
              </div>
            ))}
          </div>
        )}
        {compact && (
          <motion.div
            className="absolute font-mono font-bold pointer-events-none text-white drop-shadow-lg"
            style={{ left: '50%', fontSize: 9, transform: 'translateX(-50%)' }}
            animate={{ top: g.youY - 14 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            YOU
          </motion.div>
        )}

        {/* Floating particles (full mode) */}
        {g.particles.map((p, i) => (
          <div key={i} className="particle"
            style={{
              left: g.CX + p.dx,
              top: g.youY - 10,
              backgroundColor: p.clr,
              animationDuration: p.dur + 's',
              animationDelay: p.delay + 's',
              boxShadow: `0 0 6px ${p.clr}`,
            }}
          />
        ))}
      </div>

      {/* Bottom shadow for grounding */}
      {!compact && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-6 bg-gradient-to-t from-slate-700/15 to-transparent rounded-full blur-lg" />
      )}
    </div>
  );
}
