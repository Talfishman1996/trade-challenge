import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import { TT, AX, CHART_MARGIN as cm } from '../math/constants.js';

function ScatterTip({ active, payload, xLabel, yLabel, xFmt, yFmt }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const xVal = xFmt ? xFmt(d.x) : d.x;
  const yVal = yFmt ? yFmt(d.y) : d.y;
  return (
    <div style={{ ...TT, padding: '8px 12px' }}>
      {d.ticker && <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 3, fontWeight: 600 }}>{d.ticker}</div>}
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {xLabel}: <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{xVal}</span>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {yLabel}: <span style={{ color: d.y >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{yVal}</span>
      </div>
    </div>
  );
}

export default function ScatterPlot({
  data,
  xKey,
  yKey,
  xLabel = 'X',
  yLabel = 'Y',
  sizeKey,
  xFormatter,
  yFormatter,
  height = 200,
  showZeroLines = false,
}) {
  // Normalize data: rename xKey/yKey to x/y for consistent access
  const { positive, negative } = useMemo(() => {
    const pos = [], neg = [];
    for (const d of data) {
      const pt = { ...d, x: d[xKey], y: d[yKey] };
      if (pt.y >= 0) pos.push(pt);
      else neg.push(pt);
    }
    return { positive: pos, negative: neg };
  }, [data, xKey, yKey]);

  if (data.length === 0) return null;

  const sizeRange = sizeKey ? [30, 200] : [40, 40];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ScatterChart margin={{ ...cm, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="x" name={xLabel} type="number"
            tickFormatter={xFormatter} stroke="#475569" tick={AX}
            axisLine={false} tickLine={false}
          />
          <YAxis
            dataKey="y" name={yLabel} type="number"
            tickFormatter={yFormatter} stroke="#475569" tick={AX}
            axisLine={false} tickLine={false}
          />
          {sizeKey && <ZAxis dataKey={sizeKey} range={sizeRange} />}
          {showZeroLines && (
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
          )}
          <RTooltip
            content={<ScatterTip xLabel={xLabel} yLabel={yLabel} xFmt={xFormatter} yFmt={yFormatter} />}
            cursor={{ strokeDasharray: '4 4', stroke: '#475569' }}
            isAnimationActive={false}
          />
          {positive.length > 0 && (
            <Scatter data={positive} fill="#10b981" fillOpacity={0.7} isAnimationActive={false} />
          )}
          {negative.length > 0 && (
            <Scatter data={negative} fill="#ef4444" fillOpacity={0.7} isAnimationActive={false} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
