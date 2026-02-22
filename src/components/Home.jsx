import React, { useState, useMemo } from 'react';
import { Shield, Target, Flame, Zap, TrendingUp, Trophy, X, Info, Navigation2, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, getPhaseName, getPhase } from '../math/risk.js';
import { E0, GPS_Z } from '../math/constants.js';
import EquityCurve from './EquityCurve.jsx';
import GPSJourney from './GPSJourney.jsx';

const PHASE_INFO = {
  pre: 'Aggressive growth mode. High risk compounds your account toward the $87.5K anchor. This is by design.',
  anchor: 'Balanced zone. Risk is at the Kelly-optimal 33% level.',
  model: 'Decay active. Risk shrinks as portfolio grows, protecting gains.',
};

function RiskGauge({ riskPct, riskDol, phase }) {
  // Semicircular arc gauge
  const r = 76, cx = 100, cy = 96;
  const circumference = Math.PI * r; // half-circle arc length
  const fillLen = (riskPct / 100) * circumference;
  const isAggressive = riskPct > 50;
  const strokeColor = isAggressive ? '#f59e0b' : '#10b981';
  const glowColor = isAggressive ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-56 h-auto">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${fillLen} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
        {/* Center dollar amount */}
        <text x={cx} y={cy - 24} textAnchor="middle"
          className="text-3xl font-bold font-mono" fill="white" fontSize="32" fontWeight="700"
          fontFamily="'JetBrains Mono', ui-monospace, monospace">
          ${fmt(riskDol)}
        </text>
        {/* Percentage below */}
        <text x={cx} y={cy - 2} textAnchor="middle"
          fill={strokeColor} fontSize="16" fontWeight="600"
          fontFamily="'JetBrains Mono', ui-monospace, monospace">
          {riskPct.toFixed(1)}%
        </text>
      </svg>
      <span className="text-xs text-slate-500 -mt-2">risk on next trade</span>
    </div>
  );
}

