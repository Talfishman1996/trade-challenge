# Hyper Audit Notes

Date: 2026-04-16
Project: `20k-10mil-challenge`
Auditor mode: blind audit, zero assumed context

## Working understanding

- Frontend is a Vite + React 19 single-page app for a personal trading challenge tracker.
- Persistence is local-first via `localStorage`, with optional Cloudflare Worker + KV sync keyed by URL hash.
- App surface is primarily mobile-oriented, but codebase is still a single monolithic SPA with several oversized components.
- Position sizing is built around a custom `2/3 Power Decay` risk model. Reward/risk is now fixed at `1.0:1`.

## Architecture notes

- Frontend entry: `src/main.jsx`
- Root orchestration: `src/components/App.jsx`
- Largest UI surface: `src/components/Home.jsx` at 1383 lines
- Largest workflow surface: `src/components/TradeEntry.jsx` at 598 lines
- Largest settings/sync surface: `src/components/Settings.jsx` at 604 lines
- Analytics surface: `src/components/Analysis.jsx` at 461 lines
- State and persistence: `src/store/trades.js`, `src/store/settings.js`
- Sync client: `src/sync.js`
- Sync backend: `worker/src/index.js`

## Immediate findings in progress

### Product-level

- The app currently behaves like two competing products:
  - a private internal journal that should optimize for speed, clarity, and zero-friction logging
  - a theatrical branded experience with heavy visual identity, animated storytelling, and ornamental metaphors
- The second product is dominating the first in key places, especially on the home screen.

### Codebase-level

- Project structure is shallow and overloaded:
  - core UI, view logic, derived metrics, and visualization logic live together
  - there is almost no feature-level foldering or separation of concerns
- Several components are too large to audit or evolve safely without regression risk.
- Multiple backup CSS files exist in `src/`, which is a maintenance smell and hints at unstable styling workflow.

### Verification

- Initial local build check failed because the optional Rollup native package was missing in `node_modules`.
- Installed the missing package locally with `npm i @rollup/rollup-darwin-arm64 --no-save`.
- Build now completes successfully.
- Current production bundle is extremely large for a single-user mobile-first internal app:
  - JS: `942.12 kB` minified, `310.98 kB` gzip
  - CSS: `56.38 kB` minified, `9.51 kB` gzip

## Specific concerns to validate next

- Whether settings such as max risk override and drawdown alert are actually enforced anywhere meaningful.
- Whether sync conflict resolution is robust enough to trust on multiple devices.
- Whether image lifecycle is cleaned up when trades are deleted or all data is cleared.
- Whether current mobile interactions are optimized for repeated use, one-handed logging, and low cognitive load.
- Whether analytics are truly decision-useful or mostly decorative.
- Whether the home screen is helping execution or creating spectacle.

## Running thesis

- The app is ambitious and visually distinctive, but the pipeline is not yet "perfected on steroids".
- The biggest gap is not effort. It is prioritization.
- Too much complexity is currently spent on visual theater, and not enough on:
  - operational flow
  - data reliability
  - maintainable structure
  - truly fast mobile journaling
  - decision-driving feedback loops

## Pending audit passes

- Frontend UX flow audit
- Mobile ergonomics audit
- Backend/sync/storage audit
- State management and data integrity audit
- Visualization usefulness audit
- File-by-file maintainability audit
- Naming, copy, and design system audit
- Project structure and workflow audit

## Detailed findings

### 1. Product positioning conflict

- `src/components/Home.jsx:13` inlines a giant base64 mountain asset directly into application code.
- `src/components/Home.jsx:921-950` adds god rays, particle fall, and flash effects.
- `src/components/Home.jsx:1259-1337` spends a large amount of UI budget on the "Summit Tracker" metaphor.
- Brutal read: the product is trying to be an epic challenge shrine when it should first be an elite execution console.
- Result:
  - first-load cost is too high
  - dashboard attention is pulled toward spectacle
  - the fastest workflow in the app, logging and reviewing trades, does not feel like the primary design priority

### 2. Sync architecture is dangerously trusting

