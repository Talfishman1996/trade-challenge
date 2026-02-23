import React, { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Download, Upload, Trash2, Undo2, Plus, List, CalendarDays, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { getPhaseName, rN } from '../math/risk.js';
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function Trades({ trades, settings, onOpenTradeEntry }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [view, setView] = useState('calendar');
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

  const openEdit = (trade) => {
    onOpenTradeEntry(trade);
    setExpandedId(null);
  };

  const handleDelete = (id) => {
    trades.deleteTrade(id);
    setDeleteConfirm(null);
    setExpandedId(null);
  };

  const eq = trades.currentEquity;
  const list = [...trades.trades].reverse();

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-3xl mx-auto space-y-4">
      {/* Header + Log Trade */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Trade History</h2>
        <button
          onClick={() => onOpenTradeEntry()}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl active:scale-[0.97] hover:bg-emerald-400 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      {/* Summary Stats (compact 3-stat row) */}
      {trades.stats.totalTrades > 0 && view === 'list' && (
        <div className="flex items-center justify-between px-1">
          <div className="text-center">
            <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {(trades.stats.totalPnl >= 0 ? '+$' : '-$') + fmt(Math.abs(trades.stats.totalPnl))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Total P&L</div>
          </div>
          <div className="w-px h-8 bg-line/50" />
          <div className="text-center">
            <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400')}>
              {trades.stats.winRate.toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Win Rate</div>
          </div>
          <div className="w-px h-8 bg-line/50" />
          <div className="text-center">
            <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400')}>
              {trades.stats.profitFactor === Infinity ? '\u221E' : trades.stats.profitFactor.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Profit Factor</div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      {trades.trades.length > 0 && (
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-line">
          {[
            { id: 'calendar', l: 'Calendar', ic: CalendarDays },
            { id: 'list', l: 'List', ic: List },
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
          {/* Win Rate header */}
          <div className="bg-surface rounded-2xl p-4 border border-line">
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
                <div className="w-px bg-elevated" />
                <div>
                  <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">{trades.stats.losses}</div>
                  <div className="text-xs text-slate-600">losses</div>
                </div>
              </div>
            </div>
            <div className="flex mt-3 h-1.5 rounded-full overflow-hidden bg-elevated">
              <div className="bg-emerald-500 rounded-l-full transition-all duration-500"
                style={{ width: trades.stats.winRate + '%' }} />
              <div className="bg-rose-500 rounded-r-full transition-all duration-500"
                style={{ width: (100 - trades.stats.winRate) + '%' }} />
            </div>
          </div>

          {/* Trade Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {trades.trades.map(t => {
              const isWin = t.pnl >= 0;
              const rMult = t.riskDol > 0 ? Math.abs(t.pnl) / t.riskDol : 0;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => openEdit(t)}
                  className={'rounded-xl p-3 border-l-[3px] relative overflow-hidden cursor-pointer active:scale-[0.97] transition-transform ' +
                    (isWin
                      ? 'bg-emerald-500/5 border-l-emerald-500 border border-emerald-500/10'
                      : 'bg-rose-500/5 border-l-rose-500 border border-rose-500/10')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-semibold">#{t.id}</span>
                    <span className="text-[10px] text-slate-600 font-mono leading-tight text-right">
                      {t.openDate
                        ? <>{fmtDate(t.openDate)}<span className="text-slate-700"> {'\u2192'} </span>{fmtDate(t.date)}</>
                        : fmtDate(t.date)}
                    </span>
                  </div>
                  <div className={'text-lg font-bold font-mono tabular-nums tracking-tight ' +
                    (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                    {(isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                  </div>
                  <div className={'text-xs font-mono font-semibold mt-0.5 ' +
                    (isWin ? 'text-emerald-400/60' : 'text-rose-400/60')}>
                    {isWin ? '+' : '-'}{rMult.toFixed(1)}R
                  </div>
                  <Pencil className="absolute top-2.5 right-2.5 w-3 h-3 text-slate-700" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {trades.trades.length === 0 && (
        <div className="flex flex-col items-center py-12 px-4">
          {/* Ghost equity curve */}
          <svg className="w-48 h-20 mb-4" viewBox="0 0 200 80" fill="none">
            <defs>
              <linearGradient id="ghostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity=".08" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,70 Q30,65 60,55 T120,35 T180,18 L200,12" stroke="#10b981" strokeWidth="2"
              strokeDasharray="6 4" strokeLinecap="round" opacity=".4" />
            <path d="M0,70 Q30,65 60,55 T120,35 T180,18 L200,12 V80 H0 Z" fill="url(#ghostFill)" />
            <circle cx="200" cy="12" r="3" fill="#10b981" opacity=".3">
              <animate attributeName="opacity" values=".3;.7;.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
          <p className="text-sm font-semibold text-slate-400 mb-1">Your trading journal starts here</p>
          <p className="text-xs text-slate-600 text-center max-w-[240px]">
            Log your first trade to begin tracking equity, risk, and performance.
          </p>
          <button
            onClick={() => onOpenTradeEntry()}
            className="mt-5 flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl active:scale-[0.97] hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Log First Trade
          </button>
        </div>
      )}

      {/* Trade List View */}
      {view === 'list' && list.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {list.map(t => {
              const isExpanded = expandedId === t.id;
              const isDeleting = deleteConfirm === t.id;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={'bg-surface rounded-xl border overflow-hidden transition-colors ' +
                    (t.pnl >= 0 ? 'border-emerald-500/15' : 'border-rose-500/15') +
                    (isExpanded ? ' ring-1 ring-slate-700' : '')}
                >
                  {/* Trade row - compact, tap to expand */}
                  <div
                    className="px-3 py-2.5 cursor-pointer active:bg-elevated/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-slate-500 font-mono w-7">#{t.id}</span>
                        <span className="text-[11px] text-slate-600 font-mono">
                          {t.openDate
                            ? <>{fmtDate(t.openDate)}<span className="text-slate-700"> {'\u2192'} </span>{fmtDate(t.date)}</>
                            : fmtDate(t.date)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={'text-sm font-bold font-mono tabular-nums ' +
                          (t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {(t.pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">${fmt(t.equityAfter)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded action bar */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-t border-line/60"
                      >
                        {/* Trade details */}
                        <div className="px-3 pt-2.5 pb-1">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <div className="text-slate-500">Risk</div>
                              <div className="font-bold font-mono text-slate-300">{(t.riskPct * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Phase</div>
                              <div className="font-bold text-slate-300">{getPhaseName(t.phase)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">R-Mult</div>
                              <div className={'font-bold font-mono ' + (t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                {t.riskDol > 0 ? (t.pnl >= 0 ? '+' : '') + (t.pnl / t.riskDol).toFixed(1) + 'R' : '--'}
                              </div>
                            </div>
                          </div>
                          {t.notes && <p className="text-xs text-slate-400 mt-2 italic">{t.notes}</p>}
                        </div>
                        {/* Actions */}
                        {isDeleting ? (
                          <div className="flex gap-2 p-3 pt-2">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="flex-1 py-2 bg-rose-500/15 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/30 active:scale-[0.97] transition-all"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 py-2 bg-elevated text-slate-400 text-xs font-medium rounded-lg active:scale-[0.97] transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 p-3 pt-2">
                            <button
                              onClick={() => openEdit(t)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-elevated text-slate-300 text-xs font-semibold rounded-lg hover:bg-line active:scale-[0.97] transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(t.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-elevated text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-500/10 active:scale-[0.97] transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Action Buttons (only when trades exist) */}
      {trades.trades.length > 0 && (
        <div className="space-y-2 pt-2">
          <button
            onClick={() => trades.undoLastTrade()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-surface text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            <Undo2 className="w-4 h-4" /> Undo Last Trade
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>

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
                className="flex-1 py-3 bg-surface text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] transition-all"
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
        </div>
      )}

    </div>
  );
}
