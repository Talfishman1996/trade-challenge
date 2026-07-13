import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
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

const port = 8873;
const origin = `http://127.0.0.1:${port}`;
const vaultId = generateVaultSecret(24);
const secret = generateVaultSecret(32);
const authorization = { Authorization: `Bearer ${secret}` };
let workerOutput = '';

const worker = spawn('npx', [
  'wrangler', 'dev', '--local', '--port', String(port), '--config', 'worker/wrangler.toml',
], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, WRANGLER_LOG: 'error', NO_COLOR: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

worker.stdout.on('data', chunk => { workerOutput += chunk.toString(); });
worker.stderr.on('data', chunk => { workerOutput += chunk.toString(); });

const request = async (path, options = {}) => {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: {
      ...authorization,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, text, body };
};

const waitForWorker = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (worker.exitCode != null) throw new Error(`wrangler exited early\n${workerOutput}`);
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`wrangler did not become ready\n${workerOutput}`);
};

const context = (kind, uid) => ({ vaultId, kind, uid });
const operation = async ({ id, type, uid, value, kind, baseServerRevision = 0 }) => ({
  id,
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

const sync = async (clientId, operations) => request(`/v3/vault/${vaultId}/sync`, {
  method: 'POST',
  body: JSON.stringify({ clientId, operations }),
});

try {
  await waitForWorker();

  const health = await fetch(`${origin}/health`).then(response => response.json());
  assert.equal(health.version, 'tradevault-sync-v3');
  assert.equal(health.encryptedAssets, true);

  const tradeUid = 'trade:worker-e2e';
  const privateNote = 'PRIVATE_WORKER_E2E_SENTINEL';
  const firstTrade = {
    uid: tradeUid,
    id: 1,
    pnl: 15000,
    ticker: 'BTC',
    notes: privateNote,
    images: ['image:worker-e2e'],
    date: '2026-07-13',
    createdAt: 100,
    updatedAt: 100,
  };
  const initialOperations = [
    await operation({ id: 'op:worker-e2e:trade-1', type: 'upsert_trade', uid: tradeUid, value: firstTrade, kind: 'trade' }),
    await operation({
      id: 'op:worker-e2e:equity-1',
      type: 'set_initial_equity',
      uid: 'settings:initial-equity',
      value: { initialEquity: 100000, updatedAt: 100 },
      kind: 'initial-equity',
    }),
    await operation({
      id: 'op:worker-e2e:prefs-1',
      type: 'set_preferences',
      uid: 'settings:preferences',
      value: { winRate: 70, drawdownAlertPct: 20, updatedAt: 100 },
      kind: 'preferences',
    }),
  ];

  const firstSync = await sync('client:worker-e2e-a', initialOperations);
  assert.equal(firstSync.response.status, 200, firstSync.text);
  assert.equal(firstSync.text.includes(privateNote), false);
  assert.equal(firstSync.body.acknowledged.every(item => item.status === 'applied'), true);
  const encryptedTrade = firstSync.body.snapshot.trades.find(trade => trade.uid === tradeUid);
  assert.ok(encryptedTrade?.sealed);
  assert.equal(
    (await openVaultJson(encryptedTrade.sealed, secret, context('trade', tradeUid))).notes,
    privateNote
  );

  const staleV2Client = await request(`/v2/vault/${vaultId}/snapshot`);
  assert.equal(staleV2Client.response.status, 426, staleV2Client.text);

  const imageBytes = Uint8Array.from({ length: 6000 }, (_, index) => index % 251);
  const sealedImage = await sealVaultBytes(imageBytes, secret, context('asset', 'image:worker-e2e'));
  const imagePath = `/v3/vault/${vaultId}/assets/${encodeURIComponent('image:worker-e2e')}`;
  const imagePut = await request(imagePath, {
    method: 'PUT',
    body: JSON.stringify({ sealed: sealedImage, contentType: 'image/jpeg' }),
  });
  assert.equal(imagePut.response.status, 200, imagePut.text);
  const imageGet = await request(imagePath);
  assert.equal(imageGet.response.status, 200, imageGet.text);
  assert.deepEqual(
    await openVaultBytes(imageGet.body.sealed, secret, context('asset', 'image:worker-e2e')),
    imageBytes
  );

  const unauthorized = await fetch(`${origin}/v3/vault/${vaultId}/snapshot`, {
    headers: { Authorization: `Bearer ${generateVaultSecret(32)}` },
  });
  assert.equal(unauthorized.status, 401);

  const backupsAfterSync = await request(`/v3/vault/${vaultId}/backups`);
  assert.equal(backupsAfterSync.response.status, 200, backupsAfterSync.text);
  assert.equal(backupsAfterSync.body.backups.some(item => item.backup_id.startsWith('daily:')), true);

  const manual = await request(`/v3/vault/${vaultId}/backup`, { method: 'POST', body: '{}' });
  assert.equal(manual.response.status, 200, manual.text);
  assert.match(manual.body.backupId, /^manual:[0-9]+$/);
  const downloaded = await request(`/v3/vault/${vaultId}/backup/${manual.body.backupId}`);
  assert.equal(downloaded.response.status, 200, downloaded.text);
  assert.equal(downloaded.body.format, 'tradevault-encrypted-backup-v1');
  assert.equal(downloaded.text.includes(privateNote), false);

  const currentRevision = encryptedTrade.serverRevision;
  const changedTrade = { ...firstTrade, pnl: -5000, notes: 'changed after backup', updatedAt: 200 };
  const changed = await sync('client:worker-e2e-a', [await operation({
    id: 'op:worker-e2e:trade-2',
    type: 'upsert_trade',
    uid: tradeUid,
    value: changedTrade,
    kind: 'trade',
    baseServerRevision: currentRevision,
  })]);
  assert.equal(changed.response.status, 200, changed.text);
  assert.equal(changed.body.acknowledged[0].status, 'applied');

  const staleConflict = await sync('client:worker-e2e-b', [await operation({
    id: 'op:worker-e2e:stale-conflict',
    type: 'upsert_trade',
    uid: tradeUid,
    value: { ...firstTrade, pnl: 999, updatedAt: 300 },
    kind: 'trade',
    baseServerRevision: currentRevision,
  })]);
  assert.equal(staleConflict.response.status, 200, staleConflict.text);
  assert.equal(staleConflict.body.acknowledged[0].status, 'conflict');

  const restored = await request(`/v3/vault/${vaultId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ backupId: manual.body.backupId, confirmation: 'RESTORE' }),
  });
  assert.equal(restored.response.status, 200, restored.text);
  const restoredRecord = restored.body.snapshot.trades.find(trade => trade.uid === tradeUid);
  const restoredTrade = await openVaultJson(restoredRecord.sealed, secret, context('trade', tradeUid));
  assert.equal(restoredTrade.pnl, 15000);
  assert.equal(restoredTrade.notes, privateNote);

  const finalImage = await request(imagePath);
  assert.equal(finalImage.response.status, 200, finalImage.text);

  process.stdout.write('v3 local worker verification passed\n');
} finally {
  worker.kill('SIGTERM');
  await new Promise(resolve => {
    if (worker.exitCode != null) return resolve();
    worker.once('exit', resolve);
    setTimeout(() => {
      worker.kill('SIGKILL');
      resolve();
    }, 3000).unref();
  });
}
