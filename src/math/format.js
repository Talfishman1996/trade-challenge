import { SMIN, LOG_MIN, LOG_MAX } from './constants.js';

export const fmt = v => {
  if (!isFinite(v)) return '\u2014';
  if (v < 1) return '0';
  const a = Math.abs(v);
  if (a >= 1e12) return `${+(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${+(v / 1e3).toFixed(a % 1000 === 0 ? 0 : 1)}K`;
  return `${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const lg = v => Math.log10(Math.max(v, 1));
export const unlg = v => Math.pow(10, v);

// Slider position (0-1000) <-> equity conversion (log scale)
export const s2e = s => Math.round(unlg(LOG_MIN + (s / 1000) * (LOG_MAX - LOG_MIN)));
export const e2s = e => ((Math.log10(Math.max(e, SMIN)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000;
