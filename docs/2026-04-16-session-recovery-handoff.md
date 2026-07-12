# Session Recovery Handoff

Last updated: `2026-04-29 00:25:24 PDT`

## Purpose

This file is the cold-start recovery pack for a brand-new session with zero memory of the work that happened here. Read this first if the chat/session is lost.

## Executive Summary

TradeVault was redesigned from a fragile sync-link flow into a frictionless internal app flow:

- the app now opens directly to Home
- the mountain screen is the immediate landing page
- sync is always-on in the background
- saved trade drafts have been removed by owner request
- edits auto-save while modifying a trade
- one shared sync vault is used across devices for this internal single-user app
- the Cloudflare Pages root URL now works as the canonical frontend URL
- the active risk model remains 2/3 Power Decay, with reward/risk fixed at 1.0:1

## Canonical Live Links

- Frontend root URL: `https://tradevault-b7t.pages.dev`
- Frontend branch alias: `https://master.tradevault-b7t.pages.dev`
- Latest exact deployment: `https://ee8cb290.tradevault-b7t.pages.dev`
- Sync worker: `https://tradevault-sync.talfishmanbusiness.workers.dev`

## Cloudflare State

- Account email: `talfishmanbusiness@gmail.com`
- Account ID: `310817ba6f8fdf096c2f6fd8f3fe0a25`
- Pages project: `tradevault`
- Production branch: `master`
- Current Worker version: `4fe71140-d2f8-4250-ae0a-a54c54eff246`
- Earlier Worker version after backend merge hardening: `c2dca57b-f4cd-45f4-82f2-b2a472e355a8`
- Production branch was changed in the Cloudflare dashboard during this session from `main` to `master`
- After changing production branch, a fresh Pages deploy was pushed so the root URL stopped returning `404`

## What Was Actually Fixed

### 1. Frictionless Sync Architecture

Old behavior:

- app could open on a sync gate
- app previously depended on `#sync=...` links or per-device local sync config
- generic links were not enough for seamless cross-device use

New behavior:

- the app uses a single shared sync ID: `tradevault-main`
- legacy `#sync=` links are silently migrated into the always-on vault
- the URL hash is stripped out after migration
- the generic app link is enough to open the app
- sync config is auto-established instead of waiting for user setup

Primary files:

- [src/sync.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/sync.js)
- [src/components/App.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/App.jsx)
- [src/components/Settings.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/Settings.jsx)

### 2. Manual P&L Entry + Edit Autosave

New trade entry:

- saved drafts are disabled completely
- the profit/loss amount starts blank instead of auto-filling from 1R
- the amount input is editable for new trades
- save uses the manually typed amount with the selected WIN/LOSS sign
- `Save & Add Another` carries structural context forward but clears the amount field

Edit flow:

- valid changes auto-save while editing an existing trade
- save feedback is more honest and less ambiguous

Primary files:

- [src/components/TradeEntry.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/TradeEntry.jsx)
- [src/store/trades.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/store/trades.js)
- [src/utils/tradeData.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/utils/tradeData.js)

### 3. Adaptive Background Sync

Current behavior:

- immediate sync on save
- immediate sync on edit autosave
- immediate sync when focus/visibility returns
- background sync while trade entry is open: every `15s`
- background sync while just browsing the app in foreground: every `30s`
- no interval polling while the app is in the background

Primary file:

- [src/components/App.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/App.jsx)

### 3b. Trade Save Regression Hotfix

Problem that appeared after the frictionless sync rewrite:

- a newly saved trade could appear for a moment and then disappear
- the UI briefly showed the correct updated equity/trade count, then snapped back
- this was reproducible live in Safari against the deployed app

Actual root cause:

- `src/store/trades.js` still had several write paths using stale render-time `data`
- after a successful save, old draft-clearing and other follow-up writes could persist an older dataset snapshot back into storage
- that older snapshot then got pushed/synced, effectively erasing the just-saved trade

Fix:

- trade mutations now read from `dataRef.current`, not stale closure state
- affected write paths included old draft updates, add trade, edit trade, delete trade, clear trades, and initial equity updates
- later owner request removed saved drafts entirely, so `tradeDraft` is no longer part of the active client or worker merge model

Verification:

- reproduced the bug live before the fix
- deployed the fix to Cloudflare Pages
- re-ran the same live save flow on `https://d584054e.tradevault-b7t.pages.dev`
- confirmed the trade stayed visible after save
- confirmed the trade still existed after reload
- confirmed the canonical root URL `https://tradevault-b7t.pages.dev` reflected the fixed state too

