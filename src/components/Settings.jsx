import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, FileSpreadsheet, Cloud, CloudOff, RefreshCw, Copy, Check } from 'lucide-react';
import { getPhaseName } from '../math/risk.js';
import { getSyncConfig, clearSyncConfig } from '../sync.js';

export default function Settings({ settings, trades }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [eqInput, setEqInput] = useState(String(settings.initialEquity));
  const fileRef = useRef(null);
  const [syncConfig, setSyncConfig] = useState(() => getSyncConfig());
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
    window.location.hash = '';
    setSyncMsg('Sync disconnected. Reload to create a new sync.');
  };

  const handleCopyLink = () => {
    if (syncConfig?.blobId) {
      const link = `${window.location.origin}${window.location.pathname}#sync=${syncConfig.blobId}`;
      navigator.clipboard.writeText(link).catch(() => {});
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
          <span className={'text-[10px] font-mono ' + (syncConfig ? 'text-emerald-400/70' : 'text-slate-600')}>
            {syncConfig ? 'Auto-synced' : 'Offline'}
          </span>
        </div>

        {syncConfig ? (
          <>
            <p className="text-xs text-slate-600 leading-relaxed">
              Syncs automatically every 60s and on each trade. Open this link on another device to sync there too.
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied!' : 'Copy Sync Link'}
            </button>

            {syncConfig.lastSync && (
              <div className="text-[10px] text-slate-600 text-center">
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
              Disconnect
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-600 leading-relaxed">
              {syncMsg || 'Sync is offline. Reload the page to auto-connect.'}
            </p>
          </>
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
