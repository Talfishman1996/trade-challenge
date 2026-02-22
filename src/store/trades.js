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

  // Add a new trade
  const addTrade = useCallback((pnl, notes = '') => {
    const eq = data.trades.length > 0
      ? data.trades[data.trades.length - 1].equityAfter
      : (data.initialEquity || initialEquity);

    const equityAfter = Math.max(1, eq + pnl);
    const trade = {
      id: data.trades.length + 1,
      date: new Date().toISOString(),
      pnl,
      equityBefore: eq,
      equityAfter,
      riskPct: rN(eq),
      riskDol: r$N(eq),
      phase: getPhase(eq),
      notes,
    };

    persist({ ...data, trades: [...data.trades, trade] });
    return trade;
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
    addTrade,
    undoLastTrade,
    clearTrades,
    setInitialEquity,
    exportJSON,
    importJSON,
  };
};