### 3c. Backend Sync Merge Hardening

Problem:

- an older stale client could still try to overwrite the cloud blob with an incomplete trade list
- before this fix, the worker accepted blind last-write-wins PUTs
- that meant even a now-fixed frontend could still be undermined by an older tab or device session

Fix:

- `worker/src/index.js` now normalizes and merges incoming datasets with the currently stored dataset on every PUT
- trades merge by `uid` and newer `updatedAt`
- tombstones win when deletion is newer than the trade update
- saved draft state is intentionally dropped rather than merged
- the worker no longer behaves like raw mutable blob storage for writes

Verification:

- live cloud dataset was inspected directly
- a synthetic stale one-trade payload with a fresh timestamp was PUT to the live worker
- the worker preserved both trades instead of dropping the newer one
- this proved stale clients can no longer erase newer trades in the shared vault

### 4. Cloudflare Production URL Cleanup

Problem:

- root Pages URL `https://tradevault-b7t.pages.dev` returned `404`
- only `https://master.tradevault-b7t.pages.dev` worked

Fix:

- production branch changed to `master` in Cloudflare Pages settings
- frontend redeployed after branch update
- root URL now returns `200`

Verification:

- `curl -I https://tradevault-b7t.pages.dev` returned `200`
- `curl -I https://master.tradevault-b7t.pages.dev` returned `200`

### 5. Fixed 1:1 RR Over Decay Engine

Owner request:

- change the app to reflect 1:1 RR while keeping the decay engine

Implemented behavior:

- active `rN(equity)` remains the original 2/3 Power Decay risk fraction
- active 1R dollar amount equals `rN(currentEquity) * currentEquity`
- a new winning trade records `+1R`
- a new losing trade records `-1R`
- at `$20K`, the decay engine still risks 100%, so a win can move `$20K -> $40K`
- above `$20K`, 1R follows the decay curve rather than the full account value
- browser settings normalize `rewardRatio` to `1.0`, so old local settings cannot keep the previous reward ratio alive
- model APIs now own the fixed reward ratio through `TARGET_RR`, so projections cannot accidentally pass in a stale/custom RR

Primary files:

- [src/math/risk.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/math/risk.js)
- [src/math/monte-carlo.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/math/monte-carlo.js)
- [src/store/settings.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/store/settings.js)
- [src/components/TradeEntry.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/TradeEntry.jsx)
- [src/components/Settings.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/Settings.jsx)
- [src/components/Analysis.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/Analysis.jsx)
- [src/components/GPSJourney.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/GPSJourney.jsx)
- [src/components/Home.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/Home.jsx)
- [src/math/constants.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/math/constants.js)

Model-level hardening after owner clarified that projections/models must change too:

- `geoGrowth` and `calcStreak` no longer accept an RR argument
- `computeHeavyMetrics` no longer accepts an RR argument
- `computeMilestones` no longer accepts an RR argument
- `ProbabilityCone` no longer accepts `rewardRatio`
- milestone roadmap, probability cone, geometric growth, recovery math, and win/loss streak scenarios all derive reward from `TARGET_RR`

Important caveat:

- existing historical trade rows were not automatically rewritten; they keep their recorded P&L unless a deliberate migration is requested

## Current Product Truth

### What is seamless now

- open the generic app link and land on Home
- log trades from desktop or phone
- new trades require a manually entered profit/loss amount
- save and sync in the background
- use one shared backend vault without pasting sync links
- manually trigger sync without covering content: desktop uses a compact sidebar sync button, and mobile uses a compact floating sync button above the bottom nav
- Analysis tabs use shorter mobile labels (`Perf`, `Behavior`, `Proj`) so narrow phones do not clip the Projections tab

### What is still not fully perfect

- custom domain is not set
- JS bundle is still heavy
- screenshots/images are still browser-local `IndexedDB`, not cloud-synced
- settings are still stored in browser `localStorage`

## Critical Domain / URL Research Outcome

The safest way to change the front-facing URL further is:

1. attach a custom domain/subdomain to the current Pages project
2. let old and new URLs coexist during transition
3. only redirect the old `pages.dev` URL later if acceptable

Why this matters:

- trade rows are safe because they go to the shared sync backend
- browser settings are origin-bound
- screenshot blobs are origin-bound because they live in `IndexedDB`

So a custom domain is possible, but a hard immediate redirect can strand old browser-local screenshots/settings.

## Files That Matter Most

If a new session needs the core architecture fast, start here:

- [src/components/App.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/App.jsx)
- [src/components/TradeEntry.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/TradeEntry.jsx)
- [src/components/Settings.jsx](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/components/Settings.jsx)
- [src/store/trades.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/store/trades.js)
- [src/sync.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/sync.js)
- [src/utils/tradeData.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/src/utils/tradeData.js)
- [worker/src/index.js](/Volumes/Storage8TB/projects/20k-10mil-challenge/worker/src/index.js)

## Docs To Read Next

- [docs/2026-04-16-cloudflare-handoff.md](/Volumes/Storage8TB/projects/20k-10mil-challenge/docs/2026-04-16-cloudflare-handoff.md)
- [docs/2026-04-16-rebuild-plan.md](/Volumes/Storage8TB/projects/20k-10mil-challenge/docs/2026-04-16-rebuild-plan.md)
- [docs/2026-04-16-hyper-audit-notes.md](/Volumes/Storage8TB/projects/20k-10mil-challenge/docs/2026-04-16-hyper-audit-notes.md)

## Resume Priorities For A New Session

### Highest priority

1. verify live behavior again on phone + desktop using `https://tradevault-b7t.pages.dev`
2. confirm whether screenshot sync should remain local or be moved to cloud storage
3. decide whether a custom domain should be attached now

### If custom domain work resumes

1. identify the exact owned domain/subdomain to use
2. attach it to the existing Pages project instead of creating a new project
3. do not force redirect old URLs until image/settings migration risk is accepted or solved

### If product workflow work resumes

1. improve performance/code splitting further
2. keep refining mobile trade capture
3. consider cloud image sync only after text/trade sync stays stable

## Verification Already Performed

- `npm run build` passed after the latest sync/UX changes
- `npm run build` passed after the fixed-RR model API hardening
- `npm run build` passed after moving the sync control out of the top-right overlay
- `npm run deploy:cloudflare` succeeded multiple times
- `npm run deploy:cloudflare` succeeded for exact deployment `https://f6062696.tradevault-b7t.pages.dev`
- `npm run deploy:cloudflare` succeeded for exact deployment `https://8346dfab.tradevault-b7t.pages.dev`
- `npm run deploy:cloudflare` succeeded for exact deployment `https://ff8bb395.tradevault-b7t.pages.dev`
- Browser Use local verification confirmed Log Trade has no saved-draft banner, uses `Profit / Loss Amount`, starts with blank `0.00`, and enables save only after typing a manual amount.
- `npm run build` passed after removing saved drafts and manualizing P&L entry.
- `npm run deploy:worker` succeeded for Worker version `4fe71140-d2f8-4250-ae0a-a54c54eff246`.
- `npm run deploy:cloudflare` succeeded for exact deployment `https://ee8cb290.tradevault-b7t.pages.dev`.
- `curl` verified the root Pages URL and exact deployment both serve `assets/index-BFDcbNjd.js` and `assets/index-VlDr1YSI.css`.
- `curl` verified the live `TradeEntry-BnZaVquV.js` chunk contains the manual `Profit / Loss Amount` copy.
- Safari browser verification confirmed the app opens to the mountain Home screen instead of the old sync gate
- `curl` verified the root Pages URL now returns `200`
- `curl` verified the root Pages URL and exact deployment both serve `assets/index-Dp45ilhf.js`
- `curl` verified the root Pages URL and exact deployment both serve `assets/index-fI3kn5sE.js`
- node math sanity confirmed `$20K` with one win becomes `$40K`, while higher equity levels still follow the 2/3 Power Decay risk curve
- Safari live verification confirmed the trade-save regression is fixed on the deployed root URL
- live worker verification confirmed stale one-trade overwrite attempts now preserve newer cloud state

## Known Important Constraints

- This is intentionally an internal single-user app
- the user wants sync everywhere, not local-only
- the user wants the visual monument preserved
- the user wants mobile to feel seamless and frictionless
- the user does not want to paste sync links repeatedly

## Git / Working Tree Notes

- there are many meaningful source changes in this repo from the audit + rebuild work
- this was not a one-file tweak; it was a large architecture + UX tranche
- if preserving work is the priority, committing the current state is appropriate

## One-Sentence Recovery Prompt

If a brand-new assistant session starts cold, the best opening instruction is:

`Read docs/2026-04-16-session-recovery-handoff.md first, then continue from the current Cloudflare-first TradeVault state with the root live URL https://tradevault-b7t.pages.dev and the always-on sync architecture already in place.`
