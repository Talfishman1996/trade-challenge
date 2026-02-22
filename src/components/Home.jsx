import React, { useState, useMemo } from 'react';
import { Shield, Target, Flame, Zap, TrendingUp, TrendingDown, Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, getPhaseName, getPhase } from '../math/risk.js';
import { E0 } from '../math/constants.js';
import GPSJourney from './GPSJourney.jsx';
import TradeEntry from './TradeEntry.jsx';
import EquityCurve from './EquityCurve.jsx';

export default function Home({ trades, settings }) {
  const [showEntry, setShowEntry] = useState(false);
  const [showCurve, setShowCurve] = useState(false);

  const eq = trades.currentEquity;
  const phase = getPhase(eq);
  const ZIcon = phase === 'pre' ? Flame : phase === 'anchor' ? Target : Shield;
  const phaseColor = phase === 'pre' ? 'text-amber-400' : phase === 'anchor' ? 'text-emerald-400' : 'text-cyan-400';

  // Next milestone
  const nextMilestone = trades.milestones.find(m => !m.achieved);
  const lastAchieved = [...trades.milestones].reverse().find(m => m.achieved);

  // Mini sparkline data
  const sparkData = useMemo(() => {
    const pts = [trades.initialEquity, ...trades.trades.map(t => t.equityAfter)];
    return pts.slice(-20);
  }, [trades.trades, trades.initialEquity]);

  const sparkMin = Math.min(...sparkData);
  const sparkMax = Math.max(...sparkData);
  const sparkRange = sparkMax - sparkMin || 1;

  // Sparkline computed values
  const sparkClr = sparkData.length > 1 && sparkData[sparkData.length - 1] >= sparkData[0] ? '#10b981' : '#ef4444';
  const sparkPts = sparkData.map((v, i) => `${i},${40 - ((v - sparkMin) / sparkRange) * 36}`).join(' ');
  const sparkArea = sparkPts + ` ${sparkData.length - 1},40 0,40`;
  const sparkEndY = 40 - ((sparkData[sparkData.length - 1] - sparkMin) / sparkRange) * 36;

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-emerald-400">APEX</h1>
            <p className="text-slate-500 text-[10px] font-medium tracking-wide">{'\u2154'} POWER DECAY</p>
          </div>
        </div>
        <div className={'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ' +
          (phase === 'pre' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
           phase === 'anchor' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
           'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')}>
          <ZIcon className="w-3.5 h-3.5" /> {getPhaseName(phase)}
        </div>
      </div>

      {/* Equity Hero */}
      <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-800">
        <div className="text-xs text-slate-500 font-medium mb-1">Portfolio Equity</div>
        <motion.div
          className="text-4xl font-bold font-mono tracking-tight text-white tabular-nums"
          key={eq}
          initial={{ scale: 1.05, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          ${fmt(eq)}
        </motion.div>

        {/* Sparkline with area fill (tap to expand) */}
        {sparkData.length > 1 && (
          <div className="cursor-pointer group" onClick={() => setShowCurve(true)}>
            <svg className="w-full h-12 mt-3" viewBox={`0 0 ${sparkData.length - 1} 42`} preserveAspectRatio="none">
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
            <div className="text-center text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Tap to expand</div>
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { l: 'Trades', v: trades.stats.totalTrades, c: 'text-white' },
            { l: 'Win Rate', v: trades.stats.totalTrades > 0 ? trades.stats.winRate.toFixed(0) + '%' : '--', c: 'text-white' },
            { l: 'Streak', v: trades.stats.currentStreak > 0 ? (trades.stats.streakType === 'win' ? '+' : '-') + trades.stats.currentStreak : '--', c: trades.stats.streakType === 'win' ? 'text-emerald-400' : trades.stats.streakType === 'loss' ? 'text-rose-400' : 'text-white' },
            { l: 'Peak', v: '$' + fmt(trades.peakEquity), c: 'text-white' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className={'text-sm font-bold font-mono tabular-nums ' + s.c}>{s.v}</div>
              <div className="text-xs text-slate-600">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Trade Risk - THE key actionable card */}
      {(() => {
        const rPct = trades.nextRisk.pct * 100;
        const isAggressive = rPct > 50;
        const accent = isAggressive ? 'amber' : 'emerald';
        return (
          <div className={`rounded-2xl p-5 border ring-1 card-breathe ${isAggressive ? 'bg-amber-500/5 border-amber-500/20 ring-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/20 ring-emerald-500/10'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className={`w-4 h-4 ${isAggressive ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${isAggressive ? 'text-amber-400' : 'text-emerald-400'}`}>Next Trade</span>
              {isAggressive && <span className="text-[10px] text-amber-500/70 font-medium ml-auto">Aggressive Phase</span>}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
                ${fmt(trades.nextRisk.dol)}
              </span>
              <span className={`text-lg font-bold font-mono tabular-nums ${isAggressive ? 'text-amber-400' : 'text-emerald-400'}`}>
                {rPct.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Maximum risk on your next trade</p>
          </div>
        );
      })()}

      {/* Log Trade Button */}
      <button
        onClick={() => setShowEntry(true)}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-base rounded-xl active:scale-[0.98] hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        <TrendingUp className="w-5 h-5" /> Log Trade
      </button>

      {/* Milestone Progress */}
      {nextMilestone && (
        <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400 font-medium">Next Milestone</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">{nextMilestone.l}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
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

      {/* GPS Funnel (compact, only pre-anchor) */}
      {eq < 110000 && (
        <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 flex justify-center">
          <GPSJourney equity={eq} compact />
        </div>
      )}

      {/* Today summary */}
      {trades.stats.todayTrades > 0 && (
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
          <div className="text-xs text-slate-500 font-medium mb-2">Today</div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">{trades.stats.todayTrades} trade{trades.stats.todayTrades !== 1 ? 's' : ''}</span>
            <span className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.todayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {trades.stats.todayPnl >= 0 ? '+' : ''}{fmt(trades.stats.todayPnl)}
            </span>
          </div>
        </div>
      )}

      {/* Equity Curve Overlay */}
      <AnimatePresence>
        {showCurve && (
          <motion.div
            className="fixed inset-0 z-[55] flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" onClick={() => setShowCurve(false)} />
            <div className="relative flex-1 flex flex-col p-4 pt-10 max-w-lg mx-auto w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Equity Curve</h2>
                <button onClick={() => setShowCurve(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <EquityCurve trades={trades} height={320} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-slate-900/70 rounded-xl p-3 text-center border border-slate-800">
                  <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                  </div>
                  <div className="text-xs text-slate-600">Total P&L</div>
                </div>
                <div className="bg-slate-900/70 rounded-xl p-3 text-center border border-slate-800">
                  <div className="text-base font-bold font-mono tabular-nums text-white">{trades.stats.totalTrades}</div>
                  <div className="text-xs text-slate-600">Trades</div>
                </div>
                <div className="bg-slate-900/70 rounded-xl p-3 text-center border border-slate-800">
                  <div className="text-base font-bold font-mono tabular-nums text-amber-400">${fmt(trades.peakEquity)}</div>
                  <div className="text-xs text-slate-600">Peak</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Entry Modal */}
      <TradeEntry
        open={showEntry}
        onClose={() => setShowEntry(false)}
        onSave={trades.addTrade}
        currentEquity={eq}
        nextRisk={trades.nextRisk}
      />
    </div>
  );
}
