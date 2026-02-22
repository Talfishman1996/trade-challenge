import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { fmt } from '../math/format.js';
import { MILES, TT, AX } from '../math/constants.js';

function EqTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={TT}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
        ${fmt(d.equity)}
      </div>
      {d.pnl !== undefined && (
        <div style={{
          color: d.pnl >= 0 ? '#10b981' : '#f43f5e',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11
        }}>
          {d.pnl >= 0 ? '+$' : '-$'}{fmt(Math.abs(d.pnl))}
        </div>
      )}
      <div style={{ color: '#64748b', fontSize: 10 }}>
        Trade #{d.trade}
        {d.date && (' \u00B7 ' + new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
      </div>
    </div>
  );
}

export default function EquityCurve({ trades, height = 256 }) {
  const chartData = useMemo(() => {
    const pts = [{ trade: 0, equity: trades.initialEquity }];
    trades.trades.forEach((t, i) => {
      pts.push({ trade: i + 1, equity: t.equityAfter, pnl: t.pnl, date: t.date });
    });
    return pts;
  }, [trades.trades, trades.initialEquity]);

  const minEq = Math.min(...chartData.map(d => d.equity));
  const maxEq = Math.max(...chartData.map(d => d.equity));
  const yPad = (maxEq - minEq) * 0.1 || maxEq * 0.1;

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

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="trade" stroke="#475569" tick={AX}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={v => '$' + fmt(v)}
            stroke="#475569" tick={AX}
            domain={[minEq - yPad, maxEq + yPad]}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<EqTooltip />} />
          {/* Peak equity */}
          {trades.peakEquity > trades.initialEquity && (
            <ReferenceLine
              y={trades.peakEquity} stroke="#f59e0b"
              strokeDasharray="5 5" strokeOpacity={0.4}
            />
          )}
          {/* Milestone lines */}
          {visibleMiles.map(m => (
            <ReferenceLine
              key={m.v} y={m.v} stroke="#334155" strokeDasharray="3 3"
              label={{ value: m.l, position: 'right', fill: '#475569', fontSize: 10 }}
            />
          ))}
          <Area
            type="monotone" dataKey="equity"
            stroke="#10b981" fill="url(#eqFill)" strokeWidth={2}
            dot={(props) => {
              if (props.index !== len - 1) return null;
              return (
                <circle
                  cx={props.cx} cy={props.cy} r={4}
                  fill="#10b981" stroke="#0f172a" strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
