# TradeVault

> [!IMPORTANT]
> **PROTECTED PRE-MIGRATION CHECKPOINT:** The exact `$20K -> $10M` application that existed before the planned `$100K -> $10M` rebuild is permanently preserved as `CHECKPOINT-PRE-100K-MIGRATION-2026-07-12`. Do not delete or move that tag or its checkpoint branch. See [the full checkpoint and restore record](docs/checkpoints/PRE-100K-MIGRATION-2026-07-12.md).

> [!NOTE]
> **CURRENT FUTURE PROGRAM:** The evidence-gated mobile audit and interactive prototype plan begins at [docs/audit-rebuild/README.md](docs/audit-rebuild/README.md). Its authoritative status is in `docs/audit-rebuild/TRACKER.md`; no phase may start without explicit owner greenlight.

Mobile-first trading risk dashboard with 2/3 Power Decay sizing and fixed 1:1 risk/reward. Personal tool for tracking the $20K to $10M equity challenge.

## Stack

- React 19 + Vite 7
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Recharts (charts/visualizations)
- Framer Motion (animations)
- Lucide React (icons)
- localStorage for persistence, plus optional Cloudflare Worker sync

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173/
npm run build     # Production build -> dist/
```

## Architecture

```
src/
  main.jsx                  # Entry point
  index.css                 # Tailwind + custom styles
  sync.js                   # Cloud sync (Cloudflare Workers KV)
  math/
    constants.js            # Model constants, milestones, chart config
    risk.js                 # 2/3 Power Decay model + fixed RR target (core math)
    format.js               # Number formatting utilities
    monte-carlo.js          # Monte Carlo simulation engine
    analytics.js            # Trade analytics (streaks, R-multiples, etc.)
    index.js                # Barrel export
  store/
    trades.js               # Trade state management + localStorage
    settings.js             # Settings state + localStorage
    tags.js                 # Tag definitions
  utils/
    dataIO.js               # JSON import/export
    imageDB.js              # Trade image storage (IndexedDB)
  components/
    App.jsx                 # Root: navigation, tabs, layout, sync orchestration
    Home.jsx                # Dashboard: equity display, stats, sparkline, summit tracker
    Trades.jsx              # Trade log: grid/table views, stats bar, sorting
    TradeEntry.jsx          # Trade form: win/loss, long/short, P&L, dates, notes
    Analysis.jsx            # Analytics: milestones, risk curves, stress test, projections
    Settings.jsx            # Settings: risk params, cloud sync, data management
    EquityCurve.jsx         # Recharts equity curve with milestone markers
    Heatmap.jsx             # Calendar heatmap of daily P&L
    ScatterPlot.jsx         # R-multiple scatter plot
    GPSJourney.jsx          # Visual equity funnel (danger zone -> goal)
    FilterBar.jsx           # Date/tag/direction filters
    MetricCard.jsx          # Reusable stat card component
    Celebration.jsx         # Milestone achievement animation
    TagPicker.jsx           # Multi-select tag picker
worker/
  src/index.js              # Cloudflare Worker (sync API)
  wrangler.toml             # Worker config
```

## Core Math Model: 2/3 Power Decay + 1:1 RR

The position sizing engine still uses the original piecewise risk function `rN(equity)`. Only the reward ratio is fixed to `1.0:1`.

| Equity Range | Risk % | 1:1 Outcome Behavior |
|-------------|--------|----------------------|
| $0 - $20K | 100% | A win can double the account; a loss can wipe to the app floor |
| $20K - $50K | 100% -> 50% | Win and loss both use the same decay-sized 1R |
| $50K - $87.5K | 50% -> 33% | Linear decrease to anchor risk |
| $87.5K+ | 33% * (87500/E)^(2/3) | Risk decays smoothly as equity grows |

**Key constants:**
- Anchor equity (E0): $87,500 (risk = 33% here)
- Reward ratio: 1.0:1
- Start: $20,000
- Target: $10,000,000

The model keeps aggressive growth at low equity and capital preservation at high equity, while making each win/loss symmetric around the active decay-sized 1R amount.

## Features

### Dashboard (Home)
- Current equity with animated display
- 30-day P&L, best trade, current streak, win rate
- Mini equity sparkline
- Summit Tracker (milestone progress trail)
- Phase indicator (Growth / Anchor / Decay)

### Trade Logging
- Win/Loss + Long/Short entry
- Open date, close date, duration tracking
- Notes and tags per trade
- Undo/redo support
- Grid view (cards) and Table view (sortable)

### Analysis
- **Milestones:** Progress toward $100K, $250K, $500K, $1M, $4M, $10M
- **Data Matrix:** Risk/reward at various equity levels
- **Risk Curves:** Visual comparison of 2/3 Power Decay vs alternatives
- **Stress Test:** Consecutive win/loss streak simulator
- **Projections:** Monte Carlo growth simulation
- **Compare:** Side-by-side model comparison

### Settings
- Fixed 1:1 risk/reward display over the decay sizing engine
- R-multiple toggle
- Cloud sync management
- Data import/export (JSON)
- Clear data with confirmation

### Cloud Sync
- Cloudflare Pages frontend + Cloudflare Worker sync backend
- Always-on shared sync vault for this internal app
- Auto-sync on save/edit, focus return, and adaptive background intervals
- Draft autosave while typing and edit autosave while modifying trades
- Merge-aware reconciliation for local/cloud datasets
- Visible sync status and recent sync activity
- Legacy sync-link migration into the current shared vault
- Last-write timestamps plus record-level merge handling

## Design

- Dark theme: slate-950 background
- Semantic colors: emerald (positive/wins), rose/red (negative/losses), blue (UI chrome), amber (warnings)
- JetBrains Mono for all numeric displays
- Mobile-first: bottom tab navigation + center FAB for trade entry
- Desktop: fixed left sidebar with icon navigation

## Deployment

The frontend now builds with `/` as the default base path, which is appropriate for Cloudflare Pages and other root-host deployments.

If you need the old GitHub Pages subpath behavior, build with:

```bash
VITE_BASE_PATH=/trade-challenge/ npm run build
```

### Cloudflare handoff

```bash
npm run build
npm run deploy:cloudflare
npm run deploy:worker
```

- `deploy:cloudflare` uploads the frontend `dist/` build to Cloudflare Pages.
- `deploy:worker` deploys the sync worker defined in `worker/wrangler.toml`.
- Both commands require an authenticated Wrangler session.
- Current canonical live frontend: `https://tradevault-b7t.pages.dev`
- Current live sync worker: `https://tradevault-sync.talfishmanbusiness.workers.dev`

## License

ISC
