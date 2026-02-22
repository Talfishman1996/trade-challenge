import React, { useState, useMemo } from 'react';
import { Zap, TrendingUp, Trophy, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, r$N, getPhaseName, getPhase, riskSeverity } from '../math/risk.js';
import { E0, MILES } from '../math/constants.js';
import EquityCurve from './EquityCurve.jsx';

const PHASE_INFO = {
  pre: 'Aggressive growth mode. High risk compounds your account toward the $87.5K anchor. This is by design.',
  anchor: 'Balanced zone. Risk is at the Kelly-optimal 33% level.',
  model: 'Decay active. Risk shrinks as portfolio grows, protecting gains.',
};

function RiskGauge({ riskPct, riskDol }) {
  const sev = riskSeverity(riskPct);
  const textCls = sev === 'safe' ? 'text-amber-400' : sev === 'elevated' ? 'text-orange-400' : 'text-red-500';
  const barCls = sev === 'safe' ? 'bg-amber-500' : sev === 'elevated' ? 'bg-orange-500' : 'bg-red-500';
  const glowCls = sev === 'safe' ? 'shadow-amber-500/30' : sev === 'elevated' ? 'shadow-orange-500/30' : 'shadow-red-500/30';

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold font-mono tabular-nums ${textCls}`}>${fmt(riskDol)}</span>
        <span className={`text-lg font-bold font-mono tabular-nums ${textCls}`}>{riskPct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barCls} shadow-lg ${glowCls} transition-all duration-500`}
          style={{ width: Math.min(100, riskPct) + '%' }} />
      </div>
      <div className="text-xs text-slate-500">risk on next trade</div>
    </div>
  );
}

