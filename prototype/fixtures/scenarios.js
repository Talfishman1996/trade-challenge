import { plannedRisk, START_EQUITY } from '../model/riskModel.js';

const BASE_TIME = Date.parse('2026-07-12T18:00:00-07:00');

function trade(index, netPnl, outcome, overrides = {}) {
  const equityBefore = overrides.equityBefore ?? START_EQUITY;
  const risk = plannedRisk(equityBefore);
  return {
    uid: overrides.uid ?? `fixture-${String(index).padStart(4, '0')}`,
    displayId: index,
    revision: 1,
    mutationId: `fixture-mutation-${index}`,
    instrument: overrides.instrument ?? (index % 3 === 0 ? 'ETHUSDT' : 'BTCUSDT'),
    outcome,
    direction: overrides.direction ?? (index % 4 === 0 ? 'short' : 'long'),
    netPnl,
    strategy: overrides.strategy ?? (index % 2 === 0 ? 'Breakout retest' : 'Liquidity sweep'),
    tags: overrides.tags ?? (index % 2 === 0 ? ['A setup'] : ['London']),
    note: overrides.note ?? `Synthetic review record ${index}`,
    closedAt: overrides.closedAt ?? new Date(BASE_TIME - index * 86_400_000).toISOString(),
    syncState: overrides.syncState ?? 'verified',
    reviewed: overrides.reviewed ?? index > 4,
    deleted: false,
    modelSnapshot: {
      modelId: risk.modelId,
      equityBefore,
      plannedDollarRisk: risk.dollarRisk,
      riskFraction: risk.riskFraction,
      grossRewardRisk: '1:1',
    },
  };
}

function chain(values, options = {}) {
  let equity = START_EQUITY;
  return values.map(([netPnl, outcome, overrides], offset) => {
    const record = trade(offset + 1, netPnl, outcome, {
      ...overrides,
      equityBefore: equity,
      closedAt: overrides?.closedAt ?? new Date(BASE_TIME - (values.length - offset - 1) * 86_400_000).toISOString(),
    });
    equity += netPnl;
    return record;
  });
}

const normalTrades = chain([
  [15_000, 'win'],
  [-12_000, 'loss'],
  [20_000, 'win'],
  [-85, 'break-even', { note: 'Gross scratch; fees made realized net slightly negative.' }],
  [22_000, 'win'],
  [-18_000, 'loss'],
  [25_000, 'win'],
  [30_000, 'win'],
]);

const drawdownTrades = chain([
  [50_000, 'win'],
  [50_000, 'win'],
  [50_000, 'win'],
  [-35_000, 'loss'],
  [-40_000, 'loss'],
  [-45_000, 'loss'],
]);

function largeDataTrades() {
  let equity = START_EQUITY;
  return Array.from({ length: 500 }, (_, index) => {
    const cycle = index % 10;
    const outcome = cycle === 8 ? 'break-even' : cycle < 6 ? 'win' : 'loss';
    const netPnl = outcome === 'win' ? 900 : outcome === 'loss' ? -700 : -8;
    const record = trade(index + 1, netPnl, outcome, {
      equityBefore: equity,
      instrument: index % 7 === 0 ? 'SOLUSDT' : index % 3 === 0 ? 'ETHUSDT' : 'BTCUSDT',
      note: index % 17 === 0 ? `Review liquidity sweep at record ${index + 1}` : `Synthetic scale record ${index + 1}`,
      reviewed: index < 490,
      closedAt: new Date(BASE_TIME - (499 - index) * 14_400_000).toISOString(),
    });
    equity += netPnl;
    return record;
  });
}

function fixture(id, label, trades, overrides = {}) {
  return {
    id,
    label,
    schemaVersion: 1,
    seed: 20260712,
    now: new Date(BASE_TIME).toISOString(),
    startEquity: START_EQUITY,
    trades,
    network: overrides.network ?? 'online',
    syncMode: overrides.syncMode ?? 'healthy',
    conflictUid: overrides.conflictUid ?? null,
    malformed: overrides.malformed ?? false,
    reducedMotion: overrides.reducedMotion ?? false,
    largeText: overrides.largeText ?? false,
    description: overrides.description ?? label,
  };
}

const nearTarget = chain([[9_600_000, 'win', { instrument: 'BTCUSDT', note: 'Synthetic aggregate fixture for large-number review.' }]]);
const reachedTarget = chain([[9_950_000, 'win', { instrument: 'BTCUSDT', note: 'Synthetic target-complete fixture.' }]]);

export const SCENARIOS = Object.freeze({
  empty: fixture('empty', 'First launch', []),
  normal: fixture('normal', 'Normal operating ledger', normalTrades),
  drawdown: fixture('drawdown', 'Drawdown and review due', drawdownTrades),
  'target-near': fixture('target-near', 'Near target', nearTarget),
  'target-reached': fixture('target-reached', 'Target reached', reachedTarget),
  offline: fixture('offline', 'Offline with queued change', normalTrades.map((item, index) => index === normalTrades.length - 1 ? { ...item, syncState: 'queued' } : item), { network: 'offline' }),
  'sync-error': fixture('sync-error', 'Sync requires attention', normalTrades.map((item, index) => index === normalTrades.length - 1 ? { ...item, syncState: 'failed' } : item), { syncMode: 'error' }),
  conflict: fixture('conflict', 'Competing revision', normalTrades.map((item, index) => index === 3 ? { ...item, syncState: 'conflict' } : item), { syncMode: 'conflict', conflictUid: normalTrades[3].uid }),
  'large-data': fixture('large-data', '500-record journal', largeDataTrades()),
  a11y: fixture('a11y', 'Large text and reduced motion', normalTrades.map((item, index) => index === 0 ? { ...item, instrument: 'BTCUSDT perpetual contract with extended label', note: 'A deliberately long explanation verifies wrapping without clipping or hidden controls.' } : item), { reducedMotion: true, largeText: true }),
  malformed: fixture('malformed', 'Malformed data recovery', [], { malformed: true }),
});

export const DEFAULT_SCENARIO = 'normal';

export function getScenario(id) {
  return SCENARIOS[id] ?? SCENARIOS[DEFAULT_SCENARIO];
}

export function scenarioChecksum(scenario) {
  const source = JSON.stringify(scenario);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
