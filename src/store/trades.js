import { useState, useCallback, useMemo, useRef } from 'react';
import { getPhase, plannedRisk } from '../math/risk.js';
import { MILES, START_EQUITY } from '../math/constants.js';
import { pushToCloud, pullFromCloud, waitForPendingPushes } from '../sync.js';
import { clearAllImages, deleteImage } from '../utils/imageDB.js';
import {
  createTradeUid,
  freshTradeDefaults,
  localDateDaysAgo,
  mergeDatasets,
  normalizeDataset,
  readStoredDataset,
  requireNonzeroPnl,
  todayLocalDate,
  writeStoredDataset,
} from '../utils/tradeData.js';

const datasetSignature = (data) => JSON.stringify({
  initialEquity: data.initialEquity,
  trades: data.trades,
  tombstones: data.tombstones || [],
});

const upsertTombstone = (tombstones, next) => {
  const all = Array.isArray(tombstones) ? [...tombstones] : [];
  const idx = all.findIndex(item => item.uid === next.uid);
  if (idx === -1) return [...all, next];
  if ((all[idx].deletedAt || 0) <= next.deletedAt) all[idx] = next;
  return all;
};

const recalcTradeChain = (trades, baseEquity) => {
  const result = [...trades];
  for (let i = 0; i < result.length; i++) {
    const eqBefore = i > 0 ? result[i - 1].equityAfter : baseEquity;
    const existingRiskDol = Number(result[i].riskDol);
    const existingRiskPct = Number(result[i].riskPct);
    result[i] = {
      ...result[i],
      equityBefore: eqBefore,
      equityAfter: Math.max(1, eqBefore + result[i].pnl),
      riskPct: Number.isFinite(existingRiskPct) ? existingRiskPct : null,
      riskDol: Number.isFinite(existingRiskDol) ? existingRiskDol : null,
      phase: result[i].phase || getPhase(eqBefore),
    };
  }
  return result;
};

