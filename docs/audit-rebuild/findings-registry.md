# Audit Findings Registry

This file owns evidence-backed findings and their lifecycle. A finding is not closed
by confidence or a proposed fix; closure requires the stated validation evidence.

## P0 Findings

### F-OPS-HIGH-001: Raw audit evidence was not excluded from Git

- Domain: operations/privacy
- Severity: High
- Frequency: every audit capture before mitigation
- Impact: raw screenshots, metrics, private context, or sealed Fable output could be
  staged accidentally
- Evidence: `EV-P0-CMD-004`; pre-fix `git check-ignore` returned no rule
- Root cause: `.gitignore` protected checkpoint artifacts but not
  `output/audit-rebuild/`
- Action: added the exact `output/audit-rebuild/` ignore boundary before evidence
  capture
- Validation: `git check-ignore -v` resolves the new rule and raw evidence remains
  absent from tracked-source diffs
- Status: `CLOSED_FOR_P0`
- Closure evidence: G0 gate report

### F-SYNC-CRITICAL-001: Unguarded local app boot can contact production sync

- Domain: sync/isolation
- Severity: Critical
- Frequency: every ordinary app boot while online
- Impact: audit interactions can read, merge, or write the shared production dataset
- Evidence: `src/sync.js` hardcodes the production Worker; `src/components/App.jsx`
  starts boot sync and periodic sync; `EV-P0-CMD-004` observed three intercepted
  requests during isolation proof
- Root cause: no environment-specific sync adapter or production-endpoint guard
- P0 containment: committed Vite head-prepend guard intercepts the exact production
  Worker origin and substitutes an in-memory fixture before React loads
- Validation: DOM marker `tradevault-audit-mode=isolated`, intercepted request count,
  and unchanged tracked application-source diff
- Status: `MITIGATED_FOR_AUDIT_OPEN_FOR_PRODUCT`
- Full owner phase: P6 contract/sync audit, P10 prototype architecture, P11 guard
  implementation
- Reopen trigger: any automated workflow begins without asserting the isolation
  marker, or any request reaches the production Worker

## P1 Data and Model Findings

### F-DATA-CRITICAL-001: Concurrent devices can create ambiguous trade IDs

- Domain: data identity and mutation safety
- Severity: Critical
- Evidence: `EV-P1-DATA-001`; `addTrade` allocates local max `id + 1`, merge keys by
  `uid`, while edit/delete and rendered list keys use `id`
- Impact: two valid merged trades can share one ID; edit/delete can target the wrong
  record and React can reuse the wrong row/card
- Status: `OPEN`
- Full owner phase: P6.2-P6.3
- Closure evidence: UID-only mutation/render contract plus concurrent-device tests

### F-MODEL-CRITICAL-001: Current formula silently rewrites historical risk truth

- Domain: model/data lineage
- Severity: Critical
- Evidence: `EV-P1-DATA-001`; `recalcTradeChain` overwrites every trade's risk and
  phase during load and every persisted mutation
- Impact: changing the formula changes historical R-multiples, analytics, exports,
  and displayed decisions without preserving what was known at execution time
- Status: `OPEN`
- Full owner phase: P7.4-P7.5
- Closure evidence: versioned immutable execution snapshot and migration/parity tests

### F-SYNC-CRITICAL-002: The primary cloud vault is unauthenticated and shared

- Domain: data boundary
- Severity: Critical
- Evidence: `EV-P1-DATA-001`; fixed `tradevault-main` key, public GET/PUT, reflected
  Origin, and no credential or authorization check
- Impact: any party that knows the Worker URL and key can read or modify the same
  dataset used by every device
- Status: `OPEN`
- Full owner phase: P6.1 and P6.5 informational threat/operations review
- Closure evidence: explicit owner-approved access boundary and negative API tests

### F-SYNC-HIGH-003: Cloud sync excludes screenshot binaries and settings

