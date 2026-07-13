import {
  isSealedEnvelope,
  openVaultBytes,
  openVaultJson,
  sealVaultBytes,
  sealVaultJson,
} from './crypto/vaultCrypto.js';
import { getImageBlob, hasImage, saveImage } from './utils/imageDB.js';

const API = 'https://tradevault-sync.talfishmanbusiness.workers.dev';
const SYNC_KEY = 'tradevault-sync-100k-v3';
const CAPABILITY_KEY = 'tradevault-capability-100k-v1';
const OUTBOX_KEY = 'tradevault-sync-outbox-100k-v3';
const SIGNATURE_KEY = 'tradevault-sync-signatures-100k-v3';
const ASSET_STATE_KEY = 'tradevault-sync-assets-100k-v1';
const CLIENT_KEY = 'tradevault-client-id-100k-v1';
const MAX_BATCH_SIZE = 500;
const CANONICAL_APP_URL = 'https://tradevault100k.pages.dev/';

const bundledSharedCapability = () => {
  try {
    return typeof __TRADEVAULT_SHARED_CAPABILITY__ === 'string'
      ? __TRADEVAULT_SHARED_CAPABILITY__
      : '';
  } catch {
    return '';
  }
};

let writeQueue = Promise.resolve();

const scopedKey = (baseKey) => {
  let vaultId = 'unbound';
  try {
    const raw = localStorage.getItem(CAPABILITY_KEY) || '';
    const candidate = raw.split('.')[0];
    if (/^[A-Za-z0-9_-]{16,80}$/.test(candidate)) vaultId = candidate;
  } catch {}
  return `${baseKey}:${vaultId}`;
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getClientId = () => {
  try {
    const current = localStorage.getItem(CLIENT_KEY);
    if (current) return current;
    const next = `client:${randomId()}`;
    localStorage.setItem(CLIENT_KEY, next);
    return next;
  } catch {
    return `client:${randomId()}`;
  }
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (!['_lastModified', 'serverRevision', 'serverUpdatedAt'].includes(key)) {
      result[key] = canonicalize(value[key]);
    }
    return result;
  }, {});
};

const signatureFor = (value) => JSON.stringify(canonicalize(value));

const cloudTrade = (trade) => ({
  ...trade,
  images: Array.isArray(trade.images) ? trade.images : [],
  serverRevision: undefined,
  serverUpdatedAt: undefined,
});

const currentSignatures = () => {
  const stored = readJson(scopedKey(SIGNATURE_KEY), null);
  return stored && stored.version === 2
    ? stored
    : { version: 2, records: {}, initialEquity: null, preferences: null };
};

const readOutbox = () => {
  const outbox = readJson(scopedKey(OUTBOX_KEY), []);
  return Array.isArray(outbox) ? outbox : [];
};

const writeOutbox = (outbox) => writeJson(scopedKey(OUTBOX_KEY), outbox);

const makeOperation = (type, uid, payload, baseServerRevision = 0) => ({
  id: `op:${getClientId().replace(/[^A-Za-z0-9:._-]/g, '')}:${randomId()}`,
  type,
  uid,
  payload,
  baseServerRevision: Math.max(0, Number(baseServerRevision) || 0),
  queuedAt: Date.now(),
});

const queueLatestOperation = (operation) => {
  const pending = readOutbox();
  const next = [
    ...pending.filter(item => item.uid !== operation.uid),
    operation,
  ];
  return writeOutbox(next);
};

const assetState = () => {
  const stored = readJson(scopedKey(ASSET_STATE_KEY), null);
  return stored && stored.version === 1 ? stored : { version: 1, uploaded: {} };
};

const authHeaders = capability => ({ Authorization: `Bearer ${capability.secret}` });

const assetUrl = (capability, key) =>
  `${API}/v3/vault/${capability.vaultId}/assets/${encodeURIComponent(key)}`;

const uploadImageAsset = async (key, capability) => {
  const isActiveVault = getVaultCapability()?.vaultId === capability.vaultId;
  const state = isActiveVault ? assetState() : null;
  if (state?.uploaded[key]) return true;
  const blob = await getImageBlob(key).catch(() => null);
  if (!blob) return false;
  const sealed = await sealVaultBytes(blob, capability.secret, {
    vaultId: capability.vaultId,
    kind: 'asset',
    uid: key,
  });
  const response = await fetch(assetUrl(capability, key), {
    method: 'PUT',
    headers: { ...authHeaders(capability), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sealed, contentType: blob.type || 'image/jpeg' }),
  });
  if (!response.ok) return false;
  if (state) {
    state.uploaded[key] = Date.now();
    writeJson(scopedKey(ASSET_STATE_KEY), state);
  }
  return true;
};

