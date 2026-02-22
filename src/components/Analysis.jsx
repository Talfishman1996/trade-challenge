import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Shield, TrendingDown, TrendingUp, Target, Activity, Zap,
  Flame, Minus, Plus, Eye, AlertTriangle, CheckCircle2, Rocket, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt, lg, unlg, s2e, e2s } from '../math/format.js';
import { rN, rO, rF, r$N, geoGrowth, lossesToWipe, calcStreak, fmtGeo, getPhase, getPhaseName } from '../math/risk.js';
import { computeHeavyMetrics, computeMilestones } from '../math/monte-carlo.js';
import {
  E0, K0, SMIN, SMAX, LOG_MIN, LOG_MAX, LXT, QK, FM, MILES,
  TT, AX, CHART_MARGIN as cm, TAB_IDS, TAB_LABELS
} from '../math/constants.js';
import MetricCard, { Tip, ChartLegend } from './MetricCard.jsx';
import GPSJourney from './GPSJourney.jsx';
import EquityCurve from './EquityCurve.jsx';

const TABS = [
  { id: 'performance', l: 'Performance', ic: TrendingUp },
  { id: 'risk', l: 'Risk Model', ic: Shield },
  { id: 'simulation', l: 'Simulation', ic: Rocket },
];

function SectionDivider({ title, subtitle }) {
  return (
    <div className="pt-5 pb-2 border-t border-line/60 mt-5">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function Analysis({ trades, settings }) {
  const realEq = trades.currentEquity;
  const [useReal, setUseReal] = useState(true);
  const [simEq, setSimEq] = useState(realEq);
  const [eqInput, setEqInput] = useState(fmt(realEq));
  const [isEqFocused, setIsEqFocused] = useState(false);
  const [tab, setTab] = useState('performance');
  const [simSeed, setSimSeed] = useState(555);
  const [explorerEq, setExplorerEq] = useState(realEq);

  const eq = useReal ? realEq : simEq;
  const wr = settings.winRate;
  const rr = settings.rewardRatio;

  const handleEqToggle = () => {
    if (useReal) {
      setSimEq(realEq);
      setEqInput(fmt(realEq));
    }
    setUseReal(!useReal);
  };

  const handleEqChange = e => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setEqInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) setSimEq(Math.min(SMAX, Math.max(SMIN, num)));
  };

  const stepEq = dir => setSimEq(prev => {
    const next = Math.min(SMAX, Math.max(SMIN, prev + (dir * (prev >= 1e6 ? 100000 : prev >= 100000 ? 10000 : 5000))));
    setEqInput(fmt(next));
    return next;
  });

  const dEq = useDeferredValue(eq), dWr = useDeferredValue(wr), dRr = useDeferredValue(rr);
  const isCalc = eq !== dEq || wr !== dWr || rr !== dRr;

  const rp = rN(eq) * 100, rd = r$N(eq), gain = rd * rr, ltw = lossesToWipe(eq);
  const d3 = ((eq - calcStreak(eq, 3, false, rr)) / eq) * 100;
  const d5 = ((eq - calcStreak(eq, 5, false, rr)) / eq) * 100;
  const kellyPct = ((wr / 100 * (1 + rr) - 1) / rr) * 100;
  const kellyMult = kellyPct > 0 ? (rp / kellyPct) : Infinity;
  const isPre = eq < E0 * 0.95, isAnc = eq >= E0 * 0.95 && eq <= E0 * 1.05;
  const expR = rN(explorerEq) * 100, expRD = r$N(explorerEq), expGain = expRD * rr;
  const expPhase = getPhase(explorerEq), expLtw = lossesToWipe(explorerEq);

  const hm = useMemo(() => computeHeavyMetrics(dEq, dWr, dRr), [dEq, dWr, dRr]);
  const milestoneData = useMemo(() => computeMilestones(dEq, dWr, dRr, simSeed), [dEq, dWr, dRr, simSeed]);

  const msA = milestoneData.filter(m => m.achieved), msF = milestoneData.filter(m => !m.achieved);

  const curveData = useMemo(() =>
    Array.from({ length: 150 }, (_, i) => {
      const lx = LOG_MIN + (i / 149) * (LOG_MAX - LOG_MIN), e = unlg(lx);
      return { lx, fixed: 33, old: rO(e) * 100, cur: rN(e) * 100, rdol: r$N(e) };
    }), []);

  const explorerSparkline = useMemo(() => {
    const N = 45, pts = [];
    let maxR = 0;
    for (let i = 0; i <= N; i++) {
      const e = 20000 + i * 2000, r = rN(e) * 100;
      if (r > maxR) maxR = r;
      pts.push({ x: (i / N) * 200, y: 0, r });
    }
    for (const p of pts) p.y = 36 - (p.r / maxR) * 32;
    const line = 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
    const area = line + 'L200,40L0,40Z';
    return { line, area, maxR };
  }, []);

  const ddP = useMemo(() => {
    const p = [];
    let ef = dEq, eo = dEq, en = dEq;
    for (let i = 0; i <= 7; i++) {
      p.push({ n: i, fixed: (dEq - ef) / dEq * 100, old: (dEq - eo) / dEq * 100, cur: (dEq - en) / dEq * 100 });
      ef *= 1 - rF(); eo *= 1 - rO(eo); en *= 1 - rN(en);
    }
    return p;
  }, [dEq]);

  const [gYT, gYD] = useMemo(() => {
    const all = hm.chart.flatMap(d => [d.fl, d.nl, d.bandBase, d.bandBase + d.band1090]);
    const mn = Math.floor(Math.min(...all)), mx = Math.ceil(Math.max(...all));
    const ticks = [];
    for (let d = mn; d <= mx + 1; d++) [1, 3].forEach(f => {
      const v = d + Math.log10(f);
      if (v >= mn - 0.3 && v <= mx + 0.3) ticks.push(v);
    });
    return [ticks, [Math.min(...all) - 0.15, Math.max(...all) + 0.15]];
  }, [hm]);

  const cost = hm.term.f.m > 0 ? ((hm.term.f.m - hm.term.n.m) / hm.term.f.m * 100) : 0;

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-4xl mx-auto space-y-4">
      {/* Equity Control */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">Analysis Equity</div>
          <button
            onClick={handleEqToggle}
            className={'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ' +
              (useReal
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400')}
          >
            {useReal ? 'Live: $' + fmt(realEq) : 'What-If Mode'}
          </button>
        </div>

        {!useReal && (
          <div className="space-y-2">
            <div className="relative flex items-center bg-deep border border-line rounded-xl overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
              <button onClick={() => stepEq(-1)} className="p-2.5 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Minus className="w-4 h-4" /></button>
              <span className="text-lg font-bold text-slate-600 select-none">$</span>
              <input type="text" value={eqInput} onChange={handleEqChange} onFocus={() => setIsEqFocused(true)} onBlur={() => setIsEqFocused(false)} className="w-full bg-transparent text-center text-xl font-bold font-mono tabular-nums tracking-tight text-white py-2 outline-none" />
              <button onClick={() => stepEq(1)} className="p-2.5 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Plus className="w-4 h-4" /></button>
            </div>
            <input type="range" min={0} max={1000} step="any" value={e2s(simEq)} onChange={e => { const v = s2e(+e.target.value); setSimEq(v); setEqInput(fmt(v)); }} className="w-full h-1.5 rounded-full appearance-none bg-elevated accent-emerald-500 cursor-pointer" />
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QK.map(q => (
                <button key={q.v} onClick={() => { setSimEq(q.v); setEqInput(fmt(q.v)); }} className={'text-xs px-2 py-1 rounded-md font-mono font-medium transition-all ' + (Math.abs(simEq - q.v) < q.v * 0.05 ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-elevated')}>{q.l}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Active Risk %" barColor={rp > 33.1 ? 'bg-amber-500' : 'bg-emerald-500'}>
          <div className={'text-xl font-bold font-mono tracking-tight tabular-nums ' + (rp > 33.1 ? 'text-amber-400' : 'text-emerald-400')}>{rp.toFixed(1)}%</div>
          <div className={'text-xs mt-1 font-medium ' + (kellyMult > 1.05 ? 'text-amber-500/80' : 'text-emerald-400/80')}>
            {kellyPct > 0 ? (kellyMult > 1.05 ? '\u26A0 ' + kellyMult.toFixed(2) + '\u00D7 Kelly' : '\u2713 ' + kellyMult.toFixed(2) + '\u00D7 Kelly') : '\u2620 No edge'}
          </div>
        </MetricCard>
        <MetricCard label="Capital at Risk" barColor="bg-rose-500" sub="max single-trade loss" value={{ text: fmt(rd), className: 'text-rose-400' }} />
        <MetricCard label="Drawdown Seq" tip="Account drop after consecutive losses." barColor="bg-amber-500">
          <div className="flex items-center gap-3 mt-1">
            <div><div className="text-base font-bold font-mono text-amber-400 tabular-nums">{'\u2212'}{d3.toFixed(0)}%</div><div className="text-xs text-slate-600">3L</div></div>
            <div className="w-px h-6 bg-slate-700/50" />
            <div><div className="text-base font-bold font-mono text-rose-400 tabular-nums">{'\u2212'}{d5.toFixed(0)}%</div><div className="text-xs text-slate-600">5L</div></div>
          </div>
        </MetricCard>
        <MetricCard label="Ruin Horizon" tip="Consecutive losses to reach zero." barColor={ltw <= 3 ? 'bg-rose-500' : ltw <= 10 ? 'bg-amber-500' : 'bg-emerald-500'}>
          <div className={'text-xl font-bold font-mono tracking-tight tabular-nums mt-1 ' + (ltw <= 3 ? 'text-rose-500' : ltw <= 6 ? 'text-amber-400' : 'text-emerald-400')}>
            {ltw >= 200 ? '200+' : ltw} <span className="text-xs font-sans text-slate-500 font-medium">losses</span>
          </div>
        </MetricCard>
      </div>

      {/* 3 Analysis Tabs */}
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

      {/* Tab Content */}
      <div className={'bg-surface rounded-2xl border border-line p-4 relative transition-all duration-200 ' + (isCalc ? 'opacity-40 blur-sm' : '')}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

            {/* ═══════════════ PERFORMANCE TAB ═══════════════ */}
            {tab === 'performance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Equity Curve</h3>
                  <p className="text-xs text-slate-500 mt-1">Portfolio value across all trades.</p>
                </div>
                <EquityCurve trades={trades} height={280} />
                {trades.trades.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-deep rounded-xl p-3 text-center border border-line">
                      <div className={'text-lg font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Total P&L</div>
                    </div>
                    <div className="bg-deep rounded-xl p-3 text-center border border-line">
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-400">
                        ${fmt(trades.peakEquity)}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Peak</div>
                    </div>
                    <div className="bg-deep rounded-xl p-3 text-center border border-line">
                      <div className="text-lg font-bold font-mono tabular-nums text-rose-400">
                        {trades.stats.maxDrawdownPct > 0 ? '-' + trades.stats.maxDrawdownPct.toFixed(1) + '%' : '--'}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Max DD</div>
                    </div>
                  </div>
                )}
                {/* R-Multiple Distribution */}
                {trades.stats.rMultiples.length > 0 && (() => {
                  const rm = trades.stats.rMultiples;
                  const buckets = [
                    { range: '<-2R', count: 0, fill: '#f43f5e' },
                    { range: '-2 to -1R', count: 0, fill: '#fb7185' },
                    { range: '-1R to 0', count: 0, fill: '#fda4af' },
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
                  return (
                    <div className="pt-2">
                      <h3 className="text-sm font-bold text-white mb-1">R-Multiple Distribution</h3>
                      <p className="text-xs text-slate-500 mb-3">Outcome distribution in risk units.</p>
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
                      <div className="flex justify-between text-xs text-slate-500 font-mono mt-1">
                        <span>Avg R: <span className={trades.stats.avgR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{trades.stats.avgR >= 0 ? '+' : ''}{trades.stats.avgR.toFixed(2)}R</span></span>
                        <span>Expect: <span className={trades.stats.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{trades.stats.expectancy >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.expectancy))}</span></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══════════════ RISK MODEL TAB ═══════════════ */}
            {tab === 'risk' && (
              <div className="space-y-0">
                {/* Risk Explorer */}
                <div>
                  <h3 className="text-base font-bold text-white">Risk Explorer</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Drag to explore how risk scales with equity.</p>
                  <div className="bg-deep rounded-xl p-4 border border-line space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold font-mono tabular-nums text-white">${fmt(explorerEq)}</div>
                      <span className={'text-xs font-semibold px-2 py-1 rounded-lg border ' + (expPhase === 'pre' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : expPhase === 'anchor' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20')}>{getPhaseName(expPhase)}</span>
                    </div>
                    <div>
                      <input type="range" min={20000} max={110000} step={500} value={explorerEq} onChange={e => setExplorerEq(+e.target.value)} className="w-full h-1.5 rounded-full appearance-none bg-elevated accent-emerald-500 cursor-pointer" />
                      <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                        <span>$20K</span><span>$87.5K anchor</span><span>$110K</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-surface rounded-lg p-3 border border-line">
                        <div className={'text-xl font-bold font-mono tabular-nums ' + (expR > 33.1 ? 'text-amber-400' : 'text-emerald-400')}>{expR.toFixed(1)}%</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">Risk %</div>
                      </div>
                      <div className="bg-surface rounded-lg p-3 border border-line">
                        <div className="text-xl font-bold font-mono tabular-nums text-rose-400">${fmt(expRD)}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">Risk $</div>
                      </div>
                      <div className="bg-surface rounded-lg p-3 border border-line">
                        <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">+${fmt(expGain)}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">Gain $</div>
                      </div>
                    </div>
                    <div className="relative h-12">
                      <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                        <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.15" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
                        <path d={explorerSparkline.area} fill="url(#sparkGrad)" />
                        <path d={explorerSparkline.line} fill="none" stroke="#10b981" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        <line x1={((explorerEq - 20000) / 90000) * 200} y1="0" x2={((explorerEq - 20000) / 90000) * 200} y2="40" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                        <circle cx={((explorerEq - 20000) / 90000) * 200} cy={36 - (expR / explorerSparkline.maxR) * 32} r="3" fill="#10b981" stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-line/50">
                      <span className="text-xs text-slate-500">Ruin horizon</span>
                      <span className={'text-sm font-bold font-mono tabular-nums ' + (expLtw <= 3 ? 'text-rose-500' : expLtw <= 10 ? 'text-amber-400' : 'text-emerald-400')}>{expLtw >= 200 ? '200+' : expLtw} losses</span>
                    </div>
                  </div>
                </div>

                {/* Risk Curves */}
                <SectionDivider title="Risk Curves" subtitle="How risk % and $ scale with equity." />
                <div className="space-y-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={curveData} margin={cm}>
                        <defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={v => v + '%'} stroke="#475569" tick={AX} domain={[0, 100]} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={v => [v.toFixed(1) + '%', 'Risk %']} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'You', position: 'top', fill: '#94a3b8', fontSize: 10 }} />
                        <Area type="monotone" dataKey="cur" stroke="#10b981" fill="url(#gP)" strokeWidth={2.5} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={curveData} margin={cm}>
                        <defs><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={fmt} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={v => [fmt(v), 'Risk $']} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="rdol" stroke="#0ea5e9" fill="url(#gD)" strokeWidth={2.5} isAnimationActive={false} activeDot={{ r: 4, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stress Test */}
                <SectionDivider title="Stress Test" subtitle={'Consecutive losses from $' + fmt(dEq) + '.'} />
                <div className="space-y-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={ddP} margin={cm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="n" stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={v => '\u2212' + v.toFixed(0) + '%'} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={(v, nm) => ['\u2212' + v.toFixed(1) + '%', { fixed: 'Fixed 33%', old: '\u2153 Power', cur: '\u2154 Power' }[nm]]} labelFormatter={v => 'After ' + v + ' losses'} isAnimationActive={false} />
                        <Line type="monotone" dataKey="fixed" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="old" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} isAnimationActive={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend />
                  <div className="grid grid-cols-2 gap-2">
                    {[{ l: 'Fixed 33%', d: hm.mdd.f, c: 'text-amber-500', bg: 'bg-surface border-line' }, { l: '\u2154 Power', d: hm.mdd.n, c: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }].map((x, i) => (
                      <div key={i} className={'rounded-lg flex flex-col items-center justify-center p-3 border ' + x.bg}>
                        <div className={'text-xs font-medium mb-1 ' + x.c}>{x.l}</div>
                        <div className={'text-xl font-bold font-mono tabular-nums ' + x.c}>{'\u2212'}{(x.d.m * 100).toFixed(0)}%</div>
                        <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">90th: {'\u2212'}{(x.d.p90 * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compare */}
                <SectionDivider title="Model Comparison" subtitle="Three risk frameworks side by side." />
                <div className="space-y-3">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={curveData} margin={cm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={v => v + '%'} stroke="#475569" tick={AX} domain={[0, 100]} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={(v, nm) => [v.toFixed(1) + '%', { fixed: 'Fixed 33%', old: '\u2153 Power', cur: '\u2154 Power' }[nm]]} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#475569" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Line type="monotone" dataKey="fixed" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false} />
                        <Line type="monotone" dataKey="old" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend />
                </div>
              </div>
            )}

            {/* ═══════════════ SIMULATION TAB ═══════════════ */}
            {tab === 'simulation' && (
              <div className="space-y-4">
                {/* GPS Journey */}
                {dEq < 110000 && (
                  <div className="flex justify-center">
                    <GPSJourney equity={dEq} compact={false} />
                  </div>
                )}

                {/* Milestone Roadmap */}
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">Milestone Roadmap</h3>
                    <p className="text-xs text-slate-500 mt-1">From ${fmt(dEq)} at {wr}% WR, {rr.toFixed(1)}:1 RR</p>
                  </div>
                  <button onClick={() => setSimSeed(s => s + 1)} className="px-2.5 py-1 text-xs font-semibold bg-elevated text-slate-400 rounded-lg border border-line hover:bg-line hover:text-white transition-colors">Re-Roll</button>
                </div>

                {msA.length > 0 && <div className="flex flex-wrap gap-1.5">{msA.map(m => (<div key={m.v} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> {m.l}</div>))}</div>}

                {msF.length > 0 ? (<>
                  {/* Next target */}
                  <div className="bg-deep rounded-xl p-4 border border-emerald-500/20 ring-1 ring-emerald-500/10">
                    <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Next Target</span></div>
                    <div className="flex items-baseline gap-2 mb-3"><span className="text-2xl font-bold text-white font-mono tracking-tight">{msF[0].l}</span><span className="text-xs text-slate-500">from ${fmt(dEq)}</span></div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" initial={{ width: 0 }} animate={{ width: Math.max(1, msF[0].progress) + '%' }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>
                      <span className="text-xs text-slate-400 font-mono tabular-nums w-12 text-right">{msF[0].progress.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-surface rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{msF[0].bestN}</div><div className="text-xs text-slate-500 mt-0.5">wins min</div></div>
                      <div className="bg-surface rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-white tabular-nums">{msF[0].mcN.median != null ? '~' + msF[0].mcN.median : '\u2014'}</div><div className="text-xs text-slate-500 mt-0.5">trades exp</div>{msF[0].mcN.p25 != null && <div className="text-xs text-slate-600 font-mono mt-0.5">{msF[0].mcN.p25 + '\u2013' + msF[0].mcN.p75}</div>}</div>
                      <div className="bg-surface rounded-lg p-2.5"><div className={'text-xl font-bold font-mono tabular-nums ' + (msF[0].mcN.reached > 60 ? 'text-emerald-400' : msF[0].mcN.reached > 30 ? 'text-amber-400' : 'text-rose-400')}>{msF[0].mcN.reached.toFixed(0)}%</div><div className="text-xs text-slate-500 mt-0.5">probability</div></div>
                    </div>
                  </div>

                  {/* Other milestones */}
                  {msF.length > 1 && (
                    <div className="space-y-2">{msF.slice(1).map(m => (
                      <div key={m.v} onClick={() => { if (!useReal) { setSimEq(m.v); setEqInput(fmt(m.v)); } }} className={'bg-deep rounded-xl p-3 border border-line ' + (!useReal ? 'cursor-pointer hover:border-line' : '') + ' transition-colors'}>
                        <div className="flex justify-between items-center mb-2"><span className="text-base font-bold text-white font-mono tracking-tight">{m.l}</span><span className="text-xs text-slate-600 font-mono tabular-nums">{m.progress.toFixed(1)}%</span></div>
                        <div className="h-1 bg-elevated rounded-full overflow-hidden mb-2"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: Math.max(0.5, m.progress) + '%' }} /></div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div><span className="font-bold font-mono text-emerald-400 tabular-nums">{m.bestN}</span> <span className="text-slate-600">wins</span></div>
                          <div><span className="font-bold font-mono text-slate-300 tabular-nums">{m.mcN.median != null ? '~' + m.mcN.median : '\u2014'}</span> <span className="text-slate-600">trades</span></div>
                          <div><span className={'font-bold font-mono tabular-nums ' + (m.mcN.reached > 60 ? 'text-emerald-400' : m.mcN.reached > 30 ? 'text-amber-400' : 'text-rose-400')}>{m.mcN.reached.toFixed(0)}%</span> <span className="text-slate-600">reach</span></div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </>) : (
                  <div className="text-center py-10"><div className="text-4xl mb-3">{'\uD83C\uDFC6'}</div><div className="text-lg font-bold text-emerald-400 mb-1">All Milestones Achieved</div><p className="text-xs text-slate-500">Portfolio has surpassed every tracked milestone.</p></div>
                )}

                {/* Terminal Wealth */}
                <SectionDivider title="Terminal Wealth" subtitle="Median equity with confidence bands, 500 paths, 100 trades." />
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={hm.chart} margin={cm}>
                      <defs>
                        <linearGradient id="gBand90" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.08} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.03} /></linearGradient>
                        <linearGradient id="gBand75" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.18} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.06} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="t" stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                      <YAxis type="number" domain={gYD} ticks={gYT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
                      <RTooltip contentStyle={TT} formatter={(v, nm) => { const lb = { fl: 'Fixed 33%', nl: '\u2154 Power (median)' }; return lb[nm] ? [fmt(unlg(v)), lb[nm]] : null; }} labelFormatter={v => 'Trade #' + v} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                      <ReferenceLine y={lg(dEq)} stroke="#475569" strokeDasharray="2 4" strokeOpacity={0.3} />
                      <Area type="monotone" dataKey="bandBase" stackId="outer" fill="transparent" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
                      <Area type="monotone" dataKey="band1090" stackId="outer" fill="url(#gBand90)" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
                      <Area type="monotone" dataKey="bandBase25" stackId="inner" fill="transparent" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
                      <Area type="monotone" dataKey="band2575" stackId="inner" fill="url(#gBand75)" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
                      <Line type="monotone" dataKey="fl" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="nl" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs mt-2">
                  <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-emerald-500/10 border border-emerald-500/20" />P10{'\u2013'}P90</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />P25{'\u2013'}P75</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-emerald-500" />{'\u2154'} Power median</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-amber-500 border-dashed" style={{ borderTopWidth: 2, height: 0 }} />Fixed 33%</span>
                </div>

                <div className={'rounded-xl p-4 border flex flex-col justify-center ' + (cost > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20')}>
                  {cost > 0 ? (<>
                    <div className="flex justify-between items-start mb-1"><span className="text-xs font-medium text-amber-500">Protection Cost</span><span className="text-lg font-bold font-mono text-amber-400 tabular-nums">{'\u2212'}{cost.toFixed(1)}%</span></div>
                    <p className="text-xs text-amber-500/70 leading-relaxed">{'\u2154'} power sacrifices median wealth to suppress drawdowns and prioritize survival.</p>
                  </>) : (<>
                    <div className="flex justify-between items-start mb-1"><span className="text-xs font-medium text-emerald-500">Outperformance</span><span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">+{Math.abs(cost).toFixed(1)}%</span></div>
                    <p className="text-xs text-emerald-500/70 leading-relaxed">Fixed 33% is over-Kelly {'\u2014'} {'\u2154'} power outperforms by avoiding the penalty.</p>
                  </>)}
                </div>

                <p className="text-xs text-slate-600 text-center font-mono">500 paths {'\u00D7'} 400 trades {'\u00B7'} Seed #{simSeed}</p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-slate-600 text-xs font-mono">{wr}% WR {'\u00B7'} {rr.toFixed(1)} RR {'\u00B7'} {'\u2154'} Power Decay</p>
    </div>
  );
}