- Domain: cross-device completeness
- Severity: High
- Evidence: `EV-P1-DATA-001`; trades sync image keys, while blobs remain in local
  IndexedDB and settings remain in a separate localStorage key
- Impact: another device cannot display attached screenshots and can calculate or
  present the same account under different local settings
- Status: `OPEN`
- Full owner phase: P6.1-P6.4
- Closure evidence: approved synced/local field contract and cross-device scenarios

### F-SYNC-HIGH-004: Undo can be resurrected by a later cloud merge

- Domain: deletion lifecycle
- Severity: High
- Evidence: `EV-P1-DATA-001`; undo removes a trade without a tombstone, while merge
  unions all non-tombstoned UIDs
- Impact: an apparently undone trade can return after interval, focus, boot, or
  manual sync
- Status: `OPEN`
- Full owner phase: P6.2-P6.3
- Closure evidence: explicit undo semantics and deterministic merge tests

### F-SYNC-HIGH-005: A single mutation launches competing sync operations

- Domain: sync ordering and efficiency
- Severity: High
- Evidence: `EV-P1-DATA-001`; `persist` starts a cloud PUT and App immediately starts
  a pull/merge sync after save, edit, autosave, or delete
- Impact: redundant traffic and race-sensitive feedback can report success against
  a different ordering than the user mutation
- P3 workflow impact: `EV-P3-MET-001` observed equity updated by 100 ms while Trade
  Entry remained locked at 2,600 ms and closed only after roughly 5,300 ms under a
  deterministic 2.5-second/request delay; the accepted local action waits on two
  added Worker requests before releasing the sheet
- Status: `OPEN`
- Full owner phase: P6.2-P6.4
- Closure evidence: serialized mutation queue/outbox tests and truthful UI states

### F-MODEL-HIGH-002: Break-even outcome semantics conflict across the app

- Domain: outcome truth
- Severity: High
- Evidence: `EV-P1-DATA-001`; statistics/streaks classify `pnl <= 0` as loss, while
  Trade History uses `pnl >= 0` as win
- Impact: the same zero-P&L trade can increase losses and a loss streak while being
  colored and signed as a win
- Status: `OPEN`
- Full owner phase: P7.2-P7.3
- Closure evidence: one canonical outcome enum and parity tests across all consumers

### F-FE-CRITICAL-001: Daily-loss safeguard crashes the entire application

- Domain: frontend runtime and risk-control resilience
- Severity: Critical
- Evidence: `EV-P1-IMG-001`; daily-limit fixture produces a white screen and
  `ReferenceError: fmt is not defined at App`
- Root cause: the conditional daily-limit overlay calls `fmt` without importing it
- Impact: the safeguard fails exactly when the configured loss threshold is crossed,
  removing navigation, history, and recovery controls
- Status: `OPEN`
- Full owner phase: P5.4, P8.5, and P11 core workflow implementation
- Closure evidence: regression test that renders and exercises both risk-gate variants

### F-SYNC-CRITICAL-006: Network failure is presented as a stale synchronized state

- Domain: sync truth and recovery
- Severity: Critical
- Evidence: `EV-P1-IMG-001`; all audit Worker calls returned 503 while the global
  control continued to report `Synced 2m ago`, including after manual sync
- Root cause: `syncFromCloud` returns `error`, but `runSync` only sets error state on
  thrown exceptions and sends other result strings through its ready fallback
- Impact: the user can leave or switch devices believing changes are durable when
  the app has direct evidence that synchronization failed
- Status: `OPEN`
- Full owner phase: P6.4 and P8.5
- Closure evidence: forced GET/PUT failure tests with persistent, actionable error UI

### F-PERF-HIGH-001: Initial delivery ships redundant monument assets and an oversized main chunk

- Domain: delivery performance
- Severity: High
- Evidence: `EV-P1-MET-001`; 9.132 MiB logical build, 810.39 kB main JS, 8.1 MB
  public PNG, 452 kB public JPEG, and another embedded JPEG in Home
