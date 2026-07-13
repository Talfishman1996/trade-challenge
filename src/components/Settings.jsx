import React, { useEffect, useState, useRef } from 'react';
import { Archive, Check, Cloud, Copy, Download, FileSpreadsheet, RefreshCw, RotateCcw, Share2, Trash2, Upload } from 'lucide-react';
import {
  buildSyncUrl,
  createVaultBackup,
  downloadVaultBackup,
  ensurePrimarySyncConfig,
  listVaultBackups,
  restoreVaultBackup,
} from '../sync.js';
import { downloadJSONValue, exportJSON, exportCSV, importJSON } from '../utils/dataIO.js';
import { todayLocalDate } from '../utils/tradeData.js';
import SyncStatusPill from './SyncStatusPill.jsx';
import { describeSyncResult } from '../utils/syncStatus.js';

function ControlModeBadge({ mode }) {
  const soft = mode === 'Soft';
  return (
    <span className={'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ' +
      (soft
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
      {mode}
    </span>
  );
}

export default function Settings({ settings, trades, showToast, syncInfo, syncStatus = 'offline', syncActivity = [], onRunSync }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [eqInput, setEqInput] = useState(String(settings.initialEquity));
  const [dailyLimitInput, setDailyLimitInput] = useState(String(settings.dailyLossLimit || 0));
  const fileRef = useRef(null);
  const [syncConfig, setSyncConfig] = useState(() => ensurePrimarySyncConfig());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupBusy, setBackupBusy] = useState('');
  const [backupError, setBackupError] = useState('');

  const refreshBackups = async () => {
    try {
      setBackups(await listVaultBackups());
      setBackupError('');
    } catch (error) {
      setBackupError(error.message || 'Backup status unavailable');
    }
  };

  useEffect(() => {
    refreshBackups();
  }, []);

  const handleEqChange = e => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setEqInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1000 && num <= 10000000) {
      settings.setInitialEquity(num);
      trades.setInitialEquity(num);
    }
  };

  const handleDailyLimitChange = e => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setDailyLimitInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) settings.setDailyLossLimit(num);
    else if (val === '') settings.setDailyLossLimit(0);
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
      const result = onRunSync ? await onRunSync() : await trades.syncFromCloud();
      setSyncMsg(describeSyncResult(typeof result === 'string' ? result : result?.status));
      setSyncConfig(ensurePrimarySyncConfig());
    } catch { setSyncMsg('Sync failed'); }
    setSyncing(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildSyncUrl()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    const link = buildSyncUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TradeVault',
          text: 'Open TradeVault on your other device. It syncs automatically in the background.',
          url: link,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {}
    }
    handleCopyLink();
  };

  const handleCSVExport = () => exportCSV(trades);

  const handleCreateBackup = async () => {
    setBackupBusy('create');
    setBackupError('');
    try {
      if (onRunSync) await onRunSync();
      await createVaultBackup();
      await refreshBackups();
      showToast?.('Cloud restore point created');
    } catch (error) {
      setBackupError(error.message || 'Backup failed');
      showToast?.('Backup failed', 'error');
    } finally {
      setBackupBusy('');
    }
  };

  const handleDownloadBackup = async backupId => {
    setBackupBusy(`download:${backupId}`);
    setBackupError('');
    try {
      const backup = await downloadVaultBackup(backupId);
      downloadJSONValue(backup, `tradevault-cloud-backup-${todayLocalDate()}.json`);
      showToast?.('Cloud backup downloaded');
    } catch (error) {
      setBackupError(error.message || 'Backup download failed');
    } finally {
      setBackupBusy('');
    }
  };

  const handleRestoreBackup = async backupId => {
    setBackupBusy(`restore:${backupId}`);
    setBackupError('');
    try {
      await restoreVaultBackup(backupId);
      const result = onRunSync ? await onRunSync() : await trades.syncFromCloud();
      if ((typeof result === 'string' ? result : result?.status) === 'error') {
        throw new Error('Backup restored in the vault, but this device has not refreshed yet');
      }
      setShowConfirm(null);
      await refreshBackups();
      showToast?.('Backup restored and synced');
    } catch (error) {
      setBackupError(error.message || 'Restore failed');
      showToast?.('Restore failed', 'error');
    } finally {
      setBackupBusy('');
    }
  };

  const handleClearAll = async () => {
    await trades.clearTrades();
    setShowConfirm(null);
    const response = onRunSync ? await onRunSync() : await trades.syncFromCloud();
    const result = typeof response === 'string' ? response : response?.status;
    if (result === 'error' || result === 'offline') {
      showToast?.('Data cleared locally; cloud sync is pending', 'error');
      return;
    }
    showToast?.('All trade data cleared and synced');
  };

  return (
    <div className="px-4 pt-4 md:pt-6 pb-6 max-w-lg md:max-w-2xl mx-auto space-y-5">
      <h2 className="text-lg font-bold text-white">Settings</h2>

      {/* Risk Controls */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Risk Controls</div>
          <p className="text-xs text-slate-500 mt-1">Soft controls warn and add friction. They do not hard-lock you out.</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Drawdown Alert</label>
              <ControlModeBadge mode="Soft" />
            </div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Max Risk Warning</label>
              <ControlModeBadge mode="Soft" />
            </div>
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
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">Cosmetic warning threshold only. It never modifies the canonical sizing curve.</p>
        </div>

        {/* Tilt Lock */}
        <div className="border-t border-line/50 pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">Tilt Lock</label>
                <ControlModeBadge mode="Soft" />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Warns before trading during a losing streak and adds override friction</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Tilt Lock"
              aria-checked={settings.tiltLockEnabled}
              onClick={() => settings.setTiltLockEnabled(!settings.tiltLockEnabled)}
              className="relative h-11 w-12 shrink-0"
            >
              <span className={'absolute inset-x-0 top-2 h-7 rounded-full transition-colors duration-200 ' +
                (settings.tiltLockEnabled ? 'bg-blue-500' : 'bg-elevated border border-line')} />
              <span className="absolute top-3 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: settings.tiltLockEnabled ? 26 : 4 }} />
            </button>
          </div>

          {settings.tiltLockEnabled && (
            <div className="space-y-3 mt-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-slate-500">Streak Threshold</label>
                  <span className="text-sm text-amber-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
                    {settings.tiltLockThreshold}L
                  </span>
                </div>
                <input
                  type="range" min={2} max={10} step={1}
                  value={settings.tiltLockThreshold}
                  onChange={e => settings.setTiltLockThreshold(+e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>2</span><span>10</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-slate-500">Cooldown Reminder</label>
                  <span className="text-sm text-slate-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
                    {settings.tiltCooldownMinutes}m
                  </span>
                </div>
                <input
                  type="range" min={5} max={60} step={5}
                  value={settings.tiltCooldownMinutes}
                  onChange={e => settings.setTiltCooldownMinutes(+e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>5m</span><span>60m</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Daily Loss Limit */}
        <div className="border-t border-line/50 pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">Daily Loss Limit</label>
                <ControlModeBadge mode="Soft" />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Warns when daily losses exceed this amount and requires an override to continue</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600 font-mono">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={dailyLimitInput}
              onChange={handleDailyLimitChange}
              className={'w-full bg-deep border border-line rounded-xl text-sm font-bold font-mono py-2.5 pl-8 pr-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums ' +
                (settings.dailyLossLimit > 0 ? 'text-red-400' : 'text-slate-500')}
            />
          </div>
        </div>
      </div>

      {/* Simulation */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Simulation</div>
          <p className="text-xs text-slate-500 mt-1">Starting balance and Monte Carlo defaults.</p>
        </div>

        {/* Starting Equity */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Starting Equity</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-600">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={eqInput}
              onChange={handleEqChange}
              className="w-full bg-deep border border-line rounded-xl text-xl font-bold font-mono text-white py-3 pl-10 pr-4 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all tabular-nums"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">The canonical challenge starts at $100K. A lower value enters 15% recovery sizing; existing trade snapshots are never rewritten.</p>
        </div>

        <div className="border-t border-line/50 pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Win Rate</label>
            <span className="text-sm text-blue-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
              {settings.winRate}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={85}
            step={1}
            value={settings.winRate}
            onChange={e => settings.setWinRate(+e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>50%</span>
            <span>85%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">Risk:Reward</label>
            <span className="text-sm text-blue-400 font-bold font-mono bg-deep px-2 py-0.5 rounded-md border border-line tabular-nums">
              1.0:1
            </span>
          </div>
          <div className="bg-deep rounded-xl border border-line px-3 py-2 text-xs text-slate-500 leading-relaxed">
            Gross 1:1 RR: a modeled win earns the same dollar amount placed at risk. Journal equity uses your manually entered net P&amp;L after fees, funding, and slippage.
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Display</div>
          <p className="text-xs text-slate-500 mt-1">How data is presented across the app.</p>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <label className="text-sm text-slate-400">R-Multiple Mode</label>
            <p className="text-[10px] text-slate-500 mt-0.5">Show P&L as R-multiples (e.g. +2.1R) instead of dollars</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="R-Multiple Mode"
            aria-checked={settings.rMultipleDisplay}
            onClick={() => settings.setRMultipleDisplay(!settings.rMultipleDisplay)}
            className="relative h-11 w-12 shrink-0"
          >
            <span className={'absolute inset-x-0 top-2 h-7 rounded-full transition-colors duration-200 ' +
              (settings.rMultipleDisplay ? 'bg-blue-500' : 'bg-elevated border border-line')} />
            <span className="absolute top-3 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200"
              style={{ left: settings.rMultipleDisplay ? 26 : 4 }} />
          </button>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-400" />
            <div className="text-xs text-slate-500 font-medium">Cloud Sync</div>
          </div>
          <span className="text-xs font-mono text-blue-400/70">Always On</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Open the same clean app link on any device and your trades appear automatically. Saves happen locally first, retry if the connection drops, and sync quietly in the background.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy App Link'}
          </button>
          <button
            onClick={handleShareLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-deep text-slate-400 text-xs font-medium rounded-xl border border-line active:scale-[0.98] hover:bg-elevated transition-all"
          >
            {shared ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {shared ? 'Shared!' : 'Share App'}
          </button>
        </div>

        <div className="text-xs text-slate-500 text-center">
          Last successful sync: {syncConfig?.lastSync ? new Date(syncConfig.lastSync).toLocaleString() : 'Not yet'}
        </div>

        {(syncInfo || syncConfig)?.pendingOperations > 0 && (
          <div className="text-xs text-amber-400/80 text-center">
            {(syncInfo || syncConfig).pendingOperations} change{(syncInfo || syncConfig).pendingOperations === 1 ? '' : 's'} waiting to sync
          </div>
        )}

        <div className="flex justify-center">
          <SyncStatusPill
            status={syncing ? 'syncing' : syncStatus}
            lastSync={(syncInfo || syncConfig)?.lastSync}
            onClick={handleSyncNow}
            disabled={syncing}
          />
        </div>

        {syncMsg && <div className="text-xs text-blue-400/70 text-center">{syncMsg}</div>}

        {syncActivity.length > 0 && (
          <div className="rounded-xl border border-line bg-deep p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Sync Activity</div>
              <div className="text-[10px] text-slate-600">Latest {Math.min(syncActivity.length, 5)}</div>
            </div>
            <div className="space-y-2">
              {syncActivity.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-[11px]">
                  <div className="min-w-0">
                    <div className="text-slate-300 leading-relaxed">{item.message}</div>
                    <div className="text-slate-600 uppercase tracking-wide mt-0.5">{item.source}</div>
                  </div>
                  <div className="shrink-0 text-slate-500">{new Date(item.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] leading-relaxed text-slate-600">
          No login or setup step. The clean TradeVault URL always opens this shared data.
        </p>
      </div>

      {/* Cloud Recovery */}
      <div className="bg-surface rounded-2xl p-4 border border-line space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <div className="text-xs text-slate-500 font-medium">Cloud Recovery</div>
          </div>
          <button
            type="button"
            onClick={refreshBackups}
            disabled={Boolean(backupBusy)}
            aria-label="Refresh backups"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-500 active:scale-95 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${backupBusy ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          TradeVault keeps a rolling daily restore point after successful syncs. You can also create a restore point manually before an important change.
        </p>

        <button
          type="button"
          onClick={handleCreateBackup}
          disabled={Boolean(backupBusy)}
          className="w-full min-h-11 flex items-center justify-center gap-2 bg-deep text-slate-300 text-xs font-medium rounded-xl border border-line active:scale-[0.98] disabled:opacity-40 transition-all"
        >
          <Archive className="w-4 h-4" />
          {backupBusy === 'create' ? 'Creating Backup...' : 'Create Backup Now'}
        </button>

        {backups.length > 0 ? (
          <div className="space-y-2">
            {backups.slice(0, 3).map(backup => (
              <div key={backup.backup_id} className="rounded-xl border border-line bg-deep p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-300 font-medium">
                      {backup.backup_id.startsWith('daily:')
                        ? 'Daily Backup'
                        : backup.backup_id.startsWith('manual:') ? 'Manual Backup' : 'Pre-Restore Backup'}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(backup.created_at).toLocaleString()} · revision {backup.server_revision}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(backup.backup_id)}
                    disabled={Boolean(backupBusy)}
                    aria-label="Download cloud backup"
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-line text-slate-400 active:scale-95 disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {showConfirm === `restore:${backup.backup_id}` ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(backup.backup_id)}
                      disabled={Boolean(backupBusy)}
                      className="min-h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-400 disabled:opacity-40"
                    >
                      {backupBusy === `restore:${backup.backup_id}` ? 'Restoring...' : 'Confirm Restore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(null)}
                      disabled={Boolean(backupBusy)}
                      className="min-h-11 rounded-xl border border-line text-xs font-medium text-slate-400 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(`restore:${backup.backup_id}`)}
                    disabled={Boolean(backupBusy)}
                    className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl text-xs text-slate-500 active:bg-slate-800 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore This Backup
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-deep/50 p-3 text-center text-[11px] text-slate-600">
            No cloud restore point has been created yet.
          </div>
        )}

        {backupError && <div role="alert" className="text-[11px] text-rose-400/80 text-center">{backupError}</div>}

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
                  onClick={handleClearAll}
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
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white font-bold tracking-widest">TRADEVAULT</span> <span className="text-slate-600">v3.2</span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">$100K {'\u2192'} $10M</p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Smooth `100k-pchip-v1` position sizing with fixed gross 1:1 risk/reward and win/loss-only trade outcomes.
          {' '}Trades and edits save locally first and sync into your shared cloud vault in the background.
        </p>
      </div>
    </div>
  );
}
