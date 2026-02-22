import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Shield, TrendingDown, TrendingUp, Target, Activity, Zap,
  Flame, Minus, Plus, Eye, AlertTriangle, CheckCircle2, Rocket, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt, lg, unlg, s2e, e2s } from '../math/format.js';
import { rN, rO, rF, r$N, geoGrowth, lossesToWipe, calcStreak, fmtGeo, getPhase } from '../math/risk.js';
import { computeHeavyMetrics, computeMilestones } from '../math/monte-carlo.js';
import {
  E0, K0, SMIN, SMAX, LOG_MIN, LOG_MAX, LXT, QK, FM, MILES,
  TT, AX, CHART_MARGIN as cm, TAB_IDS, TAB_LABELS
} from '../math/constants.js';
import MetricCard, { Tip, ChartLegend } from './MetricCard.jsx';
import GPSJourney from './GPSJourney.jsx';
import EquityCurve from './EquityCurve.jsx';

const TABS = [
  { id: 'equity', l: 'Equity', ic: TrendingUp },
  { id: 'milestones', l: 'Milestones', ic: Zap },
  { id: 'fullmap', l: 'Matrix', ic: Eye },
  { id: 'curves', l: 'Curves', ic: Activity },
  { id: 'stress', l: 'Stress', ic: TrendingDown },
  { id: 'growth', l: 'Growth', ic: Rocket },
  { id: 'compare', l: 'Compare', ic: Shield },
];