const encryptedPayload = async (value, type, uid, capability) => ({
  sealed: await sealVaultJson(value, capability.secret, {
    vaultId: capability.vaultId,
    kind: type,
    uid,
  }),
  meta: {
    updatedAt: Number(value.updatedAt) || Date.now(),
    createdAt: Number(value.createdAt) || Number(value.updatedAt) || Date.now(),
  },
});

const queueDatasetSnapshot = async data => {
  if (!data) return 0;
  const capability = getVaultCapability();
  if (!capability) return 0;
  const signatures = currentSignatures();
  let queued = 0;

  for (const trade of Array.isArray(data.trades) ? data.trades : []) {
    if (!trade?.uid) continue;
    const payload = cloudTrade(trade);
    await Promise.all((payload.images || []).map(key => uploadImageAsset(key, capability).catch(() => false)));
    const signature = signatureFor({ status: 'active', payload });
    if (signatures.records[trade.uid]?.signature === signature && signatures.records[trade.uid]?.encrypted) continue;
    if (queueLatestOperation(makeOperation(
      'upsert_trade',
      trade.uid,
      await encryptedPayload(payload, 'trade', trade.uid, capability),
      trade.serverRevision
    ))) {
      signatures.records[trade.uid] = { status: 'active', signature, encrypted: true };
      queued += 1;
    }
  }

  for (const tombstone of Array.isArray(data.tombstones) ? data.tombstones : []) {
    if (!tombstone?.uid) continue;
    const payload = {
      deletedAt: Number(tombstone.deletedAt) || Date.now(),
      updatedAt: Number(tombstone.updatedAt) || Number(tombstone.deletedAt) || Date.now(),
    };
    const signature = signatureFor({ status: 'deleted', payload });
    if (signatures.records[tombstone.uid]?.signature === signature) continue;
    if (queueLatestOperation(makeOperation(
      'delete_trade',
      tombstone.uid,
      payload,
      tombstone.serverRevision
    ))) {
      signatures.records[tombstone.uid] = { status: 'deleted', signature, encrypted: true };
      queued += 1;
    }
  }

  const initialEquity = Math.max(1, Number(data.initialEquity) || 100000);
  const initialSignature = signatureFor(initialEquity);
  const hasRecords = (data.trades?.length || 0) + (data.tombstones?.length || 0) > 0;
  if (signatures.initialEquity?.signature !== initialSignature || !signatures.initialEquity?.encrypted) {
    // A blank new device must first read the vault instead of overwriting a
    // custom starting balance with its local default.
    if (signatures.initialEquity || hasRecords) {
      const operation = makeOperation(
        'set_initial_equity',
        'settings:initial-equity',
        await encryptedPayload(
          { initialEquity, updatedAt: Date.now() },
          'initial-equity',
          'settings:initial-equity',
          capability
        ),
        data.initialEquityRevision || signatures.initialEquity?.serverRevision
      );
      if (queueLatestOperation(operation)) queued += 1;
    }
    signatures.initialEquity = {
      signature: initialSignature,
      serverRevision: Math.max(0, Number(data.initialEquityRevision) || 0),
      encrypted: Boolean(signatures.initialEquity || hasRecords),
    };
  }

  if (data.preferences && typeof data.preferences === 'object') {
    const { serverRevision, serverUpdatedAt, ...preferences } = data.preferences;
    const preferencesSignature = signatureFor(preferences);
    if (signatures.preferences?.signature !== preferencesSignature || !signatures.preferences?.encrypted) {
      const hasExistingPreferences = Boolean(signatures.preferences);
      const isMigratedOrEdited = Number(preferences.updatedAt) > 0;
      if (hasExistingPreferences || isMigratedOrEdited) {
        const operation = makeOperation(
          'set_preferences',
          'settings:preferences',
          await encryptedPayload(preferences, 'preferences', 'settings:preferences', capability),
          serverRevision || data.preferencesRevision || signatures.preferences?.serverRevision
        );
        if (queueLatestOperation(operation)) queued += 1;
      }
      signatures.preferences = {
        signature: preferencesSignature,
        serverRevision: Math.max(0, Number(serverRevision || data.preferencesRevision) || 0),
        encrypted: Boolean(hasExistingPreferences || isMigratedOrEdited),
      };
    }
  }

  writeJson(scopedKey(SIGNATURE_KEY), signatures);
  return queued;
};

