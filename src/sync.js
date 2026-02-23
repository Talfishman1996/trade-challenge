const SYNC_KEY = 'tradevault-sync';

export const getSyncConfig = () => {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const saveSyncConfig = (config) => {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(config)); } catch {}
};

export const clearSyncConfig = () => {
  try { localStorage.removeItem(SYNC_KEY); } catch {}
};

export const generateSyncCode = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const pushToCloud = async (data) => {
  const config = getSyncConfig();
  if (!config?.dbUrl || !config?.syncCode) return false;
  try {
    const payload = { ...data, lastModified: Date.now() };
    delete payload._lastModified;
    const res = await fetch(`${config.dbUrl}/${config.syncCode}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      saveSyncConfig({ ...config, lastSync: Date.now() });
      return true;
    }
    return false;
  } catch { return false; }
};

export const pullFromCloud = async () => {
  const config = getSyncConfig();
  if (!config?.dbUrl || !config?.syncCode) return null;
  try {
    const res = await fetch(`${config.dbUrl}/${config.syncCode}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};