- Impact: avoidable download/decode/cache cost on the mobile-only primary platform
- Status: `OPEN`
- Full owner phase: P5.4 and P8.1
- Closure evidence: production build budget and repeatable mobile load comparison

### F-PERF-HIGH-002: History renders the entire dataset without a scale boundary

- Domain: dataset/render scaling
- Severity: High
- Evidence: `EV-P1-MET-002`; 500 trades create 8,185 DOM elements and a 39,961 px
  scroll surface
- Impact: render, memory, accessibility-tree, scroll, and interaction cost grows
  directly with account history
- Status: `OPEN`
- Full owner phase: P5.4 and P8.2
- Closure evidence: approved pagination/windowing boundary and scale-budget tests

### F-A11Y-HIGH-001: Core mobile controls miss target-size and naming baselines

- Domain: accessibility and mobile interaction
- Severity: High
- Evidence: `EV-P1-MET-003`; 43/79 visible M04 controls under 44 px in at least one
  dimension and 19 without a detected programmatic name
- Impact: precision tapping and screen-reader ambiguity in frequent workflows
- P8 confirmation: `EV-P8-A11Y-003` manually confirms unassociated labels, unnamed
  icon controls, missing dialog semantics, and no chart alternatives
- Status: `OPEN`
- Full owner phase: P4.4 and P8.3
- Closure evidence: manual association audit plus scanner and target-geometry pass

### F-A11Y-HIGH-002: Secondary and analytical text repeatedly misses contrast thresholds

- Domain: visual accessibility
- Severity: High
- Evidence: `EV-P1-MET-003`; bounded scan failures were 8/22 Home, 13/21
  Projections, and 21/33 Settings, with Settings samples as low as 2.27:1
- Impact: assumptions, limits, labels, and navigation become difficult to read on a
  mobile display despite being decision-critical
- Status: `EXPERIMENT_REQUIRED`
- Full owner phase: P4.2-P4.3 and P8.3
- Closure evidence: token-level contrast remediation and scanner/manual verification

### F-FE-HIGH-002: Charts repeatedly mount with invalid container dimensions

- Domain: frontend rendering
- Severity: High
- Evidence: `EV-P1-MET-003`; repeated Recharts warnings report width/height `-1`
- Impact: noisy diagnostics and risk of blank, mismeasured, or unstable charts during
  lazy view transitions
- Status: `OPEN`
- Full owner phase: P5.4 and P8.1
- Closure evidence: zero-warning chart lifecycle tests across view transitions

### F-OPS-HIGH-002: The repository has no automated quality gate

- Domain: engineering operations
- Severity: High
- Evidence: `EV-P1-MET-001`; package scripts expose build/deploy only, with no test,
  lint, or typecheck command
- Impact: model, sync, migration, runtime, and UI regressions can deploy without an
  executable precondition
- Status: `OPEN`
- Full owner phase: P5.5, P7.5, and P11-P12
- Closure evidence: CI-enforced test/lint/typecheck/build gates with required suites

### F-SYNC-CRITICAL-007: Workers KV cannot provide the sync semantics the UI promises

- Domain: backend storage architecture
- Severity: Critical
- Evidence: `EV-P1-SRC-004`; Cloudflare documents one write/second to the same key,
  eventual consistency with 60-second-or-longer stale visibility, and no atomic
  read/write transaction support
- Current exposure: all devices share one key; save/autosave can overlap writes and
  immediately read to "confirm" them
- Impact: rate-limited writes, stale merges, and false durability are possible even
  when daily free quotas are not exhausted
- Status: `OPEN`
- Full owner phase: P6.1-P6.4 and P10.4
- Closure evidence: owner-approved consistency architecture with provider-level
  concurrency, failure, and cross-location tests

### F-DATA-HIGH-002: Local persistence is treated as unconditional durability

