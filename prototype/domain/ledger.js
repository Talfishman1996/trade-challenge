import { plannedRisk, START_EQUITY } from '../model/riskModel.js';

export function parseMoneyToCents(value) {
  const normalized = String(value ?? '').trim().replace(/[$,\s]/g, '');
  const match = normalized.match(/^([+-]?)(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] || '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return match[1] === '-' ? -cents : cents;
}

function optionalMoney(value) {
  if (value === '' || value === null || value === undefined) return null;
  const cents = parseMoneyToCents(value);
  return cents === null ? null : cents / 100;
}

export function activeRecords(records) {
  return records.filter((record) => !record.deleted);
}

export function strategyEquity(records, startEquity = START_EQUITY) {
  return activeRecords(records).reduce((equity, record) => equity + record.netPnl, startEquity);
}

export function ledgerStats(records, startEquity = START_EQUITY) {
  const active = [...activeRecords(records)].sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt));
  let equity = startEquity;
  let peak = startEquity;
  let peakRecordIndex = 0;
  let consecutiveLosses = 0;
  let currentLossStreak = 0;
  const points = [{ label: 'Start', equity }];
  for (const [index, record] of active.entries()) {
    equity += record.netPnl;
    if (equity > peak) {
      peak = equity;
      peakRecordIndex = index + 1;
    }
    currentLossStreak = record.outcome === 'loss' ? currentLossStreak + 1 : 0;
    consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
    points.push({ label: record.closedAt, equity, uid: record.uid });
  }
  const resolved = active.filter((record) => record.outcome !== 'break-even');
  const wins = resolved.filter((record) => record.outcome === 'win').length;
  const latest = active.at(-1) ?? null;
  const drawdownRecords = active.slice(peakRecordIndex);
  return {
    count: active.length,
    equity,
    peak,
    drawdown: peak > 0 ? (peak - equity) / peak : 0,
    drawdownDollar: peak - equity,
    drawdownStartedAt: drawdownRecords[0]?.closedAt ?? null,
    tradesSincePeak: drawdownRecords.length,
    drawdownContributors: drawdownRecords.filter((record) => record.netPnl < 0).sort((a, b) => a.netPnl - b.netPnl).slice(0, 3),
    wins,
    losses: resolved.length - wins,
    breakEvens: active.length - resolved.length,
    resolvedWinRate: resolved.length ? wins / resolved.length : null,
    netPnl: equity - startEquity,
    maxLossStreak: consecutiveLosses,
    currentLossStreak,
    latest,
    points,
    nextRisk: plannedRisk(equity),
    unreviewed: active.filter((record) => !record.reviewed).length,
  };
}

export function makeRecord(input, context) {
  const { uid, displayId, mutationId, equityBefore, now } = context;
  const risk = plannedRisk(equityBefore);
  const netPnlCents = parseMoneyToCents(input.netPnl);
  return {
    uid,
    displayId,
    mutationId,
    revision: 1,
    instrument: input.instrument.trim().toUpperCase(),
    outcome: input.outcome,
    direction: input.direction,
    netPnl: netPnlCents / 100,
    netPnlCents,
    strategy: input.strategy?.trim() || '',
    tags: input.tags ?? [],
    note: input.note?.trim() || '',
    openedAt: input.openedAt || null,
    closedAt: input.closedAt || now,
    notional: optionalMoney(input.notional),
    entry: optionalMoney(input.entry),
    exit: optionalMoney(input.exit),
    orderType: input.orderType || '',
    makerTakerMix: input.makerTakerMix || '',
    fees: optionalMoney(input.fees),
    slippageEstimate: optionalMoney(input.slippageEstimate),
    funding: optionalMoney(input.funding),
    beCostAcknowledged: Boolean(input.beCostAcknowledged),
    syncState: 'queued',
    reviewed: false,
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

export function validateTrade(input) {
  const errors = {};
  if (!['win', 'loss', 'break-even'].includes(input.outcome)) errors.outcome = 'Choose Win, Loss, or Break-even.';
  if (!input.instrument?.trim()) errors.instrument = 'Enter an instrument, for example BTCUSDT.';
  if (!['long', 'short', 'not-recorded'].includes(input.direction)) errors.direction = 'Choose Long, Short, or Not recorded.';
  const netPnlCents = parseMoneyToCents(input.netPnl);
  const netPnl = netPnlCents === null ? NaN : netPnlCents / 100;
  if (netPnlCents === null) errors.netPnl = 'Enter a valid realized amount with no more than two decimal places.';
  if (input.outcome === 'win' && netPnl <= 0) errors.netPnl = 'A Win needs a positive realized net result.';
  if (input.outcome === 'loss' && netPnl >= 0) errors.netPnl = 'A Loss needs a negative realized net result.';
  if (input.outcome === 'break-even' && Math.abs(netPnl) > 500) errors.netPnl = 'Confirm a result beyond $500 as Win or Loss for this prototype.';
  if (input.outcome === 'break-even' && netPnl < 0 && Math.abs(netPnl) <= 500 && !input.beCostAcknowledged) errors.beCostAcknowledged = 'Acknowledge that realized costs made this Break-even net negative.';
  if (!input.closedAt || !Number.isFinite(Date.parse(input.closedAt))) errors.closedAt = 'Enter a valid close date and time.';
  for (const [key, label] of [['notional', 'Notional'], ['entry', 'Entry'], ['exit', 'Exit'], ['fees', 'Fees'], ['slippageEstimate', 'Slippage'], ['funding', 'Funding']]) {
    if (input[key] !== '' && input[key] !== null && input[key] !== undefined && parseMoneyToCents(input[key]) === null) errors[key] = `${label} must be a valid amount with no more than two decimal places.`;
  }
  for (const key of ['notional', 'entry', 'exit', 'fees', 'slippageEstimate']) {
    const cents = parseMoneyToCents(input[key]);
    if (cents !== null && cents < 0) errors[key] = `${key === 'slippageEstimate' ? 'Slippage' : key[0].toUpperCase() + key.slice(1)} cannot be negative.`;
  }
  return errors;
}

export function searchRecords(records, query) {
  const normalized = query.text.trim().toLowerCase();
  const filtered = activeRecords(records).filter((record) => {
    const haystack = [record.uid, record.displayId, record.instrument, record.note, record.strategy, ...(record.tags ?? [])].join(' ').toLowerCase();
    if (normalized && !haystack.includes(normalized)) return false;
    if (query.outcome !== 'all' && record.outcome !== query.outcome) return false;
    if (query.direction && query.direction !== 'all' && record.direction !== query.direction) return false;
    if (query.strategy && query.strategy !== 'all' && record.strategy !== query.strategy) return false;
    if (query.syncState !== 'all' && record.syncState !== query.syncState) return false;
    if (query.reviewed === 'reviewed' && !record.reviewed) return false;
    if (query.reviewed === 'unreviewed' && record.reviewed) return false;
    const closedAt = Date.parse(record.closedAt);
    if (query.dateFrom && closedAt < Date.parse(`${query.dateFrom}T00:00:00`)) return false;
    if (query.dateTo && closedAt >= Date.parse(`${query.dateTo}T00:00:00`) + 86_400_000) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    if (query.sort === 'oldest') return Date.parse(a.closedAt) - Date.parse(b.closedAt);
    if (query.sort === 'largest-win') return b.netPnl - a.netPnl;
    if (query.sort === 'largest-loss') return a.netPnl - b.netPnl;
    return Date.parse(b.closedAt) - Date.parse(a.closedAt);
  });
}
