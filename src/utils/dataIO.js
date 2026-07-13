import { getPhaseName } from '../math/risk.js';
import { todayLocalDate, toLocalDateString } from './tradeData.js';

export function exportJSON(trades) {
  const json = trades.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradevault-${todayLocalDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(trades) {
  const rows = [['Trade #', 'Date', 'Open Date', 'Direction', 'Ticker', 'Strategy', 'Contracts', 'Entry Price', 'Exit Price', 'Net P&L', 'Equity Before', 'Equity After', 'Planned Risk $', 'Risk %', 'Model ID', 'Phase', 'Setup Tags', 'Emotion Tags', 'Mistakes', 'MAE', 'MFE', 'Notes']];
  for (const t of trades.trades) {
    const esc = (s) => s && s.includes(',') ? `"${s.replace(/"/g, '""')}"` : (s || '');
    const joinTags = (arr) => arr && arr.length > 0 ? `"${arr.join(', ')}"` : '';
    rows.push([
      t.id,
      toLocalDateString(t.date),
      t.openDate ? toLocalDateString(t.openDate) : '',
      t.direction || '',
      t.ticker || '',
      t.strategy || '',
      t.contracts || '',
      t.entryPrice || '',
      t.exitPrice || '',
      t.pnl,
      t.equityBefore,
      t.equityAfter,
      t.riskDol ?? '',
      t.riskPct == null ? '' : (t.riskPct * 100).toFixed(2) + '%',
      t.modelId || 'legacy-unversioned',
      getPhaseName(t.phase),
      joinTags(t.setupTags),
      joinTags(t.emotionTags),
      joinTags(t.mistakes),
      t.mae != null ? t.mae : '',
      t.mfe != null ? t.mfe : '',
      esc(t.notes),
    ]);
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradevault-${todayLocalDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file, trades, onError) {
  const reader = new FileReader();
  reader.onload = evt => {
    const ok = trades.importJSON(evt.target.result);
    if (!ok && onError) onError('Invalid file format');
  };
  reader.readAsText(file);
}
