const SYNC_KEY = 'tradevault-sync';
const API = 'https://tradevault-sync.talfishmanbusiness.workers.dev';

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

// Create a new cloud sync key, returns the key ID
export const createBlob = async (data) => {
  const payload = { ...data, lastModified: Date.now() };
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.id || null;
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

// Pull from a specific blob ID (for connect/switch flow)
export const pullFromBlobId = async (blobId) => {
  try {
    const res = await fetch(`${API}/${blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};

// Extract blob ID from a pasted URL or raw ID
export const extractBlobId = (input) => {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  const hashMatch = trimmed.match(/sync=([a-zA-Z0-9-]+)/);
  if (hashMatch) return hashMatch[1];
  const uuidMatch = trimmed.match(/^[a-zA-Z0-9-]{20,}$/);
  if (uuidMatch) return uuidMatch[0];
  return null;
};
