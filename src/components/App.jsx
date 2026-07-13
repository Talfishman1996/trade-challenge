import React, { useState, useEffect, useRef, useCallback, Component, Suspense } from 'react';
import { Home as HomeIcon, List, BarChart3, Settings as SettingsIcon, AlertTriangle, Shield, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../store/settings.js';
import { useTrades } from '../store/trades.js';
import { DEFAULT_SYNC_ID, ensurePrimarySyncConfig, getSyncConfig, pullFromBlobId, pushToBlobId, saveSyncConfig } from '../sync.js';
import { mergeDatasets, normalizeDataset, readStoredDataset, writeStoredDataset, todayLocalDate } from '../utils/tradeData.js';
import { recordSyncActivity, readSyncActivity } from '../utils/syncActivity.js';
import Home from './Home.jsx';
import SyncStatusPill from './SyncStatusPill.jsx';
import { describeSyncResult } from '../utils/syncStatus.js';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
          <p className="text-sm text-slate-400 mb-4">Something went wrong rendering this view.</p>
          <button onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-sm font-medium bg-elevated text-white rounded-lg hover:bg-line transition-colors">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Trades = React.lazy(() => import('./Trades.jsx'));
const Analysis = React.lazy(() => import('./Analysis.jsx'));
const Settings = React.lazy(() => import('./Settings.jsx'));
const Celebration = React.lazy(() => import('./Celebration.jsx'));
const TradeEntry = React.lazy(() => import('./TradeEntry.jsx'));

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'trades', label: 'Trades', icon: List },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const buildRapidEntrySeed = (trade) => {
  if (!trade) return null;
  return {
    direction: trade.direction || 'long',
    isWin: trade.pnl >= 0,
    ticker: trade.ticker || '',
    strategy: trade.strategy || '',
    contracts: trade.contracts ? String(trade.contracts) : '',
    setupTags: trade.setupTags || [],
    emotionTags: [],
    mistakes: [],
    tradeDate: todayLocalDate(),
    openDate: '',
    entryTime: '',
    exitTime: '',
    amount: '',
    entryPrice: '',
    exitPrice: '',
    imageKeys: [],
    mae: '',
    mfe: '',
    notes: '',
  };
};

const ViewLoader = ({ compact = false }) => (
  <div className={'flex items-center justify-center ' + (compact ? 'py-8' : 'min-h-[40vh]')}>
    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
  </div>
);

