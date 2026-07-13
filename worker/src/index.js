const MAX_PAYLOAD_BYTES = 1024 * 1024;

const jsonResponse = (body, status, corsHeaders) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

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

const pad2 = (value) => String(value).padStart(2, '0');

const toLocalDateString = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
};

const createLegacyUid = (raw) => [
  'legacy',
  raw?.id ?? 'none',
  toLocalDateString(raw?.date) || 'no-date',
  toLocalDateString(raw?.openDate) || 'no-open',
  String(asNumber(raw?.pnl, 0)),
  String(raw?.ticker || '').trim().toUpperCase() || 'no-ticker',
].join(':');

const normalizeTrade = (rawTrade, now = Date.now()) => {
  const raw = rawTrade || {};
  return {
    ...raw,
    uid: raw.uid || createLegacyUid(raw),
    id: raw.id ?? 0,
    createdAt: asNumber(raw.createdAt, asNumber(raw.updatedAt, now)),
    updatedAt: asNumber(raw.updatedAt, asNumber(raw.createdAt, now)),
    deletedAt: raw.deletedAt ? asNumber(raw.deletedAt, null) : null,
    date: toLocalDateString(raw.date) || toLocalDateString(now),
    openDate: raw.openDate ? toLocalDateString(raw.openDate) : null,
    ticker: typeof raw.ticker === 'string' ? raw.ticker.trim().toUpperCase() : '',
    setupTags: normalizeStringArray(raw.setupTags),
    emotionTags: normalizeStringArray(raw.emotionTags),
    mistakes: normalizeStringArray(raw.mistakes),
    images: normalizeStringArray(raw.images),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
};

const normalizeTombstone = (rawTombstone, now = Date.now()) => {
  if (!rawTombstone) return null;
  const uid = rawTombstone.uid || rawTombstone.tradeUid || rawTombstone.id || '';
  if (!uid) return null;
  const deletedAt = asNumber(rawTombstone.deletedAt, now);
  return {
    uid,
    deletedAt,
    updatedAt: asNumber(rawTombstone.updatedAt, deletedAt),
  };
};

const latestByUid = (records, pickTimestamp) => {
  const map = new Map();
  for (const record of records) {
    if (!record?.uid) continue;
    const prev = map.get(record.uid);
    if (!prev || pickTimestamp(record) >= pickTimestamp(prev)) {
      map.set(record.uid, record);
    }
  }
  return map;
};

const normalizeDataset = (rawData, now = Date.now()) => {
  const raw = rawData || {};
  const rest = { ...raw };
  delete rest.tradeDraft;
  const trades = (Array.isArray(raw.trades) ? raw.trades : [])
    .map(trade => normalizeTrade(trade, now))
    .filter(trade => !trade.deletedAt);
  const tombstones = Array.from(
    latestByUid(
      (Array.isArray(raw.tombstones) ? raw.tombstones : [])
        .map(tombstone => normalizeTombstone(tombstone, now))
        .filter(Boolean),
      item => item.deletedAt
    ).values()
  );

  const lastModified = Math.max(
    asNumber(raw.lastModified, 0),
    asNumber(raw._lastModified, 0),
    ...trades.map(trade => asNumber(trade.updatedAt, 0)),
    ...tombstones.map(tombstone => asNumber(tombstone.deletedAt, 0)),
    0
  );

  return {
    ...rest,
    trades,
    tombstones,
    lastModified,
  };
};

const mergeDatasets = (existingData, incomingData, now = Date.now()) => {
  const existing = normalizeDataset(existingData, now);
  const incoming = normalizeDataset(incomingData, now);

  const tradeMap = latestByUid(
    [...existing.trades, ...incoming.trades],
    trade => asNumber(trade.updatedAt, 0)
  );
  const tombstoneMap = latestByUid(
    [...existing.tombstones, ...incoming.tombstones],
    tombstone => asNumber(tombstone.deletedAt, 0)
  );

  for (const [uid, tombstone] of tombstoneMap.entries()) {
    const trade = tradeMap.get(uid);
    if (trade && asNumber(tombstone.deletedAt, 0) >= asNumber(trade.updatedAt, 0)) {
      tradeMap.delete(uid);
    }
  }

  const latestDataset = incoming.lastModified >= existing.lastModified ? incoming : existing;
  const merged = {
    ...latestDataset,
    initialEquity: latestDataset.initialEquity || existing.initialEquity || incoming.initialEquity || 100000,
    trades: Array.from(tradeMap.values()),
    tombstones: Array.from(tombstoneMap.values()),
    lastModified: Math.max(existing.lastModified, incoming.lastModified, now),
  };

  return merged;
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const parsePayload = async () => {
      const body = await request.text();
      if (body.length > MAX_PAYLOAD_BYTES) {
        return { error: jsonResponse({ error: 'payload too large' }, 413, corsHeaders) };
      }

      try {
        const json = JSON.parse(body);
        if (!json || typeof json !== 'object' || !Array.isArray(json.trades)) {
          return { error: jsonResponse({ error: 'invalid dataset' }, 400, corsHeaders) };
        }
        return { payload: json };
      } catch {
        return { error: jsonResponse({ error: 'invalid json' }, 400, corsHeaders) };
      }
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (request.method === 'POST' && !key) {
      const id = crypto.randomUUID();
      const { payload, error } = await parsePayload();
      if (error) return error;
      const normalized = normalizeDataset(payload);
      await env.SYNC_KV.put(id, JSON.stringify(normalized));
      return jsonResponse({ id }, 201, corsHeaders);
    }

    if (request.method === 'GET' && key) {
      const value = await env.SYNC_KV.get(key);
      if (!value) {
        return jsonResponse({ error: 'not found' }, 404, corsHeaders);
      }
      return new Response(value, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'PUT' && key) {
      const { payload, error } = await parsePayload();
      if (error) return error;

      const currentRaw = await env.SYNC_KV.get(key, 'json');
      const merged = currentRaw
        ? mergeDatasets(currentRaw, payload)
        : normalizeDataset(payload);

      await env.SYNC_KV.put(key, JSON.stringify(merged));
      return jsonResponse({ ok: true, lastModified: merged.lastModified, tradeCount: merged.trades.length }, 200, corsHeaders);
    }

    return jsonResponse({ error: 'not found' }, 404, corsHeaders);
  },
};
