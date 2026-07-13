export const MODEL_ID = '100k-pchip-v1';
export const START_EQUITY = 100_000;
export const TARGET_EQUITY = 10_000_000;

export const ANCHORS = Object.freeze([
  Object.freeze({ equity: 100_000, riskFraction: 0.15, dollarRisk: 15_000 }),
  Object.freeze({ equity: 200_000, riskFraction: 0.125, dollarRisk: 25_000 }),
  Object.freeze({ equity: 500_000, riskFraction: 0.1, dollarRisk: 50_000 }),
  Object.freeze({ equity: 1_000_000, riskFraction: 0.075, dollarRisk: 75_000 }),
  Object.freeze({ equity: 2_000_000, riskFraction: 0.06, dollarRisk: 120_000 }),
  Object.freeze({ equity: 5_000_000, riskFraction: 0.05, dollarRisk: 250_000 }),
  Object.freeze({ equity: 10_000_000, riskFraction: 0.03, dollarRisk: 300_000 }),
]);

const xs = ANCHORS.map((anchor) => Math.log(anchor.equity));
const ys = ANCHORS.map((anchor) => anchor.dollarRisk);

function endpointSlope(h0, h1, delta0, delta1) {
  let slope = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
  if (Math.sign(slope) !== Math.sign(delta0)) return 0;
  if (Math.sign(delta0) !== Math.sign(delta1) && Math.abs(slope) > Math.abs(3 * delta0)) {
    slope = 3 * delta0;
  }
  return slope;
}

function pchipSlopes() {
  const h = xs.slice(0, -1).map((x, index) => xs[index + 1] - x);
  const delta = h.map((width, index) => (ys[index + 1] - ys[index]) / width);
  const slopes = Array(xs.length).fill(0);
  slopes[0] = endpointSlope(h[0], h[1], delta[0], delta[1]);
  slopes[slopes.length - 1] = endpointSlope(
    h[h.length - 1],
    h[h.length - 2],
    delta[delta.length - 1],
    delta[delta.length - 2],
  );
  for (let index = 1; index < slopes.length - 1; index += 1) {
    if (delta[index - 1] === 0 || delta[index] === 0 || Math.sign(delta[index - 1]) !== Math.sign(delta[index])) {
      slopes[index] = 0;
      continue;
    }
    const w1 = 2 * h[index] + h[index - 1];
    const w2 = h[index] + 2 * h[index - 1];
    slopes[index] = (w1 + w2) / (w1 / delta[index - 1] + w2 / delta[index]);
  }
  return slopes;
}

const slopes = pchipSlopes();

function interpolateDollarRisk(equity) {
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
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const value = h00 * ys[index] + h10 * width * slopes[index] + h01 * ys[index + 1] + h11 * width * slopes[index + 1];
  return Math.min(ys[index + 1], Math.max(ys[index], value));
}

export function plannedRisk(equity) {
  if (!Number.isFinite(equity) || equity <= 0) {
    return { status: 'terminal', equity, dollarRisk: null, riskFraction: null, segment: null, modelId: MODEL_ID };
  }
  if (equity >= TARGET_EQUITY) {
    return { status: 'target-reached', equity, dollarRisk: null, riskFraction: null, segment: 'complete', modelId: MODEL_ID };
  }
  if (equity < START_EQUITY) {
    return {
      status: 'below-start',
      equity,
      dollarRisk: equity * 0.15,
      riskFraction: 0.15,
      segment: 'recovery',
      modelId: MODEL_ID,
    };
  }
  const dollarRisk = interpolateDollarRisk(equity);
  const upperAnchorIndex = ANCHORS.findIndex((anchor) => equity < anchor.equity);
  const lower = ANCHORS[Math.max(0, upperAnchorIndex - 1)];
  const upper = ANCHORS[upperAnchorIndex];
  return {
    status: 'active',
    equity,
    dollarRisk,
    riskFraction: dollarRisk / equity,
    segment: `${compactNumber(lower.equity)}-${compactNumber(upper.equity)}`,
    modelId: MODEL_ID,
  };
}

export function compactNumber(value) {
  if (value >= 1_000_000) return `$${Number((value / 1_000_000).toFixed(1))}M`;
  return `$${Math.round(value / 1_000)}K`;
}

export function money(value, options = {}) {
  const { sign = false, maximumFractionDigits = Math.abs(value) < 1_000 ? 2 : 0 } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
    signDisplay: sign ? 'exceptZero' : 'auto',
  }).format(value);
}

export function percentage(value, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
