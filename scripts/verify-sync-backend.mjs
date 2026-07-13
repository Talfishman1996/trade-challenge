import assert from 'node:assert/strict';
import { randomUUID, webcrypto } from 'node:crypto';
import {
  generateVaultSecret,
  openVaultBytes,
  openVaultJson,
  sealVaultBytes,
  sealVaultJson,
} from '../src/crypto/vaultCrypto.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64');
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, 'base64').toString('binary');

const API = process.env.TRADEVAULT_SYNC_API ||
  'https://tradevault-sync.talfishmanbusiness.workers.dev';
const vaultId = generateVaultSecret(24);
const secret = generateVaultSecret(32);
const endpoint = `${API}/v3/vault/${vaultId}`;
const origin = 'https://tradevault100k.pages.dev';

const request = async (path, { token = secret, method = 'GET', body } = {}) => {
  const response = await fetch(`${endpoint}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: origin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { response, text, json };
};

const context = (kind, uid) => ({ vaultId, kind, uid });

const operation = async ({ type, uid, value, kind, baseServerRevision = 0 }) => ({
  id: `operation:${randomUUID()}`,
  type,
  uid,
  baseServerRevision,
  payload: type === 'delete_trade'
    ? value
    : {
        sealed: await sealVaultJson(value, secret, context(kind, uid)),
        meta: {
          createdAt: Number(value.createdAt) || Number(value.updatedAt) || Date.now(),
          updatedAt: Number(value.updatedAt) || Date.now(),
        },
      },
});

const sync = async (clientId, operations = []) => {
  const result = await request('sync', {
    method: 'POST',
    body: { clientId, operations },
  });
  assert.equal(result.response.status, 200, result.text);
  return result;
};

const healthResponse = await fetch(`${API}/health`);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.version, 'tradevault-sync-v3');
assert.equal(health.encryptedAssets, true);

const tradeUid = `trade:${randomUUID()}`;
const privateSentinel = `PRIVATE_REMOTE_SENTINEL_${randomUUID()}`;
const firstTrade = {
  uid: tradeUid,
  id: 1,
  pnl: 15000,
  ticker: 'BTC',
  notes: privateSentinel,
  images: [],
  date: '2026-07-13',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const created = await sync('remote-smoke-a', [await operation({
  type: 'upsert_trade',
  uid: tradeUid,
  value: firstTrade,
  kind: 'trade',
})]);
assert.equal(created.text.includes(privateSentinel), false);
assert.equal(created.json.acknowledged[0].status, 'applied');
const encryptedTrade = created.json.snapshot.trades.find(item => item.uid === tradeUid);
assert.ok(encryptedTrade?.sealed);
assert.equal(
  (await openVaultJson(encryptedTrade.sealed, secret, context('trade', tradeUid))).notes,
  privateSentinel
);

const unauthorized = await request('snapshot', { token: generateVaultSecret(32) });
assert.equal(unauthorized.response.status, 401);

const assetId = `image:${randomUUID()}`;
const imageBytes = Uint8Array.from({ length: 4096 }, (_, index) => index % 251);
const sealedImage = await sealVaultBytes(imageBytes, secret, context('asset', assetId));
const assetPath = `assets/${encodeURIComponent(assetId)}`;
const imagePut = await request(assetPath, {
  method: 'PUT',
  body: { sealed: sealedImage, contentType: 'image/jpeg' },
});
assert.equal(imagePut.response.status, 200, imagePut.text);
const imageGet = await request(assetPath);
assert.equal(imageGet.response.status, 200, imageGet.text);
assert.deepEqual(
  await openVaultBytes(imageGet.json.sealed, secret, context('asset', assetId)),
  imageBytes
);

const manualBackup = await request('backup', { method: 'POST', body: {} });
assert.equal(manualBackup.response.status, 200, manualBackup.text);
assert.match(manualBackup.json.backupId, /^manual:[0-9]+$/);
const backupDownload = await request(`backup/${manualBackup.json.backupId}`);
assert.equal(backupDownload.response.status, 200, backupDownload.text);
assert.equal(backupDownload.json.format, 'tradevault-encrypted-backup-v1');
assert.equal(backupDownload.text.includes(privateSentinel), false);

const firstRevision = encryptedTrade.serverRevision;
const editedTrade = { ...firstTrade, pnl: -5000, updatedAt: Date.now() + 1 };
const edited = await sync('remote-smoke-b', [await operation({
  type: 'upsert_trade',
  uid: tradeUid,
  value: editedTrade,
  kind: 'trade',
  baseServerRevision: firstRevision,
})]);
assert.equal(edited.json.acknowledged[0].status, 'applied');

const stale = await sync('remote-smoke-a', [await operation({
  type: 'upsert_trade',
  uid: tradeUid,
  value: { ...firstTrade, pnl: 999, updatedAt: Date.now() + 2 },
  kind: 'trade',
  baseServerRevision: firstRevision,
})]);
assert.equal(stale.json.acknowledged[0].status, 'conflict');

process.stdout.write(`${JSON.stringify({
  ok: true,
  apiVersion: health.version,
  checks: [
    'ciphertext-only trade roundtrip',
    'invalid capability rejected',
    'encrypted image roundtrip',
    'encrypted backup download',
    'stale edit rejected',
  ],
  finalServerRevision: stale.json.snapshot.serverRevision,
})}\n`);
