const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_OPERATIONS_PER_SYNC = 500;
const MAX_ASSET_BYTES = 400 * 1024;
const MAX_BACKUPS = 30;
const API_VERSION = 'tradevault-sync-v3';

// Keep this enabled only during the frontend cutover. It is disabled after the
// capability-link build has replaced every production client.
const LEGACY_API_ENABLED = false;

const ALLOWED_ORIGINS = new Set([
  'https://tradevault-100k-prototype.pages.dev',
  'https://tradevault100k.pages.dev',
  'https://tradevault-b7t.pages.dev',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

const isAllowedOrigin = (origin) => !origin || ALLOWED_ORIGINS.has(origin) ||
  /^https:\/\/[a-z0-9-]+\.(?:tradevault-100k-prototype|tradevault100k|tradevault-b7t)\.pages\.dev$/.test(origin);

const corsHeadersFor = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...headers,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

const withCors = (response, origin) => {
  const headers = new Headers(response.headers);
  Object.entries(corsHeadersFor(origin)).forEach(([key, value]) => headers.set(key, value));
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const clamp = (value, minimum, maximum, fallback) => {
  const number = asNumber(value, fallback);
  return Math.min(maximum, Math.max(minimum, number));
};

const normalizePreferences = (rawPreferences) => {
  const raw = isPlainObject(rawPreferences) ? rawPreferences : {};
  return {
    winRate: clamp(raw.winRate, 50, 85, 70),
    drawdownAlertPct: clamp(raw.drawdownAlertPct, 5, 50, 20),
    maxRiskPct: clamp(raw.maxRiskPct, 0, 20, 0),
    tiltLockEnabled: raw.tiltLockEnabled !== false,
    tiltLockThreshold: clamp(raw.tiltLockThreshold, 2, 10, 3),
    tiltCooldownMinutes: clamp(raw.tiltCooldownMinutes, 5, 60, 15),
    dailyLossLimit: clamp(raw.dailyLossLimit, 0, 1000000000, 0),
    rMultipleDisplay: raw.rMultipleDisplay === true,
    updatedAt: asNumber(raw.updatedAt, Date.now()),
  };
};

const readJsonBody = async (request) => {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_PAYLOAD_BYTES) {
    return { error: jsonResponse({ error: 'payload too large' }, 413) };
  }

  try {
    const value = JSON.parse(body);
    return isPlainObject(value)
      ? { value }
      : { error: jsonResponse({ error: 'invalid json object' }, 400) };
  } catch {
    return { error: jsonResponse({ error: 'invalid json' }, 400) };
  }
};

const readBearerToken = (request) => {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]{32,128})$/);
  return match ? match[1] : null;
};

const sha256Base64Url = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const safeEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

const firstRow = (cursor) => cursor.toArray()[0] || null;

const normalizeSealedEnvelope = value => {
  if (!isPlainObject(value) || value.v !== 1 || value.alg !== 'A256GCM') {
    throw new Error('invalid encrypted envelope');
  }
  const iv = typeof value.iv === 'string' ? value.iv : '';
  const data = typeof value.data === 'string' ? value.data : '';
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(iv) || !/^[A-Za-z0-9_-]{16,1400000}$/.test(data)) {
    throw new Error('invalid encrypted payload');
  }
  return { v: 1, alg: 'A256GCM', iv, data };
};

const isSealedPayload = value => {
  try {
    return Boolean(normalizeSealedEnvelope(value?.sealed));
  } catch {
    return false;
  }
};

const normalizeEncryptedOperation = rawOperation => {
  if (!isPlainObject(rawOperation)) throw new Error('operation must be an object');
  const id = typeof rawOperation.id === 'string' ? rawOperation.id.trim() : '';
  const type = typeof rawOperation.type === 'string' ? rawOperation.type.trim() : '';
  const uid = typeof rawOperation.uid === 'string' ? rawOperation.uid.trim() : '';

  if (!/^[A-Za-z0-9:._-]{12,180}$/.test(id)) throw new Error('invalid operation id');
  if (!['upsert_trade', 'delete_trade', 'set_initial_equity', 'set_preferences'].includes(type)) {
    throw new Error('invalid operation type');
  }

  const base = {
    id,
    type,
    uid,
    baseServerRevision: Math.max(0, Math.floor(asNumber(rawOperation.baseServerRevision, 0))),
  };

  if (type === 'delete_trade') {
    if (!/^[A-Za-z0-9:._-]{8,240}$/.test(uid)) throw new Error('invalid trade uid');
    return {
      ...base,
      payload: {
        deletedAt: asNumber(rawOperation.payload?.deletedAt, Date.now()),
        updatedAt: asNumber(rawOperation.payload?.updatedAt, Date.now()),
      },
    };
  }

  if (type === 'set_initial_equity') base.uid = 'settings:initial-equity';
  else if (type === 'set_preferences') base.uid = 'settings:preferences';
  else if (!/^[A-Za-z0-9:._-]{8,240}$/.test(uid)) throw new Error('invalid trade uid');

  return {
    ...base,
    payload: {
      sealed: normalizeSealedEnvelope(rawOperation.payload?.sealed),
      meta: {
        updatedAt: asNumber(rawOperation.payload?.meta?.updatedAt, Date.now()),
        createdAt: asNumber(rawOperation.payload?.meta?.createdAt, rawOperation.payload?.meta?.updatedAt || Date.now()),
      },
    },
  };
};