const downloadImageAsset = async (key, capability) => {
  if (await hasImage(key).catch(() => false)) return true;
  const response = await fetch(assetUrl(capability, key), { headers: authHeaders(capability) });
  if (!response.ok) return false;
  const asset = await response.json();
  const bytes = await openVaultBytes(asset.sealed, capability.secret, {
    vaultId: capability.vaultId,
    kind: 'asset',
    uid: key,
  });
  await saveImage(key, new Blob([bytes], { type: asset.contentType || 'image/jpeg' }));
  const state = assetState();
  state.uploaded[key] = Number(asset.updatedAt) || Date.now();
  writeJson(scopedKey(ASSET_STATE_KEY), state);
  return true;
};

const decryptVaultSnapshot = async (snapshot, capability) => {
  const encryptedRecordUids = [];
  const trades = [];
  for (const record of Array.isArray(snapshot?.trades) ? snapshot.trades : []) {
    if (isSealedEnvelope(record?.sealed)) {
      const trade = await openVaultJson(record.sealed, capability.secret, {
        vaultId: capability.vaultId,
        kind: 'trade',
        uid: record.uid,
      });
      trades.push({
        ...trade,
        uid: record.uid,
        serverRevision: record.serverRevision,
        serverUpdatedAt: record.serverUpdatedAt,
      });
      encryptedRecordUids.push(record.uid);
    } else {
      trades.push(record);
    }
  }

  let initialEquity = Math.max(1, Number(snapshot?.initialEquity) || 100000);
  let initialEquityEncrypted = false;
  if (isSealedEnvelope(snapshot?.initialEquityRecord?.sealed)) {
    const settings = await openVaultJson(snapshot.initialEquityRecord.sealed, capability.secret, {
      vaultId: capability.vaultId,
      kind: 'initial-equity',
      uid: 'settings:initial-equity',
    });
    initialEquity = Math.max(1, Number(settings.initialEquity) || initialEquity);
    initialEquityEncrypted = true;
  }

  let preferences = snapshot?.preferences || null;
  let preferencesEncrypted = false;
  if (isSealedEnvelope(snapshot?.preferencesRecord?.sealed)) {
    preferences = await openVaultJson(snapshot.preferencesRecord.sealed, capability.secret, {
      vaultId: capability.vaultId,
      kind: 'preferences',
      uid: 'settings:preferences',
    });
    preferences = {
      ...preferences,
      serverRevision: snapshot.preferencesRecord.serverRevision,
      serverUpdatedAt: snapshot.preferencesRecord.serverUpdatedAt,
    };
    preferencesEncrypted = true;
  }

  const decrypted = {
    ...snapshot,
    initialEquity,
    preferences,
    trades,
    _encryption: {
      records: encryptedRecordUids,
      initialEquity: initialEquityEncrypted,
      preferences: preferencesEncrypted,
      allEncrypted: encryptedRecordUids.length === trades.length &&
        (!snapshot.initialEquityRevision || initialEquityEncrypted) &&
        (!snapshot.preferencesRevision || preferencesEncrypted),
    },
  };

  await Promise.all(trades.flatMap(trade =>
    (Array.isArray(trade.images) ? trade.images : []).map(key =>
      downloadImageAsset(key, capability).catch(() => false)
    )
  ));
  return decrypted;
};

