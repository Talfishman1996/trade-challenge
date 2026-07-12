import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDir = resolve('output/audit-rebuild/P1/fixtures');
const DAY_MS = 86_400_000;
const start = Date.UTC(2026, 0, 1);

const day = index => new Date(start + index * DAY_MS).toISOString().slice(0, 10);

const trade = (scenario, index, pnl, overrides = {}) => ({
  uid: `trade:audit-${scenario}-${String(index).padStart(3, '0')}`,
  id: index + 1,
  createdAt: start + index * DAY_MS,
  updatedAt: start + index * DAY_MS + 1_000,
  deletedAt: null,
  date: day(index),
  openDate: day(Math.max(0, index - 1)),
  entryTime: '09:30',
  exitTime: '15:45',
  pnl,
  direction: index % 2 ? 'short' : 'long',
  ticker: index % 2 ? 'ETHUSDT' : 'BTCUSDT',
  strategy: 'Trend Follow',
  contracts: 1,
  entryPrice: 100_000 + index * 250,
  exitPrice: 100_000 + index * 250 + pnl / 10,
  setupTags: ['Trend Follow'],
  emotionTags: ['Disciplined'],
  mistakes: pnl < 0 ? ['Exited Early'] : [],
  mae: Math.abs(Math.min(0, pnl)) * 1.1,
  mfe: Math.max(0, pnl) * 1.2,
  images: [],
  notes: '',
  ...overrides,
});

const dataset = (scenario, initialEquity, trades) => ({
  version: 2,
  schemaVersion: 2,
  initialEquity,
  trades,
  tombstones: [],
  clientId: `client:audit-${scenario}`,
  _lastModified: start + 600 * DAY_MS,
});

const fixtures = {
  S00_first_launch: dataset('S00', 20_000, []),
  S01_empty_100k: dataset('S01', 100_000, []),
  S02_one_win: dataset('S02', 100_000, [trade('S02', 0, 15_000)]),
  S03_one_loss: dataset('S03', 100_000, [trade('S03', 0, -15_000)]),
  S04_break_even: dataset('S04', 100_000, [trade('S04', 0, 0)]),
  S05_mixed: dataset('S05', 100_000, [15_000, -12_000, 18_000, 0, 22_000, -10_000, 25_000]
    .map((pnl, index) => trade('S05', index, pnl))),
  S06_three_loss_streak: dataset('S06', 100_000, [20_000, 15_000, -18_000, -20_000, -22_000]
    .map((pnl, index) => trade('S06', index, pnl))),
  S06_daily_limit: dataset('S06-daily', 100_000, [trade('S06-daily', 0, -20_000, {
    date: '2026-07-12',
    openDate: '2026-07-12',
  })]),
  S07_over_50_drawdown: dataset('S07', 100_000, [100_000, -40_000, -40_000, -40_000]
    .map((pnl, index) => trade('S07', index, pnl))),
  S08_below_start: dataset('S08', 100_000, [15_000, -20_000, -25_000]
    .map((pnl, index) => trade('S08', index, pnl))),
  S09_near_1m: dataset('S09', 900_000, [80_000].map((pnl, index) => trade('S09', index, pnl))),
  S10_near_5m: dataset('S10', 4_700_000, [200_000].map((pnl, index) => trade('S10', index, pnl))),
  S11_near_10m: dataset('S11', 9_700_000, [200_000].map((pnl, index) => trade('S11', index, pnl))),
  S12_target_reached: dataset('S12', 9_800_000, [250_000].map((pnl, index) => trade('S12', index, pnl))),
  S13_500_trades: dataset('S13', 100_000, Array.from({ length: 500 }, (_, index) =>
    trade('S13', index, index % 10 < 7 ? 10_000 : -10_000))),
  S14_long_content: dataset('S14', 100_000, [trade('S14', 0, 123_456.78, {
    ticker: 'BTCUSDT-PERP-EXTREME-LENGTH',
    contracts: 999_999_999,
    entryPrice: 123_456_789.1234,
    exitPrice: 987_654_321.9876,
    setupTags: ['Mean Reversion', 'Momentum', 'Breakout', 'Custom setup with an exceptionally long name'],
    emotionTags: ['Disciplined', 'Confident', 'Patient'],
    mistakes: ['Sized Too Large', 'Held Too Long', 'Custom mistake with an exceptionally long name'],
    notes: 'Long-form audit note. '.repeat(100),
  })]),
  S15_attachment_reference: dataset('S15', 100_000, [trade('S15', 0, 15_000, {
    images: ['img-audit-remote-only'],
    notes: 'The record contains a synced image key whose IndexedDB blob is absent on this device.',
  })]),
};

await mkdir(outputDir, { recursive: true });

for (const [name, value] of Object.entries(fixtures)) {
  await writeFile(resolve(outputDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

await writeFile(
  resolve(outputDir, 'MANIFEST.json'),
  `${JSON.stringify(Object.entries(fixtures).map(([name, value]) => ({
    name,
    initialEquity: value.initialEquity,
    trades: value.trades.length,
  })), null, 2)}\n`,
);

console.log(`Wrote ${Object.keys(fixtures).length} deterministic fixtures to ${outputDir}`);
