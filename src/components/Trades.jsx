import React, { useState, useMemo } from 'react';
import { Undo2, Redo2, Plus, LayoutGrid, TableProperties, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { fmt, fmtPnl } from '../math/format.js';
import FilterBar from './FilterBar.jsx';

const ordSuffix = n => {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};
const fmtDate = d => {
  const dt = new Date(d);
  const mon = dt.toLocaleDateString('en-US', { month: 'short' });
  const day = dt.getDate();
  return `${mon} ${day}${ordSuffix(day)}`;
};
const fmtDateFull = d => {
  const dt = new Date(d);
  const mon = dt.toLocaleDateString('en-US', { month: 'short' });
  const day = dt.getDate();
  return `${mon} ${day}${ordSuffix(day)} ${dt.getFullYear()}`;
};

const DirBadge = ({ dir, compact }) => {
  if (!dir) return null;
  const isLong = dir === 'long';
  return (
    <span className={'inline-flex items-center py-0.5 rounded font-bold leading-none ' +
      (compact ? 'px-1 text-[10px] ' : 'px-1.5 text-[11px] tracking-wide ') +
      (isLong ? 'bg-blue-500/15 text-blue-400' : 'bg-rose-500/15 text-rose-400')}>
      {compact ? (isLong ? 'L' : 'S') : (isLong ? 'Long' : 'Short')}
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
  const rMode = settings.rMultipleDisplay;
  const [view, setView] = useState('grid');
  const [filteredTrades, setFilteredTrades] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  // Use filtered trades if filters active, otherwise all trades
  const displayTrades = filteredTrades || trades.trades;

  const openEdit = (trade) => {
    onOpenTradeEntry(trade);
  };

  const handleFilter = (filtered) => {
    setFilteredTrades(filtered === trades.trades ? null : filtered);
  };

  // Table sorting
  const sortedTableTrades = useMemo(() => {
    const arr = [...displayTrades].reverse(); // newest first by default
    if (!sortCol) return arr;
    return arr.sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'date': va = a.date; vb = b.date; break;
        case 'pnl': va = a.pnl; vb = b.pnl; break;
        case 'rMult': va = a.riskDol > 0 ? a.pnl / a.riskDol : 0; vb = b.riskDol > 0 ? b.pnl / b.riskDol : 0; break;
        default: return 0;
      }
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [displayTrades, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ col, children, className = '' }) => (
    <th
      onClick={() => toggleSort(col)}
      className={'cursor-pointer select-none hover:text-slate-300 transition-colors ' + className}
    >
      <span className="flex items-center gap-0.5">
        {children}
        {sortCol === col && <span className="text-emerald-400">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
      </span>
    </th>
  );

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

      {/* Stats Dashboard */}
      {trades.stats.totalTrades > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
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

      {/* Filter Bar */}
      {trades.trades.length > 0 && (
        <FilterBar trades={trades.trades} onFilter={handleFilter} />
      )}

      {/* View Toggle — Grid / Table */}
      {trades.trades.length > 0 && (
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-line">
          {[
            { id: 'grid', l: 'Grid', ic: LayoutGrid },
            { id: 'table', l: 'Table', ic: TableProperties },
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

      {/* ===== GRID VIEW ===== */}
      {view === 'grid' && displayTrades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...displayTrades].reverse().map(t => {
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
                  {fmtPnl(t.pnl, t.riskDol, rMode)}
                </div>
                <div className={'text-xs font-mono font-semibold mt-0.5 ' +
                  (isWin ? 'text-emerald-400/60' : 'text-rose-400/60')}>
                  {rMode ? (isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl)) : (t.riskDol > 0 ? (isWin ? '+' : '-') + rMult.toFixed(1) + 'R' : '--')}
                </div>
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

      {/* ===== TABLE VIEW ===== */}
      {view === 'table' && displayTrades.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line no-sb">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-surface text-slate-500 text-left border-b border-line">
                <th className="px-3 py-2.5 font-medium sticky left-0 bg-surface z-10">#</th>
                <SortHeader col="date" className="px-3 py-2.5 font-medium whitespace-nowrap">Date</SortHeader>
                <th className="px-3 py-2.5 font-medium">Side</th>
                <SortHeader col="pnl" className="px-3 py-2.5 font-medium text-right">P&L</SortHeader>
                <SortHeader col="rMult" className="px-3 py-2.5 font-medium text-right">R-Mult</SortHeader>
                <th className="px-3 py-2.5 font-medium text-right">Equity</th>
              </tr>
            </thead>
            <tbody>
              {sortedTableTrades.map((t, i) => {
                const isWin = t.pnl >= 0;
                const rMult = t.riskDol > 0 ? t.pnl / t.riskDol : 0;
                return (
                  <tr
                    key={t.id}
                    onClick={() => openEdit(t)}
                    className={'cursor-pointer hover:bg-elevated/50 transition-colors border-b border-line/40 ' +
                      (i % 2 === 0 ? 'bg-deep' : 'bg-surface/30')}
                    style={{ height: '48px' }}
                  >
                    <td className="px-3 py-2 text-slate-500 sticky left-0 bg-inherit z-10">{t.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-slate-400">{fmtDateFull(t.date)}</div>
                      {t.openDate && (
                        <div className="text-[10px] text-slate-600">
                          {'\u2190'} {fmtDate(t.openDate)} {'\u00B7'} {calcDuration(t.openDate, t.date) || '<1d'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2"><DirBadge dir={t.direction} compact /></td>
                    <td className={'px-3 py-2 text-right font-bold tabular-nums ' + (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                      {fmtPnl(t.pnl, t.riskDol, rMode)}
                    </td>
                    <td className={'px-3 py-2 text-right font-bold tabular-nums ' + (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                      {rMode ? (isWin ? '+$' : '-$') + fmt(Math.abs(t.pnl)) : (t.riskDol > 0 ? (isWin ? '+' : '') + rMult.toFixed(1) + 'R' : '--')}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400 tabular-nums">${fmt(t.equityAfter)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {displayTrades.length === 0 && trades.trades.length === 0 && (
        <div className="flex flex-col items-center py-12 px-4">
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
          <p className="text-xs text-slate-500 text-center max-w-[240px]">
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

      {/* Filter empty state */}
      {displayTrades.length === 0 && trades.trades.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">No trades match filters</p>
        </div>
      )}

      {/* Undo / Redo — compact */}
      {(trades.trades.length > 0 || trades.canRedo) && (
        <div className="flex gap-2 pt-2">
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
      )}

    </div>
  );
}
