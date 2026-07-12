# TradeVault Rebuild Plan

Date: 2026-04-16
Scope: full rebuild strategy derived from blind audit
Constraint updates from owner:

- Keep the visual monument.
- Keep sync everywhere.
- Do not delete cosmetic risk settings.
- Optimize aggressively for mobile.
- Favor a world-class internal tool over a simplified public-product compromise.

## North star

Build the strongest possible private trading operating system for the `$20K -> $10M` challenge:

- visually mythic on the surface
- operationally ruthless underneath
- sync-first, not sync-optional
- mobile-dominant
- emotionally motivating without compromising data truth
- maintainable enough to evolve for years

## Reframed product strategy

The correct target is not "strip the monument away."
The correct target is:

- keep the monument
- make it fast
- make it useful
- make it honest
- make it secondary to execution when execution matters

That means the app should feel like:

- a trading command center first
- a personal challenge monument second
- a reliable cross-device system always

## Product principles

### 1. Monument plus machine

- Preserve the summit identity, mountain narrative, milestones, and ceremonial feel.
- Rebuild them as a thin experience layer over a stronger execution engine.
- Decorative UI must never obscure:
  - current equity
  - next-action prompts
  - risk state
  - journaling workflow
  - recent mistakes
  - progress against plan

### 2. Sync is a core capability

- Every major workflow should assume multiple devices.
- Sync must stop behaving like blind blob overwrite.
- The system should tolerate:
  - same-day use on phone and desktop
  - offline edits
  - reconnects
  - conflicts
  - partial failures

### 3. Soft controls and hard controls

- Keep cosmetic and motivational risk settings.
- Separate them into two classes:
  - soft controls: awareness, ritual, warnings, overlays, friction, countdowns, visual cues
  - hard controls: true gates, caps, forced confirmations, locked actions, policy enforcement
- Never let a soft control masquerade as a hard one.

### 4. Mobile is the primary battlefield

- One thumb
- low latency
- low cognitive load
- high repeat frequency
- excellent recovery from interruption

### 5. Internal tool standards

- optimize for speed over onboarding
- optimize for honesty over marketing polish
- optimize for owner taste over public consensus
- optimize for future extensibility over quick hacks

## Master rebuild tracks

This should be built as parallel tracks with tight boundaries so work does not overlap.

### Track A: Platform and truth

- sync architecture
- persistence model
- date handling
- import/export
- image lifecycle
- versioning
- migration system
- build/test/release rigor

### Track B: Mobile workflow engine

- log trade flow
- edit/delete/archive
- fast filters
- review cadence
- progress tracker
- daily execution loop
- interruption handling

### Track C: Monument experience

- home dashboard
- summit tracker
- challenge progression
- celebrations
- animated atmosphere
- visual identity
- motivation layer

### Track D: Intelligence and review

- analytics
- checkpoints
- mistake detection
- streak interpretation
- weekly/monthly reviews
- actionable coaching loops

### Track E: Codebase architecture

- feature modularization
- component extraction
- shared hooks/services
- state ownership
- design tokens
- documentation and project structure

## Phase plan

## Phase 0: Foundation lock

Goal:
Freeze the current truth, define architecture rules, and stop adding accidental complexity.

Deliverables:

- formal architecture map
- data contract for trades/settings/sync payloads
- versioning plan for data schema
- naming conventions for features/components/services
- design token inventory
- migration and release checklist

Required changes:

- remove backup file clutter from `src/` after preserving only one canonical stylesheet path
- align docs with reality
- define source-of-truth docs for:
  - architecture
  - sync contract
  - UI system
  - build/release

Success criteria:

- one documented truth for each major system
- no ambiguous "current version" state
- no fake architectural claims like "no backend"

## Phase 1: Sync rebuild

Goal:
Turn sync from bearer-key overwrite storage into a resilient cross-device system.

What changes:

- replace naive last-write-wins with record-aware merge behavior
- add sync metadata per dataset and per trade
- introduce revision IDs
- introduce client instance IDs
- support safe pull/push cycles
- detect and surface conflicts explicitly

Recommended sync model:

- app-level dataset revision
- per-trade `updatedAt`
- per-trade `deletedAt`
- per-device `clientId`
- conflict log for unresolved collisions

Behavior rules:

- new trade created on two devices should merge
- same trade edited on two devices should trigger conflict policy
- deletion must propagate safely
- cloud writes must not silently nuke newer local edits

Minimum backend upgrades:

- request validation
- payload size guardrails
- origin restrictions or signed requests
- revision preconditions
- optional audit metadata

UX requirements:

- sync status visible but not noisy
- last good sync timestamp
- pending changes indicator
- conflict inbox, not silent overwrite
- offline mode badge

Success criteria:

- no silent destructive overwrite in normal multi-device use
- user can trust phone and desktop together

## Phase 2: Data truth rebuild

