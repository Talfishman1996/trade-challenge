import React, { useState, useMemo } from 'react';
import { X, Filter, ChevronDown } from 'lucide-react';

const QUICK_FILTERS = [
  { id: 'winners', group: 'outcome', label: 'Winners', fn: t => t.pnl > 0 },
  { id: 'losers', group: 'outcome', label: 'Losers', fn: t => t.pnl <= 0 },
  { id: 'long', group: 'direction', label: 'Long', fn: t => t.direction === 'long' },
  { id: 'short', group: 'direction', label: 'Short', fn: t => t.direction === 'short' },
];

export default function FilterBar({ trades, onFilter }) {
  const [active, setActive] = useState({});
  const [tickerFilter, setTickerFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Unique tickers from trade data
  const tickers = useMemo(() => {
    const set = new Set();
    for (const t of trades) if (t.ticker) set.add(t.ticker);
    return [...set].sort();
  }, [trades]);

  // Unique tags across all tag families
  const usedTags = useMemo(() => {
    const set = new Set();
    for (const t of trades) {
      if (t.setupTags) t.setupTags.forEach(tag => set.add(tag));
      if (t.emotionTags) t.emotionTags.forEach(tag => set.add(tag));
      if (t.mistakes) t.mistakes.forEach(tag => set.add(tag));
    }
    return [...set].sort();
  }, [trades]);

  const [tagFilter, setTagFilter] = useState(new Set());

  // Apply filters
  const applyFilters = (nextActive, nextTicker, nextTags) => {
    let result = trades;

    // One active quick filter per group
    for (const qf of QUICK_FILTERS) {
      if (nextActive[qf.group] === qf.id) {
        result = result.filter(qf.fn);
      }
    }

    // Ticker filter
    if (nextTicker) {
      result = result.filter(t => t.ticker === nextTicker);
    }

    // Tag filter (any match)
    if (nextTags.size > 0) {
      result = result.filter(t =>
        [t.setupTags || [], t.emotionTags || [], t.mistakes || []]
          .flat()
          .some(tag => nextTags.has(tag))
      );
    }

    onFilter(result);
  };

  const toggleQuick = (id) => {
    const quick = QUICK_FILTERS.find(item => item.id === id);
    if (!quick) return;
    const next = { ...active };
    next[quick.group] = next[quick.group] === id ? null : id;
    setActive(next);
    applyFilters(next, tickerFilter, tagFilter);
  };

  const setTicker = (val) => {
    setTickerFilter(val);
    applyFilters(active, val, tagFilter);
  };

  const toggleTag = (tag) => {
    const next = new Set(tagFilter);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setTagFilter(next);
    applyFilters(active, tickerFilter, next);
  };

  const clearAll = () => {
    setActive({});
    setTickerFilter('');
    setTagFilter(new Set());
    setShowAdvanced(false);
    onFilter(trades);
  };

  const hasFilters = Object.values(active).some(Boolean) || tickerFilter || tagFilter.size > 0;

  return (
    <div className="space-y-2">
      {/* Quick filter pills — horizontal scroll */}
      <div className="flex items-center gap-2 overflow-x-auto no-sb pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.id}
            onClick={() => toggleQuick(qf.id)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ' +
              (active[qf.group] === qf.id
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'bg-elevated text-slate-500 hover:text-slate-300')}
          >
            {qf.label}
          </button>
        ))}
        {/* Ticker pills */}
        {tickers.length > 0 && tickers.slice(0, 6).map(tk => (
          <button
            key={tk}
            onClick={() => setTicker(tickerFilter === tk ? '' : tk)}
            className={'px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all shrink-0 ' +
              (tickerFilter === tk
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'bg-elevated text-slate-500 hover:text-slate-300')}
          >
            {tk}
          </button>
        ))}
        {/* Show more button */}
        {(tickers.length > 6 || usedTags.length > 0) && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400 bg-elevated shrink-0 transition-all"
          >
            <ChevronDown className={'w-3 h-3 transition-transform ' + (showAdvanced ? 'rotate-180' : '')} />
          </button>
        )}
        {/* Clear all */}
        {hasFilters && (
          <button onClick={clearAll} className="px-2 py-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Advanced: tag filter */}
      {showAdvanced && usedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {usedTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={'px-2 py-1 rounded text-[10px] font-medium transition-all ' +
                (tagFilter.has(tag)
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'bg-elevated text-slate-600 hover:text-slate-400')}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {hasFilters && (
        <div className="text-[10px] text-slate-500 px-1">
          Showing filtered results
        </div>
      )}
    </div>
  );
}
