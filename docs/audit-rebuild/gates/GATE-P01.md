# GATE-P01: Forensic Baseline

Gate state: `GATE_PASSED`

Audit date: 2026-07-12, America/Los_Angeles

Branch: `codex/audit-mobile-first-2026-07-12`

## Objective and Scope

Prove that every known source responsibility, product surface/state, data path,
model consumer, viewport class, baseline metric domain, and standards domain is
represented before independent Fable review or Codex design interpretation.

Included subphases: `P1.1` through `P1.6`.

Excluded from this gate: design recommendations, feature disposition, frontend or
backend fixes, mathematical migration decisions, Fable output, prototype code,
staging, production deployment, and production data mutation.

## Completed Task Evidence

| Subphase | Evidence | Result |
|---|---|---|
| P1.1 Repository/dependencies | `EV-P1-SRC-001`, `002`, `005` | pass |
| P1.2 Product surfaces/states | `EV-P1-SRC-003` | pass |
| P1.3 Data/model map | `EV-P1-DATA-001` | pass |
| P1.4 Screenshot/video baseline | `EV-P1-IMG-001`, `VID-001` | pass with explicit capability gaps |
| P1.5 Objective measurements | `EV-P1-MET-001`, `002`, `003` | pass with bounded environment claims |
| P1.6 Standards/references | `EV-P1-SRC-004` | pass |

Final raw manifest: `output/audit-rebuild/P1/MANIFEST.sha256`

Manifest SHA-256:
`b16cf5b6ae166a130b9aeeecb6b3e2b85ab05b8418ff27e7e339bdbcb9806192`

Manifest verification: 141 of 141 substantive artifacts returned `OK`.
Incidental macOS `._*` metadata and the manifest/verification files themselves are
excluded from the evidence set.

## Commands, Environments, and Fixtures

- source inventory: Git blobs, line/byte/type manifests, 108 import/export records
- dependency inventory: npm lock v3, 250 package entries, full installed tree
- production build: Vite 7.3.1 to isolated output directory, exit 0
- browser: controlled Chromium-class environment with explicit viewport overrides
- isolation: pre-React exact-origin production Worker interception and DOM marker
- fixtures: 17 deterministic schema-v2 datasets plus remote-conflict/sync modes
- viewport matrix: M01-M08, T01-T03, D01-D02
- visual corpus: 71 JPEG captures including late S13 History scale image
- standards access date: 2026-07-12
- live parity: static Pages HTML/JS/CSS fetched without executing application code

## Findings and Risks

P1 opened 17 product findings: six Critical and eleven High. No finding was closed,
deleted, or downgraded to make the evidence gate pass. G1 passing means the baseline
is complete enough for the next audit phase; it does not mean the app is safe,
correct, accessible, performant, or production-ready.

Key triggered risks: `R-003`, `R-004`, `R-005`, `R-009`, `R-015`, `R-016`, `R-020`,
`R-021`, `R-022`, `R-024`, `R-025`, and `R-026`. Each has evidence and a later owner.

## Budget Review and Ratification

The existing mobile, accessibility, Web Vitals, and reliability budgets remain
unchanged. P1 evidence does not justify weakening them.

G1 establishes delivery budgets:

- initial JavaScript: <=180 kB gzip on the production mobile entry path
- any lazy route: <=75 kB gzip
- cold first-view transfer excluding external fonts: <=750 kB
- no raster asset above 500 kB without explicit measured justification
- no unbounded DOM growth with trade count
- zero console errors and zero repeated framework warnings in validated workflows

Current baseline misses initial JavaScript, raster, unbounded-History, console, mobile
geometry/name, contrast, and reliability budgets. Those misses are findings, not
reasons to fail an evidence-completeness gate.

## Questions and Assumptions

- `A-001` is verified: live static artifacts correspond to the current repository.
- `A-003` remains only a planned browser-set assumption; physical coverage moves to
  P8 and is not claimed by G1.
- `A-006` is supported by the observed historical-risk rewrite hazard but remains a
  P7 decision boundary.
- Q-001 through Q-013 remain open with their existing owner phases. P1 resolved none
  by assumption.

## Source Diff and Protected Checkpoint

- tracked application-source/config diff for P1: empty
- audit-only tracked additions: reports, gate/control updates, fixture generator, and
  isolated harness instrumentation
- raw evidence remains ignored under `output/audit-rebuild/`

| Ref | Commit | Tree | Result |
|---|---|---|---|
| Local protected tag | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |
| Local checkpoint branch | `ed845a576e38741c9d7b70888774cc9fe623bc6f` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |
| GitHub checkpoint branch | `5a35dd9dc4d32ff55b98cc13afbabcebdf5abd4e` | `c41314cdedb14c64e64386cbce7534de9a2002d5` | pass |

## Pass/Fail Criteria

| Criterion | Verdict | Evidence |
|---|---|---|
| Every tracked runtime responsibility represented | pass | P1.1 report/manifests |
| Every known primary/conditional surface represented | pass | P1.2 report/DOM corpus |
| Every persistence/sync/model consumer represented | pass | P1.3 report/extracts |
| Complete viewport breadth represented | pass, emulated | 13-class image corpus |
| Product state matrix represented or explicitly gapped | pass | 26 captures + four named gaps |
| Build/runtime/scale/accessibility/console/network baselines exist | pass | P1.5 report/raw metrics |
| Current primary standards baseline exists | pass | P1.6 report |
| Live app corresponds to repository baseline | pass | static parity artifacts |
| Raw evidence frozen and verified | pass | 141/141 manifest checks |
| Production/protected application unchanged | pass | source diff and ref/tree checks |
| Fable remained sealed/unrun | pass | tracker/session log |

## Adversarial Self-Audit

What could make this result wrong:

- Emulated Chromium can miss WebKit/Android device behavior. The gate labels this gap
  and prohibits P4/P8 from presenting emulation as physical proof.
- Browser screenshots exclude part of the requested outer viewport raster. Requested
  dimensions, returned dimensions, and environment remain in metadata.
- Custom DOM/contrast scans can over- or under-report associations, gradients, and
  transient states. Their findings remain experiment-required until P8 manual/scanner
  validation.
- Local timing on a fast host cannot establish field Web Vitals. G1 ratifies the
  standard thresholds, not the observed local times.
- Static live-bundle parity does not prove the current live Worker dataset or runtime
  behavior. Executing production auto-sync was intentionally prohibited; P6 uses
  isolated contract/failure tests instead.
- Four visual states and physical/video evidence are absent. They are individually
  indexed with later owners, satisfying the gate rule that missing proof must be
  explicit rather than silently omitted.

The gate passes because these uncertainties are bounded and do not conceal an
unrepresented current-state domain.

## Checkpoint Record

Evidence content commit: pending first G1 commit

Gate tag: pending validation commit

Next phase authorization: P2 may start only after the content commit, tracker
validation commit, immutable G1 tag, and recovery snapshot are recorded.