export default function Analysis({ trades, settings }) {
  const realEq = trades.currentEquity;
  const [useReal, setUseReal] = useState(true);
  const [simEq, setSimEq] = useState(realEq);
  const [eqInput, setEqInput] = useState(fmt(realEq));
  const [isEqFocused, setIsEqFocused] = useState(false);
  const [tab, setTab] = useState('equity');
  const [simSeed, setSimSeed] = useState(555);

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

  const hm = useMemo(() => computeHeavyMetrics(dEq, dWr, dRr), [dEq, dWr, dRr]);
  const milestoneData = useMemo(() => computeMilestones(dEq, dWr, dRr, simSeed), [dEq, dWr, dRr, simSeed]);

  const msA = milestoneData.filter(m => m.achieved), msF = milestoneData.filter(m => !m.achieved);

  const curveData = useMemo(() =>
    Array.from({ length: 150 }, (_, i) => {
      const lx = LOG_MIN + (i / 149) * (LOG_MAX - LOG_MIN), e = unlg(lx);
      return { lx, fixed: 33, old: rO(e) * 100, cur: rN(e) * 100, rdol: r$N(e) };
    }), []);

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
    const all = hm.chart.flatMap(d => [d.fl, d.ol, d.nl]);
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
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">
      {/* Equity Control */}
      <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 space-y-3">
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
            <div className="relative flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
              <button onClick={() => stepEq(-1)} className="p-2.5 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Minus className="w-4 h-4" /></button>
              <span className="text-lg font-bold text-slate-600 select-none">$</span>
              <input type="text" value={eqInput} onChange={handleEqChange} onFocus={() => setIsEqFocused(true)} onBlur={() => setIsEqFocused(false)} className="w-full bg-transparent text-center text-xl font-bold font-mono tabular-nums tracking-tight text-white py-2 outline-none" />
              <button onClick={() => stepEq(1)} className="p-2.5 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Plus className="w-4 h-4" /></button>
            </div>
            <input type="range" min={0} max={1000} step="any" value={e2s(simEq)} onChange={e => { const v = s2e(+e.target.value); setSimEq(v); setEqInput(fmt(v)); }} className="w-full h-1.5 rounded-full appearance-none bg-slate-800 accent-emerald-500 cursor-pointer" />
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QK.map(q => (
                <button key={q.v} onClick={() => { setSimEq(q.v); setEqInput(fmt(q.v)); }} className={'text-xs px-2 py-1 rounded-md font-mono font-medium transition-all ' + (Math.abs(simEq - q.v) < q.v * 0.05 ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800')}>{q.l}</button>
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

      {/* Analysis Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-px no-sb border-b border-slate-800/80 relative">
        {TABS.map(t => {
          const Ic = t.ic;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={'flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap relative rounded-t-lg ' + (on ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30')}>
              <Ic className="w-3 h-3" /> {t.l}
              {on && <motion.div layoutId="analysisTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={'bg-slate-900/60 rounded-2xl border border-slate-800 p-4 relative transition-all duration-200 ' + (isCalc ? 'opacity-40 blur-sm' : '')}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

            {tab === 'equity' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Equity Curve</h3>
                  <p className="text-xs text-slate-500 mt-1">Portfolio value across all trades.</p>
                </div>
                <EquityCurve trades={trades} height={280} />
                {trades.trades.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950 rounded-xl p-3 text-center border border-slate-800">
                      <div className={'text-lg font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {trades.stats.totalPnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.totalPnl))}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Total P&L</div>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-3 text-center border border-slate-800">
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-400">
                        ${fmt(trades.peakEquity)}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Peak</div>
                    </div>
                    <div className="bg-slate-950 rounded-xl p-3 text-center border border-slate-800">
                      <div className="text-lg font-bold font-mono tabular-nums text-rose-400">
                        {trades.stats.maxDrawdownPct > 0 ? '-' + trades.stats.maxDrawdownPct.toFixed(1) + '%' : '--'}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Max DD</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'milestones' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">Milestone Roadmap</h3>
                    <p className="text-xs text-slate-500 mt-1">From ${fmt(dEq)} at {wr}% WR, {rr.toFixed(1)}:1 RR</p>
                  </div>
                  <button onClick={() => setSimSeed(s => s + 1)} className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors">Re-Roll</button>
                </div>

                {msA.length > 0 && <div className="flex flex-wrap gap-1.5">{msA.map(m => (<div key={m.v} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> {m.l}</div>))}</div>}

                {msF.length > 0 ? (<>
                  {/* Next target */}
                  <div className="bg-slate-950 rounded-xl p-4 border border-emerald-500/20 ring-1 ring-emerald-500/10">
                    <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Next Target</span></div>
                    <div className="flex items-baseline gap-2 mb-3"><span className="text-2xl font-bold text-white font-mono tracking-tight">{msF[0].l}</span><span className="text-xs text-slate-500">from ${fmt(dEq)}</span></div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" initial={{ width: 0 }} animate={{ width: Math.max(1, msF[0].progress) + '%' }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>
                      <span className="text-xs text-slate-400 font-mono tabular-nums w-12 text-right">{msF[0].progress.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/60 rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{msF[0].bestN}</div><div className="text-xs text-slate-500 mt-0.5">wins min</div></div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5"><div className="text-xl font-bold font-mono text-white tabular-nums">{msF[0].mcN.median != null ? '~' + msF[0].mcN.median : '\u2014'}</div><div className="text-xs text-slate-500 mt-0.5">trades exp</div>{msF[0].mcN.p25 != null && <div className="text-xs text-slate-600 font-mono mt-0.5">{msF[0].mcN.p25 + '\u2013' + msF[0].mcN.p75}</div>}</div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5"><div className={'text-xl font-bold font-mono tabular-nums ' + (msF[0].mcN.reached > 60 ? 'text-emerald-400' : msF[0].mcN.reached > 30 ? 'text-amber-400' : 'text-rose-400')}>{msF[0].mcN.reached.toFixed(0)}%</div><div className="text-xs text-slate-500 mt-0.5">probability</div></div>
                    </div>
                  </div>

                  {/* GPS funnel */}
                  {dEq < 110000 && (
                    <div className="flex justify-center">
                      <GPSJourney equity={dEq} compact={false} />
                    </div>
                  )}

                  {/* Other milestones */}
                  {msF.length > 1 && (
                    <div className="space-y-2">{msF.slice(1).map(m => (
                      <div key={m.v} onClick={() => { if (!useReal) { setSimEq(m.v); setEqInput(fmt(m.v)); } }} className={'bg-slate-950 rounded-xl p-3 border border-slate-800 ' + (!useReal ? 'cursor-pointer hover:border-slate-700' : '') + ' transition-colors'}>
                        <div className="flex justify-between items-center mb-2"><span className="text-base font-bold text-white font-mono tracking-tight">{m.l}</span><span className="text-xs text-slate-600 font-mono tabular-nums">{m.progress.toFixed(1)}%</span></div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: Math.max(0.5, m.progress) + '%' }} /></div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div><span className="font-bold font-mono text-emerald-400 tabular-nums">{m.bestN}</span> <span className="text-slate-600">wins</span></div>
                          <div><span className="font-bold font-mono text-slate-300 tabular-nums">{m.mcN.median != null ? '~' + m.mcN.median : '\u2014'}</span> <span className="text-slate-600">trades</span></div>
                          <div><span className={'font-bold font-mono tabular-nums ' + (m.mcN.reached > 60 ? 'text-emerald-400' : m.mcN.reached > 30 ? 'text-amber-400' : 'text-rose-400')}>{m.mcN.reached.toFixed(0)}%</span> <span className="text-slate-600">reach</span></div>
                        </div>
                      </div>
                    ))}</div>
                  )}

                  <p className="text-xs text-slate-600 text-center font-mono">500 paths {'\u00D7'} 400 trades {'\u00B7'} Seed #{simSeed}</p>
                </>) : (
                  <div className="text-center py-10"><div className="text-4xl mb-3">{'\uD83C\uDFC6'}</div><div className="text-lg font-bold text-emerald-400 mb-1">All Milestones Achieved</div><p className="text-xs text-slate-500">Portfolio has surpassed every tracked milestone.</p></div>
                )}
              </div>
            )}

            {tab === 'fullmap' && (
              <div className="space-y-4">
                <div><h3 className="text-base font-bold text-white">Full System Matrix</h3><p className="text-xs text-slate-500 mt-1">Risk parameters across every portfolio level.</p></div>
                <div className="overflow-x-auto -mx-4 px-4 rounded-xl">
                  <table className="w-full text-xs font-mono whitespace-nowrap min-w-[500px]">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-2 text-left font-medium">Equity</th>
                        <th className="py-2 px-2 text-right font-medium">Risk %</th>
                        <th className="py-2 px-2 text-right font-medium">Risk $</th>
                        <th className="py-2 px-2 text-right font-medium">Gain $</th>
                        <th className="py-2 px-2 text-right font-medium">3-Loss</th>
                        <th className="py-2 px-2 text-right font-medium">Geo</th>
                        <th className="py-2 px-2 text-right font-medium">Ruin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">{hm.fMap.map((m, i) => {
                      const isA = Math.abs(dEq - m.v) < m.v * 0.08;
                      const tc = m.ph === 'pre' ? 'text-amber-400' : m.ph === 'anchor' ? 'text-emerald-400' : 'text-cyan-400';
                      const Ico = m.ph === 'pre' ? Flame : m.ph === 'anchor' ? Target : Shield;
                      return (
                        <tr key={m.v} onClick={() => { if (!useReal) { setSimEq(m.v); setEqInput(fmt(m.v)); } }} className={'transition-colors ' + (isA ? 'bg-emerald-500/10' : i % 2 ? 'bg-slate-800/15' : '') + (!useReal ? ' cursor-pointer hover:bg-slate-800/40' : '')} style={isA ? { boxShadow: 'inset 3px 0 0 #10b981' } : {}}>
                          <td className={'py-2 px-2 font-semibold flex items-center gap-1.5 ' + tc}><Ico className="w-3 h-3" /> {m.l}</td>
                          <td className={'py-2 px-2 text-right font-semibold ' + (m.r > K0 ? 'text-amber-400' : 'text-emerald-400')}>{(m.r * 100).toFixed(1)}%</td>
                          <td className="py-2 px-2 text-right text-rose-400">{fmt(m.rd)}</td>
                          <td className="py-2 px-2 text-right text-emerald-400">+{fmt(m.gd)}</td>
                          <td className="py-2 px-2 text-right">{m.e3l < 100 ? <span className="text-rose-500 font-bold">WIPE</span> : <span className="text-slate-400">{'\u2212'}{m.dd3.toFixed(0)}%</span>}</td>
                          <td className={'py-2 px-2 text-right font-semibold ' + (m.g < 0 ? 'text-rose-400' : 'text-emerald-400')}>{fmtGeo(m.g)}</td>
                          <td className={'py-2 px-2 text-right font-bold ' + (m.ltw <= 3 ? 'text-rose-500' : m.ltw <= 10 ? 'text-amber-400' : 'text-slate-500')}>{m.ltw >= 200 ? '200+' : m.ltw}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'curves' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">Percentage Risk Decay</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Fraction of capital exposed collapses as portfolio scales.</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={curveData} margin={cm}>
                        <defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={v => v + '%'} stroke="#475569" tick={AX} domain={[0, 100]} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={v => [v.toFixed(1) + '%', 'Risk %']} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'You', position: 'top', fill: '#94a3b8', fontSize: 10 }} />
                        <ReferenceLine x={lg(E0)} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area type="monotone" dataKey="cur" stroke="#10b981" fill="url(#gP)" strokeWidth={2.5} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800/50">
                  <h3 className="text-base font-bold text-white">Dollar Risk</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Dollar risk grows via cube-root scaling despite % decay.</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={curveData} margin={cm}>
                        <defs><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={fmt} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={v => [fmt(v), 'Risk $']} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4" />
                        <ReferenceLine x={lg(E0)} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area type="monotone" dataKey="rdol" stroke="#0ea5e9" fill="url(#gD)" strokeWidth={2.5} isAnimationActive={false} activeDot={{ r: 4, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {tab === 'stress' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Consecutive Drawdown</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">0{'\u2013'}7 losses from ${fmt(dEq)}.</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
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
                </div>

                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-slate-800/60">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-500 font-medium mb-3">Recovery After 5 Losses ({rr.toFixed(1)}:1 RR)</div>
                    <table className="w-full text-xs font-mono whitespace-nowrap">
                      <thead><tr className="text-slate-500 border-b border-slate-800"><th className="pb-2 text-left font-medium">Model</th><th className="pb-2 font-medium">Drawdown</th><th className="pb-2 text-right font-medium">Wins to Recover</th></tr></thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {[{ l: 'Fixed 33%', c: 'text-amber-500', r: hm.rec.f5 }, { l: '\u2153 Power', c: 'text-blue-500', r: hm.rec.o5 }, { l: '\u2154 Power', c: 'text-emerald-400', r: hm.rec.n5, bold: true }].map((x, i) => (
                          <tr key={i}><td className={'py-2 ' + x.c + (x.bold ? ' font-bold' : '')}>{x.l}</td><td className="py-2 text-rose-400">{'\u2212'}{x.r.dd.toFixed(1)}%</td><td className={'py-2 text-right font-bold ' + x.c}>{x.r.w}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-500 font-medium mb-3">MC Max Drawdown</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ l: 'Fixed 33%', d: hm.mdd.f, c: 'text-amber-500', bg: 'bg-slate-900/60 border-slate-800' }, { l: '\u2154 Power', d: hm.mdd.n, c: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }].map((x, i) => (
                        <div key={i} className={'rounded-lg flex flex-col items-center justify-center p-3 border ' + x.bg}>
                          <div className={'text-xs font-medium mb-1 ' + x.c}>{x.l}</div>
                          <div className={'text-xl font-bold font-mono tabular-nums ' + x.c}>{'\u2212'}{(x.d.m * 100).toFixed(0)}%</div>
                          <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">90th: {'\u2212'}{(x.d.p90 * 100).toFixed(0)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'growth' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Terminal Wealth</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Median equity, 500 paths, 100 trades (log scale).</p>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hm.chart} margin={cm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="t" stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis type="number" domain={gYD} ticks={gYT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={(v, nm) => [fmt(unlg(v)), { fl: 'Fixed 33%', ol: '\u2153 Power', nl: '\u2154 Power' }[nm]]} labelFormatter={v => 'Trade #' + v} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine y={lg(dEq)} stroke="#475569" strokeDasharray="2 4" strokeOpacity={0.3} />
                        <Line type="monotone" dataKey="fl" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="ol" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="nl" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend />
                </div>

                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-slate-800/60">
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                    <div className="text-xs text-slate-500 font-medium mb-3 text-center">Terminal Wealth {'\u00B7'} Median (IQR)</div>
                    <div className="space-y-2.5">
                      {[{ l: 'Fixed 33%', c: 'text-amber-500', v: hm.term.f.m, lo: hm.term.f.p25, hi: hm.term.f.p75 }, { l: '\u2153 Power', c: 'text-blue-400', v: hm.term.o.m, lo: hm.term.o.p25, hi: hm.term.o.p75 }, { l: '\u2154 Power', c: 'text-emerald-400', v: hm.term.n.m, lo: hm.term.n.p25, hi: hm.term.n.p75 }].map((x, i) => (
                        <div key={i} className="flex justify-between items-center font-mono text-sm">
                          <span className={'font-medium text-xs ' + x.c}>{x.l}</span>
                          <div className="text-right">
                            <div className={'font-bold text-base tracking-tight ' + x.c}>{fmt(x.v)}</div>
                            <div className="text-xs text-slate-600 tabular-nums">{fmt(x.lo)} {'\u2013'} {fmt(x.hi)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                </div>
              </div>
            )}

            {tab === 'compare' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Three-Model Comparison</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Risk allocation across all three frameworks.</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData} margin={cm}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="lx" type="number" domain={[LOG_MIN, LOG_MAX]} ticks={LXT} tickFormatter={v => fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={v => v + '%'} stroke="#475569" tick={AX} domain={[0, 100]} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={TT} formatter={(v, nm) => [v.toFixed(1) + '%', { fixed: 'Fixed 33%', old: '\u2153 Power', cur: '\u2154 Power' }[nm]]} labelFormatter={v => fmt(unlg(v))} isAnimationActive={false} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                        <ReferenceLine x={lg(dEq)} stroke="#475569" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'You', position: 'insideTopLeft', style: { fill: '#94a3b8', fontSize: 10 } }} />
                        <ReferenceLine x={lg(E0)} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={0.4} />
                        <Line type="monotone" dataKey="fixed" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false} />
                        <Line type="monotone" dataKey="old" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend />
                </div>
                <div className="overflow-x-auto -mx-4 px-4 pt-3 border-t border-slate-800/60">
                  <table className="w-full text-xs font-mono whitespace-nowrap">
                    <thead className="text-slate-500 border-b border-slate-800 bg-slate-950">
                      <tr>
                        <th className="py-2 px-2 text-left font-medium">Equity</th>
                        <th className="py-2 px-2 text-right font-medium text-amber-500/80">Fixed</th>
                        <th className="py-2 px-2 text-right font-medium text-blue-400/80">{'\u2153'} Pwr</th>
                        <th className="py-2 px-2 text-right font-medium text-emerald-400">{'\u2154'} Pwr</th>
                        <th className="py-2 px-2 text-right font-medium">Risk $</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">{QK.map((q, i) => {
                      const isA = Math.abs(dEq - q.v) < q.v * 0.08;
                      return (
                        <tr key={q.v} onClick={() => { if (!useReal) { setSimEq(q.v); setEqInput(fmt(q.v)); } }} className={'transition-colors ' + (isA ? 'bg-emerald-500/10' : i % 2 ? 'bg-slate-900/40' : '') + (!useReal ? ' cursor-pointer hover:bg-slate-800/40' : '')} style={isA ? { boxShadow: 'inset 3px 0 0 #10b981' } : {}}>
                          <td className={'py-2 px-2 font-semibold ' + (isA ? 'text-emerald-400' : 'text-slate-300')}>{q.l}</td>
                          <td className="py-2 px-2 text-right text-amber-500 tabular-nums">33.0%</td>
                          <td className="py-2 px-2 text-right text-blue-400 tabular-nums">{(rO(q.v) * 100).toFixed(1)}%</td>
                          <td className={'py-2 px-2 text-right font-bold tabular-nums ' + (rN(q.v) > K0 ? 'text-amber-400' : 'text-emerald-400')}>{(rN(q.v) * 100).toFixed(1)}%</td>
                          <td className="py-2 px-2 text-right text-rose-400 tabular-nums">{fmt(r$N(q.v))}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-slate-600 text-xs font-mono">{wr}% WR {'\u00B7'} {rr.toFixed(1)} RR {'\u00B7'} {'\u2154'} Power Decay</p>
    </div>
  );
}
