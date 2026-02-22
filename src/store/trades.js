import { useState, useCallback, useMemo } from 'react';
import { rN, r$N, getPhase } from '../math/risk.js';
import { MILES } from '../math/constants.js';

const STORAGE_KEY = 'risk-engine-data';

const loadData = (initialEquity) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, trades: parsed.trades || [] };
    }
  } catch {}
  return { version: 1, initialEquity, trades: [] };
};

const saveData = data => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export const useTrades = (initialEquity = 20000) => {
  const [data, setData] = useState(() => loadData(initialEquity));
  const [celebration, setCelebration] = useState(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  const persist = useCallback(newData => {
    setData(newData);
    saveData(newData);
  }, []);

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

  // Recalculate equity chain from a given index forward
  const recalcChain = (trades, fromIdx, baseEquity) => {
    const result = [...trades];
    for (let i = fromIdx; i < result.length; i++) {
      const eqBefore = i > 0 ? result[i - 1].equityAfter : baseEquity;
      result[i] = {
        ...result[i],
        equityBefore: eqBefore,
        equityAfter: Math.max(1, eqBefore + result[i].pnl),
        riskPct: rN(eqBefore),
        riskDol: r$N(eqBefore),
        phase: getPhase(eqBefore),
      };
    }
    return result;
  };

  // Add a new trade
  const addTrade = useCallback((pnl, notes = '', date = null) => {
    const eq = data.trades.length > 0
      ? data.trades[data.trades.length - 1].equityAfter
      : (data.initialEquity || initialEquity);

    const equityAfter = Math.max(1, eq + pnl);
    const maxId = data.trades.length > 0 ? Math.max(...data.trades.map(t => t.id)) : 0;
    const trade = {
      id: maxId + 1,
      date: date || new Date().toISOString(),
      pnl,
      equityBefore: eq,
      equityAfter,
      riskPct: rN(eq),
      riskDol: r$N(eq),
      phase: getPhase(eq),
      notes,
    };

    persist({ ...data, trades: [...data.trades, trade] });

    // Celebration: detect newly crossed milestones
    const newlyReached = MILES.filter(m => eq < m.v && equityAfter >= m.v);
    if (newlyReached.length > 0) {
      setCelebration(newlyReached[newlyReached.length - 1]);
    }

    return trade;
  }, [data, initialEquity, persist]);

  // Edit an existing trade
  const editTrade = useCallback((id, { pnl, notes, date }) => {
    const idx = data.trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    const updated = [...data.trades];
    updated[idx] = { ...updated[idx] };
    if (pnl !== undefined) updated[idx].pnl = pnl;
    if (notes !== undefined) updated[idx].notes = notes;
    if (date !== undefined) updated[idx].date = date;
    const baseEq = data.initialEquity || initialEquity;
    const recalced = recalcChain(updated, idx, baseEq);
    persist({ ...data, trades: recalced });
  }, [data, initialEquity, persist]);

  // Delete a specific trade
  const deleteTrade = useCallback((id) => {
    const idx = data.trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    const remaining = data.trades.filter(t => t.id !== id);
    const baseEq = data.initialEquity || initialEquity;
    const recalced = remaining.length > 0 ? recalcChain(remaining, Math.max(0, idx), baseEq) : [];
    persist({ ...data, trades: recalced });
  }, [data, initialEquity, persist]);

  // Delete last trade (undo)
  const undoLastTrade = useCallback(() => {
    if (data.trades.length === 0) return;
    persist({ ...data, trades: data.trades.slice(0, -1) });
  }, [data, persist]);

  // Clear all trades
  const clearTrades = useCallback(() => {
    persist({ ...data, trades: [] });
  }, [data, persist]);

  // Update initial equity
  const setInitialEquity = useCallback(eq => {
    persist({ ...data, initialEquity: eq });
  }, [data, persist]);

  // Export as JSON string
  const exportJSON = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  // Import from JSON string
  const importJSON = useCallback(json => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && Array.isArray(parsed.trades)) {
        persist(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [persist]);

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
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(t => t.date.slice(0, 10) === today);

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
      expectancy,
      avgR,
      rMultiples,
      bestTrade,
      worstTrade,
      maxWinStreak: maxWS,
      maxLossStreak: maxLS,
    };
  }, [data, initialEquity]);

  // Next trade risk
  const nextRisk = useMemo(() => ({
    pct: rN(currentEquity),
    dol: r$N(currentEquity),
    phase: getPhase(currentEquity),
  }), [currentEquity]);

  // Milestone status
  const milestones = useMemo(() =>
    MILES.map(m => ({
      ...m,
      achieved: currentEquity >= m.v,
      progress: Math.min(100, (currentEquity / m.v) * 100),
    })),
  [currentEquity]);

  return {
    trades: data.trades,
    currentEquity,
    peakEquity,
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
    clearTrades,
    setInitialEquity,
    exportJSON,
    importJSON,
  };
};