export default function Home({ trades, settings, onOpenTradeEntry }) {
  const [showCurve, setShowCurve] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [dismissAlert, setDismissAlert] = useState(false);
  const [exploreEq, setExploreEq] = useState(20000);

  const eq = trades.currentEquity;
  const phase = getPhase(eq);
  const rPct = trades.nextRisk.pct * 100;
  const rSev = riskSeverity(rPct);
  const rColor = rSev === 'safe' ? 'text-amber-400' : rSev === 'elevated' ? 'text-orange-400' : 'text-red-500';
  const hasTrades = trades.stats.totalTrades > 0;
  const inProfit = trades.stats.totalPnl >= 0;
  const heroGradient = !hasTrades
    ? '#475569, #0ea5e9, #475569'
    : inProfit ? '#10b981, #0ea5e9, #f59e0b, #10b981' : '#ef4444, #f97316, #ef4444';
  const heroInnerGlow = !hasTrades ? 'transparent'
    : inProfit ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const shimmerHighlight = inProfit ? '#a5f3fc' : '#fca5a5';

  const nextMilestone = trades.milestones.find(m => !m.achieved);

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

  // Summit tracker (log-scale $20K to $10M)
  const summitMiles = useMemo(() => {
    const logS = Math.log10(20000);
    const logE = Math.log10(10000000);
    const logR = logE - logS;
    return MILES.map(m => {
      const t = (Math.log10(m.v) - logS) / logR;
      const prev = MILES.filter(p => p.v < m.v);
      return { ...m, t, x: 10 + t * 280, y: 110 - t * 98, achieved: eq >= m.v,
        isNext: eq < m.v && prev.every(p => eq >= p.v || p.v >= m.v) };
    });
  }, [eq]);
  const summitT = useMemo(() => {
    const logS = Math.log10(20000);
    const logR = Math.log10(10000000) - logS;
    return Math.max(0, Math.min(1, (Math.log10(Math.max(eq, 20000)) - logS) / logR));
  }, [eq]);
  const summitX = 10 + summitT * 280;
  const summitY = 110 - summitT * 98;

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
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-3xl mx-auto space-y-4">
      {/* 1. EQUITY HERO — Premium Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative p-[1px] rounded-2xl"
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(270deg, ${heroGradient})`,
            backgroundSize: '300% 300%',
            animation: 'border-flow 6s ease infinite',
          }} />

        {/* Card body */}
        <div className="relative rounded-2xl p-6 overflow-hidden" style={{ background: '#0D1117' }}>
          {/* Breathing inner glow */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${heroInnerGlow} 0%, transparent 65%)`,
              animation: 'glow-breathe 4s ease-in-out infinite',
            }} />

          <div className="relative text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium mb-2">Portfolio Value</div>

            {/* The number — with shimmer sweep */}
            <div className="text-5xl font-bold font-mono tabular-nums tracking-tight"
              style={{
                background: `linear-gradient(110deg, #ffffff 35%, ${shimmerHighlight} 50%, #ffffff 65%)`,
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'text-shimmer 5s ease-in-out infinite',
              }}>
              ${fmt(eq)}
            </div>

            {hasTrades ? (
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <span className={'text-sm font-semibold font-mono tabular-nums ' + (inProfit ? 'text-emerald-400' : 'text-red-500')}>
                  {inProfit ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                </span>
                <span className={'text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ' + (inProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                  {inProfit ? '+' : ''}{((eq - trades.initialEquity) / trades.initialEquity * 100).toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">Starting equity</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* DRAWDOWN ALERT */}
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
          <button onClick={() => setDismissAlert(true)} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* 2. DESKTOP GRID: Risk card + right panel */}
      {trades.stats.totalTrades === 0 ? (
        /* EMPTY STATE: Risk Explorer + CTA */
        <div className="bg-surface rounded-2xl p-5 border border-line space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">Explore the Risk Model</div>
            <p className="text-xs text-slate-500 mt-1">Drag to see how risk scales as equity grows.</p>
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
          <input type="range" min={20000} max={110000} step={500} value={exploreEq}
            onChange={e => setExploreEq(+e.target.value)}
            className="w-full" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-deep rounded-xl p-2.5 border border-line/50">
              <div className={'text-sm font-bold font-mono tabular-nums ' + (riskSeverity(rN(exploreEq) * 100) === 'safe' ? 'text-amber-400' : riskSeverity(rN(exploreEq) * 100) === 'elevated' ? 'text-orange-400' : 'text-red-500')}>{(rN(exploreEq) * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Risk</div>
            </div>
            <div className="bg-deep rounded-xl p-2.5 border border-line/50">
              <div className="text-sm font-bold font-mono tabular-nums text-red-500">${fmt(r$N(exploreEq))}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">At Risk</div>
            </div>
            <div className="bg-deep rounded-xl p-2.5 border border-line/50">
              <div className="text-sm font-bold font-mono tabular-nums text-amber-400">${fmt(r$N(exploreEq) * 2)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">2R Gain</div>
            </div>
          </div>
          <button
            onClick={() => onOpenTradeEntry()}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm rounded-xl active:scale-[0.98] hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <TrendingUp className="w-5 h-5" /> Log Your First Trade
          </button>
        </div>
      ) : (
      <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">

      {/* HERO RISK CARD */}
      <div className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex items-center gap-2 mb-3">
          <Zap className={`w-3.5 h-3.5 ${rColor}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${rColor}`}>
            Next Trade Risk
          </span>
        </div>

        <RiskGauge riskPct={rPct} riskDol={trades.nextRisk.dol} />

        <button
          onClick={() => setShowPhaseInfo(!showPhaseInfo)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-300 hover:bg-elevated/50"
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
      </div>

      {/* Right column on desktop */}
      <div className="space-y-4">
        {/* 3. LOG TRADE CTA */}
        <button
          onClick={() => onOpenTradeEntry()}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-base rounded-xl active:scale-[0.98] hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <TrendingUp className="w-5 h-5" /> Log Trade
        </button>

        {/* 4. QUICK STATS ROW */}
        <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <div key={i} className="bg-surface rounded-xl p-2.5 text-center border border-line/50">
              <div className={'text-sm font-bold font-mono tabular-nums ' + s.c}
                style={s.glow ? { textShadow: '0 0 12px rgba(252, 211, 77, 0.5)' } : undefined}>{s.v}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* 5. SPARKLINE (tap to expand) */}
        {sparkData.length > 1 && (
          <div className="bg-surface rounded-xl p-3 border border-line/50 cursor-pointer group"
            onClick={() => setShowCurve(true)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-600 font-medium">P&L Curve</span>
              <span className="text-[10px] text-amber-400/70 font-mono tabular-nums">Peak: ${fmt(sparkMax)}</span>
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
          </div>
        )}

        {/* Next milestone is integrated into Summit Tracker below */}
      </div>
      </div>
      )}

      {/* 7. SUMMIT TRACKER */}
      <div className="bg-surface rounded-xl p-3 border border-line/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Summit</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tabular-nums">
            ${fmt(eq)} of $10M
          </span>
        </div>

        <svg viewBox="0 0 300 130" className="w-full" style={{ height: 130 }} aria-label="Journey to $10M">
          <polygon points="0,130 20,95 50,105 85,70 120,82 160,52 200,65 240,30 270,18 295,10 300,8 300,130"
            fill="#1C2333" opacity="0.3" />

          <line x1={10} y1={110} x2={summitX} y2={summitY}
            stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <line x1={summitX} y1={summitY} x2={290} y2={12}
            stroke="#2D3748" strokeWidth="1.5" strokeDasharray="4,4" />

          <text x="8" y="122" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="#475569">$20K</text>

          {summitMiles.map((m, i) => (
            <g key={i}>
              {m.achieved && <circle cx={m.x} cy={m.y} r="8" fill="#10b981" opacity="0.1" />}
              <circle cx={m.x} cy={m.y} r={m.achieved ? 5 : 3.5}
                fill={m.achieved ? '#10b981' : m.isNext ? '#0D1117' : '#2D3748'}
                stroke={m.isNext ? '#f59e0b' : 'none'} strokeWidth={m.isNext ? 2 : 0} />
              <text x={m.x} y={m.y + 15} textAnchor="middle"
                fontSize="9" fontFamily="'JetBrains Mono', monospace"
                fill={m.achieved ? '#94a3b8' : m.isNext ? '#f59e0b' : '#475569'}>
                {m.l}
              </text>
            </g>
          ))}

          <circle cx={summitX} cy={summitY} r="7" fill="#10b981" opacity="0.2" />
          <circle cx={summitX} cy={summitY} r="3.5" fill="#10b981" />

          <polygon points="286,8 290,0 294,8" fill="#f59e0b" opacity="0.8" />
          <text x="290" y="20" textAnchor="middle" fontSize="7" fill="#f59e0b" fontFamily="'JetBrains Mono', monospace" opacity="0.6">$10M</text>
        </svg>

        {nextMilestone && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">Next: <span className="text-amber-400 font-mono font-semibold">{nextMilestone.l}</span></span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">{nextMilestone.progress.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-elevated rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-500/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: Math.max(1, nextMilestone.progress) + '%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        )}
      </div>

      {/* Equity Curve Overlay */}
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
                  <div className="text-xs text-slate-600">Total P&L</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className="text-base font-bold font-mono tabular-nums text-white">{trades.stats.totalTrades}</div>
                  <div className="text-xs text-slate-600">Trades</div>
                </div>
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className="text-base font-bold font-mono tabular-nums text-amber-400">${fmt(trades.peakEquity)}</div>
                  <div className="text-xs text-slate-600">Peak</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