- Domain: browser storage lifecycle
- Severity: High
- Evidence: `EV-P1-SRC-004`; browser storage is origin-scoped, policy-dependent,
  quota-bound, and best-effort/evictable unless persistence is granted
- Current exposure: localStorage/IndexedDB exceptions are mostly swallowed and the
  UI can still say a trade is saved locally
- Impact: quota, policy, domain, private-mode, or eviction events can invalidate the
  user's assumed recovery copy without actionable feedback
- Status: `OPEN`
- Full owner phase: P6.3-P6.4 and P8.5
- Closure evidence: explicit durability state machine and storage-failure tests

## P3 Product and Workflow Findings

### F-UX-HIGH-001: A new trade silently defaults to a winning long outcome

- Domain: repeated trade-capture correctness
- Severity: High
- Frequency: every new trade entry
- Evidence: `EV-P3-SRC-001`, `EV-P3-MET-001`; Trade Entry initializes `isWin=true`
  and `direction=long`, and the deterministic basic-win path accepted only an amount
- Impact: a missed outcome/direction decision can record a loss as a win, changing
  equity, streaks, drawdown, progress, projections, and every later risk calculation
- Distinction: this is input-decision integrity, not the separate zero-P&L semantic
  conflict in `F-MODEL-HIGH-002`
- Status: `OPEN`
- Full owner phase: P3.3, P7.3, P10.2, and P11.3
- Closure evidence: explicit outcome selection or signed-P&L contract plus tests that
  prohibit accidental default submission for win, loss, and break-even

### F-IA-HIGH-001: Navigation and analysis context exist only in transient component state

- Domain: information architecture and interruption recovery
- Severity: High
- Frequency: every destination switch, reload, browser Back action, or interrupted
  analysis task
- Evidence: `EV-P3-SRC-002`, `EV-P3-MET-002`; destination URL never changes,
  Behavior resets to Performance after leaving, Projections reloads to Home, and
  Home scroll returned from 602 px to the top
- Impact: mobile interruption and task switching discard the user's location,
  filter/subtab context, and navigation history; browser/hardware Back cannot express
  in-app navigation
- Status: `OPEN`
- Full owner phase: P3.3, P5.2-P5.3, P10.1-P10.2, P11.2
- Closure evidence: route/state restoration contract and reload/Back/tab-switch tests

### F-IA-HIGH-002: Destination ownership is blurred by repeated actions and summaries

- Domain: information architecture and cognitive load
- Severity: High
- Frequency: every Home/History/Analysis review cycle
- Evidence: `EV-P1-SRC-003`, `EV-P3-SRC-002`; capture appears in at least five
  affordances, performance in three destinations, and equity/progress/risk/sync
  objects each span multiple surfaces
- Impact: scanning cost grows while the app lacks one explicit post-action change
  summary; users must decide which copy is authoritative and where to continue
- Status: `OPEN`
- Full owner phase: P3.4, P4.1, P10.1-P10.2
- Closure evidence: approved destination ownership matrix plus task tests showing
  each repeated representation answers a distinct, evidenced question

### F-UX-HIGH-002: Explicit delete cannot be recovered by the adjacent Undo action

- Domain: destructive-action integrity
- Severity: High
- Frequency: every explicit trade deletion
- Evidence: `EV-P3-SRC-003`, `EV-P3-MET-003`; deleting an edited record removed it
  immediately, while `undoLastTrade` only removes the last added trade and has no
  deleted-record recovery payload
- Impact: the interface implies a nearby recovery path that would instead delete a
  different valid record; an accidental delete is irreversible
- Distinction: `F-SYNC-HIGH-004` concerns cloud resurrection of an undone addition,
  not recovery of an explicit deletion
- Status: `OPEN`
- Full owner phase: P5.2-P5.3, P6.2-P6.3, P10.2, P11.4
- Closure evidence: object-specific reversible delete/tombstone contract and tests
  proving Undo restores exactly the deleted UID across local and cloud state

### F-UX-HIGH-003: Trade history has no scalable record-search path