export const useTrades = (initialEquity = START_EQUITY) => {
  const [data, setData] = useState(() => {
    const loaded = readStoredDataset(initialEquity);
    return {
      ...loaded,
      trades: recalcTradeChain(loaded.trades, loaded.initialEquity || initialEquity),
    };
  });
  const dataRef = useRef(data);
  const [celebration, setCelebration] = useState(null);
  const undoStackRef = useRef([]);
  const [undoStackLen, setUndoStackLen] = useState(0);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  dataRef.current = data;

  const persist = useCallback((newData, { sync = true } = {}) => {
    const normalized = normalizeDataset(newData, initialEquity);
    const stamped = {
      ...normalized,
      trades: recalcTradeChain(normalized.trades, normalized.initialEquity || initialEquity),
      _lastModified: Date.now(),
    };
    const stored = writeStoredDataset(stamped, initialEquity);
    dataRef.current = stored;
    setData(stored);
    if (sync) pushToCloud(stored).catch(() => {});
    return stored;
  }, [initialEquity]);

  // Current equity from trade log
  const currentEquity = useMemo(() => {
    if (data.trades.length === 0) return data.initialEquity || initialEquity;
    return data.trades[data.trades.length - 1].equityAfter;
  }, [data, initialEquity]);

  // Peak equity ever reached
  const peakEquity = useMemo(() => {
    let peak = data.initialEquity || initialEquity;
    for (const t of data.trades) {
      if (t.equityAfter > peak) peak = t.equityAfter;
    }
    return peak;
  }, [data, initialEquity]);

  // Add a new trade — accepts a tradeData object with at minimum { pnl }
  const addTrade = useCallback((tradeData) => {
    undoStackRef.current = []; setUndoStackLen(0);
    const currentData = dataRef.current;
    const eq = currentData.trades.length > 0
      ? currentData.trades[currentData.trades.length - 1].equityAfter
      : (currentData.initialEquity || initialEquity);

    const pnl = requireNonzeroPnl(tradeData.pnl);
    const equityAfter = Math.max(1, eq + pnl);
    const maxId = currentData.trades.length > 0
      ? Math.max(0, ...currentData.trades.map(t => Number.isFinite(Number(t.id)) ? Number(t.id) : 0))
      : 0;
    const now = Date.now();
    const risk = plannedRisk(eq);
    const trade = {
      ...freshTradeDefaults(now),
      ...tradeData,
      uid: tradeData.uid || createTradeUid(),
      id: maxId + 1,
      createdAt: tradeData.createdAt || now,
      updatedAt: tradeData.updatedAt || now,
      deletedAt: null,
      date: tradeData.date || todayLocalDate(),
      openDate: tradeData.openDate || null,
      pnl,
      direction: tradeData.direction || 'long',
      ticker: tradeData.ticker || '',
      equityBefore: eq,
      equityAfter,
      riskPct: risk.riskFraction,
      riskDol: risk.dollarRisk,
      modelId: risk.modelId,
      modelStatus: risk.status,
      revision: 1,
      phase: getPhase(eq),
      notes: tradeData.notes || '',
    };

    persist({ ...currentData, trades: [...currentData.trades, trade] });

    // Celebration: detect newly crossed milestones
    const newlyReached = MILES.filter(m => eq < m.v && equityAfter >= m.v);
    if (newlyReached.length > 0) {
      setCelebration(newlyReached[newlyReached.length - 1]);
    }

    return trade;
  }, [initialEquity, persist]);

  // Edit an existing trade — changes is an object of fields to update
  const editTrade = useCallback((id, changes) => {
    undoStackRef.current = []; setUndoStackLen(0);
    const currentData = dataRef.current;
    const idx = currentData.trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    const updated = [...currentData.trades];
    updated[idx] = { ...updated[idx] };
    if (changes.pnl !== undefined) changes = { ...changes, pnl: requireNonzeroPnl(changes.pnl) };
    // Apply all provided fields
    const editableFields = [
      'pnl', 'notes', 'date', 'openDate', 'direction', 'ticker',
      'strategy', 'contracts', 'entryPrice', 'exitPrice',
      'entryTime', 'exitTime',
      'setupTags', 'emotionTags', 'mistakes',
      'mae', 'mfe', 'images',
    ];
    for (const key of editableFields) {
      if (changes[key] !== undefined) updated[idx][key] = changes[key];
    }
    updated[idx].updatedAt = Date.now();
    updated[idx].revision = (updated[idx].revision || 0) + 1;
    const baseEq = currentData.initialEquity || initialEquity;
    const recalced = recalcTradeChain(updated, baseEq);
    persist({ ...currentData, trades: recalced });
  }, [initialEquity, persist]);

  // Delete a specific trade
  const deleteTrade = useCallback(async (id) => {
    undoStackRef.current = []; setUndoStackLen(0);
    const currentData = dataRef.current;
    const idx = currentData.trades.findIndex(t => t.id === id);
    if (idx === -1) return false;
    const trade = currentData.trades[idx];
    await Promise.allSettled((trade.images || []).map(key => deleteImage(key)));
    const remaining = currentData.trades.filter(t => t.id !== id);
    const baseEq = currentData.initialEquity || initialEquity;
    const recalced = remaining.length > 0 ? recalcTradeChain(remaining, baseEq) : [];
    const tombstone = {
      uid: trade.uid,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      serverRevision: trade.serverRevision || 0,
      serverUpdatedAt: trade.serverUpdatedAt || 0,
    };
    persist({
      ...currentData,
      trades: recalced,
      tombstones: upsertTombstone(currentData.tombstones, tombstone),
    });
    return true;
  }, [initialEquity, persist]);

  // Delete last trade (undo) — pushes removed trade onto redo stack
  // Uses functional setData to avoid stale closure issues with rapid clicks
  const undoLastTrade = useCallback(() => {
    setData(prev => {
      if (prev.trades.length === 0) return prev;
      const removed = prev.trades[prev.trades.length - 1];
      const deletedAt = Date.now();
      undoStackRef.current = [...undoStackRef.current, { trade: removed, deletedAt }];
      setUndoStackLen(undoStackRef.current.length);
      const next = {
        ...prev,
        trades: prev.trades.slice(0, -1),
        tombstones: upsertTombstone(prev.tombstones, {
          uid: removed.uid,
          deletedAt,
          updatedAt: deletedAt,
          serverRevision: removed.serverRevision || 0,
          serverUpdatedAt: removed.serverUpdatedAt || 0,
        }),
        _lastModified: deletedAt,
      };
      writeStoredDataset(next, initialEquity);
      dataRef.current = next;
      pushToCloud(next).catch(() => {});
      return next;
    });
  }, [initialEquity]);

  // Redo last undone trade — pops from redo stack
  // Uses functional setData to avoid stale closure issues with rapid clicks
  const redoLastTrade = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const { trade } = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setUndoStackLen(undoStackRef.current.length);
    setData(prev => {
      const updatedAt = Date.now();
      const revived = {
        ...trade,
        deletedAt: null,
        updatedAt,
        revision: (trade.revision || 0) + 1,
      };
      const next = {
        ...prev,
        trades: recalcTradeChain([...prev.trades, revived], prev.initialEquity || initialEquity),
        tombstones: (prev.tombstones || []).filter(item => item.uid !== revived.uid),
        _lastModified: updatedAt,
      };
      writeStoredDataset(next, initialEquity);
      dataRef.current = next;
      pushToCloud(next).catch(() => {});
      return next;
    });
  }, [initialEquity]);

  // Clear all trades
  const clearTrades = useCallback(async () => {
    undoStackRef.current = []; setUndoStackLen(0);
    const currentData = dataRef.current;
    await clearAllImages().catch(() => {});
    const deletedAt = Date.now();
    const tombstones = currentData.trades.reduce(
      (acc, trade) => upsertTombstone(acc, { uid: trade.uid, deletedAt, updatedAt: deletedAt }),
      currentData.tombstones || []
    );
    persist({ ...currentData, trades: [], tombstones });
  }, [persist]);

  // Update initial equity
  const setInitialEquity = useCallback(eq => {
    const currentData = dataRef.current;
    persist({ ...currentData, initialEquity: eq });
  }, [persist]);

  // Export as JSON string
  const exportJSON = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data, initialEquity]);

  // Import from JSON string
  const importJSON = useCallback(json => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && Array.isArray(parsed.trades)) {
        undoStackRef.current = []; setUndoStackLen(0);
        const currentData = dataRef.current;
        const imported = normalizeDataset(parsed, initialEquity);
        persist(mergeDatasets(currentData, imported, initialEquity));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [initialEquity, persist]);

  // Computed stats
  const stats = useMemo(() => {
    const trades = data.trades;
    if (trades.length === 0) {
      return {
        totalTrades: 0, wins: 0, losses: 0, winRate: 0,
        totalPnl: 0, avgWin: 0, avgLoss: 0, profitFactor: 0,
        maxDrawdown: 0, maxDrawdownPct: 0,
        currentStreak: 0, streakType: null,
        todayTrades: 0, todayPnl: 0,
        last30Trades: 0, last30Pnl: 0,
        expectancy: 0, avgR: 0, rMultiples: [],
        bestTrade: 0, worstTrade: 0,
        maxWinStreak: 0, maxLossStreak: 0,
      };
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const grossWins = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLosses = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

    // Max drawdown
    let peak = data.initialEquity || initialEquity;
    let maxDD = 0, maxDDPct = 0;
    for (const t of trades) {
      if (t.equityAfter > peak) peak = t.equityAfter;
      const dd = peak - t.equityAfter;
      const ddPct = peak > 0 ? dd / peak : 0;
      if (ddPct > maxDDPct) { maxDD = dd; maxDDPct = ddPct; }
    }

    // Current streak
    let streak = 0, streakType = null;
    for (let i = trades.length - 1; i >= 0; i--) {
      const isWin = trades[i].pnl > 0;
      if (streakType === null) streakType = isWin ? 'win' : 'loss';
      if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) streak++;
      else break;
    }

    // Today stats
    const today = todayLocalDate();
    const todayTrades = trades.filter(t => t.date === today);

    // Last 30 days stats
    const thirtyDaysAgo = localDateDaysAgo(30);
    const last30 = trades.filter(t => t.date >= thirtyDaysAgo);

    // R-multiples
    const rMultiples = trades.map(t => t.riskDol > 0 ? t.pnl / t.riskDol : 0);
    const avgR = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;

    // Expectancy (in dollars)
    const winR = wins.length / trades.length;
    const lossR = losses.length / trades.length;
    const aW = wins.length > 0 ? grossWins / wins.length : 0;
    const aL = losses.length > 0 ? grossLosses / losses.length : 0;
    const expectancy = winR * aW - lossR * aL;

    // Best/worst trade
    const bestTrade = Math.max(...trades.map(t => t.pnl));
    const worstTrade = Math.min(...trades.map(t => t.pnl));

    // Max consecutive streaks
    let maxWS = 0, maxLS = 0, curW = 0, curL = 0;
    for (const t of trades) {
      if (t.pnl > 0) { curW++; curL = 0; if (curW > maxWS) maxWS = curW; }
      else { curL++; curW = 0; if (curL > maxLS) maxLS = curL; }
    }

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl,
      avgWin: wins.length > 0 ? grossWins / wins.length : 0,
      avgLoss: losses.length > 0 ? grossLosses / losses.length : 0,
      profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
      maxDrawdown: maxDD,
      maxDrawdownPct: maxDDPct * 100,
      currentStreak: streak,
      streakType,
      todayTrades: todayTrades.length,
      todayPnl: todayTrades.reduce((s, t) => s + t.pnl, 0),
      last30Trades: last30.length,
      last30Pnl: last30.reduce((s, t) => s + t.pnl, 0),
      expectancy,
      avgR,
      rMultiples,
      bestTrade,
      worstTrade,
      maxWinStreak: maxWS,
      maxLossStreak: maxLS,
    };
  }, [data, initialEquity]);

  // Current drawdown from peak
  const currentDrawdownPct = useMemo(() => {
    if (peakEquity <= 0 || currentEquity >= peakEquity) return 0;
    return ((peakEquity - currentEquity) / peakEquity) * 100;
  }, [peakEquity, currentEquity]);

  // Next trade risk
  const nextRisk = useMemo(() => {
    const risk = plannedRisk(currentEquity);
    return {
      pct: risk.riskFraction,
      dol: risk.dollarRisk,
      phase: getPhase(currentEquity),
      status: risk.status,
      segment: risk.segment,
      modelId: risk.modelId,
    };
  }, [currentEquity]);

  // Milestone status
  const milestones = useMemo(() =>
    MILES.map(m => ({
      ...m,
      achieved: currentEquity >= m.v,
      progress: Math.min(100, (currentEquity / m.v) * 100),
    })),
  [currentEquity]);

  // Cloud sync: pull from cloud and merge
  const syncFromCloud = useCallback(async (preferences = null) => {
    const requestedData = dataRef.current;
    const cloud = await pullFromCloud({ ...requestedData, preferences });
    const currentData = dataRef.current;
    if (!cloud || !Array.isArray(cloud.trades)) {
      return { status: 'error' };
    }

    const result = status => ({
      status,
      preferences: cloud.preferences || null,
      initialEquity: cloud.initialEquity,
    });

    const localData = normalizeDataset(currentData, initialEquity);
    const remoteData = normalizeDataset({
      ...cloud,
      _lastModified: cloud.lastModified || cloud._lastModified || 0,
    }, initialEquity);
    const merged = mergeDatasets(localData, remoteData, initialEquity);

    const localSig = datasetSignature(localData);
    const remoteSig = datasetSignature(remoteData);
    const mergedSig = datasetSignature(merged);

    if (mergedSig !== localSig) {
      persist(merged, { sync: false });
      return result('merged');
    }

    if (mergedSig !== remoteSig) {
      const pushed = await pushToCloud(localData);
      return result(pushed ? 'pushed' : 'error');
    }

    return result('in_sync');
  }, [initialEquity, persist]);

  // Ref that always points to latest syncFromCloud (avoids stale closures in intervals)
  const syncRef = useRef(syncFromCloud);
  syncRef.current = syncFromCloud;

  return {
    syncDataset: data,
    trades: data.trades,
    currentEquity,
    peakEquity,
    currentDrawdownPct,
    initialEquity: data.initialEquity || initialEquity,
    stats,
    nextRisk,
    milestones,
    celebration,
    clearCelebration,
    addTrade,
    editTrade,
    deleteTrade,
    undoLastTrade,
    redoLastTrade,
    canRedo: undoStackLen > 0,
    clearTrades,
    setInitialEquity,
    exportJSON,
    importJSON,
    syncFromCloud,
    syncRef,
  };
};
