import React, { useState, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, Download, Upload, Trash2, Undo2, Redo2, Plus, List, CalendarDays, Pencil, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { getPhaseName, rN } from '../math/risk.js';
import { exportJSON, importJSON } from '../utils/dataIO.js';
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const DirBadge = ({ dir }) => {
  if (!dir) return null;
  const isLong = dir === 'long';
  return (
    <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide leading-none ' +
      (isLong ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400')}>
      {isLong ? 'Long' : 'Short'}
    </span>
  );
};

const calcDuration = (open, close) => {
  if (!open || !close) return null;
  const ms = new Date(close) - new Date(open);
  const days = Math.round(ms / 86400000);
  if (days === 0) return null;
  return `${days}d`;
};

export default function Trades({ trades, settings, onOpenTradeEntry, showToast }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [view, setView] = useState('calendar');
  const fileRef = useRef(null);

  const handleExport = () => exportJSON(trades);

  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    importJSON(file, trades, msg => showToast?.(msg, 'error'));
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

  // Group trades by month (reverse chronological) for list view
  const monthGroups = useMemo(() => {
    if (trades.trades.length === 0) return [];
    const groups = {};
    for (const t of trades.trades) {
      const key = t.date.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, monthTrades]) => ({
        key,
        label: new Date(key + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        trades: [...monthTrades].sort((a, b) => new Date(b.date) - new Date(a.date)),
        pnl: monthTrades.reduce((s, t) => s + t.pnl, 0),
        wins: monthTrades.filter(t => t.pnl > 0).length,
        count: monthTrades.length,
      }));
  }, [trades.trades]);

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

      {/* Stats Dashboard — always visible */}
      {trades.stats.totalTrades > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
          {/* Win Rate with progress bar */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">Win Rate</div>
              <div className={'text-2xl font-bold font-mono tabular-nums tracking-tight ' +
                (trades.stats.winRate >= 60 ? 'text-emerald-400' : trades.stats.winRate >= 50 ? 'text-amber-400' : 'text-rose-400')}>
                {trades.stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">{trades.stats.wins}</div>
                <div className="text-xs text-slate-500">wins</div>
              </div>
              <div className="w-px bg-elevated" />
              <div>
                <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">{trades.stats.losses}</div>
                <div className="text-xs text-slate-500">losses</div>
              </div>
            </div>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-elevated">
            <div className="bg-emerald-500 rounded-l-full transition-all duration-500"
              style={{ width: trades.stats.winRate + '%' }} />
            <div className="bg-rose-500 rounded-r-full transition-all duration-500"
              style={{ width: (100 - trades.stats.winRate) + '%' }} />
          </div>

          {/* 2x3 stats grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {(trades.stats.totalPnl >= 0 ? '+$' : '-$') + fmt(Math.abs(trades.stats.totalPnl))}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Total P&L</div>
            </div>
            <div className="text-center">
              <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400')}>
                {trades.stats.profitFactor === Infinity ? '\u221E' : trades.stats.profitFactor.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Profit Factor</div>
            </div>
            <div className="text-center">
              <div className={'text-base font-bold font-mono tabular-nums ' + (trades.stats.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {trades.stats.expectancy >= 0 ? '+$' : '-$'}{fmt(Math.abs(trades.stats.expectancy))}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Expectancy</div>
            </div>
            <div className="text-center">
              <div className={'text-base font-bold font-mono tabular-nums ' +
                (trades.stats.streakType === 'win' ? 'text-emerald-400' : trades.stats.streakType === 'loss' ? 'text-rose-400' : 'text-slate-400')}>
                {trades.stats.currentStreak > 0
                  ? (trades.stats.streakType === 'win' ? '+' : '-') + trades.stats.currentStreak
                  : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold font-mono tabular-nums text-rose-400">
                {trades.stats.maxDrawdownPct > 0 ? '-' + trades.stats.maxDrawdownPct.toFixed(1) + '%' : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Max DD</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold font-mono tabular-nums text-slate-300">
                {trades.stats.totalTrades}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Trades</div>
            </div>
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

      {/* Calendar Grid View */}
      {view === 'calendar' && trades.trades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...trades.trades].reverse().map(t => {
            const isWin = t.pnl >= 0;
            const rMult = t.riskDol > 0 ? Math.abs(t.pnl) / t.riskDol : 0;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => openEdit(t)}
                className={'bg-surface rounded-xl p-3 border-l-[3px] border relative overflow-hidden cursor-pointer active:scale-[0.97] transition-all hover:ring-1 hover:ring-line ' +
                  (isWin
                    ? 'border-l-emerald-500 border-emerald-500/15'
                    : 'border-l-rose-500 border-rose-500/15')}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-slate-500 font-semibold shrink-0">#{t.id}</span>
                    <DirBadge dir={t.direction} />
                    {t.ticker && <span className="text-xs text-slate-400 font-mono font-bold truncate">{t.ticker}</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono leading-tight mb-1">
                  {t.openDate
                    ? <>{fmtDate(t.openDate)}<span className="text-slate-700"> {'\u2192'} </span>{fmtDate(t.date)}{calcDuration(t.openDate, t.date) && <span className="text-slate-700 ml-0.5">({calcDuration(t.openDate, t.date)})</span>}</>
                    : fmtDate(t.date)}
                </div>
                <div className={'text-lg font-bold font-mono tabular-nums tracking-tight ' +
                  (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                  {(isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                </div>
                <div className={'text-xs font-mono font-semibold mt-0.5 ' +
                  (isWin ? 'text-emerald-400/60' : 'text-rose-400/60')}>
                  {t.riskDol > 0 ? (isWin ? '+' : '-') + rMult.toFixed(1) + 'R' : '--'}
                </div>
                {/* Setup tags (first 2) */}
                {t.setupTags && t.setupTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.setupTags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 font-medium">{tag}</span>
                    ))}
                    {t.setupTags.length > 2 && <span className="text-[9px] text-slate-600">+{t.setupTags.length - 2}</span>}
                  </div>
                )}
                <Pencil className="absolute top-2.5 right-2.5 w-3 h-3 text-slate-700" />
              </motion.div>
            );
          })}
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

      {/* List View — grouped by month */}
      {view === 'list' && monthGroups.length > 0 && (
        <div className="space-y-5">
          {monthGroups.map(group => (
            <div key={group.key} className="space-y-2">
              {/* Month header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-400">{group.label}</span>
                <div className="flex items-center gap-2.5">
                  <span className={'text-xs font-bold font-mono tabular-nums ' + (group.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {(group.pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(group.pnl))}
                  </span>
                  <span className="text-xs text-slate-600 font-mono">{group.count} trades</span>
                </div>
              </div>

              {/* Trades in month */}
              <AnimatePresence>
                {group.trades.map(t => {
                  const isExpanded = expandedId === t.id;
                  const isDeleting = deleteConfirm === t.id;
                  const isWin = t.pnl >= 0;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={'bg-surface rounded-xl border-l-[3px] border overflow-hidden transition-colors ' +
                        (isWin
                          ? 'border-l-emerald-500 border-emerald-500/15'
                          : 'border-l-rose-500 border-rose-500/15') +
                        (isExpanded ? ' ring-1 ring-slate-700' : '')}
                    >
                      {/* Trade row */}
                      <div
                        className="px-3 py-2.5 cursor-pointer active:bg-elevated/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-slate-500 font-mono min-w-7 shrink-0">#{t.id}</span>
                            <DirBadge dir={t.direction} />
                            {t.ticker && <span className="text-xs text-slate-400 font-mono font-bold truncate">{t.ticker}</span>}
                            <span className="text-xs text-slate-600 font-mono shrink-0">
                              {t.openDate
                                ? <>{fmtDate(t.openDate)}<span className="text-slate-700"> {'\u2192'} </span>{fmtDate(t.date)}{calcDuration(t.openDate, t.date) && <span className="text-slate-700"> ({calcDuration(t.openDate, t.date)})</span>}</>
                                : fmtDate(t.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* Tag indicator */}
                            {((t.setupTags?.length || 0) + (t.emotionTags?.length || 0) + (t.mistakes?.length || 0)) > 0 && (
                              <Tag className="w-3 h-3 text-slate-600" />
                            )}
                            <div className="text-right">
                              <span className={'text-sm font-bold font-mono tabular-nums ' +
                                (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                                {(isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl))}
                              </span>
                              <div className="text-xs text-slate-500 font-mono tabular-nums">${fmt(t.equityAfter)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="border-t border-line/60"
                          >
                            <div className="px-3 pt-2.5 pb-1">
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div>
                                  <div className="text-slate-500">Side</div>
                                  <div className={'font-bold ' + (t.direction === 'short' ? 'text-violet-400' : 'text-blue-400')}>
                                    {t.direction === 'short' ? 'Short' : t.direction === 'long' ? 'Long' : '--'}
                                  </div>
                                </div>
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
                              {/* Tags display */}
                              {((t.setupTags?.length || 0) + (t.emotionTags?.length || 0) + (t.mistakes?.length || 0)) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(t.setupTags || []).map(tag => (
                                    <span key={'s-' + tag} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">{tag}</span>
                                  ))}
                                  {(t.emotionTags || []).map(tag => (
                                    <span key={'e-' + tag} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">{tag}</span>
                                  ))}
                                  {(t.mistakes || []).map(tag => (
                                    <span key={'m-' + tag} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-medium">{tag}</span>
                                  ))}
                                </div>
                              )}
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
          ))}
        </div>
      )}

      {/* Actions — Undo/Redo + secondary tools */}
      {(trades.trades.length > 0 || trades.canRedo) && (
        <div className="pt-3 space-y-3">
          {/* Primary: Undo / Redo */}
          <div className="flex gap-2">
            <button
              onClick={() => trades.undoLastTrade()}
              disabled={trades.trades.length === 0}
              className={'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border active:scale-[0.98] transition-all ' +
                (trades.trades.length > 0
                  ? 'bg-surface text-slate-400 border-line hover:bg-elevated'
                  : 'bg-surface/50 text-slate-600 border-line/50 cursor-not-allowed')}
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
            <button
              onClick={() => trades.redoLastTrade()}
              disabled={!trades.canRedo}
              className={'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border active:scale-[0.98] transition-all ' +
                (trades.canRedo
                  ? 'bg-surface text-slate-400 border-line hover:bg-elevated'
                  : 'bg-surface/50 text-slate-600 border-line/50 cursor-not-allowed')}
            >
              <Redo2 className="w-4 h-4" /> Redo
            </button>
          </div>

          {/* Secondary: Export · Import · Clear — compact text links */}
          {trades.trades.length > 0 && (
            <>
              <div className="flex items-center justify-center gap-4">
                <button onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <span className="text-slate-600">|</span>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
                <span className="text-slate-600">|</span>
                {showConfirm === 'clear' ? (
                  <span className="flex items-center gap-2">
                    <button onClick={() => { trades.clearTrades(); setShowConfirm(null); }}
                      className="text-xs text-red-400 font-semibold hover:text-red-300 transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => setShowConfirm(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setShowConfirm('clear')}
                    className="flex items-center gap-1.5 text-xs text-red-500/50 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