- Domain: journal retrieval
- Severity: High
- Frequency: every attempt to retrieve an old or partially remembered record
- Evidence: `EV-P1-MET-002`, `EV-P3-MET-003`; 500 records produce a 39,961 px
  surface, while the journal offers categorical filters but no text, notes, date, or
  range search
- Impact: review cost increases with account lifetime and a record cannot be found
  from the details most likely to be remembered
- Status: `OPEN`
- Full owner phase: P3.4, P5.3-P5.4, P8.2, P10.1-P10.2, P11.4
- Closure evidence: indexed search/filter contract plus 500/5,000-record retrieval
  and accessibility tests

### F-SYNC-HIGH-008: Reconnection announces readiness without starting convergence

- Domain: offline recovery and sync truth
- Severity: High
- Frequency: every offline write followed by restored connectivity without a focus
  transition
- Evidence: `EV-P3-SRC-003`, `EV-P3-MET-003`; offline capture committed locally,
  but the `online` handler only sets Ready and records activity without calling
  `runSync`
- Impact: an offline-created trade can remain device-local until a later interval or
  focus event even though recovery has been announced
- Distinction: `F-SYNC-CRITICAL-006` covers a failed attempted sync mislabeled as
  Synced; this finding covers the absence of an immediate reconnect attempt
- Status: `OPEN`
- Full owner phase: P6.2-P6.4, P8.4-P8.5, P10.2-P10.4
- Closure evidence: reconnect-triggered outbox flush with deterministic offline,
  online, retry, duplicate, and cross-device convergence tests

### F-CONTENT-CRITICAL-001: The app communicates incompatible challenge and model identities

- Domain: product/model truth
- Severity: Critical
- Frequency: every sizing, projection, Settings, and progress interpretation
- Evidence: `EV-P1-DATA-001`, `EV-P3-COPY-005`; rendered Settings shows Starting
  Equity `$100,000` while About still says `$20K -> $10M` and `⅔ Power Decay`, and
  current code retains legacy constants/formula rather than the planned curve
- Impact: the user cannot know which capital base, sizing rule, milestone path, or
  simulation governs a live decision
- Distinction: `F-MODEL-CRITICAL-001` concerns historical fields being rewritten;
  this finding concerns contradictory present-tense product claims
- Status: `OPEN`
- Full owner phase: P7.1-P7.5, P9.2, P10.3-P10.4, P11
- Closure evidence: one versioned model identity with parity-tested implementation
  and a complete source/rendered-copy scan showing no legacy contradictions

### F-CONTENT-HIGH-002: Projection outputs omit decision-critical assumptions

- Domain: simulation interpretation
- Severity: High
- Frequency: every Projections and milestone-estimate review
- Evidence: `EV-P1-DATA-001`, `EV-P3-MET-003`, `EV-P3-COPY-005`; projections show
  win rate, gross 1:1 RR, curve, and paths but omit break-even share, fees, slippage,
  funding, trade frequency/calendar horizon, and model version
- Impact: precise-looking probabilities, cones, and dates can be interpreted as a
  net/calendar forecast although the simulation is binary, gross, and trade-count
  based
- Status: `OPEN`
- Full owner phase: P7.1-P7.5, P10.2-P10.3, P11.4
- Closure evidence: co-located assumptions/provenance, canonical net/gross semantics,
  and comprehension tests that distinguish simulation from forecast

## P4 Mobile Visual Findings

### F-UI-CRITICAL-001: Landscape Trade Entry is clipped and operationally unusable

- Domain: mobile responsive layout
- Severity: Critical
- Evidence: `EV-P4-IMG-001`; at 844x390 the width breakpoint activates the desktop
  rail while the sheet starts above the visible region and sticky actions obscure
  lower content
- Impact: outcome/header/close context is unavailable and the user cannot reliably
  inspect or complete the record in phone landscape
