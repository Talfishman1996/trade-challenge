import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Clock, ChevronDown, ImagePlus, Trash2 } from 'lucide-react';
import { fmt } from '../math/format.js';
import TagPicker from './TagPicker.jsx';
import { SETUP_TAGS, EMOTION_TAGS, MISTAKE_TAGS, STRATEGY_OPTIONS } from '../store/tags.js';
import { compressImage, saveImage, getImage, deleteImage } from '../utils/imageDB.js';

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

// Collapsible section wrapper
const Section = ({ title, open, onToggle, count, children }) => (
  <div className="mb-4">
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full text-xs text-slate-500 font-medium mb-2"
    >
      <span>{title}{count > 0 && <span className="text-emerald-400 ml-1">({count})</span>}</span>
      <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (open ? 'rotate-180' : '')} />
    </button>
    {open && (
      <div className="bg-deep rounded-xl border border-line p-3">
        {children}
      </div>
    )}
  </div>
);

export default function TradeEntry({ open, onClose, onSave, onEdit, editData, currentEquity, nextRisk }) {
  const isEditMode = !!editData;

  // Core fields
  const [direction, setDirection] = useState('long');
  const [isWin, setIsWin] = useState(true);
  const [amount, setAmount] = useState('');
  const [ticker, setTicker] = useState('');

  // Strategy fields
  const [strategy, setStrategy] = useState('');
  const [contracts, setContracts] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');

  // Tag fields
  const [setupTags, setSetupTags] = useState([]);
  const [emotionTags, setEmotionTags] = useState([]);
  const [mistakes, setMistakes] = useState([]);

  // Timing fields
  const [tradeDate, setTradeDate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');

  // Media
  const [imageKeys, setImageKeys] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Advanced
  const [mae, setMae] = useState('');
  const [mfe, setMfe] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Section toggles
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const inputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Load image previews from IndexedDB
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadPreviews = async () => {
      const urls = [];
      for (const key of imageKeys) {
        const url = await getImage(key);
        if (url && !cancelled) urls.push({ key, url });
      }
      if (!cancelled) setImagePreviews(urls);
    };
    loadPreviews();
    return () => { cancelled = true; };
  }, [open, imageKeys]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (open) {
      if (editData) {
        setDirection(editData.direction || 'long');
        setIsWin(editData.pnl >= 0);
        setAmount(String(Math.abs(editData.pnl)));
        setTicker(editData.ticker || '');
        setStrategy(editData.strategy || '');
        setContracts(editData.contracts ? String(editData.contracts) : '');
        setEntryPrice(editData.entryPrice ? String(editData.entryPrice) : '');
        setExitPrice(editData.exitPrice ? String(editData.exitPrice) : '');
        setSetupTags(editData.setupTags || []);
        setEmotionTags(editData.emotionTags || []);
        setMistakes(editData.mistakes || []);
        setTradeDate(editData.date ? editData.date.slice(0, 10) : localDate());
        setOpenDate(editData.openDate ? editData.openDate.slice(0, 10) : '');
        setEntryTime(editData.entryTime || '');
        setExitTime(editData.exitTime || '');
        setImageKeys(editData.images || []);
        setMae(editData.mae != null ? String(editData.mae) : '');
        setMfe(editData.mfe != null ? String(editData.mfe) : '');
        setNotes(editData.notes || '');

        // Auto-open sections with data
        setStrategyOpen(!!(editData.strategy || editData.contracts || editData.entryPrice || editData.exitPrice));
        setTagsOpen(!!(editData.setupTags?.length || editData.emotionTags?.length || editData.mistakes?.length));
        setMediaOpen(!!(editData.images?.length));
        setAdvancedOpen(!!(editData.mae != null || editData.mfe != null));
      } else {
        setDirection('long');
        setIsWin(true);
        setAmount('');
        setTicker('');
        setStrategy('');
        setContracts('');
        setEntryPrice('');
        setExitPrice('');
        setSetupTags([]);
        setEmotionTags([]);
        setMistakes([]);
        setTradeDate(localDate());
        setOpenDate('');
        setEntryTime('');
        setExitTime('');
        setImageKeys([]);
        setImagePreviews([]);
        setMae('');
        setMfe('');
        setNotes('');
        setStrategyOpen(false);
        setTagsOpen(false);
        setMediaOpen(false);
        setAdvancedOpen(false);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, editData]);

  const handleSave = () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;
    const pnl = isWin ? num : -num;
    const openDateISO = openDate ? new Date(openDate + 'T12:00:00').toISOString() : null;

    const tradeFields = {
      pnl, direction, ticker, notes,
      setupTags, emotionTags, mistakes,
      strategy,
      contracts: contracts ? parseFloat(contracts) : 0,
      entryPrice: entryPrice ? parseFloat(entryPrice) : 0,
      exitPrice: exitPrice ? parseFloat(exitPrice) : 0,
      entryTime, exitTime,
      images: imageKeys,
      mae: mae ? parseFloat(mae) : null,
      mfe: mfe ? parseFloat(mfe) : null,
    };

    if (isEditMode && onEdit) {
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : undefined;
      onEdit(editData.id, { ...tradeFields, date: dateISO, openDate: openDateISO });
    } else {
      const dateISO = tradeDate ? new Date(tradeDate + 'T12:00:00').toISOString() : null;
      onSave({ ...tradeFields, date: dateISO, openDate: openDateISO });
    }
    onClose();
  };

  const handleAmountChange = e => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const val = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    setAmount(val);
  };

  const handleDecimalInput = (setter) => (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    setter(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compressImage(file, 200);
      if (compressed) {
        const key = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await saveImage(key, compressed);
        setImageKeys(prev => [...prev, key]);
      }
    }
    e.target.value = '';
  };

  const removeImage = async (key) => {
    await deleteImage(key);
    setImageKeys(prev => prev.filter(k => k !== key));
    setImagePreviews(prev => {
      const p = prev.find(x => x.key === key);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter(x => x.key !== key);
    });
  };

  const duration = calcDuration(openDate, tradeDate);

  const tagCount = setupTags.length + emotionTags.length + mistakes.length;
  const strategyCount = [strategy, contracts, entryPrice, exitPrice].filter(Boolean).length;

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
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
            className="fixed bottom-0 inset-x-0 z-[60] bg-surface border-t border-line rounded-t-3xl max-h-[90vh] flex flex-col"
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

              {/* === CORE SECTION (always open) === */}

              {/* Win/Loss toggle */}
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

              {/* Direction toggle */}
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

              {/* P&L Amount */}
              <div className="mb-4">
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

              {/* Ticker */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Ticker</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, ES, BTC"
                  className="w-full bg-deep border border-line rounded-xl text-sm font-mono font-bold text-white py-3 px-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700 placeholder:font-normal"
                />
              </div>

              {/* === STRATEGY SECTION (collapsible) === */}
              <Section title="Strategy & Sizing" open={strategyOpen} onToggle={() => setStrategyOpen(!strategyOpen)} count={strategyCount}>
                <div className="space-y-3">
                  {/* Strategy dropdown */}
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium mb-1 block">Strategy</label>
                    <select
                      value={strategy}
                      onChange={e => setStrategy(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg text-sm text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all [color-scheme:dark]"
                    >
                      <option value="">Select strategy...</option>
                      {STRATEGY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Contracts + Entry/Exit Price — 2-column grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600 font-medium mb-1 block">Size</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={contracts}
                        onChange={e => setContracts(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 font-medium mb-1 block">Entry $</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entryPrice}
                        onChange={handleDecimalInput(setEntryPrice)}
                        placeholder="0.00"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 font-medium mb-1 block">Exit $</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={exitPrice}
                        onChange={handleDecimalInput(setExitPrice)}
                        placeholder="0.00"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* === TAGS SECTION (collapsible) === */}
              <Section title="Tags" open={tagsOpen} onToggle={() => setTagsOpen(!tagsOpen)} count={tagCount}>
                <div className="space-y-4">
                  <TagPicker tags={SETUP_TAGS} selected={setupTags} onChange={setSetupTags} color="emerald" label="Setup" />
                  <TagPicker tags={EMOTION_TAGS} selected={emotionTags} onChange={setEmotionTags} color="amber" label="Emotion" />
                  <TagPicker tags={MISTAKE_TAGS} selected={mistakes} onChange={setMistakes} color="rose" label="Mistakes" />
                </div>
              </Section>

              {/* === TIMING SECTION (always visible) === */}
              <div className="mb-4 space-y-2">
                <div className="text-xs text-slate-500 font-medium">Timing</div>
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
                  <input
                    type="time"
                    value={entryTime}
                    onChange={e => setEntryTime(e.target.value)}
                    className="w-24 bg-deep border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all [color-scheme:dark]"
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
                  <input
                    type="time"
                    value={exitTime}
                    onChange={e => setExitTime(e.target.value)}
                    className="w-24 bg-deep border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
                {duration && (
                  <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" /> Held {duration}
                  </div>
                )}
              </div>

              {/* === MEDIA SECTION (collapsible) === */}
              <Section title="Chart Screenshots" open={mediaOpen} onToggle={() => setMediaOpen(!mediaOpen)} count={imageKeys.length}>
                <div className="space-y-3">
                  {/* Image previews */}
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map(p => (
                        <div key={p.key} className="relative w-20 h-20 rounded-lg overflow-hidden border border-line group">
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(p.key)}
                            className="absolute top-0.5 right-0.5 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-surface border border-dashed border-line rounded-lg text-xs text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-all"
                  >
                    <ImagePlus className="w-4 h-4" />
                    {imageKeys.length > 0 ? 'Add More' : 'Add Chart Screenshot'}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <p className="text-[10px] text-slate-600">Images auto-compressed to &lt;200KB JPEG</p>
                </div>
              </Section>

              {/* === ADVANCED SECTION (collapsible) === */}
              <Section title="Advanced Risk" open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)} count={[mae, mfe].filter(Boolean).length}>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium mb-1 block">MAE — Worst drawdown during trade ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={mae}
                      onChange={handleDecimalInput(setMae)}
                      placeholder="0"
                      className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium mb-1 block">MFE — Best unrealized gain during trade ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={mfe}
                      onChange={handleDecimalInput(setMfe)}
                      placeholder="0"
                      className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums placeholder:text-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    MAE = maximum adverse excursion (how bad it got before recovery).
                    MFE = maximum favorable excursion (best unrealized profit before exit).
                    Both help identify if you're cutting winners short or letting losers run.
                  </p>
                </div>
              </Section>

              {/* === NOTES (always visible) === */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What was the setup? What went right/wrong?"
                  rows={2}
                  className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700 resize-none"
                />
              </div>

              {/* Current context (new trades only) */}
              {!isEditMode && (
                <div className="flex gap-3 mb-4 text-xs font-mono">
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
