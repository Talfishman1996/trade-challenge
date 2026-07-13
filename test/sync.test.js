import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPendingOperationCount,
  getSyncConfig,
  parseVaultCapability,
  pullFromCloud,
  pushToCloud,
  saveSyncConfig,
  setVaultCapability,
} from '../src/sync.js';

const vaultId = '0123456789abcdef012345';
const secret = 'abcdefghijklmnopqrstuvwxyzABCDEFGH1234567890_-';

test('private capability parses from a raw value or URL fragment', () => {
  const raw = `${vaultId}.${secret}`;
  assert.deepEqual(parseVaultCapability(raw), { vaultId, secret, value: raw });
  assert.deepEqual(
    parseVaultCapability(`https://tradevault.example/#vault=${raw}`),
    { vaultId, secret, value: raw }
  );
});

test('private capability rejects incomplete, short, or legacy sync links', () => {
  assert.equal(parseVaultCapability(''), null);
  assert.equal(parseVaultCapability('short.secret'), null);
  assert.equal(parseVaultCapability('https://tradevault.example/#sync=tradevault-main'), null);
});

test('sync metadata remains isolated when a browser changes private vaults', () => {
  const values = new Map();
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };

  try {
    const secondVaultId = 'fedcba9876543210fedcba';
    assert.equal(setVaultCapability(`${vaultId}.${secret}`), true);
    saveSyncConfig({ lastSync: 111 });

    assert.equal(setVaultCapability(`${secondVaultId}.${secret}`), true);
    saveSyncConfig({ lastSync: 222 });

    assert.equal(setVaultCapability(`${vaultId}.${secret}`), true);
    assert.equal(getSyncConfig().lastSync, 111);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('offline changes remain queued and flush after connectivity returns', async () => {
  const values = new Map();
  const originalStorage = globalThis.localStorage;
  const originalFetch = globalThis.fetch;
  globalThis.localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };

  const dataset = {
    initialEquity: 100000,
    trades: [{
      uid: 'trade:offline-test',
      id: 1,
      pnl: 15000,
      ticker: 'BTC',
      date: '2026-07-13',
      createdAt: 100,
      updatedAt: 100,
      serverRevision: 0,
      images: [],
    }],
    tombstones: [],
  };

  try {
    setVaultCapability(`${vaultId}.${secret}`);
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await pushToCloud(dataset), false);
    assert.equal(getPendingOperationCount(), 2);

    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      return new Response(JSON.stringify({
        acknowledged: body.operations.map((item, index) => ({
          id: item.id,
          status: 'applied',
          serverRevision: index + 1,
        })),
        snapshot: {
          version: 4,
          schemaVersion: 4,
          initialEquity: 100000,
          initialEquityRevision: 2,
          trades: [{ ...dataset.trades[0], serverRevision: 1, serverUpdatedAt: 200 }],
          tombstones: [],
          serverRevision: 2,
          serverTime: 200,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const snapshot = await pullFromCloud(dataset);
    assert.equal(snapshot.trades.length, 1);
    assert.equal(snapshot.trades[0].pnl, 15000);
    assert.equal(getPendingOperationCount(), 0);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
    globalThis.fetch = originalFetch;
  }
});
