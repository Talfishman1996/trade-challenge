import React from 'react';
import { AlertTriangle, CloudOff, GitMerge, Loader2, RefreshCw } from 'lucide-react';
import { getSyncPillCopy, getSyncToneClasses } from '../utils/syncStatus.js';

const SyncStatusIcon = ({ status }) => {
  if (status === 'syncing') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  if (status === 'merged' || status === 'created') return <GitMerge className="w-3.5 h-3.5" />;
  if (status === 'offline') return <CloudOff className="w-3.5 h-3.5" />;
  if (status === 'error') return <AlertTriangle className="w-3.5 h-3.5" />;
  return <RefreshCw className="w-3.5 h-3.5" />;
};

export default function SyncStatusPill({
  status,
  lastSync,
  onClick,
  disabled = false,
  compact = false,
  className = '',
}) {
  const copy = getSyncPillCopy(status, lastSync);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={'Sync status: ' + copy + '. Click to sync now.'}
        title={copy + ' - click to sync now'}
        className={'flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-all active:scale-95 disabled:opacity-60 ' + getSyncToneClasses(status) + ' ' + className}
      >
        <SyncStatusIcon status={status} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={'Sync status: ' + copy + '. Click to sync now.'}
      title={copy + ' - click to sync now'}
      className={'flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm transition-all disabled:opacity-60 ' + getSyncToneClasses(status) + ' ' + className}
    >
      <SyncStatusIcon status={status} />
      <span>{copy}</span>
    </button>
  );
}