export default function Home({ trades, settings, onOpenTradeEntry }) {
  const [showCurve, setShowCurve] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [dismissAlert, setDismissAlert] = useState(false);

  const eq = trades.currentEquity;
  const phase = getPhase(eq);
  const rPct = trades.nextRisk.pct * 100;
  const ZIcon = phase === 'pre' ? Flame : phase === 'anchor' ? Target : Shield;
  const phaseColor = phase === 'pre' ? 'text-amber-400' : phase === 'anchor' ? 'text-emerald-400' : 'text-cyan-400';
  const phaseBg = phase === 'pre' ? 'bg-amber-500/10 border-amber-500/20' : phase === 'anchor' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20';

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
  const sparkPts = sparkData.map((v, i) => `${i},${40 - ((v - sparkMin) / sparkRange) * 36}`).join(' ');
  const sparkArea = sparkPts + ` ${sparkData.length - 1},40 0,40`;
  const sparkEndY = 40 - ((sparkData[sparkData.length - 1] - sparkMin) / sparkRange) * 36;

  // Journey progress (log-scale mapping from $20K to $110K)
  const journeyPct = useMemo(() => {
    const logMin = Math.log10(20000);
    const logMax = Math.log10(110000);
    const t = (Math.log10(Math.max(eq, 20000)) - logMin) / (logMax - logMin);
    return Math.max(0, Math.min(100, t * 100));
  }, [eq]);
  const journeyClr = eq >= 87500 ? '#10b981' : eq >= 50000 ? '#eab308' : '#ef4444';
  const journeyZone = eq >= 100000 ? 'Goal' : eq >= 87500 ? 'Basecamp' : eq >= 50000 ? 'Danger Zone' : 'Wipe Zone';

  // Stats data
  const stats = [
    { l: 'Trades', v: trades.stats.totalTrades, c: 'text-white' },
    { l: 'Win Rate', v: trades.stats.totalTrades > 0 ? trades.stats.winRate.toFixed(0) + '%' : '--', c: 'text-white' },
    {
      l: 'Streak',
      v: trades.stats.currentStreak > 0
        ? (trades.stats.streakType === 'win' ? '+' : '-') + trades.stats.currentStreak
        : '--',
      c: trades.stats.streakType === 'win' ? 'text-emerald-400' : trades.stats.streakType === 'loss' ? 'text-rose-400' : 'text-white'
    },
    {
      l: 'Today',
      v: trades.stats.todayTrades > 0
        ? (trades.stats.todayPnl >= 0 ? '+$' : '-$') + fmt(Math.abs(trades.stats.todayPnl))
        : '--',
      c: trades.stats.todayPnl > 0 ? 'text-emerald-400' : trades.stats.todayPnl < 0 ? 'text-rose-400' : 'text-white'
    },
  ];

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-3xl mx-auto space-y-4">
      {/* 1. EQUITY HERO */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold font-mono tabular-nums tracking-tight text-white">${fmt(eq)}</div>
          {trades.stats.totalTrades > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <span className={'text-sm font-semibold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
              </span>
              <span className={'text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ' + (trades.stats.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                {trades.stats.totalPnl >= 0 ? '+' : ''}{((eq - trades.initialEquity) / trades.initialEquity * 100).toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-1">Starting equity</div>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${phaseBg} ${phaseColor}`}>
          <ZIcon className="w-3 h-3" /> {getPhaseName(phase)}
        </div>
      </div>

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
      <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">

      {/* HERO RISK CARD */}
      <div className="bg-surface rounded-2xl p-6 pt-4 border border-line flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1 self-start">
          <Zap className={`w-3.5 h-3.5 ${rPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${rPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
            Next Trade Risk
          </span>
        </div>

        <RiskGauge riskPct={rPct} riskDol={trades.nextRisk.dol} phase={phase} />

        {/* Phase explanation */}
        <button
          onClick={() => setShowPhaseInfo(!showPhaseInfo)}
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${rPct > 50 ? 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-elevated/50'}`}
        >
          <Info className="w-3 h-3" />
          {rPct > 50 ? 'Why so high?' : 'About this phase'}
        </button>
        <AnimatePresence>
          {showPhaseInfo && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-slate-400 leading-relaxed text-center mt-2 px-2"
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
              <div className={'text-sm font-bold font-mono tabular-nums ' + s.c}>{s.v}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* 5. SPARKLINE (tap to expand) */}
        {sparkData.length > 1 && (
          <div className="bg-surface rounded-xl p-3 border border-line/50 cursor-pointer group"
            onClick={() => setShowCurve(true)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-600 font-medium">Equity Curve</span>
              <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Tap to expand</span>
            </div>
            <svg className="w-full h-10" viewBox={`0 0 ${sparkData.length - 1} 42`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkClr} stopOpacity=".3" />
                  <stop offset="100%" stopColor={sparkClr} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={sparkArea} fill="url(#sparkFill)" />
              <polyline fill="none" stroke={sparkClr} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" points={sparkPts} />
              <circle cx={sparkData.length - 1} cy={sparkEndY} r="2" fill={sparkClr} />
            </svg>
          </div>
        )}

        {/* 6. MILESTONE PROGRESS (slim) */}
      {nextMilestone && (
        <div className="bg-surface rounded-xl p-3 border border-line/50">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-400 font-medium">Next Milestone</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">{nextMilestone.l}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: Math.max(1, nextMilestone.progress) + '%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums w-12 text-right">
              {nextMilestone.progress.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      </div>{/* end right column */}
      </div>{/* end desktop grid */}

      {/* 7. GPS JOURNEY (collapsible) */}
      <div className="bg-surface rounded-xl border border-line/50 overflow-hidden">
        <button
          onClick={() => setShowJourney(!showJourney)}
          className="w-full flex items-center gap-2.5 p-3 hover:bg-elevated/30 transition-colors"
        >
          <Navigation2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Journey</span>
          <div className="flex-1 relative h-1.5 rounded-full mx-1">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(to right, #ef4444, #eab308 54%, #10b981 87%, #22c55e)' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-deep"
              style={{ left: `calc(${journeyPct}% - 5px)`, backgroundColor: journeyClr, boxShadow: `0 0 6px ${journeyClr}` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{journeyZone}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform duration-200 ${showJourney ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showJourney && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col items-center pt-1 pb-4 px-3 border-t border-line/50">
                <GPSJourney equity={eq} compact />
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                  {GPS_Z.map((z, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.c, boxShadow: eq >= z.eq ? `0 0 4px ${z.c}` : 'none' }} />
                      <span className={`text-[10px] font-mono ${eq >= z.eq ? z.tc : 'text-slate-600'}`}>{z.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                <h2 className="text-lg font-bold text-white">Equity Curve</h2>
                <button onClick={() => setShowCurve(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <EquityCurve trades={trades} height={320} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-surface rounded-xl p-3 text-center border border-line">
                  <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
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
