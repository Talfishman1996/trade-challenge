import React from 'react';
import { Info } from 'lucide-react';

export const Tip = ({ text }) => (
  <span className="group relative inline-flex items-center ml-1 cursor-help">
    <Info className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
    <span className="absolute bottom-full left-1/2 mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-elevated text-slate-300 text-xs rounded-lg border border-line p-2.5 z-50 pointer-events-none font-sans normal-case tracking-normal leading-relaxed" style={{ transform: 'translateX(-50%)' }}>
      {text}
      <span className="absolute top-full left-1/2 -mt-px border-4 border-transparent border-t-slate-800" style={{ transform: 'translateX(-50%)' }} />
    </span>
  </span>
);

export const ChartLegend = () => (
  <div className="flex flex-wrap justify-center gap-5 mt-4">
    {[
      { c: 'border-emerald-500', l: '\u2154 Power' },
      { c: 'border-blue-500', l: '\u2153 Power' },
      { c: 'border-amber-500 border-dashed', l: 'Fixed 33%' },
    ].map((x, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={'w-5 h-0 border-t-2 ' + x.c} />
        <span className="text-xs text-slate-500 font-medium">{x.l}</span>
      </div>
    ))}
  </div>
);

export default function MetricCard({ label, value, sub, barColor, tip, children }) {
  return (
    <div className="bg-surface rounded-xl p-3 sm:p-4 border border-line relative overflow-hidden flex flex-col justify-center">
      {barColor && <div className={'absolute top-0 left-0 w-1 h-full rounded-r ' + barColor} />}
      <div className="text-xs text-slate-500 font-medium mb-1 flex items-center">
        {label}{tip && <Tip text={tip} />}
      </div>
      {children || (
        <>
          <div className={'text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ' + (value && value.className ? value.className : 'text-slate-100')}>
            {value && value.text ? value.text : value}
          </div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </>
      )}
    </div>
  );
}
