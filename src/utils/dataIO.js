import { getPhaseName } from '../math/risk.js';
import { todayLocalDate, toLocalDateString } from './tradeData.js';

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadJSONValue = (value, filename) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
};

export function exportJSON(trades) {
  const json = trades.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `tradevault-${todayLocalDate()}.json`);
}

export function buildCSV(tradeList) {
  const rows = [['Trade #', 'Date', 'Open Date', 'Direction', 'Ticker', 'Strategy', 'Contracts', 'Entry Price', 'Exit Price', 'Net P&L', 'Equity Before', 'Equity After', 'Planned Risk $', 'Risk %', 'Model ID', 'Phase', 'Setup Tags', 'Emotion Tags', 'Mistakes', 'MAE', 'MFE', 'Notes']];
  const esc = (value) => {
    if (value == null) return '';
    const isText = typeof value === 'string';
    let text = String(value);
    if (isText && /^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  for (const t of tradeList) {
    const joinTags = (arr) => arr && arr.length > 0 ? arr.join(', ') : '';
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
      t.notes,
    ]);
  }
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

export function exportCSV(trades) {
  const csv = buildCSV(trades.trades);
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `tradevault-${todayLocalDate()}.csv`);
}

export function importJSON(file, trades, onError) {
  const reader = new FileReader();
  reader.onload = evt => {
    const ok = trades.importJSON(evt.target.result);
    if (!ok && onError) onError('Invalid file format');
  };
  reader.readAsText(file);
}
