import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Clock, ChevronDown, ImagePlus, Trash2, CopyPlus } from 'lucide-react';
import { fmt } from '../math/format.js';
import TagPicker from './TagPicker.jsx';
import { SETUP_TAGS, EMOTION_TAGS, MISTAKE_TAGS, STRATEGY_OPTIONS } from '../store/tags.js';
import { compressImage, saveImage, getImage, deleteImage } from '../utils/imageDB.js';
import { daysBetweenLocalDates, todayLocalDate, toLocalDateString } from '../utils/tradeData.js';

const calcDuration = (open, close) => {
  if (!open || !close) return null;
  const days = Math.round(daysBetweenLocalDates(open, close) ?? 0);
  if (days === 0) return 'Same day';
  if (days === 1) return '1 day';
  if (days >= 7 && days < 14) return '1 week';
  if (days >= 14 && days % 7 === 0) return `${Math.round(days / 7)} weeks`;
  return `${days} days`;
};

const buildRecentValues = (items, pick, limit = 6) => {
  const seen = new Set();
  const values = [];
  for (const item of [...items].reverse()) {
    const rawValues = pick(item);
    for (const raw of rawValues) {
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(value);
      if (values.length >= limit) return values;
    }
  }
  return values;
};

// Collapsible section wrapper
const Section = ({ title, open, onToggle, count, children }) => (
  <div className="mb-4">
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full text-xs text-slate-500 font-medium mb-2"
    >
      <span>{title}{count > 0 && <span className="text-blue-400 ml-1">({count})</span>}</span>
      <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (open ? 'rotate-180' : '')} />
    </button>
    {open && (
      <div className="bg-deep rounded-xl border border-line p-3">
        {children}
      </div>
    )}
  </div>
);

