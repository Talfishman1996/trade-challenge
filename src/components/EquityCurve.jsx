import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import { fmt } from '../math/format.js';
import { MILES, TT, AX } from '../math/constants.js';

function EqTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{ ...TT, minWidth: 130, padding: '10px 14px' }}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 15 }}>
        ${fmt(d.equity)}
      </div>
      {d.pnl !== undefined && (
        <div style={{
          color: d.pnl >= 0 ? '#10b981' : '#f43f5e',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 12, fontWeight: 600, marginTop: 2
        }}>
          {d.pnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(d.pnl))}
        </div>
      )}
      {d.dd > 0 && (
        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 2, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
          DD: {'\u2212'}{d.dd.toFixed(1)}%
        </div>
      )}
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>
        Trade #{d.trade}
        {d.date && (' \u00B7 ' + new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
      </div>
    </div>
  );
}

export default function EquityCurve({ trades, height = 280 }) {
  const [xMode, setXMode] = useState('trades');

  const chartData = useMemo(() => {
    const pts = [];
    let peak = trades.initialEquity;
    const firstDate = trades.trades.length > 0 ? new Date(trades.trades[0].date).getTime() - 86400000 : Date.now();
    pts.push({ trade: 0, equity: trades.initialEquity, dd: 0, dateTs: firstDate });

    trades.trades.forEach((t, i) => {
      const eq = t.equityAfter;
      if (eq > peak) peak = eq;
      const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
      pts.push({
        trade: i + 1,
        equity: eq,
        pnl: t.pnl,
        date: t.date,
        dateTs: new Date(t.date).getTime(),
        dd,
      });
    });
    return pts;
  }, [trades.trades, trades.initialEquity]);

  const minEq = Math.min(...chartData.map(d => d.equity));
  const maxEq = Math.max(...chartData.map(d => d.equity));
  const yPad = (maxEq - minEq) * 0.1 || maxEq * 0.1;
  const maxDD = Math.max(...chartData.map(d => d.dd), 1);

  const visibleMiles = useMemo(
    () => MILES.filter(m => m.v > minEq && m.v <= maxEq * 1.3 && m.v !== maxEq),
    [minEq, maxEq]
  );

  if (chartData.length < 2) {
    return (
      <div className="text-center py-10 text-sm text-slate-500">
        Log trades to see your equity curve.
      </div>
    );
  }

  const len = chartData.length;
  const xKey = xMode === 'dates' ? 'dateTs' : 'trade';
  const xType = xMode === 'dates' ? 'number' : 'number';
  const xTickFmt = xMode === 'dates'
    ? v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : undefined;

  const mainHeight = Math.round(height * 0.65);
  const ddHeight = Math.round(height * 0.28);

  return (
    <div className="select-none">
      {/* X-axis mode toggle */}
      <div className="flex items-center justify-end gap-1 mb-2">
        {['trades', 'dates'].map(m => (
          <button
            key={m}
            onClick={() => setXMode(m)}
            className={'text-[10px] px-2 py-1 rounded-md font-medium transition-all ' +
              (xMode === m ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300')}
          >
            {m === 'trades' ? 'By Trade' : 'By Date'}
          </button>
        ))}
      </div>

      {/* Main equity chart — step line */}
      <div style={{ height: mainHeight }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey={xKey} type={xType} stroke="#475569" tick={AX}
              tickFormatter={xTickFmt} axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={v => '$' + fmt(v)}
              stroke="#475569" tick={AX}
              domain={[minEq - yPad, maxEq + yPad]}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<EqTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1 }} isAnimationActive={false} />
            {trades.peakEquity > trades.initialEquity && (
              <ReferenceLine y={trades.peakEquity} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.4} />
            )}
            {visibleMiles.map(m => (
              <ReferenceLine
                key={m.v} y={m.v} stroke="#334155" strokeDasharray="3 3"
                label={{ value: m.l, position: 'right', fill: '#475569', fontSize: 10 }}
              />
            ))}
            <Area
              type="stepAfter" dataKey="equity"
              stroke="#10b981" fill="url(#eqFill)" strokeWidth={2}
              dot={(props) => {
                if (props.index !== len - 1) return null;
                return (
                  <circle cx={props.cx} cy={props.cy} r={4} fill="#10b981" stroke="#0f172a" strokeWidth={2} />
                );
              }}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Drawdown underwater chart */}
      <div style={{ height: ddHeight }} className="mt-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey={xKey} type={xType} hide />
            <YAxis
              reversed
              domain={[0, Math.ceil(maxDD)]}
              tickFormatter={v => v > 0 ? '\u2212' + v.toFixed(0) + '%' : '0%'}
              stroke="#475569" tick={{ ...AX, fontSize: 9 }}
              axisLine={false} tickLine={false}
            />
            <Area
              type="stepAfter" dataKey="dd"
              stroke="#ef4444" fill="url(#ddFill)" strokeWidth={1.5}
              dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 2 && (
        <div className="text-center text-[10px] text-slate-500 mt-1">Equity (top) / Drawdown (bottom)</div>
      )}
    </div>
  );
}