- Status: `OPEN`
- Full owner phase: P5.3-P5.4, P8.4, P10.2-P10.3, P11.2-P11.3
- Closure evidence: height-aware layout plus physical landscape/keyboard W03-W06 tests

### F-UI-HIGH-002: The monument displaces repeated operational truth below the fold

- Domain: mobile hierarchy
- Severity: High
- Evidence: `EV-P4-IMG-001`; on 320x568 the monument/equity/action consume nearly
  the entire usable screen, while the risk/progress state is below fixed navigation
- Impact: the repeated user sees ceremony before the decision needed for the next
  trade, especially on smaller phones and drawdown states
- Status: `EXPERIMENT_REQUIRED`
- Full owner phase: P10.1-P10.3, P11.2, P12.2
- Closure evidence: full versus operational monument comparison proving faster W01/W02
  without loss of identity or reviewer preference

### F-UI-HIGH-003: Color communicates conflicting meanings across risk and action states

- Domain: visual semantics
- Severity: High
- Evidence: `EV-P4-COLOR-003`; green is both positive outcome and primary capture,
  amber/gold is both achievement and exposure, and blue spans navigation/form/sync
- Impact: color cannot reliably answer whether a value is realized, planned,
  cautionary, pending, or verified; the green CTA dominates a 60% drawdown screen
- Status: `OPEN`
- Full owner phase: P10.3, P11.2-P11.4, P12.2-P12.3
- Closure evidence: semantic token matrix and state/contrast tests without color-only
  meaning

## P5 Frontend Findings

### F-FE-HIGH-004: Initial equity has two independent frontend sources of truth

- Domain: state/model ownership
- Severity: High
- Evidence: `EV-P5-STATE-002`; Settings persists `initialEquity` separately while the
  trade dataset also persists/syncs it, and remote merge/import does not reconcile
  the Settings mirror
- Impact: risk ledger, Settings, and projections can use different starting-capital
  assumptions on one device or across devices
- Distinction: `F-SYNC-HIGH-003` covers settings excluded from cloud generally; this
  finding is the local domain ownership conflict for a model-critical field
- Status: `OPEN`
- Full owner phase: P6.1-P6.3, P7.1-P7.4, P10.4, P11.1-P11.3
- Closure evidence: one declared authoritative model/account settings record with
  migration and local/remote/import convergence tests

### F-OPS-HIGH-003: Deployment has competing GitHub Pages and Cloudflare authorities

- Domain: release operations
- Severity: High
- Evidence: `EV-P5-OPS-005`; GitHub Actions deploys `master` to GitHub Pages, while
  package scripts manually deploy Pages/Worker to Cloudflare and the live URL is
  Cloudflare-hosted
- Impact: a successful CI deployment need not update the live app, frontend and
  Worker versions can drift, and rollback provenance is ambiguous
- Status: `OPEN`
- Full owner phase: P10.4, P11.1/P11.6, P13.1-P13.2
- Closure evidence: one documented promotion pipeline with artifact/commit/version
  visibility and tested independent frontend/Worker rollback

## P6 Backend, Data, and Sync Findings

### F-SYNC-CRITICAL-009: Device wall clocks are the conflict authority

- Domain: distributed data integrity
- Severity: Critical
- Evidence: `EV-P6-DATA-002`; equal timestamps resolve by input order, later client
  timestamps resurrect deletes, and a future clock permanently dominates record and
  dataset-level initial-equity selection
- Impact: clock skew or request ordering can silently choose the wrong trade/model
  truth with no conflict presented to the user
- Status: `OPEN`
- Full owner phase: P10.4, P11 backend vertical slice, P12.1/P12.4
- Closure evidence: server-assigned monotonic revisions, idempotent commands, and
  deterministic skew/tie/delete/edit concurrency tests

### F-DATA-HIGH-003: Schema versioning has no migration or rejection semantics

