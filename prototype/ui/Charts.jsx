import { ANCHORS, money, percentage } from '../model/riskModel.js';

function linePath(values, width, height, padding = 12) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => {
    const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function EquityChart({ points, compact = false }) {
  const width = 360;
  const height = compact ? 92 : 170;
  const values = points.map((point) => point.equity);
  const path = linePath(values, width, height, compact ? 8 : 16);
  const start = values[0] ?? 0;
  const end = values.at(-1) ?? start;
  return (
    <figure className={`chart ${compact ? 'chart--compact' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="equity-chart-title equity-chart-desc">
        <title id="equity-chart-title">Realized strategy equity path</title>
        <desc id="equity-chart-desc">Strategy equity moved from {money(start)} to {money(end)} across {Math.max(0, values.length - 1)} records.</desc>
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--active)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--active)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${width - (compact ? 8 : 16)},${height - (compact ? 8 : 16)} L${compact ? 8 : 16},${height - (compact ? 8 : 16)} Z`} fill="url(#equity-fill)" />
        <path d={path} fill="none" stroke="var(--active)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <figcaption>Realized ledger only. Start {money(start)} · Current {money(end)}</figcaption>}
    </figure>
  );
}

export function RiskCurveChart() {
  const width = 360;
  const height = 180;
  const dollars = ANCHORS.map((anchor) => anchor.dollarRisk);
  const percentages = ANCHORS.map((anchor) => anchor.riskFraction * 100);
  const dollarPath = linePath(dollars, width, height, 20);
  const percentPath = linePath(percentages, width, height, 20);
  return (
    <figure className="chart chart--risk">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="risk-title risk-desc">
        <title id="risk-title">Smooth planned risk curve</title>
        <desc id="risk-desc">Dollar risk rises from fifteen thousand to three hundred thousand dollars while risk percentage falls from fifteen to three percent.</desc>
        <path d={dollarPath} fill="none" stroke="var(--planned)" strokeWidth="3" strokeLinecap="round" />
        <path d={percentPath} fill="none" stroke="var(--active)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 5" />
        {ANCHORS.map((anchor, index) => {
          const x = 20 + (index / (ANCHORS.length - 1)) * (width - 40);
          return <circle key={anchor.equity} cx={x} cy={20 + ((Math.max(...dollars) - anchor.dollarRisk) / (Math.max(...dollars) - Math.min(...dollars))) * (height - 40)} r="4" fill="var(--planned)" />;
        })}
      </svg>
      <figcaption><span className="legend legend--planned">Dollar risk rises</span><span className="legend legend--active">Risk percentage falls</span></figcaption>
      <div className="anchor-grid" role="table" aria-label="Risk curve anchors">
        {ANCHORS.map((anchor) => <div role="row" key={anchor.equity}><span role="cell">{money(anchor.equity)}</span><strong role="cell">{money(anchor.dollarRisk)}</strong><span role="cell">{percentage(anchor.riskFraction, 1)}</span></div>)}
      </div>
    </figure>
  );
}