Goal:
Make data handling boring, deterministic, and hard to corrupt.

What changes:

- store local calendar dates as local dates, not UTC-massaged ISO hacks
- define canonical trade model
- run all imports through migration
- wire image cleanup to delete and clear flows
- add schema migration versioning

Trade model improvements:

- stable `id`
- `createdAt`
- `updatedAt`
- `deletedAt`
- local `tradeDate`
- local `openDate`
- derived timestamps only when truly needed
- explicit attachments array with metadata

Image system improvements:

- map image ownership to trade IDs
- garbage collect orphaned blobs
- batch preview loading
- attachment limits and compression policy

Export/import improvements:

- deterministic JSON export version
- richer CSV export
- import validation report
- dry-run import preview

Success criteria:

- deleting data actually deletes data
- imported data is normalized
- date-based stats are locally correct

## Phase 3: Mobile trade capture v2

Goal:
Make logging unbelievably fast without removing power.

New philosophy:

- primary path is ultra-short
- advanced path expands progressively
- repeated logging should feel frictionless

Primary capture flow:

1. P&L
2. win/loss
3. long/short
4. ticker
5. trade date
6. one-tap setup tags
7. save

Secondary layers:

- strategy/sizing
- emotion and mistake tags
- notes
- attachments
- MAE/MFE
- entry/exit time

Mobile upgrades:

- larger thumb targets
- one-handed sheet interactions
- sticky save bar
- smart defaults from recent behavior
- recent tickers
- recent tag clusters
- duplicate last trade
- save-and-add-another mode

Trade management upgrades:

- explicit delete
- duplicate
- archive/restore
- bulk tagging
- bulk delete
- undo stack with visible history

Success criteria:

- normal trade entry feels sub-10-second fast
- edit/delete actions are obvious
- no important action depends on hidden tap-anywhere behavior

## Phase 4: Home monument v2

Goal:
Keep the monument, but transform it into a high-performance command dashboard.

Keep:

- mountain
- summit path
- milestone mythology
- atmospheric motion
- ceremonial celebrations

Change:

- separate decorative layer from tactical layer
- lazy-load heavy visuals
- reduce initial bundle impact
- put operational priority blocks above ornamental depth when needed

Home screen structure:

1. tactical strip
   - equity
   - sync state
   - next trade risk
   - current streak
   - daily result
2. action strip
   - log trade
   - review mistakes
   - continue session
3. monument panel
   - summit tracker
   - progress visualization
   - milestone atmosphere
4. checkpoint panel
   - next checkpoint
   - current rules
   - recent behavioral warning

Monument rules:

- animation should support focus, not steal it
- dramatic states should correspond to real milestones or risk states
- copy should be sharper and less generic fantasy language

Success criteria:

- home feels legendary and useful
- first screen tells the truth instantly

## Phase 5: Risk system redesign

Goal:
Keep all risk settings, but make the system legible.

New structure:

- hard controls
  - enforceable daily loss lock
  - enforceable max risk cap
  - enforceable tilt lock modes
- soft controls
  - drawdown warnings
  - ceremony overlays
  - cooldown reminders
  - visual severity shifts
  - checkpoint warnings

Required UI change:

- every setting must be labeled as `Hard` or `Soft`
- every warning must state whether it blocks or simply informs

Additional risk features:

- session mode presets
- pre-trade checklist
- post-loss protocol
- streak state monitor
- drawdown regime change visuals

Success criteria:

- user always knows what is cosmetic versus enforced
- no misleading control surface

## Phase 6: Review engine and checkpoints

Goal:
Turn the app into a compounding feedback machine, not just a ledger.

New systems:

- daily checkpoint
- weekly checkpoint
- milestone checkpoint
- drawdown checkpoint
- behavior breach checkpoint

Each checkpoint should answer:

- what happened
- what changed
- what is degrading
- what is improving
- what rule should change today

Suggested review modules:

- today's execution score
- current streak diagnosis
- mistake recurrence tracker
- tag drift tracker
- hold-time drift
- expectancy trend
- setup leaderboard
- confidence versus outcome review

Progress tracker redesign:

- challenge progress
- session progress
- recovery progress after drawdown
- discipline score
- consistency streak

Success criteria:

- app produces decision-useful feedback, not just charts

## Phase 7: Telegram and external reporting layer

Goal:
Support external accountability and quick-glance updates without compromising the internal core.

Possible Telegram features:

- daily summary card
- milestone unlock card
- drawdown warning card
- weekly review digest
- sync conflict alert

Visual requirements for Telegram:

- portrait-friendly
- bold headline numbers
- dark-branded monument aesthetic
- concise copy
- one insight per card

Output modes:

- manual share
- scheduled summary
- event-triggered summary

Do not build until core truth systems are stable.

## Phase 8: Frontend architecture split

Goal:
Make the codebase evolvable.

