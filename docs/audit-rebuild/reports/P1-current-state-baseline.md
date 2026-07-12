# P1 Factual Current-State Baseline

Status: `EVIDENCE_READY_FOR_G1`

Captured: 2026-07-12, America/Los_Angeles

## What the Product Is Today

TradeVault is a single-page React trading journal and position-risk dashboard. Its
primary operating loop is:

1. open Home and inspect equity/next risk/progress
2. open a bottom sheet and manually enter realized P&L plus optional journal detail
3. persist locally, then attempt background cloud synchronization
4. review History, behavioral/performance analytics, and model projections

The visual identity is a summit monument. The current product truth remains the old
`$20K -> $10M`, fixed 1:1 gross-RR, piecewise 2/3-power-decay challenge despite the
owner's selected future truth being `$100K -> $10M` with a new smooth curve.

## What Is Actually Deployed

The public Pages HTML exactly equals tracked `dist/index.html`. After replacing only
generated lazy-chunk hashes, the live main JavaScript is byte-identical to a fresh
build from current source. The live CSS rule set is fully contained in the fresh
build; eleven extra local rules were introduced by audit-tooling content discovery.

This verifies the source/live baseline without executing the production app or its
automatic Worker sync.

## Current Architecture

- React 19 state-switched shell with four views and no URL router
- 15 components; six files own most UI/data/model responsibilities
- trade/settings/sync/activity state spread across four localStorage keys
- screenshot blobs in local IndexedDB
- one public Cloudflare Worker and one fixed Workers KV key for all devices
- local-last-write plus per-UID timestamp/tombstone merge
- no authentication, transactional outbox, server revision, or conflict UI
- no tests, lint, typecheck, or schema contract package

Settings and image blobs do not sync. Historical risk fields are not immutable; the
app recalculates them from the currently imported formula whenever data loads or
changes.

## Evidence Scale

- 33 runtime source files / 7,224 lines read
- 250 locked package entries inventoried
- 108 import/export records mapped
- every primary surface and source-defined state inventoried
- 17 deterministic data fixtures
- 71 raw visual captures after the late 500-History capture
- all 13 planned viewport classes represented
- 26 of 30 state IDs visually represented; four gaps explicitly recorded
- production build, local runtime, 500-trade scale, geometry/name, contrast, console,
  and request-count baselines preserved
- current standards baseline across W3C/WAI, WebKit, Chrome, Web Vitals, React, Vite,
  Cloudflare, and browser storage

## Factual Failure Baseline

P1 opened six Critical and eleven High product findings. The highest-consequence
facts are:

- daily-loss gate activation crashes the entire app
- failed sync can continue to display a stale `Synced` claim
- two devices can merge duplicate numeric IDs that make edit/delete ambiguous
- the current formula rewrites historical risk and R-multiple truth
- screenshots/settings are incomplete across devices
- undo can return after cloud merge
- one save launches competing sync operations
- the unauthenticated shared vault has no user/data boundary
- Workers KV is eventually consistent, limited to one write/second per key, and not
  transactional, contradicting the UI's seamless-sync semantics
- break-even is simultaneously a loss in statistics and a win in History
- 500 History cards create 8,185 DOM elements / 39,961 px scroll height
- mobile control naming, target sizing, contrast, chart lifecycle, asset delivery,
  and automated quality gates are below the defined baseline

P1 does not choose solutions. P3-P8 own independent domain audits; P9 owns
confluence and prioritization.

## Explicit Evidence Gaps

- no physical iOS Safari or Android Chrome run
- no genuine virtual-keyboard capture
- no workflow video recorder in the available browser surface
- no reliable uncached lazy-loader screenshot after modules were warmed
- no field p75 Web Vitals, INP, memory, thermal, or battery proof

These gaps are indexed rather than treated as successful tests. They do not prevent
G1 completeness if the gate confirms every missing proof has an owner and no design
claim relies on it.

## Baseline Integrity

- protected original tree: `c41314cdedb14c64e64386cbce7534de9a2002d5`
- tracked application-source diff during P1: empty
- production Worker writes: zero
- Fable 5 executions: zero
- prototype code/deployment: zero
- final P1 raw manifest: 141 substantive artifacts, all verified
- final P1 manifest SHA-256:
  `b16cf5b6ae166a130b9aeeecb6b3e2b85ab05b8418ff27e7e339bdbcb9806192`

This report is a factual baseline, not a redesign verdict or production-readiness
approval.