const markSnapshotSignatures = (snapshot) => {
  if (!snapshot) return;
  const signatures = currentSignatures();
  const pendingUids = new Set(readOutbox().map(operation => operation.uid));

  for (const trade of Array.isArray(snapshot.trades) ? snapshot.trades : []) {
    if (!trade?.uid || pendingUids.has(trade.uid)) continue;
    signatures.records[trade.uid] = {
      status: 'active',
      signature: signatureFor({ status: 'active', payload: cloudTrade(trade) }),
      encrypted: snapshot._encryption?.records?.includes(trade.uid) === true,
    };
  }

  for (const tombstone of Array.isArray(snapshot.tombstones) ? snapshot.tombstones : []) {
    if (!tombstone?.uid || pendingUids.has(tombstone.uid)) continue;
    const payload = {
      deletedAt: Number(tombstone.deletedAt) || 0,
      updatedAt: Number(tombstone.updatedAt) || Number(tombstone.deletedAt) || 0,
    };
    signatures.records[tombstone.uid] = {
      status: 'deleted',
      signature: signatureFor({ status: 'deleted', payload }),
      encrypted: true,
    };
  }

  if (!pendingUids.has('settings:initial-equity')) {
    signatures.initialEquity = {
      signature: signatureFor(Math.max(1, Number(snapshot.initialEquity) || 100000)),
      serverRevision: Math.max(0, Number(snapshot.initialEquityRevision) || 0),
      encrypted: snapshot._encryption?.initialEquity === true,
    };
  }

  if (snapshot.preferences && !pendingUids.has('settings:preferences')) {
    const { serverRevision, serverUpdatedAt, ...preferences } = snapshot.preferences;
    signatures.preferences = {
      signature: signatureFor(preferences),
      serverRevision: Math.max(0, Number(serverRevision || snapshot.preferencesRevision) || 0),
      encrypted: snapshot._encryption?.preferences === true,
    };
  }

  writeJson(scopedKey(SIGNATURE_KEY), signatures);
};