const normalizeOperation = (rawOperation) => {
  if (!isPlainObject(rawOperation)) throw new Error('operation must be an object');

  const id = typeof rawOperation.id === 'string' ? rawOperation.id.trim() : '';
  const type = typeof rawOperation.type === 'string' ? rawOperation.type.trim() : '';
  const uid = typeof rawOperation.uid === 'string' ? rawOperation.uid.trim() : '';

  if (!/^[A-Za-z0-9:._-]{12,180}$/.test(id)) throw new Error('invalid operation id');
  if (!['upsert_trade', 'delete_trade', 'set_initial_equity', 'set_preferences'].includes(type)) {
    throw new Error('invalid operation type');
  }

  if (type === 'set_initial_equity') {
    const initialEquity = asNumber(rawOperation.payload?.initialEquity, NaN);
    if (!Number.isFinite(initialEquity) || initialEquity <= 0) throw new Error('invalid initial equity');
    return {
      id,
      type,
      uid: 'settings:initial-equity',
      baseServerRevision: Math.max(0, Math.floor(asNumber(rawOperation.baseServerRevision, 0))),
      payload: {
        initialEquity,
        updatedAt: asNumber(rawOperation.payload?.updatedAt, Date.now()),
      },
    };
  }

  if (type === 'set_preferences') {
    return {
      id,
      type,
      uid: 'settings:preferences',
      baseServerRevision: Math.max(0, Math.floor(asNumber(rawOperation.baseServerRevision, 0))),
      payload: normalizePreferences(rawOperation.payload),
    };
  }

  if (!/^[A-Za-z0-9:._-]{8,240}$/.test(uid)) throw new Error('invalid trade uid');

  if (type === 'delete_trade') {
    return {
      id,
      type,
      uid,
      baseServerRevision: Math.max(0, Math.floor(asNumber(rawOperation.baseServerRevision, 0))),
      payload: {
        deletedAt: asNumber(rawOperation.payload?.deletedAt, Date.now()),
        updatedAt: asNumber(rawOperation.payload?.updatedAt, Date.now()),
      },
    };
  }

  if (!isPlainObject(rawOperation.payload)) throw new Error('trade payload is required');
  const trade = { ...rawOperation.payload, uid };
  const pnl = Number(trade.pnl);
  // The current UI forbids zero-P&L entries. The API still accepts historical
  // zero-P&L records so a legacy migration cannot silently lose old data.
  if (!Number.isFinite(pnl)) throw new Error('trade pnl must be finite');
  trade.pnl = pnl;
  trade.updatedAt = asNumber(trade.updatedAt, Date.now());
  trade.createdAt = asNumber(trade.createdAt, trade.updatedAt);
  trade.deletedAt = null;

  return {
    id,
    type,
    uid,
    baseServerRevision: Math.max(0, Math.floor(asNumber(rawOperation.baseServerRevision, 0))),
    payload: trade,
  };
};

export class TradeVault {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;

