import React, { useState, useEffect, useRef, Component } from 'react';
import { Home as HomeIcon, List, BarChart3, Settings as SettingsIcon, AlertTriangle, Shield, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../store/settings.js';
import { useTrades } from '../store/trades.js';
import { createBlob, getSyncConfig, saveSyncConfig, clearSyncConfig } from '../sync.js';
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

  // Stable ref to latest syncFromCloud — survives across re-renders
  const syncRef = trades.syncRef;

  // Auto-sync: URL hash is the sync key, no manual setup needed
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
      } else if (!config) {
        // First visit: auto-create cloud backup
        const data = { version: 1, initialEquity: trades.initialEquity, trades: trades.trades, _lastModified: Date.now() };
        const blobId = await createBlob(data);
        if (blobId) {
          saveSyncConfig({ blobId, lastSync: Date.now() });
          window.location.hash = `sync=${blobId}`;
        }
        return; // just created — no need to pull
      } else {
        // Has config but URL missing hash — restore it
        window.location.hash = `sync=${config.blobId}`;
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