- Domain: data lifecycle
- Severity: High
- Evidence: `EV-P6-DATA-002`, `EV-P6-LIFE-003`; arbitrary incoming versions are
  silently normalized to v2 and import commits immediately
- Impact: incompatible or partially understood data can be rewritten and synced
  without preview, quarantine, rollback, or explicit migration
- Status: `OPEN`
- Full owner phase: P7.4-P7.5, P10.4, P11.1, P13.2
- Closure evidence: version registry, fixtures for every migration path, invalid/
  future-version rejection, transactional rollback, and round-trip export tests

### F-DATA-HIGH-004: Attachment deletion is not transactional with record deletion

- Domain: media lifecycle
- Severity: High
- Evidence: `EV-P6-LIFE-003`; explicit delete and clear remove IndexedDB binaries
  before the ledger tombstone is durably committed or acknowledged
- Impact: partial failure can leave a visible record whose evidence has already been
  destroyed, while another device never had the binary at all
- Status: `OPEN`
- Full owner phase: P6 target implementation, P10.4, P11.3-P11.4
- Closure evidence: content-addressed synced media and two-phase garbage collection
  tested across failure/retry/restore

### F-SYNC-HIGH-010: Missing cloud data and transport failure are indistinguishable

- Domain: sync protocol
- Severity: High
- Evidence: `EV-P6-SYNC-004`; GET 404, non-OK responses, parse/network errors all
  become `null`, which `syncFromCloud` treats as no cloud dataset and follows with a
  push attempt
- Impact: recovery decisions and UI cannot distinguish first-device bootstrap from
  remote outage/corruption; stale local state may be promoted during failure
- Status: `OPEN`
- Full owner phase: P10.4, P11 sync implementation, P12.1/P12.4
- Closure evidence: typed transport results and tests for 404/401/403/409/413/429/
  5xx/timeout/invalid payload with no unsafe fallback

## P7 Mathematical Model Findings

### F-MODEL-CRITICAL-003: Whole-wallet cross-margin liquidation invalidates capped-R projections

- Domain: model validity/execution
- Severity: Critical
- Evidence: `EV-P7-SEM-003`; final research explicitly requires losses capped near
  planned R, while whole-wallet cross-margin liquidation can consume collateral
  beyond planned dollar risk
- Impact: deadline, drawdown, and success probabilities can be materially overstated
  if shown for the user's actual liquidation-as-stop workflow
- Status: `OPEN`
- Full owner phase: P10.2-P10.4, P11.3-P11.4, P12.1/P12.4
- Closure evidence: operational equity/stop/collateral contract and UI that blocks or
  clearly withholds capped-R projections when execution violates it

### F-MODEL-CRITICAL-004: The live projection engine is not the approved model

- Domain: implementation parity
- Severity: Critical
- Evidence: `EV-P1-DATA-001`, `EV-P7-MET-005`; live code uses the legacy `$20K`
  piecewise/two-thirds curve, binary 500-path outcomes, no 10% BE, no costs, and no
  3.5-trades/month calendar conversion
- Impact: rendered probability cones, milestone dates, drawdowns, and risk tables do
  not describe `100k-pchip-v1` or its published 60,000-path scenarios
- Distinction: `F-CONTENT-CRITICAL-001` covers contradictory claims; this finding is
  computational non-parity
- Status: `OPEN`
- Full owner phase: P11 model vertical slice, P12.1-P12.4
- Closure evidence: shared canonical engine passing committed vectors and scenario
  fixtures in risk, charts, projections, dates, exports, and Worker validation

## Status Vocabulary

- `OPEN`: evidenced and unresolved
- `MITIGATED_FOR_AUDIT_OPEN_FOR_PRODUCT`: contained for safe audit execution but not
  repaired in the product
- `EXPERIMENT_REQUIRED`: a controlled comparison is needed
- `DEFERRED`: explicitly outside the current program with a decision ID
- `CLOSED_FOR_P{N}`: validated against the phase's stated scope
- `REOPENED`: later evidence contradicted closure