    this.sql.exec(`CREATE TABLE IF NOT EXISTS vault_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vault_records (
      uid TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT,
      server_revision INTEGER NOT NULL,
      server_updated_at INTEGER NOT NULL,
      source_client_id TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vault_operations (
      operation_id TEXT PRIMARY KEY,
      server_revision INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      uid TEXT NOT NULL,
      payload TEXT,
      received_at INTEGER NOT NULL
    )`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS idx_vault_operations_revision ON vault_operations(server_revision)');
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vault_assets (
      asset_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS vault_backups (
      backup_id TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL,
      server_revision INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS idx_vault_backups_created ON vault_backups(created_at DESC)');
  }

  getMeta(key) {
    return firstRow(this.sql.exec('SELECT value FROM vault_meta WHERE key = ?', key))?.value || null;
  }

  setMeta(key, value) {
    this.sql.exec(
      'INSERT INTO vault_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      String(value)
    );
  }

  async authorize(token) {
    if (!token) return false;
    const incomingHash = await sha256Base64Url(token);
    const storedHash = this.getMeta('capability_hash');

    if (!storedHash) {
      this.state.storage.transactionSync(() => {
        if (!this.getMeta('capability_hash')) {
          this.setMeta('capability_hash', incomingHash);
          this.setMeta('created_at', Date.now());
          this.setMeta('revision', 0);
        }
      });
      return true;
    }

    return safeEqual(storedHash, incomingHash);
  }

  buildSnapshot() {
    const rows = this.sql.exec(`SELECT uid, kind, status, payload, server_revision, server_updated_at
      FROM vault_records ORDER BY server_revision ASC`).toArray();
    const trades = [];
    const tombstones = [];
    let initialEquity = 100000;
    let preferences = normalizePreferences({ updatedAt: 0 });

    for (const row of rows) {
      if (row.kind === 'settings') {
        if (row.uid === 'settings:initial-equity' && row.payload) {
          try {
            const settings = JSON.parse(row.payload);
            initialEquity = Math.max(1, asNumber(settings.initialEquity, initialEquity));
          } catch {}
        } else if (row.uid === 'settings:preferences' && row.payload) {
          try {
            preferences = {
              ...normalizePreferences(JSON.parse(row.payload)),
              serverRevision: row.server_revision,
              serverUpdatedAt: row.server_updated_at,
            };
          } catch {}
        }
        continue;
      }

      if (row.kind !== 'trade') continue;
      if (row.status === 'deleted') {
        let tombstone = {};
        try { tombstone = row.payload ? JSON.parse(row.payload) : {}; } catch {}
        tombstones.push({
          ...tombstone,
          uid: row.uid,
          deletedAt: asNumber(tombstone.deletedAt, row.server_updated_at),
          updatedAt: asNumber(tombstone.updatedAt, row.server_updated_at),
          serverRevision: row.server_revision,
          serverUpdatedAt: row.server_updated_at,
        });
        continue;
      }

      if (!row.payload) continue;
      try {
        trades.push({
          ...JSON.parse(row.payload),
          uid: row.uid,
          deletedAt: null,
          serverRevision: row.server_revision,
          serverUpdatedAt: row.server_updated_at,
        });
      } catch {}
    }

    return {
      version: 4,
      schemaVersion: 4,
      initialEquity,
      initialEquityRevision: asNumber(firstRow(this.sql.exec(
        "SELECT server_revision FROM vault_records WHERE uid = 'settings:initial-equity'"
      ))?.server_revision, 0),
      preferences,
      preferencesRevision: asNumber(firstRow(this.sql.exec(
        "SELECT server_revision FROM vault_records WHERE uid = 'settings:preferences'"
      ))?.server_revision, 0),
      trades,
      tombstones,
      serverRevision: asNumber(this.getMeta('revision'), 0),
      serverTime: Date.now(),
    };
  }

  buildEncryptedSnapshot() {
    const rows = this.sql.exec(`SELECT uid, kind, status, payload, server_revision, server_updated_at
      FROM vault_records ORDER BY server_revision ASC`).toArray();
    const trades = [];
    const tombstones = [];
    let initialEquity = 100000;
    let initialEquityRecord = null;
    let preferences = null;
    let preferencesRecord = null;
    let initialEquityRevision = 0;
    let preferencesRevision = 0;

    for (const row of rows) {
      let payload = {};
      try { payload = row.payload ? JSON.parse(row.payload) : {}; } catch {}

      if (row.kind === 'settings') {
        if (row.uid === 'settings:initial-equity') {
          initialEquityRevision = row.server_revision;
          if (isSealedPayload(payload)) {
            initialEquityRecord = { ...payload, serverRevision: row.server_revision, serverUpdatedAt: row.server_updated_at };
          } else {
            initialEquity = Math.max(1, asNumber(payload.initialEquity, initialEquity));
          }
        } else if (row.uid === 'settings:preferences') {
          preferencesRevision = row.server_revision;
          if (isSealedPayload(payload)) {
            preferencesRecord = { ...payload, serverRevision: row.server_revision, serverUpdatedAt: row.server_updated_at };
          } else {
            preferences = { ...normalizePreferences(payload), serverRevision: row.server_revision, serverUpdatedAt: row.server_updated_at };
          }
        }
        continue;
      }

      if (row.kind !== 'trade') continue;
      if (row.status === 'deleted') {
        tombstones.push({
          ...payload,
          uid: row.uid,
          deletedAt: asNumber(payload.deletedAt, row.server_updated_at),
          updatedAt: asNumber(payload.updatedAt, row.server_updated_at),
          serverRevision: row.server_revision,
          serverUpdatedAt: row.server_updated_at,
        });
      } else if (row.payload) {
        trades.push({
          ...payload,
          uid: row.uid,
          serverRevision: row.server_revision,
          serverUpdatedAt: row.server_updated_at,
        });
      }
    }

    return {
      version: 5,
      schemaVersion: 5,
      encryptionVersion: 1,
      initialEquity,
      initialEquityRecord,
      initialEquityRevision,
      preferences,
      preferencesRecord,
      preferencesRevision,
      trades,
      tombstones,
      serverRevision: asNumber(this.getMeta('revision'), 0),
      serverTime: Date.now(),
    };
  }

  snapshotIsFullyEncrypted(snapshot) {
    return snapshot.trades.every(trade => isSealedPayload(trade)) &&
      (!snapshot.initialEquityRevision || isSealedPayload(snapshot.initialEquityRecord)) &&
      (!snapshot.preferencesRevision || isSealedPayload(snapshot.preferencesRecord));
  }

  createBackup({ manual = false } = {}) {
    const snapshot = this.buildEncryptedSnapshot();
    if (!this.snapshotIsFullyEncrypted(snapshot)) return null;
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const backupId = manual ? `manual:${now}` : `daily:${day}`;
    const snapshotJson = JSON.stringify(snapshot);
    const existing = firstRow(this.sql.exec('SELECT server_revision FROM vault_backups WHERE backup_id = ?', backupId));
    if (!manual && existing && existing.server_revision === snapshot.serverRevision) return backupId;

    this.sql.exec(`INSERT INTO vault_backups(backup_id, snapshot, server_revision, created_at)
      VALUES(?, ?, ?, ?) ON CONFLICT(backup_id) DO UPDATE SET
      snapshot = excluded.snapshot,
      server_revision = excluded.server_revision,
      created_at = excluded.created_at`,
    backupId, snapshotJson, snapshot.serverRevision, now);
    this.sql.exec(`INSERT INTO vault_backups(backup_id, snapshot, server_revision, created_at)
      VALUES('latest', ?, ?, ?) ON CONFLICT(backup_id) DO UPDATE SET
      snapshot = excluded.snapshot,
      server_revision = excluded.server_revision,
      created_at = excluded.created_at`,
    snapshotJson, snapshot.serverRevision, now);
    this.sql.exec(`DELETE FROM vault_backups WHERE backup_id != 'latest' AND backup_id NOT IN (
      SELECT backup_id FROM vault_backups WHERE backup_id != 'latest' ORDER BY created_at DESC LIMIT ?
    )`, MAX_BACKUPS);
    return backupId;
  }

  listBackups() {
    return this.sql.exec(`SELECT backup_id, server_revision, created_at, length(snapshot) AS byte_size
      FROM vault_backups WHERE backup_id != 'latest' ORDER BY created_at DESC LIMIT ?`, MAX_BACKUPS).toArray();
  }

  restoreBackup(backupId) {
    const row = firstRow(this.sql.exec('SELECT snapshot FROM vault_backups WHERE backup_id = ?', backupId));
    if (!row?.snapshot) throw new Error('backup not found');
    let target;
    try { target = JSON.parse(row.snapshot); } catch { throw new Error('backup is unreadable'); }
    if (!this.snapshotIsFullyEncrypted(target)) throw new Error('backup is not fully encrypted');

    const currentSnapshot = this.buildEncryptedSnapshot();
    const now = Date.now();
    if (this.snapshotIsFullyEncrypted(currentSnapshot)) {
      this.sql.exec(`INSERT INTO vault_backups(backup_id, snapshot, server_revision, created_at)
        VALUES(?, ?, ?, ?)`, `pre-restore:${now}`, JSON.stringify(currentSnapshot), currentSnapshot.serverRevision, now);
    }

    this.state.storage.transactionSync(() => {
      const currentTradeUids = this.sql.exec("SELECT uid FROM vault_records WHERE kind = 'trade'").toArray().map(item => item.uid);
      const targetTradeUids = new Set([
        ...target.trades.map(trade => trade.uid),
        ...target.tombstones.map(tombstone => tombstone.uid),
      ]);
      let revision = asNumber(this.getMeta('revision'), 0);
      this.sql.exec('DELETE FROM vault_records');

      const putRecord = (uid, kind, status, payload) => {
        revision += 1;
        this.sql.exec(`INSERT INTO vault_records(
          uid, kind, status, payload, server_revision, server_updated_at, source_client_id
        ) VALUES(?, ?, ?, ?, ?, ?, 'backup-restore')`,
        uid, kind, status, JSON.stringify(payload), revision, now);
      };

      for (const trade of target.trades) {
        const { uid, serverRevision, serverUpdatedAt, ...payload } = trade;
        putRecord(uid, 'trade', 'active', payload);
      }
      for (const tombstone of target.tombstones) {
        const { uid, serverRevision, serverUpdatedAt, ...payload } = tombstone;
        putRecord(uid, 'trade', 'deleted', payload);
      }
      for (const uid of currentTradeUids) {
        if (!targetTradeUids.has(uid)) {
          putRecord(uid, 'trade', 'deleted', { deletedAt: now, updatedAt: now });
        }
      }
      if (target.initialEquityRecord) {
        const { serverRevision, serverUpdatedAt, ...payload } = target.initialEquityRecord;
        putRecord('settings:initial-equity', 'settings', 'active', payload);
      }
      if (target.preferencesRecord) {
        const { serverRevision, serverUpdatedAt, ...payload } = target.preferencesRecord;
        putRecord('settings:preferences', 'settings', 'active', payload);
      }

      this.sql.exec(`INSERT INTO vault_operations(
        operation_id, server_revision, client_id, operation_type, uid, payload, received_at
      ) VALUES(?, ?, 'backup-restore', 'restore', 'vault', ?, ?)`,
      `restore:${crypto.randomUUID()}`, revision, JSON.stringify({ backupId }), now);
      this.setMeta('revision', revision);
      this.setMeta('updated_at', now);
    });

    this.createBackup();
    return this.buildEncryptedSnapshot();
  }

  compactOperationHistory() {
    const count = asNumber(firstRow(this.sql.exec('SELECT count(*) AS count FROM vault_operations'))?.count, 0);
    if (count <= 10000) return;
    this.sql.exec(`DELETE FROM vault_operations WHERE operation_id IN (
      SELECT operation_id FROM vault_operations ORDER BY received_at ASC LIMIT ?
    )`, count - 5000);
  }

  applyOperations(clientId, operations) {
    const acknowledged = [];

    this.state.storage.transactionSync(() => {
      let revision = asNumber(this.getMeta('revision'), 0);

      for (const operation of operations) {
        const existing = firstRow(this.sql.exec(
          'SELECT server_revision FROM vault_operations WHERE operation_id = ?',
          operation.id
        ));
        if (existing) {
          acknowledged.push({ id: operation.id, serverRevision: existing.server_revision, status: 'duplicate' });
          continue;
        }

        const currentRecord = firstRow(this.sql.exec(
          'SELECT server_revision, source_client_id FROM vault_records WHERE uid = ?',
          operation.uid
        ));
        const isConflict = currentRecord &&
          currentRecord.server_revision > operation.baseServerRevision &&
          currentRecord.source_client_id !== clientId;

        if (isConflict) {
          const receivedAt = Date.now();
          this.sql.exec(`INSERT INTO vault_operations(
              operation_id, server_revision, client_id, operation_type, uid, payload, received_at
            ) VALUES(?, ?, ?, ?, ?, ?, ?)`,
          operation.id, currentRecord.server_revision, clientId, `conflict:${operation.type}`,
          operation.uid, JSON.stringify(operation.payload), receivedAt);
          acknowledged.push({
            id: operation.id,
            serverRevision: currentRecord.server_revision,
            status: 'conflict',
          });
          continue;
        }

        revision += 1;
        const receivedAt = Date.now();
        const payloadJson = JSON.stringify(operation.payload);

        if (operation.type === 'upsert_trade') {
          this.sql.exec(`INSERT INTO vault_records(
              uid, kind, status, payload, server_revision, server_updated_at, source_client_id
            ) VALUES(?, 'trade', 'active', ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              kind = 'trade',
              status = 'active',
              payload = excluded.payload,
              server_revision = excluded.server_revision,
              server_updated_at = excluded.server_updated_at,
              source_client_id = excluded.source_client_id`,
          operation.uid, payloadJson, revision, receivedAt, clientId);
        } else if (operation.type === 'delete_trade') {
          this.sql.exec(`INSERT INTO vault_records(
              uid, kind, status, payload, server_revision, server_updated_at, source_client_id
            ) VALUES(?, 'trade', 'deleted', ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              kind = 'trade',
              status = 'deleted',
              payload = excluded.payload,
              server_revision = excluded.server_revision,
              server_updated_at = excluded.server_updated_at,
              source_client_id = excluded.source_client_id`,
          operation.uid, payloadJson, revision, receivedAt, clientId);
        } else if (operation.type === 'set_initial_equity') {
          this.sql.exec(`INSERT INTO vault_records(
              uid, kind, status, payload, server_revision, server_updated_at, source_client_id
            ) VALUES('settings:initial-equity', 'settings', 'active', ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              kind = 'settings',
              status = 'active',
              payload = excluded.payload,
              server_revision = excluded.server_revision,
              server_updated_at = excluded.server_updated_at,
              source_client_id = excluded.source_client_id`,
          payloadJson, revision, receivedAt, clientId);
        } else {
          this.sql.exec(`INSERT INTO vault_records(
              uid, kind, status, payload, server_revision, server_updated_at, source_client_id
            ) VALUES('settings:preferences', 'settings', 'active', ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              kind = 'settings',
              status = 'active',
              payload = excluded.payload,
              server_revision = excluded.server_revision,
              server_updated_at = excluded.server_updated_at,
              source_client_id = excluded.source_client_id`,
          payloadJson, revision, receivedAt, clientId);
        }

        this.sql.exec(`INSERT INTO vault_operations(
            operation_id, server_revision, client_id, operation_type, uid, payload, received_at
          ) VALUES(?, ?, ?, ?, ?, ?, ?)`,
        operation.id, revision, clientId, operation.type, operation.uid, payloadJson, receivedAt);
        acknowledged.push({ id: operation.id, serverRevision: revision, status: 'applied' });
      }

      this.setMeta('revision', revision);
      this.setMeta('updated_at', Date.now());
    });

    return acknowledged;
  }

  async fetch(request) {
    const token = readBearerToken(request);
    if (!await this.authorize(token)) {
      return jsonResponse({ error: 'invalid vault capability' }, 401);
    }

    const url = new URL(request.url);
    const assetMatch = url.pathname.match(/^\/v3\/asset\/([A-Za-z0-9:._-]{8,240})$/);
    if (assetMatch) {
      const assetId = assetMatch[1];
      if (request.method === 'PUT') {
        const { value, error } = await readJsonBody(request);
        if (error) return error;
        let sealed;
        try { sealed = normalizeSealedEnvelope(value.sealed); } catch (assetError) {
          return jsonResponse({ error: assetError.message }, 400);
        }
        const byteSize = Math.floor((sealed.data.length * 3) / 4);
        if (byteSize > MAX_ASSET_BYTES) return jsonResponse({ error: 'encrypted asset too large' }, 413);
        const contentType = typeof value.contentType === 'string' ? value.contentType.slice(0, 120) : 'application/octet-stream';
        this.sql.exec(`INSERT INTO vault_assets(asset_id, payload, content_type, byte_size, updated_at)
          VALUES(?, ?, ?, ?, ?) ON CONFLICT(asset_id) DO UPDATE SET
          payload = excluded.payload,
          content_type = excluded.content_type,
          byte_size = excluded.byte_size,
          updated_at = excluded.updated_at`,
        assetId, JSON.stringify(sealed), contentType, byteSize, Date.now());
        return jsonResponse({ ok: true, assetId, byteSize });
      }
      if (request.method === 'GET' || request.method === 'HEAD') {
        const asset = firstRow(this.sql.exec(
          'SELECT payload, content_type, byte_size, updated_at FROM vault_assets WHERE asset_id = ?', assetId
        ));
        if (!asset) return jsonResponse({ error: 'asset not found' }, 404);
        if (request.method === 'HEAD') {
          return new Response(null, { status: 200, headers: { 'Content-Type': asset.content_type, 'X-Encrypted-Size': String(asset.byte_size), 'Cache-Control': 'no-store' } });
        }
        return jsonResponse({
          sealed: JSON.parse(asset.payload),
          contentType: asset.content_type,
          byteSize: asset.byte_size,
          updatedAt: asset.updated_at,
        });
      }
      if (request.method === 'DELETE') {
        this.sql.exec('DELETE FROM vault_assets WHERE asset_id = ?', assetId);
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    if (request.method === 'GET' && url.pathname === '/v3/backups') {
      return jsonResponse({ backups: this.listBackups() });
    }
    if (request.method === 'POST' && url.pathname === '/v3/backup') {
      const backupId = this.createBackup({ manual: true });
      return backupId
        ? jsonResponse({ ok: true, backupId, backups: this.listBackups() })
        : jsonResponse({ error: 'vault migration is not fully encrypted' }, 409);
    }
    const backupDownloadMatch = url.pathname.match(/^\/v3\/backup\/((?:daily:[0-9-]+)|(?:manual:[0-9]+)|(?:pre-restore:[0-9]+))$/);
    if (request.method === 'GET' && backupDownloadMatch) {
      const backup = firstRow(this.sql.exec('SELECT snapshot, created_at FROM vault_backups WHERE backup_id = ?', backupDownloadMatch[1]));
      return backup
        ? jsonResponse({ format: 'tradevault-encrypted-backup-v1', backupId: backupDownloadMatch[1], createdAt: backup.created_at, snapshot: JSON.parse(backup.snapshot) })
        : jsonResponse({ error: 'backup not found' }, 404);
    }
    if (request.method === 'POST' && url.pathname === '/v3/restore') {
      const { value, error } = await readJsonBody(request);
      if (error) return error;
      if (value.confirmation !== 'RESTORE') return jsonResponse({ error: 'restore confirmation required' }, 400);
      try {
        return jsonResponse({ ok: true, snapshot: this.restoreBackup(String(value.backupId || '')) });
      } catch (restoreError) {
        return jsonResponse({ error: restoreError.message }, restoreError.message === 'backup not found' ? 404 : 400);
      }
    }

    if (request.method === 'GET' && url.pathname === '/v3/snapshot') {
      return jsonResponse(this.buildEncryptedSnapshot());
    }
    if (request.method === 'POST' && url.pathname === '/v3/sync') {
      const { value, error } = await readJsonBody(request);
      if (error) return error;
      const clientId = typeof value.clientId === 'string' ? value.clientId.slice(0, 180) : '';
      if (!clientId) return jsonResponse({ error: 'client id is required' }, 400);
      if (!Array.isArray(value.operations)) return jsonResponse({ error: 'operations must be an array' }, 400);
      if (value.operations.length > MAX_OPERATIONS_PER_SYNC) return jsonResponse({ error: 'too many operations' }, 413);

      let operations;
      try { operations = value.operations.map(normalizeEncryptedOperation); }
      catch (operationError) { return jsonResponse({ error: operationError.message }, 400); }

      const acknowledged = this.applyOperations(clientId, operations);
      this.compactOperationHistory();
      const snapshot = this.buildEncryptedSnapshot();
      this.createBackup();
      return jsonResponse({ ok: true, acknowledged, snapshot });
    }

    if (request.method === 'GET' && url.pathname === '/snapshot') {
      const encryptedSnapshot = this.buildEncryptedSnapshot();
      if (encryptedSnapshot.serverRevision > 0 && this.snapshotIsFullyEncrypted(encryptedSnapshot)) {
        return jsonResponse({ error: 'encrypted vault requires a v3 client' }, 426);
      }
      return jsonResponse(this.buildSnapshot());
    }

    if (request.method === 'POST' && url.pathname === '/sync') {
      const encryptedSnapshot = this.buildEncryptedSnapshot();
      if (encryptedSnapshot.serverRevision > 0 && this.snapshotIsFullyEncrypted(encryptedSnapshot)) {
        return jsonResponse({ error: 'encrypted vault requires a v3 client' }, 426);
      }
      const { value, error } = await readJsonBody(request);
      if (error) return error;

      const clientId = typeof value.clientId === 'string' ? value.clientId.slice(0, 180) : '';
      if (!clientId) return jsonResponse({ error: 'client id is required' }, 400);
      if (!Array.isArray(value.operations)) return jsonResponse({ error: 'operations must be an array' }, 400);
      if (value.operations.length > MAX_OPERATIONS_PER_SYNC) {
        return jsonResponse({ error: 'too many operations' }, 413);
      }

      let operations;
      try {
        operations = value.operations.map(normalizeOperation);
      } catch (operationError) {
        return jsonResponse({ error: operationError.message }, 400);
      }

      const acknowledged = this.applyOperations(clientId, operations);
      return jsonResponse({
        ok: true,
        acknowledged,
        snapshot: this.buildSnapshot(),
      });
    }

    return jsonResponse({ error: 'not found' }, 404);
  }
}

// Legacy one-document KV endpoint retained only for the short deployment cutover.
const legacyFetch = async (request, env, key, corsHeaders) => {
  if (!LEGACY_API_ENABLED) {
    return jsonResponse({ error: 'legacy sync retired' }, 410, corsHeaders);
  }

  if (!key || !['tradevault-main', 'tradevault-main-100k-v1'].includes(key)) {
    return jsonResponse({ error: 'not found' }, 404, corsHeaders);
  }

  if (request.method === 'GET') {
    const value = await env.SYNC_KV.get(key);
    return value
      ? new Response(value, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
      : jsonResponse({ error: 'not found' }, 404, corsHeaders);
  }

  if (request.method === 'PUT') {
    const { value, error } = await readJsonBody(request);
    if (error) return withCors(error, request.headers.get('Origin'));
    if (!Array.isArray(value.trades)) return jsonResponse({ error: 'invalid dataset' }, 400, corsHeaders);
    await env.SYNC_KV.put(key, JSON.stringify({ ...value, lastModified: Date.now() }));
    return jsonResponse({ ok: true, tradeCount: value.trades.length }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'not found' }, 404, corsHeaders);
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) return jsonResponse({ error: 'origin not allowed' }, 403);
    const corsHeaders = corsHeadersFor(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({
        ok: true,
        version: API_VERSION,
        encryptionVersion: 1,
        encryptedAssets: true,
        encryptedBackups: true,
        legacyApiEnabled: LEGACY_API_ENABLED,
      }, 200, corsHeaders);
    }

    const v3AssetMatch = url.pathname.match(/^\/v3\/vault\/([A-Za-z0-9_-]{16,80})\/assets\/([^/]+)$/);
    if (v3AssetMatch) {
      const vaultId = v3AssetMatch[1];
      let assetId = '';
      try { assetId = decodeURIComponent(v3AssetMatch[2]); } catch {}
      if (!/^[A-Za-z0-9:._-]{8,240}$/.test(assetId)) {
        return jsonResponse({ error: 'invalid asset id' }, 400, corsHeaders);
      }
      if (!['GET', 'PUT', 'DELETE', 'HEAD'].includes(request.method)) {
        return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders);
      }
      if (!readBearerToken(request)) return jsonResponse({ error: 'vault capability required' }, 401, corsHeaders);
      const stub = env.TRADE_VAULTS.get(env.TRADE_VAULTS.idFromName(vaultId));
      const response = await stub.fetch(new Request(`https://tradevault.internal/v3/asset/${assetId}`, request));
      return withCors(response, origin);
    }

    const v3Match = url.pathname.match(/^\/v3\/vault\/([A-Za-z0-9_-]{16,80})\/(sync|snapshot|backups|backup|restore)$/);
    if (v3Match) {
      const [, vaultId, action] = v3Match;
      const expectedMethods = {
        sync: 'POST',
        snapshot: 'GET',
        backups: 'GET',
        backup: 'POST',
        restore: 'POST',
      };
      if (request.method !== expectedMethods[action]) return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders);
      if (!readBearerToken(request)) return jsonResponse({ error: 'vault capability required' }, 401, corsHeaders);
      const stub = env.TRADE_VAULTS.get(env.TRADE_VAULTS.idFromName(vaultId));
      const response = await stub.fetch(new Request(`https://tradevault.internal/v3/${action}`, request));
      return withCors(response, origin);
    }

    const v3BackupDownloadMatch = url.pathname.match(/^\/v3\/vault\/([A-Za-z0-9_-]{16,80})\/backup\/((?:daily:[0-9-]+)|(?:manual:[0-9]+)|(?:pre-restore:[0-9]+))$/);
    if (v3BackupDownloadMatch) {
      const [, vaultId, backupId] = v3BackupDownloadMatch;
      if (request.method !== 'GET') return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders);
      if (!readBearerToken(request)) return jsonResponse({ error: 'vault capability required' }, 401, corsHeaders);
      const stub = env.TRADE_VAULTS.get(env.TRADE_VAULTS.idFromName(vaultId));
      const response = await stub.fetch(new Request(`https://tradevault.internal/v3/backup/${backupId}`, request));
      return withCors(response, origin);
    }

    const match = url.pathname.match(/^\/v2\/vault\/([A-Za-z0-9_-]{16,80})\/(sync|snapshot)$/);
    if (match) {
      const [, vaultId, action] = match;
      const expectedMethod = action === 'snapshot' ? 'GET' : 'POST';
      if (request.method !== expectedMethod) return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders);
      if (!readBearerToken(request)) return jsonResponse({ error: 'vault capability required' }, 401, corsHeaders);

      const objectId = env.TRADE_VAULTS.idFromName(vaultId);
      const stub = env.TRADE_VAULTS.get(objectId);
      const forwarded = new Request(`https://tradevault.internal/${action}`, request);
      const response = await stub.fetch(forwarded);
      return withCors(response, origin);
    }

    const legacyKey = url.pathname.slice(1);
    return legacyFetch(request, env, legacyKey, corsHeaders);
  },
};
