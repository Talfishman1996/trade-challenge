import { useState, useEffect, useCallback } from 'react';
import { START_EQUITY, TARGET_RR } from '../math/risk.js';

const STORAGE_KEY = 'tradevault-settings-100k-v1';

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
};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw), rewardRatio: TARGET_RR } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
};

const save = settings => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
};

export const useSettings = () => {
  const [settings, setSettings] = useState(load);

  useEffect(() => { save(settings); }, [settings]);

  const set = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    ...settings,
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