- `worker/src/index.js:3-7` exposes permissive CORS to `*`.
- `worker/src/index.js:17-25` creates new sync IDs without identity, auth, quotas, or abuse controls.
- `worker/src/index.js:27-48` allows anyone with the key to read and overwrite all data.
- `src/sync.js:33-49` blindly overwrites cloud state on PUT.
- `src/store/trades.js:343-362` resolves conflicts with last-write-wins timestamps only.
- Brutal read: this is not real sync, it is shared mutable blob storage.
- Practical risk:
  - multi-device edits can silently destroy each other
  - pasted sync links are effectively bearer tokens
  - there is no record of divergence, merge conflict, or accidental replacement

### 3. Sync UX is backwards for an internal private tool

- `src/components/App.jsx:120-141` blocks truly fresh users behind a sync gate.
- `src/components/App.jsx:125-137` auto-creates cloud sync for existing local trades.
- `src/components/App.jsx:214-275` presents sync as the first-run primary action.
- `src/components/Settings.jsx:394-395` says syncing happens automatically every 60 seconds and on each trade, reinforcing cloud-first behavior.
- Brutal read: the app introduces remote-state complexity before earning it.
- Better default for an internal app:
  - open instantly
  - log locally
  - offer sync as an explicit upgrade, not the opening ceremony

### 4. Several "risk controls" are not fully honest

- `src/store/settings.js:9-14` defines drawdown alert, max risk override, tilt lock, cooldown, and daily loss limit.
- `src/components/Settings.jsx:161-203` exposes drawdown alert and max risk override as if they are active controls.
- `src/components/Home.jsx:1024-1037` drawdown warning ignores the configured `drawdownAlertPct` and instead compares against `maxDrawdownPct * 0.7`.
- search shows `maxRiskPct` is only set and rendered, not applied to `nextRisk`, trade gating, or stored trade calculations.
- `src/components/App.jsx:412-413` cooldown is advisory copy only.
- Brutal read: part of the settings surface is fake control surface.
- That damages trust more than having fewer settings.

### 5. Data integrity and lifecycle gaps

- `src/store/trades.js:149-158` deletes trade rows but does not delete associated images.
- `src/store/trades.js:191-195` clears trades but does not call `clearAllImages`.
- `src/utils/imageDB.js:61-69` already contains `clearAllImages`, but it is not wired in.
- `src/store/trades.js:208-214` imports parsed JSON directly, skipping the migration path used by `loadData`.
- Brutal read: data deletion is incomplete and imports are less safe than fresh loads.
- Result:
  - orphaned IndexedDB blobs
  - inconsistent trade shape after import
  - hidden browser storage growth over time

### 6. Date handling is timezone-fragile

- `src/components/TradeEntry.jsx:175`, `191-195` convert form dates with `new Date(...T12:00:00).toISOString()`.
- `src/store/trades.js:265-270` computes "today" and "last 30 days" using UTC ISO strings.
- `src/utils/dataIO.js:9`, `21-22`, `47` also derives filenames and export dates with UTC ISO slices.
- Brutal read: the app is pretending dates are local while storing and comparing them as UTC strings.
- Likely symptom:
  - a user logging late evening Pacific time can see "today" or export dates shift unexpectedly

### 7. Mobile UX is better than desktop-first apps, but still not elite

- `src/components/MetricCard.jsx:4-11` tooltips are hover-based and not touch-native.
- `src/components/Analysis.jsx:287`, `296` and many other `Tip` usages depend on that hover behavior.
- `src/components/FilterBar.jsx:38-43` applies multiple quick filters as chained AND conditions.
- `src/components/FilterBar.jsx:60-66` lets the user activate contradictory filters like `Winners` + `Losers` or `Long` + `Short`.
- `src/components/Trades.jsx:224-259` and `284-309` rely on tap-anywhere cards/rows to edit, with no explicit action affordances.
- `src/components/Trades.jsx` exposes no delete action even though `deleteTrade` exists in state.
- Brutal read: it is visually mobile-first, but interaction design is still developer-first.

### 8. Trade-entry flow is powerful but not ruthless enough

- `src/components/TradeEntry.jsx:241-598` is a large bottom-sheet form with several optional sections.
- `src/components/TradeEntry.jsx:213-224` uploads images sequentially.
- `src/components/TradeEntry.jsx:90-104` loads image previews sequentially.
- `src/components/TradeEntry.jsx:308-420` exposes many fields before proving they matter for later review.
- Brutal read: the form has breadth, but not enough opinionated flow.
- For repeated internal use, the fastest path should be:
  - P&L
  - date
  - ticker
  - setup tag
  - optional note
  - save
