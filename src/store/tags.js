// Predefined tag constants for trade journaling
// Users can also add custom tags — these are the defaults

export const SETUP_TAGS = [
  'Breakout', 'Breakdown', 'VWAP Bounce', 'Mean Reversion',
  'Earnings Gap', 'Trend Follow', 'Range Fade', 'Momentum',
  'Pullback', 'Reversal', 'Scalp', 'Swing', 'FOMC', 'CPI',
];

export const EMOTION_TAGS = [
  'Disciplined', 'Confident', 'Patient', 'Focused',
  'FOMO', 'Revenge', 'Anxious', 'Impulsive', 'Tilted', 'Bored',
];

export const MISTAKE_TAGS = [
  'Sized Too Large', 'No Stop Loss', 'Moved Stop', 'Exited Early',
  'Held Too Long', 'Chased Entry', 'Ignored Rules', 'Overtraded',
];

export const STRATEGY_OPTIONS = [
  'Long Call', 'Long Put', 'Short Call', 'Short Put',
  'Call Spread', 'Put Spread', 'Iron Condor', 'Iron Butterfly',
  'Straddle', 'Strangle', 'Calendar Spread', 'Shares Long', 'Shares Short',
];