export const parseVaultCapability = (input) => {
  const value = String(input || '').trim();
  if (!value) return null;

  let candidate = value;
  try {
    const url = new URL(value, typeof window !== 'undefined' ? window.location.href : 'https://tradevault.local');
    candidate = new URLSearchParams(url.hash.replace(/^#/, '')).get('vault') || value;
  } catch {}

  const match = candidate.match(/^([A-Za-z0-9_-]{16,80})\.([A-Za-z0-9_-]{32,128})$/);
  return match ? { vaultId: match[1], secret: match[2], value: `${match[1]}.${match[2]}` } : null;
};

export const getVaultCapability = () => {
  try { return parseVaultCapability(localStorage.getItem(CAPABILITY_KEY)); } catch { return null; }
};

export const setVaultCapability = (input) => {
  const capability = parseVaultCapability(input);
  if (!capability) return false;
  try {
    const previousVaultId = getVaultCapability()?.vaultId || null;
    const previousConfig = getSyncConfig();
    localStorage.setItem(CAPABILITY_KEY, capability.value);
    const targetConfig = getSyncConfig();
    saveSyncConfig({
      ...(targetConfig || {}),
      vaultId: capability.vaultId,
      lastSync: previousVaultId === capability.vaultId
        ? previousConfig?.lastSync || null
        : targetConfig?.lastSync || null,
    });
    return true;
  } catch {
    return false;
  }
};

export const initializeVaultCapability = () => {
  if (typeof window === 'undefined') return getVaultCapability();
  const shared = parseVaultCapability(bundledSharedCapability());
  if (shared) {
    setVaultCapability(shared.value);
    if (window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    return shared;
  }

  const fromUrl = parseVaultCapability(window.location.href);
  if (fromUrl) {
    setVaultCapability(fromUrl.value);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return fromUrl;
  }
  return getVaultCapability();
};

export const hasVaultCapability = () => Boolean(getVaultCapability());

export const getSyncConfig = () => readJson(scopedKey(SYNC_KEY), null);

export const saveSyncConfig = (config = {}) => {
  const capability = getVaultCapability();
  const current = getSyncConfig() || {};
  const next = {
    ...current,
    ...config,
    vaultId: capability?.vaultId || config.vaultId || current.vaultId || null,
  };
  writeJson(scopedKey(SYNC_KEY), next);
  return next;
};

export const clearSyncConfig = ({ includeCapability = false } = {}) => {
  try {
    localStorage.removeItem(scopedKey(SYNC_KEY));
    localStorage.removeItem(scopedKey(OUTBOX_KEY));
    localStorage.removeItem(scopedKey(SIGNATURE_KEY));
    localStorage.removeItem(scopedKey(ASSET_STATE_KEY));
    if (includeCapability) localStorage.removeItem(CAPABILITY_KEY);
  } catch {}
};

export const ensurePrimarySyncConfig = () => {
  const capability = getVaultCapability();
  return saveSyncConfig({
    vaultId: capability?.vaultId || null,
    ready: Boolean(capability),
    lastSync: getSyncConfig()?.lastSync || null,
    pendingOperations: readOutbox().length,
  });
};

export const buildSyncUrl = () => {
  if (typeof window === 'undefined') return CANONICAL_APP_URL;
  return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? `${window.location.origin}${window.location.pathname}`
    : CANONICAL_APP_URL;
};

const enqueueWrite = (task) => {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => null);
  return result;
};

export const waitForPendingPushes = () => writeQueue;

const flushOutbox = async () => {
  const capability = getVaultCapability();
  if (!capability) return null;

  const requested = readOutbox().slice(0, MAX_BATCH_SIZE);
  const response = await fetch(`${API}/v3/vault/${capability.vaultId}/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${capability.secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: getClientId(),
      operations: requested.map(({ queuedAt, ...operation }) => operation),
    }),
  });

  if (!response.ok) throw new Error(`sync request failed (${response.status})`);
  const result = await response.json();
  const acknowledgedIds = new Set((result.acknowledged || []).map(item => item.id));
  writeOutbox(readOutbox().filter(operation => !acknowledgedIds.has(operation.id)));
  const snapshot = await decryptVaultSnapshot(result.snapshot, capability);
  markSnapshotSignatures(snapshot);

  const conflicts = (result.acknowledged || []).filter(item => item.status === 'conflict').length;
  saveSyncConfig({
    lastSync: Date.now(),
    pendingOperations: readOutbox().length,
    lastConflictCount: conflicts,
    encryptionVersion: 1,
    fullyEncrypted: snapshot._encryption?.allEncrypted === true,
  });

  return {
    snapshot,
    uploadedCount: requested.length,
    conflicts,
    pendingOperations: readOutbox().length,
  };
};

export const pushToCloud = async (data) => {
  if (!hasVaultCapability()) return false;
  try {
    await queueDatasetSnapshot(data);
    return Boolean(await enqueueWrite(flushOutbox));
  } catch {
    saveSyncConfig({ pendingOperations: readOutbox().length });
    return false;
  }
};

export const pullFromCloud = async (data = null) => {
  if (!hasVaultCapability()) return null;
  try {
    if (data) await queueDatasetSnapshot(data);
    let result = await enqueueWrite(flushOutbox);
    if (result?.snapshot && !result.snapshot._encryption?.allEncrypted) {
      await queueDatasetSnapshot({
        ...result.snapshot,
        preferences: result.snapshot.preferences,
      });
      if (readOutbox().length > 0) result = await enqueueWrite(flushOutbox);
    }
    return result?.snapshot
      ? { ...result.snapshot, _sync: result }
      : null;
  } catch {
    saveSyncConfig({ pendingOperations: readOutbox().length });
    return null;
  }
};

const vaultRequest = async (path, options = {}) => {
  const capability = getVaultCapability();
  if (!capability) throw new Error('shared cloud vault is unavailable');
  const response = await fetch(`${API}/v3/vault/${capability.vaultId}/${path}`, {
    ...options,
    headers: {
      ...authHeaders(capability),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(payload?.error || `vault request failed (${response.status})`);
  return payload;
};

export const listVaultBackups = async () => {
  const result = await vaultRequest('backups');
  return Array.isArray(result?.backups) ? result.backups : [];
};

export const createVaultBackup = async () => vaultRequest('backup', { method: 'POST', body: '{}' });

const normalizeBackupId = backupId => {
  const value = String(backupId || '');
  if (!/^(?:daily:[0-9]{4}-[0-9]{2}-[0-9]{2}|manual:[0-9]+|pre-restore:[0-9]+)$/.test(value)) {
    throw new Error('invalid backup id');
  }
  return value;
};

export const downloadVaultBackup = backupId =>
  vaultRequest(`backup/${normalizeBackupId(backupId)}`);

export const restoreVaultBackup = async backupId => {
  const capability = getVaultCapability();
  const result = await vaultRequest('restore', {
    method: 'POST',
    body: JSON.stringify({ backupId: normalizeBackupId(backupId), confirmation: 'RESTORE' }),
  });
  return result?.snapshot ? decryptVaultSnapshot(result.snapshot, capability) : null;
};

export const getPendingOperationCount = () => readOutbox().length;

// Temporary read-only bridge used by the one-time production migration.
export const pullLegacyBlob = async (blobId) => {
  if (!['tradevault-main', 'tradevault-main-100k-v1'].includes(blobId)) return null;
  try {
    const response = await fetch(`${API}/${blobId}`);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
};
