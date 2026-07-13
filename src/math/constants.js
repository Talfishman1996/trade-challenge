// Canonical $100K -> $10M challenge constants.
export const MODEL_ID = '100k-pchip-v1';
export const START_EQUITY = 100000;
export const TARGET_EQUITY = 10000000;
export const TARGET_RR = 1;

// Backward-compatible aliases used by a few visual components.
export const E0 = START_EQUITY;
export const K0 = 0.15;
export const SMIN = START_EQUITY;
export const SMAX = TARGET_EQUITY;
export const LOG_MIN = Math.log10(SMIN);
export const LOG_MAX = Math.log10(SMAX);

export const RISK_ANCHORS = Object.freeze([
  Object.freeze({ equity: 100000, riskFraction: 0.15, dollarRisk: 15000, label: '$100K' }),
  Object.freeze({ equity: 200000, riskFraction: 0.125, dollarRisk: 25000, label: '$200K' }),
  Object.freeze({ equity: 500000, riskFraction: 0.10, dollarRisk: 50000, label: '$500K' }),
  Object.freeze({ equity: 1000000, riskFraction: 0.075, dollarRisk: 75000, label: '$1M' }),
  Object.freeze({ equity: 2000000, riskFraction: 0.06, dollarRisk: 120000, label: '$2M' }),
  Object.freeze({ equity: 5000000, riskFraction: 0.05, dollarRisk: 250000, label: '$5M' }),
  Object.freeze({ equity: 10000000, riskFraction: 0.03, dollarRisk: 300000, label: '$10M' }),
]);

export const LXT = RISK_ANCHORS.map(anchor => Math.log10(anchor.equity));

export const QK = RISK_ANCHORS.map(anchor => ({ v: anchor.equity, l: anchor.label }));

export const FM = RISK_ANCHORS.map((anchor, index) => ({
  v: anchor.equity,
  l: anchor.label,
  ph: index === 0 ? 'anchor' : 'model',
}));

// The starting $100K is the trailhead rather than a milestone to re-achieve.
export const MILES = [
  { v: 200000, l: '$200K' },
  { v: 500000, l: '$500K' },
  { v: 1000000, l: '$1M' },
  { v: 2000000, l: '$2M' },
  { v: 5000000, l: '$5M' },
  { v: 10000000, l: '$10M' },
];

export const GPS_Z = [
  { eq: 100000, l: '$100K', s: 'Trailhead', c: '#10b981', tc: 'text-emerald-400' },
  { eq: 200000, l: '$200K', s: 'Base Camp', c: '#22c55e', tc: 'text-emerald-300' },
  { eq: 1000000, l: '$1M', s: 'High Country', c: '#38bdf8', tc: 'text-sky-300' },
  { eq: 5000000, l: '$5M', s: 'Summit Push', c: '#f59e0b', tc: 'text-amber-400' },
  { eq: 10000000, l: '$10M', s: 'Summit', c: '#facc15', tc: 'text-yellow-300' },
];

export const TT = {
  backgroundColor: '#0D1117',
  border: '1px solid #2D3748',
  borderRadius: 12,
  fontSize: 12,
  padding: '10px 14px',
  color: '#f1f5f9',
  fontFamily: "'Source Code Pro', ui-monospace, monospace",
};

export const AX = {
  fontSize: 10,
  fill: '#64748b',
  fontFamily: "'Source Code Pro', ui-monospace, monospace",
};

export const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };

export const TAB_IDS = ['milestones', 'fullmap', 'curves', 'stress', 'growth', 'compare'];
export const TAB_LABELS = {
  milestones: 'Milestones',
  fullmap: 'Data Matrix',
  curves: 'Risk Curve',
  stress: 'Stress Test',
  growth: 'Projections',
  compare: 'Compare',
};
