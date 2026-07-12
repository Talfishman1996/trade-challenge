# Evidence, Validation, and Phase-Gate Protocol

This document defines what counts as proof. It does not own task status or product
decisions.

## 1. Evidence Principles

1. Raw evidence is preserved separately from annotated interpretation.
2. Every finding cites at least one evidence ID.
3. Every metric records environment, timestamp, command, fixture, and repetition.
4. A screenshot without viewport/state metadata is not valid evidence.
5. A passing command without captured output and exit status is not valid evidence.
6. A visual impression is labeled qualitative and cannot impersonate a measurement.
7. Missing evidence is reported as missing, never inferred as passing.
8. Later contradictory evidence reopens the affected finding or gate.
9. Fable output is advisory evidence, not validation proof.
10. Production readiness cannot be inferred from prototype evidence.

## 2. Identifier System

| Object | Format | Example |
|---|---|---|
| Task | `P{phase}.{subphase}.{task}` | `P4.1.03` |
| Evidence | `EV-P{phase}-{type}-{number}` | `EV-P4-IMG-017` |
| Finding | `F-{domain}-{severity}-{number}` | `F-UX-HIGH-004` |
| Decision | `D-{number}` | `D-012` |
| Risk | `R-{number}` | `R-009` |
| Question | `Q-{number}` | `Q-006` |
| Gate report | `GATE-P{phase}` | `GATE-P4` |
| Experiment | `X-{domain}-{number}` | `X-NAV-002` |

Evidence types:

- `IMG`: screenshot or visual diff
- `VID`: interaction recording
- `CMD`: command and terminal output
- `MET`: performance or quantitative measurement
- `A11Y`: accessibility result
- `DATA`: fixture, schema, or data-flow capture
- `TEST`: automated or manual test report
- `CMP`: controlled visual-direction comparison
- `SRC`: source map or code reference
- `USR`: structured owner feedback recorded outside the prototype
- `EXT`: independent external-advisor output

## 3. Planned Artifact Structure

```text
docs/audit-rebuild/
  evidence-index.md
  findings-registry.md
  gates/
    GATE-P00.md
    ...
  decisions/
  specifications/
  reports/
  session-log/
output/audit-rebuild/
  raw/
  screenshots/
  video/
  metrics/
  accessibility/
  comparisons/
  tests/
  fable5/
  prototype/
```

Raw files live in `output/`; durable summaries and indexes live in `docs/`. Large
generated files remain out of Git when appropriate, but hashes and manifests are
committed.

## 4. Device and Viewport Matrix

The exact browser versions will be recorded at execution time. Current and previous
major versions are preferred where available.

| ID | Viewport | Representative use | Priority |
|---|---:|---|---|
| M01 | 320x568 | minimum narrow phone | critical |
| M02 | 360x800 | compact Android | critical |
| M03 | 375x667 | compact iPhone | critical |
| M04 | 390x844 | mainstream iPhone | critical |
| M05 | 393x852 | modern iPhone Pro | critical |
| M06 | 412x915 | mainstream Android | critical |
| M07 | 430x932 | large iPhone | critical |
| M08 | 844x390 | phone landscape | high |
| T01 | 768x1024 | compact tablet portrait | secondary |
| T02 | 1024x768 | compact tablet landscape | secondary |
| T03 | 820x1180 | modern tablet portrait | secondary |
| D01 | 1280x720 | compact desktop/laptop | compatibility |
| D02 | 1440x900 | standard desktop | compatibility |

Required mobile environments:

- iOS Safari in browser-tab mode
- Android Chrome in browser-tab mode
- light system text scaling and 200% text scaling
- reduced motion on and off
- portrait and landscape
- virtual keyboard closed and open
- online, slow network, offline, and reconnecting
- foreground, background, and resume

At least one critical iOS Safari workflow and one critical Android Chrome workflow
must run on physical hardware when available. Emulated/device-mode captures remain
useful for breadth but must be labeled `EMULATED`; they cannot be reported as
real-device proof. If physical hardware is unavailable, the gate records the gap
instead of silently downgrading the requirement.

## 5. Product State Matrix

Every applicable screen is captured or tested under:

| State ID | State |
|---|---|
| S00 | first launch / no local data |
| S01 | empty challenge at `$100K` |
| S02 | one winning trade |
| S03 | one losing trade |
| S04 | break-even trade |
| S05 | ordinary mixed history |
| S06 | three-loss streak |
| S07 | greater-than-50% drawdown |
| S08 | below-start equity |
| S09 | near `$1M` milestone |
| S10 | near `$5M` milestone |
| S11 | near `$10M` target |
| S12 | target reached |
| S13 | 500-trade history |
| S14 | long ticker, tags, notes, and numeric values |
| S15 | attachment present |
| S16 | local save pending cloud sync |
| S17 | syncing |
| S18 | synchronized |
| S19 | offline |
| S20 | sync error |
| S21 | conflict/merge |
| S22 | loading/skeleton |
| S23 | malformed/import error |
| S24 | destructive confirmation |
| S25 | undo/recovery available |
| S26 | reduced motion |
| S27 | large text |
| S28 | keyboard obscuring lower content |
| S29 | interrupted save/reload |

If a state does not apply, the evidence index must say why.

## 6. Canonical Workflow Matrix

| Workflow | Start | Required outcome |
|---|---|---|
| W01 Open app | cold launch | useful Home state without obstruction |
| W02 Inspect next risk | Home | exact percentage/dollars and explanation |
| W03 Log basic trade | any primary screen | local save and updated equity/progress |
| W04 Log detailed trade | Trade Entry | all advanced fields retained correctly |
| W05 Save and add another | Trade Entry | context retained, P&L cleared |
| W06 Edit prior trade | History | chain and analytics update deterministically |
| W07 Delete and recover | History | deletion is clear and recoverable as specified |
| W08 Find old trade | History | fast filter/search and clear result |
| W09 Review drawdown | Home/Analysis | cause and next action are understandable |
| W10 Inspect progress | Home/Progress | honest milestone and target context |
| W11 Inspect projections | Analysis | assumptions and uncertainty remain visible |
| W12 Manual sync | global chrome | immediate non-obstructive feedback |
| W13 Offline log/reconnect | Trade Entry | no loss, duplication, or silent overwrite |
| W14 Import/export | Settings | validated, deterministic, reversible workflow |
| W15 Change settings | Settings | effect and persistence are explicit |
| W16 Background/resume | any | current data and honest sync state |
| W17 Recover after failure | error state | clear route back without corruption |

Each workflow records taps, fields, elapsed time, errors, scroll distance, keyboard
changes, network state, and observed uncertainty.

## 7. Controlled Visual-Direction Comparison

P4.8 compares at least three evidence-derived directions without external user
research. Codex performs the evaluation; the owner makes the selection at P9.5.

### Frozen comparison conditions

- identical factual copy, values, datasets, and information hierarchy requirements
- identical fidelity and interaction depth so polish cannot substitute for quality
- critical viewports `M01`, `M04`, and `M06`
- product states `S01`, `S05`, `S07`, `S16`, `S18`, and `S20`
- workflows `W01`, `W02`, `W03`, `W09`, `W10`, and `W12`
- the same capture tooling, zoom, system settings, and evidence annotations
- a rubric frozen and hashed before any direction receives a score

If a direction cannot represent a frozen state or workflow, that is a documented
failure rather than permission to change the comparison conditions.

### Weighted rubric

| Criterion | Weight | Required evidence |
|---|---:|---|
| Core-task clarity and hierarchy | 20 | first-action identification, task path, annotated screen |
| One-handed reach and interaction economy | 15 | tap count, reach map, target geometry |
| Numeric scanning and decision comprehension | 15 | risk/equity/progress scan test |
| Save/sync confidence and state visibility | 10 | pending/synced/error comparison |
| Mobile density and spatial resilience | 10 | M01/M04/M06 captures and overflow check |
| Error, drawdown, and recovery clarity | 10 | S07/S20 workflow evidence |
| Emotional identity and memorability | 10 | qualitative rationale tied to product north star |
| Baseline accessibility | 5 | contrast, target, text-scale, color/motion checks |
| Implementation coherence and regression exposure | 5 | component/state implications |
| **Total** | **100** | complete comparison packet |

### Hard-failure rules

A direction cannot win on weighted score alone if it:

- obscures a primary task, navigation destination, risk number, or sync/error state
- introduces horizontal page scrolling or keyboard/safe-area obstruction at a
  critical viewport
- requires precision tapping for a frequent action
- depends on color alone for win/loss, risk, save, sync, or error meaning
- presents model/projection information more confidently than the underlying state
- cannot support the required empty, drawdown, pending, synced, and error states

### Required result

The comparison records raw scores, evidence IDs, hard failures, uncertainty,
strengths, weaknesses, transferable ideas, and implementation implications for
every direction. It recommends one complete direction without automatically
blending the highest-scoring fragments. Any later blend is a separate recorded
decision with a new comparison check.

