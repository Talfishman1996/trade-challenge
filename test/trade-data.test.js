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

test('numeric trade fields are normalized before equity-chain math', () => {
  const trade = normalizeTrade({ uid: 'trade:string-numbers', id: '7', pnl: '-600.25' }, 1000);
  assert.equal(trade.id, 7);
  assert.equal(trade.pnl, -600.25);
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

test('undo tombstones delete remotely known trades and a newer redo revives them', () => {
  const remoteTrade = { uid: 'trade:undo', id: 1, pnl: 100, updatedAt: 100, createdAt: 50, date: '2026-07-01' };
  const deleted = mergeDatasets(
    { initialEquity: 100000, trades: [], tombstones: [{ uid: 'trade:undo', deletedAt: 200, updatedAt: 200 }] },
    { initialEquity: 100000, trades: [remoteTrade], tombstones: [] }
  );
  assert.equal(deleted.trades.length, 0);

  const revived = mergeDatasets(
    deleted,
    { initialEquity: 100000, trades: [{ ...remoteTrade, updatedAt: 300, revision: 2 }], tombstones: [] }
  );
  assert.equal(revived.trades.length, 1);
  assert.equal(revived.trades[0].updatedAt, 300);
});

test('server revision wins over a misleading device clock', () => {
  const staleDevice = {
    initialEquity: 100000,
    trades: [{
      uid: 'trade:clock-skew', id: 1, pnl: 100, createdAt: 10, updatedAt: 999999,
      serverRevision: 4, date: '2026-07-01',
    }],
    tombstones: [],
  };
  const server = {
    initialEquity: 100000,
    serverRevision: 5,
    trades: [{
      uid: 'trade:clock-skew', id: 1, pnl: 250, createdAt: 10, updatedAt: 200,
      serverRevision: 5, date: '2026-07-01',
    }],
    tombstones: [],
  };

  const merged = mergeDatasets(staleDevice, server);
  assert.equal(merged.trades[0].pnl, 250);
  assert.equal(merged.trades[0].serverRevision, 5);
});

test('a local edit based on the same server revision remains mergeable until uploaded', () => {
  const local = {
    initialEquity: 100000,
    trades: [{
      uid: 'trade:pending', id: 1, pnl: 300, createdAt: 10, updatedAt: 300,
      serverRevision: 7, date: '2026-07-01',
    }],
    tombstones: [],
  };
  const server = {
    initialEquity: 100000,
    serverRevision: 7,
    trades: [{
      uid: 'trade:pending', id: 1, pnl: 100, createdAt: 10, updatedAt: 100,
      serverRevision: 7, date: '2026-07-01',
    }],
    tombstones: [],
  };

  assert.equal(mergeDatasets(local, server).trades[0].pnl, 300);
});

test('newer server image references replace stale device-only references', () => {
  const local = {
    initialEquity: 100000,
    trades: [{
      uid: 'trade:images', id: 1, pnl: 100, createdAt: 10, updatedAt: 100,
      serverRevision: 4, images: ['img-stale'], date: '2026-07-01',
    }],
    tombstones: [],
  };
  const server = {
    initialEquity: 100000,
    serverRevision: 5,
    trades: [{
      uid: 'trade:images', id: 1, pnl: 100, createdAt: 10, updatedAt: 200,
      serverRevision: 5, images: ['img-synced'], date: '2026-07-01',
    }],
    tombstones: [],
  };

  assert.deepEqual(mergeDatasets(local, server).trades[0].images, ['img-synced']);
  server.trades[0].images = [];
  assert.deepEqual(mergeDatasets(local, server).trades[0].images, []);
});
