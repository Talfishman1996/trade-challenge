import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, FileSpreadsheet, Cloud, CloudOff, RefreshCw, Copy, Check, Link2, Loader2 } from 'lucide-react';
import { getSyncConfig, clearSyncConfig, saveSyncConfig, extractBlobId, pullFromBlobId, createBlob } from '../sync.js';
import { exportJSON, exportCSV, importJSON } from '../utils/dataIO.js';

export default function Settings({ settings, trades, showToast }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [eqInput, setEqInput] = useState(String(settings.initialEquity));
  const fileRef = useRef(null);
  const [syncConfig, setSyncConfig] = useState(() => getSyncConfig());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSwitchSync, setShowSwitchSync] = useState(false);
  const [switchInput, setSwitchInput] = useState('');
  const [switchStatus, setSwitchStatus] = useState(''); // '', 'connecting', 'error'
  const [showOfflineConnect, setShowOfflineConnect] = useState(false);
  const [offlineInput, setOfflineInput] = useState('');
  const [offlineStatus, setOfflineStatus] = useState(''); // '', 'creating', 'connecting', 'error'

  const handleEqChange = e => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setEqInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 100 && num <= 10000000) {
      settings.setInitialEquity(num);
      trades.setInitialEquity(num);
    }
  };

  const handleExport = () => exportJSON(trades);

  const handleImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    importJSON(file, trades, msg => showToast?.(msg, 'error'));
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

  const handleCreateSync = async () => {
    setOfflineStatus('creating');
    setSyncMsg('');
    try {
      const data = { version: 1, initialEquity: trades.initialEquity || 20000, trades: trades.trades, _lastModified: Date.now() };
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
      const blobId = await Promise.race([createBlob(data), timeout]);
      if (blobId) {
        saveSyncConfig({ blobId, lastSync: Date.now() });
        window.location.hash = `sync=${blobId}`;
        setSyncConfig({ blobId, lastSync: Date.now() });
        setOfflineStatus('');
        setSyncMsg('Sync created successfully');
      } else {
        setOfflineStatus('error');
        setSyncMsg('Could not reach sync server. Try again later.');
      }
    } catch {
      setOfflineStatus('error');
      setSyncMsg('Connection timed out. Check your internet and try again.');
    }
  };

  const handleOfflineConnect = async () => {
    const blobId = extractBlobId(offlineInput);
    if (!blobId) { setOfflineStatus('error'); setSyncMsg('Invalid sync link'); return; }
    setOfflineStatus('connecting');
    setSyncMsg('');
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
      const cloud = await Promise.race([pullFromBlobId(blobId), timeout]);
      if (!cloud || !Array.isArray(cloud.trades)) {
        setOfflineStatus('error');
        setSyncMsg('Sync not found. Check the link and try again.');
        return;
      }
      saveSyncConfig({ blobId, lastSync: Date.now() });
      window.location.hash = `sync=${blobId}`;
      const { lastModified, ...rest } = cloud;
      const merged = { ...rest, _lastModified: lastModified || Date.now() };
      localStorage.setItem('risk-engine-data', JSON.stringify(merged));
      window.location.reload();
    } catch {
      setOfflineStatus('error');
      setSyncMsg('Connection timed out. Check your internet and try again.');
    }
  };

  const [switchConfirm, setSwitchConfirm] = useState(false);

  const handleSwitchSync = async () => {
    if (!switchConfirm) {
      setSwitchConfirm(true);
      return;
    }
    const blobId = extractBlobId(switchInput);
    if (!blobId) { setSwitchStatus('error'); setSwitchConfirm(false); return; }
    setSwitchStatus('connecting');
    const cloud = await pullFromBlobId(blobId);
    if (!cloud || !Array.isArray(cloud.trades)) {
      setSwitchStatus('error');
      setSwitchConfirm(false);
      return;
    }
    saveSyncConfig({ blobId, lastSync: Date.now() });
    window.location.hash = `sync=${blobId}`;
    const { lastModified, ...rest } = cloud;
    const merged = { ...rest, _lastModified: lastModified || Date.now() };
    localStorage.setItem('risk-engine-data', JSON.stringify(merged));
    window.location.reload();
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

  const handleCSVExport = () => exportCSV(trades);

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
        <p className="text-xs text-slate-500">Your challenge starting balance. Only affects new calculations if no trades logged.</p>
      </div>

      {/* Risk Controls */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Risk Controls</div>
          <p className="text-xs text-slate-600 mt-1">Alerts and overrides for risk management.</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Drawdown Alert</label>
            <span className="text-sm text-amber-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
              {settings.drawdownAlertPct}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={settings.drawdownAlertPct}
            onChange={e => settings.setDrawdownAlertPct(+e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Max Risk Override</label>
            <span className={'text-sm font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums ' +
              (settings.maxRiskPct === 0 ? 'text-slate-500' : 'text-red-400')}>
              {settings.maxRiskPct === 0 ? 'Off' : settings.maxRiskPct + '%'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={settings.maxRiskPct}
            onChange={e => settings.setMaxRiskPct(+e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Off</span>
            <span>20%</span>
          </div>
        </div>
      </div>

      {/* Simulation Parameters */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Simulation Parameters</div>
          <p className="text-xs text-slate-600 mt-1">Defaults for Monte Carlo projections and scenarios.</p>
        </div>

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
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>40%</span>
            <span>75%</span>
          </div>
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
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>1.0:1</span>
            <span>4.0:1</span>
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncConfig ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-slate-600" />}
            <div className="text-xs text-slate-500 font-medium">Cloud Sync</div>
          </div>
          <span className={'text-xs font-mono ' + (syncConfig ? 'text-emerald-400/70' : 'text-slate-600')}>
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
              <div className="text-xs text-slate-500 text-center">
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

            {syncMsg && <div className="text-xs text-emerald-400/70 text-center">{syncMsg}</div>}

            {/* Switch to different sync */}
            {showSwitchSync ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={switchInput}
                  onChange={e => { setSwitchInput(e.target.value); setSwitchStatus(''); }}
                  placeholder="Paste sync link from other device"
                  className="w-full bg-deep border border-line rounded-xl text-xs text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
                />
                {switchStatus === 'error' && (
                  <p className="text-xs text-red-400">Invalid link or sync not found. Check and try again.</p>
                )}
                {switchConfirm && (
                  <p className="text-xs text-amber-400">This will replace all local data with the cloud data. Continue?</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSwitchSync}
                    disabled={!switchInput.trim() || switchStatus === 'connecting'}
                    className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all ' +
                      (switchInput.trim() && switchStatus !== 'connecting'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 active:scale-[0.98]'
                        : 'bg-elevated text-slate-600 border border-line cursor-not-allowed')}
                  >
                    {switchStatus === 'connecting' ? <><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</> : 'Connect'}
                  </button>
                  <button
                    onClick={() => { setShowSwitchSync(false); setSwitchInput(''); setSwitchStatus(''); setSwitchConfirm(false); }}
                    className="flex-1 py-2 text-xs font-medium text-slate-500 bg-deep rounded-xl border border-line active:scale-[0.98] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSwitchSync(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <Link2 className="w-3 h-3" /> Connect to Different Sync
              </button>
            )}

            <button
              onClick={handleSyncDisconnect}
              className="w-full text-xs text-slate-500 hover:text-red-400 transition-colors py-1"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            {syncMsg && <p className={'text-xs leading-relaxed ' + (offlineStatus === 'error' ? 'text-red-400' : 'text-emerald-400/70')}>{syncMsg}</p>}

            <button
              onClick={handleCreateSync}
              disabled={offlineStatus === 'creating'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/15 text-emerald-400 text-xs font-medium rounded-xl border border-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {offlineStatus === 'creating' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating sync...</>
              ) : (
                <><Cloud className="w-3.5 h-3.5" /> Create Cloud Sync</>
              )}
            </button>

            {showOfflineConnect ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={offlineInput}
                  onChange={e => { setOfflineInput(e.target.value); setOfflineStatus(''); setSyncMsg(''); }}
                  placeholder="Paste sync link from other device"
                  className="w-full bg-deep border border-line rounded-xl text-xs text-white py-2.5 px-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-700"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleOfflineConnect}
                    disabled={!offlineInput.trim() || offlineStatus === 'connecting'}
                    className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all ' +
                      (offlineInput.trim() && offlineStatus !== 'connecting'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 active:scale-[0.98]'
                        : 'bg-elevated text-slate-600 border border-line cursor-not-allowed')}
                  >
                    {offlineStatus === 'connecting' ? <><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</> : 'Connect'}
                  </button>
                  <button
                    onClick={() => { setShowOfflineConnect(false); setOfflineInput(''); setOfflineStatus(''); setSyncMsg(''); }}
                    className="flex-1 py-2 text-xs font-medium text-slate-500 bg-deep rounded-xl border border-line active:scale-[0.98] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowOfflineConnect(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <Link2 className="w-3 h-3" /> Connect to Existing Sync
              </button>
            )}
          </>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">Data Management</div>
          {trades.trades.length > 0 && (
            <span className="text-xs text-slate-500 font-mono tabular-nums">{trades.trades.length} trades</span>
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
          {syncConfig ? 'Data syncs to cloud and is stored locally.' : 'All data stored locally in your browser.'}
        </p>
      </div>
    </div>
  );
}