## 8. Provisional Quality Budgets

Budgets are provisional until P1 measures the baseline. G1 either ratifies them or
records an evidence-based revision. Budgets may not be weakened solely to make a
gate pass.

### Mobile layout and interaction

- no horizontal page scrolling at 320 CSS px
- no content hidden behind safe areas, keyboard, navigation, or fixed overlays
- minimum interactive target: 44x44 CSS px; primary frequent targets: 48x48 or larger
- input text at least 16 CSS px where iOS would otherwise zoom
- visible focus and pressed/disabled/loading states for every action
- ordinary trade entry target: under 10 seconds for a familiar user with defaults
- local-save feedback target: perceptually immediate, under 100 ms where measurable
- primary task reachable without precision grip or two-handed interaction

### Accessibility

- WCAG AA contrast for body text and actionable controls
- no required meaning conveyed by color alone
- complete operation at 200% text zoom without loss of function
- reduced-motion mode removes non-essential motion
- semantic labels for controls, charts, status, and validation
- logical focus order and no focus traps

### Performance

- LCP target: <= 2.5 s under the defined representative mobile profile
- INP target: <= 200 ms
- CLS target: <= 0.10
- no repeated long task above 200 ms during ordinary interaction
- no unbounded render or memory growth as trade count increases
- initial JavaScript and route budgets established after P1 bundle decomposition
- animation should maintain visually stable frame delivery on the representative
  mobile profile; failures are measured, not hidden

### Reliability

- local trade save succeeds without network availability
- repeated save gestures do not duplicate trades
- reload/background/foreground transitions do not lose accepted input
- stale clients cannot silently delete newer records in tested scenarios
- displayed sync state matches observed local/cloud state
- model calculations are deterministic for identical inputs

### G1-ratified delivery budgets

- initial JavaScript: <=180 kB gzip on the production mobile entry path
- any lazy route: <=75 kB gzip
- cold first-view transfer excluding external fonts: <=750 kB
- no raster asset above 500 kB without explicit measured justification
- no unbounded DOM growth with trade count
- zero console errors and zero repeated framework warnings in validated workflows

These budgets were established from P1 decomposition and are targets for the rebuild,
not descriptions of the current baseline. The current app exceeds several of them.

## 9. Finding Severity

| Severity | Definition |
|---|---|
| Blocker | Prevents core use, corrupts data, invalidates model truth, or defeats recovery |
| Critical | High-probability severe failure, inaccessible core path, or materially misleading output |
| High | Repeated major friction, serious trust/performance issue, or likely regression source |
| Medium | Meaningful quality issue with workaround or limited frequency |
| Low | Polish, consistency, or low-impact issue |
| Observation | Context worth recording but not yet an actionable defect |

Every finding also records frequency, impact, confidence, affected states, evidence,
dependencies, reversibility, proposed remedy, and validation method.

## 10. Gate Packet Requirements

Every gate packet must contain:

- phase objective and exact scope
- completed task IDs
- evidence manifest and SHA-256 hashes
- commands, environments, fixtures, and exit statuses
- findings opened, closed, deferred, or reopened
- budget results and deviations
- unresolved questions and assumptions
- source diff summary
- checkpoint verification against the protected baseline
- explicit pass/fail result for each criterion
- adversarial self-audit: what could make this result wrong?
- next phase authorization or required repair work

## 11. Gate Procedure

1. Set all phase subphases to `EVIDENCE_READY`.
2. Freeze mutable evidence and generate hashes.
3. Run automated checks.
4. Run manual device/state/workflow checks.
5. Search for missing matrix entries.
6. Cross-check every claim against evidence.
7. Attempt to falsify the phase conclusions.
8. Record `GATE_FAILED` if any required proof is missing.
9. Repair and rerun the entire affected validation set.
10. On pass, commit the gate report and create a new immutable phase tag.

## 12. Reopening Rules

A passed phase is reopened when:

- later evidence contradicts a conclusion
- a supposedly covered state was never captured
- a tool or fixture produced invalid measurements
- model parity changes
- prototype behavior exposes an architectural gap
- Fable or reviewer feedback identifies a testable issue confirmed by evidence

Reopening does not rewrite the old checkpoint. It creates a new corrective record.

## 13. No-Proof Prohibitions

The following phrases are invalid without evidence IDs:

- fully tested
- pixel perfect
- mobile optimized
- production ready
- sync works
- no regressions
- accessible
- performant
- model matches
- complete

The tracker must remain conservative when proof is incomplete.
