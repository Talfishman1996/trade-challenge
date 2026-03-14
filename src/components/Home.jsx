import React, { useState, useMemo } from 'react';
import { Zap, TrendingUp, Trophy, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, r$N, getPhaseName, getPhase, riskSeverity } from '../math/risk.js';
import { E0, MILES } from '../math/constants.js';
import EquityCurve from './EquityCurve.jsx';

/* ───────────────────────────────────────────
   Constants & Trail Data
   ─────────────────────────────────────────── */

const MOUNTAIN_BG = import.meta.env.BASE_URL + 'mountain-bg.jpg';

// Camp names for milestones
const CAMP_NAMES = ['Base Camp', 'Camp I', 'Camp II', 'Camp III', 'High Camp', 'Summit'];

// SVG trail path — wide S-curve switchbacks up the mountain
// Route: center(start) → right($100K) → left($250K) → right($500K) → left($1M) → right($4M) → center($10M)
const TRAIL_PATH =
  'M 195 438 C 220 428, 280 412, 320 392 C 355 374, 360 358, 330 346 ' +
  'C 290 332, 170 322, 100 312 C 50 302, 40 290, 70 278 ' +
  'C 110 264, 220 252, 300 240 C 350 230, 350 218, 300 206 ' +
  'C 240 192, 130 182, 80 172 C 40 162, 50 150, 90 140 ' +
  'C 140 128, 230 118, 280 108 C 320 100, 310 88, 260 78 ' +
  'C 230 72, 210 68, 195 58';

// Trail milestones ($100K–$4M) — positioned on the trail switchbacks
const TRAIL_MILESTONES = [
  { label: '$100K', camp: 'Base Camp', value: 100000, x: 248, y: 338, labelSide: 'left' },
  { label: '$250K', camp: 'Camp I', value: 250000, x: 100, y: 290, labelSide: 'right' },
  { label: '$500K', camp: 'Camp II', value: 500000, x: 290, y: 234, labelSide: 'left' },
  { label: '$1M',   camp: 'Camp III', value: 1000000, x: 100, y: 172, labelSide: 'right' },
  { label: '$4M',   camp: 'High Camp', value: 4000000, x: 270, y: 108, labelSide: 'left' },
];

// $10M summit — floating above temple, NOT on trail
const SUMMIT = { label: '$10M', value: 10000000, x: 195, y: 42 };

const PHASE_INFO = {
  pre: 'Aggressive growth mode. High risk compounds your account toward the $87.5K anchor. This is by design.',
  anchor: 'Balanced zone. Risk is at the Kelly-optimal 33% level.',
  model: 'Decay active. Risk shrinks as portfolio grows, protecting gains.',
};

/* ───────────────────────────────────────────
   Player position interpolation on trail
   ─────────────────────────────────────────── */

function getPlayerPosition(eq) {
  const waypoints = [
    { value: 20000, x: 195, y: 438 },
    ...TRAIL_MILESTONES.map(m => ({ value: m.value, x: m.x, y: m.y })),
    { value: 10000000, x: 195, y: 72 },
  ];

  if (eq <= waypoints[0].value) return { x: waypoints[0].x, y: waypoints[0].y, t: 0 };
  if (eq >= waypoints[waypoints.length - 1].value) {
    return { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y, t: 1 };
  }

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (eq >= a.value && eq <= b.value) {
      const logA = Math.log10(a.value);
      const logB = Math.log10(b.value);
      const logE = Math.log10(eq);
      const frac = (logE - logA) / (logB - logA);
      const x = a.x + (b.x - a.x) * frac;
      const y = a.y + (b.y - a.y) * frac;
      const segT = (i + frac) / (waypoints.length - 1);
      return { x, y, t: segT };
    }
  }
  return { x: 195, y: 438, t: 0 };
}

/* ───────────────────────────────────────────
   Climber SVG silhouette
   ─────────────────────────────────────────── */

