import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { fmt } from '../math/format.js';

export default function TradeEntry({ open, onClose, onSave, onEdit, editData, currentEquity, nextRisk }) {
  const isEditMode = !!editData;
  const [isWin, setIsWin] = useState(true);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editData) {
        // Edit mode: pre-populate from existing trade
        setIsWin(editData.pnl >= 0);
        setAmount(String(Math.abs(editData.pnl)));
        setNotes(editData.notes || '');
        setTradeDate(editData.date ? editData.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      } else {
        // New trade mode
        setAmount('');
        setNotes('');
        setIsWin(true);
        setTradeDate(new Date().toISOString().slice(0, 10));
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, editData]);

  const handleSave = () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;
    const pnl = isWin ? num : -num;

    if (isEditMode && onEdit) {
      // Build ISO date from the date input
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : undefined;
      onEdit(editData.id, { pnl, notes, date: dateISO });
    } else {
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : null;
      onSave(pnl, notes, dateISO);
    }
    onClose();
  };

  const handleAmountChange = e => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(val);
  };

  const previewEquity = amount
    ? Math.max(1, currentEquity + (isWin ? 1 : -1) * parseFloat(amount.replace(/,/g, '') || '0'))
    : currentEquity;

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
            className="fixed bottom-0 inset-x-0 z-[60] bg-surface border-t border-line rounded-t-3xl max-h-[85vh] overflow-y-auto"
          >
            <div className="p-5 pb-8 max-w-lg mx-auto">
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-line rounded-full" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">
                  {isEditMode ? 'Edit Trade' : 'Log Trade'}
                  {isEditMode && <span className="text-sm font-normal text-slate-500 ml-2">#{editData.id}</span>}
                </h2>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Win/Loss toggle */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  onClick={() => setIsWin(true)}
                  className={'flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ' +
                    (isWin
                      ? 'bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-elevated text-slate-500 hover:text-slate-300')}
                >
                  <TrendingUp className="w-4 h-4" /> WIN
                </button>
                <button
                  onClick={() => setIsWin(false)}
                  className={'flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ' +
                    (!isWin
                      ? 'bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/40'
                      : 'bg-elevated text-slate-500 hover:text-slate-300')}
                >
                  <TrendingDown className="w-4 h-4" /> LOSS
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
                    className="w-full bg-deep border border-line rounded-xl text-2xl font-bold font-mono text-white py-4 pl-14 pr-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Preview (new trades only) */}
              {!isEditMode && amount && parseFloat(amount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 bg-deep rounded-xl p-4 border border-line"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">New Equity</span>
                    <span className={'text-lg font-bold font-mono tabular-nums ' + (isWin ? 'text-emerald-400' : 'text-rose-400')}>
                      ${fmt(previewEquity)}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Notes */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., AAPL breakout"
                  className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-line transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Date picker */}
              <div className="mb-6">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Trade Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={e => setTradeDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 pl-10 pr-4 outline-none focus:border-line transition-all [color-scheme:dark]"
                  />
                </div>
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
                    <div className="text-emerald-400 font-bold">${fmt(nextRisk.dol)}</div>
                  </div>
                  <div className="flex-1 bg-deep rounded-lg p-3 border border-line text-center">
                    <div className="text-slate-500 mb-1">Risk %</div>
                    <div className="text-emerald-400 font-bold">{(nextRisk.pct * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {/* Save button */}
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
