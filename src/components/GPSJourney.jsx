import React, { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import { rN } from '../math/risk.js';
import { fmt } from '../math/format.js';
import { MILES, TT, AX } from '../math/constants.js';

// Seeded PRNG for reproducible simulations
function mkRng(seed) {
  let s = seed | 0 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// Extract percentile from sorted array
function pct(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

// Run Monte Carlo cone simulation
function runCone(equity, wr, rr, nTrades = 200, nPaths = 500, seed = 555) {
  const rand = mkRng(seed);
  const wrFrac = wr / 100;

  // grid[t] = array of equity values across all paths at trade t
  const grid = Array.from({ length: nTrades + 1 }, () => []);

  for (let p = 0; p < nPaths; p++) {
    let eq = equity;
    grid[0].push(eq);
    for (let t = 1; t <= nTrades; t++) {
      const risk = rN(eq);
      const riskDol = eq * risk;
      eq = rand() < wrFrac ? eq + riskDol * rr : eq - riskDol;
      if (eq < 1) eq = 1;
      grid[t].push(eq);
    }
  }

  // Sort each step and extract percentiles
  const data = [];
  for (let t = 0; t <= nTrades; t++) {
    const sorted = grid[t].sort((a, b) => a - b);
    const p5 = pct(sorted, 0.05);
    const p16 = pct(sorted, 0.16);
    const p25 = pct(sorted, 0.25);
    const p50 = pct(sorted, 0.50);
    const p75 = pct(sorted, 0.75);
    const p84 = pct(sorted, 0.84);
    const p95 = pct(sorted, 0.95);
    data.push({
      trade: t,
      p50,
      // Stacked area trick: base (transparent) + height (filled)
      bWide: p5,
      hWide: p95 - p5,
      bMid: p16,
      hMid: p84 - p16,
      bNarrow: p25,
      hNarrow: p75 - p25,
    });
  }
  return data;
}

function ConeTip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{ ...TT, padding: '8px 12px', minWidth: 120 }}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
        ${fmt(Math.round(d.p50))}
      </div>
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>
        Trade #{d.trade} median
      </div>
      <div style={{ color: '#475569', fontSize: 9, marginTop: 2, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
        P5: ${fmt(Math.round(d.bWide))} {'\u2014'} P95: ${fmt(Math.round(d.bWide + d.hWide))}
      </div>
    </div>
  );
}

export default function ProbabilityCone({ equity, winRate, rewardRatio, seed = 555, numTrades = 200 }) {
  const coneData = useMemo(
    () => runCone(equity, winRate, rewardRatio, numTrades, 500, seed),
    [equity, winRate, rewardRatio, numTrades, seed]
  );

  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of coneData) {
      const top = d.bWide + d.hWide;
      if (top > m) m = top;
    }
    return m;
  }, [coneData]);

  const visibleMiles = useMemo(
    () => MILES.filter(m => m.v > equity * 0.9 && m.v < maxVal * 1.1),
    [equity, maxVal]
  );

  return (
    <div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={coneData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="coneWide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="coneMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="coneNarrow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="trade" stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => '$' + fmt(v)} stroke="#475569" tick={AX} axisLine={false} tickLine={false} />
            <RTooltip content={<ConeTip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} isAnimationActive={false} />

            {/* Starting equity line */}
            <ReferenceLine y={equity} stroke="#475569" strokeDasharray="2 4" strokeOpacity={0.4} />

            {/* Milestone lines */}
            {visibleMiles.map(m => (
              <ReferenceLine
                key={m.v} y={m.v} stroke="#334155" strokeDasharray="3 3"
                label={{ value: m.l, position: 'right', fill: '#475569', fontSize: 9 }}
              />
            ))}

            {/* P5-P95 band (widest, lightest) */}
            <Area type="monotone" dataKey="bWide" stackId="wide" fill="transparent" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
            <Area type="monotone" dataKey="hWide" stackId="wide" fill="url(#coneWide)" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />

            {/* P16-P84 band (medium) */}
            <Area type="monotone" dataKey="bMid" stackId="mid" fill="transparent" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
            <Area type="monotone" dataKey="hMid" stackId="mid" fill="url(#coneMid)" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />

            {/* P25-P75 band (narrowest, darkest) */}
            <Area type="monotone" dataKey="bNarrow" stackId="narrow" fill="transparent" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />
            <Area type="monotone" dataKey="hNarrow" stackId="narrow" fill="url(#coneNarrow)" stroke="none" isAnimationActive={false} dot={false} activeDot={false} />

            {/* P50 median line */}
            <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs mt-2">
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-emerald-500/8 border border-emerald-500/15" />P5{'\u2013'}P95</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-emerald-500/15 border border-emerald-500/25" />P16{'\u2013'}P84</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-sm bg-emerald-500/25 border border-emerald-500/35" />P25{'\u2013'}P75</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-emerald-500" />Median</span>
      </div>
      <p className="text-center text-[10px] text-slate-500 mt-1 font-mono">500 paths {'\u00D7'} {numTrades} trades</p>
    </div>
  );
}
