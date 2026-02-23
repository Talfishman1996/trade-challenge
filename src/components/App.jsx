import React, { useState, useEffect, useRef, Component } from 'react';
import { Home as HomeIcon, List, BarChart3, Settings as SettingsIcon, AlertTriangle, Shield, Plus, Link2, Zap, Loader2 } from 'lucide-react';
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
    setEditTradeData(trade);
    setShowTradeEntry(true);
  };
  const closeTradeEntry = () => {
    setShowTradeEntry(false);
    setEditTradeData(null);
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

            {/* Connect option */}
            <div className="bg-surface rounded-2xl p-5 border border-line space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Connect to Existing Sync</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Already using TradeVault on another device? Paste the sync link from Settings on that device.
              </p>
              <input
                type="text"
                value={syncGateInput}
                onChange={e => { setSyncGateInput(e.target.value); setSyncGateStatus(''); }}
                placeholder="Paste sync link or blob ID"
                className="w-full bg-deep border border-line rounded-xl text-sm text-white py-3 px-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
              />
              {syncGateStatus === 'error' && (
                <p className="text-xs text-red-400">Could not find that sync. Check the link and try again.</p>
              )}
              <button
                onClick={() => connectToSync(syncGateInput)}
                disabled={!syncGateInput.trim() || syncGateStatus === 'connecting'}
                className={'w-full py-3 rounded-xl font-bold text-sm transition-all ' +
                  (syncGateInput.trim() && syncGateStatus !== 'connecting'
                    ? 'bg-emerald-500 text-white active:scale-[0.98] hover:bg-emerald-400'
                    : 'bg-elevated text-slate-600 cursor-not-allowed')}
              >
                {syncGateStatus === 'connecting' ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</span>
                ) : 'Connect'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-xs text-slate-600 font-medium">or</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            {/* Start fresh option */}
            <button
              onClick={startFresh}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
            >
              <Zap className="w-4 h-4" /> Start Fresh
            </button>
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
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6 md:ml-16 no-sb">
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
              {tab === 'trades' && <Trades trades={trades} settings={settings} onOpenTradeEntry={openTradeEntry} />}
              {tab === 'analysis' && <Analysis trades={trades} settings={settings} />}
              {tab === 'settings' && <Settings settings={settings} trades={trades} />}
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
                  <span className={'text-[10px] font-medium ' + (active ? 'font-semibold' : '')}>{t.label}</span>
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

      {/* App-Level Trade Entry */}
      <TradeEntry
        open={showTradeEntry}
        onClose={closeTradeEntry}
        onSave={trades.addTrade}
        onEdit={trades.editTrade}
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
    </div>
  );
}
