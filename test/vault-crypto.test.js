import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64');
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, 'base64').toString('binary');

const {
  generateVaultSecret,
  isSealedEnvelope,
  openVaultBytes,
  openVaultJson,
  sealVaultBytes,
  sealVaultJson,
} = await import('../src/crypto/vaultCrypto.js');

const vaultId = '1234567890abcdef1234567890abcdef';
const context = { vaultId, kind: 'trade', uid: 'trade:test-record' };

test('vault JSON encryption round-trips without exposing plaintext', async () => {
  const secret = generateVaultSecret();
  const value = { pnl: 15000, notes: 'private setup notes', nested: ['BTC', true] };
  const sealed = await sealVaultJson(value, secret, context);

  assert.equal(isSealedEnvelope(sealed), true);
  assert.equal(JSON.stringify(sealed).includes('private setup notes'), false);
  assert.deepEqual(await openVaultJson(sealed, secret, context), value);
});

test('vault encryption binds ciphertext to its vault and record context', async () => {
  const secret = generateVaultSecret();
  const sealed = await sealVaultJson({ pnl: -2500 }, secret, context);

  await assert.rejects(() => openVaultJson(sealed, secret, { ...context, uid: 'trade:other' }));
  await assert.rejects(() => openVaultJson(sealed, generateVaultSecret(), context));
});

test('binary image encryption preserves every byte', async () => {
  const secret = generateVaultSecret();
  const bytes = Uint8Array.from({ length: 4096 }, (_, index) => index % 251);
  const imageContext = { vaultId, kind: 'asset', uid: 'image:test' };
  const sealed = await sealVaultBytes(bytes, secret, imageContext);

  assert.deepEqual(await openVaultBytes(sealed, secret, imageContext), bytes);
});
