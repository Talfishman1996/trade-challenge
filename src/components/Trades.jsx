import React, { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Download, Upload, Trash2, Undo2, Plus, Grid3X3, List, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { getPhaseName } from '../math/risk.js';
import TradeEntry from './TradeEntry.jsx';

export default function Trades({ trades, settings }) {
  const [showEntry, setShowEntry] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [view, setView] = useState('list');
  const fileRef = useRef(null);

  const handleExport = () => {
    const json = trades.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const ok = trades.importJSON(evt.target.result);
      if (!ok) alert('Invalid file format');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const eq = trades.currentEquity;
  const list = [...trades.trades].reverse();

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">
      {/* Header + Log Trade */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Trade History</h2>
        <button
          onClick={() => setShowEntry(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl active:scale-[0.97] hover:bg-emerald-400 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      {/* Summary Stats (only in list view) */}
      {trades.stats.totalTrades > 0 && view === 'list' && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Total P&L', v: (trades.stats.totalPnl >= 0 ? '+$' : '-$') + fmt(Math.abs(trades.stats.totalPnl)), c: trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            { l: 'Win Rate', v: trades.stats.winRate.toFixed(0) + '%', c: trades.stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400' },
            { l: 'Avg Win', v: trades.stats.wins > 0 ? '$' + fmt(trades.stats.avgWin) : '--', c: trades.stats.wins > 0 ? 'text-emerald-400' : 'text-slate-500' },
            { l: 'Avg Loss', v: trades.stats.losses > 0 ? '$' + fmt(trades.stats.avgLoss) : '--', c: trades.stats.losses > 0 ? 'text-rose-400' : 'text-slate-500' },
            { l: 'Profit Factor', v: trades.stats.profitFactor === Infinity ? '\u221E' : trades.stats.profitFactor.toFixed(2), c: trades.stats.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400' },
            { l: 'Max Drawdown', v: trades.stats.maxDrawdownPct.toFixed(1) + '%', c: 'text-amber-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
              <div className="text-xs text-slate-500 mb-1">{s.l}</div>
              <div className={'text-base font-bold font-mono tabular-nums ' + s.c}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* View Toggle */}
      {trades.trades.length > 0 && (
        <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800">
          {[
            { id: 'list', l: 'List', ic: List },
            { id: 'calendar', l: 'Calendar', ic: CalendarDays },
          ].map(v => {
            const Ic = v.ic;
            const on = view === v.id;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ' +
                  (on ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-slate-500 hover:text-slate-300')}>
                <Ic className="w-3.5 h-3.5" /> {v.l}
              </button>
            );
          })}
        </div>
      )}

      {/* Trade Calendar Grid View */}
      {view === 'calendar' && trades.trades.length > 0 && (
        <div className="space-y-3">
          {/* Auto-updating Win Rate header */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">Win Rate</div>
                <div className={'text-3xl font-bold font-mono tabular-nums tracking-tight ' +
                  (trades.stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400')}>
                  {trades.stats.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">{trades.stats.wins}</div>
                  <div className="text-xs text-slate-600">wins</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">{trades.stats.losses}</div>
                  <div className="text-xs text-slate-600">losses</div>
                </div>
              </div>
            </div>
            {/* Mini win rate bar */}
            <div className="flex mt-3 h-1.5 rounded-full overflow-hidden bg-slate-800">
              <div className="bg-emerald-500 rounded-l-full transition-all duration-500"
                style={{ width: trades.stats.winRate + '%' }} />
              <div className="bg-rose-500 rounded-r-full transition-all duration-500"
                style={{ width: (100 - trades.stats.winRate) + '%' }} />
            </div>
          </div>

          {/* Trade Grid */}
          <div className="grid grid-cols-2 gap-2">
            {trades.trades.map(t => {
              const isWin = t.pnl >= 0;
              const rMult = t.riskDol > 0 ? Math.abs(t.pnl) / t.riskDol : 0;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={'rounded-xl p-3 border-l-[3px] relative overflow-hidden ' +
                    (isWin
                      ? 'bg-emerald-500/5 border-l-emerald-500 border border-emerald-500/10'
                      : 'bg-rose-500/5 border-l-rose-500 border border-rose-500/10')}
                >
                  {/* Trade # and date */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-semibold">#{t.id}</span>
                    <span className="text-xs text-slate-600 font-mono">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {/* P&L - the main event */}
                  <div className={'text-lg font-bold font-mono tabular-nums tracking-tight ' +
                    (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                    {(isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                  </div>
                  {/* R-multiple */}
                  <div className={'text-xs font-mono font-semibold mt-0.5 ' +
                    (isWin ? 'text-emerald-400/60' : 'text-rose-400/60')}>
                    {isWin ? '+' : '-'}{rMult.toFixed(1)}R
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state (shown when no trades, regardless of view) */}
      {trades.trades.length === 0 && (
        <div className="text-center py-16">
          <div className="text-slate-700 text-4xl mb-3">0</div>
          <p className="text-sm text-slate-500">No trades yet. Tap "Log Trade" to start.</p>
        </div>
      )}

      {/* Trade List View */}
      {view === 'list' && list.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {list.map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={'bg-slate-900/60 rounded-xl p-3.5 border ' +
                      (t.pnl >= 0 ? 'border-emerald-500/15' : 'border-rose-500/15')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {t.pnl >= 0
                          ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                          : <TrendingDown className="w-4 h-4 text-rose-400" />}
                        <span className="text-xs text-slate-500 font-medium">Trade #{t.id}</span>
                      </div>
                      <span className="text-xs text-slate-600 font-mono">
                        {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className={'text-xl font-bold font-mono tabular-nums ' +
                        (t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {(t.pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                      </span>
                      <span className="text-sm text-slate-400 font-mono tabular-nums">
                        ${fmt(t.equityAfter)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                      <span>Risk: {(t.riskPct * 100).toFixed(1)}%</span>
                      <span className="text-slate-700">|</span>
                      <span>{getPhaseName(t.phase)}</span>
                      {t.notes && (
                        <>
                          <span className="text-slate-700">|</span>
                          <span className="text-slate-400 truncate">{t.notes}</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        {trades.trades.length > 0 && (
          <button
            onClick={() => trades.undoLastTrade()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900/60 text-slate-400 text-sm font-medium rounded-xl border border-slate-800 active:scale-[0.98] hover:bg-slate-800 transition-all"
          >
            <Undo2 className="w-4 h-4" /> Undo Last Trade
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900/60 text-slate-400 text-sm font-medium rounded-xl border border-slate-800 active:scale-[0.98] hover:bg-slate-800 transition-all"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900/60 text-slate-400 text-sm font-medium rounded-xl border border-slate-800 active:scale-[0.98] hover:bg-slate-800 transition-all"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {trades.trades.length > 0 && (
          <>
            {showConfirm === 'clear' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { trades.clearTrades(); setShowConfirm(null); }}
                  className="flex-1 py-3 bg-rose-500/15 text-rose-400 text-sm font-semibold rounded-xl border border-rose-500/30 active:scale-[0.98] transition-all"
                >
                  Confirm Clear All
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 bg-slate-900/60 text-slate-400 text-sm font-medium rounded-xl border border-slate-800 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm('clear')}
                className="w-full flex items-center justify-center gap-2 py-3 text-rose-500/60 text-sm font-medium rounded-xl border border-rose-500/10 active:scale-[0.98] hover:bg-rose-500/5 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Clear All Trades
              </button>
            )}
          </>
        )}
      </div>

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
