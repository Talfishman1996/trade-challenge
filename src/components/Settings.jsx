import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, RotateCcw, Info, FileSpreadsheet, Cloud, CloudOff, RefreshCw, Copy, Check } from 'lucide-react';
import { fmt } from '../math/format.js';
import { getPhaseName } from '../math/risk.js';
import { getSyncConfig, saveSyncConfig, clearSyncConfig, generateSyncCode } from '../sync.js';

export default function Settings({ settings, trades }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [eqInput, setEqInput] = useState(String(settings.initialEquity));
  const fileRef = useRef(null);
  const [syncConfig, setSyncConfig] = useState(() => getSyncConfig());
  const [showSyncSetup, setShowSyncSetup] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEqChange = e => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setEqInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 100 && num <= 10000000) {
      settings.setInitialEquity(num);
      trades.setInitialEquity(num);
    }
  };

  const handleExport = () => {
    const json = trades.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const ok = trades.importJSON(evt.target.result);
      if (!ok) alert('Invalid file format');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncEnable = () => {
    const url = syncUrl.trim().replace(/\/$/, '');
    if (!url.includes('firebaseio.com') && !url.includes('firebase')) {
      setSyncMsg('Enter a valid Firebase Realtime Database URL');
      return;
    }
    const code = syncCodeInput.trim() || generateSyncCode();
    const config = { dbUrl: url, syncCode: code, lastSync: null };
    saveSyncConfig(config);
    setSyncConfig(config);
    setShowSyncSetup(false);
    setSyncMsg('');
    // Push current data to cloud
    trades.syncFromCloud().then(r => setSyncMsg(r === 'pulled' ? 'Synced from cloud' : 'Data pushed to cloud')).catch(() => setSyncMsg('Sync failed'));
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await trades.syncFromCloud();
      setSyncMsg(result === 'pulled' ? 'Updated from cloud' : 'Cloud is up to date');
      setSyncConfig(getSyncConfig());
    } catch { setSyncMsg('Sync failed'); }
    setSyncing(false);
  };

  const handleSyncDisconnect = () => {
    clearSyncConfig();
    setSyncConfig(null);
    setShowSyncSetup(false);
    setSyncMsg('');
  };

  const handleCopyCode = () => {
    if (syncConfig?.syncCode) {
      navigator.clipboard.writeText(syncConfig.syncCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCSVExport = () => {
    const rows = [['Trade #', 'Date', 'P&L', 'Equity Before', 'Equity After', 'Risk %', 'Phase', 'Notes']];
    for (const t of trades.trades) {
      const esc = (s) => s && s.includes(',') ? `"${s.replace(/"/g, '""')}"` : (s || '');
      rows.push([
        t.id,
        new Date(t.date).toISOString().slice(0, 10),
        t.pnl,
        t.equityBefore,
        t.equityAfter,
        (t.riskPct * 100).toFixed(2) + '%',
        getPhaseName(t.phase),
        esc(t.notes),
      ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-2xl mx-auto space-y-5">
      <h2 className="text-lg font-bold text-white">Settings</h2>

      {/* Starting Equity */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="text-xs text-slate-500 font-medium">Starting Equity</div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-600">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={eqInput}
            onChange={handleEqChange}
            className="w-full bg-deep border border-line rounded-xl text-xl font-bold font-mono text-white py-3 pl-10 pr-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums"
          />
        </div>
        <p className="text-xs text-slate-600">Your challenge starting balance. Only affects new calculations if no trades logged.</p>
      </div>

      {/* Analysis Defaults */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div className="text-xs text-slate-500 font-medium">Analysis Defaults</div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Win Rate</label>
            <span className="text-sm text-emerald-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
              {settings.winRate}%
            </span>
          </div>
          <input
            type="range"
            min={40}
            max={75}
            step={1}
            value={settings.winRate}
            onChange={e => settings.setWinRate(+e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Risk:Reward</label>
            <span className="text-sm text-emerald-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
              {settings.rewardRatio.toFixed(1)}:1
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={40}
            step={1}
            value={settings.rewardRatio * 10}
            onChange={e => settings.setRewardRatio(+e.target.value / 10)}
            className="w-full"
          />
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncConfig ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-slate-600" />}
            <div className="text-xs text-slate-500 font-medium">Cloud Sync</div>
          </div>
          {syncConfig && (
            <span className="text-[10px] text-emerald-400/70 font-mono">Connected</span>
          )}
        </div>

        {syncConfig && !showSyncSetup ? (
          <>
            <div className="bg-deep rounded-xl p-3 border border-line/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">Sync Code</span>
                <button onClick={handleCopyCode} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-lg font-bold font-mono tracking-widest text-white">{syncConfig.syncCode}</div>
              <p className="text-[10px] text-slate-600">Enter this code on your other devices to sync.</p>
            </div>

            {syncConfig.lastSync && (
              <div className="text-[10px] text-slate-600">
                Last synced: {new Date(syncConfig.lastSync).toLocaleString()}
              </div>
            )}

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all disabled:opacity-50"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (syncing ? 'animate-spin' : '')} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {syncMsg && <div className="text-[10px] text-emerald-400/70 text-center">{syncMsg}</div>}

            <button
              onClick={handleSyncDisconnect}
              className="w-full text-[10px] text-slate-600 hover:text-red-400 transition-colors py-1"
            >
              Disconnect Cloud Sync
            </button>
          </>
        ) : !showSyncSetup ? (
          <>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sync your trades across devices. Requires a free Firebase Realtime Database.
            </p>
            <button
              onClick={() => setShowSyncSetup(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-deep text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
            >
              <Cloud className="w-4 h-4" /> Enable Cloud Sync
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-deep rounded-xl p-3 border border-line/50 space-y-2">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Quick Setup (2 min)</div>
              <ol className="text-[11px] text-slate-500 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Go to <span className="text-cyan-400">console.firebase.google.com</span></li>
                <li>Create a project (any name)</li>
                <li>Build {'>'} Realtime Database {'>'} Create Database</li>
                <li>Choose location, start in <span className="text-amber-400">test mode</span></li>
                <li>Copy the database URL (starts with https://)</li>
              </ol>
            </div>

            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Database URL</label>
              <input
                type="url"
                value={syncUrl}
                onChange={e => setSyncUrl(e.target.value)}
                placeholder="https://your-project-default-rtdb.firebaseio.com"
                className="w-full bg-deep border border-line rounded-xl text-xs font-mono text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">
                Sync Code <span className="text-slate-700">(leave blank to generate, or enter existing code to join)</span>
              </label>
              <input
                type="text"
                value={syncCodeInput}
                onChange={e => setSyncCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="auto-generated"
                className="w-full bg-deep border border-line rounded-xl text-xs font-mono text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
              />
            </div>

            {syncMsg && <div className="text-[10px] text-red-400 text-center">{syncMsg}</div>}

            <div className="flex gap-2">
              <button
                onClick={handleSyncEnable}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl active:scale-[0.98] hover:bg-emerald-500 transition-all"
              >
                Connect
              </button>
              <button
                onClick={() => { setShowSyncSetup(false); setSyncMsg(''); }}
                className="flex-1 py-2.5 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">Data Management</div>
          {trades.trades.length > 0 && (
            <span className="text-[10px] text-slate-600 font-mono tabular-nums">{trades.trades.length} trades</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExport}
            className="flex flex-col items-center gap-1.5 py-3 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={handleCSVExport}
            className="flex flex-col items-center gap-1.5 py-3 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1.5 py-3 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {trades.trades.length > 0 && (
          <>
            {showConfirm === 'clear' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { trades.clearTrades(); setShowConfirm(null); }}
                  className="flex-1 py-3 bg-rose-500/15 text-rose-400 text-sm font-semibold rounded-xl border border-rose-500/30 active:scale-[0.98] transition-all"
                >
                  Yes, Clear Everything
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 bg-deep text-slate-400 text-sm font-medium rounded-xl border border-line active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm('clear')}
                className="w-full flex items-center justify-center gap-2 py-3 text-rose-500/60 text-sm font-medium rounded-xl border border-rose-500/10 active:scale-[0.98] hover:bg-rose-500/5 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Clear All Data
              </button>
            )}
          </>
        )}
      </div>

      {/* About */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-2">
        <div className="text-xs text-slate-500 font-medium">About</div>
        <div className="text-sm text-slate-400">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white font-bold tracking-widest">TRADEVAULT</span> <span className="text-slate-600">v2.0</span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">$20K {'\u2192'} $10M</p>
        <p className="text-xs text-slate-600 leading-relaxed mt-1">
          {'\u2154'} Power Decay position sizing. Risk scales with equity to protect gains and maximize growth.
          All data stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
