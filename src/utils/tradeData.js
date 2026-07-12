export const DATA_STORAGE_KEY = 'risk-engine-data';
export const DATA_SCHEMA_VERSION = 2;

const DAY_MS = 86400000;

const pad2 = (value) => String(value).padStart(2, '0');

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

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
    const key = 'tradevault-client-id';
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
  normalized.id = raw.id ?? normalized.id ?? 0;
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

function latestByUid(records, pickTimestamp) {
  const map = new Map();
  for (const record of records) {
    if (!record?.uid) continue;
    const prev = map.get(record.uid);
    if (!prev || pickTimestamp(record) >= pickTimestamp(prev)) {
      map.set(record.uid, record);
    }
  }
  return map;
}

export function normalizeDataset(rawData, fallbackInitialEquity = 20000) {
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
      item => item.deletedAt
    ).values()
  );

  return {
    version: DATA_SCHEMA_VERSION,
    schemaVersion: DATA_SCHEMA_VERSION,
    initialEquity: asNumber(raw.initialEquity, fallbackInitialEquity),
    trades: normalizedTrades,
    tombstones,
    clientId: raw.clientId || getClientId(),
    _lastModified: asNumber(raw._lastModified, now),
  };
}

export function mergeDatasets(localData, remoteData, fallbackInitialEquity = 20000) {
  const local = normalizeDataset(localData, fallbackInitialEquity);
  const remote = normalizeDataset(remoteData, fallbackInitialEquity);

  const tradeMap = latestByUid(
    [...local.trades, ...remote.trades],
    trade => trade.updatedAt
  );
  const tombstoneMap = latestByUid(
    [...local.tombstones, ...remote.tombstones],
    tombstone => tombstone.deletedAt
  );

  for (const [uid, tombstone] of tombstoneMap.entries()) {
    const trade = tradeMap.get(uid);
    if (trade && tombstone.deletedAt >= trade.updatedAt) {
      tradeMap.delete(uid);
    }
  }

  const latestDataset = remote._lastModified >= local._lastModified ? remote : local;
  return normalizeDataset({
    ...latestDataset,
    initialEquity: latestDataset.initialEquity || local.initialEquity || remote.initialEquity || fallbackInitialEquity,
    trades: Array.from(tradeMap.values()),
    tombstones: Array.from(tombstoneMap.values()),
    _lastModified: Math.max(local._lastModified, remote._lastModified),
  }, fallbackInitialEquity);
}

export function readStoredDataset(fallbackInitialEquity = 20000) {
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY);
    if (raw) return normalizeDataset(JSON.parse(raw), fallbackInitialEquity);
  } catch {}
  return normalizeDataset(null, fallbackInitialEquity);
}

export function writeStoredDataset(data, fallbackInitialEquity = 20000) {
  const normalized = normalizeDataset(data, fallbackInitialEquity);
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
  return normalized;
}
