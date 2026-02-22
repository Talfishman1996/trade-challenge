import React, { useState } from 'react';
import { Home as HomeIcon, List, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../store/settings.js';
import { useTrades } from '../store/trades.js';
import Home from './Home.jsx';
import Trades from './Trades.jsx';
import Analysis from './Analysis.jsx';
import Settings from './Settings.jsx';
import Celebration from './Celebration.jsx';

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: [
        '.no-sb::-webkit-scrollbar{display:none}.no-sb{-ms-overflow-style:none;scrollbar-width:none}',
        '@keyframes gPulse{0%,100%{opacity:.3}50%{opacity:.65}}.gps-pulse{animation:gPulse 2.5s infinite}',
        '@keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 20px 4px rgba(16,185,129,.15)}}.card-breathe{animation:breathe 3s ease-in-out infinite}',
        '@keyframes riseFloat{0%{transform:translateY(0) scale(1);opacity:.6}100%{transform:translateY(-40px) scale(.3);opacity:0}}.particle{position:absolute;width:3px;height:3px;border-radius:50%;animation:riseFloat 3s ease-out infinite}',
        '@keyframes trailPulse{0%,100%{stroke-opacity:.4}50%{stroke-opacity:.8}}.trail-pulse{animation:trailPulse 2s ease-in-out infinite}',
        '@keyframes ringPulse{0%{r:14;opacity:.5}100%{r:28;opacity:0}}.ring-pulse{animation:ringPulse 2s ease-out infinite}',
        '@keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(720deg) scale(.5);opacity:0}}',
      ].join('') }} />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-20 no-sb">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06 }}
          >
            {tab === 'home' && <Home trades={trades} settings={settings} />}
            {tab === 'trades' && <Trades trades={trades} settings={settings} />}
            {tab === 'analysis' && <Analysis trades={trades} settings={settings} />}
            {tab === 'settings' && <Settings settings={settings} trades={trades} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 z-50 safe-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[64px] ' +
                  (active ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300')}
              >
                <Icon className={'w-5 h-5 transition-transform ' + (active ? 'scale-110' : '')} strokeWidth={active ? 2.5 : 1.5} />
                <span className={'text-xs font-medium ' + (active ? 'font-semibold' : '')}>{t.label}</span>
                {active && (
                  <motion.div
                    layoutId="bottomTab"
                    className="absolute bottom-1 w-8 h-0.5 bg-emerald-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Milestone Celebration Overlay */}
      <AnimatePresence>
        {trades.celebration && (
          <Celebration milestone={trades.celebration} onDismiss={trades.clearCelebration} />
        )}
      </AnimatePresence>
    </div>
  );
}