const ClimberSVG = ({ x, y }) => (
  <g transform={`translate(${x - 14}, ${y - 36}) scale(1.8)`}>
    {/* Head */}
    <circle cx="8" cy="3" r="2.5" fill="#00e5cc" opacity="0.95" />
    {/* Body */}
    <line x1="8" y1="5.5" x2="8" y2="13" stroke="#00e5cc" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
    {/* Left leg — planted */}
    <line x1="8" y1="13" x2="5" y2="18" stroke="#00e5cc" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
    {/* Right leg — stepping up */}
    <line x1="8" y1="13" x2="11" y2="17" stroke="#00e5cc" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
    {/* Left arm — holding ice axe up */}
    <line x1="8" y1="7" x2="4" y2="4" stroke="#00e5cc" strokeWidth="1.3" strokeLinecap="round" opacity="0.95" />
    {/* Right arm — reaching */}
    <line x1="8" y1="7" x2="12" y2="9" stroke="#00e5cc" strokeWidth="1.3" strokeLinecap="round" opacity="0.95" />
    {/* Ice axe */}
    <line x1="4" y1="4" x2="2" y2="1" stroke="#00e5cc" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
    {/* Backpack bump */}
    <ellipse cx="9.5" cy="9" rx="2" ry="2.5" fill="#00e5cc" opacity="0.2" />
  </g>
);

/* ───────────────────────────────────────────
   Campfire icon (small flame SVG)
   ─────────────────────────────────────────── */

const CampfireIcon = ({ x, y, size = 8 }) => (
  <g transform={`translate(${x - size / 2}, ${y - size})`}>
    <path
      d={`M${size / 2} 0 C${size * 0.3} ${size * 0.3}, 0 ${size * 0.5}, ${size * 0.3} ${size} L${size * 0.7} ${size} C${size} ${size * 0.5}, ${size * 0.7} ${size * 0.3}, ${size / 2} 0Z`}
      fill="#FFB830"
      opacity="0.9"
    />
    <path
      d={`M${size / 2} ${size * 0.25} C${size * 0.4} ${size * 0.45}, ${size * 0.25} ${size * 0.55}, ${size * 0.38} ${size} L${size * 0.62} ${size} C${size * 0.75} ${size * 0.55}, ${size * 0.6} ${size * 0.45}, ${size / 2} ${size * 0.25}Z`}
      fill="#FF9500"
      opacity="0.8"
    />
  </g>
);

/* Flame flicker animation class for achieved campfire icons */
const flameStyle = { animation: 'flameFlicker 2s ease-in-out infinite', transformOrigin: 'center bottom' };

/* ───────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────── */

function RiskGauge({ riskPct, riskDol }) {
  const sev = riskSeverity(riskPct);
  const textCls = sev === 'safe' ? 'text-amber-400' : sev === 'elevated' ? 'text-orange-400' : 'text-rose-400';
  const barCls = sev === 'safe' ? 'bg-amber-500' : sev === 'elevated' ? 'bg-orange-500' : 'bg-rose-500';
  const glowCls = sev === 'safe' ? 'shadow-amber-500/30' : sev === 'elevated' ? 'shadow-orange-500/30' : 'shadow-rose-500/30';

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold font-mono tabular-nums ${textCls}`}>${fmt(riskDol)}</span>
        <span className={`text-lg font-bold font-mono tabular-nums ${textCls}`}>{riskPct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-800/70 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barCls} shadow-lg ${glowCls} transition-all duration-500`}
          style={{ width: Math.min(100, riskPct) + '%' }} />
      </div>
      <div className="text-xs text-slate-400">risk on next trade</div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Mountain Trail SVG Overlay
   ─────────────────────────────────────────── */

