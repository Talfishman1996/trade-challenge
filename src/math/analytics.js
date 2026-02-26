// Advanced trade analytics — pure functions operating on trades[] arrays

// Calculate advanced performance metrics
export function calcAdvancedMetrics(trades) {
  if (!trades || trades.length === 0) {
    return {
      avgWin: 0, avgLoss: 0, payoffRatio: 0,
      sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0,
      avgHoldDays: 0, longWinPct: 0, shortWinPct: 0,
      maxConsecWins: 0, maxConsecLosses: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0)) / losses.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  // Returns as fractions of equity for Sharpe/Sortino
  const returns = trades.map(t => t.equityBefore > 0 ? t.pnl / t.equityBefore : 0);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Sharpe: mean / stddev of all returns
  const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length;
  const stddev = Math.sqrt(variance);
  const sharpeRatio = stddev > 0 ? meanReturn / stddev : 0;

  // Sortino: mean / downside stddev (only negative returns)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((s, r) => s + r ** 2, 0) / downsideReturns.length
    : 0;
  const downsideStddev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStddev > 0 ? meanReturn / downsideStddev : 0;

  // Calmar: total return / max drawdown
  const initialEq = trades[0].equityBefore;
  const finalEq = trades[trades.length - 1].equityAfter;
  const totalReturnPct = initialEq > 0 ? (finalEq - initialEq) / initialEq : 0;
  let peak = initialEq, maxDD = 0;
  for (const t of trades) {
    if (t.equityAfter > peak) peak = t.equityAfter;
    const dd = peak > 0 ? (peak - t.equityAfter) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }
  const calmarRatio = maxDD > 0 ? totalReturnPct / maxDD : 0;

  // Average hold time in days
  const holdDays = trades
    .filter(t => t.openDate && t.date)
    .map(t => Math.max(0, (new Date(t.date) - new Date(t.openDate)) / 86400000));
  const avgHoldDays = holdDays.length > 0 ? holdDays.reduce((a, b) => a + b, 0) / holdDays.length : 0;

  // Win rate by direction
  const longs = trades.filter(t => t.direction === 'long');
  const shorts = trades.filter(t => t.direction === 'short');
  const longWinPct = longs.length > 0 ? (longs.filter(t => t.pnl > 0).length / longs.length) * 100 : 0;
  const shortWinPct = shorts.length > 0 ? (shorts.filter(t => t.pnl > 0).length / shorts.length) * 100 : 0;

  // Max consecutive streaks
  let maxCW = 0, maxCL = 0, cw = 0, cl = 0;
  for (const t of trades) {
    if (t.pnl > 0) { cw++; cl = 0; if (cw > maxCW) maxCW = cw; }
    else { cl++; cw = 0; if (cl > maxCL) maxCL = cl; }
  }

  return {
    avgWin, avgLoss, payoffRatio,
    sharpeRatio, sortinoRatio, calmarRatio,
    avgHoldDays, longWinPct, shortWinPct,
    maxConsecWins: maxCW, maxConsecLosses: maxCL,
  };
}

// P&L and win rate grouped by each tag type
export function calcTagAnalytics(trades) {
  const bySetup = {}, byEmotion = {}, byMistake = {};

  const accumulate = (map, tag, trade) => {
    if (!map[tag]) map[tag] = { pnl: 0, wins: 0, count: 0 };
    map[tag].pnl += trade.pnl;
    map[tag].count++;
    if (trade.pnl > 0) map[tag].wins++;
  };

  for (const t of trades) {
    if (t.setupTags) t.setupTags.forEach(tag => accumulate(bySetup, tag, t));
    if (t.emotionTags) t.emotionTags.forEach(tag => accumulate(byEmotion, tag, t));
    if (t.mistakes) t.mistakes.forEach(tag => accumulate(byMistake, tag, t));
  }

  const summarize = (map) =>
    Object.entries(map)
      .map(([tag, d]) => ({
        tag,
        pnl: d.pnl,
        count: d.count,
        winRate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

  return {
    setup: summarize(bySetup),
    emotion: summarize(byEmotion),
    mistakes: summarize(byMistake),
  };
}

// P&L by day-of-week (0=Sun..6=Sat) and hour-of-day
export function calcTimeAnalytics(trades) {
  const byDay = Array.from({ length: 7 }, () => ({ pnl: 0, count: 0, wins: 0 }));
  const byHour = Array.from({ length: 24 }, () => ({ pnl: 0, count: 0, wins: 0 }));

  for (const t of trades) {
    const d = new Date(t.date);
    const day = d.getDay();
    byDay[day].pnl += t.pnl;
    byDay[day].count++;
    if (t.pnl > 0) byDay[day].wins++;

    if (t.entryTime) {
      const hour = parseInt(t.entryTime.split(':')[0], 10);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        byHour[hour].pnl += t.pnl;
        byHour[hour].count++;
        if (t.pnl > 0) byHour[hour].wins++;
      }
    }
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    byDay: byDay.map((d, i) => ({ day: dayLabels[i], ...d, avgPnl: d.count > 0 ? d.pnl / d.count : 0 })),
    byHour: byHour
      .map((h, i) => ({ hour: i, ...h, avgPnl: h.count > 0 ? h.pnl / h.count : 0 }))
      .filter(h => h.count > 0),
  };
}

// MAE vs final P&L and MFE vs final P&L scatter data
export function calcMAEMFE(trades) {
  return trades
    .filter(t => t.mae != null || t.mfe != null)
    .map(t => ({
      ticker: t.ticker || '',
      pnl: t.pnl,
      mae: t.mae || 0,
      mfe: t.mfe || 0,
      rMult: t.riskDol > 0 ? t.pnl / t.riskDol : 0,
    }));
}

// Hold duration vs R-multiple correlation data
export function calcDurationCorrelation(trades) {
  return trades
    .filter(t => t.openDate && t.date && t.riskDol > 0)
    .map(t => {
      const holdDays = Math.max(0, (new Date(t.date) - new Date(t.openDate)) / 86400000);
      return {
        ticker: t.ticker || '',
        holdDays,
        rMult: t.pnl / t.riskDol,
        pnl: t.pnl,
      };
    });
}
