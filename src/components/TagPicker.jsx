import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

// Color schemes for tag categories
const COLORS = {
  emerald: {
    active: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
    inactive: 'bg-elevated text-slate-500 hover:text-slate-300',
    input: 'border-emerald-500/40 focus:ring-emerald-500/30',
  },
  amber: {
    active: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
    inactive: 'bg-elevated text-slate-500 hover:text-slate-300',
    input: 'border-amber-500/40 focus:ring-amber-500/30',
  },
  rose: {
    active: 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30',
    inactive: 'bg-elevated text-slate-500 hover:text-slate-300',
    input: 'border-rose-500/40 focus:ring-rose-500/30',
  },
};

export default function TagPicker({ tags, selected = [], onChange, color = 'emerald', label }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const scheme = COLORS[color] || COLORS.emerald;

  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomValue('');
    setShowCustom(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
    if (e.key === 'Escape') { setShowCustom(false); setCustomValue(''); }
  };

  return (
    <div>
      {label && <div className="text-xs text-slate-500 font-medium mb-2">{label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ' +
              (selected.includes(tag) ? scheme.active : scheme.inactive)}
          >
            {tag}
          </button>
        ))}
        {/* Custom tags not in predefined list */}
        {selected.filter(t => !tags.includes(t)).map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1 ' + scheme.active}
          >
            {tag}
            <X className="w-3 h-3 opacity-60" />
          </button>
        ))}
        {/* Add custom tag */}
        {showCustom ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (!customValue.trim()) setShowCustom(false); }}
              placeholder="Custom..."
              className={'w-24 bg-deep border rounded-lg text-xs text-white py-1.5 px-2 outline-none focus:ring-1 transition-all ' + scheme.input}
            />
            <button
              type="button"
              onClick={addCustom}
              className="p-1 text-slate-400 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400 bg-elevated border border-dashed border-line transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