function MountainTrail({ summitData, eq }) {
  const player = useMemo(() => getPlayerPosition(eq), [eq]);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 390 464"
      preserveAspectRatio="xMidYMin slice"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {/* Amber glow for completed trail */}
        <filter id="trailGlowAmber" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Player campfire glow */}
        <filter id="campfireGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gold shimmer for summit — enlarged glow */}
        <filter id="goldGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Teal pulse glow for next milestone */}
        <filter id="tealPulse" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient for completed trail: amber-gold */}
        <linearGradient id="trailAmber" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFB830" />
        </linearGradient>

        {/* Radial glow for campfire at player pos */}
        <radialGradient id="campfireRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB830" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#FF9500" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FF9500" stopOpacity="0" />
        </radialGradient>

        {/* Summit radiance gradient */}
        <radialGradient id="summitRadiance" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#FFB830" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFB830" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ─── FUTURE TRAIL outer glow halo ─── */}
      <path
        d={TRAIL_PATH}
        fill="none"
        stroke="#00e5cc"
        strokeWidth={12}
        strokeOpacity={0.05}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#tealPulse)"
      />

      {/* ─── FUTURE TRAIL main line ─── */}
      <path
        d={TRAIL_PATH}
        fill="none"
        stroke="#12E7D6"
        strokeWidth={4}
        strokeOpacity={0.18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ─── FUTURE TRAIL bright core ─── */}
      <path
        d={TRAIL_PATH}
        fill="none"
        stroke="#C8FFF8"
        strokeWidth={1.5}
        strokeOpacity={0.10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ─── COMPLETED TRAIL outer glow (warm amber, wide) ─── */}
      <motion.path
        d={TRAIL_PATH}
        fill="none"
        stroke="#FFB830"
        strokeWidth={12}
        strokeOpacity={0.14}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#trailGlowAmber)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: player.t }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* ─── COMPLETED TRAIL main amber line ─── */}
      <motion.path
        d={TRAIL_PATH}
        fill="none"
        stroke="url(#trailAmber)"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: player.t }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* ─── COMPLETED TRAIL bright inner core ─── */}
      <motion.path
        d={TRAIL_PATH}
        fill="none"
        stroke="#FFE38A"
        strokeWidth={1.5}
        strokeOpacity={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: player.t }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* ─── MILESTONES ($100K–$4M) ─── */}
      {TRAIL_MILESTONES.map((ms, i) => {
        const mData = summitData.miles[i];
        const achieved = mData?.achieved;
        const isNext = mData?.isNext;
        const delay = 0.4 + i * 0.18;
        const pillX = ms.labelSide === 'right' ? ms.x + 16 : ms.x - 16;
        const anchor = ms.labelSide === 'right' ? 'start' : 'end';

        return (
          <motion.g
            key={ms.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: 'backOut' }}
            style={{ transformOrigin: `${ms.x}px ${ms.y}px` }}
          >
            {/* ── Next milestone: teal beacon pulse ── */}
            {isNext && (
              <>
                <circle
                  cx={ms.x} cy={ms.y} r={10}
                  fill="none" stroke="#00e5cc" strokeWidth={1.5}
                  opacity={0.4}
                  className="ring-pulse"
                />
                <circle
                  cx={ms.x} cy={ms.y} r={6}
                  fill="#00e5cc" opacity={0.15}
                  filter="url(#tealPulse)"
                />
              </>
            )}

            {/* ── Marker dot (larger for visibility) ── */}
            <circle
              cx={ms.x} cy={ms.y}
              r={achieved ? 8 : isNext ? 7 : 5}
              fill={achieved ? '#FFD700' : isNext ? '#00e5cc' : 'none'}
              stroke={achieved ? '#FFD700' : isNext ? '#00e5cc' : '#7a8a9c'}
              strokeWidth={achieved ? 0 : isNext ? 1.5 : 1.2}
              opacity={achieved ? 1 : isNext ? 0.9 : 0.55}
            />

            {/* ── Achieved: campfire flame icon (larger, offset left) ── */}
            {achieved && <CampfireIcon x={ms.x - 10} y={ms.y - 2} size={13} />}

            {/* ── Achieved: golden checkmark ── */}
            {achieved && (
              <text
                x={ms.x} y={ms.y + 1.5}
                textAnchor="middle" dominantBaseline="central"
                fill="#0a0e14" fontSize={5.5} fontWeight={800}
              >✓</text>
            )}

            {/* ── Frosted pill label ── */}
            <g>
              {/* Pill background — translucent, refined */}
              <rect
                x={ms.labelSide === 'right' ? ms.x + 14 : ms.x - 88}
                y={ms.y - 17}
                width={74}
                height={34}
                rx={8}
                fill={achieved ? 'rgba(30,20,0,0.72)' : isNext ? 'rgba(0,20,18,0.72)' : 'rgba(40,46,56,0.65)'}
                stroke={achieved ? 'rgba(255,215,0,0.22)' : isNext ? 'rgba(0,229,204,0.25)' : 'rgba(148,163,184,0.12)'}
                strokeWidth={0.8}
              />
              {/* Dollar label */}
              <text
                x={pillX} y={ms.y - 3}
                textAnchor={anchor}
                fill={achieved ? '#FFD700' : isNext ? '#00e5cc' : '#8896a8'}
                opacity={achieved ? 1 : isNext ? 0.95 : 0.6}
                fontSize={14}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
              >{ms.label}</text>
              {/* Camp name */}
              <text
                x={pillX} y={ms.y + 10}
                textAnchor={anchor}
                fill={achieved ? '#d4a560' : isNext ? 'rgba(255,255,255,0.65)' : '#8896a8'}
                opacity={achieved ? 0.8 : isNext ? 0.65 : 0.4}
                fontSize={9}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={500}
                letterSpacing="0.5"
              >{ms.camp}</text>
            </g>

            {/* ── Future: lock indicator ── */}
            {!achieved && !isNext && (
              <text
                x={ms.x} y={ms.y + 1}
                textAnchor="middle" dominantBaseline="central"
                fill="#7a8a9c" fontSize={5} opacity={0.5}
              >🔒</text>
            )}
          </motion.g>
        );
      })}

      {/* ─── SUMMIT RADIANCE — warm glow behind temple ─── */}
      <circle cx={SUMMIT.x} cy={SUMMIT.y + 24} r={55}
        fill="none" stroke="#ffd700" strokeWidth={1.5} opacity={0.06}
        filter="url(#goldGlow)" />
      <circle cx={SUMMIT.x} cy={SUMMIT.y + 24} r={32}
        fill="url(#summitRadiance)" opacity={0.2} />

      {/* ─── $10M SUMMIT — floating golden text above temple ─── */}
      <motion.g
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1, ease: 'easeOut' }}
      >
        {/* $10M label — large, bold, golden */}
        <text
          x={SUMMIT.x} y={SUMMIT.y + 6}
          textAnchor="middle"
          fill="#ffd700"
          fontSize={44}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={800}
          letterSpacing="5"
          filter="url(#goldGlow)"
          className="summit-shimmer"
        >$10M</text>
      </motion.g>

      {/* ─── PLAYER POSITION — Climber + Campfire Glow ─── */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        {/* Campfire ambient glow behind climber */}
        <motion.circle
          cx={player.x} cy={player.y}
          r={18}
          fill="url(#campfireRadial)"
          animate={{ r: [18, 24, 18], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Outer teal beacon ring */}
        <motion.circle
          cx={player.x} cy={player.y}
          r={10}
          fill="none"
          stroke="#00e5cc"
          strokeWidth={0.8}
          animate={{ r: [10, 16, 10], opacity: [0.25, 0.08, 0.25] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Campfire at player's feet */}
        <CampfireIcon x={player.x} y={player.y + 4} size={12} />

        {/* Climber silhouette */}
        <ClimberSVG x={player.x} y={player.y} />
      </motion.g>
    </svg>
  );
}

/* ───────────────────────────────────────────
   Main Home Component
   ─────────────────────────────────────────── */

export default function Home({ trades, settings, onOpenTradeEntry }) {
  const [showCurve, setShowCurve] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [dismissAlert, setDismissAlert] = useState(() => sessionStorage.getItem('dd-dismiss') === '1');
  const [exploreEq, setExploreEq] = useState(20000);
  const eq = trades.currentEquity;
  const phase = getPhase(eq);
  const rPct = trades.nextRisk.pct * 100;
  const rSev = riskSeverity(rPct);
  const rColor = rSev === 'safe' ? 'text-amber-400' : rSev === 'elevated' ? 'text-orange-400' : 'text-red-500';
  const hasTrades = trades.stats.totalTrades > 0;
  const inProfit = trades.stats.totalPnl >= 0;

  // Mini sparkline data
  const sparkData = useMemo(() => {
    const pts = [trades.initialEquity, ...trades.trades.map(t => t.equityAfter)];
    return pts.slice(-20);
  }, [trades.trades, trades.initialEquity]);

  const sparkMin = Math.min(...sparkData);
  const sparkMax = Math.max(...sparkData);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkClr = sparkData.length > 1 && sparkData[sparkData.length - 1] >= sparkData[0] ? '#10b981' : '#ef4444';
  const sparkPoints = sparkData.map((v, i) => ({
    x: sparkData.length > 1 ? (i / (sparkData.length - 1)) * 100 : 50,
    y: 4 + 42 - ((v - sparkMin) / sparkRange) * 42,
  }));
  const smoothCurve = (pts) => {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const sparkPath = smoothCurve(sparkPoints);
  const sparkAreaPath = sparkPath + ' L100,50 L0,50 Z';
  const sparkEndPt = sparkPoints[sparkPoints.length - 1];
  const peakIdx = sparkData.indexOf(sparkMax);
  const peakPt = sparkPoints[peakIdx];

  // Summit tracker — milestone trail data
  const summitData = useMemo(() => {
    const start = 20000;
    const achievedCount = MILES.filter(m => eq >= m.v).length;
    const lastAchievedIdx = MILES.reduce((acc, m, i) => eq >= m.v ? i : acc, -1);
    const nextIdx = lastAchievedIdx + 1;
    const nextM = nextIdx < MILES.length ? MILES[nextIdx] : null;
    const prevVal = lastAchievedIdx >= 0 ? MILES[lastAchievedIdx].v : start;
    const nextVal = nextM ? nextM.v : MILES[MILES.length - 1].v;
    const segPct = nextM ? Math.min(100, Math.max(0, ((eq - prevVal) / (nextVal - prevVal)) * 100)) : 100;
    const trailPct = nextM
      ? ((lastAchievedIdx + 1 + segPct / 100) / MILES.length) * 100
      : 100;
    const toGo = nextM ? nextVal - eq : 0;
    return { achievedCount, lastAchievedIdx, nextM, segPct, trailPct, toGo, miles: MILES.map((m, i) => ({
      ...m, achieved: eq >= m.v, isNext: i === nextIdx && nextIdx < MILES.length,
    })) };
  }, [eq]);

  // Trades per week and milestone ETA
  const tradesPerWeek = useMemo(() => {
    if (trades.trades.length < 2) return 0;
    const first = new Date(trades.trades[0].date).getTime();
    const last = new Date(trades.trades[trades.trades.length - 1].date).getTime();
    const weeks = Math.max(1, (last - first) / (7 * 86400000));
    return trades.trades.length / weeks;
  }, [trades.trades]);

  const avgPnlPerTrade = hasTrades ? trades.stats.totalPnl / trades.stats.totalTrades : 0;

  const estDate = useMemo(() => {
    if (!summitData.nextM || avgPnlPerTrade <= 0 || tradesPerWeek <= 0) return null;
    const tradesNeeded = summitData.toGo / avgPnlPerTrade;
    const weeksNeeded = tradesNeeded / tradesPerWeek;
    const ms = Date.now() + weeksNeeded * 7 * 86400000;
    return new Date(ms);
  }, [summitData, avgPnlPerTrade, tradesPerWeek]);

  // Stats data
  const stats = [
    { l: 'Trades', v: trades.stats.totalTrades, c: 'text-white' },
    { l: 'Win Rate', v: trades.stats.totalTrades > 0 ? trades.stats.winRate.toFixed(0) + '%' : '--',
      c: trades.stats.winRate >= 60 ? 'text-amber-300' : trades.stats.totalTrades > 0 ? 'text-red-500' : 'text-white',
      glow: trades.stats.winRate >= 60 },
    {
      l: 'Streak',
      v: trades.stats.currentStreak > 0
        ? (trades.stats.streakType === 'win' ? '+' : '-') + trades.stats.currentStreak
        : '--',
      c: trades.stats.streakType === 'win' ? 'text-emerald-400' : trades.stats.streakType === 'loss' ? 'text-red-500' : 'text-white'
    },
    {
      l: '30 Days',
      v: trades.stats.last30Trades > 0
        ? (trades.stats.last30Pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(trades.stats.last30Pnl))
        : '--',
      c: trades.stats.last30Pnl > 0 ? 'text-emerald-400' : trades.stats.last30Pnl < 0 ? 'text-red-500' : 'text-white'
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0e14]">
      {/* ── CSS keyframes for summit shimmer & ring pulse ── */}
      <style>{`
        @keyframes summitShimmer {
          0%, 100% { opacity: 0.65; filter: url(#goldGlow) drop-shadow(0 0 6px #ffd70066); }
          50% { opacity: 1; filter: url(#goldGlow) drop-shadow(0 0 16px #ffd700cc); }
        }
        .summit-shimmer { animation: summitShimmer 3s ease-in-out infinite; }
        @keyframes ringPulseKf {
          0% { r: 10; opacity: 0.4; }
          100% { r: 22; opacity: 0; }
        }
        .ring-pulse { animation: ringPulseKf 2s ease-out infinite; }
        @keyframes campfireBreathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.85; }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1); opacity: 0.9; }
          50% { transform: scaleY(1.12); opacity: 1; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: #1a2030;
          border-radius: 999px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #00e5cc;
          box-shadow: 0 0 10px rgba(0, 229, 204, 0.35);
          cursor: pointer;
        }
      `}</style>

      {/* ═══════════════════════════════════════
          MOUNTAIN HERO — Top ~58vh
          ═══════════════════════════════════════ */}
      <div
        className="relative w-full"
        style={{
          height: '68svh',
          minHeight: 440,
          maxHeight: 700,
          backgroundImage: `url('${MOUNTAIN_BG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 8%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark gradient overlay: transparent top → solid #0a0e14 bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,14,20,0.02) 0%, rgba(10,14,20,0.06) 32%, rgba(10,14,20,0.22) 68%, #0a0e14 100%)',
          }}
        />

        {/* Warm campfire vignette on lower mountain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 84%, rgba(255,170,60,0.05) 0%, transparent 55%)',
          }}
        />

        {/* ── TRADEVAULT Header — monospace, top-left ── */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <h1
            className="font-mono tracking-[0.18em] text-white/95"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              textShadow: '0 2px 16px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            <span className="text-white">TRADE</span>
            <span className="text-[#00e5cc]">VAULT</span>
          </h1>
        </div>

        {/* ── SVG Trail Overlay ── */}
        <div className="absolute inset-0 z-10">
          <MountainTrail summitData={summitData} eq={eq} />
        </div>

        {/* ── Portfolio Value — overlaid at gradient transition zone ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 text-center pb-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(10,14,20,0.65) 0%, transparent 70%)' }}
          >
            <div
              className="text-sm text-slate-400 uppercase tracking-[0.3em] font-medium font-mono mb-1.5"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 20px rgba(10,14,20,0.8)' }}
            >
              Portfolio Value
            </div>
            <div
              className="font-bold font-mono tabular-nums tracking-normal text-white leading-none"
              style={{ fontSize: '56px', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
            >
              ${fmt(eq)}
            </div>
            {hasTrades ? (
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className={'text-sm font-semibold font-mono tabular-nums ' + (inProfit ? 'text-emerald-400' : 'text-red-500')}>
                  {inProfit ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                </span>
                <span className={'text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ' + (inProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                  {inProfit ? '+' : ''}{((eq - trades.initialEquity) / trades.initialEquity * 100).toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 mt-1.5 font-mono uppercase tracking-widest" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>Starting equity</div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DARK UI SECTION — Below mountain
          ═══════════════════════════════════════ */}
      <div className="relative z-30 px-4 pb-8 pt-2 space-y-5 max-w-lg md:max-w-3xl mx-auto">

        {/* ── LOG TRADE Button ── */}
        <motion.button
          onClick={() => onOpenTradeEntry()}
          className="w-full py-3.5 bg-[#30D158] text-[#0a0e14] font-bold text-base rounded-2xl active:scale-[0.96] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#30D158]/25 uppercase tracking-wider"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <TrendingUp className="w-5 h-5" /> Log Trade
        </motion.button>

        {/* ── DRAWDOWN ALERT ── */}
        {!dismissAlert && trades.currentDrawdownPct > 0 && trades.stats.maxDrawdownPct > 0 &&
          trades.currentDrawdownPct > trades.stats.maxDrawdownPct * 0.7 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-400">Drawdown Warning</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {'\u2212'}{trades.currentDrawdownPct.toFixed(1)}% from peak (${fmt(trades.peakEquity)}).
                {' '}Max historical: {'\u2212'}{trades.stats.maxDrawdownPct.toFixed(1)}%.
              </div>
            </div>
            <button onClick={() => { setDismissAlert(true); sessionStorage.setItem('dd-dismiss', '1'); }} className="p-2 -m-2 text-slate-600 hover:text-slate-400 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* ── STAT PILLS / EMPTY STATE ── */}
        {trades.stats.totalTrades === 0 ? (
          /* ═══ EMPTY STATE — single onboarding block ═══ */
          <>
            {/* Muted stat placeholders */}
            <div className="grid grid-cols-4 gap-2 opacity-40">
              {[{l:'Trades',v:'0'},{l:'Win Rate',v:'--'},{l:'Streak',v:'--'},{l:'30 Days',v:'--'}].map((s,i) => (
                <div key={i} className="bg-surface/80 rounded-xl p-3 text-center border border-line/50">
                  <div className="text-base font-bold font-mono text-white">{s.v}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Risk Explorer */}
            <motion.div
              className="bg-surface rounded-2xl p-5 border border-line space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Risk Explorer</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">See your next trade's risk at any equity level</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold font-mono tabular-nums text-white">${fmt(exploreEq)}</div>
                <span className={'text-xs font-semibold px-2 py-1 rounded-lg border ' +
                  (getPhase(exploreEq) === 'pre' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                   getPhase(exploreEq) === 'anchor' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                   'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}>
                  {getPhaseName(getPhase(exploreEq))}
                </span>
              </div>
              <div>
                <input
                  type="range"
                  min={20000}
                  max={110000}
                  step={500}
                  value={exploreEq}
                  onChange={e => setExploreEq(+e.target.value)}
                  className="w-full accent-[#00e5cc] h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: '#1a2030' }}
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono tabular-nums mt-1 px-0.5">
                  <span>$20K</span><span>$100K</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-deep rounded-xl p-2.5 border border-line/50">
                  <div className={'text-sm font-bold font-mono tabular-nums ' + (riskSeverity(rN(exploreEq) * 100) === 'safe' ? 'text-amber-400' : riskSeverity(rN(exploreEq) * 100) === 'elevated' ? 'text-orange-400' : 'text-rose-400')}>{(rN(exploreEq) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Risk</div>
                </div>
                <div className="bg-deep rounded-xl p-2.5 border border-line/50">
                  <div className="text-sm font-bold font-mono tabular-nums text-rose-400">${fmt(r$N(exploreEq))}</div>
                  <div className="text-xs text-slate-500 mt-0.5">At Risk</div>
                </div>
                <div className="bg-deep rounded-xl p-2.5 border border-line/50">
                  <div className="text-sm font-bold font-mono tabular-nums text-amber-400">${fmt(r$N(exploreEq) * 2)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">2R Gain</div>
                </div>
              </div>
              {riskSeverity(rN(exploreEq) * 100) === 'danger' && (
                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Below $87.5K, position sizing is aggressive by design — this is the high-risk growth phase.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Summit Tracker — full milestone list for empty state */}
            <motion.div
              className="bg-surface rounded-xl p-4 border border-line/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Summit Tracker</span>
                </div>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {summitData.achievedCount}/{MILES.length} cleared
                </span>
              </div>
              <div className="space-y-1.5">
                {summitData.miles.map((m, i) => {
                  const toGoM = m.v - eq;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      m.achieved ? 'bg-amber-500/5 border border-amber-500/15' :
                      m.isNext ? 'bg-deep border border-[#00e5cc]/20' :
                      'bg-deep/50 border border-line/30 opacity-50'
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        m.achieved ? 'bg-amber-500 text-black font-bold' :
                        m.isNext ? 'bg-[#00e5cc]/15 text-[#00e5cc] ring-1 ring-[#00e5cc]/30' :
                        'bg-elevated text-slate-600'
                      }`}>
                        {m.achieved ? '✓' : m.isNext ? '▲' : '○'}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-bold font-mono tabular-nums text-white">{m.l}</span>
                        {m.isNext && <span className="text-[10px] text-slate-500 ml-2 font-mono">${fmt(toGoM)} to go</span>}
                      </div>
                      {m.isNext && (
                        <span className="text-xs text-[#00e5cc] font-mono font-semibold">{summitData.segPct.toFixed(0)}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-line/30">
                <p className="text-[11px] text-slate-500 text-center">
                  Log your first trade to start tracking milestones from $100K to $10M.
                </p>
              </div>
            </motion.div>
          </>
        ) : (
        <>
          {/* Stat pills row */}
          <motion.div
            className="grid grid-cols-4 gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {stats.map((s, i) => (
              <div key={i} className="bg-surface/80 backdrop-blur-sm rounded-xl p-3 text-center border border-line">
                <div className={'text-base font-bold font-mono tabular-nums ' + s.c}
                  style={s.glow ? { textShadow: '0 0 12px rgba(252, 211, 77, 0.5)' } : undefined}>{s.v}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </motion.div>

          {/* ── RISK CARD ── */}
          <motion.div
            className="bg-surface rounded-2xl p-5 border border-line"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Next Trade Risk
              </span>
            </div>

            <RiskGauge riskPct={rPct} riskDol={trades.nextRisk.dol} />

            <button
              onClick={() => setShowPhaseInfo(!showPhaseInfo)}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors text-slate-500 hover:text-slate-300 hover:bg-elevated/50"
            >
              <Info className="w-3 h-3" />
              {rSev === 'danger' ? 'Why so high?' : 'About this phase'}
            </button>
            <AnimatePresence>
              {showPhaseInfo && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-slate-400 leading-relaxed mt-2 px-1"
                >
                  {PHASE_INFO[phase]}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── SPARKLINE (tap to expand) ── */}
          {sparkData.length > 1 && (
            <motion.div
              className="bg-surface rounded-xl p-3 border border-line/50 cursor-pointer group"
              onClick={() => setShowCurve(true)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">P&L Curve</span>
                <span className="text-xs text-amber-400/70 font-mono tabular-nums">Peak: ${fmt(sparkMax)}</span>
              </div>
              <svg className="w-full h-16" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkClr} stopOpacity=".3" />
                    <stop offset="100%" stopColor={sparkClr} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparkAreaPath} fill="url(#sparkFill)" />
                <path d={sparkPath} fill="none" stroke={sparkClr} strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={peakPt.x} cy={peakPt.y} r="3" fill="#f59e0b" opacity="0.25" />
                <circle cx={peakPt.x} cy={peakPt.y} r="1.5" fill="#f59e0b" />
                <circle cx={sparkEndPt.x} cy={sparkEndPt.y} r="3" fill={sparkClr} opacity="0.25" />
                <circle cx={sparkEndPt.x} cy={sparkEndPt.y} r="1.5" fill={sparkClr} />
              </svg>
            </motion.div>
          )}

          {/* ── SUMMIT TRACKER (with milestone list) ── */}
          <motion.div
            className="bg-surface rounded-xl p-4 border border-line/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Summit Tracker</span>
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {summitData.achievedCount}/{MILES.length} cleared
              </span>
            </div>

            {summitData.nextM ? (
              <>
                <div className="bg-deep rounded-lg p-3 border border-line/50 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      Next: <span className="text-amber-400 font-semibold font-mono">{summitData.nextM.l}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold tabular-nums">
                      {summitData.segPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #10b981, #f59e0b)' }}
                      initial={{ width: 0 }}
                      animate={{ width: Math.max(1, summitData.segPct) + '%' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    <span>${fmt(eq)}</span>
                    <span>${fmt(summitData.toGo)} to go</span>
                  </div>
                  {estDate && (
                    <div className="text-[10px] text-slate-500 text-center mt-1.5 font-mono">
                      Est. {estDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                {/* Full milestone list */}
                <div className="space-y-1.5">
                  {summitData.miles.map((m, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      m.achieved ? 'bg-amber-500/5 border border-amber-500/15' :
                      m.isNext ? 'bg-deep border border-[#00e5cc]/20' :
                      'bg-deep/40 border border-transparent opacity-45'
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        m.achieved ? 'bg-amber-500 text-black font-bold' :
                        m.isNext ? 'bg-[#00e5cc]/15 text-[#00e5cc] ring-1 ring-[#00e5cc]/30' :
                        'bg-elevated text-slate-600'
                      }`}>
                        {m.achieved ? '✓' : m.isNext ? '▲' : '○'}
                      </div>
                      <span className="text-sm font-bold font-mono tabular-nums text-white flex-1">{m.l}</span>
                      {m.isNext && (
                        <span className="text-xs text-[#00e5cc] font-mono">{summitData.segPct.toFixed(0)}%</span>
                      )}
                      {m.achieved && (
                        <span className="text-[10px] text-amber-400/60 font-mono">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20 text-center">
                <span className="text-sm font-bold text-emerald-400">Summit Reached!</span>
              </div>
            )}
          </motion.div>
        </>
        )}
      </div>

      {/* ═══════════════════════════════════════
          Equity Curve Modal Overlay
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showCurve && (
          <motion.div
            className="fixed inset-0 z-[55] flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-deep/95 backdrop-blur-sm" onClick={() => setShowCurve(false)} />
            <div className="relative flex-1 flex flex-col p-4 pt-10 max-w-lg md:max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Profit & Loss Curve</h2>
                <button onClick={() => setShowCurve(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <EquityCurve trades={trades} height={320} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-500')}>
                    {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                  </div>
                  <div className="text-xs text-slate-500">Total P&L</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className="text-base font-bold font-mono tabular-nums text-white">{trades.stats.totalTrades}</div>
                  <div className="text-xs text-slate-500">Trades</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className="text-base font-bold font-mono tabular-nums text-amber-400">${fmt(trades.peakEquity)}</div>
                  <div className="text-xs text-slate-500">Peak</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