export default function TradeEntry({
  open,
  onClose,
  onSave,
  onEdit,
  onDelete,
  editData,
  entrySeed,
  recentTrades = [],
  currentEquity,
  nextRisk,
}) {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState(null);

  const inputRef = useRef(null);
  const imageInputRef = useRef(null);

  const applyEntrySeed = (seed = {}) => {
    const nextDirection = seed.direction || 'long';
    const nextStrategy = seed.strategy || '';
    const nextContracts = seed.contracts != null && seed.contracts !== '' ? String(seed.contracts) : '';
    const nextEntryPrice = seed.entryPrice != null && seed.entryPrice !== '' ? String(seed.entryPrice) : '';
    const nextExitPrice = seed.exitPrice != null && seed.exitPrice !== '' ? String(seed.exitPrice) : '';
    const nextSetupTags = Array.isArray(seed.setupTags) ? seed.setupTags : [];
    const nextEmotionTags = Array.isArray(seed.emotionTags) ? seed.emotionTags : [];
    const nextMistakes = Array.isArray(seed.mistakes) ? seed.mistakes : [];
    const nextImageKeys = Array.isArray(seed.imageKeys) ? seed.imageKeys : (Array.isArray(seed.images) ? seed.images : []);
    const nextTradeDate = seed.tradeDate || seed.date ? toLocalDateString(seed.tradeDate || seed.date) : todayLocalDate();
    const nextOpenDate = seed.openDate ? toLocalDateString(seed.openDate) : '';

    setDirection(nextDirection);
    setIsWin(seed.isWin ?? ((seed.pnl ?? 1) >= 0));
    const nextAmount = seed.amount != null && seed.amount !== ''
      ? String(seed.amount)
      : (seed.pnl != null ? String(Math.abs(seed.pnl)) : '');
    setAmount(nextAmount);
    setTicker((seed.ticker || '').toUpperCase());
    setStrategy(nextStrategy);
    setContracts(nextContracts);
    setEntryPrice(nextEntryPrice);
    setExitPrice(nextExitPrice);
    setSetupTags(nextSetupTags);
    setEmotionTags(nextEmotionTags);
    setMistakes(nextMistakes);
    setTradeDate(nextTradeDate);
    setOpenDate(nextOpenDate);
    setEntryTime(seed.entryTime || '');
    setExitTime(seed.exitTime || '');
    setImageKeys(nextImageKeys);
    setImagePreviews([]);
    setMae(seed.mae != null && seed.mae !== '' ? String(seed.mae) : '');
    setMfe(seed.mfe != null && seed.mfe !== '' ? String(seed.mfe) : '');
    setNotes(seed.notes || '');
    setStrategyOpen(!!(nextStrategy || nextContracts || nextEntryPrice || nextExitPrice));
    setTagsOpen(!!(nextSetupTags.length || nextEmotionTags.length || nextMistakes.length));
    setMediaOpen(!!nextImageKeys.length);
    setAdvancedOpen(!!((seed.mae != null && seed.mae !== '') || (seed.mfe != null && seed.mfe !== '')));
  };

  const createFollowUpSeed = () => ({
    direction,
    isWin,
    ticker,
    strategy,
    contracts,
    setupTags,
    tradeDate: todayLocalDate(),
    openDate: '',
    entryTime: '',
    exitTime: '',
    amount: '',
    entryPrice: '',
    exitPrice: '',
    emotionTags: [],
    mistakes: [],
    imageKeys: [],
    mae: '',
    mfe: '',
    notes: '',
  });

  const recentTickers = useMemo(
    () => buildRecentValues(recentTrades, trade => [trade.ticker]),
    [recentTrades]
  );
  const recentSetupTags = useMemo(
    () => buildRecentValues(recentTrades, trade => trade.setupTags || [], 8),
    [recentTrades]
  );
  const numericAmount = parseFloat((amount || '').replace(/,/g, ''));
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0;
  const editSnapshot = useMemo(() => {
    if (!canSubmit) return null;
    const pnl = (isWin ? 1 : -1) * numericAmount;
    return {
      pnl,
      direction,
      ticker,
      notes,
      setupTags,
      emotionTags,
      mistakes,
      strategy,
      contracts: contracts ? parseFloat(contracts) : 0,
      entryPrice: entryPrice ? parseFloat(entryPrice) : 0,
      exitPrice: exitPrice ? parseFloat(exitPrice) : 0,
      entryTime,
      exitTime,
      images: imageKeys,
      mae: mae ? parseFloat(mae) : null,
      mfe: mfe ? parseFloat(mfe) : null,
      date: tradeDate || undefined,
      openDate: openDate || null,
    };
  }, [
    canSubmit,
    contracts,
    direction,
    emotionTags,
    entryPrice,
    entryTime,
    exitPrice,
    exitTime,
    imageKeys,
    isWin,
    mae,
    mfe,
    mistakes,
    notes,
    openDate,
    setupTags,
    strategy,
    ticker,
    tradeDate,
    numericAmount,
  ]);
  const closeSheet = () => {
    if (!isSubmitting) onClose();
  };

  // Load image previews from IndexedDB
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadPreviews = async () => {
      const urls = (await Promise.all(
        imageKeys.map(async (key) => {
          const url = await getImage(key);
          return url ? { key, url } : null;
        })
      )).filter(Boolean);
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
        applyEntrySeed(editData);
        setLastAutoSaveAt(null);
      } else if (entrySeed) {
        applyEntrySeed(entrySeed);
        setLastAutoSaveAt(null);
      } else {
        applyEntrySeed({ isWin: true });
        setLastAutoSaveAt(null);
      }
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, editData, entrySeed]);

  useEffect(() => {
    if (!open || !isEditMode || isSubmitting || !onEdit || !editData || !editSnapshot) return;
    const original = JSON.stringify({
      pnl: editData.pnl,
      direction: editData.direction || 'long',
      ticker: editData.ticker || '',
      notes: editData.notes || '',
      setupTags: editData.setupTags || [],
      emotionTags: editData.emotionTags || [],
      mistakes: editData.mistakes || [],
      strategy: editData.strategy || '',
      contracts: editData.contracts || 0,
      entryPrice: editData.entryPrice || 0,
      exitPrice: editData.exitPrice || 0,
      entryTime: editData.entryTime || '',
      exitTime: editData.exitTime || '',
      images: editData.images || [],
      mae: editData.mae ?? null,
      mfe: editData.mfe ?? null,
      date: editData.date || undefined,
      openDate: editData.openDate || null,
    });
    const next = JSON.stringify(editSnapshot);
    if (original === next) return;
    const id = setTimeout(async () => {
      await onEdit(editData.id, editSnapshot, { silent: true });
      setLastAutoSaveAt(Date.now());
    }, 450);
    return () => clearTimeout(id);
  }, [editData, editSnapshot, isEditMode, isSubmitting, onEdit, open]);

  const commitTrade = async (closeAfterSave = true) => {
    const num = numericAmount;
    if (isNaN(num) || num <= 0 || isSubmitting) return;
    const pnl = isWin ? num : -num;

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

    setIsSubmitting(true);
    try {
      if (isEditMode && onEdit) {
        await onEdit(editData.id, { ...tradeFields, date: tradeDate || undefined, openDate: openDate || null });
      } else {
        await onSave({ ...tradeFields, date: tradeDate || null, openDate: openDate || null });
      }

      if (closeAfterSave || isEditMode) {
        onClose();
        return;
      }

      applyEntrySeed(createFollowUpSeed());
      setShowDeleteConfirm(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally {
      setIsSubmitting(false);
    }
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
    const uploadedKeys = (await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file, 200);
        if (!compressed) return null;
        const key = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await saveImage(key, compressed);
        return key;
      })
    )).filter(Boolean);
    if (uploadedKeys.length > 0) {
      setImageKeys(prev => [...prev, ...uploadedKeys]);
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

  const handleDelete = async () => {
    if (!editData || !onDelete) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onDelete(editData.id);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onClick={closeSheet}
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
            onDragEnd={(_, info) => { if (info.offset.y > 120) closeSheet(); }}
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
                <button onClick={closeSheet} className="p-3 text-slate-500 hover:text-white rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {isEditMode && (
                <div className="mb-4 text-[11px] text-slate-500">
                  {lastAutoSaveAt
                    ? `Changes auto-saved ${new Date(lastAutoSaveAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                    : 'Valid changes auto-save while you edit.'}
                </div>
              )}

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
                <label className="text-xs text-slate-500 font-medium mb-2 block">Profit / Loss Amount</label>
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
                    placeholder="0.00"
                    className="w-full bg-deep border border-line rounded-xl text-xl font-bold font-mono text-white py-4 pl-14 pr-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-150 tabular-nums placeholder:text-slate-700"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Type the actual dollar result. Use WIN/LOSS above to set the sign.
                </p>
              </div>

              {/* Ticker */}
              <div className="mb-5">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Ticker</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, ES, BTC"
                  className="w-full bg-deep border border-line rounded-xl text-sm font-mono font-bold text-white py-3 px-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-700 placeholder:font-normal"
                />
                {recentTickers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recentTickers.map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTicker(value)}
                        className={'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ' +
                          (ticker === value
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-surface text-slate-400 border-line hover:text-slate-200')}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* === STRATEGY SECTION (collapsible) === */}
              <Section title="Strategy & Sizing" open={strategyOpen} onToggle={() => setStrategyOpen(!strategyOpen)} count={strategyCount}>
                <div className="space-y-3">
                  {/* Strategy dropdown */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Strategy</label>
                    <select
                      value={strategy}
                      onChange={e => setStrategy(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg text-sm text-white py-2.5 px-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
                    >
                      <option value="">Select strategy...</option>
                      {STRATEGY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Contracts + Entry/Exit Price — 2-column grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium mb-1 block">Size</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={contracts}
                        onChange={e => setContracts(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium mb-1 block">Entry $</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entryPrice}
                        onChange={handleDecimalInput(setEntryPrice)}
                        placeholder="0.00"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-medium mb-1 block">Exit $</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={exitPrice}
                        onChange={handleDecimalInput(setExitPrice)}
                        placeholder="0.00"
                        className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* === TAGS SECTION (collapsible) === */}
              <Section title="Tags" open={tagsOpen} onToggle={() => setTagsOpen(!tagsOpen)} count={tagCount}>
                <div className="space-y-4">
                  {recentSetupTags.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium mb-2 block">Recent Setup Shortcuts</div>
                      <div className="flex flex-wrap gap-2">
                        {recentSetupTags.map(tag => {
                          const active = setupTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSetupTags(prev => (
                                prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
                              ))}
                              className={'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ' +
                                (active
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-surface text-slate-400 border-line hover:text-slate-200')}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                    max={tradeDate || todayLocalDate()}
                    className="flex-1 bg-deep border border-line rounded-lg text-base text-white py-2.5 px-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    value={entryTime}
                    onChange={e => setEntryTime(e.target.value)}
                    className="w-24 bg-deep border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
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
                    max={todayLocalDate()}
                    className="flex-1 bg-deep border border-line rounded-lg text-base text-white py-2.5 px-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    value={exitTime}
                    onChange={e => setExitTime(e.target.value)}
                    className="w-24 bg-deep border border-line rounded-lg text-sm font-mono text-white py-2.5 px-2 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
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
                  <p className="text-[10px] text-slate-500">Images auto-compressed to &lt;200KB JPEG</p>
                </div>
              </Section>

              {/* === ADVANCED SECTION (collapsible) === */}
              <Section title="Advanced Risk" open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)} count={[mae, mfe].filter(Boolean).length}>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">MAE — Worst drawdown during trade ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={mae}
                      onChange={handleDecimalInput(setMae)}
                      placeholder="0"
                      className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums placeholder:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">MFE — Best unrealized gain during trade ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={mfe}
                      onChange={handleDecimalInput(setMfe)}
                      placeholder="0"
                      className="w-full bg-surface border border-line rounded-lg text-sm font-mono text-white py-2.5 px-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums placeholder:text-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
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
                  className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-700 resize-none"
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
                    <div className="text-slate-500 mb-1">1R Risk</div>
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
              <div className="space-y-2">
                {isEditMode && onDelete && (
                  showDeleteConfirm ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="py-3 rounded-xl font-semibold text-sm bg-rose-500/15 text-rose-400 border border-rose-500/30 active:scale-[0.98] transition-all"
                      >
                        {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isSubmitting}
                        className="py-3 rounded-xl font-medium text-sm bg-elevated text-slate-400 border border-line active:scale-[0.98] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl font-medium text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 active:scale-[0.98] transition-all"
                    >
                      Delete Trade
                    </button>
                  )
                )}
                {!isEditMode && (
                  <button
                    onClick={() => commitTrade(false)}
                    disabled={!canSubmit || isSubmitting}
                    className={'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ' +
                      (canSubmit && !isSubmitting
                        ? 'bg-elevated text-slate-200 border border-line active:scale-[0.98] hover:bg-line'
                        : 'bg-elevated text-slate-600 border border-line cursor-not-allowed')}
                  >
                    <CopyPlus className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : 'Save & Add Another'}
                  </button>
                )}
                <button
                  onClick={() => commitTrade(true)}
                  disabled={!canSubmit || isSubmitting}
                  className={'w-full py-4 rounded-xl font-bold text-base transition-all ' +
                    (canSubmit && !isSubmitting
                      ? 'bg-blue-500 text-white active:scale-[0.98] hover:bg-blue-400'
                      : 'bg-elevated text-slate-600 cursor-not-allowed')}
                >
                  {isSubmitting ? (isEditMode ? 'Saving...' : 'Saving...') : (isEditMode ? 'Save Changes' : 'Save Trade')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
