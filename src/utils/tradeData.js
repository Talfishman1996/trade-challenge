export const DATA_STORAGE_KEY = 'tradevault-data-100k-v1';
export const DATA_SCHEMA_VERSION = 4;
export const DEFAULT_INITIAL_EQUITY = 100000;

const LEGACY_DATA_STORAGE_KEY = 'risk-engine-data';
const LEGACY_MIGRATION_KEY = 'tradevault-legacy-local-migrated-100k-v1';
const CAPABILITY_KEY = 'tradevault-capability-100k-v1';

const DAY_MS = 86400000;

const activeVaultId = () => {
  try {
    const raw = localStorage.getItem(CAPABILITY_KEY) || '';
    const candidate = raw.split('.')[0];
    return /^[A-Za-z0-9_-]{16,80}$/.test(candidate) ? candidate : 'unbound';
  } catch {
    return 'unbound';
  }
};

const scopedDataStorageKey = () => `${DATA_STORAGE_KEY}:${activeVaultId()}`;
const scopedMigrationKey = () => `${LEGACY_MIGRATION_KEY}:${activeVaultId()}`;

const pad2 = (value) => String(value).padStart(2, '0');

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function requireNonzeroPnl(value) {
  const pnl = Number(value);
  if (!Number.isFinite(pnl) || pnl === 0) {
    throw new Error('Trade P&L must be a nonzero number');
  }
  return pnl;
}

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
};

