import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { fmt } from '../math/format.js';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calcDuration = (open, close) => {
  if (!open || !close) return null;
  const ms = new Date(close) - new Date(open);
  const days = Math.round(ms / 86400000);
  if (days === 0) return 'Same day';
  if (days === 1) return '1 day';
  if (days >= 7 && days < 14) return '1 week';
  if (days >= 14 && days % 7 === 0) return `${Math.round(days / 7)} weeks`;
  return `${days} days`;
};

export default function TradeEntry({ open, onClose, onSave, onEdit, editData, currentEquity, nextRisk }) {
  const isEditMode = !!editData;
  const [direction, setDirection] = useState('long');
  const [isWin, setIsWin] = useState(true);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editData) {
        setDirection(editData.direction || 'long');
        setIsWin(editData.pnl >= 0);
        setAmount(String(Math.abs(editData.pnl)));
        setNotes(editData.notes || '');
        setTradeDate(editData.date ? editData.date.slice(0, 10) : localDate());
        setOpenDate(editData.openDate ? editData.openDate.slice(0, 10) : '');
      } else {
        setDirection('long');
        setAmount('');
        setNotes('');
        setIsWin(true);
        setTradeDate(localDate());
        setOpenDate('');
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, editData]);

  const handleSave = () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;
    const pnl = isWin ? num : -num;
    const openDateISO = openDate ? new Date(openDate + 'T12:00:00').toISOString() : null;

    if (isEditMode && onEdit) {
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : undefined;
      onEdit(editData.id, { pnl, notes, date: dateISO, openDate: openDateISO, direction });
    } else {
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : null;
      onSave(pnl, notes, dateISO, openDateISO, direction);
    }
    onClose();
  };

  const handleAmountChange = e => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const val = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    setAmount(val);
  };

  const duration = calcDuration(openDate, tradeDate);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 inset-x-0 z-[60] bg-surface border-t border-line rounded-t-3xl max-h-[85vh] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5 pb-3 max-w-lg mx-auto">
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-line rounded-full" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">
                  {isEditMode ? 'Edit Trade' : 'Log Trade'}
                  {isEditMode && <span className="text-sm font-normal text-slate-500 ml-2">#{editData.id}</span>}
                </h2>
                <button onClick={onClose} className="p-3 text-slate-500 hover:text-white rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Win/Loss — primary toggle */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setIsWin(true)}
                  className={'flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ' +
                    (isWin
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-elevated text-slate-500 hover:text-slate-300')}
                >
                  <TrendingUp className="w-4 h-4" /> WIN
                </button>
                <button
                  onClick={() => setIsWin(false)}
                  className={'flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ' +
                    (!isWin
                      ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40'
                      : 'bg-elevated text-slate-500 hover:text-slate-300')}
                >
                  <TrendingDown className="w-4 h-4" /> LOSS
                </button>
              </div>

              {/* Long/Short — toggle pill */}
              <div className="flex bg-deep rounded-xl border border-line p-0.5 mb-5">
                <button
                  onClick={() => setDirection('long')}
                  className={'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[10px] text-xs font-semibold transition-all ' +
                    (direction === 'long'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-slate-500 hover:text-slate-400')}
                >
                  <ArrowUpRight className="w-3 h-3" /> Long
                </button>
                <button
                  onClick={() => setDirection('short')}
                  className={'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[10px] text-xs font-semibold transition-all ' +
                    (direction === 'short'
                      ? 'bg-violet-500/15 text-violet-400'
                      : 'text-slate-500 hover:text-slate-400')}
                >
                  <ArrowDownRight className="w-3 h-3" /> Short
                </button>
              </div>

              {/* Amount input */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 font-medium mb-2 block">P&L Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-600">
                    {isWin ? '+$' : '-$'}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full bg-deep border border-line rounded-xl text-xl font-bold font-mono text-white py-4 pl-14 pr-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150 tabular-nums placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., AAPL breakout"
                  className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Dates — clean horizontal rows */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs text-slate-500 font-medium">Opened</span>
                  </div>
                  <input
                    type="date"
                    value={openDate}
                    onChange={e => setOpenDate(e.target.value)}
                    max={tradeDate || localDate()}
                    className="flex-1 bg-deep border border-line rounded-lg text-base text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs text-slate-500 font-medium">Closed</span>
                  </div>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={e => setTradeDate(e.target.value)}
                    min={openDate || undefined}
                    max={localDate()}
                    className="flex-1 bg-deep border border-line rounded-lg text-base text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
                {duration && (
                  <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" /> Held {duration}
                  </div>
                )}
              </div>

              {/* Current context (new trades only) */}
              {!isEditMode && (
                <div className="flex gap-3 mb-6 text-xs font-mono">
                  <div className="flex-1 bg-deep rounded-lg p-3 border border-line text-center">
                    <div className="text-slate-500 mb-1">Current</div>
                    <div className="text-white font-bold">${fmt(currentEquity)}</div>
                  </div>
                  <div className="flex-1 bg-deep rounded-lg p-3 border border-line text-center">
                    <div className="text-slate-500 mb-1">Risk Allowed</div>
                    <div className="text-red-400 font-bold">${fmt(nextRisk.dol)}</div>
                  </div>
                  <div className="flex-1 bg-deep rounded-lg p-3 border border-line text-center">
                    <div className="text-slate-500 mb-1">Risk %</div>
                    <div className="text-red-400 font-bold">{(nextRisk.pct * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}

            </div>
            </div>
            {/* Fixed save button */}
            <div className="shrink-0 px-5 pb-8 pt-3 max-w-lg mx-auto w-full border-t border-line/50">
              <button
                onClick={handleSave}
                disabled={!amount || parseFloat(amount) <= 0}
                className={'w-full py-4 rounded-xl font-bold text-base transition-all ' +
                  (amount && parseFloat(amount) > 0
                    ? 'bg-emerald-500 text-white active:scale-[0.98] hover:bg-emerald-400'
                    : 'bg-elevated text-slate-600 cursor-not-allowed')}
              >
                {isEditMode ? 'Save Changes' : 'Save Trade'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
