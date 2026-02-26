import { getPhaseName } from '../math/risk.js';

export function exportJSON(trades) {
  const json = trades.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradevault-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(trades) {
  const rows = [['Trade #', 'Date', 'Open Date', 'Direction', 'Ticker', 'Strategy', 'Contracts', 'Entry Price', 'Exit Price', 'P&L', 'Equity Before', 'Equity After', 'Risk %', 'Phase', 'Setup Tags', 'Emotion Tags', 'Mistakes', 'MAE', 'MFE', 'Notes']];
  for (const t of trades.trades) {
    const esc = (s) => s && s.includes(',') ? `"${s.replace(/"/g, '""')}"` : (s || '');
    const joinTags = (arr) => arr && arr.length > 0 ? `"${arr.join(', ')}"` : '';
    rows.push([
      t.id,
      new Date(t.date).toISOString().slice(0, 10),
      t.openDate ? new Date(t.openDate).toISOString().slice(0, 10) : '',
      t.direction || '',
      t.ticker || '',
      t.strategy || '',
      t.contracts || '',
      t.entryPrice || '',
      t.exitPrice || '',
      t.pnl,
      t.equityBefore,
      t.equityAfter,
      (t.riskPct * 100).toFixed(2) + '%',
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
  a.download = `tradevault-${new Date().toISOString().slice(0, 10)}.csv`;
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
