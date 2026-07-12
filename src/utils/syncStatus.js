export const formatSyncAge = (timestamp) => {
  if (!timestamp) return 'waiting';
  const elapsed = Date.now() - timestamp;
  if (elapsed < 15000) return 'just now';
  const minutes = Math.round(elapsed / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export const getSyncPillCopy = (status, lastSync) => {
  switch (status) {
    case 'syncing':
      return 'Syncing';
    case 'merged':
      return 'Changes merged';
    case 'error':
      return 'Sync issue';
    case 'offline':
      return 'Offline';
    case 'created':
      return 'Sync created';
    default:
      return lastSync ? `Synced ${formatSyncAge(lastSync)}` : 'Sync ready';
  }
};

export const describeSyncResult = (result) => {
  switch (result) {
    case 'merged':
      return 'Merged local and cloud changes';
    case 'pushed':
      return 'Uploaded local changes';
    case 'offline':
      return 'Sync is offline';
    case 'error':
      return 'Sync failed';
    default:
      return 'Cloud is up to date';
  }
};

export const getSyncToneClasses = (status) => {
  switch (status) {
    case 'syncing':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'merged':
    case 'created':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'error':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'offline':
      return 'bg-slate-700/70 text-slate-300 border-slate-500/40';
    default:
      return 'bg-deep/80 text-slate-200 border-line hover:bg-surface';
  }
};
