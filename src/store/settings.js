import { useState, useEffect, useCallback } from 'react';
import { START_EQUITY, TARGET_RR } from '../math/risk.js';

const STORAGE_KEY = 'tradevault-settings-100k-v1';
const LEGACY_STORAGE_KEY = 'risk-engine-settings';
const CAPABILITY_KEY = 'tradevault-capability-100k-v1';

const DEFAULTS = {
  winRate: 70,
  rewardRatio: TARGET_RR,
  initialEquity: START_EQUITY,
  drawdownAlertPct: 20,
  maxRiskPct: 0,
  tiltLockEnabled: true,
  tiltLockThreshold: 3,
  tiltCooldownMinutes: 15,
  dailyLossLimit: 0,
  rMultipleDisplay: false,
  preferencesUpdatedAt: 0,
  preferencesServerRevision: 0,
};

const PREFERENCE_KEYS = [
  'winRate',
  'drawdownAlertPct',
  'maxRiskPct',
  'tiltLockEnabled',
  'tiltLockThreshold',
  'tiltCooldownMinutes',
  'dailyLossLimit',
  'rMultipleDisplay',
];

const clamp = (value, minimum, maximum, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};

const normalize = (raw = {}) => ({
  ...DEFAULTS,
  ...raw,
  winRate: clamp(raw.winRate, 50, 85, DEFAULTS.winRate),
  rewardRatio: TARGET_RR,
  initialEquity: clamp(raw.initialEquity, 1000, 10000000, START_EQUITY),
  drawdownAlertPct: clamp(raw.drawdownAlertPct, 5, 50, DEFAULTS.drawdownAlertPct),
  maxRiskPct: clamp(raw.maxRiskPct, 0, 20, DEFAULTS.maxRiskPct),
  tiltLockEnabled: raw.tiltLockEnabled !== false,
  tiltLockThreshold: clamp(raw.tiltLockThreshold, 2, 10, DEFAULTS.tiltLockThreshold),
  tiltCooldownMinutes: clamp(raw.tiltCooldownMinutes, 5, 60, DEFAULTS.tiltCooldownMinutes),
  dailyLossLimit: clamp(raw.dailyLossLimit, 0, 1000000000, DEFAULTS.dailyLossLimit),
  rMultipleDisplay: raw.rMultipleDisplay === true,
  preferencesUpdatedAt: Math.max(0, Number(raw.preferencesUpdatedAt ?? raw.updatedAt) || 0),
  preferencesServerRevision: Math.max(0, Number(raw.preferencesServerRevision ?? raw.serverRevision) || 0),
});

const vaultId = () => {
  try {
    const candidate = (localStorage.getItem(CAPABILITY_KEY) || '').split('.')[0];
    return /^[A-Za-z0-9_-]{16,80}$/.test(candidate) ? candidate : 'unbound';
  } catch {
    return 'unbound';
  }
};

const scopedStorageKey = () => `${STORAGE_KEY}:${vaultId()}`;

const load = () => {
  try {
    const scoped = localStorage.getItem(scopedStorageKey());
    if (scoped) return normalize(JSON.parse(scoped));

    const prior100k = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const source = prior100k || legacy;
    if (!source) return { ...DEFAULTS };

    const migrated = normalize({
      ...JSON.parse(source),
      initialEquity: prior100k ? JSON.parse(source).initialEquity : START_EQUITY,
      preferencesUpdatedAt: Date.now(),
      preferencesServerRevision: 0,
    });
    localStorage.setItem(scopedStorageKey(), JSON.stringify(migrated));
    return migrated;
  } catch {
    return { ...DEFAULTS };
  }
};

const save = settings => {
  try { localStorage.setItem(scopedStorageKey(), JSON.stringify(normalize(settings))); } catch {}
};

const syncPreferences = (settings) => ({
  ...Object.fromEntries(PREFERENCE_KEYS.map(key => [key, settings[key]])),
  updatedAt: settings.preferencesUpdatedAt,
  serverRevision: settings.preferencesServerRevision,
});

export const useSettings = () => {
  const [settings, setSettings] = useState(load);

  useEffect(() => { save(settings); }, [settings]);

  const set = useCallback((key, value) => {
    setSettings(prev => normalize({
      ...prev,
      [key]: value,
      ...(PREFERENCE_KEYS.includes(key) ? { preferencesUpdatedAt: Date.now() } : {}),
    }));
  }, []);

  const applySyncedPreferences = useCallback((remote) => {
    if (!remote || typeof remote !== 'object') return;
    setSettings(prev => {
      const remoteRevision = Math.max(0, Number(remote.serverRevision) || 0);
      const remoteUpdatedAt = Math.max(0, Number(remote.updatedAt) || 0);
      if (remoteRevision < prev.preferencesServerRevision) return prev;
      if (remoteRevision === prev.preferencesServerRevision && remoteUpdatedAt < prev.preferencesUpdatedAt) return prev;
      return normalize({
        ...prev,
        ...Object.fromEntries(PREFERENCE_KEYS.map(key => [key, remote[key]])),
        preferencesUpdatedAt: remoteUpdatedAt,
        preferencesServerRevision: remoteRevision,
      });
    });
  }, []);

  const applySyncedInitialEquity = useCallback((initialEquity) => {
    const value = Number(initialEquity);
    if (!Number.isFinite(value) || value <= 0) return;
    setSettings(prev => prev.initialEquity === value ? prev : normalize({ ...prev, initialEquity: value }));
  }, []);

  return {
    ...settings,
    syncPreferences: syncPreferences(settings),
    applySyncedPreferences,
    applySyncedInitialEquity,
    setWinRate: v => set('winRate', v),
    setRewardRatio: () => set('rewardRatio', TARGET_RR),
    setInitialEquity: v => set('initialEquity', v),
    setDrawdownAlertPct: v => set('drawdownAlertPct', v),
    setMaxRiskPct: v => set('maxRiskPct', v),
    setTiltLockEnabled: v => set('tiltLockEnabled', v),
    setTiltLockThreshold: v => set('tiltLockThreshold', v),
    setTiltCooldownMinutes: v => set('tiltCooldownMinutes', v),
    setDailyLossLimit: v => set('dailyLossLimit', v),
    setRMultipleDisplay: v => set('rMultipleDisplay', v),
  };
};
