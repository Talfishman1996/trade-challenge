import assert from 'node:assert/strict';
import test from 'node:test';
import { ledgerStats, makeRecord, parseMoneyToCents, searchRecords, validateTrade } from '../domain/ledger.js';

function create(input, overrides = {}) {
  return makeRecord(input, {
    uid: overrides.uid ?? 'uid-1',
    displayId: overrides.displayId ?? 1,
    mutationId: overrides.mutationId ?? 'mutation-1',
    equityBefore: overrides.equityBefore ?? 100_000,
    now: overrides.now ?? '2026-07-12T18:00:00-07:00',
  });
}

test('capture requires explicit outcome, instrument, and manual P&L', () => {
  const errors = validateTrade({ outcome: '', instrument: '', direction: '', netPnl: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['closedAt', 'direction', 'instrument', 'netPnl', 'outcome']);
  assert.deepEqual(validateTrade({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: '15000', closedAt: '2026-07-12T18:00' }), {});
  assert.ok(validateTrade({ outcome: 'loss', instrument: 'BTCUSDT', netPnl: '15000' }).netPnl);
});

test('money parsing is cent-exact and invalid timestamps are bounded', () => {
  assert.equal(parseMoneyToCents('$15,000.25'), 1_500_025);
  assert.equal(parseMoneyToCents('-0.10'), -10);
  assert.equal(parseMoneyToCents('1.001'), null);
  assert.ok(validateTrade({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: '1.00', closedAt: '' }).closedAt);
  assert.ok(validateTrade({ outcome: 'break-even', instrument: 'BTCUSDT', direction: 'long', netPnl: '-25.00', closedAt: '2026-07-12T18:00' }).beCostAcknowledged);
  assert.deepEqual(validateTrade({ outcome: 'break-even', instrument: 'BTCUSDT', direction: 'long', netPnl: '-25.00', beCostAcknowledged: true, closedAt: '2026-07-12T18:00' }), {});
  const record = create({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: '0.10' });
  assert.equal(record.netPnlCents, 10);
  assert.equal(record.netPnl, 0.1);
});

test('ledger derives equity and immutable execution snapshot', () => {
  const win = create({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: 15_000 });
  const loss = create({ outcome: 'loss', instrument: 'ETHUSDT', direction: 'short', netPnl: -10_000 }, { uid: 'uid-2', displayId: 2, equityBefore: 115_000, now: '2026-07-13T18:00:00-07:00' });
  const stats = ledgerStats([win, loss]);
  assert.equal(stats.equity, 105_000);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 1);
  assert.equal(win.modelSnapshot.equityBefore, 100_000);
  assert.equal(win.modelSnapshot.plannedDollarRisk, 15_000);
});

test('tombstones leave deleted records out of equity and search', () => {
  const record = { ...create({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: 15_000 }), deleted: true };
  assert.equal(ledgerStats([record]).equity, 100_000);
  assert.equal(searchRecords([record], { text: 'BTC', outcome: 'all', syncState: 'all', sort: 'newest' }).length, 0);
});

test('search covers UID, display ID, instrument, strategy, note, and tags', () => {
  const record = { ...create({ outcome: 'win', instrument: 'BTCUSDT', direction: 'long', netPnl: 15_000, strategy: 'Sweep', note: 'Patient entry', tags: ['London'] }), uid: 'opaque-uid' };
  for (const query of ['opaque', '1', 'btc', 'sweep', 'patient', 'london']) {
    assert.equal(searchRecords([record], { text: query, outcome: 'all', syncState: 'all', sort: 'newest' }).length, 1);
  }
});

test('journal filtering covers direction, strategy, review state, and date bounds', () => {
  const record = { ...create({ outcome: 'win', instrument: 'BTCUSDT', direction: 'short', netPnl: 15_000, strategy: 'Sweep' }, { now: '2026-07-12T18:00:00-07:00' }), reviewed: false };
  const base = { text: '', outcome: 'all', direction: 'short', strategy: 'Sweep', syncState: 'all', reviewed: 'unreviewed', dateFrom: '2026-07-12', dateTo: '2026-07-12', sort: 'newest' };
  assert.equal(searchRecords([record], base).length, 1);
  assert.equal(searchRecords([record], { ...base, direction: 'long' }).length, 0);
  assert.equal(searchRecords([record], { ...base, reviewed: 'reviewed' }).length, 0);
  assert.equal(searchRecords([record], { ...base, dateFrom: '2026-07-13' }).length, 0);
});
