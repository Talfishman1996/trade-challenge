import React, { useMemo } from 'react';
import { calcTimeAnalytics } from '../math/analytics.js';
import { fmt } from '../math/format.js';

const fmtHour = h => {
  const suffix = h >= 12 ? 'PM' : 'AM';
  return ((h % 12) || 12) + suffix;
};

const cellBg = (avgPnl, maxAbs, count) => {
  if (count === 0 || maxAbs === 0) return 'transparent';
  const t = Math.min(1, Math.abs(avgPnl) / maxAbs);
  if (avgPnl > 0) return `rgba(16, 185, 129, ${(0.08 + t * 0.32).toFixed(2)})`;
  if (avgPnl < 0) return `rgba(239, 68, 68, ${(0.08 + t * 0.32).toFixed(2)})`;
  return 'transparent';
};

export default function Heatmap({ trades }) {
  const { byDay, byHour } = useMemo(() => calcTimeAnalytics(trades), [trades]);

  // Show Mon-Fri always, weekends only if they have data
  const tradingDays = useMemo(() =>
    byDay.filter((d, i) => (i >= 1 && i <= 5) || d.count > 0),
    [byDay]
  );

  const maxDayAvg = useMemo(() =>
    Math.max(...tradingDays.map(d => Math.abs(d.avgPnl)), 1),
    [tradingDays]
  );

  const maxHourAvg = useMemo(() =>
    byHour.length > 0 ? Math.max(...byHour.map(h => Math.abs(h.avgPnl)), 1) : 1,
    [byHour]
  );

  if (tradingDays.every(d => d.count === 0)) return null;

  return (
    <div className="space-y-5">
      {/* Day of Week */}
      <div>
        <h4 className="text-sm font-bold text-white mb-2">Day of Week</h4>
        <div className="grid grid-cols-5 gap-1.5">
          {tradingDays.map(d => (
            <div
              key={d.day}
              className="rounded-lg p-2.5 text-center border border-line/50 bg-elevated"
              style={{ backgroundColor: cellBg(d.avgPnl, maxDayAvg, d.count) }}
            >
              <div className="text-[10px] text-slate-500 font-medium">{d.day}</div>
              <div className={'text-sm font-bold font-mono tabular-nums mt-0.5 ' +
                (d.count === 0 ? 'text-slate-600' : d.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {d.count === 0 ? '--' : (d.avgPnl >= 0 ? '+$' : '-$') + fmt(Math.abs(d.avgPnl))}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {d.count > 0 ? d.count + (d.count === 1 ? ' trade' : ' trades') : 'No trades'}
              </div>
              {d.count > 0 && (
                <div className={'text-[10px] font-medium mt-0.5 ' +
                  ((d.wins / d.count * 100) >= 50 ? 'text-emerald-400/70' : 'text-red-400/70')}>
                  {(d.wins / d.count * 100).toFixed(0)}% win
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hour of Day */}
      {byHour.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white mb-2">Time of Day</h4>
          <div className="flex flex-wrap gap-1.5">
            {byHour.map(h => (
              <div
                key={h.hour}
                className="rounded-md px-2.5 py-2 text-center min-w-[60px] border border-line/50 bg-elevated"
                style={{ backgroundColor: cellBg(h.avgPnl, maxHourAvg, h.count) }}
              >
                <div className="text-[10px] text-slate-500 font-medium">{fmtHour(h.hour)}</div>
                <div className={'text-xs font-bold font-mono tabular-nums mt-0.5 ' +
                  (h.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(h.avgPnl >= 0 ? '+' : '-') + '$' + fmt(Math.abs(h.avgPnl))}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{h.count}t</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