export default function App() {
  const [tab, setTab] = useState('home');
  const settings = useSettings();
  const trades = useTrades(settings.initialEquity);
  const [showTradeEntry, setShowTradeEntry] = useState(false);
  const [editTradeData, setEditTradeData] = useState(null);
  const [tradeEntrySeed, setTradeEntrySeed] = useState(null);
  const [riskGate, setRiskGate] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);
  const [syncInfo, setSyncInfo] = useState(() => ensurePrimarySyncConfig());
  const [syncPillStatus, setSyncPillStatus] = useState(() => (navigator.onLine ? 'ready' : 'offline'));
  const [syncActivity, setSyncActivity] = useState(() => readSyncActivity());
  const [isForeground, setIsForeground] = useState(() => document.visibilityState === 'visible' && document.hasFocus());
  const toastTimer = useRef(null);
  const syncNoticeTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  const refreshSyncInfo = useCallback(() => {
    const next = ensurePrimarySyncConfig();
    setSyncInfo(next);
    return next;
  }, []);
  const showSyncNotice = useCallback((message) => {
    if (syncNoticeTimer.current) clearTimeout(syncNoticeTimer.current);
    setSyncNotice(message);
    syncNoticeTimer.current = setTimeout(() => setSyncNotice(null), 2600);
  }, []);
  const pushSyncActivity = useCallback((status, source, message) => {
    setSyncActivity(recordSyncActivity({ status, source, message }));
  }, []);

  // Stable ref to latest syncFromCloud — survives across re-renders
  const syncRef = trades.syncRef;

  const runSync = useCallback(async ({ silent = false, reason = 'manual' } = {}) => {
    refreshSyncInfo();
    if (!navigator.onLine) {
      setSyncPillStatus('offline');
      if (!silent) {
        pushSyncActivity('offline', reason, 'Device is offline');
        showToast('You are offline', 'error');
      }
      return 'offline';
    }
    setSyncPillStatus('syncing');
    if (!silent && reason === 'manual') {
      pushSyncActivity('syncing', reason, 'Manual sync started');
    }
    try {
      const result = await syncRef.current?.();
      refreshSyncInfo();
      const summary = describeSyncResult(result || 'in_sync');
      if (result === 'merged') {
        setSyncPillStatus('merged');
        pushSyncActivity('merged', reason, summary);
        if (!silent) showToast('Device changes merged');
        if (silent) showSyncNotice('Device changes merged');
      } else if (result === 'pushed' || result === 'in_sync') {
        setSyncPillStatus('ready');
        if (!silent || result === 'pushed') pushSyncActivity(result === 'pushed' ? 'ready' : 'ready', reason, summary);
        if (!silent && reason === 'manual') {
          showToast(result === 'pushed' ? 'Sync complete' : 'Already up to date');
        }
        if (silent && result === 'pushed') showSyncNotice('Saved across devices');
      } else {
        setSyncPillStatus('ready');
      }
      return result || 'in_sync';
    } catch {
      setSyncPillStatus('error');
      pushSyncActivity('error', reason, 'Sync failed');
      if (!silent) showToast('Sync failed', 'error');
      return 'error';
    }
  }, [pushSyncActivity, refreshSyncInfo, showSyncNotice, showToast, syncRef]);

  // Auto-sync: always use one shared internal sync space and silently migrate legacy per-link syncs
  useEffect(() => {
    const initSync = async () => {
      const hash = window.location.hash;
      const match = hash.match(/sync=([a-zA-Z0-9-]+)/);
      const config = getSyncConfig();
      const legacyBlobId = match?.[1] && match[1] !== DEFAULT_SYNC_ID
        ? match[1]
        : (config?.blobId && config.blobId !== DEFAULT_SYNC_ID ? config.blobId : null);

      ensurePrimarySyncConfig();
      refreshSyncInfo();

      if (window.location.hash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }

      if (legacyBlobId) {
        try {
          const legacyCloud = await pullFromBlobId(legacyBlobId);
          if (legacyCloud && Array.isArray(legacyCloud.trades)) {
            const { lastModified, ...rest } = legacyCloud;
            const localData = readStoredDataset(trades.initialEquity);
            const merged = mergeDatasets(
              localData,
              normalizeDataset({ ...rest, _lastModified: lastModified || Date.now() }, trades.initialEquity),
              trades.initialEquity
            );
            writeStoredDataset({ ...merged, _lastModified: Date.now() }, trades.initialEquity);
            await pushToBlobId(DEFAULT_SYNC_ID, merged);
            saveSyncConfig({ blobId: DEFAULT_SYNC_ID, lastSync: Date.now() });
            refreshSyncInfo();
            pushSyncActivity('merged', 'boot', 'Migrated legacy sync into the always-on vault');
          }
        } catch {}
      }

      runSync({ silent: true, reason: 'boot' }).catch(() => {});
    };
    initSync();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncIntervalMs = showTradeEntry ? 15000 : 30000;

  // Adaptive periodic sync — fast while actively entering trades, slower while browsing, off in background
  useEffect(() => {
    if (!isForeground || !navigator.onLine) return undefined;
    const id = setInterval(() => {
      runSync({ silent: true, reason: 'interval' }).catch(() => {});
    }, syncIntervalMs);
    return () => clearInterval(id);
  }, [isForeground, runSync, syncIntervalMs]);

  useEffect(() => {
    const handleForegroundState = () => {
      const visible = document.visibilityState === 'visible';
      const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      const nextForeground = visible && focused;
      setIsForeground(nextForeground);
      if (nextForeground) {
        runSync({ silent: true, reason: 'focus' }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleForegroundState);
    window.addEventListener('focus', handleForegroundState);
    window.addEventListener('blur', handleForegroundState);
    return () => {
      document.removeEventListener('visibilitychange', handleForegroundState);
      window.removeEventListener('focus', handleForegroundState);
      window.removeEventListener('blur', handleForegroundState);
    };
  }, [runSync]);

  useEffect(() => {
    const handleConnectivity = () => {
      if (!navigator.onLine) {
        setSyncPillStatus('offline');
        pushSyncActivity('offline', 'connectivity', 'Device went offline');
        return;
      }
      refreshSyncInfo();
      setSyncPillStatus('ready');
      pushSyncActivity('ready', 'connectivity', 'Device is back online');
    };
    window.addEventListener('online', handleConnectivity);
    window.addEventListener('offline', handleConnectivity);
    return () => {
      window.removeEventListener('online', handleConnectivity);
      window.removeEventListener('offline', handleConnectivity);
    };
  }, [pushSyncActivity, refreshSyncInfo]);

  const openTradeEntry = (trade = null, options = {}) => {
    const seededEntry = !!options.entrySeed;
    if (!trade && !seededEntry) {
      if (settings.tiltLockEnabled &&
          trades.stats.streakType === 'loss' &&
          trades.stats.currentStreak >= settings.tiltLockThreshold) {
        setRiskGate('tilt');
        return;
      }
      if (settings.dailyLossLimit > 0 &&
          trades.stats.todayPnl <= -settings.dailyLossLimit) {
        setRiskGate('daily');
        return;
      }
    }
    setEditTradeData(trade);
    setTradeEntrySeed(options.entrySeed || null);
    setShowTradeEntry(true);
  };
  const openRapidEntryFromTrade = (trade) => {
    const entrySeed = buildRapidEntrySeed(trade);
    if (!entrySeed) return;
    openTradeEntry(null, { entrySeed });
    showToast('Last trade template loaded');
  };
  const overrideRiskGate = () => {
    setRiskGate(null);
    setEditTradeData(null);
    setTradeEntrySeed(null);
    setShowTradeEntry(true);
  };
  const closeTradeEntry = () => {
    setShowTradeEntry(false);
    setEditTradeData(null);
    setTradeEntrySeed(null);
  };
  const syncMutationFeedback = useCallback(async (successMsg, fallbackMsg) => {
    const result = await runSync({ silent: true, reason: 'save' });
    if (result === 'offline' || result === 'error') {
      showToast(fallbackMsg);
      return result;
    }
    showToast(successMsg);
    return result;
  }, [runSync, showToast]);
  const handleTradeSave = async (tradeData) => {
    trades.addTrade(tradeData);
    await syncMutationFeedback('Trade saved & synced', 'Trade saved locally');
  };
  const handleTradeEdit = async (id, changes, options = {}) => {
    trades.editTrade(id, changes);
    if (options.silent) {
      await runSync({ silent: true, reason: 'autosave' });
      return;
    }
    await syncMutationFeedback('Trade updated & synced', 'Trade updated locally');
  };
  const handleTradeDelete = async (id) => {
    const deleted = await trades.deleteTrade(id);
    if (deleted) {
      closeTradeEntry();
      await syncMutationFeedback('Trade deleted & synced', 'Trade deleted locally');
    } else {
      showToast('Could not delete trade', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-deep text-slate-200 flex flex-col md:flex-row">
      <style dangerouslySetInnerHTML={{ __html: [
        '.no-sb::-webkit-scrollbar{display:none}.no-sb{-ms-overflow-style:none;scrollbar-width:none}',
        '@keyframes gPulse{0%,100%{opacity:.3}50%{opacity:.65}}.gps-pulse{animation:gPulse 2.5s infinite}',
        '@keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}50%{box-shadow:0 0 20px 4px rgba(59,130,246,.15)}}.card-breathe{animation:breathe 3s ease-in-out infinite}',
        '@keyframes riseFloat{0%{transform:translateY(0) scale(1);opacity:.6}100%{transform:translateY(-40px) scale(.3);opacity:0}}.particle{position:absolute;width:3px;height:3px;border-radius:50%;animation:riseFloat 3s ease-out infinite}',
        '@keyframes trailPulse{0%,100%{stroke-opacity:.4}50%{stroke-opacity:.8}}.trail-pulse{animation:trailPulse 2s ease-in-out infinite}',
        '@keyframes ringPulse{0%{r:14;opacity:.5}100%{r:28;opacity:0}}.ring-pulse{animation:ringPulse 2s ease-out infinite}',
        '@keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(720deg) scale(.5);opacity:0}}',
        'input[type="date"]::-webkit-calendar-picker-indicator{background:transparent;color:transparent;cursor:pointer;position:absolute;inset:0;width:auto;height:auto}',
      ].join('') }} />

      {/* Sync Gate — shown on fresh device with no data */}
      {/* Desktop Sidebar (md+) */}
      <aside className="hidden md:flex flex-col items-center fixed left-0 top-0 bottom-0 w-16 bg-surface border-r border-line z-50 py-5 gap-1">
        {/* Logo */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-2">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <SyncStatusPill
          compact
          status={syncPillStatus}
          lastSync={syncInfo?.lastSync}
          onClick={() => runSync({ silent: false, reason: 'manual' })}
          disabled={syncPillStatus === 'syncing'}
          className="mb-5"
        />

        {/* Nav items */}
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              className={'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ' +
                (active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-elevated')}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
              {active && (
                <motion.div
                  layoutId="sideTab"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
        <button
          onClick={() => openTradeEntry()}
          className="mt-auto flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white hover:bg-blue-400 transition-all active:scale-95 shadow-lg shadow-blue-500/25"
          title="Log Trade"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6 md:ml-16 no-sb">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06 }}
          >
            <ErrorBoundary key={tab}>
              <Suspense fallback={<ViewLoader />}>
                {tab === 'home' && <Home trades={trades} settings={settings} onOpenTradeEntry={openTradeEntry} />}
                {tab === 'trades' && <Trades trades={trades} settings={settings} onOpenTradeEntry={openTradeEntry} onDuplicateLastTrade={() => openRapidEntryFromTrade(trades.trades[trades.trades.length - 1])} showToast={showToast} />}
                {tab === 'analysis' && <Analysis trades={trades} settings={settings} />}
                {tab === 'settings' && <Settings settings={settings} trades={trades} showToast={showToast} syncInfo={syncInfo} syncStatus={syncPillStatus} syncActivity={syncActivity} onRunSync={() => runSync({ silent: false, reason: 'settings' })} />}
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom tab bar with center FAB (hidden on md+) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-deep/95 backdrop-blur-lg border-t border-line z-50 safe-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <React.Fragment key={t.id}>
                {i === 2 && (
                  <button onClick={() => openTradeEntry()} className="relative -mt-5" aria-label="Log Trade">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 active:scale-95 transition-transform">
                      <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                  </button>
                )}
                <div className="relative flex h-16 min-w-[54px] items-center justify-center">
                  <button
                    onClick={() => setTab(t.id)}
                    className={'relative flex min-w-[48px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ' +
                      (active ? 'text-blue-400' : 'text-slate-500 active:text-slate-300')}
                  >
                    <Icon className={'w-5 h-5 transition-transform ' + (active ? 'scale-110' : '')} strokeWidth={active ? 2.5 : 1.5} />
                    <span className={'text-xs font-medium ' + (active ? 'font-semibold' : '')}>{t.label}</span>
                    {active && (
                      <motion.div
                        layoutId="bottomTab"
                        className="absolute bottom-1 w-6 h-0.5 bg-blue-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {syncNotice && !showTradeEntry && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            onClick={() => { setSyncNotice(null); setTab('settings'); }}
            className="fixed right-3 z-50 flex min-h-11 items-center gap-2 rounded-full border border-blue-400/25 bg-deep/95 px-3.5 text-xs font-semibold text-blue-300 shadow-xl backdrop-blur-lg md:hidden"
            style={{ top: 'max(12px, env(safe-area-inset-top))' }}
            aria-label={`${syncNotice}. Open sync settings.`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {syncNotice}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Risk Gate Overlay (Tilt Lock / Daily Limit) */}
      <AnimatePresence>
        {riskGate && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-deep/95 backdrop-blur-sm" onClick={() => setRiskGate(null)} />
            <motion.div
              className="relative w-full max-w-sm bg-surface rounded-2xl border border-line p-6 space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={'w-14 h-14 rounded-2xl flex items-center justify-center ' +
                  (riskGate === 'tilt' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20')}>
                  <AlertTriangle className={'w-7 h-7 ' + (riskGate === 'tilt' ? 'text-amber-400' : 'text-red-400')} />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {riskGate === 'tilt' ? 'Losing Streak Warning' : 'Daily Limit Reached'}
                </h3>
                {riskGate === 'tilt' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">
                      You're on a <span className="text-red-400 font-bold font-mono">{trades.stats.currentStreak}-loss</span> streak.
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Consider stepping away for {settings.tiltCooldownMinutes} minutes.
                      Emotional trading after losses often makes things worse.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-4 text-sm font-mono tabular-nums">
                      <span className="text-red-400 font-bold">{'\u2212'}${fmt(Math.abs(trades.stats.todayPnl))}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400">${fmt(settings.dailyLossLimit)} limit</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You've exceeded your daily loss limit. Continuing to trade
                      may compound losses. Consider stopping for the day.
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setRiskGate(null)}
                className={'w-full py-3 font-bold text-sm rounded-xl active:scale-[0.98] transition-all ' +
                  (riskGate === 'tilt'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30')}
              >
                Take a Break
              </button>
              <button
                onClick={overrideRiskGate}
                className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Override & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App-Level Trade Entry */}
      <Suspense fallback={<ViewLoader compact />}>
        <TradeEntry
          open={showTradeEntry}
          onClose={closeTradeEntry}
          onSave={handleTradeSave}
          onEdit={handleTradeEdit}
          onDelete={handleTradeDelete}
          editData={editTradeData}
          entrySeed={tradeEntrySeed}
          recentTrades={trades.trades}
          currentEquity={trades.currentEquity}
          nextRisk={trades.nextRisk}
        />
      </Suspense>

      {/* Milestone Celebration Overlay */}
      <AnimatePresence>
        {trades.celebration && (
          <Suspense fallback={<ViewLoader compact />}>
            <Celebration milestone={trades.celebration} onDismiss={trades.clearCelebration} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[70]"
          >
            <div className={'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl backdrop-blur-sm ' +
              (toast.type === 'error'
                ? 'bg-red-500/90 text-white'
                : 'bg-blue-500/90 text-white')}>
              {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
