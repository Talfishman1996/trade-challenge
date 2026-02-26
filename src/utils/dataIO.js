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
  const rows = [['Trade #', 'Date', 'Direction', 'P&L', 'Equity Before', 'Equity After', 'Risk %', 'Phase', 'Notes']];
  for (const t of trades.trades) {
    const esc = (s) => s && s.includes(',') ? `"${s.replace(/"/g, '""')}"` : (s || '');
    rows.push([
      t.id,
      new Date(t.date).toISOString().slice(0, 10),
      t.direction || '',
      t.pnl,
      t.equityBefore,
      t.equityAfter,
      (t.riskPct * 100).toFixed(2) + '%',
      getPhaseName(t.phase),
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
