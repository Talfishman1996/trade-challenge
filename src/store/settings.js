import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'risk-engine-settings';

const DEFAULTS = {
  winRate: 60,
  rewardRatio: 1.5,
  initialEquity: 20000,
};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
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
    setRewardRatio: v => set('rewardRatio', v),
    setInitialEquity: v => set('initialEquity', v),
  };
};