- Everything else should stay available but feel secondary and progressive.

### 9. Project structure is not sustainable

- `src/components/Home.jsx` is 1383 lines.
- `src/components/TradeEntry.jsx` is 598 lines.
- `src/components/App.jsx` is 490 lines.
- `src/components/Settings.jsx` is 604 lines.
- `src/index.css` is tiny, but there are backup files beside it:
  - `src/index.css.backup`
  - `src/index.css.gpt54`
  - `src/index.css.gpt54v2`
  - `src/index.css.gpt54v3`
- Brutal read: the repo shows signs of iterative improvisation without consolidation.
- That slows every future change because behavior, visuals, state, and copy are entangled.

### 10. Documentation and project truth are drifting apart

- `CLAUDE.md:12` still says "no backend".
- `README.md:60` references a `shared/` folder that is not present.
- `README.md:105-110` lists analysis features that do not match the current tabs and screens.
- `README.md:113-117` describes adjustable risk parameters that are not actually fully wired.
- `README.md:135` and `vite.config.js:6` are tightly coupled to GitHub Pages deployment.
- `src/components/Settings.jsx:594` shows version `v3.0`, while `package.json:3` is `3.1.0`.
- Brutal read: the project has multiple "sources of truth" and they disagree.

### 11. Performance is not where it needs to be

- production build output shows `dist/assets/index-*.js` at about 942 kB minified and 311 kB gzip.
- Vite warns the bundle exceeds 500 kB.
- `src/components/Home.jsx:13` base64 asset inflation is likely contributing materially.
- `src/components/App.jsx`, `Home.jsx`, `Analysis.jsx`, charts, and visual effects all load in the main bundle.
- Brutal read: for a private internal app, this is too heavy relative to the value delivered on first load.

### 12. Design language is distinctive but overcommitted

- `index.html:6-8` loads `Cinzel` and `JetBrains Mono` from Google Fonts.
- `src/index.css:8-15` defines a dark-only theme with mono emphasis.
- `src/components/Home.jsx:972-980` uses giant cinematic typography for the portfolio value.
- `src/components/App.jsx:222-223` and `src/components/Settings.jsx:594` lean into branded fantasy naming.
- Brutal read:
  - the aesthetic is memorable
  - but it sometimes reads more like a game skin than a brutally efficient trading journal
- The strongest visual parts are:
  - number presentation
  - dark contrast
  - bottom navigation
- The weakest visual parts are:
  - too many ornamental effects
  - inconsistent seriousness between "risk engine" and "summit quest"
  - some small gray copy on dark backgrounds that will feel low-energy on mobile

## Implementation notes added during rebuild

### Tranche follow-up: rapid logging and visible sync state

- `src/components/TradeEntry.jsx` now supports faster repeat-entry behavior:
  - recent ticker chips
  - recent setup-tag shortcut chips
  - `Save & Add Another` flow that carries forward the structural fields and clears the per-trade clutter
- `src/components/Trades.jsx` now exposes `Repeat Last`, which opens a prefilled rapid-entry template instead of forcing a cold restart.
- `src/components/App.jsx` now exposes a top-level sync pill:
  - manual sync tap target
  - visible `syncing`, `merged`, `offline`, `error`, and `ready` states
  - sync is no longer invisible from the main shell
- `src/components/App.jsx` also now lazy-loads non-home surfaces (`Trades`, `Analysis`, `Settings`, `TradeEntry`, `Celebration`) so the initial app shell stops front-loading every tab.
- sync status logic is now partially extracted instead of living only in `App.jsx`:
  - `src/components/SyncStatusPill.jsx`
  - `src/utils/syncStatus.js`
  - `src/utils/syncActivity.js`
- `src/components/Settings.jsx` now shows recent sync activity so merges, offline periods, and failures are visible after the fact instead of disappearing into toast history.
- `vite.config.js` now defaults to `/` instead of hard-coding the old GitHub Pages subpath, which makes the frontend materially more Cloudflare-ready.
- `package.json` now includes `wrangler` plus a `deploy:cloudflare` script, and Cloudflare deployment is now working from this environment.
- Brutal read:
  - this is much closer to an internal power tool
  - but the shell is still carrying too much responsibility
  - the next big payoff will come from feature extraction and code-splitting, not more one-off component accretion

