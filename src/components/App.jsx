import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { Home as HomeIcon, List, BarChart3, Settings as SettingsIcon, AlertTriangle, Shield, Plus, Link2, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../store/settings.js';
import { useTrades } from '../store/trades.js';
import { createBlob, getSyncConfig, saveSyncConfig, clearSyncConfig, pullFromBlobId, extractBlobId } from '../sync.js';
import Home from './Home.jsx';
import Trades from './Trades.jsx';
import Analysis from './Analysis.jsx';
import Settings from './Settings.jsx';
import Celebration from './Celebration.jsx';
import TradeEntry from './TradeEntry.jsx';

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

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'trades', label: 'Trades', icon: List },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const settings = useSettings();
  const trades = useTrades(settings.initialEquity);
  const [showTradeEntry, setShowTradeEntry] = useState(false);
  const [editTradeData, setEditTradeData] = useState(null);
  const [syncGate, setSyncGate] = useState(null); // null = checking, 'ready' = proceed, 'setup' = show gate
  const [syncGateInput, setSyncGateInput] = useState('');
  const [syncGateStatus, setSyncGateStatus] = useState(''); // '', 'connecting', 'error', 'creating'
  const [riskGate, setRiskGate] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Stable ref to latest syncFromCloud — survives across re-renders
  const syncRef = trades.syncRef;

  // Connect to an existing sync (used by gate and settings)
  const connectToSync = async (input) => {
    const blobId = extractBlobId(input);
    if (!blobId) { setSyncGateStatus('error'); return 'invalid'; }
    setSyncGateStatus('connecting');
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
      const cloud = await Promise.race([pullFromBlobId(blobId), timeout]);
      if (!cloud || !Array.isArray(cloud.trades)) {
        setSyncGateStatus('error');
        return 'not_found';
      }
      saveSyncConfig({ blobId, lastSync: Date.now() });
      window.location.hash = `sync=${blobId}`;
      const { lastModified, ...rest } = cloud;
      const merged = { ...rest, _lastModified: lastModified || Date.now() };
      localStorage.setItem('risk-engine-data', JSON.stringify(merged));
      window.location.reload();
      return 'ok';
    } catch {
      setSyncGateStatus('error');
      return 'timeout';
    }
  };

  const startFresh = () => {
    // Dismiss gate IMMEDIATELY — never block the user
    setSyncGate('ready');
    // Create blob in the background — if it fails, next page load retries via initSync
    (async () => {
      try {
        const data = { version: 1, initialEquity: trades.initialEquity, trades: [], _lastModified: Date.now() };
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
        const blobId = await Promise.race([createBlob(data), timeout]);
        if (blobId) {
          saveSyncConfig({ blobId, lastSync: Date.now() });
          window.location.hash = `sync=${blobId}`;
        }
      } catch {}
    })();
  };

  // Auto-sync: URL hash is the sync key
  useEffect(() => {
    const initSync = async () => {
      const hash = window.location.hash;
      const match = hash.match(/sync=([a-zA-Z0-9-]+)/);
      let config = getSyncConfig();
      // Clean up stale config from previous sync versions (Firebase)
      if (config && !config.blobId) { clearSyncConfig(); config = null; }

      if (match) {
        // URL has sync ID — use it
        const blobId = match[1];
        if (!config || config.blobId !== blobId) {
          saveSyncConfig({ blobId, lastSync: null });
        }
        setSyncGate('ready');
      } else if (!config) {
        // No hash, no config — check if user has existing trades
        try {
          const raw = localStorage.getItem('risk-engine-data');
          const existing = raw ? JSON.parse(raw) : null;
          if (existing && existing.trades && existing.trades.length > 0) {
            // Has local trades — auto-create blob for them
            const data = { ...existing, _lastModified: Date.now() };
            try {
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
              const blobId = await Promise.race([createBlob(data), timeout]);
              if (blobId) {
                saveSyncConfig({ blobId, lastSync: Date.now() });
                window.location.hash = `sync=${blobId}`;
              }
            } catch {}
            setSyncGate('ready');
            return; // just created — no need to pull
          }
        } catch {}
        // Truly fresh device — show sync gate
        setSyncGate('setup');
        return;
      } else {
        // Has config but URL missing hash — restore it
        window.location.hash = `sync=${config.blobId}`;
        setSyncGate('ready');
      }

      // Use ref to get latest syncFromCloud (avoids stale closure)
      if (syncRef.current) syncRef.current().catch(() => {});
    };
    initSync();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic sync every 60 seconds — uses ref to avoid stale closures
  useEffect(() => {
    const id = setInterval(() => {
      if (getSyncConfig() && syncRef.current) {
        syncRef.current().catch(() => {});
      }
    }, 60000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openTradeEntry = (trade = null) => {
    if (!trade) {
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
    setShowTradeEntry(true);
  };
  const overrideRiskGate = () => {
    setRiskGate(null);
    setEditTradeData(null);
    setShowTradeEntry(true);
  };
  const closeTradeEntry = () => {
    setShowTradeEntry(false);
    setEditTradeData(null);
  };
  const handleTradeSave = (tradeData) => {
    trades.addTrade(tradeData);
    showToast('Trade logged');
  };
  const handleTradeEdit = (id, changes) => {
    trades.editTrade(id, changes);
    showToast('Trade updated');
  };

  return (
    <div className="min-h-screen bg-deep text-slate-200 flex flex-col md:flex-row">
      <style dangerouslySetInnerHTML={{ __html: [
        '.no-sb::-webkit-scrollbar{display:none}.no-sb{-ms-overflow-style:none;scrollbar-width:none}',
        '@keyframes gPulse{0%,100%{opacity:.3}50%{opacity:.65}}.gps-pulse{animation:gPulse 2.5s infinite}',
        '@keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 20px 4px rgba(16,185,129,.15)}}.card-breathe{animation:breathe 3s ease-in-out infinite}',
        '@keyframes riseFloat{0%{transform:translateY(0) scale(1);opacity:.6}100%{transform:translateY(-40px) scale(.3);opacity:0}}.particle{position:absolute;width:3px;height:3px;border-radius:50%;animation:riseFloat 3s ease-out infinite}',
        '@keyframes trailPulse{0%,100%{stroke-opacity:.4}50%{stroke-opacity:.8}}.trail-pulse{animation:trailPulse 2s ease-in-out infinite}',
        '@keyframes ringPulse{0%{r:14;opacity:.5}100%{r:28;opacity:0}}.ring-pulse{animation:ringPulse 2s ease-out infinite}',
        '@keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(720deg) scale(.5);opacity:0}}',
        'input[type="date"]::-webkit-calendar-picker-indicator{background:transparent;color:transparent;cursor:pointer;position:absolute;inset:0;width:auto;height:auto}',
      ].join('') }} />

      {/* Sync Gate — shown on fresh device with no data */}
      {syncGate === 'setup' && (
        <div className="fixed inset-0 z-[100] bg-deep flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {/* Branding */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white font-bold text-xl tracking-widest">TRADEVAULT</h1>
              <p className="text-sm text-slate-500">$20K → $10M Challenge</p>
            </div>

            {/* Primary: Get Started */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Your trades sync across devices automatically. No account needed.
              </p>
              <button
                onClick={startFresh}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white text-sm font-bold rounded-xl active:scale-[0.98] hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4" /> Get Started
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-xs text-slate-600 font-medium">or</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            {/* Secondary: Connect to existing */}
            <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-400">Already have a sync?</span>
              </div>
              <input
                type="text"
                value={syncGateInput}
                onChange={e => { setSyncGateInput(e.target.value); setSyncGateStatus(''); }}
                placeholder="Paste sync link from other device"
                className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
              />
              {syncGateStatus === 'error' && (
                <p className="text-xs text-red-400">Could not find that sync. Check the link and try again.</p>
              )}
              <button
                onClick={() => connectToSync(syncGateInput)}
                disabled={!syncGateInput.trim() || syncGateStatus === 'connecting'}
                className={'w-full py-2.5 rounded-xl font-semibold text-sm transition-all ' +
                  (syncGateInput.trim() && syncGateStatus !== 'connecting'
                    ? 'bg-elevated text-slate-300 border border-line active:scale-[0.98] hover:bg-line'
                    : 'bg-elevated text-slate-600 border border-line cursor-not-allowed')}
              >
                {syncGateStatus === 'connecting' ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</span>
                ) : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state while checking sync */}
      {syncGate === null && (
        <div className="fixed inset-0 z-[100] bg-deep flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}

      {/* Desktop Sidebar (md+) */}
      <aside className="hidden md:flex flex-col items-center fixed left-0 top-0 bottom-0 w-16 bg-surface border-r border-line z-50 py-5 gap-1">
        {/* Logo */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>

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
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-elevated')}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
              {active && (
                <motion.div
                  layoutId="sideTab"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
        <button
          onClick={() => openTradeEntry()}
          className="mt-auto flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/25"
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
              {tab === 'home' && <Home trades={trades} settings={settings} onOpenTradeEntry={openTradeEntry} />}
              {tab === 'trades' && <Trades trades={trades} settings={settings} onOpenTradeEntry={openTradeEntry} showToast={showToast} />}
              {tab === 'analysis' && <Analysis trades={trades} settings={settings} />}
              {tab === 'settings' && <Settings settings={settings} trades={trades} showToast={showToast} />}
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
                  <button onClick={() => openTradeEntry()} className="relative -mt-5">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform">
                      <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                  </button>
                )}
                <button
                  onClick={() => setTab(t.id)}
                  className={'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[48px] ' +
                    (active ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300')}
                >
                  <Icon className={'w-5 h-5 transition-transform ' + (active ? 'scale-110' : '')} strokeWidth={active ? 2.5 : 1.5} />
                  <span className={'text-xs font-medium ' + (active ? 'font-semibold' : '')}>{t.label}</span>
                  {active && (
                    <motion.div
                      layoutId="bottomTab"
                      className="absolute bottom-1 w-6 h-0.5 bg-emerald-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>

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
      <TradeEntry
        open={showTradeEntry}
        onClose={closeTradeEntry}
        onSave={handleTradeSave}
        onEdit={handleTradeEdit}
        editData={editTradeData}
        currentEquity={trades.currentEquity}
        nextRisk={trades.nextRisk}
      />

      {/* Milestone Celebration Overlay */}
      <AnimatePresence>
        {trades.celebration && (
          <Celebration milestone={trades.celebration} onDismiss={trades.clearCelebration} />
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
                : 'bg-emerald-500/90 text-white')}>
              {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
