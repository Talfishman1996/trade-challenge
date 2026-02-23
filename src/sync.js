const SYNC_KEY = 'tradevault-sync';
const API = 'https://jsonblob.com/api/jsonBlob';

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

// Create a new cloud blob, returns the blob ID
export const createBlob = async (data) => {
  const payload = { ...data, lastModified: Date.now() };
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const id = res.headers.get('X-jsonblob-id') || res.headers.get('Location')?.split('/').pop();
  return id || null;
};

// Push data to existing blob
export const pushToCloud = async (data) => {
  const config = getSyncConfig();
  if (!config?.blobId) return false;
  try {
    const payload = { ...data, lastModified: Date.now() };
    delete payload._lastModified;
    const res = await fetch(`${API}/${config.blobId}`, {
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

// Pull data from cloud
export const pullFromCloud = async () => {
  const config = getSyncConfig();
  if (!config?.blobId) return null;
  try {
    const res = await fetch(`${API}/${config.blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};
