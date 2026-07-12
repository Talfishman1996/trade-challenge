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
- Status: `EXPERIMENT_REQUIRED`
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

## Status Vocabulary

- `OPEN`: evidenced and unresolved
- `MITIGATED_FOR_AUDIT_OPEN_FOR_PRODUCT`: contained for safe audit execution but not
  repaired in the product
- `EXPERIMENT_REQUIRED`: a controlled comparison is needed
- `DEFERRED`: explicitly outside the current program with a decision ID
- `CLOSED_FOR_P{N}`: validated against the phase's stated scope
- `REOPENED`: later evidence contradicted closure
