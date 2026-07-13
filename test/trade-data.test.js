import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDatasets, normalizeDataset, normalizeTrade, requireNonzeroPnl } from '../src/utils/tradeData.js';

test('new trade boundary accepts wins and losses but rejects flat outcomes', () => {
  assert.equal(requireNonzeroPnl(1.25), 1.25);
  assert.equal(requireNonzeroPnl(-0.01), -0.01);
  assert.throws(() => requireNonzeroPnl(0), /nonzero/);
  assert.throws(() => requireNonzeroPnl('not-a-number'), /nonzero/);
});

test('historical execution snapshots survive normalization', () => {
  const trade = normalizeTrade({
    uid: 'trade:history',
    id: 1,
    pnl: 2500,
    riskDol: 12000,
    riskPct: 0.24,
    modelId: 'legacy-power-decay-v1',
    modelStatus: 'active',
    revision: 4,
    date: '2026-07-01',
  }, 1000);
  assert.equal(trade.riskDol, 12000);
  assert.equal(trade.riskPct, 0.24);
  assert.equal(trade.modelId, 'legacy-power-decay-v1');
  assert.equal(trade.revision, 4);
});

test('zero-P&L historical records remain readable but are not reclassified', () => {
  const trade = normalizeTrade({ uid: 'trade:zero', id: 2, pnl: 0, date: '2026-07-02' }, 1000);
  assert.equal(trade.pnl, 0);
  assert.equal(trade.modelId, null);
});

test('newer record and tombstone win deterministic merges', () => {
  const base = {
    initialEquity: 100000,
    clientId: 'client:a',
    _lastModified: 100,
    tombstones: [],
  };
  const local = normalizeDataset({
    ...base,
    trades: [{ uid: 'trade:1', id: 1, pnl: 100, updatedAt: 100, createdAt: 50, date: '2026-07-01' }],
  });
  const remote = normalizeDataset({
    ...base,
    clientId: 'client:b',
    _lastModified: 300,
    trades: [{ uid: 'trade:1', id: 1, pnl: 200, updatedAt: 200, createdAt: 50, date: '2026-07-01' }],
    tombstones: [{ uid: 'trade:gone', deletedAt: 250, updatedAt: 250 }],
  });
  const merged = mergeDatasets(local, remote);
  assert.equal(merged.trades[0].pnl, 200);
  assert.equal(merged.tombstones[0].uid, 'trade:gone');
  assert.equal(merged.initialEquity, 100000);
});
