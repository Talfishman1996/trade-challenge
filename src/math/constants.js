// Core model constants
export const E0 = 87500;
export const K0 = 0.33;
export const SMIN = 20000;
export const SMAX = 10000000;
export const LOG_MIN = Math.log10(SMIN);
export const LOG_MAX = Math.log10(SMAX);

// Chart X-axis log ticks
export const LXT = [20e3, 100e3, 250e3, 500e3, 1e6, 2.5e6, 5e6, 10e6].map(
  v => Math.log10(Math.max(v, 1))
);

// Quick-select equity presets
export const QK = [
  { v: 20000, l: '$20K' },
  { v: 87500, l: '$87.5K' },
  { v: 250000, l: '$250K' },
  { v: 1000000, l: '$1M' },
  { v: 5000000, l: '$5M' },
  { v: 10000000, l: '$10M' },
];

// Full map equity levels
export const FM = [
  { v: 20000, l: '$20K', ph: 'pre' },
  { v: 50000, l: '$50K', ph: 'pre' },
  { v: 87500, l: '$87.5K', ph: 'anchor' },
  { v: 100000, l: '$100K', ph: 'model' },
  { v: 250000, l: '$250K', ph: 'model' },
  { v: 500000, l: '$500K', ph: 'model' },
  { v: 1000000, l: '$1M', ph: 'model' },
  { v: 3000000, l: '$3M', ph: 'model' },
  { v: 5000000, l: '$5M', ph: 'model' },
  { v: 10000000, l: '$10M', ph: 'model' },
];

// Milestone targets
export const MILES = [
  { v: 100000, l: '$100K' },
  { v: 250000, l: '$250K' },
  { v: 500000, l: '$500K' },
  { v: 1000000, l: '$1M' },
  { v: 4000000, l: '$4M' },
  { v: 10000000, l: '$10M' },
];

// GPS funnel zones
export const GPS_Z = [
  { eq: 20000, l: '$20K', s: '1-Loss Wipe', c: '#ef4444', tc: 'text-rose-400' },
  { eq: 50000, l: '$50K', s: 'Danger Zone', c: '#eab308', tc: 'text-amber-400' },
  { eq: 87500, l: '$87.5K', s: 'Basecamp', c: '#10b981', tc: 'text-emerald-400' },
  { eq: 100000, l: '$100K', s: 'Goal', c: '#22c55e', tc: 'text-emerald-300' },
];

// Chart styles
export const TT = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 12,
  fontSize: 12,
  padding: '10px 14px',
  color: '#f1f5f9',
  fontFamily: 'ui-monospace, monospace',
};

export const AX = {
  fontSize: 10,
  fill: '#64748b',
  fontFamily: 'ui-monospace, monospace',
};

export const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };

// Analysis tab definitions (icons resolved in component)
export const TAB_IDS = ['milestones', 'fullmap', 'curves', 'stress', 'growth', 'compare'];
export const TAB_LABELS = {
  milestones: 'Milestones',
  fullmap: 'Data Matrix',
  curves: 'Risk Curves',
  stress: 'Stress Test',
  growth: 'Projections',
  compare: 'Compare',
};
