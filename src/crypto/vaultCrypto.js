const CRYPTO_VERSION = 1;
const ALGORITHM = 'A256GCM';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCache = new Map();

const subtle = () => {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable');
  return globalThis.crypto.subtle;
};

const bytesToBase64Url = bytes => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlToBytes = value => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const contextString = ({ vaultId, kind, uid }) =>
  `tradevault-e2ee-v1|${vaultId}|${kind}|${uid}`;

const deriveVaultKey = async secret => {
  const cacheKey = String(secret || '');
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(cacheKey)) throw new Error('Invalid vault secret');

  const promise = (async () => {
    const material = await subtle().importKey(
      'raw',
      base64UrlToBytes(cacheKey),
      'HKDF',
      false,
      ['deriveKey']
    );
    return subtle().deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('tradevault-e2ee-v1'),
      info: encoder.encode('vault-content-key'),
    }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  })();

  keyCache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    keyCache.delete(cacheKey);
    throw error;
  }
};

export const isSealedEnvelope = value => Boolean(
  value &&
  value.v === CRYPTO_VERSION &&
  value.alg === ALGORITHM &&
  typeof value.iv === 'string' &&
  typeof value.data === 'string'
);

export const sealVaultBytes = async (value, secret, context) => {
  const bytes = value instanceof Uint8Array
    ? value
    : new Uint8Array(value instanceof ArrayBuffer ? value : await value.arrayBuffer());
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await subtle().encrypt({
    name: 'AES-GCM',
    iv,
    additionalData: encoder.encode(contextString(context)),
  }, await deriveVaultKey(secret), bytes);

  return {
    v: CRYPTO_VERSION,
    alg: ALGORITHM,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(new Uint8Array(encrypted)),
  };
};

export const openVaultBytes = async (envelope, secret, context) => {
  if (!isSealedEnvelope(envelope)) throw new Error('Invalid encrypted envelope');
  const decrypted = await subtle().decrypt({
    name: 'AES-GCM',
    iv: base64UrlToBytes(envelope.iv),
    additionalData: encoder.encode(contextString(context)),
  }, await deriveVaultKey(secret), base64UrlToBytes(envelope.data));
  return new Uint8Array(decrypted);
};

export const sealVaultJson = (value, secret, context) =>
  sealVaultBytes(encoder.encode(JSON.stringify(value)), secret, context);

export const openVaultJson = async (envelope, secret, context) => {
  const bytes = await openVaultBytes(envelope, secret, context);
  return JSON.parse(decoder.decode(bytes));
};

export const generateVaultSecret = (byteLength = 32) =>
  bytesToBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(byteLength)));

export const vaultCryptoVersion = CRYPTO_VERSION;