### Later tranche: frictionless internal sync

- The sync model was redesigned away from pasted per-device sync links and toward a single always-on shared vault for this internal single-user workflow.
- `src/sync.js` now normalizes the primary sync config to `tradevault-main` instead of preserving stale blob IDs.
- `src/components/App.jsx` now:
  - migrates legacy `#sync=` links silently into the shared vault
  - strips the hash from the URL after migration
  - lands directly on Home instead of a sync gate
  - uses adaptive sync intervals instead of a blind constant poll
- `src/components/Settings.jsx` now treats sync as always-on and shares the generic app URL instead of a hash link.
- `src/components/TradeEntry.jsx` copy was updated so autosave language matches the new behavior.
- Cloudflare Pages production branch was updated from `main` to `master`, and the canonical root URL now works at `https://tradevault-b7t.pages.dev`.
- Brutal read:
  - this is the first version that actually behaves like a true internal app instead of a static app pretending to have sync
  - the remaining major weakness is that screenshots and settings are still origin-bound browser storage, so future custom-domain migration should be handled deliberately rather than with an immediate forced redirect

### Later tranche: fixed 1:1 RR over decay engine

- The active position sizing engine remains `2/3 Power Decay`.
- The reward/risk ratio is fixed to `1.0:1`.
- New trades default to the current decay-sized 1R amount, so a win and loss are symmetric around the active risk size.
- At `$20K`, the original decay curve still risks 100%, so a win can move `$20K -> $40K`; above that level, risk decays per the original curve.
- The adjustable risk/reward slider was removed from active control surfaces and replaced with fixed-model explanatory copy.
- Local settings normalize `rewardRatio` back to `1.0`, so older browser settings cannot silently keep the previous reward ratio alive.
- Model APIs now enforce `TARGET_RR` internally instead of accepting caller-supplied RR:
  - `geoGrowth`
  - `calcStreak`
  - `computeHeavyMetrics`
  - `computeMilestones`
  - `ProbabilityCone`
- This matters because the UI was not enough; projections, Monte Carlo paths, milestone estimates, recovery math, and probability cones all needed to be locked to the same challenge truth.
- Brutal read:
  - the earlier full-account interpretation was too aggressive and violated the intended decay engine
  - the correct product truth is decay-sized 1R plus fixed 1:1 RR
  - historical trades are not automatically rewritten by sign; if the owner wants old rows transformed to fixed 1R outcomes, that should be a deliberate migration with backup/export first

### Later tranche: sync control collision fix

- The persistent sync pill was removed from the fixed top-right content overlay because it could cover Analysis tabs, especially `Projections`, on narrower viewports.
- Desktop keeps one-click manual sync as a compact icon button in the left sidebar.
- Mobile keeps one-click manual sync as a compact floating button above the bottom nav, inside the app chrome zone rather than the page-header zone.
- `SyncStatusPill` now supports a compact icon-only mode while preserving accessible labels and hover/tap titles with the full `Synced X ago` copy.
- Analysis tabs now use short labels on mobile (`Perf`, `Behavior`, `Proj`) and full labels on desktop.
- Brutal read:
  - persistent global status belongs in shell chrome, not on top of page content
  - making sync clickable was right, but making it an always-present overlay was the layout bug
  - mobile tab labels should be designed for the narrowest real phone width, not the desktop mental model

### Later tranche: manual P&L entry and no saved drafts

- Saved trade drafts were removed from the Log Trade flow by owner request.
- New trade amount no longer auto-fills from the decay-sized 1R amount.
- New trade save now uses the manually typed profit/loss amount with the selected WIN/LOSS sign.
- `Save & Add Another` still preserves structural context for fast repeated entry, but clears the P&L amount so every trade result is explicit.
- Client dataset normalization drops `tradeDraft`; worker normalization and merge logic also drop `tradeDraft` so cloud sync will not resurrect old saved drafts.
- Brutal read:
  - auto-filling 1R was too opinionated for real trade logging
  - the risk engine should inform context, not silently decide the realized P&L
  - saved drafts added sync complexity and were not worth the mental overhead for this internal workflow
