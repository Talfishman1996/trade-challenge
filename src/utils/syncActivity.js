const SYNC_ACTIVITY_KEY = 'tradevault-sync-activity';
const LIMIT = 12;

export const readSyncActivity = () => {
  try {
    const raw = localStorage.getItem(SYNC_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const recordSyncActivity = ({ status, source, message }) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    status,
    source,
    message,
  };
  const next = [entry, ...readSyncActivity()].slice(0, LIMIT);
  try {
    localStorage.setItem(SYNC_ACTIVITY_KEY, JSON.stringify(next));
  } catch {}
  return next;
};
