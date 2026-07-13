import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const API = process.env.TRADEVAULT_SYNC_API || 'https://tradevault-sync.talfishmanbusiness.workers.dev';
const vaultId = process.env.TRADEVAULT_VAULT_ID;
const secret = process.env.TRADEVAULT_VAULT_SECRET;

assert.match(vaultId || '', /^[A-Za-z0-9_-]{16,80}$/, 'TRADEVAULT_VAULT_ID is required');
assert.match(secret || '', /^[A-Za-z0-9_-]{32,128}$/, 'TRADEVAULT_VAULT_SECRET is required');

const legacyIds = ['tradevault-main', 'tradevault-main-100k-v1'];
const legacyDatasets = [];
for (const legacyId of legacyIds) {
  const response = await fetch(`${API}/${legacyId}`);
  if (response.ok) legacyDatasets.push(await response.json());
}

const active = new Map();
const deleted = new Map();
for (const dataset of legacyDatasets) {
  for (const trade of Array.isArray(dataset.trades) ? dataset.trades : []) {
    if (!trade?.uid) continue;
    const current = active.get(trade.uid);
    if (!current || Number(trade.updatedAt || 0) >= Number(current.updatedAt || 0)) {
      active.set(trade.uid, trade);
    }
  }
  for (const tombstone of Array.isArray(dataset.tombstones) ? dataset.tombstones : []) {
    if (!tombstone?.uid) continue;
    const current = deleted.get(tombstone.uid);
    if (!current || Number(tombstone.deletedAt || 0) >= Number(current.deletedAt || 0)) {
      deleted.set(tombstone.uid, tombstone);
    }
  }
}

for (const [uid, tombstone] of deleted.entries()) {
  const trade = active.get(uid);
  if (trade && Number(tombstone.deletedAt || 0) >= Number(trade.updatedAt || 0)) active.delete(uid);
}

const operations = [{
  id: `migration:${randomUUID()}`,
  type: 'set_initial_equity',
  uid: 'settings:initial-equity',
  baseServerRevision: 0,
  payload: { initialEquity: 100000, updatedAt: Date.now() },
}];

for (const trade of active.values()) {
  operations.push({
    id: `migration:${randomUUID()}`,
    type: 'upsert_trade',
    uid: trade.uid,
    baseServerRevision: 0,
    payload: { ...trade, images: [] },
  });
}

for (const tombstone of deleted.values()) {
  operations.push({
    id: `migration:${randomUUID()}`,
    type: 'delete_trade',
    uid: tombstone.uid,
    baseServerRevision: 0,
    payload: {
      deletedAt: Number(tombstone.deletedAt) || Date.now(),
      updatedAt: Number(tombstone.updatedAt) || Number(tombstone.deletedAt) || Date.now(),
    },
  });
}

let snapshot = null;
for (let index = 0; index < operations.length; index += 400) {
  const response = await fetch(`${API}/v2/vault/${vaultId}/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'migration:legacy-kv-v1',
      operations: operations.slice(index, index + 400),
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  snapshot = body.snapshot;
}

console.log(JSON.stringify({
  ok: true,
  sourceVaultsRead: legacyDatasets.length,
  migratedActiveTrades: active.size,
  migratedTombstones: deleted.size,
  finalActiveTrades: snapshot?.trades?.length || 0,
  finalTombstones: snapshot?.tombstones?.length || 0,
  serverRevision: snapshot?.serverRevision || 0,
}));
