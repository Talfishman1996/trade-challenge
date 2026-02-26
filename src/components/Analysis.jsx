import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Brain, Rocket, Zap, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, r$N, lossesToWipe, calcStreak } from '../math/risk.js';
import { computeMilestones } from '../math/monte-carlo.js';
import { calcAdvancedMetrics, calcTagAnalytics, calcMAEMFE, calcDurationCorrelation } from '../math/analytics.js';
import { TT, AX } from '../math/constants.js';
import { Tip } from './MetricCard.jsx';
import ProbabilityCone from './GPSJourney.jsx';
import EquityCurve from './EquityCurve.jsx';
import Heatmap from './Heatmap.jsx';
import ScatterPlot from './ScatterPlot.jsx';

const TABS = [
  { id: 'performance', l: 'Performance', ic: TrendingUp },
  { id: 'behavioral', l: 'Behavioral', ic: Brain },
  { id: 'projections', l: 'Projections', ic: Rocket },
];

function SectionDivider({ title, subtitle }) {
  return (
    <div className="pt-5 pb-2 border-t border-line/60 mt-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ── Advanced Metrics Grid ──────────────────────────── */
function MetricsGrid({ metrics, stats }) {
  const items = [
    { label: 'Avg Win', value: '+$' + fmt(metrics.avgWin), c: 'text-emerald-400' },
    { label: 'Avg Loss', value: '-$' + fmt(metrics.avgLoss), c: 'text-red-400' },
    { label: 'Payoff', value: metrics.payoffRatio === Infinity ? '\u221E' : metrics.payoffRatio.toFixed(2), c: metrics.payoffRatio >= 1 ? 'text-emerald-400' : 'text-red-400', tip: 'Average win / average loss. Above 1 means you win more per trade than you lose.' },
    { label: 'Sharpe', value: metrics.sharpeRatio.toFixed(2), c: metrics.sharpeRatio > 0 ? 'text-emerald-400' : 'text-red-400', tip: 'Mean return / standard deviation. Higher = more consistent returns.' },
    { label: 'Sortino', value: metrics.sortinoRatio.toFixed(2), c: metrics.sortinoRatio > 0 ? 'text-emerald-400' : 'text-red-400', tip: 'Like Sharpe but only penalizes downside volatility. Ignores upside "risk".' },
    { label: 'Calmar', value: metrics.calmarRatio.toFixed(2), c: metrics.calmarRatio > 0 ? 'text-emerald-400' : 'text-red-400', tip: 'Total return / max drawdown. Measures return relative to worst drawdown.' },
    { label: 'Avg Hold', value: metrics.avgHoldDays > 0 ? metrics.avgHoldDays.toFixed(1) + 'd' : '--', c: 'text-slate-300' },
    { label: 'Long Win%', value: metrics.longWinPct > 0 ? metrics.longWinPct.toFixed(0) + '%' : '--', c: metrics.longWinPct >= 50 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Short Win%', value: metrics.shortWinPct > 0 ? metrics.shortWinPct.toFixed(0) + '%' : '--', c: metrics.shortWinPct >= 50 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Win Streak', value: String(metrics.maxConsecWins), c: 'text-emerald-400' },
    { label: 'Loss Streak', value: String(metrics.maxConsecLosses), c: 'text-red-400' },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2), c: stats.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400', tip: 'Gross wins / gross losses. Above 1 = profitable system.' },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map(item => (
        <div key={item.label} className="bg-deep rounded-lg p-2.5 text-center border border-line">
          <div className={'text-base font-bold font-mono tabular-nums ' + item.c}>{item.value}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{item.label}{item.tip && <Tip text={item.tip} />}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Tag Leaderboard ────────────────────────────────── */
function TagLeaderboard({ data, title }) {
  if (!data || data.length === 0) return null;
  const maxPnl = Math.max(...data.map(d => Math.abs(d.pnl)), 1);
  return (
    <div>
      <h4 className="text-sm font-bold text-white mb-2">{title}</h4>
      <div className="space-y-0">
        {data.slice(0, 8).map(t => (
          <div key={t.tag} className="flex items-center gap-2 py-1.5 border-b border-line/30 last:border-0">
            <span className="text-xs text-slate-400 w-24 truncate shrink-0">{t.tag}</span>
            <div className="flex-1 h-3 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: Math.max(3, (Math.abs(t.pnl) / maxPnl) * 100) + '%',
                  backgroundColor: t.pnl >= 0 ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            <span className={'text-xs font-mono tabular-nums w-16 text-right shrink-0 ' + (t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {t.pnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(t.pnl))}
            </span>
            <span className="text-[10px] text-slate-500 w-8 text-right shrink-0">{t.count}t</span>
            <span className={'text-[10px] font-medium w-10 text-right shrink-0 ' + (t.winRate >= 50 ? 'text-emerald-400/70' : 'text-red-400/70')}>
              {t.winRate.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function Analysis({ trades, settings }) {
  const realEq = trades.currentEquity;
  const wr = settings.winRate;
  const rr = settings.rewardRatio;

  const [tab, setTab] = useState('performance');
  const [simSeed, setSimSeed] = useState(555);
  const [projWr, setProjWr] = useState(wr);
  const [projRr, setProjRr] = useState(rr);

  // Advanced computed metrics
  const advMetrics = useMemo(() => calcAdvancedMetrics(trades.trades), [trades.trades]);
  const tagAnalytics = useMemo(() => calcTagAnalytics(trades.trades), [trades.trades]);
  const maeData = useMemo(() => calcMAEMFE(trades.trades), [trades.trades]);
  const durationData = useMemo(() => calcDurationCorrelation(trades.trades), [trades.trades]);
  const milestoneData = useMemo(() => computeMilestones(realEq, projWr, projRr, simSeed), [realEq, projWr, projRr, simSeed]);

  // Loss scenarios
  const d3 = ((realEq - calcStreak(realEq, 3, false, rr)) / realEq) * 100;
  const d5 = ((realEq - calcStreak(realEq, 5, false, rr)) / realEq) * 100;
  const ltw = lossesToWipe(realEq);

  const msA = milestoneData.filter(m => m.achieved);
  const msF = milestoneData.filter(m => !m.achieved);
  const hasTrades = trades.trades.length > 0;
  const hasTagData = tagAnalytics.setup.length > 0 || tagAnalytics.emotion.length > 0 || tagAnalytics.mistakes.length > 0;

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-4xl mx-auto space-y-4">
      {/* ── Tab Bar ── */}
      <div className="flex gap-1 pb-px border-b border-line/80">
        {TABS.map(t => {
          const Ic = t.ic;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap relative rounded-t-lg ' + (on ? 'text-emerald-400 bg-surface' : 'text-slate-500 hover:text-slate-300 hover:bg-surface/30')}>
              <Ic className="w-3.5 h-3.5" /> {t.l}
              {on && <motion.div layoutId="analysisTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="bg-surface rounded-2xl border border-line p-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

            {/* ═══════════ PERFORMANCE ═══════════ */}
            {tab === 'performance' && !hasTrades && (
              <div className="flex flex-col items-center py-10 px-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-emerald-400/50" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">No performance data yet</p>
                <p className="text-xs text-slate-500 text-center max-w-[260px] leading-relaxed">
                  Log trades to see your equity curve, win rate, drawdowns, and R-multiple distribution.
                </p>
              </div>
            )}
            {tab === 'performance' && hasTrades && (
              <div className="space-y-4">
                {/* Summary strip */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-deep rounded-xl p-2.5 text-center border border-line">
                    <div className={'text-lg font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Total P&L</div>
                  </div>
                  <div className="bg-deep rounded-xl p-2.5 text-center border border-line">
                    <div className={'text-lg font-bold font-mono tabular-nums ' + (trades.stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                      {trades.stats.winRate.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Win Rate</div>
                  </div>
                  <div className="bg-deep rounded-xl p-2.5 text-center border border-line">
                    <div className="text-lg font-bold font-mono tabular-nums text-amber-400">
                      ${fmt(trades.peakEquity)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Peak</div>
                  </div>
                  <div className="bg-deep rounded-xl p-2.5 text-center border border-line">
                    <div className="text-lg font-bold font-mono tabular-nums text-red-400">
                      {trades.stats.maxDrawdownPct > 0 ? '-' + trades.stats.maxDrawdownPct.toFixed(1) + '%' : '--'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Max DD</div>
                  </div>
                </div>

                {/* Equity Curve */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Equity Curve</h3>
                  <EquityCurve trades={trades} height={280} />
                </div>

                {/* Advanced Metrics */}
                <SectionDivider title="Performance Metrics" subtitle="Advanced statistics from your trade history." />
                <MetricsGrid metrics={advMetrics} stats={trades.stats} />

                {/* R-Multiple Distribution */}
                {trades.stats.rMultiples.length > 0 && (() => {
                  const rm = trades.stats.rMultiples;
                  const buckets = [
                    { range: '<-2R', count: 0, fill: '#ef4444' },
                    { range: '-2 to -1R', count: 0, fill: '#f87171' },
                    { range: '-1R to 0', count: 0, fill: '#fca5a5' },
                    { range: '0 to 1R', count: 0, fill: '#6ee7b7' },
                    { range: '1R to 2R', count: 0, fill: '#34d399' },
                    { range: '>2R', count: 0, fill: '#10b981' },
                  ];
                  for (const r of rm) {
                    if (r < -2) buckets[0].count++;
                    else if (r < -1) buckets[1].count++;
                    else if (r < 0) buckets[2].count++;
                    else if (r < 1) buckets[3].count++;
                    else if (r < 2) buckets[4].count++;
                    else buckets[5].count++;
                  }
                  const data = buckets.filter(b => b.count > 0);
                  const mean = trades.stats.avgR;
                  const variance = rm.reduce((s, r) => s + (r - mean) ** 2, 0) / rm.length;
                  const stddev = Math.sqrt(variance);
                  return (
                    <div className="pt-2">
                      <SectionDivider title="R-Multiple Distribution" subtitle="Each trade measured in risk units." />
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RTooltip contentStyle={TT} formatter={(v) => [v, 'Trades']} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-mono mt-1 px-1">
                        <span>Avg: <span className={mean >= 0 ? 'text-emerald-400' : 'text-red-400'}>{mean >= 0 ? '+' : ''}{mean.toFixed(2)}R</span></span>
                        <span>StdDev: <span className="text-slate-300">{stddev.toFixed(2)}R</span></span>
                        <span>Expect: <span className={trades.stats.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}>{trades.stats.expectancy >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.expectancy))}</span></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══════════ BEHAVIORAL ═══════════ */}
            {tab === 'behavioral' && !hasTrades && (
              <div className="flex flex-col items-center py-10 px-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <Brain className="w-7 h-7 text-blue-400/50" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">No behavioral data yet</p>
                <p className="text-xs text-slate-500 text-center max-w-[260px] leading-relaxed">
                  Log trades with tags, entry times, and MAE/MFE to unlock behavioral insights.
                </p>
              </div>
            )}
            {tab === 'behavioral' && hasTrades && (
              <div className="space-y-0">
                {/* Day/Hour Heatmap */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-3">Performance by Time</h3>
                  <Heatmap trades={trades.trades} />
                </div>

                {/* Tag Leaderboards */}
                {hasTagData && (
                  <>
                    <SectionDivider title="Tag Analytics" subtitle="P&L and win rate by tag category." />
                    <div className="space-y-5">
                      <TagLeaderboard data={tagAnalytics.setup} title="Setup Tags" />
                      <TagLeaderboard data={tagAnalytics.emotion} title="Emotions" />
                      <TagLeaderboard data={tagAnalytics.mistakes} title="Mistakes" />
                    </div>
                  </>
                )}

                {/* MAE/MFE Scatter */}
                {maeData.length > 0 && (
                  <>
                    <SectionDivider title="MAE / MFE Analysis" subtitle="Max adverse and favorable excursion vs final P&L." />
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs text-slate-500 font-medium mb-1">MAE vs P&L<Tip text="Plots worst drawdown during each trade against the final outcome. High MAE with positive P&L = lucky recovery." /></h4>
                        <ScatterPlot
                          data={maeData} xKey="mae" yKey="pnl"
                          xLabel="MAE ($)" yLabel="P&L ($)"
                          xFormatter={v => '$' + fmt(v)} yFormatter={v => (v >= 0 ? '+$' : '-$') + fmt(Math.abs(v))}
                          showZeroLines height={180}
                        />
                      </div>
                      <div>
                        <h4 className="text-xs text-slate-500 font-medium mb-1">MFE vs P&L<Tip text="Plots best unrealized gain during each trade against the final outcome. High MFE with low P&L = giving back profits." /></h4>
                        <ScatterPlot
                          data={maeData} xKey="mfe" yKey="pnl"
                          xLabel="MFE ($)" yLabel="P&L ($)"
                          xFormatter={v => '$' + fmt(v)} yFormatter={v => (v >= 0 ? '+$' : '-$') + fmt(Math.abs(v))}
                          showZeroLines height={180}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Duration vs R-Multiple */}
                {durationData.length > 0 && (
                  <>
                    <SectionDivider title="Hold Time vs Outcome" subtitle="Does holding longer improve or hurt your results?" />
                    <ScatterPlot
                      data={durationData} xKey="holdDays" yKey="rMult"
                      xLabel="Hold Days" yLabel="R-Multiple"
                      xFormatter={v => v.toFixed(1) + 'd'} yFormatter={v => (v >= 0 ? '+' : '') + v.toFixed(1) + 'R'}
                      showZeroLines height={200}
                    />
                  </>
                )}

                {/* No behavioral data message */}
                {!hasTagData && maeData.length === 0 && durationData.length === 0 && (
                  <div className="pt-5">
                    <p className="text-xs text-slate-500 text-center">
                      Add tags, entry times, and MAE/MFE data to your trades to see behavioral patterns.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ PROJECTIONS ═══════════ */}
            {tab === 'projections' && (
              <div className="space-y-4">
                {/* Monte Carlo Sliders */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Monte Carlo Lab</h3>
                  <div className="bg-deep rounded-xl p-3 border border-line space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Win Rate</span>
                        <span className="font-mono font-bold text-white">{projWr}%</span>
                      </div>
                      <input type="range" min={30} max={90} step={1} value={projWr}
                        onChange={e => setProjWr(+e.target.value)} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Reward/Risk</span>
                        <span className="font-mono font-bold text-white">{projRr.toFixed(1)}:1</span>
                      </div>
                      <input type="range" min={5} max={50} step={1} value={Math.round(projRr * 10)}
                        onChange={e => setProjRr(+e.target.value / 10)} className="w-full" />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>From ${fmt(realEq)}</span>
                      <button onClick={() => { setProjWr(wr); setProjRr(rr); }} className="text-emerald-400/60 hover:text-emerald-400 transition-colors">
                        Reset to settings
                      </button>
                    </div>
                  </div>
                </div>

                {/* Probability Cone */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Probability Cone<Tip text="Fan chart showing simulated equity paths. Bands represent confidence intervals (P5-P95, P16-P84, P25-P75). Median is the solid line." /></h3>
                  <ProbabilityCone
                    equity={realEq} winRate={projWr} rewardRatio={projRr}
                    seed={simSeed} numTrades={200}
                  />
                </div>

                {/* Loss Scenarios */}
                <div className="flex items-center justify-between text-xs font-mono bg-deep rounded-xl px-3 py-2.5 border border-line">
                  <div className="text-center">
                    <div className="font-bold text-amber-400 tabular-nums">{'\u2212'}{d3.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">3 losses</div>
                  </div>
                  <div className="w-px h-6 bg-line/50" />
                  <div className="text-center">
                    <div className="font-bold text-red-400 tabular-nums">{'\u2212'}{d5.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">5 losses</div>
                  </div>
                  <div className="w-px h-6 bg-line/50" />
                  <div className="text-center">
                    <div className={'font-bold tabular-nums ' + (ltw <= 3 ? 'text-red-500' : ltw <= 10 ? 'text-amber-400' : 'text-emerald-400')}>{ltw >= 200 ? '200+' : ltw}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">ruin horizon<Tip text="Consecutive losing trades before your account reaches ~$0. Higher is safer." /></div>
                  </div>
                </div>

                {/* Milestone Roadmap */}
                <SectionDivider title="Milestone Roadmap" subtitle={'From $' + fmt(realEq) + ' at ' + projWr + '% WR, ' + projRr.toFixed(1) + ':1 RR'} />
                <div className="flex items-center justify-between">
                  <div />
                  <button onClick={() => setSimSeed(s => s + 1)} className="px-2.5 py-1 text-xs font-semibold bg-elevated text-slate-400 rounded-lg border border-line hover:bg-line hover:text-white transition-colors">Re-Roll</button>
                </div>

                {msA.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msA.map(m => (
                      <div key={m.v} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> {m.l}
                      </div>
                    ))}
                  </div>
                )}

                {msF.length > 0 ? (
                  <>
                    {/* Next target */}
                    <div className="bg-deep rounded-xl p-4 border border-emerald-500/20 ring-1 ring-emerald-500/10">
                      <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Next Target</span></div>
                      <div className="flex items-baseline gap-2 mb-3"><span className="text-2xl font-bold text-white font-mono tracking-tight">{msF[0].l}</span><span className="text-xs text-slate-500">from ${fmt(realEq)}</span></div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" initial={{ width: 0 }} animate={{ width: Math.max(1, msF[0].progress) + '%' }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>
                        <span className="text-xs text-slate-400 font-mono tabular-nums w-12 text-right">{msF[0].progress.toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-surface rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{msF[0].bestN}</div><div className="text-[10px] text-slate-500 mt-0.5">wins min</div></div>
                        <div className="bg-surface rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-white tabular-nums">{msF[0].mcN.median != null ? '~' + msF[0].mcN.median : '\u2014'}</div><div className="text-[10px] text-slate-500 mt-0.5">trades exp</div>{msF[0].mcN.p25 != null && <div className="text-[10px] text-slate-600 font-mono mt-0.5">{msF[0].mcN.p25 + '\u2013' + msF[0].mcN.p75}</div>}</div>
                        <div className="bg-surface rounded-lg p-2.5"><div className={'text-xl font-bold font-mono tabular-nums ' + (msF[0].mcN.reached > 60 ? 'text-emerald-400' : msF[0].mcN.reached > 30 ? 'text-amber-400' : 'text-red-400')}>{msF[0].mcN.reached.toFixed(0)}%</div><div className="text-[10px] text-slate-500 mt-0.5">probability</div></div>
                      </div>
                    </div>

                    {/* Other milestones */}
                    {msF.length > 1 && (
                      <div className="space-y-2">
                        {msF.slice(1).map(m => (
                          <div key={m.v} className="bg-deep rounded-xl p-3 border border-line transition-colors">
                            <div className="flex justify-between items-center mb-2"><span className="text-base font-bold text-white font-mono tracking-tight">{m.l}</span><span className="text-xs text-slate-600 font-mono tabular-nums">{m.progress.toFixed(1)}%</span></div>
                            <div className="h-1 bg-elevated rounded-full overflow-hidden mb-2"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: Math.max(0.5, m.progress) + '%' }} /></div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div><span className="font-bold font-mono text-emerald-400 tabular-nums">{m.bestN}</span> <span className="text-slate-500">wins</span></div>
                              <div><span className="font-bold font-mono text-slate-300 tabular-nums">{m.mcN.median != null ? '~' + m.mcN.median : '\u2014'}</span> <span className="text-slate-500">trades</span></div>
                              <div><span className={'font-bold font-mono tabular-nums ' + (m.mcN.reached > 60 ? 'text-emerald-400' : m.mcN.reached > 30 ? 'text-amber-400' : 'text-red-400')}>{m.mcN.reached.toFixed(0)}%</span> <span className="text-slate-500">reach</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">{'\uD83C\uDFC6'}</div>
                    <div className="text-lg font-bold text-emerald-400 mb-1">All Milestones Achieved</div>
                    <p className="text-xs text-slate-500">Portfolio has surpassed every tracked milestone.</p>
                  </div>
                )}

                <p className="text-xs text-slate-500 text-center font-mono">500 paths {'\u00D7'} 200 trades {'\u00B7'} Seed #{simSeed}</p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-slate-500 text-xs font-mono">{wr}% WR {'\u00B7'} {rr.toFixed(1)} RR {'\u00B7'} {'\u2154'} Power Decay</p>
    </div>
  );
}
