import { E0, K0 } from './constants.js';

// 2/3 Power Decay model (main)
export const rN = e => {
  if (e <= 20000) return 1;
  if (e <= 50000) return 1 - 0.5 * ((e - 20000) / 30000);
  if (e <= 87500) return 0.5 - (0.5 - K0) * ((e - 50000) / 37500);
  return K0 * Math.pow(E0 / e, 2 / 3);
};

// 1/3 Power model (old)
export const rO = e => Math.min(1, K0 * Math.pow(E0 / Math.max(e, 1), 1 / 3));

// Fixed 33% model
export const rF = () => K0;

// Dollar risk for 2/3 model
export const r$N = e => rN(e) * e;

// Geometric growth rate per trade
export const geoGrowth = (r, wr, rr) =>
  r >= 1 ? -Infinity : r <= 0 ? 0 : wr * Math.log(1 + r * rr) + (1 - wr) * Math.log(1 - r);

// Consecutive losses to wipe account
export const lossesToWipe = e => {
  let q = e;
  for (let n = 1; n <= 200; n++) {
    q = q * (1 - rN(q));
    if (q <= 1) return n;
  }
  return 200;
};

// Equity after n consecutive wins or losses
export const calcStreak = (e, n, win, rr) => {
  let q = e;
  for (let i = 0; i < n; i++) {
    q = win ? q * (1 + rN(q) * rr) : q * (1 - rN(q));
    q = Math.max(q, 1);
  }
  return q;
};

// Format geometric growth for display
export const fmtGeo = g =>
  !isFinite(g) || g < -10
    ? '\u2620 Wipe'
    : `${(Math.exp(g) - 1) * 100 >= 0 ? '+' : ''}${((Math.exp(g) - 1) * 100).toFixed(1)}%`;

// Determine model phase from equity
export const getPhase = e => {
  if (e < E0 * 0.95) return 'pre';
  if (e <= E0 * 1.05) return 'anchor';
  return 'model';
};

export const getPhaseName = phase =>
  phase === 'pre' ? 'Growth' : phase === 'anchor' ? 'Anchor' : 'Decay';

// Semantic risk severity: safe (at/below Kelly), elevated, danger
export const riskSeverity = pct =>
  pct <= 34 ? 'safe' : pct <= 55 ? 'elevated' : 'danger';