export function todayLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseLocalDate(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function localDateToTimestamp(value) {
  const date = parseLocalDate(value);
  return date ? date.getTime() : NaN;
}

export function toLocalDateString(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const parsedLocal = parseLocalDate(value);
    if (parsedLocal) return value;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
}

export function formatLocalDate(value, options) {
  const parsed = parseLocalDate(toLocalDateString(value));
  return parsed ? parsed.toLocaleDateString('en-US', options) : '';
}

export function daysBetweenLocalDates(start, end) {
  const startTs = localDateToTimestamp(toLocalDateString(start));
  const endTs = localDateToTimestamp(toLocalDateString(end));
  if (Number.isNaN(startTs) || Number.isNaN(endTs)) return null;
  return (endTs - startTs) / DAY_MS;
}

export function localDateDaysAgo(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return toLocalDateString(date);
}

export function createTradeUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `trade:${crypto.randomUUID()}`;
  }
  return `trade:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientId() {
  try {
    const key = 'tradevault-client-id-100k-v1';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = createTradeUid().replace(/^trade:/, 'client:');
    localStorage.setItem(key, next);
    return next;
  } catch {
    return 'client:unknown';
  }
}

export function freshTradeDefaults(now = Date.now()) {
  return {
    uid: '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    strategy: '',
    contracts: 0,
    entryPrice: 0,
    exitPrice: 0,
    entryTime: '',
    exitTime: '',
    setupTags: [],
    emotionTags: [],
    mistakes: [],
    mae: null,
    mfe: null,
    images: [],
    notes: '',
    ticker: '',
    direction: 'long',
    openDate: null,
    date: todayLocalDate(),
    modelId: null,
    modelStatus: null,
    revision: 0,
    serverRevision: 0,
    serverUpdatedAt: 0,
  };
}

function createLegacyUid(raw) {
  return [
    'legacy',
    raw?.id ?? 'none',
    toLocalDateString(raw?.date) || 'no-date',
    toLocalDateString(raw?.openDate) || 'no-open',
    String(asNumber(raw?.pnl, 0)),
    String(raw?.ticker || '').trim().toUpperCase() || 'no-ticker',
  ].join(':');
}

export function normalizeTrade(rawTrade, now = Date.now()) {
  const raw = rawTrade || {};
  const normalized = {
    ...freshTradeDefaults(now),
    ...raw,
  };

  normalized.uid = raw.uid || createLegacyUid(raw);
  normalized.id = Math.max(0, Math.floor(asNumber(raw.id, 0)));
  normalized.pnl = asNumber(raw.pnl, 0);
  normalized.createdAt = asNumber(raw.createdAt, asNumber(raw.updatedAt, now));
  normalized.updatedAt = asNumber(raw.updatedAt, normalized.createdAt);
  normalized.deletedAt = raw.deletedAt ? asNumber(raw.deletedAt, null) : null;
  normalized.date = toLocalDateString(raw.date) || todayLocalDate();
  normalized.openDate = raw.openDate ? toLocalDateString(raw.openDate) : null;
  normalized.setupTags = normalizeStringArray(raw.setupTags);
  normalized.emotionTags = normalizeStringArray(raw.emotionTags);
  normalized.mistakes = normalizeStringArray(raw.mistakes);
  normalized.images = normalizeStringArray(raw.images);
  normalized.ticker = typeof raw.ticker === 'string' ? raw.ticker.trim().toUpperCase() : '';
  normalized.notes = typeof raw.notes === 'string' ? raw.notes : '';
  normalized.direction = raw.direction === 'short' ? 'short' : 'long';
  normalized.contracts = asNumber(raw.contracts, 0);
  normalized.entryPrice = asNumber(raw.entryPrice, 0);
  normalized.exitPrice = asNumber(raw.exitPrice, 0);
  normalized.mae = raw.mae == null ? null : asNumber(raw.mae, 0);
  normalized.mfe = raw.mfe == null ? null : asNumber(raw.mfe, 0);
  normalized.modelId = typeof raw.modelId === 'string' && raw.modelId
    ? raw.modelId
    : (asNumber(raw.riskDol, 0) > 0 ? 'legacy-unversioned' : null);
  normalized.modelStatus = typeof raw.modelStatus === 'string' ? raw.modelStatus : null;
  normalized.revision = Math.max(0, Math.floor(asNumber(raw.revision, 0)));
  normalized.serverRevision = Math.max(0, Math.floor(asNumber(raw.serverRevision, 0)));
  normalized.serverUpdatedAt = Math.max(0, asNumber(raw.serverUpdatedAt, 0));

  return normalized;
}

function normalizeTombstone(rawTombstone, now = Date.now()) {
  if (!rawTombstone) return null;
  const uid = rawTombstone.uid || rawTombstone.tradeUid || rawTombstone.id || '';
  if (!uid) return null;
  const deletedAt = asNumber(rawTombstone.deletedAt, now);
  return {
    uid,
    deletedAt,
    updatedAt: asNumber(rawTombstone.updatedAt, deletedAt),
    serverRevision: Math.max(0, Math.floor(asNumber(rawTombstone.serverRevision, 0))),
    serverUpdatedAt: Math.max(0, asNumber(rawTombstone.serverUpdatedAt, 0)),
  };
}

export function sortTrades(trades) {
  return [...trades].sort((a, b) => {
    const aDate = localDateToTimestamp(a.date);
    const bDate = localDateToTimestamp(b.date);
    if (aDate !== bDate) return aDate - bDate;

    const aOpen = localDateToTimestamp(a.openDate || a.date);
    const bOpen = localDateToTimestamp(b.openDate || b.date);
    if (aOpen !== bOpen) return aOpen - bOpen;

    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;

    const aId = typeof a.id === 'number' ? a.id : String(a.id || '');
    const bId = typeof b.id === 'number' ? b.id : String(b.id || '');
    if (aId < bId) return -1;
    if (aId > bId) return 1;
    return String(a.uid).localeCompare(String(b.uid));
  });
}

function compareVersion(left, right) {
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const difference = asNumber(left[index], 0) - asNumber(right[index], 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function latestByUid(records, pickVersion) {
  const map = new Map();
  for (const record of records) {
    if (!record?.uid) continue;
    const prev = map.get(record.uid);
    if (!prev || compareVersion(pickVersion(record), pickVersion(prev)) >= 0) {
      map.set(record.uid, record);
    }
  }
  return map;
}

export function normalizeDataset(rawData, fallbackInitialEquity = DEFAULT_INITIAL_EQUITY) {
  const raw = rawData || {};
  const now = Date.now();
  const normalizedTrades = sortTrades(
    (Array.isArray(raw.trades) ? raw.trades : [])
      .map(trade => normalizeTrade(trade, now))
      .filter(trade => !trade.deletedAt)
  );

  const tombstones = Array.from(
    latestByUid(
      (Array.isArray(raw.tombstones) ? raw.tombstones : [])
        .map(tombstone => normalizeTombstone(tombstone, now))
        .filter(Boolean),
      item => [item.serverRevision, item.deletedAt]
    ).values()
  );

  return {
    version: DATA_SCHEMA_VERSION,
    schemaVersion: DATA_SCHEMA_VERSION,
    initialEquity: Math.max(1, asNumber(raw.initialEquity, fallbackInitialEquity)),
    trades: normalizedTrades,
    tombstones,
    clientId: raw.clientId || getClientId(),
    serverRevision: Math.max(0, Math.floor(asNumber(raw.serverRevision, 0))),
    initialEquityRevision: Math.max(0, Math.floor(asNumber(raw.initialEquityRevision, 0))),
    _lastModified: asNumber(raw._lastModified, now),
  };
}

export function mergeDatasets(localData, remoteData, fallbackInitialEquity = DEFAULT_INITIAL_EQUITY) {
  const local = normalizeDataset(localData, fallbackInitialEquity);
  const remote = normalizeDataset(remoteData, fallbackInitialEquity);

  const tradeMap = latestByUid(
    [...local.trades, ...remote.trades],
    trade => [trade.serverRevision, trade.updatedAt]
  );
  const tombstoneMap = latestByUid(
    [...local.tombstones, ...remote.tombstones],
    tombstone => [tombstone.serverRevision, tombstone.deletedAt]
  );

  for (const [uid, tombstone] of tombstoneMap.entries()) {
    const trade = tradeMap.get(uid);
    if (trade && compareVersion(
      [tombstone.serverRevision, tombstone.deletedAt],
      [trade.serverRevision, trade.updatedAt]
    ) >= 0) {
      tradeMap.delete(uid);
    }
  }

  const latestDataset = compareVersion(
    [remote.serverRevision, remote._lastModified],
    [local.serverRevision, local._lastModified]
  ) >= 0 ? remote : local;
  return normalizeDataset({
    ...latestDataset,
    initialEquity: latestDataset.initialEquity || local.initialEquity || remote.initialEquity || fallbackInitialEquity,
    trades: Array.from(tradeMap.values()),
    tombstones: Array.from(tombstoneMap.values()),
    serverRevision: Math.max(local.serverRevision, remote.serverRevision),
    initialEquityRevision: Math.max(local.initialEquityRevision, remote.initialEquityRevision),
    _lastModified: Math.max(local._lastModified, remote._lastModified),
  }, fallbackInitialEquity);
}

export function readStoredDataset(fallbackInitialEquity = DEFAULT_INITIAL_EQUITY) {
  try {
    const raw = localStorage.getItem(scopedDataStorageKey());
    const current = raw ? normalizeDataset(JSON.parse(raw), fallbackInitialEquity) : null;
    if (localStorage.getItem(scopedMigrationKey())) {
      return current || normalizeDataset(null, fallbackInitialEquity);
    }

    const prior100kRaw = localStorage.getItem(DATA_STORAGE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_DATA_STORAGE_KEY);
    if (!legacyRaw && !prior100kRaw) return current || normalizeDataset(null, fallbackInitialEquity);

    const sources = [current];
    for (const sourceRaw of [prior100kRaw, legacyRaw]) {
      if (!sourceRaw) continue;
      sources.push(normalizeDataset({
        ...JSON.parse(sourceRaw),
        initialEquity: DEFAULT_INITIAL_EQUITY,
      }, DEFAULT_INITIAL_EQUITY));
    }
    const combined = sources.filter(Boolean).reduce(
      (result, source) => result ? mergeDatasets(result, source, DEFAULT_INITIAL_EQUITY) : source,
      null
    );
    const migrated = normalizeDataset({
      ...combined,
      initialEquity: DEFAULT_INITIAL_EQUITY,
      _lastModified: Date.now(),
    }, DEFAULT_INITIAL_EQUITY);

    localStorage.setItem(scopedDataStorageKey(), JSON.stringify(migrated));
    localStorage.setItem(scopedMigrationKey(), String(Date.now()));
    return migrated;
  } catch {}
  return normalizeDataset(null, fallbackInitialEquity);
}

export function writeStoredDataset(data, fallbackInitialEquity = DEFAULT_INITIAL_EQUITY) {
  const normalized = normalizeDataset(data, fallbackInitialEquity);
  try {
    localStorage.setItem(scopedDataStorageKey(), JSON.stringify(normalized));
  } catch {}
  return normalized;
}