Target structure:

```text
src/
  app/
    AppShell.jsx
    routes.js
    providers/
  features/
    home/
    trades/
    analysis/
    settings/
    sync/
    checkpoints/
  entities/
    trade/
    settings/
    sync/
  shared/
    ui/
    hooks/
    lib/
    styles/
    icons/
  services/
    storage/
    sync/
    analytics/
    export/
```

Refactor rules:

- no giant screen files above roughly 250 to 350 lines unless there is a strong reason
- derived data lives in selectors/services, not screen bodies
- screen components orchestrate; they should not own every concern
- animations isolated from business logic

Success criteria:

- features can be changed without spelunking giant files

## Phase 9: Performance and delivery

Goal:
Make the app feel instant enough to deserve daily use.

Performance targets:

- much smaller initial JS bundle
- route- or feature-level code splitting
- lazy monument assets
- lazy analytics modules
- preloaded critical mobile UI only

Specific interventions:

- move base64 image out of code
- compress/serve real assets
- split Home monument sublayers
- split Analysis visualizations
- avoid loading everything on first paint

Operational upgrades:

- add lint
- add tests for data model and sync merge logic
- add build budget checks
- add release notes discipline

Success criteria:

- dramatically improved first load
- stable confidence in releases

## Execution order

Recommended macro order:

1. Phase 0 foundation lock
2. Phase 1 sync rebuild
3. Phase 2 data truth rebuild
4. Phase 3 mobile trade capture v2
5. Phase 5 risk system redesign
6. Phase 4 home monument v2
7. Phase 6 review engine and checkpoints
8. Phase 8 frontend architecture split
9. Phase 9 performance and delivery
10. Phase 7 Telegram layer

Reason:

- trust first
- then speed
- then clarity
- then spectacle refinement
- then intelligence
- then external surfaces

## Non-overlap rules

To avoid messy rebuild overlap:

- sync contract work must finish before broad settings or analytics rewrites depend on it
- trade model work must finish before Telegram/report exports are rebuilt
- mobile trade-entry redesign must define canonical actions before Home CTA redesign
- architecture extraction must follow settled behavior, not precede it
- Telegram should consume stable review outputs, not invent parallel logic

## First implementation tranche

If starting immediately, the first real build tranche should be:

### Tranche 1A

- data contract spec
- sync revision model
- local date model
- import migration pipeline
- image ownership and cleanup

### Tranche 1B

- new sync status surface
- conflict handling UX
- hard vs soft risk labeling

### Tranche 1C

- trade entry v2 wireflow
- delete/duplicate/archive
- sticky mobile save bar
- recent ticker and recent tags

### Tranche 1C progress

- completed:
  - explicit delete flow in trade entry
  - duplicate-last-trade launch point
  - recent ticker shortcuts
  - recent setup-tag shortcuts
  - `Save & Add Another` repeated-entry path
  - visible sync-status pill in app shell
  - first code-splitting cut for non-home surfaces
  - shared sync-status helpers and reusable pill component
  - sync activity timeline in Settings
  - Cloudflare-ready default base path
  - repo deploy script for Cloudflare Pages
- still ahead:
  - richer conflict-resolution UI
  - bulk edit / archive flows
  - feature-module extraction and code-splitting

## Final target state

When rebuilt correctly, the project should feel like this:

- You open it and instantly know your true state.
- You can log a trade in seconds from your phone.
- You trust that sync is not eating your data.
- The monument still feels epic, but it now amplifies discipline instead of distracting from it.
- Warnings are honest.
- Reviews are actionable.
- The codebase is strong enough to keep compounding for years.

## Latest progress snapshot

- Cloudflare Pages frontend is live.
- Cloudflare Worker sync backend is live.
- The app now opens directly to Home instead of a sync gate.
- Sync now uses one always-on shared vault for this internal app.
- Saved trade drafts have been removed by owner request.
- New trade P&L starts blank and must be typed manually instead of auto-filling from 1R.
- Existing trades auto-save while editing.
- Background sync is now adaptive:
  - `15s` while trade entry is open
  - `30s` while browsing in the foreground
  - immediate sync on save/edit/focus return
  - no interval polling while backgrounded
- Cloudflare Pages production branch was corrected to `master`.
- Canonical live URL is now `https://tradevault-b7t.pages.dev`.
- Latest exact deployment is `https://ee8cb290.tradevault-b7t.pages.dev`.
- Active risk truth is now consistently enforced in the model layer: 2/3 Power Decay sizing with fixed `1.0:1` RR via `TARGET_RR`.
- Monte Carlo, milestone projections, probability cone, streak math, and geometric growth no longer accept variable RR inputs.
- Persistent sync status moved out of the top-right content overlay; desktop now uses a compact sidebar control, mobile uses a compact floating control above the bottom nav, and Analysis tabs use short mobile labels.
