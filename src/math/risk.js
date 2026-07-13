import {
  MODEL_ID,
  RISK_ANCHORS,
  START_EQUITY,
  TARGET_EQUITY,
  TARGET_RR,
} from './constants.js';

export { MODEL_ID, START_EQUITY, TARGET_EQUITY, TARGET_RR };

const xs = RISK_ANCHORS.map(anchor => Math.log(anchor.equity));
const ys = RISK_ANCHORS.map(anchor => anchor.dollarRisk);

const endpointSlope = (h0, h1, delta0, delta1) => {
  let slope = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
  if (Math.sign(slope) !== Math.sign(delta0)) return 0;
  if (Math.sign(delta0) !== Math.sign(delta1) && Math.abs(slope) > Math.abs(3 * delta0)) {
    slope = 3 * delta0;
  }
  return slope;
};

const buildPchipSlopes = () => {
  const h = xs.slice(0, -1).map((x, index) => xs[index + 1] - x);
  const delta = h.map((width, index) => (ys[index + 1] - ys[index]) / width);
  const result = Array(xs.length).fill(0);
  result[0] = endpointSlope(h[0], h[1], delta[0], delta[1]);
  result[result.length - 1] = endpointSlope(
    h[h.length - 1],
    h[h.length - 2],
    delta[delta.length - 1],
    delta[delta.length - 2],
  );
  for (let index = 1; index < result.length - 1; index += 1) {
    if (delta[index - 1] === 0 || delta[index] === 0 || Math.sign(delta[index - 1]) !== Math.sign(delta[index])) {
      result[index] = 0;
      continue;
    }
    const w1 = 2 * h[index] + h[index - 1];
    const w2 = h[index] + 2 * h[index - 1];
    result[index] = (w1 + w2) / (w1 / delta[index - 1] + w2 / delta[index]);
  }
  return result;
};

const slopes = buildPchipSlopes();

const interpolateDollarRisk = equity => {
  const x = Math.log(equity);
  let index = xs.length - 2;
  for (let cursor = 0; cursor < xs.length - 1; cursor += 1) {
    if (x <= xs[cursor + 1]) {
      index = cursor;
      break;
    }
  }
  const width = xs[index + 1] - xs[index];
  const t = (x - xs[index]) / width;
  const t2 = t * t;
  const t3 = t2 * t;
  const value = (2 * t3 - 3 * t2 + 1) * ys[index]
    + (t3 - 2 * t2 + t) * width * slopes[index]
    + (-2 * t3 + 3 * t2) * ys[index + 1]
    + (t3 - t2) * width * slopes[index + 1];
  return Math.min(ys[index + 1], Math.max(ys[index], value));
};

export const plannedRisk = equity => {
  if (!Number.isFinite(equity) || equity <= 0) {
    return { status: 'terminal', equity, dollarRisk: null, riskFraction: null, segment: null, modelId: MODEL_ID };
  }
  if (equity >= TARGET_EQUITY) {
    return { status: 'target-reached', equity, dollarRisk: null, riskFraction: null, segment: 'complete', modelId: MODEL_ID };
  }
  if (equity < START_EQUITY) {
    return {
      status: 'recovery',
      equity,
      dollarRisk: equity * 0.15,
      riskFraction: 0.15,
      segment: 'recovery',
      modelId: MODEL_ID,
    };
  }
  const dollarRisk = interpolateDollarRisk(equity);
  const upperIndex = RISK_ANCHORS.findIndex(anchor => equity < anchor.equity);
  const lower = RISK_ANCHORS[Math.max(0, upperIndex - 1)];
  const upper = RISK_ANCHORS[upperIndex];
  return {
    status: 'active',
    equity,
    dollarRisk,
    riskFraction: dollarRisk / equity,
    segment: `${lower.label}-${upper.label}`,
    modelId: MODEL_ID,
  };
};

export const rN = equity => plannedRisk(equity).riskFraction || 0;
export const r$N = equity => plannedRisk(equity).dollarRisk || 0;

// Comparison functions remain available to legacy chart call sites, but no longer
// represent or label the retired power-decay model.
export const rO = equity => rN(equity);
export const rF = () => 0.15;

export const geoGrowth = (riskFraction, winRate) =>
  riskFraction >= 1
    ? -Infinity
    : riskFraction <= 0
      ? 0
      : winRate * Math.log(1 + riskFraction * TARGET_RR) + (1 - winRate) * Math.log(1 - riskFraction);

export const lossesToWipe = equity => {
  let value = equity;
  for (let count = 1; count <= 500; count += 1) {
    const risk = r$N(value);
    if (risk <= 0) return 500;
    value = Math.max(0, value - risk);
    if (value <= 1) return count;
  }
  return 500;
};

export const calcStreak = (equity, count, win) => {
  let value = equity;
  for (let index = 0; index < count; index += 1) {
    const risk = r$N(value);
    value = win ? value + risk * TARGET_RR : value - risk;
    value = Math.max(value, 1);
  }
  return value;
};

export const fmtGeo = growth =>
  !Number.isFinite(growth) || growth < -10
    ? 'Wipe'
    : `${(Math.exp(growth) - 1) * 100 >= 0 ? '+' : ''}${((Math.exp(growth) - 1) * 100).toFixed(1)}%`;

export const getPhase = equity => {
  if (equity < START_EQUITY) return 'pre';
  if (equity < 500000) return 'anchor';
  return 'model';
};

export const getPhaseName = phase =>
  phase === 'pre' ? 'Recovery' : phase === 'anchor' ? 'Ascent' : 'Preservation';

export const riskSeverity = pct => pct <= 7.5 ? 'safe' : pct <= 12.5 ? 'elevated' : 'danger';
